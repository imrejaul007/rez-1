/**
 * Safe JSON.parse that returns a fallback value instead of throwing.
 * Use everywhere AsyncStorage values are parsed.
 */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
