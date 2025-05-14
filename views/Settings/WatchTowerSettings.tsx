import * as React from 'react';
import { Text, View, ScrollView, StyleSheet } from 'react-native';
import { inject, observer } from 'mobx-react';
import { StackNavigationProp } from '@react-navigation/stack';

import Button from '../../components/Button';
import Header from '../../components/Header';
import LoadingIndicator from '../../components/LoadingIndicator';
import Screen from '../../components/Screen';
import Switch from '../../components/Switch';

import SettingsStore from '../../stores/SettingsStore';

import { localeString } from '../../utils/LocaleUtils';
import { themeColor } from '../../utils/ThemeUtils';

interface WatchTowerSettingsProps {
    navigation: StackNavigationProp<any, any>;
    SettingsStore: SettingsStore;
}

interface WatchTowerSettingsState {
    loading: boolean;
    enableWatchtower: boolean;
}

@inject('SettingsStore')
@observer
export default class WatchTowerSettings extends React.Component<
    WatchTowerSettingsProps,
    WatchTowerSettingsState
> {
    state = {
        loading: false,
        enableWatchtower: false
    };

    async UNSAFE_componentWillMount() {
        const { SettingsStore } = this.props;
        const { getSettings } = SettingsStore;
        const settings: any = await getSettings();

        let enabled = false;
        if (settings && settings.watchtower && settings.watchtower.enabled) {
            enabled = true;
        }

        this.setState({
            enableWatchtower: enabled
        });
    }

    toggleWatchtower = async () => {
        const { SettingsStore } = this.props;
        const { updateSettings } = SettingsStore;
        const { enableWatchtower } = this.state;

        this.setState({ loading: true });

        const updateObject: any = {
            watchtower: {
                enabled: !enableWatchtower
            }
        };

        await updateSettings(updateObject);

        this.setState({
            enableWatchtower: !enableWatchtower,
            loading: false
        });
    };

    render() {
        const { navigation, SettingsStore } = this.props;
        const { loading, enableWatchtower } = this.state;

        return (
            <Screen>
                <Header
                    leftComponent="Back"
                    centerComponent={{
                        text: localeString('general.watchtower'),
                        style: {
                            color: themeColor('text'),
                            fontFamily: 'PPNeueMontreal-Book'
                        }
                    }}
                    rightComponent={
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            {loading && <LoadingIndicator size={30} />}
                        </View>
                    }
                    navigation={navigation}
                />
                <ScrollView style={styles.container}>
                    <View style={styles.switchContainer}>
                        <Text style={styles.title}>
                            {localeString(
                                'views.Settings.Watchtower.enableWatchtower'
                            )}
                        </Text>
                        <Switch
                            value={enableWatchtower}
                            onValueChange={this.toggleWatchtower}
                            disabled={
                                SettingsStore.settingsUpdateInProgress ||
                                loading
                            }
                        />
                    </View>

                    <View style={styles.descriptionContainer}>
                        <Text style={styles.description}>
                            {localeString(
                                'views.Settings.Watchtower.description1'
                            )}
                        </Text>
                        <Text style={[styles.description, { marginTop: 10 }]}>
                            {localeString(
                                'views.Settings.Watchtower.description2'
                            )}
                        </Text>
                    </View>

                    {enableWatchtower && (
                        <View style={styles.buttonsContainer}>
                            <Button
                                title={localeString(
                                    'views.Settings.Watchtower.watchtowers'
                                )}
                                onPress={() =>
                                    navigation.navigate('ActiveWatchtowers')
                                }
                                containerStyle={styles.button}
                            />

                            <Button
                                title={localeString(
                                    'views.Settings.Watchtower.addWatchtower'
                                )}
                                onPress={() =>
                                    navigation.navigate('AddWatchtower')
                                }
                                containerStyle={styles.button}
                            />
                        </View>
                    )}
                </ScrollView>
            </Screen>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 15,
        marginTop: 5
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        color: themeColor('text'),
        fontSize: 17,
        flex: 1
    },
    descriptionContainer: {
        marginTop: 15,
        marginBottom: 15
    },
    description: {
        color: themeColor('secondaryText'),
        fontSize: 16
    },
    buttonsContainer: {
        marginTop: 10
    },
    button: {
        marginBottom: 15
    }
});
