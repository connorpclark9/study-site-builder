---
name: concept-mapper
description: "Use when study-notes/ contains completed markdown study notes and synthesis outputs (conceptual map, last-minute review, flashcards) are needed. Requires content-ingest to have finished first."
---

# Concept Mapper

Read all study notes produced by content-ingest and synthesize three outputs in `synthesis/`:

1. **Conceptual map** (`synthesis/conceptual-map.md`) — shows how lectures connect, what depends on what, and the course's narrative arc.
2. **Last-minute review** (`synthesis/last-minute-review.md`) — a concise, exam-focused refresher.
3. **Flashcards** (`synthesis/flashcards.json`) — every glossary term as a study card, per `references/flashcard-format.md`.

## Step 0: Precondition Check

1. Confirm `study-notes/` exists and contains at least one `.md` file (Glob `study-notes/*.md`). If empty or missing, stop and report: "No study notes found in study-notes/. Run content-ingest first."
2. Read `references/flashcard-format.md` — this is the authoritative schema for flashcards.json. Hold it in context.
3. Read `references/study-notes-format.md` — you need to know the section structure to parse study notes correctly.
4. Create `synthesis/` if it does not already exist.

## Step 1: Read and Model the Course

1. Glob `study-notes/*.md` and read every file completely.
2. For each file, extract:
   - `topics` from frontmatter (for theme identification).
   - Key Concepts section (for relationship mapping).
   - Frameworks & Mental Models section (for reusable models).
   - Key Terms and Definitions Glossary (for flashcard extraction).
3. Build a mental model of the full course:
   - What is the overarching narrative or progression?
   - Which lectures are foundational vs. which build on earlier ones?
   - What major themes span multiple lectures?
   - Where do concepts from one lecture depend on or extend concepts from another?

## Step 2: Generate Conceptual Map

Write `synthesis/conceptual-map.md` with this structure:

```markdown
# Conceptual Map: {Course Name}

## Course Narrative
[2-3 paragraphs: the arc of the course, how early topics lay groundwork
for later ones, and what the student should understand as the big picture.]

## Lecture Progression

### Lecture 1: {Title}
**Driving Question:** [The central question this lecture answers]
**Core Concepts:** [3-5 key concepts, comma-separated]
**Builds On:** [Previous lectures or "Foundation — no prerequisites"]
**Leads To:** [Subsequent lectures that depend on this material]
**Key Relationships:**
- [Concept A] connects to [Concept B] in Lecture N because [reason]

[Repeat for every lecture]

## Cross-Cutting Themes

### Theme 1: {Theme Name}
**Appears in:** Lectures [list]
**Evolution:** [How this theme develops across the course]
**Key Insight:** [The most important thing to understand about this theme]

[Repeat for each theme — identify at least 3 themes spanning 2+ lectures]

## Concept Dependency Graph
[Text-based tree showing which concepts depend on which. Use indentation
and arrows.]

- Time Value of Money (Lecture 2)
  → NPV Calculation (Lecture 5)
    → Project Valuation (Lecture 8)
```

Guidelines:
- Every lecture in study-notes/ gets its own section under Lecture Progression. No lecture is skipped.
- Lecture titles match the `title` frontmatter from the study notes.
- Every driving question is answerable from that lecture's material alone.
- The dependency graph only shows real dependencies grounded in the content — do not fabricate connections.

## Step 3: Generate Last-Minute Review

Write `synthesis/last-minute-review.md` with this structure:

```markdown
# Last-Minute Review: {Course Name}

> This review assumes you have already studied the material. It is a refresher,
> not a replacement for thorough study. Focus on the items you find least familiar.

## Lecture 1: {Title}

### Must-Remember Facts
- **[Key term]:** [Crisp, single-sentence testable statement]

### Key Formulas
| Formula | Variables | When to Use |
|---------|-----------|-------------|
| `formula` | variable definitions | scenario description |

### Critical Distinctions
| Concept A | vs. | Concept B |
|-----------|-----|-----------|
| [difference 1] | | [difference 1] |

### Common Exam Traps
> **Remember:** [A specific warning about a common mistake]

[Repeat for every lecture]

## Quick-Reference Formula Sheet
[All formulas from all lectures consolidated in one table, organized by topic]

## "Don't Forget" Checklist
- [ ] [Something students commonly overlook]
```

Guidelines:
- Be concise — the student already knows the material. Explain nothing; remind everything.
- Focus on what is most testable and most commonly confused.
- Every lecture is represented.
- The formula sheet consolidates all formulas from all lectures into a single table.
- Include at least 3 Critical Distinctions comparisons across the full review.
- Include at least 5 items in the Don't Forget checklist.

## Step 4: Extract Flashcards

Write `synthesis/flashcards.json` following the schema in `references/flashcard-format.md`. That file is authoritative — if any detail below conflicts with it, the reference file wins.

### Process

1. For each study note, extract every term from the Key Terms and Definitions Glossary section.
2. For each term, create a card:
   - `id`: `lecture-NN-NNN` (zero-padded lecture + three-digit alphabetical sequence).
   - `term`: exact term name from the glossary.
   - `definition`: glossary definition condensed to 300 characters max. The 300-char limit exists because flashcard UIs truncate longer text, making excess content invisible to the student. Condense by removing examples and parentheticals while keeping accuracy.
   - `relatedTerms`: from `[Related: ...]` annotations. Only include terms that actually exist as cards elsewhere in the file — dangling references break the cross-reference UI.
   - `sourceLecture`: `"Lecture N"` (no zero-padding).
3. Group cards into decks (one per study note):
   - `id`: `lecture-NN`.
   - `title`: exact match of the study note's `title` frontmatter.
   - `cards`: alphabetical by `term`. Alphabetical ordering matters because the flashcard review UI supports "jump to letter" navigation.
4. Order decks ascending by lecture number.
5. Calculate metadata: `totalCards`, `totalDecks`, `generatedFrom` (`"study-notes/"`), `generatedAt` (ISO 8601 UTC).

### Validate Before Writing

Run through the validation checklist from `references/flashcard-format.md` (9 checks). Fix any failures before writing. Specifically watch for:
- **Dangling relatedTerms** — if a referenced term has no card, remove the reference rather than inventing a card.
- **Definition overflow** — if any definition exceeds 300 characters after condensing, trim further.
- **Missing glossary terms** — if a study note's glossary section is empty or unparseable, report it as an error in the completion signal rather than silently skipping.

## Step 5: Cross-Reference Validation

Cross-referencing catches drift between the three outputs. Without it, students see a term in the review sheet that has no flashcard, or a dependency in the map that contradicts the flashcard relationships.

1. Check that every term in the conceptual map's dependency graph has a corresponding flashcard.
2. Check that every term in the last-minute review's Must-Remember Facts has a corresponding flashcard.
3. Check that cross-lecture relationships in the conceptual map are reflected in `relatedTerms` where applicable.

If inconsistencies are found:
- **Missing flashcard for a referenced term**: add the card if the term appears in a study note glossary. If it does not appear in any glossary, remove the reference from the map/review rather than inventing a definition.
- **Mismatched relationships**: update `relatedTerms` in flashcards.json to align with the conceptual map.
- Log all corrections made.

## Step 6: Update Pipeline Status

Read `pipeline-status.json`. Update the `concept-mapper` phase entry:
- Set `status` to `"completed"`.
- Set `completedAt` to the current ISO 8601 UTC timestamp.
- Populate `filesProduced` with the three output file paths.
- Advance `currentPhase` to the next pipeline phase.

Write the updated file back.

## Completion Signal

Report completion as a markdown bullet list:

- Confirmation that all three files were created (with paths)
- Number of cross-cutting themes identified
- Total flashcard count and deck count
- Any cross-referencing issues found and how they were resolved
- Any errors (empty glossaries, malformed frontmatter, missing terms)
