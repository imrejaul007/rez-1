# Product Variants Management Guide

## Overview
Complete guide for managing product variants including size, color, and multi-attribute combinations.

---

## What are Product Variants?

Product variants allow you to sell the same product with different options:
- **Sizes**: S, M, L, XL, XXL
- **Colors**: Red, Blue, Green, Black
- **Materials**: Cotton, Polyester, Silk
- **Combinations**: Red-Large, Blue-Medium, etc.

---

## Variant Structure

### Enhanced Variant Model
```typescript
{
  variantId: "uuid-v4-generated",
  type: "size",
  value: "XL",
  attributes: {
    color: "blue",
    size: "XL"
  },
  price: 109.99,
  compareAtPrice: 159.99,
  stock: 50,
  sku: "SHIRT123-BLUE-XL",
  images: [
    "https://example.com/blue-xl-front.jpg",
    "https://example.com/blue-xl-back.jpg"
  ],
  barcode: "1234567890123",
  weight: 520,
  isAvailable: true
}
```

### Key Features
- **Unique IDs**: Each variant gets a UUID
- **Auto SKU**: Generated from product SKU + attributes
- **Individual Pricing**: Each variant can have different prices
- **Separate Inventory**: Track stock per variant
- **Variant Images**: Show specific images per variant
- **Weight Tracking**: Different weights per variant

---

## API Endpoints

### 1. Get All Variants
```
GET /api/merchant/products/:id/variants
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "product123",
    "productName": "Cotton T-Shirt",
    "variants": [
      {
        "variantId": "var-123",
        "type": "size",
        "value": "M",
        "stock": 100,
        "sku": "SHIRT123-M",
        "isAvailable": true
      },
      {
        "variantId": "var-124",
        "type": "size",
        "value": "L",
        "stock": 75,
        "sku": "SHIRT123-L",
        "isAvailable": true
      }
    ],
    "totalVariants": 2
  }
}
```

### 2. Create Variant
```
POST /api/merchant/products/:id/variants
```

**Request:**
```json
{
  "type": "size",
  "value": "XL",
  "price": 109.99,
  "compareAtPrice": 159.99,
  "stock": 50,
  "images": [
    "https://example.com/shirt-xl.jpg"
  ],
  "weight": 520
}
```

**Response:**
```json
{
  "success": true,
  "message": "Variant created successfully",
  "data": {
    "variant": {
      "variantId": "generated-uuid",
      "type": "size",
      "value": "XL",
      "price": 109.99,
      "stock": 50,
      "sku": "SHIRT123-SIZE-XL",
      "isAvailable": true
    }
  }
}
```

### 3. Update Variant
```
PUT /api/merchant/products/:id/variants/:variantId
```

**Request:**
```json
{
  "stock": 75,
  "price": 99.99
}
```

### 4. Delete Variant
```
DELETE /api/merchant/products/:id/variants/:variantId
```

### 5. Get Single Variant
```
GET /api/merchant/products/:id/variants/:variantId
```

---

## Use Cases

### Case 1: Simple Size Variants
**Product:** T-Shirt
**Variants:** S, M, L, XL

```javascript
// Create S
POST /variants
{
  "type": "size",
  "value": "S",
  "stock": 100
}

// Create M
POST /variants
{
  "type": "size",
  "value": "M",
  "stock": 150
}

// Create L
POST /variants
{
  "type": "size",
  "value": "L",
  "stock": 120
}
```

### Case 2: Color Variants with Different Prices
**Product:** Premium Shirt
**Variants:** White (cheaper), Black (standard), Gold (premium)

```javascript
// White - Base price
POST /variants
{
  "type": "color",
  "value": "White",
  "price": 89.99,
  "stock": 100,
  "images": ["white-shirt.jpg"]
}

// Black - Standard
POST /variants
{
  "type": "color",
  "value": "Black",
  "price": 99.99,
  "stock": 80,
  "images": ["black-shirt.jpg"]
}

// Gold - Premium
POST /variants
{
  "type": "color",
  "value": "Gold",
  "price": 129.99,
  "stock": 30,
  "images": ["gold-shirt.jpg"]
}
```

### Case 3: Multi-Attribute Variants
**Product:** Sneakers
**Variants:** Color + Size combinations

```javascript
// Red - Size 9
POST /variants
{
  "type": "color-size",
  "value": "Red-9",
  "attributes": {
    "color": "Red",
    "size": "9"
  },
  "price": 149.99,
  "stock": 25,
  "images": ["red-sneaker-9.jpg"],
  "weight": 800
}

// Blue - Size 10
POST /variants
{
  "type": "color-size",
  "value": "Blue-10",
  "attributes": {
    "color": "Blue",
    "size": "10"
  },
  "price": 149.99,
  "stock": 30,
  "images": ["blue-sneaker-10.jpg"],
  "weight": 820
}
```

---

## SKU Generation

### Auto-Generated SKU Format

#### Single Attribute
```
{PRODUCT_SKU}-{TYPE}-{VALUE}
Example: SHIRT123-SIZE-XL
```

#### Multi-Attribute
```
{PRODUCT_SKU}-{ATTR1}-{ATTR2}
Example: SHIRT123-BLUE-XL
Example: SHOE789-RED-9
```

### Custom SKU
You can provide your own SKU:
```json
{
  "type": "size",
  "value": "XL",
  "sku": "CUSTOM-XL-001",
  "stock": 50
}
```

---

## Inventory Management

### Stock Levels
Each variant tracks its own stock:
```json
{
  "stock": 50,
  "isAvailable": true  // Auto-set based on stock
}
```

### Low Stock
Monitor variant inventory:
```javascript
// Get all variants
GET /products/123/variants

// Check which variants are low
variants.filter(v => v.stock < 10)
```

### Update Stock
```javascript
// Reduce stock after sale
PUT /products/123/variants/var-456
{
  "stock": 45  // Reduced by 5
}

// Restock
PUT /products/123/variants/var-456
{
  "stock": 100  // Restocked
}
```

---

## Pricing Strategies

### Strategy 1: Same Price for All Variants
Set variant price to `undefined` - uses base product price:
```json
{
  "type": "size",
  "value": "M",
  "stock": 100
  // No price field - uses product price
}
```

### Strategy 2: Different Price per Variant
```json
{
  "type": "size",
  "value": "XXL",
  "price": 119.99,  // $10 more than standard
  "stock": 50
}
```

### Strategy 3: Discounted Variants
```json
{
  "type": "color",
  "value": "Clearance Red",
  "price": 69.99,
  "compareAtPrice": 99.99,  // Show 30% discount
  "stock": 10
}
```

---

## Image Management

### Single Image per Variant
```json
{
  "type": "color",
  "value": "Blue",
  "images": ["blue-product.jpg"],
  "stock": 50
}
```

### Multiple Images per Variant
```json
{
  "type": "color",
  "value": "Red",
  "images": [
    "red-front.jpg",
    "red-back.jpg",
    "red-detail.jpg"
  ],
  "stock": 50
}
```

### No Variant Images
If no images provided, uses main product images.

---

## Best Practices

### 1. Consistent Naming
```
✓ Good: "Small", "Medium", "Large"
✗ Bad: "S", "Med", "L"

✓ Good: "Red", "Blue", "Green"
✗ Bad: "red", "BLUE", "grn"
```

### 2. Logical Organization
Group related attributes:
```json
{
  "attributes": {
    "color": "Blue",
    "size": "L",
    "material": "Cotton"
  }
}
```

### 3. Stock Management
- Set realistic stock levels
- Monitor low stock variants
- Update after each sale
- Use `isAvailable` flag

### 4. Pricing
- Consistent pricing strategy
- Clear discount indicators
- Update all variants when base price changes

### 5. SKUs
- Use auto-generation for consistency
- Custom SKUs for special cases
- Ensure uniqueness

---

## Common Patterns

### Pattern 1: Clothing Sizes
```javascript
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
sizes.forEach(size => {
  createVariant({
    type: 'size',
    value: size,
    stock: 100
  });
});
```

### Pattern 2: Color Options
```javascript
const colors = [
  { name: 'Black', hex: '#000000', image: 'black.jpg' },
  { name: 'White', hex: '#FFFFFF', image: 'white.jpg' },
  { name: 'Navy', hex: '#000080', image: 'navy.jpg' }
];

colors.forEach(color => {
  createVariant({
    type: 'color',
    value: color.name,
    attributes: { color: color.name, hex: color.hex },
    images: [color.image],
    stock: 75
  });
});
```

### Pattern 3: Size + Color Matrix
```javascript
const sizes = ['S', 'M', 'L', 'XL'];
const colors = ['Red', 'Blue', 'Green'];

sizes.forEach(size => {
  colors.forEach(color => {
    createVariant({
      type: 'size-color',
      value: `${color}-${size}`,
      attributes: { color, size },
      stock: 25,
      images: [`${color.toLowerCase()}-${size.toLowerCase()}.jpg`]
    });
  });
});
```

---

## Real-Time Updates

### Variant Created
```javascript
socket.on('variant_created', (data) => {
  console.log('New variant:', data.variantId);
  // Refresh variant list
});
```

### Variant Updated
```javascript
socket.on('variant_updated', (data) => {
  console.log('Variant updated:', data.variantId);
  // Update UI
});
```

### Variant Deleted
```javascript
socket.on('variant_deleted', (data) => {
  console.log('Variant deleted:', data.variantId);
  // Remove from list
});
```

---

## Validation Rules

### Required Fields
- `type`: Must be provided
- `value`: Must be provided
- `stock`: Must be non-negative number

### Optional Fields
- `attributes`: Object with key-value pairs
- `price`: Positive number
- `compareAtPrice`: Must be ≥ price
- `sku`: String (auto-generated if empty)
- `images`: Array of URLs
- `barcode`: String
- `weight`: Positive number

### Constraints
- Variant SKU must be unique
- Stock cannot be negative
- Price cannot be negative
- Images must be valid URLs

---

## Error Handling

### Common Errors

#### 1. Duplicate SKU
```json
{
  "success": false,
  "message": "Variant with this SKU already exists"
}
```
**Solution**: Use different SKU or let system auto-generate

#### 2. Variant Not Found
```json
{
  "success": false,
  "message": "Variant not found"
}
```
**Solution**: Check variantId is correct

#### 3. Invalid Stock
```json
{
  "success": false,
  "message": "Stock must be a non-negative number"
}
```
**Solution**: Provide valid stock value (≥ 0)

---

## Migration Guide

### From Simple Product to Variants

#### Before (Simple Product)
```json
{
  "name": "T-Shirt",
  "price": 29.99,
  "stock": 500
}
```

#### After (With Variants)
```json
{
  "name": "T-Shirt",
  "price": 29.99,  // Base price
  "stock": 0,      // Stock now in variants
  "variants": [
    { "type": "size", "value": "S", "stock": 100 },
    { "type": "size", "value": "M", "stock": 150 },
    { "type": "size", "value": "L", "stock": 150 },
    { "type": "size", "value": "XL", "stock": 100 }
  ]
}
```

---

## Performance Tips

### 1. Batch Operations
Create multiple variants in quick succession:
```javascript
// Good
Promise.all([
  createVariant({ type: 'size', value: 'S', stock: 100 }),
  createVariant({ type: 'size', value: 'M', stock: 150 }),
  createVariant({ type: 'size', value: 'L', stock: 120 })
]);
```

### 2. Lazy Loading
Load variants only when needed:
```javascript
// Load product without variants
GET /products/123

// Load variants when user clicks "View Sizes"
GET /products/123/variants
```

### 3. Caching
Cache variant data for frequently viewed products.

---

## Future Enhancements

### Planned Features
- [ ] Bulk variant creation via CSV
- [ ] Variant combinations generator
- [ ] Inventory sync alerts
- [ ] Variant performance analytics
- [ ] Smart pricing suggestions
- [ ] Image bulk upload for variants

---

## Examples

### Complete Workflow
```bash
# 1. Create product
POST /api/merchant/products
{
  "name": "Premium T-Shirt",
  "price": 29.99,
  "stock": 0
}

# 2. Add size variants
POST /api/merchant/products/123/variants
{ "type": "size", "value": "S", "stock": 100 }

POST /api/merchant/products/123/variants
{ "type": "size", "value": "M", "stock": 150 }

POST /api/merchant/products/123/variants
{ "type": "size", "value": "L", "stock": 120 }

# 3. Get all variants
GET /api/merchant/products/123/variants

# 4. Update stock
PUT /api/merchant/products/123/variants/var-123
{ "stock": 95 }

# 5. Delete variant
DELETE /api/merchant/products/123/variants/var-124
```

---

## Support

For questions or issues:
- Check API response error messages
- Verify all required fields
- Ensure valid data types
- Contact support with productId and variantId

---

## Changelog

### Version 1.0.0
- Initial release
- UUID variant IDs
- Auto SKU generation
- Multi-attribute support
- Individual pricing
- Variant images
- Weight tracking
- Real-time updates
