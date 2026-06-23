// @ts-nocheck
import { CartItem, LockedProduct, LOCK_CONFIG, getLockStatus } from '@/types/cart';

// Mock cart data matching the screenshot
export const mockProductsData: CartItem[] = [
  {
    id: '1',
    name: 'Classic Cotton Shirt',
    price: 799,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop&crop=center',
    cashback: 'Upto 12% cash back',
    category: 'products'
  },
  {
    id: '2',
    name: 'Shoes',
    price: 799,
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop&crop=center',
    cashback: 'Upto 12% cash back',
    category: 'products'
  },
  {
    id: '3',
    name: 'Gifts',
    price: 799,
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=200&h=200&fit=crop&crop=center',
    cashback: 'Upto 12% cash back',
    category: 'products'
  },
  {
    id: '4',
    name: 'Fruits',
    price: 799,
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&h=200&fit=crop&crop=center',
    cashback: 'Upto 12% cash back',
    category: 'products'
  },
  {
    id: '5',
    name: 'Fruits',
    price: 799,
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop&crop=center',
    cashback: 'Upto 12% cash back',
    category: 'products'
  },
];

export const mockServicesData: CartItem[] = [
  {
    id: 's1',
    name: 'Home Cleaning Service',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop&crop=center',
    cashback: 'Upto 15% cash back',
    category: 'service'
  },
  {
    id: 's2',
    name: 'Plumbing Service',
    price: 999,
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop&crop=center',
    cashback: 'Upto 10% cash back',
    category: 'service'
  },
  {
    id: 's3',
    name: 'Electrical Repair',
    price: 799,
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop&crop=center',
    cashback: 'Upto 12% cash back',
    category: 'service'
  },
];

// Mock locked products data for testing
export const createMockLockedProduct = (
  productId: string, 
  name: string, 
  price: number, 
  image: string, 
  category: 'products' | 'service',
  lockTimeAgo: number = 0 // How many minutes ago was it locked (for testing different states)
): LockedProduct => {
  const now = new Date();
  const lockedAt = new Date(now.getTime() - (lockTimeAgo * 60 * 1000)); // Subtract minutes
  const expiresAt = new Date(lockedAt.getTime() + LOCK_CONFIG.DEFAULT_DURATION);
  const remainingTime = expiresAt.getTime() - now.getTime();
  
  return {
    id: `locked_${productId}_${Date.now()}`,
    productId,
    name,
    price,
    image,
    cashback: category === 'service' ? 'Upto 15% cash back' : 'Upto 12% cash back',
    category,
    lockedAt,
    expiresAt,
    remainingTime: Math.max(0, remainingTime),
    lockDuration: LOCK_CONFIG.DEFAULT_DURATION,
    status: getLockStatus(Math.max(0, remainingTime))
  };
};

export const mockLockedProductsData: LockedProduct[] = [
  // Recently locked (14 minutes remaining - active)
  createMockLockedProduct(
    'prod_001',
    'Premium Leather Jacket',
    2499,
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&h=200&fit=crop&crop=center',
    'products',
    1 // Locked 1 minute ago
  ),
  
  // Mid-time lock (8 minutes remaining - active)
  createMockLockedProduct(
    'prod_002',
    'Designer Sunglasses',
    1299,
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop&crop=center',
    'products',
    7 // Locked 7 minutes ago
  ),
  
  // Expiring soon (1.5 minutes remaining - expiring)
  createMockLockedProduct(
    'serv_001',
    'Personal Training Session',
    1999,
    'https://images.unsplash.com/photo-1571019613914-85f342c6a11e?w=200&h=200&fit=crop&crop=center',
    'service',
    13.5 // Locked 13.5 minutes ago (1.5 min remaining)
  ),
  
  // Critical (30 seconds remaining - expiring)
  createMockLockedProduct(
    'prod_003',
    'Bluetooth Headphones',
    899,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop&crop=center',
    'products',
    14.5 // Locked 14.5 minutes ago (30 sec remaining)
  ),
];

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