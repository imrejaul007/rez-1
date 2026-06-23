# REZ Frontend - Backend Integration Plan

## Executive Summary

This document provides a comprehensive plan for connecting the REZ user-side frontend application to the backend services.

**🎉 UPDATE (2025-09-30): Phases 1, 2, 3, 4, and 5 are now COMPLETE!**
- ✅ Phase 1: Core Commerce - 100% Complete
- ✅ Phase 2: Shopping Experience - 100% Complete
- ✅ Phase 3: Wallet & Payments - 100% Complete
- ✅ Phase 4: Offers & Vouchers - 100% Complete
- ✅ Phase 5: Social Features (Videos & Projects) - 100% Complete
- ⏸️ Phases 6-7: Pending (30% of original plan remaining)

## Current State Analysis

### 🔍 Dummy Data Analysis (15 Files Identified)

The frontend contains extensive mock data across 15 data files:

1. **`accountData.ts`** - Complete user account settings, addresses, payment methods
2. **`categoryData.ts`** - Product/service categories and filtering
3. **`checkoutData.ts`** - Shopping cart, payment processing, order management
4. **`earnPageData.ts`** - Social earning projects, categories, notifications
5. **`earnSocialData.ts`** - Social media earning features
6. **`goingOutData.ts`** - Location-based services and events
7. **`homeDeliveryData.ts`** - Delivery services and logistics
8. **`homepageData.ts`** - Homepage sections, events, stores, recommendations
9. **`offersData.ts`** - Offers, promotions, coupons, deals
10. **`partnerData.ts`** - Partner/merchant information
11. **`playPageData.ts`** - UGC video content and social features
12. **`profileData.ts`** - User profiles, statistics, achievements
13. **`searchData.ts`** - Search results and filtering
14. **`voucherData.ts`** - Voucher systems and redemption
15. **`walletData.ts`** - Wallet balance, transactions, payment history

### 🔗 Service Layer Status (25+ Services)

**✅ CONNECTED (Authentication Only):**
- `authApi.ts` - Full backend integration with user-backend
- `apiClient.ts` - Base HTTP client with proper configuration
- `dummyBackend.ts` - Development fallback service

**❌ DISCONNECTED (Need Integration):**
- `homepageApi.ts` - Homepage data fetching
- `productsApi.ts` - Product catalog management
- `storesApi.ts` - Store listings and details
- `categoriesApi.ts` - Category management
- `cartApi.ts` - Shopping cart operations
- `ordersApi.ts` - Order management
- `offersApi.ts` - Offers and promotions
- `reviewsApi.ts` - Product/store reviews
- `wishlistApi.ts` - User wishlist
- `videosApi.ts` - UGC video content
- `projectsApi.ts` - Social earning projects
- `notificationsApi.ts` - Push notifications
- `searchService.ts` - Search functionality
- `locationService.ts` - GPS and mapping
- Plus 10+ additional utility services

### 📱 Page Integration Status

**✅ CONNECTED:**
- Authentication flows (Sign-in, Registration, OTP)
- Basic user profile management

**❌ USING DUMMY DATA:**
- Homepage (`useHomepage.ts` → `homepageData.ts`)
- Checkout (`useCheckout.ts` → `checkoutData.ts`)
- Profile (`profileData.ts`)
- Store listings and search
- Product catalog
- Wallet and transactions
- Social earning features
- UGC video content
- Voucher system
- All offer/promotion pages

## 🎯 Integration Plan - Priority Based Implementation

### Phase 1: Core Commerce Foundation ✅ COMPLETE

**Priority: CRITICAL - Revenue Generating Features**
**Status: ✅ 100% Complete (2025-09-30)**

#### 1.1 Product Catalog Integration ✅
**Files updated:**
- ✅ `services/productsApi.ts` → Connected to `/api/products/*`
- ✅ `services/homepageDataService.ts` → Created to fetch real data
- ✅ `hooks/useHomepage.ts` → Now uses productsApi for "Just for You" and "New Arrivals"

**Backend endpoints integrated:**
```typescript
✅ GET /api/products/featured (for "Just for You" section)
✅ GET /api/products/new-arrivals (for "New Arrivals" section)
✅ GET /api/products/search
✅ GET /api/products/:id
✅ GET /api/products/store/:storeId
```

**Completed:** Product recommendations and new arrivals now load from backend

#### 1.2 Store Integration ✅
**Files updated:**
- ✅ `services/storesApi.ts` → Connected to `/api/stores/*`
- ✅ `services/homepageDataService.ts` → Fetches trending stores
- ✅ `hooks/useHomepage.ts` → Uses storesApi for "Trending Stores"

**Backend endpoints integrated:**
```typescript
✅ GET /api/stores/featured (for homepage sections)
✅ GET /api/stores/nearby
✅ GET /api/stores/:id
✅ GET /api/stores/:id/products
```

**Completed:** Featured and trending stores now load from backend

#### 1.3 Category System ✅
**Files updated:**
- ✅ `services/categoriesApi.ts` → Connected to `/api/categories/*`
- ✅ Category browsing and filtering working

**Backend endpoints integrated:**
```typescript
✅ GET /api/categories
✅ GET /api/categories/:id/products
✅ GET /api/categories/:id/stores
```

**Completed:** Categories load from backend with filtering

### Phase 2: Shopping Experience ✅ COMPLETE

**Priority: HIGH - User Conversion Features**
**Status: ✅ 100% Complete (2025-09-30)**

#### 2.1 Shopping Cart & Checkout ✅
**Files updated:**
- ✅ `services/cartApi.ts` → Connected to `/api/cart/*`
- ✅ `hooks/useCheckout.ts` → Uses cartApi for all cart operations
- ✅ Wallet payment integration complete

**Backend endpoints integrated:**
```typescript
✅ GET /api/cart
✅ POST /api/cart/items
✅ PUT /api/cart/items/:id
✅ DELETE /api/cart/items/:id
✅ POST /api/orders (order creation)
```

**Completed:** Cart operations and order creation fully functional

#### 2.2 Order Management ✅
**Files updated:**
- ✅ `services/ordersApi.ts` → Connected to `/api/orders/*`
- ✅ `app/orders/index.tsx` → Order list page with pagination
- ✅ `app/orders/[id].tsx` → Order detail page with tracking
- ✅ `utils/dataMappers.ts` → Backend-to-frontend order transformation

**Backend endpoints integrated:**
```typescript
✅ GET /api/orders (with pagination, filtering)
✅ GET /api/orders/:id (order details)
✅ PATCH /api/orders/:id/cancel (order cancellation)
✅ GET /api/orders/:id/tracking (tracking info)
✅ GET /api/orders/stats (order statistics)
```

**Completed:** Full order management with history, details, tracking, and cancellation

#### 2.3 Search Functionality ✅
**Files updated:**
- ✅ `services/searchApi.ts` → Connected to `/api/search/*`
- ✅ `hooks/useStoreSearch.ts` → Uses searchApi for store search
- ✅ Advanced search with filters implemented

**Backend endpoints integrated:**
```typescript
✅ GET /api/products/search (product search)
✅ GET /api/stores/search (store search)
✅ GET /api/stores/search/advanced (advanced filtering)
✅ GET /api/stores/search-by-category/:category
✅ GET /api/stores/search-by-delivery-time
```

**Completed:** Comprehensive search with products, stores, and advanced filters

### Phase 3: Wallet & Payments ✅ COMPLETE

**Priority: HIGH - Core Platform Feature**
**Status: ✅ 100% Complete (2025-09-30)**

#### 3.1 Wallet System ✅
**Files created/updated:**
- ✅ `services/walletApi.ts` → Complete wallet API service
- ✅ `hooks/useWallet.ts` → Real wallet data integration
- ✅ `hooks/useCheckout.ts` → Wallet payment processing
- ✅ `app/WalletScreen.tsx` → Topup functionality added
- ✅ `app/checkout.tsx` → Real balance display

**Backend endpoints integrated:**
```typescript
✅ GET /api/wallet/balance
✅ GET /api/wallet/transactions (with pagination)
✅ POST /api/wallet/payment (wallet payment processing)
✅ POST /api/wallet/topup (wallet recharge)
✅ GET /api/wallet/transaction/:id
```

**Completed:** Full wallet system with balance, payments, topup, and transaction history

#### 3.2 Payment Integration ✅
**Files created/updated:**
- ✅ `app/transactions/index.tsx` → Transaction list (563 lines)
- ✅ `app/transactions/[id].tsx` → Transaction details (461 lines)
- ✅ Wallet payment in checkout flow
- ✅ Payment confirmation and success flow

**Features implemented:**
```typescript
✅ Wallet payment processing in checkout
✅ Automatic coin calculation (wasil + promo)
✅ Transaction history with filters
✅ Transaction detail page with timeline
✅ Share transaction functionality
✅ Pull-to-refresh and pagination
✅ Cart clearing after payment
✅ Success page navigation
```

**Completed:** End-to-end payment flow with wallet integration
**Bugs Fixed:** 3 critical bugs (payment validation, TypeScript types, import practices)

### Phase 4: Offers & Promotions ✅ COMPLETE

**Priority: MEDIUM - Engagement Features**
**Status: ✅ 100% Complete (2025-09-30)**

#### 4.1 Offers System ✅
**Files created/updated:**
- ✅ `services/realOffersApi.ts` → Created with 14 endpoints
- ✅ `services/offersApi.ts` → Auto-switches between real and mock API
- ✅ Feature flag via `.env` (EXPO_PUBLIC_MOCK_API)

**Backend endpoints integrated:**
```typescript
✅ GET /api/offers (with filters, pagination)
✅ GET /api/offers/featured
✅ GET /api/offers/trending
✅ GET /api/offers/search
✅ GET /api/offers/:id
✅ POST /api/offers/:id/redeem
✅ GET /api/offers/category/:categoryId
✅ GET /api/offers/store/:storeId
✅ GET /api/user/offer-redemptions (auth)
✅ GET /api/user/favorite-offers (auth)
✅ POST /api/offers/:id/favorite (auth)
✅ DELETE /api/offers/:id/favorite (auth)
✅ POST /api/offers/:id/view (analytics)
✅ POST /api/offers/:id/click (analytics)
```

**Backend data seeded:** 8 offers in MongoDB

**Completed:** Full offers system with redemption, favorites, and analytics

#### 4.2 Voucher System ✅
**Files created/updated:**
- ✅ `services/realVouchersApi.ts` → Created with 10 endpoints
- ✅ `hooks/useOnlineVoucher.ts` → Fully integrated with real API
- ✅ Data transformation layer (backend ↔ frontend types)
- ✅ Environment configuration for feature toggle

**Backend endpoints integrated:**
```typescript
✅ GET /api/vouchers/brands (with filters, search, pagination)
✅ GET /api/vouchers/brands/featured
✅ GET /api/vouchers/brands/newly-added
✅ GET /api/vouchers/categories
✅ GET /api/vouchers/brands/:id
✅ POST /api/vouchers/purchase (with wallet integration)
✅ GET /api/vouchers/my-vouchers (auth, pagination)
✅ GET /api/vouchers/my-vouchers/:id (auth)
✅ POST /api/vouchers/:id/use (auth)
✅ POST /api/vouchers/brands/:id/view (analytics)
```

**Backend data seeded:** 12 voucher brands (Amazon, Flipkart, Myntra, Zomato, Swiggy, BookMyShow, MakeMyTrip, Nykaa, BigBasket, Croma, Decathlon, Dominos)

**Completed:** Full voucher system with purchase flow, wallet integration, and user vouchers

**Total Phase 4 effort:** ~4 hours (faster than 22 hours estimated)

### Phase 5: Social Features ✅ COMPLETE

**Priority: MEDIUM - Engagement & Retention**
**Status: ✅ 100% Complete (2025-09-30)**

#### 5.1 UGC Video Content ✅
**Files created/updated:**
- ✅ `services/realVideosApi.ts` → Created with 9 endpoints (228 lines)
- ✅ `services/videosApi.ts` → Auto-switches between real and mock API
- ✅ Feature flag via `.env` (EXPO_PUBLIC_MOCK_API)
- ✅ Fixed backend controller bugs (`isActive` → `isPublished`)

**Backend endpoints integrated:**
```typescript
✅ GET /api/videos (with filters, pagination, sorting)
✅ GET /api/videos/trending (with timeframe)
✅ GET /api/videos/category/:category
✅ GET /api/videos/creator/:creatorId
✅ GET /api/videos/:videoId
✅ POST /api/videos/:videoId/like (auth)
✅ POST /api/videos/:videoId/comments (auth)
✅ GET /api/videos/:videoId/comments
✅ GET /api/videos/search
```

**Backend data seeded:** 6 videos (iPhone review, Fashion haul, HIIT workout, Street food, DIY decor, Crypto 101)

**Completed:** Full video system with engagement, comments, search, and filtering

#### 5.2 Social Earning ✅
**Files created/updated:**
- ✅ `services/realProjectsApi.ts` → Created with 11 endpoints (234 lines)
- ✅ `services/projectsApi.ts` → Auto-switches between real and mock API
- ✅ Seeder script created (`seedProjects.ts` - 523 lines)
- ✅ Fixed backend controller bugs (`isActive` → `status`, `creator` → `createdBy`)

**Backend endpoints integrated:**
```typescript
✅ GET /api/projects (with filters, pagination, sorting)
✅ GET /api/projects/featured
✅ GET /api/projects/category/:category
✅ GET /api/projects/:projectId
✅ POST /api/projects/:projectId/like (auth)
✅ POST /api/projects/:projectId/comments (auth)
✅ POST /api/projects/:projectId/apply (auth)
✅ POST /api/projects/:projectId/submit (auth)
✅ GET /api/projects/my-submissions (auth)
✅ GET /api/projects/my-earnings (auth)
```

**Backend data seeded:** 6 projects (Beauty ₹100, Fashion ₹150, Store visit ₹50, UGC ₹200, Survey ₹25, Referral ₹100)

**Completed:** Full social earning system with applications, submissions, earnings tracking

**Total Phase 5 effort:** ~5 hours (faster than 30 hours estimated)

### Phase 6: User Profile & Account (Weeks 6-7)

**Priority: MEDIUM - User Management**

#### 6.1 Enhanced Profile Management
**Files to update:**
- `data/profileData.ts` → Replace with real profile data
- Profile statistics and achievements
- Account settings integration

**Backend endpoints needed:**
```typescript
GET /api/user/profile/complete
PUT /api/user/profile/settings
GET /api/user/achievements
GET /api/user/statistics
```

**Estimated effort:** 12 hours

#### 6.2 Account Settings
**Files to update:**
- `data/accountData.ts` → Replace with real settings
- Settings components
- Preference management

**Backend endpoints needed:**
```typescript
GET /api/user/settings
PUT /api/user/settings
GET /api/user/addresses
POST /api/user/addresses
```

**Estimated effort:** 10 hours

### Phase 7: Advanced Features (Weeks 7-8)

**Priority: LOW - Nice to Have**

#### 7.1 Reviews & Ratings
**Files to update:**
- `services/reviewsApi.ts` → Connect to `/api/reviews/*`
- Review components
- Rating displays

**Estimated effort:** 8 hours

#### 7.2 Wishlist & Favorites
**Files to update:**
- `services/wishlistApi.ts` → Connect to `/api/wishlist/*`
- Wishlist components

**Estimated effort:** 6 hours

#### 7.3 Notifications
**Files to update:**
- `services/notificationsApi.ts` → Connect to `/api/notifications/*`
- Push notification handling

**Estimated effort:** 8 hours

## 🔧 Technical Implementation Strategy

### 1. API Service Pattern
Replace dummy data services with real API calls:

```typescript
// Before (Dummy)
export const fetchHomepageData = async (): Promise<HomepageState> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return initialHomepageState;
};

// After (Real API)
export const fetchHomepageData = async (): Promise<HomepageState> => {
  const response = await apiClient.get('/homepage');
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
};
```

### 2. Hook Integration Pattern
Update hooks to use real APIs:

```typescript
// Before
const data = await fetchHomepageData(); // From dummy data

// After
const data = await homepageApi.getHomepageData(); // From real API
```

### 3. Error Handling Strategy
Implement consistent error handling across all integrations:

```typescript
try {
  const data = await apiCall();
  setState({ data, loading: false });
} catch (error) {
  setState({
    error: error.message || 'Something went wrong',
    loading: false
  });
}
```

### 4. Environment Configuration
Update API endpoints for different environments:

```typescript
// In apiClient.ts
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ||
                process.env.EXPO_PUBLIC_API_URL ||
                'http://localhost:5001/api';
```

## 📊 Effort Estimation Summary

| Phase | Features | Status | Actual Time | Original Est. | Priority |
|-------|----------|--------|-------------|---------------|----------|
| Phase 1 | Core Commerce (Products, Stores, Categories) | ✅ **COMPLETE** | Already integrated | 36 hours | CRITICAL |
| Phase 2 | Shopping Experience (Cart, Orders, Search) | ✅ **COMPLETE** | Already integrated | 48 hours | HIGH |
| Phase 3 | Wallet & Payments | ✅ **COMPLETE** | ~3 hours | 36 hours | HIGH |
| Phase 4 | Offers & Vouchers | ✅ **COMPLETE** | ~4 hours | 22 hours | MEDIUM |
| Phase 5 | Social Features (Videos & Projects) | ✅ **COMPLETE** | ~5 hours | 30 hours | MEDIUM |
| Phase 6 | Profile & Account | ⏸️ Not Started | - | 22 hours | MEDIUM |
| Phase 7 | Advanced Features | ⏸️ Not Started | - | 22 hours | LOW |
| **TOTAL** | **Complete Integration** | **71% Complete** | **~12 hours** | **216 hours** | **5 phases done** |
| **REMAINING** | **Phases 6-7** | **Pending** | **~44 hours est.** | **44 hours** | **~1 week** |

## 🚧 Implementation Dependencies

### Backend Requirements
1. All endpoints must be implemented in user-backend
2. Authentication middleware must be working
3. Database models must be defined
4. API documentation must be available

### Frontend Prerequisites
1. Existing authentication system must remain functional
2. Environment variables must be configured
3. Error boundaries should be in place
4. Loading states should be consistent

## 🧪 Testing Strategy

### 1. Integration Testing
- Test each API endpoint individually
- Verify error handling for network failures
- Test authentication token refresh

### 2. User Flow Testing
- Complete purchase flow testing
- User registration to first purchase
- Social earning flow validation

### 3. Performance Testing
- API response time monitoring
- Large dataset handling
- Image/video loading optimization

## 🎯 Success Metrics

### Phase 1 Success Criteria
- Homepage loads real product data
- Store listings show actual merchants
- Categories filter correctly

### Phase 2 Success Criteria
- Users can complete purchases
- Order tracking works end-to-end
- Search returns relevant results

### Phase 3 Success Criteria
- Wallet shows real balance
- Payments process successfully
- Transaction history is accurate

## 🔄 Rollback Plan

### Staged Rollout
1. Keep dummy data files as fallback
2. Feature flagging for new integrations
3. Gradual user migration (10% → 50% → 100%)

### Emergency Fallback
```typescript
// Emergency fallback pattern
const useBackendData = process.env.EXPO_PUBLIC_USE_BACKEND === 'true';
const data = useBackendData ? await realApi() : await dummyApi();
```

## 📝 Next Steps

1. **Immediate**: Start with Phase 1 (Core Commerce) - highest ROI
2. **Week 1**: Complete product and store integrations
3. **Week 2**: Begin shopping cart and checkout integration
4. **Week 3**: Implement wallet and payment systems
5. **Week 4+**: Continue with remaining phases based on business priorities

## 🔗 Dependencies & Coordination

### With Backend Team
- API endpoint specifications
- Database schema coordination
- Authentication token management
- Error response formats

### With Design Team
- Loading state designs
- Error state displays
- Empty state handling

### With QA Team
- Test case development
- Integration testing plans
- User acceptance testing

---

## 🎉 Phases 1-4 Completion Summary (2025-09-30)

### What's Now Working (Real Backend Integration)

#### ✅ Fully Functional Features:
1. **Authentication** - Login, register, OTP verification
2. **Homepage** - Products ("Just for You", "New Arrivals") and stores ("Trending Stores") from backend
3. **Product Catalog** - Real product data with images, pricing, ratings
4. **Store Listings** - Featured and nearby stores with real data
5. **Categories** - Category browsing and filtering
6. **Shopping Cart** - Add, update, remove items with backend sync
7. **Order Creation** - Place orders with real payment processing
8. **Order Management** - View order history with pagination
9. **Order Details** - Full order info with tracking and timeline
10. **Order Cancellation** - Cancel orders with confirmation
11. **Wallet Balance** - Real-time balance display
12. **Wallet Payments** - Pay for orders using wallet coins
13. **Wallet Topup** - Recharge wallet with confirmation
14. **Transaction History** - Full transaction list with filters
15. **Transaction Details** - Complete transaction info with sharing
16. **Search** - Product and store search with advanced filters
17. **Offers System** - Browse, search, and redeem offers
18. **Voucher Brands** - Browse 12 voucher brands from backend
19. **Voucher Purchase** - Buy vouchers using wallet coins
20. **Voucher Management** - View purchased vouchers

#### 🎯 Key Achievements:
- **56% of original integration plan complete** (Phases 1-4)
- **All critical e-commerce functionality working**
- **End-to-end purchase flow operational** (Browse → Cart → Payment → Order)
- **Wallet system fully integrated** with 5 backend endpoints
- **Order management complete** with tracking and history
- **Search working** with products, stores, and filters
- **Offers & Vouchers fully integrated** with 24 endpoints
- **Voucher purchase flow** with wallet integration complete

#### 📁 Files Created/Modified:
**New Files:**
- `services/walletApi.ts` (wallet integration)
- `services/homepageDataService.ts` (homepage backend integration)
- `services/realOffersApi.ts` (offers backend integration)
- `services/realVouchersApi.ts` (vouchers backend integration)
- `app/transactions/index.tsx` (transaction list)
- `app/transactions/[id].tsx` (transaction details)
- `utils/dataMappers.ts` (backend-to-frontend transformation)
- `scripts/test-api-connection.ts` (API testing script)

**Modified Files:**
- `services/productsApi.ts` (backend integration)
- `services/storesApi.ts` (backend integration)
- `services/cartApi.ts` (backend integration)
- `services/ordersApi.ts` (backend integration)
- `services/searchApi.ts` (backend integration)
- `services/offersApi.ts` (feature toggle for real/mock API)
- `hooks/useHomepage.ts` (real data integration)
- `hooks/useCheckout.ts` (wallet payment integration)
- `hooks/useWallet.ts` (real wallet data)
- `hooks/useOnlineVoucher.ts` (real voucher API integration)
- `app/WalletScreen.tsx` (topup functionality)
- `app/checkout.tsx` (real balance display)
- `app/orders/index.tsx` (order list page)
- `app/orders/[id].tsx` (order detail page)
- `types/checkout.types.ts` (TypeScript fixes)

#### 🐛 Bugs Fixed:
1. **CRITICAL**: Payment validation logic (auto-calculate coins)
2. **CRITICAL**: TypeScript type errors (missing handler types)
3. **MINOR**: Import practices (require vs import)

### What's Remaining (Phases 4-7)

#### ⏸️ Not Started:
1. **Social Features** - UGC videos, social earning (30 hours)
2. **Profile & Account** - Enhanced profile, settings (22 hours)
3. **Advanced Features** - Reviews, wishlist, notifications (22 hours)

**Estimated time remaining**: ~74 hours (2 weeks)

---

**Document Status**: ✅ Phases 1-5 Complete | ⏸️ Phases 6-7 Pending
**Last Updated**: 2025-09-30
**Completion Progress**: 71% (5 of 7 phases complete)
**Next Recommended Phase**: Phase 6 (Profile & Account) for enhanced user management