'use strict';

const STORAGE_KEY = 'devXGodWpQuettaSettings';
const WINDOW_SESSION_KEY = 'devXGodWpStudioWindowId';
const WHATSAPP_ORIGIN = 'https://web.whatsapp.com/';

let cachedWindowId = null;

async function getTrackedWindowId() {
  if (typeof cachedWindowId === 'number') return cachedWindowId;
  try {
    if (chrome.storage?.session) {
      const data = await chrome.storage.session.get(WINDOW_SESSION_KEY);
      if (typeof data[WINDOW_SESSION_KEY] === 'number') {
        cachedWindowId = data[WINDOW_SESSION_KEY];
        return cachedWindowId;
      }
    }
  } catch (_) {}
  return null;
}

async function setTrackedWindowId(id) {
  cachedWindowId = typeof id === 'number' ? id : null;
  try {
    if (chrome.storage?.session) {
      if (cachedWindowId === null) await chrome.storage.session.remove(WINDOW_SESSION_KEY);
      else await chrome.storage.session.set({ [WINDOW_SESSION_KEY]: cachedWindowId });
    }
  } catch (_) {}
}

async function closeStandaloneWindow() {
  const winId = await getTrackedWindowId();
  if (winId === null) return false;
  await setTrackedWindowId(null);
  try {
    await chrome.windows.remove(winId);
    return true;
  } catch (_) {
    return false;
  }
}

async function toggleStandaloneWindow(tab) {
  const existingId = await getTrackedWindowId();
  if (existingId !== null) {
    try {
      await chrome.windows.get(existingId);
      await closeStandaloneWindow();
      return;
    } catch (_) {
      await setTrackedWindowId(null);
    }
  }

  let width = 740;
  let height = 820;
  let left;
  let top;

  try {
    const parentWin = tab?.windowId !== undefined
      ? await chrome.windows.get(tab.windowId)
      : await chrome.windows.getLastFocused();
    if (parentWin && typeof parentWin.width === 'number' && parentWin.width > 0) {
      width = Math.max(540, Math.min(900, Math.round(parentWin.width * 0.5)));
      height = Math.max(620, Math.min(960, Math.round((parentWin.height || 860) * 0.92)));
      left = Math.max(0, Math.round((parentWin.left || 0) + parentWin.width - width - 12));
      top = Math.max(0, Math.round((parentWin.top || 0) + 44));
    }
  } catch (_) {}

  const createOptions = {
    url: chrome.runtime.getURL('popup.html?mode=window'),
    type: 'popup',
    width,
    height,
    focused: true
  };
  if (typeof left === 'number') createOptions.left = left;
  if (typeof top === 'number') createOptions.top = top;

  const created = await chrome.windows.create(createOptions);
  if (created && typeof created.id === 'number') {
    await setTrackedWindowId(created.id);
  }
}

async function injectAndOpenDrawer(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [
      'shared/config.js',
      'content/bridge.js',
      'shared/styles.js',
      'shared/ui.js',
      'content/drawer.js'
    ]
  });
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['shared/config.js', 'content/main-world.js'],
      world: 'MAIN'
    });
  } catch (_) {
    // MAIN world script may already be injected or restricted on older builds.
  }
  await chrome.tabs.sendMessage(tabId, { type: 'OPEN_DRAWER' });
}

async function updateBadge(rawSettings) {
  if (!chrome.action?.setBadgeText) return;
  const settings = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  try {
    if (settings.enabled) {
      await chrome.action.setBadgeText({ text: 'ON' });
      await chrome.action.setBadgeBackgroundColor({ color: '#11635f' });
      if (chrome.action.setBadgeTextColor) {
        await chrome.action.setBadgeTextColor({ color: '#e6fffb' });
      }
    } else if (settings.autoUnmute) {
      await chrome.action.setBadgeText({ text: 'MIC' });
      await chrome.action.setBadgeBackgroundColor({ color: '#2b3e8c' });
      if (chrome.action.setBadgeTextColor) {
        await chrome.action.setBadgeTextColor({ color: '#eef4ff' });
      }
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (_) {}
}

chrome.action.onClicked.addListener(async (tab) => {
  const isWhatsApp = typeof tab?.url === 'string' && tab.url.startsWith(WHATSAPP_ORIGIN);

  if (isWhatsApp && typeof tab.id === 'number') {
    // Close any stray standalone window when working directly inside WhatsApp Web.
    closeStandaloneWindow().catch(() => {});
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DRAWER' });
      return;
    } catch (_) {
      try {
        await injectAndOpenDrawer(tab.id);
        return;
      } catch (_) {
        // Fall through to standalone window if tab cannot accept scripts.
      }
    }
  }

  try {
    await toggleStandaloneWindow(tab);
  } catch (_) {}
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const trackedId = await getTrackedWindowId();
  if (trackedId !== null && windowId === trackedId) {
    await setTrackedWindowId(null);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'CLOSE_STUDIO_WINDOW') {
    closeStandaloneWindow().then((closed) => sendResponse({ ok: closed })).catch(() => sendResponse({ ok: false }));
    return true;
  }
  return false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEY]) {
    updateBadge(changes[STORAGE_KEY].newValue);
  }
});

chrome.storage.local.get(STORAGE_KEY).then((res) => updateBadge(res[STORAGE_KEY])).catch(() => {});
