# Bill Upload API Documentation

## Overview
The bill upload system allows users to upload receipts/bills from offline purchases and earn cashback. The system uses Cloudinary for image storage and Google Cloud Vision API for OCR text extraction.

## Features
- Upload bill images (JPG, PNG, PDF)
- Automatic OCR text extraction from bills
- Admin verification system
- Fraud detection and prevention
- Cashback calculation and distribution
- Bill history tracking

## Endpoints

### 1. Upload Bill
**POST** `/api/bills/upload`

Upload a new bill/receipt for cashback verification.

**Headers:**
- `Authorization: Bearer {token}` (Required)
- `Content-Type: multipart/form-data`

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| billImage | File | Yes | Bill/receipt image (JPG, PNG, PDF) |
| merchantId | String | No | Merchant ID if known |
| amount | Number | No | Bill amount |
| date | String | No | Purchase date (ISO format) |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bill_123456",
    "imageUrl": "https://res.cloudinary.com/...",
    "thumbnailUrl": "https://res.cloudinary.com/.../thumbnail.jpg",
    "status": "processing",
    "extractedData": null,
    "createdAt": "2025-10-24T10:00:00Z"
  }
}
```

**Status Codes:**
- `201`: Bill uploaded successfully
- `400`: Invalid file or missing required fields
- `401`: Unauthorized (invalid or missing token)
- `413`: File too large
- `500`: Server error

---

### 2. Get User Bills
**GET** `/api/bills/`

Get all bills uploaded by the authenticated user.

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| status | String | Filter by status (pending, approved, rejected) | All |
| page | Number | Page number | 1 |
| limit | Number | Items per page | 10 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bill_123456",
      "imageUrl": "https://res.cloudinary.com/...",
      "thumbnailUrl": "https://res.cloudinary.com/.../thumbnail.jpg",
      "status": "approved",
      "extractedData": {
        "merchantName": "Store ABC",
        "amount": 1500,
        "date": "2025-10-23"
      },
      "cashbackAmount": 75,
      "cashbackPercentage": 5,
      "verifiedAt": "2025-10-24T10:00:00Z",
      "createdAt": "2025-10-23T15:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10
  }
}
```

---

### 3. Get Bill Details
**GET** `/api/bills/:billId`

Get detailed information about a specific bill.

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bill_123456",
    "userId": "user_789",
    "imageUrl": "https://res.cloudinary.com/...",
    "thumbnailUrl": "https://res.cloudinary.com/.../thumbnail.jpg",
    "status": "approved",
    "extractedData": {
      "merchantName": "Store ABC",
      "merchantId": "merchant_456",
      "amount": 1500,
      "date": "2025-10-23",
      "items": ["Item 1", "Item 2"]
    },
    "cashbackAmount": 75,
    "cashbackPercentage": 5,
    "verificationNotes": "Bill verified successfully",
    "verifiedBy": "admin_123",
    "verifiedAt": "2025-10-24T10:00:00Z",
    "createdAt": "2025-10-23T15:30:00Z",
    "updatedAt": "2025-10-24T10:00:00Z"
  }
}
```

---

### 4. Get Bill Statistics
**GET** `/api/bills/statistics`

Get statistics about user's bill uploads and earnings.

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBills": 25,
    "approvedBills": 20,
    "pendingBills": 3,
    "rejectedBills": 2,
    "totalCashbackEarned": 1500,
    "averageCashback": 75,
    "lastUpload": "2025-10-23T15:30:00Z"
  }
}
```

---

### 5. Resubmit Bill
**POST** `/api/bills/:billId/resubmit`

Resubmit a rejected bill with corrections.

**Headers:**
- `Authorization: Bearer {token}` (Required)
- `Content-Type: multipart/form-data`

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| billImage | File | Yes | Updated bill image |
| notes | String | No | Explanation for resubmission |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bill_123456",
    "imageUrl": "https://res.cloudinary.com/...",
    "status": "processing",
    "resubmittedAt": "2025-10-24T11:00:00Z"
  }
}
```

---

## Admin Endpoints

### 6. Get Pending Bills (Admin Only)
**GET** `/api/bills/admin/pending`

Get all bills pending verification.

**Headers:**
- `Authorization: Bearer {admin_token}` (Required)
- `X-Admin-Role: admin` (Required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bill_123456",
      "userId": "user_789",
      "userName": "John Doe",
      "imageUrl": "https://res.cloudinary.com/...",
      "extractedData": {
        "merchantName": "Store ABC",
        "amount": 1500
      },
      "uploadedAt": "2025-10-23T15:30:00Z"
    }
  ]
}
```

---

### 7. Approve Bill (Admin Only)
**POST** `/api/bills/:billId/approve`

Approve a bill and issue cashback.

**Headers:**
- `Authorization: Bearer {admin_token}` (Required)
- `X-Admin-Role: admin` (Required)

**Body Parameters:**
```json
{
  "cashbackAmount": 75,
  "cashbackPercentage": 5,
  "notes": "Bill verified and approved"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bill_123456",
    "status": "approved",
    "cashbackAmount": 75,
    "verifiedAt": "2025-10-24T10:00:00Z"
  }
}
```

---

### 8. Reject Bill (Admin Only)
**POST** `/api/bills/:billId/reject`

Reject a bill with reason.

**Headers:**
- `Authorization: Bearer {admin_token}` (Required)
- `X-Admin-Role: admin` (Required)

**Body Parameters:**
```json
{
  "reason": "Bill image is unclear",
  "allowResubmission": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bill_123456",
    "status": "rejected",
    "rejectionReason": "Bill image is unclear",
    "rejectedAt": "2025-10-24T10:00:00Z"
  }
}
```

---

### 9. Get Verification Statistics (Admin Only)
**GET** `/api/bills/admin/statistics`

Get overall verification statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBills": 1000,
    "pendingBills": 50,
    "approvedBills": 800,
    "rejectedBills": 150,
    "totalCashbackIssued": 50000,
    "averageProcessingTime": "2 hours"
  }
}
```

---

### 10. Get User Fraud History (Admin Only)
**GET** `/api/bills/admin/users/:userId/fraud-history`

Get fraud history for a specific user.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_789",
    "totalRejections": 5,
    "suspiciousPatterns": ["Multiple uploads of same bill", "Edited images"],
    "riskLevel": "medium",
    "recommendations": ["Require manual verification for next uploads"]
  }
}
```

---

## Bill Status Flow

1. **Processing** - Bill uploaded, OCR in progress
2. **Pending** - Awaiting admin verification
3. **Approved** - Bill verified, cashback issued
4. **Rejected** - Bill rejected, reason provided

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid file format | Only JPG, PNG, PDF allowed |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Bill not found | Bill ID doesn't exist |
| 413 | File too large | Max file size is 10MB |
| 422 | Validation failed | Invalid data provided |
| 429 | Too many requests | Rate limit exceeded |
| 500 | Server error | Internal server error |

---

## Environment Variables Required

```bash
# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Google Cloud Vision (for OCR text extraction)
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key_here
```

---

## Setup Instructions

### 1. Get Cloudinary Credentials
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard
3. Copy Cloud Name, API Key, and API Secret
4. Add to `.env` file

### 2. Get Google Cloud Vision API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Cloud Vision API
4. Create API key
5. Add to `.env` file

### 3. Start the Server
```bash
npm install
npm run dev
```

### 4. Test Bill Upload
```bash
npm run test:bill-upload
```

---

## Usage Example (cURL)

### Upload Bill
```bash
curl -X POST http://localhost:5001/api/bills/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "billImage=@/path/to/bill.jpg" \
  -F "merchantId=merchant_123" \
  -F "amount=1500"
```

### Get User Bills
```bash
curl -X GET http://localhost:5001/api/bills/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Bill Details
```bash
curl -X GET http://localhost:5001/api/bills/bill_123456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Frontend Integration Example (React Native)

```typescript
import { uploadBill, getUserBills } from '@/services/billApi';

// Upload bill
const handleUploadBill = async (imageUri: string) => {
  try {
    const formData = new FormData();
    formData.append('billImage', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'bill.jpg',
    });

    const result = await uploadBill(formData);
    console.log('Bill uploaded:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

// Get user bills
const fetchBills = async () => {
  try {
    const bills = await getUserBills({ status: 'approved' });
    console.log('User bills:', bills);
  } catch (error) {
    console.error('Fetch failed:', error);
  }
};
```

---

## Notes

- Maximum file size: 10MB
- Supported formats: JPG, PNG, PDF
- Images are automatically compressed and optimized
- Thumbnails are generated for faster loading
- OCR processing may take 5-30 seconds
- Bills are manually verified by admins within 24-48 hours
- Cashback is credited to user wallet after approval
- Users can resubmit rejected bills with corrections

---

## Security Considerations

1. All uploads require authentication
2. File types are validated
3. File sizes are limited
4. Images are scanned for malicious content
5. Rate limiting prevents abuse
6. Admin actions are logged
7. Fraud detection system in place
8. User data is encrypted

---

## Support

For issues or questions:
- Email: support@rezapp.com
- Docs: https://docs.rezapp.com/bill-upload
- GitHub: https://github.com/rezapp/backend/issues
