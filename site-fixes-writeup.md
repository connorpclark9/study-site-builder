# MKT3717 Study Site — Post-Deploy Fix Report & Plugin Specification Updates

## Overview

After deploying the MKT3717 study site via the study-site-builder pipeline, the following issues were identified during manual review. This document catalogs each issue, its root cause, the fix applied, and — most importantly — the exact specification/template/skill updates required in the `study-site-builder` plugin to prevent recurrence on future sites.

---

## Issue 1: Navigation Bar Text Wrapping (Stacked Buttons)

### What Went Wrong
Nav bar link text wrapped to multiple lines, creating a stacked appearance. With 7 navigation items and a long site name ("MKT 3717 - New Product Development & Brand Management"), horizontal space was exhausted and button labels broke onto two lines.

### Root Cause
The `nav.js` template CSS for `.sb-nav-links a` and `.sb-nav-dropdown-toggle` lacked `white-space: nowrap`. The nav link container `.sb-nav-links` also lacked `overflow-x: auto` to handle overflow gracefully.

### Fix Applied
- Added `white-space: nowrap` to `.sb-nav-links a` and `.sb-nav-dropdown-toggle` CSS rules in `site/js/nav.js`
- Added `overflow-x: auto` to `.sb-nav-links` to allow horizontal scrolling when space is tight

### Plugin Updates Required

**File: `templates/shared-js/nav.js`**
- Add `white-space: nowrap;` to the `.sb-nav-links a` CSS rule
- Add `white-space: nowrap;` to the `.sb-nav-dropdown-toggle` CSS rule
- Add `overflow-x: auto;` to the `.sb-nav-links` CSS rule

---

## Issue 2: Page Title Misalignment (Study Map & Flashcards)

### What Went Wrong
The "Study Map" and "Flashcards" page titles were visually misaligned compared to "Last-Minute Review" and "Sample Questions". The latter two pages had consistent max-width containers with padding, while the former two had bare `<header><h1>` elements outside any constrained container.

### Root Cause
The `last-minute-review.html` and `sample-questions.html` templates wrap all content (including the h1) inside a container div with `max-width` and `padding`. The `study-map.html` and `flashcards.html` templates place the `<header>` outside the content container, so the h1 renders edge-to-edge.

### Fix Applied
- `flashcards.html`: Moved the `<header>` inside the `.flashcard-wrapper` container so it shares the same max-width and padding
- `study-map.html`: Rebuilt entirely (see Issue 3) with header inside the page container

### Plugin Updates Required

**File: `templates/page-templates/flashcards.html`**
- Move `<header role="banner"><h1>...</h1></header>` **inside** the `.flashcard-wrapper` container, not before it
- Add a subtitle `<p>` element matching the pattern used in last-minute-review and sample-questions templates

**File: `templates/page-templates/study-map.html`**
- Same pattern: header must be inside the page's max-width container

**New specification: `references/page-layout-contract.md`** (RECOMMENDED)
Create a new reference document specifying that ALL pages must follow this layout pattern:
```html
<body>
  <!-- nav.js injects nav here -->
  <div class="{page-name}-page"> <!-- max-width + padding container -->
    <header role="banner">
      <h1>{Page Title}</h1>
      <p class="subtitle">{Description}</p>
    </header>
    <main role="main">
      <!-- page content -->
    </main>
  </div>
</body>
```
Every page template must wrap its header AND content inside a single container div with `max-width: var(--max-width)`, `margin: 0 auto`, and `padding: var(--padding-page)`. No page should place its `<header>` outside this container.

---

## Issue 3 & 4: Study Map Built Wrong / Dependency Graph Showing

### What Went Wrong
The Study Map page used a two-column layout with a sidebar table of contents and HTML `<details>` elements for collapsible sections. It also displayed a monospace "Concept Dependency Graph" at the bottom. This design did not match the reference implementation pattern and provided a poor user experience — all sections opened by default (via a script that sets `open` on all details), the sidebar took space on mobile, and the dependency graph was an unusable wall of ASCII text.

### Root Cause
The study-map.html template was designed with a fundamentally different architecture than the proven reference pattern:
- Used native `<details>/<summary>` elements instead of JS-toggled `.topic-block` / `.subtopic` pattern
- Included a sidebar TOC that duplicated the main content navigation
- Included a dependency graph visualization that added no interactive value
- Template placeholders (`{{TOC_CONTENT}}`, `{{STUDY_MAP_CONTENT}}`) gave the site-builder agent too much freedom to generate arbitrary HTML structure

### Fix Applied
Complete rewrite of `study-map.html` using the proven pattern:
- **Topic blocks**: Collapsible sections with icon, eyebrow text, title, description, pill count, and chevron indicator
- **Subtopic cards**: Grid layout of individual concept cards, each independently collapsible
- **JS toggle functions**: Simple `toggleTopic()` and `toggleSub()` that add/remove `.open` class
- **No sidebar TOC**: Content is self-navigating via expand/collapse
- **No dependency graph**: Relationships are shown inline via connection lists and link tags
- **Responsive grid**: `auto-fill` with `minmax(280px, 1fr)` for subtopic cards

### Plugin Updates Required

**File: `templates/page-templates/study-map.html`** — COMPLETE REWRITE
Replace the current two-column sidebar + details template with the topic-block/subtopic pattern:

```html
<div class="study-map-page">
  <header role="banner">
    <h1>Study Map</h1>
    <p class="subtitle">...</p>
  </header>
  <main role="main">
    <!-- Optional: course narrative card -->
    <div id="topics-container">
      {{STUDY_MAP_CONTENT}}
    </div>
  </main>
</div>
<script>
  function toggleTopic(id) { document.getElementById(id)?.classList.toggle('open'); }
  function toggleSub(id) { document.getElementById(id)?.classList.toggle('open'); }
</script>
```

Remove `{{TOC_CONTENT}}` placeholder entirely. The study map should NOT have a sidebar table of contents.

**File: `references/template-placeholders.md`**
- Remove `{{TOC_CONTENT}}` from the study-map.html section
- Update `{{STUDY_MAP_CONTENT}}` description to specify it must contain topic-block/subtopic HTML using the standard pattern (not arbitrary HTML)

**File: `skills/site-builder/SKILL.md`**
Add a mandatory structural constraint for the study-map page generation:

> **Study Map Structure Rule**: The study-map page MUST use the topic-block/subtopic pattern. Each lecture grouping is a `.topic-block` with a clickable header containing: icon, eyebrow (lecture range), title, description, pill count, and chevron. Inside each topic-block, individual lectures/subtopics are rendered as `.subtopic` cards in a `.subtopic-grid` with their own collapsible bodies. Do NOT use `<details>/<summary>` elements, sidebar table of contents, or dependency graph visualizations.

**New CSS classes to add to `references/theme-css-contract.md`** (or a new study-map CSS reference):
Document the required CSS classes: `.topic-block`, `.topic-header`, `.topic-body`, `.subtopic`, `.subtopic-grid`, `.subtopic-hdr`, `.subtopic-body`, `.chevron`, `.sub-chev`, `.dot`, `.topic-icon`, `.topic-eyebrow`, `.topic-title`, `.topic-desc`, `.topic-pill`, `.topic-right`, `.section-label`, `.prose`, `.bullets`, `.link-tags`, `.link-tag`

---

## Issue 5: Practice Exam Navigation Causes 404 Errors

### What Went Wrong
When viewing a practice exam page (e.g., `exams/practice-exam-1.html`) and clicking any nav link (e.g., "Study Map"), the browser navigated to `exams/study-map.html` instead of `study-map.html`, resulting in a 404.

### Root Cause
`nav.js` computes a `basePath` variable from the script's `src` attribute to locate `nav-config.json`:
```js
const basePath = scriptSrc.replace(/js\/nav\.js$/, '');
// From exams/, basePath = '../'
```
However, when building navigation links, `basePath` was NOT prepended to `page.path`:
```js
a.href = page.path;  // Bug: should be basePath + page.path
```
So from the `/exams/` subdirectory, relative paths like `study-map.html` resolved relative to `/exams/` instead of the site root.

### Fix Applied
Prepended `basePath` to all link `href` assignments in `buildNav()`:
- Brand link: `brand.href = basePath + (pages.find(...)?.path || 'index.html')`
- Core page links: `a.href = basePath + page.path`
- Exam dropdown links: `a.href = basePath + page.path`
- Flat exam links: `a.href = basePath + page.path`

### Plugin Updates Required

**File: `templates/shared-js/nav.js`**
This is a **critical bug** in the template. All 4 locations where `a.href = page.path` is set must be changed to `a.href = basePath + page.path`. The `basePath` variable is already computed but was never used for link generation.

Affected lines in the `buildNav()` function:
1. Brand href assignment
2. Core pages `forEach` loop
3. Exam dropdown menu `forEach` loop
4. Flat exam links `forEach` loop (the `else` branch)

**File: `skills/site-builder/SKILL.md`**
Add a **post-build validation rule**:

> **Subdirectory Navigation Test**: After building the site, verify that nav links work correctly from pages in subdirectories (e.g., `exams/`). Open any exam page and confirm that clicking each nav link navigates to the correct page, not a 404. This catches basePath resolution bugs in nav.js.

---

## Issue 6: No Practice Exams Landing Page

### What Went Wrong
The index.html homepage linked to `practice-exams.html` which didn't exist. Individual practice exams were listed as separate nav items ("Practice Exam 1", "Practice Exam 2") which cluttered the nav bar and made navigation confusing.

### Root Cause
The nav-config.json listed each exam as a separate `type: "exam"` entry. With only 2 exams (below the dropdown threshold of 3), they rendered as flat nav links. The index.html quick-link card linked to a non-existent `practice-exams.html` landing page.

### Fix Applied
- Created `site/practice-exams.html` — a landing page with cards linking to individual exams
- Updated `nav-config.json` to replace 2 exam entries with a single core entry: `{ "id": "practice-exams", "title": "Practice Exams", "path": "practice-exams.html", "type": "core" }`

### Plugin Updates Required

**New file: `templates/page-templates/practice-exams.html`**
Create a new template for the practice exams landing page that dynamically lists available exams as cards. This page should always be generated when exams exist.

**File: `references/nav-config-format.md`**
Add a rule:

> **Practice Exams Landing Page Rule**: When the site has practice exams, the nav config MUST include a single "Practice Exams" core page entry (`practice-exams.html`) instead of listing individual exam pages. Individual exams are linked from the practice-exams landing page, not from the nav bar. This prevents nav bar clutter and broken navigation from exam subdirectories.

**File: `skills/site-builder/SKILL.md`**
Add to the site assembly steps:

> When exams exist, generate a `practice-exams.html` landing page that lists all available practice exams as cards with links to `exams/practice-exam-N.html`. Add a single nav entry for this page. Do NOT add individual exam pages to the navigation config.

**File: `skills/exam-generator/SKILL.md`**
Update Step 6 (nav config update):

> Instead of appending individual exam entries to nav-config.json, verify that a "practice-exams" core page entry exists. If not, add it. Do NOT add individual exam entries to the nav config.

---

## Issue 7: Flashcards Missing 3D Animation & Master Deck

### What Went Wrong
Flashcard flip had no visible 3D animation — cards appeared to instantly switch between front and back. There was also no "Master Deck" option to study all cards from all lectures at once.

### Root Cause
The flashcards.js `render()` function rebuilt the **entire container innerHTML** on every action (flip, next, prev). This destroyed the DOM element mid-transition, preventing the CSS `transform: rotateY(180deg)` transition from animating. The CSS had correct 3D properties (`perspective`, `preserve-3d`, `backface-visibility`), but the DOM element was replaced before the transition could execute.

The master deck was simply not implemented — the code loaded decks from JSON but never created a combined deck.

### Fix Applied
Complete rewrite of `site/js/flashcards.js`:
- **DOM manipulation instead of innerHTML rebuilds**: Build DOM elements once via `buildUI()`, then update text content and toggle classes for subsequent interactions
- **3D flip**: Use `els.card.classList.toggle('flipped')` instead of re-rendering
- **Master deck**: Added a "Master Deck" button that combines all lecture cards via `buildMasterDeck()` with Fisher-Yates shuffle
- **Completion screen**: Show/hide via display toggling, not DOM rebuilds
- **CSS matches proven pattern**: Card wrap with explicit height, `perspective: 900px`, front/back with `position: absolute` and `backface-visibility: hidden`

### Plugin Updates Required

**File: `templates/shared-js/flashcards.js`** — CRITICAL ARCHITECTURAL FIX
The current template uses a full `render()` function that rebuilds `container.innerHTML` on every interaction. This MUST be refactored to:

1. Build DOM elements once when a deck is selected (via a `buildUI()` function)
2. Store references to DOM elements (term, definition, card, buttons, progress)
3. Update text content and toggle CSS classes for flip/navigation
4. NEVER rebuild innerHTML during flip or card navigation

The key pattern:
```js
// WRONG (current template):
function render() { container.innerHTML = buildHTML(); }
function flipCard() { state.isFlipped = !state.isFlipped; render(); } // Destroys DOM mid-transition

// CORRECT (fixed):
function flipCard() { els.card.classList.toggle('flipped'); } // Preserves DOM, animation works
```

Additionally, add master deck functionality:
```js
function buildMasterDeck() {
  const all = [];
  allDecks.forEach(deck => { if (deck.cards) all.push(...deck.cards); });
  return shuffle(all);
}
```

**File: `references/flashcard-format.md`**
No changes needed to the data format. The master deck is built client-side from existing deck data.

**File: `skills/site-builder/SKILL.md`**
Add a validation rule:

> **Flashcard Animation Test**: After building the site, verify that the flashcard 3D flip animation works by clicking a card. The card should smoothly rotate around the Y-axis over ~0.45s. If the flip is instant (no animation), the flashcards.js is likely using innerHTML rebuilds instead of DOM manipulation — fix the JavaScript.

---

## Issue 8: No Practice Exam Reset Button

### What Went Wrong
After clicking "Show Correct Answers", all interactive elements were permanently disabled with no way to retake the exam without refreshing the page.

### Root Cause
The `exam-checker.js` sets `checked = true` and disables all inputs/options, but provides no mechanism to reverse this state.

### Fix Applied
- Added a "Reset Exam" button to both practice exam HTML pages (hidden by default, shown after checking answers)
- Added `resetExam()` function to `exam-checker.js` that:
  - Clears all user answers
  - Removes grading classes (correct/incorrect/missed/selected/disabled)
  - Removes injected answer-reveal and source-lecture elements
  - Re-enables all textareas and clears their values
  - Hides score summary
  - Resets the check button text and enabled state
  - Hides the reset button
  - Scrolls to top

### Plugin Updates Required

**File: `templates/exam-formats/card-style/exam-template.html`**
Add a reset button to the footer (hidden by default):
```html
<button type="button" class="btn btn-reset" id="btn-reset-exam" style="display:none">
  Reset Exam
</button>
```

**File: `templates/exam-formats/classic-style/exam-template.html`**
Same change as card-style.

**File: `templates/exam-formats/card-style/exam-checker.js`**
Add the `resetExam()` function and wire it to the reset button. Show the reset button after `checkAnswers()` runs.

**File: `templates/exam-formats/classic-style/exam-checker.js`**
Same change as card-style.

**File: `templates/exam-formats/card-style/exam-styles.css`**
Add `.btn-reset` styling.

**File: `templates/exam-formats/classic-style/exam-styles.css`**
Same change.

---

## Issue 9: Timer Reference in Practice Exam Description

### What Went Wrong
The index.html practice exams card described "Timed practice exams that simulate the real test experience." There is no timer functionality in the exam system, making this misleading.

### Root Cause
The site-builder agent wrote aspirational description text that didn't match the actual exam functionality. No timer code exists in exam-checker.js.

### Fix Applied
Changed the description to: "Comprehensive practice exams to test your knowledge across all course material."

### Plugin Updates Required

**File: `skills/site-builder/SKILL.md`**
Add a content accuracy rule:

> **Description Accuracy Rule**: All page descriptions on the home page quick-link cards must accurately describe the current functionality of each page. Do not describe features that are not implemented (e.g., "timed exams" when no timer exists, "AI-powered" when no AI is used). Descriptions should be factual and based on what the page actually does.

---

## Summary of All Plugin Files Requiring Updates

| File | Change Type | Priority |
|------|------------|----------|
| `templates/shared-js/nav.js` | Bug fix: basePath + nowrap | CRITICAL |
| `templates/shared-js/flashcards.js` | Architectural rewrite: DOM manipulation | CRITICAL |
| `templates/page-templates/study-map.html` | Complete rewrite: topic-block pattern | HIGH |
| `templates/page-templates/flashcards.html` | Fix: header inside container | HIGH |
| `templates/page-templates/practice-exams.html` | New file: landing page template | HIGH |
| `templates/exam-formats/*/exam-template.html` | Add: reset button | MEDIUM |
| `templates/exam-formats/*/exam-checker.js` | Add: resetExam() function | MEDIUM |
| `templates/exam-formats/*/exam-styles.css` | Add: .btn-reset styling | MEDIUM |
| `references/template-placeholders.md` | Remove TOC_CONTENT, update STUDY_MAP_CONTENT | MEDIUM |
| `references/nav-config-format.md` | Add: practice-exams landing page rule | MEDIUM |
| `skills/site-builder/SKILL.md` | Add: 5 validation rules | HIGH |
| `skills/exam-generator/SKILL.md` | Update: nav config step | MEDIUM |
| `references/page-layout-contract.md` | New file: consistent page layout spec | RECOMMENDED |

---

## Recommended New Validation Checklist for `skills/site-builder/SKILL.md`

Add the following post-build validation checklist:

```markdown
### Post-Build Validation Checklist

Before marking the site-builder phase as complete, verify:

1. [ ] **No remaining placeholders**: `grep -r '{{' site/*.html site/**/*.html` returns no matches
2. [ ] **Nav links work from subdirectories**: Open `site/exams/practice-exam-1.html` and click every nav link — none should 404
3. [ ] **Page titles aligned**: All pages have their `<header><h1>` inside a max-width container div
4. [ ] **Flashcard 3D flip**: Click a flashcard — it should smoothly rotate in 3D, not instantly switch
5. [ ] **Master deck exists**: Flashcard page has a "Master Deck" button that combines all lecture cards
6. [ ] **Practice exams landing page**: `practice-exams.html` exists and links to all exam pages
7. [ ] **Exam reset works**: After checking answers, "Reset Exam" button appears and fully clears the exam
8. [ ] **No aspirational descriptions**: All home page card descriptions match actual page functionality
9. [ ] **Study map uses topic-blocks**: No `<details>` elements, no sidebar TOC, no dependency graph
10. [ ] **Nav text doesn't wrap**: All nav links display on a single line (no stacked text)
```
