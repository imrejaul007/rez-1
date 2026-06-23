# Phase 2 Notes — 2026-06-22 (Safe Deletion Subset)

**Scope:** Phase 2 from `PRODUCTION_READINESS_PHASE_PLAN.md`, but only the **safe subset** as agreed. The original Phase 2 plan had 10 deletion candidates, but the pre-delete cross-reference audit found that 4 of them have active runtime/code dependencies and 1 has 31+ doc references. Those are deferred to Phase 2b.

---

## Pre-delete audit

A separate exhaustive audit was run before any deletion. For each of the 10 original candidates, the audit grepped for references across **all 4 services + 30+ docs + all configs + all CI workflows + all shell scripts + symlinks**. The 5 truly safe deletions were extracted; the other 5 were deferred.

See the audit conversation above (Phase 2 audit, agent `abedd10a0092587d0`) for full evidence per candidate.

---

## Safe deletions executed (9 total)

### Empty directories (3)

| Path | Verdict evidence |
|---|---|
| `rez-backend-master;C/` | Empty dir, created 2026-06-21 07:56, only doc reference was the deletion proposal itself |
| `rez-api-gateway/nginx.conf;C/` | Empty dir, created 2026-06-21 16:46, 0 references anywhere |
| `rez-api-gateway/start.sh;C/` | Empty dir, created 2026-06-21 16:46, 0 references anywhere |

### Stale Claude session files (6)

| Path | Size | Verdict evidence |
|---|---|---|
| `rez-backend-master/src/tmpclaude-5a40-cwd` | 51 bytes | Stale cwd path from prior session |
| `rez-backend-master/src/tmpclaude-6512-cwd` | 51 bytes | Same |
| `rez-backend-master/src/tmpclaude-c14c-cwd` | 51 bytes | Same |
| `rez-backend-master/src/tmpclaude-dcc5-cwd` | 51 bytes | Same |
| `rez-backend-master/src/tmpclaude-f255-cwd` | 51 bytes | Same |
| `rez-backend-master/src/tmpclaude-febb-cwd` | 51 bytes | Same |

Each file contained a single path string `/c/Users/user/OneDrive/Desktop/rez/rez-backend/src` from a prior Claude session on a different machine. Already gitignored in 3 services (verified at `rez-backend-master/.gitignore:42`, `rez-backend/.gitignore:44`, `nuqta-master/.gitignore:52`) — would never be committed.

### STUB comments (3)

Deleted the `// STUB:` comment line from each (left executable code untouched — no behavior change):

| File:line | Action |
|---|---|
| `rez-backend-master/src/config/queue.config.ts:1` | Removed `// STUB: bullmq replaces bull...` |
| `rez-backend-master/src/middleware/uploadSecurity.ts:2` | Removed `// STUB: file-type v21 no longer exports fromBuffer...` |
| `rez-backend-master/src/controllers/travelWebhookController.ts:140` | Removed `// STUB: Product pricing update not implemented...` (left line 141 log unchanged to preserve behavior) |

**Important:** The CI regression check at `.github/workflows/backend-build.yml:58` greps for the **different phrase** `"STUB: added during Phase 2"` — it is unaffected by these removals.

---

## Deferred to Phase 2b (audit caught issues)

| Candidate | Original plan said | Audit found | Why deferred |
|---|---|---|---|
| `rez-backend/` (76 MB) | Delete | 31 doc references + `_copy_new_files.mjs` migration tool + 3 nuqta verification docs reference paths in it | Safer: rename to `rez-backend-archive/` and gitignore |
| `rez-api-gateway/src/` + `test/` (3,843 lines) | Delete | 0 runtime deps, but 5 historical doc references quote the code as iteration history | Could be deleted; keep for now to preserve historical narrative |
| `nuqta-master/tests.bak/` (272 KB) | Delete | 3 **active** build/test refs: `tsconfig.json:39`, `jest.config.js:101`, `__tests__/config/imports-resolve.test.ts:142-152` | Requires coordinated edit of 3 files |
| `rez-backend-master/src/services/voucherRedemptionService.ts` | Delete | Actively imported by `controllers/reralTierController.ts:10` — calls `claimVoucher()` | Don't delete. The "not implemented" throws are unreachable in normal operation (require non-empty provider API keys, which they aren't) |
| `rez-backend-master/src/utils/xlsxCompat.ts` | Delete | Actively imported by 4 source files: `merchantservices/bulkImportService.ts:4`, `merchantroutes/bulk.ts:11-12`, `services/AuditRetentionService.ts:10`, `services/BulkProductService.ts:7` | Don't delete. The `writeExcelBufferSync` throw is dead, but the file is alive |
| `rez-backend-master/src/scripts/` (166 files) | Archive all except 4 | **36 scripts have active `package.json` bindings** (e.g., `db:indexes`, `seed:*`, `migrate:*`, `backup:verify`). Plan's "must-keep 4" was way too small | Needs a fresh audit to enumerate the real keep-set (36 scripts) and the safe-to-archive set (130+) |
| `nuqta-master/errors-*.txt` (10 files, 2.1 MB) | Delete | 2 historical one-off scripts (`scripts/add-ts-nocheck.js` and `.ps1`) default to `errors-round4.txt`. Already executed per LOOP_PLAN.md | Safe but slightly risky; user decision pending |
| `rez-api-gateway/nginx.conf.bak` (43 KB) | Not in plan | Looks like a backup of `nginx.conf`. 0 active refs | Manual review needed to confirm no hand-edits |
| `nuqta-master/lint-check.log`, `tsc-check.log`, `rez-backend-master/logs/exceptions-*.log` (8 files) | Not in plan | Old runtime logs | Manual review needed |

---

## Verification

| Check | Result |
|---|---|
| `ls "rez-backend-master;C"` | ENOENT ✅ |
| `ls "rez-api-gateway/nginx.conf;C"` | ENOENT ✅ |
| `ls "rez-api-gateway/start.sh;C"` | ENOENT ✅ |
| `ls rez-backend-master/src/tmpclaude-*-cwd` | ENOENT ✅ |
| `grep -rn "// STUB:" rez-backend-master/src/` | 0 hits ✅ |
| CI check `grep -rln "STUB: added during Phase 2" src/` | 0 hits (check passes) ✅ |
| `cd rez-backend-master && npm run build` | exit 0, 0 errors ✅ |

---

## Summary

| Item | Status |
|---|---|
| Safe deletions (9 items) | ✅ Done |
| Risky deletions (5 candidates from original plan) | ⏸️ Deferred to Phase 2b |
| Manual review items (3) | ⏸️ Deferred to Phase 2b |
| Build still clean | ✅ |

**Total disk freed: ~6 KB** (small but every byte is verified-safe cleanup).

**Ready for Phase 3:** Yes — Phase 3 (Frontend API Client Consolidation) is independent and safe to run.

---

## Phase 2 cleanup pass — 2026-06-22 (dead code + rez-backend status)

**Scope:** Two items from the Phase 2 audit backlog:
1. Delete 3 dead config files in `nuqta-master/config/`.
2. Verify and document the status of the dormant `rez-backend/` directory.

### Dead config files deleted (3)

Exhaustive cross-reference check (excluding `node_modules/`, error logs, and the 3 target files themselves) returned **0 production-code consumers**.

| File | Size | Why dead |
|---|---|---|
| `nuqta-master/config/api.ts` | ~7.5 KB | Re-implements an axios instance. Runtime uses `services/apiClient.ts` / `utils/apiClient.ts` instead. Only consumer was `config/index.ts` re-export. |
| `nuqta-master/config/api.config.js` | ~1.6 KB | Plain-JS duplicate of `config/api.ts`. Only references were in `tests.bak/` and `__mocks__/` (both dead dirs). |
| `nuqta-master/config/index.ts` | ~1.6 KB | Re-export barrel — became dead once `config/api.ts` was removed. |

**Verification searches run** (all returned 0 active consumers):
- `from.*config/api['"]` in `**/*.{ts,tsx,js,jsx,mjs}` — only matches were historical docs and the file's own re-export
- `from.*config/api.config` — 0 matches
- `from.*config/index` — only matches were `node_modules/@babel/core/...` (unrelated) and historical docs
- `require.*config/api` — 0 matches
- `apiClient | apiMethods | buildEndpoint | API_ENDPOINTS` — all production matches go to `@/services/apiClient` or `@/utils/apiClient`, never to `config/api`

### `rez-backend/` status — confirmed dormant

| Property | Value |
|---|---|
| Size | 76 MB |
| `.ts` files | 1,965 |
| Docker build context | `./rez-backend-master` (NOT `./rez-backend`) — confirmed via `docker-compose.dev.yml` |
| Active runtime deps | None |
| Historical references | 31 doc references + `_copy_new_files.mjs` migration tool (already executed) |

**Docker verification:** `docker-compose.dev.yml` mounts `./rez-backend-master/src`, `./rez-backend-master/uploads`, `./rez-backend-master/logs` — the `rez-backend/` directory at the repo root is **not referenced** by any active Docker context, volume mount, or build step.

**Migration tool:** `_copy_new_files.mjs` (3.5 KB, dated 2026-06-21) was the historical file-copying tool used during the Phase 1 monorepo migration. It has been run and is now a record. Kept for historical traceability.

**Phase 2b action (deferred):** Rename `rez-backend/` to `rez-backend-archive/` and add to `.gitignore`. This is a 76 MB move and needs its own commit so the rename is clearly traceable in git history (avoid confusing the diff with today's small cleanup).

### Verification

| Check | Result |
|---|---|
| `ls nuqta-master/config/` | 17 files (down from 20, the 3 dead files removed) ✅ |
| `cd nuqta-master && npx tsc --noEmit` | See "Subtask 3" in cleanup output |
| `grep "rez-backend" docker-compose.dev.yml` | Only `rez-backend-master` (not `rez-backend/`) ✅ |

**Total disk freed this pass: ~10.7 KB** (small but high-confidence; eliminates a confusing dead-code trap).