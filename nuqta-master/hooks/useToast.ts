import { useToastStore } from '@/stores/toastStore';

/**
 * Hook to access toast notification functionality.
 * Now backed entirely by Zustand store — works anywhere, no provider needed.
 *
 * @example
 * ```tsx
 * const { showSuccess, showError } = useToast();
 *
 * // Show success toast
 * showSuccess('Item added to cart!');
 *
 * // Show error toast with custom duration
 * showError('Failed to load data', 5000);
 *
 * // Show custom toast
 * showToast('Processing...', 'info', 2000);
 *
 * // Dismiss all toasts
 * dismissAll();
 * ```
 */
export function useToast() {
  const { showToast, showSuccess, showError, showInfo, showWarning, dismissAll } = useToastStore();
  return { showToast, showSuccess, showError, showInfo, showWarning, dismissAll };
}
