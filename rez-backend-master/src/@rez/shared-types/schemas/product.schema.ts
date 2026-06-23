// @ts-nocheck
/**
 * Product zod schemas — API-boundary validation.
 *
 * Canonical pricing: `original` + `selling`, NOT `price.current / price.original`
 * (legacy shape the consumer was writing). The ProductResponseSchema
 * deliberately accepts the richer backend shape (variants, modifiers, GST)
 * so merchant app reads validate cleanly, while CreateProductSchema is the
 * minimal contract the merchant must supply.
 */

import { z } from 'zod';

const ObjectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');
const DateOrString = z.union([z.date(), z.string()]);

export const PRODUCT_TYPE = z.enum(['product', 'service']);
export const PRODUCT_VISIBILITY = z.enum(['public', 'hidden', 'featured']);
export const TAX_SLAB = z.enum(['0', '5', '12', '18', '28', 'exempt']);
export const MENU_PERIOD = z.enum(['all_day', 'breakfast', 'lunch', 'dinner', 'custom']);

export const ProductImageSchema = z
  .object({
    url: z.string().url('Invalid image URL'),
    alt: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })
  .strict();

export const ProductGSTSchema = z
  .object({
    hsnCode: z.string().optional(),
    sacCode: z.string().optional(),
    gstRate: z.number().min(0).max(100).optional(),
    taxSlab: TAX_SLAB.optional(),
    isIGST: z.boolean().optional(),
  })
  .strict();

export const ProductPricingSchema = z
  .object({
    original: z.number().positive('Original price must be positive'),
    selling: z.number().positive('Selling price must be positive'),
    discount: z.number().min(0).max(100).optional(),
    currency: z.string().default('INR'),
    bulk: z
      .array(
        z
          .object({
            minQuantity: z.number().int().positive(),
            price: z.number().positive(),
          })
          .strict(),
      )
      .optional(),
    gst: ProductGSTSchema.optional(),
  })
  .strict()
  .refine((p) => p.selling <= p.original, {
    message: 'selling price must be ≤ original (MRP)',
    path: ['selling'],
  });

export const ProductRatingDistributionSchema = z
  .object({
    5: z.number().int().min(0),
    4: z.number().int().min(0),
    3: z.number().int().min(0),
    2: z.number().int().min(0),
    1: z.number().int().min(0),
  })
  .strict();

export const ProductRatingSchema = z
  .object({
    average: z.number().min(0).max(5),
    count: z.number().int().min(0),
    distribution: ProductRatingDistributionSchema,
  })
  .strict();

export const ProductVariantSchema = z
  .object({
    variantId: z.string().min(1),
    type: z.string().min(1),
    value: z.string().min(1),
    attributes: z.record(z.string(), z.string()).optional(),
    price: z.number().positive().optional(),
    compareAtPrice: z.number().positive().optional(),
    stock: z.number().int().min(0),
    sku: z.string().optional(),
    images: z.array(z.string()).optional(),
    barcode: z.string().optional(),
    weight: z.number().min(0).optional(),
    isAvailable: z.boolean().optional(),
  })
  .strict();

export const ProductInventorySchema = z
  .object({
    stock: z.number().int().min(0),
    isAvailable: z.boolean(),
    lowStockThreshold: z.number().int().min(0).optional(),
    variants: z.array(ProductVariantSchema).optional(),
    unlimited: z.boolean(),
    estimatedRestockDate: DateOrString.optional(),
    allowBackorder: z.boolean().optional(),
    reservedStock: z.number().int().min(0).optional(),
  })
  .strict();

export const ProductModifierOptionSchema = z
  .object({
    label: z.string().min(1),
    price: z.number().min(0),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const ProductModifierSchema = z
  .object({
    _id: z.string().optional(),
    name: z.string().min(1),
    required: z.boolean().optional(),
    multiSelect: z.boolean().optional(),
    options: z.array(ProductModifierOptionSchema).min(1),
  })
  .strict();

export const CreateProductSchema = z
  .object({
    name: z.string().min(1, 'Product name is required').max(200),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
      .optional(),
    description: z.string().max(2000).optional(),
    shortDescription: z.string().max(300).optional(),
    productType: PRODUCT_TYPE.default('product'),
    category: ObjectIdString,
    subCategory: ObjectIdString.optional(),
    store: ObjectIdString,
    merchantId: ObjectIdString.optional(),
    brand: z.string().max(100).optional(),
    sku: z.string().min(1),
    barcode: z.string().optional(),
    images: z.array(z.string()).default([]),
    pricing: ProductPricingSchema,
    inventory: ProductInventorySchema,
    tags: z.array(z.string()).default([]),
    modifiers: z.array(ProductModifierSchema).optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    isDigital: z.boolean().default(false),
    visibility: PRODUCT_VISIBILITY.optional(),
  })
  .strict();

export const UpdateProductSchema = CreateProductSchema.partial().strict();

export const ProductResponseSchema = z
  .object({
    _id: z.string().optional(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    productType: PRODUCT_TYPE,
    category: ObjectIdString,
    store: ObjectIdString,
    merchantId: ObjectIdString.optional(),
    sku: z.string(),
    images: z.array(z.string()),
    pricing: ProductPricingSchema,
    inventory: ProductInventorySchema,
    ratings: ProductRatingSchema,
    tags: z.array(z.string()),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    isDigital: z.boolean(),
    visibility: PRODUCT_VISIBILITY.optional(),
    createdAt: DateOrString,
    updatedAt: DateOrString,
    isDeleted: z.boolean(),
  })
  .strip();

export const ProductListResponseSchema = z.array(ProductResponseSchema);

export type CreateProductRequest = z.infer<typeof CreateProductSchema>;
export type UpdateProductRequest = z.infer<typeof UpdateProductSchema>;
export type ProductResponse = z.infer<typeof ProductResponseSchema>;
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;
