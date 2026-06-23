import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import { validateParams, validateRequest } from '../middleware/merchantvalidation';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const productIdSchema = Joi.object({
  id: Joi.string().required()
});

const variantIdSchema = Joi.object({
  id: Joi.string().required(),
  variantId: Joi.string().required()
});

const createVariantSchema = Joi.object({
  type: Joi.string().required().min(2).max(50),
  value: Joi.string().required().min(1).max(50),
  attributes: Joi.object().pattern(Joi.string(), Joi.string()),
  price: Joi.number().min(0),
  compareAtPrice: Joi.number().min(0),
  stock: Joi.number().required().min(0),
  sku: Joi.string().max(50),
  images: Joi.array().items(Joi.string()),
  barcode: Joi.string().max(50),
  weight: Joi.number().min(0),
  isAvailable: Joi.boolean().default(true)
});

const updateVariantSchema = createVariantSchema.fork(
  ['type', 'value', 'stock'],
  (schema) => schema.optional()
);

// Helper function to generate variant SKU
const generateVariantSKU = (productSKU: string, attributes: Map<string, string> | undefined, type: string, value: string): string => {
  if (attributes && attributes.size > 0) {
    const attrString = Array.from(attributes.entries())
      .map(([k, v]) => `${v}`)
      .join('-');
    return `${productSKU}-${attrString}`.toUpperCase();
  }
  return `${productSKU}-${type}-${value}`.toUpperCase().replace(/\s+/g, '-');
};

// @route   GET /api/merchant/products/:id/variants
// @desc    Get all variants for a product
// @access  Private
router.get('/:id/variants', validateParams(productIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const productId = req.params.id;

    // Verify product belongs to merchant's store
    const store = await Store.findOne({ merchantId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      store: store._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const variants = product.inventory.variants || [];

    return res.json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        variants,
        totalVariants: variants.length
      }
    });

  } catch (error: any) {
    logger.error('Get variants error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch variants',
      error: error.message
    });
  }
});

// @route   POST /api/merchant/products/:id/variants
// @desc    Add a new variant to a product
// @access  Private
router.post(
  '/:id/variants',
  validateParams(productIdSchema),
  validateRequest(createVariantSchema),
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId!;
      const productId = req.params.id;
      const variantData = req.body;

      // Verify product belongs to merchant's store
      const store = await Store.findOne({ merchantId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      const product = await Product.findOne({
        _id: productId,
        store: store._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Generate variant ID
      const variantId = uuidv4();

      // Generate variant SKU if not provided
      const variantSKU = variantData.sku || generateVariantSKU(
        product.sku,
        variantData.attributes,
        variantData.type,
        variantData.value
      );

      // Check if variant SKU already exists
      const existingVariant = product.inventory.variants?.find(
        (v: any) => v.sku === variantSKU
      );

      if (existingVariant) {
        return res.status(400).json({
          success: false,
          message: 'Variant with this SKU already exists'
        });
      }

      // Create new variant
      const newVariant = {
        variantId,
        type: variantData.type,
        value: variantData.value,
        attributes: variantData.attributes,
        price: variantData.price,
        compareAtPrice: variantData.compareAtPrice,
        stock: variantData.stock,
        sku: variantSKU,
        images: variantData.images || [],
        barcode: variantData.barcode,
        weight: variantData.weight,
        isAvailable: variantData.isAvailable !== false && variantData.stock > 0
      };

      // Add variant to product
      if (!product.inventory.variants) {
        product.inventory.variants = [];
      }
      product.inventory.variants.push(newVariant as any);

      // Update product
      await product.save();

      // Send real-time notification
      if (global.io) {
        global.io.to(`merchant-${merchantId}`).emit('variant_created', {
          productId: product._id,
          variantId,
          timestamp: new Date()
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Variant created successfully',
        data: {
          variant: newVariant
        }
      });

    } catch (error: any) {
      logger.error('Create variant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create variant',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/merchant/products/:id/variants/:variantId
// @desc    Update a variant
// @access  Private
router.put(
  '/:id/variants/:variantId',
  validateParams(variantIdSchema),
  validateRequest(updateVariantSchema),
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId!;
      const { id: productId, variantId } = req.params;
      const variantData = req.body;

      // Verify product belongs to merchant's store
      const store = await Store.findOne({ merchantId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      const product = await Product.findOne({
        _id: productId,
        store: store._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Find variant
      const variantIndex = product.inventory.variants?.findIndex(
        (v: any) => v.variantId === variantId
      );

      if (variantIndex === -1 || variantIndex === undefined) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }

      // Update variant
      const variant = product.inventory.variants![variantIndex] as any;

      if (variantData.type) variant.type = variantData.type;
      if (variantData.value) variant.value = variantData.value;
      if (variantData.attributes) variant.attributes = variantData.attributes;
      if (variantData.price !== undefined) variant.price = variantData.price;
      if (variantData.compareAtPrice !== undefined) variant.compareAtPrice = variantData.compareAtPrice;
      if (variantData.stock !== undefined) {
        variant.stock = variantData.stock;
        variant.isAvailable = variantData.stock > 0;
      }
      if (variantData.images) variant.images = variantData.images;
      if (variantData.barcode) variant.barcode = variantData.barcode;
      if (variantData.weight !== undefined) variant.weight = variantData.weight;
      if (variantData.isAvailable !== undefined) variant.isAvailable = variantData.isAvailable;

      // Update SKU if type or value changed
      if (variantData.type || variantData.value) {
        variant.sku = generateVariantSKU(
          product.sku,
          variant.attributes,
          variant.type,
          variant.value
        );
      }

      // Save product
      await product.save();

      // Send real-time notification
      if (global.io) {
        global.io.to(`merchant-${merchantId}`).emit('variant_updated', {
          productId: product._id,
          variantId,
          timestamp: new Date()
        });
      }

      return res.json({
        success: true,
        message: 'Variant updated successfully',
        data: {
          variant
        }
      });

    } catch (error: any) {
      logger.error('Update variant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update variant',
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/merchant/products/:id/variants/:variantId
// @desc    Delete a variant
// @access  Private
router.delete(
  '/:id/variants/:variantId',
  validateParams(variantIdSchema),
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId!;
      const { id: productId, variantId } = req.params;

      // Verify product belongs to merchant's store
      const store = await Store.findOne({ merchantId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      const product = await Product.findOne({
        _id: productId,
        store: store._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Find and remove variant
      const variantIndex = product.inventory.variants?.findIndex(
        (v: any) => v.variantId === variantId
      );

      if (variantIndex === -1 || variantIndex === undefined) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }

      const deletedVariant = product.inventory.variants![variantIndex];
      product.inventory.variants!.splice(variantIndex, 1);

      // Save product
      await product.save();

      // Send real-time notification
      if (global.io) {
        global.io.to(`merchant-${merchantId}`).emit('variant_deleted', {
          productId: product._id,
          variantId,
          timestamp: new Date()
        });
      }

      return res.json({
        success: true,
        message: 'Variant deleted successfully',
        data: {
          deletedVariant
        }
      });

    } catch (error: any) {
      logger.error('Delete variant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete variant',
        error: error.message
      });
    }
  }
);

// @route   GET /api/merchant/products/:id/variants/:variantId
// @desc    Get a specific variant
// @access  Private
router.get(
  '/:id/variants/:variantId',
  validateParams(variantIdSchema),
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId!;
      const { id: productId, variantId } = req.params;

      // Verify product belongs to merchant's store
      const store = await Store.findOne({ merchantId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      const product = await Product.findOne({
        _id: productId,
        store: store._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Find variant
      const variant = product.inventory.variants?.find(
        (v: any) => v.variantId === variantId
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found'
        });
      }

      return res.json({
        success: true,
        data: {
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          variant,
          inventory: {
            totalStock: product.inventory.stock,
            variantStock: variant.stock
          },
          pricing: {
            basePrice: product.pricing.selling,
            variantPrice: variant.price || product.pricing.selling
          }
        }
      });

    } catch (error: any) {
      logger.error('Get variant error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch variant',
        error: error.message
      });
    }
  }
);

// @route   POST /api/merchant/products/:id/variants/generate
// @desc    Generate all possible variant combinations from attributes
// @access  Private
const generateVariantsSchema = Joi.object({
  attributes: Joi.array().items(
    Joi.object({
      type: Joi.string().required().min(2).max(50),
      values: Joi.array().items(Joi.string().min(1).max(50)).required().min(1)
    })
  ).required().min(1).max(5)
});

router.post(
  '/:id/variants/generate',
  validateParams(productIdSchema),
  validateRequest(generateVariantsSchema),
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId!;
      const productId = req.params.id;
      const { attributes } = req.body;

      // Verify product belongs to merchant's store
      const store = await Store.findOne({ merchantId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      const product = await Product.findOne({
        _id: productId,
        store: store._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Generate all combinations using Cartesian product
      const generateCombinations = (attrs: any[]): any[] => {
        if (attrs.length === 0) return [[]];

        const [first, ...rest] = attrs;
        const restCombinations = generateCombinations(rest);
        const combinations: any[] = [];

        for (const value of first.values) {
          for (const combo of restCombinations) {
            combinations.push([
              { type: first.type, value },
              ...combo
            ]);
          }
        }

        return combinations;
      };

      const combinations = generateCombinations(attributes);
      const generatedVariants: any[] = [];

      // Create variant objects for each combination
      for (const combo of combinations) {
        const variantId = uuidv4();

        // Build attributes map
        const attributesMap: { [key: string]: string } = {};
        combo.forEach((attr: any) => {
          attributesMap[attr.type.toLowerCase()] = attr.value;
        });

        // Generate descriptive variant name and SKU
        const variantName = combo.map((attr: any) => attr.value).join(' / ');
        const variantSKU = generateVariantSKU(
          product.sku,
          new Map(Object.entries(attributesMap)),
          combo[0]?.type || 'variant',
          combo[0]?.value || 'default'
        );

        generatedVariants.push({
          variantId,
          type: combo[0]?.type || 'variant',
          value: variantName,
          attributes: attributesMap,
          price: product.pricing.selling, // Default to base price
          compareAtPrice: product.pricing.original,
          stock: 0, // Merchant needs to set stock
          sku: variantSKU,
          images: [], // No images by default
          isAvailable: false // Not available until stock is set
        });
      }

      // Return generated variants without saving (merchant can review first)
      return res.status(200).json({
        success: true,
        message: `Generated ${generatedVariants.length} variant combinations`,
        data: {
          productId: product._id,
          productName: product.name,
          productSKU: product.sku,
          basePrice: product.pricing.selling,
          generatedVariants,
          totalCombinations: generatedVariants.length,
          attributes: attributes.map((attr: any) => ({
            type: attr.type,
            valueCount: attr.values.length
          }))
        }
      });

    } catch (error: any) {
      logger.error('Generate variants error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate variants',
        error: error.message
      });
    }
  }
);

export default router;
