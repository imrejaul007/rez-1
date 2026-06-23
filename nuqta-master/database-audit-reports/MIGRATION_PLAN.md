# MIGRATION PLAN

Generated: 2025-11-15T08:02:53.575Z

## Migration Summary

- **HIGH Priority:** 1
- **MEDIUM Priority:** 5
- **LOW Priority:** 6

## Migrations by Collection

### categories

#### IMAGE_STRUCTURE (LOW Priority)

**Description:** Using singular 'image' instead of 'images' array

**Migration Script:** `migrate-categories-image-structure.js`

---

### faqs

#### ID_STANDARDIZATION (HIGH Priority)

**Description:** Collection has both 'id' and '_id' fields

**Migration Script:** `migrate-faqs-id-standardization.js`

---

### mproducts

#### PRICE_STRUCTURE (MEDIUM Priority)

**Description:** Price format inconsistencies found

**Affected Documents:** ~1

**Migration Script:** `migrate-mproducts-price-structure.js`

---

### coupons

#### BOOLEAN_NORMALIZATION (LOW Priority)

**Description:** String or numeric booleans found

**Affected Documents:** ~3

**Migration Script:** `migrate-coupons-boolean-normalization.js`

---

### herobanners

#### IMAGE_STRUCTURE (LOW Priority)

**Description:** Using singular 'image' instead of 'images' array

**Migration Script:** `migrate-herobanners-image-structure.js`

---

### reviews

#### RATING_STRUCTURE (MEDIUM Priority)

**Description:** Rating format inconsistencies found

**Affected Documents:** ~5

**Migration Script:** `migrate-reviews-rating-structure.js`

---

### offers

#### IMAGE_STRUCTURE (LOW Priority)

**Description:** Using singular 'image' instead of 'images' array

**Migration Script:** `migrate-offers-image-structure.js`

---

### voucherbrands

#### RATING_STRUCTURE (MEDIUM Priority)

**Description:** Rating format inconsistencies found

**Affected Documents:** ~10

**Migration Script:** `migrate-voucherbrands-rating-structure.js`

---

### partners

#### BOOLEAN_NORMALIZATION (LOW Priority)

**Description:** String or numeric booleans found

**Affected Documents:** ~10

**Migration Script:** `migrate-partners-boolean-normalization.js`

---

### subscriptions

#### PRICE_STRUCTURE (MEDIUM Priority)

**Description:** Price format inconsistencies found

**Affected Documents:** ~5

**Migration Script:** `migrate-subscriptions-price-structure.js`

---

### events

#### PRICE_STRUCTURE (MEDIUM Priority)

**Description:** Price format inconsistencies found

**Affected Documents:** ~6

**Migration Script:** `migrate-events-price-structure.js`

---

### cashbackrequests

#### BOOLEAN_NORMALIZATION (LOW Priority)

**Description:** String or numeric booleans found

**Affected Documents:** ~7

**Migration Script:** `migrate-cashbackrequests-boolean-normalization.js`

---

## Recommended Migration Order

1. **Phase 1 - HIGH Priority** (Critical for functionality)
   - ID Standardization migrations
   - Fix broken relationships

2. **Phase 2 - MEDIUM Priority** (Important for consistency)
   - Price structure migrations
   - Rating structure migrations

3. **Phase 3 - LOW Priority** (Nice to have)
   - Image structure migrations
   - Boolean normalization

