/**
 * Seed script for new collections: RechargeOperator, BillProvider, InsurancePlan, GoldPrice
 * Usage: npx ts-node scripts/seedNewCollections.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import RechargeOperator from '../src/models/RechargeOperator';
import { BillProvider } from '../src/models/BillProvider';
import InsurancePlan from '../src/models/InsurancePlan';
import { GoldPrice } from '../src/models/GoldSavings';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// ============================================
// RECHARGE OPERATORS
// ============================================
const rechargeOperators = [
  {
    name: 'Jio',
    code: 'jio',
    type: 'mobile',
    logo: '',
    color: '#0A2885',
    plans: [
      { name: 'Jio Popular', amount: 239, validity: '28 days', data: '1.5 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 2, popular: true },
      { name: 'Jio Value', amount: 299, validity: '28 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 3, popular: true },
      { name: 'Jio Max', amount: 449, validity: '56 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 2, popular: false },
      { name: 'Jio Annual', amount: 2999, validity: '365 days', data: '2.5 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 5, popular: true },
      { name: 'Jio Data Pack', amount: 61, validity: '30 days', data: '6 GB total', calls: 'N/A', sms: 'N/A', cashbackPercent: 1, popular: false },
    ],
  },
  {
    name: 'Airtel',
    code: 'airtel',
    type: 'mobile',
    logo: '',
    color: '#ED1C24',
    plans: [
      { name: 'Airtel Smart', amount: 239, validity: '28 days', data: '1.5 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 2, popular: true },
      { name: 'Airtel Unlimited', amount: 299, validity: '28 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 3, popular: true },
      { name: 'Airtel Super', amount: 479, validity: '56 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 2, popular: false },
      { name: 'Airtel Annual', amount: 3359, validity: '365 days', data: '2.5 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 5, popular: true },
      { name: 'Airtel Data Booster', amount: 48, validity: '28 days', data: '3 GB total', calls: 'N/A', sms: 'N/A', cashbackPercent: 1, popular: false },
    ],
  },
  {
    name: 'Vi (Vodafone Idea)',
    code: 'vi',
    type: 'mobile',
    logo: '',
    color: '#E60000',
    plans: [
      { name: 'Vi Smart', amount: 219, validity: '28 days', data: '1 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 2, popular: true },
      { name: 'Vi Max', amount: 299, validity: '28 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 3, popular: true },
      { name: 'Vi Long Term', amount: 449, validity: '56 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 2, popular: false },
      { name: 'Vi Data Only', amount: 55, validity: '28 days', data: '4 GB total', calls: 'N/A', sms: 'N/A', cashbackPercent: 1, popular: false },
    ],
  },
  {
    name: 'BSNL',
    code: 'bsnl',
    type: 'mobile',
    logo: '',
    color: '#00539F',
    plans: [
      { name: 'BSNL Value', amount: 197, validity: '28 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 2, popular: true },
      { name: 'BSNL Marutham', amount: 319, validity: '84 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 3, popular: true },
      { name: 'BSNL Annual', amount: 1999, validity: '365 days', data: '2 GB/day', calls: 'Unlimited', sms: '100/day', cashbackPercent: 5, popular: false },
    ],
  },
  {
    name: 'Tata Play',
    code: 'tataplay',
    type: 'dth',
    logo: '',
    color: '#1A1A1A',
    plans: [
      { name: 'Tata Play Basic', amount: 199, validity: '30 days', data: '150+ channels', calls: 'N/A', sms: 'N/A', cashbackPercent: 2, popular: true },
      { name: 'Tata Play Standard', amount: 349, validity: '30 days', data: '250+ channels', calls: 'N/A', sms: 'N/A', cashbackPercent: 3, popular: true },
      { name: 'Tata Play Premium', amount: 599, validity: '30 days', data: '400+ channels + OTT', calls: 'N/A', sms: 'N/A', cashbackPercent: 4, popular: false },
    ],
  },
  {
    name: 'Airtel Xstream',
    code: 'airtel-dth',
    type: 'dth',
    logo: '',
    color: '#ED1C24',
    plans: [
      { name: 'Xstream Basic', amount: 225, validity: '30 days', data: '200+ channels', calls: 'N/A', sms: 'N/A', cashbackPercent: 2, popular: true },
      { name: 'Xstream Premium', amount: 453, validity: '30 days', data: '300+ channels + OTT', calls: 'N/A', sms: 'N/A', cashbackPercent: 3, popular: true },
    ],
  },
  {
    name: 'Jio Fiber',
    code: 'jiofiber',
    type: 'broadband',
    logo: '',
    color: '#0A2885',
    plans: [
      { name: 'Jio Fiber 30Mbps', amount: 399, validity: '30 days', data: 'Unlimited (30 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 3, popular: true },
      { name: 'Jio Fiber 100Mbps', amount: 699, validity: '30 days', data: 'Unlimited (100 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 4, popular: true },
      { name: 'Jio Fiber 300Mbps', amount: 999, validity: '30 days', data: 'Unlimited (300 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 5, popular: false },
      { name: 'Jio Fiber 1Gbps', amount: 1499, validity: '30 days', data: 'Unlimited (1 Gbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 5, popular: false },
    ],
  },
  {
    name: 'Airtel Xstream Fiber',
    code: 'airtel-fiber',
    type: 'broadband',
    logo: '',
    color: '#ED1C24',
    plans: [
      { name: 'Airtel 40Mbps', amount: 499, validity: '30 days', data: 'Unlimited (40 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 3, popular: true },
      { name: 'Airtel 100Mbps', amount: 799, validity: '30 days', data: 'Unlimited (100 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 4, popular: true },
      { name: 'Airtel 300Mbps', amount: 1099, validity: '30 days', data: 'Unlimited (300 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 5, popular: false },
    ],
  },
];

// ============================================
// BILL PROVIDERS
// ============================================
const billProviders = [
  // Electricity
  {
    name: 'Adani Electricity Mumbai',
    code: 'adani-elec-mum',
    type: 'electricity',
    logo: '',
    region: 'Mumbai',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Consumer Number', placeholder: 'Enter 10-digit consumer number', type: 'text' },
    ],
    cashbackPercent: 1,
  },
  {
    name: 'BESCOM (Bangalore)',
    code: 'bescom',
    type: 'electricity',
    logo: '',
    region: 'Bangalore',
    requiredFields: [
      { fieldName: 'accountId', label: 'Account ID', placeholder: 'Enter BESCOM account ID', type: 'text' },
    ],
    cashbackPercent: 1,
  },
  {
    name: 'Tata Power',
    code: 'tata-power',
    type: 'electricity',
    logo: '',
    region: 'Mumbai',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Customer Account Number', placeholder: 'Enter customer account number', type: 'text' },
    ],
    cashbackPercent: 1.5,
  },
  {
    name: 'BSES Rajdhani (Delhi)',
    code: 'bses-rajdhani',
    type: 'electricity',
    logo: '',
    region: 'Delhi',
    requiredFields: [
      { fieldName: 'caNumber', label: 'CA Number', placeholder: 'Enter CA number', type: 'text' },
    ],
    cashbackPercent: 1,
  },
  // Water
  {
    name: 'Delhi Jal Board',
    code: 'djb',
    type: 'water',
    logo: '',
    region: 'Delhi',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Consumer Number', placeholder: 'Enter K number', type: 'text' },
    ],
    cashbackPercent: 0.5,
  },
  {
    name: 'BWSSB (Bangalore Water)',
    code: 'bwssb',
    type: 'water',
    logo: '',
    region: 'Bangalore',
    requiredFields: [
      { fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter RR number', type: 'text' },
    ],
    cashbackPercent: 0.5,
  },
  // Gas
  {
    name: 'Mahanagar Gas',
    code: 'mahanagar-gas',
    type: 'gas',
    logo: '',
    region: 'Mumbai',
    requiredFields: [
      { fieldName: 'bpNumber', label: 'BP Number', placeholder: 'Enter 10-digit BP number', type: 'number' },
    ],
    cashbackPercent: 1,
  },
  {
    name: 'Indraprastha Gas (IGL)',
    code: 'igl',
    type: 'gas',
    logo: '',
    region: 'Delhi',
    requiredFields: [
      { fieldName: 'bpNumber', label: 'BP Number', placeholder: 'Enter BP number', type: 'number' },
    ],
    cashbackPercent: 1,
  },
  // Internet
  {
    name: 'ACT Fibernet',
    code: 'act-fibernet',
    type: 'internet',
    logo: '',
    region: 'Pan India',
    requiredFields: [
      { fieldName: 'customerId', label: 'Customer ID', placeholder: 'Enter ACT customer ID', type: 'text' },
    ],
    cashbackPercent: 2,
  },
  {
    name: 'Hathway Broadband',
    code: 'hathway',
    type: 'internet',
    logo: '',
    region: 'Pan India',
    requiredFields: [
      { fieldName: 'subscriberId', label: 'Subscriber ID', placeholder: 'Enter subscriber ID', type: 'text' },
    ],
    cashbackPercent: 1.5,
  },
  // Mobile Postpaid
  {
    name: 'Airtel Postpaid',
    code: 'airtel-postpaid',
    type: 'mobile_postpaid',
    logo: '',
    region: 'Pan India',
    requiredFields: [
      { fieldName: 'mobileNumber', label: 'Mobile Number', placeholder: 'Enter 10-digit mobile number', type: 'number' },
    ],
    cashbackPercent: 1,
  },
  {
    name: 'Jio Postpaid',
    code: 'jio-postpaid',
    type: 'mobile_postpaid',
    logo: '',
    region: 'Pan India',
    requiredFields: [
      { fieldName: 'mobileNumber', label: 'Mobile Number', placeholder: 'Enter 10-digit mobile number', type: 'number' },
    ],
    cashbackPercent: 1,
  },
  // Broadband
  {
    name: 'BSNL Broadband',
    code: 'bsnl-broadband',
    type: 'broadband',
    logo: '',
    region: 'Pan India',
    requiredFields: [
      { fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter landline/account number', type: 'text' },
    ],
    cashbackPercent: 1,
  },
  // DTH
  {
    name: 'Dish TV',
    code: 'dishtv',
    type: 'dth',
    logo: '',
    region: 'Pan India',
    requiredFields: [
      { fieldName: 'subscriberId', label: 'Subscriber ID', placeholder: 'Enter viewing card number', type: 'number' },
    ],
    cashbackPercent: 1.5,
  },
  // Landline
  {
    name: 'MTNL Delhi',
    code: 'mtnl-delhi',
    type: 'landline',
    logo: '',
    region: 'Delhi',
    requiredFields: [
      { fieldName: 'telephoneNumber', label: 'Telephone Number', placeholder: 'Enter landline number', type: 'number' },
    ],
    cashbackPercent: 0.5,
  },
  {
    name: 'BSNL Landline',
    code: 'bsnl-landline',
    type: 'landline',
    logo: '',
    region: 'Pan India',
    requiredFields: [
      { fieldName: 'telephoneNumber', label: 'Telephone Number', placeholder: 'Enter landline number', type: 'number' },
    ],
    cashbackPercent: 0.5,
  },
];

// ============================================
// INSURANCE PLANS
// ============================================
const insurancePlans = [
  // Health Insurance
  {
    name: 'Health Companion',
    provider: 'Star Health',
    providerLogo: '',
    type: 'health',
    coverage: '5 Lakh',
    premium: { monthly: 450, annual: 4999, currency: 'INR' },
    cashbackPercent: 3,
    features: ['Cashless hospitalization', 'No room rent limit', 'Day care procedures', 'Pre & post hospitalization', 'Ambulance cover'],
    rating: 4.5,
    claimSettlementRatio: 89,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'Optima Restore',
    provider: 'HDFC Ergo',
    providerLogo: '',
    type: 'health',
    coverage: '10 Lakh',
    premium: { monthly: 750, annual: 8499, currency: 'INR' },
    cashbackPercent: 4,
    features: ['Restore benefit (100%)', 'Cashless at 13000+ hospitals', 'No co-payment', 'Alternative treatments (AYUSH)', 'Organ donor cover'],
    rating: 4.7,
    claimSettlementRatio: 92,
    isFeatured: true,
    sortOrder: 2,
  },
  {
    name: 'Active Health Enhanced',
    provider: 'Aditya Birla',
    providerLogo: '',
    type: 'health',
    coverage: '15 Lakh',
    premium: { monthly: 1100, annual: 12499, currency: 'INR' },
    cashbackPercent: 5,
    features: ['Chronic management program', 'Health returns up to 30%', 'Multiplier benefit', 'InfinitiCare (unlimited sum)', 'Mental wellness cover'],
    rating: 4.4,
    claimSettlementRatio: 87,
    isFeatured: false,
    sortOrder: 3,
  },
  // Life Insurance
  {
    name: 'iProtect Smart',
    provider: 'ICICI Prudential',
    providerLogo: '',
    type: 'life',
    coverage: '1 Crore',
    premium: { monthly: 850, annual: 9599, currency: 'INR' },
    cashbackPercent: 5,
    features: ['Terminal illness benefit', 'Accidental death benefit', 'Waiver of premium', 'Return of premium option', 'Critical illness rider'],
    rating: 4.6,
    claimSettlementRatio: 97,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'TATA AIA Life Shield',
    provider: 'TATA AIA',
    providerLogo: '',
    type: 'life',
    coverage: '50 Lakh',
    premium: { monthly: 550, annual: 5999, currency: 'INR' },
    cashbackPercent: 4,
    features: ['Whole life cover option', 'Income replacement', 'Critical illness add-on', 'Accidental total disability', 'Premium waiver on CI'],
    rating: 4.5,
    claimSettlementRatio: 98,
    isFeatured: false,
    sortOrder: 2,
  },
  // Vehicle Insurance
  {
    name: 'Two-Wheeler Comprehensive',
    provider: 'Bajaj Allianz',
    providerLogo: '',
    type: 'vehicle',
    coverage: 'IDV Based',
    premium: { monthly: 150, annual: 1699, currency: 'INR' },
    cashbackPercent: 3,
    features: ['Own damage cover', 'Third party liability', 'Personal accident cover', 'Roadside assistance', 'Zero depreciation add-on'],
    rating: 4.3,
    claimSettlementRatio: 88,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'Car Comprehensive Plus',
    provider: 'HDFC Ergo',
    providerLogo: '',
    type: 'vehicle',
    coverage: 'IDV Based',
    premium: { monthly: 800, annual: 8999, currency: 'INR' },
    cashbackPercent: 4,
    features: ['Own damage + TP', 'Engine protector', 'NCB protection', 'Key replacement', 'Consumable cover', 'Return to invoice'],
    rating: 4.5,
    claimSettlementRatio: 91,
    isFeatured: true,
    sortOrder: 2,
  },
  // Travel Insurance
  {
    name: 'Overseas Travel Elite',
    provider: 'TATA AIG',
    providerLogo: '',
    type: 'travel',
    coverage: '$100,000',
    premium: { monthly: 0, annual: 1299, currency: 'INR' },
    cashbackPercent: 5,
    features: ['Medical emergency abroad', 'Trip cancellation', 'Baggage loss/delay', 'Flight delay', 'Passport loss', 'Adventure sports cover'],
    rating: 4.6,
    claimSettlementRatio: 90,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'Domestic Trip Guard',
    provider: 'ICICI Lombard',
    providerLogo: '',
    type: 'travel',
    coverage: '5 Lakh',
    premium: { monthly: 0, annual: 499, currency: 'INR' },
    cashbackPercent: 3,
    features: ['Medical expenses', 'Trip cancellation', 'Checked-in baggage', 'Hotel extension', 'Emergency dental'],
    rating: 4.2,
    claimSettlementRatio: 86,
    isFeatured: false,
    sortOrder: 2,
  },
  // Home Insurance
  {
    name: 'Home Shield',
    provider: 'Bajaj Allianz',
    providerLogo: '',
    type: 'home',
    coverage: '50 Lakh',
    premium: { monthly: 350, annual: 3799, currency: 'INR' },
    cashbackPercent: 3,
    features: ['Building structure cover', 'Home contents cover', 'Theft & burglary', 'Fire & natural disaster', 'Electrical & mechanical breakdown', 'Temporary accommodation'],
    rating: 4.3,
    claimSettlementRatio: 85,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'Sweet Home Insurance',
    provider: 'HDFC Ergo',
    providerLogo: '',
    type: 'home',
    coverage: '1 Crore',
    premium: { monthly: 600, annual: 6499, currency: 'INR' },
    cashbackPercent: 4,
    features: ['Building + content cover', 'Jewelry & valuables', 'Rent for alternate accommodation', 'Public liability', 'Domestic help cover'],
    rating: 4.4,
    claimSettlementRatio: 88,
    isFeatured: false,
    sortOrder: 2,
  },
  // Business Insurance
  {
    name: 'Shop Insurance',
    provider: 'Bajaj Allianz',
    providerLogo: '',
    type: 'business',
    coverage: '25 Lakh',
    premium: { monthly: 500, annual: 5499, currency: 'INR' },
    cashbackPercent: 3,
    features: ['Fire & allied perils', 'Burglary cover', 'Electronic equipment', 'Money in transit', 'Plate glass', 'Public liability'],
    rating: 4.2,
    claimSettlementRatio: 84,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'SME Protect',
    provider: 'ICICI Lombard',
    providerLogo: '',
    type: 'business',
    coverage: '1 Crore',
    premium: { monthly: 1500, annual: 16999, currency: 'INR' },
    cashbackPercent: 5,
    features: ['Property all risk', 'Business interruption', 'Cyber liability', 'Product liability', 'Employee dishonesty', 'Transit insurance'],
    rating: 4.5,
    claimSettlementRatio: 89,
    isFeatured: false,
    sortOrder: 2,
  },
];

// ============================================
// GOLD PRICE
// ============================================
const goldPrices = [
  {
    pricePerGram: 7250,
    currency: 'INR',
    source: 'manual',
    effectiveAt: new Date(),
  },
];

// ============================================
// SEED FUNCTION
// ============================================
async function seed() {
  try {
    const uri = MONGODB_URI.includes('?')
      ? `${MONGODB_URI.split('?')[0]}${DB_NAME}?${MONGODB_URI.split('?')[1]}`
      : `${MONGODB_URI}/${DB_NAME}`;

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected successfully!\n');

    // Check existing counts first
    const [opCount, billCount, insCount, goldCount] = await Promise.all([
      RechargeOperator.countDocuments(),
      BillProvider.countDocuments(),
      InsurancePlan.countDocuments(),
      GoldPrice.countDocuments(),
    ]);

    console.log('Current counts:');
    console.log(`  RechargeOperator: ${opCount}`);
    console.log(`  BillProvider:     ${billCount}`);
    console.log(`  InsurancePlan:    ${insCount}`);
    console.log(`  GoldPrice:        ${goldCount}`);
    console.log('');

    // Seed RechargeOperators (upsert by code)
    if (opCount === 0) {
      const ops = await RechargeOperator.insertMany(rechargeOperators);
      console.log(`Inserted ${ops.length} recharge operators`);
    } else {
      console.log('RechargeOperators already seeded, skipping (delete collection to re-seed)');
    }

    // Seed BillProviders (upsert by code)
    if (billCount === 0) {
      const bills = await BillProvider.insertMany(billProviders);
      console.log(`Inserted ${bills.length} bill providers`);
    } else {
      console.log('BillProviders already seeded, skipping');
    }

    // Seed InsurancePlans
    if (insCount === 0) {
      const plans = await InsurancePlan.insertMany(insurancePlans);
      console.log(`Inserted ${plans.length} insurance plans`);
    } else {
      console.log('InsurancePlans already seeded, skipping');
    }

    // Seed GoldPrice
    if (goldCount === 0) {
      const prices = await GoldPrice.insertMany(goldPrices);
      console.log(`Inserted ${prices.length} gold price(s)`);
    } else {
      console.log('GoldPrice already seeded, skipping');
    }

    console.log('\nSeed complete!');

    // Print final counts
    const [fOp, fBill, fIns, fGold] = await Promise.all([
      RechargeOperator.countDocuments(),
      BillProvider.countDocuments(),
      InsurancePlan.countDocuments(),
      GoldPrice.countDocuments(),
    ]);
    console.log('\nFinal counts:');
    console.log(`  RechargeOperator: ${fOp}`);
    console.log(`  BillProvider:     ${fBill}`);
    console.log(`  InsurancePlan:    ${fIns}`);
    console.log(`  GoldPrice:        ${fGold}`);

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

seed();
