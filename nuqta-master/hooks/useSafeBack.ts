import { useCallback } from 'react';
import { useRouter } from 'expo-router';

/**
 * Returns a memoized callback that navigates back if possible,
 * otherwise falls back to the home tab.
 *
 * Use as <Pressable onPress={useSafeBack()} /> or with stable deps:
 *   const handleBack = useSafeBack();
 *
 * Replaces 354 inline `onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}`
 * patterns across the app.
 */
export function useSafeBack(fallback: string = '/(tabs)'): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as any);
    }
  }, [router, fallback]);
}
