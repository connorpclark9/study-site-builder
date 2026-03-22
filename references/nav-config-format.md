# Navigation Config Format Specification

> Data contract for the navigation configuration JSON file produced by the site-generator skill and updated by the exam-builder skill.

## File Location

```
output/site/nav-config.json
```

A single JSON file that defines the site's navigation structure. Referenced by all HTML pages to render the navigation bar.

## Top-Level Structure

```json
{
  "siteName": "DOS3704 Study Guide",
  "pages": [
    {
      "id": "home",
      "title": "Home",
      "path": "index.html",
      "type": "core"
    },
    {
      "id": "lecture-01",
      "title": "Lecture 1: Introduction to Corporate Finance",
      "path": "lecture-01.html",
      "type": "core"
    },
    {
      "id": "lecture-02",
      "title": "Lecture 2: Financial Statements",
      "path": "lecture-02.html",
      "type": "core"
    },
    {
      "id": "flashcards",
      "title": "Flashcards",
      "path": "flashcards.html",
      "type": "core"
    },
    {
      "id": "midterm-review",
      "title": "Midterm Review Exam",
      "path": "exam-midterm-review.html",
      "type": "exam"
    },
    {
      "id": "final-comprehensive",
      "title": "Final Comprehensive Exam",
      "path": "exam-final-comprehensive.html",
      "type": "exam"
    }
  ]
}
```

## Field Definitions

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `siteName` | string | Yes | Display name for the site, shown in the navigation header/logo area |
| `pages` | Page[] | Yes | Ordered array of page entries defining navigation links |

### Page Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique page identifier, kebab-case (e.g., `home`, `lecture-01`, `midterm-review`) |
| `title` | string | Yes | Display text for the navigation link |
| `path` | string | Yes | Relative path to the HTML file from the site root |
| `type` | string | Yes | Page category: `"core"` or `"exam"` |

## Page Types

### Core Pages (`"type": "core"`)

Core pages are the primary study content pages. These include:

- **Home** (`index.html`) — Landing page with course overview and navigation cards
- **Lecture pages** (`lecture-NN.html`) — One per study notes file, containing the rendered study notes
- **Flashcards** (`flashcards.html`) — Interactive flashcard review page with deck selection

Core pages are generated from study notes and flashcard data. They form the stable structure of the site.

### Exam Pages (`"type": "exam"`)

Exam pages are practice exam interfaces. These include:

- **Quiz pages** (`exam-lecture-NN-quiz.html`) — Lecture-specific quizzes
- **Review exams** (`exam-midterm-review.html`) — Multi-lecture review exams
- **Comprehensive exams** (`exam-final-comprehensive.html`) — Full-course exams

Exam pages are generated from exam JSON files. New exams can be added without modifying existing pages.

## Ordering Rules

1. **Page order equals navigation order.** The order of entries in the `pages` array is the exact order links appear in the navigation bar. No re-sorting is performed at render time.

2. **Core pages come before exam pages.** All pages with `"type": "core"` MUST appear before any pages with `"type": "exam"` in the array.

3. **Core page ordering:**
   - `home` is always first
   - Lecture pages follow in lecture number order (`lecture-01`, `lecture-02`, ..., `lecture-12`)
   - `flashcards` appears after the last lecture page

4. **Exam page ordering:**
   - Exam pages appear after all core pages
   - New exams are appended to the end of the `pages` array
   - Within exam pages, ordering follows creation order (first created = first listed)

## Rules

### ID Rules

1. **Unique IDs.** Every `id` in the `pages` array MUST be unique.
2. **Kebab-case.** IDs use lowercase letters, numbers, and hyphens only.
3. **Stable IDs.** Once a page ID is assigned, it MUST NOT change. This ensures bookmarks and cross-references remain valid.

### Path Rules

1. **Relative paths.** All `path` values are relative to the site root directory (`output/site/`).
2. **No subdirectories.** All HTML files live in the site root — paths are simple filenames (e.g., `lecture-01.html`, not `lectures/lecture-01.html`).
3. **Naming conventions:**
   - Lecture pages: `lecture-NN.html`
   - Exam pages: `exam-{examId}.html`
   - Home: `index.html`
   - Flashcards: `flashcards.html`

### Update Rules

1. **Append-only for exams.** When a new exam is generated, its page entry is appended to the end of the `pages` array. Existing entries are never reordered.
2. **No orphaned entries.** Every entry in `pages` MUST correspond to an existing HTML file. If a page is removed, its nav entry must also be removed.
3. **No orphaned pages.** Every generated HTML file MUST have a corresponding entry in `pages`. A page without a nav entry is unreachable.

## Validation Checklist

Before writing or updating `nav-config.json`, verify:

- [ ] `siteName` is present and non-empty
- [ ] All page IDs are unique and kebab-case
- [ ] All page paths point to existing HTML files
- [ ] All core pages appear before all exam pages
- [ ] Home page is the first entry
- [ ] Lecture pages are in lecture number order
- [ ] Flashcards page appears after the last lecture page
- [ ] New exam pages are appended at the end
- [ ] Every HTML file in the site directory has a corresponding nav entry
- [ ] No duplicate paths exist in the array
