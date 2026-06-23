# Backend Requirements for Offers Page Redesign

This document outlines the API endpoints needed for the redesigned offers page. Some endpoints already exist, while others need to be implemented.

---

## Existing APIs (Already Implemented)

### 1. Main Offers API
```
GET /api/offers
GET /api/offers/featured
GET /api/offers/trending
GET /api/offers/nearby?lat=&lng=
GET /api/offers/new-arrivals
GET /api/offers/students
GET /api/offers/user/recommendations (requires auth)
```

### 2. Flash Sales API
```
GET /api/flash-sales/active
GET /api/flash-sales/upcoming
GET /api/flash-sales/expiring-soon
GET /api/flash-sales/:id
```

### 3. Cashback API
```
GET /api/cashback/campaigns
GET /api/cashback/summary (requires auth)
```

### 4. Categories API
```
GET /api/offer-categories
GET /api/offer-categories/featured
```

---

## Missing APIs (Need Implementation)

### 1. Friends Redeemed API

Social feature showing offers that friends have redeemed.

**Endpoint:**
```
GET /api/offers/friends-redeemed
```

**Authentication:** Required

**Query Parameters:**
- `limit` (optional, default: 10): Number of items to return
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "fr-123",
        "friendId": "user-456",
        "friendName": "Rahul S.",
        "friendAvatar": "https://...",
        "offer": {
          "id": "offer-789",
          "title": "50% Off Pizza",
          "image": "https://...",
          "store": "Dominos",
          "savings": 8.50,
          "cashbackPercentage": 15
        },
        "redeemedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 25,
    "hasMore": true
  }
}
```

**Database Requirements:**
- Track user connections/friends
- Record redemption history with friend visibility settings
- Privacy controls (users can opt-out of showing redemptions)

---

### 2. Hotspot Deals API

Location-based grouping of deals by area/neighborhood.

**Endpoint:**
```
GET /api/offers/hotspots
```

**Authentication:** Optional

**Query Parameters:**
- `lat` (required): User latitude
- `lng` (required): User longitude
- `radius` (optional, default: 10): Radius in km

**Response:**
```json
{
  "success": true,
  "data": {
    "hotspots": [
      {
        "id": "hs-1",
        "areaName": "Koramangala",
        "areaId": "koramangala",
        "coordinates": {
          "lat": 12.9352,
          "lng": 77.6245
        },
        "totalDeals": 45,
        "topDeals": [
          {
            "id": "offer-1",
            "title": "...",
            "image": "..."
          }
        ]
      }
    ]
  }
}
```

**Implementation Notes:**
- Aggregate offers by geographic area
- Pre-define popular areas/neighborhoods
- Calculate deal count per area
- Cache results for performance

---

### 3. Double Cashback Campaigns API

Time-limited campaigns with cashback multipliers.

**Endpoint:**
```
GET /api/cashback/double-campaigns
```

**Authentication:** Optional

**Response:**
```json
{
  "success": true,
  "data": {
    "activeCampaigns": [
      {
        "id": "dc-1",
        "title": "Double Cashback Weekend",
        "subtitle": "Earn 2X coins on all orders!",
        "multiplier": 2,
        "startTime": "2024-01-20T00:00:00Z",
        "endTime": "2024-01-21T23:59:59Z",
        "eligibleStores": ["store-1", "store-2"],
        "eligibleStoreNames": ["Swiggy", "Zomato"],
        "terms": [
          "Min order Rs. 200",
          "Max cashback Rs. 100",
          "Valid on first 2 orders"
        ],
        "backgroundColor": "#FEF3C7",
        "bannerImage": "https://..."
      }
    ],
    "upcomingCampaigns": []
  }
}
```

**Database Schema:**
```typescript
interface DoubleCashbackCampaign {
  id: ObjectId;
  title: string;
  subtitle: string;
  multiplier: number;
  startTime: Date;
  endTime: Date;
  eligibleStores: ObjectId[];
  terms: string[];
  bannerImage?: string;
  backgroundColor: string;
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 4. Exclusive Zones API

Category-based exclusive offers (Corporate, Women, Birthday).

**Endpoint:**
```
GET /api/offers/exclusive-zones
```

**Authentication:** Optional (enhanced with auth for personalization)

**Response:**
```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "id": "zone-corporate",
        "name": "Corporate",
        "slug": "corporate",
        "icon": "briefcase",
        "iconColor": "#0EA5E9",
        "backgroundColor": "#E0F2FE",
        "description": "Special deals for corporates",
        "offersCount": 28,
        "eligibilityType": "corporate_email",
        "isEligible": true
      },
      {
        "id": "zone-women",
        "name": "Women",
        "slug": "women",
        "icon": "woman",
        "iconColor": "#EC4899",
        "backgroundColor": "#FCE7F3",
        "description": "Exclusive offers for women",
        "offersCount": 45,
        "eligibilityType": "gender",
        "isEligible": null
      },
      {
        "id": "zone-birthday",
        "name": "Birthday",
        "slug": "birthday",
        "icon": "gift",
        "iconColor": "#F59E0B",
        "backgroundColor": "#FEF3C7",
        "description": "Birthday month specials",
        "offersCount": 12,
        "eligibilityType": "birthday_month",
        "isEligible": true
      }
    ]
  }
}
```

**Get Zone Offers:**
```
GET /api/offers/exclusive-zones/:slug/offers
```

**Response:**
```json
{
  "success": true,
  "data": {
    "zone": {
      "id": "zone-corporate",
      "name": "Corporate",
      "slug": "corporate"
    },
    "offers": [
      {
        "id": "offer-1",
        "title": "Office Lunch Deal",
        "subtitle": "Healthy Meal Box",
        "image": "https://...",
        "store": {
          "id": "store-1",
          "name": "Fresh Box",
          "logo": "https://..."
        },
        "cashbackPercentage": 25,
        "eligibilityRequirement": "Valid corporate email required"
      }
    ],
    "total": 28,
    "page": 1,
    "limit": 20
  }
}
```

**Eligibility Types:**
- `student` - Verified student email/ID
- `corporate` - Verified corporate email domain
- `women` - Gender-based (self-declared)
- `birthday` - Birthday month verification
- `senior_citizen` - Age verification
- `healthcare` - Healthcare worker verification
- `defence` - Military/defence verification
- `teacher` - Teacher ID verification

---

---

### 5. Sales & Clearance API

Sale and clearance offers with high discounts.

**Endpoint:**
```
GET /api/offers/sales-clearance
```

**Authentication:** Optional

**Query Parameters:**
- `limit` (optional, default: 20): Number of items
- `tag` (optional): Filter by tag - `clearance`, `sale`, `last_pieces`

**Response:**
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "sale-1",
        "title": "Clearance Pizza",
        "subtitle": "2 Medium Pizzas",
        "image": "https://...",
        "store": {
          "id": "store-1",
          "name": "Pizza Express",
          "logo": "https://...",
          "rating": 4.2,
          "verified": true
        },
        "originalPrice": 25.00,
        "salePrice": 9.99,
        "discountPercentage": 60,
        "cashbackPercentage": 10,
        "tag": "clearance"
      }
    ]
  }
}
```

---

### 6. BOGO (Buy One Get One) API

Buy one get one free and similar offers.

**Endpoint:**
```
GET /api/offers/bogo
```

**Authentication:** Optional

**Query Parameters:**
- `limit` (optional, default: 20): Number of items
- `type` (optional): Filter by type - `buy1get1`, `buy2get1`, `buy1get50`

**Response:**
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "bogo-1",
        "title": "Buy 1 Get 1 Pizza",
        "subtitle": "Any Medium Pizza",
        "image": "https://...",
        "store": {
          "id": "store-1",
          "name": "Pizza Palace",
          "logo": "https://..."
        },
        "originalPrice": 15.00,
        "bogoType": "buy1get1",
        "cashbackPercentage": 10,
        "validUntil": "2024-01-25T23:59:59Z"
      }
    ]
  }
}
```

---

### 7. Free Delivery Offers API

Offers with free delivery.

**Endpoint:**
```
GET /api/offers/free-delivery
```

**Authentication:** Optional

**Query Parameters:**
- `lat` (optional): User latitude for distance calculation
- `lng` (optional): User longitude
- `limit` (optional, default: 20): Number of items

**Response:**
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "fd-1",
        "title": "Free Delivery Special",
        "subtitle": "No minimum order",
        "image": "https://...",
        "store": {
          "id": "store-1",
          "name": "McDonald's",
          "logo": "https://..."
        },
        "cashbackPercentage": 10,
        "minOrderValue": 0,
        "rating": 4.1
      }
    ]
  }
}
```

---

### 8. Coin Drops API (Cashback Multipliers)

Time-limited cashback multiplier campaigns.

**Endpoint:**
```
GET /api/cashback/coin-drops
```

**Authentication:** Optional

**Response:**
```json
{
  "success": true,
  "data": {
    "coinDrops": [
      {
        "id": "cd-1",
        "storeName": "Swiggy",
        "storeLogo": "https://...",
        "storeId": "store-1",
        "multiplier": 3,
        "normalCashback": 10,
        "boostedCashback": 30,
        "endTime": "2024-01-20T18:00:00Z",
        "category": "Food Delivery"
      }
    ]
  }
}
```

---

### 9. Upload Bill Stores API

Stores that accept bill uploads for cashback.

**Endpoint:**
```
GET /api/cashback/upload-bill-stores
```

**Authentication:** Optional

**Response:**
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "id": "ub-1",
        "name": "Big Bazaar",
        "logo": "https://...",
        "category": "Grocery",
        "coinsPerRupee": 2,
        "maxCoinsPerBill": 500
      }
    ]
  }
}
```

**Upload Bill Endpoint:**
```
POST /api/cashback/upload-bill
```

**Authentication:** Required

**Request Body (multipart/form-data):**
- `storeId`: Store ID
- `billImage`: Bill image file
- `billAmount`: Total bill amount

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload-123",
    "status": "pending_review",
    "estimatedCoins": 100,
    "message": "Bill uploaded successfully. Coins will be credited after verification."
  }
}
```

---

### 10. Bank & Wallet Offers API

Payment method specific offers.

**Endpoint:**
```
GET /api/offers/bank-offers
```

**Authentication:** Optional

**Query Parameters:**
- `cardType` (optional): Filter by `credit`, `debit`, `wallet`
- `bankName` (optional): Filter by bank name

**Response:**
```json
{
  "success": true,
  "data": {
    "offers": [
      {
        "id": "bo-1",
        "bankName": "HDFC Bank",
        "bankLogo": "https://...",
        "offerTitle": "15% Cashback",
        "discountPercentage": 15,
        "maxDiscount": 200,
        "minTransactionAmount": 500,
        "cardType": "credit",
        "validUntil": "2024-01-31T23:59:59Z",
        "terms": "Valid on credit cards only"
      }
    ]
  }
}
```

---

### 11. Loyalty Progress API

User's loyalty progress and milestones.

**Endpoint:**
```
GET /api/loyalty/progress
```

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": [
      {
        "id": "lp-1",
        "title": "Order 3 more times",
        "description": "Complete to unlock Gold status",
        "currentValue": 7,
        "targetValue": 10,
        "reward": "Gold Member",
        "rewardCoins": 500,
        "icon": "trophy",
        "color": "#F59E0B"
      }
    ],
    "currentTier": "Silver",
    "nextTier": "Gold",
    "totalPoints": 2500
  }
}
```

---

### 12. Special Profiles API

Verified profile categories (Defence, Healthcare, etc.)

**Endpoint:**
```
GET /api/offers/special-profiles
```

**Authentication:** Optional (enhanced with auth)

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "sp-1",
        "name": "Defence",
        "slug": "defence",
        "icon": "shield",
        "iconColor": "#059669",
        "backgroundColor": "#D1FAE5",
        "offersCount": 25,
        "isVerified": false,
        "verificationRequired": "Military ID"
      }
    ]
  }
}
```

**Verify Profile Endpoint:**
```
POST /api/users/verify-profile
```

**Authentication:** Required

**Request Body (multipart/form-data):**
- `profileType`: Profile type slug (defence, healthcare, senior, teachers)
- `documentImage`: Verification document image
- `documentType`: Type of document (military_id, hospital_id, age_proof, teacher_id)

**Response:**
```json
{
  "success": true,
  "data": {
    "verificationId": "ver-123",
    "status": "pending_review",
    "estimatedTime": "24-48 hours"
  }
}
```

---

## API Priority Order

### High Priority (For MVP)
1. ✅ Existing offers APIs (already done)
2. ✅ Flash sales APIs (already done)
3. ⏳ Double Cashback Campaigns API
4. ⏳ Exclusive Zones API
5. ⏳ Sales & Clearance API
6. ⏳ BOGO API

### Medium Priority
7. ⏳ Friends Redeemed API
8. ⏳ Hotspot Deals API
9. ⏳ Free Delivery Offers API
10. ⏳ Coin Drops API
11. ⏳ Bank & Wallet Offers API

### Lower Priority
12. ⏳ Upload Bill Stores API
13. ⏳ Loyalty Progress API
14. ⏳ Special Profiles API
15. Enhanced personalization
16. Advanced filtering

---

## Frontend Integration Notes

### Current Dummy Data Usage

The frontend currently uses dummy data from `data/offersPageDummyData.ts` for:

**Offers Tab:**
- Friends Redeemed section
- Hotspot Deals section
- Sales & Clearance section
- Buy 1 Get 1 (BOGO) section
- Free Delivery section

**Cashback Tab:**
- Double Cashback Banner
- Coin Drops section
- Upload Bill stores
- Bank & Wallet Offers

**Exclusive Tab:**
- Corporate/Women/Birthday exclusive zones
- Special Profiles (Defence, Healthcare, Senior, Teachers)
- Loyalty Progress
- Birthday Banner

### Switching to Real APIs

When backend APIs are ready, update `components/offers/OffersPageContent.tsx`:

```typescript
// Replace dummy data imports with API calls
import { useEffect, useState } from 'react';
import api from '@/services/api';

// In component:
const [friendsRedeemed, setFriendsRedeemed] = useState([]);

useEffect(() => {
  const fetchFriendsRedeemed = async () => {
    const response = await api.get('/offers/friends-redeemed');
    if (response.success) {
      setFriendsRedeemed(response.data.items);
    }
  };
  fetchFriendsRedeemed();
}, []);
```

---

## Contact

For questions about these API requirements, contact the frontend team.
