import * as React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { inject, observer } from 'mobx-react';
import { Route } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Clipboard from '@react-native-clipboard/clipboard';

import Header from '../../components/Header';
import Screen from '../../components/Screen';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import Button from '../../components/Button';

import ContactStore from '../../stores/ContactStore';

import { localeString } from '../../utils/LocaleUtils';
import { themeColor } from '../../utils/ThemeUtils';
import AddressUtils from '../../utils/AddressUtils';

import ContactIcon from '../../assets/images/SVG/PeersContact.svg';

interface CashuLockSettingsProps {
    navigation: StackNavigationProp<any, any>;
    ContactStore: ContactStore;
    route: Route<
        'CashuLockSettings',
        {
            onSave?: (pubkey: string, duration: string) => void;
            currentLockPubkey?: string;
            currentDuration?: string;
            destination?: string | null;
            contactName?: string;
            hasCashuPubkey?: boolean;
            fromMintToken?: boolean;
            memo?: string;
            value?: string;
            satAmount?: string | number;
            account?: string;
        }
    >;
}

interface CashuLockSettingsState {
    lockedPubkey: string;
    duration: string;
    lockedPubkeyError: string;
    showCustomDuration: boolean;
    customDurationValue: string;
    customDurationUnit: string;
    customDurationError: string;
    showUnitDropdown: boolean;
    memo: string;
    value: string;
    satAmount: string | number;
    account: string;
}

@inject('ContactStore')
@observer
export default class CashuLockSettings extends React.Component<
    CashuLockSettingsProps,
    CashuLockSettingsState
> {
    private originalFormData: {
        memo?: string;
        value?: string;
        satAmount?: string | number;
        account?: string;
    } | null = null;

    constructor(props: CashuLockSettingsProps) {
        super(props);
        const { route } = props;
        const {
            currentLockPubkey,
            currentDuration,
            memo,
            value,
            satAmount,
            account
        } = route.params || {};

        console.log(
            'CashuLockSettings constructor, route params:',
            route.params
        );

        this.state = {
            lockedPubkey: currentLockPubkey || '',
            duration: currentDuration || '',
            lockedPubkeyError: '',
            showCustomDuration: false,
            customDurationValue: '',
            customDurationUnit: 'day',
            customDurationError: '',
            showUnitDropdown: false,
            memo: memo || '',
            value: value || '',
            satAmount: satAmount || '',
            account: account || 'default'
        };

        this.handleContactSelection = this.handleContactSelection.bind(this);
    }

    componentDidMount() {
        this.props.navigation.addListener('focus', this.handleFocus);
    }

    componentWillUnmount() {
        this.props.navigation.removeListener('focus', this.handleFocus);
    }

    handleFocus = () => {
        const { route } = this.props;
        const { params } = route;

        // Store the original form data when first mounting
        if (!this.originalFormData && params) {
            this.originalFormData = {
                memo: params.memo,
                value: params.value,
                satAmount: params.satAmount,
                account: params.account
            };
        }

        if (params?.contactName) {
            if (params.hasCashuPubkey === false) {
                this.setState({
                    lockedPubkey: '',
                    lockedPubkeyError: localeString(
                        'cashu.contactNoCashuPubkey'
                    )
                });
            } else if (params?.destination) {
                this.setState({
                    lockedPubkey: params.destination,
                    lockedPubkeyError: ''
                });
            }

            // Only clear contact-related params
            this.props.navigation.setParams({
                destination: undefined,
                contactName: undefined,
                hasCashuPubkey: undefined
            });
        }
    };

    handleContactSelection(lockedPubkey: string) {
        this.setState({
            lockedPubkey,
            lockedPubkeyError: ''
        });
    }

    validatePubkey = (pubkey: string) => {
        if (!pubkey) {
            return localeString('cashu.pubkeyRequired');
        }

        if (!AddressUtils.isValidLightningPubKey(pubkey)) {
            return localeString('cashu.invalidCashuPubkey');
        }

        return '';
    };

    validateCustomDurationValue = (value: string) => {
        if (!value.trim()) {
            return localeString('cashu.durationRequired');
        }

        const numValue = Number(value);
        if (isNaN(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
            return localeString('cashu.invalidDurationNumber');
        }

        return '';
    };

    handleLockedPubkeyChange = (text: string) => {
        this.setState({
            lockedPubkey: text,
            lockedPubkeyError: ''
        });
    };

    handleCustomDurationValueChange = (text: string) => {
        const numericText = text.replace(/[^0-9]/g, '');
        const error = numericText
            ? this.validateCustomDurationValue(numericText)
            : '';

        this.setState({
            customDurationValue: numericText,
            customDurationError: error
        });
    };

    getCustomDurationString = () => {
        const { customDurationValue, customDurationUnit } = this.state;

        if (!customDurationValue) return '';

        const value = parseInt(customDurationValue, 10);
        const unitPlural =
            value === 1 ? customDurationUnit : `${customDurationUnit}s`;

        return `${value} ${unitPlural}`;
    };

    handleSave = () => {
        const { navigation } = this.props;
        const {
            lockedPubkey,
            duration,
            lockedPubkeyError,
            showCustomDuration,
            customDurationValue
        } = this.state;

        console.log('*** LOCK BUTTON PRESSED ***');
        console.log('lockedPubkey:', lockedPubkey);
        console.log('duration:', duration);
        console.log('showCustomDuration:', showCustomDuration);
        console.log('customDurationValue:', customDurationValue);
        console.log('Original form data:', this.originalFormData);

        const validationError = this.validatePubkey(lockedPubkey);
        if (validationError) {
            console.log('Pubkey validation failed:', validationError);
            this.setState({ lockedPubkeyError: validationError });
            return;
        }

        if (showCustomDuration && !customDurationValue) {
            console.log('Custom duration validation failed: missing value');
            this.setState({
                customDurationError: localeString('cashu.durationRequired')
            });
            return;
        }

        if (
            !lockedPubkey ||
            !AddressUtils.isValidLightningPubKey(lockedPubkey) ||
            lockedPubkeyError
        ) {
            console.log('Invalid pubkey, cannot proceed');
            return;
        }

        if (!duration && !(showCustomDuration && customDurationValue)) {
            console.log('No duration selected, cannot proceed');
            return;
        }

        const finalDuration = showCustomDuration
            ? this.getCustomDurationString()
            : duration;

        try {
            // Create navigation params with lock settings
            const navigationParams: any = {
                lockedPubkey,
                duration: finalDuration,
                fromLockSettings: true
            };

            // Add original form data if it exists
            if (this.originalFormData) {
                Object.entries(this.originalFormData).forEach(
                    ([key, value]) => {
                        if (value !== undefined) {
                            navigationParams[key] = value;
                        }
                    }
                );
            }

            console.log(
                'Navigating back to MintToken with params:',
                navigationParams
            );
            navigation.navigate('MintToken', navigationParams);
        } catch (error) {
            console.error('Error in handleSave:', error);
            this.setState({
                lockedPubkeyError: localeString('cashu.errorSavingLock')
            });
        }
    };

    render() {
        const { navigation } = this.props;
        const {
            lockedPubkey,
            duration,
            lockedPubkeyError,
            showCustomDuration,
            customDurationValue,
            customDurationUnit
        } = this.state;

        const isFormValid =
            lockedPubkey &&
            AddressUtils.isValidLightningPubKey(lockedPubkey) &&
            !lockedPubkeyError &&
            ((duration && !showCustomDuration) ||
                (showCustomDuration &&
                    customDurationValue &&
                    !this.state.customDurationError));

        const timeUnits = ['hour', 'day', 'week', 'month', 'year'];

        return (
            <Screen>
                <Header
                    leftComponent="Back"
                    navigateBackOnBackPress={true}
                    centerComponent={{
                        text: localeString('cashu.lockEcash'),
                        style: {
                            color: themeColor('text'),
                            fontFamily: 'PPNeueMontreal-Book'
                        }
                    }}
                    navigation={navigation}
                />

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text
                        style={{
                            fontFamily: 'PPNeueMontreal-Medium',
                            fontSize: 14,
                            color: themeColor('secondaryText'),
                            marginBottom: 8
                        }}
                    >
                        {localeString('cashu.lockEcashDescription')}
                    </Text>

                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 5
                        }}
                    >
                        <TextInput
                            placeholder={'02abc...'}
                            value={lockedPubkey}
                            onChangeText={this.handleLockedPubkeyChange}
                            style={{
                                flex: 1,
                                paddingHorizontal: 15,
                                paddingRight: 40
                            }}
                            textInputStyle={{
                                color: themeColor('text')
                            }}
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate('Contacts', {
                                    SendScreen: true,
                                    returnToCashuLockSettings: true
                                });
                            }}
                            style={{ position: 'absolute', right: 10 }}
                        >
                            <ContactIcon
                                fill={themeColor('text')}
                                width={30}
                                height={30}
                            />
                        </TouchableOpacity>
                    </View>

                    {lockedPubkeyError ? (
                        <Text
                            style={{
                                color: themeColor('delete'),
                                fontSize: 14,
                                marginBottom: 16,
                                marginTop: -12
                            }}
                        >
                            {lockedPubkeyError}
                        </Text>
                    ) : null}

                    <Button
                        icon={{
                            type: 'ionicon',
                            name: 'clipboard-outline',
                            size: 20,
                            color: themeColor('secondary')
                        }}
                        onPress={async () => {
                            const text = await Clipboard.getString();
                            if (AddressUtils.isValidLightningPubKey(text)) {
                                this.setState({
                                    lockedPubkey: text,
                                    lockedPubkeyError: ''
                                });
                            }
                        }}
                        buttonStyle={styles.pasteButton}
                        titleStyle={styles.pasteButtonText}
                        title={localeString('general.paste')}
                    />

                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 12
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: 'PPNeueMontreal-Medium',
                                fontSize: 16,
                                color: themeColor('text'),
                                marginRight: 8
                            }}
                        >
                            {localeString('cashu.lockFor')}
                        </Text>
                        <View
                            style={{
                                flex: 1,
                                height: 1,
                                backgroundColor: themeColor('secondaryText'),
                                opacity: 0.15
                            }}
                        />
                    </View>

                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 8
                        }}
                    >
                        {['1 day', '1 week', 'Forever', 'Custom'].map(
                            (option) => (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => {
                                        if (option === 'Custom') {
                                            this.setState({
                                                showCustomDuration: true,
                                                duration: ''
                                            });
                                        } else {
                                            this.setState({
                                                duration:
                                                    duration === option
                                                        ? ''
                                                        : option,
                                                showCustomDuration: false,
                                                customDurationValue: '',
                                                customDurationError: ''
                                            });
                                        }
                                    }}
                                    style={{
                                        width: 75,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor:
                                            (option === 'Custom' &&
                                                showCustomDuration) ||
                                            (option !== 'Custom' &&
                                                duration === option)
                                                ? themeColor('text')
                                                : themeColor('secondary'),
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        shadowColor: '#000',
                                        shadowOffset: {
                                            width: 0,
                                            height: 2
                                        },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 3,
                                        elevation: 2
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={{
                                            color:
                                                (option === 'Custom' &&
                                                    showCustomDuration) ||
                                                (option !== 'Custom' &&
                                                    duration === option)
                                                    ? themeColor('secondary')
                                                    : themeColor('text'),
                                            fontSize: 14,
                                            fontWeight: '500',
                                            fontFamily: 'PPNeueMontreal-Medium'
                                        }}
                                    >
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            )
                        )}
                    </View>

                    {showCustomDuration && (
                        <View style={{ marginBottom: 24 }}>
                            <Text
                                style={{
                                    fontFamily: 'PPNeueMontreal-Medium',
                                    fontSize: 14,
                                    color: themeColor('secondaryText'),
                                    marginBottom: 12
                                }}
                            >
                                {localeString('cashu.customDuration')}
                            </Text>

                            <View
                                style={{
                                    flexDirection: 'row',
                                    marginBottom: 8,
                                    alignItems: 'center',
                                    gap: 12
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <TextInput
                                        placeholder={'1-999'}
                                        value={customDurationValue}
                                        onChangeText={
                                            this.handleCustomDurationValueChange
                                        }
                                        style={{
                                            paddingHorizontal: 15,
                                            height: 48,
                                            borderRadius: 12,
                                            backgroundColor:
                                                themeColor('secondary')
                                        }}
                                        textInputStyle={{
                                            color: themeColor('text'),
                                            fontSize: 18,
                                            fontFamily: 'PPNeueMontreal-Medium'
                                        }}
                                        keyboardType="number-pad"
                                    />
                                </View>

                                <View style={{ flex: 1.5 }}>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor:
                                                themeColor('secondary'),
                                            height: 48,
                                            borderRadius: 12,
                                            paddingHorizontal: 15,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                        onPress={() => {
                                            this.setState({
                                                showUnitDropdown:
                                                    !this.state.showUnitDropdown
                                            });
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={{
                                                color: themeColor('text'),
                                                fontSize: 18,
                                                fontFamily:
                                                    'PPNeueMontreal-Medium',
                                                textTransform: 'capitalize'
                                            }}
                                        >
                                            {customDurationUnit}
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 16,
                                                color: themeColor('text'),
                                                transform: [
                                                    {
                                                        rotate: this.state
                                                            .showUnitDropdown
                                                            ? '180deg'
                                                            : '0deg'
                                                    }
                                                ]
                                            }}
                                        >
                                            ▼
                                        </Text>
                                    </TouchableOpacity>

                                    {this.state.showUnitDropdown && (
                                        <View
                                            style={{
                                                position: 'absolute',
                                                top: 52,
                                                left: 0,
                                                right: 0,
                                                backgroundColor:
                                                    themeColor('secondary'),
                                                borderRadius: 12,
                                                zIndex: 999,
                                                shadowColor: '#000',
                                                shadowOffset: {
                                                    width: 0,
                                                    height: 4
                                                },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 6,
                                                elevation: 8,
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {timeUnits.map((unit, index) => (
                                                <TouchableOpacity
                                                    key={unit}
                                                    style={{
                                                        paddingVertical: 14,
                                                        paddingHorizontal: 15,
                                                        borderBottomWidth:
                                                            index !==
                                                            timeUnits.length - 1
                                                                ? 1
                                                                : 0,
                                                        borderBottomColor:
                                                            'rgba(255, 255, 255, 0.1)',
                                                        backgroundColor:
                                                            customDurationUnit ===
                                                            unit
                                                                ? themeColor(
                                                                      'text'
                                                                  )
                                                                : 'transparent'
                                                    }}
                                                    onPress={() => {
                                                        this.setState({
                                                            customDurationUnit:
                                                                unit,
                                                            showUnitDropdown:
                                                                false
                                                        });
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={{
                                                            color:
                                                                customDurationUnit ===
                                                                unit
                                                                    ? themeColor(
                                                                          'secondary'
                                                                      )
                                                                    : themeColor(
                                                                          'text'
                                                                      ),
                                                            fontSize: 18,
                                                            fontFamily:
                                                                'PPNeueMontreal-Medium',
                                                            textTransform:
                                                                'capitalize'
                                                        }}
                                                    >
                                                        {unit}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            {customDurationValue &&
                                !this.state.customDurationError && (
                                    <Text
                                        style={{
                                            fontFamily: 'PPNeueMontreal-Medium',
                                            fontSize: 16,
                                            color: themeColor('success'),
                                            marginTop: 12,
                                            textAlign: 'center'
                                        }}
                                    >
                                        {`${customDurationValue} ${
                                            customDurationValue === '1'
                                                ? customDurationUnit
                                                : customDurationUnit + 's'
                                        }`}
                                    </Text>
                                )}

                            {duration === 'Forever' && (
                                <Text
                                    style={{
                                        fontFamily: 'PPNeueMontreal-Medium',
                                        fontSize: 14,
                                        color: themeColor('text'),
                                        marginTop: 12,
                                        marginBottom: 12,
                                        textAlign: 'center'
                                    }}
                                >
                                    {localeString('cashu.lockForeverWarning')}
                                </Text>
                            )}

                            {this.state.customDurationError ? (
                                <Text
                                    style={{
                                        color: themeColor('delete'),
                                        fontSize: 14,
                                        marginTop: 4
                                    }}
                                >
                                    {this.state.customDurationError}
                                </Text>
                            ) : null}
                        </View>
                    )}

                    <View style={styles.bottomButtonContainer}>
                        <Button
                            onPress={() => {
                                const navigationParams: {
                                    lockedPubkey: string;
                                    duration: string;
                                    fromLockSettings: boolean;
                                    memo: string;
                                    value: string;
                                    satAmount: string | number;
                                    account: string;
                                } = {
                                    lockedPubkey: '',
                                    duration: '',
                                    fromLockSettings: true,
                                    memo: this.state.memo,
                                    value: this.state.value,
                                    satAmount: this.state.satAmount,
                                    account: this.state.account
                                };

                                navigation.navigate(
                                    'MintToken',
                                    navigationParams
                                );
                            }}
                            containerStyle={styles.bottomButton}
                            buttonStyle={styles.cancelButton}
                            titleStyle={styles.cancelButtonText}
                            title={localeString('cashu.cancel')}
                        />

                        <Button
                            onPress={this.handleSave}
                            containerStyle={styles.bottomButton}
                            buttonStyle={[
                                styles.lockButton,
                                !isFormValid && styles.lockButtonDisabled
                            ]}
                            titleStyle={{
                                ...styles.lockButtonText,
                                ...(!isFormValid &&
                                    styles.lockButtonTextDisabled)
                            }}
                            disabled={!isFormValid}
                            title={localeString('cashu.lock')}
                        />
                    </View>

                    {lockedPubkey &&
                        AddressUtils.isValidLightningPubKey(lockedPubkey) &&
                        !duration &&
                        !showCustomDuration && (
                            <Text
                                style={{
                                    color: themeColor('delete'),
                                    fontSize: 14,
                                    textAlign: 'center',
                                    marginBottom: 16
                                }}
                            >
                                {localeString('cashu.selectDurationRequired')}
                            </Text>
                        )}
                </ScrollView>
            </Screen>
        );
    }
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 20
    },
    text: {
        fontFamily: 'PPNeueMontreal-Book'
    },
    pasteButton: {
        backgroundColor: themeColor('text'),
        borderRadius: 8,
        height: 48,
        marginBottom: 24
    },
    pasteButtonText: {
        color: themeColor('secondary'),
        fontSize: 15,
        fontFamily: 'PPNeueMontreal-Medium'
    },
    bottomButtonContainer: {
        marginTop: 'auto',
        marginBottom: 20,
        gap: 12
    },
    bottomButton: {
        flex: 1
    },
    cancelButton: {
        height: 48,
        borderRadius: 8,
        backgroundColor: themeColor('secondary')
    },
    cancelButtonText: {
        color: themeColor('text'),
        fontSize: 16,
        fontFamily: 'PPNeueMontreal-Medium'
    },
    lockButton: {
        height: 48,
        borderRadius: 8,
        backgroundColor: themeColor('text')
    },
    lockButtonDisabled: {
        backgroundColor: themeColor('secondary')
    },
    lockButtonText: {
        color: themeColor('secondary'),
        fontSize: 16,
        fontFamily: 'PPNeueMontreal-Medium'
    },
    lockButtonTextDisabled: {
        color: 'rgba(0, 0, 0, 0.3)'
    }
});
