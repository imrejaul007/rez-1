# Bulk Operations Endpoints - Quick Reference

## Base URL
```
http://localhost:5001/api/merchant/bulk
```

## Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header.

```http
Authorization: Bearer <merchant_jwt_token>
```

---

## Endpoints

### 1. Download Product Import Template

**Endpoint:** `GET /products/template`

**Description:** Download a CSV or Excel template with example product data for bulk import.

**Query Parameters:**
- `format` (optional): `csv` or `xlsx` (default: `csv`)

**Example Requests:**

```bash
# CSV template
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/merchant/bulk/products/template?format=csv" \
  -o template.csv

# Excel template
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/merchant/bulk/products/template?format=xlsx" \
  -o template.xlsx
```

**Response:**
- **Status:** 200 OK
- **Content-Type:** `text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment; filename="product-import-template.csv"`
- **Body:** CSV/Excel file with headers and example row

**Template Headers:**
```
name, description, shortDescription, price, compareAtPrice, category,
subcategory, brand, sku, barcode, stock, lowStockThreshold, weight,
tags, status, visibility, cashbackPercentage, imageUrl
```

---

### 2. Export All Products

**Endpoint:** `GET /products/export`

**Description:** Export all merchant products to CSV or Excel format.

**Query Parameters:**
- `format` (optional): `csv` or `xlsx` (default: `csv`)

**Example Requests:**

```bash
# CSV export
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/merchant/bulk/products/export?format=csv" \
  -o export.csv

# Excel export
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/merchant/bulk/products/export?format=xlsx" \
  -o export.xlsx
```

**Response:**
- **Status:** 200 OK
- **Content-Type:** `text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment; filename="products-export-{timestamp}.csv"`
- **Body:** CSV/Excel file with all merchant products

---

## Additional Available Endpoints

### 3. Validate Import File

**Endpoint:** `POST /products/validate`

**Description:** Validate a CSV/Excel file without importing it.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@products.csv" \
  "http://localhost:5001/api/merchant/bulk/products/validate"
```

**Response:**
```json
{
  "success": true,
  "message": "Validation successful. Ready to import.",
  "data": {
    "totalRows": 50,
    "validRows": 48,
    "errorCount": 2,
    "errors": [
      {
        "row": 3,
        "field": "price",
        "message": "Price must be a positive number"
      }
    ]
  }
}
```

---

### 4. Import Products

**Endpoint:** `POST /products/import`

**Description:** Import products from CSV/Excel file.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@products.csv" \
  "http://localhost:5001/api/merchant/bulk/products/import"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully imported 48 products",
  "data": {
    "totalRows": 50,
    "successCount": 48,
    "errorCount": 2,
    "errors": []
  }
}
```

**Limits:**
- Max file size: 10MB
- Max products per import: 10,000

---

### 5. Advanced Export

**Endpoint:** `POST /products/export/advanced`

**Description:** Export products with custom field selection and filters.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": ["name", "sku", "price", "stock"],
    "filters": {
      "category": "Electronics",
      "status": "active",
      "priceRange": { "min": 100, "max": 1000 }
    },
    "format": "csv"
  }' \
  "http://localhost:5001/api/merchant/bulk/products/export/advanced" \
  -o custom-export.csv
```

**Available Fields:**
- name, sku, category, subcategory, price, costPrice, compareAtPrice
- stock, status, visibility, brand, barcode, weight, tags
- createdAt, updatedAt

**Available Filters:**
- category, status, visibility
- priceRange: { min, max }
- stockLevel: 'in_stock' | 'low_stock' | 'out_of_stock'
- dateRange: { start, end }

---

### 6. Bulk Update Products

**Endpoint:** `POST /products/bulk-update`

**Description:** Update multiple products at once.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": ["64a1b2c3d4e5f6789abcdef0", "64a1b2c3d4e5f6789abcdef1"],
    "updates": {
      "status": "active",
      "visibility": "public",
      "price": 99.99
    }
  }' \
  "http://localhost:5001/api/merchant/bulk/products/bulk-update"
```

**Allowed Update Fields:**
- price, costPrice, compareAtPrice
- category, subcategory
- status, visibility
- brand, tags

**Response:**
```json
{
  "success": true,
  "message": "Successfully updated 2 products",
  "data": {
    "totalRequested": 2,
    "updated": 2,
    "failed": 0,
    "updatedFields": ["status", "visibility", "price"]
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid format. Use 'csv' or 'xlsx'"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "No products found matching the filters"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to generate template",
  "error": "Error details..."
}
```

---

## Testing Scripts

### Windows (PowerShell/CMD)
```batch
test-bulk-endpoints.bat YOUR_JWT_TOKEN
```

### Linux/Mac (Bash)
```bash
chmod +x test-bulk-endpoints.sh
./test-bulk-endpoints.sh YOUR_JWT_TOKEN
```

---

## File Formats

### CSV Format
- Comma-separated values
- UTF-8 encoding
- Special characters properly escaped
- Arrays (tags) as comma-separated: "tag1, tag2, tag3"

### Excel Format
- .xlsx (Office Open XML)
- Single sheet named "Products"
- Headers in first row
- Data types preserved (numbers, dates)

---

## Security Notes

1. **Authentication Required:** All endpoints require valid merchant JWT token
2. **Merchant Isolation:** Each merchant can only access/export their own products
3. **File Size Limits:** 10MB max upload size
4. **File Type Validation:** Only CSV and Excel files accepted
5. **Transaction Safety:** Bulk updates use MongoDB transactions
6. **Rate Limiting:** Standard rate limits apply (if enabled)

---

## Troubleshooting

### 404 Errors
- Ensure server is running
- Verify route is registered in server.ts
- Check JWT token is valid

### Empty Exports
- Verify merchant has products in database
- Check filters in advanced export
- Ensure products are not all marked as deleted

### Import Failures
- Validate CSV format matches template
- Check for required fields (name, sku, price, stock)
- Ensure SKU uniqueness
- Verify price values are positive numbers

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify database connectivity
- Ensure BulkProductService is available
- Check merchantauth middleware configuration

---

**Last Updated:** 2025-11-18
**Agent:** Agent 4 - Bulk Operations Implementation
