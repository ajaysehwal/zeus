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
            currentPubkey?: string;
            currentDuration?: string;
            destination?: string | null;
            contactName?: string;
            hasCashuPubkey?: boolean;
            fromMintToken?: boolean;
        }
    >;
}

interface CashuLockSettingsState {
    pubkey: string;
    duration: string;
    pubkeyError: string;
    showCustomDuration: boolean;
    customDurationValue: string;
    customDurationUnit: string;
    customDurationError: string;
    showUnitDropdown: boolean;
}

@inject('ContactStore')
@observer
export default class CashuLockSettings extends React.Component<
    CashuLockSettingsProps,
    CashuLockSettingsState
> {
    constructor(props: CashuLockSettingsProps) {
        super(props);
        const { route } = props;
        const { currentPubkey, currentDuration } = route.params || {};

        this.state = {
            pubkey: currentPubkey || '',
            duration: currentDuration || '',
            pubkeyError: '',
            showCustomDuration: false,
            customDurationValue: '',
            customDurationUnit: 'day',
            customDurationError: '',
            showUnitDropdown: false
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
        if (params?.contactName) {
            if (params.hasCashuPubkey === false) {
                // Selected contact doesn't have a Cashu pubkey
                this.setState({
                    pubkey: '',
                    pubkeyError: localeString('cashu.contactNoCashuPubkey')
                });
            } else if (params?.destination) {
                // Contact has a Cashu pubkey
                this.setState({
                    pubkey: params.destination,
                    pubkeyError: ''
                });
            }
            // Clear the params to prevent setting the value again if we return to this screen
            this.props.navigation.setParams({
                destination: undefined,
                contactName: undefined,
                hasCashuPubkey: undefined
            });
        }
    };

    handleContactSelection(pubkey: string) {
        this.setState({
            pubkey,
            pubkeyError: ''
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

    handlePubkeyChange = (text: string) => {
        this.setState({
            pubkey: text,
            pubkeyError: ''
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
        const { navigation, route } = this.props;
        const {
            pubkey,
            duration,
            pubkeyError,
            showCustomDuration,
            customDurationValue
        } = this.state;
        const { onSave } = route.params || {};

        console.log('*** LOCK BUTTON PRESSED ***');
        console.log('pubkey:', pubkey);
        console.log('duration:', duration);
        console.log('showCustomDuration:', showCustomDuration);
        console.log('customDurationValue:', customDurationValue);
        console.log('onSave exists:', !!onSave);
        console.log('onSave type:', typeof onSave);
        console.log('route params:', route.params);

        console.log(
            'Global callback exists:',
            !!(global as any).handleCashuLockSettingsSave
        );
        console.log(
            'Global callback type:',
            typeof (global as any).handleCashuLockSettingsSave
        );
        console.log('fromMintToken flag:', route.params?.fromMintToken);

        const validationError = this.validatePubkey(pubkey);
        if (validationError) {
            console.log('Pubkey validation failed:', validationError);
            this.setState({ pubkeyError: validationError });
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
            !pubkey ||
            !AddressUtils.isValidLightningPubKey(pubkey) ||
            pubkeyError
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

        console.log('Final duration:', finalDuration);

        try {
            if (
                typeof (global as any).handleCashuLockSettingsSave ===
                'function'
            ) {
                console.log(
                    'Using global callback with:',
                    pubkey,
                    finalDuration
                );

                // Call the callback
                (global as any).handleCashuLockSettingsSave(
                    pubkey,
                    finalDuration
                );

                // Navigate back to MintToken with the lock data as params
                navigation.navigate('MintToken', {
                    lockedPubkey: pubkey,
                    lockedDuration: finalDuration
                });
            }
            // Fall back to direct callback if available
            else if (
                route.params &&
                typeof route.params.onSave === 'function'
            ) {
                console.log(
                    'Using direct callback with:',
                    pubkey,
                    finalDuration
                );

                // Call the direct callback
                route.params.onSave(pubkey, finalDuration);

                // Navigate back with lock params
                navigation.navigate('MintToken', {
                    lockedPubkey: pubkey,
                    lockedDuration: finalDuration
                });
            }
            // No callback available
            else {
                console.warn(
                    'No callback found - saving values and returning anyway'
                );

                // Always navigate back to MintToken with lock params
                navigation.navigate('MintToken', {
                    lockedPubkey: pubkey,
                    lockedDuration: finalDuration
                });
            }
        } catch (error) {
            // Log any errors that occur during the save process
            console.error('Error in handleSave:', error);

            // Show error message through error state
            this.setState({
                pubkeyError: localeString('cashu.errorSavingLock')
            });
        }
    };

    render() {
        const { navigation } = this.props;
        const {
            pubkey,
            duration,
            pubkeyError,
            showCustomDuration,
            customDurationValue,
            customDurationUnit
        } = this.state;

        // Check if the form is valid for enabling the save button
        const isFormValid =
            pubkey &&
            AddressUtils.isValidLightningPubKey(pubkey) &&
            !pubkeyError &&
            // Require either a selected duration or a valid custom duration
            ((duration && !showCustomDuration) ||
                (showCustomDuration &&
                    customDurationValue &&
                    !this.state.customDurationError));

        const timeUnits = ['hour', 'day', 'week', 'month', 'year'];

        return (
            <Screen>
                <Header
                    leftComponent="Back"
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
                            marginBottom: 20
                        }}
                    >
                        <TextInput
                            placeholder={'lnbc1...'}
                            value={pubkey}
                            onChangeText={this.handlePubkeyChange}
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

                    {pubkeyError ? (
                        <Text
                            style={{
                                color: themeColor('delete'),
                                fontSize: 14,
                                marginBottom: 16,
                                marginTop: -12
                            }}
                        >
                            {pubkeyError}
                        </Text>
                    ) : null}

                    <TouchableOpacity
                        onPress={async () => {
                            const text = await Clipboard.getString();
                            const error = this.validatePubkey(text);
                            this.setState({
                                pubkey: text,
                                pubkeyError: error
                            });
                        }}
                        style={{
                            backgroundColor: themeColor('text'),
                            borderRadius: 8,
                            height: 48,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 24
                        }}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={{
                                color: themeColor('secondary'),
                                fontWeight: '600',
                                fontSize: 15,
                                fontFamily: 'PPNeueMontreal-Medium'
                            }}
                        >
                            {localeString('general.paste')}
                        </Text>
                    </TouchableOpacity>

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
                            marginBottom: 12,
                            gap: 8
                        }}
                    >
                        {['1 day', '1 week', 'forever', 'Custom'].map(
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
                                    alignItems: 'center'
                                }}
                            >
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <TextInput
                                        placeholder={'1-999'}
                                        value={customDurationValue}
                                        onChangeText={
                                            this.handleCustomDurationValueChange
                                        }
                                        style={{
                                            paddingHorizontal: 15,
                                            height: 48
                                        }}
                                        textInputStyle={{
                                            color: themeColor('text'),
                                            fontSize: 16
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
                                            borderRadius: 8,
                                            paddingHorizontal: 15,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            borderWidth: 1,
                                            borderColor:
                                                'rgba(255, 255, 255, 0.1)'
                                        }}
                                        onPress={() => {
                                            this.setState({
                                                showUnitDropdown:
                                                    !this.state.showUnitDropdown
                                            });
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: themeColor('text'),
                                                fontSize: 16,
                                                fontFamily:
                                                    'PPNeueMontreal-Medium',
                                                textTransform: 'capitalize'
                                            }}
                                        >
                                            {customDurationUnit}
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                color: themeColor('text')
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
                                                borderRadius: 8,
                                                zIndex: 10,
                                                shadowColor: '#000',
                                                shadowOffset: {
                                                    width: 0,
                                                    height: 2
                                                },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 3,
                                                elevation: 5,
                                                borderWidth: 1,
                                                borderColor:
                                                    'rgba(255, 255, 255, 0.1)'
                                            }}
                                        >
                                            {timeUnits.map((unit) => (
                                                <TouchableOpacity
                                                    key={unit}
                                                    style={{
                                                        paddingVertical: 12,
                                                        paddingHorizontal: 15,
                                                        borderBottomWidth:
                                                            unit !==
                                                            timeUnits[
                                                                timeUnits.length -
                                                                    1
                                                            ]
                                                                ? 1
                                                                : 0,
                                                        borderBottomColor:
                                                            'rgba(255, 255, 255, 0.1)',
                                                        backgroundColor:
                                                            customDurationUnit ===
                                                            unit
                                                                ? '#fff'
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
                                                >
                                                    <Text
                                                        style={{
                                                            color:
                                                                customDurationUnit ===
                                                                unit
                                                                    ? '#000'
                                                                    : themeColor(
                                                                          'text'
                                                                      ),
                                                            fontSize: 16,
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
                                            fontSize: 14,
                                            color: themeColor('success'),
                                            marginTop: 8
                                        }}
                                    >
                                        {`${customDurationValue} ${
                                            customDurationValue === '1'
                                                ? customDurationUnit
                                                : customDurationUnit + 's'
                                        }`}
                                    </Text>
                                )}

                            {duration === 'forever' && (
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

                    <View
                        style={{
                            flexDirection: 'row',
                            marginTop: 'auto',
                            marginBottom: 20,
                            gap: 12
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{
                                flex: 1,
                                height: 48,
                                borderRadius: 8,
                                backgroundColor: themeColor('secondary'),
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={{
                                    color: themeColor('text'),
                                    fontSize: 16,
                                    fontWeight: '500',
                                    fontFamily: 'PPNeueMontreal-Medium'
                                }}
                            >
                                {localeString('cashu.cancel')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={this.handleSave}
                            style={{
                                flex: 1,
                                height: 48,
                                borderRadius: 8,
                                backgroundColor: !isFormValid
                                    ? themeColor('secondary')
                                    : themeColor('text'),
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: themeColor('secondary')
                            }}
                            activeOpacity={0.7}
                            disabled={!isFormValid}
                        >
                            <Text
                                style={{
                                    color: !isFormValid
                                        ? 'rgba(0, 0, 0, 0.3)'
                                        : themeColor('secondary'),
                                    fontSize: 16,
                                    fontWeight: '500',
                                    fontFamily: 'PPNeueMontreal-Medium'
                                }}
                            >
                                {localeString('cashu.lock')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {pubkey &&
                        AddressUtils.isValidLightningPubKey(pubkey) &&
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
    }
});
