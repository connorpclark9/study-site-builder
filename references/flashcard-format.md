# Flashcard Format Specification

> Data contract for the flashcard JSON file produced by the flashcard-generator skill and consumed by the site-generator skill.

## File Location

```
output/flashcards.json
```

A single JSON file containing all flashcard decks for the entire course.

## Top-Level Structure

```json
{
  "decks": [
    {
      "id": "lecture-01",
      "title": "Lecture 1: Introduction to Corporate Finance",
      "cards": [
        {
          "id": "lecture-01-001",
          "term": "Corporate Finance",
          "definition": "The area of finance dealing with the sources of funding, capital structure, and investment decisions of corporations, with the goal of maximizing shareholder value.",
          "relatedTerms": ["Capital Structure", "Shareholder Value"],
          "sourceLecture": "Lecture 1"
        }
      ]
    }
  ],
  "metadata": {
    "totalCards": 150,
    "totalDecks": 12,
    "generatedFrom": "output/study-notes/",
    "generatedAt": "2026-03-23T14:30:00Z"
  }
}
```

## Field Definitions

### Deck Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique deck identifier in format `lecture-NN` where NN is zero-padded lecture number |
| `title` | string | Yes | Human-readable deck title matching the study notes `title` frontmatter field |
| `cards` | Card[] | Yes | Array of card objects belonging to this deck |

### Card Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Globally unique card identifier in format `lecture-NN-NNN` (deck ID + three-digit sequence) |
| `term` | string | Yes | The term or concept name, matching a glossary entry from the study notes |
| `definition` | string | Yes | Concise definition of the term (maximum 300 characters) |
| `relatedTerms` | string[] | Yes | Array of related term names that exist as other cards in this or other decks |
| `sourceLecture` | string | Yes | Human-readable lecture reference in format `"Lecture N"` |

### Metadata Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `totalCards` | integer | Yes | Total number of cards across all decks |
| `totalDecks` | integer | Yes | Total number of decks |
| `generatedFrom` | string | Yes | Relative path to the study notes directory used as source |
| `generatedAt` | string | Yes | ISO 8601 timestamp of when the file was generated |

## Rules

### Deck Rules

1. **One deck per study note file.** Each study notes markdown file in `output/study-notes/` produces exactly one deck. No merging, no splitting.
2. **Deck ordering.** Decks in the `decks` array MUST be ordered by `lecture_number` (ascending), matching the order of study notes.
3. **Deck ID format.** The deck `id` MUST follow the pattern `lecture-NN` where `NN` is the zero-padded lecture number from the study notes frontmatter. Examples: `lecture-01`, `lecture-02`, `lecture-12`.
4. **Deck title.** The deck `title` MUST exactly match the `title` field from the corresponding study notes frontmatter.

### Card Rules

1. **Complete glossary coverage.** Every term defined in the "Key Terms and Definitions Glossary" section of a study notes file MUST have a corresponding card in that lecture's deck. No terms may be skipped.
2. **Definition length.** Card definitions MUST NOT exceed 300 characters. If a glossary definition is longer, it must be condensed while preserving accuracy.
3. **Globally unique IDs.** Card `id` values MUST be unique across the entire `flashcards.json` file, not just within a deck. The format `lecture-NN-NNN` ensures this by combining the deck ID with a three-digit sequence number (001, 002, 003, ...).
4. **Sequence numbering.** Card sequence numbers within a deck start at 001 and increment by 1. Cards should be ordered alphabetically by `term` within each deck, matching the alphabetical glossary ordering.
5. **Related terms validation.** Every string in `relatedTerms` MUST correspond to a `term` value of another card somewhere in the flashcards file. Do not reference terms that do not have their own card.
6. **Source lecture format.** The `sourceLecture` field uses the format `"Lecture N"` (no zero-padding) for human readability, e.g., `"Lecture 1"`, `"Lecture 12"`.

### Metadata Rules

1. **Accurate counts.** `totalCards` MUST equal the sum of all `cards` arrays across all decks. `totalDecks` MUST equal the length of the `decks` array.
2. **Timestamp.** `generatedAt` MUST be a valid ISO 8601 timestamp in UTC (ending with `Z`).
3. **Source path.** `generatedFrom` MUST be the relative path to the directory containing the study notes that were used to generate the flashcards.

## Validation Checklist

Before writing `flashcards.json`, verify:

- [ ] Every study notes file has exactly one corresponding deck
- [ ] Decks are ordered by lecture number (ascending)
- [ ] Every glossary term from every study notes file has a card
- [ ] No card definition exceeds 300 characters
- [ ] All card IDs are globally unique
- [ ] All `relatedTerms` entries reference existing cards
- [ ] Card ordering within decks is alphabetical by term
- [ ] `totalCards` and `totalDecks` metadata counts are accurate
- [ ] `generatedAt` is a valid ISO 8601 UTC timestamp

## Example: Complete Deck

```json
{
  "id": "lecture-05",
  "title": "Lecture 5: Capital Budgeting and NPV",
  "cards": [
    {
      "id": "lecture-05-001",
      "term": "Capital Budgeting",
      "definition": "The process of evaluating and selecting long-term investment projects expected to generate cash flows over multiple years.",
      "relatedTerms": ["Net Present Value", "Internal Rate of Return", "Payback Period"],
      "sourceLecture": "Lecture 5"
    },
    {
      "id": "lecture-05-002",
      "term": "Discount Rate",
      "definition": "The required rate of return used to calculate present value of future cash flows, reflecting opportunity cost of capital and project risk.",
      "relatedTerms": ["Net Present Value", "Weighted Average Cost of Capital"],
      "sourceLecture": "Lecture 5"
    },
    {
      "id": "lecture-05-003",
      "term": "Incremental Cash Flow",
      "definition": "The additional cash flow a firm receives by undertaking a project, calculated as cash flows with the project minus cash flows without it.",
      "relatedTerms": ["Sunk Cost", "Opportunity Cost"],
      "sourceLecture": "Lecture 5"
    },
    {
      "id": "lecture-05-004",
      "term": "Internal Rate of Return",
      "definition": "The discount rate at which a project's NPV equals zero; represents the project's expected rate of return.",
      "relatedTerms": ["Net Present Value", "Mutually Exclusive Projects"],
      "sourceLecture": "Lecture 5"
    },
    {
      "id": "lecture-05-005",
      "term": "Mutually Exclusive Projects",
      "definition": "A set of projects where accepting one precludes accepting the others; must be ranked by NPV rather than IRR.",
      "relatedTerms": ["Net Present Value", "Internal Rate of Return"],
      "sourceLecture": "Lecture 5"
    },
    {
      "id": "lecture-05-006",
      "term": "Net Present Value",
      "definition": "The sum of present values of all expected future cash flows minus the initial investment; positive NPV indicates value creation.",
      "relatedTerms": ["Discount Rate", "Capital Budgeting"],
      "sourceLecture": "Lecture 5"
    },
    {
      "id": "lecture-05-007",
      "term": "Payback Period",
      "definition": "The number of years required to recover the initial investment from expected cash flows, ignoring the time value of money.",
      "relatedTerms": ["Net Present Value", "Discounted Payback Period"],
      "sourceLecture": "Lecture 5"
    },
    {
      "id": "lecture-05-008",
      "term": "Sunk Cost",
      "definition": "A cost already incurred that cannot be recovered and should be excluded from capital budgeting analysis.",
      "relatedTerms": ["Incremental Cash Flow", "Opportunity Cost"],
      "sourceLecture": "Lecture 5"
    }
  ]
}
```
