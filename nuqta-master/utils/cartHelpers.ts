import { CartItem, LockedProduct, getLockStatus, LOCK_CONFIG } from '@/types/cart';

// Helper function to calculate total price
export const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.price, 0);
};

// Helper function to get item count
export const getItemCount = (items: CartItem[]): number => {
  return items.length;
};

// Locked Products Utility Functions
export const calculateLockedTotal = (items: LockedProduct[]): number => {
  return items.reduce((total, item) => {
    // For paid locks, subtract the lock fee since it's already paid
    const lockFee = item.isPaidLock && item.lockFee ? item.lockFee : 0;
    return total + (item.price - lockFee);
  }, 0);
};

export const getLockedItemCount = (items: LockedProduct[]): number => {
  return items.length;
};

export const updateLockedProductTimers = (items: LockedProduct[]): LockedProduct[] => {
  const now = new Date();
  return items.map(item => {
    const remainingTime = Math.max(0, item.expiresAt.getTime() - now.getTime());
    return {
      ...item,
      remainingTime,
      status: getLockStatus(remainingTime)
    };
  }).filter(item => item.remainingTime > 0); // Remove expired items
};

export const formatRemainingTime = (remainingTime: number): string => {
  if (remainingTime <= 0) return "Expired";

  const minutes = Math.floor(remainingTime / (60 * 1000));
  const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `0:${seconds.toString().padStart(2, '0')}`;
  }
};

export const createLockedProductFromCartItem = (
  item: CartItem,
  productId?: string
): LockedProduct => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_CONFIG.DEFAULT_DURATION);

  return {
    id: `locked_${item.id}_${Date.now()}`,
    productId: productId || item.id,
    name: item.name,
    price: item.price,
    image: item.image,
    cashback: item.cashback,
    category: item.category,
    lockedAt: now,
    expiresAt,
    remainingTime: LOCK_CONFIG.DEFAULT_DURATION,
    lockDuration: LOCK_CONFIG.DEFAULT_DURATION,
    status: 'active'
  };
};
