import { useRef, useCallback } from 'react';
import { useRouter, Href } from 'expo-router';

const DEDUP_MS = 500;

/**
 * Drop-in replacement for `useRouter()` that deduplicates rapid identical pushes.
 * Prevents double-navigation from quick taps on the same button.
 */
export function useNavigationDedup() {
  const router = useRouter();
  const lastNavRef = useRef<{ route: string; time: number }>({ route: '', time: 0 });

  const push = useCallback((route: Href, ...args: any[]) => {
    const routeStr = typeof route === 'string' ? route : JSON.stringify(route);
    const now = Date.now();
    if (routeStr === lastNavRef.current.route && now - lastNavRef.current.time < DEDUP_MS) {
      return;
    }
    lastNavRef.current = { route: routeStr, time: now };
    (router.push as any)(route, ...args);
  }, [router]);

  return { ...router, push };
}
