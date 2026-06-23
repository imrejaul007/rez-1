/**
 * Variant Helper Utilities
 * Functions for handling product variants throughout the application
 */

import { ProductItem } from '@/types/homepage.types';
import { VariantSelection } from '@/components/cart/ProductVariantModal';

/**
 * Check if a product has variants
 * @param product - The product to check
 * @returns boolean - True if product has variants that need selection
 */
export function hasVariants(product: ProductItem): boolean {
  // Check if product has variants property (from API or extended types)
  const hasVariantsProperty = !!(product as any).variants;

  // Check if product has variant requirements
  const hasVariantRequirements = !!(product as any).requiresVariantSelection;

  // Check if product has size/color/attributes
  const hasAttributes = !!(
    (product as any).sizes ||
    (product as any).colors ||
    (product as any).attributes
  );

  return hasVariantsProperty || hasVariantRequirements || hasAttributes;
}

/**
 * Format variant selection for display
 * @param variant - The selected variant
 * @returns string - Formatted variant string for display
 */
export function formatVariantDisplay(variant: VariantSelection): string {
  const parts: string[] = [];

  if (variant.size) {
    parts.push(`Size: ${variant.size}`);
  }

  if (variant.color) {
    parts.push(`Color: ${variant.color}`);
  }

  // Add any other custom attributes
  const customKeys = Object.keys(variant).filter(
    (key) =>
      !['variantId', 'size', 'color', 'sku', 'price', 'stock'].includes(key)
  );

  for (const key of customKeys) {
    const value = variant[key];
    if (value && typeof value === 'string') {
      parts.push(`${key}: ${value}`);
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'Default';
}

/**
 * Generate a unique SKU for a product and variant combination
 * @param product - The base product
 * @param variant - The selected variant
 * @returns string - Unique SKU string
 */
export function generateVariantSku(
  product: ProductItem,
  variant: VariantSelection
): string {
  // If variant already has SKU, use it
  if (variant.sku) {
    return variant.sku;
  }

  // Generate SKU from product ID and variant attributes
  const baseSku = product.id.substring(0, 6).toUpperCase();
  const sizeCode = variant.size ? variant.size.substring(0, 2).toUpperCase() : 'NA';
  const colorCode = variant.color
    ? variant.color.substring(0, 3).toUpperCase()
    : 'NA';

  // Variant ID from variant selection or timestamp
  const variantId = variant.variantId || Math.random().toString(36).substring(7).toUpperCase();

  return `${baseSku}-${sizeCode}-${colorCode}-${variantId}`;
}

/**
 * Create a cart item from product and variant selection
 * @param product - The product
 * @param variant - The selected variant
 * @param quantity - Quantity to add
 * @returns object - Cart item object ready for API/storage
 */
export function createCartItemFromVariant(
  product: ProductItem,
  variant: VariantSelection,
  quantity: number = 1
) {
  const sku = generateVariantSku(product, variant);
  const price = variant.price || product.price.current;

  return {
    id: sku,
    productId: product.id,
    name: product.name,
    brand: product.brand,
    image: product.image,
    originalPrice: product.price.original || product.price.current,
    discountedPrice: price,
    quantity,
    variant: {
      variantId: variant.variantId,
      size: variant.size,
      color: variant.color,
      sku: sku,
      ...variant,
    },
    selected: true,
    addedAt: new Date().toISOString(),
    category: product.category,
  };
}

/**
 * Check if two variants are identical
 * @param variant1 - First variant
 * @param variant2 - Second variant
 * @returns boolean - True if variants match
 */
export function variantsMatch(
  variant1: VariantSelection,
  variant2: VariantSelection
): boolean {
  const keys = new Set([
    ...Object.keys(variant1),
    ...Object.keys(variant2),
  ]);

  for (const key of keys) {
    if (
      key !== 'stock' && // Stock can change
      key !== 'price' && // Price might vary
      variant1[key] !== variant2[key]
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Merge variant data with existing cart item
 * @param existingItem - Item already in cart
 * @param newVariant - New variant selection
 * @param newQuantity - Quantity to add
 * @returns object - Updated cart item
 */
export function mergeVariantWithCartItem(
  existingItem: any,
  newVariant: VariantSelection,
  newQuantity: number = 1
) {
  const newSku = generateVariantSku(
    {
      id: existingItem.productId,
      title: existingItem.name,
      name: existingItem.name,
      brand: existingItem.brand,
      image: existingItem.image,
      price: {
        current: existingItem.discountedPrice || existingItem.originalPrice,
        original: existingItem.originalPrice,
        currency: 'INR',
      },
      category: existingItem.category,
      type: 'product',
      availabilityStatus: 'in_stock',
      tags: [],
    } as ProductItem,
    newVariant
  );

  // Check if it's a different variant
  const isDifferentVariant = !variantsMatch(
    existingItem.variant || {},
    newVariant
  );

  if (isDifferentVariant) {
    // Return as separate item
    return null;
  }

  // Same variant, update quantity
  return {
    ...existingItem,
    quantity: existingItem.quantity + newQuantity,
    variant: {
      ...existingItem.variant,
      ...newVariant,
    },
  };
}

/**
 * Get variant display name for product
 * @param product - The product
 * @returns string - Display name for variants feature
 */
export function getVariantDisplayName(product: ProductItem): string {
  // Check for specific variant types
  if ((product as any).sizes && !(product as any).colors) {
    return 'Select Size';
  }

  if ((product as any).colors && !(product as any).sizes) {
    return 'Select Color';
  }

  if ((product as any).sizes && (product as any).colors) {
    return 'Select Size & Color';
  }

  return 'Select Options';
}

/**
 * Validate variant selection is complete
 * @param variant - The variant selection
 * @param requiredAttributes - Array of required attribute keys
 * @returns boolean - True if all required attributes are selected
 */
export function isVariantSelectionComplete(
  variant: VariantSelection,
  requiredAttributes: string[] = ['size', 'color']
): boolean {
  return requiredAttributes.every(
    (attr) => variant[attr] !== undefined && variant[attr] !== null && variant[attr] !== ''
  );
}

/**
 * Extract variant attributes from product metadata
 * @param product - The product
 * @returns object - Available variant attributes and their values
 */
export function extractVariantAttributes(product: ProductItem) {
  return {
    sizes: (product as any).sizes || [],
    colors: (product as any).colors || [],
    attributes: (product as any).attributes || {},
    requiresVariantSelection: (product as any).requiresVariantSelection || false,
    variants: (product as any).variants || [],
  };
}

/**
 * Get price adjustment for variant
 * @param basePrice - Base product price
 * @param variant - Selected variant
 * @returns number - Adjusted price or base price
 */
export function getVariantPrice(
  basePrice: number,
  variant: VariantSelection | null
): number {
  if (!variant || !variant.price) {
    return basePrice;
  }

  return variant.price;
}

/**
 * Check if variant stock is available
 * @param variant - Selected variant
 * @param minQuantity - Minimum required quantity
 * @returns boolean - True if enough stock available
 */
export function isVariantInStock(
  variant: VariantSelection,
  minQuantity: number = 1
): boolean {
  if (variant.stock === undefined || variant.stock === null) {
    return true; // Assume available if no stock info
  }

  return variant.stock >= minQuantity;
}
