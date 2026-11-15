(() => {
  'use strict';

  if (window.__devXGodWpBridgeInstalled) return;
  window.__devXGodWpBridgeInstalled = true;

  const config = globalThis.__DEV_X_GOD_WP_CONFIG__;
  const { STORAGE_KEY, EXTENSION_CHANNEL, PAGE_CHANNEL, DEFAULTS, normalize } = config;

  async function relaySettings() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      window.postMessage({
        channel: EXTENSION_CHANNEL,
        type: 'CONFIG',
        payload: normalize(result[STORAGE_KEY] || DEFAULTS)
      }, location.origin);
    } catch (_) {
      // The page hook stays in dry/bypass mode if local settings cannot be read.
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.channel !== PAGE_CHANNEL) return;

    if (data.type === 'REQUEST_CONFIG') {
      relaySettings();
    } else if (data.type === 'AUTO_UNMUTE_EVENT') {
      const listener = globalThis.__DEV_X_GOD_WP_ON_AUTO_UNMUTE__;
      if (typeof listener === 'function') {
        try { listener(data); } catch (_) {}
      }
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) relaySettings();
  });

  relaySettings();
})();
