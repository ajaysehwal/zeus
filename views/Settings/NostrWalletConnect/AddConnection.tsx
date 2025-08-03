import React from 'react';
import { View, StyleSheet, ScrollView, Alert, Share, Text } from 'react-native';
import { ButtonGroup } from 'react-native-elements';
import { inject, observer } from 'mobx-react';
import { StackNavigationProp } from '@react-navigation/stack';

import Screen from '../../../components/Screen';
import Header from '../../../components/Header';
import { Body } from '../../../components/text/Body';
import Button from '../../../components/Button';
import TextInput from '../../../components/TextInput';
import LoadingIndicator from '../../../components/LoadingIndicator';
import Switch from '../../../components/Switch';

import SettingsStore from '../../../stores/SettingsStore';
import NostrWalletConnectStore from '../../../stores/NostrWalletConnectStore';
import { themeColor } from '../../../utils/ThemeUtils';
import { localeString } from '../../../utils/LocaleUtils';

interface AddNWCConnectionProps {
    navigation: StackNavigationProp<any, any>;
    SettingsStore: SettingsStore;
    NostrWalletConnectStore: NostrWalletConnectStore;
}

interface AddNWCConnectionState {
    connectionName: string;
    selectedPermissions: string[];
    budgetAmount: string;
    selectedBudgetRenewalIndex: number;
    expiryDays: string;
}

const availablePermissions = [
    {
        key: 'get_info',
        title: 'Get Info',
        description: 'Allow access to wallet information'
    },
    {
        key: 'get_balance',
        title: 'Get Balance',
        description: 'Allow access to wallet balance'
    },
    {
        key: 'pay_invoice',
        title: 'Pay Invoice',
        description: 'Allow paying lightning invoices'
    },
    {
        key: 'make_invoice',
        title: 'Make Invoice',
        description: 'Allow creating invoices'
    },
    {
        key: 'lookup_invoice',
        title: 'Lookup Invoice',
        description: 'Allow looking up invoice status'
    },
    {
        key: 'list_transactions',
        title: 'List Transactions',
        description: 'Allow viewing transaction history'
    },
    {
        key: 'pay_keysend',
        title: 'Pay Keysend',
        description: 'Allow sending keysend payments'
    }
];

const budgetRenewalOptions = [
    { key: 'never', title: 'Never' },
    { key: 'daily', title: 'Daily' },
    { key: 'weekly', title: 'Weekly' },
    { key: 'monthly', title: 'Monthly' },
    { key: 'yearly', title: 'Yearly' }
];

@inject('SettingsStore', 'NostrWalletConnectStore')
@observer
export default class AddNWCConnection extends React.Component<
    AddNWCConnectionProps,
    AddNWCConnectionState
> {
    constructor(props: AddNWCConnectionProps) {
        super(props);
        this.state = {
            connectionName: '',
            selectedPermissions: ['get_info', 'get_balance', 'pay_invoice'],
            budgetAmount: '',
            selectedBudgetRenewalIndex: 0,
            expiryDays: ''
        };
    }

    async componentDidMount() {
        // Store handles initialization automatically
    }

    togglePermission = (permission: string) => {
        const { selectedPermissions } = this.state;
        const newPermissions = selectedPermissions.includes(permission)
            ? selectedPermissions.filter((p) => p !== permission)
            : [...selectedPermissions, permission];

        this.setState({ selectedPermissions: newPermissions });
    };

    createConnection = async () => {
        const {
            connectionName,
            selectedPermissions,
            budgetAmount,
            selectedBudgetRenewalIndex,
            expiryDays
        } = this.state;
        const { navigation, NostrWalletConnectStore } = this.props;

        if (!connectionName.trim()) {
            Alert.alert(
                localeString('general.error'),
                'Connection name is required'
            );
            return;
        }

        if (selectedPermissions.length === 0) {
            Alert.alert(
                localeString('general.error'),
                'At least one permission is required'
            );
            return;
        }

        try {
            const budgetRenewal =
                budgetRenewalOptions[selectedBudgetRenewalIndex].key;
            const params: any = {
                name: connectionName.trim(),
                permissions: selectedPermissions,
                budgetRenewal
            };

            if (budgetAmount) {
                const budget = parseInt(budgetAmount, 10);
                if (isNaN(budget) || budget <= 0) {
                    Alert.alert(
                        localeString('general.error'),
                        'Budget amount must be a valid positive number'
                    );
                    return;
                }
                params.budgetAmount = budget;
            }

            if (expiryDays) {
                const days = parseInt(expiryDays, 10);
                if (isNaN(days) || days <= 0) {
                    Alert.alert(
                        localeString('general.error'),
                        'Expiry days must be a valid positive number'
                    );
                    return;
                }
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + days);
                params.expiresAt = expiryDate;
            }

            const connection = await NostrWalletConnectStore.createConnection(
                params
            );

            if (connection) {
                Alert.alert(
                    'Connection Created',
                    `"${connection.name}" has been created successfully. You can now share this connection with external apps.`,
                    [
                        {
                            text: 'Share Now',
                            onPress: async () => {
                                try {
                                    await Share.share({
                                        message: connection.connectionString,
                                        title: `${connection.name} - NWC Connection`
                                    });
                                } catch (error) {
                                    console.error('Failed to share:', error);
                                }
                                navigation.goBack();
                            }
                        },
                        {
                            text: 'Done',
                            onPress: () => navigation.goBack()
                        }
                    ]
                );
            }
        } catch (error: any) {
            console.error('Failed to create connection:', error);
            Alert.alert(
                localeString('general.error'),
                `Failed to create connection: ${error.message}`
            );
        }
    };

    renderPermissionItem = (permission: any) => {
        const { selectedPermissions } = this.state;
        const isSelected = selectedPermissions.includes(permission.key);

        return (
            <View
                key={permission.key}
                style={{ flexDirection: 'row', marginTop: 20 }}
            >
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text
                        style={{
                            color: themeColor('text'),
                            fontSize: 17,
                            fontFamily: 'PPNeueMontreal-Book'
                        }}
                    >
                        {permission.title}
                    </Text>
                    <Text
                        style={{
                            color: themeColor('secondaryText'),
                            fontSize: 14,
                            marginTop: 4,
                            fontFamily: 'PPNeueMontreal-Book'
                        }}
                    >
                        {permission.description}
                    </Text>
                </View>
                <View style={{ alignSelf: 'center', marginLeft: 5 }}>
                    <Switch
                        value={isSelected}
                        onValueChange={() =>
                            this.togglePermission(permission.key)
                        }
                    />
                </View>
            </View>
        );
    };

    render() {
        const { navigation, NostrWalletConnectStore } = this.props;
        const { loading } = NostrWalletConnectStore;
        const {
            connectionName,
            budgetAmount,
            selectedBudgetRenewalIndex,
            expiryDays
        } = this.state;

        // Create button functions for budget renewal
        const budgetButtons: any = budgetRenewalOptions.map(
            (option, index) => ({
                element: () => (
                    <Text
                        style={{
                            fontFamily: 'PPNeueMontreal-Book',
                            fontSize: 13,
                            color:
                                selectedBudgetRenewalIndex === index
                                    ? themeColor('background')
                                    : themeColor('text')
                        }}
                    >
                        {option.title}
                    </Text>
                )
            })
        );

        if (loading) {
            return (
                <Screen>
                    <Header
                        leftComponent="Back"
                        centerComponent={{
                            text: localeString(
                                'views.Settings.NostrWalletConnect.addConnection'
                            ),
                            style: {
                                color: themeColor('text'),
                                fontFamily: 'PPNeueMontreal-Book'
                            }
                        }}
                        navigation={navigation}
                    />
                    <View style={styles.loadingContainer}>
                        <LoadingIndicator />
                    </View>
                </Screen>
            );
        }

        return (
            <Screen>
                <Header
                    leftComponent="Back"
                    centerComponent={{
                        text: localeString(
                            'views.Settings.NostrWalletConnect.addConnection'
                        ),
                        style: {
                            color: themeColor('text'),
                            fontFamily: 'PPNeueMontreal-Book'
                        }
                    }}
                    navigation={navigation}
                />

                <View style={styles.mainContainer}>
                    <ScrollView
                        style={styles.scrollContainer}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Connection Name */}
                        <View style={styles.section}>
                            <View style={styles.sectionTitleContainer}>
                                <Body bold>
                                    {localeString(
                                        'views.Settings.NostrWalletConnect.connectionName'
                                    )}
                                </Body>
                            </View>
                            <TextInput
                                placeholder={localeString(
                                    'views.Settings.NostrWalletConnect.enterConnectionName'
                                )}
                                value={connectionName}
                                onChangeText={(text: string) =>
                                    this.setState({ connectionName: text })
                                }
                                style={styles.textInput}
                            />
                        </View>

                        {/* Permissions */}
                        <View style={styles.section}>
                            <View style={styles.sectionTitleContainer}>
                                <Body bold>
                                    {localeString(
                                        'views.Settings.NostrWalletConnect.permissions'
                                    )}
                                </Body>
                            </View>
                            <View style={styles.sectionDescriptionContainer}>
                                <Body small color="secondaryText">
                                    {localeString(
                                        'views.Settings.NostrWalletConnect.selectPermissions'
                                    )}
                                </Body>
                            </View>
                            <View style={{ marginHorizontal: 15 }}>
                                {availablePermissions.map(
                                    this.renderPermissionItem
                                )}
                            </View>
                        </View>

                        {/* Budget (Optional) */}
                        <View style={styles.section}>
                            <View style={styles.sectionTitleContainer}>
                                <Body bold>
                                    {localeString(
                                        'views.Settings.NostrWalletConnect.budgetOptional'
                                    )}
                                </Body>
                            </View>
                            <View style={styles.sectionDescriptionContainer}>
                                <Body small color="secondaryText">
                                    {localeString(
                                        'views.Settings.NostrWalletConnect.budgetDescription'
                                    )}
                                </Body>
                            </View>
                            <TextInput
                                placeholder={localeString(
                                    'views.Settings.NostrWalletConnect.budgetSats'
                                )}
                                value={budgetAmount}
                                onChangeText={(text: string) =>
                                    this.setState({ budgetAmount: text })
                                }
                                keyboardType="numeric"
                                style={styles.textInput}
                            />

                            {/* Budget Renewal */}
                            <View style={styles.renewalContainer}>
                                <ButtonGroup
                                    onPress={(selectedIndex: number) => {
                                        this.setState({
                                            selectedBudgetRenewalIndex:
                                                selectedIndex
                                        });
                                    }}
                                    selectedIndex={selectedBudgetRenewalIndex}
                                    buttons={budgetButtons}
                                    selectedButtonStyle={{
                                        backgroundColor:
                                            themeColor('highlight'),
                                        borderRadius: 8
                                    }}
                                    containerStyle={{
                                        backgroundColor:
                                            themeColor('secondary'),
                                        borderRadius: 8,
                                        borderColor: themeColor('secondary'),
                                        marginHorizontal: 10,
                                        marginTop: 10,
                                        height: 40
                                    }}
                                    innerBorderStyle={{
                                        color: themeColor('secondary')
                                    }}
                                />
                            </View>
                        </View>

                        {/* Expiry (Optional) */}
                        <View style={styles.section}>
                            <View style={styles.sectionTitleContainer}>
                                <Body bold>
                                    {localeString(
                                        'views.Settings.NostrWalletConnect.expiryOptional'
                                    )}
                                </Body>
                            </View>
                            <View style={styles.sectionDescriptionContainer}>
                                <Body small color="secondaryText">
                                    {localeString(
                                        'views.Settings.NostrWalletConnect.expiryDescription'
                                    )}
                                </Body>
                            </View>
                            <TextInput
                                placeholder={localeString(
                                    'views.Settings.NostrWalletConnect.expiryDays'
                                )}
                                value={expiryDays}
                                onChangeText={(text: string) =>
                                    this.setState({ expiryDays: text })
                                }
                                keyboardType="numeric"
                                style={styles.textInput}
                            />
                        </View>
                    </ScrollView>

                    <View style={[styles.bottomButtonContainer]}>
                        <Button
                            title={localeString(
                                'views.Settings.NostrWalletConnect.createConnection'
                            )}
                            onPress={this.createConnection}
                            buttonStyle={{
                                ...styles.createButton
                            }}
                            titleStyle={{
                                color: themeColor('secondaryText'),
                                fontFamily: 'PPNeueMontreal-Book',
                                fontSize: 16,
                                fontWeight: '600'
                            }}
                            disabled={loading}
                        />
                    </View>
                </View>
            </Screen>
        );
    }
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    mainContainer: {
        flex: 1
    },
    scrollContainer: {
        flex: 1
    },
    scrollContent: {
        paddingBottom: 20
    },
    section: {
        marginTop: 20,
        marginBottom: 10
    },
    sectionTitleContainer: {
        marginHorizontal: 15,
        marginBottom: 8
    },
    sectionDescriptionContainer: {
        marginHorizontal: 15,
        marginBottom: 12
    },
    textInput: {
        marginHorizontal: 10,
        marginVertical: 5
    },
    renewalContainer: {
        marginTop: 5
    },
    bottomButtonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        paddingBottom: 15,
        backgroundColor: themeColor('background')
    },
    createButton: {
        borderRadius: 12,
        paddingVertical: 12,
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    }
});
