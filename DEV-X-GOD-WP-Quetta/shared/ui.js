(() => {
  'use strict';

  const UI_KEY = '__DEV_X_GOD_WP_UI__';
  if (globalThis[UI_KEY]) return;

  const BAND_CENTERS = [90, 350, 800, 2000, 7000, 10000];

  function buildBandCardsHtml() {
    return BAND_CENTERS.map((freq, index) => `
      <article class="bad-mic-band" aria-label="Equalizer band ${index + 1}">
        <div class="bad-mic-band-head">
          <label class="bad-mic-band-toggle" for="badMicBandEnabled${index}">
            <input id="badMicBandEnabled${index}" type="checkbox" aria-label="Enable ${freq} hertz EQ band">
            <span class="bad-mic-checkbox" aria-hidden="true"></span>
            <span class="bad-mic-band-name">BAND ${index + 1} <small id="badMicBandFrequencyTitle${index}">${freq} Hz</small></span>
          </label>
          <output id="badMicBandGainValue${index}" for="badMicBandGain${index}">0.0 dB</output>
        </div>
        <input class="bad-mic-range bad-mic-gain" id="badMicBandGain${index}" type="range" min="-5" max="5" step="0.1" value="0" aria-label="Band ${index + 1} level">
        <div class="range-meta"><span>−5 dB</span><span>+5 dB</span></div>
        <details class="bad-mic-tuning">
          <summary>Center frequency / Q</summary>
          <div class="bad-mic-tuning-grid">
            <div class="bad-mic-tuning-control">
              <div class="slider-head"><label for="badMicBandFrequency${index}">CENTER</label><output id="badMicBandFrequencyValue${index}" for="badMicBandFrequency${index}">${freq} Hz</output></div>
              <input class="bad-mic-range" id="badMicBandFrequency${index}" type="range" min="20" max="10000" step="5" value="${freq}" aria-label="Band ${index + 1} center frequency">
              <div class="range-meta"><span>20 Hz</span><span>10 kHz</span></div>
            </div>
            <div class="bad-mic-tuning-control">
              <div class="slider-head"><label for="badMicBandQ${index}">Q WIDTH</label><output id="badMicBandQValue${index}" for="badMicBandQ${index}">0.8</output></div>
              <input class="bad-mic-range" id="badMicBandQ${index}" type="range" min="0.1" max="4" step="0.1" value="0.8" aria-label="Band ${index + 1} Q">
              <div class="range-meta"><span>Wide</span><span>Narrow</span></div>
            </div>
          </div>
        </details>
      </article>
    `).join('');
  }

  function buildStudioMarkup({ showWidthToggle = false } = {}) {
    return `
      <div class="studio-root">
        <header class="studio-topbar">
          <div class="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none"><path d="M18 23.3a5.2 5.2 0 0 0 5.2-5.2V9.8a5.2 5.2 0 1 0-10.4 0v8.3a5.2 5.2 0 0 0 5.2 5.2Z" stroke="currentColor" stroke-width="2"/><path d="M10.2 17.2v.7a7.8 7.8 0 0 0 15.6 0v-.7M18 25.8v4.8m-4.8 0h9.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3.4 17.8h3.1m23 0h3.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </div>
          <div class="brand-copy">
            <p class="brand-kicker">WHATSAPP VOICE LAB <span class="scope-tag">LAPTOP STUDIO</span> <span class="pin-tag">STAYS OPEN</span></p>
            <h1>DEV <i>×</i> GOD <em>WP</em></h1>
            <p class="brand-sub">HALF-SCREEN LIVE CONSOLE · AUTO-UNMUTE · LOCAL AUDIO</p>
          </div>
          <div class="topbar-actions">
            ${showWidthToggle ? '<button type="button" class="width-btn" id="drawerWidthToggle" title="Switch between Half-Screen (50%) and Compact width">50%</button>' : ''}
            <label class="power-switch" title="Enable outgoing microphone processing">
              <input id="enabled" type="checkbox" aria-label="Enable mic processing">
              <span class="power-track"></span>
            </label>
            <button type="button" class="close-btn" id="closePanelBtn" aria-label="Close panel" title="Close panel (or click extension icon)">×</button>
          </div>
        </header>

        <div class="studio-scroll">
          <main class="app">
            <section class="status-panel" id="statusCard" aria-live="polite">
              <span class="pulse" id="liveDot" aria-hidden="true"></span>
              <div class="status-copy">
                <strong id="statusTitle">MIC ENGINE OFF</strong>
                <p id="statusSubtitle">Pick a profile or flip the power switch to activate outgoing voice processing.</p>
              </div>
              <span class="status-badge">LOCAL DSP</span>
            </section>

            <label class="autounmute-panel" id="autoUnmuteCard" for="autoUnmute">
              <input id="autoUnmute" type="checkbox" aria-label="Auto unmute microphone when muted">
              <span class="autounmute-check" aria-hidden="true"></span>
              <span class="autounmute-copy">
                <b>AUTO-UNMUTE MIC</b>
                <small>Tick to automatically unmute your WhatsApp Web mic whenever it is found muted during a call. Works even if DSP effects are off.</small>
              </span>
              <span class="autounmute-pill" id="autoUnmuteBadge">OFF</span>
            </label>

            <section class="profile-panel">
              <div class="panel-head"><div><p class="section-tag">01 / VOICE PROFILES</p><h2>Choose your power</h2></div><span class="head-code">9 MODES</span></div>
              <div class="profile-grid" role="group" aria-label="Voice profiles">
                <button class="profile" type="button" data-preset="natural"><span class="profile-icon icon-natural">N</span><span class="profile-copy"><b>Natural</b><small>original tone</small></span><span class="profile-light"></span></button>
                <button class="profile" type="button" data-preset="boost"><span class="profile-icon icon-boost">B</span><span class="profile-copy"><b>Boost</b><small>call clarity</small></span><span class="profile-light"></span></button>
                <button class="profile profile-hifi" type="button" data-preset="hifi"><span class="profile-icon icon-hifi">HD</span><span class="profile-copy"><b>Hi-Fi Max</b><small>loud + clean</small></span><span class="profile-light"></span></button>
                <button class="profile profile-deep" type="button" data-preset="deep"><span class="profile-icon icon-deep">D+</span><span class="profile-copy"><b>Crystal Deep</b><small>full + clear EQ</small></span><span class="profile-light"></span></button>
                <button class="profile profile-generator" type="button" data-preset="generator"><span class="profile-icon icon-generator">MIX</span><span class="profile-copy"><b>VOICE + GEN</b><small>balanced voice blend</small></span><span class="profile-light"></span></button>
                <button class="profile profile-laptop" type="button" data-preset="laptop"><span class="profile-icon icon-laptop">PC</span><span class="profile-copy"><b>LAPTOP LOUD</b><small>strong voice + gen</small></span><span class="profile-light"></span></button>
                <button class="profile profile-god" type="button" data-preset="max"><span class="profile-icon icon-god">MAX</span><span class="profile-copy"><b>GOD MODE</b><small>hard clip + GHRRR</small></span><span class="profile-light"></span></button>
                <button class="profile profile-attack" type="button" data-preset="attack"><span class="profile-icon icon-attack">ATK</span><span class="profile-copy"><b>ATTACK MIC</b><small>loud / ripped edge</small></span><span class="profile-light"></span></button>
                <button class="profile profile-maxgen" type="button" data-preset="maxgen"><span class="profile-icon icon-maxgen">MG</span><span class="profile-copy"><b>MAX GENERATOR</b><small>hard clip + fixed gain</small></span><span class="profile-light"></span></button>
              </div>
              <p class="profile-note" id="profileNote">VOICE + GEN adds a restrained motor tone under your voice with shared peak control.</p>
            </section>

            <section class="controls-panel">
              <div class="panel-head"><div><p class="section-tag">02 / LIVE DSP</p><h2>Mic power controls</h2></div><span class="head-code">LIVE</span></div>

              <div class="slider-field gain-field">
                <div class="slider-head"><label for="gain">FIXED MIC GAIN</label><output id="gainValue" for="gain">4.0× · +12.0 dB</output></div>
                <input id="gain" type="range" min="1" max="64" step="0.1" value="4">
                <div class="range-meta"><span>1×</span><span>64× / +36.1 dB</span></div>
                <p class="field-help">Fixed gain after compression. Past full scale, more mainly adds clipping—not guaranteed caller volume.</p>
              </div>

              <label class="clip-toggle extra-mic-toggle" for="extraMicEnabled"><input id="extraMicEnabled" type="checkbox"><span class="clip-box" aria-hidden="true"></span><span class="clip-copy"><b>FIXED POST-LIFT GAIN</b><small>Simple 1×–4× gain stage. The Extra Mic-style echo control is separate below; MAX GENERATOR uses 2×.</small></span><span class="clip-alert extra-mic-alert">+</span></label>
              <div class="slider-field extra-mic-field"><div class="slider-head"><label for="extraMicBoost">POST-LIFT GAIN</label><output id="extraMicBoostValue" for="extraMicBoost">1.5×</output></div><input id="extraMicBoost" type="range" min="1" max="4" step="0.1" value="1.5"><div class="range-meta"><span>1×</span><span>4× fixed</span></div><p class="field-help">Fixed gain only—full-scale clipping may increase; far-end volume is not guaranteed.</p></div>
              <div class="slider-field extra-mic-fx-field"><div class="slider-head"><label for="extraMicFxLevel">EXTRA MIC MULTI-TAP FX</label><output id="extraMicFxLevelValue" for="extraMicFxLevel">0%</output></div><input id="extraMicFxLevel" type="range" min="0" max="100" step="1" value="0"><div class="range-meta"><span>Off</span><span>Strong repeats</span></div><p class="field-help">Best-effort 19-tap echo, about 171 ms to 3.24 s. High levels may mask words.</p></div>

              <label class="clip-toggle auto-lift-toggle" for="autoLevelEnabled"><input id="autoLevelEnabled" type="checkbox"><span class="clip-box" aria-hidden="true"></span><span class="clip-copy"><b>AUTO-LIFT QUIET MIC</b><small>Raises quieter mic audio toward a target; also raises room noise.</small></span><span class="clip-alert auto-alert">↑</span></label>
              <div class="control-grid auto-lift-grid">
                <div class="slider-field"><div class="slider-head"><label for="autoLevelMax">EXTRA LIFT CAP</label><output id="autoLevelMaxValue" for="autoLevelMax">3× extra</output></div><input id="autoLevelMax" type="range" min="1" max="24" step="0.5" value="3"><div class="range-meta"><span>1×</span><span>24× extra</span></div></div>
                <div class="slider-field"><div class="slider-head"><label for="autoLevelTargetDb">MIC RMS TARGET</label><output id="autoLevelTargetDbValue" for="autoLevelTargetDb">−14 dBFS</output></div><input id="autoLevelTargetDb" type="range" min="-24" max="-6" step="1" value="-14"><div class="range-meta"><span>More headroom</span><span>Louder</span></div><p class="field-help">RMS target before clipping/limiting, not far-end level. Higher target also lifts noise.</p></div>
              </div>

              <div class="control-grid">
                <div class="slider-field">
                  <div class="slider-head"><label for="clarity">VOICE EDGE</label><output id="clarityValue" for="clarity">+1.5 dB</output></div>
                  <input id="clarity" type="range" min="-6" max="9" step="0.5" value="1.5">
                  <div class="range-meta"><span>Soft</span><span>Cutting</span></div>
                </div>
                <div class="slider-field">
                  <div class="slider-head"><label for="air">AIR / TREBLE</label><output id="airValue" for="air">+1.0 dB</output></div>
                  <input id="air" type="range" min="-6" max="9" step="0.5" value="1">
                  <div class="range-meta"><span>Dark</span><span>Bright</span></div>
                </div>
                <div class="slider-field">
                  <div class="slider-head"><label for="warmth">LOW WARMTH</label><output id="warmthValue" for="warmth">+0.5 dB</output></div>
                  <input id="warmth" type="range" min="-6" max="6" step="0.5" value="0.5">
                  <div class="range-meta"><span>Lean</span><span>Warm</span></div>
                </div>
                <div class="slider-field">
                  <div class="slider-head"><label for="compression">COMPRESSION</label><output id="compressionValue" for="compression">4×</output></div>
                  <input id="compression" type="range" min="1" max="20" step="0.5" value="4">
                  <div class="range-meta"><span>Gentle</span><span>MAX</span></div>
                </div>
              </div>

              <label class="voice-style-field" for="voiceStyle"><span><b>VOICE DEPTH</b><small>Deep EQ adds warmth; it does not shift pitch.</small></span><select id="voiceStyle"><option value="normal">Natural</option><option value="deep">Deep / warm</option></select></label>

              <section class="bad-mic-panel" aria-label="Bad Mic style voice filter and equalizer">
                <div class="panel-head"><div><p class="section-tag">03 / FILTER + EQ</p><h2>Bad Mic-style shaping</h2></div><span class="head-code">WEB AUDIO</span></div>
                <label class="clip-toggle bad-mic-voice-toggle" for="badMicVoiceFilterEnabled">
                  <input id="badMicVoiceFilterEnabled" type="checkbox">
                  <span class="clip-box" aria-hidden="true"></span>
                  <span class="clip-copy"><b>VOICE FILTER APPROXIMATION</b><small>Observed native setup: 400 Hz high-pass, resonance 0.1 (approximated as WebAudio Q 0.1).</small></span>
                  <span class="clip-alert bad-mic-alert">HP</span>
                </label>
                <div class="bad-mic-eq-heading"><b>6-BAND PARAMETRIC EQ</b><small>Each band is independently switchable. 0 dB/off is neutral.</small></div>
                <div class="bad-mic-eq-grid" role="group" aria-label="Six-band parametric equalizer">
                  ${buildBandCardsHtml()}
                </div>
                <p class="bad-mic-note">Best-effort WebAudio filters—first-run bands are off at 0 dB with centers 90, 350, 800, 2k, 7k, and 10k Hz.</p>
              </section>

              <div class="slider-field distortion-field">
                <div class="slider-head"><label for="distortion">DISTORTION / CRUSH</label><output id="distortionValue" for="distortion">2%</output></div>
                <input id="distortion" type="range" min="0" max="100" step="1" value="2">
                <div class="range-meta"><span>Clean</span><span>Broken voice</span></div>
              </div>

              <label class="clip-toggle" for="hardClip"><input id="hardClip" type="checkbox"><span class="clip-box" aria-hidden="true"></span><span class="clip-copy"><b>HARD CLIP PEAKS</b><small>Full crackle / square-wave edge. Leave off for Hi-Fi.</small></span><span class="clip-alert">!</span></label>

              <div class="slider-field ceiling-field">
                <div class="slider-head"><label for="ceiling">OUTPUT CEILING TARGET</label><output id="ceilingValue" for="ceiling">−1.2 dBFS</output></div>
                <input id="ceiling" type="range" min="-3" max="-0.1" step="0.1" value="-1.2">
                <div class="range-meta"><span>−3 dBFS headroom</span><span>Near full-scale</span></div>
                <p class="field-help">0 dBFS is digital full scale. Final ceiling control caps combined peaks at your selected target.</p>
              </div>
            </section>

            <section class="generator-panel">
              <div class="panel-head"><div><p class="section-tag">04 / VOICE + GENERATOR</p><h2>Blend controls</h2></div><span class="head-code">SYNTH</span></div>
              <label class="clip-toggle generator-toggle" for="generatorEnabled"><input id="generatorEnabled" type="checkbox"><span class="clip-box" aria-hidden="true"></span><span class="clip-copy"><b>ADD GENERATOR TO VOICE MIX</b><small>Soft low harmonics and filtered noise share final peak control with your voice.</small></span><span class="clip-alert generator-alert">~</span></label>
              <div class="control-grid generator-controls">
                <div class="slider-field"><div class="slider-head"><label for="generatorLevel">BLEND LEVEL</label><output id="generatorLevelValue" for="generatorLevel">38%</output></div><input id="generatorLevel" type="range" min="0" max="1.5" step="0.01" value="0.38"><div class="range-meta"><span>Off</span><span>150% max</span></div></div>
                <div class="slider-field"><div class="slider-head"><label for="generatorRate">MOTOR RATE</label><output id="generatorRateValue" for="generatorRate">52 Hz</output></div><input id="generatorRate" type="range" min="32" max="90" step="1" value="52"><div class="range-meta"><span>Low rumble</span><span>Buzz</span></div></div>
                <div class="slider-field wide"><div class="slider-head"><label for="generatorTexture">GRIT / NOISE</label><output id="generatorTextureValue" for="generatorTexture">16%</output></div><input id="generatorTexture" type="range" min="0" max="1" step="0.01" value="0.16"><div class="range-meta"><span>Smooth hum</span><span>Rough GHRRR</span></div></div>
              </div>
              <p class="generator-note">VOICE + GEN starts with a restrained bed. Voice and generator share peak control so speech stays forward.</p>
            </section>

            <section class="warning-panel"><span class="warning-mark">!</span><p><strong>LAPTOP LOUD can lift room noise; GOD MODE / ATTACK MIC / generator are intentionally harsh. Extra Mic FX can add long voice repeats.</strong> Start with VOICE + GEN for clear speech; get consent before loud/distorted modes and lower it if asked.</p></section>
            <footer class="footer"><span class="privacy-light">●</span> DEV X GOD WP Laptop Studio · Stays open until closed · WhatsApp Web only · Local audio</footer>
          </main>
        </div>
      </div>
    `;
  }

  function signedDb(value, suffix = 'dB') {
    const number = Number(value);
    return `${number > 0 ? '+' : ''}${number.toFixed(1)} ${suffix}`;
  }

  function bindStudioController(root, { onClose = null, onWidthToggle = null } = {}) {
    const config = globalThis.__DEV_X_GOD_WP_CONFIG__;
    const { STORAGE_KEY, DEFAULTS, PRESETS, normalize } = config;
    const byId = (id) => (typeof root.getElementById === 'function' ? root.getElementById(id) : root.querySelector(`#${id}`));

    const ids = [
      'enabled', 'autoUnmute', 'gain', 'clarity', 'warmth', 'air', 'compression', 'distortion', 'hardClip', 'ceiling',
      'voiceStyle', 'generatorEnabled', 'generatorLevel', 'generatorRate', 'generatorTexture',
      'extraMicEnabled', 'extraMicBoost', 'extraMicFxLevel', 'badMicVoiceFilterEnabled', 'autoLevelEnabled', 'autoLevelMax', 'autoLevelTargetDb',
      'gainValue', 'clarityValue', 'warmthValue', 'airValue', 'compressionValue', 'distortionValue', 'ceilingValue',
      'generatorLevelValue', 'generatorRateValue', 'generatorTextureValue', 'extraMicBoostValue', 'extraMicFxLevelValue', 'autoLevelMaxValue', 'autoLevelTargetDbValue',
      'statusCard', 'statusTitle', 'statusSubtitle', 'liveDot', 'profileNote',
      'autoUnmuteCard', 'autoUnmuteBadge', 'closePanelBtn', 'drawerWidthToggle'
    ];
    for (let index = 0; index < DEFAULTS.badMicBands.length; index += 1) {
      ids.push(
        `badMicBandEnabled${index}`, `badMicBandGain${index}`, `badMicBandGainValue${index}`,
        `badMicBandFrequency${index}`, `badMicBandFrequencyValue${index}`, `badMicBandFrequencyTitle${index}`,
        `badMicBandQ${index}`, `badMicBandQValue${index}`
      );
    }

    const elements = Object.fromEntries(ids.map((id) => [id, byId(id)]));
    const presetButtons = [...root.querySelectorAll('[data-preset]')];

    let settings = normalize(DEFAULTS);
    let saveTimer = null;
    let unmuteFlashTimer = null;
    let isDraggingSlider = false;

    function render() {
      elements.enabled.checked = settings.enabled;
      elements.autoUnmute.checked = Boolean(settings.autoUnmute);
      elements.hardClip.checked = Boolean(settings.hardClip);
      elements.generatorEnabled.checked = Boolean(settings.generatorEnabled);
      elements.extraMicEnabled.checked = Boolean(settings.extraMicEnabled);
      elements.badMicVoiceFilterEnabled.checked = Boolean(settings.badMicVoiceFilterEnabled);
      elements.autoLevelEnabled.checked = Boolean(settings.autoLevelEnabled);
      elements.voiceStyle.value = settings.voiceStyle;

      if (elements.autoUnmuteCard) {
        elements.autoUnmuteCard.classList.toggle('armed', Boolean(settings.autoUnmute));
      }
      if (elements.autoUnmuteBadge && !unmuteFlashTimer) {
        elements.autoUnmuteBadge.textContent = settings.autoUnmute ? 'ACTIVE' : 'OFF';
      }

      for (let index = 0; index < settings.badMicBands.length; index += 1) {
        const band = settings.badMicBands[index];
        elements[`badMicBandEnabled${index}`].checked = band.enabled;
        elements[`badMicBandGain${index}`].value = String(band.gain);
        elements[`badMicBandGainValue${index}`].textContent = signedDb(band.gain);
        elements[`badMicBandFrequency${index}`].value = String(band.frequency);
        elements[`badMicBandFrequencyValue${index}`].textContent = `${Math.round(band.frequency)} Hz`;
        elements[`badMicBandFrequencyTitle${index}`].textContent = `${Math.round(band.frequency)} Hz`;
        elements[`badMicBandQ${index}`].value = String(band.q);
        elements[`badMicBandQValue${index}`].textContent = Number(band.q).toFixed(1);
      }

      const sliders = [
        'gain', 'clarity', 'warmth', 'air', 'compression', 'distortion', 'ceiling',
        'generatorLevel', 'generatorRate', 'generatorTexture', 'extraMicBoost',
        'extraMicFxLevel', 'autoLevelMax', 'autoLevelTargetDb'
      ];
      for (const key of sliders) {
        const input = elements[key];
        if (!input) continue;
        if (key === 'distortion' || key === 'extraMicFxLevel') input.value = String(Math.round(settings[key] * 100));
        else input.value = String(settings[key]);
      }

      const gainDb = 20 * Math.log10(Math.max(1, Number(settings.gain)));
      elements.gainValue.textContent = `${Number(settings.gain).toFixed(Number(settings.gain) >= 10 ? 0 : 1)}× · ${signedDb(gainDb)}`;
      elements.clarityValue.textContent = signedDb(settings.clarity);
      elements.warmthValue.textContent = signedDb(settings.warmth);
      elements.airValue.textContent = signedDb(settings.air);
      elements.compressionValue.textContent = `${Number(settings.compression).toFixed(Number.isInteger(Number(settings.compression)) ? 0 : 1)}×`;
      elements.distortionValue.textContent = `${Math.round(Number(settings.distortion) * 100)}%`;
      elements.ceilingValue.textContent = `${Number(settings.ceiling).toFixed(1)} dBFS`;
      elements.generatorLevelValue.textContent = `${Math.round(settings.generatorLevel * 100)}%`;
      elements.generatorRateValue.textContent = `${Math.round(settings.generatorRate)} Hz`;
      elements.generatorTextureValue.textContent = `${Math.round(settings.generatorTexture * 100)}%`;
      elements.extraMicBoostValue.textContent = `${Number(settings.extraMicBoost).toFixed(Number.isInteger(Number(settings.extraMicBoost)) ? 0 : 1)}×`;
      elements.extraMicFxLevelValue.textContent = `${Math.round(settings.extraMicFxLevel * 100)}%`;
      elements.autoLevelMaxValue.textContent = `${Number(settings.autoLevelMax).toFixed(Number.isInteger(Number(settings.autoLevelMax)) ? 0 : 1)}× extra`;
      elements.autoLevelTargetDbValue.textContent = `${Number(settings.autoLevelTargetDb).toFixed(0)} dBFS`;

      for (const button of presetButtons) {
        button.classList.toggle('selected', button.dataset.preset === settings.preset);
      }

      const extreme = settings.enabled && (
        settings.preset === 'laptop' ||
        settings.hardClip ||
        settings.gain >= 32 ||
        settings.distortion >= 0.65 ||
        (settings.generatorEnabled && settings.generatorLevel >= 0.7) ||
        (settings.extraMicEnabled && settings.extraMicBoost >= 2) ||
        (settings.autoLevelEnabled && settings.autoLevelMax >= 12)
      );
      elements.statusCard.classList.toggle('on', settings.enabled);
      elements.statusCard.classList.toggle('extreme', extreme);
      elements.liveDot.classList.toggle('on', settings.enabled);

      const names = {
        natural: 'NATURAL',
        boost: 'BOOST',
        hifi: 'HI-FI MAX',
        deep: 'CRYSTAL DEEP',
        generator: 'VOICE + GEN',
        laptop: 'LAPTOP LOUD',
        max: 'DEV X GOD / ULTRA MAX',
        attack: 'ATTACK MIC',
        maxgen: 'MAX GENERATOR'
      };
      elements.statusTitle.textContent = settings.enabled
        ? `${names[settings.preset] || 'CUSTOM STUDIO'} ACTIVE`
        : (settings.autoUnmute ? 'MIC ENGINE OFF · AUTO-UNMUTE ARMED' : 'MIC ENGINE OFF');

      if (!settings.enabled) {
        elements.statusSubtitle.textContent = settings.autoUnmute
          ? 'Voice effects are bypassed, while Auto-Unmute is watching your call mic.'
          : 'Pick any profile or flip the power switch to activate outgoing voice processing.';
      } else if (settings.preset === 'hifi') {
        elements.statusSubtitle.textContent = 'Loud and clear, with low distortion and peak headroom.';
      } else if (settings.preset === 'deep') {
        elements.statusSubtitle.textContent = 'Fuller low tone with presence EQ; this is EQ shaping, not pitch shift.';
      } else if (settings.preset === 'generator') {
        elements.statusSubtitle.textContent = 'Balanced generator tone is mixed under your voice; lower blend if it masks words.';
      } else if (settings.preset === 'laptop') {
        elements.statusSubtitle.textContent = 'Higher laptop voice target + generator mix. Lower gain if room noise or clipping rises.';
      } else if (settings.preset === 'attack') {
        elements.statusSubtitle.textContent = 'Aggressive hard-clip bite + maximum pulsing motor bed. Get consent first.';
      } else if (settings.preset === 'maxgen') {
        elements.statusSubtitle.textContent = 'Fixed post-lift gain; voice compression is off. Generator and voice share final peak control.';
      } else if (extreme) {
        elements.statusSubtitle.textContent = 'ULTRA lift / hard clip / generator bed. Warn the other caller first.';
      } else {
        elements.statusSubtitle.textContent = 'Your outgoing WhatsApp Web mic is being enhanced live.';
      }

      const notes = {
        natural: 'Natural keeps your voice close to the mic’s original tone.',
        boost: 'Boost adds level and presence for everyday calls.',
        hifi: 'Hi-Fi Max aims for a loud, clear voice with low distortion.',
        deep: 'Crystal Deep adds low warmth and clarity EQ; it does not perform true pitch/formant shifting.',
        generator: 'VOICE + GEN uses a restrained low-harmonic bed, softer noise, and shared peak control.',
        laptop: 'LAPTOP LOUD raises the voice target and fixed gain while keeping the generator bed moderate.',
        max: 'ULTRA GOD MODE keeps 64× gain and hard clipping with a boosted pulsing generator bed and up to 24× auto-lift.',
        attack: 'ATTACK MIC adds maximum bed level, brighter mids, hard clipping, and the strongest pulsing motor texture.',
        maxgen: 'Hard clipping + fixed 2× post-lift gain. Auto-lift and voice compression are off; Extra Mic echo stays separate.'
      };
      elements.profileNote.textContent = notes[settings.preset] || 'Manual studio settings are active. Changes apply live in real time.';
    }

    async function persistNow() {
      if (saveTimer) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
      }
      try {
        await chrome.storage.local.set({ [STORAGE_KEY]: settings });
      } catch (_) {
        elements.statusSubtitle.textContent = 'Could not save settings. Check extension storage permissions.';
      }
    }

    function scheduleSave() {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(persistNow, 55);
    }

    function updateBand(index, key, value, immediate = false) {
      const badMicBands = settings.badMicBands.map((band) => ({ ...band }));
      badMicBands[index][key] = value;
      settings = normalize({ ...settings, preset: 'custom', badMicBands });
      render();
      if (immediate) persistNow();
      else scheduleSave();
    }

    function updateFromSliders() {
      settings = normalize({
        ...settings,
        preset: 'custom',
        gain: elements.gain.value,
        clarity: elements.clarity.value,
        warmth: elements.warmth.value,
        air: elements.air.value,
        compression: elements.compression.value,
        distortion: Number(elements.distortion.value) / 100,
        ceiling: elements.ceiling.value,
        generatorLevel: elements.generatorLevel.value,
        generatorRate: elements.generatorRate.value,
        generatorTexture: elements.generatorTexture.value,
        extraMicBoost: elements.extraMicBoost.value,
        extraMicFxLevel: Number(elements.extraMicFxLevel.value) / 100,
        autoLevelMax: elements.autoLevelMax.value,
        autoLevelTargetDb: elements.autoLevelTargetDb.value
      });
      render();
      scheduleSave();
    }

    const sliderElements = [
      elements.gain, elements.clarity, elements.warmth, elements.air, elements.compression,
      elements.distortion, elements.ceiling, elements.generatorLevel, elements.generatorRate,
      elements.generatorTexture, elements.extraMicBoost, elements.extraMicFxLevel,
      elements.autoLevelMax, elements.autoLevelTargetDb
    ];
    const finishSliderDrag = () => {
      if (!isDraggingSlider) return;
      isDraggingSlider = false;
      persistNow();
    };
    for (const input of sliderElements) {
      if (!input) continue;
      input.addEventListener('pointerdown', () => {
        isDraggingSlider = true;
        if (typeof window.addEventListener === 'function') {
          window.addEventListener('pointerup', finishSliderDrag, { once: true });
          window.addEventListener('pointercancel', finishSliderDrag, { once: true });
        }
      });
      input.addEventListener('pointerup', finishSliderDrag);
      input.addEventListener('pointercancel', finishSliderDrag);
      input.addEventListener('blur', finishSliderDrag);
      input.addEventListener('change', finishSliderDrag);
      input.addEventListener('input', updateFromSliders);
    }

    // Immediate save on every discrete checkbox / dropdown / preset button click.
    elements.enabled.addEventListener('change', () => {
      settings = normalize({ ...settings, enabled: elements.enabled.checked });
      render();
      persistNow();
    });
    elements.autoUnmute.addEventListener('change', () => {
      settings = normalize({ ...settings, autoUnmute: elements.autoUnmute.checked });
      if (!settings.autoUnmute && unmuteFlashTimer) {
        window.clearTimeout(unmuteFlashTimer);
        unmuteFlashTimer = null;
        if (elements.autoUnmuteCard) elements.autoUnmuteCard.classList.remove('triggered');
      }
      render();
      persistNow();
    });
    elements.hardClip.addEventListener('change', () => {
      settings = normalize({ ...settings, preset: 'custom', hardClip: elements.hardClip.checked });
      render();
      persistNow();
    });
    elements.generatorEnabled.addEventListener('change', () => {
      settings = normalize({ ...settings, preset: 'custom', generatorEnabled: elements.generatorEnabled.checked });
      render();
      persistNow();
    });
    elements.extraMicEnabled.addEventListener('change', () => {
      settings = normalize({ ...settings, preset: 'custom', extraMicEnabled: elements.extraMicEnabled.checked });
      render();
      persistNow();
    });
    elements.badMicVoiceFilterEnabled.addEventListener('change', () => {
      settings = normalize({ ...settings, preset: 'custom', badMicVoiceFilterEnabled: elements.badMicVoiceFilterEnabled.checked });
      render();
      persistNow();
    });
    elements.autoLevelEnabled.addEventListener('change', () => {
      settings = normalize({ ...settings, preset: 'custom', autoLevelEnabled: elements.autoLevelEnabled.checked });
      render();
      persistNow();
    });
    elements.voiceStyle.addEventListener('change', () => {
      settings = normalize({ ...settings, preset: 'custom', voiceStyle: elements.voiceStyle.value });
      render();
      persistNow();
    });

    for (let index = 0; index < DEFAULTS.badMicBands.length; index += 1) {
      elements[`badMicBandEnabled${index}`].addEventListener('change', () =>
        updateBand(index, 'enabled', elements[`badMicBandEnabled${index}`].checked, true));
      elements[`badMicBandGain${index}`].addEventListener('input', () =>
        updateBand(index, 'gain', elements[`badMicBandGain${index}`].value, false));
      elements[`badMicBandFrequency${index}`].addEventListener('input', () =>
        updateBand(index, 'frequency', elements[`badMicBandFrequency${index}`].value, false));
      elements[`badMicBandQ${index}`].addEventListener('input', () =>
        updateBand(index, 'q', elements[`badMicBandQ${index}`].value, false));
    }

    for (const button of presetButtons) {
      button.addEventListener('click', () => {
        const name = button.dataset.preset;
        if (!PRESETS[name]) return;
        // Preserve the user's Auto-Unmute preference across preset switches.
        settings = normalize({ ...PRESETS[name], autoUnmute: settings.autoUnmute });
        render();
        persistNow();
      });
    }

    if (elements.closePanelBtn && typeof onClose === 'function') {
      elements.closePanelBtn.addEventListener('click', () => {
        if (saveTimer) persistNow();
        onClose();
      });
    }
    if (elements.drawerWidthToggle && typeof onWidthToggle === 'function') {
      elements.drawerWidthToggle.addEventListener('click', () => onWidthToggle(elements.drawerWidthToggle));
    }

    const onStorageChanged = (changes, areaName) => {
      if (areaName === 'local' && changes[STORAGE_KEY]?.newValue && !isDraggingSlider) {
        settings = normalize(changes[STORAGE_KEY].newValue);
        render();
      }
    };
    chrome.storage.onChanged.addListener(onStorageChanged);

    chrome.storage.local.get(STORAGE_KEY)
      .then((result) => {
        settings = normalize(result[STORAGE_KEY] || DEFAULTS);
        render();
      })
      .catch(() => render());

    function flashAutoUnmute(count) {
      if (!elements.autoUnmuteCard || !elements.autoUnmuteBadge || !settings.autoUnmute) return;
      elements.autoUnmuteCard.classList.add('triggered');
      elements.autoUnmuteBadge.textContent = count > 1 ? `UNMUTED ×${count}` : 'UNMUTED ✓';
      if (unmuteFlashTimer) window.clearTimeout(unmuteFlashTimer);
      unmuteFlashTimer = window.setTimeout(() => {
        unmuteFlashTimer = null;
        if (elements.autoUnmuteCard) elements.autoUnmuteCard.classList.remove('triggered');
        if (elements.autoUnmuteBadge) elements.autoUnmuteBadge.textContent = settings.autoUnmute ? 'ACTIVE' : 'OFF';
      }, 2000);
    }

    return {
      render,
      flushSave: persistNow,
      flashAutoUnmute,
      getSettings: () => settings,
      destroy() {
        if (saveTimer) persistNow();
        if (unmuteFlashTimer) window.clearTimeout(unmuteFlashTimer);
        try { chrome.storage.onChanged.removeListener(onStorageChanged); } catch (_) {}
      }
    };
  }

  Object.defineProperty(globalThis, UI_KEY, {
    value: Object.freeze({ buildStudioMarkup, bindStudioController }),
    enumerable: false,
    configurable: true
  });
})();
