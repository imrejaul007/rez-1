// Product Variant Type Definitions
// Complete type system for product variants, options, and attributes

/**
 * Attribute represents a single characteristic (e.g., Color: Red, Size: Large)
 */
export interface IAttribute {
  key: string;
  value: string;
}

/**
 * Inventory information for a variant
 */
export interface IVariantInventory {
  quantity: number;
  isAvailable: boolean;
  reserved?: number;
  threshold?: number;
}

/**
 * Pricing information for a variant
 */
export interface IVariantPricing {
  basePrice: number;
  salePrice?: number;
  discount?: number;
  currency: string;
}

/**
 * Product Variant - represents a specific combination of attributes
 * (e.g., Red T-Shirt in Size Large)
 */
export interface IProductVariant {
  _id: string;
  id?: string;
  sku: string;
  attributes: IAttribute[];
  pricing: IVariantPricing;
  inventory: IVariantInventory;
  images?: string[];
  isActive: boolean;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
}

/**
 * Variant Option - represents all possible values for a single attribute type
 * (e.g., Color options: Red, Blue, Green, Black)
 */
export interface IVariantOption {
  name: string; // Attribute name (e.g., "Color", "Size", "Material")
  values: IVariantOptionValue[];
}

/**
 * Variant Option Value - a single selectable value for an attribute
 */
export interface IVariantOptionValue {
  value: string; // The value (e.g., "Red", "Large", "Cotton")
  displayName?: string; // Optional display name (e.g., "Extra Large" for "XL")
  hexColor?: string; // For color swatches (e.g., "#FF0000")
  imageUrl?: string; // For visual representation
  isAvailable: boolean; // Whether this value is available for selection
  price?: number; // If this option affects price
  variants: string[]; // Array of variant IDs that have this value
}

/**
 * Selected Variant State - tracks user's current selection
 */
export interface ISelectedVariant {
  variant: IProductVariant | null;
  selectedAttributes: { [key: string]: string }; // e.g., { "Color": "Red", "Size": "Large" }
  isComplete: boolean; // Whether all required attributes are selected
}

/**
 * Variant Selector Props
 */
export interface IVariantSelectorProps {
  variants: IProductVariant[];
  selectedVariant: IProductVariant | null;
  onVariantChange: (variant: IProductVariant | null, attributes: { [key: string]: string }) => void;
  productImages: string[];
}

/**
 * Stock Status Types
 */
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'preorder';

/**
 * Availability Status
 */
export interface IAvailabilityStatus {
  status: StockStatus;
  quantity: number;
  message: string;
  canPurchase: boolean;
  maxQuantity: number;
  estimatedRestock?: Date;
}

/**
 * Variant Selection State
 */
export interface IVariantSelectionState {
  options: IVariantOption[]; // All available options
  selectedAttributes: { [key: string]: string }; // Currently selected attributes
  availableVariant: IProductVariant | null; // Matching variant (if selection is complete)
  availableOptions: { [key: string]: string[] }; // Available values for each attribute based on current selection
  isSelectionComplete: boolean; // Whether all required attributes are selected
}

/**
 * Helper function return type for variant processing
 */
export interface IProcessedVariants {
  options: IVariantOption[];
  defaultVariant: IProductVariant | null;
  defaultAttributes: { [key: string]: string };
}

/**
 * Variant comparison result
 */
export interface IVariantComparison {
  variant: IProductVariant;
  matchScore: number; // 0-1, how well it matches the selection
  missingAttributes: string[];
}

// Export utility type guards
export const isVariantAvailable = (variant: IProductVariant): boolean => {
  return variant.isActive && variant.inventory.isAvailable && variant.inventory.quantity > 0;
};

export const getStockStatus = (variant: IProductVariant, lowStockThreshold: number = 5): StockStatus => {
  if (!variant.isActive || !variant.inventory.isAvailable) {
    return 'out_of_stock';
  }

  const quantity = variant.inventory.quantity;

  if (quantity === 0) {
    return 'out_of_stock';
  } else if (quantity <= lowStockThreshold) {
    return 'low_stock';
  } else {
    return 'in_stock';
  }
};

export const getStockMessage = (status: StockStatus, quantity: number): string => {
  switch (status) {
    case 'in_stock':
      return 'In Stock';
    case 'low_stock':
      return `Only ${quantity} left in stock`;
    case 'out_of_stock':
      return 'Out of Stock';
    case 'preorder':
      return 'Available for Preorder';
    default:
      return 'Unavailable';
  }
};
