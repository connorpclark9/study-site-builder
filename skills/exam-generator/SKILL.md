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

---

## Precondition Checks

Run these before anything else. Stop with a clear error if any check fails.

1. **study-notes/ exists and is non-empty.** If missing or empty, stop:
   _"No study notes found. Run the content-ingest phase first."_
2. **Concurrency guard.** Read `pipeline-status.json`. If the `exam-generator`
   phase status is `in-progress`, stop: _"An exam generation is already running.
   Wait for it to finish or reset its status before starting another."_
3. **Template files exist.** Read `pluginDir` from `pipeline-status.json` to
   locate the plugin's template directory. Confirm the required exam format
   template is present at `{pluginDir}/templates/exam-formats/{card-style|classic-style}/exam-template.html`.
   Each format also has `exam-styles.css` and `exam-checker.js` in the same
   directory. If missing, stop with the specific path that could not be found.

---

## Entry Path A: Standalone (`/study-site add-exam`)

Use this path when invoked directly by the user, outside orchestrator context.

1. Read `pipeline-status.json` (schema: `references/pipeline-status-format.md`).
   If the file does not exist or the `site-builder` phase status is not
   `completed`, stop: _"The site must be built first. Run `/study-site build`."_
2. Read current `examCount` to determine next exam number N.
3. Read `designChoices` for theme, exam format (card-style or classic-style),
   question types, and questions per exam.
4. Use defaults for standalone invocation:
   - **Focus areas:** balanced (even coverage across all lectures).
   - **Question count:** from `designChoices.questionsPerExam` (default 30).
   - **Difficulty preference:** standard distribution (30/50/20).
   - If the user provided specific parameters in their invocation command
     (e.g., `/study-site add-exam focus:lectures 1-3`), use those instead.
5. Proceed to Step 1: Question Generation.

## Entry Path B: Phase 6 (orchestrator)

Use this path when called by the orchestrator during a full pipeline run. Generates all exams in parallel.

### B1: Setup

1. Read `design/design-spec.md` — extract `examCount` (number of exams to generate), exam format, question types, and questions per exam.
2. Read `pipeline-status.json` — get `pluginDir`, `courseName`, and current `examCount` (should be 0 at this point).
3. Set `exam-generator` phase status to `in-progress` in `pipeline-status.json`.
4. Glob `study-notes/*.md` and read only the frontmatter of each file (first 20 lines) to get `title`, `type`, and `lecture_number`. Separate into lecture notes and supplementary notes.

### B2: Calculate Focus Distribution

Distribute lecture coverage across exams so each exam draws from different parts of the course. This ensures variety — students get meaningfully different practice each time.

Sort lecture notes by `lecture_number`. Assign each lecture to an exam using round-robin (lecture i → exam `(i-1) mod N + 1`):

- 8 lectures, 2 exams → Exam 1: lectures 1,3,5,7 | Exam 2: lectures 2,4,6,8
- 9 lectures, 3 exams → Exam 1: lectures 1,4,7 | Exam 2: lectures 2,5,8 | Exam 3: lectures 3,6,9

Each exam: 60% of questions from its assigned lectures, 40% spread evenly across all other lecture notes. Supplementary notes contribute to all exams equally (up to 10% each, drawn from the 40% pool).

If `examCount` is 1, skip focus distribution — use balanced coverage.

### B3: Copy Shared Assets (Once)

Before dispatching agents, copy exam assets to `site/` once in the main agent:
- `{pluginDir}/templates/exam-formats/{format}/exam-styles.css` → `site/css/exam-styles.css`
- `{pluginDir}/templates/exam-formats/{format}/exam-checker.js` → `site/js/exam-checker.js`

### B4: Dispatch All Exam Agents in Parallel

Send ALL Agent calls in a single message. Each agent generates one complete exam (questions + JSON + HTML) and writes its output files directly.

For each exam number N (1 through examCount), dispatch a subagent with this prompt (fill in bracketed values):

````
Generate Practice Exam [N] for [courseName].

Parameters:
- Exam number: [N]
- Exam ID: practice-exam-[N]
- Question count: [questionsPerExam]
- Question types: [comma-separated list, e.g., multiple-choice, short-answer]
- Exam format: [card-style or classic-style]
- pluginDir: [absolute path]
- Course name: [courseName]
- Focus lectures: [comma-separated lecture_numbers, e.g., 1,3,5,7]
  — draw 60% of questions from these lectures, 40% from all others
- Output files:
  - JSON: site/data/exam-[N].json
  - HTML: site/exams/practice-exam-[N].html

STEP 1 — Generate and verify questions (single pass per note):
Process each study note in study-notes/ one at a time: read it, generate its
allocated questions, verify each immediately before moving to the next note.

Question allocation:
- Focus lectures get 60% of total questions, distributed evenly among them.
- All other lecture notes share 40%, distributed evenly.
- Supplementary notes (type: supplementary) contribute up to 10% each from the
  40% pool. If no supplementary notes, allocate 100% to lectures.
- No single lecture >40% of total unless only 2 lectures in the focus set.
- Question cap: never exceed 60 questions total.

For each note (read → generate → verify before moving on):
1. Read the study note completely.
2. Generate this note's allocated questions:
   - Difficulty: 30% easy (definitions, recall), 50% medium (application,
     comparison, calculation), 20% hard (synthesis, scenario-based).
   - Use only the question types listed in the Parameters above.
   - Tag each question: sourceLecture, difficulty, type,
     id format: exam-[N]-q-NNN (three-digit sequence).
3. Verify each question immediately:
   - Correct answer explicitly supported by note content just read.
   - MC/MMC: every distractor clearly wrong and plausible.
   - Short answer: expected answer and keywords match note content.
   - Long answer: sample answer and grading criteria match note content.
   - Set verified: true or verified: false with verificationNote.

STEP 2 — Self-audit:
Collect verified:false questions and ambiguous answers. Auto-resolve:
- Answer not found in notes → remove the question.
- Ambiguous but partially supported → rewrite to eliminate ambiguity, or remove.
- Distractor arguably correct → replace with clearly wrong alternative.
Log all resolutions in autoResolvedFlags.
If count drops below 80% of target, generate replacements from
under-represented lectures and verify them before including.

STEP 3 — Write site/data/exam-[N].json:
Follow references/exam-format.md exactly.
- examId: "practice-exam-[N]"
- metadata.totalQuestions must equal questions.length
- metadata.verifiedAgainstNotes: true
- metadata.generatedAt: ISO 8601 UTC timestamp

STEP 4 — Write site/exams/practice-exam-[N].html:
Read template: [pluginDir]/templates/exam-formats/[format]/exam-template.html
Replace placeholders:
- {{EXAM_NUMBER}} → [N]
- {{EXAM_TITLE}} → "Practice Exam [N]"
- {{EXAM_DATA_PATH}} → data/exam-[N].json
- {{COURSE_NAME}} → [courseName]
- {{QUESTION_COUNT}} → total question count
- {{NAV_PLACEHOLDER}} → <script src="../js/nav.js"></script>
Write completed HTML to site/exams/practice-exam-[N].html.

Do NOT update nav-config.json or pipeline-status.json.

Report when complete: exam number, total questions, verified count, files written.
````

### B5: Post-Dispatch — Nav and Status (Main Agent)

After all exam agents complete:

1. Read `site/data/nav-config.json`.
2. Confirm a `"practice-exams"` core page entry exists. If not, add: `{ "id": "practice-exams", "title": "Practice Exams", "path": "practice-exams.html", "type": "core" }`.
3. Do NOT add individual exam entries to the nav config — they are linked from the landing page.
4. If `practice-exams.html` does not exist in `site/`, generate it from `{pluginDir}/templates/page-templates/practice-exams.html`, listing all exams as cards linking to `exams/practice-exam-N.html`.
5. Write nav-config.json.
6. Update `pipeline-status.json`: set `examCount` to total exams generated, add all produced files to `filesProduced`, set phase status to `completed`, record `completedAt`.

---

## Entry Path A: Per-Exam Steps (Standalone)

When Entry Path A is used, execute these steps sequentially for the single exam being generated.

### Step 1: Question Generation and Verification (Single Pass)

Process one study note at a time: read it, generate its questions, verify each immediately before moving to the next note.

**Before starting**, determine how many questions each note should contribute:
- Read the `type` field from each study note's frontmatter (if absent, treat as `lecture`).
- **No focus areas:** Allocate 80% to `type: lecture` notes (evenly distributed) and 20% to `type: supplementary` notes. If no supplementary notes, allocate 100% to lectures.
- **With focus areas:** Weight 60% toward focus topics and 40% across remaining material.
- **Question cap** — never exceed 60 questions.
- **Balance** — no single lecture >40% of total; no single supplementary note >10%.

**For each study note (read → generate → verify before moving on):**

1. Read the study note completely.
2. Identify key concepts, definitions, formulas, processes, and relationships.
3. Generate this note's allocated questions:
   - **Difficulty:** 30% easy, 50% medium, 20% hard.
   - **Question types:** use only types from `designChoices.questionTypes`. Types defined in `references/exam-format.md`.
   - Tag each question: `sourceLecture`, `difficulty`, `type`, `id` in `examId-q-NNN` format.
4. **Verify each question immediately:**
   - Correct answer explicitly supported by content just read.
   - MC/MMC: every distractor clearly wrong and plausible.
   - Short answer: expected answer and keywords match note content.
   - Long answer: sample answer and grading criteria match note content.
   - Set `verified: true` or `verified: false` with `verificationNote`.
5. Move to the next study note.

### Step 2: Self-Audit Pass

1. Collect all `verified: false` questions and ambiguous answers.
2. Auto-resolve each:
   - **Answer not found:** Remove the question.
   - **Ambiguous but partially supported:** Rewrite to eliminate ambiguity, or remove.
   - **Distractor arguably correct:** Replace with a clearly wrong alternative.
3. Log all resolutions in `autoResolvedFlags`.
4. If count drops below 80% of target, generate replacements from under-represented lectures and verify them.

If no flags: _"All N questions verified — no flags."_

### Step 3: Write Exam Data File

Write `site/data/exam-{N}.json` per `references/exam-format.md`:
- `examId`: unique, kebab-case.
- `metadata.totalQuestions` must equal `questions.length`.
- `metadata.verifiedAgainstNotes`: `true`.
- `metadata.generatedAt`: ISO 8601 UTC.

### Step 4: Generate Exam HTML Page

1. Read template: `{pluginDir}/templates/exam-formats/{format}/exam-template.html`
2. Copy `exam-styles.css` → `site/css/exam-styles.css` and `exam-checker.js` → `site/js/exam-checker.js` if not already present.
3. Replace placeholders: `{{EXAM_NUMBER}}`, `{{EXAM_TITLE}}`, `{{EXAM_DATA_PATH}}`, `{{COURSE_NAME}}`, `{{QUESTION_COUNT}}`, `{{NAV_PLACEHOLDER}}`.
4. Write to `site/exams/practice-exam-{N}.html`.

### Step 5: Update Navigation

1. Read `site/data/nav-config.json`.
2. Confirm `"practice-exams"` core page entry exists; add it if missing.
3. Do NOT add individual exam entries to the nav.
4. If `practice-exams.html` does not exist, generate it listing all exams.
5. Write nav-config.json.

### Step 6: Update Pipeline Status

1. Read `pipeline-status.json`.
2. Increment `examCount` by 1.
3. Add `site/data/exam-{N}.json` and `site/exams/practice-exam-{N}.html` to `filesProduced`.
4. Record `completedAt`. Write `pipeline-status.json`.

---

## Completion Report

```
## Exam Generation Complete

**Exams generated:** [N] ([exam-1, exam-2, ...])
**Total questions:** [count across all exams]

| Exam | Questions | Verified | Flags resolved | Focus lectures |
|------|-----------|----------|---------------|----------------|
| Practice Exam 1 | {count} | {count} | {count} | Lectures {list} |
| Practice Exam 2 | {count} | {count} | {count} | Lectures {list} |

**Files written:** site/data/exam-N.json, site/exams/practice-exam-N.html (× N)
**Navigation:** site/data/nav-config.json updated
**Pipeline:** pipeline-status.json examCount = {final count}
```
