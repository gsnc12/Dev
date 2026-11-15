(() => {
  'use strict';

  if (window.__devXGodWpDrawerInstalled) return;
  window.__devXGodWpDrawerInstalled = true;

  const config = globalThis.__DEV_X_GOD_WP_CONFIG__;
  const styles = globalThis.__DEV_X_GOD_WP_STYLES__;
  const ui = globalThis.__DEV_X_GOD_WP_UI__;

  const DEFAULT_WIDTH_VW = 50;
  const COMPACT_WIDTH_VW = 36;
  const MIN_WIDTH_VW = 32;
  const MAX_WIDTH_VW = 78;

  let hostEl = null;
  let shadowRoot = null;
  let shellEl = null;
  let controller = null;
  let isOpen = false;
  let widthVw = DEFAULT_WIDTH_VW;

  function clampWidthVw(value) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.min(MAX_WIDTH_VW, Math.max(MIN_WIDTH_VW, num)) : DEFAULT_WIDTH_VW;
  }

  function applyWidth(vw, widthBtnEl = null) {
    widthVw = clampWidthVw(vw);
    if (shellEl) {
      shellEl.style.setProperty('--drawer-width', `clamp(420px, ${widthVw.toFixed(1)}vw, 960px)`);
    }
    const btn = widthBtnEl || (shadowRoot ? shadowRoot.getElementById('drawerWidthToggle') : null);
    if (btn) {
      btn.textContent = `${Math.round(widthVw)}%`;
    }
  }

  function saveWidth(vw) {
    try {
      chrome.storage.local.set({ [config.DRAWER_WIDTH_KEY]: clampWidthVw(vw) }).catch(() => {});
    } catch (_) {}
  }

  function stopKeyLeakage(event) {
    event.stopPropagation();
  }

  function bindResizeHandle(handle) {
    if (!handle || !shellEl) return;
    let dragging = false;

    const onPointerMove = (event) => {
      if (!dragging) return;
      const viewportWidth = Math.max(window.innerWidth || 1280, 480);
      const nextPx = viewportWidth - event.clientX;
      const nextVw = clampWidthVw((nextPx / viewportWidth) * 100);
      applyWidth(nextVw);
    };

    const finishDrag = () => {
      if (!dragging) return;
      dragging = false;
      shellEl.classList.remove('resizing');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
      saveWidth(widthVw);
    };

    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      dragging = true;
      shellEl.classList.add('resizing');
      try { handle.setPointerCapture?.(event.pointerId); } catch (_) {}
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    });

    handle.addEventListener('dblclick', () => {
      applyWidth(DEFAULT_WIDTH_VW);
      saveWidth(DEFAULT_WIDTH_VW);
    });
  }

  function ensureMounted() {
    if (hostEl && shellEl) return true;
    const parent = document.documentElement || document.body;
    if (!parent) return false;

    hostEl = document.createElement('div');
    hostEl.id = 'dev-x-god-wp-laptop-drawer';
    hostEl.setAttribute('data-devxgodwp-drawer', 'true');
    if (hostEl.style) {
      hostEl.style.cssText = 'all:initial!important;position:fixed!important;top:0!important;right:0!important;bottom:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important;';
    }

    // Keep keyboard shortcuts inside the studio from leaking into WhatsApp Web.
    hostEl.addEventListener('keydown', stopKeyLeakage);
    hostEl.addEventListener('keyup', stopKeyLeakage);
    hostEl.addEventListener('keypress', stopKeyLeakage);

    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = `${styles.DRAWER_HOST_CSS}\n${styles.STUDIO_UI_CSS}`;

    shellEl = document.createElement('aside');
    shellEl.className = 'drawer-shell';
    shellEl.setAttribute('role', 'complementary');
    shellEl.setAttribute('aria-label', 'DEV X GOD WP Laptop Voice Studio');
    shellEl.setAttribute('aria-hidden', 'true');

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'drawer-resize-handle';
    resizeHandle.title = 'Drag to resize width · Double-click for 50% half-screen';

    const mountEl = document.createElement('div');
    mountEl.className = 'drawer-mount';
    mountEl.innerHTML = ui.buildStudioMarkup({ showWidthToggle: true });

    shellEl.appendChild(resizeHandle);
    shellEl.appendChild(mountEl);
    shadowRoot.appendChild(styleEl);
    shadowRoot.appendChild(shellEl);
    parent.appendChild(hostEl);

    applyWidth(widthVw);
    bindResizeHandle(resizeHandle);

    controller = ui.bindStudioController(shadowRoot, {
      onClose: () => closeDrawer(),
      onWidthToggle: (btn) => {
        const nextVw = widthVw >= 45 ? COMPACT_WIDTH_VW : DEFAULT_WIDTH_VW;
        applyWidth(nextVw, btn);
        saveWidth(nextVw);
      }
    });

    try {
      chrome.storage.local.get(config.DRAWER_WIDTH_KEY).then((res) => {
        if (res && res[config.DRAWER_WIDTH_KEY] !== undefined) {
          applyWidth(res[config.DRAWER_WIDTH_KEY]);
        }
      }).catch(() => {});
    } catch (_) {}

    return true;
  }

  function openDrawer() {
    const wasMounted = Boolean(hostEl && shellEl);
    if (!ensureMounted()) return false;
    isOpen = true;
    shellEl.setAttribute('aria-hidden', 'false');

    if (!wasMounted && typeof shellEl.getBoundingClientRect === 'function') {
      // Flush initial off-screen transform so the slide-in transition runs smoothly on first open.
      shellEl.getBoundingClientRect();
    }
    shellEl.classList.add('open');
    return true;
  }

  function closeDrawer() {
    isOpen = false;
    if (controller) controller.flushSave();
    if (shellEl) {
      shellEl.classList.remove('open');
      shellEl.setAttribute('aria-hidden', 'true');
    }
    return true;
  }

  function toggleDrawer() {
    return isOpen ? closeDrawer() : openDrawer();
  }

  globalThis.__DEV_X_GOD_WP_ON_AUTO_UNMUTE__ = (detail) => {
    if (controller) controller.flashAutoUnmute(detail?.count || 1);
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'TOGGLE_DRAWER') {
      toggleDrawer();
      sendResponse({ ok: true, open: isOpen });
      return false;
    }
    if (message?.type === 'OPEN_DRAWER') {
      openDrawer();
      sendResponse({ ok: true, open: isOpen });
      return false;
    }
    if (message?.type === 'CLOSE_DRAWER') {
      closeDrawer();
      sendResponse({ ok: true, open: isOpen });
      return false;
    }
    if (message?.type === 'GET_DRAWER_STATE') {
      sendResponse({ ok: true, open: isOpen, widthVw });
      return false;
    }
    return false;
  });

  // Pre-warm the hidden Shadow DOM drawer once WhatsApp Web's DOM is ready
  // so clicking the extension icon opens immediately with zero construction delay.
  function prewarm() {
    if (hostEl) return;
    ensureMounted();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(prewarm, { timeout: 600 });
      } else {
        window.setTimeout(prewarm, 120);
      }
    }, { once: true });
  } else {
    window.setTimeout(prewarm, 50);
  }
})();
