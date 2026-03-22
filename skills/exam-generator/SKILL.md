---
name: exam-generator
description: |
  Triggered by Phase 6 orchestration OR standalone `/study-site add-exam`.
  Generates practice exams with source-verified answers from study-notes/.
  Students depend on these exams for test prep — every answer must be traceable
  to the notes. Outputs exam JSON, HTML page, and updated navigation.
---

# Exam Generator

Generate practice exams with verified answers from study notes. This skill has
two entry points — detect which one applies and follow the corresponding path.

**Why verification matters.** Students use these exams to prepare for real tests.
A hallucinated answer or a subtly wrong distractor teaches the wrong thing and
erodes trust in the entire site. Every answer must be traceable to the source
notes. The self-audit pass exists to catch anything the first verification missed.

**Why 60/40 focus-area weighting.** When a student requests focus areas, they
want emphasis, not tunnel vision. 60% on focus topics gives targeted practice
while 40% across remaining material prevents blind spots on exam day.

---

## Precondition Checks

Run these before anything else. Stop with a clear error if any check fails.

1. **study-notes/ exists and is non-empty.** If missing or empty, stop:
   _"No study notes found. Run the content-ingest phase first."_
2. **Concurrency guard.** Read `pipeline-status.json`. If the `exam-generator`
   phase status is `in-progress`, stop: _"An exam generation is already running.
   Wait for it to finish or reset its status before starting another."_
3. **Template files exist.** Confirm the required exam format template is present
   at `templates/exam-formats/{card-style|classic-style}.html`. If missing, stop
   with the specific path that could not be found.

---

## Entry Path A: Standalone (`/study-site add-exam`)

Use this path when invoked directly by the user, outside orchestrator context.

1. Read `pipeline-status.json` (schema: `references/pipeline-status-format.md`).
   If the file does not exist or the `site-builder` phase status is not
   `completed`, stop: _"The site must be built first. Run `/study-site build`."_
2. Read current `examCount` to determine next exam number N.
3. Read `designChoices` for theme, exam format (card-style or classic-style),
   and question types.
4. Ask the user:
   - **Focus areas** — specific lectures or topics to emphasize, or "balanced"
     for even coverage.
   - **Question count** — default 30, suggest range 20-50, maximum 60.
   - **Difficulty preference** — standard distribution (30/50/20) or a custom
     skew toward harder or easier.
5. Proceed to Step 1: Question Generation.

## Entry Path B: Phase 6 (orchestrator)

Use this path when called by the orchestrator during a full pipeline run.

1. Read `design/design-spec.md` for exam format, default question count,
   difficulty settings, and any specified focus areas.
2. Read `pipeline-status.json` and set exam number N from `examCount + 1`.
3. Set `exam-generator` phase status to `in-progress` in `pipeline-status.json`.
4. Proceed to Step 1: Question Generation.

---

## Step 1: Question Generation

Read every file in `study-notes/`. For each file:

1. Parse the full content and identify key concepts, definitions, formulas,
   processes, and relationships.
2. If a study-notes file is malformed (no frontmatter, empty body, or
   unparseable), log a warning and skip it. Do not halt the entire generation.

Generate questions following these rules:

- **Difficulty distribution** — 30% easy, 50% medium, 20% hard.
  - Easy: definitions, recall, basic identification.
  - Medium: application, comparison, multi-step calculation, short analysis.
  - Hard: synthesis, scenario-based reasoning, multi-concept problems.
- **Question types** — use only types listed in `designChoices.questionTypes`
  (from pipeline-status.json or design spec). Types defined in
  `references/exam-format.md`: `multiple-choice`, `multiple-multiple-choice`,
  `short-answer`, `long-answer`.
- **Coverage** — if no focus areas, distribute questions evenly across all
  lectures. If focus areas were specified, weight 60% of questions toward those
  topics and 40% across remaining material.
- **Question cap** — never exceed 60 questions per exam regardless of user
  request. If the user asks for more, explain the cap and proceed with 60.
- **Balance** — no single lecture should account for more than 40% of total
  questions unless there are only two or lectures in the focus set.

Tag each question with: `sourceLecture`, `difficulty`, `type`, and an `id`
following the `examId-q-NNN` format from `references/exam-format.md`.

## Step 2: Answer Verification

**This step is not optional.** For every generated question:

1. Re-read the relevant section of the source study note.
2. Confirm the correct answer is factually supported by the notes.
3. For multiple-choice / multiple-multiple-choice: verify every distractor is
   clearly wrong based on the material and that distractors are plausible.
4. For short-answer: verify the expected answer and acceptable keywords match
   what the notes teach.
5. For long-answer: verify the sample answer and every grading criterion against
   the notes.

Set a `verified` flag on each question:
- `true` — answer is clearly supported by the study notes.
- `false` — answer could not be fully confirmed. Attach a `verificationNote`
  explaining the uncertainty.

## Step 3: Self-Audit Pass

After verification, perform a second independent review. This catches errors the
first pass normalized — a fresh look with skeptical eyes.

1. Collect all questions where `verified` is `false`.
2. Collect any questions where the answer is ambiguous or debatable.
3. For each flagged item, present to the user:
   - The question text.
   - The proposed answer.
   - The verification note explaining the concern.
   - The relevant excerpt from the study notes.
4. Ask the user to **confirm**, **modify**, or **remove** each flagged question.
5. Apply the user's decisions. Remove any question the user rejects.

If no items are flagged, report: _"All N questions verified against source
material — no flags."_

## Step 4: Write Exam Data File

Write the exam JSON to `site/data/exam-{N}.json` conforming exactly to the
schema in `references/exam-format.md`. Key requirements from that schema:

- `examId`: unique, kebab-case.
- `metadata.totalQuestions` must equal `questions.length`.
- `metadata.questionTypes` counts must match actual type counts.
- `metadata.verifiedAgainstNotes` must be `true` (all unverified questions were
  resolved or removed in Step 3).
- `metadata.generatedAt`: ISO 8601 UTC timestamp.

## Step 5: Generate Exam HTML Page

1. Select the template based on exam format:
   - `templates/exam-formats/card-style.html`
   - `templates/exam-formats/classic-style.html`
2. Read the template. If it does not exist, stop with a clear error.
3. Replace all `{{PLACEHOLDER}}` markers:
   - `{{EXAM_NUMBER}}` — N
   - `{{EXAM_TITLE}}` — "Practice Exam N" or a descriptive title if focus areas
     were specified
   - `{{EXAM_DATA_PATH}}` — `data/exam-{N}.json`
   - `{{COURSE_NAME}}` — from `pipeline-status.json` `courseName`
   - `{{QUESTION_COUNT}}` — total questions
   - `{{NAV_PLACEHOLDER}}` — navigation script tag
   - Any other placeholders defined in the template
4. Write to `site/exams/practice-exam-{N}.html`.

## Step 6: Update Navigation

1. Read `site/data/nav-config.json`. If missing, stop: _"nav-config.json not
   found. The site structure may be incomplete. Run `/study-site build`."_
2. Find the "Exams" section in the navigation structure.
3. Append a new entry:
   - Title: "Practice Exam N" (or descriptive title).
   - Path: `exams/practice-exam-{N}.html`.
4. Write the updated JSON back.

## Step 7: Update Pipeline Status

1. Read `pipeline-status.json`.
2. Increment `examCount` by 1.
3. Add an entry to the exam-generator phase `filesProduced` array:
   - `site/data/exam-{N}.json`
   - `site/exams/practice-exam-{N}.html`
4. Record `completedAt` timestamp on the exam-generator phase.
5. If in Phase 6 mode, set phase status to `completed`.
6. Write the updated `pipeline-status.json`.

---

## Completion Report

When finished, output a structured report in this exact format:

```
## Exam Generation Complete

**Exam:** Practice Exam {N} — {title if focus areas, or "Comprehensive"}
**File:** site/data/exam-{N}.json
**Page:** site/exams/practice-exam-{N}.html

### Question Breakdown
- Total: {count}
- Easy: {count} ({percent}%) | Medium: {count} ({percent}%) | Hard: {count} ({percent}%)
- Multiple Choice: {count} | Multiple-Multiple: {count} | Short Answer: {count} | Long Answer: {count}

### Verification
- Verified: {count}/{total}
- Flagged and resolved: {count}
- Removed by user: {count}

### Updates
- Navigation: site/data/nav-config.json updated
- Pipeline: pipeline-status.json examCount = {new count}
```
