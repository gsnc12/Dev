(() => {
  'use strict';

  // Runs in WhatsApp Web's MAIN world so its getUserMedia call can be wrapped.
  // Audio stays in the browser: this code does not record or upload it.
  if (window.__devXGodWpQuettaHookInstalled) return;
  window.__devXGodWpQuettaHookInstalled = true;

  const sharedConfig = globalThis.__DEV_X_GOD_WP_CONFIG__;
  const PAGE_CHANNEL = sharedConfig?.PAGE_CHANNEL || 'devxgodwp-quetta-main';
  const EXTENSION_CHANNEL = sharedConfig?.EXTENSION_CHANNEL || 'devxgodwp-quetta-extension';
  const DEFAULTS = sharedConfig?.DEFAULTS || {
    enabled: false,
    autoUnmute: false,
    preset: 'generator',
    gain: 4,
    clarity: 1.5,
    warmth: 0.5,
    air: 1,
    compression: 4,
    distortion: 0.02,
    hardClip: false,
    ceiling: -1.2,
    voiceStyle: 'normal',
    generatorEnabled: true,
    generatorLevel: 0.38,
    generatorRate: 52,
    generatorTexture: 0.16,
    extraMicEnabled: false,
    extraMicBoost: 1.5,
    extraMicFxLevel: 0,
    badMicVoiceFilterEnabled: false,
    badMicBands: [
      { enabled: false, frequency: 90, gain: 0, q: 0.8 },
      { enabled: false, frequency: 350, gain: 0, q: 0.8 },
      { enabled: false, frequency: 800, gain: 0, q: 0.8 },
      { enabled: false, frequency: 2000, gain: 0, q: 0.8 },
      { enabled: false, frequency: 7000, gain: 0, q: 0.8 },
      { enabled: false, frequency: 10000, gain: 0, q: 0.8 }
    ],
    autoLevelEnabled: true,
    autoLevelMax: 3,
    autoLevelTargetDb: -14
  };

  const clamp = sharedConfig?.clamp || ((value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  });

  const normalizeSettings = sharedConfig?.normalize || ((raw) => ({ ...DEFAULTS, ...(raw || {}) }));

  // Extra Mic's native recorder callback uses 1024-sample blocks at 48 kHz.
  // It mixes 19 delayed taps at 8-block intervals, from 171 ms to about 3.24 s.
  const EXTRA_MIC_FX_BLOCK_SECONDS = 1024 / 48000;
  const EXTRA_MIC_FX_TAP_INTERVAL_SECONDS = 8 * EXTRA_MIC_FX_BLOCK_SECONDS;
  const EXTRA_MIC_FX_TAP_SPECS = [
    { echoIndex: 1, delayBlocks: 8, baseGain: 0.6, decayPower: 0, firstTap: true },
    ...Array.from({ length: 18 }, (_, index) => {
      const echoIndex = index + 2;
      return {
        echoIndex,
        delayBlocks: echoIndex * 8,
        baseGain: echoIndex % 2 === 0 ? 0.4 : 0.5,
        decayPower: Math.floor(echoIndex / 2),
        firstTap: false
      };
    })
  ];

  // Auto-unmute DOM safety matchers: only target active call microphone unmute controls.
  const EXCLUDE_BUTTON_RE = /\b(notification|notifications|chat|chats|group|groups|status|channel|channels|message|messages|video|camera|speaker|volume|output|end|hang\s*up|leave|decline|reject|sound|ring|alert|gif|media|player|playback|ptt)\b/i;
  const EXCLUDE_ICON_RE = /(volume|speaker|sound|video|camera|bell|notif|chat|status|call[-_]?end|hang[-_]?up)/i;
  const UNMUTE_LABEL_RE = /\b(unmute|un-mute|turn\s+on\s+(mic|microphone)|microphone\s+off|mic\s+off|mic\s+is\s+off|mic\s+muted|microphone\s+muted)\b/i;
  const MUTED_ICON_RE = /(mic[-_]?off|microphone[-_]?off|audio[-_]?muted|call[-_]?mic[-_]?off|voip[-_]?mic[-_]?off|ic[-_]?mic[-_]?off|mic[-_]?slash)/i;
  const CALL_END_RE = /\b(end\s*call|hang\s*up|leave\s*call|disconnect)\b/i;
  const CALL_END_ICON_RE = /(call[-_]?end|end[-_]?call|hang[-_]?up|phone[-_]?off)/i;

  let settings = normalizeSettings(DEFAULTS);
  let receivedSettings = false;
  let audioContext = null;
  let audioContextUnavailable = false;
  let gestureResumeAttached = false;
  let autoUnmuteWatchdog = null;
  let autoUnmuteDebounceTimer = null;
  let lastDomUnmuteClickAt = 0;
  let autoUnmuteCount = 0;

  const pipelines = new Set();
  const monitoredTracks = new Set();
  const trackNativeEnabled = new WeakMap();
  const transformedStreams = new WeakMap();
  const outputStreams = new WeakSet();
  const distortionCurves = new Map();
  const ceilingCurves = new Map();

  function makeDistortionCurve(amount, hardClip = false) {
    const strength = Math.round(clamp(amount, 0, 1, 0) * 100) / 100;
    const key = `${strength}:${hardClip ? 1 : 0}`;
    if (distortionCurves.has(key)) return distortionCurves.get(key);

    const length = 4097;
    const curve = new Float32Array(length);
    const drive = 1 + strength * (hardClip ? 99 : 16);
    const normalizer = Math.tanh(drive) || 1;
    for (let index = 0; index < length; index += 1) {
      const x = (index * 2) / (length - 1) - 1;
      curve[index] = strength === 0
        ? x
        : hardClip
          ? Math.max(-1, Math.min(1, x * drive))
          : Math.tanh(x * drive) / normalizer;
    }
    distortionCurves.set(key, curve);
    return curve;
  }

  // Final output clipper respects the selected dBFS ceiling with unity gain below ceiling.
  function makeCeilingClipperCurve(ceilingDb, hardClip = false) {
    const roundedDb = Math.round(clamp(ceilingDb, -3, -0.1, -0.1) * 10) / 10;
    const key = `${roundedDb}:${hardClip ? 1 : 0}`;
    if (ceilingCurves.has(key)) return ceilingCurves.get(key);

    const limit = Math.pow(10, roundedDb / 20);
    const length = 4097;
    const curve = new Float32Array(length);
    for (let index = 0; index < length; index += 1) {
      const x = (index * 2) / (length - 1) - 1;
      curve[index] = hardClip
        ? Math.max(-limit, Math.min(limit, x))
        : limit * Math.tanh(x / limit);
    }
    ceilingCurves.set(key, curve);
    return curve;
  }

  function postConfigRequest() {
    try {
      window.postMessage({ channel: PAGE_CHANNEL, type: 'REQUEST_CONFIG' }, location.origin);
    } catch (_) {}
  }

  function notifyAutoUnmute(reason) {
    autoUnmuteCount += 1;
    try {
      window.postMessage({
        channel: PAGE_CHANNEL,
        type: 'AUTO_UNMUTE_EVENT',
        count: autoUnmuteCount,
        reason,
        timestamp: Date.now()
      }, location.origin);
    } catch (_) {}
  }

  function setTrackEnabledRaw(track, value) {
    const native = trackNativeEnabled.get(track);
    if (native && typeof native.set === 'function') {
      native.set(Boolean(value));
      return;
    }
    try { track.enabled = Boolean(value); } catch (_) {}
  }

  function getTrackEnabledRaw(track) {
    const native = trackNativeEnabled.get(track);
    if (native && typeof native.get === 'function') {
      return Boolean(native.get());
    }
    try { return Boolean(track.enabled); } catch (_) { return true; }
  }

  function hasLiveAudioTrack() {
    for (const track of monitoredTracks) {
      if (track && track.readyState !== 'ended') return true;
    }
    return false;
  }

  function isElementVisible(el) {
    if (!el || el.disabled) return false;
    if (typeof el.getAttribute === 'function' && el.getAttribute('aria-disabled') === 'true') return false;
    if (typeof el.getClientRects === 'function') {
      const rects = el.getClientRects();
      if (rects && rects.length === 0) return false;
    }
    if ('offsetParent' in el && el.offsetParent === null) {
      try {
        const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(el) : null;
        if (!style || style.position !== 'fixed' || style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
      } catch (_) {
        return false;
      }
    }
    return true;
  }

  function getButtonTextMeta(button) {
    const parts = [];
    if (typeof button.getAttribute === 'function') {
      for (const attr of ['aria-label', 'title', 'data-testid']) {
        const val = button.getAttribute(attr);
        if (val) parts.push(val);
      }
    }
    let iconName = '';
    if (typeof button.querySelector === 'function') {
      const iconEl = button.querySelector('[data-icon]');
      if (iconEl && typeof iconEl.getAttribute === 'function') {
        iconName = iconEl.getAttribute('data-icon') || '';
      }
    }
    return {
      label: parts.join(' ').trim(),
      iconName,
      ariaPressed: typeof button.getAttribute === 'function' ? button.getAttribute('aria-pressed') : null
    };
  }

  function hasActiveCallControls() {
    if (!document || typeof document.querySelectorAll !== 'function') return false;
    const buttons = document.querySelectorAll('button, [role="button"]');
    for (const button of buttons) {
      if (!isElementVisible(button)) continue;
      const { label, iconName } = getButtonTextMeta(button);
      if (CALL_END_RE.test(label) || CALL_END_ICON_RE.test(iconName)) return true;
    }
    return false;
  }

  function findCallUnmuteButton() {
    if (!document || typeof document.querySelectorAll !== 'function') return null;
    if (!hasLiveAudioTrack() && !hasActiveCallControls()) return null;

    const buttons = document.querySelectorAll('button, [role="button"]');
    for (const button of buttons) {
      if (!isElementVisible(button)) continue;
      const { label, iconName, ariaPressed } = getButtonTextMeta(button);
      if (EXCLUDE_BUTTON_RE.test(label) || EXCLUDE_BUTTON_RE.test(iconName) || EXCLUDE_ICON_RE.test(iconName)) continue;

      const labelSaysUnmute = UNMUTE_LABEL_RE.test(label);
      const iconSaysMuted = MUTED_ICON_RE.test(iconName);
      const pressedMuteMic = ariaPressed === 'true' && /\b(mic|microphone|mute)\b/i.test(label) && iconSaysMuted;

      if (labelSaysUnmute || iconSaysMuted || pressedMuteMic) {
        return button;
      }
    }
    return null;
  }

  function enforceAutoUnmute(reason = 'watchdog') {
    if (!settings.autoUnmute) return false;
    let actionTaken = false;

    // 1. If WhatsApp's call UI shows a muted mic button, click Unmute to keep
    //    both WhatsApp's React state and remote caller indicators in sync.
    const now = Date.now();
    if (now - lastDomUnmuteClickAt >= 650) {
      const unmuteBtn = findCallUnmuteButton();
      if (unmuteBtn && typeof unmuteBtn.click === 'function') {
        lastDomUnmuteClickAt = now;
        try {
          unmuteBtn.click();
          actionTaken = true;
        } catch (_) {}
      }
    }

    // 2. Always guarantee live tracked audio tracks remain enabled at WebRTC level.
    for (const track of [...monitoredTracks]) {
      if (!track || track.readyState === 'ended') {
        monitoredTracks.delete(track);
        continue;
      }
      if (!getTrackEnabledRaw(track)) {
        setTrackEnabledRaw(track, true);
        actionTaken = true;
      }
    }

    if (audioContext && audioContext.state === 'suspended') {
      try { audioContext.resume().catch(() => {}); } catch (_) {}
    }

    if (actionTaken) notifyAutoUnmute(reason);
    return actionTaken;
  }

  function scheduleAutoUnmuteCheck(reason, delayMs = 80) {
    if (!settings.autoUnmute) return;
    if (autoUnmuteDebounceTimer) window.clearTimeout(autoUnmuteDebounceTimer);
    autoUnmuteDebounceTimer = window.setTimeout(() => {
      autoUnmuteDebounceTimer = null;
      enforceAutoUnmute(reason);
    }, delayMs);
  }

  function syncAutoUnmuteWatchdog() {
    if (settings.autoUnmute) {
      if (!autoUnmuteWatchdog) {
        autoUnmuteWatchdog = window.setInterval(() => {
          enforceAutoUnmute('watchdog');
        }, 350);
      }
    } else {
      if (autoUnmuteWatchdog) {
        window.clearInterval(autoUnmuteWatchdog);
        autoUnmuteWatchdog = null;
      }
      if (autoUnmuteDebounceTimer) {
        window.clearTimeout(autoUnmuteDebounceTimer);
        autoUnmuteDebounceTimer = null;
      }
    }
  }

  function monitorAudioTrack(track, { interceptEnabledSetter = false } = {}) {
    if (!track || monitoredTracks.has(track)) return;
    monitoredTracks.add(track);

    if (interceptEnabledSetter) {
      const proto = Object.getPrototypeOf(track);
      const protoDesc = proto ? Object.getOwnPropertyDescriptor(proto, 'enabled') : null;
      const ownDesc = Object.getOwnPropertyDescriptor(track, 'enabled');

      if (protoDesc && typeof protoDesc.get === 'function' && typeof protoDesc.set === 'function') {
        const nativeGet = protoDesc.get.bind(track);
        const nativeSet = protoDesc.set.bind(track);
        trackNativeEnabled.set(track, { get: nativeGet, set: nativeSet });
        try {
          Object.defineProperty(track, 'enabled', {
            configurable: true,
            enumerable: true,
            get() {
              return nativeGet();
            },
            set(next) {
              const boolVal = Boolean(next);
              nativeSet(boolVal);
              if (!boolVal && settings.autoUnmute) {
                scheduleAutoUnmuteCheck('track-setter', 80);
              }
            }
          });
        } catch (_) {}
      } else if (!ownDesc || ownDesc.configurable) {
        let backingEnabled = Boolean(track.enabled);
        const nativeGet = () => backingEnabled;
        const nativeSet = (val) => { backingEnabled = Boolean(val); };
        trackNativeEnabled.set(track, { get: nativeGet, set: nativeSet });
        try {
          Object.defineProperty(track, 'enabled', {
            configurable: true,
            enumerable: true,
            get() {
              return backingEnabled;
            },
            set(next) {
              backingEnabled = Boolean(next);
              if (!backingEnabled && settings.autoUnmute) {
                scheduleAutoUnmuteCheck('track-setter', 80);
              }
            }
          });
        } catch (_) {}
      }
    }

    try {
      track.addEventListener('mute', () => {
        if (settings.autoUnmute) {
          if (audioContext && audioContext.state === 'suspended') {
            try { audioContext.resume().catch(() => {}); } catch (_) {}
          }
          scheduleAutoUnmuteCheck('track-mute-event', 100);
        }
      });
      track.addEventListener('ended', () => {
        monitoredTracks.delete(track);
      }, { once: true });
    } catch (_) {}
  }

  function attachGestureResume() {
    if (gestureResumeAttached) return;
    gestureResumeAttached = true;
    const resumeOnGesture = () => {
      if (audioContext && audioContext.state === 'suspended') {
        try { audioContext.resume().catch(() => {}); } catch (_) {}
      }
    };
    for (const eventName of ['pointerdown', 'keydown', 'click', 'touchstart']) {
      try {
        window.addEventListener(eventName, resumeOnGesture, { passive: true, capture: true });
      } catch (_) {}
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.channel !== EXTENSION_CHANNEL || message.type !== 'CONFIG') return;

    const prevAutoUnmute = settings.autoUnmute;
    settings = normalizeSettings(message.payload);
    receivedSettings = true;
    for (const pipeline of pipelines) applySettings(pipeline);
    syncAutoUnmuteWatchdog();
    if (settings.autoUnmute && !prevAutoUnmute) {
      enforceAutoUnmute('config-enabled');
    }
  });

  postConfigRequest();
  let requestAttempts = 0;
  const requestTimer = window.setInterval(() => {
    if (receivedSettings || requestAttempts >= 24) {
      window.clearInterval(requestTimer);
      return;
    }
    requestAttempts += 1;
    postConfigRequest();
  }, 250);

  function getAudioContext() {
    if (audioContextUnavailable) return null;
    if (!audioContext || audioContext.state === 'closed') {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) {
        audioContextUnavailable = true;
        return null;
      }

      try {
        audioContext = new AudioContextConstructor({ latencyHint: 'interactive' });
      } catch (_) {
        try {
          audioContext = new AudioContextConstructor();
        } catch (_) {
          audioContextUnavailable = true;
          return null;
        }
      }
      attachGestureResume();
    }

    if (audioContext.state === 'suspended') {
      try { audioContext.resume().catch(() => {}); } catch (_) {}
    }
    return audioContext;
  }

  function setParam(param, value, context, smoothing = 0.025) {
    if (!param) return;
    const now = context.currentTime;
    try {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, smoothing);
    } catch (_) {
      try { param.value = value; } catch (_) {}
    }
  }

  function ensureGeneratorStarted(pipeline) {
    if (!pipeline || pipeline.cleaned || pipeline.generatorStarted) return;
    pipeline.generatorStarted = true;
    const { nodes } = pipeline;
    try { nodes.generatorOsc.start(0); } catch (_) {}
    try { nodes.generatorOsc2.start(0); } catch (_) {}
    try { nodes.generatorOsc3.start(0); } catch (_) {}
    try { nodes.generatorOsc4.start(0); } catch (_) {}
    try { nodes.generatorPulse.start(0); } catch (_) {}
    try { nodes.generatorNoise.start(0); } catch (_) {}
  }

  function applySettings(pipeline) {
    if (!pipeline || pipeline.cleaned) return;
    const { context, nodes } = pipeline;
    const active = settings.enabled;

    // A direct dry path provides a bypass when enhancement is turned off.
    setParam(nodes.dry.gain, active ? 0 : 1, context);
    setParam(nodes.processed.gain, active ? 1 : 0, context);

    const badMicVoiceFilter = active && settings.badMicVoiceFilterEnabled;
    setParam(nodes.highpass.frequency, active && settings.voiceStyle === 'deep' ? 55 : 75, context);
    setParam(nodes.highpass.Q, 0.707, context);
    setParam(nodes.voiceFilterDry.gain, badMicVoiceFilter ? 0 : 1, context);
    setParam(nodes.voiceFilterWet.gain, badMicVoiceFilter ? 1 : 0, context);
    setParam(nodes.badMicVoiceFilter.frequency, 400, context);
    setParam(nodes.badMicVoiceFilter.Q, 0.1, context);
    setParam(nodes.warmth.gain, active ? settings.warmth : 0, context);
    setParam(nodes.clarity.gain, active ? settings.clarity : 0, context);
    setParam(nodes.air.gain, active ? settings.air : 0, context);

    const maxBandFrequency = Math.min(10000, context.sampleRate / 2);
    for (let index = 0; index < nodes.badMicEq.length; index += 1) {
      const band = settings.badMicBands[index];
      const filter = nodes.badMicEq[index];
      const bandActive = active && band.enabled;
      setParam(filter.frequency, clamp(band.frequency, 20, maxBandFrequency, DEFAULTS.badMicBands[index].frequency), context);
      setParam(filter.Q, band.q, context);
      setParam(filter.gain, bandActive ? band.gain : 0, context);
    }

    setParam(nodes.compressor.threshold, -30, context);
    setParam(nodes.compressor.knee, 12, context);
    setParam(nodes.compressor.ratio, active ? settings.compression : 1, context);
    setParam(nodes.compressor.attack, 0.002, context);
    setParam(nodes.compressor.release, 0.16, context);

    setParam(nodes.boost.gain, active ? settings.gain : 1, context);
    if (active && settings.autoLevelEnabled) {
      pipeline.autoLevelValue = clamp(pipeline.autoLevelValue, 1, settings.autoLevelMax, 1);
    } else {
      pipeline.autoLevelValue = 1;
    }
    setParam(nodes.autoGain.gain, pipeline.autoLevelValue, context, 0.08);
    setParam(nodes.extraMic.gain, active && settings.extraMicEnabled ? settings.extraMicBoost : 1, context);

    const extraMicFxLevel = active ? settings.extraMicFxLevel : 0;
    const nativeFxScalar = extraMicFxLevel * 0.8;
    for (const tap of pipeline.extraMicFxTaps) {
      const tapGain = tap.firstTap
        ? tap.baseGain * extraMicFxLevel
        : tap.baseGain * Math.pow(nativeFxScalar, tap.decayPower);
      setParam(tap.gain.gain, tapGain, context, 0.04);
    }

    const activeCurve = makeDistortionCurve(active ? settings.distortion : 0, active && settings.hardClip);
    const ceilingCurve = makeCeilingClipperCurve(active ? settings.ceiling : -0.5, active && settings.hardClip);
    try {
      nodes.saturator.curve = activeCurve;
      nodes.generatorSaturator.curve = activeCurve;
      nodes.outputClipper.curve = ceilingCurve;
    } catch (_) {}

    setParam(nodes.limiter.threshold, active ? settings.ceiling : -0.5, context);
    setParam(nodes.limiter.knee, 0, context);
    setParam(nodes.limiter.ratio, 20, context);
    setParam(nodes.limiter.attack, 0.001, context);
    setParam(nodes.limiter.release, 0.1, context);

    const generatorActive = active && settings.generatorEnabled;
    if (generatorActive) ensureGeneratorStarted(pipeline);

    setParam(nodes.generatorOsc.frequency, settings.generatorRate, context);
    setParam(nodes.generatorOsc2.frequency, settings.generatorRate * 2, context);
    setParam(nodes.generatorOsc3.frequency, settings.generatorRate * 3, context);
    setParam(nodes.generatorOsc4.frequency, settings.generatorRate * 4, context);
    setParam(nodes.generatorPulse.frequency, clamp(settings.generatorRate / 12, 2.5, 7, 4), context);
    setParam(nodes.generatorBus.gain, generatorActive ? settings.generatorLevel : 0, context, 0.04);
    setParam(nodes.generatorToneA.gain, 0.24, context);
    setParam(nodes.generatorToneB.gain, 0.12, context);
    setParam(nodes.generatorToneC.gain, 0.12, context);
    setParam(nodes.generatorToneD.gain, 0.08, context);
    setParam(nodes.generatorPulseDepth.gain, generatorActive ? Math.min(settings.generatorLevel * 0.3, 0.5) : 0, context, 0.04);
    setParam(nodes.generatorNoiseGain.gain, generatorActive ? settings.generatorTexture * 0.32 : 0, context, 0.04);
    setParam(nodes.generatorNoiseFilter.frequency, 180 + settings.generatorTexture * 620, context);
    setParam(nodes.generatorNoiseFilter.Q, 0.65 + settings.generatorTexture * 0.45, context);

    if (context.state === 'suspended') {
      try { context.resume().catch(() => {}); } catch (_) {}
    }
  }

  function runAutoLevel(pipeline) {
    const { context, nodes } = pipeline;
    const samples = new Float32Array(nodes.levelAnalyser.fftSize);
    pipeline.autoLevelTimer = window.setInterval(() => {
      if (pipeline.cleaned) return;
      if (!settings.enabled || !settings.autoLevelEnabled) {
        pipeline.autoLevelValue = 1;
        setParam(nodes.autoGain.gain, 1, context, 0.08);
        return;
      }

      nodes.levelAnalyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      const rms = Math.sqrt(sum / samples.length);
      const levelDb = 20 * Math.log10(Math.max(rms, 0.000001));
      let targetGain = 1;
      if (levelDb > -64) {
        const fixedGainDb = 20 * Math.log10(Math.max(settings.gain, 1));
        const neededDb = settings.autoLevelTargetDb - (levelDb + fixedGainDb);
        targetGain = clamp(Math.pow(10, neededDb / 20), 1, settings.autoLevelMax, 1);
      }
      const rising = targetGain > pipeline.autoLevelValue;
      const alpha = rising ? 0.38 : 0.12;
      pipeline.autoLevelValue += (targetGain - pipeline.autoLevelValue) * alpha;
      setParam(nodes.autoGain.gain, pipeline.autoLevelValue, context, rising ? 0.04 : 0.12);
    }, 80);
  }

  function safeDisconnect(node) {
    try { node.disconnect(); } catch (_) {}
  }

  function stopTrack(track) {
    try {
      if (track && track.readyState !== 'ended') track.stop();
    } catch (_) {}
  }

  function buildProcessedStream(stream, context) {
    if (!stream || outputStreams.has(stream)) return stream;
    const cached = transformedStreams.get(stream);
    if (cached) return cached;

    let inputTracks;
    try { inputTracks = stream.getAudioTracks(); } catch (_) { return stream; }
    if (!inputTracks?.length) return stream;

    // Always monitor input tracks for Auto-Unmute even if AudioContext is unavailable.
    for (const inputTrack of inputTracks) {
      monitorAudioTrack(inputTrack, { interceptEnabledSetter: true });
    }
    if (!context) {
      if (settings.autoUnmute) enforceAutoUnmute('stream-start');
      return stream;
    }

    let pipeline;
    try {
      const destination = context.createMediaStreamDestination();
      const dry = context.createGain();
      const highpass = context.createBiquadFilter();
      const warmth = context.createBiquadFilter();
      const clarity = context.createBiquadFilter();
      const air = context.createBiquadFilter();
      const badMicEq = DEFAULTS.badMicBands.map((band) => {
        const filter = context.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = band.frequency;
        filter.Q.value = band.q;
        filter.gain.value = 0;
        return filter;
      });
      const badMicVoiceFilter = context.createBiquadFilter();
      const voiceFilterDry = context.createGain();
      const voiceFilterWet = context.createGain();
      const compressor = context.createDynamicsCompressor();
      const levelAnalyser = context.createAnalyser();
      const boost = context.createGain();
      const autoGain = context.createGain();
      const extraMic = context.createGain();
      const extraMicFxBus = context.createGain();
      const extraMicFxTaps = EXTRA_MIC_FX_TAP_SPECS.map((spec) => {
        const delay = context.createDelay(EXTRA_MIC_FX_TAP_INTERVAL_SECONDS * 1.1);
        const gain = context.createGain();
        delay.delayTime.value = EXTRA_MIC_FX_TAP_INTERVAL_SECONDS;
        gain.gain.value = 0;
        return { ...spec, delay, gain };
      });
      const extraMicFxNodes = extraMicFxTaps.flatMap((tap) => [tap.delay, tap.gain]);
      const saturator = context.createWaveShaper();
      const limiter = context.createDynamicsCompressor();
      const generatorSaturator = context.createWaveShaper();
      const mixBus = context.createGain();
      const outputClipper = context.createWaveShaper();
      const processed = context.createGain();
      const generatorOsc = context.createOscillator();
      const generatorOsc2 = context.createOscillator();
      const generatorOsc3 = context.createOscillator();
      const generatorOsc4 = context.createOscillator();
      const generatorPulse = context.createOscillator();
      const generatorToneA = context.createGain();
      const generatorToneB = context.createGain();
      const generatorToneC = context.createGain();
      const generatorToneD = context.createGain();
      const generatorPulseDepth = context.createGain();
      const generatorNoise = context.createBufferSource();
      const generatorNoiseFilter = context.createBiquadFilter();
      const generatorNoiseGain = context.createGain();
      const generatorBus = context.createGain();

      highpass.type = 'highpass';
      highpass.frequency.value = 75;
      highpass.Q.value = 0.707;
      warmth.type = 'lowshelf';
      warmth.frequency.value = 180;
      clarity.type = 'peaking';
      clarity.frequency.value = 3200;
      clarity.Q.value = 0.9;
      air.type = 'highshelf';
      air.frequency.value = 7000;
      badMicVoiceFilter.type = 'highpass';
      badMicVoiceFilter.frequency.value = 400;
      badMicVoiceFilter.Q.value = 0.1;
      voiceFilterDry.gain.value = 1;
      voiceFilterWet.gain.value = 0;
      saturator.oversample = '4x';
      generatorSaturator.oversample = '4x';
      outputClipper.oversample = '4x';
      levelAnalyser.fftSize = 1024;
      levelAnalyser.smoothingTimeConstant = 0.15;
      autoGain.gain.value = 1;
      extraMic.gain.value = 1;
      extraMicFxBus.gain.value = 1;
      mixBus.gain.value = 1;
      generatorOsc.type = 'sawtooth';
      generatorOsc2.type = 'square';
      generatorOsc3.type = 'triangle';
      generatorOsc4.type = 'sawtooth';
      generatorPulse.type = 'sine';
      generatorNoiseFilter.type = 'bandpass';
      generatorNoiseFilter.frequency.value = 500;
      generatorNoiseFilter.Q.value = 0.8;
      generatorToneA.gain.value = 0.24;
      generatorToneB.gain.value = 0.12;
      generatorToneC.gain.value = 0.12;
      generatorToneD.gain.value = 0.08;
      generatorPulseDepth.gain.value = 0;
      generatorNoiseGain.gain.value = 0;
      generatorBus.gain.value = 0;

      const generatorNoiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const generatorNoiseSamples = generatorNoiseBuffer.getChannelData(0);
      for (let index = 0; index < generatorNoiseSamples.length; index += 1) {
        generatorNoiseSamples[index] = Math.random() * 2 - 1;
      }
      generatorNoise.buffer = generatorNoiseBuffer;
      generatorNoise.loop = true;

      const sources = inputTracks.map((track) => {
        const singleTrackStream = new MediaStream([track]);
        return context.createMediaStreamSource(singleTrackStream);
      });

      // Dry bypass path.
      for (const source of sources) source.connect(dry);
      dry.connect(destination);

      // Processed outgoing-microphone path.
      for (const source of sources) source.connect(highpass);
      highpass.connect(warmth);
      warmth.connect(clarity);
      clarity.connect(air);
      let eqInput = air;
      for (const bandFilter of badMicEq) {
        eqInput.connect(bandFilter);
        eqInput = bandFilter;
      }
      eqInput.connect(voiceFilterDry);
      voiceFilterDry.connect(compressor);
      eqInput.connect(badMicVoiceFilter);
      badMicVoiceFilter.connect(voiceFilterWet);
      voiceFilterWet.connect(compressor);
      compressor.connect(levelAnalyser);
      levelAnalyser.connect(boost);
      boost.connect(autoGain);
      autoGain.connect(extraMic);
      extraMic.connect(saturator);
      saturator.connect(limiter);
      limiter.connect(mixBus);

      if (extraMicFxTaps.length) extraMic.connect(extraMicFxTaps[0].delay);
      for (let index = 0; index < extraMicFxTaps.length; index += 1) {
        const tap = extraMicFxTaps[index];
        tap.delay.connect(tap.gain);
        tap.gain.connect(extraMicFxBus);
        if (index + 1 < extraMicFxTaps.length) {
          tap.delay.connect(extraMicFxTaps[index + 1].delay);
        }
      }
      extraMicFxBus.connect(limiter);

      generatorOsc.connect(generatorToneA);
      generatorToneA.connect(generatorBus);
      generatorOsc2.connect(generatorToneB);
      generatorToneB.connect(generatorBus);
      generatorOsc3.connect(generatorToneC);
      generatorToneC.connect(generatorBus);
      generatorOsc4.connect(generatorToneD);
      generatorToneD.connect(generatorBus);
      generatorPulse.connect(generatorPulseDepth);
      generatorPulseDepth.connect(generatorBus.gain);
      generatorNoise.connect(generatorNoiseFilter);
      generatorNoiseFilter.connect(generatorNoiseGain);
      generatorNoiseGain.connect(generatorBus);
      generatorBus.connect(generatorSaturator);
      generatorSaturator.connect(limiter);

      mixBus.connect(outputClipper);
      outputClipper.connect(processed);
      processed.connect(destination);

      const audioOutputTracks = destination.stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      if (!audioOutputTracks.length) {
        for (const source of sources) safeDisconnect(source);
        return stream;
      }

      const output = new MediaStream([...audioOutputTracks, ...videoTracks]);
      pipeline = {
        context,
        destination,
        sources,
        inputTracks,
        outputTracks: audioOutputTracks,
        nativeOutputStops: [],
        nodes: {
          dry, highpass, warmth, clarity, air, badMicEq, badMicVoiceFilter,
          voiceFilterDry, voiceFilterWet, compressor, levelAnalyser, boost, autoGain,
          extraMic, extraMicFxBus, extraMicFxNodes, saturator, limiter,
          generatorSaturator, mixBus, outputClipper, processed,
          generatorOsc, generatorOsc2, generatorOsc3, generatorOsc4, generatorPulse,
          generatorToneA, generatorToneB, generatorToneC, generatorToneD,
          generatorPulseDepth, generatorNoise, generatorNoiseFilter, generatorNoiseGain, generatorBus
        },
        extraMicFxTaps,
        autoLevelValue: 1,
        autoLevelTimer: null,
        generatorStarted: false,
        cleaned: false,
        cleanup: null
      };

      const cleanup = ({ stopInputs = false, stopOutputs = false } = {}) => {
        if (pipeline.cleaned) return;
        pipeline.cleaned = true;
        pipelines.delete(pipeline);
        if (pipeline.autoLevelTimer) window.clearInterval(pipeline.autoLevelTimer);
        for (const t of inputTracks) monitoredTracks.delete(t);
        for (const t of audioOutputTracks) monitoredTracks.delete(t);
        if (stopInputs) inputTracks.forEach(stopTrack);
        if (stopOutputs) {
          for (const nativeStop of pipeline.nativeOutputStops) {
            try { nativeStop(); } catch (_) {}
          }
        }
        for (const source of sources) safeDisconnect(source);
        for (const node of Object.values(pipeline.nodes).flat()) safeDisconnect(node);
        if (pipeline.generatorStarted) {
          try { generatorOsc.stop(); } catch (_) {}
          try { generatorOsc2.stop(); } catch (_) {}
          try { generatorOsc3.stop(); } catch (_) {}
          try { generatorOsc4.stop(); } catch (_) {}
          try { generatorPulse.stop(); } catch (_) {}
          try { generatorNoise.stop(); } catch (_) {}
        }
      };
      pipeline.cleanup = cleanup;

      for (const outputTrack of audioOutputTracks) {
        monitorAudioTrack(outputTrack, { interceptEnabledSetter: true });

        if (typeof outputTrack.clone === 'function') {
          const nativeClone = outputTrack.clone.bind(outputTrack);
          try {
            Object.defineProperty(outputTrack, 'clone', {
              configurable: true,
              value() {
                const cloned = nativeClone();
                monitorAudioTrack(cloned, { interceptEnabledSetter: true });
                return cloned;
              }
            });
          } catch (_) {}
        }

        const nativeStop = outputTrack.stop.bind(outputTrack);
        pipeline.nativeOutputStops.push(nativeStop);
        try {
          Object.defineProperty(outputTrack, 'stop', {
            configurable: true,
            value() {
              cleanup({ stopInputs: true });
              return nativeStop();
            }
          });
        } catch (_) {}
        outputTrack.addEventListener('ended', () => cleanup({ stopInputs: true }), { once: true });
      }

      for (const inputTrack of inputTracks) {
        inputTrack.addEventListener('ended', () => {
          if (inputTracks.every((track) => track.readyState === 'ended')) {
            cleanup({ stopOutputs: true });
          }
        }, { once: true });
      }

      outputStreams.add(output);
      transformedStreams.set(stream, output);
      pipelines.add(pipeline);
      applySettings(pipeline);
      runAutoLevel(pipeline);
      if (settings.autoUnmute) enforceAutoUnmute('stream-start');
      return output;
    } catch (error) {
      if (pipeline?.cleanup) pipeline.cleanup({ stopInputs: false, stopOutputs: true });
      console.warn('[DEV X GOD WP Laptop] Audio enhancement could not be started; keeping the original microphone stream.', error);
      return stream;
    }
  }

  function requestsAudio(constraints) {
    if (constraints === true) return true;
    if (!constraints || typeof constraints !== 'object') return false;
    return Boolean(constraints.audio);
  }

  function patchGetUserMedia() {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') return false;
    const original = mediaDevices.getUserMedia;
    if (original.__devXGodWpQuettaWrapped) return true;

    const wrapped = function devXGodWpQuettaGetUserMedia(constraints) {
      if (!requestsAudio(constraints)) return Reflect.apply(original, this, [constraints]);

      const context = getAudioContext();
      const result = Reflect.apply(original, this, [constraints]);
      return Promise.resolve(result).then((stream) => buildProcessedStream(stream, context));
    };
    try { Object.defineProperty(wrapped, '__devXGodWpQuettaWrapped', { value: true }); } catch (_) {}

    try {
      Object.defineProperty(mediaDevices, 'getUserMedia', {
        configurable: true,
        writable: true,
        value: wrapped
      });
      if (mediaDevices.getUserMedia === wrapped) return true;
    } catch (_) {}

    try {
      const prototype = Object.getPrototypeOf(mediaDevices);
      if (prototype && prototype.getUserMedia === original) {
        Object.defineProperty(prototype, 'getUserMedia', {
          configurable: true,
          writable: true,
          value: wrapped
        });
        if (mediaDevices.getUserMedia === wrapped) return true;
      }
    } catch (_) {}

    return false;
  }

  if (!patchGetUserMedia()) {
    let retries = 0;
    const patchTimer = window.setInterval(() => {
      retries += 1;
      if (patchGetUserMedia() || retries >= 20) window.clearInterval(patchTimer);
    }, 250);
  }
})();
