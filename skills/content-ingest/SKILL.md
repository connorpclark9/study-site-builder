---
name: content-ingest
description: "Use when source-materials/ contains course files (PDF, PPTX, DOCX, XLSX) that need to be converted into structured markdown study notes. This is always the first pipeline phase — run it before concept-mapper or any downstream skill."
---

# Content Ingest

Transform raw course materials into structured markdown study notes. Each source file becomes its own study note in `study-notes/` via its own dedicated parallel subagent — never merge multiple source files into one note. All notes are formatted per `references/study-notes-format.md`.

## Step 0: Precondition Check

Before doing any work, verify the environment is ready.

1. Confirm `source-materials/` exists. If it does not, stop and report: "No source-materials/ directory found. Place course files there and re-run."
2. Glob `source-materials/**/*` and confirm at least one supported file exists (`.pdf`, `.pptx`, `.docx`, `.xlsx`). If empty, stop and report: "source-materials/ contains no supported files."
3. Read `references/study-notes-format.md` and hold it in context — this is the authoritative format contract. Every study note you produce conforms to it. If inline instructions here ever conflict with that file, the reference file wins.
4. Create `study-notes/` if it does not already exist.

## Step 1: Plan the Dispatch

List every supported file and assign each one a number and output filename. This is purely a filename/ordering operation — do NOT read any file contents yet. That work belongs to the subagents.

### 1a: List Files

Glob `source-materials/**/*`. Collect every file with a supported extension: `.pdf`, `.pptx`, `.docx`, `.xlsx`. Subdirectories are fine — the glob finds everything recursively.

### 1b: Assign Numbers and Predict Types

For each file, use **only the filename and extension** to predict its content type and assign it a number. Do not open any file.

**Type prediction rules (filename only):**

| Predicted type | Filename signals | Extension bias |
|---|---|---|
| `lecture` | contains `lecture`, `week`, `chapter`, `session`, `module`, or a bare number prefix | `.pptx` → always `lecture` |
| `supplementary` (case) | contains `case`, or a company/brand name | — |
| `supplementary` (practice) | contains `exam`, `quiz`, `midterm`, `final`, `practice`, `problem`, `test` | — |
| `supplementary` (reference) | contains `syllabus`, `formula`, `reference`, `rubric`, `schedule`, `data` | `.xlsx` → always `reference` |
| `supplementary` (reading) | contains `reading`, `article`, `HBR`, `supplement`, or anything else ambiguous | fallback for all unclear cases |

**Numbering:**
- Lecture-predicted files first, sorted by any numbering in the filename (or alphabetically if none). Assign 1, 2, 3, … N.
- All other files after, in alphabetical order. Assign N+1, N+2, …

### 1c: Output the Dispatch Plan

Print a dispatch plan table before doing anything else. This is the only pre-dispatch output — there is no classification pass, no file reading at this stage.

```
| # | File | Predicted Type | Output File |
|---|------|----------------|-------------|
| 1 | lecture-01-slides.pptx | lecture | study-notes/lecture-01-intro.md |
| 2 | lecture-02-slides.pptx | lecture | study-notes/lecture-02-segmentation.md |
| 9 | gucci-case.pdf | supplementary | study-notes/lecture-09-gucci-case.md |
| 10 | syllabus.pdf | supplementary | study-notes/lecture-10-syllabus.md |
```

Verify every source file appears exactly once. Then proceed immediately to Step 2.

## Step 2: Dispatch ALL Subagents Simultaneously

**This is the critical step. ALL subagents MUST be dispatched in a single message as parallel Agent tool calls — not sequentially, not in batches. Every file gets its own agent. There is no agent cap.**

Each subagent is responsible for:
1. Reading its assigned file completely
2. Classifying the actual content type from what it reads (overriding the filename-based prediction if the content says otherwise)
3. Writing the completed study note to disk

Use the subagent prompt template below, filled in for each file. Send all Agent calls in one message.

### Subagent Prompt Template

````
Subagent task: Ingest source file and produce study note

## Your file
[full path to source file, e.g., source-materials/lecture-slides/lecture-03-positioning.pptx]

## Your output file
[full output path, e.g., study-notes/lecture-03-positioning.md]

## Assigned number
[N] — use this as the lecture_number in frontmatter

## Predicted type (from filename)
[lecture | supplementary] — verify against content; override if wrong

---

## Instructions

### Step A: Read the source file completely

Use the appropriate strategy for the file format:
- **PDF** — Use the Read tool. For PDFs longer than 10 pages, read in chunks via the `pages` parameter ("1-10", "11-20", etc.) until you have read the entire file.
- **PPTX** — Use a pptx-reading skill if available; otherwise use the Read tool.
- **DOCX** — Use a docx-reading skill if available; otherwise use the Read tool.
- **XLSX** — Use the Read tool. Extract all data tables.

Do not stop after a partial read. Every section of the file must be read before writing.

### Step B: Confirm or correct the content type

Based on what you actually read, assign one of these types:

- **`lecture`** — Core instructional material: slide decks, chapter notes, learning objectives, conceptual frameworks taught in class.
- **`supplementary`** — Everything else: case studies, practice exams, supplementary readings, formula sheets, syllabi, reference materials.

The predicted type above is based only on the filename. If the content clearly contradicts it, use the correct type. When in doubt, use `supplementary` — it is the safe default.

For the YAML frontmatter `title` field:
- `lecture` type → `"Lecture [N]: [Topic Name]"`
- `supplementary` type → descriptive prefix + name, no lecture number. Examples:
  - `"Case Study: [Company/Topic]"`
  - `"Practice Problems: [Topic]"`
  - `"Reference: [Document Name]"`
  - `"Supplementary Reading: [Title]"`

### Step C: Read the format specification

Read `references/study-notes-format.md` in full. This is the authoritative contract for the output format. Follow it exactly.

### Step D: Write the study note

Write the completed study note to: `[output file path]`

Requirements:
1. YAML frontmatter must include: `title`, `type`, `source_files`, `topics`, `lecture_number`. All fields non-empty. `lecture_number` must be the integer [N], not a string.
2. Include all required sections in the order defined by `references/study-notes-format.md`.
3. Adapt section emphasis to the content type:
   - **Lecture:** All sections equally weighted. Key Concepts and Frameworks & Mental Models are the centerpieces.
   - **Case study:** The Case Studies section is the centerpiece. Key Concepts should extract the analytical frameworks the case illustrates.
   - **Practice problems:** Formulas & Quantitative Tools and Key Concepts should cover the topics the problems test.
   - **Supplementary reading:** Overview and Key Concepts capture the main arguments and contributions.
   - **Reference material:** Formulas & Quantitative Tools and Glossary are the centerpieces; other sections may be brief.
4. **Glossary:** Extract every significant term from the source — the glossary is the sole input for flashcard generation; missing terms mean missing flashcards. Include all terms that are defined, emphasized, or essential to understanding the material. Every entry needs a definition and `[Related: ...]` cross-references.
5. Write the file to disk immediately. Do not wait for confirmation.
````

## Step 3: Verify Outputs

After ALL subagents complete, verify every output file. Read `references/study-notes-format.md` to get the exact list of required section headers — do not maintain a separate list here.

1. **File existence** — Glob `study-notes/*.md`. The count must equal the number of source files from Step 1. List any missing files.

2. **Frontmatter** — Read the first 20 lines of each file. Verify:
   - YAML block present (opens and closes with `---`)
   - Fields `title`, `type`, `source_files`, `topics`, `lecture_number` all exist and are non-empty
   - `type` is `"lecture"` or `"supplementary"`
   - `lecture` files: title matches `"Lecture N: ..."` format
   - `supplementary` files: title does NOT start with `"Lecture N:"`
   - `lecture_number` is an integer — this field is critical; missing or stringified values break downstream flashcard generation silently

3. **Sections** — Search each file for all required section headers from the format spec. Flag any missing sections.

4. **Glossary depth** — Count glossary entries per file (lines matching `**term**:`). Flag any file with fewer than 10 entries.

5. **Source coverage** — Collect all `source_files` paths across all study notes. Every file from the Step 1 glob must appear in at least one note. Flag any uncovered source file.

6. **On failure** — For each failed check:
   - Log the file path and which check failed
   - Re-dispatch a single subagent for that file only, with the failure reason explicitly stated in the prompt
   - Re-verify before marking complete

## Step 4: Update Pipeline Status

Read `pipeline-status.json`. Update the `content-ingest` phase entry:
- Set `status` to `"completed"`
- Set `completedAt` to the current ISO 8601 UTC timestamp
- Populate `filesProduced` with the relative path of every study note written
- Advance `currentPhase` to the next pipeline phase

Write the updated file back.

## Completion Signal

Report completion as a markdown bullet list:

- Number of study note files created (X lecture notes, Y supplementary notes)
- Total glossary terms extracted across all files
- Type breakdown: how many files were classified as each content type (and how many had their predicted type corrected by the subagent)
- Any issues encountered during verification and how they were resolved
- List of all output file paths
