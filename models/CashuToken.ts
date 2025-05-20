import { computed } from 'mobx';
import { Proof } from '@cashu/cashu-ts';

import BaseModel from './BaseModel';

import CashuUtils from '../utils/CashuUtils';
import DateTimeUtils from '../utils/DateTimeUtils';
import { localeString } from '../utils/LocaleUtils';

const supportedUnits = ['sat'];

export default class CashuToken extends BaseModel {
    public memo: string;
    public mint: string;
    public unit: string;
    public received?: boolean;
    public sent?: boolean;
    public spent?: boolean; // only for sent tokens
    public encodedToken?: string;
    public lockedPubkey?: string;
    public lockedDuration?: string;
    public proofs: Proof[];
    public created_at?: number;
    public received_at?: number;

    constructor(data: any) {
        super(data);

        // Log input data for debugging
        console.log('CashuToken constructor data:', {
            hasRootLockProps: !!(data.lockedPubkey || data.lockedDuration),
            hasNestedToken: !!(
                data.token &&
                Array.isArray(data.token) &&
                data.token.length > 0
            ),
            hasNestedLockProps:
                data.token && Array.isArray(data.token) && data.token.length > 0
                    ? !!(
                          data.token[0].lockedPubkey ||
                          data.token[0].lockedDuration
                      )
                    : false
        });

        // First check if lock properties exist at the root level
        if (data.lockedPubkey) {
            this.lockedPubkey = data.lockedPubkey;
            console.log(
                'Setting lockedPubkey from root level:',
                data.lockedPubkey
            );
        }
        if (data.lockedDuration) {
            this.lockedDuration = data.lockedDuration;
            console.log(
                'Setting lockedDuration from root level:',
                data.lockedDuration
            );
        }

        // Also handle nested token structure
        if (data.token && Array.isArray(data.token) && data.token.length > 0) {
            const tokenData = data.token[0];
            if (tokenData.lockedPubkey) {
                this.lockedPubkey = tokenData.lockedPubkey;
                console.log(
                    'Setting lockedPubkey from nested token:',
                    tokenData.lockedPubkey
                );
            }
            if (tokenData.lockedDuration) {
                this.lockedDuration = tokenData.lockedDuration;
                console.log(
                    'Setting lockedDuration from nested token:',
                    tokenData.lockedDuration
                );
            }
        }
    }

    @computed public get model(): string {
        return localeString('cashu.token');
    }

    @computed public get getAmount(): number {
        return CashuUtils.sumProofsValue(this.proofs);
    }

    @computed public get isSupported(): boolean {
        return supportedUnits.includes(this.unit);
    }

    @computed public get getMemo(): string {
        return this.memo;
    }

    @computed public get getDisplayTime(): string {
        return this.getTimestamp
            ? DateTimeUtils.listFormattedDate(this.getTimestamp)
            : '';
    }

    @computed public get getDisplayTimeOrder(): string {
        return DateTimeUtils.listFormattedDateOrder(
            new Date(this.getTimestamp * 1000)
        );
    }

    @computed public get getDisplayTimeShort(): string {
        return DateTimeUtils.listFormattedDateShort(this.getTimestamp);
    }

    @computed public get getTimestamp(): number {
        return this.received ? this.received_at || 0 : this.created_at || 0;
    }

    @computed public get getLockedDuration(): number {
        return this.lockedDuration ? parseInt(this.lockedDuration) : 0;
    }

    @computed public get getLockedPubkey(): string {
        return this.lockedPubkey || '';
    }
}
