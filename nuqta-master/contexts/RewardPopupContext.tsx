/**
 * Reward Popup Context
 *
 * Global context for managing reward unlocked popups.
 * Allows showing reward popups from anywhere in the app after purchases,
 * challenges, achievements, etc.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';
import { RewardUnlockedData } from '@/components/gamification/RewardUnlockedPopup';
import { BRAND } from '@/constants/brand';

interface RewardPopupContextType {
  // Show a reward popup
  showRewardPopup: (data: Omit<RewardUnlockedData, 'id'>) => void;

  // Show coins earned popup (convenience method)
  showCoinsEarned: (amount: number, description?: string, onClaim?: () => void) => void;

  // Show cashback earned popup (convenience method)
  showCashbackEarned: (amount: number, description?: string, onClaim?: () => void) => void;

  // Show freebie/voucher popup (convenience method)
  showFreebieUnlocked: (
    description: string,
    options?: {
      isExpiring?: boolean;
      expiryText?: string;
      icon?: RewardUnlockedData['icon'];
      onClaim?: () => void;
    }
  ) => void;

  // Dismiss current popup
  dismissPopup: () => void;

  // Current popup data (for manager to render)
  currentPopup: RewardUnlockedData | null;

  // Queue of pending popups
  popupQueue: RewardUnlockedData[];
}

const RewardPopupContext = createContext<RewardPopupContextType | undefined>(undefined);

interface RewardPopupProviderProps {
  children: ReactNode;
}

export function RewardPopupProvider({ children }: RewardPopupProviderProps) {
  const [currentPopup, setCurrentPopup] = useState<RewardUnlockedData | null>(null);
  const [popupQueue, setPopupQueue] = useState<RewardUnlockedData[]>([]);

  // Generate unique ID for each popup
  const generateId = () => `reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Process next popup from queue
  const processQueue = useCallback(() => {
    setPopupQueue((prevQueue) => {
      if (prevQueue.length > 0) {
        const [nextPopup, ...remainingQueue] = prevQueue;
        setCurrentPopup(nextPopup);
        return remainingQueue;
      }
      return prevQueue;
    });
  }, []);

  // Show a reward popup
  const showRewardPopup = useCallback((data: Omit<RewardUnlockedData, 'id'>) => {
    const popupData: RewardUnlockedData = {
      ...data,
      id: generateId(),
    };

    // If no current popup, show immediately
    setCurrentPopup((current) => {
      if (!current) {
        return popupData;
      } else {
        // Queue if there's already a popup showing
        setPopupQueue((prev) => [...prev, popupData]);
        return current;
      }
    });
  }, []);

  // Dismiss current popup and show next from queue
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissPopup = useCallback(() => {
    setCurrentPopup(null);
    // Small delay before showing next popup
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      processQueue();
    }, 300);
  }, [processQueue]);

  // Convenience method: Show coins earned
  const showCoinsEarned = useCallback(
    (amount: number, description?: string, onClaim?: () => void) => {
      showRewardPopup({
        type: 'coins',
        title: 'Reward unlocked!',
        description: description || BRAND.COIN_NAME,
        amount,
        icon: 'coin',
        onClaim,
      });
    },
    [showRewardPopup]
  );

  // Convenience method: Show cashback earned
  const showCashbackEarned = useCallback(
    (amount: number, description?: string, onClaim?: () => void) => {
      showRewardPopup({
        type: 'cashback',
        title: 'Cashback earned!',
        description: description || `AED ${amount} added to wallet`,
        amount,
        icon: 'cash',
        onClaim,
      });
    },
    [showRewardPopup]
  );

  // Convenience method: Show freebie/voucher unlocked
  const showFreebieUnlocked = useCallback(
    (
      description: string,
      options?: {
        isExpiring?: boolean;
        expiryText?: string;
        icon?: RewardUnlockedData['icon'];
        onClaim?: () => void;
      }
    ) => {
      showRewardPopup({
        type: 'freebie',
        title: 'Reward unlocked!',
        description,
        isExpiring: options?.isExpiring,
        expiryText: options?.expiryText,
        icon: options?.icon || 'gift',
        onClaim: options?.onClaim,
      });
    },
    [showRewardPopup]
  );

  const value = useMemo<RewardPopupContextType>(() => ({
    showRewardPopup,
    showCoinsEarned,
    showCashbackEarned,
    showFreebieUnlocked,
    dismissPopup,
    currentPopup,
    popupQueue,
  }), [showRewardPopup, showCoinsEarned, showCashbackEarned, showFreebieUnlocked, dismissPopup, currentPopup, popupQueue]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return (
    <RewardPopupContext.Provider value={value}>
      {children}
    </RewardPopupContext.Provider>
  );
}

/**
 * Hook to use the reward popup context.
 * Now backed by Zustand store — works with or without RewardPopupProvider in tree.
 */
export function useRewardPopup() {
  const context = useContext(RewardPopupContext);
  const store = __useRewardPopupStore();
  if (context) return context;
  return store as unknown as RewardPopupContextType;
}

// Lazy import to avoid circular deps
let __useRewardPopupStore: () => any;
try {
  const { useRewardPopupStore } = require('@/stores/rewardPopupStore');
  __useRewardPopupStore = useRewardPopupStore;
} catch {
  __useRewardPopupStore = () => ({});
}

// Export type for external use
export type { RewardUnlockedData };
