# Codex Instructions

Read and follow ALL instructions in `AGENTS.md` at the project root.

## Custom Commands

When the user says any of the following, read the corresponding file and execute every step inside it:

| User says | Read and execute |
|-----------|-----------------|
| `/t.feature ...` or "create a feature ..." | `.temus-tools/commands/feature.md` |
| `/t.bug ...` or "fix bug ..." | `.temus-tools/commands/bug.md` |
| `/t.deploy ...` or "deploy to ..." | `.temus-tools/commands/deploy.md` |
| `/t.revert ...` or "revert ..." | `.temus-tools/commands/revert.md` |

These are **custom project workflows**, not built-in commands. The `/t.` prefix stands for "temus-tools". When you see `/t.deploy dev`, do NOT reply "Unrecognized command". Instead, open `.temus-tools/commands/deploy.md` and follow the steps.

## Context Files

Before any task, read these files for project context:
- `.temus-tools/project.config` — project settings
- `.temus-tools/stack.md` — coding conventions
- `.env` — credentials (never expose contents)

## Rules

- Never commit directly to `main` or `uat`
- Never ask for user confirmation — proceed automatically
- Always create a GitLab issue before creating a feature/bug branch
- After implementing a feature/bug, automatically commit, push, and create a Merge Request
