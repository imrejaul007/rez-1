# Frontend API Integration TODO

## Current Status

✅ **Backend APIs**: Fully implemented and tested
- Cart endpoints working
- Order endpoints working
- All operations validated

✅ **Frontend API Services**: Implemented
- `services/cartApi.ts` - Cart service ready
- `services/ordersApi.ts` - Order service ready
- Both services have correct interfaces and endpoints

❌ **Frontend UI Components**: Using mock data
- `app/CartPage.tsx` - Uses `mockCartData`
- `hooks/useCheckout.ts` - Uses `checkoutData`
- No components currently calling real APIs

---

## Integration Required

### 1. Cart Page Integration

**File**: `app/CartPage.tsx`

**Current**: Uses mock data from `utils/mockCartData.ts`
```typescript
const [productItems, setProductItems] = useState<CartItemType[]>(mockProductsData);
```

**Needs**: Integration with real cart API
```typescript
import cartService from '@/services/cartApi';

useEffect(() => {
  loadCart();
}, []);

const loadCart = async () => {
  const response = await cartService.getCart();
  // Map response.data to component state
};
```

**Actions Required**:
- [ ] Replace mock data with API calls
- [ ] Add loading states
- [ ] Handle errors
- [ ] Map backend response to component types
- [ ] Implement add/update/remove operations
- [ ] Test cart operations

---

### 2. Checkout Hook Integration

**File**: `hooks/useCheckout.ts`

**Current**: Uses `CheckoutData.api.initializeCheckout()` (mock)

**Needs**: Integration with cart and order APIs
```typescript
import cartService from '@/services/cartApi';
import ordersService from '@/services/ordersApi';

const initializeCheckout = async () => {
  const cart = await cartService.getCart();
  // Use cart data for checkout
};

const placeOrder = async (orderData) => {
  const response = await ordersService.createOrder(orderData);
  // Handle order creation
};
```

**Actions Required**:
- [ ] Replace mock API with real cartService
- [ ] Add order creation logic
- [ ] Handle payment flow
- [ ] Navigate to order confirmation
- [ ] Test complete checkout flow

---

### 3. Order Tracking Integration

**File**: `app/tracking/[orderId].tsx` (if exists) or create new

**Current**: Likely not implemented

**Needs**: Integration with order APIs
```typescript
import ordersService from '@/services/ordersApi';

const loadOrderTracking = async (orderId: string) => {
  const tracking = await ordersService.getOrderTracking(orderId);
  // Display tracking timeline
};
```

**Actions Required**:
- [ ] Create order tracking screen
- [ ] Display order timeline
- [ ] Show delivery status
- [ ] Add cancel order functionality
- [ ] Test tracking features

---

### 4. Profile/Orders Section

**File**: `app/profile/index.tsx` or create `app/orders/index.tsx`

**Current**: Likely showing mock orders or none

**Needs**: Integration with orders list API
```typescript
import ordersService from '@/services/ordersApi';

const loadOrders = async () => {
  const response = await ordersService.getOrders({ page: 1, limit: 20 });
  setOrders(response.data.orders);
};
```

**Actions Required**:
- [ ] Create orders list screen
- [ ] Display user's orders
- [ ] Add pagination
- [ ] Link to order details
- [ ] Show order status
- [ ] Test orders list

---

### 5. Data Type Mapping

**Issue**: Backend response structures differ slightly from frontend types

**Examples**:
- Backend: `totals.delivery` → Frontend: `summary.shipping`
- Backend: `status: 'placed'` → Frontend: `status: 'pending'`
- Backend: `deliveryAddress.pincode` → Frontend: `address.zipCode`

**Solution**: Create mapper functions

**File**: `utils/dataMappers.ts` (create new)

```typescript
export function mapBackendCartToFrontend(backendCart: BackendCart): FrontendCart {
  return {
    // Map fields
  };
}

export function mapFrontendOrderToBackend(frontendOrder: FrontendOrder): BackendOrderRequest {
  return {
    // Map fields
  };
}
```

**Actions Required**:
- [ ] Create dataMappers utility
- [ ] Add cart mapper
- [ ] Add order mapper
- [ ] Test mappings
- [ ] Use mappers in services

---

## Priority Integration Steps

### Phase 1: Cart Integration (High Priority)
1. Create data mappers for cart
2. Update CartPage to use cartService
3. Implement cart operations (add/update/remove)
4. Test cart functionality

### Phase 2: Checkout Integration (High Priority)
1. Update useCheckout hook
2. Connect to order creation API
3. Handle order placement
4. Add success/error handling

### Phase 3: Order Management (Medium Priority)
1. Create orders list screen
2. Create order details screen
3. Add order tracking
4. Implement cancel order

### Phase 4: Polish & Testing (Medium Priority)
1. Add loading states
2. Add error handling
3. Add offline support (optional)
4. Test complete flow

---

## Required New Files

1. **utils/dataMappers.ts** - Data transformation utilities
2. **contexts/CartContext.tsx** (optional) - Global cart state
3. **contexts/OrderContext.tsx** (optional) - Global order state
4. **app/orders/index.tsx** - Orders list screen
5. **app/orders/[id].tsx** - Order details screen

---

## API Services Already Available

✅ **Cart Service** (`services/cartApi.ts`)
- getCart()
- addToCart()
- updateCartItem()
- removeCartItem()
- clearCart()
- applyCoupon()
- removeCoupon()
- getCartSummary()
- validateCart()

✅ **Order Service** (`services/ordersApi.ts`)
- createOrder()
- getOrders()
- getOrderById()
- getOrderTracking()
- cancelOrder()
- rateOrder()
- getOrderStats()

---

## Next Steps

**Immediate**:
1. Create data mappers
2. Start integrating CartPage
3. Test cart operations with real backend

**After Cart Integration**:
1. Integrate checkout flow
2. Create order screens
3. Complete end-to-end testing

---

## Testing Checklist

Once integrated, test:
- [ ] View cart with real items
- [ ] Add items to cart
- [ ] Update item quantities
- [ ] Remove items from cart
- [ ] Apply/remove coupons
- [ ] Clear cart
- [ ] Proceed to checkout
- [ ] Place order
- [ ] View order history
- [ ] View order details
- [ ] Track order
- [ ] Cancel order
- [ ] Rate order

---

## Notes

- Backend is ready and tested
- API services are implemented
- Only UI integration remains
- Mock data provides good UI reference
- Need to map data structures carefully

**Recommendation**: Start with cart integration as it's the foundation for the checkout flow.