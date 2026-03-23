---
name: site-designer
description: "Use when the content audit is complete and the design spec needs to be generated. Triggers after content-auditor completes. Asks the user for design preferences and produces design/design-spec.md consumed by site-builder and exam-generator."
---

# Site Designer

Ask the user for their design preferences and produce a design specification file. The site-builder and exam-generator phases consume `design/design-spec.md` directly — every choice recorded here controls what gets built and how it looks.

## Precondition Check

Before starting, verify:

1. `synthesis/` directory exists with `flashcards.json` and `conceptual-map.md` — confirms Phase 2 (concept-mapper) completed.
2. `audit/audit-report.md` exists — confirms Phase 3 (content-auditor) completed.

If any prerequisite is missing, stop and report which prior phase needs to run first.

If `designChoices` already exists in `pipeline-status.json` (e.g., the user provided preferences at startup or this phase is being re-run), use those values as defaults in the questions below — the user can confirm or change them.

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

## Step 1: Gather Design Preferences

Ask the user for their preferences. Present all questions together so they can answer at once:

```
Almost ready to build! I just need a few design choices first. Answer all at once or skip any to use the default.

1. **Theme** — Choose a visual theme:
   - Midnight Blue (default) — Dark navy with bright accents
   - Forest Green — Natural greens with earth tones
   - Slate Minimal — Clean grays with minimal decoration
   - Sunset Coral — Warm coral and orange tones
   - Warm Ivory — Light cream with soft accents

2. **Exam format** — How should practice exams look?
   - Card Style (default) — One question at a time with smooth transitions
   - Classic Style — All questions on one scrollable page

3. **Pages** — Which pages to include? (default: all)
   - Home, Study Map, Flashcards, Last-Minute Review, Sample Questions, Practice Exams

4. **Exam config** (if Practice Exams selected):
   - How many practice exams? (1–5, default: 2)
   - Question types? (Multiple Choice, Multiple-Multiple Choice, Short Answer, Long Answer; default: MC + Short Answer)
   - Questions per exam? (20–50, default: 30)

5. **Study preferences:**
   - Style: Visual (default) / Reading / Practice
   - Detail level: Brief / Moderate (default) / Comprehensive
   - Organization: By lecture (default) / By theme / Alphabetical

Defaults are shown in parentheses — just say "defaults" to use them all.
```

If the user says "defaults" or equivalent, use all default values without further questions.

**Default values:**
- Theme: `midnight-blue`
- Exam format: `card-style`
- Pages: `["index", "study-map", "flashcards", "last-minute-review", "sample-questions", "practice-exams"]`
- Exam count: 2
- Question types: `["multiple-choice", "short-answer"]`
- Questions per exam: 30
- Style: `visual`
- Detail: `moderate`
- Organization: `default`

**Validation:** If any value is outside its valid range (exam count > 5, questions > 50), explain the constraint and use the nearest valid value rather than re-asking.

## Step 2: Design Spec Output

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

Also populate the top-level `designChoices` object in `pipeline-status.json` with all the user's choices (so the pipeline can resume correctly if interrupted):

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
- Summary of all choices applied (theme, format, pages, exam config, preferences).
