// Seed FAQs Script
// Populates MongoDB with sample FAQ data for rez-app

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Define FAQ Schema
const FAQSchema = new mongoose.Schema({
  category: { type: String, required: true },
  subcategory: String,
  question: { type: String, required: true },
  answer: { type: String, required: true },
  shortAnswer: String,
  isActive: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 },
  tags: [String],
  relatedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' }],
  order: { type: Number, default: 0 },
  imageUrl: String,
  videoUrl: String,
  relatedArticles: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

const FAQ = mongoose.model('FAQ', FAQSchema);

// Sample FAQ Data
const faqData = [
  // ORDER CATEGORY
  {
    category: 'order',
    question: 'How do I track my order?',
    answer: 'You can track your order in real-time by going to the "Orders" section in your account. Click on the specific order to see detailed tracking information including current location, estimated delivery time, and delivery status. You will also receive SMS and push notifications with tracking updates.',
    shortAnswer: 'Go to Orders section and click on your order for tracking details.',
    tags: ['tracking', 'order status', 'delivery'],
    order: 1,
    viewCount: 245,
    helpfulCount: 198,
  },
  {
    category: 'order',
    question: 'Can I cancel my order after placing it?',
    answer: 'Yes, you can cancel your order within 30 minutes of placing it for free. After 30 minutes, cancellation may incur charges depending on the order status. If the order has been dispatched, you cannot cancel it, but you can refuse delivery or initiate a return once received. To cancel, go to Orders > Select Order > Cancel Order.',
    shortAnswer: 'Yes, within 30 minutes for free. After that, charges may apply.',
    tags: ['cancel', 'order cancellation', 'refund'],
    order: 2,
    viewCount: 189,
    helpfulCount: 156,
  },
  {
    category: 'order',
    question: 'How long does delivery take?',
    answer: 'Delivery times vary based on your location and the seller. Typically: Same-day delivery for nearby stores (within 5km), 1-3 days for local city delivery, 3-7 days for other cities. Express delivery options are available for select products. You can see estimated delivery date before placing your order.',
    shortAnswer: 'Same-day to 7 days depending on location and product.',
    tags: ['delivery time', 'shipping', 'eta'],
    order: 3,
    viewCount: 312,
    helpfulCount: 287,
  },
  {
    category: 'order',
    question: 'What should I do if I receive a damaged product?',
    answer: 'If you receive a damaged product, please: 1) Take photos/videos of the damaged item and packaging, 2) Do not discard the packaging, 3) Go to Orders > Select Order > Report Issue > Select "Damaged Product", 4) Upload photos and provide details. We will arrange for a replacement or full refund within 24-48 hours. You can also contact our support team for immediate assistance.',
    shortAnswer: 'Take photos and report via Orders > Report Issue > Damaged Product.',
    tags: ['damaged', 'defective', 'replacement', 'quality issue'],
    order: 4,
    viewCount: 98,
    helpfulCount: 89,
  },
  {
    category: 'order',
    question: 'Can I modify my order after placing it?',
    answer: 'You can modify your order (change items, quantity, or delivery address) within 15 minutes of placing it. After 15 minutes, the order is sent to the seller for processing and cannot be modified. To modify, go to Orders > Select Order > Modify Order. If you need to make changes after 15 minutes, please cancel the order and place a new one.',
    shortAnswer: 'Yes, within 15 minutes of placing the order.',
    tags: ['modify order', 'change order', 'edit order'],
    order: 5,
    viewCount: 134,
    helpfulCount: 112,
  },

  // PAYMENT CATEGORY
  {
    category: 'payment',
    question: 'What payment methods are accepted?',
    answer: 'We accept multiple payment methods: Credit/Debit Cards (Visa, Mastercard, Amex, RuPay), UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking from all major banks, Digital Wallets (RezPay, Paytm, PhonePe), Cash on Delivery (COD) for eligible orders, and EMI options for orders above ₹3,000.',
    shortAnswer: 'Cards, UPI, Net Banking, Wallets, COD, and EMI.',
    tags: ['payment methods', 'payment options', 'how to pay'],
    order: 1,
    viewCount: 421,
    helpfulCount: 389,
  },
  {
    category: 'payment',
    question: 'Is it safe to save my card details?',
    answer: 'Yes, absolutely safe! We use industry-standard encryption (PCI DSS compliant) to store your payment information. Your card details are tokenized and encrypted, so we never store your actual card number or CVV. All transactions are processed through secure payment gateways. You can remove saved cards anytime from Account > Payment Methods.',
    shortAnswer: 'Yes, we use bank-grade encryption (PCI DSS compliant).',
    tags: ['security', 'card safety', 'data protection'],
    order: 2,
    viewCount: 267,
    helpfulCount: 245,
  },
  {
    category: 'payment',
    question: 'How do refunds work?',
    answer: 'Refunds are processed automatically to your original payment method within 5-7 business days after approval. For UPI/Wallets: 1-3 days, Credit/Debit Cards: 5-7 days, Net Banking: 5-7 days, COD orders: Refund to RezPay wallet (instant) or bank account (7-10 days). You can track refund status in Orders > Refunds section.',
    shortAnswer: 'Refunds take 1-7 days depending on payment method.',
    tags: ['refund', 'money back', 'return payment'],
    order: 3,
    viewCount: 345,
    helpfulCount: 312,
  },
  {
    category: 'payment',
    question: 'Why was my payment declined?',
    answer: 'Payment can be declined for several reasons: Insufficient funds, Daily transaction limit exceeded, Incorrect card details or OTP, Bank server issues, International cards not enabled for online transactions. Try these solutions: Check bank balance, Use different payment method, Contact your bank, Ensure OTP is entered correctly, Try after some time if bank server is down.',
    shortAnswer: 'Common reasons: insufficient funds, limit exceeded, or bank issues.',
    tags: ['payment failed', 'transaction declined', 'payment error'],
    order: 4,
    viewCount: 178,
    helpfulCount: 134,
  },
  {
    category: 'payment',
    question: 'What is RezPay wallet and how does it work?',
    answer: 'RezPay is our digital wallet that offers instant checkouts, cashback rewards, and exclusive offers. You can: Add money via UPI/Cards/Net Banking, Get instant refunds, Earn cashback on every purchase (up to 5%), Pay bills and recharge, Transfer to bank account (free). Minimum balance: ₹0, Maximum balance: ₹1,00,000. Activate from Account > RezPay.',
    shortAnswer: 'Digital wallet for instant payments, cashback, and fast refunds.',
    tags: ['wallet', 'rezpay', 'cashback', 'digital payment'],
    order: 5,
    viewCount: 456,
    helpfulCount: 401,
  },

  // PRODUCT CATEGORY
  {
    category: 'product',
    question: 'How do I return a product?',
    answer: 'To return a product: 1) Go to Orders > Select Order > Return Item, 2) Select reason for return, 3) Choose refund method (Original payment source or RezPay wallet), 4) Schedule pickup or drop-off, 5) Pack item with original packaging and tags. Return window: 7 days for most products, 3 days for electronics, 15 days for clothing. Product must be unused and in original condition.',
    shortAnswer: 'Go to Orders > Return Item within 7 days (product must be unused).',
    tags: ['return', 'return policy', 'send back'],
    order: 1,
    viewCount: 289,
    helpfulCount: 256,
  },
  {
    category: 'product',
    question: 'Are products covered by warranty?',
    answer: 'Yes! Most products come with manufacturer warranty ranging from 6 months to 2 years depending on the category. Electronics: 1-2 years, Home Appliances: 1-2 years, Fashion/Accessories: 6 months to 1 year. Warranty covers manufacturing defects only. To claim warranty: Go to My Products > Select Product > Warranty > Register Product. Extended warranty available for purchase on select items.',
    shortAnswer: 'Yes, 6 months to 2 years depending on product category.',
    tags: ['warranty', 'guarantee', 'product protection'],
    order: 2,
    viewCount: 201,
    helpfulCount: 187,
  },
  {
    category: 'product',
    question: 'How can I check product authenticity?',
    answer: 'All products sold on Rez are 100% authentic. To verify: 1) Check for "Rez Verified" badge on product page, 2) Scan QR code on packaging to verify manufacturer details, 3) Check product serial number on manufacturer website, 4) Contact brand customer care with invoice. We have zero-tolerance for counterfeit products. Report suspicious products to our fraud team immediately.',
    shortAnswer: 'Look for "Rez Verified" badge and scan QR code on packaging.',
    tags: ['authenticity', 'genuine', 'original', 'fake'],
    order: 3,
    viewCount: 167,
    helpfulCount: 152,
  },
  {
    category: 'product',
    question: 'Can I exchange a product instead of returning it?',
    answer: 'Yes, exchange is available for size/color variants of the same product within 7 days. To exchange: Orders > Select Order > Exchange > Choose new size/color. Available for: Clothing, Footwear, Accessories. Not available for: Electronics, Books, Groceries, Personal care items. If desired variant is unavailable, you can return for refund and place new order.',
    shortAnswer: 'Yes, for same product (different size/color) within 7 days.',
    tags: ['exchange', 'swap', 'size change', 'color change'],
    order: 4,
    viewCount: 145,
    helpfulCount: 128,
  },

  // ACCOUNT CATEGORY
  {
    category: 'account',
    question: 'How do I reset my password?',
    answer: 'To reset your password: 1) Click "Forgot Password" on login screen, 2) Enter registered mobile number or email, 3) Receive OTP via SMS/Email, 4) Enter OTP and create new password, 5) New password must be at least 8 characters with letters, numbers, and special characters. If you don\'t receive OTP, check spam folder or try after 5 minutes.',
    shortAnswer: 'Click "Forgot Password" and follow OTP verification steps.',
    tags: ['password reset', 'forgot password', 'login issue'],
    order: 1,
    viewCount: 312,
    helpfulCount: 289,
  },
  {
    category: 'account',
    question: 'How do I update my profile information?',
    answer: 'To update profile: Go to Account > Edit Profile. You can update: Name, Email, Phone number (requires OTP verification), Date of birth, Gender, Profile photo. Note: Phone number is linked to your account for security. Changing it requires OTP verification on both old and new numbers. Email changes are instant. Keep your profile updated for personalized recommendations.',
    shortAnswer: 'Go to Account > Edit Profile (phone changes need OTP).',
    tags: ['profile', 'update details', 'change information'],
    order: 2,
    viewCount: 198,
    helpfulCount: 176,
  },
  {
    category: 'account',
    question: 'Can I delete my account?',
    answer: 'Yes, you can delete your account permanently. Important: This action is irreversible and will: Delete all personal data, Cancel active orders, Forfeit wallet balance and cashback, Remove saved addresses and payment methods, Delete order history. To delete: Account > Settings > Delete Account > Enter password > Confirm. Wait 30 days (cooling period) before permanent deletion. You can cancel deletion within 30 days.',
    shortAnswer: 'Yes, via Account > Settings > Delete Account (irreversible after 30 days).',
    tags: ['delete account', 'close account', 'deactivate'],
    order: 3,
    viewCount: 89,
    helpfulCount: 67,
  },
  {
    category: 'account',
    question: 'How do I manage my saved addresses?',
    answer: 'To manage addresses: Go to Account > Addresses. You can: Add new address, Edit existing address, Delete address, Set default address, Add delivery instructions (e.g., "Ring doorbell", "Leave with security"). You can save unlimited addresses. Use labels like Home, Office, Mom\'s House for easy identification. Default address is auto-selected during checkout.',
    shortAnswer: 'Go to Account > Addresses to add, edit, or delete addresses.',
    tags: ['address', 'delivery address', 'shipping address'],
    order: 4,
    viewCount: 234,
    helpfulCount: 212,
  },

  // TECHNICAL CATEGORY
  {
    category: 'technical',
    question: 'The app is not working. What should I do?',
    answer: 'Try these troubleshooting steps: 1) Force close the app and reopen, 2) Check internet connection (WiFi/Mobile data), 3) Clear app cache: Settings > Apps > Rez > Clear Cache, 4) Update app to latest version from Play Store/App Store, 5) Restart your phone, 6) Uninstall and reinstall the app (your data is safe in cloud). If issue persists, contact support with: Phone model, OS version, App version, Screenshot of error.',
    shortAnswer: 'Clear app cache, update app, or reinstall. Contact support if issue persists.',
    tags: ['app crash', 'not working', 'technical issue', 'bug'],
    order: 1,
    viewCount: 156,
    helpfulCount: 134,
  },
  {
    category: 'technical',
    question: 'Why am I not receiving OTP?',
    answer: 'OTP delivery issues can occur due to: Network congestion (wait 2-3 minutes), Phone memory full, SMS blocking apps, DND (Do Not Disturb) activated, Incorrect number entered. Solutions: Wait and don\'t request multiple OTPs (15 min cooldown), Check spam/blocked messages, Disable DND temporarily, Ensure correct +91 country code, Try email OTP instead, Contact mobile operator, Use "Resend OTP" after 2 minutes.',
    shortAnswer: 'Wait 2-3 minutes, check spam, disable DND, or try email OTP.',
    tags: ['otp', 'verification code', 'not receiving sms'],
    order: 2,
    viewCount: 203,
    helpfulCount: 178,
  },
  {
    category: 'technical',
    question: 'How do I enable notifications?',
    answer: 'To enable notifications: Android: Settings > Apps > Rez > Notifications > Enable all. iOS: Settings > Rez > Notifications > Allow Notifications. In-app: Account > Notification Settings > Enable categories (Orders, Offers, Delivery, Payments). Notification types: Push (instant), SMS (order updates), Email (receipts, offers). Manage preferences to avoid spam while staying updated on important order info.',
    shortAnswer: 'Phone Settings > Apps > Rez > Notifications > Enable.',
    tags: ['notifications', 'alerts', 'push notifications'],
    order: 3,
    viewCount: 178,
    helpfulCount: 156,
  },

  // DELIVERY CATEGORY
  {
    category: 'delivery',
    question: 'What are the delivery charges?',
    answer: 'Delivery charges vary based on: Order value: FREE for orders ₹499 and above, ₹49 for orders below ₹499. Distance: Local (within 10km) - Free above ₹299, Outstation - ₹99-199 based on distance. Express delivery (same-day/next-day) - Additional ₹99-149. Exact charges shown at checkout. RezPlus members get free delivery on all orders!',
    shortAnswer: 'Free for orders ₹499+, otherwise ₹49-199 based on distance.',
    tags: ['delivery charges', 'shipping cost', 'free delivery'],
    order: 1,
    viewCount: 445,
    helpfulCount: 412,
  },
  {
    category: 'delivery',
    question: 'Can I change my delivery address after ordering?',
    answer: 'Yes, but only before the order is dispatched. To change: Orders > Select Order > Change Address > Select new address. You cannot change address if: Order is out for delivery, Order is dispatched, Same-day delivery order (after 30 mins). If order is already dispatched, you can: Contact delivery partner (number in tracking), Reschedule delivery, Refuse delivery and reorder to new address.',
    shortAnswer: 'Yes, before dispatch. Go to Orders > Change Address.',
    tags: ['change address', 'delivery address', 'wrong address'],
    order: 2,
    viewCount: 267,
    helpfulCount: 234,
  },
  {
    category: 'delivery',
    question: 'What is contactless delivery?',
    answer: 'Contactless delivery ensures safe, no-contact handover of your order. How it works: 1) Delivery partner calls/messages on arrival, 2) You provide OTP verbally or via message, 3) Partner leaves package at your doorstep/gate, 4) Photo proof of delivery sent to you, 5) Partner maintains safe distance. Enable in: Account > Delivery Preferences > Contactless Delivery. Default for all COD and prepaid orders. Mandatory in some areas.',
    shortAnswer: 'No-contact delivery with OTP verification and photo proof.',
    tags: ['contactless', 'safe delivery', 'no contact'],
    order: 3,
    viewCount: 189,
    helpfulCount: 172,
  },

  // REFUND CATEGORY
  {
    category: 'refund',
    question: 'How long does it take to receive my refund?',
    answer: 'Refund timelines after approval: UPI/Wallet: 1-3 business days (instant in most cases), Credit/Debit Card: 5-7 business days, Net Banking: 5-7 business days, COD orders: 7-10 business days to bank account or instant to RezPay wallet. Refund initiation: 24-48 hours after product pickup/quality check. You will receive SMS/Email confirmation when refund is processed. Check status: Orders > Refunds.',
    shortAnswer: '1-10 days depending on payment method (UPI fastest, Bank slowest).',
    tags: ['refund time', 'money back time', 'when refund'],
    order: 1,
    viewCount: 398,
    helpfulCount: 367,
  },
  {
    category: 'refund',
    question: 'Will I get refund for delivery charges?',
    answer: 'Yes, delivery charges are refunded in these cases: 1) Product is defective/damaged/wrong item received, 2) Order not delivered and returned, 3) Order cancelled before dispatch. No refund for delivery charges if: You cancel after dispatch, Return due to change of mind, Size/color mismatch (customer error). Delivery charges are shown separately in refund breakdown. Processing time same as product refund.',
    shortAnswer: 'Yes, for defective/wrong products. No, for customer cancellations.',
    tags: ['delivery refund', 'shipping refund', 'charges refund'],
    order: 2,
    viewCount: 156,
    helpfulCount: 132,
  },
  {
    category: 'refund',
    question: 'Can I get instant refund?',
    answer: 'Yes! Instant refunds available for: RezPay wallet refunds (instant credit), UPI payments (1-3 hours in most cases), Specific bank cards (participating banks only). For instant refund eligibility: Complete profile KYC, Use RezPay wallet, Order value below ₹15,000, Account in good standing (no fraud flags). Regular refunds follow standard timeline. Instant refund option shown at checkout if eligible.',
    shortAnswer: 'Yes, for RezPay wallet (instant) and select UPI/cards (1-3 hours).',
    tags: ['instant refund', 'quick refund', 'fast refund'],
    order: 3,
    viewCount: 234,
    helpfulCount: 198,
  },

  // OTHER/GENERAL CATEGORY
  {
    category: 'other',
    question: 'How do I contact customer support?',
    answer: 'Multiple ways to reach us: Live Chat (fastest): Account > Help > Chat Now (9 AM - 9 PM daily), Phone: 1800-123-4567 (toll-free, 24/7), Email: support@rezapp.com (response within 24 hours), Support ticket: Account > Help > Create Ticket. For urgent issues: Use live chat or phone. For order-specific: Go to Orders > Select Order > Get Help. Average response time: Chat - 2 mins, Phone - 5 mins, Email - 12 hours.',
    shortAnswer: 'Live Chat (9AM-9PM), Phone: 1800-123-4567 (24/7), Email: support@rezapp.com',
    tags: ['contact', 'customer service', 'support', 'help'],
    order: 1,
    viewCount: 567,
    helpfulCount: 523,
  },
  {
    category: 'other',
    question: 'Do you have a loyalty program?',
    answer: 'Yes! RezPlus is our premium membership program. Benefits: Free delivery on all orders, Exclusive deals and early access to sales, Extra 5% cashback on all purchases, Priority customer support, No minimum order value, Birthday special offers, Extended return window (10 days vs 7 days). Cost: ₹499/year or ₹99/month. Free 1-month trial for new users. Join from: Account > RezPlus Membership.',
    shortAnswer: 'Yes, RezPlus membership: ₹499/year with free delivery and extra cashback.',
    tags: ['membership', 'loyalty', 'rezplus', 'premium'],
    order: 2,
    viewCount: 389,
    helpfulCount: 356,
  },
  {
    category: 'other',
    question: 'How do I apply a coupon code?',
    answer: 'To apply coupon: 1) Add items to cart, 2) Go to Cart > Proceed to Checkout, 3) In "Apply Coupon" section, enter code or select from available coupons, 4) Click Apply, 5) Discount will be shown in price breakdown. Coupon rules: One coupon per order, Cannot combine with other offers (unless specified), Check minimum order value, Check expiry date. Available coupons shown automatically. Invalid coupon? Check terms and conditions.',
    shortAnswer: 'Enter code at checkout in "Apply Coupon" section.',
    tags: ['coupon', 'discount code', 'promo code', 'offer'],
    order: 3,
    viewCount: 512,
    helpfulCount: 478,
  },
  {
    category: 'other',
    question: 'Is my data safe with Rez?',
    answer: 'Absolutely! We take data privacy seriously: Encryption: All data encrypted with AES-256, Secure servers: ISO 27001 certified data centers in India, Payment security: PCI DSS compliant, No data sharing: We never sell your data to third parties, GDPR compliant: Right to access, modify, delete your data, Regular audits: Third-party security audits quarterly. Read our Privacy Policy for details. Control your data: Account > Privacy Settings.',
    shortAnswer: 'Yes, AES-256 encryption, ISO 27001 certified, GDPR compliant, no data selling.',
    tags: ['privacy', 'security', 'data protection', 'safe'],
    order: 4,
    viewCount: 234,
    helpfulCount: 218,
  },
  {
    category: 'other',
    question: 'How do I earn Rez Coins?',
    answer: 'Rez Coins are loyalty points you can use for discounts. Earn coins by: Place orders (1 coin per ₹100 spent), Write product reviews (50 coins per review), Refer friends (200 coins per referral), Complete profile (100 coins one-time), Daily login streak (10 coins/day), Birthday month (500 bonus coins). Use coins: 100 coins = ₹10 discount, Minimum 500 coins to redeem, Maximum 50% of order value. Check balance: Account > Rez Coins.',
    shortAnswer: 'Earn by shopping, reviews, referrals. 100 coins = ₹10 discount.',
    tags: ['coins', 'rewards', 'loyalty points', 'cashback'],
    order: 5,
    viewCount: 423,
    helpfulCount: 389,
  },
];

async function seedFAQs() {
  try {
    console.log('\n🌱 Starting FAQ Seeding Process...');
    console.log('━'.repeat(60));

    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected successfully!\n');

    // Check if FAQs already exist
    const existingCount = await FAQ.countDocuments();
    console.log(`📊 Existing FAQs in database: ${existingCount}`);

    if (existingCount > 0) {
      console.log('\n⚠️  Warning: FAQs already exist in database!');
      console.log('   Options:');
      console.log('   1. Delete existing and insert new (y)');
      console.log('   2. Keep existing and add new (n)');
      console.log('   3. Cancel (any other key)\n');

      // For now, let's clear and insert fresh
      console.log('🗑️  Clearing existing FAQs...');
      await FAQ.deleteMany({});
      console.log('✅ Cleared!\n');
    }

    console.log('📝 Inserting FAQ data...');
    console.log(`   Total FAQs to insert: ${faqData.length}\n`);

    // Create a dummy user ID for createdBy (you can replace with actual admin user ID)
    const dummyUserId = new mongoose.Types.ObjectId();

    // Add createdBy to all FAQs
    const faqsWithUser = faqData.map(faq => ({
      ...faq,
      createdBy: dummyUserId,
      lastUpdatedBy: dummyUserId,
    }));

    // Insert FAQs
    const insertedFAQs = await FAQ.insertMany(faqsWithUser);
    console.log(`✅ Successfully inserted ${insertedFAQs.length} FAQs!\n`);

    // Show summary
    const byCategory = insertedFAQs.reduce((acc: any, faq) => {
      acc[faq.category] = (acc[faq.category] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 FAQs by Category:');
    console.log('━'.repeat(60));
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`   ${cat.toUpperCase().padEnd(15)} : ${count} FAQs`);
    });

    console.log('\n' + '━'.repeat(60));
    console.log('✅ FAQ Seeding Complete!');
    console.log('━'.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Open the FAQ page in your app');
    console.log('   3. FAQs should now be visible!\n');

  } catch (error) {
    console.error('\n❌ Error seeding FAQs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run the script
seedFAQs();
