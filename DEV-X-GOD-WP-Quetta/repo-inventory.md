# Target and Source

This is **DEV X GOD WP — Laptop Studio v2.0.0**, a Manifest V3 Chromium extension scoped to `https://web.whatsapp.com/*`.

- `background.js` — Toggles the instant, pre-warmed half-screen Shadow DOM drawer on WhatsApp Web tabs (with automatic script injection fallback on already-open tabs) and toggles a persistent half-screen standalone window outside WhatsApp Web.
- `shared/config.js`, `shared/styles.js`, `shared/ui.js` — Single source of truth for defaults/presets, adaptive `@container`-query styles, and the interactive studio controller (including the one-click **Auto-Unmute Mic** checkbox).
- `content/bridge.js` & `content/drawer.js` — ISOLATED-world config relay and GPU-smooth persistent right-docked half-screen drawer with drag-resize handle.
- `content/main-world.js` — MAIN-world `getUserMedia` WebAudio DSP graph, ceiling-accurate output clipper, user-gesture `AudioContext` recovery, and track + call-UI **Auto-Unmute** guard.
- `popup.html`, `popup.css`, `popup.js` — Standalone persistent window shell sharing the same studio UI.
- `icons/` — `16`, `32`, `48`, and `128` px PNG toolbar/extension icons.
- `tests/` — Browser-free Node tests (`mock-dsp.js`, `mock-popup.js`, `mock-bridge.js`, `mock-drawer.js`).
