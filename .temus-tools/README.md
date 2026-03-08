# 🛠️ Temus Tools

> A system to help create and deploy web projects — designed for non-technical users.
> Works with any AI agent: GitHub Copilot, Claude Code, Cursor, Codex, Windsurf, etc.

---

## How to get started?

You **don't need to know how to code**. Just open your AI coding assistant and chat naturally.

### First time (new project)

1. Open your AI agent (Copilot, Cursor, Claude Code, etc.)
2. Say: **"I want to create a new project"**
3. The AI will ask you a few simple questions (project name, description, where to save...)
4. The AI will automatically create the project, connect to GitLab, and open the website on your machine

### Next time (returning to an existing project)

1. Open the project directory in your editor
2. The AI reads `AGENTS.md` at the project root and is ready to work

---

## Commands you can use

### `/t.feature [description]`
Create a new feature for the website.

**Examples:**
```
/t.feature add contact form with email input
/t.feature create company about page
/t.feature add call button in corner of screen
```

The AI will create a GitLab issue, write the code, commit, push, and create a Merge Request automatically.

---

### `/t.bug [id] [description]`
Fix a bug related to a feature.

**Examples:**
```
/t.bug 3 login button not working
/t.bug 1 page title is wrong
```

The AI will create a bug-fix branch from `dev`, fix the issue, and create a Merge Request.

---

### `/t.deploy [environment]`
Publish the website to the internet.

| Command | Meaning |
|---|---|
| `/t.deploy dev` | Deploy to the **development** (dev) environment |
| `/t.deploy uat` | Deploy to the **review** (UAT) environment for team review |
| `/t.deploy feature/3-...` | Deploy feature #3 to the dev environment for preview |

---

### `/t.revert [target]`
Undo the most recent change.

| Command | Meaning |
|---|---|
| `/t.revert dev` | Undo the last change on dev |
| `/t.revert uat` | Restore UAT to the state before the most recent deployment |
| `/t.revert feature/3-...` | Remove feature #3 from dev |

---

## What do you need to prepare?

Before getting started, you need:

1. **`.env` file** — contains AWS and GitLab credentials (copy from `.env.example`)
   - Provided by your technical team
   - Never commit this file to git

2. **An AI coding assistant** — GitHub Copilot, Cursor, Claude Code, Codex, etc.

3. **Node.js** version 18 or higher

4. **AWS CLI** and **Git** installed

---

## How to use with each AI agent

### Claude Code (recommended)

```bash
npm install -g @anthropic-ai/claude-code
cd my-project
claude
```
Then type commands directly:
```
> /t.feature add contact page
> /t.deploy dev
> /t.bug 3 login button broken
> /t.revert uat
```
Claude Code reads `AGENTS.md` and follows all 4 commands reliably.

---

### GitHub Copilot (in VS Code)

1. Install the **GitHub Copilot** extension in VS Code
2. Open the project folder in VS Code
3. Open **Copilot Chat** (Agent mode) and type:
```
> /t.feature add contact page
> /t.deploy dev
> /t.bug 3 login button broken
```
Copilot reads `.github/copilot-instructions.md` automatically.

---

### Cursor

1. Download [Cursor](https://cursor.sh) and open the project
2. Open **Cursor Chat** and type:
```
> /t.feature add contact page
> /t.deploy dev
> /t.bug 3 login button broken
```
Cursor reads `.cursorrules` automatically.

---

### OpenAI Codex CLI

```bash
npm install -g @openai/codex
cd my-project
codex
```
Type commands directly:
```
> /t.feature add contact page
> /t.deploy dev
> /t.bug 3 login button broken
> /t.revert dev
```
Or use natural language: "create a feature: add contact page"

Codex reads `CODEX.md`.

---

### Gemini CLI

```bash
npm install -g @google/gemini-cli
cd my-project
gemini
```
Type commands directly:
```
> /t.feature add contact page
> /t.deploy dev
> /t.bug 3 login button broken
> /t.revert uat
```
Or use natural language: "deploy to dev"

Gemini reads `GEMINI.md`.

---

### Agent compatibility summary

| Agent | Instruction File | `/t.*` commands | Natural language |
|-------|-----------------|-----------------|-----------------|
| Claude Code | `AGENTS.md` | ✅ All 4 work | ✅ |
| GitHub Copilot | `.github/copilot-instructions.md` | ✅ All 4 work | ✅ |
| Cursor | `.cursorrules` | ✅ All 4 work | ✅ |
| Codex CLI | `CODEX.md` | ✅ All 4 work | ✅ |
| Gemini CLI | `GEMINI.md` | ✅ All 4 work | ✅ |

---

## Directory structure

```
my-project/
├── AGENTS.md                ← Instructions for AI (Claude Code)
├── CODEX.md                 ← Instructions for Codex CLI
├── GEMINI.md                ← Instructions for Gemini CLI
├── .cursorrules             ← Instructions for Cursor
├── .github/
│   └── copilot-instructions.md ← Instructions for GitHub Copilot
├── .temus-tools/
│   ├── project.config       ← Static project settings
│   ├── project.md           ← Auto-generated project info (do not edit)
│   ├── stack.md             ← Technical conventions
│   ├── .env                 ← Credentials (not committed)
│   ├── commands/
│   │   ├── feature.md       ← /feature command definition
│   │   ├── bug.md           ← /bug command definition
│   │   ├── deploy.md        ← /deploy command definition
│   │   └── revert.md        ← /revert command definition
│   └── scripts/
│       ├── init.sh              ← Project initialization script
│       ├── deploy.sh            ← Deployment script
│       └── generate-project-md.sh ← Regenerates project.md
└── README.md                ← This file
```

---

## Frequently asked questions

**Q: Which AI agents are supported?**
A: Any agent that can read files and run terminal commands — GitHub Copilot, Claude Code, Cursor, Codex, Windsurf, Aider, etc.

**Q: What if project.md looks wrong?**
A: Tell the AI: "regenerate project.md" — it will re-run the generation script.

**Q: The website doesn't show up after deploying?**
A: Wait about 2–5 minutes for CloudFront to update. If it still doesn't work, tell the AI.

**Q: I want to see the history of changes?**
A: Ask the AI: "Show me the deploy history" or "What features have I created?"
