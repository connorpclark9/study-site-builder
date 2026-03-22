/**
 * Navigation bar component for study-site-builder.
 * Fetches nav-config.json and renders a responsive, sticky navigation bar.
 * Uses CSS variables from the active theme for all styling.
 */
(function () {
  'use strict';

  const NAV_CONFIG_PATH = 'data/nav-config.json';
  const BREAKPOINT = 768;
  const EXAM_DROPDOWN_THRESHOLD = 3;

  // ---------------------------------------------------------------------------
  // Styles (uses CSS variables so it works with any theme)
  // ---------------------------------------------------------------------------

  const STYLES = `
    .sb-nav {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: var(--bg-card, #ffffff);
      border-bottom: 1px solid var(--border, #e0e0e0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      font-family: inherit;
    }

    .sb-nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      height: 56px;
    }

    .sb-nav-brand {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--accent, #4f46e5);
      text-decoration: none;
      white-space: nowrap;
    }

    .sb-nav-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .sb-nav-links a {
      display: block;
      padding: 0.45rem 0.85rem;
      color: var(--text, #1a1a1a);
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.92rem;
      transition: background 0.15s, color 0.15s;
    }

    .sb-nav-links a:hover {
      background: var(--bg, #f5f5f5);
    }

    .sb-nav-links a.sb-active {
      color: var(--accent, #4f46e5);
      background: color-mix(in srgb, var(--accent, #4f46e5) 10%, transparent);
      font-weight: 600;
    }

    /* Dropdown */
    .sb-nav-dropdown {
      position: relative;
    }

    .sb-nav-dropdown-toggle {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      cursor: pointer;
      padding: 0.45rem 0.85rem;
      color: var(--text, #1a1a1a);
      border: none;
      background: none;
      font: inherit;
      font-size: 0.92rem;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .sb-nav-dropdown-toggle:hover,
    .sb-nav-dropdown.sb-open .sb-nav-dropdown-toggle {
      background: var(--bg, #f5f5f5);
    }

    .sb-nav-dropdown-toggle.sb-has-active {
      color: var(--accent, #4f46e5);
      font-weight: 600;
    }

    .sb-nav-dropdown-toggle::after {
      content: '';
      border: 4px solid transparent;
      border-top-color: currentColor;
      margin-top: 2px;
      transition: transform 0.2s;
    }

    .sb-nav-dropdown.sb-open .sb-nav-dropdown-toggle::after {
      transform: rotate(180deg);
    }

    .sb-nav-dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 200px;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e0e0e0);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      list-style: none;
      margin: 0;
      padding: 0.35rem 0;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-4px);
      transition: opacity 0.18s, transform 0.18s, visibility 0.18s;
    }

    .sb-nav-dropdown.sb-open .sb-nav-dropdown-menu {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .sb-nav-dropdown-menu a {
      padding: 0.5rem 1rem;
      border-radius: 0;
    }

    /* Hamburger */
    .sb-nav-hamburger {
      display: none;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      width: 36px;
      height: 36px;
      padding: 6px;
      border: none;
      background: none;
      cursor: pointer;
    }

    .sb-nav-hamburger span {
      display: block;
      height: 2px;
      background: var(--text, #1a1a1a);
      border-radius: 2px;
      transition: transform 0.25s, opacity 0.25s;
    }

    .sb-nav-hamburger.sb-open span:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }

    .sb-nav-hamburger.sb-open span:nth-child(2) {
      opacity: 0;
    }

    .sb-nav-hamburger.sb-open span:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }

    /* Mobile */
    @media (max-width: ${BREAKPOINT}px) {
      .sb-nav-hamburger {
        display: flex;
      }

      .sb-nav-links {
        position: absolute;
        top: 56px;
        left: 0;
        right: 0;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        background: var(--bg-card, #ffffff);
        border-bottom: 1px solid var(--border, #e0e0e0);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.35s ease;
      }

      .sb-nav-links.sb-mobile-open {
        max-height: 500px;
      }

      .sb-nav-links a,
      .sb-nav-dropdown-toggle {
        padding: 0.75rem 1.25rem;
        border-radius: 0;
      }

      .sb-nav-dropdown-menu {
        position: static;
        box-shadow: none;
        border: none;
        background: var(--bg, #f5f5f5);
        opacity: 1;
        visibility: visible;
        transform: none;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        border-radius: 0;
      }

      .sb-nav-dropdown.sb-open .sb-nav-dropdown-menu {
        max-height: 400px;
      }

      .sb-nav-dropdown-menu a {
        padding-left: 2rem;
      }
    }
  `;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Determine if a given page path matches the current location.
   */
  function isActivePage(pagePath) {
    const current = window.location.pathname;
    // Normalise: strip leading slash and compare endings
    const normCurrent = current.replace(/\\/g, '/').replace(/^\//, '');
    const normPage = pagePath.replace(/\\/g, '/').replace(/^\//, '');

    if (normCurrent === normPage) return true;
    if (normCurrent.endsWith('/' + normPage)) return true;
    // Handle index default: "/" or "" matches "index.html"
    if ((normCurrent === '' || normCurrent.endsWith('/')) && normPage === 'index.html') return true;

    return false;
  }

  /**
   * Inject a <style> element into the document head.
   */
  function injectStyles(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Build navigation
  // ---------------------------------------------------------------------------

  function buildNav(config) {
    const { siteName, pages } = config;

    const nav = document.createElement('nav');
    nav.className = 'sb-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Site navigation');

    const inner = document.createElement('div');
    inner.className = 'sb-nav-inner';

    // Brand
    const brand = document.createElement('a');
    brand.className = 'sb-nav-brand';
    brand.href = pages.find((p) => p.type === 'core' && p.id === 'index')?.path || 'index.html';
    brand.textContent = siteName || 'Study Guide';
    inner.appendChild(brand);

    // Hamburger
    const hamburger = document.createElement('button');
    hamburger.className = 'sb-nav-hamburger';
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    hamburger.setAttribute('aria-expanded', 'false');
    for (let i = 0; i < 3; i++) {
      hamburger.appendChild(document.createElement('span'));
    }
    inner.appendChild(hamburger);

    // Links
    const ul = document.createElement('ul');
    ul.className = 'sb-nav-links';

    const corePages = pages.filter((p) => p.type !== 'exam');
    const examPages = pages.filter((p) => p.type === 'exam');

    // Core page links
    corePages.forEach((page) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = page.path;
      a.textContent = page.title;
      if (isActivePage(page.path)) a.classList.add('sb-active');
      li.appendChild(a);
      ul.appendChild(li);
    });

    // Exam pages — dropdown if >= threshold, otherwise flat links
    if (examPages.length >= EXAM_DROPDOWN_THRESHOLD) {
      const li = document.createElement('li');
      li.className = 'sb-nav-dropdown';

      const toggle = document.createElement('button');
      toggle.className = 'sb-nav-dropdown-toggle';
      toggle.textContent = 'Practice Exams';
      toggle.setAttribute('aria-haspopup', 'true');
      toggle.setAttribute('aria-expanded', 'false');

      const hasActiveExam = examPages.some((p) => isActivePage(p.path));
      if (hasActiveExam) toggle.classList.add('sb-has-active');

      const menu = document.createElement('ul');
      menu.className = 'sb-nav-dropdown-menu';
      menu.setAttribute('role', 'menu');

      examPages.forEach((page) => {
        const menuLi = document.createElement('li');
        menuLi.setAttribute('role', 'none');
        const a = document.createElement('a');
        a.href = page.path;
        a.textContent = page.title;
        a.setAttribute('role', 'menuitem');
        if (isActivePage(page.path)) a.classList.add('sb-active');
        menuLi.appendChild(a);
        menu.appendChild(menuLi);
      });

      // Toggle dropdown on click
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = li.classList.toggle('sb-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });

      li.appendChild(toggle);
      li.appendChild(menu);
      ul.appendChild(li);
    } else {
      examPages.forEach((page) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = page.path;
        a.textContent = page.title;
        if (isActivePage(page.path)) a.classList.add('sb-active');
        li.appendChild(a);
        ul.appendChild(li);
      });
    }

    inner.appendChild(ul);
    nav.appendChild(inner);

    // Hamburger toggle
    hamburger.addEventListener('click', () => {
      const isOpen = ul.classList.toggle('sb-mobile-open');
      hamburger.classList.toggle('sb-open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) {
        nav.querySelectorAll('.sb-nav-dropdown.sb-open').forEach((dd) => {
          dd.classList.remove('sb-open');
          dd.querySelector('.sb-nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
        });
      }
    });

    return nav;
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function showError(message) {
    console.error('[nav.js]', message);
    const banner = document.createElement('div');
    banner.style.cssText =
      'background:#fef2f2;color:#991b1b;padding:0.75rem 1rem;text-align:center;font-size:0.875rem;border-bottom:1px solid #fca5a5;';
    banner.textContent = `Navigation failed to load: ${message}`;
    document.body.prepend(banner);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch(NAV_CONFIG_PATH);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Could not load ${NAV_CONFIG_PATH}`);
      }

      const config = await response.json();

      if (!config.pages || !Array.isArray(config.pages)) {
        throw new Error('Invalid nav-config.json: "pages" must be an array');
      }

      injectStyles(STYLES);
      const nav = buildNav(config);
      document.body.prepend(nav);
    } catch (err) {
      showError(err.message);
    }
  });
})();
