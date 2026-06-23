/**
 * Shared-Types Validator Middleware (Week 3 cutover from MIGRATION.md).
 *
 * Wraps an Express handler with a v2 zod schema from `@rez/shared`.
 * Behavior is gated by `SHARED_TYPES_VALIDATION_MODE`:
 *
 *   off       — middleware is a no-op (default; safe in prod day-zero)
 *   shadow    — runs safeParse, logs failures as warn, and lets the request through
 *   enforce   — runs safeParse, returns 400 on failure
 *
 * The shadow phase is where we want to live for ~7 days. If `parseFailures`
 * stays at zero (or only matches known legacy-client traffic), flip to `enforce`.
 *
 * Failure log shape (PII-safe):
 *   {
 *     event: 'shared-types.parse.fail',
 *     endpoint: 'POST /api/orders',
 *     mode: 'shadow' | 'enforce',
 *     issues: ['user', 'items[0].quantity'],   // dotted paths only, no values
 *     issueCount: 2,
 *     correlationId: req.id,
 *     userId: 'masked-or-id',
 *   }
 *
 * Issues are deliberately stripped of `.message` and `.received` so we
 * never leak request payload into structured logs. If we need a value
 * sample, do it via Sentry breadcrumbs in a dev-only env, not here.
 */

import type { Request, Response, NextFunction } from 'express';

import { logger } from '../config/logger';

export type ValidationMode = 'off' | 'shadow' | 'enforce';

/** Read + normalize the env knob. Anything unrecognized falls back to 'off'. */
export function getSharedTypesValidationMode(): ValidationMode {
  const raw = (process.env.SHARED_TYPES_VALIDATION_MODE ?? '').trim().toLowerCase();
  if (raw === 'shadow' || raw === 'enforce') return raw;
  if (raw && raw !== 'off') {
    // Print once so misconfigured envs are visible, but don't spam every request.
    if (!warnedAboutUnknownMode.has(raw)) {
      warnedAboutUnknownMode.add(raw);
      logger.warn('[shared-types] Unknown SHARED_TYPES_VALIDATION_MODE — falling back to off', {
        provided: raw,
        accepted: ['off', 'shadow', 'enforce'],
      });
    }
  }
  return 'off';
}

/** Memoize unknown-mode warning so prod logs don't fill up. */
const warnedAboutUnknownMode = new Set<string>();
/** Allow tests to reset the memo. */
export function __resetSharedTypesWarningMemo(): void {
  warnedAboutUnknownMode.clear();
}

/** Build a list of dotted paths from zod issues — values are stripped. */
function summarizeIssues(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey> }>): string[] {
  const seen = new Set<string>();
  for (const issue of issues) {
    const path = issue.path
      .map((p) => (typeof p === 'number' ? `[${p}]` : String(p)))
      .join('.')
      .replace(/\.\[/g, '[');
    seen.add(path || '<root>');
  }
  return Array.from(seen).sort();
}

/** Pull a non-PII user identifier off the request (id only, never email/phone). */
function maskedUserId(req: Request): string | undefined {
  const u = (req as unknown as { user?: { id?: string; _id?: { toString(): string } } }).user;
  return u?.id ?? u?._id?.toString();
}

/** Pull the correlation id if our request-id middleware set one. */
function correlationIdOf(req: Request): string | undefined {
  return (
    (req as unknown as { id?: string }).id ??
    (req.headers['x-request-id'] as string | undefined) ??
    (req.headers['x-correlation-id'] as string | undefined)
  );
}

/**
 * Duck-typed schema interface — works with Zod 3 and Zod 4 schemas.
 * Only requires the safeParse method that we actually call.
 */
interface SchemaWithSafeParse {
  safeParse(
    data: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any;
}

/**
 * Build the middleware.
 *
 * @param schema   the zod schema from `@rez/shared`
 * @param endpoint human label such as "POST /api/orders" — used as the log key
 * @param options.modeOverride  per-route mode override (rare; default uses env)
 * @param options.bodyShaper    optional adapter that synthesizes the canonical
 *                              body from the wire body + req context (auth user,
 *                              idempotency-key header, etc.). Use when the wire
 *                              shape differs from the canonical schema's shape.
 *                              Returning `undefined` skips validation for this request.
 */
export function validateWithSharedTypes(
  schema: SchemaWithSafeParse,
  endpoint: string,
  options: {
    modeOverride?: ValidationMode;
    bodyShaper?: (req: Request) => unknown;
  } = {},
) {
  return function sharedTypesValidatorMiddleware(req: Request, res: Response, next: NextFunction) {
    const mode = options.modeOverride ?? getSharedTypesValidationMode();
    if (mode === 'off') return next();

    const candidate = options.bodyShaper ? options.bodyShaper(req) : req.body;
    // bodyShaper can opt-out per-request by returning undefined.
    if (candidate === undefined) return next();

    const result = schema.safeParse(candidate);
    if (result.success) return next();

    const issues = summarizeIssues(result.error.issues);
    const logPayload = {
      event: 'shared-types.parse.fail',
      endpoint,
      mode,
      issues,
      issueCount: issues.length,
      correlationId: correlationIdOf(req),
      userId: maskedUserId(req),
    };

    if (mode === 'shadow') {
      logger.warn('[shared-types] schema parse failed (shadow — request continues)', logPayload);
      return next();
    }

    // mode === 'enforce'
    logger.warn('[shared-types] schema parse failed (enforce — returning 400)', logPayload);
    return res.status(400).json({
      success: false,
      error: 'SHARED_TYPES_VALIDATION_FAILED',
      message: 'Request payload failed canonical schema validation',
      issues,
    });
  };
}

/**
 * Test-only handle so unit tests can inspect the underlying parsing without
 * dragging Express into the test harness. Mirrors the middleware's logic.
 */
export const __testOnly = {
  summarizeIssues,
  getSharedTypesValidationMode,
};
