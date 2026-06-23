# REZ Platform — Documentation Index

> Single landing page for every phase, iteration, security, audit, and
> readiness document in this repository. New engineers should read the
> **Start here** section first; on-call engineers should jump straight
> to **Runbook & Operations**.

## Start here

1. **[README.md](./README.md)** — repo overview, services layout, local dev quickstart.
2. **[PRODUCTION_READINESS_PHASE_PLAN.md](./docs/iterations/PRODUCTION_READINESS_PHASE_PLAN.md)** — the master 10-phase plan that produced this index.
3. **[PRODUCTION_LAUNCH_CHECKLIST.md](./PRODUCTION_LAUNCH_CHECKLIST.md)** — pre-launch checklist + the 3 ITER13 operator actions (rotate Atlas creds, set `ALLOWED_INTERNAL_IPS`, set webhook secrets).
4. **[RUNBOOK.md](./RUNBOOK.md)** — incident response and on-call procedures.

> Iteration-by-iteration engineering detail now lives in
> **[docs/iterations/](./docs/iterations/)**.

---

## Setup & Run

| Doc | Purpose |
|---|---|
| [README.md](./README.md) | Repo overview, services, local dev quickstart. |
| [RUNBOOK.md](./RUNBOOK.md) | Day-2 operations: deploys, on-call, common incidents. |
| [CHATGPT_CONTEXT.md](./CHATGPT_CONTEXT.md) | Compact context bundle used to brief AI assistants about the platform. |
| [LOOP_PLAN.md](./LOOP_PLAN.md) | Autonomous engineering-loop playbook (drives iter 1-26). |

## Audits & Reports

| Doc | Purpose |
|---|---|
| [AUDIT.md](./AUDIT.md) | Top-level audit findings snapshot for the backend. |
| [AUTH_AUDIT.md](./AUTH_AUDIT.md) | Auth service-specific audit findings. |
| [SECURITY_FIXES_REPORT.md](./docs/iterations/SECURITY_FIXES_REPORT.md) | Consolidated security & functional flow fix report. |

## Security Fixes (per-iteration)

| Doc | Purpose |
|---|---|
| [SECURITY_FIXES_ITER2.md](./docs/iterations/SECURITY_FIXES_ITER2.md) | Iter 2 security patches. |
| [SECURITY_FIXES_ITER3.md](./docs/iterations/SECURITY_FIXES_ITER3.md) | Iter 3 security patches. |
| [SECURITY_FIXES_ITER4.md](./docs/iterations/SECURITY_FIXES_ITER4.md) | Iter 4 security patches. |
| [SECURITY_FIXES_ITER5.md](./docs/iterations/SECURITY_FIXES_ITER5.md) | Iter 5 security patches. |
| [SECURITY_FIXES_ITER6.md](./docs/iterations/SECURITY_FIXES_ITER6.md) | Iter 6 security patches. |
| [SECURITY_FIXES_ITER7.md](./docs/iterations/SECURITY_FIXES_ITER7.md) | Iter 7 security patches. |
| [SECURITY_FIXES_ITER8.md](./docs/iterations/SECURITY_FIXES_ITER8.md) | Iter 8 security patches. |
| [SECURITY_FIXES_ITER9.md](./docs/iterations/SECURITY_FIXES_ITER9.md) | Iter 9 security patches. |
| [SECURITY_FIXES_ITER10.md](./docs/iterations/SECURITY_FIXES_ITER10.md) | Iter 10 security patches. |
| [SECURITY_FIXES_ITER11.md](./docs/iterations/SECURITY_FIXES_ITER11.md) | Iter 11 security patches. |
| [SECURITY_FIXES_ITER12.md](./docs/iterations/SECURITY_FIXES_ITER12.md) | Iter 12 security patches. |
| [SECURITY_FIXES_ITER13.md](./docs/iterations/SECURITY_FIXES_ITER13.md) | Iter 13 security patches (includes the 3 operator actions). |

## Production Readiness & Phase Plan

| Doc | Purpose |
|---|---|
| [PRODUCTION_READINESS_PHASE_PLAN.md](./docs/iterations/PRODUCTION_READINESS_PHASE_PLAN.md) | Master 10-phase production-readiness plan (the source of truth). |
| [PRODUCTION_READINESS_REPORT.md](./docs/iterations/PRODUCTION_READINESS_REPORT.md) | Initial readiness report for nuqta-master. |
| [PRODUCTION_READINESS_FINAL.md](./docs/iterations/PRODUCTION_READINESS_FINAL.md) | Final readiness report for nuqta-master. |
| [PRODUCTION_READINESS_ITERATION_2.md](./docs/iterations/PRODUCTION_READINESS_ITERATION_2.md) | Iter 2 frontend fix report. |

## Iteration Deltas (summary)

| Doc | Purpose |
|---|---|
| [ITERATION_1-7_DELTA.md](./docs/iterations/ITERATION_1-7_DELTA.md) | Single-document summary of iter 1-7 changes across all services. |
| [ITERATION_8-26_DELTA.md](./docs/iterations/ITERATION_8-26_DELTA.md) | Single-document summary of iter 8-26 changes across all services. |

> Note: the `ITERATION_*.md` deltas are the canonical *summary*; the
> per-iteration deep-dive docs live in `docs/iterations/`.

## Phase Notes (engineering detail)

| Doc | Purpose |
|---|---|
| [PHASE1_NOTES.md](./PHASE1_NOTES.md) | Phase 1: services & frontend audit deep-dive. |
| [PHASE2_NOTES.md](./PHASE2_NOTES.md) | Phase 2: copy new files, gateway fix, Redis fix, model fields, stub exports. |
| [PHASE3_NOTES.md](./PHASE3_NOTES.md) | Phase 3: TypeScript / build-error sweep. |
| [PHASE4_NOTES.md](./PHASE4_NOTES.md) | Phase 4: heap / memory-leak pass. |
| [PHASE5_NOTES.md](./PHASE5_NOTES.md) | Phase 5: UI/UX improvements. |
| [PHASE6_NOTES.md](./PHASE6_NOTES.md) | Phase 6: security hardening sweep. |
| [PHASE7_NOTES.md](./PHASE7_NOTES.md) | Phase 7: Mongoose 8.24 migration (fixes `$nor` CVE) + `Lean<T>` type helper. |
| [PHASE8_NOTES.md](./PHASE8_NOTES.md) | Phase 8: test-coverage cleanup (gamification/referral/fraud fixes, 8 new backend test files). |
| [PHASE9_NOTES.md](./PHASE9_NOTES.md) | Phase 9: CI/CD workflows, INDEX, CHANGELOG, CONTRIBUTING, docs archive move. |
| [PHASE10_NOTES.md](./PHASE10_NOTES.md) | Phase 10: pre-production operator actions (Atlas creds, internal IPs, webhook secrets, env values, nginx resolver). |
| [PHASE11_NOTES.md](./PHASE11_NOTES.md) | Phase 11: end-to-end re-verification — build / lint / test / audit results. |
| [PHASE_FRONTEND_AUDIT.md](./docs/iterations/PHASE_FRONTEND_AUDIT.md) | Rez-app end-to-end frontend integration audit. |
| [PHASE_HEAP_FIX.md](./docs/iterations/PHASE_HEAP_FIX.md) | Heap OOM fix report for nuqta Expo frontend. |
| [PHASE_MEMORY_LEAKS.md](./docs/iterations/PHASE_MEMORY_LEAKS.md) | Memory-leak audit findings & fixes. |
| [PHASE_UI_IMPROVEMENTS.md](./docs/iterations/PHASE_UI_IMPROVEMENTS.md) | UI/UX polish changes (production). |

## Phase 2 Sub-Docs

| Doc | Purpose |
|---|---|
| [PHASE2A_COPY_NEW_FILES.md](./PHASE2A_COPY_NEW_FILES.md) | Phase 2A: copied new files manifest. |
| [PHASE2B_PACKAGE_DELTA.md](./PHASE2B_PACKAGE_DELTA.md) | Phase 2B: package.json delta. |
| [PHASE2C_GATEWAY_FIX.md](./PHASE2C_GATEWAY_FIX.md) | Phase 2C: rez-api-gateway fix notes. |
| [PHASE2E_REDIS_FIX.md](./PHASE2E_REDIS_FIX.md) | Phase 2E: Redis-specific fix. |
| [PHASE2F_MODEL_FIELDS.md](./PHASE2F_MODEL_FIELDS.md) | Phase 2F: Mongoose model field additions. |
| [PHASE2G_STUB_EXPORTS.md](./PHASE2G_STUB_EXPORTS.md) | Phase 2G: stub-export cleanup. |
| [PHASE2D_BUILD_ERRORS.txt](./PHASE2D_BUILD_ERRORS.txt) | Phase 2D: raw build error log. |
| [PHASE2D_BUILD_ERRORS_ITER10.txt](./PHASE2D_BUILD_ERRORS_ITER10.txt) | Phase 2D: iter 10 build error re-run. |

## Phase 1 Audit Data

| Doc | Purpose |
|---|---|
| [PHASE1_FRONTEND_AUDIT.md](./PHASE1_FRONTEND_AUDIT.md) | Phase 1 frontend audit (markdown). |
| [PHASE1_FRONTEND_AUDIT.json](./PHASE1_FRONTEND_AUDIT.json) | Phase 1 frontend audit (raw JSON). |
| [PHASE1_SERVICES_AUDIT.md](./PHASE1_SERVICES_AUDIT.md) | Phase 1 services audit (markdown). |
| [PHASE1_SERVICES_AUDIT.json](./PHASE1_SERVICES_AUDIT.json) | Phase 1 services audit (raw JSON). |
| [PHASE1_NEW_FILES.md](./PHASE1_NEW_FILES.md) | Phase 1 new-files manifest. |
| [PHASE1_NEW_FILES.json](./PHASE1_NEW_FILES.json) | Phase 1 new-files manifest (raw JSON). |
| [PHASE1_UPDATED_FILES.md](./PHASE1_UPDATED_FILES.md) | Phase 1 updated-files manifest. |
| [PHASE1_UPDATED_FILES.json](./PHASE1_UPDATED_FILES.json) | Phase 1 updated-files manifest (raw JSON). |

## Fix Plans & Results

| Doc | Purpose |
|---|---|
| [FIX_PLAN.md](./docs/iterations/FIX_PLAN.md) | Plan to fix TypeScript errors in nuqta-master. |
| [FIX_RESULTS.md](./docs/iterations/FIX_RESULTS.md) | TypeScript fix results. |

## docs/iterations/ (deep-dive archive)

All per-phase engineering notes, per-iteration security reports, and
fix logs now live under **[docs/iterations/](./docs/iterations/)** for
the long term. New engineers rarely need to read these — start with
the **Iteration Deltas** section above.
