# Contributing to REZ

## Branch Protection

The `main` branch is protected. All PRs must pass the following status checks before merge:

### Required CI checks
1. `backend-build` (rez-backend-master): `npm run build` passes
2. `auth-service-build` (rez-auth-service): `npm run build` passes
3. `frontend-testing` (nuqta-master): `npm run lint` + `npm test` + `npx tsc --noEmit`
4. `smoke-test` (root): `bash smoke-test.sh` — 13/13 pass
5. `weekly-audit` (rez-backend-master): `npm audit --omit=dev` — 0 high CVEs

### Review process
- At least 1 approver required
- Reviewer must check the 4 areas: correctness, security, performance, docs
- Squash-merge to main (commit history cleaned up)

## Commit message convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

<body>

<footer>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`

Examples:
- `feat(auth): add OTP rate limiting`
- `fix(orders): prevent oversell race condition`
- `chore(deps): bump mongoose to 8.24.0`
- `docs: add PRODUCTION_LAUNCH_CHECKLIST`

## Local development setup

See `README.md` for full setup. Quick start:
1. `bash start.sh` (or `docker compose -f docker-compose.dev.yml --env-file .env.dev up -d`)
2. Wait for "All services are healthy"
3. `cd nuqta-master && npm run web`

## Testing

- `npm test` in each service
- `bash smoke-test.sh` from repo root
- See `RUNBOOK.md` for failure modes

## Security

- Never commit real `.env` files
- Never commit API keys, tokens, or credentials
- Report security issues to security@rezapp.com (private)