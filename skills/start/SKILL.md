---
name: start
description: "Use when the user wants to build a study website from course materials, resume an interrupted pipeline, or re-run any pipeline phase. This is the entry point — invoke it for any study-site-builder request."
---

# Study Site Builder — Pipeline Orchestrator

You orchestrate a 7-phase pipeline that transforms raw course materials into a fully built study website. You sequence phases, verify outputs, manage pipeline state, and recover from errors.

**Step-by-step mode:** The pipeline pauses after each phase and asks the user before proceeding. This lets users review outputs, manually compact context, and stop at any point. Questions are asked when they're relevant to the phase — not all upfront.

**Project paths are relative to the project root** — the directory containing `pipeline-status.json`.

**Plugin paths** — Templates and references live in the plugin's installation directory, not the project. At startup (Step 2 below), you must locate the plugin directory and record its path so downstream phases can find templates.

## Pipeline Phases

Each phase is a separate skill invoked via the Skill tool. Phases run in this order because each depends on the previous phase's output — skipping ahead would leave a phase without its required inputs.

| # | Phase | Skill | Reads | Produces |
|---|-------|-------|-------|----------|
| 1 | content-ingest | `content-ingest` | `source-materials/` | `study-notes/` |
| 2 | concept-mapper | `concept-mapper` | `study-notes/` | `synthesis/` |
| 3 | content-auditor | `content-auditor` | `source-materials/` + `study-notes/` + `synthesis/` | `audit/` + corrected files |
| 4 | site-designer | `site-designer` | User preferences | `design/design-spec.md` |
| 5 | site-builder | `site-builder` | `study-notes/` + `synthesis/` + `design/` + `templates/` | `site/` |
| 6 | exam-generator | `exam-generator` | `study-notes/` + `design/design-spec.md` | Practice exam HTML in `site/` |
| 7 | mobile-checker | `mobile-checker` | `site/` | Verification report |

## Startup

### 1. Check for Existing Pipeline

Read `pipeline-status.json`. If it exists and has completed phases:

- Show the user which phases are completed (with timestamps) and which phase comes next.
- Ask: *"Resume from phase {next}, or start fresh?"*
- **Resume:** Skip completed phases, continue from the next pending one.
- **Fresh start:** Delete `pipeline-status.json` and all output directories (`study-notes/`, `synthesis/`, `audit/`, `design/`, `site/`).

### 2. Gather Startup Info

Ask only what's needed to begin:

```
Before I start, what is this course called?
(I'll ask about theme, layout, and exam preferences later when we get to that step.)
```

If the user provides additional preferences upfront (theme, exam format, etc.), record them in `pipeline-status.json` under `designChoices` so the site-designer phase can use them later.

### 3. Initialize Pipeline

1. Verify `source-materials/` exists and contains files. If not, tell the user to create it and add their course files (PDFs, PPTXs, DOCXs, XLSX), then stop.
2. List the discovered files for the user's awareness.
3. **Locate the plugin directory.** The plugin's templates, references, and shared JS live in the plugin installation directory — not the project. Find it by searching for the `templates/` directory that contains `page-templates/` and `themes/`. Try these locations in order:
   - Glob for `**/templates/page-templates/index.html` starting from common plugin paths.
   - The plugin is named `study-site-builder` — search for a directory with that name containing a `.claude-plugin/plugin.json` file.
   - Once found, record the absolute path as `pluginDir` in `pipeline-status.json` so all downstream phases can resolve template and reference paths without re-searching.
4. Create `pipeline-status.json` per the schema in `references/pipeline-status-format.md`, with all phases set to `"pending"`. Include the `pluginDir` field and `courseName`.

## Phase Completion Protocol

This protocol runs after every phase completes.

1. **Verify outputs** — Use Glob to confirm expected files exist. Run phase-specific checks (listed under each phase below).
2. **Update `pipeline-status.json`** — Set the phase status to `"completed"` with a `completedAt` timestamp. Set `currentPhase` to the next phase name. Record `filesProduced` for the phase. See `references/pipeline-status-format.md` for the full schema.
3. **Present a summary** — Report what was produced: file count, key metrics (e.g., term count, flashcard count, pages built).
4. **Pause and ask** — Stop and ask the user before proceeding:

   > *"Phase [N] ([name]) complete. Ready to proceed to Phase [N+1] ([name])?"*

   Wait for the user's confirmation before invoking the next phase. If the user says "stop" or equivalent, let them know they can resume anytime by running `/start` again.

## Phase Dispatch

Work through phases in order. This is the default flow — if the user asks to re-run a specific phase or skip one, adapt accordingly (update `pipeline-status.json` to reflect the actual state).

### Phase 1: content-ingest

**Parallel dispatch:** This phase processes source files in parallel because ingestion is file-independent and parallelism cuts wall-clock time significantly.

1. Scan `source-materials/` — list all files with sizes and types.
2. Group files for parallel agents:
   - Small/simple files (under ~20 slides or ~10 pages): group 2 per agent.
   - Dense files (20+ slides, 10+ pages): 1 per agent.
3. Cap at 5 parallel agents. More than 5 causes diminishing returns and increases error likelihood — queue excess groups for a second round.
4. Pass each agent its file list and the study-notes-format reference. Each agent writes its output files on completion.
5. After all agents finish, run verification.

**Verification:**
- `study-notes/` contains `.md` files.
- Each file has YAML frontmatter with `title`, `source_files`, `topics`, and `lecture_number`.
- Each file has all 7 required sections: Overview, Key Concepts, Frameworks & Mental Models, Formulas & Quantitative Tools, Case Studies, Key Takeaways, Key Terms and Definitions Glossary.
- Each glossary contains all terms that are defined, emphasized, or essential to understanding the material.

Run the phase completion protocol.

### Phase 2: concept-mapper

Invoke the `concept-mapper` skill.

**Verification:**
- `synthesis/conceptual-map.md` exists with headers matching lecture names.
- `synthesis/last-minute-review.md` exists with condensed review content.
- `synthesis/flashcards/` contains one `.json` file per lecture (per-lecture deck files).
- `synthesis/flashcards.json` exists, is valid JSON, and follows `references/flashcard-format.md`.
- Every glossary term from every study note has a corresponding flashcard. Missing flashcards mean lost study material.

Run the phase completion protocol.

### Phase 3: content-auditor

Invoke the `content-auditor` skill.

**Auto-accept corrections:** This phase applies all suggested corrections to `study-notes/` and `synthesis/` files without asking the user. Flagged items are logged in the audit report for reference.

**Verification:**
- `audit/audit-report.md` exists.
- All auto-accepted corrections have been applied to `study-notes/` and `synthesis/` files.

Run the phase completion protocol.

### Phase 4: site-designer

Invoke the `site-designer` skill. This phase asks the user for design preferences directly.

**Verification:**
- `design/design-spec.md` exists with all required sections: Theme, Exam Format, Pages, Exam Configuration, Learning Preferences.

Run the phase completion protocol.

### Phase 5: site-builder

Invoke the `site-builder` skill.

**Verification:**
- `site/` directory exists with `index.html`.
- All pages listed in `design/design-spec.md` have corresponding HTML files.
- Theme CSS is present in `site/`.
- `site/data/flashcards.json` exists.

Run the phase completion protocol.

### Phase 6: exam-generator

Invoke the `exam-generator` skill.

**Verification:**
- Practice exam HTML files in `site/` match the count from `design/design-spec.md`.
- Each exam contains the question types specified in the design spec.

After checkpoint, update `examCount` in `pipeline-status.json`.

Run the phase completion protocol.

### Phase 7: mobile-checker

Invoke the `mobile-checker` skill.

**Auto-fix:** If critical issues are found, automatically attempt to fix them by re-running the relevant site-builder subagent for the affected page(s). Log fixes in the mobile-checker report.

**Verification:**
- Review the mobile-checker report.
- If critical issues remain after one auto-fix attempt, log them as warnings in the completion summary.

Update `pipeline-status.json` to mark this final phase `"completed"`.

## Error Recovery

When a phase fails (skill error, missing files, malformed output):

1. Record the error in `pipeline-status.json` — set the phase status to `"failed"` and add an `error` string describing what went wrong.
2. **Auto-retry once.** Reset the phase to `"pending"` and re-invoke it. Most failures are transient (context limits, tool timeouts) and succeed on retry.
3. **If retry also fails**, log the error and continue to the next phase if possible. If the failed phase's output is required by the next phase (e.g., content-ingest must succeed before concept-mapper), stop the pipeline and report the failure to the user with the error details and all completed work preserved for resumption.

## Completion

When all 7 phases are complete:

1. Verify `pipeline-status.json` shows all phases as `"completed"`.
2. Present a summary: course name, study note count, flashcard count, exam count, pages included, theme selected.
3. Provide deployment guidance. **Be specific** — many users are deploying to GitHub for the first time:

   **Option A: GitHub Pages (recommended for beginners)**

   The `site/` folder is a self-contained static site. GitHub Pages requires `index.html` at the root of the deployed branch. Because `site/` is a subdirectory of your project, you must deploy it separately:

   ```
   Step 1: Open a terminal and cd into the site/ folder
      cd site

   Step 2: Initialize a new git repo inside site/
      git init
      git add .
      git commit -m "Add study site"

   Step 3: Create a GitHub repository (public) and push
      git branch -M main
      git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
      git push -u origin main

   Step 4: Enable GitHub Pages
      Go to your repo on GitHub → Settings → Pages
      Under "Source", select "Deploy from a branch"
      Select branch: main, folder: / (root)
      Click Save

   Step 5: Wait 1-2 minutes, then visit:
      https://YOUR-USERNAME.github.io/YOUR-REPO-NAME
   ```

   **Important:** Do NOT push the entire project directory (with `source-materials/`, `study-notes/`, etc.) and expect GitHub Pages to serve the site. GitHub Pages looks for `index.html` at the root of the branch — it won't find it inside a `site/` subfolder. You must either deploy from within the `site/` folder (recommended) or use a separate branch containing only the `site/` contents.

   **Option B: Open locally** — Open `site/index.html` directly in a browser. Note: flashcards and exams require a local server due to `fetch()` calls. Run `npx serve site` or `python -m http.server -d site` to serve locally.

   **Option C: Netlify / Vercel** — Drag the `site/` folder into the deploy UI, or configure the publish directory as `site/`.

4. Let the user know they can ask to re-run phases, change the theme, or add more exams at any time.

The final `pipeline-status.json` should look like this (all phases completed, `currentPhase` set to `"done"`):

```json
{
  "courseName": "...",
  "sourceDir": "source-materials/",
  "startedAt": "...",
  "currentPhase": "done",
  "phases": [
    {"name": "content-ingest", "status": "completed", "completedAt": "..."},
    {"name": "concept-mapper", "status": "completed", "completedAt": "..."},
    {"name": "content-auditor", "status": "completed", "completedAt": "..."},
    {"name": "site-designer", "status": "completed", "completedAt": "..."},
    {"name": "site-builder", "status": "completed", "completedAt": "..."},
    {"name": "exam-generator", "status": "completed", "completedAt": "..."},
    {"name": "mobile-checker", "status": "completed", "completedAt": "..."}
  ],
  "designChoices": { "...": "..." },
  "examCount": 2,
  "errors": []
}
```
