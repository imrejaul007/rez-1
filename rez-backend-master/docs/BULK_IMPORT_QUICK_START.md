# Bulk Product Import - Quick Start Guide

## 🚀 Quick Testing Guide

### Prerequisites
1. Backend server running on `http://localhost:5001`
2. Valid merchant authentication token
3. Store ID that belongs to the merchant

### Step 1: Get Import Template

```bash
curl -X GET \
  http://localhost:5001/api/merchant/products/import-template \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -o product-import-template.csv
```

### Step 2: Fill Template

Edit `product-import-template.csv`:

```csv
name,description,shortDescription,sku,price,costPrice,compareAtPrice,category,subcategory,stock,lowStockThreshold,brand,tags,status,images,barcode,weight,isFeatured
iPhone 15 Pro,Latest iPhone with A17 Pro chip,Flagship smartphone,IPH15PRO,99999,80000,109999,Electronics,Mobile Phones,50,5,Apple,"smartphone,5g,ios",active,https://example.com/iphone15.jpg,1234567890123,200,true
Samsung Galaxy S24,Powerful Android flagship,Latest Galaxy phone,SAMS24,89999,70000,99999,Electronics,Mobile Phones,100,10,Samsung,"smartphone,5g,android",active,https://example.com/galaxy-s24.jpg,1234567890124,190,false
MacBook Pro M3,Professional laptop,16-inch laptop,,199999,180000,229999,Electronics,Laptops,20,3,Apple,"laptop,m3,professional",active,https://example.com/macbook.jpg,,1500,true
```

### Step 3: Upload File

```bash
curl -X POST \
  http://localhost:5001/api/merchant/products/bulk-import \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN" \
  -F "file=@product-import-template.csv" \
  -F "storeId=YOUR_STORE_ID"
```

**Expected Response (202 Accepted)**:
```json
{
  "success": true,
  "message": "Import job created successfully. Processing in background.",
  "data": {
    "jobId": "674c5f6a1234567890abcdef",
    "status": "pending",
    "fileName": "product-import-template.csv"
  }
}
```

### Step 4: Check Import Status

```bash
# Replace JOB_ID with the jobId from Step 3
curl -X GET \
  http://localhost:5001/api/merchant/products/import-status/JOB_ID \
  -H "Authorization: Bearer YOUR_MERCHANT_TOKEN"
```

**Expected Response (While Processing)**:
```json
{
  "success": true,
  "data": {
    "jobId": "674c5f6a1234567890abcdef",
    "fileName": "product-import-template.csv",
    "status": "processing",
    "progress": {
      "total": 3,
      "processed": 2,
      "successful": 2,
      "failed": 0,
      "warnings": 0,
      "percentage": 67
    }
  }
}
```

**Expected Response (Completed)**:
```json
{
  "success": true,
  "data": {
    "jobId": "674c5f6a1234567890abcdef",
    "fileName": "product-import-template.csv",
    "status": "completed",
    "progress": {
      "total": 3,
      "processed": 3,
      "successful": 3,
      "failed": 0,
      "warnings": 0,
      "percentage": 100
    },
    "result": {
      "total": 3,
      "successful": 3,
      "failed": 0,
      "warnings": 0,
      "rows": [
        {
          "rowNumber": 1,
          "status": "success",
          "productId": "674c5f7a1234567890abcd01",
          "action": "created",
          "data": { ... },
          "errors": [],
          "warnings": []
        },
        {
          "rowNumber": 2,
          "status": "success",
          "productId": "674c5f7a1234567890abcd02",
          "action": "created",
          "data": { ... },
          "errors": [],
          "warnings": []
        },
        {
          "rowNumber": 3,
          "status": "success",
          "productId": "674c5f7a1234567890abcd03",
          "action": "created",
          "data": { ... },
          "errors": [],
          "warnings": ["SKU not provided. Will auto-generate"]
        }
      ],
      "startTime": "2025-12-01T10:00:00.000Z",
      "endTime": "2025-12-01T10:00:05.234Z",
      "duration": 5234
    }
  }
}
```

## 📋 All Available Endpoints

### 1. Get Import Template
```bash
GET /api/merchant/products/import-template
```

### 2. Get Import Instructions
```bash
GET /api/merchant/products/import-instructions
```

### 3. Upload Import File
```bash
POST /api/merchant/products/bulk-import
Body: multipart/form-data
- file: <CSV or Excel file>
- storeId: <store-id>
```

### 4. Get Import Job Status
```bash
GET /api/merchant/products/import-status/:jobId
```

### 5. List All Import Jobs
```bash
GET /api/merchant/products/import-jobs?status=completed&page=1&limit=20
```

### 6. Delete Import Job
```bash
DELETE /api/merchant/products/import-job/:jobId
```

## 🧪 Testing Scenarios

### Test 1: Valid Import
```csv
name,description,price,category,stock
Valid Product 1,Description 1,999,Electronics,100
Valid Product 2,Description 2,1499,Electronics,50
```

**Expected**: All products created successfully

### Test 2: Missing Required Fields
```csv
name,description,price,category,stock
,Missing name,999,Electronics,100
Valid Product,,999,Electronics,100
Valid Product,Valid desc,,Electronics,100
Valid Product,Valid desc,999,,100
Valid Product,Valid desc,999,Electronics,
```

**Expected**: All rows fail with specific error messages

### Test 3: Invalid Values
```csv
name,description,price,category,stock
Valid Product,Valid desc,-100,Electronics,100
Valid Product,Valid desc,999,InvalidCategory,100
Valid Product,Valid desc,abc,Electronics,100
Valid Product,Valid desc,999,Electronics,-50
```

**Expected**: Each row fails with specific validation error

### Test 4: Auto-Generate SKU
```csv
name,description,price,category,stock,sku
Product with SKU,Description,999,Electronics,100,CUSTOM-SKU
Product without SKU,Description,999,Electronics,100,
```

**Expected**:
- Row 1: Uses `CUSTOM-SKU`
- Row 2: Auto-generates SKU (e.g., `PROD-123456`)

### Test 5: Update Existing Product
```csv
name,description,price,category,stock,sku
Updated Product,Updated description,1299,Electronics,150,EXISTING-SKU
```

**Expected**: If `EXISTING-SKU` exists, product is updated

### Test 6: Multiple Image URLs
```csv
name,description,price,category,stock,images
Product 1,Description,999,Electronics,100,"https://example.com/img1.jpg,https://example.com/img2.jpg,https://example.com/img3.jpg"
```

**Expected**: Product created with 3 images

### Test 7: Category by Name
```csv
name,description,price,category,stock
Product 1,Description,999,Electronics,100
Product 2,Description,999,Fashion,50
```

**Expected**: Products created under respective categories (case-insensitive match)

### Test 8: Category by ID
```csv
name,description,price,category,stock
Product 1,Description,999,674c5f6a1234567890abc001,100
```

**Expected**: Product created with specified category ID

## 🐛 Common Errors and Solutions

### Error: "No file uploaded"
**Solution**: Ensure you're using `multipart/form-data` and field name is `file`

### Error: "Invalid file type"
**Solution**: Only CSV (.csv) and Excel (.xlsx, .xls) files are accepted

### Error: "Store not found or does not belong to this merchant"
**Solution**: Verify `storeId` exists and belongs to authenticated merchant

### Error: "File contains too many rows"
**Solution**: Split file into batches of max 1000 rows

### Error: "Category 'XYZ' not found"
**Solution**:
1. Check category name spelling
2. Ensure category exists in database
3. Use category ID instead of name

### Error: "SKU ABC already exists in another store"
**Solution**:
1. Use different SKU
2. Remove SKU column to auto-generate
3. If updating, ensure SKU matches store

## 📊 Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 202 | Accepted | Import job created, processing in background |
| 200 | OK | Status check, job listing successful |
| 400 | Bad Request | Missing required fields, invalid file |
| 401 | Unauthorized | Invalid or missing auth token |
| 404 | Not Found | Import job or store not found |
| 500 | Server Error | Internal processing error |

## 🔍 Monitoring Import Progress

### Polling Strategy (Recommended)
```javascript
async function monitorImport(jobId, token) {
  const pollInterval = 2000; // 2 seconds
  const maxAttempts = 60; // 2 minutes max
  let attempts = 0;

  const poll = async () => {
    if (attempts >= maxAttempts) {
      throw new Error('Import timeout');
    }

    const response = await fetch(
      `http://localhost:5001/api/merchant/products/import-status/${jobId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { data } = await response.json();

    console.log(`Progress: ${data.progress.percentage}%`);

    if (data.status === 'completed') {
      console.log('✅ Import completed!');
      console.log(`Success: ${data.progress.successful}`);
      console.log(`Failed: ${data.progress.failed}`);
      return data.result;
    } else if (data.status === 'failed') {
      console.error('❌ Import failed:', data.error);
      throw new Error(data.error);
    } else {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      return poll();
    }
  };

  return poll();
}
```

## 💾 File Locations

| Item | Location |
|------|----------|
| Uploaded files | `user-backend/uploads/imports/` |
| Service | `src/merchantservices/bulkImportService.ts` |
| Routes | `src/merchantroutes/bulkImport.ts` |
| Model | `src/models/ImportJob.ts` |

**Note**: Uploaded files are automatically deleted after processing.

## 🔐 Security Notes

1. **Authentication Required**: All endpoints require valid merchant token
2. **Store Ownership**: Import only allowed for merchant's own stores
3. **File Validation**: Only CSV and Excel files accepted
4. **Size Limits**: Max 10MB file size, max 1000 rows per import
5. **Rate Limiting**: Consider adding rate limits in production

## 📝 Sample Excel File Structure

Create an Excel file (.xlsx) with these columns in the first row:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| name | description | price | category | stock | sku | brand |
| Product 1 | Desc 1 | 999 | Electronics | 100 | PRD-001 | Apple |
| Product 2 | Desc 2 | 1499 | Fashion | 50 | PRD-002 | Nike |

Save and upload like CSV.

## ✅ Checklist Before Import

- [ ] Backend server is running
- [ ] Have valid merchant authentication token
- [ ] Know your store ID
- [ ] CSV/Excel file has correct headers
- [ ] All required columns filled
- [ ] Categories exist in database
- [ ] SKUs are unique (or omitted for auto-generation)
- [ ] Image URLs are valid (optional)
- [ ] File size under 10MB
- [ ] Row count under 1000

## 🎯 Quick Success Test

```bash
# 1. Get template
curl http://localhost:5001/api/merchant/products/import-template \
  -H "Authorization: Bearer TOKEN" > template.csv

# 2. Edit template.csv (add 1-2 products)

# 3. Upload
curl -X POST http://localhost:5001/api/merchant/products/bulk-import \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@template.csv" \
  -F "storeId=STORE_ID" | jq .

# 4. Get job ID from response and check status
curl http://localhost:5001/api/merchant/products/import-status/JOB_ID \
  -H "Authorization: Bearer TOKEN" | jq .
```

If all steps succeed, your bulk import is working! 🎉

---

**Need Help?** Check `BULK_IMPORT_IMPLEMENTATION_COMPLETE.md` for detailed documentation.
