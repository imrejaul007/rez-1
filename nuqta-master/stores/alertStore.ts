import { create } from 'zustand';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message: string;
  buttons?: AlertButton[];
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface AlertStoreState {
  visible: boolean;
  alertData: AlertOptions | null;

  // Actions
  showAlert: (options: AlertOptions) => void;
  dismiss: (button?: AlertButton) => void;
}

export const useAlertStore = create<AlertStoreState>((set) => ({
  visible: false,
  alertData: null,

  showAlert: (options: AlertOptions) => {
    set({ alertData: options, visible: true });
  },

  dismiss: (button?: AlertButton) => {
    set({ visible: false });
    // Delay callback + clear so the animation can finish
    setTimeout(() => {
      if (button?.onPress) {
        button.onPress();
      }
      set({ alertData: null });
    }, 200);
  },
}));

/**
 * Imperative alert function — works without any React provider.
 * Drop-in replacement for the old CrossPlatformAlertProvider callback.
 */
export function showAlert(
  title: string,
  message: string,
  buttons?: AlertButton[],
  type: 'success' | 'error' | 'warning' | 'info' = 'info'
) {
  useAlertStore.getState().showAlert({ title, message, buttons, type });
}
