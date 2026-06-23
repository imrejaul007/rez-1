// @ts-nocheck
/**
 * DeferredProvider utility and all lazy-loaded context provider wrappers.
 * These providers are loaded after the initial render to speed up app startup.
 *
 * KEY DESIGN: Module-level provider cache prevents cascading remounts.
 *
 * Problem: Nested DeferredProviders load at staggered times. When an outer
 * provider loads, it switches from Fragment→Provider, causing React to remount
 * ALL inner providers. Each inner remount resets its delay timer, creating a
 * cascading chain.
 *
 * Solution: Once a provider component is loaded, it's cached at module scope.
 * When a DeferredProvider remounts (due to an outer provider loading), it
 * reads the cache in useState initializer. If cached, it renders the Provider
 * from the FIRST render — no Fragment→Provider switch, no remount of children,
 * no further cascade.
 *
 * Removed (now Zustand stores / module singletons):
 * - DeferredNotification → notificationStore
 * - DeferredSecurity → securityStore
 * - DeferredWishlist → wishlistStore
 * - DeferredProfile → profileStore
 * - DeferredGreeting → greetingStore
 * - DeferredOffers → offersThemeStore
 * - DeferredAppPreferences → appPreferencesStore
 * - DeferredSubscription → subscriptionStore
 * - DeferredCategory → categoryStore
 * - DeferredRecommendation → recommendationStore
 * - DeferredOfflineQueue → offlineQueueStore
 */
import React from 'react';
import { useIsMounted } from '@/hooks/useIsMounted';

// ── Module-level cache: survives remounts from outer DeferredProviders ──
const _providerCache = new Map<string, React.ComponentType<{ children: React.ReactNode }>>();

function DeferredInner({ provider: Provider, children }: {
  provider: React.ComponentType<{ children: React.ReactNode }> | null;
  children: React.ReactNode;
}) {
  if (!Provider) return <>{children}</>;
  return <Provider>{children}</Provider>;
}

function DeferredProvider({
  load,
  children,
  delayMs = 0,
  cacheKey,
}: {
  load: () => Promise<React.ComponentType<{ children: React.ReactNode }>>;
  children: React.ReactNode;
  delayMs?: number;
  cacheKey: string;
}) {
  const isMounted = useIsMounted();
  // Check module-level cache first — if this provider was loaded before an outer
  // provider caused a remount, use it immediately (no Fragment→Provider switch)
  const [Provider, setProvider] = React.useState<React.ComponentType<{ children: React.ReactNode }> | null>(
    () => _providerCache.get(cacheKey) || null
  );

  React.useEffect(() => {
    if (Provider) return; // Already loaded from cache

    let cancelled = false;
    const doLoad = () => {
      load().then(P => {
        if (!cancelled) {
          _providerCache.set(cacheKey, P);
          setProvider(() => P);
        }
      }).catch(() => { /* silently handle */ });
    };

    if (delayMs > 0) {
      const timer = setTimeout(doLoad, delayMs);
      return () => { cancelled = true; clearTimeout(timer); };
    }
    doLoad();
    return () => { cancelled = true; };
  }, []);

  return <DeferredInner provider={Provider}>{children}</DeferredInner>;
}

export const DeferredSocket: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DeferredProvider cacheKey="socket" load={() => import('@/contexts/SocketContext').then(m => m.SocketProvider)} delayMs={2000}>
    {children}
  </DeferredProvider>
);

export const DeferredWallet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DeferredProvider cacheKey="wallet" load={() => import('@/contexts/WalletContext').then(m => m.WalletProvider)}>
    {children}
  </DeferredProvider>
);

export const DeferredGamification: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DeferredProvider cacheKey="gamification" load={() => import('@/contexts/GamificationContext').then(m => m.GamificationProvider)} delayMs={500}>
    {children}
  </DeferredProvider>
);

export const DeferredCart: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DeferredProvider cacheKey="cart" load={() => import('@/contexts/CartContext').then(m => m.CartProvider)}>
    {children}
  </DeferredProvider>
);
