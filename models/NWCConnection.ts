import { computed } from 'mobx';
import BaseModel from './BaseModel';

export default class NWCConnection extends BaseModel {
    id: string;
    name: string;
    pubkey: string;
    permissions: string[];
    connectionString: string;
    enabled: boolean;
    createdAt: Date;
    lastUsed?: Date;
    budgetAmount?: number;
    budgetRenewal?: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    expiresAt?: Date;

    constructor(data?: any) {
        super(data);

        // Convert date strings to Date objects if needed
        if (this.createdAt && typeof this.createdAt === 'string') {
            this.createdAt = new Date(this.createdAt);
        }
        if (this.lastUsed && typeof this.lastUsed === 'string') {
            this.lastUsed = new Date(this.lastUsed);
        }
        if (this.expiresAt && typeof this.expiresAt === 'string') {
            this.expiresAt = new Date(this.expiresAt);
        }
    }

    @computed public get isExpired(): boolean {
        if (!this.expiresAt) return false;
        return new Date() > this.expiresAt;
    }

    @computed public get statusText(): string {
        if (!this.enabled) return 'Disabled';
        if (this.isExpired) return 'Expired';
        return 'Active';
    }

    @computed public get hasRecentActivity(): boolean {
        if (!this.lastUsed) return false;
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return this.lastUsed > dayAgo;
    }
}
