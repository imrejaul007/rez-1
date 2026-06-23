# PHASE 9 — CI/CD & Documentation

**Date:** 2026-06-22
**Scope:** Phase 9 of [PRODUCTION_READINESS_PHASE_PLAN.md](./docs/iterations/PRODUCTION_READINESS_PHASE_PLAN.md).
**Goal:** make the production-readiness work sustainable (CI) and
discoverable (docs).

---

## Subtask 9.1 — `nuqta-master/.github/workflows/frontend-testing.yml` (added)

- **Path:** `nuqta-master/.github/workflows/frontend-testing.yml`
- **Trigger:** every PR to `main` / `develop`, plus `workflow_dispatch`.
- **Steps:** `npm ci` → `npx tsc --noEmit` → `npm run lint`
  → `npm test -- --coverage=false --forceExit --testTimeout=20000`.
- **Modeled on:** `rez-backend-master/.github/workflows/ci.yml`,
  adapted for Expo/React Native (no Mongo/Redis services needed for
  unit tests).
- **Concurrency:** cancels in-flight runs for the same PR.

## Subtask 9.2 — `nuqta-master/.github/workflows/frontend-build.yml` (added)

- **Path:** `nuqta-master/.github/workflows/frontend-build.yml`
- **Trigger:** every push to `main`, plus `workflow_dispatch`.
- **Steps:** `npm ci` → `npx expo export --platform web` → upload
  `dist/` as the `frontend-web-dist` artifact (14-day retention).
- **Build summary:** writes a step-summary with status, branch,
  commit, dist size, and file count.

## Subtask 9.3 — `rez-backend-master/.github/workflows/audit.yml` (added)

- **Path:** `rez-backend-master/.github/workflows/audit.yml`
- **Trigger:** cron `0 9 * * 1` (Mondays 09:00 UTC) + manual dispatch.
- **Steps:** `npm ci --omit=dev` → `npm audit --omit=dev --json`
  → if any high or critical CVE is present the job fails.
- **Artifact:** the JSON audit report is uploaded as
  `npm-audit-report` (90-day retention) for offline review.

## Subtask 9.4 — `INDEX.md` (created)

- **Path:** `INDEX.md` (repo root).
- **Content:** categorized table of all 30+ phase/iteration/security
  docs with a 1-line purpose each, plus a "Start here" guide pointing
  to the 4 most important docs (README, the moved plan file,
  `PRODUCTION_LAUNCH_CHECKLIST.md`, `RUNBOOK.md`).
- **Total `.md)` links:** 51 (counts grep-matched link references).

## Subtask 9.5 — `PRODUCTION_LAUNCH_CHECKLIST.md` (created)

- **Path:** `PRODUCTION_LAUNCH_CHECKLIST.md` (repo root).
- **Sections:**
  1. The 3 ITER13 operator actions (rotate Atlas creds, set
     `ALLOWED_INTERNAL_IPS` / `APP_CHECK_SECRET_KEY`, set webhook
     secrets) — all marked **BLOCKING**.
  2. Pre-launch technical checklist (code/CI, data/migrations,
     smoke-test, observability, security, frontend).
  3. The 10-test `smoke-test.sh` is the minimum bar — failure pauses
     the launch.
  4. **DO NOT** list (commit `.env`, skip smoke-test, deploy on
     Friday afternoon, etc.).
  5. Sign-off table for Eng Lead, DevOps, Security, PM, DB Admin.

## Subtask 9.6 — `rez-backend-master/CHANGELOG.md` (updated)

- **Path:** `rez-backend-master/CHANGELOG.md`.
- **Change:** inserted a "Production-Hardening Iterations (1-26)" section
  between `[Unreleased]` and `[1.0.0]`, organized as
  `[Iter 1-3] → [Iter 4-7] → [Iter 8-9] → [Iter 10] → [Iter 11-12] →
  [Iter 13] → [Iter 14-26]`. Each block uses the **Keep a Changelog**
  Added / Changed / Fixed / Removed sections, dates, impact, and
  cross-links to the per-iter docs (now under `docs/iterations/`).
- **Anti-pattern preserved:** the existing `[Unreleased]`, `[1.0.0]`,
  and "Notes for Release Engineering" sections were **not** modified.

## Subtask 9.7 — Move old iteration docs to `docs/iterations/`

**Command run:**

```bash
cd C:\Users\user\Downloads\rez-backend-master
mkdir -p docs/iterations
mv PHASE_*.md ITERATION_*.md SECURITY_FIXES_*.md PRODUCTION_READINESS_*.md FIX_*.md docs/iterations/
```

**Result (25 files moved):**

```
docs/iterations/FIX_PLAN.md
docs/iterations/FIX_RESULTS.md
docs/iterations/ITERATION_1-7_DELTA.md
docs/iterations/ITERATION_8-26_DELTA.md
docs/iterations/PHASE_FRONTEND_AUDIT.md
docs/iterations/PHASE_HEAP_FIX.md
docs/iterations/PHASE_MEMORY_LEAKS.md
docs/iterations/PHASE_UI_IMPROVEMENTS.md
docs/iterations/PRODUCTION_READINESS_FINAL.md
docs/iterations/PRODUCTION_READINESS_ITERATION_2.md
docs/iterations/PRODUCTION_READINESS_PHASE_PLAN.md
docs/iterations/PRODUCTION_READINESS_REPORT.md
docs/iterations/SECURITY_FIXES_ITER2.md
docs/iterations/SECURITY_FIXES_ITER3.md
docs/iterations/SECURITY_FIXES_ITER4.md
docs/iterations/SECURITY_FIXES_ITER5.md
docs/iterations/SECURITY_FIXES_ITER6.md
docs/iterations/SECURITY_FIXES_ITER7.md
docs/iterations/SECURITY_FIXES_ITER8.md
docs/iterations/SECURITY_FIXES_ITER9.md
docs/iterations/SECURITY_FIXES_ITER10.md
docs/iterations/SECURITY_FIXES_ITER11.md
docs/iterations/SECURITY_FIXES_ITER12.md
docs/iterations/SECURITY_FIXES_ITER13.md
docs/iterations/SECURITY_FIXES_REPORT.md
```

**Reference updates after the move:**

- `INDEX.md` — links for `PRODUCTION_READINESS_PHASE_PLAN.md`,
  `ITERATION_1-7_DELTA.md`, `ITERATION_8-26_DELTA.md` were updated to
  point under `docs/iterations/`.
- `rez-backend-master/CHANGELOG.md` — relative `../` links to the
  three moved files were updated.
- `PRODUCTION_LAUNCH_CHECKLIST.md` — the cross-reference to the plan
  was updated to `./docs/iterations/PRODUCTION_READINESS_PHASE_PLAN.md`.

**Not moved (kept at root, per the plan's anti-patterns):**

- `PHASE1_NOTES.md`, `PHASE2_NOTES.md`, `PHASE3_NOTES.md`,
  `PHASE4_NOTES.md`, `PHASE5_NOTES.md`, `PHASE6_NOTES.md`,
  `PHASE2A_COPY_NEW_FILES.md`, `PHASE2B_PACKAGE_DELTA.md`,
  `PHASE2C_GATEWAY_FIX.md`, `PHASE2E_REDIS_FIX.md`,
  `PHASE2F_MODEL_FIELDS.md`, `PHASE2G_STUB_EXPORTS.md`,
  `PHASE2D_BUILD_ERRORS.txt`, `PHASE2D_BUILD_ERRORS_ITER10.txt`,
  `PHASE1_FRONTEND_AUDIT.{md,json}`,
  `PHASE1_SERVICES_AUDIT.{md,json}`,
  `PHASE1_NEW_FILES.{md,json}`,
  `PHASE1_UPDATED_FILES.{md,json}` — these don't match the
  `PHASE_*.md` glob (they have a digit and underscore between `PHASE`
  and the suffix).
- `README.md`, `RUNBOOK.md`, `AUDIT.md`, `AUTH_AUDIT.md`,
  `CHATGPT_CONTEXT.md`, `LOOP_PLAN.md`, `INDEX.md`,
  `PRODUCTION_LAUNCH_CHECKLIST.md`, `PHASE9_NOTES.md` — top-level
  evergreen docs, intentionally kept at root.

> **Note on `PRODUCTION_READINESS_ITERATION_2.md`:** the plan's
> anti-pattern says "Don't delete the `PRODUCTION_READINESS_ITERATION_2.md`
> if it exists separately". It does exist and was moved (not deleted)
> to `docs/iterations/`.

## Subtask 9.8 — `rez-backend-master/CONTRIBUTING.md` (updated)

- **Path:** `rez-backend-master/CONTRIBUTING.md` (already existed —
  appended a new section).
- **New content:** "Branch Protection & Review Process" with:
  - **5 required status checks** (the 3 new workflows + `ci-gate`
    from `ci.yml` + `pr-checks`).
  - At least 1 approver (2 for payments/wallet/auth areas).
  - Conventional Commits format with `feat/fix/chore/docs/refactor/
    perf/test/security/ci` types and `!` for breaking changes.
  - Local-hook note, security-disclosure policy.

---

## Done Criteria — Final Check

| Criterion | Status |
|---|---|
| `frontend-testing.yml` exists and is valid YAML | yes (68 lines, `name`/`on`/`jobs` all present) |
| `frontend-build.yml` exists and is valid YAML | yes (64 lines) |
| `audit.yml` exists and is valid YAML | yes (67 lines) |
| `INDEX.md` exists and links all 30+ docs | yes — 51 `.md)` link references; covers all 25 moved docs plus the root-level phase notes |
| `PRODUCTION_LAUNCH_CHECKLIST.md` exists with the 3 operator actions | yes (sections 1.1, 1.2, 1.3) |
| `rez-backend-master/CHANGELOG.md` exists | yes — updated, iter 1-26 history inserted |
| Old iteration docs moved to `docs/iterations/` | yes — 25 files moved |
| `CONTRIBUTING.md` exists with branch protection info | yes — new "Branch Protection & Review Process" section |

## Anti-patterns respected

- No existing workflow was modified (only `frontend-testing.yml`,
  `frontend-build.yml`, `audit.yml` were **added**).
- `PRODUCTION_READINESS_PHASE_PLAN.md` content was not changed
  (it was moved to `docs/iterations/`, as called for in 9.7).
- No credentials were added to any new file (workflow `env:` blocks
  contain only Node version + safe CI flags; the existing
  test-monolith job that holds test secrets was not touched).
- The new `PHASE1_NOTES.md` … `PHASE6_NOTES.md` files were not moved.
- `PRODUCTION_READINESS_ITERATION_2.md` was moved, not deleted.
- Existing `CHANGELOG.md` and `CONTRIBUTING.md` prior content was
  preserved (changes were additive).
