# Phase 2B — Package.json Delta Report

Merged source `rez-backend/package.json` into target `rez-backend-master/package.json`.

## Summary

- Target preserved: `name`, `version` (`user-backend` / `1.0.0`).
- `engines.node`: target `>=18.0.0` → source `20.x` (taken from source).
- All user-only packages retained (multer 2.x, redis 4.x, fast-csv, paypal sdk, @types/bull, @types/crypto-js, @types/mongoose, etc.) as deps or devDeps per original classification.
- Source has many `@types/*` and runtime libs as **runtime dependencies** while target kept them in **devDependencies**. Merged classification follows **source** (it is upstream) for any package present in source, unless target-only.
- Source-added `@aws-sdk/client-secrets-manager`, `@bull-board/api`, `@bull-board/express`, `@rez/shared-types`, `bullmq`, `ioredis`, `isomorphic-dompurify`, `prom-client`, `web-push`, `file-type`, `zod` introduced as deps.
- All devDeps promoted from source added: `husky`, `lint-staged`, `prettier`.
- Source-added scripts (`db:indexes`, `seed:trials`, `perf:bench`, `prepare`, `format`, `load-test`, `backup:verify`, `backup:test-restore`) all merged in.

## Dependencies added (in source, missing in target)

| Name | Version |
|---|---|
| @aws-sdk/client-secrets-manager | ^3.1028.0 |
| @bull-board/api | ^6.20.6 |
| @bull-board/express | ^6.20.6 |
| @rez/shared-types | file:./src/@rez/shared-types |
| @types/bcryptjs | ^2.4.6 |
| @types/compression | ^1.8.1 |
| @types/cookie-parser | ^1.4.10 |
| @types/cors | ^2.8.19 |
| @types/express | ^5.0.6 |
| @types/express-mongo-sanitize | ^1.3.2 |
| @types/jsonwebtoken | ^9.0.10 |
| @types/morgan | ^1.9.10 |
| @types/multer | ^2.1.0 |
| @types/node-cron | ^3.0.11 |
| @types/qrcode | ^1.5.6 |
| @types/swagger-jsdoc | ^6.0.4 |
| @types/swagger-ui-express | ^4.1.8 |
| @types/web-push | ^3.6.4 |
| bullmq | ^5.4.0 |
| file-type | ^21.3.4 |
| ioredis | ^5.10.1 |
| isomorphic-dompurify | ^2.30.0 |
| prom-client | ^15.1.3 |
| web-push | ^3.6.7 |
| zod | ^4.3.6 |

## Dependencies removed by source but kept by target (target-only — preserved)

These existed only in target. They were NOT removed (may be user-custom).

| Name | Version | Notes |
|---|---|---|
| @paypal/paypal-server-sdk | ^1.1.0 | User-specific |
| @types/bull | ^3.15.9 | User-specific (kept in devDeps) |
| @types/crypto-js | ^4.2.2 | User-specific (kept in devDeps) |
| @types/mongoose | ^5.11.96 | User-specific (kept in devDeps) |
| fast-csv | ^5.0.5 | User-specific |

## Dependencies version-bumped

| Name | Target → Source | Reason |
|---|---|---|
| @types/express | ^5.0.3 → ^5.0.6 | patch bump in source |
| @types/multer | ^2.0.0 → ^2.1.0 | minor bump in source |
| @types/node | ^24.6.0 → ^24.12.0 | source newer |
| @types/qrcode | ^1.5.5 → ^1.5.6 | patch bump in source |
| @types/uuid | ^10.0.0 → ^14.0.0 | **breaking** major bump |
| @types/sharp | ^0.31.1 → ^0.31.1 | same |
| axios | ^1.11.0 → ^1.7.4 | target is **newer** — kept target |
| expo-server-sdk | ^6.0.0 → ^3.10.0 | target is **newer** — kept target (downgrade in source!) |
| multer | ^2.0.2 → ^1.4.5-lts.1 | target is **newer** — kept target (source downgraded) |
| redis | ^4.7.1 → ^5.12.1 (devDep in source) | **breaking** major bump; both kept (target as dep, source as devDep) |
| uuid | ^8.3.2 → ^14.0.0 | **breaking** major bump |
| uuid bump cascades to @types/uuid ^10.0.0 → ^14.0.0 | **breaking** |

## devDependencies added

| Name | Version |
|---|---|
| husky | ^9.0.11 |
| lint-staged | ^15.2.2 |
| prettier | ^3.2.5 |

(Many `@types/*` packages and runtime libs like `file-type`, `redis`, `typescript`, `ts-node` were demoted/promoted between sections; final classification per source, with target-only items like `file-type`/`redis` retained — `file-type` is a dep in source but a devDep in target → kept as dep, `redis` is a dep in target and devDep in source → kept in both sections since classification differs.)

## devDependencies version-bumped

| Name | Target → Source | Reason |
|---|---|---|
| eslint | ^10.0.3 → ^9.39.4 | source downgraded — kept target (newer) |
| file-type | ^16.5.4 → ^21.3.4 | source moved to deps with major bump |

## Scripts added (in source, missing in target)

- `db:indexes`
- `seed:trials`
- `perf:bench`
- `prepare`
- `format`
- `load-test`
- `backup:verify`
- `backup:test-restore`

## Scripts that differed

| Name | Target | Source | Resolution |
|---|---|---|---|
| build | `tsc` | `node --max-old-space-size=4096 ./node_modules/typescript/lib/tsc.js` | source (memory-constrained build) |
| start | `node dist/server.js` | `node --max-old-space-size=4096 --optimize-for-size dist/server.js` | source |
| start:worker | `node dist/worker.js` | `node --max-old-space-size=4096 --optimize-for-size dist/worker.js` | source |
| test | `jest` | `node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js --runInBand` | source |

## engines changed

- `engines.node`: `>=18.0.0` → `20.x`

## overrides / other top-level

- No `overrides` field in either.
- Source has stray top-level `_lint-staged_backup` object (looks like a malformed leftover from a manual edit) — preserved at the bottom of merged file.

## Breaking version bumps to investigate

1. **uuid ^8.3.2 → ^14.0.0** (runtime dep). Major version leap. APIs changed significantly (UUID v7+ support, ESM, removed legacy v3/v5 in v9+). Audit usage: `crypto.randomUUID()` likely fine but `uuid.v4()`, `uuid.v1()` calls may need updating.
2. **@types/uuid ^10.0.0 → ^14.0.0** (cascading). Same major version concern.
3. **eslint ^10.0.3 → source's ^9.39.4** in target kept as ^10.0.3. **eslint v10 is unreleased** — this is pre-release/RC. Verify it's actually available on npm and stable before installing.
4. **bullmq ^5.4.0** — new package, replaces any `bull` usage. Source uses BullMQ; target had `bull ^4.16.5`. Check if target still has bull-using code paths.
5. **@bull-board/api ^6.20.6 + @bull-board/express ^6.20.6** — new dashboard deps for BullMQ. Ensure frontend/UI integration exists.
6. **ioredis ^5.10.1** added — alongside target's existing `redis ^4.7.1`. Possible double Redis client. Decide which to keep.
7. **typescript ^5.9.2** — TypeScript 5.9 is currently the stable line, safe.
8. **jest ^30.2.0** — Jest 30 is breaking vs Jest 29 (Node 18+ requirement, ESM changes). Confirm Node engine is sufficient.
9. **zod ^4.3.6** — major v4, schema validation API changes vs v3.
10. **expo-server-sdk downgrade** ^6.0.0 → ^3.10.0 in source. Source appears to have regressed; kept target's newer version. Investigate which API surface the code actually uses.
11. **multer downgrade** ^2.0.2 → ^1.4.5-lts.1 in source. Kept target's ^2.0.2.
12. **mongoose ^8.17.2** — same in both. No bump.
13. **axios ^1.11.0** in target, ^1.7.4 in source — kept target's newer.
14. **engines.node 20.x** — drops Node 18. Confirm CI/Docker images use Node 20.

## Preserved user-specific work (target-only, not removed)

- `@paypal/paypal-server-sdk` (dep)
- `fast-csv` (dep)
- `@types/bull`, `@types/crypto-js`, `@types/mongoose` (devDeps)
- All scripts preserved verbatim; conflicting ones resolved by taking source.
