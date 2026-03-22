# Exam Format Specification

> Data contract for practice exam JSON files produced by the exam-builder skill and consumed by the site-generator skill.

## File Location

```
output/exams/exam-NN-slug.json
```

Each practice exam is a separate JSON file. Multiple exams can exist (e.g., one per lecture group, a comprehensive midterm, a comprehensive final).

## Top-Level Structure

```json
{
  "examId": "midterm-review",
  "title": "Midterm Review Exam",
  "description": "Comprehensive practice exam covering Lectures 1-6: corporate finance fundamentals, time value of money, risk and return, and capital budgeting.",
  "focusAreas": [
    "Net Present Value",
    "Time Value of Money",
    "Risk and Return",
    "Capital Structure"
  ],
  "questions": [],
  "metadata": {
    "totalQuestions": 30,
    "questionTypes": {
      "multiple-choice": 15,
      "multiple-multiple-choice": 5,
      "short-answer": 5,
      "long-answer": 5
    },
    "generatedAt": "2026-03-23T14:30:00Z",
    "verifiedAgainstNotes": true
  }
}
```

## Field Definitions

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `examId` | string | Yes | Unique exam identifier, kebab-case (e.g., `midterm-review`, `final-comprehensive`, `lecture-05-quiz`) |
| `title` | string | Yes | Human-readable exam title displayed on the site |
| `description` | string | Yes | 1-2 sentence description of what the exam covers |
| `focusAreas` | string[] | Yes | List of topic areas covered, drawn from study notes `topics` frontmatter |
| `questions` | Question[] | Yes | Array of question objects |
| `metadata` | Metadata | Yes | Generation metadata |

### Question Object (Common Fields)

All question types share these common fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Globally unique question ID in format `examId-q-NNN` (e.g., `midterm-review-q-001`) |
| `type` | string | Yes | One of: `multiple-choice`, `multiple-multiple-choice`, `short-answer`, `long-answer` |
| `question` | string | Yes | The question text. May include markdown formatting for formulas or emphasis. |
| `sourceLecture` | string | Yes | The lecture this question is based on, format `"Lecture N"` |
| `difficulty` | string | Yes | One of: `easy`, `medium`, `hard` |

### Question Type: multiple-choice

Standard single-answer multiple choice question.

**Additional fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `options` | Option[] | Yes | Array of 4 answer options |
| `correctAnswer` | string | Yes | The `id` of the correct option |
| `explanation` | string | Yes | Explanation of why the correct answer is right and why key distractors are wrong |

**Option object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Option identifier: `"a"`, `"b"`, `"c"`, or `"d"` |
| `text` | string | Yes | The option text |

**Example:**

```json
{
  "id": "midterm-review-q-001",
  "type": "multiple-choice",
  "question": "A project requires an initial investment of $50,000 and generates cash flows of $15,000 per year for 5 years. If the discount rate is 10%, what is the project's NPV?",
  "sourceLecture": "Lecture 5",
  "difficulty": "medium",
  "options": [
    { "id": "a", "text": "$6,861.80" },
    { "id": "b", "text": "$25,000.00" },
    { "id": "c", "text": "$56,861.80" },
    { "id": "d", "text": "-$6,861.80" }
  ],
  "correctAnswer": "a",
  "explanation": "NPV = -50,000 + 15,000/1.10 + 15,000/1.21 + 15,000/1.331 + 15,000/1.4641 + 15,000/1.6105 = -50,000 + 56,861.80 = $6,861.80. Option (b) incorrectly ignores discounting (5 × 15,000 - 50,000). Option (c) is the total PV of inflows without subtracting the initial investment. Option (d) reverses the sign."
}
```

### Question Type: multiple-multiple-choice

Multiple correct answers — the student must select all that apply.

**Additional fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `options` | Option[] | Yes | Array of 4-6 answer options |
| `correctAnswers` | string[] | Yes | Array of `id` values for all correct options (2 or more) |
| `explanation` | string | Yes | Explanation covering why each correct answer is right and why each distractor is wrong |

**Example:**

```json
{
  "id": "midterm-review-q-010",
  "type": "multiple-multiple-choice",
  "question": "Which of the following are limitations of the payback period method? Select all that apply.",
  "sourceLecture": "Lecture 5",
  "difficulty": "easy",
  "options": [
    { "id": "a", "text": "Ignores the time value of money" },
    { "id": "b", "text": "Requires estimating cash flows" },
    { "id": "c", "text": "Ignores cash flows after the cutoff date" },
    { "id": "d", "text": "Cannot be calculated for projects with uneven cash flows" },
    { "id": "e", "text": "The cutoff period is arbitrary" }
  ],
  "correctAnswers": ["a", "c", "e"],
  "explanation": "The payback period (a) does not discount cash flows, (c) ignores all cash flows occurring after the payback cutoff, and (e) has no theoretically justified cutoff — it is set by management judgment. Option (b) is true of all capital budgeting methods, not a specific limitation. Option (d) is incorrect because payback can be calculated with uneven cash flows by accumulating them period by period."
}
```

### Question Type: short-answer

Expects a brief response — typically a term, number, or one sentence.

**Additional fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `correctAnswer` | string | Yes | The expected correct answer |
| `acceptableKeywords` | string[] | Yes | Array of keywords or phrases that a correct answer must contain (used for auto-grading hints on the site) |

**Example:**

```json
{
  "id": "midterm-review-q-020",
  "type": "short-answer",
  "question": "What is the term for a cost that has already been incurred and cannot be recovered, and therefore should be excluded from capital budgeting decisions?",
  "sourceLecture": "Lecture 5",
  "difficulty": "easy",
  "correctAnswer": "Sunk cost",
  "acceptableKeywords": ["sunk", "cost"]
}
```

### Question Type: long-answer

Expects a multi-sentence or multi-paragraph response.

**Additional fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sampleAnswer` | string | Yes | A model answer demonstrating what a complete, correct response looks like |
| `gradingCriteria` | string[] | Yes | Array of specific points or concepts the answer must address to receive full credit |

**Example:**

```json
{
  "id": "midterm-review-q-025",
  "type": "long-answer",
  "question": "Explain why NPV is generally considered a superior capital budgeting method compared to IRR. Include at least two specific scenarios where IRR can produce misleading results.",
  "sourceLecture": "Lecture 5",
  "difficulty": "hard",
  "sampleAnswer": "NPV is considered superior because it directly measures the dollar amount of value created by a project, making it straightforward to interpret and compare across projects. IRR can produce misleading results in several scenarios. First, when evaluating mutually exclusive projects of different scales, IRR may rank a smaller project higher even though the larger project creates more total value (higher NPV). Second, projects with non-conventional cash flows (where the sign changes more than once) can produce multiple IRRs, making interpretation ambiguous. Additionally, IRR assumes interim cash flows are reinvested at the IRR itself, which is often unrealistically high for attractive projects, whereas NPV assumes reinvestment at the discount rate.",
  "gradingCriteria": [
    "States that NPV directly measures value creation in dollar terms",
    "Identifies the scale problem: IRR can mislead when comparing projects of different sizes",
    "Identifies the multiple IRR problem: non-conventional cash flows can yield more than one IRR",
    "Mentions the reinvestment rate assumption difference between NPV and IRR",
    "Provides clear reasoning, not just listing issues"
  ]
}
```

### Metadata Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `totalQuestions` | integer | Yes | Total number of questions in the exam |
| `questionTypes` | object | Yes | Breakdown of question counts by type |
| `generatedAt` | string | Yes | ISO 8601 UTC timestamp |
| `verifiedAgainstNotes` | boolean | Yes | Whether all questions and answers were verified against the study notes content |

## Rules

### Question Content Rules

1. **Source citation.** Every question MUST include a `sourceLecture` field referencing the lecture the question material is drawn from. The answer must be verifiable from that lecture's study notes.
2. **Answer verifiability.** Every correct answer, explanation, and sample answer MUST be verifiable against the content in the study notes. Do not invent facts or use information not present in the notes.
3. **Plausible distractors.** For multiple-choice and multiple-multiple-choice questions, incorrect options must be plausible. Common distractor strategies:
   - A calculation with a common error applied
   - A related but distinct concept
   - A correct statement that does not answer the specific question asked
   - A value that results from a different formula or method
4. **Difficulty distribution.** Each exam MUST target approximately:
   - **30% easy** — recall and basic application (define a term, identify a concept, simple calculation)
   - **50% medium** — multi-step application (calculate NPV with given data, compare two methods, explain a relationship)
   - **20% hard** — synthesis and evaluation (analyze a scenario, critique a decision, compare multiple frameworks)
5. **No ambiguity.** Questions must have unambiguously correct answers. Avoid "which of the following is most correct" unless the distinction is clearly defensible.

### Structural Rules

1. **Unique IDs.** All question `id` values MUST be globally unique across all exam files. The format `examId-q-NNN` ensures this.
2. **Question numbering.** Question sequence numbers start at 001 and increment by 1.
3. **Multiple-choice options.** Standard multiple-choice questions MUST have exactly 4 options (a, b, c, d). Multiple-multiple-choice questions MUST have 4-6 options.
4. **Correct answer counts.** Multiple-multiple-choice questions MUST have at least 2 correct answers. If only 1 answer is correct, use `multiple-choice` type instead.
5. **Grading criteria.** Long-answer questions MUST have at least 3 grading criteria items.
6. **Acceptable keywords.** Short-answer questions MUST have at least 1 acceptable keyword.

### Metadata Rules

1. **Accurate counts.** `totalQuestions` MUST equal the length of the `questions` array. Each value in `questionTypes` MUST equal the count of questions with that type.
2. **Verification flag.** `verifiedAgainstNotes` MUST be `true`. If a question cannot be verified, it should not be included.
3. **Timestamp.** `generatedAt` MUST be a valid ISO 8601 UTC timestamp.

## Validation Checklist

Before writing an exam JSON file, verify:

- [ ] `examId` is unique and kebab-case
- [ ] All question IDs follow the `examId-q-NNN` pattern and are unique
- [ ] Every question has a valid `sourceLecture` reference
- [ ] Every answer is verifiable against the study notes
- [ ] Multiple-choice questions have exactly 4 options
- [ ] Multiple-multiple-choice questions have 4-6 options and 2+ correct answers
- [ ] Long-answer questions have 3+ grading criteria
- [ ] Short-answer questions have 1+ acceptable keywords
- [ ] Difficulty distribution is approximately 30/50/20 (easy/medium/hard)
- [ ] Distractors are plausible and not obviously wrong
- [ ] `totalQuestions` and `questionTypes` counts are accurate
- [ ] `verifiedAgainstNotes` is `true`
- [ ] `generatedAt` is a valid ISO 8601 UTC timestamp
