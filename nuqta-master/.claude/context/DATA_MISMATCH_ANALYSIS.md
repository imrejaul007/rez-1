# Frontend-Backend Data Mismatch Analysis

## Cart API Mismatches

### ✅ Working Endpoints
1. **GET /cart** - Working
2. **POST /cart/add** - Working
3. **PUT /cart/item/:productId** - Working
4. **DELETE /cart/item/:productId** - Working
5. **GET /cart/summary** - Working
6. **GET /cart/validate** - Working

### ⚠️ Data Structure Issues

#### Backend Response vs Frontend Interface

**Backend Cart Response:**
```json
{
  "_id": "string",
  "user": "string",
  "items": [{
    "product": "ObjectId or populated object",
    "store": "ObjectId or populated object",
    "quantity": "number",
    "price": "number",
    "originalPrice": "number",
    "discount": "number",
    "addedAt": "Date",
    "_id": "string"
  }],
  "totals": {
    "subtotal": "number",
    "tax": "number",
    "delivery": "number",
    "discount": "number",
    "cashback": "number",
    "total": "number",
    "savings": "number"
  },
  "coupon": {
    "code": "string",
    "discountType": "string",
    "discountValue": "number",
    "appliedAmount": "number",
    "appliedAt": "Date"
  },
  "itemCount": "number",
  "storeCount": "number",
  "isActive": "boolean",
  "expiresAt": "Date"
}
```

**Frontend Expected:**
- ✅ Mostly matches
- ⚠️ Frontend expects `images` as array of objects, backend returns `image` as string

### ❌ Missing Backend Endpoints

These frontend methods don't have backend endpoints:
1. **POST /cart/coupon** - Apply coupon (frontend expects it, backend might use different endpoint)
2. **DELETE /cart/coupon** - Remove coupon
3. **DELETE /cart/clear** - Clear cart
4. **GET /cart/shipping-estimates** - Get shipping estimates
5. **POST /cart/move-to-wishlist** - Move to wishlist
6. **POST /cart/save-for-later** - Save cart
7. **POST /cart/merge** - Merge carts

---

## Order API Mismatches

### ✅ Working Endpoints
1. **POST /orders** - Create order ✅
2. **GET /orders** - Get user orders ✅
3. **GET /orders/:id** - Get order by ID ✅
4. **GET /orders/:id/tracking** - Get tracking ✅
5. **GET /orders/stats** - Get statistics ✅
6. **PATCH /orders/:id/cancel** - Cancel order ✅

### ⚠️ Data Structure Issues

#### Backend Order Response vs Frontend Interface

**Mismatches:**

1. **Order Status Values:**
   - Backend: `'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'returned' | 'refunded'`
   - Frontend: `'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'`
   - ❌ `placed` vs `pending`
   - ❌ `preparing/ready/dispatched` vs `processing/shipped`

2. **Order Items Structure:**
   - Backend: `{ product, store, name, image, quantity, price, originalPrice, discount, subtotal }`
   - Frontend: `{ id, productId, product: {...}, quantity, unitPrice, totalPrice }`
   - ❌ Field name differences

3. **Address Structure:**
   - Backend: `deliveryAddress: { name, phone, addressLine1, addressLine2, city, state, pincode, ... }`
   - Frontend: `shippingAddress: { firstName, lastName, address1, address2, city, state, zipCode, ... }`
   - ❌ Different field names (`name` vs `firstName/lastName`, `pincode` vs `zipCode`)

4. **Order Summary/Totals:**
   - Backend: `totals: { subtotal, tax, delivery, discount, cashback, total }`
   - Frontend: `summary: { subtotal, shipping, tax, discount, total }`
   - ❌ `delivery` vs `shipping`
   - ⚠️ Frontend missing `cashback`

5. **Payment:**
   - Backend: `payment: { method, status, ... }`
   - Frontend: Separate `paymentStatus` field
   - ⚠️ Needs mapping

### ❌ Missing Backend Endpoints

Frontend expects but backend doesn't have:
1. **GET /orders/number/:orderNumber** - Get by order number
2. **POST /orders/:id/rate** - Rate order (exists in backend, need to update frontend)
3. **PATCH /orders/:id/status** - Update status (admin only, exists)
4. **POST /orders/:id/tracking** - Add tracking
5. **PATCH /orders/:id/tracking** - Update tracking
6. **POST /orders/:id/payment-intent** - Create payment
7. **POST /orders/:id/confirm-payment** - Confirm payment
8. **POST /orders/refund** - Request refund
9. **GET /orders/:id/invoice** - Get invoice
10. **POST /orders/:id/reorder** - Reorder
11. **GET /orders/statistics** - Statistics (exists as /orders/stats)
12. **GET /orders/track/:orderNumber** - Public tracking
13. **POST /orders/delivery-estimates** - Delivery estimates

---

## Required Actions

### 1. Fix Cart Data Mapping
- ✅ Cart structure mostly compatible
- ⚠️ Need to handle product.image vs product.images

### 2. Fix Order Data Mapping
- Create interface adapters to map backend response to frontend interface
- Handle status differences
- Handle address structure differences
- Handle totals vs summary differences

### 3. Add Missing Cart Endpoints (Optional)
- POST /cart/coupon - Apply coupon
- DELETE /cart/coupon - Remove coupon
- DELETE /cart/clear - Clear cart

### 4. Add Missing Order Endpoints (If Needed)
- Rate order endpoint already exists
- Others are optional for MVP

### 5. Create Data Transformation Layer
- Add response transformers in frontend services
- Map backend data to frontend interfaces
- Handle field name differences

---

## Priority Fixes

### High Priority (Blocking)
1. ✅ Order creation working
2. ✅ Cart operations working
3. ⚠️ Need data transformers for orders
4. ⚠️ Need to add missing cart endpoints

### Medium Priority
1. Add coupon management endpoints
2. Add cart clear endpoint
3. Add data transformers

### Low Priority
1. Shipping estimates
2. Wishlist integration
3. Order reorder functionality