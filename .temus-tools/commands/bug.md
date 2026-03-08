# Command: /t.bug [id] [requirement]

## Purpose
Create a bug-fix branch from `dev` to fix a bug related to feature `#<id>`, then create an MR back into `dev`.

## Syntax
```
/t.bug 3 login button not working
→ Creates branch: bug/3-login-button-not-working
→ Fixes the bug, commits, pushes, creates MR into dev
```

## Steps

### 1. Create a GitLab Issue for the bug

```bash
# Read credentials and config
source .env
source .temus-tools/project.config

# Create a bug issue linked to the original feature
curl -s --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "fix: <short description of the bug>",
    "labels": "bug",
    "description": "## Related Feature\n#<id>\n\n## Bug Description\n<what the user reported>\n\n## Expected Behavior\n<what should happen>\n\n## Planned Fix\n<brief description of the approach>"
  }' \
  "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/issues"
```

### 2. Name the branch
- Format: `bug/<id>-<slug>`
- `<id>` = the **feature issue id** provided by the user (not the bug issue id)
- Slug: translate the requirement to English, kebab-case, max 5 words
- Example: `/t.bug 3 login button not working` → `bug/3-login-button-not-working`

### 3. Create and push the branch
```bash
git fetch origin
git checkout dev
git pull origin dev
git checkout -b bug/<id>-<slug>
git push -u origin bug/<id>-<slug>
```

### 4. Start dev server & fix the bug
```bash
npm run dev
```
Notify when ready → start fixing the bug as described.

### 5. After completion → update issue, commit, push, and create MR into `dev`

This is the **final step**. Do it automatically without asking:

```bash
# 5a. Update the bug issue with actual fix details
curl -s --request PUT \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "description": "## Related Feature\n#<id>\n\n## Bug Description\n<what was reported>\n\n## Root Cause\n<what caused the bug>\n\n## Fix\n<what was changed to fix it>\n\n## Code Changes\n- `<file1>` — <what changed and why>\n- `<file2>` — <what changed and why>"
  }' \
  "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/issues/<bug_issue_iid>"

# 5b. Stage and commit all changes
git add .
git commit -m "fix: <short description> (#<id>)"

# 5c. Push the bug branch
git push origin bug/<id>-<slug>

# 5d. Create a Merge Request into dev via GitLab API
curl -s --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "source_branch": "bug/<id>-<slug>",
    "target_branch": "dev",
    "title": "fix: <short description> (#<id>)",
    "description": "Fixes bug related to #<id>\nCloses #<bug_issue_iid>",
    "remove_source_branch": false
  }' \
  "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/merge_requests"
```

Report the MR URL when done.

## Example
```
/t.bug 3 login button not working
→ GitLab bug issue created: #7
→ Create branch: bug/3-login-button-not-working
→ Server: http://localhost:3000
→ Fix the bug in the relevant files
→ Commit: "fix: login button not working (#3)"
→ MR created into dev
```
