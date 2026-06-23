# Bulk Operations Endpoints - Visual Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Express Server (server.ts)                   │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Route: /api/merchant/bulk                                      │ │
│  │  Import: bulkRoutes from './merchantroutes/bulk'                │ │
│  │  Middleware: authMiddleware (JWT verification)                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Bulk Routes (merchantroutes/bulk.ts)                │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Authentication: authMiddleware applied to all routes          │ │
│  │  File Upload: multer (memory storage, 10MB limit)              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────── ENDPOINTS ──────────────────────────┐ │
│  │                                                                  │ │
│  │  1️⃣  GET /products/template                                     │ │
│  │     ├─ Download CSV/Excel template                             │ │
│  │     ├─ Query: ?format=csv|xlsx                                 │ │
│  │     └─ Returns: Example product template                       │ │
│  │                                                                  │ │
│  │  2️⃣  POST /products/validate                                    │ │
│  │     ├─ Validate import file                                    │ │
│  │     ├─ Body: multipart/form-data (file)                        │ │
│  │     └─ Returns: Validation results                             │ │
│  │                                                                  │ │
│  │  3️⃣  POST /products/import                                      │ │
│  │     ├─ Import products from file                               │ │
│  │     ├─ Body: multipart/form-data (file)                        │ │
│  │     └─ Returns: Import results                                 │ │
│  │                                                                  │ │
│  │  4️⃣  GET /products/export                                       │ │
│  │     ├─ Export all merchant products                            │ │
│  │     ├─ Query: ?format=csv|xlsx                                 │ │
│  │     └─ Returns: CSV/Excel file with all products               │ │
│  │                                                                  │ │
│  │  5️⃣  POST /products/export/advanced                             │ │
│  │     ├─ Export with custom fields/filters                       │ │
│  │     ├─ Body: { fields, filters, format }                       │ │
│  │     └─ Returns: Filtered CSV/Excel file                        │ │
│  │                                                                  │ │
│  │  6️⃣  POST /products/bulk-update                                 │ │
│  │     ├─ Update multiple products                                │ │
│  │     ├─ Body: { productIds, updates }                           │ │
│  │     └─ Returns: Update results                                 │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│             BulkProductService (services/BulkProductService.ts)      │
│                                                                       │
│  Methods:                                                             │
│  ├─ getTemplateHeaders()      → Returns CSV headers                  │
│  ├─ parseCSV(buffer)          → Parse CSV file                       │
│  ├─ parseExcel(buffer)        → Parse Excel file                     │
│  ├─ validateImport(products)  → Validate product data                │
│  ├─ importProducts(products)  → Create products in database          │
│  ├─ exportToCSV(merchantId)   → Export to CSV file                   │
│  └─ exportToExcel(merchantId) → Export to Excel file                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Database (MongoDB - MerchantProduct)                │
│                                                                       │
│  Collections:                                                         │
│  ├─ merchantproducts          → Product documents                    │
│  └─ merchants                 → Merchant authentication               │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Diagram

### Template Download Flow

```
Client Request
    │
    ├─ GET /api/merchant/bulk/products/template?format=csv
    ├─ Header: Authorization: Bearer <token>
    │
    ▼
Auth Middleware
    │
    ├─ Verify JWT token
    ├─ Extract merchantId
    │
    ▼
Bulk Route Handler
    │
    ├─ Get template headers from BulkProductService
    ├─ Create temp CSV file with example data
    ├─ Set response headers (Content-Type, Content-Disposition)
    │
    ▼
Response
    │
    ├─ Download file: product-import-template.csv
    ├─ Cleanup temp file
    │
    ▼
Client receives file
```

---

### Export Products Flow

```
Client Request
    │
    ├─ GET /api/merchant/bulk/products/export?format=csv
    ├─ Header: Authorization: Bearer <token>
    │
    ▼
Auth Middleware
    │
    ├─ Verify JWT token
    ├─ Extract merchantId
    │
    ▼
Bulk Route Handler
    │
    ├─ Call BulkProductService.exportToCSV(merchantId)
    │
    ▼
BulkProductService
    │
    ├─ Query database: MProduct.find({ merchantId })
    ├─ Format product data
    ├─ Generate CSV file
    ├─ Save to temp directory
    │
    ▼
Response
    │
    ├─ Download file: products-export-{timestamp}.csv
    ├─ Cleanup temp file
    │
    ▼
Client receives file with all products
```

---

## Data Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │  HTTP   │              │  Query  │              │
│    Client    │ ───────>│  Express     │ ───────>│   MongoDB    │
│  (Merchant)  │  Request│   Server     │         │   Database   │
│              │         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
       ▲                        │                        │
       │                        │                        │
       │                        ▼                        ▼
       │                 ┌──────────────┐         ┌──────────────┐
       │                 │              │         │              │
       │   CSV/Excel     │   Service    │ Format  │   Product    │
       └─────────────────│    Layer     │◀────────│    Models    │
          Response       │              │  Data   │              │
                         └──────────────┘         └──────────────┘
```

---

## File Structure

```
user-backend/
│
├── src/
│   ├── server.ts                         # Main Express app
│   │   └── Route registration:
│   │       app.use('/api/merchant/bulk', bulkRoutes)
│   │
│   ├── merchantroutes/
│   │   └── bulk.ts                       # 6 bulk operation endpoints
│   │       ├── GET  /products/template
│   │       ├── POST /products/validate
│   │       ├── POST /products/import
│   │       ├── GET  /products/export      ← Fixed (was 404)
│   │       ├── POST /products/export/advanced
│   │       └── POST /products/bulk-update
│   │
│   ├── services/
│   │   └── BulkProductService.ts         # Business logic
│   │       ├── getTemplateHeaders()
│   │       ├── parseCSV()
│   │       ├── parseExcel()
│   │       ├── validateImport()
│   │       ├── importProducts()
│   │       ├── exportToCSV()             ← Used by export endpoint
│   │       └── exportToExcel()
│   │
│   ├── middleware/
│   │   └── merchantauth.ts               # JWT authentication
│   │       └── authMiddleware()
│   │
│   └── models/
│       └── MerchantProduct.ts            # Product schema
│
├── templates/                             # Temp files (auto-cleanup)
│   ├── product-template-{timestamp}.csv
│   └── products-export-{timestamp}.csv
│
├── test-bulk-endpoints.bat               # Windows test script
├── test-bulk-endpoints.sh                # Linux/Mac test script
├── BULK_ENDPOINTS_QUICK_REFERENCE.md     # API documentation
└── AGENT_4_BULK_ENDPOINTS_IMPLEMENTATION.md
```

---

## Security Flow

```
Request ──> JWT Verification ──> Merchant ID Extraction ──> Authorization
   │               │                      │                       │
   │               ▼                      ▼                       ▼
   │        Check token          Extract from token      Ensure merchantId
   │        validity             payload.merchantId      matches resources
   │               │                      │                       │
   │               ▼                      ▼                       ▼
   └─────> If invalid  ──>  401 Unauthorized
                    │
                    ▼
              If valid ──> Proceed to endpoint
                    │
                    ▼
              Query database: { merchantId: req.merchantId }
                    │
                    ▼
              Return only merchant's own products
```

---

## CSV Template Structure

```
┌────────────────────────────────────────────────────────────────────┐
│  Header Row                                                         │
├────────────────────────────────────────────────────────────────────┤
│  name | description | shortDescription | price | compareAtPrice |  │
│  category | subcategory | brand | sku | barcode | stock |          │
│  lowStockThreshold | weight | tags | status | visibility |         │
│  cashbackPercentage | imageUrl                                     │
├────────────────────────────────────────────────────────────────────┤
│  Example Row                                                        │
├────────────────────────────────────────────────────────────────────┤
│  Example Product | This is a detailed... | Short desc | 99.99 |    │
│  149.99 | Electronics | Smartphones | Example Brand | EXA123456 |  │
│  1234567890123 | 100 | 10 | 500 | new, trending, popular |         │
│  active | public | 5 | https://example.com/image.jpg              │
└────────────────────────────────────────────────────────────────────┘
```

---

## Status Codes

```
┌─────────────┬──────────────────────────────────────────────────────┐
│ Status Code │ Description                                          │
├─────────────┼──────────────────────────────────────────────────────┤
│    200      │ Success - File downloaded/operation completed       │
│    400      │ Bad Request - Invalid format/missing data            │
│    401      │ Unauthorized - Invalid/missing JWT token             │
│    404      │ Not Found - No products/endpoint not found           │
│    500      │ Internal Error - Server/database error               │
└─────────────┴──────────────────────────────────────────────────────┘
```

---

## Supported File Formats

```
┌──────────────┬─────────────────┬────────────────────────────────────┐
│ Format       │ MIME Type       │ Features                           │
├──────────────┼─────────────────┼────────────────────────────────────┤
│ CSV          │ text/csv        │ • Universal compatibility          │
│              │                 │ • Smaller file size                │
│              │                 │ • Easy to edit in any text editor  │
├──────────────┼─────────────────┼────────────────────────────────────┤
│ Excel (XLSX) │ application/    │ • Preserves data types             │
│              │ vnd.openxml...  │ • Better for complex data          │
│              │                 │ • Native Excel support             │
└──────────────┴─────────────────┴────────────────────────────────────┘
```

---

## Real-time Features

```
When import/export completes:

Server ──> Socket.IO ──> merchant-{merchantId} room ──> Merchant Dashboard
    │                           │                             │
    │                           │                             ▼
    │                           │                    Update UI in real-time
    │                           │                    Show success notification
    │                           │
    └───────> Emit event: 'bulk_import_completed'
              {
                totalRows: 50,
                successCount: 48,
                timestamp: Date
              }
```

---

## Testing Endpoints

### Using cURL (Cross-platform)

```bash
# 1. Template Download
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5001/api/merchant/bulk/products/template?format=csv" \
  -o template.csv

# 2. Products Export
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5001/api/merchant/bulk/products/export?format=csv" \
  -o export.csv
```

### Using Test Scripts

```bash
# Windows
test-bulk-endpoints.bat YOUR_JWT_TOKEN

# Linux/Mac
./test-bulk-endpoints.sh YOUR_JWT_TOKEN
```

---

## Success Indicators

```
✅ Both endpoints return HTTP 200
✅ Files download successfully
✅ CSV files contain proper headers
✅ Export includes all merchant products
✅ Template includes example row
✅ Temp files cleaned up after download
✅ JWT authentication works
✅ Console shows route registration message
```

---

**Visual Guide Last Updated:** 2025-11-18
**Agent:** Agent 4 - Bulk Operations Implementation
