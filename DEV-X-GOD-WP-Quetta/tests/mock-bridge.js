'use strict';

// Dependency-free smoke test for shared config, bridge normalization, and Auto-Unmute event relay.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const PAGE_CHANNEL = 'devxgodwp-quetta-main';
const EXTENSION_CHANNEL = 'devxgodwp-quetta-extension';
const STORAGE_KEY = 'devXGodWpQuettaSettings';
const origin = 'https://web.whatsapp.com';
const listeners = {};
const posts = [];
let storageListener;
let stored = {
  [STORAGE_KEY]: {
    enabled: true,
    autoUnmute: true,
    gain: 64,
    generatorLevel: 99,
    extraMicEnabled: true,
    extraMicBoost: 9,
    extraMicFxLevel: 2,
    badMicVoiceFilterEnabled: true,
    badMicBands: [{ enabled: true, frequency: 30000, gain: 7, q: 0 }],
    autoLevelEnabled: false,
    autoLevelMax: 99,
    autoLevelTargetDb: -40
  }
};

const windowMock = {
  addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
  postMessage(message, targetOrigin) { posts.push({ message, targetOrigin }); }
};
const chromeMock = {
  storage: {
    local: { async get(key) { return { [key]: stored[key] }; } },
    onChanged: { addListener(fn) { storageListener = fn; } }
  }
};
const sandbox = {
  window: windowMock,
  chrome: chromeMock,
  location: { origin },
  Boolean,
  Number,
  Math,
  Object,
  Array,
  console
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(`${__dirname}/../shared/config.js`, 'utf8'), sandbox, { filename: 'config.js' });
vm.runInContext(fs.readFileSync(`${__dirname}/../content/bridge.js`, 'utf8'), sandbox, { filename: 'bridge.js' });

const tick = () => new Promise((resolve) => setImmediate(resolve));

(async () => {
  await tick();
  assert.equal(posts.length, 1, 'bridge sends initial configuration');
  let payload = posts[0].message.payload;
  assert.equal(posts[0].message.channel, EXTENSION_CHANNEL);
  assert.equal(posts[0].targetOrigin, origin);
  assert.equal(payload.autoUnmute, true, 'Auto-Unmute setting propagates');
  assert.equal(payload.autoLevelEnabled, false, 'saved auto-lift bypass is preserved');
  assert.equal(payload.generatorLevel, 1.5, 'motor-bed level clamped at 150%');
  assert.equal(payload.extraMicBoost, 4, 'Extra Mic boost capped at 4×');
  assert.equal(payload.extraMicFxLevel, 1, 'Extra Mic FX normalized to 100%');
  assert.equal(payload.badMicBands.length, 6, 'all six EQ bands normalized');
  assert.equal(payload.badMicBands[0].frequency, 10000);
  assert.equal(payload.badMicBands[0].gain, 5);
  assert.equal(payload.badMicBands[0].q, 0.1);
  assert.equal(payload.autoLevelTargetDb, -24);

  // Request config from page
  listeners.message[0]({
    source: windowMock,
    origin,
    data: { channel: PAGE_CHANNEL, type: 'REQUEST_CONFIG' }
  });
  await tick();
  assert.equal(posts.length, 2, 'page config request is answered');

  // Relay AUTO_UNMUTE_EVENT to drawer listener
  let receivedEvent = null;
  sandbox.__DEV_X_GOD_WP_ON_AUTO_UNMUTE__ = (ev) => { receivedEvent = ev; };
  listeners.message[0]({
    source: windowMock,
    origin,
    data: { channel: PAGE_CHANNEL, type: 'AUTO_UNMUTE_EVENT', count: 3, reason: 'track-setter' }
  });
  assert.equal(receivedEvent?.count, 3, 'bridge relays AUTO_UNMUTE_EVENT to UI');

  // Missing fields use unified safe balanced defaults (not old 64x hardClip defaults!)
  stored = { [STORAGE_KEY]: { enabled: true } };
  storageListener({ [STORAGE_KEY]: { newValue: stored[STORAGE_KEY] } }, 'local');
  await tick();
  payload = posts.at(-1).message.payload;
  assert.equal(payload.gain, 4, 'missing gain falls back to unified balanced 4× default');
  assert.equal(payload.hardClip, false, 'missing hardClip falls back to unified false default');
  assert.equal(payload.autoUnmute, false, 'missing autoUnmute falls back to false');
  assert.equal(payload.generatorEnabled, true, 'missing generatorEnabled falls back to balanced default');

  console.log('PASS: DEV X GOD WP Laptop Studio bridge & shared config tests.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
