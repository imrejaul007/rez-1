/**
 * Seed region-specific data for RechargeOperator, BillProvider, InsurancePlan, GoldPrice
 * - Tags existing India data with region='bangalore'
 * - Adds Dubai and China operators, providers, plans, gold prices
 * Usage: npx ts-node scripts/seedRegionData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import RechargeOperator from '../src/models/RechargeOperator';
import { BillProvider } from '../src/models/BillProvider';
import InsurancePlan from '../src/models/InsurancePlan';
import { GoldPrice } from '../src/models/GoldSavings';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

// ============================================
// DUBAI RECHARGE OPERATORS
// ============================================
const dubaiOperators = [
  {
    name: 'du',
    code: 'du',
    type: 'mobile',
    region: 'dubai',
    countryCode: '+971',
    currency: 'AED',
    logo: '',
    color: '#00A651',
    plans: [
      { name: 'du Daily 1GB', amount: 10, validity: '1 day', data: '1 GB', calls: '30 min local', sms: '10', cashbackPercent: 2, popular: true },
      { name: 'du Weekly', amount: 35, validity: '7 days', data: '3 GB', calls: 'Unlimited local', sms: '50', cashbackPercent: 3, popular: true },
      { name: 'du Monthly 5GB', amount: 99, validity: '30 days', data: '5 GB', calls: 'Unlimited local', sms: '100', cashbackPercent: 4, popular: true },
      { name: 'du Monthly 15GB', amount: 155, validity: '30 days', data: '15 GB', calls: 'Unlimited local', sms: 'Unlimited', cashbackPercent: 5, popular: false },
      { name: 'du Data Only 10GB', amount: 75, validity: '30 days', data: '10 GB', calls: 'N/A', sms: 'N/A', cashbackPercent: 2, popular: false },
    ],
  },
  {
    name: 'Etisalat (e&)',
    code: 'etisalat',
    type: 'mobile',
    region: 'dubai',
    countryCode: '+971',
    currency: 'AED',
    logo: '',
    color: '#00A859',
    plans: [
      { name: 'e& Daily', amount: 10, validity: '1 day', data: '1 GB', calls: '30 min local', sms: '10', cashbackPercent: 2, popular: true },
      { name: 'e& Weekly Plus', amount: 40, validity: '7 days', data: '4 GB', calls: 'Unlimited local', sms: '50', cashbackPercent: 3, popular: true },
      { name: 'e& Monthly 8GB', amount: 125, validity: '30 days', data: '8 GB', calls: 'Unlimited local', sms: '100', cashbackPercent: 4, popular: true },
      { name: 'e& Monthly 25GB', amount: 200, validity: '30 days', data: '25 GB', calls: 'Unlimited local + intl', sms: 'Unlimited', cashbackPercent: 5, popular: false },
    ],
  },
  {
    name: 'du Home',
    code: 'du-broadband',
    type: 'broadband',
    region: 'dubai',
    countryCode: '+971',
    currency: 'AED',
    logo: '',
    color: '#00A651',
    plans: [
      { name: 'du 250Mbps', amount: 299, validity: '30 days', data: 'Unlimited (250 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 3, popular: true },
      { name: 'du 500Mbps', amount: 389, validity: '30 days', data: 'Unlimited (500 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 4, popular: true },
      { name: 'du 1Gbps', amount: 549, validity: '30 days', data: 'Unlimited (1 Gbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 5, popular: false },
    ],
  },
];

// ============================================
// CHINA RECHARGE OPERATORS
// ============================================
const chinaOperators = [
  {
    name: 'China Mobile',
    code: 'china-mobile',
    type: 'mobile',
    region: 'china',
    countryCode: '+86',
    currency: 'CNY',
    logo: '',
    color: '#003DA5',
    plans: [
      { name: 'Basic 3GB', amount: 29, validity: '30 days', data: '3 GB', calls: '100 min', sms: '50', cashbackPercent: 2, popular: true },
      { name: 'Smart 10GB', amount: 59, validity: '30 days', data: '10 GB', calls: '300 min', sms: '100', cashbackPercent: 3, popular: true },
      { name: 'Premium 30GB', amount: 99, validity: '30 days', data: '30 GB', calls: 'Unlimited', sms: 'Unlimited', cashbackPercent: 4, popular: true },
      { name: 'Ultra 100GB', amount: 199, validity: '30 days', data: '100 GB', calls: 'Unlimited', sms: 'Unlimited', cashbackPercent: 5, popular: false },
    ],
  },
  {
    name: 'China Unicom',
    code: 'china-unicom',
    type: 'mobile',
    region: 'china',
    countryCode: '+86',
    currency: 'CNY',
    logo: '',
    color: '#E60012',
    plans: [
      { name: 'Unicom Basic 5GB', amount: 39, validity: '30 days', data: '5 GB', calls: '200 min', sms: '50', cashbackPercent: 2, popular: true },
      { name: 'Unicom Plus 20GB', amount: 79, validity: '30 days', data: '20 GB', calls: '500 min', sms: 'Unlimited', cashbackPercent: 3, popular: true },
      { name: 'Unicom Pro 50GB', amount: 129, validity: '30 days', data: '50 GB', calls: 'Unlimited', sms: 'Unlimited', cashbackPercent: 4, popular: false },
    ],
  },
  {
    name: 'China Telecom',
    code: 'china-telecom',
    type: 'mobile',
    region: 'china',
    countryCode: '+86',
    currency: 'CNY',
    logo: '',
    color: '#0072BC',
    plans: [
      { name: 'Telecom 8GB', amount: 49, validity: '30 days', data: '8 GB', calls: '200 min', sms: '100', cashbackPercent: 2, popular: true },
      { name: 'Telecom 25GB', amount: 89, validity: '30 days', data: '25 GB', calls: 'Unlimited', sms: 'Unlimited', cashbackPercent: 3, popular: true },
    ],
  },
  {
    name: 'China Telecom Broadband',
    code: 'china-telecom-bb',
    type: 'broadband',
    region: 'china',
    countryCode: '+86',
    currency: 'CNY',
    logo: '',
    color: '#0072BC',
    plans: [
      { name: '200Mbps Fiber', amount: 99, validity: '30 days', data: 'Unlimited (200 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 3, popular: true },
      { name: '500Mbps Fiber', amount: 169, validity: '30 days', data: 'Unlimited (500 Mbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 4, popular: true },
      { name: '1Gbps Fiber', amount: 239, validity: '30 days', data: 'Unlimited (1 Gbps)', calls: 'N/A', sms: 'N/A', cashbackPercent: 5, popular: false },
    ],
  },
];

// ============================================
// DUBAI BILL PROVIDERS
// ============================================
const dubaiBillProviders = [
  { name: 'DEWA (Electricity & Water)', code: 'dewa', type: 'electricity', logo: '', region: 'dubai', requiredFields: [{ fieldName: 'accountNumber', label: 'DEWA Account Number', placeholder: 'Enter DEWA account number', type: 'text' }], cashbackPercent: 1.5 },
  { name: 'DEWA Water', code: 'dewa-water', type: 'water', logo: '', region: 'dubai', requiredFields: [{ fieldName: 'accountNumber', label: 'DEWA Account Number', placeholder: 'Enter DEWA account number', type: 'text' }], cashbackPercent: 1 },
  { name: 'Empower (District Cooling)', code: 'empower', type: 'gas', logo: '', region: 'dubai', requiredFields: [{ fieldName: 'accountNumber', label: 'Empower Account', placeholder: 'Enter Empower account number', type: 'text' }], cashbackPercent: 1 },
  { name: 'du Postpaid', code: 'du-postpaid', type: 'mobile_postpaid', logo: '', region: 'dubai', requiredFields: [{ fieldName: 'mobileNumber', label: 'Mobile Number', placeholder: 'Enter du mobile number', type: 'number' }], cashbackPercent: 1.5 },
  { name: 'Etisalat Postpaid', code: 'etisalat-postpaid', type: 'mobile_postpaid', logo: '', region: 'dubai', requiredFields: [{ fieldName: 'mobileNumber', label: 'Mobile Number', placeholder: 'Enter e& mobile number', type: 'number' }], cashbackPercent: 1.5 },
  { name: 'du Home Internet', code: 'du-internet', type: 'internet', logo: '', region: 'dubai', requiredFields: [{ fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter du home account', type: 'text' }], cashbackPercent: 2 },
  { name: 'Etisalat Home Internet', code: 'etisalat-internet', type: 'internet', logo: '', region: 'dubai', requiredFields: [{ fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter e& home account', type: 'text' }], cashbackPercent: 2 },
  { name: 'Etisalat Landline', code: 'etisalat-landline', type: 'landline', logo: '', region: 'dubai', requiredFields: [{ fieldName: 'telephoneNumber', label: 'Telephone Number', placeholder: 'Enter landline number', type: 'number' }], cashbackPercent: 0.5 },
];

// ============================================
// CHINA BILL PROVIDERS
// ============================================
const chinaBillProviders = [
  { name: 'State Grid (Electricity)', code: 'state-grid', type: 'electricity', logo: '', region: 'china', requiredFields: [{ fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter electricity account', type: 'text' }], cashbackPercent: 1 },
  { name: 'China Southern Power Grid', code: 'csg', type: 'electricity', logo: '', region: 'china', requiredFields: [{ fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter CSG account', type: 'text' }], cashbackPercent: 1 },
  { name: 'Municipal Water Supply', code: 'china-water', type: 'water', logo: '', region: 'china', requiredFields: [{ fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter water account', type: 'text' }], cashbackPercent: 0.5 },
  { name: 'PetroChina Gas', code: 'petrochina-gas', type: 'gas', logo: '', region: 'china', requiredFields: [{ fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter gas account', type: 'text' }], cashbackPercent: 1 },
  { name: 'China Mobile Postpaid', code: 'china-mobile-postpaid', type: 'mobile_postpaid', logo: '', region: 'china', requiredFields: [{ fieldName: 'mobileNumber', label: 'Mobile Number', placeholder: 'Enter mobile number', type: 'number' }], cashbackPercent: 1 },
  { name: 'China Unicom Postpaid', code: 'china-unicom-postpaid', type: 'mobile_postpaid', logo: '', region: 'china', requiredFields: [{ fieldName: 'mobileNumber', label: 'Mobile Number', placeholder: 'Enter mobile number', type: 'number' }], cashbackPercent: 1 },
  { name: 'China Telecom Internet', code: 'china-telecom-internet', type: 'internet', logo: '', region: 'china', requiredFields: [{ fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter broadband account', type: 'text' }], cashbackPercent: 1.5 },
  { name: 'China Telecom Landline', code: 'china-telecom-landline', type: 'landline', logo: '', region: 'china', requiredFields: [{ fieldName: 'telephoneNumber', label: 'Telephone Number', placeholder: 'Enter landline number', type: 'number' }], cashbackPercent: 0.5 },
];

// ============================================
// DUBAI INSURANCE PLANS
// ============================================
const dubaiInsurancePlans = [
  {
    name: 'Essential Health Cover', provider: 'Daman', providerLogo: '', type: 'health', region: 'dubai',
    coverage: 'AED 150,000', premium: { monthly: 350, annual: 3800, currency: 'AED' },
    cashbackPercent: 4, features: ['Inpatient & outpatient', 'Emergency treatment', 'Maternity cover', 'Dental & optical'],
    rating: 4.5, claimSettlementRatio: 91, isFeatured: true, sortOrder: 1,
  },
  {
    name: 'Enhanced Health Plan', provider: 'AXA Gulf', providerLogo: '', type: 'health', region: 'dubai',
    coverage: 'AED 500,000', premium: { monthly: 650, annual: 7200, currency: 'AED' },
    cashbackPercent: 5, features: ['Worldwide emergency', 'No co-payment', 'Alternative medicine', 'Wellness benefits', 'Mental health cover'],
    rating: 4.7, claimSettlementRatio: 93, isFeatured: true, sortOrder: 2,
  },
  {
    name: 'Term Life Protection', provider: 'MetLife UAE', providerLogo: '', type: 'life', region: 'dubai',
    coverage: 'AED 1,000,000', premium: { monthly: 200, annual: 2200, currency: 'AED' },
    cashbackPercent: 5, features: ['Critical illness rider', 'Accidental death benefit', 'Repatriation cover', 'Premium waiver'],
    rating: 4.6, claimSettlementRatio: 96, isFeatured: true, sortOrder: 1,
  },
  {
    name: 'Comprehensive Motor', provider: 'Orient Insurance', providerLogo: '', type: 'vehicle', region: 'dubai',
    coverage: 'AED Vehicle Value', premium: { monthly: 250, annual: 2800, currency: 'AED' },
    cashbackPercent: 3, features: ['Own damage cover', 'Third party liability', 'Roadside assistance 24/7', 'Personal accident', 'Agency repair'],
    rating: 4.4, claimSettlementRatio: 88, isFeatured: true, sortOrder: 1,
  },
  {
    name: 'Travel Guard', provider: 'AXA Gulf', providerLogo: '', type: 'travel', region: 'dubai',
    coverage: '$250,000', premium: { monthly: 0, annual: 450, currency: 'AED' },
    cashbackPercent: 4, features: ['Medical emergency abroad', 'Trip cancellation', 'Baggage loss', 'Flight delay', 'COVID-19 cover'],
    rating: 4.5, claimSettlementRatio: 89, isFeatured: false, sortOrder: 1,
  },
  {
    name: 'Home Protect Plus', provider: 'RSA Insurance', providerLogo: '', type: 'home', region: 'dubai',
    coverage: 'AED 500,000', premium: { monthly: 120, annual: 1300, currency: 'AED' },
    cashbackPercent: 3, features: ['Building & contents', 'Personal liability', 'Domestic workers', 'Water damage', 'Theft & burglary'],
    rating: 4.3, claimSettlementRatio: 86, isFeatured: false, sortOrder: 1,
  },
];

// ============================================
// CHINA INSURANCE PLANS
// ============================================
const chinaInsurancePlans = [
  {
    name: 'Comprehensive Health', provider: 'Ping An Insurance', providerLogo: '', type: 'health', region: 'china',
    coverage: 'CNY 500,000', premium: { monthly: 380, annual: 4200, currency: 'CNY' },
    cashbackPercent: 4, features: ['Hospitalization', 'Outpatient surgery', 'Critical illness', 'Traditional Chinese medicine', 'Dental basic'],
    rating: 4.6, claimSettlementRatio: 92, isFeatured: true, sortOrder: 1,
  },
  {
    name: 'Premium Health Plus', provider: 'China Life', providerLogo: '', type: 'health', region: 'china',
    coverage: 'CNY 2,000,000', premium: { monthly: 800, annual: 8800, currency: 'CNY' },
    cashbackPercent: 5, features: ['International hospitals', 'No co-payment', 'Maternity cover', 'Mental health', 'Rehabilitation'],
    rating: 4.7, claimSettlementRatio: 94, isFeatured: true, sortOrder: 2,
  },
  {
    name: 'Term Life Shield', provider: 'Ping An Insurance', providerLogo: '', type: 'life', region: 'china',
    coverage: 'CNY 3,000,000', premium: { monthly: 350, annual: 3800, currency: 'CNY' },
    cashbackPercent: 5, features: ['Accidental death benefit', 'Critical illness rider', 'Disability income', 'Premium waiver'],
    rating: 4.5, claimSettlementRatio: 97, isFeatured: true, sortOrder: 1,
  },
  {
    name: 'Auto Comprehensive', provider: 'PICC', providerLogo: '', type: 'vehicle', region: 'china',
    coverage: 'Vehicle Value', premium: { monthly: 300, annual: 3200, currency: 'CNY' },
    cashbackPercent: 3, features: ['Collision damage', 'Third party liability', 'Theft protection', 'Glass breakage', 'Roadside assistance'],
    rating: 4.3, claimSettlementRatio: 87, isFeatured: true, sortOrder: 1,
  },
  {
    name: 'Travel Protection', provider: 'China Life', providerLogo: '', type: 'travel', region: 'china',
    coverage: 'CNY 500,000', premium: { monthly: 0, annual: 280, currency: 'CNY' },
    cashbackPercent: 4, features: ['Medical emergency', 'Trip cancellation', 'Baggage delay', 'Flight accident', 'Personal liability'],
    rating: 4.4, claimSettlementRatio: 88, isFeatured: false, sortOrder: 1,
  },
  {
    name: 'Home Guardian', provider: 'PICC', providerLogo: '', type: 'home', region: 'china',
    coverage: 'CNY 1,000,000', premium: { monthly: 150, annual: 1600, currency: 'CNY' },
    cashbackPercent: 3, features: ['Fire & natural disaster', 'Theft & burglary', 'Water damage', 'Home contents', 'Third party liability'],
    rating: 4.2, claimSettlementRatio: 85, isFeatured: false, sortOrder: 1,
  },
];

// ============================================
// REGION GOLD PRICES
// ============================================
const regionGoldPrices = [
  { pricePerGram: 7250, currency: 'INR', region: 'bangalore', source: 'manual', effectiveAt: new Date() },
  { pricePerGram: 245, currency: 'AED', region: 'dubai', source: 'manual', effectiveAt: new Date() },
  { pricePerGram: 550, currency: 'CNY', region: 'china', source: 'manual', effectiveAt: new Date() },
];

// ============================================
// REGION MAPPING FOR CURRENCY
// ============================================
const REGION_CURRENCY: Record<string, string> = {
  bangalore: 'INR',
  dubai: 'AED',
  china: 'CNY',
};

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
    console.log('Connected!\n');

    // 1. Tag existing India operators with region='bangalore'
    const taggedOps = await RechargeOperator.updateMany(
      { region: { $in: ['', null] } },
      { $set: { region: 'bangalore', countryCode: '+91', currency: 'INR' } }
    );
    console.log(`Tagged ${taggedOps.modifiedCount} existing operators with region=bangalore`);

    // 2. Tag existing bill providers with region='bangalore' (those with Indian city names)
    const taggedBills = await BillProvider.updateMany(
      { $or: [{ region: { $in: ['', null] } }, { region: 'Mumbai' }, { region: 'Delhi' }, { region: 'Bangalore' }, { region: 'Pan India' }, { region: 'mumbai' }, { region: 'delhi' }, { region: 'bangalore' }, { region: 'pan india' }] },
      { $set: { region: 'bangalore' } }
    );
    console.log(`Tagged ${taggedBills.modifiedCount} existing bill providers with region=bangalore`);

    // 3. Tag existing insurance plans with region='bangalore'
    const taggedIns = await InsurancePlan.updateMany(
      { region: { $in: ['', null] } },
      { $set: { region: 'bangalore' } }
    );
    console.log(`Tagged ${taggedIns.modifiedCount} existing insurance plans with region=bangalore`);

    // 4. Tag existing gold prices with region='bangalore'
    const taggedGold = await GoldPrice.updateMany(
      { $or: [{ region: { $in: ['', null] } }, { region: { $exists: false } }] },
      { $set: { region: 'bangalore' } }
    );
    console.log(`Tagged ${taggedGold.modifiedCount} existing gold prices with region=bangalore`);

    console.log('');

    // 5. Insert Dubai operators
    const existingDubaiOps = await RechargeOperator.countDocuments({ region: 'dubai' });
    if (existingDubaiOps === 0) {
      const ops = await RechargeOperator.insertMany(dubaiOperators);
      console.log(`Inserted ${ops.length} Dubai recharge operators`);
    } else {
      console.log(`Dubai operators already exist (${existingDubaiOps}), skipping`);
    }

    // 6. Insert China operators
    const existingChinaOps = await RechargeOperator.countDocuments({ region: 'china' });
    if (existingChinaOps === 0) {
      const ops = await RechargeOperator.insertMany(chinaOperators);
      console.log(`Inserted ${ops.length} China recharge operators`);
    } else {
      console.log(`China operators already exist (${existingChinaOps}), skipping`);
    }

    // 7. Insert Dubai bill providers
    const existingDubaiBills = await BillProvider.countDocuments({ region: 'dubai' });
    if (existingDubaiBills === 0) {
      const bills = await BillProvider.insertMany(dubaiBillProviders);
      console.log(`Inserted ${bills.length} Dubai bill providers`);
    } else {
      console.log(`Dubai bill providers already exist (${existingDubaiBills}), skipping`);
    }

    // 8. Insert China bill providers
    const existingChinaBills = await BillProvider.countDocuments({ region: 'china' });
    if (existingChinaBills === 0) {
      const bills = await BillProvider.insertMany(chinaBillProviders);
      console.log(`Inserted ${bills.length} China bill providers`);
    } else {
      console.log(`China bill providers already exist (${existingChinaBills}), skipping`);
    }

    // 9. Insert Dubai insurance plans
    const existingDubaiIns = await InsurancePlan.countDocuments({ region: 'dubai' });
    if (existingDubaiIns === 0) {
      const plans = await InsurancePlan.insertMany(dubaiInsurancePlans);
      console.log(`Inserted ${plans.length} Dubai insurance plans`);
    } else {
      console.log(`Dubai insurance plans already exist (${existingDubaiIns}), skipping`);
    }

    // 10. Insert China insurance plans
    const existingChinaIns = await InsurancePlan.countDocuments({ region: 'china' });
    if (existingChinaIns === 0) {
      const plans = await InsurancePlan.insertMany(chinaInsurancePlans);
      console.log(`Inserted ${plans.length} China insurance plans`);
    } else {
      console.log(`China insurance plans already exist (${existingChinaIns}), skipping`);
    }

    // 11. Insert region-specific gold prices (one per region if not already exists)
    for (const gp of regionGoldPrices) {
      const exists = await GoldPrice.countDocuments({ region: gp.region });
      if (exists === 0) {
        await GoldPrice.create(gp);
        console.log(`Inserted gold price for region=${gp.region}: ${gp.pricePerGram} ${gp.currency}`);
      } else {
        console.log(`Gold price for region=${gp.region} already exists, skipping`);
      }
    }

    // Print final summary
    console.log('\n=== Final Summary ===');
    for (const region of ['bangalore', 'dubai', 'china']) {
      const [ops, bills, ins, gold] = await Promise.all([
        RechargeOperator.countDocuments({ region }),
        BillProvider.countDocuments({ region }),
        InsurancePlan.countDocuments({ region }),
        GoldPrice.countDocuments({ region }),
      ]);
      console.log(`${region}: ${ops} operators, ${bills} bill providers, ${ins} insurance plans, ${gold} gold price(s)`);
    }

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

seed();
