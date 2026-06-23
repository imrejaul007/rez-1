import { create } from 'zustand';
import { BRAND } from '@/constants/brand';

// Inline the interface to avoid importing from a component file
interface RewardUnlockedData {
  id: string;
  type: 'coins' | 'cashback' | 'voucher' | 'discount' | 'freebie';
  title: string;
  description: string;
  amount?: number;
  isExpiring?: boolean;
  expiryText?: string;
  icon?: 'coin' | 'cash' | 'gift' | 'ticket' | 'beverage' | 'food';
  onClaim?: () => void;
  onDismiss?: () => void;
  duration?: number;
}

interface RewardPopupStoreState {
  showRewardPopup: (data: Omit<RewardUnlockedData, 'id'>) => void;
  showCoinsEarned: (amount: number, description?: string, onClaim?: () => void) => void;
  showCashbackEarned: (amount: number, description?: string, onClaim?: () => void) => void;
  showFreebieUnlocked: (
    description: string,
    options?: {
      isExpiring?: boolean;
      expiryText?: string;
      icon?: RewardUnlockedData['icon'];
      onClaim?: () => void;
    }
  ) => void;
  dismissPopup: () => void;
  currentPopup: RewardUnlockedData | null;
  popupQueue: RewardUnlockedData[];
}

const generateId = () => `reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

let _dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useRewardPopupStore = create<RewardPopupStoreState>((set, get) => ({
  currentPopup: null,
  popupQueue: [],

  showRewardPopup: (data: Omit<RewardUnlockedData, 'id'>) => {
    const popupData: RewardUnlockedData = {
      ...data,
      id: generateId(),
    };

    const { currentPopup } = get();
    if (!currentPopup) {
      set({ currentPopup: popupData });
    } else {
      set((s) => ({ popupQueue: [...s.popupQueue, popupData] }));
    }
  },

  dismissPopup: () => {
    set({ currentPopup: null });
    if (_dismissTimer) clearTimeout(_dismissTimer);
    _dismissTimer = setTimeout(() => {
      const { popupQueue } = get();
      if (popupQueue.length > 0) {
        const [next, ...rest] = popupQueue;
        set({ currentPopup: next, popupQueue: rest });
      }
    }, 300);
  },

  showCoinsEarned: (amount: number, description?: string, onClaim?: () => void) => {
    get().showRewardPopup({
      type: 'coins',
      title: 'Reward unlocked!',
      description: description || BRAND.COIN_NAME,
      amount,
      icon: 'coin',
      onClaim,
    });
  },

  showCashbackEarned: (amount: number, description?: string, onClaim?: () => void) => {
    get().showRewardPopup({
      type: 'cashback',
      title: 'Cashback earned!',
      description: description || `AED ${amount} added to wallet`,
      amount,
      icon: 'cash',
      onClaim,
    });
  },

  showFreebieUnlocked: (
    description: string,
    options?: {
      isExpiring?: boolean;
      expiryText?: string;
      icon?: RewardUnlockedData['icon'];
      onClaim?: () => void;
    }
  ) => {
    get().showRewardPopup({
      type: 'freebie',
      title: 'Reward unlocked!',
      description,
      isExpiring: options?.isExpiring,
      expiryText: options?.expiryText,
      icon: options?.icon || 'gift',
      onClaim: options?.onClaim,
    });
  },
}));
