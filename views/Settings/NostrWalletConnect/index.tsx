import React from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    Text,
    ScrollView
} from 'react-native';
import { SearchBar } from 'react-native-elements';
import { inject, observer } from 'mobx-react';
import { StackNavigationProp } from '@react-navigation/stack';
import ModalBox from '../../../components/ModalBox';

import Screen from '../../../components/Screen';
import Header from '../../../components/Header';
import Switch from '../../../components/Switch';
import LoadingIndicator from '../../../components/LoadingIndicator';
import CollapsedQR from '../../../components/CollapsedQR';
import Button from '../../../components/Button';
import { Body } from '../../../components/text/Body';

import SettingsStore from '../../../stores/SettingsStore';
import NostrWalletConnectStore from '../../../stores/NostrWalletConnectStore';
import { themeColor } from '../../../utils/ThemeUtils';
import { localeString } from '../../../utils/LocaleUtils';

import NWCConnection from '../../../models/NWCConnection';

import Add from '../../../assets/images/SVG/Add.svg';
import ShareIcon from '../../../assets/images/SVG/Share.svg';
import Close from '../../../assets/images/SVG/Close.svg';
import Nostrich from '../../../assets/images/SVG/Nostrich.svg';
import Clock from '../../../assets/images/SVG/Clock.svg';
import Checkmark from '../../../assets/images/SVG/Checkmark.svg';
import ErrorIcon from '../../../assets/images/SVG/ErrorIcon.svg';

interface NostrWalletConnectProps {
    navigation: StackNavigationProp<any, any>;
    SettingsStore: SettingsStore;
    NostrWalletConnectStore: NostrWalletConnectStore;
}

interface NostrWalletConnectState {
    showQRModal: boolean;
    selectedConnection: NWCConnection | null;
    searchQuery: string;
}

@inject('SettingsStore', 'NostrWalletConnectStore')
@observer
export default class NostrWalletConnect extends React.Component<
    NostrWalletConnectProps,
    NostrWalletConnectState
> {
    constructor(props: NostrWalletConnectProps) {
        super(props);
        this.state = {
            showQRModal: false,
            selectedConnection: null,
            searchQuery: ''
        };
    }

    async componentDidMount() {
        this.props.navigation.addListener('focus', this.handleFocus);
        // Store handles initialization automatically
    }

    componentWillUnmount() {
        this.props.navigation.removeListener &&
            this.props.navigation.removeListener('focus', this.handleFocus);
    }

    handleFocus = async () => {
        // Store automatically reloads connections
    };

    toggleService = async () => {
        const { SettingsStore, NostrWalletConnectStore } = this.props;
        const enabled = !SettingsStore.settings?.nwcServiceEnabled;

        try {
            if (enabled) {
                await NostrWalletConnectStore.startService();
            } else {
                await NostrWalletConnectStore.stopService();
            }

            await SettingsStore.updateSettings({
                nwcServiceEnabled: enabled
            });
        } catch (error: any) {
            console.error('Failed to toggle NWC service:', error);
            Alert.alert(
                localeString('general.error'),
                `Failed to ${enabled ? 'start' : 'stop'} NWC service: ${
                    error.message
                }`
            );
        }
    };

    shareConnection = (connection: NWCConnection) => {
        this.setState({
            showQRModal: true,
            selectedConnection: connection
        });
    };

    closeQRModal = () => {
        this.setState({
            showQRModal: false,
            selectedConnection: null
        });
    };

    deleteConnection = (connectionId: string) => {
        Alert.alert(
            localeString('general.warning'),
            localeString(
                'views.Settings.NostrWalletConnect.deleteConnectionWarning'
            ),
            [
                {
                    text: localeString('general.cancel'),
                    style: 'cancel'
                },
                {
                    text: localeString('general.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        await this.props.NostrWalletConnectStore.deleteConnection(
                            connectionId
                        );
                    }
                }
            ]
        );
    };

    getFilteredConnections = () => {
        const { connections } = this.props.NostrWalletConnectStore;
        const { searchQuery } = this.state;

        if (!searchQuery.trim()) {
            return connections;
        }

        return connections.filter((connection) =>
            connection.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    getConnectionStatus = (connection: NWCConnection) => {
        if (!connection.enabled) {
            return {
                status: 'disabled',
                color: themeColor('secondaryText'),
                icon: ErrorIcon
            };
        }
        if (connection.isExpired) {
            return {
                status: 'expired',
                color: themeColor('error'),
                icon: Clock
            };
        }
        if (connection.hasRecentActivity) {
            return {
                status: 'active',
                color: themeColor('success'),
                icon: Checkmark
            };
        }
        return {
            status: 'idle',
            color: themeColor('secondaryText'),
            icon: Clock
        };
    };

    formatDate = (date: Date) => {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    renderConnection = ({ item: connection }: { item: NWCConnection }) => {
        const status = this.getConnectionStatus(connection);
        const StatusIcon = status.icon;

        return (
            <TouchableOpacity
                style={styles.connectionCard}
                onPress={() => this.shareConnection(connection)}
            >
                <View style={styles.connectionHeader}>
                    <View style={styles.connectionInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.connectionName}>
                                {connection.name}
                            </Text>
                            <StatusIcon
                                fill={status.color}
                                width={16}
                                height={16}
                            />
                        </View>
                        <Text style={styles.connectionSubtitle}>
                            {connection.permissions.length} permissions
                        </Text>
                    </View>
                    <View style={styles.connectionActions}>
                        <TouchableOpacity
                            onPress={() => this.shareConnection(connection)}
                            style={styles.actionButton}
                        >
                            <ShareIcon
                                fill={themeColor('text')}
                                width={18}
                                height={18}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => this.deleteConnection(connection.id)}
                            style={[styles.actionButton, styles.deleteButton]}
                        >
                            <Close
                                fill={themeColor('error')}
                                width={16}
                                height={16}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.connectionDetails}>
                    {connection.lastUsed && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Last used:</Text>
                            <Text style={styles.detailValue}>
                                {this.formatDate(connection.lastUsed)}
                            </Text>
                        </View>
                    )}

                    {connection.budgetAmount && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Budget:</Text>
                            <Text style={styles.detailValue}>
                                {connection.budgetAmount.toLocaleString()} sats
                                {connection.budgetRenewal !== 'never' &&
                                    ` (${connection.budgetRenewal})`}
                            </Text>
                        </View>
                    )}

                    {connection.expiresAt && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Expires:</Text>
                            <Text style={styles.detailValue}>
                                {this.formatDate(connection.expiresAt)}
                            </Text>
                        </View>
                    )}

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Created:</Text>
                        <Text style={styles.detailValue}>
                            {this.formatDate(connection.createdAt)}
                        </Text>
                    </View>
                </View>

                <View style={styles.permissionsContainer}>
                    <Text style={styles.permissionsLabel}>Permissions:</Text>
                    <View style={styles.permissionsList}>
                        {connection.permissions
                            .slice(0, 3)
                            .map((permission, index) => (
                                <View key={index} style={styles.permissionTag}>
                                    <Text style={styles.permissionText}>
                                        {permission.replace('_', ' ')}
                                    </Text>
                                </View>
                            ))}
                        {connection.permissions.length > 3 && (
                            <View style={styles.permissionTag}>
                                <Text style={styles.permissionText}>
                                    +{connection.permissions.length - 3} more
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    renderSeparator = () => <View style={styles.separator} />;

    renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Nostrich
                fill={themeColor('text')}
                width={60}
                height={60}
                style={{ alignSelf: 'center', marginBottom: 16 }}
            />
            <Text style={styles.emptyStateTitle}>
                {localeString(
                    'views.Settings.NostrWalletConnect.noConnections'
                )}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
                {localeString(
                    'views.Settings.NostrWalletConnect.createFirstConnection'
                )}
            </Text>
        </View>
    );

    render() {
        const { SettingsStore, NostrWalletConnectStore, navigation } =
            this.props;
        const { settings } = SettingsStore;
        const { connections, loading, serviceInfo } = NostrWalletConnectStore;
        const serviceEnabled = settings?.nwcServiceEnabled || false;

        if (loading) {
            return (
                <Screen>
                    <Header
                        leftComponent="Back"
                        centerComponent={{
                            text: localeString(
                                'views.Settings.NostrWalletConnect.title'
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
                            'views.Settings.NostrWalletConnect.title'
                        ),
                        style: {
                            color: themeColor('text'),
                            fontFamily: 'PPNeueMontreal-Book'
                        }
                    }}
                    rightComponent={
                        serviceEnabled ? (
                            <TouchableOpacity
                                onPress={() =>
                                    navigation.navigate('AddNWCConnection')
                                }
                                accessibilityLabel={localeString(
                                    'views.Settings.NostrWalletConnect.addConnection'
                                )}
                            >
                                <Add
                                    fill={themeColor('text')}
                                    width={30}
                                    height={30}
                                    style={{ alignSelf: 'center' }}
                                />
                            </TouchableOpacity>
                        ) : undefined
                    }
                    navigation={navigation}
                />

                <ScrollView
                    style={styles.container}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Service Status Card */}
                    <View style={styles.serviceCard}>
                        <View style={styles.serviceHeader}>
                            <View style={styles.serviceInfo}>
                                <Text style={styles.serviceTitle}>
                                    {localeString(
                                        'views.Settings.NostrWalletConnect.enableService'
                                    )}
                                </Text>
                                {serviceEnabled && serviceInfo.isRunning && (
                                    <View style={styles.statusRow}>
                                        <View style={styles.statusIndicator} />
                                        <Text style={styles.statusText}>
                                            Service Running
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Switch
                                value={serviceEnabled}
                                onValueChange={this.toggleService}
                                disabled={loading}
                            />
                        </View>

                        {serviceEnabled && (
                            <View style={styles.serviceStats}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>
                                        {serviceInfo.connectionCount}
                                    </Text>
                                    <Text style={styles.statLabel}>Active</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>
                                        {serviceInfo.totalConnections}
                                    </Text>
                                    <Text style={styles.statLabel}>Total</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>
                                        {serviceInfo.activeSubscriptions}
                                    </Text>
                                    <Text style={styles.statLabel}>
                                        Connected
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {!serviceEnabled && (
                        <View style={styles.serviceDescription}>
                            <Text style={styles.descriptionText}>
                                {localeString(
                                    'views.Settings.NostrWalletConnect.serviceDescription'
                                )}
                            </Text>
                        </View>
                    )}

                    {/* Connections List */}
                    {serviceEnabled && (
                        <View style={styles.connectionsContainer}>
                            {connections.length > 0 && (
                                <View style={styles.searchContainer}>
                                    <SearchBar
                                        placeholder={localeString(
                                            'general.search'
                                        )}
                                        onChangeText={(value?: string) =>
                                            this.setState({
                                                searchQuery: value ?? ''
                                            })
                                        }
                                        value={this.state.searchQuery}
                                        inputStyle={styles.searchInput}
                                        placeholderTextColor={themeColor(
                                            'secondaryText'
                                        )}
                                        containerStyle={
                                            styles.searchContainerStyle
                                        }
                                        inputContainerStyle={
                                            styles.searchInputContainer
                                        }
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="visible-password"
                                        platform="default"
                                        showLoading={false}
                                        onClear={() =>
                                            this.setState({ searchQuery: '' })
                                        }
                                        onCancel={() => {
                                            this.setState({ searchQuery: '' });
                                        }}
                                        cancelButtonTitle="Cancel"
                                        cancelButtonProps={{}}
                                        searchIcon={{
                                            name: 'search',
                                            type: 'font-awesome'
                                        }}
                                        clearIcon={{
                                            name: 'close',
                                            type: 'font-awesome'
                                        }}
                                        showCancel={true}
                                        onBlur={() => {}}
                                        onFocus={() => {}}
                                        loadingProps={{}}
                                        lightTheme={false}
                                        round={false}
                                    />
                                </View>
                            )}

                            {this.getFilteredConnections().length > 0 ? (
                                <FlatList
                                    data={this.getFilteredConnections()}
                                    renderItem={this.renderConnection}
                                    keyExtractor={(item) => item.id}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={
                                        styles.connectionsList
                                    }
                                    ItemSeparatorComponent={
                                        this.renderSeparator
                                    }
                                />
                            ) : connections.length > 0 ? (
                                <View style={styles.emptySearch}>
                                    <Text style={styles.emptySearchText}>
                                        No connections found
                                    </Text>
                                </View>
                            ) : (
                                this.renderEmptyState()
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* QR Modal */}
                <ModalBox
                    style={[
                        styles.qrModal,
                        { backgroundColor: themeColor('background') }
                    ]}
                    isOpen={this.state.showQRModal}
                    onClosed={this.closeQRModal}
                    swipeToClose={true}
                    backdropPressToClose={true}
                    position="center"
                >
                    {this.state.selectedConnection && (
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Body bold>
                                    {this.state.selectedConnection.name}
                                </Body>
                                <Text style={styles.modalSubtitle}>
                                    NWC Connection
                                </Text>
                            </View>

                            <View style={styles.urlContainer}>
                                <Text style={styles.urlText}>
                                    {
                                        this.state.selectedConnection
                                            .connectionString
                                    }
                                </Text>
                            </View>

                            <View style={styles.qrContainer}>
                                <CollapsedQR
                                    value={
                                        this.state.selectedConnection
                                            .connectionString
                                    }
                                    copyValue={
                                        this.state.selectedConnection
                                            .connectionString
                                    }
                                    expanded
                                    hideText
                                    showShare={true}
                                    iconOnly={true}
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <Button
                                    title={localeString('general.close')}
                                    onPress={this.closeQRModal}
                                    buttonStyle={styles.closeButton}
                                    titleStyle={styles.closeButtonText}
                                />
                            </View>
                        </View>
                    )}
                </ModalBox>
            </Screen>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    serviceCard: {
        backgroundColor: themeColor('secondary'),
        borderRadius: 16,
        padding: 20,
        marginTop: 20,
        marginBottom: 10
    },
    serviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    serviceInfo: {
        flex: 1
    },
    serviceTitle: {
        color: themeColor('text'),
        fontSize: 18,
        fontFamily: 'PPNeueMontreal-Book',
        fontWeight: '600'
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: themeColor('success'),
        marginRight: 6
    },
    statusText: {
        color: themeColor('success'),
        fontSize: 12,
        fontFamily: 'PPNeueMontreal-Book'
    },
    serviceStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: themeColor('border')
    },
    statItem: {
        alignItems: 'center'
    },
    statValue: {
        color: themeColor('text'),
        fontSize: 20,
        fontFamily: 'PPNeueMontreal-Book',
        fontWeight: '600'
    },
    statLabel: {
        color: themeColor('secondaryText'),
        fontSize: 12,
        fontFamily: 'PPNeueMontreal-Book',
        marginTop: 2
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: themeColor('border')
    },
    serviceDescription: {
        backgroundColor: themeColor('secondary'),
        borderRadius: 12,
        padding: 16,
        marginBottom: 20
    },
    descriptionText: {
        color: themeColor('secondaryText'),
        fontSize: 14,
        fontFamily: 'PPNeueMontreal-Book',
        lineHeight: 20
    },
    connectionsContainer: {
        marginTop: 10
    },
    searchContainer: {
        marginBottom: 16
    },
    searchContainerStyle: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        borderBottomWidth: 0,
        width: '100%'
    },
    searchInputContainer: {
        borderRadius: 12,
        backgroundColor: themeColor('secondary')
    },
    searchInput: {
        color: themeColor('text'),
        fontFamily: 'PPNeueMontreal-Book'
    },
    connectionsList: {
        paddingBottom: 20
    },
    connectionCard: {
        backgroundColor: themeColor('secondary'),
        borderRadius: 16,
        padding: 16,
        marginBottom: 8
    },
    connectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    connectionInfo: {
        flex: 1
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    connectionName: {
        color: themeColor('text'),
        fontSize: 16,
        fontFamily: 'PPNeueMontreal-Book',
        fontWeight: '600',
        marginRight: 8
    },
    connectionSubtitle: {
        color: themeColor('secondaryText'),
        fontSize: 12,
        fontFamily: 'PPNeueMontreal-Book'
    },
    connectionActions: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: themeColor('background')
    },
    deleteButton: {
        marginLeft: 8
    },
    connectionDetails: {
        marginBottom: 12
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    detailLabel: {
        color: themeColor('secondaryText'),
        fontSize: 12,
        fontFamily: 'PPNeueMontreal-Book'
    },
    detailValue: {
        color: themeColor('text'),
        fontSize: 12,
        fontFamily: 'PPNeueMontreal-Book'
    },
    permissionsContainer: {
        borderTopWidth: 1,
        borderTopColor: themeColor('border'),
        paddingTop: 12
    },
    permissionsLabel: {
        color: themeColor('secondaryText'),
        fontSize: 12,
        fontFamily: 'PPNeueMontreal-Book',
        marginBottom: 8
    },
    permissionsList: {
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    permissionTag: {
        backgroundColor: themeColor('background'),
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 6,
        marginBottom: 4
    },
    permissionText: {
        color: themeColor('text'),
        fontSize: 10,
        fontFamily: 'PPNeueMontreal-Book',
        textTransform: 'capitalize'
    },
    separator: {
        height: 8
    },
    emptyState: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60
    },
    emptyStateTitle: {
        textAlign: 'center',
        color: themeColor('text'),
        fontSize: 18,
        fontFamily: 'PPNeueMontreal-Book',
        fontWeight: '600',
        marginBottom: 8
    },
    emptyStateSubtitle: {
        textAlign: 'center',
        color: themeColor('secondaryText'),
        fontSize: 14,
        fontFamily: 'PPNeueMontreal-Book',
        lineHeight: 20
    },
    emptySearch: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40
    },
    emptySearchText: {
        color: themeColor('secondaryText'),
        fontSize: 14,
        fontFamily: 'PPNeueMontreal-Book'
    },
    qrModal: {
        width: '100%',
        borderRadius: 16,
        padding: 0,
        margin: 0
    },
    modalContent: {
        padding: 24
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 16
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: 'PPNeueMontreal-Book',
        color: themeColor('secondaryText'),
        marginTop: 4
    },
    urlContainer: {
        backgroundColor: themeColor('secondary'),
        borderRadius: 8,
        padding: 12,
        marginBottom: 16
    },
    urlText: {
        fontSize: 12,
        fontFamily: 'PPNeueMontreal-Book',
        color: themeColor('text'),
        textAlign: 'center',
        lineHeight: 16
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: 24
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'center'
    },
    closeButton: {
        backgroundColor: themeColor('secondary'),
        borderRadius: 8,
        paddingHorizontal: 24,
        paddingVertical: 8
    },
    closeButtonText: {
        color: themeColor('text'),
        fontFamily: 'PPNeueMontreal-Book'
    }
});
