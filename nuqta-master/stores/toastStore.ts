import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
  actions?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel';
  }>;
}

interface ToastStoreState {
  /** Currently displayed toast (queue is processed one-at-a-time) */
  currentToast: ToastItem | null;
  /** Queued toasts waiting to be shown */
  queue: ToastItem[];

  // Actions
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  dismissAll: () => void;
  /** Called by ToastManager when the current toast finishes its dismiss animation */
  _onDismiss: () => void;
}

let _idCounter = 0;

export const useToastStore = create<ToastStoreState>((set, get) => ({
  currentToast: null,
  queue: [],

  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration: number = 3000) => {
    const newToast: ToastItem = {
      id: `toast-${++_idCounter}`,
      message,
      type,
      duration,
    };

    const { currentToast } = get();
    if (!currentToast) {
      set({ currentToast: newToast });
    } else {
      set((s) => ({ queue: [...s.queue, newToast] }));
    }
  },

  showSuccess: (message: string, duration?: number) => {
    get().showToast(message, 'success', duration);
  },

  showError: (message: string, duration?: number) => {
    get().showToast(message, 'error', duration);
  },

  showInfo: (message: string, duration?: number) => {
    get().showToast(message, 'info', duration);
  },

  showWarning: (message: string, duration?: number) => {
    get().showToast(message, 'warning', duration);
  },

  dismissAll: () => {
    set({ currentToast: null, queue: [] });
  },

  _onDismiss: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      // Small delay for smooth transition between toasts
      setTimeout(() => {
        set({ currentToast: next, queue: rest });
      }, 300);
      set({ currentToast: null });
    } else {
      set({ currentToast: null });
    }
  },
}));
