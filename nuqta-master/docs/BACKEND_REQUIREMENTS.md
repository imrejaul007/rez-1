# Backend Requirements for Enhanced MainCategory Pages

This document outlines all the backend endpoints and model updates needed to support the new category page sections. Currently, these sections use dummy data from `data/categoryDummyData.ts`. Implement these endpoints to connect to real data.

---

## New API Endpoints Required

### 1. Category Vibes Endpoint

**Endpoint:** `GET /api/categories/:slug/vibes`

**Description:** Returns mood-based shopping vibes for a category

**Response:**
```json
{
  "success": true,
  "data": {
    "vibes": [
      {
        "id": "sunny",
        "name": "Sunny Day",
        "icon": "☀️",
        "color": "#FBBF24",
        "description": "Light & breezy outfits"
      }
    ]
  }
}
```

**Used by:** `ShopByVibeSection.tsx`

---

### 2. Category Occasions Endpoint

**Endpoint:** `GET /api/categories/:slug/occasions`

**Description:** Returns event-based shopping occasions for a category

**Response:**
```json
{
  "success": true,
  "data": {
    "occasions": [
      {
        "id": "wedding",
        "name": "Wedding",
        "icon": "💒",
        "color": "#F43F5E",
        "tag": "Hot",
        "discount": 30
      }
    ]
  }
}
```

**Used by:** `ShopByOccasionSection.tsx`

---

### 3. Trending Hashtags Endpoint

**Endpoint:** `GET /api/trending/hashtags?category=:slug`

**Query Parameters:**
- `category` (required): Category slug
- `limit` (optional): Number of hashtags (default: 6)

**Response:**
```json
{
  "success": true,
  "data": {
    "hashtags": [
      {
        "id": "1",
        "tag": "#WeddingSeason",
        "count": 3200,
        "color": "#F43F5E",
        "trending": true
      }
    ]
  }
}
```

**Used by:** `TrendingHashtags.tsx`

---

### 4. Exclusive Offers Endpoint

**Endpoint:** `GET /api/offers/exclusive?category=:slug`

**Query Parameters:**
- `category` (optional): Category slug for filtering
- `limit` (optional): Number of offers (default: 6)

**Response:**
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "student",
        "title": "Student Special",
        "icon": "🎓",
        "discount": "25% Extra Off",
        "description": "Valid student ID required",
        "color": "#3B82F6",
        "gradient": ["#3B82F6", "#1D4ED8"],
        "validUntil": "2025-01-31T23:59:59Z"
      }
    ]
  }
}
```

**Used by:** `ExclusiveOffersSection.tsx`

---

### 5. Bank Offers Endpoint

**Endpoint:** `GET /api/offers/bank?category=:slug`

**Query Parameters:**
- `category` (optional): Category slug for filtering
- `limit` (optional): Number of offers (default: 6)

**Response:**
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "hdfc",
        "bank": "HDFC Bank",
        "icon": "🏦",
        "offer": "10% Instant Discount",
        "maxDiscount": 1500,
        "minOrder": 3000,
        "cardType": "Credit/Debit",
        "validUntil": "2025-02-28T23:59:59Z"
      }
    ]
  }
}
```

**Used by:** `BankOffersSection.tsx`

---

### 6. Nearby Stores Endpoint (Enhanced)

**Endpoint:** `GET /api/stores/nearby`

**Query Parameters:**
- `category` (required): Category slug
- `lat` (optional): User latitude
- `lng` (optional): User longitude
- `radius` (optional): Search radius in km (default: 10)
- `limit` (optional): Number of stores (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "id": "s1",
        "name": "Zara",
        "logo": "👗",
        "rating": 4.6,
        "distance": "1.2 km",
        "cashback": 18,
        "is60Min": true,
        "hasPickup": true,
        "categories": ["fashion", "men", "women"]
      }
    ]
  }
}
```

**Used by:** `NearbyStoresSection.tsx`

---

### 7. Best Deals Endpoint

**Endpoint:** `GET /api/products/deals`

**Query Parameters:**
- `category` (required): Category slug
- `minDiscount` (optional): Minimum discount percentage (default: 25)
- `limit` (optional): Number of products (default: 8)
- `sortBy` (optional): Sort by field (discount, price, rating)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "p1",
        "name": "Premium Cotton Shirt",
        "brand": "Allen Solly",
        "price": 1499,
        "originalPrice": 2499,
        "image": "https://...",
        "rating": 4.5,
        "reviews": 2340,
        "cashbackPercent": 18,
        "coinsEarned": 270,
        "tag": "Bestseller",
        "is60Min": true,
        "hasPickup": true
      }
    ]
  }
}
```

**Used by:** `BestDealsSection.tsx`, `TrendingProductsSection.tsx`

---

### 8. User Loyalty Data Endpoint

**Endpoint:** `GET /api/users/loyalty`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "streak": {
      "current": 5,
      "target": 7,
      "lastCheckin": "2025-12-22T10:00:00Z"
    },
    "brandLoyalty": [
      {
        "brandId": "zara",
        "brandName": "Zara",
        "purchaseCount": 8,
        "tier": "Gold",
        "progress": 80,
        "nextTierAt": 10
      }
    ],
    "missions": [
      {
        "id": "1",
        "title": "First Purchase",
        "description": "Make your first purchase this week",
        "progress": 0,
        "target": 1,
        "reward": 100,
        "icon": "🛒"
      }
    ],
    "coins": {
      "available": 2450,
      "expiring": 500,
      "expiryDays": 7
    }
  }
}
```

**Used by:** `StreakLoyaltySection.tsx`, `WalletReminderBanner.tsx`

---

### 9. Social Proof Stats Endpoint

**Endpoint:** `GET /api/stats/social?category=:slug`

**Query Parameters:**
- `category` (required): Category slug

**Response:**
```json
{
  "success": true,
  "data": {
    "shoppedToday": 2340,
    "totalEarned": 45000,
    "topHashtags": ["#Trending", "#BestDeals", "#Cashback"],
    "recentBuyers": [
      {
        "name": "Priya S.",
        "avatar": "👩",
        "item": "Blue Dress",
        "timeAgo": "2 mins ago"
      }
    ]
  }
}
```

**Used by:** `SocialProofSection.tsx`

---

### 10. Top Brands by Category

**Endpoint:** `GET /api/brands/top`

**Query Parameters:**
- `category` (required): Category slug
- `limit` (optional): Number of brands (default: 10)
- `sortBy` (optional): Sort by (cashback, rating, popularity)

**Response:**
```json
{
  "success": true,
  "data": {
    "brands": [
      {
        "id": "zara",
        "name": "Zara",
        "logo": "👗",
        "cashback": 18,
        "tag": "Trending",
        "rating": 4.6
      }
    ]
  }
}
```

**Used by:** `TopBrandsSection.tsx`

---

## Database Model Updates

### Category Model Additions

Add these fields to the existing Category model:

```typescript
// In src/models/Category.ts

interface ICategory {
  // ... existing fields ...

  // NEW FIELDS
  vibes: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
  }>;

  occasions: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    tag: string | null;
    discount: number;
  }>;

  trendingHashtags: string[];
}
```

---

### Store Model Additions

Add these fields to the existing Store model:

```typescript
// In src/models/Store.ts

interface IStore {
  // ... existing fields ...

  // NEW FIELDS
  is60MinDelivery: boolean;    // Supports 60-min delivery
  hasStorePickup: boolean;     // Supports store pickup
  distance?: string;           // Calculated field based on user location
}
```

---

### New Models Required

#### 1. BankOffer Model

```typescript
// src/models/BankOffer.ts

interface IBankOffer {
  _id: ObjectId;
  bankName: string;
  icon: string;
  description: string;
  offer: string;
  maxDiscount: number;
  minOrder: number;
  cardTypes: string[];              // ["Credit", "Debit", "All Cards"]
  categories: ObjectId[];           // Related categories
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. UserLoyalty Model

```typescript
// src/models/UserLoyalty.ts

interface IUserLoyalty {
  _id: ObjectId;
  userId: ObjectId;

  dailyStreak: {
    current: number;
    target: number;
    lastCheckin: Date;
    history: Date[];
  };

  brandLoyalty: Array<{
    brandId: ObjectId;
    brandName: string;
    purchaseCount: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    progress: number;
    nextTierAt: number;
  }>;

  missions: Array<{
    missionId: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    reward: number;
    icon: string;
    completedAt?: Date;
  }>;

  coins: {
    available: number;
    expiring: number;
    expiryDate: Date;
    history: Array<{
      amount: number;
      type: 'earned' | 'spent' | 'expired';
      description: string;
      date: Date;
    }>;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

#### 3. TrendingHashtag Model

```typescript
// src/models/TrendingHashtag.ts

interface ITrendingHashtag {
  _id: ObjectId;
  tag: string;
  category: ObjectId;
  count: number;
  isTrending: boolean;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. ExclusiveOffer Model

```typescript
// src/models/ExclusiveOffer.ts

interface IExclusiveOffer {
  _id: ObjectId;
  title: string;
  icon: string;
  discount: string;
  description: string;
  color: string;
  gradient: string[];
  targetAudience: 'student' | 'women' | 'senior' | 'corporate' | 'birthday' | 'first' | 'all';
  categories: ObjectId[];
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Controller Functions to Implement

### categoryController.ts

```typescript
// Add these methods to existing controller

export const getCategoryVibes = async (req, res) => {
  const { slug } = req.params;
  // Fetch vibes for category
};

export const getCategoryOccasions = async (req, res) => {
  const { slug } = req.params;
  // Fetch occasions for category
};
```

### offersController.ts (New)

```typescript
export const getExclusiveOffers = async (req, res) => {
  const { category, limit } = req.query;
  // Fetch exclusive offers, optionally filtered by category
};

export const getBankOffers = async (req, res) => {
  const { category, limit } = req.query;
  // Fetch bank offers, optionally filtered by category
};
```

### storesController.ts

```typescript
// Add to existing controller

export const getNearbyStores = async (req, res) => {
  const { category, lat, lng, radius, limit } = req.query;
  // Fetch nearby stores with distance calculation
};
```

### productsController.ts

```typescript
// Add to existing controller

export const getBestDeals = async (req, res) => {
  const { category, minDiscount, limit, sortBy } = req.query;
  // Fetch products with high discounts
};
```

### loyaltyController.ts (New)

```typescript
export const getUserLoyalty = async (req, res) => {
  const userId = req.user._id;
  // Fetch user's loyalty data (streak, missions, coins)
};

export const checkInStreak = async (req, res) => {
  const userId = req.user._id;
  // Update user's daily streak
};

export const completeMission = async (req, res) => {
  const { missionId } = req.params;
  // Mark mission as completed and reward coins
};
```

### statsController.ts (New)

```typescript
export const getSocialProofStats = async (req, res) => {
  const { category } = req.query;
  // Fetch shopping stats for social proof
};
```

### brandsController.ts

```typescript
// Add to existing controller

export const getTopBrands = async (req, res) => {
  const { category, limit, sortBy } = req.query;
  // Fetch top brands for category
};
```

### trendingController.ts (New)

```typescript
export const getTrendingHashtags = async (req, res) => {
  const { category, limit } = req.query;
  // Fetch trending hashtags
};

export const incrementHashtagCount = async (req, res) => {
  const { tag } = req.body;
  // Increment hashtag usage count
};
```

---

## New Routes to Add

### routes/offersRoutes.ts (New)

```typescript
router.get('/exclusive', offersController.getExclusiveOffers);
router.get('/bank', offersController.getBankOffers);
```

### routes/loyaltyRoutes.ts (New)

```typescript
router.get('/', authenticate, loyaltyController.getUserLoyalty);
router.post('/checkin', authenticate, loyaltyController.checkInStreak);
router.post('/missions/:missionId/complete', authenticate, loyaltyController.completeMission);
```

### routes/trendingRoutes.ts (New)

```typescript
router.get('/hashtags', trendingController.getTrendingHashtags);
```

### routes/statsRoutes.ts (New)

```typescript
router.get('/social', statsController.getSocialProofStats);
```

---

## Frontend Hooks to Create

Once backend is ready, create these hooks to replace dummy data:

```
hooks/useCategoryVibes.ts      - GET /api/categories/:slug/vibes
hooks/useCategoryOccasions.ts  - GET /api/categories/:slug/occasions
hooks/useTrendingHashtags.ts   - GET /api/trending/hashtags
hooks/useExclusiveOffers.ts    - GET /api/offers/exclusive
hooks/useBankOffers.ts         - GET /api/offers/bank
hooks/useNearbyStores.ts       - GET /api/stores/nearby
hooks/useBestDeals.ts          - GET /api/products/deals
hooks/useLoyaltyData.ts        - GET /api/users/loyalty
hooks/useSocialProof.ts        - GET /api/stats/social
hooks/useTopBrands.ts          - GET /api/brands/top
```

---

## Implementation Priority

### High Priority (Core Functionality)
1. `/api/brands/top` - Top Brands Section
2. `/api/products/deals` - Best Deals & Trending Products
3. `/api/stores/nearby` - Nearby Stores
4. `/api/offers/exclusive` - Exclusive Offers

### Medium Priority (Enhanced Features)
5. `/api/categories/:slug/vibes` - Shop by Vibe
6. `/api/categories/:slug/occasions` - Shop by Occasion
7. `/api/offers/bank` - Bank Offers
8. `/api/trending/hashtags` - Trending Hashtags

### Low Priority (Gamification)
9. `/api/users/loyalty` - Loyalty & Streaks
10. `/api/stats/social` - Social Proof Stats

---

## Testing Checklist

- [ ] All endpoints return correct response format
- [ ] Pagination works correctly
- [ ] Category filtering works
- [ ] Location-based queries work (nearby stores)
- [ ] Authentication required endpoints secured
- [ ] Error handling implemented
- [ ] Response caching for performance
- [ ] Rate limiting applied

---

## Notes

- All dummy data is currently in `data/categoryDummyData.ts`
- Components can be switched to use real API by updating the data fetching logic
- Consider implementing Redis caching for frequently accessed data (trending, social proof)
- Location-based queries should use geospatial indexes in MongoDB
