/**
 * Mass-assignment guard.
 *
 * Express body parsing makes it trivial for a caller to set fields the
 * developer never intended to expose (`{ role: 'admin' }`, `{ _id: '...' }`,
 * `{ isInternal: true }`). The historical pattern of `{ ...req.body }` into
 * a Mongoose create/update spreads every input through unchecked.
 *
 * `pick()` is the safe alternative: declare the field allowlist explicitly
 * and only those fields make it through.
 *
 * Example:
 *   const updates = pick(req.body, ['title', 'isActive', 'priority']);
 *   await Model.findByIdAndUpdate(id, { $set: updates });
 */
export function pick<T extends Record<string, any>>(
  source: unknown,
  allowed: readonly string[],
): Partial<T> {
  if (!source || typeof source !== 'object') return {};
  const src = source as Record<string, any>;
  const out: Record<string, any> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(src, key) && src[key] !== undefined) {
      out[key] = src[key];
    }
  }
  return out as Partial<T>;
}

/**
 * Inverse of pick — strip a list of fields from an object. Useful for
 * "remove these regardless of input" patterns.
 */
export function omit<T extends Record<string, any>>(
  source: unknown,
  blocked: readonly string[],
): Partial<T> {
  if (!source || typeof source !== 'object') return {};
  const src = source as Record<string, any>;
  const blockedSet = new Set(blocked);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(src)) {
    if (!blockedSet.has(k)) out[k] = v;
  }
  return out as Partial<T>;
}
