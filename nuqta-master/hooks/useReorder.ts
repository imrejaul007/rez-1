// useReorder Hook
// Manages re-ordering functionality

import { useState, useCallback } from 'react';
import reorderService, {
  ReorderValidation,
  ReorderResult,
  FrequentlyOrderedItem,
  ReorderSuggestion
} from '@/services/reorderApi';
import { useRefreshCart } from '@/stores/selectors';
import { router } from 'expo-router';

interface UseReorderReturn {
  // State
  validating: boolean;
  reordering: boolean;
  validation: ReorderValidation | null;
  error: string | null;

  // Actions
  validateReorder: (orderId: string, itemIds?: string[]) => Promise<boolean>;
  reorderFull: (orderId: string) => Promise<boolean>;
  reorderSelected: (orderId: string, itemIds: string[]) => Promise<boolean>;
  clearValidation: () => void;
}

interface UseFrequentlyOrderedReturn {
  items: FrequentlyOrderedItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseReorderSuggestionsReturn {
  suggestions: ReorderSuggestion[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReorder(): UseReorderReturn {
  const [validating, setValidating] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [validation, setValidation] = useState<ReorderValidation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshCart = useRefreshCart();

  const validateReorder = useCallback(async (
    orderId: string,
    itemIds?: string[]
  ): Promise<boolean> => {
    try {
      setValidating(true);
      setError(null);

      const response = await reorderService.validateReorder(orderId, itemIds);

      if (response.success && response.data) {
        setValidation(response.data);

        return response.data.canReorder;
      } else {
        throw new Error(response.message || 'Failed to validate reorder');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate reorder';
      setError(errorMessage);
      return false;
    } finally {
      setValidating(false);
    }
  }, []);

  const reorderFull = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      setReordering(true);
      setError(null);

      const response = await reorderService.reorderFullOrder(orderId);

      if (response.success && response.data) {
        const result = response.data;

        // Refresh cart
        await refreshCart();

        // Store validation for display
        setValidation(result.validation);

        return true;
      } else {
        throw new Error(response.message || 'Failed to reorder');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder';
      setError(errorMessage);
      return false;
    } finally {
      setReordering(false);
    }
  }, [refreshCart]);

  const reorderSelected = useCallback(async (
    orderId: string,
    itemIds: string[]
  ): Promise<boolean> => {
    try {
      setReordering(true);
      setError(null);

      const response = await reorderService.reorderSelectedItems(orderId, itemIds);

      if (response.success && response.data) {
        const result = response.data;

        // Refresh cart
        await refreshCart();

        // Store validation for display
        setValidation(result.validation);

        return true;
      } else {
        throw new Error(response.message || 'Failed to reorder selected items');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder selected items';
      setError(errorMessage);
      return false;
    } finally {
      setReordering(false);
    }
  }, [refreshCart]);

  const clearValidation = useCallback(() => {
    setValidation(null);
    setError(null);
  }, []);

  return {
    validating,
    reordering,
    validation,
    error,
    validateReorder,
    reorderFull,
    reorderSelected,
    clearValidation
  };
}

export function useFrequentlyOrdered(limit: number = 10): UseFrequentlyOrderedReturn {
  const [items, setItems] = useState<FrequentlyOrderedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await reorderService.getFrequentlyOrdered(limit);

      if (response.success && response.data) {
        setItems(response.data);

      } else {
        throw new Error(response.message || 'Failed to load frequently ordered items');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load frequently ordered items';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  return {
    items,
    loading,
    error,
    refresh
  };
}

export function useReorderSuggestions(): UseReorderSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await reorderService.getReorderSuggestions();

      if (response.success && response.data) {
        setSuggestions(response.data);

      } else {
        throw new Error(response.message || 'Failed to load reorder suggestions');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reorder suggestions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    suggestions,
    loading,
    error,
    refresh
  };
}
