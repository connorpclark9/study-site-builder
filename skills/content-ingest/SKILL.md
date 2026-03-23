---
name: content-ingest
description: "Use when source-materials/ contains course files (PDF, PPTX, DOCX, XLSX) that need to be converted into structured markdown study notes. This is always the first pipeline phase — run it before concept-mapper or any downstream skill."
---

# Content Ingest

Transform raw course materials into structured markdown study notes. Each source file becomes its own study note in `study-notes/` — never merge multiple source files into one note. All notes are formatted per `references/study-notes-format.md`.

## Step 0: Precondition Check

Before doing any work, verify the environment is ready.

1. Confirm `source-materials/` exists. If it does not, stop and report: "No source-materials/ directory found. Place course files there and re-run."
2. Glob `source-materials/**/*` and confirm at least one supported file exists (`.pdf`, `.pptx`, `.docx`, `.xlsx`). If empty, stop and report: "source-materials/ contains no supported files."
3. Read `references/study-notes-format.md` and hold it in context — this is the authoritative format contract. Every study note you produce conforms to it. If inline instructions here ever conflict with that file, the reference file wins.
4. Create `study-notes/` if it does not already exist.

## Step 1: Classify and Number (Light Pre-Pass)

Every source file becomes its own study note — no merging files together. This step classifies each file's content type and assigns it a number. It should be fast: use filenames and a quick skim of the first 1–2 pages, not deep reading.

### 1a: List Files

List every file in `source-materials/` (Glob pattern `source-materials/**/*`). Only include supported extensions: `.pdf`, `.pptx`, `.docx`, `.xlsx`.

### 1b: Classify Each File

Assign each file exactly one content type. The goal is to ensure the `type` field in the study note frontmatter is accurate, which affects how downstream phases (flashcards, exams, study map) handle the content.

**Content types:**

| Type | Description | Typical signals |
|------|-------------|-----------------|
| `lecture` | Core instructional material: slide decks, chapter summaries, lecture notes. | `.pptx` files, filenames with `lecture`/`week`/`chapter`/`session`/`module`, numbered slides, learning objectives |
| `case-study` | A document centered on a specific company or scenario with situation-analysis-outcome structure. | Filenames with `case`, company names in title, narrative prose about a specific firm |
| `supplementary-reading` | Articles, research papers, or background readings that provide depth but are not the primary instruction. | Filenames with `reading`/`article`/`HBR`/`supplement`, dense academic text, citations |
| `practice-problems` | Past exams, sample questions, problem sets, quizzes — documents primarily consisting of questions. | Filenames with `exam`/`quiz`/`midterm`/`final`/`practice`/`problem`/`test`/`study guide`, numbered questions, point values |
| `reference` | Formula sheets, data tables, syllabi, grading rubrics, schedules, administrative documents. | `.xlsx` files, filenames with `syllabus`/`formula`/`reference`/`data`/`rubric`/`schedule`, tabular layouts |

**Classification procedure (try in order — stop at first confident match):**

1. **Filename keywords** — Check the filename against the signals in the table above. A match here is usually sufficient.
2. **Extension bias** — If the filename is ambiguous: `.pptx` → `lecture`, `.xlsx` → `reference`. For `.pdf`/`.docx`, continue to step 3.
3. **Quick content skim** — Read only the first 1–2 pages. Look for structural signals: slides/bullets → `lecture`, company narrative → `case-study`, questions with answers → `practice-problems`, academic citations → `supplementary-reading`, tables/schedules → `reference`.
4. **Fallback** — If still uncertain, classify as `supplementary-reading`. This is the safest default because it keeps the content separate and accurately typed.

### 1c: Assign Numbers

- **Lecture files first:** Sort lecture-classified files by apparent course order (use numbering in filenames, topic progression, or syllabus order if available). Assign sequential numbers 1, 2, 3, ..., N.
- **Non-lecture files after:** Assign sequential numbers starting at N+1, in any reasonable order (alphabetical by filename is fine).

### 1d: Output a Classification Table

Before dispatching subagents, output a markdown table summarizing the classification for transparency:

```
| # | File | Type | Output File |
|---|------|------|-------------|
| 1 | lecture-01-slides.pptx | lecture | lecture-01-intro.md |
| 2 | lecture-02-slides.pptx | lecture | lecture-02-segmentation.md |
| ... | ... | ... | ... |
| 9 | gucci-case.pdf | case-study | lecture-09-gucci-case.md |
| 10 | syllabus.pdf | reference | lecture-10-syllabus.md |
```

This table serves as the dispatch plan. Verify every source file appears exactly once before proceeding.

## Step 2: File Reading Strategies

Understand how to extract content from each format before dispatching subagents — subagents will use these same strategies.

**PDF** — Use the Read tool directly. For PDFs longer than 10 pages, read in chunks via the `pages` parameter (e.g., "1-10", "11-20"). Extract slide titles, bullet points, formulas, and diagram descriptions.

**PPTX** — Use a pptx-reading skill if available; otherwise use the Read tool. Pay attention to slide titles, bullet content, speaker notes, and embedded text.

**DOCX** — Use a docx-reading skill if available; otherwise use the Read tool. Extract body text, headings, tables, and footnotes.

**XLSX** — Use the Read tool. Extract data tables relevant to course content (financial data, statistical tables). These typically belong in Case Studies or Formulas sections.

## Step 3: Size Agents

Determine how to distribute files across parallel subagents. Each source file produces one study note — no merging.

- **Small files** (under ~20 slides or ~10 pages): pair 2 files per subagent.
- **Dense files** (20+ slides or 10+ pages of heavy text): assign 1 file per subagent.
- **Cap at 5 parallel subagents.** If files exceed what 5 agents can handle, process in sequential batches: dispatch the first batch, wait for all to complete, then dispatch the next.

To estimate density without reading entire files:
- PDFs: skim the first few pages. Dense text with small font = dense. Mostly bullet points and diagrams = small.
- PPTXs: check slide count if discernible. Under 20 slides = small, 20+ = dense.
- DOCXs: check page count. Under 10 pages = small, 10+ = dense.

## Step 4: Dispatch Subagents

For each subagent, provide the appropriate prompt below with bracketed values filled in. Use a fenced code block (not `---` delimiters) when embedding the prompt, to avoid YAML frontmatter confusion.

Each source file gets its own study note — never combine multiple source files into one note. Each subagent writes its output file immediately upon completion.

**For lecture files** (type = lecture):

````
Subagent task: Produce study notes for [Lecture Title]

Read this source file:
- [file path, e.g., source-materials/lecture-05-slides.pdf]

Read the format specification at references/study-notes-format.md before writing anything.
That file is the authoritative contract — follow it exactly.

Write the output to:
  study-notes/lecture-NN-topic-slug.md
(zero-padded lecture number, lowercase hyphenated topic slug).

Requirements:
1. Include YAML frontmatter with title, type, source_files, topics, and lecture_number (per the format spec).
   - Set type: lecture
   - Set title in the format "Lecture N: Topic Name"
2. Include all 7 required sections in the order defined by references/study-notes-format.md.
3. The glossary section contains every significant term from the source material.
   Target at least 10 terms per lecture. Every term needs a definition and [Related: ...] cross-references.
4. Write the file to disk immediately upon completion. Do not wait.
````

**For non-lecture files** (type = case-study, supplementary-reading, practice-problems, or reference):

````
Subagent task: Produce study notes for [Descriptive Title, e.g., "Case Study: Gucci Brand Strategy"]

Read this source file:
- [file path, e.g., source-materials/gucci-case.pdf]

Read the format specification at references/study-notes-format.md before writing anything.
That file is the authoritative contract — follow it exactly.

Write the output to:
  study-notes/lecture-NN-topic-slug.md
(zero-padded assigned number, lowercase hyphenated topic slug).

Requirements:
1. Include YAML frontmatter with title, type, source_files, topics, and lecture_number (per the format spec).
   - Set type: supplementary
   - Set title as a descriptive name WITHOUT the "Lecture N:" prefix.
     Use the content type as a prefix (e.g., "Case Study: Gucci Brand Strategy",
     "Practice Problems: Midterm Review", "Reference: Course Syllabus",
     "Supplementary Reading: Post-It Note Innovation")
   - Set lecture_number to the assigned integer [N+x]
2. Include all 7 required sections in the order defined by references/study-notes-format.md.
   Adapt section content to the material type:
   - For case studies: the Case Studies section is the centerpiece; Key Concepts should
     extract the strategic/analytical concepts illustrated by the case.
   - For practice problems: the Formulas & Quantitative Tools section should capture any
     solution methods; Key Concepts should cover the topics the problems test.
   - For supplementary readings: emphasize the Overview and Key Concepts sections to
     capture the main arguments and contributions.
   - For reference materials: the Formulas & Quantitative Tools and Glossary sections
     are the centerpieces; other sections may be brief.
3. The glossary section contains every significant term from the source material.
   Target at least 10 terms — this threshold exists because the glossary
   is the sole input for flashcard generation downstream; missing terms mean missing flashcards.
   Every term needs a definition and [Related: ...] cross-references.
4. Write the file to disk immediately upon completion. Do not wait.
````

## Step 5: Verify Outputs

After all subagents finish, verify every output file. The 7 required section headers are defined in `references/study-notes-format.md` — check against that list (do not maintain a separate list here).

1. **File existence** — Glob `study-notes/*.md`. Confirm one file per source file from Step 1 (the count of study notes must equal the count of source files).
2. **Frontmatter** — Read the first 20 lines of each file. Verify:
   - YAML frontmatter block is present (opens and closes with `---`).
   - Fields `title`, `type`, `source_files`, `topics`, `lecture_number` all exist and are non-empty.
   - `type` is either `"lecture"` or `"supplementary"`.
   - For `type: lecture` files: `title` follows the format "Lecture N: Topic Name".
   - For `type: supplementary` files: `title` does NOT start with "Lecture N:".
   - `lecture_number` is an integer (not a string, not missing). This field is critical — downstream phases use it to order decks and assign flashcard IDs. A missing `lecture_number` will cause flashcard generation to fail silently.
   - `topics` is a list with at least one entry.
3. **Sections** — Read each file and search for all 7 required section headers from the format spec. Use exact header text matches (e.g., `## Key Terms and Definitions Glossary`). If grep returns no match for a section header, the file is incomplete.
4. **Glossary depth** — For each file, locate the glossary section and count entries. Glossary entries are lines starting with `**` followed by a term name and `**:`. Confirm at least 10 per file. If a file has fewer than 10, this indicates the ingestion missed significant content — do not proceed until fixed.
5. **Source coverage** — Collect every file path from all study notes' `source_files` fields. Compare against the full list of files in `source-materials/`. Every source file must be referenced by at least one study note. If any source file is missing, it was dropped during classification — create a new supplementary group for the dropped file(s) and regenerate.
6. **On failure** — For each failed check:
   - Log the specific file path and which check failed (e.g., "lecture-03-pricing.md: missing lecture_number in frontmatter").
   - Re-read the source materials for that group.
   - Regenerate the study note with explicit attention to the failed check.
   - Re-verify the regenerated file before marking the phase complete.

## Step 6: Update Pipeline Status

Read `pipeline-status.json`. Update the `content-ingest` phase entry:
- Set `status` to `"completed"`.
- Set `completedAt` to the current ISO 8601 UTC timestamp.
- Populate `filesProduced` with the relative path of every study note written.
- Advance `currentPhase` to the next pipeline phase.

Write the updated file back.

## Completion Signal

Report completion as a markdown bullet list:

- Number of study note files created (broken down: X lecture notes, Y supplementary notes)
- Total glossary terms extracted across all files
- Classification summary: how many source files were classified as each content type
- Any issues encountered and how they were resolved
- List of all output file paths
