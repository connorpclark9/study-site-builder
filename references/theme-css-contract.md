# Theme CSS Variable Contract

> Data contract defining the CSS custom properties that every theme MUST implement. Consumed by the site-generator skill and all HTML templates.

## Overview

Themes control the visual appearance of the generated study site. Every theme must define a complete set of CSS custom properties on the `:root` selector. Templates reference these variables exclusively — no hardcoded colors, fonts, or spacing values appear in the HTML templates.

## Theme Folder Structure

```
themes/
  theme-name/
    theme.css        # Required: CSS file defining all variables and any theme-specific styles
    preview.md       # Required: Brief description and screenshot/preview info for theme selection
    assets/          # Optional: Theme-specific assets (fonts, images, icons)
```

## Required CSS Variables

All variables listed below MUST be defined in every theme's `theme.css` file on the `:root` selector. Omitting any variable will break the site layout.

### Colors

```css
:root {
  /* Background colors */
  --bg:             /* Page background (outermost) */
  --bg-card:        /* Card/panel background */
  --bg-sub:         /* Subtle background for nested elements, code blocks, secondary sections */
  --bg-deep:        /* Deepest background level, e.g., nav sidebar, footer */
  --formula-bg:     /* Background for formula/code display blocks */

  /* Border colors */
  --border:         /* Default border color for cards, dividers */
  --border-hi:      /* High-emphasis border for focused/active elements */
  --formula-border: /* Border for formula/code display blocks */

  /* Text colors */
  --text:           /* Primary text color */
  --text-mute:      /* Secondary/muted text (subtitles, metadata, timestamps) */
  --text-dim:       /* Tertiary/dim text (placeholders, disabled states) */

  /* Accent colors */
  --accent:         /* Primary accent color (links, buttons, highlights) */
  --accent-hi:      /* Accent hover/active state */

  /* Utility colors */
  --white:          /* Pure white or theme-appropriate light color for text on accent backgrounds */
  --correct:        /* Correct answer indicator color (typically green) */
  --correct-bg:     /* Background tint for correct answer feedback */
  --incorrect:      /* Incorrect answer indicator color (typically red) */
  --incorrect-bg:   /* Background tint for incorrect answer feedback */
}
```

### Typography

```css
:root {
  /* Font families */
  --font-primary:   /* Primary font stack for body text and headings. MUST include system font fallbacks. */
  --font-mono:      /* Monospace font stack for code, formulas, keyboard shortcuts. MUST include system font fallbacks. */
}
```

**System font fallback requirements:**

- `--font-primary` MUST end with a system font stack: `..., -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- `--font-mono` MUST end with a system font stack: `..., "SF Mono", "Cascadia Code", "Fira Code", Consolas, "Courier New", monospace`
- Custom web fonts may be prepended but the site must remain functional without them

### Layout

```css
:root {
  /* Dimensions */
  --max-width:      1100px;   /* Maximum content width */
  --radius:         12px;     /* Border radius for cards, panels, large containers */
  --radius-sm:      8px;      /* Border radius for buttons, inputs, small elements */

  /* Spacing */
  --spacing:        12px;     /* Base spacing unit (gaps between small elements) */
  --spacing-lg:     24px;     /* Large spacing (gaps between sections, cards) */

  /* Padding */
  --padding-card:   18px;     /* Internal padding for card/panel components */
  --padding-page:   28px 32px; /* Page-level padding (top/bottom left/right) */
}
```

**Layout values are fixed.** Unlike colors and fonts, the layout variables have prescribed values that MUST NOT be changed by themes. This ensures consistent structural layout across all themes.

## Responsive Overrides

Every theme MUST include responsive overrides at the following breakpoints. These adjust spacing and padding for smaller screens while maintaining the variable contract.

### Tablet Breakpoint (768px)

```css
@media (max-width: 768px) {
  :root {
    --padding-page:   20px 18px;
    --padding-card:   14px;
    --spacing-lg:     18px;
  }
}
```

### Mobile Breakpoint (480px)

```css
@media (max-width: 480px) {
  :root {
    --padding-page:   14px 10px;
    --padding-card:   12px;
    --spacing:        8px;
    --spacing-lg:     14px;
    --radius:         8px;
    --radius-sm:      6px;
  }
}
```

## Accessibility Requirements

1. **WCAG AA minimum.** All text/background color combinations MUST meet WCAG 2.1 AA contrast requirements:
   - Normal text (< 18px): contrast ratio >= 4.5:1
   - Large text (>= 18px or >= 14px bold): contrast ratio >= 3:1
2. **Critical pairs to verify:**
   - `--text` on `--bg` (primary body text)
   - `--text` on `--bg-card` (card body text)
   - `--text-mute` on `--bg` and `--bg-card` (secondary text)
   - `--accent` on `--bg` and `--bg-card` (links)
   - `--white` on `--accent` (button text on accent background)
   - `--correct` on `--correct-bg` (feedback text)
   - `--incorrect` on `--incorrect-bg` (feedback text)
3. **Focus indicators.** Interactive elements styled with theme variables must have visible focus indicators. Themes should ensure `--accent` and `--accent-hi` provide adequate contrast for focus rings.
4. **Reduced motion.** Themes that include transitions or animations MUST respect `prefers-reduced-motion: reduce`.

## Theme CSS File Template

A minimal compliant `theme.css`:

```css
/* Theme: Example Light Theme */

:root {
  /* Backgrounds */
  --bg: #f8f9fa;
  --bg-card: #ffffff;
  --bg-sub: #f0f1f3;
  --bg-deep: #e9ecef;
  --formula-bg: #f5f5f0;

  /* Borders */
  --border: #dee2e6;
  --border-hi: #adb5bd;
  --formula-border: #d4d4c8;

  /* Text */
  --text: #212529;
  --text-mute: #6c757d;
  --text-dim: #adb5bd;

  /* Accent */
  --accent: #0d6efd;
  --accent-hi: #0a58ca;

  /* Utility */
  --white: #ffffff;
  --correct: #198754;
  --correct-bg: #d1e7dd;
  --incorrect: #dc3545;
  --incorrect-bg: #f8d7da;

  /* Typography */
  --font-primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  --font-mono: "SF Mono", "Cascadia Code", "Fira Code", Consolas,
    "Courier New", monospace;

  /* Layout (fixed values — do not modify) */
  --max-width: 1100px;
  --radius: 12px;
  --radius-sm: 8px;
  --spacing: 12px;
  --spacing-lg: 24px;
  --padding-card: 18px;
  --padding-page: 28px 32px;
}

/* Tablet */
@media (max-width: 768px) {
  :root {
    --padding-page: 20px 18px;
    --padding-card: 14px;
    --spacing-lg: 18px;
  }
}

/* Mobile */
@media (max-width: 480px) {
  :root {
    --padding-page: 14px 10px;
    --padding-card: 12px;
    --spacing: 8px;
    --spacing-lg: 14px;
    --radius: 8px;
    --radius-sm: 6px;
  }
}
```

## Preview File

Each theme MUST include a `preview.md` file with:

```markdown
---
name: "Theme Display Name"
description: "One-sentence theme description"
style: "light" | "dark"
---

Brief notes about the theme's design philosophy, intended use cases,
or color palette inspiration.
```

## Validation Checklist

Before a theme is considered complete, verify:

- [ ] All color variables defined on `:root`
- [ ] All typography variables defined with system font fallbacks
- [ ] All layout variables defined with exact prescribed values
- [ ] Responsive overrides present for 768px and 480px breakpoints
- [ ] WCAG AA contrast ratios met for all critical text/background pairs
- [ ] `preview.md` file present with required frontmatter
- [ ] Theme folder follows the required structure (`theme.css`, `preview.md`, optional `assets/`)
- [ ] No hardcoded color, font, or spacing values outside of `:root` variable definitions
