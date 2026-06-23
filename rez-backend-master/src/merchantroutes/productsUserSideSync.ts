/**
 * User-side product sync helpers (Phase 6.3)
 *
 * Extracted from the original monolithic products.ts. These functions sync
 * merchant-side product changes to the user-facing Product collection.
 * Used by productsWriteRoutes.ts (create/update/delete) and could be
 * reused by productsBulkRoutes.ts in the future.
 *
 * Functions:
 * - createUserSideProduct: when a merchant creates a product, mirror it to user-side
 * - updateUserSideProduct: when a merchant updates a product, sync the user-side
 * - deleteUserSideProduct: when a merchant deletes a product, remove the user-side copy
 */

import { Product } from "../models/Product";
import { Store } from "../models/Store";
import { Category } from "../models/Category";
import { Merchant } from "../models/Merchant";
import { logger } from "../config/logger";
import { Types } from "mongoose";

export async function createUserSideProduct(merchantProduct: any, merchantId: string): Promise<void> {
  const session = await Product.db.startSession();
  session.startTransaction();

  try {
    // Use storeId from product if available, otherwise find merchant's store (backward compatibility)
    let store;
    if (merchantProduct.storeId) {
      store = await Store.findById(merchantProduct.storeId).session(session);
      if (!store) {
        logger.error('Store not found for storeId:', merchantProduct.storeId);
        await session.abortTransaction();
        return;
      }
      // Verify store belongs to merchant
      if (store.merchantId?.toString() !== merchantId) {
        logger.error('Store does not belong to merchant:', merchantId);
        await session.abortTransaction();
        return;
      }
    } else {
      // Fallback: Find the store associated with this merchant (backward compatibility)
      store = await Store.findOne({ merchantId: merchantId }).session(session);
      if (!store) {
        logger.error('No store found for merchant:', merchantId);
        await session.abortTransaction();
        return;
      }
    }

    // Find or create the category
    // Use categoryType from product if available, otherwise default to 'general'
    const categoryType = (merchantProduct as any).categoryType || 'general';
    let category = await Category.findOne({ 
      name: merchantProduct.category,
      type: categoryType 
    }).session(session);
    
    if (!category) {
      // Check if category exists with different type
      const existingCategory = await Category.findOne({ name: merchantProduct.category }).session(session);
      if (existingCategory) {
        // Update existing category type if it's different
        existingCategory.type = categoryType as any;
        await existingCategory.save({ session });
        category = existingCategory;
      } else {
        // Create new category with the specified type
        const newCategory = await Category.create([{
          name: merchantProduct.category,
          slug: merchantProduct.category.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
          type: categoryType, // Use the category type from the product
          isActive: true
        }], { session });
        category = newCategory[0];
      }
    }

    // Create unique slug for the product
    let productSlug = merchantProduct.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    let counter = 1;
    while (await Product.findOne({ slug: productSlug }).session(session).lean()) {
      productSlug = `${merchantProduct.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}-${counter}`;
      counter++;
    }

    // Extract image URLs from image objects
    const imageUrls = merchantProduct.images?.map((img: any) => {
      // Handle both object format {url, ...} and string format
      return typeof img === 'string' ? img : img.url;
    }).filter(Boolean) || [];

    // Extract video URLs from video objects
    const videoUrls = merchantProduct.videos?.map((video: any) => {
      // Handle both object format {url, ...} and string format
      return typeof video === 'string' ? video : video.url;
    }).filter(Boolean) || [];

    logger.info(`🔄 Syncing product "${merchantProduct.name}" to user-side:`);
    logger.info(`   - Images: ${imageUrls.length} image(s)`);
    logger.info(`   - Videos: ${videoUrls.length} video(s)`);
    logger.info(`   - Store: ${store.name} (${store._id})`);
    logger.info(`   - Category: ${category.name} (${category._id})`);

    // Sync relatedProducts - map merchant product IDs to user product IDs
    let relatedProductIds: Types.ObjectId[] = [];
    if (merchantProduct.relatedProducts && merchantProduct.relatedProducts.length > 0) {
      logger.info(`   - Syncing ${merchantProduct.relatedProducts.length} related products...`);

      // Find corresponding user products by SKU (merchant products should have been synced)
      const relatedMerchantProducts = await Product.find({
        _id: { $in: merchantProduct.relatedProducts }
      }).select('sku').session(session).lean();

      if (relatedMerchantProducts.length > 0) {
        const relatedSkus = relatedMerchantProducts.map(p => p.sku);
        const relatedUserProducts = await Product.find({
          sku: { $in: relatedSkus }
        }).select('_id').session(session).lean();

        relatedProductIds = relatedUserProducts.map((p: any) => p._id);
        logger.info(`   - Found ${relatedProductIds.length} user-side related products`);
      }
    }

    // Sync frequentlyBoughtWith - map merchant product IDs to user product IDs
    let frequentlyBoughtWithData: Array<{ productId: Types.ObjectId; purchaseCount: number }> = [];
    if (merchantProduct.frequentlyBoughtWith && merchantProduct.frequentlyBoughtWith.length > 0) {
      logger.info(`   - Syncing ${merchantProduct.frequentlyBoughtWith.length} frequently bought with products...`);

      // Extract product IDs from frequentlyBoughtWith
      const merchantProductIds = merchantProduct.frequentlyBoughtWith.map((item: any) => item.product);

      // Find corresponding merchant products to get their SKUs
      const relatedMerchantProducts = await Product.find({
        _id: { $in: merchantProductIds }
      }).select('sku').session(session).lean();

      if (relatedMerchantProducts.length > 0) {
        const relatedSkus = relatedMerchantProducts.map(p => p.sku);
        const relatedUserProducts = await Product.find({
          sku: { $in: relatedSkus }
        }).select('_id sku').session(session).lean();

        // Create a SKU to user product ID map
        const skuToUserProductId = new Map();
        relatedUserProducts.forEach(p => {
          skuToUserProductId.set(p.sku, p._id);
        });

        // Map merchant product IDs to user product IDs with purchase counts
        for (const item of merchantProduct.frequentlyBoughtWith) {
          const merchantProd = relatedMerchantProducts.find((p: any) => p._id.toString() === item.product.toString());
          if (merchantProd && skuToUserProductId.has(merchantProd.sku)) {
            frequentlyBoughtWithData.push({
              productId: skuToUserProductId.get(merchantProd.sku),
              purchaseCount: item.purchaseCount || 0
            });
          }
        }
        logger.info(`   - Mapped ${frequentlyBoughtWithData.length} frequently bought with products`);
      }
    }

    // Sync variants if available
    let variantsData: any[] = [];
    if (merchantProduct.variants && merchantProduct.variants.length > 0) {
      logger.info(`   - Syncing ${merchantProduct.variants.length} variants...`);
      variantsData = merchantProduct.variants.map((variant: any) => ({
        variantId: variant._id?.toString() || variant.variantId || `variant-${Date.now()}-${Math.random()}`,
        type: variant.option || variant.type || 'option',
        value: variant.value,
        attributes: variant.attributes || {},
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        stock: variant.stock || 0,
        sku: variant.sku,
        images: variant.images || [],
        barcode: variant.barcode,
        weight: variant.weight,
        isAvailable: variant.isAvailable !== undefined ? variant.isAvailable : (variant.stock || 0) > 0
      }));
    }

    // Create the user-side product
    const userProduct = new Product({
      name: merchantProduct.name,
      slug: productSlug,
      description: merchantProduct.description,
      shortDescription: merchantProduct.shortDescription,
      category: category._id,
      store: store._id,
      brand: merchantProduct.brand,
      sku: merchantProduct.sku,
      barcode: merchantProduct.barcode,
      images: imageUrls,
      videos: videoUrls,
      pricing: {
        original: merchantProduct.compareAtPrice || merchantProduct.price,
        selling: merchantProduct.price,
        currency: merchantProduct.currency || 'INR',
        discount: merchantProduct.compareAtPrice ?
          Math.round(((merchantProduct.compareAtPrice - merchantProduct.price) / merchantProduct.compareAtPrice) * 100) : 0
      },
      inventory: {
        stock: merchantProduct.inventory.stock,
        isAvailable: merchantProduct.inventory.stock > 0,
        lowStockThreshold: merchantProduct.inventory.lowStockThreshold || 5,
        unlimited: false,
        variants: variantsData,
        reservedStock: merchantProduct.inventory.reservedStock || 0 // Sync reserved stock
      },
      ratings: {
        average: 0,
        count: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      },
      specifications: [],
      tags: merchantProduct.tags || [],
      seo: {
        title: merchantProduct.metaTitle || merchantProduct.name,
        description: merchantProduct.metaDescription || merchantProduct.shortDescription,
        keywords: merchantProduct.searchKeywords || []
      },
      analytics: {
        views: 0,
        purchases: 0,
        conversions: 0,
        wishlistAdds: 0,
        shareCount: 0,
        returnRate: 0,
        avgRating: 0
      },
      // Map cashback from MerchantProduct to Product model format
      cashback: merchantProduct.cashback ? {
        percentage: merchantProduct.cashback.percentage || 0,
        maxAmount: merchantProduct.cashback.maxAmount,
        minPurchase: undefined, // Not available in MerchantProduct
        validUntil: undefined, // Not available in MerchantProduct
        terms: merchantProduct.cashback.conditions?.join('\n') || undefined, // Join conditions as terms
        isActive: merchantProduct.cashback.isActive ?? true, // Sync isActive flag
        conditions: merchantProduct.cashback.conditions || [] // Sync conditions array
      } : undefined,
      // Map deliveryInfo if available
      deliveryInfo: merchantProduct.deliveryInfo ? {
        estimatedDays: merchantProduct.deliveryInfo.estimatedDays,
        freeShippingThreshold: merchantProduct.deliveryInfo.freeShippingThreshold,
        expressAvailable: merchantProduct.deliveryInfo.expressAvailable,
        standardDeliveryTime: merchantProduct.deliveryInfo.standardDeliveryTime,
        expressDeliveryTime: merchantProduct.deliveryInfo.expressDeliveryTime,
        deliveryPartner: merchantProduct.deliveryInfo.deliveryPartner
      } : undefined,
      // Map relatedProducts
      relatedProducts: relatedProductIds.length > 0 ? relatedProductIds : undefined,
      // Map frequentlyBoughtWith
      frequentlyBoughtWith: frequentlyBoughtWithData.length > 0 ? frequentlyBoughtWithData : undefined,
      isActive: merchantProduct.status === 'active',
      isFeatured: merchantProduct.visibility === 'featured',
      visibility: merchantProduct.visibility || 'public', // Sync visibility status
      isDigital: false,
      weight: merchantProduct.weight,
      dimensions: merchantProduct.dimensions ? {
        length: merchantProduct.dimensions.length,
        width: merchantProduct.dimensions.width,
        height: merchantProduct.dimensions.height,
        unit: merchantProduct.dimensions.unit
      } : undefined,
      productType: 'product'
    });

    await userProduct.save({ session });
    await session.commitTransaction();

    logger.info(`✅ Successfully synced product "${merchantProduct.name}" to user-side`);
    logger.info(`   - User Product ID: ${userProduct._id}`);
    logger.info(`   - Images synced: ${imageUrls.length}`);
    logger.info(`   - Videos synced: ${videoUrls.length}`);

    // Emit Socket.IO event after successful sync
    if (global.io) {
      global.io.emit('product_synced', {
        action: 'created',
        productId: userProduct._id,
        productName: userProduct.name,
        merchantId: merchantId,
        timestamp: new Date()
      });
    }

  } catch (error) {
    await session.abortTransaction();
    logger.error('Error creating user-side product:', error);
    // Don't throw error to avoid breaking merchant product creation
  } finally {
    session.endSession();
  }
}


export async function updateUserSideProduct(merchantProduct: any, merchantId: string): Promise<void> {
  const session = await Product.db.startSession();
  session.startTransaction();

  try {
    // Find the corresponding user-side product by SKU
    const userProduct = await Product.findOne({ sku: merchantProduct.sku }).session(session);
    if (!userProduct) {
      await session.abortTransaction();
      logger.info('No corresponding user-side product found, creating new one');
      await createUserSideProduct(merchantProduct, merchantId);
      return;
    }

    // Update the user-side product with new data
    const updates: any = {
      name: merchantProduct.name,
      description: merchantProduct.description,
      shortDescription: merchantProduct.shortDescription,
      brand: merchantProduct.brand,
      'pricing.original': merchantProduct.compareAtPrice || merchantProduct.price,
      'pricing.selling': merchantProduct.price,
      'pricing.currency': merchantProduct.currency || 'INR',
      'inventory.stock': merchantProduct.inventory.stock,
      'inventory.isAvailable': merchantProduct.inventory.stock > 0,
      'inventory.lowStockThreshold': merchantProduct.inventory.lowStockThreshold || 5,
      'inventory.reservedStock': merchantProduct.inventory.reservedStock || 0, // Sync reserved stock
      tags: merchantProduct.tags || [],
      isActive: merchantProduct.status === 'active',
      isFeatured: merchantProduct.visibility === 'featured',
      visibility: merchantProduct.visibility || 'public', // Sync visibility status
      weight: merchantProduct.weight,
      updatedAt: new Date()
    };

    // Update cashback if provided
    if (merchantProduct.cashback) {
      updates.cashback = {
        percentage: merchantProduct.cashback.percentage || 0,
        maxAmount: merchantProduct.cashback.maxAmount,
        minPurchase: undefined, // Not available in MerchantProduct
        validUntil: undefined, // Not available in MerchantProduct
        terms: merchantProduct.cashback.conditions?.join('\n') || undefined, // Join conditions as terms
        isActive: merchantProduct.cashback.isActive ?? true, // Sync isActive flag
        conditions: merchantProduct.cashback.conditions || [] // Sync conditions array
      };
    }

    // Update deliveryInfo if provided
    if (merchantProduct.deliveryInfo) {
      updates.deliveryInfo = {
        estimatedDays: merchantProduct.deliveryInfo.estimatedDays,
        freeShippingThreshold: merchantProduct.deliveryInfo.freeShippingThreshold,
        expressAvailable: merchantProduct.deliveryInfo.expressAvailable,
        standardDeliveryTime: merchantProduct.deliveryInfo.standardDeliveryTime,
        expressDeliveryTime: merchantProduct.deliveryInfo.expressDeliveryTime,
        deliveryPartner: merchantProduct.deliveryInfo.deliveryPartner
      };
    }

    // Update discount percentage
    if (merchantProduct.compareAtPrice) {
      updates['pricing.discount'] = Math.round(((merchantProduct.compareAtPrice - merchantProduct.price) / merchantProduct.compareAtPrice) * 100);
    }

    // Update images if provided
    if (merchantProduct.images && merchantProduct.images.length > 0) {
      updates.images = merchantProduct.images.map((img: any) => {
        // Handle both object format {url, ...} and string format
        return typeof img === 'string' ? img : img.url;
      }).filter(Boolean);
    }

    // Update videos if provided
    if (merchantProduct.videos && merchantProduct.videos.length > 0) {
      updates.videos = merchantProduct.videos.map((video: any) => {
        // Handle both object format {url, ...} and string format
        return typeof video === 'string' ? video : video.url;
      }).filter(Boolean);
    }

    // Update dimensions if provided
    if (merchantProduct.dimensions) {
      updates.dimensions = {
        length: merchantProduct.dimensions.length,
        width: merchantProduct.dimensions.width,
        height: merchantProduct.dimensions.height,
        unit: merchantProduct.dimensions.unit
      };
    }

    // Update relatedProducts - map merchant product IDs to user product IDs
    if (merchantProduct.relatedProducts !== undefined) {
      if (merchantProduct.relatedProducts && merchantProduct.relatedProducts.length > 0) {
        logger.info(`   - Syncing ${merchantProduct.relatedProducts.length} related products...`);

        // Find corresponding user products by SKU
        const relatedMerchantProducts = await Product.find({
          _id: { $in: merchantProduct.relatedProducts }
        }).select('sku').session(session).lean();

        if (relatedMerchantProducts.length > 0) {
          const relatedSkus = relatedMerchantProducts.map(p => p.sku);
          const relatedUserProducts = await Product.find({
            sku: { $in: relatedSkus }
          }).select('_id').session(session).lean();

          updates.relatedProducts = relatedUserProducts.map(p => p._id);
          logger.info(`   - Updated ${updates.relatedProducts.length} related products`);
        } else {
          updates.relatedProducts = [];
        }
      } else {
        updates.relatedProducts = [];
      }
    }

    // Update frequentlyBoughtWith - map merchant product IDs to user product IDs
    if (merchantProduct.frequentlyBoughtWith !== undefined) {
      if (merchantProduct.frequentlyBoughtWith && merchantProduct.frequentlyBoughtWith.length > 0) {
        logger.info(`   - Syncing ${merchantProduct.frequentlyBoughtWith.length} frequently bought with products...`);

        // Extract product IDs
        const merchantProductIds = merchantProduct.frequentlyBoughtWith.map((item: any) => item.product);

        // Find corresponding merchant products to get their SKUs
        const relatedMerchantProducts = await Product.find({
          _id: { $in: merchantProductIds }
        }).select('sku').session(session).lean();

        if (relatedMerchantProducts.length > 0) {
          const relatedSkus = relatedMerchantProducts.map(p => p.sku);
          const relatedUserProducts = await Product.find({
            sku: { $in: relatedSkus }
          }).select('_id sku').session(session).lean();

          // Create a SKU to user product ID map
          const skuToUserProductId = new Map();
          relatedUserProducts.forEach(p => {
            skuToUserProductId.set(p.sku, p._id);
          });

          // Map merchant product IDs to user product IDs with purchase counts
          const frequentlyBoughtWithData: Array<{ productId: Types.ObjectId; purchaseCount: number }> = [];
          for (const item of merchantProduct.frequentlyBoughtWith) {
            const merchantProd = relatedMerchantProducts.find((p: any) => p._id.toString() === item.product.toString());
            if (merchantProd && skuToUserProductId.has(merchantProd.sku)) {
              frequentlyBoughtWithData.push({
                productId: skuToUserProductId.get(merchantProd.sku),
                purchaseCount: item.purchaseCount || 0
              });
            }
          }

          updates.frequentlyBoughtWith = frequentlyBoughtWithData;
          logger.info(`   - Updated ${frequentlyBoughtWithData.length} frequently bought with products`);
        } else {
          updates.frequentlyBoughtWith = [];
        }
      } else {
        updates.frequentlyBoughtWith = [];
      }
    }

    // Update variants if provided
    if (merchantProduct.variants !== undefined) {
      if (merchantProduct.variants && merchantProduct.variants.length > 0) {
        logger.info(`   - Syncing ${merchantProduct.variants.length} variants...`);
        const variantsData = merchantProduct.variants.map((variant: any) => ({
          variantId: variant._id?.toString() || variant.variantId || `variant-${Date.now()}-${Math.random()}`,
          type: variant.option || variant.type || 'option',
          value: variant.value,
          attributes: variant.attributes || {},
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          stock: variant.stock || 0,
          sku: variant.sku,
          images: variant.images || [],
          barcode: variant.barcode,
          weight: variant.weight,
          isAvailable: variant.isAvailable !== undefined ? variant.isAvailable : (variant.stock || 0) > 0
        }));

        updates['inventory.variants'] = variantsData;
        logger.info(`   - Updated ${variantsData.length} variants`);
      } else {
        updates['inventory.variants'] = [];
      }
    }

    await Product.updateOne({ _id: userProduct._id }, updates, { session });
    await session.commitTransaction();

    logger.info(`✅ Successfully synced product update "${merchantProduct.name}" to user-side`);
    logger.info(`   - User Product ID: ${userProduct._id}`);
    if (updates.images) {
      logger.info(`   - Images synced: ${updates.images.length}`);
    }
    if (updates.videos) {
      logger.info(`   - Videos synced: ${updates.videos.length}`);
    }

    // Emit Socket.IO event after successful sync
    if (global.io) {
      global.io.emit('product_synced', {
        action: 'updated',
        productId: userProduct._id,
        productName: userProduct.name,
        merchantId: merchantId,
        timestamp: new Date()
      });
    }

  } catch (error) {
    await session.abortTransaction();
    logger.error('Error updating user-side product:', error);
  } finally {
    session.endSession();
  }
}


export async function deleteUserSideProduct(merchantProductId: string): Promise<void> {
  const session = await Product.db.startSession();
  session.startTransaction();

  try {
    // Find the merchant product to get its SKU
    const merchantProduct = await Product.findById(merchantProductId).session(session).lean() as any;
    if (!merchantProduct) {
      await session.abortTransaction();
      return;
    }

    // Find and delete the corresponding user-side product
    const result = await Product.deleteOne({ sku: merchantProduct.sku }, { session });
    await session.commitTransaction();

    if (result.deletedCount > 0) {
      logger.info(`📦 Deleted user-side product with SKU "${merchantProduct.sku}"`);

      // Emit Socket.IO event after successful deletion
      if (global.io) {
        global.io.emit('product_synced', {
          action: 'deleted',
          productSku: merchantProduct.sku,
          productName: merchantProduct.name,
          timestamp: new Date()
        });
      }
    }

  } catch (error) {
    await session.abortTransaction();
    logger.error('Error deleting user-side product:', error);
  } finally {
    session.endSession();
  }
}
