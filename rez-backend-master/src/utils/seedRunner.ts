/**
 * Seed runner utilities — REZ-vs-NUQTA migration (Phase 0)
 *
 * Implements the "seed-on-first-call" pattern: instead of running a one-off
 * seeding script, route handlers can call `ensureSeeded()` on first request
 * and rely on the helper to populate the collection only when it is empty.
 * This is intentionally idempotent and safe to invoke from multiple workers.
 *
 * All real seed payloads are realistic Indian-region data (BigBazaar, Croma,
 * Reliance Fresh, Apollo Pharmacy, Cafe Coffee Day, Domino's, etc.) and use
 * rupee pricing so that the migration can be smoke-tested against Nuqta's
 * eventual INR-first locale configuration.
 */
import mongoose from 'mongoose';
import { logger } from '../config/logger';

/** Options accepted by `ensureSeeded`. */
export interface EnsureSeededOptions {
  /** Collection name used for the empty-check. Falls back to `Model.collection.name`. */
  collectionName?: string;
  /**
   * If true, re-runs `seedBuilder` even when documents already exist and
   * inserts them alongside. Useful in tests; never use in production.
   */
  force?: boolean;
}

/**
 * Ensure that a collection has at least one document. If the collection is
 * empty, calls `seedBuilder()` and bulk-inserts the result via
 * `Model.insertMany()`. Either way, returns the current documents.
 *
 * @param Model Mongoose model whose collection should be checked.
 * @param seedBuilder Async factory returning the seed documents.
 * @param options Optional configuration (collection name, force re-seed).
 */
export const ensureSeeded = async <T>(
  Model: mongoose.Model<any>,
  seedBuilder: () => Promise<T[]>,
  options: EnsureSeededOptions = {}
): Promise<T[]> => {
  const collectionName = options.collectionName ?? Model.collection.name;
  const existing = await Model.find().lean<T[]>().exec();
  if (existing.length > 0 && !options.force) {
    logger.debug('seedRunner: collection already populated', {
      collection: collectionName,
      count: existing.length,
      forced: false,
    });
    return existing;
  }

  const seeds = await seedBuilder();
  if (!seeds || seeds.length === 0) {
    logger.warn('seedRunner: seedBuilder returned empty array, nothing inserted', {
      collection: collectionName,
    });
    return [];
  }

  logger.info('seedRunner: seeding collection', {
    collection: collectionName,
    count: seeds.length,
    forced: Boolean(options.force),
  });
  await Model.insertMany(seeds as any[]);
  const inserted = await Model.find().lean<T[]>().exec();
  return inserted;
};

/**
 * Find a single document by `query`; if none exists, insert the document
 * returned by `defaults` and return it. Convenience wrapper that avoids
 * the upsert/findOne-then-create dance at call sites.
 */
export const getOrCreate = async <T>(
  Model: mongoose.Model<any>,
  query: Record<string, any>,
  defaults: () => Promise<T>
): Promise<T> => {
  const existing = await Model.findOne(query).lean<T | null>().exec();
  if (existing) {
    return existing;
  }
  const seed = await defaults();
  const doc = await Model.create(seed as any);
  return doc.toObject() as T;
};

// ─────────────────────────────────────────────────────────────────────────────
// Indian-region seed factories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Realistic Indian retail store seed. Prices and names reflect what the
 * Nuqta frontend will eventually display in the `/api/b/stores` endpoint.
 */
export const indianStoresSeed = async (): Promise<Array<Record<string, any>>> => {
  return [
    {
      slug: 'bigbazaar-andheri',
      name: 'BigBazaar',
      category: 'hypermarket',
      city: 'Mumbai',
      area: 'Andheri West',
      address: 'Infiniti Mall, Link Road, Andheri West',
      pincode: '400058',
      rating: 4.2,
      isOpen: true,
      hours: '10:00–22:00',
    },
    {
      slug: 'lifestyle-phoenix',
      name: 'Lifestyle',
      category: 'fashion',
      city: 'Mumbai',
      area: 'Lower Parel',
      address: 'Phoenix Mills, Lower Parel',
      pincode: '400013',
      rating: 4.3,
      isOpen: true,
      hours: '11:00–22:00',
    },
    {
      slug: 'croma-juhu',
      name: 'Croma',
      category: 'electronics',
      city: 'Mumbai',
      area: 'Juhu',
      address: 'Juhu Galli, Juhu',
      pincode: '400049',
      rating: 4.1,
      isOpen: true,
      hours: '11:00–21:30',
    },
    {
      slug: 'reliance-fresh-bandra',
      name: 'Reliance Fresh',
      category: 'grocery',
      city: 'Mumbai',
      area: 'Bandra West',
      address: 'Linking Road, Bandra West',
      pincode: '400050',
      rating: 4.0,
      isOpen: true,
      hours: '08:00–22:00',
    },
    {
      slug: 'apollo-pharmacy-powai',
      name: 'Apollo Pharmacy',
      category: 'pharmacy',
      city: 'Mumbai',
      area: 'Powai',
      address: 'Hiranandani Gardens, Powai',
      pincode: '400076',
      rating: 4.4,
      isOpen: true,
      hours: '00:00–23:59',
    },
    {
      slug: 'cafe-coffee-day-koramangala',
      name: 'Cafe Coffee Day',
      category: 'cafe',
      city: 'Bengaluru',
      area: 'Koramangala',
      address: '80 Feet Road, Koramangala 1st Block',
      pincode: '560034',
      rating: 4.1,
      isOpen: true,
      hours: '09:00–23:00',
    },
    {
      slug: 'dominos-pizza-saket',
      name: "Domino's Pizza",
      category: 'restaurant',
      city: 'New Delhi',
      area: 'Saket',
      address: 'Saket District Centre',
      pincode: '110017',
      rating: 4.0,
      isOpen: true,
      hours: '11:00–23:30',
    },
  ];
};

/**
 * Indian-region product seed. Prices are in INR (₹) and reflect typical
 * offline retail price points rather than e-commerce sale prices.
 */
export const indianProductsSeed = async (): Promise<Array<Record<string, any>>> => {
  return [
    {
      sku: 'BB-RICE-5KG',
      name: 'India Gate Basmati Rice',
      storeSlug: 'bigbazaar-andheri',
      category: 'grocery',
      priceInr: 749,
      mrpInr: 825,
      unit: '5 kg',
      inStock: true,
    },
    {
      sku: 'LS-TEE-M-BLUE',
      name: 'Allen Solly Polo T-shirt (M)',
      storeSlug: 'lifestyle-phoenix',
      category: 'fashion',
      priceInr: 899,
      mrpInr: 1299,
      unit: '1 pc',
      inStock: true,
    },
    {
      sku: 'CR-EARBUDS-PRO',
      name: 'Croma Bluetooth Earbuds Pro',
      storeSlug: 'croma-juhu',
      category: 'electronics',
      priceInr: 2499,
      mrpInr: 3999,
      unit: '1 pair',
      inStock: true,
    },
    {
      sku: 'RF-OIL-1L',
      name: 'Fortune Sunflower Oil',
      storeSlug: 'reliance-fresh-bandra',
      category: 'grocery',
      priceInr: 165,
      mrpInr: 185,
      unit: '1 L',
      inStock: true,
    },
    {
      sku: 'AP-PARA-500',
      name: 'Dolo 650 Strip (15 tablets)',
      storeSlug: 'apollo-pharmacy-powai',
      category: 'pharmacy',
      priceInr: 110,
      mrpInr: 130,
      unit: '15 tabs',
      inStock: true,
    },
    {
      sku: 'CCD-LATTE-MED',
      name: 'Cafe Latte (Medium)',
      storeSlug: 'cafe-coffee-day-koramangala',
      category: 'beverage',
      priceInr: 195,
      mrpInr: 220,
      unit: '350 ml',
      inStock: true,
    },
    {
      sku: 'DOM-MARG-REG',
      name: "Domino's Margherita (Regular)",
      storeSlug: 'dominos-pizza-saket',
      category: 'food',
      priceInr: 249,
      mrpInr: 299,
      unit: '1 pizza',
      inStock: true,
    },
  ];
};

/**
 * Indian-region merchant seed. Each merchant maps to a physical storefront
 * and provides the contact + GSTIN fields Nuqta will eventually require.
 */
export const indianMerchantsSeed = async (): Promise<Array<Record<string, any>>> => {
  return [
    {
      slug: 'bigbazaar-andheri',
      legalName: 'Foodhall India Pvt Ltd',
      gstin: '27AAACF1234A1Z5',
      pan: 'AAACF1234A',
      contactEmail: 'andheri@bigbazaar.example.in',
      contactPhone: '+91-22-40001234',
      tier: 'platinum',
      payoutCycleDays: 7,
    },
    {
      slug: 'lifestyle-phoenix',
      legalName: 'Landmark Lifestyle Ltd',
      gstin: '27AABCL2234B1Z2',
      pan: 'AABCL2234B',
      contactEmail: 'phoenix@lifestyle.example.in',
      contactPhone: '+91-22-40404567',
      tier: 'gold',
      payoutCycleDays: 14,
    },
    {
      slug: 'croma-juhu',
      legalName: 'Infiniti Retail Ltd',
      gstin: '27AABCI3344C1Z9',
      pan: 'AABCI3344C',
      contactEmail: 'juhu@croma.example.in',
      contactPhone: '+91-22-26267890',
      tier: 'gold',
      payoutCycleDays: 14,
    },
    {
      slug: 'reliance-fresh-bandra',
      legalName: 'Reliance Retail Ventures Ltd',
      gstin: '27AAACR4455D1Z1',
      pan: 'AAACR4455D',
      contactEmail: 'bandra@reliancefresh.example.in',
      contactPhone: '+91-22-40889000',
      tier: 'platinum',
      payoutCycleDays: 7,
    },
    {
      slug: 'apollo-pharmacy-powai',
      legalName: 'Apollo Pharmacy Ltd',
      gstin: '27AAACA5566E1Z4',
      pan: 'AAACA5566E',
      contactEmail: 'powai@apollopharmacy.example.in',
      contactPhone: '+91-22-40671234',
      tier: 'platinum',
      payoutCycleDays: 7,
    },
    {
      slug: 'cafe-coffee-day-koramangala',
      legalName: 'Coffee Day Global Ltd',
      gstin: '29AAACC6677F1Z6',
      pan: 'AAACC6677F',
      contactEmail: 'koramangala@cafecoffeeday.example.in',
      contactPhone: '+91-80-41122334',
      tier: 'silver',
      payoutCycleDays: 30,
    },
    {
      slug: 'dominos-pizza-saket',
      legalName: 'Jubilant FoodWorks Ltd',
      gstin: '07AAACJ7788G1Z8',
      pan: 'AAACJ7788G',
      contactEmail: 'saket@dominos.example.in',
      contactPhone: '+91-11-40505667',
      tier: 'gold',
      payoutCycleDays: 14,
    },
  ];
};