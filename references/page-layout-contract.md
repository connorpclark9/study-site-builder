# Page Layout Contract

> Specification ensuring consistent page layout across all templates. Every page must follow this pattern to ensure visual alignment of titles, content, and navigation.

## Required Layout Pattern

ALL pages must follow this structure:

```html
<body>
  <!-- nav.js injects navigation bar here (prepended to body) -->
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

## Container Rules

1. **Single wrapper div.** Every page must have exactly one wrapper div that constrains content width. This div uses the page name as a class prefix (e.g., `.review-page`, `.flashcard-wrapper`, `.study-map-page`, `.practice-exams-page`).

2. **Header inside container.** The `<header role="banner">` element MUST be inside the wrapper div, not before it. This ensures the page title aligns with the content below it.

3. **Container CSS.** The wrapper div must include these styles (either inline or via a class):
   ```css
   max-width: var(--max-width);
   margin: 0 auto;
   padding: var(--padding-page);
   ```

4. **Subtitle element.** Every page header should include a `<p class="subtitle">` element with a brief description of the page's purpose.

## Why This Matters

Without this contract, pages have inconsistent title alignment — some titles are edge-to-edge while others are constrained to the content width. This creates a visually jarring experience when navigating between pages.

## Affected Templates

All templates in `templates/page-templates/` must comply:

- `index.html`
- `study-map.html`
- `flashcards.html`
- `last-minute-review.html`
- `sample-questions.html`
- `practice-exams.html`

Exam templates (`templates/exam-formats/`) use their own `.exam-page` container which already follows this pattern.

## Validation

When reviewing a page template, check:

- [ ] `<header>` is inside a max-width container div, not directly in `<body>`
- [ ] Container div has `max-width`, `margin: 0 auto`, and `padding` styles
- [ ] Header includes both `<h1>` and `<p class="subtitle">`
- [ ] `<main role="main">` is inside the same container div
