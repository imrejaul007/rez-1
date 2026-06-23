# Contributing to REZ Backend

## Quick Start (5 minutes)

1. Clone the repo
2. Copy `.env.example` → `.env` and fill in required values
3. Install dependencies: `npm install`
4. Start dev server: `npm run dev`
5. Run tests: `npm test`

## Required Environment Variables

See `.env.example` for all required variables. Critical ones:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — must be at least 32 characters in production
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — use test keys locally
- `REDIS_URL` — Redis connection string

## Before Submitting a PR

- [ ] `npm run build` passes (TypeScript check)
- [ ] `npm test` passes (all tests green)
- [ ] New features have tests
- [ ] No `console.log` in production code (use `logger` from `config/logger`)

## Code Style

- Use `asyncHandler()` for all async route handlers
- Use `sendSuccess()` / `sendError()` for responses
- Use `logger.info/warn/error()` — never `console.log`
- Add pagination to all list endpoints (page/limit params)
- Use Redis caching for frequently-accessed data (60s user-specific, 300s shared)
- Use `escapeRegex()` for any user input in regex queries

## Architecture

- Models: `src/models/` (Mongoose + TypeScript)
- Routes: `src/routes/` (Express Router)
- Services: `src/services/` (business logic)
- Middleware: `src/middleware/` (auth, validation, rate limiting)
- Config: `src/config/` (database, logger, middleware setup)

---

## Branch Protection & Review Process

`main` is protected. The rules below are enforced by GitHub branch
protection settings.

### Required Status Checks

The following CI checks **must** be green on `main` before any PR can
be merged:

1. **`rez-backend` CI** (`rez-backend-master/.github/workflows/ci.yml`)
   — runs `test-monolith` and `build-check` jobs; the `ci-gate` job
   rolls them up.
2. **`Frontend Testing`** (`nuqta-master/.github/workflows/frontend-testing.yml`)
   — runs `npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm test`
   on the Expo/React Native monorepo.
3. **`Frontend Web Build`** (`nuqta-master/.github/workflows/frontend-build.yml`)
   — produces the `dist/` artifact for static hosting.
4. **`Weekly Dependency Audit`** (`rez-backend-master/.github/workflows/audit.yml`)
   — the most recent scheduled run must be < 7 days old and report
   zero high/critical CVEs.
5. **`pr-checks`** (`rez-backend-master/.github/workflows/pr-checks.yml`)
   — code-quality and security lint gates.

If any of these fail, the PR is blocked. Use
`gh pr checks <PR_NUMBER>` to inspect.

### Review Process

- At least **1 approver** is required before merge.
- For changes touching `src/services/payments/`,
  `src/services/wallet/`, `src/middleware/auth.ts`, or
  `src/services/auth/`, require **2 approvers** (one of whom must be a
  code-owner in `.github/CODEOWNERS`).
- Reviewers should use the GitHub **Review changes** flow with one
  of: `Approve`, `Request changes`, or `Comment`.
- Squash-merge is the default. Use **Rebase and merge** only when the
  history of WIP commits is useful for bisect.

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/).
Format:

```
<type>(<scope>): <short summary>

<body — wrapped at 72 chars>

<footer>
```

Allowed `<type>` values:

- `feat` — new user-facing feature
- `fix` — bug fix
- `chore` — tooling / config changes
- `docs` — documentation only
- `refactor` — code change that neither fixes a bug nor adds a feature
- `perf` — performance improvement
- `test` — adding or correcting tests
- `security` — security fix (mirrors `feat/fix` but tagged for the
  audit log)
- `ci` — CI / GitHub Actions change

`<scope>` is the service or area affected, e.g. `auth`, `wallet`,
`payments`, `merchant`, `gateway`, `frontend`, `docs`.

Examples:

```
feat(payments): add idempotency key to Razorpay order create
fix(auth): reject refresh tokens whose family has been revoked
security(services): redact device fingerprint in audit logs
ci(frontend): add expo export workflow
docs(readme): document the 10-test smoke-test entrypoint
```

Breaking changes **must** be marked with `!` after the type/scope and
a `BREAKING CHANGE:` footer (e.g. `feat(wallet)!: switch coin ledger
to double-entry`).

### Local Hooks

The `lefthook.yml` (or `husky` shim) at the repo root runs
`npx tsc --noEmit` and `npm run lint -- --fix` on `pre-commit`.
CI is the source of truth — local hooks are a convenience.

### Reporting Security Issues

**Do not** open a public issue for suspected vulnerabilities. Email
`security@rez.example.com` (or the address in `SECURITY.md` if it
exists) with a description and reproduction steps.
