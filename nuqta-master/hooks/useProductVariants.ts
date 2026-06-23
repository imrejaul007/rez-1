import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IProductVariant,
  IVariantOption,
  IVariantOptionValue,
  IVariantSelectionState,
  IProcessedVariants,
  isVariantAvailable,
} from '@/types/product-variants.types';

/**
 * Hook for managing product variant selection
 *
 * Handles:
 * - Processing variants into selectable options
 * - Tracking user's attribute selections
 * - Finding matching variant based on selection
 * - Determining available options at each step
 * - Maintaining selection state
 */
interface UseProductVariantsProps {
  variants: IProductVariant[];
  onVariantChange?: (variant: IProductVariant | null) => void;
}

interface UseProductVariantsReturn {
  // State
  selectedAttributes: { [key: string]: string };
  selectedVariant: IProductVariant | null;
  options: IVariantOption[];
  isSelectionComplete: boolean;
  availableOptions: { [key: string]: string[] };

  // Actions
  selectAttribute: (attributeName: string, value: string) => void;
  clearSelection: () => void;
  setVariant: (variant: IProductVariant) => void;

  // Helpers
  getAttributeValue: (attributeName: string) => string | undefined;
  isAttributeSelected: (attributeName: string) => boolean;
  isOptionAvailable: (attributeName: string, value: string) => boolean;
}

export const useProductVariants = ({
  variants,
  onVariantChange,
}: UseProductVariantsProps): UseProductVariantsReturn => {
  // Process variants into options structure
  const processedVariants = useMemo<IProcessedVariants>(() => {
    return processVariantsToOptions(variants);
  }, [variants]);

  const { options, defaultVariant, defaultAttributes } = processedVariants;

  // Selection state
  const [selectedAttributes, setSelectedAttributes] = useState<{ [key: string]: string }>(defaultAttributes);
  const [selectedVariant, setSelectedVariant] = useState<IProductVariant | null>(defaultVariant);

  // Find available options based on current selection
  const availableOptions = useMemo<{ [key: string]: string[] }>(() => {
    return calculateAvailableOptions(variants, selectedAttributes, options);
  }, [variants, selectedAttributes, options]);

  // Check if selection is complete
  const isSelectionComplete = useMemo<boolean>(() => {
    return options.every(option => selectedAttributes[option.name] !== undefined);
  }, [options, selectedAttributes]);

  // Find matching variant when selection changes
  useEffect(() => {
    if (!isSelectionComplete) {
      setSelectedVariant(null);
      return;
    }

    const matchingVariant = findMatchingVariant(variants, selectedAttributes);
    setSelectedVariant(matchingVariant);

    if (onVariantChange) {
      onVariantChange(matchingVariant);
    }
  }, [selectedAttributes, isSelectionComplete, variants, onVariantChange]);

  /**
   * Select an attribute value
   */
  const selectAttribute = useCallback((attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value,
    }));
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedAttributes({});
    setSelectedVariant(null);
    if (onVariantChange) {
      onVariantChange(null);
    }
  }, [onVariantChange]);

  /**
   * Set variant directly (useful for external selection)
   */
  const setVariant = useCallback((variant: IProductVariant) => {
    const attributes: { [key: string]: string } = {};
    variant.attributes.forEach(attr => {
      attributes[attr.key] = attr.value;
    });
    setSelectedAttributes(attributes);
    setSelectedVariant(variant);
    if (onVariantChange) {
      onVariantChange(variant);
    }
  }, [onVariantChange]);

  /**
   * Get selected value for an attribute
   */
  const getAttributeValue = useCallback((attributeName: string): string | undefined => {
    return selectedAttributes[attributeName];
  }, [selectedAttributes]);

  /**
   * Check if an attribute is selected
   */
  const isAttributeSelected = useCallback((attributeName: string): boolean => {
    return selectedAttributes[attributeName] !== undefined;
  }, [selectedAttributes]);

  /**
   * Check if an option value is available for selection
   */
  const isOptionAvailable = useCallback((attributeName: string, value: string): boolean => {
    const available = availableOptions[attributeName] || [];
    return available.includes(value);
  }, [availableOptions]);

  return {
    // State
    selectedAttributes,
    selectedVariant,
    options,
    isSelectionComplete,
    availableOptions,

    // Actions
    selectAttribute,
    clearSelection,
    setVariant,

    // Helpers
    getAttributeValue,
    isAttributeSelected,
    isOptionAvailable,
  };
};

/**
 * Process variants into selectable options structure
 */
function processVariantsToOptions(variants: IProductVariant[]): IProcessedVariants {
  if (!variants || variants.length === 0) {
    return {
      options: [],
      defaultVariant: null,
      defaultAttributes: {},
    };
  }

  // Collect all unique attribute names
  const attributeNames = new Set<string>();
  variants.forEach(variant => {
    variant.attributes.forEach(attr => {
      attributeNames.add(attr.key);
    });
  });

  // Build options for each attribute
  const options: IVariantOption[] = [];
  attributeNames.forEach(name => {
    const values = new Map<string, IVariantOptionValue>();

    variants.forEach(variant => {
      const attr = variant.attributes.find(a => a.key === name);
      if (!attr) return;

      if (!values.has(attr.value)) {
        values.set(attr.value, {
          value: attr.value,
          displayName: attr.value,
          isAvailable: isVariantAvailable(variant),
          variants: [variant._id],
        });
      } else {
        const existing = values.get(attr.value)!;
        existing.variants.push(variant._id);
        // Update availability - if any variant with this value is available, mark as available
        if (isVariantAvailable(variant)) {
          existing.isAvailable = true;
        }
      }
    });

    options.push({
      name,
      values: Array.from(values.values()).sort((a, b) => a.value.localeCompare(b.value)),
    });
  });

  // Sort options (common pattern: Size, Color, Material, etc.)
  options.sort((a, b) => {
    const order: { [key: string]: number } = {
      Size: 1,
      Color: 2,
      Material: 3,
      Style: 4,
    };
    return (order[a.name] || 99) - (order[b.name] || 99);
  });

  // Find default variant (first available variant)
  const defaultVariant = variants.find(v => isVariantAvailable(v)) || variants[0] || null;

  // Build default attributes from default variant
  const defaultAttributes: { [key: string]: string } = {};
  if (defaultVariant) {
    defaultVariant.attributes.forEach(attr => {
      defaultAttributes[attr.key] = attr.value;
    });
  }

  return {
    options,
    defaultVariant,
    defaultAttributes,
  };
}

/**
 * Calculate available options based on current selection
 *
 * As user selects attributes, some options become unavailable
 * (no variant exists with that combination)
 */
function calculateAvailableOptions(
  variants: IProductVariant[],
  selectedAttributes: { [key: string]: string },
  options: IVariantOption[]
): { [key: string]: string[] } {
  const available: { [key: string]: string[] } = {};

  options.forEach(option => {
    const attributeName = option.name;
    const availableValues = new Set<string>();

    // For each variant, check if it matches the selected attributes (excluding current attribute)
    variants.forEach(variant => {
      if (!isVariantAvailable(variant)) return;

      // Check if variant matches all selected attributes (except the one we're calculating for)
      const matches = Object.keys(selectedAttributes).every(key => {
        if (key === attributeName) return true; // Skip current attribute
        const attr = variant.attributes.find(a => a.key === key);
        return attr && attr.value === selectedAttributes[key];
      });

      if (matches) {
        // This variant matches, so its value for this attribute is available
        const attr = variant.attributes.find(a => a.key === attributeName);
        if (attr) {
          availableValues.add(attr.value);
        }
      }
    });

    available[attributeName] = Array.from(availableValues);
  });

  return available;
}

/**
 * Find variant that matches selected attributes
 */
function findMatchingVariant(
  variants: IProductVariant[],
  selectedAttributes: { [key: string]: string }
): IProductVariant | null {
  return variants.find(variant => {
    return Object.keys(selectedAttributes).every(key => {
      const attr = variant.attributes.find(a => a.key === key);
      return attr && attr.value === selectedAttributes[key];
    });
  }) || null;
}

export default useProductVariants;
