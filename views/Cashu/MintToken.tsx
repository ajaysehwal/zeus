import * as React from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    View,
    TouchableOpacity
} from 'react-native';
import { inject, observer } from 'mobx-react';
import { Route } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
            lockedDuration?: string;
        }
    >;
}

interface MintTokenState {
    loading: boolean;
    memo: string;
    value: string;
    satAmount: string | number;
    lockedPubkey: string;
    lockedDuration: string;
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
            lockedDuration: '',
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

    handleScreenFocus = () => {
        const { route } = this.props;
        if (route.params?.lockedPubkey) {
            this.setState({
                lockedPubkey: route.params.lockedPubkey,
                lockedDuration: route.params.lockedDuration || ''
            });
            this.props.navigation.setParams({
                lockedPubkey: undefined,
                lockedDuration: undefined
            });
        }
    };

    // Convert duration string to seconds
    convertDurationToSeconds = (duration: string): number => {
        if (!duration) return 0;

        // Handle "forever" as 1000 years in seconds
        if (duration === 'forever') {
            return 31536000000; // 1000 years in seconds
        }

        // Parse custom durations like "1 day", "2 weeks", etc.
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

    handleLockSettingsSave = (pubkey: string, duration: string) => {
        console.log(
            'Lock settings saved with pubkey:',
            pubkey,
            'duration:',
            duration
        );

        // Calculate seconds for the duration
        const durationSeconds = this.convertDurationToSeconds(duration);
        console.log('Duration in seconds:', durationSeconds);

        this.setState({
            lockedPubkey: pubkey,
            lockedDuration: duration
        });
    };

    render() {
        const { CashuStore, navigation } = this.props;
        const { memo, value, satAmount, lockedPubkey, lockedDuration } =
            this.state;
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
                                                this.setState({
                                                    memo: text
                                                });
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
                                            this.setState({
                                                value: amount,
                                                satAmount
                                            });
                                        }}
                                    />

                                    {/* Lock to Pubkey (optional) field */}
                                    <View
                                        style={{
                                            marginTop: 20,
                                            marginBottom: 10
                                        }}
                                    >
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            onPress={() => {
                                                console.log(
                                                    'handleLockSettingsSave type:',
                                                    typeof this
                                                        .handleLockSettingsSave
                                                );
                                                (
                                                    global as any
                                                ).handleCashuLockSettingsSave =
                                                    this.handleLockSettingsSave;
                                                console.log(
                                                    'Global function set:',
                                                    typeof (global as any)
                                                        .handleCashuLockSettingsSave
                                                );

                                                this.props.navigation.navigate(
                                                    'CashuLockSettings',
                                                    {
                                                        currentPubkey:
                                                            lockedPubkey,
                                                        currentDuration:
                                                            lockedDuration,
                                                        fromMintToken: true
                                                    }
                                                );
                                            }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                alignSelf: 'center',
                                                justifyContent: 'center',
                                                paddingVertical: 12,
                                                paddingHorizontal: 22,
                                                borderRadius: 10,
                                                backgroundColor:
                                                    themeColor('secondary'),
                                                shadowColor: '#000',
                                                shadowOffset: {
                                                    width: 0,
                                                    height: 2
                                                },
                                                shadowOpacity: 0.08,
                                                shadowRadius: 8,
                                                elevation: 2,
                                                width: '90%'
                                            }}
                                        >
                                            <Ionicons
                                                name={
                                                    lockedPubkey
                                                        ? 'lock-closed-outline'
                                                        : 'lock-open-outline'
                                                }
                                                size={20}
                                                color={themeColor('text')}
                                                style={{ marginRight: 10 }}
                                            />
                                            <Text
                                                style={{
                                                    color: themeColor('text'),
                                                    fontFamily:
                                                        'PPNeueMontreal-Medium',
                                                    fontSize: 16
                                                }}
                                            >
                                                {lockedPubkey
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
                                                              lockedDuration ||
                                                                  localeString(
                                                                      'cashu.noDuration'
                                                                  )
                                                          )
                                                    : localeString(
                                                          'cashu.lockToPubkey'
                                                      )}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.button}>
                                        <Button
                                            title={localeString(
                                                'cashu.mintEcashToken'
                                            )}
                                            onPress={() => {
                                                // Calculate duration in seconds if pubkey is locked
                                                const lockSeconds = lockedPubkey
                                                    ? this.convertDurationToSeconds(
                                                          lockedDuration
                                                      )
                                                    : 0;

                                                // Add lock data to token params if pubkey is set
                                                const params: any = {
                                                    memo,
                                                    value:
                                                        satAmount.toString() ||
                                                        '0'
                                                };

                                                console.log('params', params);
                                                console.log(
                                                    'lockedPubkey',
                                                    lockedPubkey
                                                );
                                                console.log(
                                                    'lockedDuration',
                                                    lockedDuration
                                                );
                                                console.log(
                                                    'lockSeconds',
                                                    lockSeconds
                                                );

                                                if (lockedPubkey) {
                                                    // Only send pubkey and duration in seconds
                                                    params.lockedPubkey =
                                                        lockedPubkey;
                                                    // Use lockSeconds as the duration value
                                                    params.lockedDuration =
                                                        lockSeconds.toString();
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
    }
});
