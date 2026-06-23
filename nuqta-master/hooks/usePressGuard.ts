import { useRef, useCallback, useState } from 'react';

/**
 * Prevents double-tap on async action buttons.
 * Returns a wrapped handler that ignores calls while the previous one is still running,
 * plus an optional minimum cooldown.
 *
 * @param handler - The async function to guard
 * @param cooldownMs - Minimum time between calls (default 500ms)
 * @returns [guardedHandler, isBusy] — isBusy can be used to disable the button
 */
export function usePressGuard<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  cooldownMs: number = 500
): [(...args: Parameters<T>) => Promise<void>, boolean] {
  const busyRef = useRef(false);
  const lastCallRef = useRef(0);
  const [isBusy, setIsBusy] = useState(false);

  const guarded = useCallback(async (...args: Parameters<T>) => {
    const now = Date.now();
    if (busyRef.current || now - lastCallRef.current < cooldownMs) return;
    busyRef.current = true;
    lastCallRef.current = now;
    setIsBusy(true);
    try {
      await handler(...args);
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }, [handler, cooldownMs]);

  return [guarded, isBusy];
}
