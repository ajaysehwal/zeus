import * as React from 'react';
import { Route } from '@react-navigation/native';
import { Text, View, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LNURLWithdrawParams } from 'js-lnurl';
import { inject, observer } from 'mobx-react';
import bolt11 from 'bolt11';
import BigNumber from 'bignumber.js';

import Button from '../components/Button';
import Header from '../components/Header';
import PaymentMethodList from '../components/LayerBalances/PaymentMethodList';
import Screen from '../components/Screen';
import Amount from '../components/Amount';
import { ErrorMessage } from '../components/SuccessErrorMessage';

import BalanceStore from '../stores/BalanceStore';
import CashuStore from '../stores/CashuStore';
import UTXOsStore from '../stores/UTXOsStore';
import SwapStore from '../stores/SwapStore';

import { localeString } from '../utils/LocaleUtils';
import { themeColor } from '../utils/ThemeUtils';
import BackendUtils from '../utils/BackendUtils';
import Invoice from '../models/Invoice';

import SwapIcon from '../assets/images/SVG/Swap.svg';

interface ChoosePaymentMethodProps {
    navigation: StackNavigationProp<any, any>;
    route: Route<
        'ChoosePaymentMethod',
        {
            value: string;
            satAmount: string;
            lightning: string;
            lightningAddress: string;
            offer: string;
            lnurlParams: LNURLWithdrawParams | undefined;
        }
    >;
    BalanceStore?: BalanceStore;
    CashuStore?: CashuStore;
    UTXOsStore?: UTXOsStore;
    SwapStore?: SwapStore;
}

interface ChoosePaymentMethodState {
    value: string;
    satAmount: string;
    lightning: string;
    lightningAddress: string;
    offer: string;
    lnurlParams: LNURLWithdrawParams | undefined;
    validAmountToSwap: boolean;
}

@inject('BalanceStore', 'CashuStore', 'UTXOsStore', 'SwapStore')
@observer
export default class ChoosePaymentMethod extends React.Component<
    ChoosePaymentMethodProps,
    ChoosePaymentMethodState
> {
    state = {
        value: '',
        satAmount: '',
        lightning: '',
        lightningAddress: '',
        offer: '',
        lnurlParams: undefined,
        validAmountToSwap: false
    };

    async componentDidMount() {
        const { route } = this.props;
        const {
            value,
            satAmount,
            lightning,
            lightningAddress,
            offer,
            lnurlParams
        } = route.params ?? {};

        if (value) {
            this.setState({ value });
        }

        // If satAmount is provided, use it directly
        if (satAmount) {
            this.setState({ satAmount }, () => {
                const validAmountToSwap = this.isAmountValidToSwap();
                this.setState({ validAmountToSwap });
            });
        } else if (lightning) {
            try {
                const decodedInvoice = bolt11.decode(lightning);
                const invoice = new Invoice(decodedInvoice);

                if (invoice && invoice.getRequestAmount) {
                    this.setState(
                        {
                            satAmount: invoice.getRequestAmount.toString()
                        },
                        () => {
                            const validAmountToSwap =
                                this.isAmountValidToSwap();
                            this.setState({ validAmountToSwap });
                        }
                    );
                }
            } catch (error) {
                console.log('Error decoding invoice for amount:', error);
            }
        }

        if (lightning) {
            this.setState({ lightning });
        }

        if (lightningAddress) {
            this.setState({ lightningAddress });
        }

        if (offer) {
            this.setState({ offer });
        }

        if (lnurlParams) {
            this.setState({ lnurlParams });
        }
    }

    bigCeil = (big: BigNumber): BigNumber => {
        return big.integerValue(BigNumber.ROUND_CEIL);
    };

    calculateSendAmount = (
        receiveAmount: BigNumber,
        serviceFee: number,
        minerFee: number
    ): BigNumber => {
        if (receiveAmount.isNaN() || receiveAmount.isLessThanOrEqualTo(0)) {
            return new BigNumber(0);
        }
        return this.bigCeil(
            receiveAmount
                .plus(
                    this.bigCeil(
                        receiveAmount.times(new BigNumber(serviceFee).div(100))
                    )
                )
                .plus(minerFee)
        );
    };

    calculateLimit = (limit: number): BigNumber => {
        const { SwapStore } = this.props;
        const subInfo: any = SwapStore!.subInfo;
        const serviceFeePct = subInfo?.fees?.percentage || 0;
        const networkFeeBigNum = new BigNumber(subInfo?.fees?.minerFees || 0);
        const networkFee = networkFeeBigNum.toNumber();

        return this.calculateSendAmount(
            new BigNumber(limit),
            serviceFeePct,
            networkFee
        );
    };

    isAmountValidToSwap(): boolean {
        const { SwapStore } = this.props;
        const { satAmount } = this.state;

        if (!SwapStore || !satAmount) {
            return false;
        }

        const subInfo: any = SwapStore.subInfo;

        if (!subInfo || Object.keys(subInfo).length === 0) {
            return false;
        }

        const min = this.calculateLimit(
            subInfo?.limits?.minimal || 0
        ).toNumber();
        const max = this.calculateLimit(
            subInfo?.limits?.maximal || 0
        ).toNumber();
        const minBN = new BigNumber(min);
        const maxBN = new BigNumber(max);

        const input = this.calculateLimit(Number(satAmount) || 0);

        return input.gte(minBN) && input.lte(maxBN);
    }
    hasInsufficientFunds = () => {
        const { BalanceStore, CashuStore, UTXOsStore } = this.props;
        const { satAmount, lightning, lnurlParams, lightningAddress, offer } =
            this.state;

        if (!satAmount) return false;

        const amount = Number(satAmount);
        if (isNaN(amount) || amount <= 0) return false;

        const { accounts } = UTXOsStore!;
        const { totalBlockchainBalance, lightningBalance } = BalanceStore!;
        const { totalBalanceSats } = CashuStore!;

        // Check lightning balance if using lightning payment
        if (lightning || lnurlParams || lightningAddress || offer) {
            if (Number(lightningBalance) >= amount) return false;
            // Check ecash balance if available
            if (
                BackendUtils.supportsCashuWallet() &&
                Number(totalBalanceSats) >= amount
            ) {
                return false;
            }
        }

        // Check on-chain balance
        if (Number(totalBlockchainBalance) >= amount) return false;

        // Check individual accounts
        if (accounts && accounts.length > 0) {
            for (const account of accounts) {
                if (
                    !account.hidden &&
                    !account.watch_only &&
                    account.balance >= amount
                ) {
                    return false;
                }
            }
        }

        return true;
    };

    render() {
        const { navigation, BalanceStore, CashuStore, UTXOsStore } = this.props;
        const {
            value,
            satAmount,
            lightning,
            lightningAddress,
            offer,
            lnurlParams,
            validAmountToSwap
        } = this.state;

        const { accounts } = UTXOsStore!;
        const { totalBlockchainBalance, lightningBalance } = BalanceStore!;
        const { totalBalanceSats } = CashuStore!;
        const hasInsufficientFunds = this.hasInsufficientFunds();

        const isNoAmountInvoice: boolean = !satAmount || satAmount === '0';

        const SwapButton = () => {
            if (!validAmountToSwap || !lightning) return null;

            return (
                <TouchableOpacity
                    onPress={() => {
                        const amountToSwap = satAmount;
                        if (lightning && amountToSwap) {
                            navigation.navigate('Swaps', {
                                initialInvoice: lightning,
                                initialAmountSats: amountToSwap.toString(),
                                initialReverse: false // OnChain -> LN for paying a LN invoice
                            });
                        }
                    }}
                    disabled={!lightning || (!isNoAmountInvoice && !satAmount)}
                    style={{
                        opacity:
                            !lightning || (!isNoAmountInvoice && !satAmount)
                                ? 0.5
                                : 1
                    }}
                >
                    <SwapIcon
                        fill={themeColor('text')}
                        width="36"
                        height="26"
                        style={{ marginRight: 10 }}
                    />
                </TouchableOpacity>
            );
        };

        return (
            <Screen>
                <Header
                    leftComponent="Back"
                    centerComponent={{
                        text: localeString('views.Accounts.select'),
                        style: { color: themeColor('text') }
                    }}
                    rightComponent={
                        validAmountToSwap ? <SwapButton /> : undefined
                    }
                    navigation={navigation}
                />
                {!!satAmount && (
                    <View style={{ paddingVertical: 15, alignItems: 'center' }}>
                        <Text
                            style={{
                                fontSize: 12,
                                fontFamily: 'PPNeueMontreal-Medium',
                                color: themeColor('secondaryText'),
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                marginBottom: 8
                            }}
                        >
                            {localeString('views.Payment.paymentAmount')}
                        </Text>
                        <Amount
                            sats={satAmount}
                            sensitive
                            jumboText
                            toggleable
                        />
                        {hasInsufficientFunds && (
                            <View>
                                <ErrorMessage
                                    message={localeString(
                                        'stores.CashuStore.notEnoughFunds'
                                    )}
                                />
                            </View>
                        )}
                    </View>
                )}
                <PaymentMethodList
                    navigation={navigation}
                    // for payment method selection
                    value={value}
                    satAmount={
                        satAmount && !isNaN(Number(satAmount))
                            ? Number(satAmount)
                            : undefined
                    }
                    lightning={lightning}
                    lightningAddress={lightningAddress}
                    offer={offer}
                    lnurlParams={lnurlParams}
                    // balance data
                    lightningBalance={lightningBalance}
                    onchainBalance={totalBlockchainBalance}
                    ecashBalance={totalBalanceSats}
                    accounts={accounts}
                />
                {!!value && !!lightning && (
                    <Button
                        title={localeString('views.Accounts.fetchTxFees')}
                        containerStyle={{
                            margin: 20
                        }}
                        onPress={() =>
                            navigation.navigate('EditFee', {
                                displayOnly: true
                            })
                        }
                    />
                )}
            </Screen>
        );
    }
}
