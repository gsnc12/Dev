'use strict';

// Dependency-free smoke test for shared Studio UI controller, presets, and Auto-Unmute persistence.
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

class Element {
  constructor(doc, tag = 'div') {
    this.doc = doc;
    this.tagName = tag.toUpperCase();
    this.dataset = {};
    this.classList = new ClassList();
    this.listeners = {};
    this.value = '';
    this.textContent = '';
    this.checked = false;
    this._id = '';
  }
  set id(v) { this._id = v; if (v) this.doc.elements.set(v, this); }
  get id() { return this._id; }
  addEventListener(n, f) { (this.listeners[n] ||= []).push(f); }
  dispatch(n, e = {}) { e.target ||= this; for (const f of this.listeners[n] || []) f(e); }
  click() { this.dispatch('click'); }
}

class DocumentMock {
  constructor() {
    this.elements = new Map();
    this.presets = ['natural', 'boost', 'hifi', 'deep', 'generator', 'laptop', 'max', 'attack', 'maxgen'].map((n) => {
      const b = new Element(this, 'button');
      b.dataset.preset = n;
      return b;
    });
    const ids = [
      'enabled', 'autoUnmute', 'gain', 'clarity', 'warmth', 'air', 'compression', 'distortion', 'hardClip', 'ceiling',
      'voiceStyle', 'generatorEnabled', 'generatorLevel', 'generatorRate', 'generatorTexture',
      'extraMicEnabled', 'extraMicBoost', 'extraMicFxLevel', 'badMicVoiceFilterEnabled', 'autoLevelEnabled', 'autoLevelMax', 'autoLevelTargetDb',
      'gainValue', 'clarityValue', 'warmthValue', 'airValue', 'compressionValue', 'distortionValue', 'ceilingValue',
      'generatorLevelValue', 'generatorRateValue', 'generatorTextureValue', 'extraMicBoostValue', 'extraMicFxLevelValue', 'autoLevelMaxValue', 'autoLevelTargetDbValue',
      'statusCard', 'statusTitle', 'statusSubtitle', 'liveDot', 'profileNote',
      'autoUnmuteCard', 'autoUnmuteBadge', 'closePanelBtn', 'drawerWidthToggle'
    ];
    for (let i = 0; i < 6; i += 1) {
      ids.push(
        `badMicBandEnabled${i}`, `badMicBandGain${i}`, `badMicBandGainValue${i}`,
        `badMicBandFrequency${i}`, `badMicBandFrequencyValue${i}`, `badMicBandFrequencyTitle${i}`,
        `badMicBandQ${i}`, `badMicBandQValue${i}`
      );
    }
    const checkboxIds = new Set([
      'enabled', 'autoUnmute', 'hardClip', 'generatorEnabled', 'extraMicEnabled',
      'badMicVoiceFilterEnabled', 'autoLevelEnabled',
      ...Array.from({ length: 6 }, (_, i) => `badMicBandEnabled${i}`)
    ]);
    for (const id of ids) {
      const e = new Element(this, checkboxIds.has(id) ? 'input' : id === 'voiceStyle' ? 'select' : 'div');
      e.id = id;
    }
  }
  getElementById(id) { return this.elements.get(id) || null; }
  querySelector(sel) { return sel.startsWith('#') ? this.getElementById(sel.slice(1)) : null; }
  querySelectorAll(q) { return q === '[data-preset]' ? this.presets : []; }
}

const doc = new DocumentMock();
const store = {};
const changed = [];
let setCalls = 0;

const local = {
  async get(k) { return { [k]: store[k] }; },
  async set(values) {
    setCalls += 1;
    const c = {};
    for (const [k, v] of Object.entries(values)) {
      c[k] = { oldValue: store[k], newValue: v };
      store[k] = v;
    }
    for (const f of changed) f(c, 'local');
  }
};
const chrome = {
  storage: {
    local,
    onChanged: {
      addListener(f) { changed.push(f); },
      removeListener(f) { const i = changed.indexOf(f); if (i >= 0) changed.splice(i, 1); }
    }
  }
};

let timer = 0;
const pendingTimers = new Map();
const windowMock = {
  clearTimeout(id) { pendingTimers.delete(id); },
  setTimeout(fn) {
    const id = ++timer;
    pendingTimers.set(id, fn);
    queueMicrotask(() => {
      if (pendingTimers.has(id)) {
        pendingTimers.delete(id);
        fn();
      }
    });
    return id;
  }
};

const sandbox = { document: doc, chrome, window: windowMock, console, Math, Number, Boolean, Object, Array };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(`${__dirname}/../shared/config.js`, 'utf8'), sandbox, { filename: 'config.js' });
vm.runInContext(fs.readFileSync(`${__dirname}/../shared/ui.js`, 'utf8'), sandbox, { filename: 'ui.js' });

let closeCount = 0;
const controller = sandbox.__DEV_X_GOD_WP_UI__.bindStudioController(doc, {
  onClose: () => { closeCount += 1; }
});

// Verify every ID referenced by bindStudioController exists in buildStudioMarkup HTML!
const markup = sandbox.__DEV_X_GOD_WP_UI__.buildStudioMarkup({ showWidthToggle: true });
const markupIds = new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
for (const id of doc.elements.keys()) {
  assert.ok(markupIds.has(id), `Markup contains element #${id}`);
}

const tick = () => new Promise((r) => setImmediate(r));

(async () => {
  await tick();
  assert.equal(doc.getElementById('enabled').checked, false, 'default master state remains off');
  assert.equal(doc.getElementById('autoUnmute').checked, false, 'Auto-Unmute defaults off');
  assert.equal(doc.getElementById('autoUnmuteBadge').textContent, 'OFF', 'Auto-Unmute badge shows OFF initially');
  assert.equal(doc.presets.find((b) => b.dataset.preset === 'generator').classList.contains('selected'), true, 'fresh settings select balanced VOICE + GEN');
  assert.match(doc.getElementById('gainValue').textContent, /12\.0 dB/, 'balanced default gain shows dB');

  // Tick Auto-Unmute -> saves immediately (synchronously invoking chrome.storage.local.set!)
  const beforeSet = setCalls;
  doc.getElementById('autoUnmute').checked = true;
  doc.getElementById('autoUnmute').dispatch('change');
  assert.equal(setCalls, beforeSet + 1, 'ticking Auto-Unmute persists immediately without debounce delay');
  await tick();
  assert.equal(store.devXGodWpQuettaSettings.autoUnmute, true, 'Auto-Unmute persists true');
  assert.equal(doc.getElementById('autoUnmuteCard').classList.contains('armed'), true, 'Auto-Unmute card shows armed style');
  assert.equal(doc.getElementById('autoUnmuteBadge').textContent, 'ACTIVE', 'Auto-Unmute badge shows ACTIVE');
  assert.match(doc.getElementById('statusTitle').textContent, /AUTO-UNMUTE ARMED/, 'status title reflects armed Auto-Unmute while DSP is off');

  // Flash feedback when auto-unmute catches a mute
  controller.flashAutoUnmute(2);
  assert.equal(doc.getElementById('autoUnmuteCard').classList.contains('triggered'), true, 'Auto-Unmute card flashes triggered');
  assert.equal(doc.getElementById('autoUnmuteBadge').textContent, 'UNMUTED ×2', 'Auto-Unmute badge shows count');

  // Switching presets MUST preserve Auto-Unmute = true!
  doc.presets.find((b) => b.dataset.preset === 'laptop').click();
  await tick();
  assert.equal(store.devXGodWpQuettaSettings.preset, 'laptop', 'LAPTOP LOUD preset applies');
  assert.equal(store.devXGodWpQuettaSettings.gain, 8);
  assert.equal(store.devXGodWpQuettaSettings.autoUnmute, true, 'switching to LAPTOP LOUD preserves Auto-Unmute tick');
  assert.equal(doc.getElementById('statusTitle').textContent, 'LAPTOP LOUD ACTIVE');

  doc.presets.find((b) => b.dataset.preset === 'maxgen').click();
  await tick();
  assert.equal(store.devXGodWpQuettaSettings.preset, 'maxgen');
  assert.equal(store.devXGodWpQuettaSettings.extraMicEnabled, true);
  assert.equal(store.devXGodWpQuettaSettings.extraMicBoost, 2);
  assert.equal(store.devXGodWpQuettaSettings.autoUnmute, true, 'switching to MAX GENERATOR preserves Auto-Unmute tick');

  // Untick Auto-Unmute
  doc.getElementById('autoUnmute').checked = false;
  doc.getElementById('autoUnmute').dispatch('change');
  await tick();
  assert.equal(store.devXGodWpQuettaSettings.autoUnmute, false, 'unticking Auto-Unmute persists false');
  assert.equal(doc.getElementById('autoUnmuteBadge').textContent, 'OFF');

  // EQ band controls
  doc.getElementById('badMicBandEnabled1').checked = true;
  doc.getElementById('badMicBandEnabled1').dispatch('change');
  doc.getElementById('badMicBandGain1').value = '3.5';
  doc.getElementById('badMicBandGain1').dispatch('input');
  doc.getElementById('badMicBandFrequency1').value = '420';
  doc.getElementById('badMicBandFrequency1').dispatch('input');
  await tick();
  assert.equal(store.devXGodWpQuettaSettings.badMicBands[1].enabled, true);
  assert.equal(store.devXGodWpQuettaSettings.badMicBands[1].gain, 3.5);
  assert.equal(doc.getElementById('badMicBandFrequencyTitle1').textContent, '420 Hz');

  // Close button triggers onClose cleanly
  doc.getElementById('closePanelBtn').click();
  assert.equal(closeCount, 1, 'Close button invokes onClose callback');

  console.log('PASS: DEV X GOD WP Laptop Studio UI & Auto-Unmute controller tests.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
