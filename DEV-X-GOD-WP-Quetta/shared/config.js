(() => {
  'use strict';

  const CONFIG_KEY = '__DEV_X_GOD_WP_CONFIG__';
  if (globalThis[CONFIG_KEY]) return;

  const STORAGE_KEY = 'devXGodWpQuettaSettings';
  const DRAWER_WIDTH_KEY = 'devXGodWpDrawerWidthVw';
  const EXTENSION_CHANNEL = 'devxgodwp-quetta-extension';
  const PAGE_CHANNEL = 'devxgodwp-quetta-main';

  const DEFAULT_BAD_MIC_BANDS = [
    { enabled: false, frequency: 90, gain: 0, q: 0.8 },
    { enabled: false, frequency: 350, gain: 0, q: 0.8 },
    { enabled: false, frequency: 800, gain: 0, q: 0.8 },
    { enabled: false, frequency: 2000, gain: 0, q: 0.8 },
    { enabled: false, frequency: 7000, gain: 0, q: 0.8 },
    { enabled: false, frequency: 10000, gain: 0, q: 0.8 }
  ];

  const DEFAULTS = {
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
    badMicBands: DEFAULT_BAD_MIC_BANDS.map((band) => ({ ...band })),
    autoLevelEnabled: true,
    autoLevelMax: 3,
    autoLevelTargetDb: -14
  };

  const VALID_PRESETS = [
    'natural', 'boost', 'hifi', 'deep', 'generator',
    'laptop', 'max', 'attack', 'maxgen', 'custom'
  ];

  const PRESETS = {
    natural: {
      ...DEFAULTS,
      enabled: true,
      preset: 'natural',
      gain: 1,
      clarity: 0,
      warmth: 0,
      air: 0,
      compression: 2,
      distortion: 0,
      hardClip: false,
      ceiling: -1.2,
      voiceStyle: 'normal',
      generatorEnabled: false,
      generatorLevel: 0,
      generatorTexture: 0,
      autoLevelEnabled: false,
      autoLevelMax: 1,
      autoLevelTargetDb: -16
    },
    boost: {
      ...DEFAULTS,
      enabled: true,
      preset: 'boost',
      gain: 3.5,
      clarity: 1.5,
      warmth: 0.5,
      air: 1,
      compression: 4,
      distortion: 0,
      hardClip: false,
      ceiling: -1,
      voiceStyle: 'normal',
      generatorEnabled: false,
      generatorLevel: 0,
      generatorTexture: 0,
      autoLevelEnabled: true,
      autoLevelMax: 3,
      autoLevelTargetDb: -14
    },
    hifi: {
      ...DEFAULTS,
      enabled: true,
      preset: 'hifi',
      gain: 24,
      clarity: 4.5,
      warmth: 0.5,
      air: 3,
      compression: 8,
      distortion: 0.02,
      hardClip: false,
      ceiling: -0.7,
      voiceStyle: 'normal',
      generatorEnabled: false,
      generatorLevel: 0,
      generatorTexture: 0,
      autoLevelEnabled: true,
      autoLevelMax: 4,
      autoLevelTargetDb: -14
    },
    deep: {
      ...DEFAULTS,
      enabled: true,
      preset: 'deep',
      gain: 22,
      clarity: 5.5,
      warmth: 3,
      air: 2,
      compression: 8,
      distortion: 0.015,
      hardClip: false,
      ceiling: -0.8,
      voiceStyle: 'deep',
      generatorEnabled: false,
      generatorLevel: 0,
      generatorTexture: 0,
      autoLevelEnabled: true,
      autoLevelMax: 6,
      autoLevelTargetDb: -12
    },
    generator: {
      ...DEFAULTS,
      enabled: true,
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
      autoLevelEnabled: true,
      autoLevelMax: 3,
      autoLevelTargetDb: -14
    },
    laptop: {
      ...DEFAULTS,
      enabled: true,
      preset: 'laptop',
      gain: 8,
      clarity: 1.5,
      warmth: 0.5,
      air: 1.5,
      compression: 5,
      distortion: 0.03,
      hardClip: false,
      ceiling: -0.5,
      voiceStyle: 'normal',
      generatorEnabled: true,
      generatorLevel: 0.38,
      generatorRate: 52,
      generatorTexture: 0.16,
      autoLevelEnabled: true,
      autoLevelMax: 6,
      autoLevelTargetDb: -9
    },
    max: {
      ...DEFAULTS,
      enabled: true,
      preset: 'max',
      gain: 64,
      clarity: 9,
      warmth: 2,
      air: 5,
      compression: 20,
      distortion: 1,
      hardClip: true,
      ceiling: -0.1,
      voiceStyle: 'deep',
      generatorEnabled: true,
      generatorLevel: 1.35,
      generatorRate: 62,
      generatorTexture: 1,
      autoLevelEnabled: true,
      autoLevelMax: 24,
      autoLevelTargetDb: -6
    },
    attack: {
      ...DEFAULTS,
      enabled: true,
      preset: 'attack',
      gain: 64,
      clarity: 9,
      warmth: 0,
      air: 9,
      compression: 20,
      distortion: 1,
      hardClip: true,
      ceiling: -0.1,
      voiceStyle: 'normal',
      generatorEnabled: true,
      generatorLevel: 1.5,
      generatorRate: 70,
      generatorTexture: 1,
      autoLevelEnabled: true,
      autoLevelMax: 24,
      autoLevelTargetDb: -6
    },
    maxgen: {
      ...DEFAULTS,
      enabled: true,
      preset: 'maxgen',
      gain: 64,
      clarity: 9,
      warmth: 0,
      air: 9,
      compression: 1,
      distortion: 1,
      hardClip: true,
      ceiling: -0.1,
      voiceStyle: 'normal',
      generatorEnabled: true,
      generatorLevel: 1.5,
      generatorRate: 70,
      generatorTexture: 1,
      extraMicEnabled: true,
      extraMicBoost: 2,
      autoLevelEnabled: false,
      autoLevelMax: 24,
      autoLevelTargetDb: -6
    }
  };

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function bool(value, fallback) {
    return value === undefined ? fallback : Boolean(value);
  }

  function normalize(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: bool(value.enabled, DEFAULTS.enabled),
      autoUnmute: bool(value.autoUnmute, DEFAULTS.autoUnmute),
      preset: VALID_PRESETS.includes(value.preset) ? value.preset : DEFAULTS.preset,
      gain: clamp(value.gain, 1, 64, DEFAULTS.gain),
      clarity: clamp(value.clarity, -6, 9, DEFAULTS.clarity),
      warmth: clamp(value.warmth, -6, 6, DEFAULTS.warmth),
      air: clamp(value.air, -6, 9, DEFAULTS.air),
      compression: clamp(value.compression, 1, 20, DEFAULTS.compression),
      distortion: clamp(value.distortion, 0, 1, DEFAULTS.distortion),
      hardClip: bool(value.hardClip, DEFAULTS.hardClip),
      ceiling: clamp(value.ceiling, -3, -0.1, DEFAULTS.ceiling),
      voiceStyle: ['normal', 'deep'].includes(value.voiceStyle) ? value.voiceStyle : DEFAULTS.voiceStyle,
      generatorEnabled: bool(value.generatorEnabled, DEFAULTS.generatorEnabled),
      generatorLevel: clamp(value.generatorLevel, 0, 1.5, DEFAULTS.generatorLevel),
      generatorRate: clamp(value.generatorRate, 32, 90, DEFAULTS.generatorRate),
      generatorTexture: clamp(value.generatorTexture, 0, 1, DEFAULTS.generatorTexture),
      extraMicEnabled: bool(value.extraMicEnabled, DEFAULTS.extraMicEnabled),
      extraMicBoost: clamp(value.extraMicBoost, 1, 4, DEFAULTS.extraMicBoost),
      extraMicFxLevel: clamp(value.extraMicFxLevel, 0, 1, DEFAULTS.extraMicFxLevel),
      badMicVoiceFilterEnabled: bool(value.badMicVoiceFilterEnabled, DEFAULTS.badMicVoiceFilterEnabled),
      badMicBands: DEFAULT_BAD_MIC_BANDS.map((fallback, index) => {
        const band = Array.isArray(value.badMicBands) && value.badMicBands[index] && typeof value.badMicBands[index] === 'object'
          ? value.badMicBands[index]
          : {};
        return {
          enabled: bool(band.enabled, fallback.enabled),
          frequency: clamp(band.frequency, 20, 10000, fallback.frequency),
          gain: clamp(band.gain, -5, 5, fallback.gain),
          q: clamp(band.q, 0.1, 4, fallback.q)
        };
      }),
      autoLevelEnabled: bool(value.autoLevelEnabled, DEFAULTS.autoLevelEnabled),
      autoLevelMax: clamp(value.autoLevelMax, 1, 24, DEFAULTS.autoLevelMax),
      autoLevelTargetDb: clamp(value.autoLevelTargetDb, -24, -6, DEFAULTS.autoLevelTargetDb)
    };
  }

  const exported = Object.freeze({
    STORAGE_KEY,
    DRAWER_WIDTH_KEY,
    EXTENSION_CHANNEL,
    PAGE_CHANNEL,
    DEFAULTS,
    PRESETS,
    clamp,
    normalize
  });

  Object.defineProperty(globalThis, CONFIG_KEY, {
    value: exported,
    enumerable: false,
    configurable: true
  });
})();
