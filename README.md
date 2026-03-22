# study-site-builder

> Turn a folder of course materials into a polished study website

<!-- TODO: Add hero screenshot showing a completed study site -->
<!-- Screenshot: Full-page view of a generated site's home page (index.html) with the Midnight Blue theme -->
![Example study site](screenshots/hero.png)

## What This Does

Drop your lecture slides, PDFs, notes, and readings into a single folder, run one command, and get a complete multi-page study website. The site includes interactive flashcards, timed practice exams, a detailed visual concept map showing how topics connect to take you from zero to full comprehension, and a condensed last-minute review page — all generated directly from your course materials.

<!-- TODO: Add a 3-panel screenshot showing flashcards, study map, and practice exam side by side -->
![Site features overview](screenshots/features-overview.png)

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) installed and authenticated
- Course materials (PDFs, PowerPoints, Word docs, spreadsheets — any common format)

## Quick Start

### 1. Install Claude Code

If you don't have Claude Code yet, install it by following the official guide:

**https://docs.anthropic.com/en/docs/claude-code/overview**

Open your terminal and sign in:

```bash
claude
```

Follow the prompts to authenticate with your Anthropic account.

### 2. Install This Plugin

**Option A: From a marketplace (if available)**

```bash
/plugin install study-site-builder
```

**Option B: From this repository**

Clone the repo and load it directly:

```bash
git clone https://github.com/connorpclark9/study-site-builder.git
```

Then start Claude Code with the plugin loaded:

```bash
claude --plugin-dir ./study-site-builder
```

Or, for permanent installation, add the plugin directory to your Claude Code settings. Open your settings file (`~/.claude/settings.json`) and add the path under plugins.

### 3. Set Up Your Course Materials

Create a new project folder and add your course files:

```bash
mkdir my-course-project
cd my-course-project
mkdir source-materials
```

Copy ALL your course files into `source-materials/` — lectures, slides, readings, spreadsheets, handouts, anything relevant.

Any internal structure is fine. Subfolders, flat files, mixed formats — the plugin auto-classifies everything by content, not by filename or folder structure.

### 4. Build Your Study Site

Start Claude Code from your project folder, then launch the build pipeline:

```bash
claude
```

Then type:

```
/study-site start
```

<!-- TODO: Add screenshot of the pipeline running (showing phase progress) -->
![Pipeline running](screenshots/pipeline-running.png)

The pipeline runs through seven phases:

1. **Content Ingestion** — Reads every file in `source-materials/`, extracts text, and creates structured study notes organized by topic.
2. **Concept Mapping** — Identifies key concepts across all your materials, finds connections between topics, and builds a set of flashcards.
3. **Content Audit** — Cross-checks generated content against your original materials for accuracy. Flags anything uncertain or ambiguous for your review.
4. **Design** — Presents you with theme choices, exam format options, and page selections. You pick what you want; the plugin handles the rest.
5. **Site Building** — Assembles the full website from your chosen theme and generated content. All pages are created and linked together.
6. **Exam Generation** — Creates practice exams with configurable question counts, answer keys, and scoring.
7. **Mobile Check** — Verifies that every page renders correctly on phone and tablet screen sizes.

When finished, your complete site is in the `site/` folder, ready to deploy.

### 5. Deploy to GitHub Pages

1. Go to **https://github.com/new** and create a new repository (e.g., `my-study-site`). Set it to **Public**.

2. From inside the `site/` folder, initialize git and push:

```bash
cd site
git init
git add .
git commit -m "Add study site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

3. On GitHub: **Settings** > **Pages** > set **Source** to `Deploy from a branch`, **Branch** to `main`, **Folder** to `/ (root)`. Click **Save**.

4. Your site is live in 1-2 minutes at:

```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME
```

## Generated Pages

<!-- TODO: Add a screenshot for each page type below -->

### Home Page
The landing page with course name and quick links to all study resources.

![Home page](screenshots/page-home.png)

### Study Map
Hierarchical topic overview with expandable sections showing how concepts connect across lectures.

![Study map](screenshots/page-study-map.png)

### Flashcards
Interactive flashcard app with deck selection, flip animation, keyboard shortcuts, and progress tracking.

![Flashcards](screenshots/page-flashcards.png)

### Last-Minute Review
Condensed single-page refresher with key formulas, critical terms, and must-remember facts. Print-optimized.

![Last-minute review](screenshots/page-review.png)

### Sample Questions
Curated questions with spoiler-style answer reveals, organized by topic.

![Sample questions](screenshots/page-sample-questions.png)

### Practice Exams
Full practice exams with multiple question types, answer checking, scoring, and explanations.

![Practice exam](screenshots/page-exam.png)

## Adding More Practice Exams

Generate additional exams at any time:

```
/study-site add-exam
```

You will be prompted to:
- Choose focus areas (specific topics) or balanced coverage
- Set the number of questions (20-50)
- Select question types (multiple choice, short answer, or mixed)

New exams are added to your existing site without rebuilding everything.

## Using the Tutor

Launch an interactive study session:

```
/study-site tutor
```

The tutor knows your entire course and can:
- Explain concepts at increasing levels of depth
- Walk through formulas with worked examples
- Generate practice problems and guide you through them
- Quiz you on specific topics and track your score
- Suggest study strategies based on topic connections

## Available Themes

Choose a visual theme during the Design phase, or change it later by re-running the pipeline.

<!-- TODO: Add a screenshot strip showing all 5 themes side by side (same page, different themes) -->
![Theme comparison](screenshots/themes.png)

| Theme | Style | Description |
|---|---|---|
| **Midnight Blue** | Dark | Navy background with soft blue accents. Professional and easy on the eyes. |
| **Warm Ivory** | Light | Cream background with warm gold tones. Feels like a well-made textbook. |
| **Forest Green** | Dark | Deep forest tones with green accents. Calm and focused. |
| **Slate Minimal** | Light | Clean white with slate gray. Maximum readability, zero distractions. |
| **Sunset Coral** | Dark | Plum background with warm coral highlights. Energetic and modern. |

## Customization

### Adding a New Theme

1. Create a new folder in `templates/themes/your-theme-name/`.
2. Copy an existing `theme.css` as a starting point and modify the CSS variables.
3. Add a `preview.md` with YAML frontmatter describing your theme.
4. See `references/theme-css-contract.md` for the full list of required CSS variables.

### Modifying Page Templates

Page templates live in `templates/page-templates/`. Each file controls the structure of one page type. See `references/template-placeholders.md` for all available placeholders.

## Troubleshooting

**File format not recognized**
The plugin supports PDF, PPTX, DOCX, XLSX, TXT, and MD. If a file is skipped, convert it to PDF or plain text and re-run.

**Exam generation fails or produces poor questions**
This usually means the source material for that topic is too brief. Add more detailed notes or readings to `source-materials/` and run `/study-site add-exam` again.

**Site looks broken on mobile**
Re-run the pipeline with `/study-site start`. The Mobile Check phase will identify and fix layout issues. If problems persist, try switching to the Slate Minimal theme.

**"No source materials found" error**
Make sure your files are inside the `source-materials/` folder in your current working directory.

**Pages are empty or missing content**
Check that your source files are not password-protected or corrupted. Try opening them on your computer first to confirm they are readable.

**Pipeline interrupted mid-way**
Just run `/study-site start` again. The pipeline tracks its progress and will offer to resume from where it left off.

**GitHub Pages site not updating**
After pushing changes, GitHub Pages can take 2-5 minutes to rebuild. Check the **Actions** tab on your repository for build status.

## License

MIT — see [LICENSE](LICENSE) file.

Built with orchestration patterns from [superpowers](https://github.com/obra/superpowers) (MIT). Theme design informed by [ui-ux-pro-max](https://github.com/anthropics/ui-ux-pro-max) (MIT).
