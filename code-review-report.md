# Code Review Report

**PR**: [#4 feat: add user authentication via external auth service](https://github.com/zhaochy1990/eng-learner/pull/4)
**Author**: zhaochy1990
**Branch**: `feat/user-auth` -> `master`
**Files changed**: 26
**Date**: 2026-02-19

## Summary
- 🔴 Critical: 1
- 🟠 High: 3
- 🟡 Medium: 3
- 🔵 Low: 2

## Inline Findings

### Security
- `english-learning/src/lib/auth-client.ts:59` — [HIGH] `logged_in` cookie set without `Secure`, `SameSite`, or `HttpOnly` flags. Can be leaked over plain HTTP in production or exploited in cross-site scenarios.
  - **Suggestion**: Use `document.cookie = 'logged_in=1; path=/; SameSite=Lax; Secure';` and apply the same attributes on the clear at line 65.
- `english-learning-api/src/middleware/auth.ts:20-23` — [HIGH] Module-level `fs.readFileSync` with a hardcoded fallback path (`../auth/sources/dev/authentication/keys/public.pem`) that leaks internal directory structure. If neither `JWT_PUBLIC_KEY` nor `JWT_PUBLIC_KEY_PATH` is set, the server crashes with an opaque `ENOENT` error on startup.
  - **Suggestion**: Wrap in try/catch, log `"JWT public key not configured — set JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH"`, and call `process.exit(1)`. Remove the hardcoded default path.
- `english-learning-api/src/middleware/auth.ts:43` — [MEDIUM] `decoded.sub` may be `undefined` if the JWT lacks a `sub` claim. All route handlers use `req.userId!` non-null assertion, so an undefined `sub` would propagate as a literal `undefined` string into every SQL query.
  - **Suggestion**: Add a guard: `if (!decoded.sub) { res.status(401).json({ error: 'Token missing sub claim' }); return; }`.
- `english-learning/src/lib/auth-client.ts:57-58` — [MEDIUM] Access and refresh tokens stored in `sessionStorage`, accessible to any JS on the page. An XSS vector (e.g., unsanitized article content) would leak both tokens.
  - **Suggestion**: Accept as known SPA trade-off. Document it. Ensure article content rendering is XSS-safe.

### Performance
No issues found.

### Concurrency
- `english-learning/src/lib/api.ts:25-30` — [MEDIUM] When token refresh fails in `apiFetch`, `clearTokens()` runs and `window.location.href` is set, but the function still returns the original 401 `Response` at line 33. Callers may `.json()` the stale response before the redirect fires, causing unhandled errors in the UI.
  - **Suggestion**: `throw new Error('Session expired')` after `clearTokens()` instead of falling through to `return res`.

### Code Quality
- `english-learning-api/src/lib/db.ts:67-69,86-88` — [CRITICAL] Destructive auto-migration: `DROP TABLE reading_progress` / `DROP TABLE vocabulary` runs on every server startup if the tables exist but lack a `user_id` column. Deploying this against an existing production database silently destroys all vocabulary and reading progress data with no confirmation or backup.
  - **Suggestion**: Gate behind an explicit env flag (e.g., `ALLOW_DESTRUCTIVE_MIGRATION=true`), or use a non-destructive `ALTER TABLE ADD COLUMN` with a default value, or at minimum log a loud warning before dropping.
- `english-learning/src/contexts/auth-context.tsx:96-100` — [LOW] `login` calls `getMe()` after `authLogin()` succeeds. If `getMe()` throws, tokens are stored but `user` stays `null` — the user lands on `/` with a broken UI (no profile, no logout button).
  - **Suggestion**: Wrap `getMe()` in try/catch; on failure call `clearTokens()` and re-throw so the login page shows the error.
- `english-learning-api/src/lib/db.ts:279` — [LOW] `WHERE 1=1 AND v.user_id = @userId` — `user_id` is a mandatory filter, not optional. Using it after `1=1` conflates it with the dynamic optional filters pattern.
  - **Suggestion**: Change to `WHERE v.user_id = @userId` as the base clause, keeping `AND` appends only for optional filters.

### Test Coverage
- `english-learning-api/src/middleware/auth.ts` — [HIGH] No tests for the `requireAuth` middleware — the sole security gate for the entire API. Missing token, invalid token, expired token, and missing `sub` claim paths are untested.
  - **Suggestion**: Add unit tests for: (1) missing Authorization header -> 401, (2) malformed token -> 401, (3) expired token -> 401, (4) valid token -> `req.userId` set and `next()` called.
- `english-learning/src/lib/api.ts` — [HIGH] No tests for `apiFetch` 401-retry logic. Token refresh, retry, and redirect-on-failure are critical paths with zero coverage.
  - **Suggestion**: Add tests mocking `fetch` and `authRefresh` to verify: (1) token attached to requests, (2) 401 triggers refresh + retry, (3) refresh failure clears tokens.

## Recommendations
1. **Gate the destructive migration** (CRITICAL) — Prevent accidental data loss by requiring an explicit opt-in or using non-destructive `ALTER TABLE`.
2. **Add `Secure; SameSite=Lax` to `logged_in` cookie** — One-line fix with meaningful security improvement.
3. **Fail fast with a clear error when JWT public key is missing** — Prevents cryptic startup crashes in deployment.
4. **Guard against missing `sub` claim** in `requireAuth` — Prevents `undefined` userId from propagating through all DB queries.
5. **Add tests for `requireAuth` and `apiFetch`** — These are the two most critical auth code paths and currently have zero coverage.
6. **Throw on refresh failure in `apiFetch`** instead of returning the stale 401 response.
7. **Minor**: Fix `WHERE 1=1 AND` style in `getVocabulary`; handle `getMe()` failure after login.
