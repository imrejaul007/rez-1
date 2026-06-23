import { logger } from './logger';

/**
 * Razorpay Payment Gateway Configuration
 * 
 * To get your keys:
 * 1. Sign up at https://razorpay.com
 * 2. Go to Dashboard → Settings → API Keys
 * 3. Generate Test Keys (for development)
 * 4. Generate Live Keys (for production)
 * 
 * Add to your .env file:
 * RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
 * RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx
 */

export const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('RAZORPAY_KEY_ID is required in production'); })()
    : 'rzp_test_dummy_key') as string,
  keySecret: process.env.RAZORPAY_KEY_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('RAZORPAY_KEY_SECRET is required in production'); })()
    : 'dummy_secret') as string,
  
  // Currency
  currency: 'INR',
  
  // Receipt prefix for order tracking
  receiptPrefix: 'order_rcpt_',
  
  // Payment methods to enable
  enabledPaymentMethods: {
    card: true,
    netbanking: true,
    upi: true,
    wallet: true,
    emi: false, // Disable EMI for now
  },
  
  // Checkout options
  checkout: {
    name: 'REZ App',
    description: 'Order Payment',
    image: 'https://your-app-logo-url.com/logo.png', // Replace with actual logo
    theme: {
      color: '#8B5CF6', // Purple theme
    },
  },
  
  // Test mode flag
  isTestMode: process.env.NODE_ENV !== 'production',
};

// Helper to validate Razorpay configuration
export function validateRazorpayConfig(): boolean {
  const { keyId, keySecret } = razorpayConfig;
  
  if (!keyId || keyId === 'rzp_test_dummy_key') {
    logger.warn('⚠️  [RAZORPAY] Key ID not configured. Add RAZORPAY_KEY_ID to .env');
    return false;
  }
  
  if (!keySecret || keySecret === 'dummy_secret') {
    logger.warn('⚠️  [RAZORPAY] Key Secret not configured. Add RAZORPAY_KEY_SECRET to .env');
    return false;
  }
  
  logger.info('✅ [RAZORPAY] Configuration validated');
  logger.info(`🔧 [RAZORPAY] Mode: ${razorpayConfig.isTestMode ? 'TEST' : 'PRODUCTION'}`);
  
  return true;
}

