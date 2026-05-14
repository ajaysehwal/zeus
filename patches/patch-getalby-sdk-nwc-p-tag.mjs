/**
 * Patch @getalby/sdk bundled `NWCWalletService` after `yarn install`.
 *
 * NIP-47 requires `kind: 23195` wallet responses to include both:
 * - `e` — id of the `kind: 23194` request
 * - `p` — client pubkey (recipient)
 *
 * Some clients subscribe with `#p`. Bundles that only emit `e` cause timeouts upstream.
 *
 * Target shape matches getAlby source:
 *   tags: [["e", event.id], ["p", keypair.clientPubkey]],
 *
 * Also migrates legacy Zeus postinstall output that used `p` before `e`.
 *
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PATCH_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(PATCH_DIR, '..');
const SDK_DIR = path.join(PROJECT_ROOT, 'node_modules', '@getalby', 'sdk');

/** Rollup-readable ESM/CJS (matches `dist/esm/nwc.js` formatting) */
const READABLE = {
    good: 'tags: [["e", event.id], ["p", keypair.clientPubkey]],',
    legacyPFirst:
        'tags: [["p", keypair.clientPubkey], ["e", event.id]],',
    missingP: 'tags: [["e", event.id]],'
};

/** Terse UMD / minified bundles (`keypair` → `e`, request event → `n`) */
const UMD = {
    good: 'tags:[["e",n.id],["p",e.clientPubkey]]',
    legacyPFirst: 'tags:[["p",e.clientPubkey],["e",n.id]]',
    missingP: 'tags:[["e",n.id]]'
};

/** Entrypoints Metro / Node resolve for `@getalby/sdk` and `@getalby/sdk/nwc` */
const READABLE_REL_PATHS = [
    path.join('dist', 'esm', 'nwc.js'),
    path.join('dist', 'cjs', 'nwc.cjs'),
    path.join('dist', 'esm', 'index.js'),
    path.join('dist', 'cjs', 'index.cjs')
];

/** Minified bundles (filename varies slightly across releases) */
function getPresentUmdRelPaths() {
    const candidates = ['alby-sdk.umd.js', 'lightning-sdk.umd.js'].map((f) =>
        path.join('dist', f)
    );
    return candidates.filter((rel) =>
        fs.existsSync(path.join(SDK_DIR, rel))
    );
}

/**
 * @param {string} relPath – path under `@getalby/sdk`
 * @param {{ good: string, legacyPFirst: string, missingP: string }} spec
 */
function patchTaggedBundle(relPath, spec) {
    const fullPath = path.join(SDK_DIR, relPath);

    let content;
    try {
        content = fs.readFileSync(fullPath, 'utf8');
    } catch (e) {
        console.warn(`  - WARNING: failed to read ${relPath}: ${e.message}`);
        return 'skip';
    }

    if (content.includes(spec.good)) {
        console.log(`  - OK (already patched): ${relPath}`);
        return 'ok';
    }

    /** @type {string | undefined} */
    let from;

    if (content.includes(spec.legacyPFirst)) from = spec.legacyPFirst;
    else if (content.includes(spec.missingP)) from = spec.missingP;
    else {
        console.warn(
            `  - WARNING: unknown NWC 23195 tag shape in ${relPath} (@getalby/sdk bump?)`
        );
        return 'warn';
    }

    const occurrences = content.split(from).length - 1;
    if (occurrences !== 1) {
        console.warn(
            `  - WARNING: expected 1 '${from.slice(0, 40)}…' occurrence in ${relPath}, found ${occurrences}; leaving file unchanged`
        );
        return 'warn';
    }

    content = content.replace(from, spec.good);

    try {
        fs.writeFileSync(fullPath, content, 'utf8');
    } catch (e) {
        console.warn(`  - WARNING: failed to write ${relPath}: ${e.message}`);
        return 'skip';
    }

    console.log(
        `  - Patched ${relPath}: ${from === spec.legacyPFirst ? 'e+p order' : 'add p tag'}`
    );
    return 'patched';
}

export function patchGetalbySdkNwcPTag() {
    console.log(
        'Patching @getalby/sdk (NWCWalletService: NIP-47 `e` + `p` on kind 23195)'
    );

    if (!fs.existsSync(SDK_DIR)) {
        console.log('  - Skipping: node_modules/@getalby/sdk not found');
        return;
    }

    for (const rel of READABLE_REL_PATHS) {
        if (!fs.existsSync(path.join(SDK_DIR, rel))) {
            console.log(`  - Skipping (missing): ${rel}`);
            continue;
        }
        patchTaggedBundle(rel, READABLE);
    }

    for (const rel of getPresentUmdRelPaths()) {
        patchTaggedBundle(rel, UMD);
    }
}
