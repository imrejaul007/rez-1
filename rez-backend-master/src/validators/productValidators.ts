import Joi from 'joi';

// MongoDB ObjectId pattern
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Create product validation
export const createProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'Product name must be at least 3 characters',
      'string.max': 'Product name cannot exceed 200 characters',
      'any.required': 'Product name is required'
    }),
  description: Joi.string()
    .trim()
    .max(5000)
    .allow('')
    .optional(),
  price: Joi.number()
    .positive()
    .precision(2)
    .max(99999999.99)
    .required()
    .messages({
      'number.positive': 'Price must be a positive number',
      'any.required': 'Price is required'
    }),
  compareAtPrice: Joi.number()
    .positive()
    .precision(2)
    .max(99999999.99)
    .optional(),
  costPerItem: Joi.number()
    .positive()
    .precision(2)
    .max(99999999.99)
    .optional(),
  sku: Joi.string()
    .trim()
    .uppercase()
    .max(100)
    .optional(),
  barcode: Joi.string()
    .trim()
    .max(100)
    .optional(),
  trackQuantity: Joi.boolean()
    .default(true),
  quantity: Joi.number()
    .integer()
    .min(0)
    .max(999999)
    .when('trackQuantity', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  category: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid category ID format',
      'any.required': 'Category is required'
    }),
  categoryType: Joi.string()
    .valid('going_out', 'home_delivery', 'earn', 'play', 'general')
    .default('general')
    .optional(),
  subcategory: Joi.string()
    .pattern(objectIdPattern)
    .optional(),
  brand: Joi.string()
    .trim()
    .max(100)
    .optional(),
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional(),
  images: Joi.array()
    .items(Joi.object({
      url: Joi.string().uri().required(),
      thumbnailUrl: Joi.string().uri().optional(),
      altText: Joi.string().trim().max(200).optional(),
      sortOrder: Joi.number().integer().min(0).default(0),
      isMain: Joi.boolean().default(false)
    }))
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one product image is required',
      'array.max': 'Maximum 10 images allowed'
    }),
  variants: Joi.array()
    .items(Joi.object({
      name: Joi.string().trim().max(100).required(),
      options: Joi.array().items(Joi.string().trim().max(100)).min(1).required()
    }))
    .max(3)
    .optional(),
  weight: Joi.number()
    .positive()
    .max(99999)
    .optional(),
  weightUnit: Joi.string()
    .valid('kg', 'g', 'lb', 'oz')
    .default('kg'),
  dimensions: Joi.object({
    length: Joi.number().positive().max(9999).optional(),
    width: Joi.number().positive().max(9999).optional(),
    height: Joi.number().positive().max(9999).optional(),
    unit: Joi.string().valid('cm', 'in', 'm').default('cm')
  }).optional(),
  status: Joi.string()
    .valid('active', 'draft', 'archived')
    .default('active'),
  visibility: Joi.string()
    .valid('visible', 'hidden')
    .default('visible'),
  seoTitle: Joi.string()
    .trim()
    .max(70)
    .optional(),
  seoDescription: Joi.string()
    .trim()
    .max(160)
    .optional(),
  customFields: Joi.object()
    .pattern(Joi.string(), Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean()))
    .optional()
});

// Update product validation
export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).optional(),
  description: Joi.string().trim().max(5000).allow('').optional(),
  price: Joi.number().positive().precision(2).max(99999999.99).optional(),
  compareAtPrice: Joi.number().positive().precision(2).max(99999999.99).optional(),
  costPerItem: Joi.number().positive().precision(2).max(99999999.99).optional(),
  sku: Joi.string().trim().uppercase().max(100).optional(),
  barcode: Joi.string().trim().max(100).optional(),
  trackQuantity: Joi.boolean().optional(),
  quantity: Joi.number().integer().min(0).max(999999).optional(),
  category: Joi.string().pattern(objectIdPattern).optional(),
  subcategory: Joi.string().pattern(objectIdPattern).optional(),
  brand: Joi.string().trim().max(100).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20).optional(),
  images: Joi.array()
    .items(Joi.object({
      url: Joi.string().uri().required(),
      thumbnailUrl: Joi.string().uri().optional(),
      altText: Joi.string().trim().max(200).optional(),
      sortOrder: Joi.number().integer().min(0).default(0),
      isMain: Joi.boolean().default(false)
    }))
    .min(1)
    .max(10)
    .optional(),
  variants: Joi.array().items(Joi.object({
    name: Joi.string().trim().max(100).required(),
    options: Joi.array().items(Joi.string().trim().max(100)).min(1).required()
  })).max(3).optional(),
  weight: Joi.number().positive().max(99999).optional(),
  weightUnit: Joi.string().valid('kg', 'g', 'lb', 'oz').optional(),
  dimensions: Joi.object({
    length: Joi.number().positive().max(9999).optional(),
    width: Joi.number().positive().max(9999).optional(),
    height: Joi.number().positive().max(9999).optional(),
    unit: Joi.string().valid('cm', 'in', 'm').optional()
  }).optional(),
  status: Joi.string().valid('active', 'draft', 'archived').optional(),
  visibility: Joi.string().valid('visible', 'hidden').optional(),
  seoTitle: Joi.string().trim().max(70).optional(),
  seoDescription: Joi.string().trim().max(160).optional(),
  customFields: Joi.object().pattern(Joi.string(), Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean())).optional()
}).min(1);

// Query products validation
export const queryProductsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('name', '-name', 'price', '-price', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt').default('-createdAt'),
  search: Joi.string().trim().max(200).optional(),
  category: Joi.string().pattern(objectIdPattern).optional(),
  subcategory: Joi.string().pattern(objectIdPattern).optional(),
  brand: Joi.string().trim().max(100).optional(),
  minPrice: Joi.number().positive().precision(2).optional(),
  maxPrice: Joi.number().positive().precision(2).optional(),
  status: Joi.string().valid('active', 'draft', 'archived').optional(),
  visibility: Joi.string().valid('visible', 'hidden').optional(),
  inStock: Joi.boolean().optional(),
  tags: Joi.alternatives(
    Joi.string().trim(),
    Joi.array().items(Joi.string().trim())
  ).optional()
});

// Product ID validation
export const productIdSchema = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID format',
      'any.required': 'Product ID is required'
    })
});

// Bulk update validation
export const bulkUpdateSchema = Joi.object({
  productIds: Joi.array()
    .items(Joi.string().pattern(objectIdPattern))
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one product ID is required',
      'array.max': 'Cannot update more than 100 products at once'
    }),
  updates: Joi.object({
    status: Joi.string().valid('active', 'draft', 'archived').optional(),
    visibility: Joi.string().valid('visible', 'hidden').optional(),
    category: Joi.string().pattern(objectIdPattern).optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(20).optional()
  }).min(1).required()
});
