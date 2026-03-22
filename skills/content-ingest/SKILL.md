---
name: content-ingest
description: "Use when source-materials/ contains course files (PDF, PPTX, DOCX, XLSX) that need to be converted into structured markdown study notes. This is always the first pipeline phase — run it before concept-mapper or any downstream skill."
---

# Content Ingest

Transform raw course materials into structured markdown study notes. Each source file group becomes one study note in `study-notes/`, formatted per `references/study-notes-format.md`.

## Step 0: Precondition Check

Before doing any work, verify the environment is ready.

1. Confirm `source-materials/` exists. If it does not, stop and report: "No source-materials/ directory found. Place course files there and re-run."
2. Glob `source-materials/**/*` and confirm at least one supported file exists (`.pdf`, `.pptx`, `.docx`, `.xlsx`). If empty, stop and report: "source-materials/ contains no supported files."
3. Read `references/study-notes-format.md` and hold it in context — this is the authoritative format contract. Every study note you produce conforms to it. If inline instructions here ever conflict with that file, the reference file wins.
4. Create `study-notes/` if it does not already exist.

## Step 1: Scan and Classify

1. List every file in `source-materials/` (Glob pattern `source-materials/**/*`).
2. Classify each file by extension:
   - `.pdf` — lecture slides, readings, textbook chapters
   - `.pptx` — presentation slide decks
   - `.docx` — readings, handouts, assignment descriptions
   - `.xlsx` — data tables, reference data
3. Group files into lecture/topic clusters using these heuristics (try in order):
   - **Naming patterns** — matching lecture numbers (e.g., `lecture-05-slides.pdf` + `lecture-05-notes.docx`).
   - **Topic keywords** — files mentioning the same subject (e.g., `capital-budgeting-slides.pdf` + `NPV-reading.pdf`).
   - **Sequential numbering** — files numbered in sequence map to sequential lectures.
   - **Content sampling** — if naming is ambiguous, read the first page of each file to determine topic alignment.
4. Assign each group a sequential lecture number (1, 2, 3, ...) based on apparent course order.

## Step 2: File Reading Strategies

Understand how to extract content from each format before dispatching subagents — subagents will use these same strategies.

**PDF** — Use the Read tool directly. For PDFs longer than 10 pages, read in chunks via the `pages` parameter (e.g., "1-10", "11-20"). Extract slide titles, bullet points, formulas, and diagram descriptions.

**PPTX** — Use a pptx-reading skill if available; otherwise use the Read tool. Pay attention to slide titles, bullet content, speaker notes, and embedded text.

**DOCX** — Use a docx-reading skill if available; otherwise use the Read tool. Extract body text, headings, tables, and footnotes.

**XLSX** — Use the Read tool. Extract data tables relevant to course content (financial data, statistical tables). These typically belong in Case Studies or Formulas sections.

## Step 3: Size Agents

Determine how to distribute work across parallel subagents. The goal is to balance throughput against context-window limits — small lectures fit two-per-agent without crowding context, while dense lectures need a full agent's attention to avoid truncation or shallow coverage.

- **Small lectures** (each source file under ~20 slides or ~10 pages): pair 2 lectures per subagent.
- **Dense lectures** (any source file is 20+ slides or 10+ pages of heavy text): assign 1 lecture per subagent.
- **Cap at 5 parallel subagents.** If lecture groups exceed what 5 agents can handle, process in sequential batches: dispatch the first batch, wait for all to complete, then dispatch the next.

To estimate density without reading entire files:
- PDFs: read the first few pages. Heavily text-based with small font = dense. Mostly bullet points and diagrams = small.
- PPTXs: check slide count if discernible. Under 20 slides = small, 20+ = dense.
- DOCXs: check page count. Under 10 pages = small, 10+ = dense.

## Step 4: Dispatch Subagents

For each subagent, provide the prompt below with bracketed values filled in. Use a fenced code block (not `---` delimiters) when embedding the prompt, to avoid YAML frontmatter confusion.

Each subagent writes its output file immediately upon completion — do not accumulate files in memory. This preserves partial progress if the pipeline is interrupted and keeps memory usage manageable.

````
Subagent task: Produce study notes for [Lecture Title(s)]

Read these source files:
- [list each file path, e.g., source-materials/lecture-05-slides.pdf]

Read the format specification at references/study-notes-format.md before writing anything.
That file is the authoritative contract — follow it exactly.

Write the output to:
  study-notes/[filename].md
using the naming pattern lecture-NN-topic-slug.md (zero-padded lecture number, lowercase hyphenated topic slug).

Requirements:
1. Include YAML frontmatter with title, source_files, topics, and lecture_number (per the format spec).
2. Include all 7 required sections in the order defined by references/study-notes-format.md.
3. The glossary section contains every significant term from the source material.
   Target at least 10 terms per lecture — this threshold exists because the glossary
   is the sole input for flashcard generation downstream; missing terms mean missing flashcards.
   Every term needs a definition and [Related: ...] cross-references.
4. Write the file to disk immediately upon completion. Do not wait.
````

## Step 5: Verify Outputs

After all subagents finish, verify every output file. The 7 required section headers are defined in `references/study-notes-format.md` — check against that list (do not maintain a separate list here).

1. **File existence** — Glob `study-notes/*.md`. Confirm one file per lecture group from Step 1.
2. **Frontmatter** — Read the first 15 lines of each file. Verify:
   - YAML frontmatter block is present (opens and closes with `---`).
   - Fields `title`, `source_files`, `topics`, `lecture_number` all exist.
   - `title` follows the format "Lecture N: Topic Name".
   - `lecture_number` is an integer.
3. **Sections** — Search each file for all 7 required section headers from the format spec.
4. **Glossary depth** — Count glossary entries (lines starting with `**` in the glossary section). Confirm at least 10 per lecture.
5. **On failure** — Log which file and check failed. Re-read the source materials for that lecture, regenerate the study note, and re-verify.

## Step 6: Update Pipeline Status

Read `pipeline-status.json`. Update the `content-ingest` phase entry:
- Set `status` to `"completed"`.
- Set `completedAt` to the current ISO 8601 UTC timestamp.
- Populate `filesProduced` with the relative path of every study note written.
- Advance `currentPhase` to the next pipeline phase.

Write the updated file back.

## Completion Signal

Report completion as a markdown bullet list:

- Number of study note files created
- Total glossary terms extracted across all files
- Any issues encountered and how they were resolved
- List of all output file paths
