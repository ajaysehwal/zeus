import url from 'url';
import { action, observable, reaction, runInAction } from 'mobx';
import BigNumber from 'bignumber.js';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Alert } from 'react-native';
import { LNURLWithdrawParams } from 'js-lnurl';
import querystring from 'querystring-es3';

import Invoice from '../models/Invoice';
import Channel from '../models/Channel';
import ChannelInfo from '../models/ChannelInfo';
import SettingsStore from './SettingsStore';
import LSPStore from './LSPStore';
import BackendUtils from '../utils/BackendUtils';
import { localeString } from '../utils/LocaleUtils';
import { errorToUserFriendly } from '../utils/ErrorUtils';
import ChannelsStore from './ChannelsStore';
import NodeInfoStore from './NodeInfoStore';
import WithdrawalRequest from '../models/WithdrawalRequest';

export default class InvoicesStore {
    @observable paymentRequest: string;
    @observable loading = false;
    @observable error = false;
    @observable error_msg: string | null;
    @observable getPayReqError: string | null = null;
    @observable invoices: Array<Invoice> = [];
    @observable withdrawalRequests: Array<WithdrawalRequest> = [];
    @observable invoice: Invoice | null;
    @observable onChainAddress: string | null;
    @observable pay_req: Invoice | null;
    @observable withdrawal_req: WithdrawalRequest | null;
    @observable payment_request: string | null;
    @observable payment_request_amt: string | null;
    @observable creatingInvoice = false;
    @observable creatingInvoiceError = false;
    @observable invoicesCount: number;
    @observable watchedInvoicePaid = false;
    @observable watchedInvoicePaidAmt: number | string | null = null;
    settingsStore: SettingsStore;
    lspStore: LSPStore;
    channelsStore: ChannelsStore;
    nodeInfoStore: NodeInfoStore;

    // lnd
    @observable loadingFeeEstimate = false;
    @observable feeEstimate: number | null;
    @observable successProbability: number | null;

    constructor(
        settingsStore: SettingsStore,
        lspStore: LSPStore,
        channelsStore: ChannelsStore,
        nodeInfoStore: NodeInfoStore
    ) {
        this.settingsStore = settingsStore;
        this.lspStore = lspStore;
        this.channelsStore = channelsStore;
        this.nodeInfoStore = nodeInfoStore;

        reaction(
            () => this.pay_req,
            () => {
                if (
                    this.pay_req &&
                    this.pay_req.destination &&
                    BackendUtils.isLNDBased()
                ) {
                    this.getRoutes(
                        this.pay_req.destination,
                        this.pay_req.getRequestAmount
                    );
                }
            }
        );
    }

    @action
    public reset = () => {
        this.paymentRequest = '';
        this.onChainAddress = '';
        this.loading = false;
        this.error = false;
        this.error_msg = null;
        this.getPayReqError = null;
        this.invoices = [];
        this.withdrawalRequests = [];
        this.invoice = null;
        this.pay_req = null;
        this.payment_request = null;
        this.creatingInvoice = false;
        this.creatingInvoiceError = false;
        this.invoicesCount = 0;
        this.loadingFeeEstimate = false;
        this.feeEstimate = null;
        this.successProbability = null;
        this.watchedInvoicePaid = false;
        this.watchedInvoicePaidAmt = null;
    };

    @action
    private resetInvoices = () => {
        this.invoices = [];
        this.invoicesCount = 0;
        this.loading = false;
    };

    @action
    public getInvoices = async () => {
        this.loading = true;
        await BackendUtils.getInvoices()
            .then((data: any) => {
                runInAction(() => {
                    this.invoices = data.invoices
                        .map((invoice: any) => new Invoice(invoice))
                        .slice()
                        .reverse();
                    this.invoicesCount =
                        data.last_index_offset || this.invoices.length;
                    this.loading = false;
                });
            })
            .catch(() => this.resetInvoices());
    };

    @action
    public getWithdrawalRequests = async () => {
        this.loading = true;
        try {
            const { invoicerequests } =
                await BackendUtils.listWithdrawalRequests();

            const enhancedRequests: WithdrawalRequest[] = [];

            for (const withdrawalRequest of invoicerequests) {
                try {
                    await this.getWithdrawalReq(withdrawalRequest.bolt12);
                    enhancedRequests.push(
                        new WithdrawalRequest({
                            ...withdrawalRequest,
                            invreq_amount_msat:
                                this.withdrawal_req?.invreq_amount_msat,
                            offer_description:
                                this.withdrawal_req?.offer_description
                        })
                    );
                } catch {
                    enhancedRequests.push(
                        new WithdrawalRequest(withdrawalRequest)
                    );
                }
            }

            runInAction(() => {
                this.withdrawalRequests = enhancedRequests.reverse();
                this.loading = false;
            });
        } catch {
            runInAction(() => {
                this.withdrawalRequests = [];
                this.loading = false;
            });
        }
    };

    @action
    public getRedeemedWithdrawalRequests = async () => {
        this.loading = true;
        try {
            const { invoices } = await BackendUtils.listInvoices();
            const invoicerequests = invoices.filter(
                (invoice: any) => !!invoice.bolt12
            );
            runInAction(() => {
                const enhancedRequests = invoicerequests
                    .map(
                        (withdrawalRequest: any) =>
                            new WithdrawalRequest({
                                ...withdrawalRequest,
                                redeem: true
                            })
                    )
                    .slice()
                    .reverse();

                for (const req of enhancedRequests) {
                    this.withdrawalRequests.push(req);
                }
                this.loading = false;
            });
        } catch (error: any) {
            this.withdrawalRequests = [];
            this.loading = false;
        }
    };

    @action
    public redeemWithdrawalRequest = async ({
        invreq,
        label
    }: {
        invreq: string;
        label: string;
    }): Promise<WithdrawalRequest | null> => {
        this.loading = true;
        this.error = false;
        this.error_msg = null;
        try {
            let response = await BackendUtils.redeemWithdrawalRequest({
                invreq,
                label
            });
            runInAction(() => {
                this.loading = false;
                this.error = false;
                this.error_msg = null;
            });
            response = new WithdrawalRequest(response);
            return response;
        } catch (error: any) {
            let parsedError;
            try {
                parsedError = JSON.parse(error.message).message;
            } catch (parseErr) {
                parsedError = error.message;
            }
            runInAction(() => {
                this.loading = false;
                this.error = true;
                this.error_msg =
                    parsedError ||
                    localeString(
                        'stores.InvoicesStore.errorRedeemingWithdrawalRequest'
                    );
            });
            throw new Error(parsedError);
        }
    };

    @action
    public createUnifiedInvoice = ({
        memo,
        value,
        expiry = '3600',
        lnurl,
        ampInvoice,
        blindedPaths,
        routeHints,
        routeHintChannels,
        addressType,
        customPreimage,
        noLsp
    }: {
        memo: string;
        value: string;
        expiry: string;
        lnurl?: LNURLWithdrawParams;
        ampInvoice?: boolean;
        blindedPaths?: boolean;
        routeHints?: boolean;
        routeHintChannels?: Channel[];
        addressType?: string;
        customPreimage?: string;
        noLsp?: boolean;
    }) => {
        this.creatingInvoice = true;
        return this.createInvoice({
            memo,
            value,
            expiry,
            lnurl,
            ampInvoice,
            blindedPaths,
            routeHints,
            routeHintChannels,
            unified: true,
            customPreimage,
            noLsp
        }).then(
            ({
                rHash,
                paymentRequest
            }: {
                rHash: string;
                paymentRequest: string;
            }) => {
                if (BackendUtils.supportsOnchainReceiving()) {
                    return this.getNewAddress(
                        addressType
                            ? { type: addressType, unified: true }
                            : { unified: true }
                    )
                        .then((onChainAddress: string) => {
                            runInAction(() => {
                                this.onChainAddress = onChainAddress;
                                this.payment_request = paymentRequest;
                                this.loading = false;
                                this.creatingInvoice = false;
                            });
                            return { rHash, onChainAddress };
                        })
                        .catch(() => {
                            runInAction(() => {
                                this.loading = false;
                                this.creatingInvoice = false;
                            });
                        });
                } else {
                    runInAction(() => {
                        this.payment_request = paymentRequest;
                        this.creatingInvoice = false;
                    });
                    return { rHash };
                }
            }
        );
    };

    @action
    public createInvoice = async ({
        memo,
        value,
        expiry = '3600',
        lnurl,
        ampInvoice,
        blindedPaths,
        routeHints,
        routeHintChannels,
        unified,
        customPreimage,
        noLsp
    }: {
        memo: string;
        value: string;
        expiry: string;
        lnurl?: LNURLWithdrawParams;
        ampInvoice?: boolean;
        blindedPaths?: boolean;
        routeHints?: boolean;
        routeHintChannels?: Channel[];
        unified?: boolean;
        customPreimage?: string;
        noLsp?: boolean;
    }) => {
        this.lspStore?.resetFee();
        this.payment_request = null;
        this.payment_request_amt = null;
        if (!unified) this.creatingInvoice = true;
        this.creatingInvoiceError = false;
        this.error_msg = null;

        const req: any = {
            memo,
            value,
            expiry
        };

        if (ampInvoice) req.is_amp = true;
        if (blindedPaths) req.is_blinded = true;
        if (routeHints) {
            if (routeHintChannels?.length) {
                const routeHints = [];
                for (const routeHintChannel of routeHintChannels) {
                    let channelInfo =
                        this.channelsStore.chanInfo[
                            routeHintChannel.channelId!
                        ];
                    if (!channelInfo) {
                        try {
                            channelInfo = new ChannelInfo(
                                await BackendUtils.getChannelInfo(
                                    routeHintChannel.channelId
                                )
                            );
                        } catch (error: any) {
                            const error_msg = error?.toString();
                            runInAction(() => {
                                this.creatingInvoiceError = true;
                                this.creatingInvoice = false;
                                this.error_msg =
                                    error_msg ||
                                    localeString(
                                        'stores.InvoicesStore.errorCreatingInvoice'
                                    );
                            });
                            return;
                        }
                    }
                    const remotePolicy =
                        channelInfo.node1Pub ===
                        this.nodeInfoStore.nodeInfo.nodeId
                            ? channelInfo.node2Policy
                            : channelInfo.node1Policy;
                    routeHints.push({
                        hop_hints: [
                            {
                                node_id: routeHintChannel.remotePubkey,
                                chan_id:
                                    routeHintChannel.peer_scid_alias &&
                                    routeHintChannel.peer_scid_alias !== '0'
                                        ? routeHintChannel.peer_scid_alias
                                        : routeHintChannel.channelId, // must not be converted to Number as this might lead to a loss of precision
                                fee_base_msat: Number(
                                    remotePolicy?.fee_base_msat
                                ),
                                fee_proportional_millionths: Number(
                                    remotePolicy?.fee_rate_milli_msat
                                ),
                                cltv_expiry_delta: remotePolicy?.time_lock_delta
                            }
                        ]
                    });
                }
                req.route_hints = routeHints;
            } else {
                req.private = true;
            }
        }

        if (customPreimage) req.preimage = customPreimage;

        if (
            BackendUtils.supportsFlowLSP() &&
            this.settingsStore.settings?.enableLSP &&
            value &&
            value !== '0' &&
            !noLsp
        ) {
            const info: any = this.lspStore?.info;
            const method =
                info.connection_methods && info.connection_methods[0];

            try {
                await this.channelsStore.connectPeer(
                    {
                        host: `${method.address}:${method.port}`,
                        node_pubkey_string: info.pubkey,
                        local_funding_amount: ''
                    },
                    false,
                    true
                );
            } catch (e) {}

            await this.lspStore.getZeroConfFee(
                Number(new BigNumber(value).times(1000))
            );

            if (new BigNumber(value).gt(this.lspStore.zeroConfFee || 0)) {
                req.value = new BigNumber(value).minus(
                    this.lspStore.zeroConfFee || 0
                );
            }
        }

        if (this.lspStore.flow_error) {
            this.creatingInvoice = false;
            return;
        }

        return BackendUtils.createInvoice(req)
            .then(async (data: any) => {
                if (data.error) {
                    const data_message = data.message?.toString();
                    const data_error = data.error.toString();
                    runInAction(() => {
                        this.creatingInvoiceError = true;
                        if (!unified) this.creatingInvoice = false;
                        const errString = data_message || data_error;
                        this.error_msg =
                            errString === 'Bad arguments' &&
                            this.settingsStore.implementation === 'lndhub' &&
                            req.value === '0'
                                ? localeString(
                                      'stores.InvoicesStore.zeroAmountLndhub'
                                  )
                                : errString ||
                                  localeString(
                                      'stores.InvoicesStore.errorCreatingInvoice'
                                  );
                    });
                }
                const invoice = new Invoice(data);

                runInAction(() => {
                    if (!unified)
                        this.payment_request = invoice.getPaymentRequest;
                    this.payment_request_amt = value;

                    if (!unified) this.creatingInvoice = false;
                });

                let jit_bolt11: string = '';
                if (
                    BackendUtils.supportsFlowLSP() &&
                    this.settingsStore.settings?.enableLSP &&
                    value !== '0' &&
                    !noLsp
                ) {
                    await this.lspStore
                        .getZeroConfInvoice(invoice.getPaymentRequest)
                        .then((response: any) => {
                            jit_bolt11 = response;
                        });
                }

                if (lnurl) {
                    const u = url.parse(lnurl.callback);
                    const qs = querystring.parse(u.query);
                    qs.k1 = lnurl.k1;
                    qs.pr = jit_bolt11 || invoice.getPaymentRequest;
                    u.search = querystring.stringify(qs);
                    u.query = querystring.stringify(qs);

                    ReactNativeBlobUtil.fetch('get', url.format(u))
                        .then((response: any) => {
                            try {
                                const data = response.json();
                                return data;
                            } catch (err) {
                                return {
                                    status: 'ERROR',
                                    reason: response.text()
                                };
                            }
                        })
                        .catch((err: any) => ({
                            status: 'ERROR',
                            reason: err.message
                        }))
                        .then((data: any) => {
                            if (data.status === 'ERROR') {
                                Alert.alert(
                                    `[error] ${lnurl.domain} says:`,
                                    data.reason,
                                    [
                                        {
                                            text: localeString('general.error'),
                                            onPress: () => void 0
                                        }
                                    ],
                                    { cancelable: false }
                                );
                            }
                        });
                }

                return {
                    rHash: invoice.getFormattedRhash,
                    paymentRequest: jit_bolt11
                        ? jit_bolt11
                        : invoice.getPaymentRequest
                };
            })
            .catch((error: any) => {
                const error_msg = error?.toString();
                runInAction(() => {
                    this.creatingInvoiceError = true;
                    this.creatingInvoice = false;
                    this.error_msg =
                        error_msg ||
                        localeString(
                            'stores.InvoicesStore.errorCreatingInvoice'
                        );
                });
            });
    };

    @action
    public setWatchedInvoicePaid = (amount?: string | number) => {
        this.watchedInvoicePaid = true;
        if (amount) this.watchedInvoicePaidAmt = amount;
    };

    @action
    public getNewAddress = (params: any) => {
        if (!params.unified) {
            this.creatingInvoice = true;
            this.error_msg = null;
        }
        // ZEUS-2396
        // https://github.com/ZeusLN/zeus/issues/2396
        if (params.account && params.account !== 'default') {
            delete params.type;
        }
        this.onChainAddress = null;
        return BackendUtils.getNewAddress(params)
            .then((data: any) => {
                const address =
                    data.address ||
                    data.bech32 ||
                    data.p2tr ||
                    (data[0] && data[0].address);
                runInAction(() => {
                    if (!params.unified) this.onChainAddress = address;
                    if (!params.unified) this.creatingInvoice = false;
                });
                return address;
            })
            .catch((error: any) => {
                const error_msg = error.toString();
                runInAction(() => {
                    this.error_msg =
                        error_msg ||
                        localeString(
                            'stores.InvoicesStore.errorGeneratingAddress'
                        );
                    this.creatingInvoice = false;
                });
            });
    };

    @action
    public getNewChangeAddress = (params: any) => {
        if (!params.unified) {
            this.creatingInvoice = true;
            this.error_msg = null;
        }

        params.change = true;

        this.onChainAddress = null;
        return BackendUtils.getNewChangeAddress(params)
            .then((data: any) => {
                const address = data.addr;
                runInAction(() => {
                    if (!params.unified) this.onChainAddress = address;
                    if (!params.unified) this.creatingInvoice = false;
                });
                return address;
            })
            .catch((error: any) => {
                const error_msg = error?.toString();
                runInAction(() => {
                    this.error_msg =
                        error_msg ||
                        localeString(
                            'stores.InvoicesStore.errorGeneratingAddress'
                        );
                    this.creatingInvoice = false;
                });
            });
    };

    public clearAddress = () => (this.onChainAddress = null);

    private clearPaymentRequest = () => (this.payment_request = null);

    @action
    public clearPayReq = () => {
        this.pay_req = null;
        this.getPayReqError = null;
    };

    @action
    public clearUnified = () => {
        this.clearAddress();
        this.clearPaymentRequest();
        this.error_msg = null;
        this.creatingInvoiceError = false;
    };

    @action
    public getPayReq = (paymentRequest: string) => {
        this.loading = true;
        this.pay_req = null;
        this.paymentRequest = paymentRequest;
        this.feeEstimate = null;

        return BackendUtils.decodePaymentRequest([paymentRequest])
            .then((data: any) => {
                runInAction(() => {
                    this.pay_req = new Invoice(data);
                    this.getPayReqError = null;
                    this.loading = false;
                });
                return;
            })
            .catch((error: Error) => {
                const error_friendly = errorToUserFriendly(error);
                runInAction(() => {
                    this.pay_req = null;
                    this.getPayReqError = error_friendly;
                    this.loading = false;
                });
            });
    };

    @action
    public getWithdrawalReq = (withdrawalReq: string) => {
        this.loading = true;
        this.withdrawal_req = null;
        this.paymentRequest = withdrawalReq;
        this.feeEstimate = null;

        return BackendUtils.decodePaymentRequest([withdrawalReq])
            .then((data: any) => {
                runInAction(() => {
                    this.withdrawal_req = new WithdrawalRequest(data);
                    this.getPayReqError = null;
                    this.loading = false;
                });
                return;
            })
            .catch((error: Error) => {
                const error_friendly = errorToUserFriendly(error);
                runInAction(() => {
                    this.withdrawal_req = null;
                    this.getPayReqError = error_friendly;
                    this.loading = false;
                });
            });
    };

    @action
    private getRoutesError = () => {
        this.loadingFeeEstimate = false;
        this.feeEstimate = null;
        this.successProbability = null;
    };

    @action
    private getRoutes = (destination: string, amount: string | number) => {
        this.loadingFeeEstimate = true;
        this.feeEstimate = null;
        this.successProbability = null;

        return BackendUtils.getRoutes([destination, amount])
            .then((data: any) => {
                runInAction(() => {
                    this.loadingFeeEstimate = false;
                    this.successProbability = data.success_prob
                        ? data.success_prob * 100
                        : 0;

                    const routes = data.routes;
                    if (routes) {
                        routes.forEach((route: any) => {
                            // expect lnd to pick the cheapest route
                            if (this.feeEstimate) {
                                if (route.total_fees < this.feeEstimate) {
                                    this.feeEstimate = route.total_fees;
                                }
                            } else {
                                this.feeEstimate = route.total_fees || 0;
                            }
                        });
                    }
                });
            })
            .catch(() => this.getRoutesError());
    };
}
