import { create } from 'zustand';

export interface AppPreferences {
  startupScreen: 'HOME' | 'EXPLORE' | 'LAST_VIEWED';
  defaultView: 'CARD' | 'LIST' | 'GRID';
  autoRefresh: boolean;
  offlineMode: boolean;
  dataSaver: boolean;
  highQualityImages: boolean;
  animations: boolean;
  sounds: boolean;
  hapticFeedback: boolean;
}

interface AppPreferencesContextType {
  preferences: AppPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<AppPreferences>) => Promise<boolean>;
  refreshPreferences: () => Promise<void>;
  triggerHapticFeedback: (type?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;
  playSound: (type?: 'success' | 'error' | 'notification' | 'click') => void;
  shouldAnimate: () => boolean;
  shouldPlaySounds: () => boolean;
  shouldUseHaptics: () => boolean;
}

export const useAppPreferencesStore = create<AppPreferencesContextType>(() => ({
  preferences: null,
  isLoading: false,
  error: null,
  updatePreferences: async () => false,
  refreshPreferences: async () => {},
  triggerHapticFeedback: () => {},
  playSound: () => {},
  shouldAnimate: () => true,
  shouldPlaySounds: () => false,
  shouldUseHaptics: () => false,
}));
