import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { useLocation } from './LocationContext';
import { useAuthUser } from '@/stores/selectors';
import {
  getCurrentGreeting,
  getGreetingForTime as getGreetingForTimeUtil,
  getSmartGreeting,
} from '@/utils/greetingUtils';
import {
  GreetingState,
  GreetingContextType,
  GreetingConfig,
  GreetingData,
} from '@/types/greeting.types';

// Action types
type GreetingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GREETING'; payload: GreetingData }
  | { type: 'SET_LAST_UPDATED'; payload: Date }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: GreetingState = {
  currentGreeting: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Reducer
function greetingReducer(state: GreetingState, action: GreetingAction): GreetingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_GREETING':
      return { 
        ...state, 
        currentGreeting: action.payload, 
        isLoading: false,
        lastUpdated: new Date()
      };
    
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Create context
const GreetingContext = createContext<GreetingContextType | undefined>(undefined);

// Provider component
interface GreetingProviderProps {
  children: ReactNode;
}

export function GreetingProvider({ children }: GreetingProviderProps) {
  const [state, dispatch] = useReducer(greetingReducer, initialState);
  const { state: locationState } = useLocation();
  const authUser = useAuthUser();

  // Store auth/location state in refs so callbacks don't depend on them
  const authUserRef = useRef(authUser);
  authUserRef.current = authUser;
  const locationStateRef = useRef(locationState);
  locationStateRef.current = locationState;

  const updateGreeting = useCallback(async (config?: GreetingConfig): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Build greeting configuration using refs for stable deps
      const greetingConfig: GreetingConfig = {
        userName: authUserRef.current?.profile?.firstName || undefined,
        timezone: locationStateRef.current.currentLocation?.timezone || 'Asia/Kolkata',
        language: 'en',
        includeEmoji: true,
        personalized: true,
        ...config,
      };

      // Get current greeting
      const greeting = getSmartGreeting(new Date(), greetingConfig);

      dispatch({ type: 'SET_GREETING', payload: greeting });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update greeting' });
    }
  }, []);

  const getGreetingForTime = useCallback((date: Date, config?: GreetingConfig): GreetingData => {
    const greetingConfig: GreetingConfig = {
      userName: authUserRef.current?.profile?.firstName || undefined,
      timezone: locationStateRef.current.currentLocation?.timezone || 'Asia/Kolkata',
      language: 'en',
      includeEmoji: true,
      personalized: true,
      ...config,
    };

    return getGreetingForTimeUtil(date, greetingConfig);
  }, []);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Initialize greeting
  useEffect(() => {
    updateGreeting();
  }, [updateGreeting]);

  // Update greeting when location or user changes
  useEffect(() => {
    if (locationState.currentLocation || authUser) {
      updateGreeting();
    }
  }, [locationState.currentLocation, authUser, updateGreeting]);

  // Update greeting every hour
  useEffect(() => {
    const interval = setInterval(() => {
      updateGreeting();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updateGreeting]);

  const contextValue = useMemo<GreetingContextType>(() => ({
    state,
    updateGreeting,
    getGreetingForTime,
    clearError,
  }), [state, updateGreeting, getGreetingForTime, clearError]);

  return (
    <GreetingContext.Provider value={contextValue}>
      {children}
    </GreetingContext.Provider>
  );
}

const GREETING_DEFAULTS: GreetingContextType = {
  state: { currentGreeting: null, isLoading: false, error: null, lastUpdated: null },
  updateGreeting: async () => {},
  getGreetingForTime: () => ({ text: '', emoji: '', period: 'morning' }) as any,
  clearError: () => {},
};

// Custom hook to use greeting context
// Now backed by Zustand store — works with or without GreetingProvider in tree.
export function useGreeting(): GreetingContextType {
  const context = useContext(GreetingContext);
  const store = __useGreetingStore();
  if (context) return context;
  return store as unknown as GreetingContextType;
}

// Lazy import to avoid circular deps
let __useGreetingStore: () => any;
try {
  const { useGreetingStore } = require('@/stores/greetingStore');
  __useGreetingStore = useGreetingStore;
} catch {
  __useGreetingStore = () => GREETING_DEFAULTS;
}

// Custom hook for greeting display
export function useGreetingDisplay() {
  const { state } = useGreeting();
  
  return {
    greeting: state.currentGreeting,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
  };
}

// Custom hook for time-based greeting
export function useTimeBasedGreeting() {
  const { getGreetingForTime } = useGreeting();
  
  const getGreetingForCurrentTime = (config?: GreetingConfig) => {
    return getGreetingForTime(new Date(), config);
  };

  const getGreetingForSpecificTime = (date: Date, config?: GreetingConfig) => {
    return getGreetingForTime(date, config);
  };

  return {
    getGreetingForCurrentTime,
    getGreetingForSpecificTime,
  };
}
