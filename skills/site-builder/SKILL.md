---
name: site-builder
description: "Use when design/design-spec.md is finalized and synthesis/ content is verified. Assembles the complete multi-page static study site by dispatching parallel subagents — one per page — then verifies the build."
---

# Site Builder

Assemble the final multi-page static study website from templates and verified content. Parse the design spec, set up the output directory, generate sub-PRDs for each page, dispatch parallel subagents to fill templates, then verify the complete build.

---

## Precondition Checks

Before any work, verify every required input exists. Read each path and confirm it is non-empty. If anything is missing or empty, stop immediately and report exactly what is absent.

**Required files:**

| Path | Purpose |
|------|---------|
| `design/design-spec.md` | Theme, pages, course name, overrides |
| `synthesis/flashcards.json` | Flashcard data for the flashcards page |
| `synthesis/conceptual-map.md` | Structural skeleton for the study map page (relationships, themes, progression) |
| `synthesis/last-minute-review.md` | Content for the last-minute review page |
| `pipeline-status.json` | Pipeline state (must show site-designer completed) |

**Required directories (must exist and contain files):**

| Path | Purpose |
|------|---------|
| `study-notes/` | Processed lecture notes — used for sample questions and as the deep content source for the study map page (at least one `.md` file) |
| `{pluginDir}/templates/page-templates/` | HTML page templates |
| `{pluginDir}/templates/themes/` | Theme CSS folders |
| `{pluginDir}/templates/shared-js/` | `nav.js` and `flashcards.js` |

**Resolving `pluginDir`:** Read `pipeline-status.json` and use the `pluginDir` field to find the plugin's template directory. All `templates/` paths in this skill are relative to `pluginDir`, not the project root. Templates live in the plugin installation directory, not the user's project.

**Error: template not found.** If the design spec references a theme folder or page template that does not exist under `{pluginDir}/templates/`, stop and report the mismatch. List available themes/templates so the user can correct the design spec.

---

## Step 1: Parse Design Spec

Read `design/design-spec.md` and extract:

- **Selected theme** — maps to a folder under `templates/themes/` (e.g., `midnight-blue`)
- **Selected pages** — which pages to build (e.g., index, flashcards, study-map, last-minute-review, sample-questions)
- **Course name** — used in page titles, headers, and nav config
- **Exam format** — card-style or classic-style (noted for later use by exam-generator; not consumed here)
- **CSS overrides** — any custom colors, fonts, or style tweaks

Validate that every selected page has a corresponding template file at `{pluginDir}/templates/page-templates/{page-name}.html`. If the design spec references a page type with no matching template, stop and report the error.

---

## Step 2: Directory Setup

Create the output directory structure:

```
site/
site/css/
site/js/
site/data/
site/exams/
```

**If `site/` already exists:** Rename it to `site-backup-{timestamp}/` before creating the fresh directory.

---

## Step 3: Copy Theme CSS

Copy the selected theme CSS into the output:

- Source: `{pluginDir}/templates/themes/{selected-theme}/theme.css`
- Destination: `site/css/theme.css`

If the design spec includes CSS overrides, append them to the end of `site/css/theme.css` inside a clearly marked block:

```css
/* === Design Spec Overrides === */
/* ...override rules here... */
```

---

## Step 4: Copy Shared JavaScript

Copy shared JS files:

- `{pluginDir}/templates/shared-js/nav.js` -> `site/js/nav.js`
- `{pluginDir}/templates/shared-js/flashcards.js` -> `site/js/flashcards.js`

---

## Step 5: Copy Data Files

Copy data files consumed by client-side JS:

- `synthesis/flashcards.json` -> `site/data/flashcards.json`

---

## Step 6: Generate Navigation Config

Create `site/data/nav-config.json` following the schema in `references/nav-config-format.md`.

The nav config must include:
- `siteName` set to the course name from the design spec
- A `pages` array entry for each selected page with `id`, `title`, `path`, and `type`
- All core pages (`type: "core"`) ordered before any exam pages (`type: "exam"`)
- An empty exams section (exam-generator populates this in Phase 6)
- Page ordering that matches the design spec

Read `references/nav-config-format.md` for the full field definitions and validation checklist. Verify your output against that checklist before writing the file.

---

## Mandatory Structural Constraints

The following rules MUST be followed when generating pages. These prevent known issues discovered during real-world testing.

### Page Layout Contract

ALL pages must follow this layout pattern — header inside a max-width container:

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

### Study Map Structure Rule

The study-map page MUST use the topic-block/subtopic pattern. Each lecture grouping is a `.topic-block` with a clickable header containing: icon, eyebrow (lecture range), title, description, pill count, and chevron. Inside each topic-block, individual lectures/subtopics are rendered as `.subtopic` cards in a `.subtopic-grid` with their own collapsible bodies. Do NOT use `<details>/<summary>` elements, sidebar table of contents, or dependency graph visualizations.

### Practice Exams Landing Page Rule

When exams exist, generate a `practice-exams.html` landing page that lists all available practice exams as cards with links to `exams/practice-exam-N.html`. Add a single nav entry for this page. Do NOT add individual exam pages to the navigation config.

### Description Accuracy Rule

All page descriptions on the home page quick-link cards must accurately describe the current functionality of each page. Do not describe features that are not implemented (e.g., "timed exams" when no timer exists, "AI-powered" when no AI is used). Descriptions should be factual and based on what the page actually does.

### Flashcard Animation Rule

The flashcards.js MUST use DOM manipulation (classList.toggle) for card flips, NOT innerHTML rebuilds. Rebuilding the DOM during flip destroys the element mid-CSS-transition, preventing 3D animation. The correct pattern: `els.card.classList.toggle('flipped')`.

---

## Step 7: Generate Sub-PRDs


First, check if `build/` exists. Create it if it does not. If it exists, clear its contents.

For each page selected in the design spec, write a sub-PRD file at `build/sub-prd-{page-name}.md` containing:

1. **Target file** — output HTML path (e.g., `site/index.html`)
2. **Template source** — which template to use (e.g., `{pluginDir}/templates/page-templates/index.html`)
3. **Content sources** — which files from `study-notes/` and `synthesis/` provide content
4. **Placeholder mappings** — a table mapping each `{{PLACEHOLDER}}` in the template to its content source and transformation instructions
5. **Page-specific transform rules** — include the relevant transform section from below (only for pages that need transforms)

### Page-Specific Transform Rules to Embed in Sub-PRDs

Include the appropriate section below **only** in the sub-PRD for that page type. Do not include transform rules for page types that are not being built.

#### Study Map (`study-map`)

**Design goal: Zero-to-Complete-Understanding.** The study map must be comprehensive and deep enough that a student with zero prior knowledge could read it and develop a complete understanding of the course material. It is NOT a brief overview or a set of topic labels — it is the entire course distilled into one navigable page. Every concept must be fully explained with definitions, significance, how it works, examples, and connections.

**Content sources:** The study map uses TWO sources:
1. `synthesis/conceptual-map.md` — provides the **structural skeleton**: course narrative, lecture progression order, cross-cutting themes, concept relationships, and the dependency graph. Use this to determine the organization, groupings, and connections.
2. `study-notes/*.md` — provides the **substantive content**: full concept explanations, framework details, examples, key terms, and glossary definitions. For each concept or framework referenced in the conceptual map, read the corresponding study note and pull the full teaching-quality content from its Key Concepts, Frameworks & Mental Models, and Key Terms sections.

**Content depth requirements:**
- **Explain, don't list.** Every concept in a subtopic body must have a teaching-quality explanation (3+ sentences minimum). "NPV is a method for evaluating investments" is insufficient — explain what it is, how it's calculated, why it's preferred, and when it fails.
- **Preserve frameworks in full.** If a study note describes a 2x2 matrix, multi-step process, or named framework, reproduce its structure and explain how to use it. Don't reduce a 5-step framework to a one-liner.
- **Include examples.** Wherever the study notes contain examples, calculations, or case studies, incorporate them into the subtopic content.
- **Cover everything.** Every concept from the Key Concepts section and every framework from the Frameworks & Mental Models section of every study note must appear as subtopic content. If a study note has 8 key concepts, the study map has 8 subtopics for that lecture.

**HTML structure — topic-block/subtopic pattern:**
- Each top-level heading (theme or lecture group) becomes a `.topic-block` with a clickable `.topic-header` containing an icon, `.topic-eyebrow` (lecture range), `.topic-title`, `.topic-desc`, `.topic-pill` (count), and `.chevron`
- The header uses `onclick="toggleTopic('topic-N')"` to toggle the `.open` class
- Inside each `.topic-body`, individual concepts become `.subtopic` cards in a `.subtopic-grid`
- Each subtopic has a `.subtopic-hdr` with `onclick="toggleSub('sub-N')"` and a `.subtopic-body` containing `.prose`, `.bullets`, and `.link-tags`
- `.prose` sections should contain the full explanatory paragraphs pulled from study notes — not abbreviated summaries
- `.bullets` should contain key details, nuances, and sub-points
- Do NOT use `<details>/<summary>` elements, sidebar table of contents, or dependency graph visualizations
- Cross-references between concepts become `.link-tag` elements inside `.link-tags`

**Supplementary Material section:**

After the lecture progression topic-blocks, add a visually distinct "Supplementary Material" section for study notes with `type: supplementary`. Read each supplementary study note from `study-notes/` and render them using the same `.topic-block` / `.subtopic` pattern, but with these differences:
- The `.topic-eyebrow` label says "Supplementary" instead of a lecture range (e.g., "Lectures 5-7")
- Group supplementary blocks by source type where possible (e.g., "Case Studies", "Practice Problems", "Additional Readings")
- Include `.link-tag` cross-references that connect supplementary concepts back to the relevant lecture topic-blocks
- If there are no supplementary study notes, omit this section entirely

To determine which study notes are supplementary: read the `type` field from each study note's YAML frontmatter. If `type: supplementary`, it goes in this section. If `type: lecture` or `type` is absent, it goes in the main lecture progression.

#### Last-Minute Review (`last-minute-review`)

Transform `synthesis/last-minute-review.md` into styled HTML:
- Each section becomes a visually distinct card or panel
- Key terms are highlighted with `<mark>` or a styled `<span>`
- Formulas are wrapped in styled code blocks or math containers
- Lists use clear visual hierarchy with icons or numbering
- Add a `print-friendly` class that hides navigation and uses clean formatting when printed

#### Sample Questions (`sample-questions`)

Generate curated study questions from `study-notes/`:
- Read all files in `study-notes/`
- Generate 3-5 questions per `type: lecture` study note covering key concepts
- For `type: supplementary` study notes, generate 1-3 questions each, grouped in a separate "Supplementary Topics" section at the bottom
- Questions should be simpler than exam questions — focused on comprehension
- Each question has a spoiler-revealed answer using `<details><summary>Show Answer</summary>` pattern
- Group questions by lecture/topic with clear headings
- Include a mix of question types: definition, short answer, compare/contrast

---

## Step 8: Dispatch Parallel Page Agents


For each sub-PRD, dispatch a subagent using the Agent tool. Send ALL Agent calls in a single message to maximize parallelism.

Each subagent prompt must include:
1. The full sub-PRD content (read the file and embed it)
2. The template filling instructions below
3. A clear instruction to write the completed HTML to the target path from the sub-PRD

### Template Filling Instructions (embed in every subagent prompt)

```
TEMPLATE FILLING PROCESS:

1. Read the template HTML file specified in the sub-PRD.
2. Read each content source file specified in the sub-PRD.
3. For each {{PLACEHOLDER}} in the template:
   - Find the corresponding content source and transformation rule in the sub-PRD.
   - Transform the source content into valid HTML as specified.
   - Replace the placeholder string with the generated HTML.
4. Replace {{COURSE_NAME}} with the course name: "{course_name}".
5. Replace {{NAV_PLACEHOLDER}} with a <script> tag that loads js/nav.js
   and reads data/nav-config.json to render navigation.
6. Write the final HTML to the target file path from the sub-PRD.
7. Validate the output: it must contain <!DOCTYPE html>, <head>, and <body>.
   No {{PLACEHOLDER}} markers may remain in the output.
```

---

## Step 9: Verify Build

After ALL subagents complete, verify the entire build.

### 9a. File Existence

Check that every page listed in the design spec has a corresponding HTML file in `site/`. List any missing files.

### 9b. HTML Validity

Read each HTML file and confirm:
- `<!DOCTYPE html>` declaration present
- `<head>` with `<title>` and CSS link present
- `<body>` with content present
- **No remaining `{{PLACEHOLDER}}` markers** (search for `{{` in the file)

### 9c. Asset Check

Confirm these files exist and are non-empty:
- `site/css/theme.css`
- `site/js/nav.js`
- `site/js/flashcards.js`
- `site/data/flashcards.json`
- `site/data/nav-config.json`

### 9d. Error Recovery

If any verification fails:
- For missing files or unfilled placeholders: fix the issue directly by reading the relevant sub-PRD and template, then writing the corrected file. Do not re-dispatch a subagent for a single fix.
- For subagent failures (agent returned an error or produced no output): re-dispatch only the failed agent, not the entire batch.
- Log every fix made in the build summary.

### 9e. Post-Build Validation Checklist

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

### 9f. Build Summary

Output a summary in this format:

```
## Build Summary

**Course:** {course name}
**Theme:** {theme name}
**Pages built:** {count}

| Page | File | Status |
|------|------|--------|
| Home | site/index.html | OK |
| Flashcards | site/flashcards.html | OK |
| ... | ... | ... |

**Assets:** All present
**Fixes applied:** {list any corrections made, or "None"}
**Backup of previous build:** {path or "N/A"}
```

---

## Step 10: Update Pipeline Status

Update `pipeline-status.json` following the schema in `references/pipeline-status-format.md`:

- Set the `site-builder` phase entry status to `completed`
- Set `completedAt` to the current ISO 8601 timestamp
- Set `filesProduced` to the list of all files written to `site/`
- Set `currentPhase` to the next phase name
- Ensure `examCount` remains at its current value (exams are built in Phase 6)

If any verification failures could not be resolved, set status to `failed` with a descriptive `error` string and append to the `errors` array.
