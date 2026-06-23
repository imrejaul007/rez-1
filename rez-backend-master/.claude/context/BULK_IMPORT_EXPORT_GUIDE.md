# Bulk Product Import/Export - Merchant Guide

## Overview
This guide explains how to use the bulk import/export feature to manage large numbers of products efficiently.

---

## Quick Start

### 1. Download Template
```bash
GET /api/merchant/bulk/products/template?format=csv
```
or
```bash
GET /api/merchant/bulk/products/template?format=xlsx
```

### 2. Fill Template
Open the downloaded template and add your products following the format below.

### 3. Validate (Optional)
```bash
POST /api/merchant/bulk/products/validate
Content-Type: multipart/form-data
file: your-products.csv
```

### 4. Import
```bash
POST /api/merchant/bulk/products/import
Content-Type: multipart/form-data
file: your-products.csv
```

---

## CSV Template Format

### Required Fields
- **name**: Product name (2-200 characters)
- **description**: Full description (minimum 10 characters)
- **price**: Selling price (positive number)
- **category**: Product category
- **stock**: Inventory quantity (non-negative number)

### Optional Fields
- **shortDescription**: Brief description (max 300 characters)
- **compareAtPrice**: Original price (for showing discount)
- **subcategory**: Product subcategory
- **brand**: Brand name
- **sku**: Product SKU (auto-generated if empty)
- **barcode**: Product barcode
- **lowStockThreshold**: Low stock alert level (default: 5)
- **weight**: Product weight in grams
- **tags**: Comma-separated tags (e.g., "new, trending, sale")
- **status**: active | inactive | draft | archived (default: draft)
- **visibility**: public | hidden | featured (default: public)
- **cashbackPercentage**: Cashback % (0-100, default: 5)
- **imageUrl**: Product image URL

---

## Example CSV

```csv
name,description,shortDescription,price,compareAtPrice,category,subcategory,brand,sku,barcode,stock,lowStockThreshold,weight,tags,status,visibility,cashbackPercentage,imageUrl
"Wireless Mouse","High precision wireless mouse with ergonomic design and 2-year battery life","Ergonomic wireless mouse",29.99,49.99,Electronics,Computer Accessories,TechBrand,WM001,1234567890123,150,10,120,"electronics, wireless, mouse",active,public,5,https://example.com/mouse.jpg
"Gaming Keyboard","RGB mechanical keyboard with customizable keys and anti-ghosting","RGB mechanical keyboard",89.99,129.99,Electronics,Computer Accessories,GameGear,KB002,9876543210987,75,5,850,"gaming, keyboard, rgb",active,featured,10,https://example.com/keyboard.jpg
"USB-C Cable","Durable braided USB-C cable for fast charging and data transfer","Fast charging USB-C cable",12.99,19.99,Electronics,Cables,CableCo,USC003,5432167890123,500,50,45,"cable, usb-c, charging",active,public,5,https://example.com/cable.jpg
```

---

## Field Validation Rules

### Name
- **Required**: Yes
- **Min Length**: 2 characters
- **Max Length**: 200 characters
- **Example**: "Wireless Bluetooth Headphones"

### Description
- **Required**: Yes
- **Min Length**: 10 characters
- **Max Length**: 2000 characters
- **Example**: "Premium wireless headphones with active noise cancellation..."

### Price
- **Required**: Yes
- **Type**: Number
- **Min Value**: 0
- **Example**: 99.99

### Category
- **Required**: Yes
- **Example**: "Electronics", "Fashion", "Home & Garden"

### Stock
- **Required**: Yes
- **Type**: Number
- **Min Value**: 0
- **Example**: 100

### Compare At Price
- **Required**: No
- **Type**: Number
- **Min Value**: 0
- **Note**: Should be higher than price to show discount
- **Example**: 149.99

### Tags
- **Format**: Comma-separated values
- **Example**: "wireless, bluetooth, premium"
- **Parsing**: Each tag is trimmed and stored separately

### Status
- **Values**: active, inactive, draft, archived
- **Default**: draft
- **Example**: "active"

### Visibility
- **Values**: public, hidden, featured
- **Default**: public
- **Example**: "featured"

### Cashback Percentage
- **Type**: Number
- **Range**: 0-100
- **Default**: 5
- **Example**: 10

---

## Import Process

### Step 1: File Upload
- Maximum file size: **10MB**
- Maximum products: **10,000 per file**
- Supported formats: CSV, Excel (XLSX)

### Step 2: Validation
All rows are validated before import:
- Required fields check
- Data type validation
- Field length validation
- Enum value validation
- Duplicate SKU detection

### Step 3: Processing
- Products processed in batches of 100
- MongoDB transaction ensures all-or-nothing import
- User-side products automatically created
- Real-time notifications sent

### Step 4: Result
```json
{
  "success": true,
  "message": "Successfully imported 98 products",
  "data": {
    "totalRows": 100,
    "successCount": 98,
    "errorCount": 2,
    "errors": [
      {
        "row": 15,
        "field": "price",
        "message": "Price is required and must be a positive number",
        "value": null
      },
      {
        "row": 42,
        "field": "sku",
        "message": "SKU already exists in your products",
        "value": "DUP123"
      }
    ]
  }
}
```

---

## Common Errors

### 1. Missing Required Fields
```json
{
  "row": 10,
  "field": "name",
  "message": "Name is required and must be at least 2 characters",
  "value": ""
}
```
**Solution**: Fill in the name field with at least 2 characters

### 2. Invalid Price
```json
{
  "row": 15,
  "field": "price",
  "message": "Price is required and must be a positive number",
  "value": "invalid"
}
```
**Solution**: Enter a valid number (e.g., 99.99)

### 3. Duplicate SKU
```json
{
  "row": 25,
  "field": "sku",
  "message": "SKU already exists in your products",
  "value": "EXIST123"
}
```
**Solution**: Use a unique SKU or leave empty for auto-generation

### 4. Invalid Status
```json
{
  "row": 30,
  "field": "status",
  "message": "Status must be one of: active, inactive, draft, archived",
  "value": "published"
}
```
**Solution**: Use one of the valid status values

### 5. File Too Large
```json
{
  "success": false,
  "message": "File contains too many products. Maximum 10,000 products per import."
}
```
**Solution**: Split into multiple files

---

## Export Products

### Export to CSV
```bash
GET /api/merchant/bulk/products/export?format=csv
```

### Export to Excel
```bash
GET /api/merchant/bulk/products/export?format=xlsx
```

### What Gets Exported
- All your products
- All fields (including generated ones)
- Formatted for re-import
- Can be edited and re-imported

---

## Best Practices

### 1. Use Validation First
Always validate your file before importing:
```bash
POST /api/merchant/bulk/products/validate
```
This catches errors without creating products.

### 2. Start Small
Test with 10-20 products first to verify format.

### 3. Keep Backups
Export your products before importing new ones.

### 4. Unique SKUs
- Let system auto-generate SKUs, or
- Ensure your SKUs are unique

### 5. Proper Formatting
- Use quotes for text with commas
- Ensure prices are numbers (no currency symbols)
- Keep URLs complete (include https://)
- Use proper date formats

### 6. Tag Format
```csv
"product, trending, sale"  ✓ Correct
product trending sale      ✗ Incorrect
```

### 7. File Encoding
Save CSV files as UTF-8 to support special characters.

---

## Tips for Large Imports

### Batch Processing
For 10,000+ products:
1. Split into multiple files (5,000 each)
2. Import one at a time
3. Wait for completion before next import

### Performance
- Processing speed: ~100 products/second
- 1,000 products: ~10 seconds
- 10,000 products: ~100 seconds

### Transaction Safety
- Imports are atomic (all or nothing)
- If any error occurs, no products are created
- Database remains consistent

---

## Troubleshooting

### Import Stuck
- Check file size (max 10MB)
- Verify file format (CSV or XLSX)
- Ensure proper authentication

### Partial Import
- Imports are all-or-nothing
- If some products fail, none are created
- Fix errors and re-import

### SKU Generation
Auto-generated SKU format:
```
{FIRST_3_CHARS}{TIMESTAMP}{COUNTER}
Example: WIR1234561
```

### Image URLs
- Must be complete URLs
- Should start with http:// or https://
- Supports: JPG, PNG, GIF, WebP

---

## API Reference

### Download Template
```
GET /api/merchant/bulk/products/template
Query: format=csv|xlsx
Response: File download
```

### Validate File
```
POST /api/merchant/bulk/products/validate
Body: multipart/form-data with file
Response: Validation results
```

### Import Products
```
POST /api/merchant/bulk/products/import
Body: multipart/form-data with file
Response: Import results
```

### Export Products
```
GET /api/merchant/bulk/products/export
Query: format=csv|xlsx
Response: File download
```

---

## Example Workflow

### Complete Import Process
```bash
# 1. Download template
curl -X GET "https://api.example.com/api/merchant/bulk/products/template?format=csv" \
  -H "Authorization: Bearer {token}" \
  -o template.csv

# 2. Edit template and add products
# (Edit in Excel or Google Sheets)

# 3. Validate
curl -X POST "https://api.example.com/api/merchant/bulk/products/validate" \
  -H "Authorization: Bearer {token}" \
  -F "file=@products.csv"

# 4. Import if validation passes
curl -X POST "https://api.example.com/api/merchant/bulk/products/import" \
  -H "Authorization: Bearer {token}" \
  -F "file=@products.csv"
```

---

## Support

### Need Help?
- Check validation errors carefully
- Refer to example CSV in template
- Contact support with row number and error message

### Feature Requests
- Custom field mapping
- Image upload with CSV
- Variant bulk import
- Category auto-creation

---

## Changelog

### Version 1.0.0
- Initial release
- CSV and Excel support
- 10,000 product limit
- Real-time validation
- Transaction-based imports
- Auto SKU generation
