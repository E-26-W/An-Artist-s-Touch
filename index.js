/**
 * An Artist's Touch — Shared JavaScript Foundation
 *
 * Sections:
 *   1. Translation dictionary
 *   2. Language system  (AAT)
 *   3. Mobile navigation  (AATNav)
 *   4. Scroll-aware navigation bar  (AATScrollNav)
 *   5. Theme system  (AATTheme)
 *   6. Language toggle wiring
 *   7. Theme toggle wiring
 *   8. Navigation targets (named browsing contexts)
 *   9. Cross-window settings sync
 *  10. Init
 */

'use strict';

/* ============================================================
   1. Translation dictionary
   ============================================================
   Keys map to data-i18n / data-i18n-aria / data-i18n-title
   attribute values used in the HTML.

   Only shared interface labels live here.
   Page-specific translations are merged in via AAT.extend()
   so each page can add its own keys without touching this file.
   ============================================================ */

const TRANSLATIONS = {
  ar: {
    /* Navigation */
    'nav.home':     'الرئيسية',
    'nav.about':    'عن الفنان',
    'nav.artworks': 'الأعمال',
    'nav.gallery':  'المعرض',
    'nav.journey':  'المسيرة',
    'nav.contact':  'تواصل معي',

    /* Language toggle — shows the language the user can switch TO */
    'lang.switch':  'English',

    /* Mobile nav aria-label — reflects the current open/closed state */
    'nav.open':  'فتح قائمة التنقل',
    'nav.close': 'إغلاق قائمة التنقل',

    /* Footer */
    'footer.rights':          'جميع الحقوق محفوظة',

    /* Footer — social media */
    'footer.social.label':    'تابعني على',
    'footer.social.facebook': 'فيسبوك',
    'footer.social.whatsapp': 'واتساب',
    'footer.social.instagram':'إنستغرام',
    'footer.social.threads':  'ثريدز',

    /* Theme toggle */
    'theme.switch.dark':  'التبديل إلى الوضع الداكن',
    'theme.switch.light': 'التبديل إلى الوضع الفاتح',
  },

  en: {
    /* Navigation */
    'nav.home':     'Home',
    'nav.about':    'About',
    'nav.artworks': 'Artworks',
    'nav.gallery':  'Gallery',
    'nav.journey':  'Journey',
    'nav.contact':  'Contact',

    /* Language toggle — shows the language the user can switch TO */
    'lang.switch':  'العربية',

    /* Mobile nav aria-label — reflects the current open/closed state */
    'nav.open':  'Open navigation menu',
    'nav.close': 'Close navigation menu',

    /* Footer */
    'footer.rights':          'All rights reserved',

    /* Footer — social media */
    'footer.social.label':    'Follow me on',
    'footer.social.facebook': 'Facebook',
    'footer.social.whatsapp': 'WhatsApp',
    'footer.social.instagram':'Instagram',
    'footer.social.threads':  'Threads',

    /* Theme toggle */
    'theme.switch.dark':  'Switch to dark mode',
    'theme.switch.light': 'Switch to light mode',
  },
};


/* ============================================================
   2. Language system
   ============================================================ */

const AAT = (() => {
  const STORAGE_KEY  = 'aat-lang';
  const VALID_LANGS  = ['ar', 'en'];
  const DEFAULT_LANG = 'ar';

  /** Internal merged dictionary (base + page extensions). */
  const _dict = {
    ar: { ...TRANSLATIONS.ar },
    en: { ...TRANSLATIONS.en },
  };

  /**
   * Retrieve a translated string.
   * Falls back to the key itself so missing keys are visible
   * during development without throwing.
   *
   * @param {string} key
   * @param {string} [lang] — defaults to the current document language
   * @returns {string}
   */
  function t(key, lang) {
    const l = lang || _currentLang();
    return (_dict[l] && _dict[l][key]) ?? key;
  }

  /**
   * Merge additional translation keys into the dictionary,
   * then reapply translations to the DOM if it is already ready.
   * Safe to call before DOMContentLoaded — the DOM reapplication
   * is skipped when document.body does not yet exist.
   *
   * @param {{ ar?: Record<string,string>, en?: Record<string,string> }} additions
   */
  function extend(additions) {
    if (additions.ar) Object.assign(_dict.ar, additions.ar);
    if (additions.en) Object.assign(_dict.en, additions.en);

    // Only touch the DOM if it is already available.
    if (document.body) {
      applyTranslations(_currentLang());
    }
  }

  /** Read the active language directly from the document. */
  function _currentLang() {
    return document.documentElement.getAttribute('lang') || DEFAULT_LANG;
  }

  /**
   * Walk the DOM and update every element that carries a
   * data-i18n, data-i18n-aria, or data-i18n-title attribute.
   *
   * @param {string} lang
   */
  function applyTranslations(lang) {
    // text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key   = el.getAttribute('data-i18n');
      const value = t(key, lang);
      if (value !== key) el.textContent = value;
    });

    // aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key   = el.getAttribute('data-i18n-aria');
      const value = t(key, lang);
      if (value !== key) el.setAttribute('aria-label', value);
    });

    // title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key   = el.getAttribute('data-i18n-title');
      const value = t(key, lang);
      if (value !== key) el.setAttribute('title', value);
    });
  }

  /**
   * Update ALL language toggle buttons' visible text and aria-label
   * to show the language the user can switch TO.
   * Uses querySelectorAll so both the mobile and desktop buttons
   * are updated simultaneously.
   * Safe to call even when no toggle is present on the page.
   *
   * @param {string} lang — the language now active
   */
  function _updateLangToggle(lang) {
    const label = t('lang.switch', lang);
    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.textContent = label;
      btn.setAttribute('aria-label', label);
    });
  }

  /**
   * Apply a language: update <html> attributes, translate the
   * DOM, synchronise accessibility labels, and persist the choice.
   *
   * @param {string} lang
   */
  function setLang(lang) {
    if (!VALID_LANGS.includes(lang)) {
      console.warn(
        `AAT: unknown language "${lang}", falling back to "${DEFAULT_LANG}"`
      );
      lang = DEFAULT_LANG;
    }

    const html = document.documentElement;
    html.setAttribute('lang',      lang);
    html.setAttribute('dir',       lang === 'ar' ? 'rtl' : 'ltr');
    html.setAttribute('data-lang', lang);

    // Translate all data-i18n* elements first …
    applyTranslations(lang);

    // … then sync the toggle label (needs the new lang value).
    _updateLangToggle(lang);

    // Notify AATNav so its hamburger aria-label stays correct.
    AATNav.syncAriaLabel();

    // Re-sync theme-toggle labels: applyTranslations() above resets
    // data-i18n-aria elements to the literal key, so the theme
    // button must be corrected to match the active theme again.
    AATTheme.syncLabels();

    // Persist — silent if localStorage is unavailable.
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) { /* private-browsing fallback */ }
  }

  /**
   * Toggle between Arabic and English.
   * Intended as the click handler for `.lang-toggle`.
   */
  function toggleLang() {
    const next = _currentLang() === 'ar' ? 'en' : 'ar';
    setLang(next);
  }

  /**
   * Restore the saved language on page load, or fall back to Arabic.
   * Call once after DOMContentLoaded.
   */
  function init() {
    let saved = DEFAULT_LANG;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_LANGS.includes(stored)) saved = stored;
    } catch (_) { /* ignore — use default */ }
    setLang(saved);
  }

  return { t, extend, setLang, toggleLang, init };
})();


/* ============================================================
   3. Mobile navigation
   ============================================================ */

const AATNav = (() => {
  let _hamburger = null;
  let _navLinks  = null;
  let _backdrop  = null;

  /**
   * Update the hamburger's aria-label to match the current
   * open/closed state and the active language.
   */
  function syncAriaLabel() {
    if (!_hamburger || !_navLinks) return;
    const isOpen = _navLinks.classList.contains('is-open');
    _hamburger.setAttribute(
      'aria-label',
      AAT.t(isOpen ? 'nav.close' : 'nav.open')
    );
  }

  /** Open the mobile menu. */
  function open() {
    _navLinks.classList.add('is-open');
    _hamburger.setAttribute('aria-expanded', 'true');
    if (_backdrop) _backdrop.classList.add('is-open');
    syncAriaLabel();

    requestAnimationFrame(() => {
      const firstLink = _navLinks.querySelector('a, button');
      if (firstLink) firstLink.focus();
    });
  }

  /** Close the mobile menu. */
  function close() {
    _navLinks.classList.remove('is-open');
    _hamburger.setAttribute('aria-expanded', 'false');
    if (_backdrop) _backdrop.classList.remove('is-open');
    syncAriaLabel();
  }

  function _closeAndRefocus() {
    close();
    _hamburger.focus();
  }

  function _onHamburgerClick() {
    const isOpen = _navLinks.classList.contains('is-open');
    isOpen ? close() : open();
  }

  function _onNavLinkClick(e) {
    if (e.target.closest('a')) close();
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape' && _navLinks.classList.contains('is-open')) {
      _closeAndRefocus();
    }
  }

  function _onResize() {
    if (window.innerWidth > 768 && _navLinks.classList.contains('is-open')) {
      close();
    }
  }

  function init() {
    _hamburger = document.querySelector('.nav-hamburger');
    _navLinks  = document.querySelector('.nav-links');
    _backdrop  = document.querySelector('.nav-backdrop');

    if (!_hamburger || !_navLinks) return;

    _hamburger.addEventListener('click', _onHamburgerClick);
    _navLinks.addEventListener('click', _onNavLinkClick);
    if (_backdrop) _backdrop.addEventListener('click', close);
    document.addEventListener('keydown', _onKeyDown);
    window.addEventListener('resize', _onResize);

    syncAriaLabel();
  }

  return { init, open, close, syncAriaLabel };
})();


/* ============================================================
   4. Scroll-aware navigation bar
   Adds / removes `.scrolled` on `.site-nav` so the CSS can
   apply a shadow once the user scrolls down.
   ============================================================ */

const AATScrollNav = (() => {
  const THRESHOLD = 8; // px before the shadow appears

  function _update() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > THRESHOLD);
  }

  function init() {
    window.addEventListener('scroll', _update, { passive: true });
    _update(); // correct initial state if page is loaded mid-scroll
  }

  return { init };
})();


/* ============================================================
   5. Theme system
   Saves/restores the user's light/dark preference in
   localStorage under the key 'aat-theme'.
   Applies the theme by setting data-theme on <html>.
   ============================================================ */

const AATTheme = (() => {
  const STORAGE_KEY = 'aat-theme';
  const VALID_THEMES = ['light', 'dark'];
  const DEFAULT_THEME = 'light';

  function _currentTheme() {
    return document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
  }

  /**
   * Update every theme-toggle button's accessible label to match
   * the current theme and active language.
   *
   * Called after a theme change and after a language change —
   * language change re-runs applyTranslations(), which resets
   * data-i18n-aria labels to the attribute's literal key, so this
   * restores the correct label for the actually active theme.
   */
  function syncLabels() {
    const theme = _currentTheme();
    const labelKey = theme === 'dark' ? 'theme.switch.light' : 'theme.switch.dark';
    const label = AAT.t(labelKey);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.setAttribute('aria-label', label);
    });
  }

  /**
   * Apply a theme: set data-theme on <html>, update all toggle
   * buttons' accessible labels, and persist the choice.
   */
  function setTheme(theme) {
    if (!VALID_THEMES.includes(theme)) theme = DEFAULT_THEME;

    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    syncLabels();

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) { /* ignore */ }
  }

  function toggleTheme() {
    const next = _currentTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  /**
   * Restore the saved theme on page load.
   * Must be called early — before DOMContentLoaded if possible —
   * to prevent a flash of wrong theme.
   */
  function init() {
    let saved = DEFAULT_THEME;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_THEMES.includes(stored)) saved = stored;
    } catch (_) { /* ignore */ }
    setTheme(saved);
  }

  return { init, setTheme, toggleTheme, syncLabels };
})();


/* ============================================================
   6. Language toggle wiring
   ============================================================ */

function _initLangToggle() {
  document.querySelectorAll('.lang-toggle').forEach(function (btn) {
    btn.addEventListener('click', AAT.toggleLang);
  });
}


/* ============================================================
   7. Theme toggle wiring
   ============================================================ */

function _initThemeToggle() {
  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', AATTheme.toggleTheme);
  });
}


/* ============================================================
   8. Navigation targets (named browsing contexts)
   ----------------------------------------------------------
   Architecture:
     - index.html   lives in the browsing context named "AATMain".
     - every internal page lives in "AATSecondary".
   Each page's <head> inline script sets window.name accordingly
   (so a link whose target equals the current window navigates
   in place). Here we assign the stable `target` attribute to
   every internal link based solely on its destination:
     - destination index.html  -> target="AATMain"
     - destination internal pg -> target="AATSecondary"
   External links (social) keep their own targets. Because this
   is native target navigation triggered by a user click, it is
   not subject to popup blockers. If JavaScript is unavailable,
   no targets are set and links navigate normally in the same tab.
   ============================================================ */

const AAT_MAIN_TARGET = 'AATMain';
const AAT_SEC_TARGET  = 'AATSecondary';
const AAT_INTERNAL_PAGES = [
  'about.html', 'artworks.html', 'gallery.html', 'journey.html', 'contact.html',
];

function _initNavTargets() {
  document.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    // Skip external links — they keep their own targets (e.g. _blank).
    if (/^(https?:|mailto:|tel:)/i.test(href)) return;
    // Skip pure anchors.
    if (href.charAt(0) === '#') return;

    if (href === 'index.html' || href === './' || href === '/' ) {
      a.setAttribute('target', AAT_MAIN_TARGET);
    } else if (AAT_INTERNAL_PAGES.indexOf(href) !== -1) {
      a.setAttribute('target', AAT_SEC_TARGET);
    }
  });
}


/* ============================================================
   9. Cross-window settings sync
   ----------------------------------------------------------
   AATMain and AATSecondary are separate browsing contexts that
   share the same origin, so they share localStorage. The
   `storage` event fires in the *other* context when one
   changes a value, letting both stay consistent without a
   reload. No loop is possible: the event does not fire in the
   context that made the change.
   ============================================================ */

function _initStorageSync() {
  window.addEventListener('storage', function (e) {
    if (e.key === 'aat-lang') {
      if (e.newValue === 'ar' || e.newValue === 'en') AAT.setLang(e.newValue);
    } else if (e.key === 'aat-theme') {
      if (e.newValue === 'light' || e.newValue === 'dark') AATTheme.setTheme(e.newValue);
    }
  });
}


/* ============================================================
   10. Init
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  AAT.init();          // language system (also calls AATNav.syncAriaLabel + AATTheme.syncLabels)
  AATTheme.init();     // restore saved theme + sync button labels
  AATNav.init();       // mobile hamburger
  AATScrollNav.init(); // nav bar shadow on scroll
  _initLangToggle();   // attach language toggle click handlers
  _initThemeToggle();  // attach theme toggle click handlers
  _initNavTargets();   // assign stable named targets to internal links
  _initStorageSync();  // keep AATMain/AATSecondary in sync
});
