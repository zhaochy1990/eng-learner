# Code Review Results — 2026-02-18 Round 1

## High Risk Issues

### H1. SQL Injection via dynamic sort clause
- **File**: `src/lib/db.ts` line 201 (`getVocabulary`)
- **Risk**: The `sort` parameter is used to build the ORDER BY clause. Although it goes through a `sortMap` lookup, the fallback `|| 'v.created_at DESC'` means any unrecognised key silently produces a valid query. However, the real risk is that `sortMap[filters?.sort || 'date']` uses `filters?.sort` as an object key — if a future developer adds a user-controlled value that bypasses the map (e.g. by extending the API), this pattern is fragile. Currently NOT exploitable because the map is closed, but the pattern is an anti-pattern.
- **Suggestion**: Add explicit validation — if `sort` is not in `sortMap`, reject or default explicitly. Do not use a fallback string concatenation.

### H2. `sendBeacon` uses PATCH semantics but sends POST
- **File**: `src/app/articles/[id]/page.tsx` lines 128-131
- **Risk**: `navigator.sendBeacon()` always sends a `POST` request. The API route at `/api/articles/[id]` only handles `PATCH` for reading progress updates. Consequently, the `sendBeacon` call on page unmount will **never succeed** — the server will return 405 Method Not Allowed (or potentially hit the `POST` handler which doesn't exist on this route). Reading progress on page leave is silently lost.
- **Suggestion**: Either (1) add a dedicated `POST` handler on the `[id]` route that aliases to the PATCH logic, (2) create a separate `/api/articles/[id]/progress` POST endpoint for beacon use, or (3) use `fetch` with `keepalive: true` instead of `sendBeacon` to preserve the PATCH method.

### H3. Completion scroll handler fires unbounded PATCH requests
- **File**: `src/app/articles/[id]/page.tsx` lines 137-158
- **Risk**: The "mark complete" scroll handler fires `fetch(PATCH)` on **every scroll event** once the user is near the bottom. There is no debounce, no flag to skip after the first success. On a typical scroll, this could fire dozens of times per second, flooding the server with redundant PATCH requests.
- **Suggestion**: Add a `completedRef` guard that is set to `true` after the first successful PATCH, and skip all subsequent calls.

### H4. `deleteWords` with empty array generates invalid SQL
- **File**: `src/lib/db.ts` lines 238-242
- **Risk**: If `ids` is an empty array, this produces `DELETE FROM vocabulary WHERE id IN ()` which is invalid SQL and will throw a runtime error. The API route does check `Array.isArray(body.ids)` but does NOT check `body.ids.length > 0`.
- **Suggestion**: Add an early return if `ids.length === 0` either in `deleteWords` or in the API route.

### H5. No input sanitization on `difficulty` allows CHECK constraint violation
- **File**: `src/app/api/articles/route.ts` POST handler (line 24), `src/lib/db.ts` `createArticle` (line 123)
- **Risk**: The `difficulty` field from the request body is passed directly to the INSERT. The SQLite CHECK constraint restricts it to `('beginner', 'intermediate', 'advanced')`. Any other value will cause a SQLite constraint error that bubbles up as an unhandled 500 error.
- **Suggestion**: Validate `difficulty` against the allowed set in the API route before passing to `createArticle`. Return a 400 error for invalid values.

---

## Medium Risk Issues

### M1. `INTERVALS` constant is declared but never used
- **File**: `src/lib/spaced-repetition.ts` lines 6-11
- **Risk**: Dead code. The `INTERVALS` map is defined but the `calculateNextReview` function uses hardcoded logic and the `GOOD_INTERVALS`/`EASY_INTERVALS` maps instead. Confusing for future maintainers.
- **Suggestion**: Remove the unused `INTERVALS` constant.

### M2. Singleton DB connection with no error recovery
- **File**: `src/lib/db.ts` lines 6-16 (`getDb`)
- **Risk**: If the database connection fails (e.g. corrupted file, disk full), `db` remains `null` and the error propagates. But if the connection *succeeds* initially and later the database becomes unavailable (WAL file corruption, etc.), the cached singleton will continue to be returned with no health check. In a long-running Next.js dev server, this could mask issues.
- **Suggestion**: Consider wrapping in a try/catch, or adding a simple ping test, or at minimum documenting that this is by design for a single-user app.

### M3. Dictionary LIKE query on `exchange` field is slow and imprecise
- **File**: `src/lib/dictionary.ts` lines 80-91
- **Risk**: `SELECT * FROM stardict WHERE exchange LIKE '%word%'` performs a full table scan on 770k+ rows. This is extremely slow (potentially seconds per lookup). Additionally, the LIKE match is imprecise — searching for "run" would match any row whose exchange field contains "run" as a substring (e.g. "running", "rerun"). The subsequent verification helps but the query has already scanned the entire table.
- **Suggestion**: Either (1) create an index on `exchange` (won't help with leading `%`), (2) build a reverse lookup table mapping inflected forms to base words on first use, or (3) skip this lookup path and rely solely on the algorithmic base-form derivation, which is already implemented below.

### M4. `saveWord` duplicate check is case-sensitive
- **File**: `src/lib/db.ts` line 217
- **Risk**: `WHERE word = ?` is case-sensitive in SQLite by default. Saving "Hello" and "hello" would create two separate entries. The vocabulary index `idx_vocabulary_word` is also case-sensitive. This can lead to duplicate vocabulary entries for the same word in different cases.
- **Suggestion**: Use `WHERE word = ? COLLATE NOCASE` or normalize to lowercase before insert/query. The `word` column should consistently store lowercase values.

### M5. `updateReadingProgress` COALESCE logic is subtly wrong for `completed`
- **File**: `src/lib/db.ts` lines 140-162
- **Risk**: When `data.completed` is `false`, line 158 evaluates `data.completed ? 1 : 0` to `0`, and the INSERT uses `0`. But on the ON CONFLICT UPDATE path (line 161), `data.completed !== undefined ? (data.completed ? 1 : 0) : null` correctly passes `0` when `completed` is explicitly `false`. However, the initial INSERT at line 158 will always set `completed = 0` even when the caller passes `completed: undefined` (meaning "don't change"). This means the first time progress is saved for a new article, it always resets `completed` to `0` regardless of whether it was meant to be set.
- **Suggestion**: Use `data.completed !== undefined ? (data.completed ? 1 : 0) : 0` consistently, or separate the insert and update logic.

### M6. Timezone inconsistency between server and SQLite
- **File**: `src/lib/spaced-repetition.ts` lines 53-64, `src/lib/db.ts` (all `datetime('now')` usages)
- **Risk**: SQLite's `datetime('now')` returns UTC. But `calculateNextReview` uses JavaScript's `new Date()` which operates in the server's local timezone, then formats it with `toISOString()` (UTC). If the server timezone is not UTC, the "start of the day" calculation at line 59 (`now.setHours(0, 0, 0, 0)`) would set midnight in the LOCAL timezone, then convert to UTC via `toISOString()`. This creates a mismatch with SQLite's `datetime('now')` comparisons.
- **Suggestion**: Use UTC explicitly throughout: `now.setUTCHours(0, 0, 0, 0)` and document the convention.

### M7. No error handling in any API route for database exceptions
- **Files**: All files in `src/app/api/*/route.ts`
- **Risk**: None of the API routes wrap database calls in try/catch. If SQLite throws (constraint violation, disk error, etc.), the error bubbles up as an unhandled exception, resulting in a generic 500 error with no useful information for debugging. There are also no logs.
- **Suggestion**: Add try/catch blocks around database operations in API routes. Return structured error responses (e.g. `{ error: "message" }` with appropriate status codes). Log errors server-side.

### M8. CSV export doesn't escape all fields consistently
- **File**: `src/app/api/vocabulary/export/route.ts` lines 24-32
- **Risk**: `mastery_level` and `created_at` are appended without CSV escaping. If `created_at` ever contains a comma (unlikely but possible with locale-specific datetime formats in future), the CSV would be malformed. More importantly, the `escapeCsv` function wraps ALL values in quotes (even those without special characters), but `mastery_level` is not wrapped.
- **Suggestion**: Apply `escapeCsv` uniformly to all fields, or at minimum document the intentional inconsistency.

### M9. `handleSentenceChange` depends on `tts` object causing re-renders
- **File**: `src/app/articles/[id]/page.tsx` lines 167-170
- **Risk**: `useCallback` has `[tts]` as a dependency. Since `useTTS` returns a new object on every render, this callback is recreated on every render, defeating the purpose of `useCallback`. This causes `ArticleReader` to re-render on every parent render since `onSentenceChange` is a new reference each time.
- **Suggestion**: Use `tts.jumpToSentence` via a ref, or extract `jumpToSentence` from the destructured tts return and use it directly in the dependency array: `[tts.jumpToSentence]`.

---

## Low Risk Issues

### L1. No pagination on article and vocabulary list endpoints
- **Files**: `src/lib/db.ts` `getAllArticles` (line 69), `getVocabulary` (line 178)
- **Risk**: Both queries return ALL rows with no LIMIT. As the dataset grows, these queries will become increasingly slow and the JSON responses increasingly large.
- **Suggestion**: Add pagination (LIMIT/OFFSET) support to both queries and their corresponding API routes.

### L2. `lookupWord` returns fallback entry instead of null for unknown words
- **File**: `src/lib/dictionary.ts` line 108
- **Risk**: When a word is not found, `createFallbackEntry` returns an entry with all null fields except `word`. The API route at `dictionary/route.ts` (line 13) checks `if (!entry)` to return 404, but `lookupWord` never returns null when the DB is available — it returns the fallback. This means the 404 path is unreachable when ECDICT is loaded; unknown words return 200 with null translations.
- **Suggestion**: Return `null` instead of `createFallbackEntry` when the word is genuinely not found, so the API can return 404. OR change the API to check `if (!entry.translation)` to detect not-found words.

### L3. `vocabulary` table has no UNIQUE constraint on `word`
- **File**: `src/lib/db.ts` schema (line 44-59)
- **Risk**: Although `saveWord` has an application-level duplicate check, concurrent requests or direct DB access could create duplicates. The check-then-insert is not atomic (no transaction wrapping).
- **Suggestion**: Add `UNIQUE` constraint on the `word` column, or use `INSERT ... ON CONFLICT(word) DO NOTHING` pattern.

### L4. Article `updated_at` is never actually updated
- **File**: `src/lib/db.ts` line 31
- **Risk**: The `updated_at` column has a DEFAULT of `datetime('now')` but no code ever issues an UPDATE that modifies `updated_at`. It will always equal `created_at`.
- **Suggestion**: Either add a trigger `AFTER UPDATE SET updated_at = datetime('now')`, or remove the column if it's not needed.

### L5. Review mode parameter is not validated
- **File**: `src/app/api/vocabulary/review/route.ts` line 6
- **Risk**: The `mode` query parameter is cast with `as 'due' | 'new' | 'all'` without validation. A request with `?mode=invalid` will pass the type assertion but cause unexpected behavior in `getWordsForReview` — the switch statement has no `default` case, so `query` would be uninitialized (TypeScript compilation prevents this at compile time, but runtime behavior with arbitrary strings needs a safety net).
- **Suggestion**: Add runtime validation or a `default` case to the switch in `getWordsForReview` that falls back to `'due'`.

### L6. `data` directory is not auto-created
- **File**: `src/lib/db.ts` line 4
- **Risk**: `DB_PATH` points to `data/app.db`, but the `data/` directory may not exist if a user clones the repo fresh without running the seed script. The `new Database(DB_PATH)` call will throw `SQLITE_CANTOPEN`.
- **Suggestion**: Add `fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })` before creating the database.

### L7. No CORS or rate limiting on API routes
- **Files**: All API routes
- **Risk**: All API routes are open with no rate limiting. While this is acceptable for a single-user local app, the articles POST and vocabulary endpoints could be abused if the app is ever exposed to a network.
- **Suggestion**: Document this as a known limitation. Consider adding basic rate limiting if the app will be deployed.

### L8. `getMasteryStars` is defined in multiple places
- **Files**: `src/lib/spaced-repetition.ts` line 78, `src/app/vocabulary/page.tsx` line 92
- **Risk**: Duplicate implementation of the same function. If the logic changes (e.g. 4 stars instead of 3), it must be updated in two places.
- **Suggestion**: Remove the local copy in `vocabulary/page.tsx` and import from `@/lib/spaced-repetition`.

### L9. Reader settings are not persisted
- **File**: `src/components/article-reader.tsx` lines 155-158
- **Risk**: Font size and line spacing settings reset to defaults on every page navigation. Users have to re-set their preferences each time.
- **Suggestion**: Persist settings to `localStorage`.

---

## Consistency Issues

### C1. Error response format inconsistency
- **API routes** use two different patterns:
  - `{ error: "message" }` (dictionary, articles, vocabulary)
  - `{ success: true }` for success (articles DELETE/PATCH, vocabulary DELETE)
  - `{ id: number }` for creation (articles POST, vocabulary POST)
- **Suggestion**: Standardize on a consistent envelope, e.g. always return `{ data: ..., error: null }` or at minimum document the convention.

### C2. Inconsistent error handling pattern in frontend
- Some components silently swallow errors with empty `catch {}` blocks (article-reader.tsx line 305, word-popover.tsx line 142, articles/[id]/page.tsx lines 84, 152)
- Other components show error states (vocabulary/page.tsx, vocabulary/review/page.tsx)
- **Suggestion**: At minimum, log errors to console in catch blocks. Ideally, show user-facing error feedback consistently.

### C3. Inconsistent `speak()` function implementations
- Three separate `speak()` implementations exist:
  - `word-popover.tsx` line 109 (rate: 0.9)
  - `vocabulary/page.tsx` line 101 (rate: 0.9)
  - `vocabulary/review/page.tsx` line 40 (rate: 0.85)
- **Suggestion**: Extract into a shared utility function in `src/lib/speech.ts` with a consistent default rate.

### C4. Mastery level constants duplicated
- Mastery labels ("New", "Learning", "Familiar", "Mastered") are defined in:
  - `src/lib/spaced-repetition.ts` (`getMasteryLabel`)
  - `src/app/vocabulary/page.tsx` (`MASTERY_LABELS`)
  - `src/app/vocabulary/review/page.tsx` (implicit in MODE_LABELS)
- **Suggestion**: Consolidate into a single shared constant in `spaced-repetition.ts` and import.

### C5. Article type defined in multiple places
- The `Article` interface is defined separately in:
  - `src/components/article-reader.tsx` (exported, with optional fields)
  - `src/app/articles/page.tsx` (local, with all fields including `scroll_position`)
  - `src/app/page.tsx` (local, with different field sets)
- **Suggestion**: Define a single canonical `Article` type in a shared types file (e.g. `src/lib/types.ts`) and import everywhere.

### C6. Sentence splitting regex duplicated
- The sentence splitting regex `/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g` is duplicated in:
  - `src/components/article-reader.tsx` line 82 (`tokenise`)
  - `src/hooks/use-tts.ts` line 45 (`splitTextIntoSentences`)
- **Risk**: If the regex is updated in one place but not the other, TTS sentence indexing will be out of sync with the visual sentence highlighting.
- **Suggestion**: Extract to a shared utility function.
