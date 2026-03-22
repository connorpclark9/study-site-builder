# Study Notes Format Specification

> Data contract for synthesized study notes produced by the content-synthesis skill and consumed by the site-generator and exam-builder skills.

## File Location

```
output/study-notes/lecture-NN-slug.md
```

Each source lecture or topic group produces exactly one study notes file.

## Frontmatter (YAML)

Every study notes file MUST begin with a YAML frontmatter block containing these required fields:

```yaml
---
title: "Lecture 5: Capital Budgeting and NPV"
source_files:
  - "materials/lecture-05-slides.pdf"
  - "materials/lecture-05-notes.docx"
  - "materials/chapter-9-reading.pdf"
topics:
  - "Capital Budgeting"
  - "Net Present Value"
  - "Internal Rate of Return"
  - "Payback Period"
lecture_number: 5
---
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Human-readable title in format "Lecture N: Topic Name" |
| `source_files` | string[] | Yes | Relative paths to every source file used to produce this note |
| `topics` | string[] | Yes | List of main topics covered, used for cross-referencing and exam generation |
| `lecture_number` | integer | Yes | Numeric lecture identifier, used for ordering and deck/card ID generation |

## Required Sections

Every study notes file MUST contain the following sections in this exact order. Do not skip or reorder sections. If a section has no applicable content (e.g., no formulas for a qualitative lecture), include the heading with a note explaining why it is empty.

### 1. Overview

The overview provides a high-level summary of the lecture material.

**Requirements:**
- 2-3 paragraphs in length
- First paragraph: what the lecture covers and why it matters
- Second paragraph: how this topic connects to previous and upcoming lectures
- Third paragraph (optional): real-world relevance or motivating question
- No bullet points in this section — prose only
- Should be understandable by someone who has not read the source material

**Example:**

```markdown
## Overview

This lecture introduces capital budgeting, the process by which firms evaluate
and select long-term investment projects. Understanding capital budgeting is
essential because these decisions commit large amounts of resources for extended
periods and are difficult to reverse.

Capital budgeting builds on the time value of money concepts from Lecture 3 and
the risk-return framework from Lecture 4. The tools introduced here — NPV, IRR,
and payback period — will be applied throughout the remainder of the course when
analyzing corporate financial decisions.

The central question driving this lecture is: given limited capital, how should
a firm decide which projects to pursue? We will see that while several methods
exist, net present value provides the most reliable answer.
```

### 2. Key Concepts

Organized by subtopic. Each concept MUST include three sub-elements: Definition, Context, and Relationships.

**Requirements:**
- Group related concepts under subtopic headings (H3)
- Each concept is an H4 heading
- Every concept must have all three sub-elements
- Definitions must be precise and self-contained
- Context explains why the concept matters or how it is used
- Relationships list connections to other concepts in these notes or other lectures

**Structure:**

```markdown
## Key Concepts

### Subtopic: Investment Decision Rules

#### Net Present Value (NPV)

**Definition:** The difference between the present value of a project's expected
future cash flows and its initial investment cost, discounted at the firm's
required rate of return.

**Context:** NPV is the gold-standard capital budgeting tool because it directly
measures the dollar amount of value a project adds to the firm. A positive NPV
means the project earns more than the required return.

**Relationships:**
- Requires discount rate from WACC (Lecture 8)
- Uses cash flow estimation techniques (Lecture 6)
- Compared against IRR and payback period in this lecture
- Applied in merger valuation (Lecture 12)
```

### 3. Frameworks & Mental Models

Visual and conceptual frameworks that aid understanding and exam performance.

**Requirements:**
- Each framework has four sub-elements: Name, Visual Description, How to Apply, When to Use
- Visual Description should describe what a diagram or flowchart would look like (for future diagram generation)
- How to Apply gives step-by-step usage instructions
- When to Use describes the scenarios or exam question types where this framework is relevant

**Structure:**

```markdown
## Frameworks & Mental Models

### NPV Decision Framework

**Visual Description:** A flowchart starting with "Estimate Cash Flows" flowing
to "Select Discount Rate" flowing to "Calculate NPV". From "Calculate NPV",
two branches: "NPV > 0 → Accept Project" and "NPV < 0 → Reject Project". A
side note on the discount rate box says "Use WACC for average-risk projects".

**How to Apply:**
1. Identify all incremental cash flows (including initial investment as negative)
2. Determine the appropriate discount rate (WACC or risk-adjusted rate)
3. Discount each cash flow to present value
4. Sum all present values
5. If NPV > 0, the project creates value; if NPV < 0, it destroys value

**When to Use:**
- Any exam question asking whether to accept or reject a project
- Comparing mutually exclusive projects (choose highest NPV)
- Evaluating expansion, replacement, or new product decisions
```

### 4. Formulas & Quantitative Tools

Mathematical formulas and computational methods.

**Requirements:**
- Each formula entry has five sub-elements: Formula, Variables, Interpretation, Example, Common Mistakes
- Use code formatting (backticks) for formulas to preserve formatting
- Variables listed in a table with symbol, name, and units
- Example must include actual numbers and step-by-step calculation
- Common Mistakes lists 2-3 frequent errors students make

**Structure:**

```markdown
## Formulas & Quantitative Tools

### Net Present Value

**Formula:**
`NPV = -C₀ + Σ(Cₜ / (1 + r)ᵗ)` for t = 1 to T

**Variables:**

| Symbol | Name | Units |
|--------|------|-------|
| C₀ | Initial investment | Dollars |
| Cₜ | Cash flow in period t | Dollars |
| r | Discount rate (required return) | Decimal (e.g., 0.10) |
| T | Number of periods | Integer |

**Interpretation:** A positive NPV means the project's return exceeds the
required rate, adding value to the firm. Each dollar of positive NPV represents
a dollar increase in shareholder wealth.

**Example:**
A project costs $10,000 today and produces $4,000/year for 4 years.
Discount rate is 10%.

`NPV = -10,000 + 4,000/1.10 + 4,000/1.21 + 4,000/1.331 + 4,000/1.4641`
`NPV = -10,000 + 3,636.36 + 3,305.79 + 3,005.26 + 2,732.05`
`NPV = 2,679.46`

Since NPV > 0, accept the project.

**Common Mistakes:**
- Forgetting to include the initial investment as a negative cash flow
- Using the percentage form of the discount rate (10) instead of decimal (0.10)
- Discounting the initial investment (period 0 cash flows are not discounted)
```

### 5. Case Studies

Real-world applications of the lecture concepts.

**Requirements:**
- Each case study has four sub-elements: Company, Challenge, What Was Done, Takeaway
- Cases should be drawn from examples mentioned in the source material
- If no cases are in the source, synthesize a representative example and note it as illustrative
- Takeaway should connect back to a specific concept from Section 2

**Structure:**

```markdown
## Case Studies

### Boeing 787 Dreamliner Development

**Company:** Boeing

**Challenge:** In 2004, Boeing needed to decide whether to commit $10+ billion
to develop the 787 Dreamliner, a carbon-fiber wide-body aircraft. The project
involved unprecedented technology risk and a 10+ year payback horizon.

**What Was Done:** Boeing used NPV analysis with scenario modeling. They
estimated cash flows under optimistic, base, and pessimistic demand scenarios,
each discounted at a risk-adjusted rate reflecting the project's above-average
uncertainty.

**Takeaway:** Large-scale capital budgeting decisions require scenario analysis
alongside NPV. A single-point NPV estimate can be misleading when cash flow
uncertainty is high. This connects to the concept of sensitivity analysis and
the limitations of IRR for long-horizon projects.
```

### 6. Key Takeaways

Condensed, exam-ready summary points.

**Requirements:**
- 5-10 bullet points
- Each bullet is one concise sentence
- Bullets should cover the most important and most testable ideas
- Order from most to least important
- Use bold for the key term or concept in each bullet

**Structure:**

```markdown
## Key Takeaways

- **NPV** is the most reliable capital budgeting method because it directly
  measures value creation in dollar terms.
- **IRR** gives the break-even discount rate but can produce multiple solutions
  for non-conventional cash flows.
- **Payback period** is simple but ignores the time value of money and cash
  flows beyond the cutoff.
- Always use **incremental cash flows**, not accounting profits, when
  evaluating a project.
- **Mutually exclusive projects** should be ranked by NPV, not IRR, especially
  when they differ in scale or timing.
- **Sunk costs** are irrelevant to capital budgeting decisions; only future
  incremental costs and benefits matter.
- The **discount rate** should reflect the project's risk, not the firm's
  overall cost of capital, when risks differ.
```

### 7. Key Terms and Definitions Glossary

Alphabetical glossary of all important terms.

**Requirements:**
- Alphabetical order
- Format: `**Term Name**: Definition. [Related: Other Terms]`
- Every bolded term from the Key Concepts section must appear here
- Definitions should be concise (1-2 sentences)
- Related terms reference other entries in this glossary or concepts from other lectures
- This section is the primary source for flashcard generation

**Structure:**

```markdown
## Key Terms and Definitions Glossary

**Capital Budgeting**: The process of evaluating and selecting long-term
investment projects that are expected to generate cash flows over multiple
years. [Related: NPV, IRR, Payback Period]

**Discount Rate**: The required rate of return used to calculate the present
value of future cash flows; reflects the opportunity cost of capital and
project risk. [Related: WACC, Risk-Adjusted Rate]

**Incremental Cash Flow**: The additional cash flow a firm receives by
undertaking a project, calculated as the difference between the firm's cash
flows with and without the project. [Related: Sunk Cost, Opportunity Cost]

**Internal Rate of Return (IRR)**: The discount rate at which a project's NPV
equals zero; represents the project's expected rate of return. [Related: NPV,
Mutually Exclusive Projects]

**Mutually Exclusive Projects**: A set of projects where accepting one
precludes accepting the others; must be ranked by NPV rather than IRR.
[Related: NPV, IRR]

**Net Present Value (NPV)**: The sum of the present values of all expected
future cash flows minus the initial investment; a positive NPV indicates
value creation. [Related: Discount Rate, Capital Budgeting]

**Payback Period**: The number of years required to recover the initial
investment from a project's expected cash flows, ignoring the time value of
money. [Related: Discounted Payback Period, NPV]

**Sunk Cost**: A cost that has already been incurred and cannot be recovered;
should be excluded from capital budgeting analysis. [Related: Incremental
Cash Flow, Opportunity Cost]
```

## Formatting Rules

1. **Headers:** Use markdown headers (`##` for sections, `###` for subtopics, `####` for individual concepts)
2. **Bold terms:** Bold all key terms on first use within a section using `**term**`
3. **Bullet lists:** Use `-` for unordered lists; use `1.` for ordered/step lists
4. **Tables:** Use markdown tables for structured comparisons and variable definitions
5. **Blockquotes:** Use `>` blockquotes for exam tips and important warnings

   ```markdown
   > **Exam Tip:** When a question asks you to "evaluate" a project, always
   > start with NPV. Only use IRR or payback as supplementary measures.
   ```

6. **Code formatting:** Use backticks for formulas and calculations: `` `NPV = -C₀ + Σ(Cₜ / (1 + r)ᵗ)` ``
7. **Paragraphs:** Keep paragraphs short (3-5 sentences maximum)
8. **Cross-references:** Reference other lectures using the format `(see Lecture N)` or `(see Key Terms: Term Name)`
