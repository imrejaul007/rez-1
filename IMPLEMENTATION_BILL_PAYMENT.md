# Bill Payment Backend Implementation

## Status: FULLY IMPLEMENTED

All bill payment endpoints are implemented and routes are registered.

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/bill-payments/types` | List bill payment types with provider counts | No |
| GET | `/api/bill-payments/providers?type=<type>&page=1&limit=10` | List providers by bill type | Yes |
| POST | `/api/bill-payments/fetch-bill` | Fetch bill by consumer number | Yes |
| POST | `/api/bill-payments/pay` | Process bill payment | Yes |
| GET | `/api/bill-payments/plans?providerId=<id>&circle=KA` | Get prepaid recharge plans | Yes |
| GET | `/api/bill-payments/history?page=1&limit=10&billType=<type>` | Get payment history | Yes |
| POST | `/api/bill-payments/refund` | Request refund for payment | Yes |
| POST | `/api/bill-payments/webhook/bbps` | BBPS webhook (no auth) | No |

---

## Implemented Files

### Routes
- **`src/routes/billPaymentRoutes.ts`** - Express router with validation schemas
- **`src/config/routes.ts`** (line 387-389) - Route registration

### Controllers
- **`src/controllers/billPaymentController.ts`** - All endpoint handlers

### Models
- **`src/models/BillProvider.ts`** - Bill provider schema with soft delete
- **`src/models/BillPayment.ts`** - Payment transaction schema

### Services
- **`src/services/bbpsService.ts`** - Razorpay BBPS API integration

### Tests
- **`src/__tests__/routes/billPayment.test.ts`** - Unit tests

---

## API Contracts

### GET /api/bill-payments/types

**Description**: Returns all bill types with metadata (icons, colors, labels) and provider counts.

**Headers**:
- `x-rez-region` (optional): Filter by region (e.g., "ka", "mh")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "electricity",
      "label": "Electricity",
      "icon": "flash-outline",
      "color": "#F59E0B",
      "category": "electricity",
      "providerCount": 15
    },
    {
      "id": "mobile_prepaid",
      "label": "Recharge",
      "icon": "phone-portrait-outline",
      "color": "#10B981",
      "category": "telecom",
      "providerCount": 8
    },
    {
      "id": "water",
      "label": "Water",
      "icon": "water-outline",
      "color": "#3B82F6",
      "category": "water",
      "providerCount": 5
    },
    {
      "id": "gas",
      "label": "Gas",
      "icon": "flame-outline",
      "color": "#EF4444",
      "category": "gas",
      "providerCount": 3
    },
    {
      "id": "dth",
      "label": "DTH",
      "icon": "radio-outline",
      "color": "#06B6D4",
      "category": "dth",
      "providerCount": 4
    },
    {
      "id": "internet",
      "label": "Internet",
      "icon": "wifi-outline",
      "color": "#8B5CF6",
      "category": "broadband",
      "providerCount": 6
    },
    {
      "id": "fastag",
      "label": "FASTag",
      "icon": "car-outline",
      "color": "#F97316",
      "category": "fastag",
      "providerCount": 2
    }
  ]
}
```

**Caching**: 5 minutes Redis cache per region

---

### GET /api/bill-payments/providers

**Query Parameters:**
- `type` (required): Bill type (electricity, water, gas, internet, mobile_postpaid, mobile_prepaid, broadband, dth, landline, insurance, fastag, education_fee)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10, max: 50): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "_id": "60d5ec...",
        "name": "BSES Delhi",
        "code": "bses-delhi",
        "type": "electricity",
        "logo": "https://...",
        "region": "delhi",
        "requiredFields": [
          {
            "fieldName": "consumerNumber",
            "label": "Consumer Number",
            "placeholder": "Enter your consumer number",
            "type": "text"
          }
        ],
        "cashbackPercent": 2,
        "promoCoinsFixed": 10,
        "promoExpiryDays": 7,
        "maxRedemptionPercent": 15,
        "isActive": true,
        "isFeatured": true,
        "displayOrder": 1
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Caching**: 5 minutes Redis cache per region/type

---

### POST /api/bill-payments/fetch-bill

**Request:**
```json
{
  "providerId": "60d5ec...",
  "customerNumber": "1234567890"
}
```

**Response (Standard Bill):**
```json
{
  "success": true,
  "data": {
    "provider": {
      "_id": "60d5ec...",
      "name": "BSES Delhi",
      "code": "bses-delhi",
      "logo": "https://...",
      "type": "electricity"
    },
    "customerNumber": "1234567890",
    "amount": 1500.00,
    "dueDate": "2026-03-31",
    "billDate": "2026-03-01",
    "consumerName": "John Doe",
    "billNumber": "BILL-001",
    "cashbackPercent": 2,
    "cashbackAmount": 30,
    "promoCoins": 10,
    "promoExpiryDays": 7,
    "maxRedemptionPercent": 15,
    "additionalInfo": {}
  }
}
```

**Response (Mobile Prepaid - requires plan selection):**
```json
{
  "success": true,
  "data": {
    "provider": { "_id": "...", "name": "...", "code": "...", "logo": "...", "type": "mobile_prepaid" },
    "customerNumber": "9876543210",
    "billType": "mobile_prepaid",
    "requiresPlanSelection": true,
    "promoCoins": 10,
    "promoExpiryDays": 7
  }
}
```

**Security**: Financial rate limiter applied

---

### POST /api/bill-payments/pay

**Request:**
```json
{
  "providerId": "60d5ec...",
  "customerNumber": "1234567890",
  "amount": 1500,
  "razorpayPaymentId": "pay_xxx",
  "planId": "optional"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "_id": "...",
      "userId": "...",
      "provider": { "name": "BSES Delhi", "code": "bses-delhi", "logo": "...", "type": "electricity" },
      "billType": "electricity",
      "customerNumber": "1234567890",
      "amount": 1500,
      "cashbackAmount": 30,
      "promoCoinsIssued": 10,
      "promoExpiryDays": 7,
      "status": "completed",
      "transactionRef": "BP-1234567890-ABCD1234",
      "aggregatorRef": "txn_razorpay_xxx",
      "paidAt": "2026-03-25T10:30:00.000Z",
      "createdAt": "2026-03-25T10:30:00.000Z"
    },
    "promoCoinsEarned": 10,
    "promoExpiryDays": 7,
    "status": "SUCCESS",
    "message": "BSES Delhi payment of Rs.1500 successful! You earned 10 coins."
  }
}
```

**Security**: Financial rate limiter + Idempotency middleware (600s TTL)

**Side Effects**:
1. Creates `BillPayment` document with status "processing"
2. Calls `bbpsService.payBill()` to process with Razorpay
3. Updates payment status based on BBPS response
4. Issues promo coins via `rewardEngine.issue()` on success
5. Emits `bill_payment_confirmed` gamification event
6. Invalidates history cache

---

### GET /api/bill-payments/plans

**Query Parameters:**
- `providerId` (required): Provider ID
- `circle` (optional, default: "KA"): Telecom circle (e.g., "KA", "MH", "DL", "TN")

**Response:**
```json
{
  "success": true,
  "data": {
    "popular": [
      {
        "id": "plan_xxx",
        "name": "Rs.299 -- 28 Days",
        "price": 299,
        "validity": "28 Days",
        "data": "1.5GB/day",
        "calls": "Unlimited",
        "sms": "100/day",
        "isPopular": true
      }
    ],
    "allPlans": [
      { "id": "plan_xxx", "name": "Rs.199 -- 28 Days", "price": 199, "validity": "28 Days", "data": "1GB/day", "isPopular": false },
      { "id": "plan_yyy", "name": "Rs.299 -- 28 Days", "price": 299, "validity": "28 Days", "data": "1.5GB/day", "isPopular": true },
      { "id": "plan_zzz", "name": "Rs.499 -- 56 Days", "price": 499, "validity": "56 Days", "data": "2GB/day", "isPopular": false }
    ]
  }
}
```

**Caching**: 1 hour Redis cache per operator/circle combination

---

### GET /api/bill-payments/history

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10, max: 50): Items per page
- `billType` (optional): Filter by bill type

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "_id": "...",
        "userId": "...",
        "provider": { "name": "BSES Delhi", "code": "bses-delhi", "logo": "...", "type": "electricity" },
        "billType": "electricity",
        "customerNumber": "1234567890",
        "amount": 1500,
        "cashbackAmount": 30,
        "promoCoinsIssued": 10,
        "status": "completed",
        "transactionRef": "BP-1234567890-ABCD1234",
        "paidAt": "2026-03-25T10:30:00.000Z",
        "createdAt": "2026-03-25T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Caching**: 60 seconds Redis cache per user

---

### POST /api/bill-payments/refund

**Request:**
```json
{
  "paymentId": "60d5ec...",
  "reason": "Bill was already paid at customer end"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refundId": "rfnd_xxxxx",
    "status": "pending"
  },
  "message": "Refund initiated. Will credit in 5-7 business days."
}
```

**Validations**:
- Payment must exist and belong to authenticated user
- Payment must be "completed"
- No existing refund request
- Must have aggregator reference

---

### POST /api/bill-payments/webhook/bbps

**Description**: Handles BBPS webhook events from Razorpay.

**Headers**:
- `x-razorpay-signature`: HMAC-SHA256 signature for verification

**Supported Events**:

1. `bbps.payment.completed`:
```json
{
  "event": "bbps.payment.completed",
  "payload": {
    "transaction_id": "txn_xxx",
    "reference_id": "BP-1234567890-ABCD1234",
    "status": "SUCCESS"
  }
}
```

2. `bbps.refund.processed`:
```json
{
  "event": "bbps.refund.processed",
  "payload": {
    "reference_id": "BP-1234567890-ABCD1234",
    "refund_id": "rfnd_xxx"
  }
}
```

---

## Data Models

### BillProvider (`src/models/BillProvider.ts`)

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Unique identifier |
| name | String | Provider display name |
| code | String | Unique provider code (unique index) |
| type | Enum | Bill type (electricity, water, gas, internet, mobile_postpaid, mobile_prepaid, broadband, dth, landline, insurance, fastag, education_fee) |
| logo | String | Provider logo URL |
| region | String | Operating region (optional) |
| requiredFields | Array | Customer input fields configuration |
| cashbackPercent | Number | Cashback percentage (0-100) |
| promoCoinsFixed | Number | Fixed promo coins reward (0-500) |
| promoExpiryDays | Number | Days until promo coins expire (1-30) |
| maxRedemptionPercent | Number | Max % of bill that can be paid with coins (5-50) |
| aggregatorCode | String | BBPS operator code for Razorpay |
| aggregatorName | Enum | Aggregator (razorpay, setu, manual) |
| isActive | Boolean | Active status (indexed) |
| isFeatured | Boolean | Featured on top (indexed) |
| displayOrder | Number | Sort order (indexed) |
| isDeleted | Boolean | Soft delete flag |
| deletedAt | Date | Soft delete timestamp |
| deletedBy | ObjectId | Admin who deleted |

**Indexes**:
- `{ type: 1, isActive: 1 }`
- `{ code: 1 }` (unique)
- `{ type: 1, isActive: 1, displayOrder: 1 }`
- `{ isFeatured: 1, isActive: 1 }`
- `{ aggregatorCode: 1 }`

### BillPayment (`src/models/BillPayment.ts`)

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Unique identifier |
| userId | ObjectId | User reference (indexed) |
| provider | ObjectId | BillProvider reference (indexed) |
| billType | Enum | Bill type (indexed) |
| customerNumber | String | Customer account number (max 50) |
| amount | Number | Payment amount (min 1) |
| cashbackAmount | Number | Cashback earned |
| promoCoinsIssued | Number | Promo coins issued |
| promoExpiryDays | Number | Promo coins expiry |
| maxRedemptionPercent | Number | Max redemption percentage |
| status | Enum | pending/processing/completed/failed/refunded (indexed) |
| transactionRef | String | Internal reference (unique sparse) |
| aggregatorRef | String | Aggregator transaction ID (sparse) |
| aggregatorName | Enum | Aggregator (razorpay, setu, manual) |
| razorpayPaymentId | String | Razorpay payment ID (sparse) |
| razorpayOrderId | String | Razorpay order ID (sparse) |
| webhookVerified | Boolean | Webhook verification status |
| refundStatus | Enum | none/pending/processed/failed |
| refundRef | String | Refund reference |
| refundAmount | Number | Refund amount |
| refundedAt | Date | Refund completion time |
| refundReason | String | User's refund reason |
| walletDebited | Boolean | Whether wallet was debited |
| walletDebitedAmount | Number | Amount debited from wallet |
| dueDateRaw | Date | Original bill due date |
| reminderSent | Boolean | Payment reminder sent flag |
| paidAt | Date | Payment completion time |

**Indexes**:
- `{ userId: 1, createdAt: -1 }`
- `{ userId: 1, status: 1 }`
- `{ userId: 1, billType: 1, createdAt: -1 }`
- `{ transactionRef: 1 }` (unique sparse)
- `{ aggregatorRef: 1 }` (sparse)
- `{ status: 1, createdAt: -1 }`
- `{ dueDateRaw: 1, reminderSent: 1 }`
- `{ razorpayOrderId: 1 }` (sparse)

---

## Bill Types Supported

```typescript
const BILL_TYPES = [
  'electricity',
  'water',
  'gas',
  'internet',
  'mobile_postpaid',
  'mobile_prepaid',
  'broadband',
  'dth',
  'landline',
  'insurance',
  'fastag',
  'education_fee',
] as const;
```

### Type Metadata

```typescript
const BILL_TYPE_META = {
  electricity:     { label: 'Electricity',   icon: 'flash-outline',            color: '#F59E0B', category: 'electricity' },
  water:           { label: 'Water',         icon: 'water-outline',            color: '#3B82F6', category: 'water' },
  gas:             { label: 'Gas',           icon: 'flame-outline',            color: '#EF4444', category: 'gas' },
  internet:        { label: 'Internet',      icon: 'wifi-outline',             color: '#8B5CF6', category: 'broadband' },
  mobile_postpaid: { label: 'Postpaid',      icon: 'phone-portrait-outline',   color: '#D97706', category: 'telecom' },
  mobile_prepaid:  { label: 'Recharge',      icon: 'phone-portrait-outline',  color: '#10B981', category: 'telecom' },
  broadband:       { label: 'Broadband',     icon: 'tv-outline',              color: '#EC4899', category: 'broadband' },
  dth:             { label: 'DTH',           icon: 'radio-outline',           color: '#06B6D4', category: 'dth' },
  landline:        { label: 'Landline',      icon: 'call-outline',            color: '#6366F1', category: 'telecom' },
  insurance:       { label: 'Insurance',     icon: 'shield-checkmark-outline', color: '#6B7280', category: 'insurance' },
  fastag:          { label: 'FASTag',        icon: 'car-outline',             color: '#F97316', category: 'fastag' },
  education_fee:    { label: 'School Fees',   icon: 'school-outline',          color: '#8B5CF6', category: 'education' },
};
```

---

## BBPS Service Integration

**File**: `src/services/bbpsService.ts`

The BBPS service integrates with Razorpay's BillPay API:

### Methods

```typescript
// Fetch all operators for a category
async getOperators(category: string): Promise<BBPSOperator[]>

// Fetch prepaid recharge plans
async getPlans(operatorCode: string, circle: string): Promise<BBPSPlan[]>

// Fetch bill details for postpaid/utility bills
async fetchBill(operatorCode: string, customerNumber: string): Promise<BBPSBillInfo>

// Pay a bill or recharge
async payBill(params: {
  operatorCode: string;
  customerNumber: string;
  amount: number;
  razorpayPaymentId: string;
  internalRef: string;
  planId?: string;
}): Promise<BBPSPaymentResult>

// Check transaction status (for pending transactions)
async getTransactionStatus(aggregatorRef: string): Promise<{ status: string; amount: number }>

// Initiate refund
async initiateRefund(aggregatorRef: string, amount: number, reason: string): Promise<{ refundId: string }>
```

### Error Classification

The service classifies errors for proper handling:

| Error Type | HTTP Status | Retryable | Description |
|------------|-------------|-----------|-------------|
| TIMEOUT | 504 | Yes | Network/axios timeout - operator may still process |
| PROVIDER_ERROR | 502 | No | 4xx response - operator rejected (invalid account, etc.) |
| UPSTREAM_ERROR | 502 | Yes | 5xx response - Razorpay/NPCI issue, transient |
| NETWORK_ERROR | 502 | Yes | Network unreachable |

---

## Validation Rules

### Provider Query Schema
```javascript
{
  type: Joi.string()
    .valid('electricity', 'water', 'gas', 'internet', 'mobile_postpaid', 'mobile_prepaid',
           'broadband', 'dth', 'landline', 'insurance', 'fastag', 'education_fee')
    .required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
}
```

### Fetch Bill Schema
```javascript
{
  providerId: Joi.string().required(),
  customerNumber: Joi.string().trim().min(1).max(50).required(),
}
```

### Pay Bill Schema
```javascript
{
  providerId: Joi.string().required(),
  customerNumber: Joi.string().trim().min(1).max(50).required(),
  amount: Joi.number().positive().required(),
  razorpayPaymentId: Joi.string().optional(),
  planId: Joi.string().optional(),
}
```

### History Query Schema
```javascript
{
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  billType: Joi.string()
    .valid('electricity', 'water', 'gas', 'internet', 'mobile_postpaid', 'mobile_prepaid',
           'broadband', 'dth', 'landline', 'insurance', 'fastag', 'education_fee')
    .optional(),
}
```

---

## Security Features

1. **Authentication**: All protected endpoints require valid JWT token
2. **Rate Limiting**: `financialLimiter` applied to fetch/pay/refund endpoints
3. **Idempotency**: `idempotencyMiddleware` with 600s TTL on pay/refund
4. **Webhook Signature**: HMAC-SHA256 validation for BBPS webhooks
5. **Input Validation**: Joi schemas for all request bodies
6. **User Isolation**: All user-specific queries filter by userId

---

## Caching Strategy

| Endpoint | Cache TTL | Cache Key Pattern |
|----------|-----------|-------------------|
| types | 300s | `bill-payments:types:{region}` |
| providers | 300s | `bill-payments:providers:{region}:{type}:{page}:{limit}` |
| history | 60s | `bill-payments:history:{userId}:{billType}:{page}:{limit}` |
| plans | 3600s | `bbps:plans:{operatorCode}:{circle}` |

---

## Environment Variables

Required for bill payment functionality:

```bash
# Razorpay BBPS
RAZORPAY_KEY_ID=rzp_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

---

## Frontend Integration

**Frontend Service**: `nuqta-master/services/billPaymentApi.ts`

**UI Components**:
- `nuqta-master/app/bill-payment.tsx` - Main bill payment page
- `nuqta-master/app/bill-history.tsx` - Payment history page
- `nuqta-master/app/bill-upload.tsx` - Bill upload feature

**API Functions**:
```typescript
export async function getBillTypes(): Promise<ApiResponse<BillTypeInfo[]>>
export async function getProviders(type: string, page?: number, limit?: number): Promise<ApiResponse<{ providers: BillProviderInfo[]; pagination: PaginationInfo }>>
export async function fetchBill(providerId: string, customerNumber: string): Promise<ApiResponse<FetchedBillInfo>>
export async function payBill(providerId: string, customerNumber: string, amount: number, razorpayPaymentId?: string, planId?: string): Promise<ApiResponse<{ payment: BillPaymentRecord; promoCoinsEarned: number; ... }>>
export async function getPlans(providerId: string, circle?: string): Promise<ApiResponse<{ popular: BillPlanInfo[]; allPlans: BillPlanInfo[]; ... }>>
export async function getPaymentHistory(page?: number, limit?: number, billType?: string): Promise<ApiResponse<{ payments: BillPaymentRecord[]; pagination: PaginationInfo }>>
export async function requestRefund(paymentId: string, reason?: string): Promise<ApiResponse<{ refundId: string; status: string }>>
```

---

## Testing

**Test File**: `src/__tests__/routes/billPayment.test.ts`

**Coverage**:
- Public types endpoint access
- Authentication requirement validation
- Input validation (missing fields)
- Payment history retrieval
- Webhook event acknowledgment

**Run Tests**:
```bash
npm test -- --testPathPattern=billPayment
```

**Mocks Used**:
- `bbpsService` - Avoids real Razorpay calls
- `redisService` - Avoids Redis dependency
- `rewardEngine` - Avoids wallet side effects
- `gamificationEventBus` - Captures events for verification

---

## Database Indexes

For optimal query performance:

```javascript
// BillProvider
{ type: 1, isActive: 1 }
{ code: 1 } // unique
{ type: 1, isActive: 1, displayOrder: 1 }
{ isFeatured: 1, isActive: 1 }
{ aggregatorCode: 1 }

// BillPayment
{ userId: 1, createdAt: -1 }
{ userId: 1, status: 1 }
{ userId: 1, billType: 1, createdAt: -1 }
{ transactionRef: 1 } // unique sparse
{ aggregatorRef: 1 } // sparse
{ status: 1, createdAt: -1 }
{ dueDateRaw: 1, reminderSent: 1 }
{ razorpayOrderId: 1 } // sparse
```

---

## Error Handling

All endpoints use `asyncHandler` wrapper for consistent error handling:

```typescript
export const getBillTypes = asyncHandler(async (req: Request, res: Response) => {
  // ... handler code
});
```

Response format for errors:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Notes

1. The bill payment backend is fully implemented
2. Routes are properly registered in `src/config/routes.ts:387-389`
3. BBPS webhook is publicly accessible (no auth) as required by Razorpay
4. All required models (BillProvider, BillPayment) are in place with proper indexes
5. Soft delete is implemented for BillProvider
6. Region-based filtering is supported for multi-region deployments
7. Promo coins are issued via rewardEngine on successful payments
8. Gamification events are emitted for payment confirmations
