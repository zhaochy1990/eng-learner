# Eng Learner

English Learning Web App for Chinese-speaking professionals. A monorepo with a Next.js frontend and an Express API backend, both backed by SQLite.

## Project Structure

```
english-learning/       # Next.js 16 frontend (App Router, Tailwind CSS v4, shadcn/ui)
english-learning-api/   # Express 5 API backend (better-sqlite3)
.github/workflows/      # CI/CD (Docker image builds)
```

## Setup

### Prerequisites

- Node.js 20+
- npm

### Frontend

```bash
cd english-learning
npm install
bash scripts/download-ecdict.sh   # Downloads ECDICT dictionary (~200 MB -> data/ecdict.db)
npx tsx scripts/seed-articles.ts  # Seeds sample articles into data/app.db
npm run dev                       # http://localhost:3000
```

### API

```bash
cd english-learning-api
npm install
npm run dev
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint + husky.

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
Scopes (optional): frontend, api, infra
```

Examples:

```
feat(frontend): add dark mode toggle
fix(api): handle empty vocabulary export
docs: update README with setup instructions
ci(infra): add semver tags to Docker workflow
```

## Release Workflow

Releases use [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) to bump versions across all `package.json` files, generate the CHANGELOG, and create a git tag.

```bash
npm run release:dry   # Preview what will happen
npm run release       # Bump version, update CHANGELOG, commit, and tag
git push origin master --follow-tags
```

For the very first release (no prior tags):

```bash
npm run release:first
```

## Docker

Docker images are built automatically on push to `master` and on version tags (`v*`).

- **Tag push** (`v0.2.0`): images tagged `0.2.0`, `0.2`, `latest`, `sha-xxx`
- **Branch push**: images tagged `latest`, `sha-xxx`

Images are published to `ghcr.io`.
