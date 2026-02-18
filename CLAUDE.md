# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

English Learning Web App for Chinese-speaking professionals. Located in `english-learning/` subdirectory. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (new-york style), and SQLite via `better-sqlite3`.

## Commands

All commands run from `english-learning/`:

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint (eslint-config-next with core-web-vitals + typescript)
```

### First-time setup

```bash
cd english-learning
npm install
bash scripts/download-ecdict.sh   # Downloads ECDICT dictionary (~200MB -> data/ecdict.db)
npx tsx scripts/seed-articles.ts  # Seeds sample articles into data/app.db
```

## Architecture

### Two SQLite Databases

- **`data/app.db`** — Application data (articles, vocabulary, reading progress). Auto-created on first request via `src/lib/db.ts`. Uses WAL mode and foreign keys.
- **`data/ecdict.db`** — Read-only ECDICT dictionary with 770k+ English-Chinese entries. Opened read-only via `src/lib/dictionary.ts`. Must be downloaded separately.

### Data Flow

Pages are client components that fetch from Next.js API routes. API routes call synchronous `better-sqlite3` functions from `src/lib/db.ts`. There is no ORM — all SQL is hand-written with parameterized queries.

### Key Modules

- **`src/lib/db.ts`** — Single connection singleton, schema auto-migration, all CRUD operations for articles/vocabulary/progress/stats. Sort keys are validated against a closed allowlist (`VALID_SORT_KEYS`).
- **`src/lib/dictionary.ts`** — ECDICT word lookup with inflection handling. Tries direct match first, then algorithmic base forms (suffix stripping), then doubled-consonant patterns.
- **`src/lib/spaced-repetition.ts`** — SM-2 algorithm variant. Four mastery levels (0=New, 1=Learning, 2=Familiar, 3=Mastered). Four ratings (again/hard/good/easy). All timestamps are UTC to match SQLite's `datetime('now')`.
- **`src/lib/text-utils.ts`** — Shared paragraph/sentence splitting used by both the article reader and TTS hook. Changes here affect both.
- **`src/lib/types.ts`** — Shared TypeScript interfaces (`Article`, `VocabularyItem`) and validation constants (`VALID_DIFFICULTIES`, `VALID_CATEGORIES`).

### API Routes

All under `src/app/api/`:
- `articles/` — GET (list with filters), POST (create with validation)
- `articles/[id]/` — GET (single article), PUT (reading progress), DELETE
- `vocabulary/` — GET (list with filters/sort), POST (save word), DELETE (batch)
- `vocabulary/review/` — GET (words due for review), POST (submit review rating)
- `vocabulary/export/` — GET (CSV export)
- `dictionary/` — GET (ECDICT word lookup)
- `translate/` — POST (phrase translation via composite dictionary lookups)
- `stats/` — GET (dashboard stats)

### UI Components

- **`article-reader.tsx`** — Core reader: renders paragraphs/sentences, handles word click (dictionary popup) and text selection (phrase translation), tracks saved words with highlighting.
- **`word-popover.tsx`** — Dictionary popup shown on word click. Displays translation, phonetic, POS, definition. Has "Save Word" action.
- **`tts-player.tsx`** — TTS controls (play/pause, speed, sentence navigation). Uses `use-tts.ts` hook which wraps Web Speech API.
- **`add-article-dialog.tsx`** — Multi-mode article creation (paste text, import URL, AI generate, web search).
- **`ui/`** — shadcn/ui components. Add new ones via `npx shadcn@latest add <component>`.

### Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json).
