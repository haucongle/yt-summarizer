# Command: /t.deploy [target]

## Purpose
Deploy code to AWS S3 + CloudFront environment.

## Syntax
```
/t.deploy dev              → deploy dev branch to the DEV environment
/t.deploy uat              → merge dev→uat, deploy to the UAT environment
/t.deploy feature/<N>-...  → deploy that feature branch to the DEV environment
```

## Processing Logic

### Case 1: `/t.deploy uat`
```
1. Merge dev into uat:
   git checkout uat
   git pull origin uat
   git merge dev --no-ff -m "chore: merge dev into uat for deployment"
   git push origin uat

3. Build & deploy:
   npm run build
   aws s3 sync ./out s3://$AWS_S3_BUCKET_UAT --delete
   aws cloudfront create-invalidation --distribution-id $CF_DISTRIBUTION_UAT --paths "/*"

4. Regenerate project.md and push:
   bash .temus-tools/scripts/generate-project-md.sh
   git add .temus-tools/project.md
   git commit -m "docs: regenerate project.md after UAT deploy"
   git push origin uat

5. Report result:
   "✅ UAT deployment successful! URL: $AWS_CLOUDFRONT_URL_UAT"
```

### Case 2: `/t.deploy dev`
```
1. Merge all approved MRs targeting dev:
   source .env
   source .temus-tools/project.config

   # Fetch all open MRs targeting dev
   MRS=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
     "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/merge_requests?target_branch=dev&state=opened")

   # For each MR, merge it via GitLab API (skip if merge conflicts)
   for mr_iid in $(echo "$MRS" | grep -oP '"iid":\K[0-9]+'); do
     curl -s --request PUT \
       --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
       "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/merge_requests/$mr_iid/merge" \
       --data "merge_when_pipeline_succeeds=false&should_remove_source_branch=false"
     echo "Merged MR !$mr_iid"
   done

2. Checkout and pull dev:
   git checkout dev
   git pull origin dev

3. Build & deploy:
   npm run build
   aws s3 sync ./out s3://$AWS_S3_BUCKET_DEV --delete
   aws cloudfront create-invalidation --distribution-id $CF_DISTRIBUTION_DEV --paths "/*"

4. Regenerate project.md and push:
   bash .temus-tools/scripts/generate-project-md.sh
   git add .temus-tools/project.md
   git commit -m "docs: regenerate project.md after DEV deploy"
   git push origin dev

5. Report:
   "✅ DEV deployment successful! URL: $AWS_CLOUDFRONT_URL_DEV"
   List all MRs that were merged.
```

### Case 3: `/t.deploy feature/<N>-...`
```
1. Checkout and pull the feature branch:
   git checkout feature/<N>-...
   git pull origin feature/<N>-...

2. Build & deploy:
   npm run build
   aws s3 sync ./out s3://$AWS_S3_BUCKET_DEV --delete
   aws cloudfront create-invalidation --distribution-id $CF_DISTRIBUTION_DEV --paths "/*"

3. Report:
   "✅ Feature preview deployed to DEV! URL: $AWS_CLOUDFRONT_URL_DEV"
```

## Read credentials from .env
```bash
# Load from .env file (never print to screen)
source .env
# Or use variables already set in the shell session
```

## Notes
- Never deploy directly to `main`
- If build fails → stop, report the error to the user, do not push
- After successful UAT deploy → automatically create an MR from uat to main
