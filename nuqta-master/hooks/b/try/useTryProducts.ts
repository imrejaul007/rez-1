/**
 * useTryProducts — fetch the Try-module product catalogue and bundles.
 *
 * Phase 4.3 of the REZ-vs-NUQTA migration. Wraps two B-side endpoints:
 *
 *   - `GET /api/b/try/products?category=` — paginated trial products
 *     filtered by the supplied category (omit / `'all'` for everything).
 *   - `GET /api/b/try/bundles`             — curated bundle fixtures.
 *
 * Both are mocked in the migration phase; the request/response contract
 * is the stable surface.
 *
 * Contract
 * --------
 *  - On mount, fires both fetches in parallel via `Promise.all`.
 *  - While either is in flight, `isLoading` is `true`.
 *  - If the products fetch fails, `error` is populated and `products` is
 *    kept as an empty array so the UI can render a banner + retry.
 *  - If the bundles fetch fails, bundles is empty but products is still
 *    served — bundles are an additive enhancement.
 *  - `refresh()` re-runs both fetches — wired to pull-to-refresh.
 *  - `setCategory()` updates the active category and re-fetches the
 *    products list only (bundles are not category-scoped).
 *
 * Usage
 * -----
 *  ```tsx
 *  const { products, bundles, isLoading, error, refresh, category, setCategory } =
 *    useTryProducts();
 *  ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import {
  type TrialProduct,
  type TrialBundle,
  type TrialCategory,
  normalizeTrialProducts,
  normalizeTrialBundles,
} from '@/types/try.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Endpoint for trial products. */
const PRODUCTS_ENDPOINT = '/api/b/try/products';
/** Endpoint for trial bundles. */
const BUNDLES_ENDPOINT = '/api/b/try/bundles';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseTryProductsResult {
  /** Filtered product list for the active category. */
  products: TrialProduct[];
  /** Curated bundles (category-independent). */
  bundles: TrialBundle[];
  /** `true` while either initial fetch is in flight. */
  isLoading: boolean;
  /** `true` while a manual refresh is in flight. */
  isRefreshing: boolean;
  /** Last error message, or `null`. */
  error: string | null;
  /** Currently active category. Defaults to `'all'`. */
  category: TrialCategory;
  /** Switch the active category. Re-fetches the products list. */
  setCategory: (next: TrialCategory) => void;
  /** Re-run both fetches. Wired to pull-to-refresh. */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

interface ProductsResponse {
  products: TrialProduct[];
}

interface BundlesResponse {
  bundles: TrialBundle[];
}

async function fetchProducts(category: TrialCategory): Promise<TrialProduct[]> {
  const params: Record<string, string> = {};
  if (category !== 'all') {
    params['category'] = category;
  }
  const response = await apiClient.get<ProductsResponse>(
    PRODUCTS_ENDPOINT,
    params,
    { timeout: 8000 },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to load trials',
    );
    throw new Error(message);
  }
  return normalizeTrialProducts(response.data.products);
}

async function fetchBundles(): Promise<TrialBundle[]> {
  const response = await apiClient.get<BundlesResponse>(
    BUNDLES_ENDPOINT,
    undefined,
    { timeout: 8000 },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to load trial bundles',
    );
    throw new Error(message);
  }
  return normalizeTrialBundles(response.data.bundles);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * `useTryProducts` — read the trial product catalogue and bundles.
 *
 * Initial mount fetches both lists in parallel. `setCategory` triggers
 * a products-only re-fetch. `refresh` re-runs both. `error` is set if
 * the products fetch fails; bundles have their own failure mode that
 * is logged but does not surface to the user (they're additive).
 */
export function useTryProducts(): UseTryProductsResult {
  const [products, setProducts] = useState<TrialProduct[]>([]);
  const [bundles, setBundles] = useState<TrialBundle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategoryState] = useState<TrialCategory>('all');

  // Tracks whether the initial mount fetch has resolved (success or
  // fail) so the UI can tell apart "still loading" from "loaded but
  // empty" for the products list.
  const hasLoadedRef = useRef<boolean>(false);

  /**
   * Internal: fetch products for the supplied category. Always resolves —
   * errors are captured into `error` state.
   */
  const runProductsFetch = useCallback(
    async (target: TrialCategory): Promise<void> => {
      try {
        const list = await fetchProducts(target);
        setProducts(list);
        setError(null);
      } catch (err) {
        const message = errorToString(err);
        logger.warn(
          'try_products_fetch_failed',
          { category: target, error: message },
          'B Features',
        );
        setError(message);
        setProducts([]);
      }
    },
    [],
  );

  /**
   * Internal: fetch bundles. Always resolves — failure is logged but
   * does not surface to `error` (bundles are additive).
   */
  const runBundlesFetch = useCallback(async (): Promise<void> => {
    try {
      const list = await fetchBundles();
      setBundles(list);
    } catch (err) {
      const message = errorToString(err);
      logger.warn(
        'try_bundles_fetch_failed',
        { error: message },
        'B Features',
      );
      setBundles([]);
    }
  }, []);

  /**
   * Re-run both fetches. Sets `isLoading` only on the first run, and
   * `isRefreshing` on subsequent runs so the UI can show different
   * affordances.
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (hasLoadedRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      // Bundles are category-independent — fetch once and reuse.
      await Promise.all([runProductsFetch(category), runBundlesFetch()]);
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [category, runProductsFetch, runBundlesFetch]);

  // Initial mount: kick off the parallel fetch. Cancellation-safe.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const [productList, bundleList] = await Promise.all([
          fetchProducts(category),
          fetchBundles(),
        ]);
        if (cancelled) return;
        setProducts(productList);
        setBundles(bundleList);
      } catch (err) {
        if (cancelled) return;
        const message = errorToString(err);
        logger.warn(
          'try_initial_fetch_failed',
          { error: message },
          'B Features',
        );
        setError(message);
      } finally {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setIsLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // We intentionally only depend on `category` for the initial fetch
    // so re-categorising uses `setCategory` (which fires its own fetch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Switch the active category. Triggers a products-only re-fetch.
   * The bundles list is left alone.
   */
  const setCategory = useCallback(
    (next: TrialCategory): void => {
      setCategoryState(next);
      if (next === category) {
        return;
      }
      setIsRefreshing(true);
      runProductsFetch(next)
        .catch(() => {
          /* error already captured into `error` state */
        })
        .finally(() => {
          setIsRefreshing(false);
        });
    },
    [category, runProductsFetch],
  );

  return {
    products,
    bundles,
    isLoading,
    isRefreshing,
    error,
    category,
    setCategory,
    refresh,
  };
}

export default useTryProducts;
