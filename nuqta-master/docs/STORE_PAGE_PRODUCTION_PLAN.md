# 🏪 Store Page Production-Ready Implementation Plan

## 📋 Overview
Transform MainStorePage from 30% to 100% production-ready with complete e-commerce functionality over 6-8 weeks.

## 🎯 Current State Analysis

### ✅ What's Working
- Store metadata loading (name, location, ratings, hours)
- Reviews integration with backend API
- Store videos display in UGC section
- Navigation flow from homepage/search functional
- Dynamic store data transformation

### ❌ Critical Gaps
- **No product catalog display** (CRITICAL - most important missing feature)
- Mock deals data in WalkInDealsModal (no backend integration)
- Add to cart only shows alert (not connected to CartContext)
- No filtering, search, or sorting within store
- No product variants (size, color selection)
- Missing inventory/stock status display
- Wishlist only shows alert (not integrated with backend)
- Store policies not displayed
- Contact info not fully utilized
- Payment methods not shown
- No related products or recommendations

### 📊 Production Readiness Score
- **Current**: 30-40%
- **After Phase 1**: 60%
- **After Phase 2**: 80%
- **After Phase 3**: 90%
- **After Phase 4**: 100% ✅

---

## 📅 Implementation Timeline: 6-8 Weeks

### **PHASE 1: Core Product Catalog (Week 1-3) 🔴 CRITICAL**

> **🔗 Related Documents**:
> - See `SERVICE_BOOKING_STORE_PLAN.md` for service-based stores (salons, spas, clinics)
> - Phase 1.5 (Week 2-3, Days 6-7) covers service booking features

#### Week 1: Product Display Foundation
**Goal**: Get products loading and displaying in MainStorePage

**Tasks**:
1. **Add product state management in MainStorePage.tsx**
   - Create `storeProducts` state array
   - Add `productsLoading` boolean state
   - Add `productsError` string state
   - Add `productFilters` object state (category, price, sort)

2. **Integrate productsApi.getProductsByStore(storeId)**
   ```typescript
   useEffect(() => {
     const loadStoreProducts = async () => {
       if (!storeData?.id) return;

       setProductsLoading(true);
       try {
         const response = await productsApi.getProductsByStore(
           storeData.id,
           {
             limit: 20,
             sortBy: 'newest',
             page: 1
           }
         );

         if (response.success && response.data) {
           setStoreProducts(response.data.products || []);
         }
       } catch (error) {
         console.error('Failed to load products:', error);
         setProductsError('Failed to load products');
       } finally {
         setProductsLoading(false);
       }
     };

     loadStoreProducts();
   }, [storeData?.id]);
   ```

3. **Create StoreProductGrid component**
   - Grid layout (2 columns mobile, 3-4 desktop)
   - Product card with:
     - Product image (optimized)
     - Product name (2 lines max)
     - Original price + sale price
     - Rating stars and count
     - "Add to Cart" button
     - Heart icon for wishlist
   - Loading skeleton placeholders
   - Smooth animations on load

4. **Replace static store images with product carousel**
   - Show top 5-10 products in main carousel
   - Keep share and favorite buttons
   - Add "View All Products" button below carousel

5. **Add empty state when no products**
   - Custom illustration
   - "No products available" message
   - "Check back soon" or "Contact store" CTA

**Files to modify**:
- `app/MainStorePage.tsx` - Add product loading logic
- Create: `components/store/StoreProductGrid.tsx`
- Create: `components/store/StoreProductCard.tsx`
- Create: `components/store/EmptyProducts.tsx`

**Acceptance Criteria**:
- ✅ Products load from backend API
- ✅ Product grid displays properly on all screen sizes
- ✅ Loading states show skeleton
- ✅ Error states show retry option
- ✅ Empty state shows when no products

---

#### Week 2: Add to Cart & Stock Display
**Goal**: Make add-to-cart functional with real backend integration

**Tasks**:

1. **Replace handleAddToCart alert with CartContext integration**
   ```typescript
   import { useCart } from '@/contexts/CartContext';

   const { state, actions } = useCart();

   const handleAddToCart = async (product: Product) => {
     try {
       await actions.addItem({
         id: product.id,
         name: product.name,
         image: product.images[0]?.url || '',
         originalPrice: product.pricing.basePrice,
         discountedPrice: product.pricing.salePrice || product.pricing.basePrice,
         quantity: 1,
         storeId: storeData.id,
         storeName: storeData.name,
       });

       // Show success toast
       showToast('Added to cart', 'success');
     } catch (error) {
       showToast('Failed to add to cart', 'error');
     }
   };
   ```

2. **Add stock status badges**
   - **In Stock** (green badge): `stock.quantity > 10`
   - **Low Stock** (yellow badge): `stock.quantity > 0 && stock.quantity <= 10`
     - Show "Only X left!" text
   - **Out of Stock** (red badge): `stock.quantity === 0`
     - Disable add to cart button
     - Show "Notify Me" button instead

3. **Add quantity selector in product card**
   - Plus/minus buttons
   - Current quantity display
   - Max quantity based on stock
   - Disabled when out of stock

4. **Add success toast on add to cart**
   - Product name confirmation
   - Thumbnail image
   - "View Cart" button
   - "Continue Shopping" button
   - Auto-dismiss after 4 seconds

5. **Implement variant selection modal**
   - Opens when product has variants
   - Size selector (S, M, L, XL, etc.)
   - Color picker with swatches
   - Update price based on variant
   - Update stock based on variant
   - Update product image based on variant
   - "Add to Cart" button in modal

**Files to modify**:
- `app/MainStorePage.tsx` - Update handleAddToCart
- `components/store/StoreProductCard.tsx` - Add stock badges
- Create: `components/store/ProductVariantModal.tsx`
- Create: `components/store/QuantitySelector.tsx`
- Create: `components/common/Toast.tsx` (if not exists)
- Integrate: `contexts/CartContext.tsx`

**Acceptance Criteria**:
- ✅ Add to cart adds item to CartContext
- ✅ Cart icon badge updates with item count
- ✅ Stock status displays correctly
- ✅ Out of stock products can't be added
- ✅ Variant selection works for products with variants
- ✅ Success toast shows and is dismissible

---

#### Week 2-3 (Days 6-7): Service-Based Store Features 💇
**Goal**: Add appointment booking for service-based stores (salons, spas, clinics)

> **📄 See Full Details**: `SERVICE_BOOKING_STORE_PLAN.md`

**Quick Summary**:
- **Day 6**: Service catalog, multi-select services, service cart
- **Day 7**: Booking flow with date/time picker, appointment creation

**What This Adds** (Based on Screenshots):
1. **Service Catalog**: Browse services (haircuts, spa, etc.) instead of/alongside products
2. **Appointment Booking**: Date picker + time slot selection
3. **Booking Confirmation**: Create appointments with payment
4. **Store Type Detection**: Automatically show services for service-based stores

**Key Features**:
- Service cards with duration, price, cashback
- Calendar date picker (horizontal scroll)
- Available time slots (10:00 AM - 11:00 AM format)
- Multi-service booking in one appointment
- Bill summary before payment

**APIs to Integrate**:
- `servicesApi.getStoreServices(storeId)` - Load services
- `bookingApi.getAvailableSlots(storeId, date)` - Get time slots
- `bookingApi.createBooking(data)` - Create appointment

**Files to Create**:
- `services/servicesApi.ts` and `bookingApi.ts`
- `components/services/ServiceGrid.tsx`, `ServiceCard.tsx`
- `components/booking/BookServiceModal.tsx`, `DateTimeSelectionStep.tsx`

**Acceptance Criteria**:
- ✅ Service-based stores show service catalog
- ✅ Date picker scrolls horizontally
- ✅ Time slots load based on availability
- ✅ Booking creates successfully
- ✅ Confirmation shown with details

---

#### Week 3: Filtering & Search
**Goal**: Let users find products within store easily

**Tasks**:

1. **Add search bar in MainStoreHeader**
   - Search input field in header
   - Search icon on left
   - Clear button (X) on right
   - Search on Enter key or button click
   - Debounced search (500ms delay)
   - Show "Searching..." indicator
   - Update products based on search query

2. **Create filter drawer/modal**
   - Slide-in drawer from bottom (mobile)
   - Modal on desktop
   - Filter sections:

     **Categories** (from store.subCategories)
     - Checkbox list of categories
     - Show product count per category

     **Price Range**
     - Min/Max input fields
     - Slider with two handles
     - Preset ranges: Under ₹500, ₹500-₹1000, ₹1000-₹5000, ₹5000+

     **Stock Availability**
     - In Stock only checkbox
     - Include Low Stock checkbox

     **Rating**
     - 4 Stars & Up
     - 3 Stars & Up
     - 2 Stars & Up

3. **Add sort dropdown**
   - Position: Top right of product grid
   - Options:
     - Featured (default)
     - Price: Low to High
     - Price: High to Low
     - Best Rating
     - Newest First
     - Most Popular (by sales)
   - Update API call with sortBy parameter

4. **Show active filters as chips**
   - Display below search/sort bar
   - Show each active filter as removable chip
   - Click X on chip to remove filter
   - "Clear All Filters" button when multiple active
   - Show total product count

5. **Update product API calls with filters**
   ```typescript
   const applyFilters = async () => {
     const response = await productsApi.getProductsByStore(
       storeData.id,
       {
         category: activeFilters.category,
         minPrice: activeFilters.minPrice,
         maxPrice: activeFilters.maxPrice,
         sortBy: activeFilters.sortBy,
         inStock: activeFilters.inStockOnly,
         rating: activeFilters.minRating,
         search: searchQuery,
         page: currentPage,
         limit: 20
       }
     );
   };
   ```

**Files to create**:
- `components/store/StoreProductFilters.tsx` - Filter drawer/modal
- `components/store/StoreProductSearch.tsx` - Search bar
- `components/store/FilterChips.tsx` - Active filter chips
- `components/store/SortDropdown.tsx` - Sort options
- `hooks/useProductFilters.ts` - Filter state management

**Files to modify**:
- `app/MainStoreSection/MainStoreHeader.tsx` - Add search bar
- `app/MainStorePage.tsx` - Integrate filters

**Acceptance Criteria**:
- ✅ Search filters products by name
- ✅ Category filters work correctly
- ✅ Price range filters products
- ✅ Stock filter hides out-of-stock items
- ✅ Sort changes product order
- ✅ Multiple filters can be applied
- ✅ Filter chips show and are removable
- ✅ Product count updates with filters

---

### **PHASE 2: Enhanced Shopping Experience (Week 4-5) 🟡**

> **🔗 Related Document**: See `UGC_SECTION_PRODUCTION_PLAN.md` for detailed UGC implementation plan

#### Week 4: Store Details & Info
**Goal**: Display all store information and enable store following

**Tasks**:

1. **Store Policies Section**
   - Create StorePolicies component
   - Display in About modal or separate section
   - Accordion/expandable format:
     - **Return Policy**: `store.policies.returnPolicy`
     - **Shipping Policy**: `store.policies.shippingPolicy`
     - **Privacy Policy**: `store.policies.privacyPolicy`
     - **Warranty Info**: If available
   - Rich text formatting support
   - "Contact Store" link at bottom

2. **Store Contact Section**
   - Phone number with click-to-call link
     - Format: `tel:${store.contact.phone}`
   - Email with click-to-email link
     - Format: `mailto:${store.contact.email}`
   - WhatsApp integration
     - Open WhatsApp with pre-filled message
     - Format: `https://wa.me/${whatsappNumber}?text=Hi, I'm interested in your store`
   - Website link (opens in browser)
   - Display in About modal and footer
   - Copy buttons for each contact method

3. **Payment Methods Display**
   - Show accepted payment method icons
   - Icons: Cash, Card, UPI, Wallet, Net Banking, EMI
   - Use `store.operationalInfo.paymentMethods` array
   - Wasil Pay badge if `acceptsWalletPayment: true`
   - Position: Below store description
   - Tooltip on hover/tap with method name

4. **Delivery Options Display**
   - Delivery radius indicator
     - "Delivers within X km" badge
   - Estimated delivery time
     - "Delivers in 30-45 mins" from `operationalInfo.deliveryTime`
   - Delivery fee display
     - "₹40 delivery fee" from `operationalInfo.deliveryFee`
   - Free delivery threshold
     - "Free delivery on orders above ₹1000"
   - "Check Delivery" button
     - Opens location permission request
     - Calculates distance from user location
     - Shows "Delivery available" or "Outside delivery area"

5. **Store Follow/Unfollow Feature**
   - Add follow button in store header
   - Star icon (outlined when not following, filled when following)
   - Integrate with backend:
     ```typescript
     const handleFollowToggle = async () => {
       if (isFollowing) {
         await storesApi.unfollowStore(storeId);
       } else {
         await storesApi.followStore(storeId);
       }
       setIsFollowing(!isFollowing);
     };
     ```
   - Show follower count
     - "12.3K followers"
   - Following status indicator
   - Success toast on follow/unfollow
   - Optimistic UI update

**Files to create**:
- `components/store/StorePolicies.tsx`
- `components/store/StoreContact.tsx`
- `components/store/PaymentMethods.tsx`
- `components/store/DeliveryInfo.tsx`
- `components/store/StoreFollowButton.tsx`

**Files to modify**:
- `components/AboutModal.tsx` - Add policies and contact
- `app/MainStoreSection/MainStoreHeader.tsx` - Add follow button
- `app/MainStorePage.tsx` - Display payment and delivery info

**Acceptance Criteria**:
- ✅ All store policies displayed properly
- ✅ Contact links work (phone, email, WhatsApp, website)
- ✅ Payment methods show with correct icons
- ✅ Delivery info displays correctly
- ✅ Follow/unfollow works with backend
- ✅ Follower count updates in real-time
- ✅ Check delivery calculates distance

---

#### Week 5: Product Discovery & Recommendations
**Goal**: Help users discover more products and save favorites

**Days 1-5: Product Discovery**

**Tasks**:

1. **Related Products Section**
   - Display "Similar Products" carousel
   - Integrate `productsApi.getRelatedProducts(productId, limit: 10)`
   - Show below product details or in separate tab
   - Horizontal scroll on mobile
   - Grid on desktop
   - Same product card design as main grid

2. **Frequently Bought Together**
   - Show bundle suggestions
   - Integrate `productsApi.getFrequentlyBoughtTogether(productId, limit: 5)`
   - Display as:
     - Main product + suggested products
     - Combined price vs. individual prices
     - "Save ₹X when bought together" badge
   - "Add All to Cart" button
   - Individual "Add to Cart" buttons
   - Position: Below product or in modal

3. **Recently Viewed Products**
   - Track product views in AsyncStorage
   - Key: `recently_viewed_products`
   - Store product ID, name, image, price, timestamp
   - Max 20 products
   - Display in separate section at bottom
   - Horizontal carousel
   - "Clear History" button
   - Persist across app sessions

4. **Wishlist Integration**
   - Replace favorite alert with real API call
   - Integrate `wishlistApi.addToWishlist(productId)`
   - Heart icon state management:
     - Outlined when not in wishlist
     - Filled/solid when in wishlist
   - Check wishlist status on product load
   - Success animation on add/remove
   - "View Wishlist" toast button
   - Navigate to wishlist page: `/wishlist`
   - Show wishlist count in header

5. **Quick View Modal**
   - Click "Quick View" on product card (eye icon)
   - Opens modal without navigation
   - Display:
     - Product images carousel
     - Product name and price
     - Short description
     - Add to cart button
     - Variant selector
     - "View Full Details" link
   - Close button (X)
   - Swipe down to close on mobile

**Files to create**:
- `components/store/RelatedProducts.tsx`
- `components/store/FrequentlyBoughtTogether.tsx`
- `components/store/RecentlyViewedProducts.tsx`
- `components/store/ProductQuickView.tsx`
- `hooks/useRecentlyViewed.ts`
- `hooks/useWishlist.ts` (or update existing)

**Files to modify**:
- `app/MainStorePage.tsx` - Add related/FBT sections
- `components/store/StoreProductCard.tsx` - Add quick view button

**Acceptance Criteria**:
- ✅ Related products display correctly
- ✅ Frequently bought together shows bundles
- ✅ Recently viewed tracks and displays
- ✅ Wishlist add/remove works with backend
- ✅ Quick view modal displays product info
- ✅ All features work on mobile and desktop

---

#### Week 5 (Days 6-7): UGC Section Production-Ready 📸
**Goal**: Remove dummy UGC data and integrate real user-generated content

> **📄 See Full Details**: `UGC_SECTION_PRODUCTION_PLAN.md`

**Quick Summary**:
- **Day 6**: Replace dummy data with `ugcApi.getStoreContent()`, add like/bookmark buttons
- **Day 7**: Add comments modal and upload functionality

**Tasks**:
1. Replace defaultImages with real UGC API call
2. Remove hardcoded test videos (BigBuckBunny, etc.)
3. Add like button with backend sync
4. Add bookmark functionality
5. Create UGCCommentsModal component
6. Add upload FAB (Floating Action Button)
7. Create UGCUploadModal with camera/gallery picker
8. Implement upload progress and success states

**Key APIs to Use**:
- `ugcApi.getStoreContent(storeId)` - Load store UGC
- `ugcApi.toggleLike(ugcId)` - Like/unlike content
- `ugcApi.toggleBookmark(ugcId)` - Save to bookmarks
- `ugcApi.getComments(ugcId)` - Load comments
- `ugcApi.addComment(ugcId, comment)` - Post comment
- `ugcApi.create(data, file)` - Upload new content

**Files to Modify**:
- `app/MainStorePage.tsx` - Add UGC loading and upload FAB
- `app/MainStoreSection/UGCSection.tsx` - Remove dummy data, add interactions

**Files to Create**:
- `components/store/UGCCommentsModal.tsx`
- `components/store/UGCUploadModal.tsx`

**Acceptance Criteria**:
- ✅ All dummy UGC data removed
- ✅ Real UGC loads from backend
- ✅ Like/bookmark buttons work
- ✅ Comments system functional
- ✅ Upload feature works for photos & videos
- ✅ Empty state shows when no content

---

### **PHASE 3: Deals & Offers System (Week 6) 🟠**

#### Week 6: Store Deals Integration
**Goal**: Replace mock deals with real backend integration

**Tasks**:

1. **Backend API Setup** (if not exists)
   - **Option A**: If backend endpoint exists
     - Verify endpoint: `GET /api/stores/:storeId/offers`
     - Check response format

   - **Option B**: If backend needs to be created
     - Create MongoDB schema for offers:
       ```javascript
       {
         storeId: ObjectId,
         title: String,
         description: String,
         type: ['walk-in', 'online', 'flash', 'bundle'],
         discount: {
           type: ['percentage', 'fixed'],
           value: Number
         },
         conditions: {
           minPurchase: Number,
           maxDiscount: Number,
           applicableProducts: [ObjectId]
         },
         startDate: Date,
         endDate: Date,
         isActive: Boolean
       }
       ```
     - Create API endpoint in backend
     - Migrate existing mock deals to database

2. **Frontend Integration**
   - Remove mock data from `WalkInDealsModal.tsx`
   - Remove `utils/mock-deals-data.ts` file
   - Create or update `services/offersApi.ts`:
     ```typescript
     async getStoreOffers(storeId: string, type?: string) {
       return apiClient.get(`/stores/${storeId}/offers`, { type });
     }
     ```
   - Integrate in WalkInDealsModal:
     ```typescript
     const loadDeals = async () => {
       const response = await offersApi.getStoreOffers(storeId, 'walk-in');
       if (response.success) {
         setDeals(response.data.offers);
       }
     };
     ```

3. **Deal Features**
   - **Deal Countdown Timer**
     - Show time remaining for limited offers
     - Format: "2d 5h 30m remaining"
     - Red color when < 24 hours
     - Auto-update every minute

   - **Deal Status Badges**
     - Active (green): Currently available
     - Upcoming (blue): Starts soon, show countdown to start
     - Expired (gray): No longer available
     - Flash Sale (red): Limited time, urgent

   - **Deal Terms & Conditions**
     - Expandable section in deal card
     - Show minimum purchase requirements
     - Applicable products list
     - Exclusions
     - "View T&C" link

   - **Deal Availability Indicator**
     - Stock limited deals: "Only 5 deals left"
     - Usage count: "127 people used this deal"
     - Personal limit: "You can use this 3 more times"

4. **Cashback Display Enhancement**
   - Make cashback dynamic per product
   - Show product-specific cashback if available
   - Otherwise show store-level cashback
   - Display cashback calculation:
     - "Buy for ₹2000, get ₹200 cashback"
   - Max cashback indicator
   - Partner level badges (Gold, Platinum, etc.)
   - Cashback preview in cart

5. **Promotions Banner**
   - Store-wide promotions carousel at top
   - Auto-rotating banners (every 5 seconds)
   - Click banner to see promotion details
   - Types of promotions:
     - Limited time offers
     - Seasonal sales
     - Category-specific discounts
     - New arrivals
     - Clearance sales
   - Manual navigation dots
   - Pause on user interaction

**Files to modify**:
- `components/WalkInDealsModal.tsx` - Remove mock data, add API
- Remove: `utils/mock-deals-data.ts`
- Update: `app/MainStoreSection/CashbackOffer.tsx` - Dynamic cashback

**Files to create**:
- `services/offersApi.ts` (if doesn't exist)
- `components/store/PromotionsBanner.tsx`
- `components/store/DealCard.tsx`
- `components/store/DealCountdown.tsx`
- `components/store/CashbackCalculator.tsx`

**Acceptance Criteria**:
- ✅ Mock deals data removed completely
- ✅ Real deals load from backend
- ✅ Countdown timers work correctly
- ✅ Deal status badges display properly
- ✅ Promotions banner auto-rotates
- ✅ Cashback shows per-product amounts
- ✅ Deal terms expandable and readable

---

### **PHASE 4: Polish & Production Readiness (Week 7-8) 🟢**

#### Week 7: UX Polish & Optimization
**Goal**: Perfect the user experience with polish and performance

**Tasks**:

1. **Loading States**
   - **Skeleton Loaders** for all sections:
     - Product grid skeleton (8-12 cards)
     - Product card skeleton (image, text lines)
     - Store header skeleton
     - Reviews skeleton
     - Deals skeleton
   - **Shimmer Effect**:
     - Animated gradient across skeletons
     - Smooth 1.5s animation loop
   - **Progressive Loading**:
     - Load above-the-fold content first
     - Lazy load below-fold sections
     - Load images as they enter viewport
   - **Loading Indicators**:
     - Spinner for actions (add to cart, follow)
     - Progress bar for page navigation
     - "Loading more..." for pagination

2. **Error Handling**
   - **Friendly Error Messages**:
     - Replace technical errors with user-friendly text
     - "Oops! Something went wrong"
     - "We couldn't load products. Please try again."
   - **Retry Mechanisms**:
     - "Retry" button on failed requests
     - Automatic retry with exponential backoff
     - Max 3 retry attempts
   - **Offline Support**:
     - Detect network status
     - Show offline banner
     - Cache last loaded data
     - Load from cache when offline
   - **Network Error Indicators**:
     - Toast notification on connection loss
     - Disable actions when offline
     - Queue actions to retry when online

3. **Empty States**
   - **No Products Found**:
     - Custom illustration (empty shelf)
     - "No products match your search"
     - Suggestions: "Try different keywords" or "Clear filters"
   - **No Search Results**:
     - "No results for 'search term'"
     - "Check spelling" suggestion
     - Related products section
   - **No Deals Available**:
     - "No active deals right now"
     - "Check back soon for exciting offers"
     - Sign up for notifications
   - **Custom Illustrations**:
     - SVG illustrations for each empty state
     - Consistent brand style
     - Appropriate colors

4. **Performance Optimization**
   - **Lazy Load Images**:
     - Use react-native-fast-image
     - Placeholder while loading
     - Progressive image loading
     - Cache images locally
   - **Virtualized Lists**:
     - Use FlatList with `windowSize` optimization
     - Only render visible items
     - Recycle view components
     - `getItemLayout` for better performance
   - **Cache Product Data**:
     - Cache product list in AsyncStorage
     - Cache duration: 5 minutes
     - Update cache on new data
     - Serve cached data while fetching
   - **Optimize Re-renders**:
     - Use React.memo for product cards
     - useMemo for expensive calculations
     - useCallback for event handlers
     - Avoid inline functions in render
   - **Image Compression**:
     - Use optimized image URLs
     - Request appropriate image sizes
     - WebP format where supported
     - Thumbnail for lists, full for details

5. **Accessibility**
   - **Screen Reader Support**:
     - Meaningful accessibilityLabel for all buttons
     - accessibilityHint for complex actions
     - Announce state changes (added to cart, etc.)
   - **Keyboard Navigation**:
     - Tab order logical
     - Focus indicators visible
     - Enter/Space to activate buttons
   - **Color Contrast**:
     - WCAG AA compliance (4.5:1 ratio)
     - Fix low-contrast text
     - Test with contrast checker
   - **Focus Management**:
     - Focus trapped in modals
     - Focus returns after modal close
     - Focus on error messages
   - **ARIA Labels**:
     - accessibilityRole for all interactive elements
     - accessibilityState for toggles
     - accessibilityValue for progress

**Files to create**:
- `components/common/SkeletonLoader.tsx`
- `components/common/ProductCardSkeleton.tsx`
- `components/common/EmptyState.tsx`
- `components/common/ErrorRetry.tsx`
- `components/common/OfflineBanner.tsx`
- `utils/imageOptimization.ts`
- `utils/cacheManager.ts`

**Files to modify**:
- All components: Add loading/error/empty states
- All components: Add accessibility attributes
- `app/MainStorePage.tsx` - Optimize re-renders

**Acceptance Criteria**:
- ✅ Skeleton loaders show while loading
- ✅ All error scenarios handled gracefully
- ✅ Empty states have helpful messages
- ✅ Images lazy load efficiently
- ✅ App works offline with cached data
- ✅ Scrolling is smooth (60 FPS)
- ✅ Screen reader announces correctly
- ✅ Color contrast passes WCAG AA

---

#### Week 8: Analytics, Testing & Launch Prep
**Goal**: Final testing, analytics integration, and production deployment

**Tasks**:

1. **Analytics Integration**
   - **Setup Analytics Service**:
     - Choose platform: Firebase Analytics, Mixpanel, or Amplitude
     - Install SDK
     - Initialize in app entry point

   - **Track Store Events**:
     ```typescript
     // Store page view
     analytics.track('store_page_viewed', {
       storeId: store.id,
       storeName: store.name,
       category: store.category
     });

     // Product view
     analytics.track('product_viewed', {
       productId: product.id,
       productName: product.name,
       price: product.price,
       storeId: store.id
     });

     // Add to cart
     analytics.track('add_to_cart', {
       productId: product.id,
       quantity: quantity,
       price: product.price,
       storeId: store.id
     });

     // Filter applied
     analytics.track('filter_applied', {
       filterType: 'category',
       filterValue: 'electronics',
       storeId: store.id
     });

     // Search performed
     analytics.track('search_performed', {
       query: searchQuery,
       resultsCount: products.length,
       storeId: store.id
     });

     // Store followed
     analytics.track('store_followed', {
       storeId: store.id,
       storeName: store.name
     });
     ```

2. **Trust Signals**
   - **Verified Store Badge**:
     - Display checkmark badge if `isVerified: true`
     - Tooltip: "Verified by Rez"
     - Position: Next to store name

   - **Security Badges**:
     - "Secure Checkout" badge
     - "Verified Reviews" indicator
     - "Trusted Seller" badge for high-rated stores

   - **Store Metrics**:
     - Total orders fulfilled (if available)
     - Customer satisfaction score
     - Response time: "Usually responds in 2 hours"

   - **Partner Level Display**:
     - Gold/Platinum/Silver/Bronze badge
     - Tooltip with partner benefits
     - Premium badge styling

3. **Social Proof**
   - **Recent Purchase Notifications**:
     - Toast appearing randomly
     - "John from Delhi just bought this"
     - Product image thumbnail
     - Time ago: "2 minutes ago"
     - Dismissible

   - **Viewing Counter**:
     - "8 people viewing this product"
     - Real-time update (socket if available)
     - Only show if count > 3

   - **Review Highlights**:
     - Show top-rated review snippet
     - "★★★★★ Amazing quality! - Sarah M."
     - Position: Below product

   - **Customer Testimonials**:
     - Featured customer reviews
     - With photos if available
     - Carousel format

4. **Testing**
   - **Unit Tests** (Jest + React Native Testing Library):
     ```typescript
     // Example test for StoreProductCard
     describe('StoreProductCard', () => {
       it('displays product information correctly', () => {
         // Test rendering
       });

       it('calls add to cart when button pressed', () => {
         // Test interaction
       });

       it('shows out of stock badge when no inventory', () => {
         // Test conditional rendering
       });
     });
     ```

   - **Integration Tests**:
     - Test API integration with mock server
     - Test cart flow end-to-end
     - Test filter and search flow

   - **E2E Tests** (Detox):
     - Navigate to store page
     - Search for product
     - Add to cart
     - Complete purchase flow

   - **Cross-Platform Testing**:
     - Test on iOS (iPhone 12, 14, SE)
     - Test on Android (Pixel, Samsung)
     - Test on Web
     - Test different screen sizes

   - **Performance Testing**:
     - Measure Time to Interactive (TTI)
     - Measure First Contentful Paint (FCP)
     - Check for memory leaks
     - Profile render performance

5. **Documentation**
   - **Component Documentation**:
     - Props documentation for each component
     - Usage examples
     - Storybook stories if applicable

   - **API Integration Guide**:
     - Document all API endpoints used
     - Request/response examples
     - Error handling strategies

   - **Deployment Checklist**:
     - Environment variables set
     - API keys configured
     - Analytics enabled
     - Error monitoring enabled
     - Performance monitoring enabled

   - **Monitoring Setup**:
     - Sentry for error tracking
     - Firebase Performance
     - Custom dashboard for store metrics

6. **Production Deployment**
   - **Feature Flags**:
     - Wrap new features in feature flags
     - Gradual rollout capability
     - A/B test different variants

   - **Staged Rollout**:
     - Deploy to 5% users first
     - Monitor metrics and errors
     - Increase to 25%, then 50%, then 100%

   - **Rollback Plan**:
     - Keep previous version ready
     - Rollback procedure documented
     - Monitor rollback metrics

   - **Post-Deployment**:
     - Monitor error rates
     - Check performance metrics
     - Collect user feedback
     - Plan iteration based on data

**Files to create**:
- `services/analyticsService.ts`
- `components/store/TrustBadges.tsx`
- `components/store/SocialProof.tsx`
- `components/store/RecentPurchaseToast.tsx`
- `__tests__/MainStorePage.test.tsx`
- `__tests__/StoreProductCard.test.tsx`
- `docs/STORE_PAGE_GUIDE.md`
- `docs/DEPLOYMENT_CHECKLIST.md`

**Acceptance Criteria**:
- ✅ All analytics events tracking correctly
- ✅ Trust badges display properly
- ✅ Social proof notifications appear
- ✅ All tests passing (unit, integration, E2E)
- ✅ Documentation complete
- ✅ Production deployment successful
- ✅ Error rate < 1%
- ✅ Performance metrics good (TTI < 3s)

---

## 🔧 Technical Architecture Changes

### New Components to Create (~25 components)

```
components/store/
├── StoreProductGrid.tsx              # Week 1
├── StoreProductCard.tsx              # Week 1
├── EmptyProducts.tsx                 # Week 1
├── ProductVariantModal.tsx           # Week 2
├── QuantitySelector.tsx              # Week 2
├── StoreProductFilters.tsx           # Week 3
├── StoreProductSearch.tsx            # Week 3
├── FilterChips.tsx                   # Week 3
├── SortDropdown.tsx                  # Week 3
├── StorePolicies.tsx                 # Week 4
├── StoreContact.tsx                  # Week 4
├── PaymentMethods.tsx                # Week 4
├── DeliveryInfo.tsx                  # Week 4
├── StoreFollowButton.tsx             # Week 4
├── RelatedProducts.tsx               # Week 5
├── FrequentlyBoughtTogether.tsx     # Week 5
├── RecentlyViewedProducts.tsx       # Week 5
├── ProductQuickView.tsx              # Week 5
├── PromotionsBanner.tsx              # Week 6
├── DealCard.tsx                      # Week 6
├── DealCountdown.tsx                 # Week 6
├── CashbackCalculator.tsx            # Week 6
├── TrustBadges.tsx                   # Week 8
├── SocialProof.tsx                   # Week 8
└── RecentPurchaseToast.tsx           # Week 8

components/common/
├── SkeletonLoader.tsx                # Week 7
├── ProductCardSkeleton.tsx           # Week 7
├── EmptyState.tsx                    # Week 7
├── ErrorRetry.tsx                    # Week 7
├── OfflineBanner.tsx                 # Week 7
└── Toast.tsx                         # Week 2

hooks/
├── useProductFilters.ts              # Week 3
├── useRecentlyViewed.ts              # Week 5
└── useWishlist.ts                    # Week 5

services/
├── offersApi.ts                      # Week 6
└── analyticsService.ts               # Week 8

utils/
├── imageOptimization.ts              # Week 7
└── cacheManager.ts                   # Week 7

__tests__/
├── MainStorePage.test.tsx            # Week 8
└── StoreProductCard.test.tsx         # Week 8

docs/
├── STORE_PAGE_GUIDE.md               # Week 8
└── DEPLOYMENT_CHECKLIST.md           # Week 8
```

### Files to Modify (~15 files)

**Major Updates**:
- `app/MainStorePage.tsx` - Complete refactor with product catalog
- `components/WalkInDealsModal.tsx` - Remove mock data, add API
- `app/MainStoreSection/MainStoreHeader.tsx` - Add search, follow button
- `components/AboutModal.tsx` - Add policies and contact sections
- `app/MainStoreSection/CashbackOffer.tsx` - Dynamic cashback

**Minor Updates**:
- `contexts/CartContext.tsx` - Ensure compatibility
- `app/MainStoreSection/ProductDisplay.tsx` - Update to use product data
- `app/MainStoreSection/TabNavigation.tsx` - Possibly add Products tab
- All StoreSection components - Add loading/error states

### Files to Remove
- `utils/mock-deals-data.ts` - After deals API integration
- `utils/mock-store-data.ts` - If exists and not used

### New Dependencies to Install
```json
{
  "react-native-fast-image": "^8.6.3",      // Optimized images
  "@react-native-async-storage/async-storage": "^1.19.3",  // Cache
  "react-native-reanimated": "^3.5.4",      // Smooth animations
  "@shopify/flash-list": "^1.6.3"           // Optimized lists (optional)
}
```

---

## 🎯 Success Metrics by Phase

### Phase 1 (Week 1-3) - Core Catalog ✅
- [ ] Products loading from `productsApi.getProductsByStore()`
- [ ] 20+ products displaying in grid
- [ ] Add to cart working with CartContext
- [ ] Cart badge updating with item count
- [ ] Filtering by category working
- [ ] Search returning relevant results
- [ ] Stock status displaying correctly
- [ ] Variant selection for products with variants
- [ ] Loading states showing skeletons
- [ ] Error states showing retry options

**KPIs**:
- API success rate > 95%
- Page load time < 2 seconds
- Add to cart success rate > 98%
- Zero crashes related to product display

### Phase 2 (Week 4-5) - Enhanced Experience ✅
- [ ] All store policies displayed
- [ ] Contact methods working (phone, email, WhatsApp)
- [ ] Payment methods showing with icons
- [ ] Delivery info accurate
- [ ] Follow/unfollow working
- [ ] Follower count displaying
- [ ] Related products showing
- [ ] Wishlist add/remove working
- [ ] Recently viewed tracking
- [ ] Quick view modal functional

**KPIs**:
- Store follow rate > 10%
- Wishlist additions per session > 2
- Click-through rate on related products > 15%
- Contact engagement > 5%

### Phase 3 (Week 6) - Deals & Offers ✅
- [ ] Mock deals data removed
- [ ] Real deals loading from backend
- [ ] Deal countdown timers accurate
- [ ] Deal status badges correct
- [ ] Promotions banner rotating
- [ ] Cashback showing per product
- [ ] Deal terms expandable

**KPIs**:
- Deals API success rate > 95%
- Deal redemption rate > 8%
- Promotion click-through rate > 12%
- Average deal value increase > 15%

### Phase 4 (Week 7-8) - Polish & Launch ✅
- [ ] All loading states polished
- [ ] All error scenarios handled
- [ ] Empty states designed
- [ ] Performance optimized
- [ ] Accessibility compliant
- [ ] Analytics tracking
- [ ] All tests passing
- [ ] Documentation complete

**KPIs**:
- Page load time < 1.5 seconds
- Error rate < 0.5%
- Crash-free rate > 99.5%
- Performance score > 90 (Lighthouse)
- Accessibility score > 95
- Test coverage > 80%

---

## ⚠️ Dependencies & Risk Mitigation

### Critical Dependencies

1. **Backend API - productsApi.getProductsByStore()**
   - **Status**: Available in codebase
   - **Risk**: API might be slow with large catalogs
   - **Mitigation**:
     - Implement pagination (20 products per page)
     - Add caching layer
     - Show loading skeletons

2. **Backend API - Deals/Offers**
   - **Status**: May not exist yet
   - **Risk**: Need to build backend endpoint
   - **Mitigation**:
     - Start with Phase 3 backend work early
     - Use feature flag to hide deals until ready
     - Have design ready for "Coming Soon" state

3. **CartContext**
   - **Status**: Exists in codebase
   - **Risk**: May have bugs or missing features
   - **Mitigation**:
     - Test thoroughly in Week 2
     - Fix any issues found
     - Add unit tests for cart actions

4. **WishlistAPI**
   - **Status**: Should exist based on context
   - **Risk**: May not be fully implemented
   - **Mitigation**:
     - Verify API in Week 5 start
     - Have local-only fallback using AsyncStorage
     - Sync to backend when available

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backend API performance issues | Medium | High | Implement caching, pagination, optimize queries |
| Image loading slow | High | Medium | Use image optimization, lazy loading, CDN |
| App performance degradation | Medium | High | Profile early, optimize re-renders, use memo |
| Third-party API failures (WhatsApp, analytics) | Low | Low | Graceful degradation, feature flags |
| Cross-platform inconsistencies | Medium | Medium | Test on all platforms weekly |
| User location permissions denied | High | Low | Show manual delivery check option |
| Backend breaking changes | Low | High | Version API endpoints, maintain backwards compatibility |

### Schedule Risks

| Risk | Mitigation |
|------|------------|
| Features taking longer than estimated | Build buffer into Phase 4, prioritize ruthlessly |
| Backend not ready for Phase 3 | Work on frontend polish in Phase 4 first, shift Phase 3 |
| Sick days / team availability | Document everything, ensure knowledge sharing |
| Scope creep | Strict adherence to plan, additional features go to backlog |
| Testing uncovers major bugs | Allocate full Week 8 for bug fixes if needed |

---

## 📊 Key Performance Indicators (KPIs)

### User Engagement Metrics
- **Store Page Views**: Track daily active store pages
- **Products Viewed per Session**: Target > 8 products
- **Add to Cart Rate**: Target > 15% of product views
- **Wishlist Rate**: Target > 10% of product views
- **Search Usage**: Target > 30% of sessions use search
- **Filter Usage**: Target > 25% of sessions use filters
- **Store Follow Rate**: Target > 12% of visitors follow store

### Performance Metrics
- **Page Load Time**: Target < 1.5 seconds
- **Time to Interactive (TTI)**: Target < 2 seconds
- **First Contentful Paint (FCP)**: Target < 1 second
- **API Response Time**: Target < 500ms
- **Error Rate**: Target < 0.5%
- **Crash-free Rate**: Target > 99.5%

### Business Metrics
- **Conversion Rate**: Visitors who make purchase
- **Average Order Value**: From store page visitors
- **Deal Redemption Rate**: Target > 8%
- **Wishlist to Purchase Rate**: Target > 20%
- **Return Visitor Rate**: Target > 35%

---

## 🚀 Post-Launch Iteration Plan

### Month 1 After Launch
- Monitor all metrics daily
- Fix critical bugs within 24 hours
- Collect user feedback
- Conduct user testing sessions
- Analyze drop-off points
- Plan quick wins for improvements

### Month 2-3 After Launch
- **Feature Enhancements** based on data:
  - Add "Try at Home" if applicable
  - Implement product comparison
  - Add AR/3D product view
  - Video reviews integration
  - Live shopping/video commerce

- **Performance Optimizations**:
  - Reduce bundle size
  - Optimize database queries
  - Implement better caching strategy
  - Progressive Web App features

- **Personalization**:
  - Personalized product recommendations
  - Custom homepage per user
  - Dynamic pricing for loyal customers
  - Targeted deals based on history

---

## 📝 Weekly Progress Tracking

Each week, track progress with these checkpoints:

### Week 1 Checkpoint ✅
- [ ] Product state added to MainStorePage
- [ ] API integration complete
- [ ] Product grid rendering products
- [ ] Basic product card design
- [ ] Loading/error states working

### Week 2 Checkpoint ✅
- [ ] Add to cart integrated with CartContext
- [ ] Stock badges displaying
- [ ] Quantity selector working
- [ ] Variant modal functional
- [ ] Success toast appearing

### Week 3 Checkpoint ✅
- [ ] Search bar implemented
- [ ] Filter drawer created
- [ ] Sort dropdown working
- [ ] Active filter chips showing
- [ ] Products filtering correctly

### Week 4 Checkpoint ✅
- [ ] Store policies displayed
- [ ] Contact section working
- [ ] Payment methods showing
- [ ] Delivery info correct
- [ ] Follow button functional

### Week 5 Checkpoint ✅
- [ ] Related products section
- [ ] Frequently bought together
- [ ] Recently viewed tracking
- [ ] Wishlist integrated
- [ ] Quick view modal working

### Week 6 Checkpoint ✅
- [ ] Mock data removed
- [ ] Real deals API integrated
- [ ] Countdown timers working
- [ ] Promotions banner rotating
- [ ] Cashback dynamic

### Week 7 Checkpoint ✅
- [ ] All skeleton loaders added
- [ ] Error handling robust
- [ ] Empty states designed
- [ ] Performance optimized
- [ ] Accessibility compliant

### Week 8 Checkpoint ✅
- [ ] Analytics tracking
- [ ] Trust signals added
- [ ] Social proof working
- [ ] All tests passing
- [ ] Production deployed

---

## 🎓 Learning Resources

### For Development Team
- **React Native Performance**: https://reactnative.dev/docs/performance
- **Expo Router**: https://docs.expo.dev/router/introduction/
- **React Query (for caching)**: https://tanstack.com/query/latest
- **Accessibility**: https://reactnative.dev/docs/accessibility

### E-commerce Best Practices
- **Shopify Design Patterns**: https://polaris.shopify.com/patterns
- **Amazon Store Pages**: Study their product display and filters
- **Baymard Institute**: E-commerce UX research

---

## 📞 Support & Questions

### During Implementation
- **Technical Issues**: Create detailed bug reports with screenshots
- **Design Decisions**: Review with UX team weekly
- **Backend Questions**: Schedule syncs with backend team
- **Timeline Concerns**: Escalate immediately, don't wait

### After Launch
- **Bug Reports**: Prioritize by severity (P0-P3)
- **Feature Requests**: Add to product backlog with user votes
- **Performance Issues**: Monitor dashboard, investigate immediately
- **User Feedback**: Weekly review sessions

---

## ✅ Definition of Done

A feature is "done" when:
- [ ] Code written and peer-reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Manually tested on iOS, Android, Web
- [ ] Accessibility tested with screen reader
- [ ] Performance profiled (no regressions)
- [ ] Analytics events implemented
- [ ] Error handling added
- [ ] Loading states added
- [ ] Empty states added
- [ ] Documentation updated
- [ ] Product owner approved
- [ ] Merged to main branch

---

## 🎉 Conclusion

This plan transforms MainStorePage from a basic store info page (30% ready) to a fully functional e-commerce store page (100% ready) over 6-8 weeks.

**Key Success Factors**:
1. ✅ Clear phased approach with testable milestones
2. ✅ Using existing backend APIs (productsApi.getProductsByStore)
3. ✅ Focus on core e-commerce features first
4. ✅ Polish and optimization in final weeks
5. ✅ Comprehensive testing and monitoring

**Next Steps**:
1. Review and approve plan with stakeholders
2. Set up project board with all tasks
3. Begin Week 1: Product Display Foundation
4. Schedule weekly check-ins
5. Start building! 🚀

---

**Document Version**: 1.0
**Last Updated**: 2025-01-12
**Status**: Approved and Ready for Implementation
**Estimated Completion**: 6-8 weeks from start date
