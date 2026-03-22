# Pre-Publish Checklist

Complete these steps before making the repository public.

## 1. Test the Pipeline (Do This First)

Run the full pipeline at least once on real course materials to generate a working site.

```bash
mkdir test-project && cd test-project
mkdir source-materials
# Copy your course files into source-materials/
claude --plugin-dir /path/to/study-site-builder
# Then type: /study-site start
```

- [ ] Pipeline completes all 7 phases without errors
- [ ] Generated `site/` folder contains all expected HTML pages
- [ ] Site opens in a browser and all pages render correctly
- [ ] Flashcards load and flip works
- [ ] Practice exam loads, questions display, answer checking works
- [ ] Navigation bar works on all pages
- [ ] Site looks good on mobile (resize browser to ~375px width)
- [ ] Theme matches what you selected during design phase

## 2. Capture Screenshots

After a successful pipeline run, take these screenshots and save them in the `screenshots/` folder. The README references them by these exact filenames.

| Filename | What to Capture | Notes |
|---|---|---|
| `hero.png` | Full-page view of the home page (index.html) | Use Midnight Blue theme. Crop to show the hero section and quick-link cards. ~1200px wide. |
| `features-overview.png` | 3-panel composite: flashcards + study map + practice exam | Stitch 3 screenshots side by side, or take a wide screenshot showing all 3 browser tabs. |
| `pipeline-running.png` | Terminal showing the pipeline in progress | Capture Claude Code's output mid-build, showing phase names and progress. |
| `page-home.png` | Home page (index.html) | Full page, any theme. |
| `page-study-map.png` | Study map page with some sections expanded | Expand 2-3 topic sections so structure is visible. |
| `page-flashcards.png` | Flashcards page with a card flipped | Show both front (term) and back (definition) if possible, or just the flipped state. |
| `page-review.png` | Last-minute review page | Show the two-column layout with formulas and key terms visible. |
| `page-sample-questions.png` | Sample questions page with one answer revealed | Click "Show Answer" on one question before capturing. |
| `page-exam.png` | Practice exam with a mix of answered and graded questions | Answer a few questions, click "Show Correct Answers", then capture showing green/red feedback. |
| `themes.png` | All 5 themes side by side | Same page (e.g., home page) shown in each theme. Can be a horizontal strip or 2x3 grid. |

**Screenshot tips:**
- Use a clean browser window (no bookmarks bar, minimal chrome)
- 1200-1400px wide for full-page shots
- PNG format, reasonable file size (compress if >500KB each)
- Dark themes photograph better with a dark OS theme active

## 3. Test the Standalone Commands

After the full pipeline has completed:

- [ ] Run `/study-site add-exam` — verify it creates a new exam and adds it to navigation
- [ ] Run `/study-site tutor` — verify it loads study notes and can answer questions about your course
- [ ] Verify the tutor cites source lectures in its answers

## 4. Test the Resume Flow

- [ ] Start a pipeline run, then interrupt it (close Claude Code mid-phase)
- [ ] Re-run `/study-site start` — verify it detects `pipeline-status.json` and offers to resume
- [ ] Confirm resume picks up from the correct phase

## 5. Move to Its Own Repository

- [ ] Create new repo at `github.com/connorpclark9/study-site-builder`
- [ ] Copy the `study-site-builder/` folder contents (not the folder itself) to the new repo root
- [ ] Verify `.gitignore` is present and excludes generated output
- [ ] Verify `screenshots/` folder contains all screenshots from step 2
- [ ] Verify `LICENSE` file is at the repo root
- [ ] Push to GitHub

## 6. Verify the README Renders

- [ ] Go to your GitHub repo page
- [ ] Confirm all screenshots load (no broken image icons)
- [ ] Confirm all links work (LICENSE link, external links)
- [ ] Read through the Quick Start section as if you've never seen this before — does it make sense?

## 7. Test Installation from the Repo

From a clean directory (not inside the plugin):

```bash
git clone https://github.com/connorpclark9/study-site-builder.git
claude --plugin-dir ./study-site-builder
# Verify /study-site start is recognized
```

- [ ] Plugin loads without errors
- [ ] Skills are discoverable
- [ ] Commands work as documented

## 8. Final Polish

- [ ] Add GitHub repo description: "Turn a folder of course materials into a polished study website"
- [ ] Add GitHub topics: `claude-code`, `study-tools`, `education`, `flashcards`, `practice-exams`, `static-site-generator`
- [ ] Set the repo to Public
- [ ] Delete this checklist file (or keep it for your reference — it won't affect users)

---

Once all boxes are checked, you're ready to share!
