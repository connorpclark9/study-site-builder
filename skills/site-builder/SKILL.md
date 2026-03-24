---
name: site-builder
description: "Use when design/design-spec.md is finalized and synthesis/ content is verified. Assembles the complete multi-page static study site by dispatching parallel subagents — one per page — then verifies the build."
---

# Site Builder

Assemble the final multi-page static study website from templates and verified content. Parse the design spec, set up the output directory, generate sub-PRDs for each page, dispatch parallel subagents to fill templates, then verify the complete build.

---

## Precondition Checks

Before any work, verify every required input exists. Read each path and confirm it is non-empty. If anything is missing or empty, stop immediately and report exactly what is absent.

**Required files:**

| Path | Purpose |
|------|---------|
| `design/design-spec.md` | Theme, pages, course name, overrides |
| `synthesis/flashcards.json` | Flashcard data for the flashcards page |
| `synthesis/conceptual-map.md` | Structural skeleton for the study map page (relationships, themes, progression) |
| `synthesis/last-minute-review.md` | Content for the last-minute review page |
| `pipeline-status.json` | Pipeline state (must show site-designer completed) |

**Required directories (must exist and contain files):**

| Path | Purpose |
|------|---------|
| `study-notes/` | Processed lecture notes — used for sample questions and as the deep content source for the study map page (at least one `.md` file) |
| `{pluginDir}/templates/page-templates/` | HTML page templates |
| `{pluginDir}/templates/themes/` | Theme CSS folders |
| `{pluginDir}/templates/shared-js/` | `nav.js` and `flashcards.js` |

**Resolving `pluginDir`:** Read `pipeline-status.json` and use the `pluginDir` field to find the plugin's template directory. All `templates/` paths in this skill are relative to `pluginDir`, not the project root. Templates live in the plugin installation directory, not the user's project.

**Error: template not found.** If the design spec references a theme folder or page template that does not exist under `{pluginDir}/templates/`, stop and report the mismatch. List available themes/templates so the user can correct the design spec.

---

## Step 1: Parse Design Spec

Read `design/design-spec.md` and extract:

- **Selected theme** — maps to a folder under `templates/themes/` (e.g., `midnight-blue`)
- **Selected pages** — which pages to build (e.g., index, flashcards, study-map, last-minute-review, sample-questions)
- **Course name** — used in page titles, headers, and nav config
- **Exam format** — card-style or classic-style (noted for later use by exam-generator; not consumed here)
- **CSS overrides** — any custom colors, fonts, or style tweaks

Validate that every selected page has a corresponding template file at `{pluginDir}/templates/page-templates/{page-name}.html`. If the design spec references a page type with no matching template, stop and report the error.

---

## Step 2: Directory Setup

Create the output directory structure:

```
site/
site/css/
site/js/
site/data/
site/exams/
```

**If `site/` already exists:** Rename it to `site-backup-{timestamp}/` before creating the fresh directory.

---

## Step 3: Copy Theme CSS

Copy the selected theme CSS into the output:

- Source: `{pluginDir}/templates/themes/{selected-theme}/theme.css`
- Destination: `site/css/theme.css`

If the design spec includes CSS overrides, append them to the end of `site/css/theme.css` inside a clearly marked block:

```css
/* === Design Spec Overrides === */
/* ...override rules here... */
```

---

## Step 4: Copy Shared JavaScript

Copy shared JS files:

- `{pluginDir}/templates/shared-js/nav.js` -> `site/js/nav.js`
- `{pluginDir}/templates/shared-js/flashcards.js` -> `site/js/flashcards.js`

---

## Step 5: Copy Data Files

Copy data files consumed by client-side JS:

- `synthesis/flashcards.json` -> `site/data/flashcards.json`

---

## Step 6: Generate Navigation Config

Create `site/data/nav-config.json` following the schema in `references/nav-config-format.md`.

The nav config must include:
- `siteName` set to the course name from the design spec
- A `pages` array entry for each selected page with `id`, `title`, `path`, and `type`
- All core pages (`type: "core"`) ordered before any exam pages (`type: "exam"`)
- An empty exams section (exam-generator populates this in Phase 6)
- Page ordering that matches the design spec

Read `references/nav-config-format.md` for the full field definitions and validation checklist. Verify your output against that checklist before writing the file.

---

## Mandatory Structural Constraints

The following rules MUST be followed when generating pages. These prevent known issues discovered during real-world testing.

### Page Layout Contract

ALL pages must follow this layout pattern — header inside a max-width container:

```html
<body>
  <!-- nav.js injects nav here -->
  <div class="{page-name}-page"> <!-- max-width + padding container -->
    <header role="banner">
      <h1>{Page Title}</h1>
      <p class="subtitle">{Description}</p>
    </header>
    <main role="main">
      <!-- page content -->
    </main>
  </div>
</body>
```

Every page template must wrap its header AND content inside a single container div with `max-width: var(--max-width)`, `margin: 0 auto`, and `padding: var(--padding-page)`. No page should place its `<header>` outside this container.

### Study Map Structure Rule

The study-map page MUST use the topic-block/subtopic pattern. Each lecture grouping is a `.topic-block` with a clickable header containing: icon, eyebrow (lecture range), title, description, pill count, and chevron. Inside each topic-block, individual lectures/subtopics are rendered as `.subtopic` cards in a `.subtopic-grid` with their own collapsible bodies. Do NOT use `<details>/<summary>` elements, sidebar table of contents, or dependency graph visualizations.

### Practice Exams Landing Page Rule

When exams exist, generate a `practice-exams.html` landing page that lists all available practice exams as cards with links to `exams/practice-exam-N.html`. Add a single nav entry for this page. Do NOT add individual exam pages to the navigation config.

### Description Accuracy Rule

All page descriptions on the home page quick-link cards must accurately describe the current functionality of each page. Do not describe features that are not implemented (e.g., "timed exams" when no timer exists, "AI-powered" when no AI is used). Descriptions should be factual and based on what the page actually does.

### Flashcard Animation Rule

The flashcards.js MUST use DOM manipulation (classList.toggle) for card flips, NOT innerHTML rebuilds. Rebuilding the DOM during flip destroys the element mid-CSS-transition, preventing 3D animation. The correct pattern: `els.card.classList.toggle('flipped')`.

---

## Step 7: Generate Sub-PRDs


First, check if `build/` exists. Create it if it does not. If it exists, clear its contents.

For each page selected in the design spec, write a sub-PRD file at `build/sub-prd-{page-name}.md` containing:

1. **Target file** — output HTML path (e.g., `site/index.html`)
2. **Template source** — which template to use (e.g., `{pluginDir}/templates/page-templates/index.html`)
3. **Content sources** — which files from `study-notes/` and `synthesis/` provide content
4. **Placeholder mappings** — a table mapping each `{{PLACEHOLDER}}` in the template to its content source and transformation instructions
5. **Page-specific transform rules** — include the relevant transform section from below (only for pages that need transforms)

### Page-Specific Transform Rules to Embed in Sub-PRDs

Include the appropriate section below **only** in the sub-PRD for that page type. Do not include transform rules for page types that are not being built.

#### Study Map (`study-map`)

**⚠️ The study map is NOT built as a standard single-agent sub-PRD. Do NOT generate a sub-PRD file for this page in Step 7, and do NOT dispatch a study-map agent in Step 8. The study map is built via the dedicated chunked parallel process in Step 7b. The rules below are used by the chunk agents dispatched in Step 7b — the orchestrator must embed them verbatim in each chunk agent's prompt.**

---

##### DESIGN GOAL

The study map is the most important page in the entire site. It must be comprehensive and deep enough that a student with **zero prior knowledge** could read it and develop a complete, exam-ready understanding of the entire course. It is NOT a list of topic labels, NOT a glossary, NOT a brief overview — it is the **entire course distilled into one navigable, educational page**. Every concept must be fully taught: what it is, why it matters, how it works, how to use it, what it connects to.

Think of each subtopic body as a **mini-lecture** on that concept. It should feel authoritative, specific, and genuinely useful — not like a Wikipedia stub or a slide-deck bullet point.

---

##### CONTENT SOURCES

The study map uses TWO sources:

1. `synthesis/conceptual-map.md` — the **structural skeleton**: course narrative, lecture progression order, cross-cutting themes, concept relationships. Use this to determine groupings, ordering, and connection metadata.
2. `study-notes/*.md` — the **substantive content**: full concept explanations, framework details, examples, worked calculations, key terms, and case study details. For every concept referenced in the conceptual map, read the corresponding study note and pull the full teaching-quality content from its Key Concepts, Frameworks & Mental Models, and Key Terms sections.

---

##### CONTENT DEPTH — NON-NEGOTIABLE REQUIREMENTS

- **Explain, don't label.** "NPV is used to evaluate investments" is a label, not an explanation. Write "NPV is the sum of all future cash flows discounted back to today at the cost of capital. It is the definitive financial criterion for every operations strategy decision because it captures both the magnitude and timing of value creation. A positive NPV means the investment earns more than the cost of capital; a negative NPV means it destroys value. Every capacity decision, make-or-buy choice, and technology investment in this course is ultimately evaluated by its NPV impact."
- **Minimum substance per subtopic:** Every subtopic body must contain at least one opening prose paragraph (3–5 sentences), at least two section-labeled groups of content (bullets or prose), and a KEY INSIGHT box. Shorter than this is too shallow.
- **Preserve frameworks completely.** If a study note describes a 2×2 matrix, a named three-step process, or a diagnostic tool with multiple levels — reproduce the entire structure and explain how to apply it. Never compress a 5-step framework into a single bullet.
- **Include real examples and numbers.** When the study notes contain case details, calculations, or specific examples, incorporate them. Generic explanations without examples are insufficiently useful.
- **Cover everything.** Every concept from every Key Concepts section and every framework from every Frameworks & Mental Models section of every study note must appear as a subtopic. If a study note has 8 key concepts, generate 8 subtopics for that lecture group.

---

##### WRITING VOICE & TONE

The writing must be **direct, authoritative, and educational** — like a brilliant professor who respects the student's intelligence and wants them to genuinely understand the material, not just memorize it.

Rules:
- Address the student as "you" where it helps understanding ("The critical ratio tells you exactly how aggressive to be with safety capacity.")
- Name and explain the "why" behind every concept before the "what." ("Trade-offs exist because of the finite nature of any operational system — this is not a management failure, it is a structural property.")
- Use contrast to create clarity ("This is NOT a brief overview — it IS the entire course distilled into one page.")
- Be specific rather than vague ("A positive COE means a competitor could deliver the exact same value proposition at lower cost using a better operational system — that is a structural threat, not a pricing disagreement.")
- Connect every concept back to the course's core question or framework ("This is why the OS Framework matters: every resource and process decision either moves you toward or away from the capabilities your business strategy requires.")
- In KEY INSIGHT boxes, synthesize the main takeaway in 2–4 sentences that connect the concept to the broader course or exam context.

---

##### KEYWORD HIGHLIGHTING — REQUIRED

Use `<strong>` tags on key terms and critical phrases throughout all prose and bullets. These render in near-white (`var(--text)`) against the muted body text, creating visual hierarchy that guides the reader's eye to what matters.

Rules for `<strong>` usage:
- **Named concepts, frameworks, and tools** — always bold on first use in each subtopic (`<strong>Net Present Value (NPV)</strong>`, `<strong>Operational Efficiency (OE)</strong>`)
- **Critical distinctions** — bold the contrasting terms (`<strong>operations management</strong>` vs. `<strong>operations strategy</strong>`)
- **Decision rules and conclusions** — bold the key claim (`<strong>NPV > 0 means the investment creates value</strong>`)
- **Numbers and quantitative thresholds** that carry meaning (`<strong>COE = $4.16/thousand units</strong>`)
- Do NOT bold every word — only what a student would underline when studying

---

##### EXACT HTML STRUCTURE FOR EVERY SUBTOPIC BODY

Every `.subtopic-body` must follow this exact pattern. Do not deviate.

```html
<!-- 1. OPENING PROSE — what it is and why it matters (3–5 sentences, NOT a definition) -->
<p class="prose">
  [Opening: What is this concept? Why does it exist? What problem does it solve?
   What would go wrong without it? Connect to broader course context.
   Use <strong> for key terms.]
</p>

<!-- 2. SECTION LABELS + CONTENT BLOCKS (repeat as needed, minimum 2 sections) -->
<!-- Each section-label is ALL-CAPS, accent-colored, functions like a subheading -->
<div class="section-label">THE [CONCEPT] IN FULL</div>
<p class="prose">
  [Explain the full mechanism, structure, or formula in prose.]
</p>

<div class="section-label">KEY [COMPONENTS / STEPS / VARIABLES / CASES]</div>
<ul class="bullets">
  <li><strong>Term or component name</strong> — Full sentence explanation. Never just a label. Include what it means, why it matters, and if possible a concrete example.</li>
  <li><strong>Another term</strong> — Full sentence explanation with <strong>sub-highlights</strong> where relevant.</li>
</ul>

<!-- 3. FORMULA BLOCK — required for any concept involving a formula, ratio, or calculation -->
<!-- (Omit this block only if there is genuinely no formula involved) -->
<div class="section-label">THE FORMULA</div>
<div class="formula-wrap">
  <div class="formula">FORMULA = WRITTEN OUT HERE with subscripts using Unicode (₀₁₂ etc.)</div>
  <div class="formula-explain">
    <strong>Variables:</strong><br>
    X = [what X represents and its units]<br>
    Y = [what Y represents and its units]<br>
    <br>
    <strong>Intuition:</strong> [2–4 sentences explaining WHY the formula is structured this way,
    what drives the result up or down, and what the formula is really capturing conceptually.
    This is the most valuable part — not just what to plug in, but why it works.]
  </div>
</div>

<!-- Optional: decision rules, application steps, worked examples -->
<div class="section-label">HOW TO APPLY IT</div>
<ul class="bullets">
  <li><strong>Step 1 / Condition 1:</strong> Full sentence explanation.</li>
  <li><strong>Step 2 / Condition 2:</strong> Full sentence explanation.</li>
</ul>

<!-- 4. KEY INSIGHT BOX — REQUIRED at the end of every subtopic, before link-tags -->
<!-- This is the synthesis: the most important thing to remember, exam implications,
     or the connection that unlocks the broader picture. -->
<div class="insight-box">
  <div class="label">KEY INSIGHT</div>
  <p>[2–4 sentences. Synthesize the main takeaway. Connect to the course's central
     question, the exam context, or a related concept that makes this click.
     Use <strong>bold</strong> for the critical claim.]</p>
</div>

<!-- 5. RELATED CONCEPTS — always last -->
<div class="link-tags">
  <span class="link-tag">Related: [Concept Name]</span>
  <span class="link-tag">Related: [Framework Name]</span>
  <span class="link-tag">Case: [Case Study Name]</span>
</div>
```

---

##### SECTION LABEL GUIDELINES

Section labels (`<div class="section-label">`) are ALL-CAPS short phrases that act as sub-headings within a subtopic body. They organize the content into scannable chunks. Good examples:
- `THE FORMAL DEFINITION`
- `WHY THIS MATTERS`
- `THE THREE LEVELS`
- `HOW TO USE THIS ON THE EXAM`
- `THE FORMULA`
- `VARIABLE DEFINITIONS`
- `THE KEY DISTINCTION`
- `REAL-WORLD APPLICATION`
- `THE TWO MISALIGNMENT POSITIONS`

Bad examples (too vague, too short): `OVERVIEW`, `DETAILS`, `MORE`, `NOTES`

Always use 2–5 section labels per subtopic. More than 6 means the subtopic should probably be split into two.

---

##### FORMULA HANDLING — COMPLETE REQUIREMENTS

Any concept that involves a formula, ratio, critical value, or quantitative decision rule gets a `.formula-wrap` block. The block must contain:

1. **`.formula`** — the formula itself, written clearly using Unicode for subscripts/superscripts (₀₁₂₃ ⁻¹ etc.) and standard mathematical notation. Use `=`, `+`, `−`, `×`, `/`, `Σ`, `√` as needed.
2. **`.formula-explain`** — two required sub-sections:
   - `<strong>Variables:</strong>` — a line-by-line definition of every variable, including what it represents, what units it's in, and what values are typical or meaningful.
   - `<strong>Intuition:</strong>` — 2–4 sentences explaining the conceptual logic of the formula. Why is it structured this way? What drives the result higher or lower? What is the formula really capturing? This section is often more valuable than the formula itself.

If a concept has multiple related formulas (e.g., a main formula + a rearrangement for solving a specific variable), use multiple `.formula-wrap` blocks with a `<div class="section-label">` before each one.

---

##### KEY INSIGHT BOX — REQUIRED FOR EVERY SUBTOPIC

Every single subtopic body ends with a `.insight-box` before the `.link-tags`. No exceptions. The insight box is NOT a summary of what was just said — it is:
- The **single most important thing** to internalize about this concept
- OR the **exam/application implication** that most students miss
- OR the **connection to the broader course framework** that makes this concept click

Good insight boxes are specific, opinionated, and make you think. Bad insight boxes just restate the definition in different words.

Example of a GOOD insight box:
> "The cost decomposition formula is most valuable as a diagnostic tool, not an accounting exercise. **Only COE signals a real operational problem** — Cv is often temporary (volume can recover) and CS is intentional (it is the cost of differentiation). A large COE means a rival's operational systems are fundamentally better than yours at the same task, and that gap will not close on its own."

Example of a BAD insight box:
> "NPV is an important financial tool for evaluating operations strategy decisions. It should be calculated carefully using the correct formula and discount rate."

---

##### CASE STUDY SUBTOPICS

Any subtopic that covers a case study (rather than a concept or framework) should:
- Use `<div class="dot case"></div>` (amber dot) instead of `<div class="dot"></div>` in the `.subtopic-hdr`
- Open with the business situation and strategic question (not a company bio)
- Walk through the relevant analytical frameworks applied in the case (SOA, PPM, cost decomposition, etc.)
- Include the key quantitative data points from the case where available
- End with the strategic lesson — what general principle does this case demonstrate?

---

##### CENTRAL QUESTIONS BLOCK (optional, replaces `{{CENTRAL_QUESTIONS}}`)

If the course has 2–4 overarching framing questions that structure the entire course (e.g., "What should operations be good at?", "Which system best provides those capabilities?"), render them as a `.central-questions` grid above the topic accordion:

```html
<div class="central-questions">
  <div class="cq-card">
    <div class="cq-number">Question 1</div>
    <div class="cq-question">[The overarching question]</div>
    <div class="cq-tool">Tool: <strong>[Primary framework/tool]</strong> — [brief description]</div>
  </div>
  <!-- repeat for each question -->
</div>
```

If the course does not have clear overarching framing questions, replace `{{CENTRAL_QUESTIONS}}` with an empty string.

---

##### TOPIC-BLOCK HTML STRUCTURE (exact pattern)

```html
<div class="topic-block" id="t-[unique-id]">
  <div class="topic-header" onclick="toggleTopic('t-[unique-id]')">
    <div class="topic-icon">[emoji]</div>
    <div class="topic-text">
      <div class="topic-eyebrow">[Lectures X–Y · Theme Label]</div>
      <div class="topic-title">[Topic Group Title]</div>
      <div class="topic-desc">[Comma-separated list of subtopic names — helps student know what's inside]</div>
    </div>
    <div class="topic-right">
      <span class="topic-pill">[N] sub-topics</span>
      <span class="chevron">▶</span>
    </div>
  </div>
  <div class="topic-body">
    <div class="subtopic-grid">
      <!-- subtopic cards -->
      <div class="subtopic" id="s-[unique-id]">
        <div class="subtopic-hdr" onclick="toggleSub('s-[unique-id]')">
          <div class="dot"></div>  <!-- use class="dot case" for case study subtopics -->
          <div class="subtopic-title">[Concept Name]</div>
          <span class="sub-chev">▶</span>
        </div>
        <div class="subtopic-body">
          <!-- full subtopic content as described above -->
        </div>
      </div>
    </div>
  </div>
</div>
```

All IDs must be unique across the page. Use kebab-case slugs derived from the concept name (e.g., `s-npv`, `s-critical-ratio`, `t-foundations`).

Do NOT use `<details>/<summary>` elements, sidebar tables of contents, or dependency graph visualizations anywhere on this page.

---

##### SUPPLEMENTARY MATERIAL SECTION

After all lecture-progression topic-blocks, add a supplementary section for any study notes with `type: supplementary` in their YAML frontmatter. Separate it from the main content with:

```html
<div class="supplementary-divider">
  <hr>
  <span>Supplementary Material</span>
  <hr>
</div>
```

Then render supplementary content using the same `.topic-block` / `.subtopic` pattern, but with `.topic-eyebrow` set to "Supplementary" instead of a lecture range. Include `.link-tag` cross-references back to the relevant lecture topic-blocks.

If there are no supplementary study notes, omit this section entirely.

#### Last-Minute Review (`last-minute-review`)

Transform `synthesis/last-minute-review.md` into styled HTML:
- Each section becomes a visually distinct card or panel
- Key terms are highlighted with `<mark>` or a styled `<span>`
- Formulas are wrapped in styled code blocks or math containers
- Lists use clear visual hierarchy with icons or numbering
- Add a `print-friendly` class that hides navigation and uses clean formatting when printed

#### Sample Questions (`sample-questions`)

Generate curated study questions from `study-notes/`:
- Read all files in `study-notes/`
- Generate 3-5 questions per `type: lecture` study note covering key concepts
- For `type: supplementary` study notes, generate 1-3 questions each, grouped in a separate "Supplementary Topics" section at the bottom
- Questions should be simpler than exam questions — focused on comprehension
- Each question has a spoiler-revealed answer using `<details><summary>Show Answer</summary>` pattern
- Group questions by lecture/topic with clear headings
- Include a mix of question types: definition, short answer, compare/contrast

---

## Step 7b: Build Study Map via Parallel Chunks

The study map page contains full teaching-quality content for every concept in the course and grows very large for courses with many lectures. Building it as a single agent causes context overflows and failures. **This step is mandatory — the study map must always be built using the chunked parallel process below, never as a single agent.**

The approach: each chunk agent handles exactly 2 lectures and writes a partial HTML fragment. After all chunks complete, an assembler agent stitches the fragments into the final page.

### 7b-1: Plan the Chunks

1. Glob `study-notes/*.md` and read the frontmatter of every file to get `lecture_number` and `type`.
2. Separate lecture notes (`type: lecture`) from supplementary notes (`type: supplementary`).
3. Sort the lecture notes by `lecture_number` ascending.
4. Group them into **pairs of 2**. If the total count is odd, the last chunk contains one lecture.

Build a chunk dispatch table:

| Chunk # | Lecture numbers | Study note files | Output path |
|---------|-----------------|------------------|-------------|
| 01 | Lectures 1–2 | study-notes/lecture-01-*.md, study-notes/lecture-02-*.md | site/study-map-chunks/chunk-01.html |
| 02 | Lectures 3–4 | ... | site/study-map-chunks/chunk-02.html |
| ... | ... | ... | ... |

Supplementary notes are **not chunked** — they are handled entirely by the assembler agent in Step 7b-3.

Create `site/study-map-chunks/` if it does not already exist.

### 7b-2: Dispatch ALL Chunk Agents in ONE Message

> **⚠️ CRITICAL — READ THIS BEFORE DISPATCHING:**
> ALL chunk subagents MUST be dispatched in a **single message** as parallel Agent tool calls.
> - Do NOT dispatch chunks one at a time.
> - Do NOT loop through the chunk list and send one Agent call per iteration.
> - Do NOT batch them into multiple rounds (e.g., "first 3, then the rest").
> - Every single chunk agent call must appear in the same message, submitted simultaneously.
>
> Sequential or batched dispatch defeats the entire purpose of chunking and will cause the same context overflow this step was designed to prevent.

Each chunk agent receives only its 2 study notes and produces a raw HTML fragment — no `<html>`, `<head>`, `<body>`, or `<nav>` tags. Just the `.topic-block` elements for its assigned lectures.

Use the following prompt for each chunk agent (fill in all bracketed values before dispatching):

````
Study Map Chunk Agent — Lectures [A]–[B]

## Your inputs
- Study note A: [full path to lecture A study note]
- Study note B: [full path to lecture B study note]   ← omit this line for single-lecture chunks
- Conceptual map: synthesis/conceptual-map.md   (read ONLY the Lecture Progression entries for lectures [A] and [B] — you do not need the rest)

## Your output file
site/study-map-chunks/chunk-[NN].html   ← zero-padded chunk number, e.g., chunk-01.html

## What to produce
An HTML fragment containing ONLY the `.topic-block` elements for the lectures assigned to you.
Do NOT include `<html>`, `<head>`, `<body>`, `<nav>`, or any page shell. Just the raw topic-block HTML.

## ID uniqueness — REQUIRED
All IDs must be globally unique across the assembled page (chunks are concatenated, so IDs collide
if two chunks use the same slug). Include the lecture number in every ID slug:
- Topic blocks: `t-lecture-[NN]` (e.g., `t-lecture-03`)
- Subtopics: `s-[concept-slug]-[NN]` (e.g., `s-npv-03`, `s-critical-ratio-04`)

## Content depth requirements — apply these exactly

### DESIGN GOAL
The study map is the most important page in the entire site. It must be comprehensive and deep
enough that a student with zero prior knowledge could read it and develop a complete, exam-ready
understanding of the entire course. It is NOT a list of topic labels — it is the entire course
distilled into one navigable, educational page. Every concept must be fully taught: what it is,
why it matters, how it works, how to use it, what it connects to.

Think of each subtopic body as a mini-lecture on that concept.

### CONTENT SOURCES
1. Your assigned study notes — the substantive content: full concept explanations, framework
   details, examples, worked calculations, key terms.
2. synthesis/conceptual-map.md (your lecture entries only) — driving questions, "Builds On",
   "Leads To", relationship metadata.

### CONTENT DEPTH — NON-NEGOTIABLE
- Explain, don't label. Write full teaching prose, not definitions.
- Every subtopic body: at least one opening prose paragraph (3–5 sentences), at least two
  section-labeled content blocks, and a KEY INSIGHT box. Shorter than this is too shallow.
- Preserve frameworks completely. Never compress a 5-step framework into a single bullet.
- Include real examples and numbers from the study notes.
- Cover everything. Every concept from every Key Concepts section and every framework from every
  Frameworks & Mental Models section must appear as a subtopic.

### WRITING VOICE
Direct, authoritative, educational. Address the student as "you" where helpful. Name the "why"
before the "what." Be specific rather than vague. Connect every concept to the course's core
question or framework.

### KEYWORD HIGHLIGHTING
Use `<strong>` on named concepts, frameworks, critical distinctions, decision rules, and
quantitative thresholds. Do NOT bold every word — only what a student would underline.

### EXACT HTML STRUCTURE FOR EVERY SUBTOPIC BODY

```html
<p class="prose">[Opening: what it is and why it matters. 3–5 sentences. Use <strong> for key terms.]</p>

<div class="section-label">THE [CONCEPT] IN FULL</div>
<p class="prose">[Full mechanism, structure, or formula in prose.]</p>

<div class="section-label">KEY [COMPONENTS / STEPS / VARIABLES]</div>
<ul class="bullets">
  <li><strong>Term</strong> — Full sentence explanation with example where available.</li>
</ul>

<!-- FORMULA BLOCK — include whenever a formula, ratio, or quantitative rule is involved -->
<div class="section-label">THE FORMULA</div>
<div class="formula-wrap">
  <div class="formula">FORMULA = WRITTEN OUT with Unicode subscripts (₀₁₂ etc.)</div>
  <div class="formula-explain">
    <strong>Variables:</strong><br>X = [what X is and its units]<br>
    <strong>Intuition:</strong> [2–4 sentences on WHY the formula is structured this way.]
  </div>
</div>

<!-- KEY INSIGHT BOX — REQUIRED at the end of every subtopic, before link-tags -->
<div class="insight-box">
  <div class="label">KEY INSIGHT</div>
  <p>[2–4 sentences. The single most important takeaway, exam implication, or connection
     to the broader course. Use <strong> for the critical claim. NOT a restatement of the definition.]</p>
</div>

<!-- RELATED CONCEPTS — always last -->
<div class="link-tags">
  <span class="link-tag">Related: [Concept Name]</span>
</div>
```

### TOPIC-BLOCK HTML STRUCTURE

```html
<div class="topic-block" id="t-lecture-[NN]">
  <div class="topic-header" onclick="toggleTopic('t-lecture-[NN]')">
    <div class="topic-icon">[emoji]</div>
    <div class="topic-text">
      <div class="topic-eyebrow">Lecture [N] · [Theme Label]</div>
      <div class="topic-title">[Lecture Title]</div>
      <div class="topic-desc">[Comma-separated subtopic names]</div>
    </div>
    <div class="topic-right">
      <span class="topic-pill">[N] sub-topics</span>
      <span class="chevron">▶</span>
    </div>
  </div>
  <div class="topic-body">
    <div class="subtopic-grid">
      <div class="subtopic" id="s-[concept-slug]-[NN]">
        <div class="subtopic-hdr" onclick="toggleSub('s-[concept-slug]-[NN]')">
          <div class="dot"></div>
          <div class="subtopic-title">[Concept Name]</div>
          <span class="sub-chev">▶</span>
        </div>
        <div class="subtopic-body">
          <!-- full subtopic content as described above -->
        </div>
      </div>
    </div>
  </div>
</div>
```

### CASE STUDY SUBTOPICS
Use `<div class="dot case"></div>`. Open with the business situation and strategic question.
Walk through analytical frameworks applied. Include key quantitative data. End with the
strategic lesson — what general principle does this case demonstrate?

### DO NOT
- Do NOT use `<details>/<summary>` elements.
- Do NOT include a sidebar table of contents.
- Do NOT include a page shell (html/head/body tags).

## Steps
1. Read both assigned study notes completely.
2. Read the relevant Lecture Progression entries in conceptual-map.md for your lecture numbers.
3. Generate one `.topic-block` per lecture with all its `.subtopic` cards.
4. Write the fragment to: site/study-map-chunks/chunk-[NN].html
````

Send ALL chunk agent calls in one message. Do not proceed to Step 7b-3 until every chunk agent has written its output file.

### 7b-3: Dispatch the Assembler Agent

After ALL chunk agents have completed, dispatch a **single** assembler agent. This runs sequentially after the parallel chunk batch — wait for all chunks to finish before sending this call.

````
Study Map Assembler Agent

## Your inputs
Read all of these before writing anything:
- All chunk files: site/study-map-chunks/chunk-*.html  (read every file, in numerical order)
- Conceptual map: synthesis/conceptual-map.md  (for Course Narrative and cross-cutting themes)
- All supplementary study notes (type: supplementary): [list each path]
- Page template: [pluginDir]/templates/page-templates/study-map.html
- Design spec: design/design-spec.md  (for course name)

## Your output
Write the completed page to: site/study-map.html

## Instructions

1. Read the page template. Identify all {{PLACEHOLDER}} tokens.

2. Concatenate all chunk files in order (chunk-01, chunk-02, ...) to form the full
   topic-block HTML for all lectures.

3. From synthesis/conceptual-map.md, write the Course Narrative prose section (2–3 paragraphs
   summarizing the arc of the course, how early topics lay groundwork for later ones, and what
   the student should understand as the big picture). This goes above the topic accordion.

4. If the course has 2–4 overarching framing questions that structure the entire course, render
   them as a `.central-questions` grid above the topic accordion:
   ```html
   <div class="central-questions">
     <div class="cq-card">
       <div class="cq-number">Question 1</div>
       <div class="cq-question">[The overarching question]</div>
       <div class="cq-tool">Tool: <strong>[Framework]</strong> — [brief description]</div>
     </div>
   </div>
   ```
   If the course does not have clear framing questions, set {{CENTRAL_QUESTIONS}} to an empty string.

5. Generate the Supplementary Material section from the supplementary study notes. Use the same
   `.topic-block` / `.subtopic` pattern but set `.topic-eyebrow` to "Supplementary" instead of
   a lecture range. Add `.link-tag` cross-references to related lecture topic-blocks. Separate
   this section from the main lecture content with:
   ```html
   <div class="supplementary-divider"><hr><span>Supplementary Material</span><hr></div>
   ```
   Omit this section entirely if there are no supplementary study notes.

6. Fill all {{PLACEHOLDER}} tokens in the template:
   - {{COURSE_NAME}} → course name from design-spec.md
   - {{NAV_PLACEHOLDER}} → `<script src="js/nav.js"></script>`
   - {{CENTRAL_QUESTIONS}} → central questions block or empty string
   - {{TOPIC_BLOCKS}} → concatenated chunk HTML + supplementary divider + supplementary topic-blocks

7. Validate before writing:
   - No {{PLACEHOLDER}} markers remain in the output.
   - Every `.topic-block` has at least one `.subtopic`.
   - All IDs are unique — scan for duplicates.
   - No `<details>` or `<summary>` elements anywhere on the page.

8. Write the final assembled page to: site/study-map.html
````

---

## Step 8: Dispatch Parallel Page Agents

**Exclude `study-map.html` — it was already built in Step 7b. Do NOT dispatch a study-map agent here.**

For each remaining sub-PRD (all pages except study-map), dispatch a subagent using the Agent tool. Send ALL Agent calls in a single message to maximize parallelism.

Each subagent prompt must include:
1. The full sub-PRD content (read the file and embed it)
2. The template filling instructions below
3. A clear instruction to write the completed HTML to the target path from the sub-PRD

### Template Filling Instructions (embed in every subagent prompt)

```
TEMPLATE FILLING PROCESS:

1. Read the template HTML file specified in the sub-PRD.
2. Read each content source file specified in the sub-PRD.
3. For each {{PLACEHOLDER}} in the template:
   - Find the corresponding content source and transformation rule in the sub-PRD.
   - Transform the source content into valid HTML as specified.
   - Replace the placeholder string with the generated HTML.
4. Replace {{COURSE_NAME}} with the course name: "{course_name}".
5. Replace {{NAV_PLACEHOLDER}} with a <script> tag that loads js/nav.js
   and reads data/nav-config.json to render navigation.
6. Write the final HTML to the target file path from the sub-PRD.
7. Validate the output: it must contain <!DOCTYPE html>, <head>, and <body>.
   No {{PLACEHOLDER}} markers may remain in the output.
```

---

## Step 9: Verify Build

After ALL subagents complete, verify the entire build.

### 9a. File Existence

Check that every page listed in the design spec has a corresponding HTML file in `site/`. List any missing files.

### 9b. HTML Validity

Read each HTML file and confirm:
- `<!DOCTYPE html>` declaration present
- `<head>` with `<title>` and CSS link present
- `<body>` with content present
- **No remaining `{{PLACEHOLDER}}` markers** (search for `{{` in the file)

### 9c. Asset Check

Confirm these files exist and are non-empty:
- `site/css/theme.css`
- `site/js/nav.js`
- `site/js/flashcards.js`
- `site/data/flashcards.json`
- `site/data/nav-config.json`

### 9d. Error Recovery

If any verification fails:
- For missing files or unfilled placeholders: fix the issue directly by reading the relevant sub-PRD and template, then writing the corrected file. Do not re-dispatch a subagent for a single fix.
- For subagent failures (agent returned an error or produced no output): re-dispatch only the failed agent, not the entire batch.
- Log every fix made in the build summary.

### 9e. Post-Build Validation Checklist

Before marking the site-builder phase as complete, verify:

1. [ ] **No remaining placeholders**: `grep -r '{{' site/*.html site/**/*.html` returns no matches
2. [ ] **Nav links work from subdirectories**: Open `site/exams/practice-exam-1.html` and click every nav link — none should 404
3. [ ] **Page titles aligned**: All pages have their `<header><h1>` inside a max-width container div
4. [ ] **Flashcard 3D flip**: Click a flashcard — it should smoothly rotate in 3D, not instantly switch
5. [ ] **Master deck exists**: Flashcard page has a "Master Deck" button that combines all lecture cards
6. [ ] **Practice exams landing page**: `practice-exams.html` exists and links to all exam pages
7. [ ] **Exam reset works**: After checking answers, "Reset Exam" button appears and fully clears the exam
8. [ ] **No aspirational descriptions**: All home page card descriptions match actual page functionality
9. [ ] **Study map uses topic-blocks**: No `<details>` elements, no sidebar TOC, no dependency graph
10. [ ] **Nav text doesn't wrap**: All nav links display on a single line (no stacked text)

### 9f. Build Summary

Output a summary in this format:

```
## Build Summary

**Course:** {course name}
**Theme:** {theme name}
**Pages built:** {count}

| Page | File | Status |
|------|------|--------|
| Home | site/index.html | OK |
| Flashcards | site/flashcards.html | OK |
| ... | ... | ... |

**Assets:** All present
**Fixes applied:** {list any corrections made, or "None"}
**Backup of previous build:** {path or "N/A"}
```

---

## Step 10: Update Pipeline Status

Update `pipeline-status.json` following the schema in `references/pipeline-status-format.md`:

- Set the `site-builder` phase entry status to `completed`
- Set `completedAt` to the current ISO 8601 timestamp
- Set `filesProduced` to the list of all files written to `site/`
- Set `currentPhase` to the next phase name
- Ensure `examCount` remains at its current value (exams are built in Phase 6)

If any verification failures could not be resolved, set status to `failed` with a descriptive `error` string and append to the `errors` array.
