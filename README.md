# Certification Practice

A lightweight internal web app for practicing technical certification exams.
Log in, pick a test, answer questions one at a time, and get immediate
correct/incorrect feedback with explanations on the same screen.

This is a **learning/practice** tool — not a proctored examination system.
There is no database, no persistent score history, and no admin functionality.

## How it works

- **Auth** — file-based. Users live in `config/users.json` with bcrypt-hashed
  passwords. A signed (jose HS256) session token is stored in an HttpOnly cookie.
- **Tests** — each Excel file in `data/*.xlsx` is one test. Files are discovered,
  parsed, and validated **server-side**. Correct answers and explanations are
  never sent to the browser until a question is submitted. Each test's **title**
  and its **position** in the Available Tests list come from `config/tests.json`.
- **Attempt state** — the active attempt lives only in the browser's
  `sessionStorage`. Nothing about scores or history is persisted on the server.

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · SheetJS/xlsx ·
bcryptjs · jose · deployed on Vercel.

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the session secret

Create `.env.local` (see `.env.example`):

```bash
cp .env.example .env.local
```

Generate a strong `SESSION_SECRET`:

```bash
openssl rand -base64 48
```

Put the value in `.env.local`:

```
SESSION_SECRET=<the-generated-value>
```

The app **fails clearly** if `SESSION_SECRET` is missing.

### 3. Create users

Users live in `config/users.json` (an array of `{ username, passwordHash }`).
This file **is committed** — it holds only bcrypt hashes, no plaintext — so the
same users work locally and in the deployment. If you're starting fresh, copy
the example:

```bash
cp config/users.example.json config/users.json
```

Generate a bcrypt hash for a password:

```bash
npm run generate-password-hash -- "yourPassword"
```

Paste the printed hash into `config/users.json`:

```json
[
  { "username": "sameer", "passwordHash": "$2a$10$..." },
  { "username": "john",   "passwordHash": "$2a$10$..." }
]
```

> Keep plaintext passwords out of the repo. If you want a local reference of
> who-has-what-password, put it in `config/users_plain.json`, which is
> gitignored. Never commit plaintext.

### 4. Add a sample test (optional)

A generator creates a 5-question sample workbook at
`data/claude-certification.xlsx`:

```bash
npm run generate-sample-xlsx
```

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

---

## Adding a new user

1. Generate a hash: `npm run generate-password-hash -- "theirPassword"`
2. Add `{ "username": "...", "passwordHash": "..." }` to `config/users.json`.
3. Commit and push, then **redeploy** so the change ships (the file is read
   from the deployed bundle, not a live datastore).

> If you set the optional `USERS_JSON` env var (see "Deploying to Vercel"), it
> **overrides** `config/users.json` entirely — so editing the file has no effect
> until you also update or remove that env var.

## Adding a new test

1. Drop a `.xlsx` file into the `data/` directory.
   - The test **ID** is the filename without `.xlsx`
     (`aws-solutions-architect.xlsx` → `aws-solutions-architect`).
2. Give it a **title** in `config/tests.json` (keyed by filename):
   ```json
   {
     "aws-solutions-architect.xlsx": "AWS Solutions Architect",
     "azure-ai-engineer.xlsx": "Azure AI Engineer"
   }
   ```
   The **order of the keys** is the order tests appear on the Available Tests
   screen — reorder the lines to reorder the screen. If a file is missing from
   `config/tests.json`, it still appears (sorted to the end), and its title
   falls back to a name derived from the ID (`aws-solutions-architect` → `AWS
   Solutions Architect`; common acronyms like AWS, API, AI, OCI, OIC, SQL are
   upper-cased).
3. **Redeploy**. Tests, titles, and order are read at runtime from the deployed
   bundle, so changes to `config/tests.json` also require a redeploy.

### Required Excel format

The first sheet must contain these columns (header row, case-insensitive):

| Question | Answer 1 | Answer 2 | Answer 3 | Answer 4 | Correct answer(s) | Explanation |
| -------- | -------- | -------- | -------- | -------- | ----------------- | ----------- |

Every row must have all four answers, a valid `Correct answer(s)` value, and an
explanation. Malformed files/rows are reported (server logs) and skipped from the
test list rather than silently accepted.

### How multiple correct answers are formatted

- **Single answer** → a single number: `1`, `2`, `3`, or `4`
  (rendered as radio buttons).
- **Multiple answers** → numbers separated by a comma or semicolon:
  `1,3` · `1, 3` · `1;3` · `1; 3` · `1,2,4`
  (rendered as checkboxes, shown with "Select all that apply").

A multiple-answer question is correct **only** when the selected set exactly
equals the correct set. Order does not matter. Valid values are `1`–`4`; anything
else (`0`, `5`, `A`, …) is rejected.

---

## Deploying to Vercel

1. Push the repository to GitHub/GitLab and import it into Vercel
   (framework preset: **Next.js** — no extra build settings needed).
2. **Configure `SESSION_SECRET` in Vercel:**
   Project → **Settings → Environment Variables** → add
   `SESSION_SECRET` with a strong random value (e.g. `openssl rand -base64 48`).
   **Select every environment you deploy to (at minimum Production).** This is
   required — the app returns *"Unable to sign in right now"* if the running
   deployment has no `SESSION_SECRET`.
3. **Users ship with the repo.** `config/users.json` is committed (bcrypt hashes
   only) and bundled into the deployment, so there's nothing else to configure —
   just make sure it's committed and pushed.
4. Ensure `config/tests.json` and your `data/*.xlsx` files are committed so they
   ship in the deployment.
5. **Redeploy after any env-var change.** Environment variables are injected at
   deploy time; editing one in the dashboard does **not** affect the
   already-running deployment until you **Deployments → ⋯ → Redeploy**.

> **`USERS_JSON` (optional, discouraged).** You can instead supply users via a
> `USERS_JSON` env var (a one-line JSON array; generate it with
> `npm run print-users-json`). When set it **overrides** `config/users.json`.
> In practice this is error-prone: bcrypt hashes contain `$`, which is easily
> mangled by copy-paste and by tools that do `$VAR` expansion (e.g. Vercel's
> "Import .env"), producing a silent *"Invalid username or password"* for
> known-good credentials. Committing `config/users.json` avoids this entirely,
> which is why it's the default. If you do use `USERS_JSON`, enter it in the
> plain Key/Value fields (not via .env import) and remember it fully replaces
> the file.

`next.config.mjs` uses `outputFileTracingIncludes` to force `data/**` and
`config/**` into the serverless function bundle, so the deployed app can read
them at runtime. These directories are **not** under `/public` and are not
directly downloadable from the browser.

> **Note:** Changes to `config/users.json`, `config/tests.json`, or any
> `data/*.xlsx` file require a **redeploy** — they are read from the deployed
> bundle, not a live datastore.

### Troubleshooting login on Vercel

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| *"Unable to sign in right now."* | `SESSION_SECRET` is missing in the running deployment (unset, wrong environment, or set but not redeployed). | Add `SESSION_SECRET` for Production, then **redeploy**. |
| *"Invalid username or password"* for credentials you know are correct | A `USERS_JSON` env var is set and overriding the file with mangled content (e.g. `$` in bcrypt hashes eaten by copy-paste / .env import), or a genuinely wrong password. | Remove `USERS_JSON` (fall back to the committed file) and redeploy, or re-enter it exactly. |
| Changed an env var but nothing changed | Env vars only apply to **new** deployments. | **Deployments → ⋯ → Redeploy.** |
| Set the secret in `.env.local` but production still fails | `.env.local` is **local-only** and gitignored — it is never uploaded to Vercel. | Set the value in **Vercel → Settings → Environment Variables**. |

Tip: the deployment's **Runtime Logs** show the real server-side error (e.g.
`[login] Failed to create session token: SESSION_SECRET is not configured.`).

---

## Project structure

```
app/
  login/page.tsx                       Login screen (public)
  tests/page.tsx                       Available tests
  test/[testId]/page.tsx               Test runner (server shell + client driver)
  test/[testId]/results/page.tsx       Results + review
  api/auth/{login,logout}/route.ts     Session cookie set/clear
  api/tests/[testId]/question/route.ts Answer-free question
  api/tests/[testId]/validate/route.ts Server-side answer validation
components/                            TestCard, QuestionCard, AnswerOption, …
lib/auth/{auth,session}.ts            Credential + session logic
lib/tests/{test-loader,test-parser,answer-validator,attempt}.ts
config/users.json                     Users: bcrypt hashes (committed, server-only)
config/tests.json                     Test titles + list order (server-only)
data/*.xlsx                           Tests (server-only)
scripts/                              Password-hash + sample-xlsx generators
middleware.ts                         Route protection (JWT verify)
```
