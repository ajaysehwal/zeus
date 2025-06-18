import * as React from 'react';
import {
    Text,
    View,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { inject, observer } from 'mobx-react';
import { StackNavigationProp } from '@react-navigation/stack';
import { SearchBar, Icon, Divider } from 'react-native-elements';

import Header from '../../../components/Header';
import LoadingIndicator from '../../../components/LoadingIndicator';
import Screen from '../../../components/Screen';
import Button from '../../../components/Button';

import SettingsStore from '../../../stores/SettingsStore';
import BackendUtils from '../../../utils/BackendUtils';

import { localeString } from '../../../utils/LocaleUtils';
import { themeColor } from '../../../utils/ThemeUtils';

interface WatchtowersProps {
    navigation: StackNavigationProp<any, any>;
    SettingsStore: SettingsStore;
}

interface WatchtowerSessionInfo {
    active_session_candidate: boolean;
    num_sessions: number;
    sessions: any[];
    policy_type: string;
}

interface Watchtower {
    pubkey: string;
    addresses: string[];
    active_session_candidate: boolean;
    num_sessions: number;
    sessions: any[];
    session_info: WatchtowerSessionInfo[];
}

interface WatchtowerListResponse {
    towers: Watchtower[];
}

interface WatchtowersState {
    loading: boolean;
    watchtowers: Watchtower[];
    searchQuery: string;
    refreshing: boolean;
    error: string;
}

@inject('SettingsStore')
@observer
export default class WatchTowers extends React.Component<
    WatchtowersProps,
    WatchtowersState
> {
    state = {
        loading: false,
        watchtowers: [] as Watchtower[],
        searchQuery: '',
        refreshing: false,
        error: ''
    };

    async UNSAFE_componentWillMount() {
        await this.loadWatchtowers();
    }

    loadWatchtowers = async () => {
        this.setState({ loading: true, error: '' });

        try {
            const response: WatchtowerListResponse =
                await BackendUtils.listWatchtowers();

            this.setState({
                watchtowers: response.towers || [],
                loading: false
            });
        } catch (error: any) {
            console.error('Error loading watchtowers:', error);
            this.setState({
                watchtowers: [],
                loading: false,
                error: error.message || 'Failed to load watchtowers'
            });
        }
    };

    onRefresh = async () => {
        this.setState({ refreshing: true });
        await this.loadWatchtowers();
        this.setState({ refreshing: false });
    };

    handleSearch = (text: string) => {
        this.setState({ searchQuery: text });
    };

    getFilteredWatchtowers = () => {
        const { watchtowers, searchQuery } = this.state;
        if (!searchQuery) return watchtowers;

        return watchtowers.filter((watchtower) => {
            const pubkeyMatch = watchtower.pubkey
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

            const addressMatch = watchtower.addresses.some((address) =>
                address.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return pubkeyMatch || addressMatch;
        });
    };

    renderItem = ({ item }: { item: Watchtower }) => (
        <>
            <TouchableOpacity
                style={styles.watchtowerItem}
                onPress={() =>
                    this.props.navigation.navigate('WatchTowerDetails', {
                        watchtower: item
                    })
                }
                disabled={this.state.loading}
            >
                <View style={styles.watchtowerContainer}>
                    <Icon
                        name="radio-tower"
                        type="octicon"
                        size={18}
                        color={
                            item.active_session_candidate
                                ? themeColor('highlight')
                                : themeColor('secondaryText')
                        }
                        containerStyle={styles.watchtowerIcon}
                    />
                    <View style={styles.watchtowerInfo}>
                        <Text
                            style={[
                                styles.watchtowerPubkey,
                                { color: themeColor('text') }
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                        >
                            {item.pubkey}
                        </Text>
                    </View>
                </View>

                <View style={styles.watchtowerControls}>
                    <Icon
                        name="chevron-right"
                        type="feather"
                        size={20}
                        color={themeColor('secondaryText')}
                    />
                </View>
            </TouchableOpacity>
        </>
    );

    renderEmptyState = () => {
        const { searchQuery, error } = this.state;

        if (error) {
            return (
                <View style={styles.emptyContainer}>
                    <Icon
                        name="alert-triangle"
                        type="feather"
                        size={50}
                        color={themeColor('error')}
                        containerStyle={styles.emptyIcon}
                    />
                    <Text
                        style={[
                            styles.emptyText,
                            { color: themeColor('error') }
                        ]}
                    >
                        {error}
                    </Text>
                    <Button
                        title={localeString('general.retry')}
                        onPress={this.loadWatchtowers}
                        containerStyle={{ marginTop: 10 }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Icon
                    name="radio-tower"
                    type="octicon"
                    size={50}
                    color={themeColor('secondaryText')}
                    containerStyle={styles.emptyIcon}
                />
                <Text
                    style={[
                        styles.emptyText,
                        { color: themeColor('secondaryText') }
                    ]}
                >
                    {searchQuery.length > 0
                        ? localeString('views.Settings.Contacts.noAddress')
                        : localeString('views.Tools.watchtowers.noWatchtowers')}
                </Text>
            </View>
        );
    };

    render() {
        const { navigation } = this.props;
        const { loading, searchQuery, refreshing } = this.state;
        const filteredWatchtowers = this.getFilteredWatchtowers();

        return (
            <Screen>
                <Header
                    leftComponent="Back"
                    centerComponent={{
                        text: localeString('views.Tools.watchtowers'),
                        style: {
                            color: themeColor('text'),
                            fontFamily: 'PPNeueMontreal-Book'
                        }
                    }}
                    rightComponent={
                        loading ? <LoadingIndicator size={30} /> : undefined
                    }
                    navigation={navigation}
                />
                <View style={styles.container}>
                    <SearchBar
                        placeholder={localeString('general.search')}
                        // @ts-ignore:next-line
                        onChangeText={this.handleSearch}
                        value={searchQuery}
                        inputStyle={{
                            color: themeColor('text'),
                            fontFamily: 'PPNeueMontreal-Book'
                        }}
                        placeholderTextColor={themeColor('secondaryText')}
                        containerStyle={{
                            backgroundColor: 'transparent',
                            borderTopWidth: 0,
                            borderBottomWidth: 0,
                            paddingHorizontal: 0,
                            marginBottom: 10
                        }}
                        inputContainerStyle={{
                            borderRadius: 15,
                            backgroundColor: themeColor('secondary')
                        }}
                        // @ts-ignore:next-line
                        searchIcon={{
                            importantForAccessibility: 'no-hide-descendants',
                            accessibilityElementsHidden: true
                        }}
                    />

                    {filteredWatchtowers.length > 0 ? (
                        <FlatList
                            data={filteredWatchtowers}
                            renderItem={this.renderItem}
                            keyExtractor={(item) => item.pubkey}
                            contentContainerStyle={styles.listContainer}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={this.onRefresh}
                                    tintColor={themeColor('text')}
                                    colors={[themeColor('highlight')]}
                                />
                            }
                            ItemSeparatorComponent={() => (
                                <Divider
                                    style={[
                                        styles.divider,
                                        {
                                            backgroundColor:
                                                themeColor('border')
                                        }
                                    ]}
                                />
                            )}
                        />
                    ) : (
                        this.renderEmptyState()
                    )}

                    <Button
                        title={localeString('views.Tools.addWatchtower')}
                        onPress={() => navigation.navigate('AddWatchtower')}
                        containerStyle={styles.addButton}
                        icon={{
                            name: 'plus',
                            type: 'feather',
                            size: 16,
                            color: 'white'
                        }}
                    />
                </View>
            </Screen>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15
    },
    listContainer: {
        paddingBottom: 15
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyIcon: {
        marginBottom: 16,
        opacity: 0.6
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center'
    },
    watchtowerItem: {
        flexDirection: 'row',
        padding: 16,
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    watchtowerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    watchtowerIcon: {
        marginRight: 8
    },
    watchtowerInfo: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center'
    },
    watchtowerPubkey: {
        fontSize: 16,
        fontWeight: '500'
    },
    watchtowerAddress: {
        fontSize: 14
    },
    watchtowerSessions: {
        fontSize: 12,
        marginTop: 4
    },
    watchtowerControls: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    deleteButton: {
        marginLeft: 15,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    divider: {
        marginHorizontal: 16
    },
    addButton: {
        marginTop: 15
    }
});
