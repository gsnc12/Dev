(() => {
  'use strict';

  const styles = globalThis.__DEV_X_GOD_WP_STYLES__;
  const ui = globalThis.__DEV_X_GOD_WP_UI__;

  const mount = document.getElementById('studioMount');
  if (!mount || !styles || !ui) return;

  const styleEl = document.createElement('style');
  styleEl.textContent = styles.STUDIO_UI_CSS;
  document.head.appendChild(styleEl);

  mount.innerHTML = ui.buildStudioMarkup({ showWidthToggle: false });

  let closing = false;
  function closeWindowSmoothly() {
    if (closing) return;
    closing = true;
    mount.classList.remove('ready');
    mount.classList.add('closing');
    window.setTimeout(() => {
      try {
        chrome.runtime.sendMessage({ type: 'CLOSE_STUDIO_WINDOW' }).catch(() => {});
      } catch (_) {}
      try { window.close(); } catch (_) {}
    }, 125);
  }

  const controller = ui.bindStudioController(document, {
    onClose: closeWindowSmoothly
  });

  window.addEventListener('pagehide', () => {
    controller.flushSave();
  });

  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => mount.classList.add('ready'));
  } else {
    mount.classList.add('ready');
  }
})();
