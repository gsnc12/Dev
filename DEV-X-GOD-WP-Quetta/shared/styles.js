(() => {
  'use strict';

  const STYLES_KEY = '__DEV_X_GOD_WP_STYLES__';
  if (globalThis[STYLES_KEY]) return;

  const DRAWER_HOST_CSS = `
:host {
  all: initial;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2147483647;
  pointer-events: none;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.drawer-shell {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--drawer-width, clamp(480px, 50vw, 920px));
  max-width: 96vw;
  min-width: min(380px, 96vw);
  display: flex;
  flex-direction: column;
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
  transform: translate3d(100%, 0, 0);
  will-change: transform, opacity;
  contain: layout style paint;
  background: #080a11;
  border-left: 1px solid rgba(130, 165, 255, 0.24);
  box-shadow: -18px 0 48px rgba(0, 0, 0, 0.58), -1px 0 0 rgba(86, 244, 228, 0.14);
  transition:
    transform 180ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 140ms ease-in,
    visibility 0s linear 180ms;
}
.drawer-shell.open {
  pointer-events: auto;
  visibility: visible;
  opacity: 1;
  transform: translate3d(0, 0, 0);
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease-out,
    visibility 0s linear 0s;
}
.drawer-shell.resizing {
  transition: none !important;
  user-select: none;
}
.drawer-resize-handle {
  position: absolute;
  top: 0;
  left: -5px;
  bottom: 0;
  width: 11px;
  z-index: 20;
  cursor: ew-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}
.drawer-resize-handle::after {
  content: "";
  width: 3px;
  height: 44px;
  border-radius: 99px;
  background: rgba(125, 139, 255, 0.32);
  transition: background 140ms ease, height 140ms ease, box-shadow 140ms ease;
}
.drawer-resize-handle:hover::after,
.drawer-shell.resizing .drawer-resize-handle::after {
  height: 76px;
  background: #56f4e4;
  box-shadow: 0 0 12px rgba(86, 244, 228, 0.55);
}
.drawer-mount {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
@media (prefers-reduced-motion: reduce) {
  .drawer-shell,
  .drawer-shell.open {
    transition-duration: 1ms !important;
  }
}
`;

  const STUDIO_UI_CSS = `
*, *::before, *::after { box-sizing: border-box; }
:host, .studio-root {
  color-scheme: dark;
  --bg: #080a11;
  --panel: #10131d;
  --line: rgba(174, 191, 255, 0.14);
  --muted: #8d94aa;
  --text: #f2f4ff;
  --cyan: #56f4e4;
  --blue: #7d8bff;
  --red: #ff5479;
  --gold: #ffca72;
  --green: #4be8a8;
}
.studio-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--text);
  background:
    radial-gradient(ellipse at 8% 0, rgba(47, 90, 255, 0.22), transparent 34%),
    radial-gradient(ellipse at 100% 18%, rgba(199, 43, 94, 0.14), transparent 30%),
    linear-gradient(155deg, #070910, #0b0d17 55%, #090b12);
  font: 12.5px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
button, input, select { font: inherit; }

/* Sticky top header bar so power + close are always one click away */
.studio-topbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 18px;
  background: linear-gradient(180deg, rgba(13, 16, 28, 0.98), rgba(10, 12, 22, 0.94));
  border-bottom: 1px solid rgba(174, 191, 255, 0.14);
  backdrop-filter: blur(10px);
}
.brand-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  color: #9afff4;
  background: linear-gradient(145deg, #21347a, #21113d 65%, #17101f);
  border: 1px solid rgba(109, 224, 255, 0.35);
  border-radius: 13px;
  box-shadow: 0 0 22px rgba(82, 123, 255, 0.18), inset 0 0 14px rgba(68, 220, 255, 0.1);
}
.brand-icon svg { width: 28px; height: 28px; }
.brand-copy { min-width: 0; flex: 1; }
.brand-kicker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 2px;
  color: #91b6ff;
  font-size: 8.5px;
  font-weight: 900;
  letter-spacing: 0.15em;
}
.scope-tag {
  padding: 2px 6px;
  color: #adfff4;
  background: rgba(23, 173, 156, 0.14);
  border: 1px solid rgba(86, 244, 228, 0.28);
  border-radius: 99px;
  font-size: 7.5px;
  letter-spacing: 0.1em;
}
.pin-tag {
  padding: 2px 6px;
  color: #c8d3ff;
  background: rgba(125, 139, 255, 0.13);
  border: 1px solid rgba(125, 139, 255, 0.28);
  border-radius: 99px;
  font-size: 7.5px;
  letter-spacing: 0.08em;
}
.studio-topbar h1 {
  margin: 0;
  color: #f9faff;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.04em;
}
.studio-topbar h1 i { color: var(--cyan); font-style: normal; font-size: 17px; }
.studio-topbar h1 em { margin-left: 2px; color: #ff7294; font-size: 12px; font-style: normal; letter-spacing: 0.14em; }
.brand-sub { margin: 3px 0 0; color: #8e96b2; font-size: 8.5px; font-weight: 700; letter-spacing: 0.09em; }

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}
.width-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 9px;
  color: #b7c2e2;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(174, 191, 255, 0.18);
  border-radius: 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
}
.width-btn:hover {
  color: #ffffff;
  border-color: rgba(86, 244, 228, 0.5);
  background: rgba(86, 244, 228, 0.1);
}
.close-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #cfd6ef;
  background: rgba(255, 84, 121, 0.1);
  border: 1px solid rgba(255, 84, 121, 0.3);
  border-radius: 9px;
  font-size: 18px;
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
  transition: transform 140ms ease, background 140ms ease, border-color 140ms ease, color 140ms ease;
}
.close-btn:hover {
  color: #fff;
  background: rgba(255, 84, 121, 0.24);
  border-color: rgba(255, 84, 121, 0.65);
  transform: scale(1.04);
}
.close-btn:active { transform: scale(0.95); }

.power-switch {
  position: relative;
  display: inline-flex;
  width: 46px;
  height: 26px;
  flex: 0 0 46px;
  cursor: pointer;
}
.power-switch input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.power-track {
  width: 46px;
  height: 26px;
  border: 1px solid rgba(179, 188, 225, 0.24);
  border-radius: 99px;
  background: #252838;
  transition: 180ms ease;
}
.power-track::after {
  position: absolute;
  top: 5px;
  left: 5px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #9ca2b7;
  content: "";
  transition: 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.power-switch input:checked + .power-track {
  border-color: #55e9db;
  background: #11635f;
  box-shadow: 0 0 14px rgba(86, 244, 228, 0.25);
}
.power-switch input:checked + .power-track::after {
  left: 25px;
  background: #e6fffb;
  box-shadow: 0 0 8px rgba(219, 255, 250, 0.6);
}
.power-switch input:focus-visible + .power-track {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}

/* Scrollable body with container queries for responsive half-screen laptop layout */
.studio-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  container-type: inline-size;
  scrollbar-color: #414772 #0b0d16;
  scrollbar-width: thin;
}
.studio-scroll::-webkit-scrollbar { width: 7px; }
.studio-scroll::-webkit-scrollbar-track { background: #0a0c15; }
.studio-scroll::-webkit-scrollbar-thumb { background: #363c63; border-radius: 99px; }
.studio-scroll::-webkit-scrollbar-thumb:hover { background: #4d568d; }

.app {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 14px 18px 20px;
}

.status-panel,
.autounmute-panel,
.profile-panel,
.controls-panel {
  border: 1px solid var(--line);
  border-radius: 15px;
  background: linear-gradient(145deg, rgba(17, 20, 32, 0.98), rgba(12, 14, 24, 0.98));
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
}

.status-panel {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 14px;
  margin-bottom: 10px;
}
.pulse {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  border-radius: 50%;
  background: #777d91;
}
.pulse.on { background: var(--cyan); box-shadow: 0 0 10px rgba(86, 244, 228, 0.78); }
.status-panel.on { border-color: rgba(86, 244, 228, 0.34); }
.status-panel.extreme { border-color: rgba(255, 84, 121, 0.6); box-shadow: 0 0 18px rgba(255, 84, 121, 0.1); }
.status-copy { min-width: 0; flex: 1; }
.status-copy strong { display: block; color: #f4f6ff; font-size: 11px; font-weight: 900; letter-spacing: 0.08em; }
.status-copy p { margin: 2px 0 0; color: #9ba2b7; font-size: 9.5px; }
.status-badge {
  padding: 4px 7px;
  color: #84fff0;
  background: rgba(40, 189, 172, 0.11);
  border: 1px solid rgba(86, 244, 228, 0.22);
  border-radius: 6px;
  font-size: 7.5px;
  font-weight: 900;
  letter-spacing: 0.11em;
  white-space: nowrap;
}

/* Dedicated Auto-Unmute quick tick/untick card */
.autounmute-panel {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 14px;
  margin-bottom: 11px;
  border-color: rgba(86, 244, 228, 0.2);
  background:
    radial-gradient(ellipse at 100% 0, rgba(75, 232, 168, 0.12), transparent 45%),
    linear-gradient(145deg, rgba(16, 24, 34, 0.98), rgba(11, 14, 24, 0.98));
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.autounmute-panel:hover { border-color: rgba(86, 244, 228, 0.45); }
.autounmute-panel.armed {
  border-color: rgba(75, 232, 168, 0.62);
  box-shadow: 0 0 18px rgba(75, 232, 168, 0.14);
}
.autounmute-panel.triggered {
  border-color: #56f4e4;
  box-shadow: 0 0 22px rgba(86, 244, 228, 0.34);
}
.autounmute-panel input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.autounmute-check {
  width: 19px;
  height: 19px;
  flex: 0 0 19px;
  border: 1.5px solid #596388;
  border-radius: 6px;
  background: #0a0d16;
  display: grid;
  place-items: center;
  transition: 150ms ease;
}
.autounmute-panel input:checked + .autounmute-check {
  border-color: #4be8a8;
  background: linear-gradient(145deg, #4be8a8, #147a63);
  box-shadow: 0 0 10px rgba(75, 232, 168, 0.35);
}
.autounmute-panel input:checked + .autounmute-check::after {
  content: "";
  width: 9px;
  height: 5px;
  margin-bottom: 2px;
  border-bottom: 2.2px solid #042118;
  border-left: 2.2px solid #042118;
  transform: rotate(-45deg);
}
.autounmute-panel input:focus-visible + .autounmute-check {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}
.autounmute-copy { min-width: 0; flex: 1; }
.autounmute-copy b {
  display: block;
  color: #eefbf7;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
}
.autounmute-copy small {
  display: block;
  margin-top: 2px;
  color: #93a3b8;
  font-size: 8.5px;
  line-height: 1.35;
}
.autounmute-pill {
  padding: 4px 8px;
  border-radius: 99px;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.09em;
  white-space: nowrap;
  color: #8f98b5;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(174, 191, 255, 0.16);
  transition: 160ms ease;
}
.autounmute-panel.armed .autounmute-pill {
  color: #b7ffdf;
  background: rgba(25, 168, 122, 0.2);
  border-color: rgba(75, 232, 168, 0.48);
}
.autounmute-panel.triggered .autounmute-pill {
  color: #03221c;
  background: #56f4e4;
  border-color: #9cfff4;
}

.profile-panel, .controls-panel { padding: 14px; margin-bottom: 11px; }
.profile-panel {
  background:
    radial-gradient(ellipse at 100% 0, rgba(76, 90, 223, 0.1), transparent 44%),
    linear-gradient(145deg, rgba(18, 21, 35, 0.98), rgba(12, 14, 24, 0.98));
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.section-tag { margin: 0 0 2px; color: #8a9fff; font-size: 8.5px; font-weight: 900; letter-spacing: 0.15em; }
.panel-head h2 { margin: 0; color: #eef0fb; font-size: 14.5px; letter-spacing: -0.02em; }
.head-code {
  padding: 3px 7px;
  color: #9aa4c9;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(174, 191, 255, 0.12);
  border-radius: 5px;
  font-size: 7.5px;
  font-weight: 800;
  letter-spacing: 0.11em;
}

.profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.profile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 56px;
  padding: 8px 10px;
  overflow: hidden;
  text-align: left;
  color: #c1c6d8;
  background: #0b0d16;
  border: 1px solid rgba(174, 191, 255, 0.13);
  border-radius: 11px;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, transform 150ms ease, color 150ms ease;
}
.profile:hover { border-color: rgba(125, 139, 255, 0.5); color: #fff; transform: translateY(-1px); }
.profile.selected {
  border-color: rgba(95, 164, 255, 0.68);
  background: linear-gradient(125deg, rgba(49, 74, 158, 0.34), rgba(21, 25, 44, 0.92));
  box-shadow: inset 0 0 0 1px rgba(103, 162, 255, 0.1), 0 0 14px rgba(86, 116, 255, 0.1);
}
.profile-god.selected {
  border-color: rgba(255, 84, 121, 0.7);
  background: linear-gradient(125deg, rgba(127, 30, 67, 0.42), rgba(28, 17, 30, 0.96));
  box-shadow: inset 0 0 0 1px rgba(255, 84, 121, 0.08), 0 0 16px rgba(255, 62, 110, 0.12);
}
.profile-deep.selected {
  border-color: rgba(110, 237, 216, 0.6);
  background: linear-gradient(125deg, rgba(21, 95, 95, 0.34), rgba(17, 25, 38, 0.95));
}
.profile-generator.selected {
  border-color: rgba(255, 202, 114, 0.68);
  background: linear-gradient(125deg, rgba(115, 72, 28, 0.36), rgba(28, 24, 27, 0.96));
}
.profile-attack.selected {
  border-color: rgba(255, 122, 76, 0.8);
  background: linear-gradient(125deg, rgba(132, 47, 34, 0.42), rgba(30, 19, 24, 0.96));
  box-shadow: 0 0 16px rgba(255, 94, 72, 0.14);
}
.profile-maxgen.selected {
  border-color: rgba(255, 87, 97, 0.86);
  background: linear-gradient(125deg, rgba(125, 28, 54, 0.48), rgba(34, 16, 25, 0.98));
  box-shadow: 0 0 18px rgba(255, 60, 87, 0.18);
}
.profile-laptop.selected {
  border-color: rgba(255, 202, 114, 0.8);
  background: linear-gradient(125deg, rgba(120, 77, 34, 0.42), rgba(30, 23, 24, 0.97));
  box-shadow: 0 0 16px rgba(255, 202, 114, 0.14);
}
.profile-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 8px;
  color: #d7dcf0;
  background: #292d42;
  font-size: 9.5px;
  font-weight: 900;
}
.icon-natural { color: #b4eed1; background: #24453a; }
.icon-boost { color: #b8c7ff; background: #303a6e; }
.icon-hifi { color: #bdfaff; background: #185a65; font-size: 8.5px; }
.icon-deep { color: #a8fff0; background: #18544f; font-size: 8.5px; }
.icon-generator { color: #ffe1a4; background: #614724; font-size: 8px; }
.icon-laptop { color: #ffe2aa; background: #60451e; font-size: 8.5px; }
.icon-attack { width: 32px; flex-basis: 32px; color: #ffe0c8; background: #70311e; font-size: 7.5px; }
.icon-maxgen { width: 32px; flex-basis: 32px; color: #ffdfe0; background: #70223c; font-size: 7.5px; }
.icon-god { width: 32px; flex-basis: 32px; color: #ffd7df; background: #67233e; font-size: 7.5px; }
.profile-copy { min-width: 0; flex: 1; }
.profile-copy b { display: block; color: #e8eafb; font-size: 9.8px; font-weight: 900; letter-spacing: 0.015em; }
.profile-copy small { display: block; margin-top: 2px; color: #8b93ab; font-size: 8px; }
.profile-light { position: absolute; top: 8px; right: 8px; width: 5px; height: 5px; border-radius: 50%; background: #33384c; }
.profile.selected .profile-light { background: #7ca9ff; box-shadow: 0 0 7px #7ca9ff; }
.profile-god.selected .profile-light { background: #ff6687; box-shadow: 0 0 7px #ff6687; }
.profile-deep.selected .profile-light { background: #66eed7; box-shadow: 0 0 7px #66eed7; }
.profile-generator.selected .profile-light { background: #ffca72; box-shadow: 0 0 7px #ffca72; }
.profile-laptop.selected .profile-light { background: #ffd071; box-shadow: 0 0 7px #ffd071; }
.profile-attack.selected .profile-light { background: #ff8766; box-shadow: 0 0 7px #ff8766; }
.profile-maxgen.selected .profile-light { background: #ff6376; box-shadow: 0 0 7px #ff6376; }
.profile-note { margin: 9px 2px 0; color: #959cb3; font-size: 8.8px; line-height: 1.4; }

.slider-field { min-width: 0; padding: 9px 0 8px; border-top: 1px solid rgba(174, 191, 255, 0.08); }
.slider-head { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.slider-head label { color: #cfd4e7; font-size: 8.8px; font-weight: 900; letter-spacing: 0.08em; }
.slider-head output {
  color: #77f0e2;
  font-size: 9.2px;
  font-weight: 800;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.slider-field input[type="range"],
.bad-mic-range {
  display: block;
  width: 100%;
  height: 18px;
  margin: 4px 0 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}
.slider-field input[type="range"]::-webkit-slider-runnable-track,
.bad-mic-range::-webkit-slider-runnable-track {
  height: 5px;
  border-radius: 99px;
  background: linear-gradient(90deg, #333e86, #626bff 45%, #43ddd0 80%, #30374a);
}
.slider-field input[type="range"]::-webkit-slider-thumb,
.bad-mic-range::-webkit-slider-thumb {
  width: 15px;
  height: 15px;
  margin-top: -5px;
  appearance: none;
  border: 2px solid #e7f6ff;
  border-radius: 50%;
  background: #7d8bff;
  box-shadow: 0 0 0 3px rgba(113, 132, 255, 0.16);
  transition: transform 100ms ease;
}
.slider-field input[type="range"]::-webkit-slider-thumb:hover,
.bad-mic-range::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}
.slider-field input[type="range"]::-moz-range-track,
.bad-mic-range::-moz-range-track {
  height: 5px;
  border-radius: 99px;
  background: linear-gradient(90deg, #333e86, #626bff 45%, #43ddd0 80%, #30374a);
}
.slider-field input[type="range"]::-moz-range-thumb,
.bad-mic-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 2px solid #e7f6ff;
  border-radius: 50%;
  background: #7d8bff;
}
.range-meta { display: flex; justify-content: space-between; gap: 6px; color: #7b849f; font-size: 8px; }
.field-help { margin: 3px 0 0; color: #868fa8; font-size: 8px; line-height: 1.38; }
.control-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 14px; }

.clip-toggle {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 0;
  border-top: 1px solid rgba(174, 191, 255, 0.08);
  cursor: pointer;
}
.clip-toggle input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.clip-box {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  border: 1px solid #515875;
  border-radius: 4px;
  background: #0a0c14;
}
.clip-toggle input:checked + .clip-box {
  border-color: #ff6687;
  background: linear-gradient(145deg, #ff6e88, #9c294b);
  box-shadow: 0 0 9px rgba(255, 76, 116, 0.25);
}
.clip-toggle input:checked + .clip-box::after {
  display: block;
  width: 8px;
  height: 4px;
  margin: 4px 0 0 3px;
  border-bottom: 2px solid #fff;
  border-left: 2px solid #fff;
  content: "";
  transform: rotate(-45deg);
}
.clip-toggle input:focus-visible + .clip-box { outline: 2px solid #ff7995; outline-offset: 2px; }
.clip-copy { min-width: 0; flex: 1; }
.clip-copy b { display: block; color: #e8eafb; font-size: 8.8px; font-weight: 900; letter-spacing: 0.08em; }
.clip-copy small { display: block; margin-top: 2px; color: #8c95ae; font-size: 8px; }
.clip-alert {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  color: #ff9aac;
  background: rgba(255, 84, 121, 0.12);
  border: 1px solid rgba(255, 84, 121, 0.3);
  border-radius: 50%;
  font-size: 10px;
  font-weight: 900;
}
.ceiling-field { padding-bottom: 2px; }
.slider-field.wide { grid-column: 1 / -1; }

.voice-style-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid rgba(174, 191, 255, 0.08);
}
.voice-style-field b { display: block; color: #cfd4e7; font-size: 8.8px; letter-spacing: 0.08em; }
.voice-style-field small { display: block; margin-top: 2px; color: #868fa8; font-size: 8px; }
.voice-style-field select {
  min-width: 145px;
  padding: 7px 10px;
  color: #e9ecff;
  background: #121625;
  border: 1px solid rgba(125, 139, 255, 0.3);
  border-radius: 8px;
  font-size: 10px;
  cursor: pointer;
}

.extra-mic-toggle { border-top: 1px solid rgba(255, 122, 76, 0.14); }
.extra-mic-alert { color: #ffe0cf; background: rgba(194, 83, 47, 0.14); border-color: rgba(255, 122, 76, 0.28); }
.auto-lift-toggle { border-top: 1px solid rgba(86, 244, 228, 0.12); }
.auto-alert { color: #c9fff7; background: rgba(40, 189, 172, 0.12); border-color: rgba(86, 244, 228, 0.25); }

.bad-mic-panel {
  padding: 14px;
  margin: 8px 0 9px;
  border: 1px solid rgba(106, 224, 197, 0.2);
  border-radius: 14px;
  background:
    radial-gradient(ellipse at 100% 0, rgba(42, 153, 139, 0.11), transparent 45%),
    linear-gradient(145deg, rgba(17, 23, 31, 0.98), rgba(12, 14, 24, 0.98));
}
.bad-mic-panel .section-tag { color: #83e8d2; }
.bad-mic-voice-toggle { border-top-color: rgba(86, 244, 228, 0.12); }
.bad-mic-alert { color: #cafff4; background: rgba(40, 189, 172, 0.12); border-color: rgba(86, 244, 228, 0.26); font-size: 7.5px; }
.bad-mic-eq-heading { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; }
.bad-mic-eq-heading b { color: #e8f8f5; font-size: 8.8px; font-weight: 900; letter-spacing: 0.1em; }
.bad-mic-eq-heading small { color: #8998a5; font-size: 8px; }
.bad-mic-eq-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.bad-mic-band {
  min-width: 0;
  padding: 9px 9px 8px;
  overflow: hidden;
  border: 1px solid rgba(174, 191, 255, 0.11);
  border-radius: 10px;
  background: rgba(7, 10, 17, 0.74);
}
.bad-mic-band-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
.bad-mic-band-toggle { position: relative; display: flex; align-items: center; gap: 6px; min-width: 0; cursor: pointer; }
.bad-mic-band-toggle input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.bad-mic-checkbox {
  display: block;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  border: 1px solid #515875;
  border-radius: 4px;
  background: #0a0c14;
}
.bad-mic-band-toggle input:checked + .bad-mic-checkbox {
  border-color: #61d9c5;
  background: linear-gradient(145deg, #52ddc6, #177b77);
  box-shadow: 0 0 8px rgba(86, 244, 228, 0.22);
}
.bad-mic-band-toggle input:checked + .bad-mic-checkbox::after {
  display: block;
  width: 7px;
  height: 3.5px;
  margin: 3.5px 0 0 2.5px;
  border-bottom: 2px solid #fff;
  border-left: 2px solid #fff;
  content: "";
  transform: rotate(-45deg);
}
.bad-mic-band-toggle input:focus-visible + .bad-mic-checkbox { outline: 2px solid var(--cyan); outline-offset: 2px; }
.bad-mic-band-name {
  display: block;
  min-width: 0;
  color: #cfd4e7;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.bad-mic-band-name small { display: block; margin-top: 1px; color: #929bb2; font-size: 8px; font-weight: 600; letter-spacing: 0; }
.bad-mic-band-head output,
.bad-mic-tuning-control output {
  color: #77f0e2;
  font-size: 8.5px;
  font-weight: 800;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.bad-mic-band .range-meta { font-size: 7.5px; }
.bad-mic-tuning { margin-top: 5px; border-top: 1px solid rgba(174, 191, 255, 0.08); }
.bad-mic-tuning summary { padding-top: 5px; color: #9ca8c0; font-size: 7.5px; font-weight: 800; letter-spacing: 0.04em; cursor: pointer; }
.bad-mic-tuning-grid { display: grid; grid-template-columns: 1fr; gap: 4px; padding-top: 4px; }
.bad-mic-tuning-control { min-width: 0; padding: 3px 0; }
.bad-mic-tuning-control .slider-head label { font-size: 7.5px; }
.bad-mic-tuning-control .range-meta { font-size: 7px; }
.bad-mic-note { margin: 8px 2px 0; color: #8a94a7; font-size: 8px; line-height: 1.4; }

.generator-panel {
  padding: 14px;
  margin-bottom: 11px;
  border: 1px solid rgba(255, 202, 114, 0.2);
  border-radius: 15px;
  background:
    radial-gradient(ellipse at 100% 0, rgba(181, 105, 35, 0.13), transparent 45%),
    linear-gradient(145deg, rgba(24, 22, 30, 0.98), rgba(13, 14, 23, 0.98));
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
}
.generator-panel .section-tag { color: #e4b86e; }
.generator-toggle { border-top: 1px solid rgba(255, 202, 114, 0.12); }
.generator-alert { color: #fff0ca; background: rgba(177, 117, 43, 0.17); border-color: rgba(255, 202, 114, 0.32); }
.generator-controls .wide { grid-column: 1 / -1; }
.generator-note { margin: 7px 2px 0; color: #b9a989; font-size: 8.2px; line-height: 1.4; }

.warning-panel {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px 11px;
  margin-bottom: 9px;
  color: #e2c1c8;
  background: rgba(124, 31, 60, 0.14);
  border: 1px solid rgba(255, 84, 121, 0.2);
  border-left: 2.5px solid #ff5479;
  border-radius: 0 9px 9px 0;
}
.warning-panel p { margin: 0; font-size: 8.5px; line-height: 1.45; }
.warning-panel strong { color: #ff9daf; }
.warning-mark {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  color: #ffe8ed;
  background: #a82e51;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 900;
}
.footer {
  padding: 4px 2px 6px;
  color: #7c86a3;
  font-size: 8px;
  text-align: center;
  letter-spacing: 0.03em;
}
.privacy-light { color: #56f4e4; font-size: 7.5px; }

/* Laptop half-screen adaptive layout driven by actual panel width (@container) */
@container (min-width: 540px) {
  .app { padding: 16px 20px 22px; }
  .profile-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
  .profile { min-height: 60px; padding: 9px 10px; }
  .controls-panel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 18px;
    align-items: start;
  }
  .controls-panel > .panel-head,
  .controls-panel > .gain-field,
  .controls-panel > .extra-mic-toggle,
  .controls-panel > .auto-lift-toggle,
  .controls-panel > .auto-lift-grid,
  .controls-panel > .control-grid:not(.auto-lift-grid),
  .controls-panel > .voice-style-field,
  .controls-panel > .bad-mic-panel,
  .controls-panel > .ceiling-field {
    grid-column: 1 / -1;
  }
  .controls-panel > .extra-mic-field,
  .controls-panel > .extra-mic-fx-field { grid-column: span 1; }
  .controls-panel > .distortion-field { grid-column: 1; }
  .controls-panel > .clip-toggle:not(.extra-mic-toggle):not(.auto-lift-toggle) { grid-column: 2; }
  .control-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 15px; }
  .auto-lift-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .generator-controls { grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 18px; }
  .generator-controls .wide { grid-column: auto; }
  .bad-mic-eq-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
  .bad-mic-tuning-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; }
}
`;

  Object.defineProperty(globalThis, STYLES_KEY, {
    value: Object.freeze({ DRAWER_HOST_CSS, STUDIO_UI_CSS }),
    enumerable: false,
    configurable: true
  });
})();
