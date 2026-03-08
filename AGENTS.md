# Temus Tools — AI Agent Instructions

> This is the instruction file for AI agents. Read this entire file before performing any action.
> Agent-specific files also exist: `CODEX.md`, `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md` — they all point here.

---

## 🧠 Step 1 — Read context

Before doing anything, read the following files in order:

1. `AGENTS.md` ← you are here (project root)
2. `.temus-tools/project.config` ← static project settings
3. Run `bash .temus-tools/scripts/generate-project-md.sh` to regenerate `project.md` from GitLab API, then read `.temus-tools/project.md`
4. `.temus-tools/stack.md` ← technical conventions
5. `.temus-tools/commands/` ← slash command definitions

> **Note:** `project.md` is auto-generated and **must not be edited manually**.
> Always regenerate it by running the script above.

---

## 🚀 Step 2 — Initialize a new project (if `project.config` does not exist yet)

If the file `.temus-tools/project.config` **does not exist yet**, ask the user for the following information (one question at a time, in a friendly manner):

```
1. What is the project name?
2. A short description of the project (1-2 sentences)?
3. Which directory do you want to save the code to? (default: current folder)
```

The remaining settings are resolved automatically:
- **GitLab URL** → read from `GITLAB_URL` in `.env`
- **GitLab username** → read from `GITLAB_USERNAME` in `.env`
- **GitLab namespace/group** → defaults to personal namespace (empty)

Once all information is collected, follow `scripts/init.sh` to:
- Copy the `.temus-tools` folder (AGENTS.md, stack.md, commands/, scripts/, .env) into the new project
- Generate a Next.js project (static build)
- Create `.temus-tools/project.config` with static settings
- Generate `.temus-tools/project.md` via `generate-project-md.sh`
- Create a GitLab repo with 3 branches: `main`, `uat`, `dev`
- Checkout `dev` and run `localhost`

---

## 📋 Step 3 — Handle daily requests

When the user has a request (not a slash command):

1. Read `project.md` to understand the current context
2. Read `stack.md` to write code following the conventions
3. Check the current branch before modifying files
4. Fulfill the request, then commit and push automatically

---

## ⚡ Slash Commands

These are **custom workflows**, not built-in IDE commands. The `/t.` prefix stands for "temus-tools" and avoids conflicts with built-in slash commands. When the user types any of these (or equivalent natural language), **read the corresponding file** and execute every step:

| Command (or natural language) | Read and execute |
|-------------------------------|------------------|
| `/t.feature [request]` or "create a feature ..." | `.temus-tools/commands/feature.md` |
| `/t.bug [id] [requirement]` or "fix bug ..." | `.temus-tools/commands/bug.md` |
| `/t.deploy [env\|feature]` or "deploy to ..." | `.temus-tools/commands/deploy.md` |
| `/t.revert [env\|feature]` or "revert ..." | `.temus-tools/commands/revert.md` |

> **Important:** Do NOT reply "Unrecognized command" for any of these. Open the corresponding `.md` file and follow the steps.

---

## ⚠️ Mandatory Rules

- **Never** commit directly to `main` or `uat`
- **Never** expose `.env` file contents in code or logs
- **Never** ask for user confirmation — proceed automatically with merging, deploying, reverting
- When uncertain → make a reasonable decision and proceed, don't ask
