import { NativeModules } from 'react-native';
const { LndModule } = NativeModules;

export const addWatchTower = async (
    pubkey: string,
    address: string
): Promise<any> => {
    return await LndModule.addWatchTower(pubkey, address);
};

export const listWatchTowers = async (): Promise<any> => {
    return await LndModule.listWatchTowers();
};

export const getWatchTowerInfo = async (pubkey: string): Promise<any> => {
    return await LndModule.getWatchTowerInfo(pubkey);
};

export const deactivateWatchTower = async (pubkey: string): Promise<any> => {
    return await LndModule.deactivateWatchTower(pubkey);
};

export const removeWatchTower = async (pubkey: string): Promise<any> => {
    return await LndModule.removeWatchTower(pubkey);
};

export const getWatchTowerStats = async (): Promise<any> => {
    return await LndModule.getWatchTowerStats();
};

export const getWatchTowerPolicy = async (): Promise<any> => {
    return await LndModule.getWatchTowerPolicy();
};

export const terminateWatchTowerSession = async (
    sessionId: string
): Promise<any> => {
    return await LndModule.terminateWatchTowerSession(sessionId);
};
