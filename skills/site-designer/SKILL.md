---
name: site-designer
description: "Use when the content audit is complete and user preferences are needed before building the site. Triggers after content-auditor completes. Gathers theme, exam format, page selection, exam configuration, and learning style preferences through interactive questions. Produces design/design-spec.md consumed by site-builder and exam-generator."
---

# Site Designer

Gather the user's preferences for their study site through structured questions, then produce a design specification file. The site-builder and exam-generator phases consume `design/design-spec.md` directly — every choice recorded here controls what gets built and how it looks.

## Precondition Check

Before starting, verify:

1. `synthesis/` directory exists with `flashcards.json` and `conceptual-map.md` — confirms Phase 2 (concept-mapper) completed.
2. `audit/audit-report.md` exists — confirms Phase 3 (content-auditor) completed.
3. `pipeline-status.json` exists and shows `content-auditor` status as `completed`.

If any prerequisite is missing, stop and report which prior phase needs to run first.

## Pipeline Status Update: Start

Read `pipeline-status.json`. Update the `site-designer` phase entry:

```json
{
  "name": "site-designer",
  "status": "in-progress",
  "startedAt": "<current ISO 8601 timestamp>"
}
```

Set `currentPhase` to `"site-designer"`.

## Quick-Start Defaults Path

Before asking individual questions, offer the user a fast track:

"I need a few preferences to design your study site. You can either:

**A) Use defaults** — I will use Midnight Blue theme, card-style exams, all pages, 2 practice exams with 30 questions each (MC + Short Answer), visual style, moderate detail. I will generate the design spec immediately.

**B) Customize** — I will walk you through each choice (theme, exam format, pages, exam config, learning style).

Which would you prefer?"

If the user chooses defaults (or says something like "just go", "defaults", "whatever works"), skip to Step 6 using these default values:
- Theme: `midnight-blue`
- Exam format: `card-style`
- Pages: `["index", "study-map", "flashcards", "last-minute-review", "sample-questions", "practice-exams"]`
- Exam count: 2
- Question types: `["multiple-choice", "short-answer"]`
- Questions per exam: 30
- Style: `visual`
- Detail: `moderate`
- Organization: `default`

If the user provides all their preferences in a single message (e.g., "dark theme, classic exams, 3 exams, 40 questions, all pages"), extract each answer, confirm the interpretation, and skip to Step 6. Do not force them through each step individually.

## Step 1: Theme Presentation

Read the `preview.md` file from each theme folder in `templates/themes/`:
- `templates/themes/midnight-blue/preview.md`
- `templates/themes/forest-green/preview.md`
- `templates/themes/slate-minimal/preview.md`
- `templates/themes/sunset-coral/preview.md`
- `templates/themes/warm-ivory/preview.md`

If a theme folder is missing its `preview.md`, describe it based on the folder name (e.g., "A coral-toned warm theme" for sunset-coral).

Present all themes to the user with descriptions from the preview files:

"Choose a theme for your study site:

1. **Midnight Blue** — {description from preview.md}
2. **Forest Green** — {description from preview.md}
3. **Slate Minimal** — {description from preview.md}
4. **Sunset Coral** — {description from preview.md}
5. **Warm Ivory** — {description from preview.md}

Which theme would you like? (Default: Midnight Blue)"

Record the user's choice. Store the theme folder name (e.g., `midnight-blue`).

## Step 2: Exam Format Selection

Present the two exam format options:

"Choose an exam format for your practice exams:

1. **Card Style** — Each question appears on its own card with smooth transitions. Best for focused, one-at-a-time study.
2. **Classic Style** — All questions visible on one scrollable page with standard radio buttons and checkboxes. Familiar exam-room feel.

Which format would you prefer? (Default: Card Style)"

Record the choice. Store as `card-style` or `classic-style`. The site-builder uses this value to select which HTML template to apply for practice exam pages.

## Step 3: Page Selection

Present the available pages:

"Select which pages to include in your study site (all are selected by default):

1. **Home** (always included) — Landing page with course overview and navigation
2. **Study Map** — Visual conceptual map showing how topics connect across lectures
3. **Flashcards** — Interactive flashcard viewer for all key terms and definitions
4. **Last-Minute Review** — Condensed review sheet for quick pre-exam refresher
5. **Sample Questions** — Topic-by-topic practice questions with explanations
6. **Practice Exams** — Full-length timed practice exams simulating real test conditions

Which pages would you like to include? (Default: all)"

Record selections as a list of page identifiers: `["index", "study-map", "flashcards", "last-minute-review", "sample-questions", "practice-exams"]`. The `index` page is always included regardless of selection.

## Step 4: Exam Configuration

If the user selected Practice Exams or Sample Questions in Step 3, ask about exam configuration:

"Configure your practice exams:

**How many practice exams?** (1-5, default: 2)

**What question types?** (select all that apply)
- Multiple Choice (MC) — Single correct answer from 4-5 options
- Multiple Multiple Choice (MMC) — Multiple correct answers, "select all that apply"
- Short Answer — Brief written response (1-3 sentences)
- Long Answer — Extended written response (paragraph-length)

Default: Multiple Choice and Short Answer

**How many questions per exam?** (20-50, default: 30)"

Validation:
- **Exam count:** If the user enters 0, confirm they want no practice exams — if so, deselect the Practice Exams page. If they enter more than 5, explain that 5 is the maximum (generating more than 5 high-quality exams from a single course's content risks repetitive questions) and ask them to pick a number between 1 and 5.
- **Questions per exam:** If outside 20-50, explain the range and ask for a value within it.

If the user did not select Practice Exams or Sample Questions, skip this step entirely and use: 0 exams, no question types, 0 questions per exam.

## Step 5: Learning Style Preferences

Ask about learning preferences:

"A few questions about your study preferences:

**Study style:**
1. **Visual** — Emphasize diagrams, charts, color-coding, and spatial layouts
2. **Reading** — Emphasize detailed text explanations and written summaries
3. **Practice** — Emphasize worked examples, practice problems, and self-testing

**Level of detail:**
1. **Brief** — Key points only, minimal elaboration
2. **Moderate** — Balanced coverage with essential explanations
3. **Comprehensive** — Full detail with extended explanations and examples

**Organization preference?** (e.g., chronological by lecture, grouped by theme, alphabetical by topic, or 'default')

Defaults: Visual, Moderate, Default organization"

Record all preferences. The site-builder uses `style` to weight content types (e.g., visual mode adds more diagrams), `detail` to control page length, and `organization` to determine sort order.

## Step 6: Design Spec Output

Create the `design/` directory if it does not exist.

Write `design/design-spec.md` with this exact structure:

```markdown
---
type: design-spec
generatedAt: <ISO 8601 timestamp>
phase: site-designer
---

# Design Specification

## Theme
{theme-folder-name}

## Exam Format
{card-style or classic-style}

## Pages
{comma-separated list of page identifiers, e.g., index, study-map, flashcards, last-minute-review, sample-questions, practice-exams}

## Exam Configuration
- Count: {number of practice exams}
- Types: {comma-separated list of question types, e.g., multiple-choice, multiple-multiple-choice, short-answer, long-answer}
- Questions per exam: {number}

## Learning Preferences
- Style: {visual, reading, or practice}
- Detail: {brief, moderate, or comprehensive}
- Organization: {user's preference or "default"}
```

Formatting rules:
- Use the exact section headers shown above. The site-builder and exam-generator parse these headers to extract values.
- Theme value: folder name (lowercase, hyphenated).
- Page identifiers: lowercase, hyphenated.
- Question types: lowercase, hyphenated.
- Do not add extra sections or commentary — this file is machine-consumed.

## Pipeline Status Update: Complete

Update `pipeline-status.json`. Set the `site-designer` phase entry:

```json
{
  "name": "site-designer",
  "status": "completed",
  "completedAt": "<current ISO 8601 timestamp>",
  "filesProduced": ["design/design-spec.md"]
}
```

Also populate the top-level `designChoices` object in `pipeline-status.json` with all the user's choices:

```json
{
  "designChoices": {
    "theme": "{theme-folder-name}",
    "examFormat": "{card-style or classic-style}",
    "pages": ["{page-ids}"],
    "examCount": {number},
    "questionsPerExam": {number},
    "questionTypes": ["{types}"],
    "learningPreferences": {
      "style": "{style}",
      "detail": "{detail}",
      "organization": "{organization}"
    }
  }
}
```

## Completion Report

When `design/design-spec.md` has been written, report:
- Confirmation that the design spec was created at `design/design-spec.md`.
- Summary of all choices made (theme, format, pages, exam config, preferences).
- Whether defaults or custom choices were used.
