// Postinstall patches for Zeus
// Run with: node patches/index.mjs

import { patchJcenter } from './patch-jcenter.mjs';
import { patchNativeEventEmitter } from './patch-native-event-emitter.mjs';
import { patchReactNativeNotifications } from './patch-react-native-notifications.mjs';
import { patchNobleHashes } from './patch-noble-hashes.mjs';
import { patchGetalbySdkNwcPTag } from './patch-getalby-sdk-nwc-p-tag.mjs';

console.log('Running postinstall patches...\n');

(async () => {
    patchJcenter();
    patchNativeEventEmitter();
    patchReactNativeNotifications();
    patchNobleHashes();
    patchGetalbySdkNwcPTag();

    console.log('\nAll patches applied successfully.');
})();
