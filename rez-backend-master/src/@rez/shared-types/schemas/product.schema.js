"use strict";
/**
 * Product zod schemas — API-boundary validation.
 *
 * Canonical pricing: `original` + `selling`, NOT `price.current / price.original`
 * (legacy shape the consumer was writing). The ProductResponseSchema
 * deliberately accepts the richer backend shape (variants, modifiers, GST)
 * so merchant app reads validate cleanly, while CreateProductSchema is the
 * minimal contract the merchant must supply.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductListResponseSchema = exports.ProductResponseSchema = exports.UpdateProductSchema = exports.CreateProductSchema = exports.ProductModifierSchema = exports.ProductModifierOptionSchema = exports.ProductInventorySchema = exports.ProductVariantSchema = exports.ProductRatingSchema = exports.ProductRatingDistributionSchema = exports.ProductPricingSchema = exports.ProductGSTSchema = exports.ProductImageSchema = exports.MENU_PERIOD = exports.TAX_SLAB = exports.PRODUCT_VISIBILITY = exports.PRODUCT_TYPE = void 0;
const zod_1 = require("zod");
const ObjectIdString = zod_1.z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');
const DateOrString = zod_1.z.union([zod_1.z.date(), zod_1.z.string()]);
exports.PRODUCT_TYPE = zod_1.z.enum(['product', 'service']);
exports.PRODUCT_VISIBILITY = zod_1.z.enum(['public', 'hidden', 'featured']);
exports.TAX_SLAB = zod_1.z.enum(['0', '5', '12', '18', '28', 'exempt']);
exports.MENU_PERIOD = zod_1.z.enum(['all_day', 'breakfast', 'lunch', 'dinner', 'custom']);
exports.ProductImageSchema = zod_1.z
    .object({
    url: zod_1.z.string().url('Invalid image URL'),
    alt: zod_1.z.string().optional(),
    isPrimary: zod_1.z.boolean().optional(),
})
    .strict();
exports.ProductGSTSchema = zod_1.z
    .object({
    hsnCode: zod_1.z.string().optional(),
    sacCode: zod_1.z.string().optional(),
    gstRate: zod_1.z.number().min(0).max(100).optional(),
    taxSlab: exports.TAX_SLAB.optional(),
    isIGST: zod_1.z.boolean().optional(),
})
    .strict();
exports.ProductPricingSchema = zod_1.z
    .object({
    original: zod_1.z.number().positive('Original price must be positive'),
    selling: zod_1.z.number().positive('Selling price must be positive'),
    discount: zod_1.z.number().min(0).max(100).optional(),
    currency: zod_1.z.string().default('INR'),
    bulk: zod_1.z
        .array(zod_1.z
        .object({
        minQuantity: zod_1.z.number().int().positive(),
        price: zod_1.z.number().positive(),
    })
        .strict())
        .optional(),
    gst: exports.ProductGSTSchema.optional(),
})
    .strict()
    .refine((p) => p.selling <= p.original, {
    message: 'selling price must be ≤ original (MRP)',
    path: ['selling'],
});
exports.ProductRatingDistributionSchema = zod_1.z
    .object({
    5: zod_1.z.number().int().min(0),
    4: zod_1.z.number().int().min(0),
    3: zod_1.z.number().int().min(0),
    2: zod_1.z.number().int().min(0),
    1: zod_1.z.number().int().min(0),
})
    .strict();
exports.ProductRatingSchema = zod_1.z
    .object({
    average: zod_1.z.number().min(0).max(5),
    count: zod_1.z.number().int().min(0),
    distribution: exports.ProductRatingDistributionSchema,
})
    .strict();
exports.ProductVariantSchema = zod_1.z
    .object({
    variantId: zod_1.z.string().min(1),
    type: zod_1.z.string().min(1),
    value: zod_1.z.string().min(1),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    price: zod_1.z.number().positive().optional(),
    compareAtPrice: zod_1.z.number().positive().optional(),
    stock: zod_1.z.number().int().min(0),
    sku: zod_1.z.string().optional(),
    images: zod_1.z.array(zod_1.z.string()).optional(),
    barcode: zod_1.z.string().optional(),
    weight: zod_1.z.number().min(0).optional(),
    isAvailable: zod_1.z.boolean().optional(),
})
    .strict();
exports.ProductInventorySchema = zod_1.z
    .object({
    stock: zod_1.z.number().int().min(0),
    isAvailable: zod_1.z.boolean(),
    lowStockThreshold: zod_1.z.number().int().min(0).optional(),
    variants: zod_1.z.array(exports.ProductVariantSchema).optional(),
    unlimited: zod_1.z.boolean(),
    estimatedRestockDate: DateOrString.optional(),
    allowBackorder: zod_1.z.boolean().optional(),
    reservedStock: zod_1.z.number().int().min(0).optional(),
})
    .strict();
exports.ProductModifierOptionSchema = zod_1.z
    .object({
    label: zod_1.z.string().min(1),
    price: zod_1.z.number().min(0),
    isDefault: zod_1.z.boolean().optional(),
})
    .strict();
exports.ProductModifierSchema = zod_1.z
    .object({
    _id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1),
    required: zod_1.z.boolean().optional(),
    multiSelect: zod_1.z.boolean().optional(),
    options: zod_1.z.array(exports.ProductModifierOptionSchema).min(1),
})
    .strict();
exports.CreateProductSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1, 'Product name is required').max(200),
    slug: zod_1.z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
        .optional(),
    description: zod_1.z.string().max(2000).optional(),
    shortDescription: zod_1.z.string().max(300).optional(),
    productType: exports.PRODUCT_TYPE.default('product'),
    category: ObjectIdString,
    subCategory: ObjectIdString.optional(),
    store: ObjectIdString,
    merchantId: ObjectIdString.optional(),
    brand: zod_1.z.string().max(100).optional(),
    sku: zod_1.z.string().min(1),
    barcode: zod_1.z.string().optional(),
    images: zod_1.z.array(zod_1.z.string()).default([]),
    pricing: exports.ProductPricingSchema,
    inventory: exports.ProductInventorySchema,
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    modifiers: zod_1.z.array(exports.ProductModifierSchema).optional(),
    isActive: zod_1.z.boolean().default(true),
    isFeatured: zod_1.z.boolean().default(false),
    isDigital: zod_1.z.boolean().default(false),
    visibility: exports.PRODUCT_VISIBILITY.optional(),
})
    .strict();
exports.UpdateProductSchema = exports.CreateProductSchema.partial().strict();
exports.ProductResponseSchema = zod_1.z
    .object({
    _id: zod_1.z.string().optional(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    productType: exports.PRODUCT_TYPE,
    category: ObjectIdString,
    store: ObjectIdString,
    merchantId: ObjectIdString.optional(),
    sku: zod_1.z.string(),
    images: zod_1.z.array(zod_1.z.string()),
    pricing: exports.ProductPricingSchema,
    inventory: exports.ProductInventorySchema,
    ratings: exports.ProductRatingSchema,
    tags: zod_1.z.array(zod_1.z.string()),
    isActive: zod_1.z.boolean(),
    isFeatured: zod_1.z.boolean(),
    isDigital: zod_1.z.boolean(),
    visibility: exports.PRODUCT_VISIBILITY.optional(),
    createdAt: DateOrString,
    updatedAt: DateOrString,
    isDeleted: zod_1.z.boolean(),
})
    .strip();
exports.ProductListResponseSchema = zod_1.z.array(exports.ProductResponseSchema);
//# sourceMappingURL=product.schema.js.map