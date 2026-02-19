# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

English Learning Web App for Chinese-speaking professionals. A monorepo with two packages:

- **`english-learning/`** — Next.js 16 frontend (App Router, TypeScript, Tailwind CSS v4, shadcn/ui new-york style)
- **`english-learning-api/`** — Express 5 API backend (TypeScript, better-sqlite3, JWT auth)

## Commands

### Frontend (`english-learning/`)

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint (eslint-config-next with core-web-vitals + typescript)
npm run test     # Run Vitest tests
```

### API (`english-learning-api/`)

```bash
npm run dev      # Start dev server with hot-reload (tsx watch)
npm run build    # Compile TypeScript (tsc)
npm run start    # Start production server (node dist/index.js)
npm run lint     # Type-check (tsc --noEmit)
npm run test     # Run Vitest tests
```

### Root (monorepo)

```bash
npm run release       # Bump version, update CHANGELOG, commit, and tag
npm run release:dry   # Preview release (no changes)
npm run release:first # First release (no prior tags)
```

### First-time setup

```bash
# Root (installs commitlint + husky)
npm install

# Frontend
cd english-learning
npm install
bash scripts/download-ecdict.sh   # Downloads ECDICT dictionary (~200MB -> data/ecdict.db)
npx tsx scripts/seed-articles.ts  # Seeds sample articles into data/app.db

# API
cd english-learning-api
npm install
# Azure SQL must be running (e.g., `docker-compose up sqlserver`)
# Configure .env with database connection details (DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD, etc.)
# Configure auth: JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH, JWT_ISSUER
```

### Local dev with prod auth service

The local frontend and API can connect to the prod auth service instead of running auth locally.

**1. Frontend (`english-learning/.env.local`)**

Get the prod auth URL and client ID:

```bash
az containerapp show --name auth-backend --resource-group rg-auth-prod \
  --query "properties.configuration.ingress.fqdn" -o tsv
```

Add to `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_URL=https://<auth-backend-fqdn>
NEXT_PUBLIC_AUTH_CLIENT_ID=app_040b1d0551104759b69dfe8c
```

**2. API (`english-learning-api/.env`)**

Get the prod JWT public key:

```bash
az containerapp secret show --name ca-english-learning-api \
  --resource-group rg-english-learning-prod --secret-name jwt-public-key \
  --query "value" -o tsv
```

Set `JWT_PUBLIC_KEY` in `.env` (use `\n` for newlines in the PEM):

```
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----"
```

Note: The `\n` escape sequences are converted to real newlines at runtime by `auth.ts`.

**3. CORS**

The prod auth service must allow `http://localhost:3000` in `CORS_ALLOWED_ORIGINS`. To add it:

```bash
# Get current value
az containerapp secret show --name auth-backend --resource-group rg-auth-prod \
  --secret-name cors-allowed-origins --query "value" -o tsv

# Append http://localhost:3000 to the comma-separated list
az containerapp secret set --name auth-backend --resource-group rg-auth-prod \
  --secrets "cors-allowed-origins=<existing-origins>,http://localhost:3000"

# Restart to apply
az containerapp revision restart --name auth-backend --resource-group rg-auth-prod \
  --revision $(az containerapp revision list --name auth-backend \
  --resource-group rg-auth-prod --query "[0].name" -o tsv)
```

**4. Start both servers**

```bash
cd english-learning && npm run dev      # Frontend on http://localhost:3000
cd english-learning-api && npm run dev  # API on http://localhost:3001
```

## Commit Convention

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint + husky.

Format:

```
<type>(<scope>): <description>
```

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`
- **Scopes (optional):** `frontend`, `api`, `infra`

Examples:

```
feat(frontend): add dark mode toggle
fix(api): handle empty vocabulary export
docs: update README with setup instructions
ci(infra): add semver tags to Docker workflow
```

The `commit-msg` husky hook runs commitlint automatically. Non-conforming messages are rejected.

## Release

Releases use `commit-and-tag-version` (configured in `.versionrc`). A single version in root `package.json` is the source of truth; all three `package.json` files are bumped together.

```bash
npm run release:dry   # Preview
npm run release       # Bump + CHANGELOG + commit + tag
git push origin master --follow-tags
```

## Architecture

### Databases

- **Azure SQL (app data)** — Application data (articles, vocabulary, reading progress). Uses Azure SQL via the `mssql` npm package. Connection is configured via environment variables (`DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, etc.). Schema is auto-created on first connection via `english-learning-api/src/lib/db.ts`.
- **`data/ecdict.db`** — Read-only ECDICT dictionary with 770k+ English-Chinese entries. Opened read-only via `english-learning-api/src/lib/dictionary.ts`. Must be downloaded separately.

### Data Flow

Frontend pages (client components) fetch from the Express API backend via `apiFetch()` which attaches JWT Bearer tokens and handles 401 auto-refresh. The API uses async `mssql` for app data and synchronous `better-sqlite3` for the read-only dictionary. All SQL is hand-written with parameterized queries. The frontend has one Next.js API route (`/api/tts`) for text-to-speech.

### Authentication

- The API delegates user management to an external Rust auth service; it only verifies RS256 access tokens via a public key.
- **`middleware/auth.ts`** — `requireAuth` middleware verifies RS256 JWTs. Applied globally to all `/api` routes. Sets `req.userId` from `decoded.sub`.
- **`lib/auth-client.ts`** (frontend) — Login, register, refresh, logout, token storage (`sessionStorage`), proactive refresh timer.
- **`contexts/auth-context.tsx`** — React context providing `user`, `login`, `register`, `logout` actions. Auto-checks auth on mount.
- **`middleware.ts`** (Next.js) — Route protection via `logged_in` cookie check; redirects to `/login` for unauthenticated users.
- **`lib/api.ts`** — `apiFetch()` wraps `fetch` with Bearer token injection and 401 auto-refresh retry.
- Vocabulary and reading progress are scoped per-user (`user_id` column). Articles remain shared.

### Key Backend Modules (`english-learning-api/src/`)

- **`lib/db.ts`** — Connection pool singleton (`mssql`), Azure SQL, async operations, schema auto-migration, all CRUD operations for articles/vocabulary/progress/stats. All user-scoped functions accept `userId` param.
- **`lib/dictionary.ts`** — ECDICT word lookup with inflection handling. Tries direct match first, then algorithmic base forms (suffix stripping), then doubled-consonant patterns.
- **`lib/spaced-repetition.ts`** — SM-2 algorithm variant. Four mastery levels (0=New, 1=Learning, 2=Familiar, 3=Mastered). Four ratings (again/hard/good/easy). All timestamps are UTC.
- **`lib/types.ts`** — Shared TypeScript interfaces and validation constants.

### API Routes (`english-learning-api/src/routes/`)

- `articles.ts` — GET (list with filters), POST (create), GET/:id, PUT/:id (progress), DELETE/:id
- `vocabulary.ts` — GET (list with filters/sort), POST (save word), DELETE (batch)
- `review.ts` — GET (words due for review), POST (submit review rating)
- `export.ts` — GET (CSV export)
- `dictionary.ts` — GET (ECDICT word lookup)
- `translate.ts` — POST (phrase translation via composite dictionary lookups)
- `stats.ts` — GET (dashboard stats)

### Frontend Key Components (`english-learning/src/`)

- **`components/article-reader.tsx`** — Core reader: renders paragraphs/sentences, handles word click (dictionary popup) and text selection (phrase translation), tracks saved words with highlighting.
- **`components/word-popover.tsx`** — Dictionary popup shown on word click. Displays translation, phonetic, POS, definition. Has "Save Word" action.
- **`components/tts-player.tsx`** — TTS controls (play/pause, speed, sentence navigation). Uses `use-tts.ts` hook which wraps Web Speech API.
- **`components/add-article-dialog.tsx`** — Multi-mode article creation (paste text, import URL, AI generate, web search).
- **`components/nav-bar.tsx`** — Top navigation with user display and logout button. Hidden on auth pages.
- **`components/ui/`** — shadcn/ui components. Add new ones via `npx shadcn@latest add <component>`.
- **`app/login/page.tsx`** and **`app/register/page.tsx`** — Auth pages (shadcn/ui).

### Path Aliases

`@/*` maps to `./src/*` in both packages (configured in tsconfig.json).

## Agent Swarm

Use multi-agent (Task tool) aggressively. This is a monorepo — frontend and API work are always independent and must be parallelized. Examples:

- Lint/build both packages in parallel
- Read/explore frontend and API files simultaneously
- Implement independent changes across packages via separate subagents
- Run frontend lint + API lint + tests all in parallel

Only skip subagents for trivial single-file lookups.
