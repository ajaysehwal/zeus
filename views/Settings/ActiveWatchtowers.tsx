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

import Header from '../../components/Header';
import LoadingIndicator from '../../components/LoadingIndicator';
import Screen from '../../components/Screen';
import Switch from '../../components/Switch';
import Button from '../../components/Button';

import SettingsStore from '../../stores/SettingsStore';

import { localeString } from '../../utils/LocaleUtils';
import { themeColor } from '../../utils/ThemeUtils';

interface ActiveWatchtowersProps {
    navigation: StackNavigationProp<any, any>;
    SettingsStore: SettingsStore;
}

interface Watchtower {
    pubkey: string;
    address: string;
    active: boolean;
}
interface ActiveWatchtowersState {
    loading: boolean;
    activeWatchtowers: Watchtower[];
    searchQuery: string;
    refreshing: boolean;
}

@inject('SettingsStore')
@observer
export default class ActiveWatchtowers extends React.Component<
    ActiveWatchtowersProps,
    ActiveWatchtowersState
> {
    state = {
        loading: false,
        activeWatchtowers: [] as Watchtower[],
        searchQuery: '',
        refreshing: false
    };

    async UNSAFE_componentWillMount() {
        await this.loadWatchtowers();
    }

    loadWatchtowers = async () => {
        const { SettingsStore } = this.props;
        const { getSettings } = SettingsStore;
        const settings: any = await getSettings();

        let watchtowers: Watchtower[] = [];
        if (
            settings &&
            settings.watchtower &&
            settings.watchtower.watchtowers
        ) {
            watchtowers = settings.watchtower.watchtowers;
        }

        this.setState({
            activeWatchtowers: watchtowers
        });
    };

    onRefresh = async () => {
        this.setState({ refreshing: true });
        await this.loadWatchtowers();
        this.setState({ refreshing: false });
    };

    toggleWatchtowerActive = async (index: number) => {
        const { SettingsStore } = this.props;
        const { updateSettings } = SettingsStore;
        const { activeWatchtowers } = this.state;

        this.setState({ loading: true });

        const updatedWatchtowers = [...activeWatchtowers];
        if (index >= 0 && index < updatedWatchtowers.length) {
            updatedWatchtowers[index] = {
                ...updatedWatchtowers[index],
                active: !updatedWatchtowers[index].active
            };
        }

        const updateObject: any = {
            watchtower: {
                enabled: true,
                watchtowers: updatedWatchtowers
            }
        };

        await updateSettings(updateObject);

        this.setState({
            activeWatchtowers: updatedWatchtowers,
            loading: false
        });
    };

    deleteWatchtower = async (index: number) => {
        const { SettingsStore } = this.props;
        const { updateSettings } = SettingsStore;
        const { activeWatchtowers } = this.state;

        this.setState({ loading: true });

        const updatedWatchtowers = activeWatchtowers.filter(
            (_, i) => i !== index
        );

        const updateObject: any = {
            watchtower: {
                enabled: true,
                watchtowers: updatedWatchtowers
            }
        };

        await updateSettings(updateObject);

        this.setState({
            activeWatchtowers: updatedWatchtowers,
            loading: false
        });
    };

    handleSearch = (text: string) => {
        this.setState({ searchQuery: text });
    };

    getFilteredWatchtowers = () => {
        const { activeWatchtowers, searchQuery } = this.state;
        if (!searchQuery) return activeWatchtowers;

        return activeWatchtowers.filter((watchtower) => {
            const pubkeyMatch = watchtower.pubkey
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

            const addressMatch = watchtower.address
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

            return pubkeyMatch || addressMatch;
        });
    };

    renderItem = ({ item, index }: { item: Watchtower; index: number }) => (
        <>
            <View style={styles.watchtowerItem}>
                <View style={styles.watchtowerContainer}>
                    <Icon
                        name="radio-tower"
                        type="octicon"
                        size={18}
                        color={
                            item.active
                                ? themeColor('highlight')
                                : themeColor('secondaryText')
                        }
                        containerStyle={styles.watchtowerIcon}
                    />
                    <View style={styles.watchtowerInfo}>
                        <Text
                            style={styles.watchtowerPubkey}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                        >
                            {item.pubkey}
                        </Text>
                        <Text style={styles.watchtowerAddress}>
                            {item.address}
                        </Text>
                    </View>
                </View>

                <View style={styles.watchtowerControls}>
                    <Switch
                        value={item.active}
                        onValueChange={() => this.toggleWatchtowerActive(index)}
                        disabled={this.state.loading}
                    />
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => this.deleteWatchtower(index)}
                        disabled={this.state.loading}
                    >
                        <Icon
                            name="trash"
                            type="feather"
                            size={16}
                            color="#FFF"
                        />
                    </TouchableOpacity>
                </View>
            </View>
            {index < this.getFilteredWatchtowers().length - 1 && (
                <Divider style={styles.divider} />
            )}
        </>
    );

    renderEmptyState = () => {
        const { searchQuery } = this.state;
        return (
            <View style={styles.emptyContainer}>
                <Icon
                    name="radio-tower"
                    type="octicon"
                    size={50}
                    color={themeColor('secondaryText')}
                    containerStyle={styles.emptyIcon}
                />
                <Text style={styles.emptyText}>
                    {searchQuery.length > 0
                        ? localeString('views.Settings.Contacts.noAddress')
                        : localeString(
                              'views.Settings.Watchtower.noWatchtowers'
                          )}
                </Text>
            </View>
        );
    };

    render() {
        const { navigation } = this.props;
        const { loading, searchQuery, refreshing } = this.state;
        const filteredWatchtowers = this.getFilteredWatchtowers();
        const watchtowerCount = filteredWatchtowers.length;

        return (
            <Screen>
                <Header
                    leftComponent="Back"
                    centerComponent={{
                        text: `${localeString(
                            'views.Settings.Watchtower.watchtowers'
                        )} (${watchtowerCount})`,
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
                            keyExtractor={(item, index) =>
                                `watchtower-${index}`
                            }
                            contentContainerStyle={styles.listContainer}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={this.onRefresh}
                                    tintColor={themeColor('text')}
                                    colors={[themeColor('highlight')]}
                                />
                            }
                        />
                    ) : (
                        this.renderEmptyState()
                    )}

                    <Button
                        title={localeString(
                            'views.Settings.Watchtower.addWatchtower'
                        )}
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
        color: themeColor('secondaryText'),
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
        color: themeColor('text'),
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4
    },
    watchtowerAddress: {
        color: themeColor('secondaryText'),
        fontSize: 14
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
        backgroundColor: themeColor('delete'),
        justifyContent: 'center',
        alignItems: 'center'
    },
    divider: {
        backgroundColor: themeColor('border'),
        marginHorizontal: 16
    },
    addButton: {
        marginTop: 15
    }
});
