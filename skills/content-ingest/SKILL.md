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

## Step 1: Scan, Classify, and Group

This step uses a three-phase approach to ensure lecture materials stay focused and supplementary content gets its own well-organized study notes.

### Phase A: List and Tag by Extension

1. List every file in `source-materials/` (Glob pattern `source-materials/**/*`).
2. Tag each file by extension:
   - `.pdf` — could be anything (slides, readings, case studies, exams)
   - `.pptx` — presentation slide decks (strong signal for `lecture`)
   - `.docx` — readings, handouts, case write-ups, assignment descriptions
   - `.xlsx` — data tables, reference data (strong signal for `reference`)

### Phase B: Content-Type Classification

Before grouping files into clusters, classify each file into one of these content types. The goal is to separate core lecture material from everything else so that supplementary content is never forced into a lecture study note where it does not belong.

**Content types:**

| Type | Description | Typical files |
|------|-------------|---------------|
| `lecture` | Core instructional material that forms the backbone of the course. Slide decks with sequential numbering, chapter readings that map to a lecture topic. | `lecture-05-slides.pptx`, `week-3-demand-analysis.pdf`, `ch-7-pricing.pdf` |
| `case-study` | Standalone documents structured around a specific company or scenario, with a situation-analysis-outcome or problem-decision-result format. | `case-uber-expansion.pdf`, `airbnb-international-case.docx` |
| `supplementary-reading` | Articles, research papers, or background readings not tied to a specific lecture number. Provide context or depth but are not the primary instructional material. | `reading-brand-equity.pdf`, `HBR-innovation-article.docx` |
| `practice-problems` | Past exams, sample questions, problem sets, quizzes, or any document primarily consisting of questions with or without answer keys. | `midterm-2024.pdf`, `practice-problems-ch5.docx`, `final-exam-sample.pdf`, `quiz-3.pdf` |
| `reference` | Formula sheets, data tables, glossaries, course syllabi, grading rubrics, or administrative documents. | `formula-sheet.xlsx`, `syllabus.pdf`, `course-data.xlsx` |

**Classification heuristics (try in priority order — stop at first confident match):**

1. **Filename signals** — These keywords in the filename are strong indicators:
   - `lecture`, `week`, `chapter`, `ch-`, `session`, `module` → `lecture`
   - `case`, `case-study` → `case-study`
   - `reading`, `article`, `supplement`, `additional`, `background`, `HBR` → `supplementary-reading`
   - `exam`, `quiz`, `midterm`, `final`, `practice`, `problem-set`, `problem set`, `sample-exam`, `test` → `practice-problems`
   - `syllabus`, `formula`, `reference`, `data`, `rubric`, `schedule` → `reference`

2. **Extension bias** — When the filename is ambiguous:
   - `.pptx` → default to `lecture` (slide decks are almost always lecture material)
   - `.xlsx` → default to `reference` (spreadsheets are almost always reference data)
   - `.pdf` and `.docx` are ambiguous — proceed to the next heuristic

3. **Content structure sampling** — For ambiguous `.pdf` and `.docx` files, read the first 2–3 pages and look for structural signals:
   - **Numbered slides, bullet-heavy layout, learning objectives** → `lecture`
   - **Company name in title, narrative prose, situation/analysis/recommendation structure** → `case-study`
   - **Dense academic text, citations, abstract** → `supplementary-reading`
   - **Numbered questions, "Answer:", multiple choice options, point values** → `practice-problems`
   - **Tables of formulas, course schedule, grading breakdown** → `reference`

4. **Fallback** — If still uncertain after content sampling, classify as `supplementary-reading`. This is the safest default because it ensures the file gets its own study note rather than being merged into an unrelated lecture.

### Phase C: Group and Number

**Lecture files:** Apply the existing grouping heuristics to files classified as `lecture`:
- **Naming patterns** — matching lecture numbers (e.g., `lecture-05-slides.pdf` + `lecture-05-notes.docx`).
- **Topic keywords** — files mentioning the same subject (e.g., `capital-budgeting-slides.pdf` + `NPV-reading.pdf`).
- **Sequential numbering** — files numbered in sequence map to sequential lectures.
- **Content sampling** — if naming is ambiguous, read the first page of each file to determine topic alignment.

Assign each lecture group a sequential lecture number (1, 2, 3, ..., N) based on apparent course order.

**Non-lecture files:** Group thematically among themselves using topic similarity:
- Case studies that share a topic → combine into one supplementary note (e.g., two market-entry case studies → "Case Studies: Market Entry Strategies").
- Practice problems that cover similar material → combine into one supplementary note (e.g., "Practice Problems: Midterm Review").
- Supplementary readings on the same theme → combine into one supplementary note.
- Reference materials that span the course → one supplementary note per logical group (e.g., "Reference: Course Formula Sheet").
- Standalone items that have no thematic overlap with anything else → their own supplementary note.

Assign supplementary groups sequential numbers starting after the last lecture: N+1, N+2, N+3, ...

**Coverage check:** After grouping, verify that every file in `source-materials/` appears in exactly one group. If any file was missed, classify it as `supplementary-reading` and assign it to an existing thematic group or create a new one. No content may be dropped.

## Step 2: File Reading Strategies

Understand how to extract content from each format before dispatching subagents — subagents will use these same strategies.

**PDF** — Use the Read tool directly. For PDFs longer than 10 pages, read in chunks via the `pages` parameter (e.g., "1-10", "11-20"). Extract slide titles, bullet points, formulas, and diagram descriptions.

**PPTX** — Use a pptx-reading skill if available; otherwise use the Read tool. Pay attention to slide titles, bullet content, speaker notes, and embedded text.

**DOCX** — Use a docx-reading skill if available; otherwise use the Read tool. Extract body text, headings, tables, and footnotes.

**XLSX** — Use the Read tool. Extract data tables relevant to course content (financial data, statistical tables). These typically belong in Case Studies or Formulas sections.

## Step 3: Size Agents

Determine how to distribute work across parallel subagents. The goal is to balance throughput against context-window limits — small groups fit two-per-agent without crowding context, while dense groups need a full agent's attention to avoid truncation or shallow coverage.

- **Small groups** (each source file under ~20 slides or ~10 pages): pair 2 groups per subagent.
- **Dense groups** (any source file is 20+ slides or 10+ pages of heavy text): assign 1 group per subagent.
- **Cap at 5 parallel subagents.** If groups exceed what 5 agents can handle, process in sequential batches: dispatch the first batch, wait for all to complete, then dispatch the next.
- **Process lecture groups first, then supplementary groups.** This ensures lecture numbering is finalized before supplementary notes are assigned their N+1, N+2, ... numbers.

To estimate density without reading entire files:
- PDFs: read the first few pages. Heavily text-based with small font = dense. Mostly bullet points and diagrams = small.
- PPTXs: check slide count if discernible. Under 20 slides = small, 20+ = dense.
- DOCXs: check page count. Under 10 pages = small, 10+ = dense.

## Step 4: Dispatch Subagents

For each subagent, provide the appropriate prompt below with bracketed values filled in. Use a fenced code block (not `---` delimiters) when embedding the prompt, to avoid YAML frontmatter confusion.

Each subagent writes its output file immediately upon completion — do not accumulate files in memory. This preserves partial progress if the pipeline is interrupted and keeps memory usage manageable.

**For lecture groups** (type = lecture):

````
Subagent task: Produce study notes for [Lecture Title(s)]

Read these source files:
- [list each file path, e.g., source-materials/lecture-05-slides.pdf]

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
   Target at least 10 terms per lecture — this threshold exists because the glossary
   is the sole input for flashcard generation downstream; missing terms mean missing flashcards.
   Every term needs a definition and [Related: ...] cross-references.
4. Write the file to disk immediately upon completion. Do not wait.
````

**For supplementary groups** (type = supplementary):

````
Subagent task: Produce study notes for [Descriptive Title, e.g., "Case Studies: Market Entry Strategies"]

Read these source files:
- [list each file path, e.g., source-materials/case-uber-expansion.pdf]

Read the format specification at references/study-notes-format.md before writing anything.
That file is the authoritative contract — follow it exactly.

Write the output to:
  study-notes/lecture-NN-topic-slug.md
(zero-padded assigned number, lowercase hyphenated topic slug).

Requirements:
1. Include YAML frontmatter with title, type, source_files, topics, and lecture_number (per the format spec).
   - Set type: supplementary
   - Set title as a descriptive name WITHOUT the "Lecture N:" prefix
     (e.g., "Case Studies: Market Entry Strategies" or "Practice Problems: Midterm Review")
   - Set lecture_number to the assigned integer [N+x]
2. Include all 7 required sections in the order defined by references/study-notes-format.md.
   Adapt section content to the material type:
   - For case studies: the Case Studies section is the centerpiece; Key Concepts should
     extract the strategic/analytical concepts illustrated by the cases.
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

1. **File existence** — Glob `study-notes/*.md`. Confirm one file per group from Step 1 (both lecture and supplementary groups).
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
