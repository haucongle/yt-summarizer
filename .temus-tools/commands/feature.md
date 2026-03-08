# Command: /t.feature [request]

## Purpose
Create a new feature branch from `dev`, checkout, start the dev server, then implement the request.

## Steps

### 1. Create a GitLab Issue to reserve a unique feature ID

> **Why:** GitLab issues have auto-incrementing `iid` (project-scoped).
> This guarantees no duplicate IDs, even when multiple developers run
> `/feature` at the same time.

```bash
# Read credentials and config
source .env
source .temus-tools/project.config

# PROJECT_ID is stored in project.config as GITLAB_PROJECT_ID

# Create a GitLab issue with detailed description
# The description should include: requirement, planned approach, and acceptance criteria
curl -s --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "feat: <short description of the request>",
    "labels": "feature",
    "description": "## Requirement\n<what the user requested>\n\n## Planned Solution\n<brief description of the approach and key changes>\n\n## Files to Change\n- `<file1>` — <what will change>\n- `<file2>` — <what will change>"
  }' \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/issues"

# Extract the issue iid from the response → this is <N>
```

### 2. Name the branch
- Format: `feature/<N>-<slug>`
- `<N>` = the GitLab issue `iid` from step 1 (guaranteed unique)
- Slug: translate the request to English, kebab-case, max 5 words
- Example: issue iid=3, request "add contact page" → `feature/3-add-contact-page`

### 3. Create and push the branch
```bash
git fetch origin
git checkout dev
git pull origin dev
git checkout -b feature/<N>-<slug>
git push -u origin feature/<N>-<slug>
```

### 4. Feature tracking (GitLab is the single source of truth)

> **Do NOT manually edit the feature table in `project.md`.**
> Feature tracking is managed via GitLab Issues + branches.
> The AI agent can query the current feature list at any time:

```bash
# List all open feature issues
curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/issues?labels=feature&state=opened" \
  | jq '.[] | {iid, title, state}'

# List all feature branches
git fetch origin
git branch -a | grep "feature/"
```

This avoids all merge conflicts on `project.md` when multiple developers
create features simultaneously.

### 5. Start dev server & implement the request
```bash
npm run dev
```
Notify when ready → start coding as requested by the user.

### 6. After completion → update issue, commit, push, and create MR into `dev`

This is the **final step**. Do it automatically without asking:

```bash
# 6a. Update the GitLab issue with actual implementation details
curl -s --request PUT \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "description": "## Requirement\n<what the user requested>\n\n## Solution\n<what was actually implemented and how>\n\n## Code Changes\n- `<file1>` — <what changed and why>\n- `<file2>` — <what changed and why>\n\n## Notes\n<any important details, edge cases handled, or decisions made>"
  }' \
  "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/issues/<N>"

# 6b. Stage and commit all changes
git add .
git commit -m "feat: <short description>"

# 6c. Push the feature branch
git push origin feature/<N>-<slug>

# 6d. Create a Merge Request into dev via GitLab API
curl -s --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "source_branch": "feature/<N>-<slug>",
    "target_branch": "dev",
    "title": "feat: <short description>",
    "description": "Closes #<N>",
    "remove_source_branch": false
  }' \
  "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/merge_requests"
```

Report the MR URL when done.

## Example
```
/feature add about page
→ GitLab issue created: #4
→ Create branch: feature/4-add-about-page
→ Server: http://localhost:3000
→ Implement: create app/about/page.tsx ...
→ MR description includes "Closes #4"
```
