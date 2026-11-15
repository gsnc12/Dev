'use strict';

// Browser-free test for Laptop Studio WebAudio graph, ceiling control, auto-lift, and Auto-Unmute.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Param {
  constructor(value = 0, min = -Infinity, max = Infinity) {
    this.value = value;
    this.minValue = min;
    this.maxValue = max;
  }
  cancelScheduledValues() {}
  setTargetAtTime(v) { this.value = v; }
}

class Track {
  constructor(kind = 'audio', id = 'track') {
    this.kind = kind;
    this.id = id;
    this.readyState = 'live';
    this.enabled = true;
    this.listeners = {};
  }
  addEventListener(n, f) { (this.listeners[n] ||= []).push(f); }
  dispatch(n) { for (const f of this.listeners[n] || []) f(); }
  clone() { return new Track(this.kind, `${this.id}-clone`); }
  stop() { this.readyState = 'ended'; }
}

class Stream {
  constructor(tracks = []) { this.tracks = [...tracks]; }
  getTracks() { return [...this.tracks]; }
  getAudioTracks() { return this.tracks.filter((t) => t.kind === 'audio'); }
  getVideoTracks() { return this.tracks.filter((t) => t.kind === 'video'); }
}

class Node {
  constructor(kind) { this.kind = kind; this.connections = []; }
  connect(n) { this.connections.push(n); return n; }
  disconnect() { this.connections = []; }
  addEventListener() {}
}
class Gain extends Node { constructor() { super('gain'); this.gain = new Param(1, -1000, 1000); } }
class Biquad extends Node { constructor() { super('biquad'); this.type = 'lowpass'; this.frequency = new Param(350, 10, 24000); this.gain = new Param(0, -40, 40); this.Q = new Param(1, 0.0001, 1000); } }
class Compressor extends Node { constructor() { super('compressor'); this.threshold = new Param(-24, -100, 0); this.knee = new Param(30, 0, 40); this.ratio = new Param(12, 1, 20); this.attack = new Param(0.003, 0.0001, 1); this.release = new Param(0.25, 0.01, 1); } }
class Oscillator extends Node { constructor() { super('oscillator'); this.type = 'sine'; this.frequency = new Param(440, 0, 24000); this.started = false; } start() { this.started = true; } stop() { this.started = false; } }
class Analyzer extends Node { constructor() { super('analyser'); this.fftSize = 2048; this.level = 0.0008; } getByteTimeDomainData(a) { a.fill(128); } getFloatTimeDomainData(a) { a.fill(this.level); } }
class WaveShaper extends Node { constructor() { super('waveshaper'); this.curve = null; } }
class BufferSource extends Node { constructor() { super('buffer-source'); this.started = false; } start() { this.started = true; } stop() { this.started = false; } }
class Delay extends Node { constructor(maxDelayTime = 1) { super('delay'); this.delayTime = new Param(0, 0, maxDelayTime); this.maxDelayTime = maxDelayTime; } }

const listeners = {};
const intervals = new Map();
const timeouts = new Map();
const postedMessages = [];
let timer = 0;

const windowMock = {
  addEventListener(n, f) { (listeners[n] ||= []).push(f); },
  postMessage(msg, targetOrigin) { postedMessages.push({ msg, targetOrigin }); },
  setInterval(fn, delay) { const id = ++timer; intervals.set(id, { fn, delay }); return id; },
  clearInterval(id) { intervals.delete(id); },
  setTimeout(fn, delay) { const id = ++timer; timeouts.set(id, { fn, delay }); return id; },
  clearTimeout(id) { timeouts.delete(id); }
};

class AudioContextMock {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.nodes = [];
    this.destinations = [];
    this.resumeCalls = 0;
    windowMock.audioContext = this;
  }
  add(n) { this.nodes.push(n); return n; }
  createMediaStreamDestination() {
    const n = this.add(new Node('destination'));
    n.stream = new Stream([new Track('audio', 'processed')]);
    this.destinations.push(n);
    return n;
  }
  createGain() { return this.add(new Gain()); }
  createBiquadFilter() { return this.add(new Biquad()); }
  createDynamicsCompressor() { return this.add(new Compressor()); }
  createWaveShaper() { return this.add(new WaveShaper()); }
  createDelay(maxDelayTime = 1) { return this.add(new Delay(maxDelayTime)); }
  createMediaStreamSource(s) { const n = this.add(new Node('source')); n.stream = s; return n; }
  createAnalyser() { return this.add(new Analyzer()); }
  createOscillator() { return this.add(new Oscillator()); }
  createBuffer(c, l) { const a = Array.from({ length: c }, () => new Float32Array(l)); return { getChannelData: (i) => a[i] }; }
  createBufferSource() { return this.add(new BufferSource()); }
  resume() { this.resumeCalls += 1; this.state = 'running'; return Promise.resolve(); }
}

function makeMockButton({ label = '', icon = '', pressed = null, visible = true, onClick = null } = {}) {
  const btn = {
    clicks: 0,
    disabled: false,
    offsetParent: visible ? {} : null,
    getClientRects() { return visible ? [{ width: 40, height: 40 }] : []; },
    getAttribute(attr) {
      if (attr === 'aria-label') return label;
      if (attr === 'aria-pressed') return pressed;
      return null;
    },
    querySelector(sel) {
      if (sel === '[data-icon]' && icon) return { getAttribute: () => icon };
      return null;
    },
    click() {
      this.clicks += 1;
      if (onClick) onClick();
    }
  };
  return btn;
}

let domButtons = [];
windowMock.AudioContext = AudioContextMock;
const mic = new Track('audio', 'mic');
const camera = new Track('video', 'camera');
const sourceStream = new Stream([mic, camera]);
const navigatorMock = { mediaDevices: { getUserMedia() { return Promise.resolve(sourceStream); } } };
const documentMock = {
  addEventListener() {},
  querySelectorAll() { return domButtons; }
};

let mockNow = 10000;
const DateMock = { now: () => mockNow };

const sandbox = {
  window: windowMock,
  navigator: navigatorMock,
  document: documentMock,
  location: { origin: 'https://web.whatsapp.com' },
  MediaStream: Stream,
  Float32Array,
  Uint8Array,
  Math,
  Number,
  Boolean,
  Object,
  Array,
  Promise,
  Reflect,
  WeakSet,
  WeakMap,
  Set,
  Map,
  Date: DateMock,
  console: { warn(...args) { throw new Error(`Unexpected fallback: ${args.join(' ')}`); } },
  setTimeout: windowMock.setTimeout,
  clearTimeout: windowMock.clearTimeout
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(`${__dirname}/../shared/config.js`, 'utf8'), sandbox, { filename: 'config.js' });
vm.runInContext(fs.readFileSync(`${__dirname}/../content/main-world.js`, 'utf8'), sandbox, { filename: 'main-world.js' });

const sendConfig = (payload) => {
  for (const fn of listeners.message || []) {
    fn({ source: windowMock, origin: 'https://web.whatsapp.com', data: { channel: 'devxgodwp-quetta-extension', type: 'CONFIG', payload } });
  }
};
const check = (value, label) => assert.ok(value, label);
const autoLevelTimer = () => [...intervals.entries()].find(([, entry]) => entry.delay === 80);
const autoUnmuteTimer = () => [...intervals.entries()].find(([, entry]) => entry.delay === 350);
const tickAutoLevel = (count = 1) => {
  const entry = autoLevelTimer();
  check(entry, 'auto-lift timer is running');
  for (let i = 0; i < count; i += 1) entry[1].fn();
};
const flushTimeouts = () => {
  for (const [id, entry] of [...timeouts.entries()]) {
    timeouts.delete(id);
    entry.fn();
  }
};

(async () => {
  check(navigatorMock.mediaDevices.getUserMedia.__devXGodWpQuettaWrapped, 'getUserMedia hook installed');
  const output = await navigatorMock.mediaDevices.getUserMedia({ audio: true, video: true });
  check(output !== sourceStream, 'processed output stream returned');
  check(output.getAudioTracks().length === 1, 'outgoing audio track generated');
  check(output.getVideoTracks()[0] === camera, 'video is passed through unchanged');

  const context = windowMock.audioContext;
  const destination = context.destinations[0];
  const [dry, processed] = context.nodes.filter((n) => n.connections.includes(destination));
  check(dry?.kind === 'gain' && processed?.kind === 'gain', 'dry and effects routes exist');

  // Lazy generator check: oscillators must NOT burn CPU while bypassed.
  const generatorPulse = context.nodes.find((n) => n.kind === 'oscillator' && n.type === 'sine');
  const generatorNoise = context.nodes.find((n) => n.kind === 'buffer-source');
  check(!generatorPulse.started && !generatorNoise.started, 'generator oscillators stay idle until generator is actually active');

  // Suspended AudioContext auto-resume on user gesture.
  context.state = 'suspended';
  for (const fn of listeners.pointerdown || []) fn();
  check(context.state === 'running', 'suspended AudioContext automatically resumes on user gesture');

  const compressor = context.nodes.find((n) => n.kind === 'compressor');
  const voiceFilterRoutes = context.nodes.filter((n) => n.kind === 'gain' && n.connections.includes(compressor));
  const voiceFilterDry = voiceFilterRoutes.find((n) => n.gain.value === 1);
  const voiceFilterWet = voiceFilterRoutes.find((n) => n.gain.value === 0);
  const badMicVoiceFilter = context.nodes.find((n) => n.kind === 'biquad' && n.type === 'highpass' && n.frequency.value === 400);
  const eqCenters = [90, 350, 800, 2000, 7000, 10000];
  const eqNodes = context.nodes.filter((n) => n.kind === 'biquad' && n.type === 'peaking' && eqCenters.includes(n.frequency.value));
  check(eqNodes.length === 6, 'six parametric EQ stages created');
  check(voiceFilterDry && voiceFilterWet && badMicVoiceFilter?.Q.value === 0.1, 'voice-filter approximation bypassed by default');

  // GOD MODE test
  sendConfig({
    enabled: true, gain: 64, clarity: 9, warmth: 2, air: 5, compression: 20,
    distortion: 1, hardClip: true, ceiling: -0.1, voiceStyle: 'deep',
    badMicVoiceFilterEnabled: true, badMicBands: [{}, { enabled: true, frequency: 420, gain: 3.5, q: 1.4 }],
    generatorEnabled: true, generatorLevel: 1.35, generatorRate: 62, generatorTexture: 1,
    extraMicFxLevel: 0.75, autoLevelEnabled: true, autoLevelMax: 24, autoLevelTargetDb: -6
  });
  tickAutoLevel(12);
  check(dry.gain.value === 0 && processed.gain.value === 1, 'GOD MODE selects processed path');
  check(generatorPulse.started && generatorNoise.started, 'generator starts lazily when active');

  const [shaper, generatorShaper, outputClipper] = context.nodes.filter((n) => n.kind === 'waveshaper');
  const extraMic = context.nodes.find((n) => n.kind === 'gain' && n.connections.includes(shaper));
  const autoGain = context.nodes.find((n) => n.kind === 'gain' && n.connections.includes(extraMic));
  const voiceBoost = context.nodes.find((n) => n.kind === 'gain' && n.connections.includes(autoGain));
  const limiter = context.nodes.filter((n) => n.kind === 'compressor').at(-1);
  const mixBus = context.nodes.find((n) => n.kind === 'gain' && n.connections.includes(outputClipper));
  const extraMicFxBus = context.nodes.find((n) => n.kind === 'gain' && n.connections.includes(limiter));
  const delayNodes = context.nodes.filter((n) => n.kind === 'delay');
  const tapGains = context.nodes.filter((n) => n.kind === 'gain' && n.connections.includes(extraMicFxBus));
  const generatorBus = context.nodes.find((n) => n.kind === 'gain' && n.connections.includes(generatorShaper));

  check(shaper?.curve?.[0] === -1 && shaper.curve.at(-1) === 1, 'hard-clip saturator curve reaches full scale');
  check(autoGain?.gain.value > 9 && autoGain.gain.value <= 24, 'auto-lift raises quiet mic within 24× cap');
  check(limiter.threshold.value === -0.1, 'GOD MODE limiter threshold applied');
  check(delayNodes.length === 19 && tapGains.length === 19, 'Extra Mic creates 19 taps');
  check(limiter.connections.includes(mixBus) && mixBus.connections.includes(outputClipper), 'shared peak control routes into ceiling clipper');

  // Verify fixed outputClipper respects -3 dBFS ceiling (~0.7079) without 100x post-limiter boost!
  sendConfig({ enabled: true, gain: 8, distortion: 1, hardClip: true, ceiling: -3, generatorEnabled: false });
  const expectedCeiling = Math.pow(10, -3 / 20);
  check(Math.abs(outputClipper.curve.at(-1) - expectedCeiling) < 1e-4, 'outputClipper strictly caps output at configured -3 dBFS ceiling');
  check(Math.abs(outputClipper.curve[2048]) < 1e-9, 'odd-length outputClipper curve has exact zero at center (zero DC bias)');
  check(Math.abs(outputClipper.curve[2048 + 410] - (410 / 2048)) < 1e-3, 'outputClipper preserves unity gain below ceiling');

  // LAPTOP LOUD preset
  sendConfig({
    enabled: true, gain: 8, clarity: 1.5, warmth: 0.5, air: 1.5, compression: 5,
    distortion: 0.03, hardClip: false, ceiling: -0.5, voiceStyle: 'normal',
    generatorEnabled: true, generatorLevel: 0.38, generatorRate: 52, generatorTexture: 0.16,
    autoLevelEnabled: true, autoLevelMax: 6, autoLevelTargetDb: -9
  });
  tickAutoLevel(12);
  check(voiceBoost.gain.value === 8 && autoGain.gain.value > 1 && autoGain.gain.value <= 6, 'LAPTOP LOUD gain & 6× auto-lift bounded');
  check(generatorBus.gain.value === 0.38, 'LAPTOP LOUD restrained generator bed');

  // ===================== AUTO-UNMUTE TESTS =====================
  const outTrack = output.getAudioTracks()[0];

  // 1. With autoUnmute OFF, muting stays muted and watchdog is off.
  sendConfig({ enabled: false, autoUnmute: false });
  check(!autoUnmuteTimer(), 'auto-unmute watchdog is off when unticked');
  outTrack.enabled = false;
  flushTimeouts();
  check(outTrack.enabled === false, 'track stays muted normally when Auto-Unmute is unticked');

  // 2. Ticking autoUnmute ON (even while DSP enabled is FALSE!) immediately unmutes the muted track.
  const prevEvents = postedMessages.filter((m) => m.msg?.type === 'AUTO_UNMUTE_EVENT').length;
  sendConfig({ enabled: false, autoUnmute: true });
  check(Boolean(autoUnmuteTimer()), 'auto-unmute watchdog starts when ticked');
  check(outTrack.enabled === true, 'ticking Auto-Unmute immediately unmutes an already-muted mic even with DSP off');
  check(
    postedMessages.filter((m) => m.msg?.type === 'AUTO_UNMUTE_EVENT').length === prevEvents + 1,
    'AUTO_UNMUTE_EVENT is posted to UI when mic is unmuted'
  );

  // 3. When WhatsApp mutes the track while Auto-Unmute is ticked, it automatically clicks the safe Call Unmute button & restores enabled=true.
  const notifUnmuteBtn = makeMockButton({ label: 'Unmute notifications', icon: 'muted' });
  const videoUnmuteBtn = makeMockButton({ label: 'Unmute video', icon: 'volume-off' });
  const activeMuteBtn = makeMockButton({ label: 'Mute microphone', icon: 'mic' });
  const callUnmuteBtn = makeMockButton({
    label: 'Unmute microphone',
    icon: 'mic-off',
    onClick: () => { outTrack.enabled = true; }
  });
  domButtons = [notifUnmuteBtn, videoUnmuteBtn, activeMuteBtn, callUnmuteBtn];

  mockNow += 1000;
  outTrack.enabled = false;
  flushTimeouts();
  check(callUnmuteBtn.clicks === 1, 'Auto-Unmute clicks WhatsApp Call Unmute button');
  check(outTrack.enabled === true, 'Auto-Unmute restores track.enabled to true');
  check(notifUnmuteBtn.clicks === 0, 'Auto-Unmute never clicks notification unmute button');
  check(videoUnmuteBtn.clicks === 0, 'Auto-Unmute never clicks video/speaker unmute button');
  check(activeMuteBtn.clicks === 0, 'Auto-Unmute never clicks active Mute button');

  // 4. Even without a matching DOM button (e.g., non-English UI), track-level Auto-Unmute still restores enabled=true!
  domButtons = [];
  mockNow += 1000;
  outTrack.enabled = false;
  flushTimeouts();
  check(outTrack.enabled === true, 'track-level Auto-Unmute restores mic even if no DOM button matches');

  // 5. Watchdog catches muted inputTrack too.
  mic.enabled = false;
  mockNow += 1000;
  autoUnmuteTimer()[1].fn();
  check(mic.enabled === true, 'Auto-Unmute watchdog also unmutes muted inputTrack');

  // 6. Unticking Auto-Unmute cleanly stops watchdog and allows normal muting again.
  sendConfig({ enabled: false, autoUnmute: false });
  check(!autoUnmuteTimer(), 'unticking Auto-Unmute stops watchdog timer');
  outTrack.enabled = false;
  flushTimeouts();
  check(outTrack.enabled === false, 'normal muting resumes immediately after unticking Auto-Unmute');

  // Cleanup check
  const levelTimerId = autoLevelTimer()[0];
  outTrack.stop();
  check(!intervals.has(levelTimerId), 'call cleanup stops auto-lift timer');
  check(mic.readyState === 'ended', 'stopping processed track releases original mic track');
  check(!generatorPulse.started && !generatorNoise.started, 'cleanup stops generator sources');
  check(delayNodes.every((n) => n.connections.length === 0), 'cleanup disconnects delay line');

  console.log('PASS: DEV X GOD WP Laptop Studio DSP & Auto-Unmute tests.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
