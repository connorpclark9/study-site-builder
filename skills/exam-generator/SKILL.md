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

### B2: Calculate Focus Distribution and Write Allocation Manifests

Distribute lecture coverage across exams so each exam draws from different parts of the course. This ensures variety — students get meaningfully different practice each time.

Sort lecture notes by `lecture_number`. Assign each lecture to an exam using round-robin (lecture i → exam `(i-1) mod N + 1`):

- 8 lectures, 2 exams → Exam 1: lectures 1,3,5,7 | Exam 2: lectures 2,4,6,8
- 9 lectures, 3 exams → Exam 1: lectures 1,4,7 | Exam 2: lectures 2,5,8 | Exam 3: lectures 3,6,9

Each exam: 60% of questions from its assigned lectures, 40% spread evenly across all other lecture notes. Supplementary notes contribute to all exams equally (up to 10% each, drawn from the 40% pool).

If `examCount` is 1, skip focus distribution — use balanced coverage (evenly distribute questions across all notes).

**After calculating distribution, compute exact per-note question counts and write one manifest file per exam.** This is what allows each exam agent to read only the study notes it needs, rather than all notes.

For each exam N, write `build/exam-[N]-manifest.json` with this structure:

```json
{
  "examNumber": 1,
  "totalQuestions": 30,
  "allocations": [
    {
      "file": "study-notes/lecture-01-foundations.md",
      "questionsToGenerate": 5,
      "role": "focus"
    },
    {
      "file": "study-notes/lecture-03-capacity.md",
      "questionsToGenerate": 3,
      "role": "other"
    },
    {
      "file": "study-notes/supplementary-costing.md",
      "questionsToGenerate": 2,
      "role": "supplementary"
    }
  ]
}
```

Rules for manifest construction:
- Round question counts to whole numbers; adjust the largest allocation to absorb any rounding remainder so total equals `questionsPerExam` exactly.
- Omit any study note with a computed allocation of 0 questions — exam agents must not read notes that contribute nothing.
- List allocations in the order agents should read them: focus notes first, then other lecture notes, then supplementary notes.

Create `build/` if it does not already exist. Write all exam manifests before dispatching any agents.

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
- Question types: [comma-separated list, e.g., multiple-choice, short-answer]
- Exam format: [card-style or classic-style]
- pluginDir: [absolute path]
- Course name: [courseName]
- Manifest: build/exam-[N]-manifest.json
- Output files:
  - JSON: site/data/exam-[N].json
  - HTML: site/exams/practice-exam-[N].html

STEP 0 — Read your manifest (do this first, before opening any study note):
Read build/exam-[N]-manifest.json. This tells you exactly which study notes to
read and how many questions to generate from each. Do NOT read any study note
that is not listed in the manifest — those notes contribute 0 questions to this
exam and reading them wastes context.

Your total question target is manifest.totalQuestions.

STEP 1 — Generate and verify questions (work through manifest allocations in order):
For each entry in manifest.allocations (read → generate → verify before moving on):

1. Read the study note at the listed file path. Read it once and completely.
   Do not re-read it after this step.
2. Generate exactly the number of questions specified in questionsToGenerate:
   - Difficulty: 30% easy (definitions, recall), 50% medium (application,
     comparison, calculation), 20% hard (synthesis, scenario-based).
     Round to nearest whole number; apply any remainder to medium questions.
   - Use only the question types listed in the Parameters above.
   - Tag each question: sourceLecture, difficulty, type,
     id format: exam-[N]-q-NNN (three-digit, sequential across the whole exam).
3. Verify each question immediately after generating it:
   - Correct answer explicitly supported by note content just read.
   - MC/MMC: every distractor clearly wrong and plausible.
   - Short answer: expected answer and keywords match note content.
   - Long answer: sample answer and grading criteria match note content.
   - Set verified: true or verified: false with verificationNote.
4. Move to the next allocation entry.

STEP 2 — Self-audit:
Collect verified:false questions and ambiguous answers. Auto-resolve:
- Answer not found in notes → remove the question.
- Ambiguous but partially supported → rewrite to eliminate ambiguity, or remove.
- Distractor arguably correct → replace with clearly wrong alternative.
Log all resolutions in autoResolvedFlags.
If total verified count drops below 80% of manifest.totalQuestions, generate
replacements drawn from the focus-role notes (re-read only if necessary) and
verify them before including. Do not generate more than needed to reach 80%.

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

### Step 0: Build Allocation Plan (Read Frontmatter Only)

Before reading any study note in full, build a question allocation plan so you only read the notes you actually need.

1. Glob `study-notes/*.md`. For each file, read only the frontmatter (first 20 lines) to get `type` and `lecture_number`. Do not read the full note body yet.
2. Separate into `lecture` notes and `supplementary` notes.
3. Compute per-note question counts:
   - **No focus areas:** Allocate 80% of `questionsPerExam` to lecture notes (evenly distributed) and up to 10% per supplementary note from the remaining 20%. If no supplementary notes, allocate 100% to lectures.
   - **With focus areas (user specified):** Weight 60% toward named focus lectures and 40% across remaining lecture notes. Supplementary notes contribute up to 10% each from the 40% pool.
   - **Question cap** — never exceed 60 questions total.
   - **Balance** — no single lecture >40% of total; no single supplementary note >10%.
4. Round all counts to whole numbers. Adjust the largest allocation so the total equals `questionsPerExam` exactly.
5. **Drop any note with a computed allocation of 0 questions from the reading list.** These notes will not be read.
6. Record the final plan as an ordered list: `[{ file, questionsToGenerate, role }]`. Order: focus notes first, then other lecture notes, then supplementary.

### Step 1: Question Generation and Verification (Single Pass)

Work through the allocation plan from Step 0 in order. For each entry (read → generate → verify before moving on):

1. Read the study note at the listed path **completely**. Read it once — do not re-read it later.
2. Generate exactly the `questionsToGenerate` count for this note:
   - **Difficulty:** 30% easy, 50% medium, 20% hard. Round to whole numbers; apply remainder to medium.
   - **Question types:** use only types from `designChoices.questionTypes`. Types defined in `references/exam-format.md`.
   - Tag each question: `sourceLecture`, `difficulty`, `type`, `id` in `examId-q-NNN` format (sequential across the whole exam).
3. **Verify each question immediately:**
   - Correct answer explicitly supported by content just read.
   - MC/MMC: every distractor clearly wrong and plausible.
   - Short answer: expected answer and keywords match note content.
   - Long answer: sample answer and grading criteria match note content.
   - Set `verified: true` or `verified: false` with `verificationNote`.
4. Move to the next entry in the allocation plan.

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
