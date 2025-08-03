import 'websocket-polyfill';
import { action, observable, runInAction } from 'mobx';
import { nwc } from '@getalby/sdk';

import { getPublicKey, generateSecretKey } from 'nostr-tools';
import NWCConnection from '../models/NWCConnection';
import SettingsStore from './SettingsStore';
import BackendUtils from '../utils/BackendUtils';
import Storage from '../storage';

export const NWC_CONNECTIONS_KEY = 'zeus-nwc-connections';
const RELAY_URL = 'wss://relay.getalby.com/v1'; // Default relay URL

export interface CreateConnectionParams {
    name: string;
    permissions?: string[];
    budgetAmount?: number;
    budgetRenewal?: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    expiresAt?: Date;
}

export default class NostrWalletConnectStore {
    @observable public loading = false;
    @observable public error = false;
    @observable public errorMessage = '';
    @observable public connections: NWCConnection[] = [];
    @observable public isServiceRunning = false;
    @observable public nwcWalletServiceKeyPair: nwc.NWCWalletServiceKeyPair;
    @observable private nwcWalletService: nwc.NWCWalletService;
    @observable public nostrUrl: string;
    @observable private activeSubscriptions: Map<string, () => void> =
        new Map();

    settingsStore: SettingsStore;
    private servicePrivateKey?: string;
    private servicePublicKey?: string;

    constructor(settingsStore: SettingsStore) {
        this.settingsStore = settingsStore;
        this.initializeKeys();
        this.loadConnections();
        this.nwcWalletService = new nwc.NWCWalletService({
            relayUrl: this.relayUrl
        });
    }

    @action
    public startService = async () => {
        runInAction(() => {
            this.isServiceRunning = true;
        });
        try {
            console.log('Starting NWC service...');
            await this.publishWalletServiceInfoEvent();
            await this.subscribeToAllConnections();
        } catch (error: any) {
            console.error('Failed to start NWC service:', error);
            this.setError(true, error.message || 'Failed to start service');
            return false;
        } finally {
            this.setLoading(false);
        }
    };

    @action
    public stopService = async (): Promise<boolean> => {
        try {
            this.setLoading(true);
            this.setError(false);

            console.log('Stopping NWC service...');
            this.unsubscribeFromAllConnections();

            runInAction(() => {
                this.isServiceRunning = false;
            });

            return true;
        } catch (error: any) {
            console.error('Failed to stop NWC service:', error);
            this.setError(true, error.message || 'Failed to stop service');
            return false;
        } finally {
            this.setLoading(false);
        }
    };

    private async publishWalletServiceInfoEvent(): Promise<void> {
        if (!this.servicePrivateKey) {
            throw new Error('Service private key is not set');
        }
        await this.nwcWalletService.publishWalletServiceInfoEvent(
            this.servicePrivateKey,
            [
                'get_info',
                'get_balance',
                'pay_invoice',
                'make_invoice',
                'list_transactions',
                'pay_keysend'
            ],
            []
        );
    }

    private initializeKeys() {
        this.servicePrivateKey =
            this.settingsStore.settings?.nwcServicePrivateKey ||
            this.generateServiceKey();

        this.servicePublicKey = this.derivePublicKey(this.servicePrivateKey);

        if (!this.settingsStore.settings?.nwcServicePrivateKey) {
            this.settingsStore.updateSettings({
                nwcServicePrivateKey: this.servicePrivateKey
            });
        }
    }

    private generateServiceKey(): string {
        try {
            const privateKey = generatePrivateKey();
            return privateKey;
        } catch (error) {
            return Array.from({ length: 64 }, () =>
                Math.floor(Math.random() * 16).toString(16)
            ).join('');
        }
    }

    private derivePublicKey(privateKeyHex: string): string {
        try {
            return getPublicKey(privateKeyHex);
        } catch (error) {
            return 'npub' + privateKeyHex.substring(0, 60);
        }
    }

    private generateConnectionId(): string {
        return (
            Date.now().toString(36) + Math.random().toString(36).substring(2)
        );
    }

    private generateConnectionString(connectionPrivateKey: string): string {
        const relay =
            this.settingsStore.settings?.nwcServiceRelay ||
            'wss://relay.getalby.com/v1';
        return `nostr+walletconnect://${
            this.servicePublicKey
        }?relay=${encodeURIComponent(relay)}&secret=${connectionPrivateKey}`;
    }

    @action
    public setLoading = (loading: boolean) => {
        this.loading = loading;
    };

    @action
    public setError = (error: boolean, errorMessage?: string) => {
        this.error = error;
        this.errorMessage = errorMessage || '';
    };

    @action
    public loadConnections = async () => {
        try {
            const connectionsData = await Storage.getItem(NWC_CONNECTIONS_KEY);
            if (connectionsData) {
                runInAction(() => {
                    this.connections = connectionsData.map(
                        (data: any) => new NWCConnection(data)
                    );
                });
            }
        } catch (error: any) {
            console.error('Failed to load NWC connections:', error);
            this.setError(true, 'Failed to load connections');
        }
    };

    @action
    public saveConnections = async () => {
        try {
            await Storage.setItem(NWC_CONNECTIONS_KEY, this.connections);
        } catch (error: any) {
            console.error('Failed to save NWC connections:', error);
            this.setError(true, 'Failed to save connections');
        }
    };

    @action
    public createConnection = async (
        params: CreateConnectionParams
    ): Promise<NWCConnection | null> => {
        try {
            this.setLoading(true);
            this.setError(false);

            if (!params.name.trim()) {
                throw new Error('Connection name is required');
            }

            const connectionId = this.generateConnectionId();
            const connectionPrivateKey = this.generateServiceKey();
            const connectionPublicKey =
                this.derivePublicKey(connectionPrivateKey);

            const connectionData = {
                id: connectionId,
                name: params.name.trim(),
                pubkey: connectionPublicKey,
                permissions: params.permissions || [
                    'get_info',
                    'get_balance',
                    'pay_invoice',
                    'make_invoice',
                    'list_transactions',
                    'pay_keysend'
                ],
                connectionString:
                    this.generateConnectionString(connectionPrivateKey),
                enabled: true,
                createdAt: new Date(),
                budgetAmount: params.budgetAmount,
                budgetRenewal: params.budgetRenewal || 'never',
                expiresAt: params.expiresAt
            };

            const connection = new NWCConnection(connectionData);

            runInAction(() => {
                this.connections.unshift(connection);
            });

            await this.saveConnections();

            // Subscribe to this new connection if service is running
            if (this.isServiceRunning) {
                await this.subscribeToConnection(connection);
            }

            return connection;
        } catch (error: any) {
            console.error('Failed to create NWC connection:', error);
            this.setError(true, error.message || 'Failed to create connection');
            return null;
        } finally {
            this.setLoading(false);
        }
    };

    @action
    public deleteConnection = async (
        connectionId: string
    ): Promise<boolean> => {
        try {
            this.setLoading(true);
            this.setError(false);

            const connectionIndex = this.connections.findIndex(
                (c) => c.id === connectionId
            );

            if (connectionIndex === -1) {
                throw new Error('Connection not found');
            }

            // Unsubscribe from this connection
            await this.unsubscribeFromConnection(connectionId);

            runInAction(() => {
                this.connections.splice(connectionIndex, 1);
            });

            await this.saveConnections();
            return true;
        } catch (error: any) {
            console.error('Failed to delete NWC connection:', error);
            this.setError(true, error.message || 'Failed to delete connection');
            return false;
        } finally {
            this.setLoading(false);
        }
    };

    @action
    public updateConnection = async (
        connectionId: string,
        updates: Partial<NWCConnection>
    ): Promise<boolean> => {
        try {
            this.setLoading(true);
            this.setError(false);

            const connection = this.connections.find(
                (c) => c.id === connectionId
            );
            if (!connection) {
                throw new Error('Connection not found');
            }

            runInAction(() => {
                Object.assign(connection, updates);
            });

            await this.saveConnections();
            return true;
        } catch (error: any) {
            console.error('Failed to update NWC connection:', error);
            this.setError(true, error.message || 'Failed to update connection');
            return false;
        } finally {
            this.setLoading(false);
        }
    };

    @action
    public markConnectionUsed = async (connectionId: string) => {
        const connection = this.connections.find((c) => c.id === connectionId);
        if (connection) {
            connection.lastUsed = new Date();
            await this.saveConnections();
        }
    };

    private async subscribeToAllConnections(): Promise<void> {
        const activeConnections = this.connections.filter(
            (c) => c.enabled && !c.isExpired
        );

        for (const connection of activeConnections) {
            await this.subscribeToConnection(connection);
        }
    }

    private async subscribeToConnection(
        connection: NWCConnection
    ): Promise<void> {
        try {
            // Unsubscribe if already subscribed
            await this.unsubscribeFromConnection(connection.id);

            const keypair = new nwc.NWCWalletServiceKeyPair(
                this.servicePrivateKey!,
                connection.pubkey
            );

            const unsubscribe = await this.nwcWalletService.subscribe(keypair, {
                getInfo: async () => {
                    console.log(
                        `[${connection.name}] Handling get_info request`
                    );
                    await this.markConnectionUsed(connection.id);
                    try {
                        const nodeInfo = await BackendUtils.getMyNodeInfo();
                        return {
                            result: {
                                alias: nodeInfo.alias || 'Zeus Wallet',
                                color: nodeInfo.color || '#3399FF',
                                pubkey: nodeInfo.identity_pubkey,
                                network: 'mainnet',
                                block_height: nodeInfo.block_height,
                                block_hash: nodeInfo.block_hash,
                                methods: [
                                    'get_info',
                                    'get_balance',
                                    'pay_invoice',
                                    'make_invoice',
                                    'list_transactions',
                                    'pay_keysend'
                                ]
                            },
                            error: undefined
                        };
                    } catch (error) {
                        console.error(
                            `[${connection.name}] Error in getInfo:`,
                            error
                        );
                        return {
                            result: undefined,
                            error: {
                                code: 'INTERNAL_ERROR',
                                message: `Failed to get node info: ${error}`
                            }
                        };
                    }
                },
                getBalance: async () => {
                    console.log(
                        `[${connection.name}] Handling get_balance request`
                    );
                    await this.markConnectionUsed(connection.id);
                    try {
                        const lightningBalance =
                            await BackendUtils.getLightningBalance();
                        const balanceSats = lightningBalance?.balance || 0;
                        const balanceMsats = Math.floor(balanceSats * 1000);

                        return {
                            result: {
                                balance: balanceMsats
                            },
                            error: undefined
                        };
                    } catch (error) {
                        console.error(
                            `[${connection.name}] Error in getBalance:`,
                            error
                        );
                        return {
                            result: undefined,
                            error: {
                                code: 'INTERNAL_ERROR',
                                message: `Failed to get balance: ${error}`
                            }
                        };
                    }
                },
                payInvoice: async (params: { invoice: string }) => {
                    console.log(
                        `[${connection.name}] Handling pay_invoice request: ${params.invoice}`
                    );
                    await this.markConnectionUsed(connection.id);
                    try {
                        const result = await BackendUtils.payLightningInvoice({
                            payment_request: params.invoice
                        });

                        return {
                            result: {
                                preimage: result.payment_preimage,
                                fees_paid: Math.floor((result.fee || 0) * 1000)
                            },
                            error: undefined
                        };
                    } catch (error) {
                        console.error(
                            `[${connection.name}] Error in payInvoice:`,
                            error
                        );
                        return {
                            result: undefined,
                            error: {
                                code: 'INTERNAL_ERROR',
                                message: `Failed to pay invoice: ${error}`
                            }
                        };
                    }
                },
                makeInvoice: async (params: {
                    amount: number;
                    description?: string;
                    expiry?: number;
                }) => {
                    console.log(
                        `[${connection.name}] Handling make_invoice request: ${params.amount} sats`
                    );
                    await this.markConnectionUsed(connection.id);
                    try {
                        const invoice = await BackendUtils.createInvoice({
                            value: Math.floor(params.amount / 1000),
                            memo: params.description || '',
                            expiry: params.expiry || 3600
                        });

                        return {
                            result: {
                                type: 'incoming',
                                state: 'settled',
                                invoice: invoice.payment_request,
                                description: params.description || '',
                                description_hash: invoice.description_hash,
                                preimage: invoice.r_preimage,
                                payment_hash: invoice.r_hash,
                                amount: params.amount,
                                fees_paid: 0,
                                settled_at: Math.floor(Date.now() / 1000),
                                created_at: Math.floor(Date.now() / 1000),
                                expires_at:
                                    Math.floor(Date.now() / 1000) +
                                    (params.expiry || 3600)
                            },
                            error: undefined
                        };
                    } catch (error) {
                        console.error(
                            `[${connection.name}] Error in makeInvoice:`,
                            error
                        );
                        return {
                            result: undefined,
                            error: {
                                code: 'INTERNAL_ERROR',
                                message: `Failed to create invoice: ${error}`
                            }
                        };
                    }
                },
                listTransactions: async () => {
                    console.log(
                        `[${connection.name}] Handling list_transactions request`
                    );
                    await this.markConnectionUsed(connection.id);
                    try {
                        const transactions =
                            await BackendUtils.getTransactions();
                        return {
                            result: {
                                transactions: transactions || [],
                                total_count: transactions?.length || 0
                            },
                            error: undefined
                        };
                    } catch (error) {
                        console.error(
                            `[${connection.name}] Error in listTransactions:`,
                            error
                        );
                        return {
                            result: undefined,
                            error: {
                                code: 'INTERNAL_ERROR',
                                message: `Failed to get transactions: ${error}`
                            }
                        };
                    }
                },
                payKeysend: async (request: {
                    amount: number;
                    pubkey: string;
                    preimage?: string;
                    tlv_records?: Array<{ type: number; value: string }>;
                }) => {
                    console.log(
                        `[${connection.name}] Handling pay_keysend request: ${request.amount} sats to ${request.pubkey}`
                    );
                    await this.markConnectionUsed(connection.id);
                    try {
                        const result = await BackendUtils.payLightningInvoice({
                            payment_request: request.pubkey,
                            amt: request.amount
                        });

                        return {
                            result: {
                                type: 'outgoing',
                                state: 'settled',
                                invoice: '',
                                description: 'Keysend payment',
                                description_hash: '',
                                preimage: result.payment_preimage,
                                payment_hash: result.payment_hash,
                                amount: request.amount,
                                fees_paid: Math.floor((result.fee || 0) * 1000),
                                settled_at: Math.floor(Date.now() / 1000),
                                created_at: Math.floor(Date.now() / 1000),
                                expires_at: Math.floor(Date.now() / 1000) + 3600
                            },
                            error: undefined
                        };
                    } catch (error) {
                        console.error(
                            `[${connection.name}] Error in payKeysend:`,
                            error
                        );
                        return {
                            result: undefined,
                            error: {
                                code: 'INTERNAL_ERROR',
                                message: `Failed to send keysend payment: ${error}`
                            }
                        };
                    }
                }
            });

            runInAction(() => {
                this.activeSubscriptions.set(connection.id, unsubscribe);
            });

            console.log(
                `[${connection.name}] Successfully subscribed to connection`
            );
        } catch (error) {
            console.error(
                `[${connection.name}] Failed to subscribe to connection:`,
                error
            );
        }
    }

    private async unsubscribeFromConnection(
        connectionId: string
    ): Promise<void> {
        const unsub = this.activeSubscriptions.get(connectionId);
        if (unsub) {
            try {
                unsub();
                runInAction(() => {
                    this.activeSubscriptions.delete(connectionId);
                });
                console.log(`Unsubscribed from connection ${connectionId}`);
            } catch (error) {
                console.error(
                    `Error unsubscribing from connection ${connectionId}:`,
                    error
                );
            }
        }
    }

    private async unsubscribeFromAllConnections(): Promise<void> {
        const connectionIds = Array.from(this.activeSubscriptions.keys());
        for (const connectionId of connectionIds) {
            await this.unsubscribeFromConnection(connectionId);
        }
    }

    // Getters
    public getConnection = (
        connectionId: string
    ): NWCConnection | undefined => {
        return this.connections.find((c) => c.id === connectionId);
    };

    public get activeConnections(): NWCConnection[] {
        return this.connections.filter((c) => c.enabled && !c.isExpired);
    }

    public get expiredConnections(): NWCConnection[] {
        return this.connections.filter((c) => c.isExpired);
    }

    public get serviceInfo() {
        return {
            isRunning: this.isServiceRunning,
            connectionCount: this.activeConnections.length,
            totalConnections: this.connections.length,
            activeSubscriptions: this.activeSubscriptions.size,
            relay:
                this.settingsStore.settings?.nwcServiceRelay ||
                'wss://relay.getalby.com/v1',
            publicKey: this.servicePublicKey,
            supportedMethods: [
                'get_info',
                'get_balance',
                'pay_invoice',
                'make_invoice',
                'list_transactions',
                'pay_keysend'
            ]
        };
    }

    public get relayUrl(): string {
        return this.settingsStore.settings?.nwcServiceRelay || RELAY_URL;
    }
}
