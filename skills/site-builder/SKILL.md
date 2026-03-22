---
name: site-builder
description: "Use when design/design-spec.md is finalized and synthesis/ content is verified. Assembles the complete multi-page static study site by dispatching parallel subagents — one per page — then verifies the build."
---

# Site Builder

Assemble the final multi-page static study website from templates and verified content. Parse the design spec, set up the output directory, generate sub-PRDs for each page, dispatch parallel subagents to fill templates, then verify the complete build.

## Why This Skill Exists

Earlier pipeline phases produce raw content (study notes, flashcards, conceptual maps) and a design spec describing how to present it. This skill bridges the gap: it turns those artifacts into a working static site. Parallel dispatch matters because each page is independent — building them concurrently cuts wall-clock time proportionally to page count. The sub-PRD pattern gives each subagent a self-contained work order so it never needs to read the full design spec or guess which content belongs where.

---

## Precondition Checks

Before any work, verify every required input exists. Read each path and confirm it is non-empty. If anything is missing or empty, stop immediately and report exactly what is absent.

**Required files:**

| Path | Purpose |
|------|---------|
| `design/design-spec.md` | Theme, pages, course name, overrides |
| `synthesis/flashcards.json` | Flashcard data for the flashcards page |
| `synthesis/conceptual-map.md` | Content for the study map page |
| `synthesis/last-minute-review.md` | Content for the last-minute review page |
| `pipeline-status.json` | Pipeline state (must show site-designer completed) |

**Required directories (must exist and contain files):**

| Path | Purpose |
|------|---------|
| `study-notes/` | Processed lecture notes (at least one `.md` file) |
| `templates/page-templates/` | HTML page templates |
| `templates/themes/` | Theme CSS folders |
| `templates/shared-js/` | `nav.js` and `flashcards.js` |

**Error: template not found.** If the design spec references a theme folder or page template that does not exist under `templates/`, stop and report the mismatch. List available themes/templates so the user can correct the design spec.

---

## Step 1: Parse Design Spec

Read `design/design-spec.md` and extract:

- **Selected theme** — maps to a folder under `templates/themes/` (e.g., `midnight-blue`)
- **Selected pages** — which pages to build (e.g., index, flashcards, study-map, last-minute-review, sample-questions)
- **Course name** — used in page titles, headers, and nav config
- **Exam format** — card-style or classic-style (noted for later use by exam-generator; not consumed here)
- **CSS overrides** — any custom colors, fonts, or style tweaks

Validate that every selected page has a corresponding template file at `templates/page-templates/{page-name}.html`. If the design spec references a page type with no matching template, stop and report the error.

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

**If `site/` already exists:** Rename it to `site-backup-{timestamp}/` before creating the fresh directory. This preserves the previous build in case rollback is needed. Why: a clean build directory prevents stale files from prior runs from leaking into the new build, which would cause confusing verification failures.

---

## Step 3: Copy Theme CSS

Copy the selected theme CSS into the output:

- Source: `templates/themes/{selected-theme}/theme.css`
- Destination: `site/css/theme.css`

If the design spec includes CSS overrides, append them to the end of `site/css/theme.css` inside a clearly marked block:

```css
/* === Design Spec Overrides === */
/* ...override rules here... */
```

---

## Step 4: Copy Shared JavaScript

Copy shared JS files:

- `templates/shared-js/nav.js` -> `site/js/nav.js`
- `templates/shared-js/flashcards.js` -> `site/js/flashcards.js`

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

## Step 7: Generate Sub-PRDs

Why sub-PRDs: each subagent receives a single self-contained document describing exactly what to build. This eliminates ambiguity, prevents agents from reading files they do not need, and makes failures easy to diagnose — if a page is wrong, its sub-PRD contains the full specification that was used.

First, check if `build/` exists. Create it if it does not. If it exists, clear its contents.

For each page selected in the design spec, write a sub-PRD file at `build/sub-prd-{page-name}.md` containing:

1. **Target file** — output HTML path (e.g., `site/index.html`)
2. **Template source** — which template to use (e.g., `templates/page-templates/index.html`)
3. **Content sources** — which files from `study-notes/` and `synthesis/` provide content
4. **Placeholder mappings** — a table mapping each `{{PLACEHOLDER}}` in the template to its content source and transformation instructions
5. **Page-specific transform rules** — include the relevant transform section from below (only for pages that need transforms)

### Page-Specific Transform Rules to Embed in Sub-PRDs

Include the appropriate section below **only** in the sub-PRD for that page type. Do not include transform rules for page types that are not being built.

#### Study Map (`study-map`)

Transform `synthesis/conceptual-map.md` into HTML:
- Each top-level heading becomes a collapsible `<details>`/`<summary>` section
- Sub-headings become nested collapsible sections
- Bullet points become styled lists
- Cross-references between concepts become internal links
- Add an "expand all / collapse all" toggle button at the top
- Preserve any diagrams or formatted content as-is

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
- Generate 3-5 questions per lecture covering key concepts
- Questions should be simpler than exam questions — focused on comprehension
- Each question has a spoiler-revealed answer using `<details><summary>Show Answer</summary>` pattern
- Group questions by lecture/topic with clear headings
- Include a mix of question types: definition, short answer, compare/contrast

---

## Step 8: Dispatch Parallel Page Agents

Why parallel dispatch: each page is fully independent — different template, different content sources, different output file. Building them concurrently saves time proportional to the number of pages.

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

After ALL subagents complete, verify the entire build. Why: template filling is error-prone — a missing placeholder, a bad content path, or a subagent crash can silently produce broken pages.

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

### 9e. Build Summary

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
