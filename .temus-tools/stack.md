# Stack & Convention

## Framework
- **Next.js** (latest stable) with `output: 'export'` (static build)
- TypeScript by default
- Tailwind CSS for styling
- ESLint + Prettier

## Directory structure
```
app/            # App Router (Next.js)
components/     # Shared components
lib/            # Utilities, helpers
types/          # TypeScript types
public/         # Static assets
```

## Default next.config.ts
```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
```

## Naming convention
- Component: `PascalCase` (e.g. `HeroSection.tsx`)
- Utility files: `camelCase` (e.g. `formatDate.ts`)
- CSS class: Tailwind utility classes
- Feature branch: `feature/<number>-<short-name>` (e.g. `feature/3-add-contact-page`)
- Bug branch: `bug/<number>-<short-name>` (e.g. `bug/3-fix-login-button`)

## Commit message
```
<type>: <short description in English>

type: feat | fix | chore | refactor | docs | style
```

## Environment variables
Read from `.env` at project root (never commit this file). Keys:
```
# AWS S3 - Dev
AWS_S3_BUCKET_DEV=
AWS_CLOUDFRONT_URL_DEV=
CF_DISTRIBUTION_DEV=

# AWS S3 - UAT  
AWS_S3_BUCKET_UAT=
AWS_CLOUDFRONT_URL_UAT=
CF_DISTRIBUTION_UAT=

# AWS credentials (shared)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# GitLab
GITLAB_URL=
GITLAB_USERNAME=
GITLAB_TOKEN=
```
