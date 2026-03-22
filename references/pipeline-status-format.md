# Pipeline Status Schema

The orchestrator (`start` skill) creates and maintains `pipeline-status.json` in the project root.
Every pipeline skill reads this file to understand current state and updates it upon completion.

## Schema

```json
{
  "courseName": "DOS3704 Operations Strategy",
  "sourceDir": "source-materials/",
  "startedAt": "2026-03-23T02:00:00Z",
  "currentPhase": "content-ingest",
  "phases": [
    {
      "name": "content-ingest",
      "status": "completed",
      "completedAt": "2026-03-23T02:15:00Z",
      "filesProduced": ["study-notes/lecture-01-foundations.md"]
    },
    {
      "name": "concept-mapper",
      "status": "in-progress",
      "startedAt": "2026-03-23T02:16:00Z"
    },
    {
      "name": "content-auditor",
      "status": "pending"
    },
    {
      "name": "site-designer",
      "status": "pending"
    },
    {
      "name": "site-builder",
      "status": "pending"
    },
    {
      "name": "exam-generator",
      "status": "pending"
    },
    {
      "name": "mobile-checker",
      "status": "pending"
    }
  ],
  "designChoices": {
    "theme": "midnight-blue",
    "examFormat": "card-style",
    "pages": ["index", "study-map", "flashcards", "last-minute-review", "sample-questions"],
    "examCount": 2,
    "questionsPerExam": 30,
    "questionTypes": ["multiple-choice", "multiple-multiple-choice", "short-answer", "long-answer"],
    "learningPreferences": {
      "style": "visual",
      "detail": "moderate"
    }
  },
  "examCount": 2,
  "errors": []
}
```

## Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `courseName` | string | yes | Human-readable course name from user |
| `sourceDir` | string | yes | Path to source materials directory |
| `startedAt` | string | yes | ISO 8601 timestamp of pipeline start |
| `currentPhase` | string | yes | Name of the currently executing phase |
| `phases` | array | yes | Ordered array of all 7 phases |
| `phases[].name` | string | yes | Phase skill name (matches skill folder) |
| `phases[].status` | string | yes | One of: `pending`, `in-progress`, `completed`, `failed`, `skipped` |
| `phases[].startedAt` | string | no | ISO 8601 timestamp when phase began |
| `phases[].completedAt` | string | no | ISO 8601 timestamp when phase finished |
| `phases[].filesProduced` | array | no | List of output file paths from this phase |
| `phases[].error` | string | no | Error description if status is `failed` |
| `designChoices` | object | no | Populated by site-designer (Phase 4) |
| `examCount` | number | yes | Number of practice exams generated so far |
| `errors` | array | yes | Array of error strings from any phase |

## Status Transitions

```
pending → in-progress → completed
                      → failed → (retry) → in-progress
pending → skipped (user chose to skip)
```

## Rules

- Only the orchestrator (`start`) creates this file initially
- Each phase updates its own status entry upon starting and completing
- The `currentPhase` field reflects the phase currently executing
- `designChoices` is empty until Phase 4 populates it
- `examCount` starts at 0 and increments with each exam generated
- When resuming a pipeline, read this file to determine where to continue
