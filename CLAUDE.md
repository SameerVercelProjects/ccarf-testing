# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                              # dev server (needs SESSION_SECRET in .env.local)
npm run build                            # production build + type-check (there is no separate tsc step)
npm run start                            # serve the production build
npm run lint                             # next lint
npm run generate-password-hash -- "pw"   # print a bcrypt hash for config/users.json
npm run generate-sample-xlsx             # (re)write data/claude-certification.xlsx sample
```

There is **no test runner** configured. `npm run build` is the type-check gate. To smoke-test the running app, drive the HTTP flow: `POST /api/auth/login` (save the cookie) → `GET /api/tests/<id>/question?n=1` → `POST /api/tests/<id>/validate`.

Running anything requires `SESSION_SECRET` (the app throws clearly without it — see `getSecretKey` in `lib/auth/session.ts`). Local login user lives in `config/users.json` (gitignored; copy from `config/users.example.json`).

## Architecture

Internal certification-practice app. **No database, no persistence.** Next.js 15 App Router + React 19 + TS + Tailwind v3, deployed to Vercel. Read the README for the user-facing workflow; the points below are the non-obvious invariants.

**State lives in three places, never a server store:**
- **Auth** → jose HS256 JWT `{username}` (~8h) in an HttpOnly cookie. Signing/verifying is in `lib/auth/session.ts` (Edge-safe: jose only, no `fs`) so `middleware.ts` can verify it. `lib/auth/auth.ts` (`getSession`, bcrypt `verifyCredentials`) is Node-only (`import "server-only"`, reads `config/users.json`).
- **Tests** → `data/*.xlsx` on the server filesystem, read-only. One file = one test.
- **Active attempt** → browser `sessionStorage` only, via `lib/tests/attempt.ts`. Never localStorage, never the server. This is why refresh restores progress but history is unrecoverable once the session ends.

**The core secrecy invariant:** correct answers and explanations must never reach the browser until an answer is submitted. `getQuestion` in `lib/tests/test-loader.ts` returns a `PublicQuestion` that deliberately omits `correctAnswers`/`explanation`; only `validateAnswer` (hit via `POST /api/tests/[testId]/validate`) returns them. Do not add answer/explanation fields to the question route or to `PublicQuestion`. Scoring for multi-select is exact-set-equality (`isSelectionCorrect` in `lib/tests/answer-validator.ts`), order-independent.

**Route protection is two-layered.** `middleware.ts` verifies the JWT on every request; public paths are only `/login` and `/api/auth/*` (login must be reachable without a session — don't re-block it). Server pages (`app/tests`, `app/test/[testId]`, `.../results`) and both test API routes independently re-check `getSession()` for defense in depth.

**Server/client split per route:** each `test/[testId]` and `results` route is a server `page.tsx` (session + `getTestMetadata` guard, renders `AppHeader`) wrapping a client `*Runner.tsx` that owns the attempt, fetches questions, and posts validations. `TestRunner` resumes an in-progress attempt from sessionStorage but starts fresh if the stored attempt is already fully submitted (that is how "start again after completion" / Retake works).

**Excel parsing/validation** is in `lib/tests/test-parser.ts` (required columns, per-row errors thrown as `ExcelValidationError`; malformed files are logged and skipped from the list, never silently accepted). `test-loader.ts` caches parsed workbooks in memory keyed by mtime — a perf optimization only; correctness never depends on it surviving (Vercel functions are ephemeral).

**Test IDs = filename without `.xlsx`.** They are validated against the set of discovered files and re-resolved inside `data/` to block path traversal (`resolveTestFile`). **Titles** come from `config/tests.json` (a `{ "<file>.xlsx": "Title" }` map, loaded by `resolveTestName`); a file missing from that map falls back to a name derived from the ID via `displayNameFromId` (acronym-aware, e.g. `aws` → `AWS`). The map's **key order also sets the order of the Available Tests list** (`getAvailableTests`); unmapped tests sort to the end alphabetically. The map is mtime-cached like the workbooks and requires a redeploy to change on Vercel.

## Vercel-specific gotcha

`data/` and `config/` are read dynamically (`fs.readdir`), so Next's file tracing can't detect them. `next.config.mjs` uses `outputFileTracingIncludes` to force `data/**` and `config/**` into the function bundle — **if tests or login break in a deploy but work locally, check this first.** Neither directory is under `/public`; they must stay server-only. Changing `users.json`, `tests.json`, or any `.xlsx` requires a redeploy.

## Confidential data

`data/` contains real Value Global client files (`CCAF_Mock_Test_*.xlsx`). Do not reproduce their question content in shareable/published output. `claude-certification.xlsx` is the generated sample and is safe to use for testing.
