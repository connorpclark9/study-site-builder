---
name: content-auditor
description: "Use when study-notes/ and synthesis/ exist and need verification against source materials before building the site. Triggers after concept-mapper completes. Cross-checks every claim, definition, and flashcard against originals, flags discrepancies for user review, applies corrections, and declares the markdown files as the verified source of truth."
---

# Content Auditor

Cross-check study notes and synthesis outputs against original source materials. Flag inaccuracies for user review, apply approved corrections, and declare the verified files as the single source of truth for all downstream phases.


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

## Step 1: Build Dispatch Table

Glob `study-notes/*.md`. For each file, read only the YAML frontmatter (first 20 lines) to extract `title`, `source_files`, and `lecture_number`. Build a dispatch table:

| Study note | Source file(s) | Findings output |
|------------|---------------|-----------------|
| study-notes/lecture-01-foo.md | source-materials/lecture-01.pdf | audit/findings-lecture-01.md |
| study-notes/lecture-09-bar.md | source-materials/bar-case.pdf | audit/findings-lecture-09.md |

Create the `audit/` directory if it does not exist.

## Step 2: Dispatch Parallel Audit Agents

Send ALL Agent calls in a single message — one subagent per study note. Each subagent audits one note against its source and writes its findings to a file.

For each row in the dispatch table, dispatch a subagent with this prompt (fill in bracketed values):

````
Audit one study note against its source material.

Study note: [study note path]
Source file(s): [source file path(s)]
Write findings to: [findings output path]

Instructions:
1. Read the study note completely.
2. Check ALL formulas, equations, and quantitative expressions:
   - Open the source file at the pages/slides where each formula appears.
   - For large PDFs use the `pages` parameter (e.g., pages: "1-10").
   - Verify every variable, operator, and subscript exactly.
3. Scan the first 2-3 pages of the source for bolded/defined terms and section headings.
   - Flag any significant terms missing from the study note's glossary section.
4. Select 3 spot-check claims: the most surprising claim in the note, the briefest definition, and any relationship claim ("X leads to Y"). Read only the relevant source section to verify each.

Classify each checked item as Verified or Flagged.

Write your findings to [findings output path] in exactly this format:

```markdown
# Audit Findings: [study note title]

## Formulas Checked
- [formula or expression]: VERIFIED / FLAGGED — [note if flagged]

## Missing Glossary Terms
- [term]: found in source at [location] — [brief definition from source]
(Write "None" if all significant terms are present)

## Spot-Check Claims
- Claim 1 ([brief label]): VERIFIED / FLAGGED — [note if flagged]
- Claim 2 ([brief label]): VERIFIED / FLAGGED — [note if flagged]
- Claim 3 ([brief label]): VERIFIED / FLAGGED — [note if flagged]

## Suggested Corrections
For each FLAGGED item, provide:
**[Item label]**
Location: [section name in study note]
Current: "[exact current text]"
Correction: "[corrected text based on source]"
Source: [source file name, page/slide number]
```
````

## Step 3: Flashcard Spot-Check (Main Agent)

While audit subagents run (or after they complete), run the flashcard check in the main agent:

1. Read `synthesis/flashcards.json`. If it fails to parse as valid JSON, record the parse error and skip this check.
2. For each deck, spot-check 3 card definitions against the corresponding study note glossary.
3. Flag definitions that are inaccurate or exceed 300 characters.

## Step 4: Compile Findings

After all subagents complete:

1. Read every `audit/findings-*.md` file.
2. Aggregate all flagged items, missing terms, and suggested corrections across all files.

## Step 5: Audit Report

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
[Repeat for each type: lecture study note]

### Supplementary Notes

#### {Supplementary Note Title}
- Key definitions verified against source materials
- [Brief confirmation notes]

[Repeat for each type: supplementary study note]

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

## Source Coverage
[Verify every file in source-materials/ is referenced by at least one study note's
source_files field. List any source files not covered by any study note — these
represent dropped content that needs to be ingested.]
```

## Step 6: Auto-Resolve Flagged Items

**Autonomous mode:** All flagged items are resolved automatically without user interaction. The pipeline runs end-to-end without pausing.

**Resolution rules:**

1. **Factual corrections (definition, formula, numerical errors):** Auto-accept the suggested correction. The source material is authoritative — if the study note disagrees with the source, the source wins.
2. **Missing glossary terms:** Auto-add them in alphabetical order using the source material's definition.
3. **Flashcard definition inaccuracies:** Auto-accept the suggested correction, ensuring the result stays within the 300-character limit.
4. **Ambiguous flags (source material itself is unclear):** Keep the original content and log the ambiguity in the audit report for the user to review post-build.

If there are zero flagged items, proceed directly to Step 8.

All auto-resolved corrections are logged in the audit report under a "Auto-Resolved Corrections" section so the user can review them after the pipeline completes.

## Step 7: Apply Corrections

Apply all auto-resolved corrections:

1. **Study note corrections:** Open the relevant `study-notes/` file and use the Edit tool to replace the incorrect content.
2. **Missing glossary terms:** Add the term in alphabetical order in the glossary section, using the format `**Term Name**: Definition. [Related: Other Terms]`.
3. **Flashcard corrections:** Update the definition in `synthesis/flashcards.json`. After editing, verify the definition still fits within 300 characters. If it exceeds the limit, trim to fit while preserving accuracy.
4. After all corrections are applied, update the audit report with an "Auto-Resolved Corrections" section listing every correction made and its rationale, plus a "Kept As-Is" section for any ambiguous flags that were not corrected.

## Step 8: Source of Truth Declaration

After all corrections have been applied, append to the audit report:

```markdown
## Verification Complete

All flagged items have been auto-resolved and corrections applied.

**The markdown files in `study-notes/` and `synthesis/` are now the verified source of truth
for all downstream phases (site-builder, exam-generator).** No further reference to
`source-materials/` is needed for content accuracy — only for supplementary context.

**Verified at:** {ISO 8601 timestamp}
```


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
