/**
 * Product route helpers (Phase 6.3)
 *
 * Joi validation schemas and the generateSKU helper, shared between
 * productsReadRoutes.ts, productsWriteRoutes.ts, and productsBulkRoutes.ts.
 */

import Joi from "joi";
import { Product } from "../models/Product";


// Validation schemas
export const createProductSchema = Joi.object({
  name: Joi.string().required().min(2).max(200),
  description: Joi.string().required().min(10),
  shortDescription: Joi.string().max(300),
  sku: Joi.string().optional(),
  barcode: Joi.string().optional(),
  category: Joi.string().required(),
  subcategory: Joi.string().optional(),
  brand: Joi.string().optional(),
  storeId: Joi.string().optional(), // Store assignment for multi-store support
  price: Joi.number().required().min(0),
  costPrice: Joi.number().min(0),
  compareAtPrice: Joi.number().min(0),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR').default('USD'),
  inventory: Joi.object({
    stock: Joi.number().required().min(0),
    lowStockThreshold: Joi.number().min(0).default(5),
    trackInventory: Joi.boolean().default(true),
    allowBackorders: Joi.boolean().default(false)
  }).required(),
  images: Joi.array().items(Joi.object({
    url: Joi.string().required(),
    thumbnailUrl: Joi.string(),
    altText: Joi.string(),
    sortOrder: Joi.number().default(0),
    isMain: Joi.boolean().default(false)
  })),
  weight: Joi.number().min(0),
  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0),
    unit: Joi.string().valid('cm', 'inch').default('cm')
  }),
  tags: Joi.array().items(Joi.string()),
  metaTitle: Joi.string().max(60),
  metaDescription: Joi.string().max(160),
  searchKeywords: Joi.array().items(Joi.string()),
  status: Joi.string().valid('active', 'inactive', 'draft', 'archived').default('draft'),
  visibility: Joi.string().valid('public', 'hidden', 'featured').default('public'),
  cashback: Joi.object({
    percentage: Joi.number().min(0).max(100).default(0),
    maxAmount: Joi.number().min(0),
    isActive: Joi.boolean().default(true)
  }).required()
});

export const updateProductSchema = createProductSchema.fork(
  ['name', 'description', 'price', 'inventory', 'category', 'cashback'],  // Fixed: Made category and cashback optional for updates
  (schema) => schema.optional()
);

export const searchProductsSchema = Joi.object({
  query: Joi.string(),
  category: Joi.string(),
  status: Joi.string().valid('active', 'inactive', 'draft', 'archived'),
  visibility: Joi.string().valid('public', 'hidden', 'featured'),
  stockLevel: Joi.string().valid('all', 'in_stock', 'low_stock', 'out_of_stock'),
  storeId: Joi.string().optional(), // Filter by store
  sortBy: Joi.string().valid('name', 'price', 'stock', 'created', 'updated').default('created'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});

export const productIdSchema = Joi.object({
  id: Joi.string().required()
});

// Generate unique SKU
export const generateSKU = async (merchantId: string, productName: string): Promise<string> => {
  const prefix = productName.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  let sku = `${prefix}${timestamp}`;

  // Ensure uniqueness
  let counter = 1;
  while (await Product.findOne({ sku }).lean()) {
    sku = `${prefix}${timestamp}${counter}`;
    counter++;
  }

  return sku;
};