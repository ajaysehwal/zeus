import * as React from 'react';
import { Text, View, StyleSheet, TextInput, Alert } from 'react-native';
import { inject, observer } from 'mobx-react';
import { StackNavigationProp } from '@react-navigation/stack';

import Button from '../../components/Button';
import Header from '../../components/Header';
import LoadingIndicator from '../../components/LoadingIndicator';
import Screen from '../../components/Screen';

import SettingsStore from '../../stores/SettingsStore';
import BackendUtils from '../../utils/BackendUtils';

import { localeString } from '../../utils/LocaleUtils';
import { themeColor } from '../../utils/ThemeUtils';

interface AddWatchtowerProps {
    navigation: StackNavigationProp<any, any>;
    SettingsStore: SettingsStore;
}

interface AddWatchtowerState {
    loading: boolean;
    pubkey: string;
    address: string;
}

@inject('SettingsStore')
@observer
export default class AddWatchtower extends React.Component<
    AddWatchtowerProps,
    AddWatchtowerState
> {
    state = {
        loading: false,
        pubkey: '',
        address: ''
    };

    addWatchtower = async () => {
        const { navigation } = this.props;
        const { pubkey, address } = this.state;

        if (!pubkey || pubkey.trim() === '') {
            Alert.alert(
                localeString('general.error'),
                localeString(
                    'views.Settings.Watchtower.addWatchtower.pubkeyRequired'
                )
            );
            return;
        }

        if (!address || address.trim() === '') {
            Alert.alert(
                localeString('general.error'),
                localeString(
                    'views.Settings.Watchtower.addWatchtower.addressRequired'
                )
            );
            return;
        }

        this.setState({ loading: true });

        try {
            await BackendUtils.addWatchTower([
                {
                    pubkey,
                    address
                }
            ]);
            this.setState({ loading: false });
            navigation.goBack();
        } catch (error: any) {
            this.setState({ loading: false });
            Alert.alert(
                localeString('general.error'),
                error.message || localeString('general.unknown_error')
            );
        }
    };

    render() {
        const { navigation } = this.props;
        const { loading, pubkey, address } = this.state;

        return (
            <Screen>
                <Header
                    leftComponent="Back"
                    centerComponent={{
                        text: localeString(
                            'views.Settings.Watchtower.addWatchtower'
                        ),
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
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            {localeString(
                                'views.Settings.Watchtower.addWatchtower.pubkey'
                            )}
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={pubkey}
                            onChangeText={(text) =>
                                this.setState({ pubkey: text })
                            }
                            placeholder={localeString(
                                'views.Settings.Watchtower.addWatchtower.pubkeyPlaceholder'
                            )}
                            placeholderTextColor={themeColor('secondaryText')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            {localeString(
                                'views.Settings.Watchtower.addWatchtower.address'
                            )}
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={address}
                            onChangeText={(text) =>
                                this.setState({ address: text })
                            }
                            placeholder={localeString(
                                'views.Settings.Watchtower.addWatchtower.addressPlaceholder'
                            )}
                            placeholderTextColor={themeColor('secondaryText')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.descriptionContainer}>
                        <Text style={styles.description}>
                            {localeString(
                                'views.Settings.Watchtower.addWatchtower.explainer'
                            )}
                        </Text>
                    </View>

                    <Button
                        title={localeString(
                            'views.Settings.Watchtower.addWatchtower'
                        )}
                        onPress={this.addWatchtower}
                        disabled={loading}
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
    inputContainer: {
        marginBottom: 20
    },
    label: {
        color: themeColor('text'),
        fontSize: 16,
        marginBottom: 8
    },
    input: {
        backgroundColor: themeColor('secondary'),
        color: themeColor('text'),
        borderRadius: 8,
        padding: 12,
        fontSize: 16
    },
    descriptionContainer: {
        marginBottom: 30
    },
    description: {
        color: themeColor('secondaryText'),
        fontSize: 14,
        lineHeight: 20
    }
});
