# Agent 1: Onboarding Endpoints - Quick Reference

## 🚀 All 8 Required Endpoints - IMPLEMENTED ✅

### Base URL: `/api/merchant/onboarding`

---

## 1️⃣ Get Onboarding Status
```http
GET /api/merchant/onboarding/status
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "in_progress",
    "currentStep": 2,
    "completedSteps": [1],
    "totalSteps": 5,
    "progressPercentage": 20
  }
}
```

---

## 2️⃣ Save Step 1 - Business Info
```http
POST /api/merchant/onboarding/step/1
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "companyName": "My Business",
  "businessType": "retail",
  "gstNumber": "29ABCDE1234F1Z5",
  "panNumber": "ABCDE1234F"
}
```

---

## 3️⃣ Save Step 2 - Store Details
```http
POST /api/merchant/onboarding/step/2
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "storeName": "My Store",
  "category": "Electronics",
  "address": {
    "street": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka"
  }
}
```

---

## 4️⃣ Save Step 3 - Bank Details
```http
POST /api/merchant/onboarding/step/3
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "accountNumber": "1234567890",
  "ifscCode": "SBIN0001234",
  "accountHolderName": "John Doe"
}
```

---

## 5️⃣ Save Step 4 - Products (Optional)
```http
POST /api/merchant/onboarding/step/4
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{}
```
*Can be skipped*

---

## 6️⃣ Save Step 5 - Documents
```http
POST /api/merchant/onboarding/step/5
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "documents": [
    {
      "type": "business_license",
      "url": "https://cloudinary.com/..."
    }
  ]
}
```

---

## 7️⃣ Submit for Verification
```http
POST /api/merchant/onboarding/submit
Authorization: Bearer <JWT_TOKEN>
```

**Requirements**:
- All 5 steps must be completed
- All data must be valid

**Response**:
```json
{
  "success": true,
  "message": "Onboarding submitted successfully",
  "data": {
    "status": "completed"
  }
}
```

---

## 8️⃣ Get Uploaded Documents
```http
GET /api/merchant/onboarding/documents
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "type": "business_license",
        "url": "https://...",
        "status": "pending"
      }
    ]
  }
}
```

---

## 🔐 Authentication

All endpoints require JWT token in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Type**: Merchant JWT (uses `JWT_MERCHANT_SECRET`)

---

## 📊 Workflow

```
┌─────────────────┐
│  Get Status     │  Step 1: Check current progress
└────────┬────────┘
         ↓
┌─────────────────┐
│  Save Step 1    │  Step 2: Business Information
└────────┬────────┘
         ↓
┌─────────────────┐
│  Save Step 2    │  Step 3: Store Details
└────────┬────────┘
         ↓
┌─────────────────┐
│  Save Step 3    │  Step 4: Bank Details
└────────┬────────┘
         ↓
┌─────────────────┐
│  Save Step 4    │  Step 5: Products (Optional)
└────────┬────────┘
         ↓
┌─────────────────┐
│  Upload Docs    │  Step 6: Upload documents
│  Save Step 5    │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Submit         │  Step 7: Final submission
└────────┬────────┘
         ↓
┌─────────────────┐
│  Get Documents  │  Step 8: Check status
└─────────────────┘
```

---

## ⚠️ Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Invalid step number. Must be between 1 and 5."
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "No token provided, authorization denied"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Failed to save step data"
}
```

---

## ✅ Validation Rules

### GST Number
- Format: `22AAAAA0000A1Z5`
- Regex: `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`

### PAN Number
- Format: `AAAAA9999A`
- Regex: `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`

### IFSC Code
- Format: `AAAA0XXXXXX`
- Regex: `/^[A-Z]{4}0[A-Z0-9]{6}$/`

---

## 🎯 Testing

### Get Token First
```bash
# Login as merchant
POST /api/merchant/auth/login
{
  "email": "merchant@example.com",
  "password": "password123"
}

# Use returned token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Test Endpoints
```bash
# 1. Get status
curl -X GET http://localhost:5001/api/merchant/onboarding/status \
  -H "Authorization: Bearer $TOKEN"

# 2. Save step 1
curl -X POST http://localhost:5001/api/merchant/onboarding/step/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test Co","businessType":"retail"}'

# 3-6. Continue with other steps...

# 7. Submit
curl -X POST http://localhost:5001/api/merchant/onboarding/submit \
  -H "Authorization: Bearer $TOKEN"

# 8. Get documents
curl -X GET http://localhost:5001/api/merchant/onboarding/documents \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📁 Implementation Files

1. **Routes**: `src/merchantroutes/onboarding.ts`
2. **Service**: `src/merchantservices/OnboardingService.ts`
3. **Document Service**: `src/merchantservices/DocumentVerificationService.ts`
4. **Auth Middleware**: `src/middleware/merchantauth.ts`
5. **Server Registration**: `src/server.ts` (Line 522)

---

## 🎉 Status: COMPLETE ✅

All 8 required endpoints are implemented, tested, and ready for use!
