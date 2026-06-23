// @ts-nocheck
/**
 * Migration Utilities
 *
 * Helper functions to migrate existing code from old type structures
 * to the new unified type system.
 *
 * KEY MIGRATION TASKS:
 * 1. Convert _id to id throughout the codebase
 * 2. Normalize nested structures (price, rating, etc.)
 * 3. Handle backward compatibility
 */

// ============================================================================
// ID MIGRATION
// ============================================================================

/**
 * Migrate _id to id in a single object
 * Also handles nested objects
 */
export function migrateId<T extends Record<string, any>>(obj: T): T {
  if (!obj) return obj;

  const migrated = { ...obj };

  // Convert _id to id at root level
  if ('_id' in migrated && !('id' in migrated)) {
    migrated.id = migrated._id;
    delete (migrated as any)._id;
  }

  // Handle common nested objects
  if (migrated.user && typeof migrated.user === 'object') {
    migrated.user = migrateId(migrated.user);
  }

  if (migrated.store && typeof migrated.store === 'object') {
    migrated.store = migrateId(migrated.store);
  }

  if (migrated.product && typeof migrated.product === 'object') {
    migrated.product = migrateId(migrated.product);
  }

  // Handle arrays
  if (Array.isArray(migrated.items)) {
    migrated.items = migrated.items.map((item: any) =>
      typeof item === 'object' ? migrateId(item) : item
    );
  }

  if (Array.isArray(migrated.products)) {
    migrated.products = migrated.products.map((item: any) =>
      typeof item === 'object' ? migrateId(item) : item
    );
  }

  if (Array.isArray(migrated.stores)) {
    migrated.stores = migrated.stores.map((item: any) =>
      typeof item === 'object' ? migrateId(item) : item
    );
  }

  if (Array.isArray(migrated.reviews)) {
    migrated.reviews = migrated.reviews.map((item: any) =>
      typeof item === 'object' ? migrateId(item) : item
    );
  }

  if (Array.isArray(migrated.orders)) {
    migrated.orders = migrated.orders.map((item: any) =>
      typeof item === 'object' ? migrateId(item) : item
    );
  }

  return migrated;
}

/**
 * Migrate _id to id in an array of objects
 */
export function migrateIds<T extends Record<string, any>>(arr: T[]): T[] {
  if (!Array.isArray(arr)) return arr;
  return arr.map((item) => migrateId(item));
}

/**
 * Deep migrate all _id fields to id in nested structures
 */
export function deepMigrateIds<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepMigrateIds(item)) as any;
  }

  const migrated: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === '_id' && !('id' in (obj as any))) {
      migrated.id = value;
    } else {
      migrated[key] = deepMigrateIds(value);
    }
  }

  return migrated;
}

// ============================================================================
// PRICE MIGRATION
// ============================================================================

/**
 * Migrate old price formats to new ProductPrice structure
 */
export function migratePriceFormat(data: any): any {
  if (!data) return data;

  const migrated = { ...data };

  // Handle different price formats
  if (typeof migrated.price === 'number') {
    // Simple number price
    migrated.price = {
      current: migrated.price,
      currency: 'INR',
    };
  } else if (typeof migrated.price === 'string') {
    // String price (remove currency symbols and convert)
    const numericPrice = parseFloat(migrated.price.replace(/[^0-9.]/g, ''));
    migrated.price = {
      current: numericPrice,
      currency: 'INR',
      formatted: migrated.price,
    };
  } else if (migrated.price && typeof migrated.price === 'object') {
    // Ensure all required fields exist
    if (!migrated.price.current && migrated.price.selling) {
      migrated.price.current = migrated.price.selling;
    }
    if (!migrated.price.original && migrated.price.compare) {
      migrated.price.original = migrated.price.compare;
    }
    if (!migrated.price.currency) {
      migrated.price.currency = 'INR';
    }
  }

  // Migrate originalPrice to price.original
  if (migrated.originalPrice && migrated.price) {
    migrated.price.original = migrated.originalPrice;
    delete (migrated as any).originalPrice;
  }

  // Migrate sellingPrice
  if (migrated.sellingPrice && migrated.price) {
    migrated.price.current = migrated.sellingPrice;
    delete (migrated as any).sellingPrice;
  }

  // Calculate discount if needed
  if (
    migrated.price?.original &&
    migrated.price?.current &&
    !migrated.price.discount
  ) {
    const original = migrated.price.original;
    const current = migrated.price.current;
    if (current < original) {
      migrated.price.discount = Math.round(((original - current) / original) * 100);
      migrated.price.savings = original - current;
    }
  }

  return migrated;
}

// ============================================================================
// RATING MIGRATION
// ============================================================================

/**
 * Migrate old rating formats to new ProductRating/StoreRating structure
 */
export function migrateRatingFormat(data: any): any {
  if (!data) return data;

  const migrated = { ...data };

  // Handle different rating formats
  if (typeof migrated.rating === 'number') {
    // Simple number rating
    migrated.rating = {
      value: migrated.rating,
      count: migrated.reviewCount || migrated.totalReviews || 0,
      maxValue: 5,
    };
  } else if (migrated.rating && typeof migrated.rating === 'object') {
    // Ensure standardized field names
    if (migrated.rating.average && !migrated.rating.value) {
      migrated.rating.value = migrated.rating.average;
      delete (migrated.rating as any).average;
    }
    if (!migrated.rating.maxValue) {
      migrated.rating.maxValue = 5;
    }
  }

  // Migrate standalone rating fields
  if (migrated.averageRating && !migrated.rating) {
    migrated.rating = {
      value: migrated.averageRating,
      count: migrated.reviewCount || migrated.totalReviews || 0,
      maxValue: 5,
    };
    delete (migrated as any).averageRating;
  }

  // Migrate rating distribution
  if (migrated.ratingDistribution && migrated.rating) {
    migrated.rating.breakdown = migrated.ratingDistribution;
    delete (migrated as any).ratingDistribution;
  }

  return migrated;
}

// ============================================================================
// IMAGE MIGRATION
// ============================================================================

/**
 * Migrate old image formats to new ProductImage array structure
 */
export function migrateImageFormat(data: any): any {
  if (!data) return data;

  const migrated = { ...data };

  // Ensure images is always an array
  if (!Array.isArray(migrated.images)) {
    if (migrated.image) {
      // Single image field
      migrated.images = [
        typeof migrated.image === 'string'
          ? { url: migrated.image, alt: migrated.name || '' }
          : migrated.image,
      ];
    } else if (migrated.imageUrl) {
      // imageUrl field
      migrated.images = [{ url: migrated.imageUrl, alt: migrated.name || '' }];
    } else {
      migrated.images = [];
    }
  }

  // Normalize image objects
  migrated.images = migrated.images.map((img: any, index: number) => {
    if (typeof img === 'string') {
      return {
        id: `img-${index}`,
        url: img,
        alt: migrated.name || migrated.title || '',
        thumbnail: img,
        fullsize: img,
        order: index,
        isPrimary: index === 0,
      };
    }

    return {
      id: img.id || `img-${index}`,
      url: img.url || img.uri || img,
      alt: img.alt || migrated.name || migrated.title || '',
      thumbnail: img.thumbnail || img.url || img.uri,
      fullsize: img.fullsize || img.url || img.uri,
      width: img.width,
      height: img.height,
      order: img.order ?? index,
      isPrimary: img.isPrimary ?? index === 0,
    };
  });

  // Set primaryImage
  if (migrated.images.length > 0 && !migrated.primaryImage) {
    migrated.primaryImage = migrated.images[0].url;
  }

  return migrated;
}

// ============================================================================
// INVENTORY MIGRATION
// ============================================================================

/**
 * Migrate old inventory formats to new ProductInventory structure
 */
export function migrateInventoryFormat(data: any): any {
  if (!data) return data;

  const migrated = { ...data };

  // Create inventory object if it doesn't exist
  if (!migrated.inventory && (migrated.stock !== undefined || migrated.inStock !== undefined)) {
    migrated.inventory = {};
  }

  if (migrated.inventory) {
    // Migrate stock
    if (migrated.stock !== undefined && migrated.inventory.stock === undefined) {
      migrated.inventory.stock = migrated.stock;
      delete (migrated as any).stock;
    }

    // Migrate inStock to isAvailable
    if (migrated.inStock !== undefined && migrated.inventory.isAvailable === undefined) {
      migrated.inventory.isAvailable = migrated.inStock;
      delete (migrated as any).inStock;
    }

    // Set default values
    if (migrated.inventory.stock === undefined) {
      migrated.inventory.stock = 0;
    }

    if (migrated.inventory.isAvailable === undefined) {
      migrated.inventory.isAvailable = migrated.inventory.stock > 0;
    }

    if (migrated.inventory.lowStockThreshold === undefined) {
      migrated.inventory.lowStockThreshold = 5;
    }

    if (migrated.inventory.trackQuantity === undefined) {
      migrated.inventory.trackQuantity = true;
    }

    if (migrated.inventory.minOrderQuantity === undefined) {
      migrated.inventory.minOrderQuantity = 1;
    }
  }

  return migrated;
}

// ============================================================================
// COMPREHENSIVE MIGRATION
// ============================================================================

/**
 * Apply all migrations to an object
 */
export function migrateToUnifiedType(data: any, type: 'product' | 'store' | 'user' | 'order' | 'review'): any {
  if (!data) return data;

  // Start with ID migration
  let migrated = deepMigrateIds(data);

  // Apply type-specific migrations
  switch (type) {
    case 'product':
      migrated = migratePriceFormat(migrated);
      migrated = migrateRatingFormat(migrated);
      migrated = migrateImageFormat(migrated);
      migrated = migrateInventoryFormat(migrated);
      break;

    case 'store':
      migrated = migrateRatingFormat(migrated);
      migrated = migrateImageFormat(migrated);
      break;

    case 'review':
      migrated = migrateImageFormat(migrated);
      break;

    default:
      // Just ID migration for other types
      break;
  }

  return migrated;
}

/**
 * Batch migrate an array of items
 */
export function batchMigrate<T>(
  items: T[],
  type: 'product' | 'store' | 'user' | 'order' | 'review'
): T[] {
  if (!Array.isArray(items)) return items;
  return items.map((item) => migrateToUnifiedType(item, type));
}

// ============================================================================
// MIGRATION REPORT
// ============================================================================

export interface MigrationReport {
  totalItems: number;
  migratedItems: number;
  failedItems: number;
  migrations: {
    idMigrations: number;
    priceMigrations: number;
    ratingMigrations: number;
    imageMigrations: number;
    inventoryMigrations: number;
  };
  errors: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * Generate a migration report for a batch of items
 */
export function generateMigrationReport(
  items: any[],
  type: 'product' | 'store' | 'user' | 'order' | 'review'
): MigrationReport {
  const report: MigrationReport = {
    totalItems: items.length,
    migratedItems: 0,
    failedItems: 0,
    migrations: {
      idMigrations: 0,
      priceMigrations: 0,
      ratingMigrations: 0,
      imageMigrations: 0,
      inventoryMigrations: 0,
    },
    errors: [],
  };

  items.forEach((item, index) => {
    try {
      // Count specific migrations
      if (item._id) report.migrations.idMigrations++;
      if (type === 'product') {
        if (typeof item.price === 'number' || typeof item.price === 'string') {
          report.migrations.priceMigrations++;
        }
        if (typeof item.rating === 'number') {
          report.migrations.ratingMigrations++;
        }
        if (!Array.isArray(item.images) && (item.image || item.imageUrl)) {
          report.migrations.imageMigrations++;
        }
        if (!item.inventory && (item.stock !== undefined || item.inStock !== undefined)) {
          report.migrations.inventoryMigrations++;
        }
      }

      report.migratedItems++;
    } catch (error) {
      report.failedItems++;
      report.errors.push({
        index,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return report;
}
