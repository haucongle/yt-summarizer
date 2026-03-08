#!/bin/bash
# =============================================================
# Temus Tools — Init Script
# Run after all required information has been collected from the user
# Required environment variables before running:
#   PROJECT_NAME, PROJECT_DESCRIPTION, PROJECT_PATH
#   GITLAB_URL, GITLAB_USERNAME, GITLAB_TOKEN, GITLAB_NAMESPACE
# =============================================================

set -e

echo "🚀 Starting project initialization: $PROJECT_NAME"

# --- 1. Create project directory ---
mkdir -p "$PROJECT_PATH"
cd "$PROJECT_PATH"

# --- 2. Generate Next.js project ---
echo "📦 Creating Next.js project..."
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes

# --- 3. Configure static export ---
cat > next.config.ts << 'NEXTCONFIG'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
NEXTCONFIG

# --- 4. Copy .temus-tools folder and AGENTS.md into project ---
echo "📂 Copying .temus-tools into project..."
TEMUS_SRC="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p .temus-tools

# Agent instruction files go to project root so all AI agents can find them
cp "$TEMUS_SRC/AGENTS.md" ./AGENTS.md
cp "$TEMUS_SRC/CODEX.md" ./CODEX.md
cp "$TEMUS_SRC/GEMINI.md" ./GEMINI.md
cp "$TEMUS_SRC/.cursorrules" ./.cursorrules
cp "$TEMUS_SRC/.env.example" ./.env.example
mkdir -p .github
cp "$TEMUS_SRC/copilot-instructions.md" ./.github/copilot-instructions.md

cp "$TEMUS_SRC/stack.md" .temus-tools/
cp "$TEMUS_SRC/README.md" .temus-tools/
cp "$TEMUS_SRC/.env" ./.env
cp "$TEMUS_SRC/project.config.template" .temus-tools/
cp -r "$TEMUS_SRC/commands" .temus-tools/
cp -r "$TEMUS_SRC/scripts" .temus-tools/

# --- 5. Credentials ---
# .env was already copied in step 4
echo "⚠️  Ensure .env has your AWS and GitLab credentials"

# --- 6. Add sensitive files to .gitignore ---
# .env* is already in Next.js default .gitignore
# Allow .env.example to be committed (it's a template, no secrets)
echo "!.env.example" >> .gitignore

# --- 7. Init git and create GitLab repo ---
echo "🔧 Initializing Git repository..."
git init
git add .
git commit -m "chore: initial project setup"

# Create repo on GitLab via API
GITLAB_API="$GITLAB_URL/api/v4"
REPO_PATH="${GITLAB_NAMESPACE}/${PROJECT_NAME// /-}"

echo "📡 Creating GitLab repository..."
GITLAB_RESPONSE=$(curl -s --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data "{
    \"name\": \"$PROJECT_NAME\",
    \"path\": \"${PROJECT_NAME// /-}\",
    \"namespace_path\": \"$GITLAB_NAMESPACE\",
    \"description\": \"$PROJECT_DESCRIPTION\",
    \"visibility\": \"private\",
    \"initialize_with_readme\": false
  }" \
  "$GITLAB_API/projects")

# Extract project ID for use in feature commands (GitLab issue creation)
PROJECT_ID=$(echo "$GITLAB_RESPONSE" | grep -oP '"id":\K[0-9]+' | head -1)
echo "📋 GitLab Project ID: $PROJECT_ID"

# Push to main
git remote add origin "$GITLAB_URL/$REPO_PATH.git"
git branch -M main
git push -u origin main

# --- 8. Create uat and dev branches from main ---
echo "🌿 Creating uat and dev branches..."
git checkout -b uat
git push -u origin uat

git checkout -b dev
git push -u origin dev

# --- 9. Create project.config and generate project.md ---
CREATED_AT=$(date '+%Y-%m-%d %H:%M')
cat > .temus-tools/project.config << PROJECTCONFIG
# Temus Tools — Project Configuration
# Static project settings. Do NOT add dynamic data here.
# Dynamic data (features, deploys) is fetched from GitLab API.

PROJECT_NAME="$PROJECT_NAME"
PROJECT_DESCRIPTION="$PROJECT_DESCRIPTION"
PROJECT_PATH="$PROJECT_PATH"
CREATED_AT="$CREATED_AT"

# GitLab
GITLAB_REPO_URL="$GITLAB_URL/$REPO_PATH"
GITLAB_PROJECT_ID="$PROJECT_ID"
PROJECTCONFIG

# Generate project.md from config + GitLab API
bash .temus-tools/scripts/generate-project-md.sh

git add .temus-tools/project.config
git commit -m "docs: add project configuration"
git push origin dev

# --- 10. Start dev server ---
echo ""
echo "✅ Project is ready!"
echo "📁 Directory: $PROJECT_PATH"
echo "🌐 GitLab repo: $GITLAB_URL/$REPO_PATH"
echo "🌿 Current branch: dev"
echo ""
echo "Starting dev server..."
npm run dev
