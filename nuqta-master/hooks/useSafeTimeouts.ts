import { useEffect, useRef, useCallback } from 'react';

/**
 * Tracks all setTimeout IDs created during a component's lifetime and
 * automatically clears them on unmount. Prevents "setState on unmounted
 * component" warnings and race-condition crashes when timers fire after
 * the component is gone (common with rapid tab switching / navigation).
 *
 * Usage:
 *   const { setSafeTimeout, clearSafeTimeout, clearAllTimeouts } = useSafeTimeouts();
 *   setSafeTimeout(() => doSomething(), 220);
 *
 * The returned `id` is a NodeJS.Timeout (compatible with clearTimeout)
 * and can be passed to `clearSafeTimeout` for explicit cancellation.
 */
export function useSafeTimeouts() {
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const setSafeTimeout = useCallback((fn: () => void, ms: number): NodeJS.Timeout => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const clearSafeTimeout = useCallback((id: NodeJS.Timeout) => {
    clearTimeout(id);
    timersRef.current.delete(id);
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current.clear();
  }, []);

  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  return { setSafeTimeout, clearSafeTimeout, clearAllTimeouts };
}

export default useSafeTimeouts;
