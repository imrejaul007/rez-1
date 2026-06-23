"use strict";
/**
 * Product entity — canonical shape for the `products` collection.
 *
 * Mirrors rezbackend/src/models/Product.ts. Covers both `productType: 'product'`
 * (physical SKU) and `productType: 'service'` (appointment-based).
 *
 * Historical drift fixed here:
 *   - Pricing uses `selling` + `original` (matching the backend schema), NOT
 *     the older `price.current / price.original` shape some legacy callers
 *     wrote. Consumers should migrate to read `pricing.selling`.
 *   - Images are canonical objects `{url, alt, isPrimary}`. Stored as JSON
 *     strings in the DB — use the backend's `Product.parseImage()` helper.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=product.js.map