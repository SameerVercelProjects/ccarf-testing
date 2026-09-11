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

`config/users.json` is not committed. Copy the example and add real hashes:

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
3. **Redeploy** (see below). Changes to `config/users.json` require a redeploy.

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
   `SESSION_SECRET` with a strong random value (e.g. `openssl rand -base64 48`),
   for the Production (and Preview) environments. Redeploy so it takes effect.
3. Ensure `config/users.json`, `config/tests.json`, and your `data/*.xlsx`
   files are present in the deployment. `config/users.json` is gitignored by
   default — either commit it for this internal tool (it contains only bcrypt
   hashes, no plaintext) or add it through your own secure process. The Excel
   files under `data/` and `config/tests.json` should be committed.

`next.config.mjs` uses `outputFileTracingIncludes` to force `data/**` and
`config/**` into the serverless function bundle, so the deployed app can read
them at runtime. These directories are **not** under `/public` and are not
directly downloadable from the browser.

> **Note:** Changes to `config/users.json`, `config/tests.json`, or any
> `data/*.xlsx` file require a **redeploy** — they are read from the deployed
> bundle, not a live datastore.

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
config/users.json                     Users (server-only, gitignored)
config/tests.json                     Test titles + list order (server-only)
data/*.xlsx                           Tests (server-only)
scripts/                              Password-hash + sample-xlsx generators
middleware.ts                         Route protection (JWT verify)
```
