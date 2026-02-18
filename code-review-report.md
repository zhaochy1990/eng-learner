# Code Review Report

**Scope**: `/home/zhaochy/learning` (full project)
**Files scanned**: 50+
**Date**: 2026-02-18

## Summary
- CRITICAL: 2
- HIGH: 5
- MEDIUM: 9
- LOW: 5

## Inline Findings

### Security

- `english-learning-api/.env:4` — [CRITICAL] Hardcoded database password (`YourDevPassword123!`) in a file tracked by git. The `.env` file appears to be committed (shows as modified in `git status`), leaking credentials into version history.
  - **Suggestion**: Remove `.env` from git tracking (`git rm --cached english-learning-api/.env`), add it to root `.gitignore`, and rotate the password. Provide a `.env.example` with placeholder values instead.

- `docker-compose.yml:6,30` — [CRITICAL] SA password (`YourDevPassword123!`) hardcoded in plain text in a committed file. Same password appears in both the `sqlserver` service and the `api` service environment.
  - **Suggestion**: Use a `.env` file (gitignored) for docker-compose variables with `${DB_PASSWORD}` interpolation, or use Docker secrets.

- `english-learning-api/src/index.ts:22` — [HIGH] No request body size limit on `express.json()`. An attacker could send arbitrarily large JSON payloads to exhaust server memory.
  - **Suggestion**: Add `express.json({ limit: '1mb' })` or an appropriate limit.

- `english-learning-api/src/routes/*` — [HIGH] No authentication or authorization on any API endpoint. All CRUD operations (articles, vocabulary, review) are publicly accessible.
  - **Suggestion**: Add authentication middleware (e.g., session-based or JWT) if the app will be exposed beyond localhost.

- `english-learning-api/src/routes/*` — [MEDIUM] No rate limiting on any endpoint. Dictionary lookups, review submissions, and article creation can be called without throttling.
  - **Suggestion**: Add `express-rate-limit` middleware to protect against abuse.

- `english-learning-api/src/routes/review.ts:19` — [MEDIUM] The `limit` query parameter is parsed with `Number()` but not bounded. A request like `?limit=999999999` could attempt to fetch all records.
  - **Suggestion**: Clamp `limit` to a reasonable max: `Math.min(Number(req.query.limit || '30'), 100)`.

- `english-learning-api/src/routes/articles.ts:61` — [LOW] `Number(req.params.id)` converts non-numeric strings to `NaN`, which passes through to the SQL query. While parameterized queries prevent injection, `NaN` may cause unexpected behavior.
  - **Suggestion**: Validate that the ID is a positive integer and return 400 if not.

### Performance

- `english-learning/src/components/article-reader.tsx:180-191` — [MEDIUM] Fetches the entire vocabulary list (`GET /api/vocabulary`) on every article page mount just to build a `Set` of saved words for highlighting. With large vocabulary sets, this wastes bandwidth and time.
  - **Suggestion**: Add a lightweight API endpoint (e.g., `GET /api/vocabulary/words`) that returns only the word strings, or use a server-side check.

- `english-learning/src/app/page.tsx:53-60` — [MEDIUM] Dashboard fetches all articles (`GET /api/articles`) then `.slice(0, 8)` on the client. Transfers unnecessary data.
  - **Suggestion**: Add a `limit` query parameter to the articles API and use `?limit=8` on the dashboard.

- `english-learning-api/src/lib/dictionary.ts:74-81` — [MEDIUM] `db.prepare()` is called inside a loop for each base form lookup. While `better-sqlite3` caches prepared statements internally, explicitly preparing once and reusing would be cleaner and marginally faster.
  - **Suggestion**: Prepare the lookup statement once at module level: `const lookupStmt = db.prepare('SELECT * FROM stardict WHERE word = ? COLLATE NOCASE')`.

- `english-learning-api/src/routes/export.ts:16` — [LOW] CSV export fetches all vocabulary with no pagination. Very large vocabularies could cause high memory usage and slow responses.
  - **Suggestion**: Consider streaming the CSV response for large datasets.

### Concurrency

- `english-learning-api/src/lib/db.ts:18-24` — [MEDIUM] `initPool()` has a race condition. If called concurrently before `pool` is set, multiple connection pools could be created. Node.js is single-threaded for synchronous code, but the `await` yields control.
  - **Suggestion**: Store the connection promise (not the result) to deduplicate concurrent calls: `let poolPromise: Promise<sql.ConnectionPool> | null = null;`.

### Code Quality

- `CLAUDE.md` — [MEDIUM] Documentation states the app database is SQLite with `better-sqlite3`, but `db.ts` now uses `mssql` (Azure SQL). The "Two SQLite Databases" section, data flow description, and "synchronous `better-sqlite3` functions" note are all outdated.
  - **Suggestion**: Update CLAUDE.md to reflect the Azure SQL migration. Keep the ECDICT SQLite reference accurate.

- `english-learning/src/app/page.tsx:79-81` and `english-learning/src/app/articles/page.tsx:100-109` — [MEDIUM] `scroll_position` is treated as a 0-1 fraction (multiplied by 100 for percentage), but the save logic at `english-learning/src/app/articles/[id]/page.tsx:100,109` stores `window.scrollY` (absolute pixels). The dashboard and article list progress bars display nonsensical values.
  - **Suggestion**: Normalize `scroll_position` to a 0-1 fraction before saving: `scrollPos / document.documentElement.scrollHeight`. Or store pixels and compute percentage on display.

- `english-learning-api/scripts/migrate-data.ts:99,124,156` — [MEDIUM] SQL string interpolation in `DBCC CHECKIDENT` calls: `` `DBCC CHECKIDENT ('articles', RESEED, ${maxId})` ``. While `maxId` is typed as `number`, this bypasses parameterized query safety.
  - **Suggestion**: Use parameterized input or explicitly validate `maxId` is a safe integer before interpolation.

- `english-learning-api/src/lib/db.ts:96-100` — [LOW] `toISOString` truncates timezone info by removing `T` and taking a substring. This produces ambiguous datetime strings that could be misinterpreted.
  - **Suggestion**: Return ISO 8601 format directly or document the expected format.

- `english-learning/src/app/vocabulary/review/page.tsx:17-26` — [LOW] `VocabularyWord` interface duplicates `VocabularyItem` from `@/lib/types` (comment at line 15 even mentions it but doesn't use it).
  - **Suggestion**: Import and use `VocabularyItem` from `@/lib/types` instead of the local duplicate.

- `english-learning/src/app/vocabulary/page.tsx:67-69` — [LOW] `getMasteryStars` duplicates the same function from the API's `spaced-repetition.ts`. Could reuse a shared utility.
  - **Suggestion**: Move to a shared frontend utility or import from `@/lib/spaced-repetition`.

### Test Coverage

- `english-learning-api/` — [HIGH] Zero test files exist. No unit tests for database functions (`db.ts`), spaced-repetition algorithm (`spaced-repetition.ts`), dictionary lookup (`dictionary.ts`), or any route handler.
  - **Suggestion**: Add tests for: `calculateNextReview` (pure function, easy to test), `getBaseForms` inflection logic, route handlers with supertest, and database operations with an in-memory/test database.

- `english-learning/` — [HIGH] Zero test files exist. No component tests, no integration tests, no e2e tests for the frontend.
  - **Suggestion**: Add Vitest + React Testing Library for component tests. Prioritize: `text-utils.ts` (pure functions), `use-tts.ts` hook behavior, and `article-reader.tsx` word tokenization.

- `english-learning-api/src/lib/spaced-repetition.ts` — [HIGH] The SM-2 algorithm variant is a core business logic module with no tests. Edge cases (boundary mastery levels, interval calculations, timezone handling) are untested.
  - **Suggestion**: Add unit tests covering all 4 ratings at each mastery level (0-3), verifying both `newLevel` and `nextReviewAt` output.

## Architecture Observations

1. **Documentation drift**: CLAUDE.md describes SQLite as the app database, but the codebase has migrated to Azure SQL (`mssql`). This will mislead future contributors and AI assistants working on the project.

2. **No authentication layer**: All API endpoints are unauthenticated. If deployed beyond localhost, any user can delete articles, manipulate vocabulary, or export data. Consider adding at least basic auth or API key middleware.

3. **Mixed database paradigm**: The dictionary uses synchronous `better-sqlite3` while app data uses async `mssql`. Route handlers must handle both patterns. This is acceptable given the read-only nature of the dictionary, but worth documenting.

4. **No pagination**: Neither the articles list nor vocabulary list endpoints support pagination. Both return all records. This will degrade as data grows.

5. **Credentials in version control**: The SA password appears in both `docker-compose.yml` and the `.env` file. Even if rotated, the credentials exist in git history.

6. **Zero test coverage**: The CI pipeline (`ci.yml`) runs only `lint` and `build`. There is no test step because no tests exist. This is the single largest quality gap in the project.

7. **Incomplete features**: The "AI Generate" and "Web Search" tabs in `add-article-dialog.tsx` are placeholder stubs that display "coming soon" messages. Consider removing them or marking them as disabled to avoid user confusion.

## Recommendations

1. **Remove credentials from git history** — Rotate the SA password, remove `.env` from tracking, and use `.env.example` with placeholders. Update `docker-compose.yml` to reference environment variables.
2. **Add tests** — Start with pure functions (`spaced-repetition.ts`, `text-utils.ts`, `getBaseForms`), then add API route integration tests with `supertest`. Aim for core business logic coverage first.
3. **Fix scroll_position bug** — Normalize to a 0-1 fraction before saving, so dashboard and article list progress bars display correctly.
4. **Add request body size limit** — `express.json({ limit: '1mb' })` to prevent memory exhaustion.
5. **Add pagination** — Both articles and vocabulary list endpoints should support `limit` and `offset` parameters.
6. **Update CLAUDE.md** — Reflect the Azure SQL migration to keep documentation accurate.
7. **Add authentication** — At minimum, API key middleware before deploying beyond localhost.
8. **Fix initPool race condition** — Cache the connection promise, not just the result.
9. **Bound the review limit parameter** — Clamp to a reasonable max (e.g., 100).
10. **Add a CI test step** — Once tests exist, add `npm test` to the CI workflow.
