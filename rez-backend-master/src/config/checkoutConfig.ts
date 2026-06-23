// Checkout Configuration
// Centralized config for checkout-related values
// Update these values to change pricing/fee structure globally

export const CHECKOUT_CONFIG = {
  // Platform Fees (fixed fee - legacy)
  platformFee: parseFloat(process.env.PLATFORM_FEE || '2'),

  // Merchant Fee Configuration (configurable via env vars, no redeploy needed)
  merchantFee: {
    percentage: parseFloat(process.env.MERCHANT_FEE_PERCENTAGE || '0.15'),
    minFee: parseFloat(process.env.MERCHANT_FEE_MIN || '2'),
    maxFee: parseFloat(process.env.MERCHANT_FEE_MAX || '10000'),
  },

  // Tax Rates (configurable via env var)
  taxRate: parseFloat(process.env.TAX_RATE || '0.05'),

  // Coin System Limits
  coins: {
    rezCoin: {
      conversionRate: 1, // 1 coin = 1 rupee
      maxUsagePercentage: 100, // Can use up to 100% of order value
    },
    promoCoin: {
      conversionRate: 1,
      maxUsagePercentage: 20, // Can use up to 20% of order value
    },
    storePromoCoin: {
      conversionRate: 1,
      maxUsagePercentage: 30, // Can use up to 30% of order value
    },
  },

  // Cashback Rates (based on tier)
  cashback: {
    default: 0.10, // 10% cashback
    bronze: 0.08,
    silver: 0.10,
    gold: 0.12,
    platinum: 0.15,
  },

  // Delivery
  delivery: {
    freeDeliveryThreshold: 500, // Free delivery above ₹500
    defaultDeliveryFee: 40,
  },

  // Order Limits
  order: {
    minOrderValue: 0,
    maxItemsPerOrder: 50,
  },
};

export default CHECKOUT_CONFIG;
