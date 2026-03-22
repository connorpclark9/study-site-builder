---
name: content-auditor
description: "Use when study-notes/ and synthesis/ exist and need verification against source materials before building the site. Triggers after concept-mapper completes. Cross-checks every claim, definition, and flashcard against originals, flags discrepancies for user review, applies corrections, and declares the markdown files as the verified source of truth."
---

# Content Auditor

Cross-check study notes and synthesis outputs against original source materials. Flag inaccuracies for user review, apply approved corrections, and declare the verified files as the single source of truth for all downstream phases.

Why this phase exists: the content-ingest and concept-mapper phases use LLM generation, which can introduce subtle errors — a misquoted formula, a dropped glossary term, a hallucinated dependency between lectures. Catching these now prevents compounding errors across the site-builder, exam-generator, and every student who uses the final site.

## Precondition Check

Before starting any audit work, verify these directories exist and contain files:

1. `study-notes/` — confirm at least one `.md` file is present.
2. `synthesis/` — confirm `flashcards.json` and `conceptual-map.md` exist.
3. `source-materials/` — confirm source files are present and readable.

If any are missing, stop and report which prerequisite is unmet. Do not proceed with a partial audit.

## Pipeline Status Update: Start

Read `pipeline-status.json`. Update the `content-auditor` phase entry:

```json
{
  "name": "content-auditor",
  "status": "in-progress",
  "startedAt": "<current ISO 8601 timestamp>"
}
```

Set `currentPhase` to `"content-auditor"`.

## Step 1: Audit Scope

Check the following for accuracy and completeness:

1. **Factual accuracy of study notes** — Do key claims, definitions, and explanations in `study-notes/` match the source files in `source-materials/`?
2. **Glossary completeness** — Does every significant term from the source material appear in the study note glossaries? Alphabetical ordering matters here because downstream phases (flashcard generation, site index pages) assume sorted glossaries.
3. **Flashcard definition correctness** — Do flashcard definitions in `synthesis/flashcards.json` accurately represent the terms as defined in the sources?
4. **Conceptual map relationship accuracy** — Are the lecture dependencies and concept relationships in `synthesis/conceptual-map.md` actually supported by the source content?

## Step 2: Comparison Method

### 2a: Study Notes vs. Source Materials

For each study note file in `study-notes/`:

1. Read the study note file completely.
2. Read the corresponding source files listed in the `source_files` frontmatter field. For PDFs with more than 10 pages, use the `pages` parameter to read in chunks of 10-20 pages at a time — the Read tool will fail on large PDFs without this parameter.
3. For each major claim, definition, or formula in the study note, check against the source:
   - **Definitions:** Does the study note definition match the source material in meaning and accuracy? Minor rewording for clarity is acceptable; factual differences are not.
   - **Formulas:** Check every variable, operator, and subscript. A single wrong subscript can change the meaning entirely.
   - **Numerical examples:** Verify all numbers. Recalculate where possible.
   - **Relationship claims:** Statements like "X depends on Y" or "X is a type of Y" need explicit support in the source material. Unsupported inferences get flagged even if they seem plausible.
4. Classify each checked item as:
   - **Verified**: Matches the source material.
   - **Flagged**: Differs from the source, is ambiguous, was not found in the source, or appears to be an unsupported inference.

### 2b: Glossary Completeness Check

For each study note file:

1. Scan the source material for significant terms (bolded terms, defined terms, section headings for concepts).
2. Confirm each identified term appears in the study note's glossary section.
3. Flag any missing terms. Include the source location where the term was found so the user can assess importance.

### 2c: Flashcard Verification

1. Read `synthesis/flashcards.json`. If it fails to parse as valid JSON, stop and report the parse error with the approximate location of the malformed content. Do not attempt to audit malformed data.
2. For a sample of cards (at minimum 3 per deck, or all cards if deck has fewer than 10), verify the definition against both the study note glossary and the original source material.
3. Flag any definitions that are inaccurate, misleading, or missing critical nuance.
4. Verify that all definitions fit within 300 characters. This limit exists because the flashcard UI renders definitions in a fixed-height card — overflow gets clipped and students miss content. Re-check any corrected definitions against this limit after edits.

### 2d: Conceptual Map Verification

1. Read `synthesis/conceptual-map.md`.
2. For each stated lecture dependency (e.g., "Lecture 5 builds on Lecture 3"), verify that the source material for the later lecture actually references or assumes knowledge from the earlier one.
3. Flag any dependencies that appear incorrect or unsupported.

## Step 3: Audit Report

Create the `audit/` directory if it does not exist.

Write `audit/audit-report.md` with this structure:

```markdown
---
type: audit-report
generatedAt: <ISO 8601 timestamp>
phase: content-auditor
---

# Content Audit Report

**Course:** {Course Name}
**Audit Date:** {ISO date}
**Files Audited:** {count} study notes, {count} source files, flashcards.json, conceptual-map.md

## Summary

- **Total items checked:** {number}
- **Verified:** {number} ({percentage}%)
- **Flagged for review:** {number} ({percentage}%)

## Verified Items

### Lecture 1: {Title}
- Key definitions verified against source slides
- Formulas confirmed accurate
- [Brief confirmation notes]

### Lecture 2: {Title}
[Repeat for each lecture]

## Flagged Items

### Flag 1: {Brief Description}
**Location:** `study-notes/lecture-NN-slug.md`, Section: {section name}
**Issue:** {Specific description of the concern}
**Source Reference:** {Which source file and where in it the correct information is found}
**Current Content:** "{What the study note currently says}"
**Suggested Correction:** "{What it should say, based on the source}"

### Flag 2: {Brief Description}
[Repeat for each flagged item]

## Missing Glossary Terms

### Lecture N: {Title}
- **{Term}**: Found in source file {filename} but missing from glossary

## Flashcard Issues
[Any flagged flashcard definitions with card ID and suggested correction]

## Conceptual Map Issues
[Any flagged relationship or dependency issues]
```

## Step 4: User Interaction

Present flagged items to the user for review using structured prompts.

For each flagged item, present:

1. **The issue:** What was found and where.
2. **The current content:** What the study note or flashcard currently says.
3. **The suggested correction:** What the source material indicates it should say.
4. **Options:**
   - **Accept correction** — Apply the suggested correction.
   - **Keep original** — The content is intentionally different (e.g., simplified for study purposes).
   - **Custom edit** — The user provides their own wording.

Handling edge cases:
- If there are more than 10 flagged items, group them by lecture and present one lecture at a time to avoid overwhelming the user.
- If there are zero flagged items, inform the user that all content verified successfully and skip to Step 6.
- If the user gives an ambiguous response (e.g., "sure" without specifying which option), ask for clarification: "Just to confirm — accept the suggested correction, keep the original, or provide a custom edit?"
- If the user wants to batch-approve (e.g., "accept all corrections"), confirm once and apply all suggested corrections.

## Step 5: Correction Application

For each flag where the user approved a correction:

1. **Study note corrections:** Open the relevant `study-notes/` file and use the Edit tool to replace the incorrect content. Rationale: these files are the primary reading material, so accuracy here directly affects learning.
2. **Missing glossary terms:** Add the term in alphabetical order in the glossary section, using the format `**Term Name**: Definition. [Related: Other Terms]`. Alphabetical ordering matters because the site-builder generates a combined glossary index that assumes sorted input.
3. **Flashcard corrections:** Update the definition in `synthesis/flashcards.json`. After editing, verify the definition still fits within 300 characters. If it exceeds the limit, trim to fit while preserving accuracy — a truncated-but-correct definition is better than a full-but-wrong one.
4. **Conceptual map corrections:** Update the relationship in `synthesis/conceptual-map.md`. Rationale: the study-map page renders these relationships visually, so a wrong dependency arrow misleads students about prerequisite knowledge.
5. After all corrections are applied, update the audit report to note which corrections were applied and which were kept as-is.

## Step 6: Source of Truth Declaration

After all corrections have been applied, append to the audit report:

```markdown
## Verification Complete

All flagged items have been reviewed by the user and corrections applied where approved.

**The markdown files in `study-notes/` and `synthesis/` are now the verified source of truth
for all downstream phases (site-builder, exam-generator).** No further reference to
`source-materials/` is needed for content accuracy — only for supplementary context.

**Verified at:** {ISO 8601 timestamp}
```

Why this declaration matters: downstream phases (site-builder, exam-generator) need to know they can trust the markdown files without re-checking sources. This declaration establishes that boundary.

## Pipeline Status Update: Complete

Update `pipeline-status.json`. Set the `content-auditor` phase entry:

```json
{
  "name": "content-auditor",
  "status": "completed",
  "completedAt": "<current ISO 8601 timestamp>",
  "filesProduced": ["audit/audit-report.md"]
}
```

If the audit failed (e.g., unreadable source files, malformed JSON), set status to `"failed"` with an `"error"` field describing the issue, and add the error string to the top-level `errors` array.

## Completion Report

When the audit is complete, report:
- Total items checked.
- Number verified vs. flagged.
- Number of corrections applied.
- Confirmation that the source-of-truth declaration was made.
- Path to the audit report: `audit/audit-report.md`.
