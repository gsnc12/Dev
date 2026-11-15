# DEV X GOD WP — Laptop Studio (v2.0.0)

A Manifest V3 Chromium extension tailored for **laptop / desktop** use on `https://web.whatsapp.com/*`. Version 2.0.0 upgrades the extension from a narrow auto-closing browser popup into an **instant, GPU-smooth, half-screen persistent studio drawer** with a dedicated **Auto-Unmute Mic** guard.

## What's New in v2.0.0 (Laptop Studio)

- **Instant & Smooth Open / Close:** Clicking the extension icon in Chrome immediately slides open the pre-warmed Shadow DOM drawer on `web.whatsapp.com` (smooth GPU `transform`/`opacity` animation). Clicking the extension icon again (or the `×` close button) smoothly slides it closed.
- **Half-Screen Laptop Width (`50vw`):** Opens comfortably across half of your laptop screen (`clamp(420px, 50vw, 960px)`) with a responsive multi-column console layout (`@container` queries), a quick `50% / 36%` width button, and a draggable left-edge resize handle (double-click to reset to `50%`).
- **Stays Open Until Closed:** Does **not** dismiss when you click WhatsApp Web on the left half of your screen — keep tweaking gain, presets, EQ, generator blend, and Auto-Unmute live throughout your call until you explicitly close it. Clicking the icon outside WhatsApp Web opens/closes a persistent half-screen standalone window.
- **Auto-Unmute Mic (One-Click Tick / Untick):** A dedicated **AUTO-UNMUTE MIC** checkbox at the top of the console automatically unmutes your WhatsApp Web microphone whenever it detects the mic is muted during a call (both at the WebRTC audio track level and by syncing WhatsApp Web's call Unmute button). Preserved across preset switches and works even when DSP effects are turned off.
- **DSP & Reliability Fixes:**
  - Unified `shared/config.js` defaults across UI, bridge, and page audio hook.
  - Fixed final `outputClipper` to enforce the selected `dBFS` ceiling cleanly instead of re-amplifying post-limiter signals.
  - Lazy-started generator oscillators/noise to save laptop CPU when bypassed or unused.
  - Added user-gesture `AudioContext` auto-resume so suspended contexts never silence the mic.
  - Immediate storage persistence on toggles, checkboxes, and presets.
  - Added extension toolbar icons (`16/32/48/128 px`) and live toolbar badge (`ON` / `MIC`).

## Install / Use on Laptop (Chrome / Edge / Brave / Chromium)

1. Remove or disable older DEV X GOD WP / Micx / MANSURI mic extensions so multiple processors do not conflict.
2. Unzip `DEV-X-GOD-WP-Quetta-v1.9.0-extension.zip` to a folder on your laptop (or use the unpacked `DEV-X-GOD-WP-Quetta` folder directly).
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `DEV-X-GOD-WP-Quetta` folder containing `manifest.json`.
4. Open (or reload) `https://web.whatsapp.com/` and pin the **DEV X GOD WP** icon in your toolbar.
5. Click the extension icon once to smoothly open the half-screen Laptop Studio on the right side of WhatsApp Web. Adjust any setting continuously while using WhatsApp Web on the left side. Click the extension icon again (or `×`) whenever you want to close it smoothly.
6. Tick **AUTO-UNMUTE MIC** if you want the extension to automatically unmute your call microphone whenever it becomes muted; untick it anytime to restore normal muting.

## Profiles & Controls

- **Natural / Boost / Hi-Fi Max / Crystal Deep:** Clean to warm everyday and studio voice profiles.
- **VOICE + GEN:** Balanced 4× voice gain with a restrained 38% motor bed and soft noise.
- **LAPTOP LOUD:** Stronger 8× fixed gain, up to 6× auto-lift, −9 dBFS RMS target, and restrained 38% generator blend.
- **GOD MODE / ATTACK MIC / MAX GENERATOR:** Intentionally harsh high-gain / hard-clip / heavy motor-bed modes (get the other caller's consent first).
- **Bad Mic-Style Filter + 6-Band Parametric EQ:** Optional 400 Hz HPF approximation + 6 independently switchable bands (90, 350, 800, 2,000, 7,000, 10,000 Hz).
- **Extra Mic Post-Lift Gain & 19-Tap Multi-Tap Echo FX:** Separate 1×–4× fixed post-lift gain stage and memory-efficient serial 19-tap echo (~171 ms to 3.24 s).

## Privacy & Validation

All audio processing runs locally inside your browser tab. No call audio is recorded, saved, or uploaded. The extension requests only `storage`, `scripting`, and `https://web.whatsapp.com/*` host access.

Run all browser-free tests from inside `DEV-X-GOD-WP-Quetta/`:

```sh
node tests/mock-dsp.js
node tests/mock-popup.js
node tests/mock-bridge.js
node tests/mock-drawer.js
```
