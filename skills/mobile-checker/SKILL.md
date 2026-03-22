---
name: mobile-checker
description: "Use when the study site needs responsive/mobile verification, when `/study-site mobile-check` is invoked, or when Phase 7 of the pipeline runs. Audits every HTML page for mobile usability issues and fixes them."
---

# Mobile Checker

Verify that every page of the study site is fully responsive and usable on mobile devices. Fix any issues found using CSS-first methodology. Write a report to `audit/mobile-report.md` and update `pipeline-status.json`.

## Precondition Checks

Before doing anything else, verify the environment is ready:

1. Confirm `site/` exists and contains at least one `.html` file. If not, stop and tell the user: "No site found. Run `/study-site build` first to generate the study site."
2. Read `pipeline-status.json` if it exists to confirm prior phases completed. See `references/pipeline-status-format.md` for the schema. If the file is missing, proceed anyway — the mobile check can run standalone.
3. Check whether `site/exams/` exists. If it does not, skip all exam-specific checks later. Do not treat a missing exams directory as an error.

## Step 1: Discover Pages

Build the complete list of HTML files to check:

- All `.html` files in `site/` (home, flashcards, study-map, last-minute-review, sample-questions, etc.)
- All `.html` files in `site/exams/` (practice exam pages) — only if the directory exists

Record this list. Every file must pass every applicable check.

## Step 2: Read Theme and Interaction Code

Read these files to understand the current responsive landscape:

- `site/css/theme.css` — existing `@media` queries, breakpoints, and gaps in responsive coverage
- `site/js/nav.js` — hamburger menu behavior, mobile nav logic
- `site/js/flashcards.js` — touch/tap interaction handling

Note any theme-specific styles that responsive fixes must not conflict with. When adding responsive CSS later, check that new rules do not override theme-specific declarations (color schemes, branded spacing, component-specific styles) unintentionally. Use specific selectors when needed to avoid CSS conflicts.

## Step 3: Responsive Verification Checklist

For each HTML file, verify ALL of the following. Mark pass/fail for each.

### 3a. No Horizontal Overflow
- No element causes horizontal scrolling at 768px (tablet) or 480px (mobile) viewports.
- Check for: explicit pixel `width` values exceeding viewport, tables without overflow wrappers, `pre`/`code` blocks, fixed-width containers.

### 3b. Touch Target Sizes
- All interactive elements (buttons, links, radio buttons, toggles, flashcard controls, exam answer selections) have at least 44x44px touch area.
- Check for `min-height`, `min-width`, or `padding` on interactive elements.

### 3c. Readable Text
- Body text is at least 16px (1rem) on mobile to prevent forced zooming.
- Line length does not exceed ~80 characters on mobile.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` exists in every HTML file.

### 3d. Navigation
- Hamburger menu is present and functional at mobile breakpoints.
- Nav links are accessible through the hamburger menu and the menu is dismissible.
- Active page is visually indicated in mobile nav.

### 3e. Flashcard Interactions
- Flip animation works with touch/tap, not only hover.
- Navigation buttons (next/previous) are touch-friendly.
- Card content does not overflow its container on small screens.

### 3f. Exam Interactions (skip if no exams exist)
- Answer selection controls are touch-friendly with readable text.
- Submit/check buttons are prominent and tappable.
- Score display and feedback are readable on mobile.

### 3g. Tables
- All tables are wrapped in a container with `overflow-x: auto`.
- Table text remains readable on mobile.

### 3h. Images
- All images have `max-width: 100%; height: auto` (or equivalent).
- No image causes horizontal overflow.

## Step 4: Fix Methodology — CSS First

Fix issues in this priority order. The rationale: CSS-only fixes are centralized in one file, easier to maintain, and do not break DOM assumptions that JavaScript or other pipeline phases depend on.

**Priority 1 — Modify `site/css/theme.css`.** Add or update `@media` queries. Group all mobile-checker fixes under a clear comment block so future runs can identify them:

```css
/* ── Mobile Checker Fixes ── */
@media (max-width: 768px) {
  /* tablet fixes */
}
@media (max-width: 480px) {
  /* mobile fixes */
}
```

Before adding rules, check for existing theme-specific styles at the same breakpoints. Use sufficiently specific selectors to avoid overriding theme intent.

**Priority 2 — Page-specific `<style>` block in `<head>`.** Use only when a fix is unique to one page and does not belong in shared CSS.

**Priority 3 — HTML structure changes.** Last resort only. Example: wrapping a `<table>` in `<div class="table-wrapper">` for overflow scrolling.

### Quick-Reference Fix Table

| Symptom | Fix |
|---------|-----|
| Table overflow | Wrap in `<div style="overflow-x:auto">` |
| Small touch targets | `min-height: 44px; min-width: 44px; padding: 12px` |
| Text too small | `font-size: 1rem` minimum in mobile media query |
| Image overflow | `img { max-width: 100%; height: auto; }` |
| Fixed-width elements | Change `width: Npx` to `max-width: Npx; width: 100%` |
| Flex/grid overflow | `min-width: 0` on flex children; `grid-template-columns: 1fr` on mobile |
| Missing viewport meta | `<meta name="viewport" content="width=device-width, initial-scale=1">` |
| Hover-only interactions | Add `:active` alongside `:hover`; verify touch event handlers exist |

## Step 5: Verification

### With Preview Tools Available
1. Start a local server with `preview_start` pointing to `site/`.
2. Use `preview_resize` to test at desktop (1280px), tablet (768px), and mobile (375px).
3. Take `preview_screenshot` at each breakpoint for each page.
4. Use `preview_inspect` to verify computed CSS values (font sizes, padding, touch target dimensions).
5. Use `preview_click` to test interactive elements (hamburger, flashcard flip, exam answers).

### Without Preview Tools
1. Read each HTML file and `site/css/theme.css`.
2. Analyze media queries for completeness at both breakpoints.
3. Verify all interactive elements have adequate sizing via CSS rules.
4. Confirm viewport meta tags exist in every file.
5. Trace CSS selectors to confirm they match actual HTML structure.
6. Check for common anti-patterns: fixed widths, missing overflow handling, hover-only interactions.

## Step 6: Write Report

Create `audit/mobile-report.md` (create the `audit/` directory if it does not exist). Use this exact format:

```markdown
# Mobile Responsiveness Report

Generated: [ISO 8601 timestamp]

## Pages Checked
- [list every HTML file checked, one per line]

## Issues Found and Fixed
1. **[filename]** — [issue description] — Fixed: [fix applied]
2. ...

## Issues Not Applicable
- [e.g., "Exam checks skipped — no site/exams/ directory"]

## Verification Checklist
- [x/blank] All pages pass horizontal overflow check
- [x/blank] All touch targets meet 44px minimum
- [x/blank] All text readable at 16px+ on mobile
- [x/blank] Navigation hamburger menu functional
- [x/blank] Flashcard touch interactions working
- [x/blank] Exam touch interactions working (or N/A)
- [x/blank] All tables have overflow handling
- [x/blank] All images scale properly

## Files Modified
- [list every file changed with a one-line summary of what changed]
```

Also output the report summary to the conversation so the user sees results immediately.

## Step 7: Update Pipeline Status

Update `pipeline-status.json` (see `references/pipeline-status-format.md` for schema):

- Set the `mobile-checker` phase status to `completed` with a `completedAt` timestamp.
- Populate `filesProduced` with the list of modified files plus `audit/mobile-report.md`.
- Set `currentPhase` to `mobile-checker`.
- If any check could not pass and was not fixable, set status to `failed` and populate the `error` field. Add the error to the top-level `errors` array.
