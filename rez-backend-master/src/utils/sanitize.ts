/**
 * Escape special regex characters in a string for safe use in MongoDB $regex queries.
 * Prevents ReDoS attacks and regex injection.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate a sort field against a whitelist of allowed fields.
 * Prevents MongoDB sort field injection (e.g., "$where", "__proto__").
 */
export function validateSortField(
  sortBy: string | undefined,
  allowedFields: readonly string[],
  defaultField: string
): string {
  if (!sortBy || typeof sortBy !== 'string') return defaultField;
  return allowedFields.includes(sortBy) ? sortBy : defaultField;
}
