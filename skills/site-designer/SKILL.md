---
name: site-designer
description: "Use when the content audit is complete and the design spec needs to be generated. Triggers after content-auditor completes. Reads user preferences from pipeline-status.json (gathered by the orchestrator at startup) and produces design/design-spec.md consumed by site-builder and exam-generator. Fully autonomous — no user interaction."
---

# Site Designer

Read the user's preferences from `pipeline-status.json` and produce a design specification file. The site-builder and exam-generator phases consume `design/design-spec.md` directly — every choice recorded here controls what gets built and how it looks.

**Autonomous mode:** All preferences were gathered by the orchestrator during Startup and stored in `pipeline-status.json` under `designChoices`. This phase reads those choices and writes the design spec without asking any questions.

## Precondition Check

Before starting, verify:

1. `synthesis/` directory exists with `flashcards.json` and `conceptual-map.md` — confirms Phase 2 (concept-mapper) completed.
2. `audit/audit-report.md` exists — confirms Phase 3 (content-auditor) completed.
3. `pipeline-status.json` exists, shows `content-auditor` status as `completed`, and contains a `designChoices` object with user preferences.

If `designChoices` is missing from `pipeline-status.json`, use all defaults:
- Theme: `midnight-blue`
- Exam format: `card-style`
- Pages: `["index", "study-map", "flashcards", "last-minute-review", "sample-questions", "practice-exams"]`
- Exam count: 2
- Question types: `["multiple-choice", "short-answer"]`
- Questions per exam: 30
- Style: `visual`
- Detail: `moderate`
- Organization: `default`

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

## Step 1: Read Preferences

Read `designChoices` from `pipeline-status.json`. Extract:
- `theme` — maps to a folder under `templates/themes/`
- `examFormat` — `card-style` or `classic-style`
- `pages` — list of page identifiers
- `examCount` — number of practice exams
- `questionTypes` — list of question type identifiers
- `questionsPerExam` — number of questions per exam
- `learningPreferences.style` — `visual`, `reading`, or `practice`
- `learningPreferences.detail` — `brief`, `moderate`, or `comprehensive`
- `learningPreferences.organization` — user's organization preference or `default`

The `index` page is always included regardless of the `pages` list.

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
- Summary of all choices applied (theme, format, pages, exam config, preferences).
- Source of choices: `pipeline-status.json` designChoices (gathered at startup).
