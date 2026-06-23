# Example Endpoint Implementation

## GET /api/merchant/onboarding/status

This is a sample of how all onboarding endpoints are structured.

---

## Full Implementation

**File**: `src/merchantroutes/onboarding.ts` (Lines 44-61)

```typescript
/**
 * @route   GET /api/merchant/onboarding/status
 * @desc    Get onboarding status and progress
 * @access  Private (Merchant)
 */
router.get('/status', authenticateMerchant, async (req: Request, res: Response) => {
  try {
    // Extract merchantId from authenticated request
    const merchantId = (req as any).merchant.id;

    // Call service layer for business logic
    const status = await OnboardingService.getOnboardingStatus(merchantId);

    // Return standardized success response
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    console.error('Get onboarding status error:', error);

    // Return standardized error response
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get onboarding status'
    });
  }
});
```

---

## Key Features Demonstrated

### 1. **Route Definition**
```typescript
router.get('/status', authenticateMerchant, async (req, res) => { ... })
```
- HTTP Method: `GET`
- Path: `/status` (mounted at `/api/merchant/onboarding`)
- Middleware: `authenticateMerchant` (JWT verification)
- Handler: Async function with Request/Response

### 2. **Authentication Middleware**
```typescript
authenticateMerchant
```
- Verifies JWT token from `Authorization: Bearer <token>` header
- Decodes token to extract `merchantId`
- Validates merchant exists and is active
- Attaches `merchant` object to request
- Returns 401 if unauthorized

### 3. **Service Layer Pattern**
```typescript
const status = await OnboardingService.getOnboardingStatus(merchantId);
```
- Business logic separated into service layer
- Service handles database operations
- Service performs validation
- Service calculates derived data (progress percentage, etc.)
- Controller (route) only handles HTTP concerns

### 4. **Standardized Response Format**

**Success Response**:
```typescript
res.json({
  success: true,
  data: status  // Actual data returned from service
});
```

**Error Response**:
```typescript
res.status(500).json({
  success: false,
  message: error.message || 'Failed to get onboarding status'
});
```

### 5. **Error Handling**
```typescript
try {
  // Happy path
} catch (error: any) {
  console.error('Get onboarding status error:', error);
  res.status(500).json({
    success: false,
    message: error.message || 'Failed to get onboarding status'
  });
}
```
- Try-catch wraps all logic
- Errors logged to console
- User-friendly error message returned
- Generic fallback message if error has no message

---

## Service Layer Implementation

**File**: `src/merchantservices/OnboardingService.ts` (Lines 14-43)

```typescript
/**
 * Get onboarding status and progress for a merchant
 */
static async getOnboardingStatus(merchantId: string): Promise<any> {
  const merchant = await Merchant.findById(merchantId);

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  // Initialize onboarding if not started
  if (!merchant.onboarding) {
    merchant.onboarding = {
      status: 'pending',
      currentStep: 1,
      completedSteps: [],
      stepData: {}
    };
    await merchant.save();
  }

  return {
    status: merchant.onboarding.status,
    currentStep: merchant.onboarding.currentStep,
    completedSteps: merchant.onboarding.completedSteps || [],
    totalSteps: 5,
    progressPercentage: this.calculateProgress(merchant.onboarding.completedSteps || []),
    stepData: merchant.onboarding.stepData || {},
    startedAt: merchant.onboarding.startedAt,
    completedAt: merchant.onboarding.completedAt,
    rejectionReason: merchant.onboarding.rejectionReason
  };
}
```

---

## Authentication Flow

```
Client Request
      ↓
┌─────────────────────────────────────┐
│  Authorization: Bearer <JWT_TOKEN>  │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│   authenticateMerchant Middleware   │
│   - Extract token from header       │
│   - Verify using JWT_MERCHANT_SECRET│
│   - Find merchant in database       │
│   - Check if active                 │
│   - Attach to req.merchant          │
└─────────────────┬───────────────────┘
                  ↓
         ┌────────────────┐
         │  Authorized?   │
         └───┬────────┬───┘
             │        │
            YES       NO
             │        │
             │        ↓
             │   Return 401
             │
             ↓
┌─────────────────────────────────────┐
│       Route Handler Executes        │
│   - Extract merchantId from req     │
│   - Call service layer              │
│   - Return standardized response    │
└─────────────────────────────────────┘
```

---

## Response Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "status": "in_progress",
    "currentStep": 2,
    "completedSteps": [1],
    "totalSteps": 5,
    "progressPercentage": 20,
    "stepData": {
      "businessInfo": {
        "companyName": "My Business",
        "businessType": "retail"
      }
    },
    "startedAt": "2024-01-15T10:30:00.000Z",
    "completedAt": null,
    "rejectionReason": null
  }
}
```

### Error Response (Unauthorized)
```json
{
  "success": false,
  "message": "No token provided, authorization denied"
}
```

### Error Response (Server Error)
```json
{
  "success": false,
  "message": "Failed to get onboarding status"
}
```

---

## Testing

### Using cURL
```bash
# Set your JWT token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Make request
curl -X GET http://localhost:5001/api/merchant/onboarding/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Using Postman
1. **Method**: GET
2. **URL**: `http://localhost:5001/api/merchant/onboarding/status`
3. **Headers**:
   - `Authorization`: `Bearer <your_jwt_token>`
   - `Content-Type`: `application/json`
4. **Send**

### Using JavaScript/Axios
```javascript
const axios = require('axios');

const getOnboardingStatus = async () => {
  try {
    const response = await axios.get(
      'http://localhost:5001/api/merchant/onboarding/status',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Status:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};
```

---

## Pattern Applied to All Endpoints

All 8 onboarding endpoints follow this exact pattern:

1. ✅ **Route definition** with HTTP method and path
2. ✅ **Authentication middleware** (`authenticateMerchant`)
3. ✅ **Extract merchantId** from authenticated request
4. ✅ **Call service layer** for business logic
5. ✅ **Return standardized response** (success/error)
6. ✅ **Error handling** with try-catch
7. ✅ **Logging** for debugging
8. ✅ **TypeScript types** for type safety

This ensures consistency, maintainability, and reliability across all endpoints.
