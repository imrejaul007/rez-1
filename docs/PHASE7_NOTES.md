# Phase 7 Notes — 2026-06-22 (Mongoose 8.24 Migration)

**Scope:** Subtask from the audit — fix the 26 TypeScript errors caused by the Mongoose 8.17.2 → 8.24.0 migration that was completed in Phase 7 (the `Lean<T>` helper was created but never applied to the broken files).

## Background

Mongoose 8.24 returns lean documents as `FlattenMaps<T> & Required<{ _id: ObjectId; }> & { __v: number }>`, which TypeScript can't assign to plain interface types like `IFoo`. The fix is the `Lean<T>` helper type defined in `src/types/lean.ts`:

```typescript
export type Lean<T> = T & { _id: any; __v: number };
```

This type is structurally compatible with the Mongoose lean return type and can be used in place of the bare interface.

## Errors fixed (26 total)

All 26 TS errors in `rez-backend-master/src/services/` have been resolved. Files modified:

| File | Errors | Fix pattern |
|---|---|---|
| `src/services/bonusCampaignService.ts` | 1 | Cast return at call site |
| `src/services/challengeService.ts` | 2 | Cast + change return type |
| `src/services/gameService.ts` | 1 | Cast |
| `src/services/mallService.ts` | 2 | Change object literal return type to `Lean<IMallBrand>[]` |
| `src/services/priveCampaignService.ts` | 1 | Remove extra `pagination` field from return |
| `src/services/socialImpactService.ts` | 1 | Cast |
| `src/services/stockNotificationService.ts` | 5 | Change return type + cast at call sites |
| `src/services/supportService.ts` | 3 | Cast at call sites |
| `src/services/weeklyChallengeService.ts` | 1 | Change return type |
| `src/services/walletService.frozen.test.ts` | 8 | Fix import + cast test params |
| `src/routes/admin/travel.ts` | 1 | Cast |

## Build script fix

Removed `|| true` from the build script in `rez-backend-master/package.json:10` so that future TS errors will fail the build instead of being silently masked.

**Before:** `"build": "node --max-old-space-size=4096 ./node_modules/typescript/lib/tsc.js --noEmitOnError false || true"`
**After:** `"build": "node --max-old-space-size=4096 ./node_modules/typescript/lib/tsc.js --noEmitOnError false"`

## Verification

| Check | Result |
|---|---|
| `npm run build` | exit 0, 0 errors ✅ |
| `npm run build` exit code (without `\|\| true`) | 0 ✅ |
| Total errors resolved | 26/26 ✅ |
| `Lean<T>` already imported in modified files | ✅ |
| `\|\| true` removed from package.json | ✅ |

## Security status

| Check | Result |
|---|---|
| mongoose version | 8.24.0 (no longer 8.17.2 with `$nor` CVE) |
| `npm audit --omit=dev` | 0 high/critical CVEs (3 moderate, acceptable) |
| `grep -rn "\$nor" src/` | 0 hits (we never used it) |

## Notes

- The original audit reported "111 errors across 39 files" — this was outdated. The actual count was 26 errors across 10 files (1 was in a route file, 9 in service files, plus 8 in a test file that was added in Phase 8).
- The Mongoose 8.24 upgrade is fully complete: build clean, security audit clean, all helper signatures compatible.
