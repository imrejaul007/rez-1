# Unused Imports and Code Optimization Report

## Executive Summary

This report identifies potentially unused imports, duplicate imports, and unnecessary `require()` statements across the Res backend codebase. All findings are verified with confidence levels.

**IMPORTANT: No code has been modified. All findings require manual verification before removal.**

---

## VERIFIED UNUSED IMPORTS

### 1. rez-auth-service/src/middleware/requireMfa.ts

| Line | Import | Confidence | Status |
|------|--------|------------|--------|
| 7 | `successResponse` | **HIGH** | Imported but never referenced in this file |

**Evidence:** Grep for `successResponse` shows only the import on line 7. No other references found.

**Caution:** The function `successResponse` exists in `utils/response.ts` but is simply not used in this middleware file. It may be intentionally kept for API consistency or future use.

**Potential Fix:**
```typescript
// Line 7 - Before:
import { errorResponse, errors, successResponse } from '../utils/response';

// Line 7 - After (if confirmed safe):
import { errorResponse, errors } from '../utils/response';
```

---

## ACTUALLY USED IMPORTS (Corrected - No Action Needed)

### 2. Verified as USED - Removed from findings

| File | Import | Evidence |
|------|--------|----------|
| `src/routes/internalRoutes.ts` | `err` | **Used** - Lines 14, 15, 27, 41, 42, 51, 52, 75, 76 |
| `src/routes/profile.routes.ts` | `err` | **Used** - Lines 15, 27, 42, 52, 76 |
| `src/routes/authRoutes.ts` | `crypto` | **Used** - Line 1250 for `crypto.randomBytes()` |
| `src/routes/authRoutes.ts` | `z` | **Used** - For Zod validation schemas |
| `src/routes/authRoutes.ts` | `emailService` | **Used** - Line 1570 for `emailService.sendVerificationEmail()` |
| `src/routes/authRoutes.ts` | `deviceService` | **Used** - Lines 363, 409, etc. |

---

## POTENTIALLY REDUNDANT IMPORTS (Verify Before Removing)

### 3. rez-auth-service/src/middleware/auth.ts

| Line | Import | Confidence | Status |
|------|--------|------------|--------|
| 3 | `logger` | **MEDIUM** | Import present but not used in visible code |

**Evidence:** The file imports `logger` from `'../config/logger'` but no direct calls to `logger` found in the file content.

**Caution:** `logger` might be used by decorators, or removed during refactoring. Verify with TypeScript compiler before removing.

**Status:** Requires manual verification - may have been intentionally kept.

---

## UNNECESSARY DYNAMIC IMPORTS (Refactor Candidates)

### 4. rez-auth-service/src/routes/authRoutes.ts

| Lines | Issue | Confidence |
|-------|-------|------------|
| 644, 939, 1088 | Dynamic `import('../config/redis')` when `redis` is already imported at line 19 | **HIGH** |

**Evidence:**
- Line 19: `import { redis } from '../config/redis';` (top-level import)
- Line 644: `const { redis } = await import('../config/redis');`
- Line 939: `const { redis } = await import('../config/redis');`
- Line 1088: `const { redis } = await import('../config/redis');`

**Analysis:** The dynamic imports on lines 644, 939, 1088 create local `redis` variables that shadow the module-level import. Since `redis` is already available at the top of the file, these dynamic imports are redundant.

**Possible Reasons for Current Pattern:**
1. Circular dependency avoidance (redis config depends on something in routes)
2. Conditional initialization
3. Historical artifact from refactoring

**Before Refactoring:** Verify that `redis` module has no circular dependencies with authRoutes.

**Potential Fix:** Remove dynamic imports and use top-level `redis`:
```typescript
// Remove these lines:
// Line 644: const { redis } = await import('../config/redis');
// Line 939: const { redis } = await import('../config/redis');
// Line 1088: const { redis } = await import('../config/redis');
// Use the already-imported redis from line 19
```

---

### 5. rez-auth-service/src/index.ts

| Line | Issue | Confidence |
|------|-------|------------|
| 136 | `require('mongoose')` dynamic | **MEDIUM** |

**Evidence:**
- No top-level mongoose import in this file
- Line 136: `const mongoOk = require('mongoose').connection.readyState === 1;`

**Analysis:** Mongoose is not imported at the top of index.ts. The `require()` is used inside the `/health` endpoint handler to check MongoDB connection status.

**Reason for Pattern:** This is likely intentional to avoid loading mongoose until the health check is actually called. However, since `connectMongoDB()` is called on line 91, mongoose IS loaded - just not as a module import.

**Caution:** Verify if mongoose is already loaded via `connectMongoDB()` before removing this require.

---

## LAZY LOADING OPPORTUNITIES

### 6. Swagger UI in Production (rez-auth-service/src/index.ts)

| Lines | Module | Confidence |
|-------|--------|------------|
| 45-46 | `swagger-ui-express`, `yamljs` | **HIGH** |

**Evidence:** These modules are imported at the top (lines 45-46) but only used when `NODE_ENV !== 'production'` (lines 153-162).

**Impact:** Loading Swagger UI in production adds unnecessary bundle weight for unused functionality.

**Current Code:**
```typescript
// Always loaded:
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// Only used conditionally:
if (process.env.NODE_ENV !== 'production') {
  const swaggerDocument = YAML.load('./docs/openapi.yaml');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(...));
}
```

**Recommendation:** Move imports inside the conditional block for production optimization.

---

## SIDE-EFFECT IMPORTS (Do Not Remove)

### 7. Required Side-Effect Imports

| File | Import | Purpose | Confidence |
|------|--------|---------|------------|
| `src/index.ts:2` | `import './config/tracing';` | OpenTelemetry initialization | **HIGH** - Documented as required |
| `src/index.ts:4` | `import 'dotenv/config';` | Load environment variables | **HIGH** |
| `src/index.ts:5` | `import 'express-async-errors';` | Async error handling | **HIGH** |

---

## SCRIPTS USING COMMONJS

### 8. Scripts in rez-backend-master/

These files use CommonJS `require()`. Converting to ES modules is an option but requires careful testing:

| File | Recommendation |
|------|-----------------|
| `src/scripts/seed-videos.js` | Consider ESM if not used by legacy tools |
| `src/scripts/seedServiceProducts.js` | Consider ESM if not used by legacy tools |

**Note:** Some scripts intentionally use CommonJS for Node.js compatibility. Review before converting.

---

## SUMMARY TABLE

| # | File | Issue | Confidence | Recommended Action |
|---|------|-------|------------|-------------------|
| 1 | `requireMfa.ts` | `successResponse` unused | HIGH | Remove if verified |
| 2 | `auth.ts` | `logger` may be unused | MEDIUM | Verify with TypeScript |
| 3 | `authRoutes.ts` | 3 redundant dynamic redis imports (lines 644, 939, 1088) | HIGH | Refactor to use top-level import - verify no circular deps |
| 4 | `index.ts` | Dynamic mongoose require (line 136) | MEDIUM | Verify mongoose is loaded before removing |
| 5 | `index.ts` | Swagger UI loaded in production (lines 45-46) | HIGH | Lazy load in dev only |
| 6 | Various | Side-effect imports | HIGH | Keep as-is |

### Files Correctly Using Their Imports (No Action):
- `src/routes/internalRoutes.ts` - `err` is used
- `src/routes/profile.routes.ts` - `err` is used
- `src/routes/authRoutes.ts` - `crypto`, `z`, `emailService`, `deviceService` are all used

---

## TESTING RECOMMENDATIONS

Before making any changes, ensure:

1. **TypeScript compilation** passes with strict mode (`npx tsc --noEmit`)
2. **Unit tests** for affected modules pass
3. **Integration tests** for auth flows pass
4. **Health check endpoint** (`GET /health`) returns correct status
5. **Rate limiting** functions correctly
6. **Circular dependency check** if removing dynamic redis imports

---

*Report generated: 2026-06-25*
*Verification status: Findings flagged with confidence levels*
*No code modifications made - awaiting explicit approval*
