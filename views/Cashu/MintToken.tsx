import * as React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { inject, observer } from 'mobx-react';
import { Route } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import AmountInput, { getSatAmount } from '../../components/AmountInput';
import Button from '../../components/Button';
import EcashMintPicker from '../../components/EcashMintPicker';
import Header from '../../components/Header';
import LoadingIndicator from '../../components/LoadingIndicator';
import Screen from '../../components/Screen';
import { ErrorMessage } from '../../components/SuccessErrorMessage';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';

import CashuStore from '../../stores/CashuStore';
import ContactStore from '../../stores/ContactStore';

import { localeString } from '../../utils/LocaleUtils';
import { themeColor } from '../../utils/ThemeUtils';

import CashuToken from '../../models/CashuToken';

interface MintTokenProps {
    exitSetup: any;
    navigation: StackNavigationProp<any, any>;
    CashuStore: CashuStore;
    ContactStore: ContactStore;
    route: Route<
        'MintToken',
        {
            amount?: string;
            lockedPubkey?: string;
            lockTime?: string;
            memo?: string;
            value?: string;
            satAmount?: string | number;
            account?: string;
            duration?: string;
            fromLockSettings?: boolean;
        }
    >;
}

interface MintTokenState {
    loading: boolean;
    memo: string;
    value: string;
    satAmount: string | number;
    lockedPubkey: string;
    lockTime: number;
    duration: string;
    account: string;
}

@inject('CashuStore', 'UnitsStore', 'ContactStore')
@observer
export default class MintToken extends React.Component<
    MintTokenProps,
    MintTokenState
> {
    constructor(props: MintTokenProps) {
        super(props);
        this.state = {
            loading: true,
            memo: '',
            value: '',
            satAmount: '',
            lockedPubkey: '',
            lockTime: 0,
            duration: '',
            account: 'default'
        };

        this.handleLockSettingsSave = this.handleLockSettingsSave.bind(this);
    }

    async UNSAFE_componentWillMount() {
        const { CashuStore, route } = this.props;
        const { clearToken } = CashuStore;

        clearToken();

        const { amount } = route.params ?? {};

        if (amount && amount != '0') {
            this.setState({
                value: amount,
                satAmount: getSatAmount(amount)
            });
        }

        this.setState({
            loading: false
        });

        this.props.navigation.addListener('focus', this.handleScreenFocus);
    }

    componentWillUnmount() {
        this.props.navigation.removeListener('focus', this.handleScreenFocus);
    }

    saveFormData = () => {
        const { memo, value, satAmount, account } = this.state;
        this.props.navigation.setParams({
            memo,
            value,
            satAmount,
            account
        });
    };

    handleScreenFocus = () => {
        const { route } = this.props;
        const params = route.params || {};

        console.log('MintToken.handleScreenFocus called, params:', params);

        if (params.fromLockSettings) {
            const stateUpdate: Partial<MintTokenState> = {
                lockedPubkey: params.lockedPubkey,
                duration: params.duration,
                lockTime: this.convertDurationToSeconds(params.duration || ''),
                memo: params.memo || this.state.memo,
                value: params.value || this.state.value,
                satAmount: params.satAmount || this.state.satAmount,
                account: params.account || this.state.account
            };

            console.log('Updating state with:', stateUpdate);
            this.setState(stateUpdate as MintTokenState);
        }

        // Clear navigation params
        this.props.navigation.setParams({
            lockedPubkey: undefined,
            duration: undefined,
            memo: undefined,
            value: undefined,
            satAmount: undefined,
            account: undefined,
            fromLockSettings: undefined
        });
    };

    convertDurationToSeconds = (duration: string): number => {
        if (!duration) return 0;

        if (duration === 'forever') {
            return 31536000000;
        }
        const parts = duration.split(' ');
        if (parts.length !== 2) return 0;

        const value = parseInt(parts[0], 10);
        const unit = parts[1].toLowerCase();

        if (isNaN(value) || value <= 0) return 0;
        switch (unit) {
            case 'hour':
            case 'hours':
                return value * 3600;
            case 'day':
            case 'days':
                return value * 86400;
            case 'week':
            case 'weeks':
                return value * 604800;
            case 'month':
            case 'months':
                return value * 2592000;
            case 'year':
            case 'years':
                return value * 31536000;
            default:
                return 0;
        }
    };

    handleLockSettingsSave = (lockedPubkey: string, duration: string) => {
        console.log(
            'Lock settings saved with pubkey:',
            lockedPubkey,
            'duration:',
            duration
        );
        const lockTime = this.convertDurationToSeconds(duration);
        console.log('Duration in seconds:', lockTime);

        this.setState({
            lockedPubkey,
            lockTime,
            duration
        });
    };

    render() {
        const { CashuStore, navigation } = this.props;
        const { memo, value, satAmount, lockedPubkey, duration } = this.state;
        const { fontScale } = Dimensions.get('window');

        const { mintToken, mintingToken, loadingMsg } = CashuStore;
        const loading = CashuStore.loading || this.state.loading;

        const error_msg = CashuStore.error_msg;

        return (
            <Screen>
                <Header
                    leftComponent="Back"
                    centerComponent={{
                        text: localeString('cashu.mintEcashToken'),
                        style: {
                            color: themeColor('text'),
                            fontFamily: 'PPNeueMontreal-Book'
                        }
                    }}
                    navigation={navigation}
                />
                <View style={{ flex: 1 }}>
                    <ScrollView
                        style={styles.content}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {error_msg && <ErrorMessage message={error_msg} />}

                        <View>
                            {(mintingToken || loading) && (
                                <View style={{ marginTop: 40 }}>
                                    <LoadingIndicator />
                                    {loadingMsg && (
                                        <Text
                                            style={{
                                                marginTop: 35,
                                                fontFamily:
                                                    'PPNeueMontreal-Book',
                                                fontSize: 16 / fontScale,
                                                color: themeColor('text'),
                                                textAlign: 'center'
                                            }}
                                        >
                                            {loadingMsg}
                                        </Text>
                                    )}
                                </View>
                            )}
                            {!loading && !mintingToken && (
                                <>
                                    <>
                                        <Text
                                            style={{
                                                ...styles.text,
                                                color: themeColor(
                                                    'secondaryText'
                                                )
                                            }}
                                        >
                                            {localeString('cashu.mint')}
                                        </Text>
                                        <View
                                            style={{
                                                marginTop: 10,
                                                marginBottom: 10
                                            }}
                                        >
                                            <EcashMintPicker
                                                navigation={navigation}
                                            />
                                        </View>
                                    </>
                                    <>
                                        <Text
                                            style={{
                                                ...styles.text,
                                                color: themeColor(
                                                    'secondaryText'
                                                )
                                            }}
                                        >
                                            {localeString('views.Receive.memo')}
                                        </Text>
                                        <TextInput
                                            placeholder={localeString(
                                                'views.Receive.memoPlaceholder'
                                            )}
                                            value={memo}
                                            onChangeText={(text: string) => {
                                                this.setState(
                                                    { memo: text },
                                                    this.saveFormData
                                                );
                                            }}
                                        />
                                    </>

                                    <AmountInput
                                        amount={value}
                                        title={localeString(
                                            'views.Receive.amount'
                                        )}
                                        onAmountChange={(
                                            amount: string,
                                            satAmount: string | number
                                        ) => {
                                            this.setState(
                                                {
                                                    value: amount,
                                                    satAmount
                                                },
                                                this.saveFormData
                                            );
                                        }}
                                    />

                                    {/* Lock to Pubkey (optional) field */}
                                    <View style={styles.lockContainer}>
                                        <Button
                                            icon={{
                                                type: 'ionicon',
                                                name: lockedPubkey
                                                    ? 'lock-closed-outline'
                                                    : 'lock-open-outline',
                                                size: 20,
                                                color: themeColor('text')
                                            }}
                                            title={
                                                lockedPubkey
                                                    ? localeString(
                                                          'cashu.lockedTo'
                                                      )
                                                          .replace(
                                                              '{pubkey}',
                                                              lockedPubkey.slice(
                                                                  0,
                                                                  8
                                                              )
                                                          )
                                                          .replace(
                                                              '{duration}',
                                                              duration ||
                                                                  localeString(
                                                                      'cashu.noDuration'
                                                                  )
                                                          )
                                                    : localeString(
                                                          'cashu.lockToPubkey'
                                                      )
                                            }
                                            onPress={() => {
                                                navigation.navigate(
                                                    'CashuLockSettings',
                                                    {
                                                        currentLockPubkey:
                                                            lockedPubkey,
                                                        currentDuration:
                                                            duration,
                                                        fromMintToken: true,
                                                        memo: this.state.memo,
                                                        value: this.state.value,
                                                        satAmount:
                                                            this.state
                                                                .satAmount,
                                                        account:
                                                            this.state.account
                                                    }
                                                );
                                            }}
                                            containerStyle={
                                                styles.lockButtonContainer
                                            }
                                            secondary={true}
                                            buttonStyle={styles.lockButton}
                                            titleStyle={styles.lockButtonText}
                                        />
                                    </View>

                                    <View style={styles.button}>
                                        <Button
                                            title={localeString(
                                                'cashu.mintEcashToken'
                                            )}
                                            onPress={() => {
                                                const lockSeconds = lockedPubkey
                                                    ? this.convertDurationToSeconds(
                                                          duration
                                                      )
                                                    : 0;
                                                const params: any = {
                                                    memo,
                                                    value:
                                                        satAmount.toString() ||
                                                        '0'
                                                };

                                                if (lockedPubkey) {
                                                    params.lockedPubkey =
                                                        lockedPubkey;
                                                    params.lockTime =
                                                        lockSeconds;
                                                }

                                                mintToken(params).then(
                                                    (
                                                        result:
                                                            | {
                                                                  token: string;
                                                                  decoded: CashuToken;
                                                              }
                                                            | undefined
                                                    ) => {
                                                        if (
                                                            result?.token &&
                                                            result.decoded
                                                        ) {
                                                            const {
                                                                token,
                                                                decoded
                                                            } = result;
                                                            navigation.navigate(
                                                                'CashuToken',
                                                                {
                                                                    token,
                                                                    decoded
                                                                }
                                                            );
                                                        }
                                                    }
                                                );
                                            }}
                                        />
                                    </View>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Screen>
        );
    }
}

const styles = StyleSheet.create({
    content: {
        paddingLeft: 20,
        paddingRight: 20
    },
    button: {
        paddingTop: 25,
        paddingBottom: 15
    },
    text: {
        fontFamily: 'PPNeueMontreal-Book'
    },
    lockContainer: {
        marginTop: 20,
        marginBottom: 10
    },
    lockButtonContainer: {
        width: '90%',
        alignSelf: 'center'
    },
    lockButton: {
        backgroundColor: themeColor('secondary'),
        borderColor: themeColor('text'),
        opacity: 0.8,
        height: 45
    },
    lockButtonText: {
        color: themeColor('text'),
        fontSize: 14,
        fontFamily: 'PPNeueMontreal-Book'
    }
});
