// Typography Module
// Handles font-family, font-size, and navbar-zoom settings.
// All settings are disabled by default (master toggle: off).
// Preferences are persisted in localStorage.

// ── Storage keys ────────────────────────────────────────
const KEY_ENABLED       = 'typography-enabled';
const KEY_FONT_FAMILY   = 'typography-font-family';
const KEY_FONT_SIZE     = 'typography-font-size';
const KEY_NAVBAR_ZOOM   = 'typography-navbar-zoom';

// ── Font definitions ─────────────────────────────────────
// `url`: Google Fonts stylesheet URL to inject (null = system/browser-native).
const FONTS = {
  system: {
    css: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
    url: null,
  },
  'google-sans': {
    // Available natively in Chromium-based browsers (used by Google products).
    css: '"Google Sans", "Product Sans", ui-rounded, "Nunito", sans-serif',
    url: null,
  },
  inter: {
    css: '"Inter", sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  },
  'noto-sans': {
    css: '"Noto Sans", sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap',
  },
  'ibm-plex-sans': {
    css: '"IBM Plex Sans", sans-serif',
    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap',
  },
};

// ── Font size options ────────────────────────────────────
const FONT_SIZES = {
  tiny:    '11px',
  small:   '12px',
  default: '13px',
  medium:  '14px',
  large:   '16px',
  xlarge:  '18px',
};

// ── Navbar zoom options ──────────────────────────────────
const NAVBAR_ZOOMS = {
  small:   '0.85',
  default: '1',
  large:   '1.15',
  xlarge:  '1.3',
};

// ── TypographyManager ────────────────────────────────────
export class TypographyManager {
  constructor() {
    /** @type {HTMLLinkElement|null} Injected Google Fonts <link> element */
    this._fontLink = null;

    // Apply saved settings immediately on boot (before UI renders)
    // to avoid a flash of unstyled content.
    this._applyStoredSettings();

    // Wire up the settings UI once the DOM is ready.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._initUI());
    } else {
      this._initUI();
    }
  }

  // ── Private: apply on boot ─────────────────────────────
  _applyStoredSettings() {
    if (localStorage.getItem(KEY_ENABLED) !== 'true') return;
    this._applyFontFamily(localStorage.getItem(KEY_FONT_FAMILY) || 'system');
    this._applyFontSize(localStorage.getItem(KEY_FONT_SIZE)     || 'default');
    this._applyNavbarZoom(localStorage.getItem(KEY_NAVBAR_ZOOM) || 'default');
  }

  // ── Private: CSS variable helpers ─────────────────────
  _applyFontFamily(key) {
    const font = FONTS[key] ?? FONTS.system;
    document.documentElement.style.setProperty('--panel-font-family', font.css);
    if (font.url) {
      this._loadGoogleFont(font.url);
    } else {
      // Remove previously loaded web font when switching back
      this._removeFontLink();
    }
  }

  _applyFontSize(key) {
    const size = FONT_SIZES[key] ?? FONT_SIZES.default;
    document.documentElement.style.setProperty('--panel-font-size', size);
  }

  _applyNavbarZoom(key) {
    const zoom = NAVBAR_ZOOMS[key] ?? NAVBAR_ZOOMS.default;
    document.documentElement.style.setProperty('--toolbar-zoom', zoom);
  }

  // ── Private: reset all overrides ──────────────────────
  _resetAll() {
    document.documentElement.style.removeProperty('--panel-font-family');
    document.documentElement.style.removeProperty('--panel-font-size');
    document.documentElement.style.removeProperty('--toolbar-zoom');
    this._removeFontLink();
  }

  // ── Private: Google Fonts injection ───────────────────
  _loadGoogleFont(url) {
    // Skip if the correct font is already loaded
    if (this._fontLink && this._fontLink.href === url) return;
    this._removeFontLink();

    const link = document.createElement('link');
    link.rel        = 'stylesheet';
    link.href       = url;
    link.dataset.id = 'typography-font';
    document.head.appendChild(link);
    this._fontLink = link;
  }

  _removeFontLink() {
    if (this._fontLink) {
      this._fontLink.remove();
      this._fontLink = null;
    }
  }

  // ── Private: wire-up settings UI ──────────────────────
  _initUI() {
    const masterToggle     = document.getElementById('toggle-typography-enabled');
    const controlsWrapper  = document.getElementById('typography-controls');
    const fontSizeSelect   = document.getElementById('typography-font-size');
    const fontFamilySelect = document.getElementById('typography-font-family');
    const navbarZoomSelect = document.getElementById('typography-navbar-zoom');

    // Nothing to do if the settings page isn't present
    if (!masterToggle || !controlsWrapper) return;

    // ── Restore persisted values ────────────────────────
    const enabled = localStorage.getItem(KEY_ENABLED) === 'true';
    masterToggle.checked           = enabled;
    controlsWrapper.style.display  = enabled ? 'flex' : 'none';

    if (fontSizeSelect)   fontSizeSelect.value   = localStorage.getItem(KEY_FONT_SIZE)   || 'default';
    if (fontFamilySelect) fontFamilySelect.value = localStorage.getItem(KEY_FONT_FAMILY) || 'system';
    if (navbarZoomSelect) navbarZoomSelect.value = localStorage.getItem(KEY_NAVBAR_ZOOM) || 'default';

    // ── Master enable/disable toggle ────────────────────
    masterToggle.addEventListener('change', () => {
      const on = masterToggle.checked;
      localStorage.setItem(KEY_ENABLED, String(on));
      controlsWrapper.style.display = on ? 'flex' : 'none';

      if (on) {
        this._applyStoredSettings();
      } else {
        this._resetAll();
      }
    });

    // ── Individual controls ─────────────────────────────
    fontSizeSelect?.addEventListener('change', () => {
      localStorage.setItem(KEY_FONT_SIZE, fontSizeSelect.value);
      this._applyFontSize(fontSizeSelect.value);
    });

    fontFamilySelect?.addEventListener('change', () => {
      localStorage.setItem(KEY_FONT_FAMILY, fontFamilySelect.value);
      this._applyFontFamily(fontFamilySelect.value);
    });

    navbarZoomSelect?.addEventListener('change', () => {
      localStorage.setItem(KEY_NAVBAR_ZOOM, navbarZoomSelect.value);
      this._applyNavbarZoom(navbarZoomSelect.value);
    });
  }
}
