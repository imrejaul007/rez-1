/**
 * Stable empty references for Zustand selectors.
 * Using `?? []` or `?? {}` inline creates a new reference every selector
 * evaluation, which triggers subscriber re-renders and can contribute to
 * React Error #185 (maximum update depth exceeded).
 */
export const EMPTY_ARRAY: readonly never[] = Object.freeze([]);
export const EMPTY_OBJECT: Readonly<Record<string, never>> = Object.freeze({});
