import { create } from 'zustand';
import {
  GreetingState,
  GreetingContextType,
  GreetingConfig,
  GreetingData,
} from '@/types/greeting.types';
import {
  getGreetingForTime as getGreetingForTimeUtil,
  getSmartGreeting,
} from '@/utils/greetingUtils';

const initialState: GreetingState = {
  currentGreeting: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

interface GreetingStoreState extends GreetingContextType {}

export const useGreetingStore = create<GreetingStoreState>((set) => ({
  state: initialState,

  updateGreeting: async (config?: GreetingConfig): Promise<void> => {
    try {
      set((s) => ({ state: { ...s.state, isLoading: true, error: null } }));

      const greetingConfig: GreetingConfig = {
        language: 'en',
        includeEmoji: true,
        personalized: true,
        ...config,
      };

      const greeting = getSmartGreeting(new Date(), greetingConfig);

      set({
        state: {
          currentGreeting: greeting,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        },
      });
    } catch (_error) {
      set((s) => ({
        state: { ...s.state, error: 'Failed to update greeting', isLoading: false },
      }));
    }
  },

  getGreetingForTime: (date: Date, config?: GreetingConfig): GreetingData => {
    const greetingConfig: GreetingConfig = {
      language: 'en',
      includeEmoji: true,
      personalized: true,
      ...config,
    };

    return getGreetingForTimeUtil(date, greetingConfig);
  },

  clearError: () => {
    set((s) => ({ state: { ...s.state, error: null } }));
  },
}));

// Auto-initialize greeting on import
useGreetingStore.getState().updateGreeting();
