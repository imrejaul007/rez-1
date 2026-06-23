// Wallet System Mock Data
// Dummy data for wallet balance, transactions, and payment information

import { BRAND } from '@/constants/brand';
import {
  WalletBalance,
  Transaction,
  WalletTab,
  TransactionSummary,
  MonthlySpending,
  DEFAULT_WALLET_TABS,
  TransactionType,
  TransactionStatus,
  TransactionCategory 
} from '@/types/wallet.types';

// Mock Wallet Balance
export const mockWalletBalance: WalletBalance = {
  totalCoins: 382,
  availableCoins: 350,
  pendingCoins: 32,
  currency: BRAND.CURRENCY_CODE,
  lastUpdated: '2025-08-19T12:00:00Z',
};

// Mock Transactions (as shown in screenshot 2)
export const mockTransactions: Transaction[] = [
  {
    id: 'txn_001',
    type: 'PAYMENT',
    status: 'SUCCESS',
    amount: 2075,
    currency: BRAND.CURRENCY_CODE,
    title: 'Payment Success',
    description: 'Purchase from Myntra Fashion Store',
    date: '2025-08-19T10:30:00Z',
    timestamp: Date.now() - 86400000, // 1 day ago
    merchantName: 'Myntra',
    merchantLogo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=50&h=50&fit=crop',
    orderId: 'MYN_ORD_12345',
    paymentMethod: 'NUQTA_COIN',
    category: 'HOME_DELIVERY',
    metadata: {
      items: ['Casual T-Shirt', 'Denim Jeans'],
      deliveryAddress: '123 Main St, City',
      deliveryTime: '2-3 business days',
    },
  },
  {
    id: 'txn_002',
    type: 'PAYMENT',
    status: 'SUCCESS',
    amount: 2075,
    currency: BRAND.CURRENCY_CODE,
    title: 'Payment Success',
    description: 'Online shopping - Electronics',
    date: '2025-08-18T14:15:00Z',
    timestamp: Date.now() - 172800000, // 2 days ago
    merchantName: 'Myntra',
    merchantLogo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=50&h=50&fit=crop',
    orderId: 'MYN_ORD_12346',
    paymentMethod: 'NUQTA_COIN',
    category: 'HOME_DELIVERY',
    metadata: {
      items: ['Wireless Headphones', 'Phone Case'],
    },
  },
  {
    id: 'txn_003',
    type: 'PAYMENT',
    status: 'SUCCESS',
    amount: 2075,
    currency: BRAND.CURRENCY_CODE,
    title: 'Payment Success',
    description: 'Grocery delivery order',
    date: '2025-08-17T16:45:00Z',
    timestamp: Date.now() - 259200000, // 3 days ago
    merchantName: 'Myntra',
    merchantLogo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=50&h=50&fit=crop',
    orderId: 'MYN_ORD_12347',
    paymentMethod: 'NUQTA_COIN',
    category: 'HOME_DELIVERY',
    metadata: {
      items: ['Fresh Vegetables', 'Dairy Products', 'Snacks'],
      deliveryTime: 'Same day delivery',
    },
  },
  {
    id: 'txn_004',
    type: 'CASHBACK',
    status: 'SUCCESS',
    amount: 125,
    currency: BRAND.CURRENCY_CODE,
    title: 'Cashback Received',
    description: 'Cashback from recent purchase',
    date: '2025-08-16T11:20:00Z',
    timestamp: Date.now() - 345600000, // 4 days ago
    merchantName: `${BRAND.PAY_NAME}`,
    merchantLogo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=50&h=50&fit=crop',
    paymentMethod: 'NUQTA_COIN',
    category: 'NUQTA_PAY',
    metadata: {
      originalTransaction: 'txn_001',
      cashbackRate: '6%',
    },
  },
  {
    id: 'txn_005',
    type: 'PAYMENT',
    status: 'SUCCESS',
    amount: 850,
    currency: BRAND.CURRENCY_CODE,
    title: 'Voucher Purchase',
    description: 'Movie voucher for 2 tickets',
    date: '2025-08-15T19:30:00Z',
    timestamp: Date.now() - 432000000, // 5 days ago
    merchantName: 'CineMax',
    merchantLogo: 'https://images.unsplash.com/photo-1489599317328-1e39089ba640?w=50&h=50&fit=crop',
    orderId: 'CIN_VCH_7890',
    paymentMethod: 'NUQTA_COIN',
    category: 'VOUCHER',
    metadata: {
      voucherType: 'Movie Tickets',
      validUntil: '2025-12-31',
      cinemaLocation: 'Mall Plaza Cinema',
    },
  },
  {
    id: 'txn_006',
    type: 'PAYMENT',
    status: 'PENDING',
    amount: 1200,
    currency: BRAND.CURRENCY_CODE,
    title: 'Payment Processing',
    description: 'Restaurant order - pending confirmation',
    date: '2025-08-19T18:45:00Z',
    timestamp: Date.now() - 3600000, // 1 hour ago
    merchantName: 'Tasty Bites',
    merchantLogo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=50&h=50&fit=crop',
    orderId: 'TB_ORD_5678',
    paymentMethod: 'NUQTA_COIN',
    category: 'HOME_DELIVERY',
    metadata: {
      items: ['Pizza Margherita', 'Garlic Bread', 'Coke'],
      estimatedDelivery: '45-60 minutes',
    },
  },
];

// Wallet Tabs with counts
export const walletTabs: WalletTab[] = [
  { id: 'ALL', title: 'All', isActive: true, count: mockTransactions.length },
  { 
    id: 'HOME_DELIVERY', 
    title: 'Home Delivery', 
    isActive: false, 
    count: mockTransactions.filter(t => t.category === 'HOME_DELIVERY').length 
  },
  { 
    id: 'VOUCHER', 
    title: 'Voucher', 
    isActive: false, 
    count: mockTransactions.filter(t => t.category === 'VOUCHER').length 
  },
  {
    id: 'NUQTA_PAY',
    title: BRAND.PAY_NAME,
    isActive: false,
    count: mockTransactions.filter(t => t.category === 'NUQTA_PAY').length
  },
];

// Transaction Summary
export const mockTransactionSummary: TransactionSummary = {
  totalSpent: 8225,
  totalEarned: 580,
  totalTransactions: mockTransactions.length,
  categorySummary: {
    ALL: 8225,
    HOME_DELIVERY: 6350,
    VOUCHER: 850,
    NUQTA_PAY: 125,
    RESTAURANT: 900,
    GROCERY: 0,
    SHOPPING: 0,
    ENTERTAINMENT: 0,
  },
  monthlySpending: [
    { month: 'August', year: 2025, amount: 4200, transactionCount: 6 },
    { month: 'July', year: 2025, amount: 2800, transactionCount: 8 },
    { month: 'June', year: 2025, amount: 1225, transactionCount: 4 },
  ],
};

// Recent Transactions for Quick View
export const recentTransactions = mockTransactions.slice(0, 3);

// Payment Methods
export const savedPaymentMethods = [
  {
    id: 'pm_001',
    type: 'NUQTA_COIN',
    title: `${BRAND.COIN_SINGLE} Wallet`,
    subtitle: `${mockWalletBalance.availableCoins} ${BRAND.CURRENCY_CODE} available`,
    icon: 'wallet',
    isDefault: true,
    isEnabled: true,
  },
  {
    id: 'pm_002',
    type: 'CREDIT_CARD',
    title: 'Visa **** 4242',
    subtitle: 'Expires 12/26',
    icon: 'card',
    isDefault: false,
    isEnabled: true,
  },
  {
    id: 'pm_003',
    type: 'UPI',
    title: 'UPI - sarah@okaxis',
    subtitle: 'Linked to Axis Bank',
    icon: 'phone-portrait',
    isDefault: false,
    isEnabled: true,
  },
];

// Transaction Statistics for Charts
export const transactionStats = {
  dailySpending: [
    { date: '2025-08-14', amount: 450 },
    { date: '2025-08-15', amount: 850 },
    { date: '2025-08-16', amount: 0 },
    { date: '2025-08-17', amount: 2075 },
    { date: '2025-08-18', amount: 2075 },
    { date: '2025-08-19', amount: 3275 },
  ],
  categoryBreakdown: [
    { category: 'HOME_DELIVERY', amount: 6350, percentage: 77 },
    { category: 'VOUCHER', amount: 850, percentage: 10 },
    { category: 'RESTAURANT', amount: 900, percentage: 11 },
    { category: 'NUQTA_PAY', amount: 125, percentage: 2 },
  ],
};

// API Mock Functions
export const fetchWalletBalance = async (): Promise<WalletBalance> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockWalletBalance;
};

export const fetchTransactions = async (
  category: TransactionCategory = 'ALL',
  page: number = 1,
  limit: number = 20
): Promise<{
  transactions: Transaction[];
  hasMore: boolean;
  total: number;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  let filteredTransactions = mockTransactions;
  
  if (category !== 'ALL') {
    filteredTransactions = mockTransactions.filter(t => t.category === category);
  }
  
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedTransactions = filteredTransactions.slice(start, end);
  
  return {
    transactions: paginatedTransactions,
    hasMore: end < filteredTransactions.length,
    total: filteredTransactions.length,
  };
};

export const fetchTransactionDetails = async (transactionId: string): Promise<Transaction | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockTransactions.find(t => t.id === transactionId) || null;
};

export const createTransaction = async (transactionData: any): Promise<Transaction> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const newTransaction: Transaction = {
    id: `txn_${Date.now()}`,
    type: transactionData.type || 'PAYMENT',
    status: 'SUCCESS',
    amount: transactionData.amount,
    currency: BRAND.CURRENCY_CODE,
    title: transactionData.title,
    description: transactionData.description,
    date: new Date().toISOString(),
    timestamp: Date.now(),
    merchantName: transactionData.merchantName,
    paymentMethod: 'NUQTA_COIN',
    category: transactionData.category || 'ALL',
    metadata: transactionData.metadata || {},
  };
  
  return newTransaction;
};

export const refundTransaction = async (transactionId: string, reason: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 1200));
  // In real app, this would initiate a refund process
  // Refund initiated for transaction
};

// Helper Functions
export const formatCurrency = (amount: number | null | undefined, currency: string = 'WC'): string => {
  // Validate amount
  if (amount == null || typeof amount !== 'number' || isNaN(amount)) {
    return currency === BRAND.CURRENCY_CODE || currency === 'RC' ? `0 ${BRAND.CURRENCY_CODE}` : '₹0.00';
  }

  if (currency === BRAND.CURRENCY_CODE || currency === 'RC') {
    return `${amount} ${BRAND.CURRENCY_CODE}`;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    // Fallback for invalid currency
    return `₹${amount.toFixed(2)}`;
  }
};

export const getTransactionIcon = (type: TransactionType): string => {
  const iconMap = {
    PAYMENT: 'arrow-up-circle',
    REFUND: 'arrow-down-circle',
    CASHBACK: 'gift',
    REWARD: 'trophy',
    TRANSFER: 'swap-horizontal',
    TOPUP: 'add-circle',
    WITHDRAWAL: 'remove-circle',
  };
  
  return iconMap[type] || 'help-circle';
};

export const getStatusColor = (status: TransactionStatus): string => {
  const colorMap = {
    SUCCESS: '#ffcd57',
    PENDING: '#F59E0B',
    FAILED: '#EF4444',
    CANCELLED: '#6B7280',
    PROCESSING: '#3B82F6',
    REFUNDED: '#8B5CF6',
  };
  
  return colorMap[status] || '#6B7280';
};

export const formatTransactionDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'Unknown date';
  }

  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
};