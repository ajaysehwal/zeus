import * as React from 'react';
import {
    Text,
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity
} from 'react-native';
import { inject, observer } from 'mobx-react';
import { StackNavigationProp } from '@react-navigation/stack';

import Button from '../../../components/Button';
import Header from '../../../components/Header';
import LoadingIndicator from '../../../components/LoadingIndicator';
import Screen from '../../../components/Screen';
import { ErrorMessage } from '../../../components/SuccessErrorMessage';

import SettingsStore from '../../../stores/SettingsStore';
import BackendUtils from '../../../utils/BackendUtils';

import { localeString } from '../../../utils/LocaleUtils';
import { themeColor } from '../../../utils/ThemeUtils';

import Scan from '../../../assets/images/SVG/Scan.svg';
import Base64Utils from '../../../utils/Base64Utils';

interface AddWatchtowerProps {
    navigation: StackNavigationProp<any, any>;
    SettingsStore: SettingsStore;
}

interface AddWatchtowerState {
    loading: boolean;
    pubkey: string;
    address: string;
    error: string;
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
        address: '',
        error: ''
    };

    validateWatchtowerData = (text: string) => {
        const watchtowerRegex = /^([a-fA-F0-9]{66})@([a-zA-Z0-9.-]+):(\d+)$/;
        const match = text.match(watchtowerRegex);

        if (match) {
            const [, pubkey, host, port] = match;
            this.setState({
                pubkey,
                address: `${host}:${port}`,
                error: ''
            });
            return true;
        }

        this.setState({
            error: localeString(
                'views.Tools.watchtowers.addWatchtower.invalidFormat'
            )
        });
        return false;
    };

    handleScan = () => {
        this.props.navigation.navigate('HandleAnythingQRScanner', {
            handleScannedData: this.validateWatchtowerData
        });
    };

    addWatchtower = async () => {
        // const { navigation } = this.props;
        // const { pubkey, address } = this.state;

        // this.setState({ error: '' });

        // if (!pubkey || pubkey.trim() === '') {
        //     this.setState({
        //         error: localeString(
        //             'views.Tools.watchtowers.addWatchtower.pubkeyRequired'
        //         )
        //     });
        //     return;
        // }

        // if (!address || address.trim() === '') {
        //     this.setState({
        //         error: localeString(
        //             'views.Tools.watchtowers.addWatchtower.addressRequired'
        //         )
        //     });
        //     return;
        // }

        // this.setState({ loading: true });

        try {
            const result = await BackendUtils.addWatchtower({
                pubkey: Base64Utils.hexToBase64(
                    '02037375bd0284f3e546246b6251208365d10734db2328cbfac1ac542a4148b285'
                ),
                address: 'localhost:8082'
            });
            console.log('result', result);
            this.setState({ loading: false });
            // navigation.goBack();
        } catch (error: any) {
            this.setState({
                loading: false,
                error: error.message || localeString('general.unknown_error')
            });
        }
    };

    render() {
        const { navigation } = this.props;
        const { loading, pubkey, address, error } = this.state;

        return (
            <Screen>
                <Header
                    leftComponent="Back"
                    centerComponent={{
                        text: localeString('views.Tools.addWatchtower'),
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
                            {loading && (
                                <View style={{ marginRight: 15 }}>
                                    <LoadingIndicator size={30} />
                                </View>
                            )}
                            <TouchableOpacity onPress={this.handleScan}>
                                <Scan
                                    fill={themeColor('text')}
                                    width={30}
                                    height={30}
                                />
                            </TouchableOpacity>
                        </View>
                    }
                    navigation={navigation}
                />
                <View style={styles.container}>
                    {error && <ErrorMessage message={error} />}

                    <View style={styles.inputContainer}>
                        <Text
                            style={[
                                styles.label,
                                { color: themeColor('text') }
                            ]}
                        >
                            {localeString('views.OpenChannel.nodePubkey')}
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: themeColor('secondary'),
                                    color: themeColor('text')
                                }
                            ]}
                            value={pubkey}
                            onChangeText={(text) =>
                                this.setState({ pubkey: text, error: '' })
                            }
                            placeholder={localeString(
                                'views.OpenChannel.nodePubkey'
                            )}
                            placeholderTextColor={themeColor('secondaryText')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text
                            style={[
                                styles.label,
                                { color: themeColor('text') }
                            ]}
                        >
                            {localeString(
                                'views.Tools.watchtowers.addWatchtower.address'
                            )}
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: themeColor('secondary'),
                                    color: themeColor('text')
                                }
                            ]}
                            value={address}
                            onChangeText={(text) =>
                                this.setState({ address: text, error: '' })
                            }
                            placeholder={localeString(
                                'views.OpenChannel.hostPort'
                            )}
                            placeholderTextColor={themeColor('secondaryText')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.descriptionContainer}>
                        <Text
                            style={[
                                styles.description,
                                { color: themeColor('secondaryText') }
                            ]}
                        >
                            {localeString(
                                'views.Tools.watchtowers.addWatchtower.explainer'
                            )}
                        </Text>
                    </View>

                    <Button
                        title={localeString('views.Tools.addWatchtower')}
                        onPress={this.addWatchtower}
                        // disabled={loading || !pubkey.trim() || !address.trim()}
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
        fontSize: 16,
        marginBottom: 8
    },
    input: {
        borderRadius: 8,
        padding: 12,
        fontSize: 16
    },
    descriptionContainer: {
        marginBottom: 30
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10
    },
    formatDescription: {
        fontSize: 12,
        fontStyle: 'italic',
        lineHeight: 18
    }
});
