# Command: /t.revert [target]

## Purpose
Revert the most recent merge request or revert a specific feature branch.

## Syntax
```
/t.revert dev              → revert the most recent MR merged into dev
/t.revert uat              → revert the most recent MR merged into uat  
/t.revert feature/<N>-...  → revert the MR of that branch into dev
```

## Processing Logic

### Case 1: `/t.revert dev`
```
1. Find the most recent merge commit on the dev branch:
   git log dev --merges --oneline -5
   (display a list for the user to choose from if needed)

2. Revert the merge commit:
   git checkout dev
   git pull origin dev
   git revert -m 1 <merge-commit-hash>
   git push origin dev

4. Report:
   "✅ Revert successful. Revert commit: [new hash]"
```

### Case 2: `/t.revert uat`
```
1. Find the most recent merge commit on the uat branch:
   git log uat --merges --oneline -5

2. Revert the merge commit (same as dev)

3. Automatically re-deploy UAT after the revert
```

### Case 3: `/t.revert feature/<N>-...`
```
1. Find the merge commit of that branch into dev:
   git log dev --merges --grep="feature/<N>" --oneline

2. If not yet merged → delete the branch automatically

3. If already merged → revert same as case 1
```

## Notes
- Always use `git revert` (creates a new commit), NEVER use `git reset --hard`
- After revert → automatically re-deploy the affected environment
