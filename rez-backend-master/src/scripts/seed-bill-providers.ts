import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { BillProvider } from '../models/BillProvider';
import { connectDatabase, disconnectDatabase } from '../config/database';

dotenv.config();

/**
 * Seed script for initial BBPS bill provider data.
 *
 * Uses findOneAndUpdate with upsert for idempotent seeding — safe to run multiple times.
 *
 * Usage:
 *   npx ts-node src/scripts/seed-bill-providers.ts
 */

interface ProviderSeed {
  name: string;
  code: string;
  type: string;
  aggregatorCode: string;
  aggregatorName: 'razorpay';
  cashbackPercent: number;
  promoCoinsFixed: number;
  promoExpiryDays: number;
  maxRedemptionPercent: number;
  displayOrder: number;
  isFeatured: boolean;
  logo: string;
  requiredFields?: Array<{
    fieldName: string;
    label: string;
    placeholder: string;
    type: 'text' | 'number';
  }>;
  region?: string;
  minAmount?: number;
  maxAmount?: number;
}

const providers: ProviderSeed[] = [
  // ============================
  // MOBILE PREPAID
  // ============================
  {
    name: 'Jio',
    code: 'jio_prepaid',
    type: 'mobile_prepaid',
    aggregatorCode: 'JIOP',
    aggregatorName: 'razorpay',
    cashbackPercent: 1.5,
    promoCoinsFixed: 10, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/jio.png',
    minAmount: 10,
    maxAmount: 5000,
  },
  {
    name: 'Airtel',
    code: 'airtel_prepaid',
    type: 'mobile_prepaid',
    aggregatorCode: 'AIRP',
    aggregatorName: 'razorpay',
    cashbackPercent: 1.5,
    promoCoinsFixed: 10, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/airtel.png',
    minAmount: 10,
    maxAmount: 5000,
  },
  {
    name: 'BSNL',
    code: 'bsnl_prepaid',
    type: 'mobile_prepaid',
    aggregatorCode: 'BSNLP',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 5, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 3,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/bsnl.png',
    minAmount: 10,
    maxAmount: 5000,
  },
  {
    name: 'Vi',
    code: 'vi_prepaid',
    type: 'mobile_prepaid',
    aggregatorCode: 'VIP',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 5, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 4,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/vi.png',
    minAmount: 10,
    maxAmount: 5000,
  },

  // ============================
  // MOBILE POSTPAID
  // ============================
  {
    name: 'Jio Postpaid',
    code: 'jio_postpaid',
    type: 'mobile_postpaid',
    aggregatorCode: 'JIOPOST',
    aggregatorName: 'razorpay',
    cashbackPercent: 2,
    promoCoinsFixed: 15, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/jio.png',
    requiredFields: [
      { fieldName: 'mobileNumber', label: 'Mobile Number', placeholder: 'Enter 10-digit mobile number', type: 'number' },
    ],
  },
  {
    name: 'Airtel Postpaid',
    code: 'airtel_postpaid',
    type: 'mobile_postpaid',
    aggregatorCode: 'AIRPOST',
    aggregatorName: 'razorpay',
    cashbackPercent: 2,
    promoCoinsFixed: 15, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/airtel.png',
    requiredFields: [
      { fieldName: 'mobileNumber', label: 'Mobile Number', placeholder: 'Enter 10-digit mobile number', type: 'number' },
    ],
  },

  // ============================
  // ELECTRICITY
  // ============================
  {
    name: 'BESCOM',
    code: 'bescom_electricity',
    type: 'electricity',
    aggregatorCode: 'BESCOM',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 20, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/bescom.png',
    region: 'karnataka',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Consumer Number', placeholder: 'Enter your BESCOM consumer number', type: 'text' },
    ],
  },
  {
    name: 'MSEDCL',
    code: 'msedcl_electricity',
    type: 'electricity',
    aggregatorCode: 'MSEDCL',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 20, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/msedcl.png',
    region: 'maharashtra',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Consumer Number', placeholder: 'Enter your MSEDCL consumer number', type: 'text' },
    ],
  },
  {
    name: 'BSES Rajdhani',
    code: 'bses_rajdhani',
    type: 'electricity',
    aggregatorCode: 'BSESRAJ',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 20, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 3,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/bses.png',
    region: 'delhi',
    requiredFields: [
      { fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter your BSES account number', type: 'text' },
    ],
  },

  // ============================
  // BROADBAND
  // ============================
  {
    name: 'Airtel Broadband',
    code: 'airtel_broadband',
    type: 'broadband',
    aggregatorCode: 'AIRBB',
    aggregatorName: 'razorpay',
    cashbackPercent: 1.5,
    promoCoinsFixed: 15, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/airtel.png',
    requiredFields: [
      { fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter Airtel broadband account number', type: 'text' },
    ],
  },
  {
    name: 'Jio Fiber',
    code: 'jio_fiber',
    type: 'broadband',
    aggregatorCode: 'JIOFIB',
    aggregatorName: 'razorpay',
    cashbackPercent: 1.5,
    promoCoinsFixed: 15, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/jio.png',
    requiredFields: [
      { fieldName: 'accountNumber', label: 'Service ID', placeholder: 'Enter Jio Fiber service ID', type: 'text' },
    ],
  },
  {
    name: 'ACT Fibernet',
    code: 'act_fibernet',
    type: 'broadband',
    aggregatorCode: 'ACTFIB',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 10, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 3,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/act.png',
    requiredFields: [
      { fieldName: 'accountNumber', label: 'Account Number', placeholder: 'Enter ACT Fibernet account number', type: 'text' },
    ],
  },

  // ============================
  // DTH
  // ============================
  {
    name: 'Tata Play',
    code: 'tata_play',
    type: 'dth',
    aggregatorCode: 'TATASKY',
    aggregatorName: 'razorpay',
    cashbackPercent: 2,
    promoCoinsFixed: 15, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/tataplay.png',
    requiredFields: [
      { fieldName: 'subscriberId', label: 'Subscriber ID', placeholder: 'Enter Tata Play subscriber ID', type: 'number' },
    ],
  },
  {
    name: 'Dish TV',
    code: 'dish_tv',
    type: 'dth',
    aggregatorCode: 'DISHTV',
    aggregatorName: 'razorpay',
    cashbackPercent: 2,
    promoCoinsFixed: 10, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/dishtv.png',
    requiredFields: [
      { fieldName: 'subscriberId', label: 'Viewing Card Number', placeholder: 'Enter Dish TV viewing card number', type: 'number' },
    ],
  },
  {
    name: 'Sun Direct',
    code: 'sun_direct',
    type: 'dth',
    aggregatorCode: 'SUNDIR',
    aggregatorName: 'razorpay',
    cashbackPercent: 1.5,
    promoCoinsFixed: 10, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 3,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/sundirect.png',
    requiredFields: [
      { fieldName: 'subscriberId', label: 'Customer ID', placeholder: 'Enter Sun Direct customer ID', type: 'number' },
    ],
  },

  // ============================
  // GAS
  // ============================
  {
    name: 'Indane LPG',
    code: 'indane_lpg',
    type: 'gas',
    aggregatorCode: 'INDANE',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 20, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/indane.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Consumer Number', placeholder: 'Enter 17-digit Indane consumer number', type: 'text' },
    ],
  },
  {
    name: 'HP Gas',
    code: 'hp_gas',
    type: 'gas',
    aggregatorCode: 'HPGAS',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 20, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/hpgas.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Consumer Number', placeholder: 'Enter HP Gas consumer number', type: 'text' },
    ],
  },
  {
    name: 'Bharatgas',
    code: 'bharatgas',
    type: 'gas',
    aggregatorCode: 'BGAS',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 20, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 3,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/bharatgas.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Consumer Number', placeholder: 'Enter Bharatgas consumer number', type: 'text' },
    ],
  },

  // ============================
  // FASTAG
  // ============================
  {
    name: 'Paytm FASTag',
    code: 'paytm_fastag',
    type: 'fastag',
    aggregatorCode: 'PAYTMFT',
    aggregatorName: 'razorpay',
    cashbackPercent: 2,
    promoCoinsFixed: 15, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/paytm.png',
    requiredFields: [
      { fieldName: 'vehicleNumber', label: 'Vehicle Number', placeholder: 'Enter vehicle registration number', type: 'text' },
    ],
    minAmount: 100,
    maxAmount: 10000,
  },
  {
    name: 'HDFC FASTag',
    code: 'hdfc_fastag',
    type: 'fastag',
    aggregatorCode: 'HDFCFT',
    aggregatorName: 'razorpay',
    cashbackPercent: 2,
    promoCoinsFixed: 15, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/hdfc.png',
    requiredFields: [
      { fieldName: 'vehicleNumber', label: 'Vehicle Number', placeholder: 'Enter vehicle registration number', type: 'text' },
    ],
    minAmount: 100,
    maxAmount: 10000,
  },

  // ── Water ──────────────────────────────────────────────────
  {
    name: 'BWSSB Bangalore',
    code: 'bwssb',
    type: 'water',
    aggregatorCode: 'BWSSB',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 15, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/bwssb.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'RR Number', placeholder: 'Enter your RR number', type: 'text' },
    ],
    region: 'karnataka',
    minAmount: 50,
    maxAmount: 50000,
  },
  {
    name: 'Delhi Jal Board',
    code: 'djb',
    type: 'water',
    aggregatorCode: 'DJB',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 15, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/djb.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Consumer Number', placeholder: 'Enter consumer number', type: 'text' },
    ],
    region: 'delhi',
    minAmount: 50,
    maxAmount: 50000,
  },

  // ── Internet / Broadband (separate from broadband for ISPs) ───
  {
    name: 'Hathway Broadband',
    code: 'hathway',
    type: 'internet',
    aggregatorCode: 'HATHWAY',
    aggregatorName: 'razorpay',
    cashbackPercent: 2,
    promoCoinsFixed: 12, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/hathway.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Customer ID', placeholder: 'Enter Hathway customer ID', type: 'text' },
    ],
    minAmount: 100,
    maxAmount: 10000,
  },
  {
    name: 'Tikona Infinet',
    code: 'tikona',
    type: 'internet',
    aggregatorCode: 'TIKONA',
    aggregatorName: 'razorpay',
    cashbackPercent: 2,
    promoCoinsFixed: 10, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/tikona.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Customer ID', placeholder: 'Enter customer ID', type: 'text' },
    ],
    minAmount: 100,
    maxAmount: 10000,
  },

  // ── Landline ───────────────────────────────────────────────
  {
    name: 'BSNL Landline',
    code: 'bsnl_landline',
    type: 'landline',
    aggregatorCode: 'BSNL_LL',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 8, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/bsnl.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Landline Number', placeholder: 'Enter landline number with STD code', type: 'text' },
    ],
    minAmount: 50,
    maxAmount: 10000,
  },
  {
    name: 'Airtel Landline',
    code: 'airtel_landline',
    type: 'landline',
    aggregatorCode: 'AIRTEL_LL',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 8, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/airtel.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Landline Number', placeholder: 'Enter landline number', type: 'text' },
    ],
    minAmount: 50,
    maxAmount: 10000,
  },

  // ── Education Fee ──────────────────────────────────────────
  {
    name: 'Manipal University',
    code: 'manipal_edu',
    type: 'education_fee',
    aggregatorCode: 'MANIPAL_EDU',
    aggregatorName: 'razorpay',
    cashbackPercent: 0,
    promoCoinsFixed: 25, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/manipal.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Student ID', placeholder: 'Enter student registration number', type: 'text' },
    ],
    minAmount: 1000,
    maxAmount: 500000,
  },
  {
    name: 'VTU Fee Payment',
    code: 'vtu_fee',
    type: 'education_fee',
    aggregatorCode: 'VTU_FEE',
    aggregatorName: 'razorpay',
    cashbackPercent: 0,
    promoCoinsFixed: 25, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/vtu.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'USN', placeholder: 'Enter University Seat Number', type: 'text' },
    ],
    minAmount: 1000,
    maxAmount: 500000,
  },

  // ── Insurance ──────────────────────────────────────────────
  {
    name: 'LIC Premium',
    code: 'lic',
    type: 'insurance',
    aggregatorCode: 'LIC',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 20, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 1,
    isFeatured: true,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/lic.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Policy Number', placeholder: 'Enter LIC policy number', type: 'text' },
    ],
    minAmount: 500,
    maxAmount: 200000,
  },
  {
    name: 'Star Health Insurance',
    code: 'star_health',
    type: 'insurance',
    aggregatorCode: 'STAR_HEALTH',
    aggregatorName: 'razorpay',
    cashbackPercent: 1,
    promoCoinsFixed: 20, promoExpiryDays: 7, maxRedemptionPercent: 15,
    displayOrder: 2,
    isFeatured: false,
    logo: 'https://res.cloudinary.com/rez-cdn/image/upload/v1/bbps/star_health.png',
    requiredFields: [
      { fieldName: 'consumerNumber', label: 'Policy Number', placeholder: 'Enter policy number', type: 'text' },
    ],
    minAmount: 500,
    maxAmount: 200000,
  },
];

async function seedBillProviders(): Promise<void> {
  console.log('Connecting to MongoDB...');
  await connectDatabase();
  console.log('Connected.');

  let created = 0;
  let updated = 0;

  for (const providerData of providers) {
    const result = await BillProvider.findOneAndUpdate(
      { code: providerData.code },
      { $set: providerData },
      { upsert: true, new: true, runValidators: true }
    );

    // If the document was just created, createdAt ~ updatedAt (within ms)
    const isNew =
      result.createdAt &&
      result.updatedAt &&
      Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;

    if (isNew) {
      created++;
      console.log(`  [CREATED] ${providerData.name} (${providerData.code})`);
    } else {
      updated++;
      console.log(`  [UPDATED] ${providerData.name} (${providerData.code})`);
    }
  }

  console.log(`\nSeeding complete: ${created} created, ${updated} updated, ${providers.length} total providers.`);

  await disconnectDatabase();
  console.log('Disconnected from MongoDB.');
}

seedBillProviders()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
