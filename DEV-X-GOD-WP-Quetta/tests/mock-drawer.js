'use strict';

// Dependency-free smoke test for Laptop half-screen Shadow DOM drawer & background.js toggle logic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class ClassList {
  constructor() { this.items = new Set(); }
  add(k) { this.items.add(k); }
  remove(k) { this.items.delete(k); }
  toggle(k, force) {
    const add = force === undefined ? !this.items.has(k) : Boolean(force);
    add ? this.items.add(k) : this.items.delete(k);
    return add;
  }
  contains(k) { return this.items.has(k); }
}

class MockEl {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.id = '';
    this.className = '';
    this.attrs = {};
    this.children = [];
    this.listeners = {};
    this.classList = new ClassList();
    this.style = {
      props: {},
      setProperty(k, v) { this.props[k] = v; },
      getPropertyValue(k) { return this.props[k] || ''; }
    };
    this._innerHTML = '';
    this.textContent = '';
    this.shadowRoot = null;
  }
  set innerHTML(html) { this._innerHTML = html; }
  get innerHTML() { return this._innerHTML; }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === 'class') this.className = String(v);
  }
  getAttribute(k) { return this.attrs[k] ?? null; }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  dispatch(name, ev = {}) { for (const fn of this.listeners[name] || []) fn(ev); }
  getBoundingClientRect() { return { width: 680, height: 800 }; }
  attachShadow() {
    const sr = new MockShadowRoot();
    this.shadowRoot = sr;
    return sr;
  }
}

class MockShadowRoot {
  constructor() {
    this.children = [];
    this.byId = new Map();
    const widthBtn = new MockEl('button');
    widthBtn.id = 'drawerWidthToggle';
    widthBtn.textContent = '50%';
    this.byId.set('drawerWidthToggle', widthBtn);
  }
  appendChild(c) { this.children.push(c); return c; }
  getElementById(id) { return this.byId.get(id) || null; }
  querySelectorAll() { return []; }
}

// ---------- PART 1: Test content/drawer.js ----------
const docRoot = new MockEl('html');
const docListeners = {};
const runtimeMessageListeners = [];
const localStore = {};
let controllerCallbacks = null;
let flushCalls = 0;

const drawerSandbox = {
  window: {
    innerWidth: 1366,
    addEventListener() {},
    removeEventListener() {},
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {}
  },
  document: {
    readyState: 'complete',
    documentElement: docRoot,
    body: new MockEl('body'),
    createElement(tag) { return new MockEl(tag); },
    addEventListener(n, f) { (docListeners[n] ||= []).push(f); }
  },
  chrome: {
    storage: {
      local: {
        async get(k) { return { [k]: localStore[k] }; },
        async set(obj) { Object.assign(localStore, obj); }
      }
    },
    runtime: {
      onMessage: { addListener(fn) { runtimeMessageListeners.push(fn); } }
    }
  },
  Number,
  Math,
  Boolean,
  Object,
  console
};
drawerSandbox.globalThis = drawerSandbox;
vm.createContext(drawerSandbox);
vm.runInContext(fs.readFileSync(`${__dirname}/../shared/config.js`, 'utf8'), drawerSandbox, { filename: 'config.js' });
vm.runInContext(fs.readFileSync(`${__dirname}/../shared/styles.js`, 'utf8'), drawerSandbox, { filename: 'styles.js' });

// Lightweight stub for shared/ui.js to focus on drawer behavior
drawerSandbox.__DEV_X_GOD_WP_UI__ = {
  buildStudioMarkup: () => '<div id="studio"></div>',
  bindStudioController: (_root, opts) => {
    controllerCallbacks = opts;
    return {
      flushSave() { flushCalls += 1; },
      flashAutoUnmute() {}
    };
  }
};

vm.runInContext(fs.readFileSync(`${__dirname}/../content/drawer.js`, 'utf8'), drawerSandbox, { filename: 'drawer.js' });

function sendDrawerMsg(type) {
  let resp = null;
  for (const fn of runtimeMessageListeners) {
    fn({ type }, {}, (r) => { resp = r; });
  }
  return resp;
}

// Verify pre-warmed mount on documentElement
assert.equal(docRoot.children.length, 1, 'drawer pre-warms immediately into Shadow DOM host');
const host = docRoot.children[0];
const shell = host.shadowRoot.children.find((c) => c.className === 'drawer-shell');
assert.ok(shell, 'drawer shell created inside Shadow DOM');
assert.equal(shell.classList.contains('open'), false, 'drawer starts smoothly hidden');
assert.equal(shell.style.getPropertyValue('--drawer-width'), 'clamp(420px, 50.0vw, 960px)', 'drawer defaults to 50vw half-screen width');

// Instant open on extension click
let state = sendDrawerMsg('TOGGLE_DRAWER');
assert.equal(state.open, true, 'first TOGGLE_DRAWER opens immediately');
assert.equal(shell.classList.contains('open'), true, 'drawer shell gets .open class for smooth GPU slide-in');
assert.equal(shell.getAttribute('aria-hidden'), 'false');

// Simulate clicking outside on WhatsApp Web -> MUST STAY OPEN!
drawerSandbox.document.body.dispatch('click');
drawerSandbox.document.body.dispatch('mousedown');
state = sendDrawerMsg('GET_DRAWER_STATE');
assert.equal(state.open, true, 'drawer stays persistently open when user clicks WhatsApp Web outside');

// Width toggle switches 50% -> 36% -> 50%
const widthBtn = host.shadowRoot.getElementById('drawerWidthToggle');
controllerCallbacks.onWidthToggle(widthBtn);
assert.equal(widthBtn.textContent, '36%', 'width toggle switches to compact 36%');
assert.equal(localStore.devXGodWpDrawerWidthVw, 36, 'drawer width persists in storage');
controllerCallbacks.onWidthToggle(widthBtn);
assert.equal(widthBtn.textContent, '50%', 'width toggle switches back to 50% half-screen');

// Instant close on second extension icon click
state = sendDrawerMsg('TOGGLE_DRAWER');
assert.equal(state.open, false, 'second TOGGLE_DRAWER closes immediately');
assert.equal(shell.classList.contains('open'), false, 'drawer shell removes .open class for smooth slide-out');
assert.equal(shell.getAttribute('aria-hidden'), 'true');
assert.ok(flushCalls >= 1, 'closing drawer flushes pending saves');

// Reopen and close via internal Close (×) button
sendDrawerMsg('OPEN_DRAWER');
assert.equal(shell.classList.contains('open'), true, 'OPEN_DRAWER reopens smoothly');
controllerCallbacks.onClose();
assert.equal(shell.classList.contains('open'), false, 'internal Close button closes drawer smoothly');

// Verify keyboard isolation prevents keystrokes from leaking into WhatsApp Web
let stopped = false;
host.dispatch('keydown', { stopPropagation() { stopped = true; } });
assert.equal(stopped, true, 'keyboard events inside drawer do not leak to WhatsApp Web');

// ---------- PART 2: Test background.js ----------
(async () => {
  let actionClickListener = null;
  let storageChangeListener = null;
  const sessionStore = {};
  const createdWindows = [];
  const removedWindows = [];
  const sentTabMessages = [];
  const executedScripts = [];
  let failFirstSend = false;
  let badgeText = '';

  const bgChrome = {
    action: {
      onClicked: { addListener(fn) { actionClickListener = fn; } },
      async setBadgeText({ text }) { badgeText = text; },
      async setBadgeBackgroundColor() {},
      async setBadgeTextColor() {}
    },
    tabs: {
      async sendMessage(tabId, msg) {
        if (failFirstSend) {
          failFirstSend = false;
          throw new Error('Receiving end does not exist');
        }
        sentTabMessages.push({ tabId, msg });
        return { ok: true };
      }
    },
    scripting: {
      async executeScript(spec) { executedScripts.push(spec); }
    },
    windows: {
      async get(id) {
        if (id === 99) return { id: 99, width: 1440, height: 900, left: 0, top: 0 };
        if (createdWindows.some((w) => w.id === id) && !removedWindows.includes(id)) return { id };
        throw new Error('No window');
      },
      async create(opts) {
        const win = { id: 500 + createdWindows.length, ...opts };
        createdWindows.push(win);
        return win;
      },
      async remove(id) { removedWindows.push(id); },
      onRemoved: { addListener() {} }
    },
    runtime: {
      getURL(p) { return `chrome-extension://test/${p}`; },
      onMessage: { addListener() {} }
    },
    storage: {
      local: { async get() { return {}; } },
      session: {
        async get(k) { return { [k]: sessionStore[k] }; },
        async set(obj) { Object.assign(sessionStore, obj); },
        async remove(k) { delete sessionStore[k]; }
      },
      onChanged: { addListener(fn) { storageChangeListener = fn; } }
    }
  };

  const bgSandbox = { chrome: bgChrome, Math, console, Object, Number };
  vm.createContext(bgSandbox);
  vm.runInContext(fs.readFileSync(`${__dirname}/../background.js`, 'utf8'), bgSandbox, { filename: 'background.js' });

  // 1. Clicking icon on WhatsApp Web sends TOGGLE_DRAWER immediately
  await actionClickListener({ id: 10, windowId: 99, url: 'https://web.whatsapp.com/' });
  assert.equal(sentTabMessages.at(-1).msg.type, 'TOGGLE_DRAWER', 'WhatsApp tab click sends TOGGLE_DRAWER');

  // 2. Clicking icon on already-open WhatsApp tab without scripts injects scripts & opens drawer
  failFirstSend = true;
  await actionClickListener({ id: 11, windowId: 99, url: 'https://web.whatsapp.com/' });
  assert.equal(executedScripts.length, 2, 'injects ISOLATED + MAIN scripts on pre-existing WhatsApp tab');
  assert.equal(sentTabMessages.at(-1).msg.type, 'OPEN_DRAWER', 'opens drawer immediately after dynamic injection');

  // 3. Clicking icon on a non-WhatsApp tab opens half-screen persistent window, clicking again closes it
  await actionClickListener({ id: 12, windowId: 99, url: 'https://example.com/' });
  assert.equal(createdWindows.length, 1, 'opens standalone persistent window outside WhatsApp');
  assert.equal(createdWindows[0].width, 720, 'standalone window is half of 1440px laptop screen');
  assert.equal(createdWindows[0].type, 'popup', 'standalone window uses persistent popup window type');

  await actionClickListener({ id: 12, windowId: 99, url: 'https://example.com/' });
  assert.deepEqual(removedWindows, [500], 'second click immediately closes standalone persistent window');

  // 4. Badge updates for DSP ON and Auto-Unmute MIC
  storageChangeListener({ devXGodWpQuettaSettings: { newValue: { enabled: false, autoUnmute: true } } }, 'local');
  await new Promise((r) => setImmediate(r));
  assert.equal(badgeText, 'MIC', 'badge shows MIC when Auto-Unmute is armed');

  storageChangeListener({ devXGodWpQuettaSettings: { newValue: { enabled: true, autoUnmute: true } } }, 'local');
  await new Promise((r) => setImmediate(r));
  assert.equal(badgeText, 'ON', 'badge shows ON when DSP engine is active');

  console.log('PASS: DEV X GOD WP Laptop Studio drawer & background toggle tests.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
