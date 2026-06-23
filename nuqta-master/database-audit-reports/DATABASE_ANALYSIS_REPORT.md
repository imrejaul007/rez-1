# DATABASE ANALYSIS REPORT
Generated: 2025-11-15T08:02:53.557Z
Database: test
Total Collections: 81

## Collections Overview

| Collection | Document Count | Indexes | Quality Issues |
|------------|---------------|---------|----------------|
| categories | 24 | 8 | 10 |
| usercashbacks | 28 | 11 | 0 |
| menus | 0 | 5 | 0 |
| processed_webhook_events | 0 | 12 | 0 |
| userstreaks | 4 | 5 | 0 |
| servicerequests | 0 | 8 | 0 |
| faqs | 32 | 11 | 10 |
| flashsales | 0 | 11 | 0 |
| messages | 0 | 6 | 0 |
| transactions | 205 | 16 | 0 |
| discounts | 5 | 10 | 0 |
| mproducts | 1 | 9 | 1 |
| coupons | 16 | 8 | 3 |
| outlets | 3 | 5 | 0 |
| follows | 0 | 3 | 0 |
| scratchcards | 0 | 3 | 0 |
| offercategories | 5 | 13 | 0 |
| bills | 0 | 15 | 0 |
| promocodes | 9 | 7 | 0 |
| preorders | 0 | 8 | 0 |
| activities | 50 | 5 | 0 |
| favorites | 0 | 4 | 0 |
| storevisits | 1 | 10 | 0 |
| articles | 11 | 16 | 0 |
| addresses | 5 | 4 | 0 |
| storepromocoins | 0 | 6 | 0 |
| wishlists | 164 | 10 | 0 |
| referrals | 14 | 9 | 0 |
| usersettings | 21 | 2 | 0 |
| pricehistories | 0 | 7 | 0 |
| userstorevouchers | 0 | 7 | 0 |
| products | 389 | 17 | 0 |
| herobanners | 2 | 13 | 2 |
| carts | 1 | 9 | 0 |
| stores | 84 | 23 | 0 |
| socialmediaposts | 2 | 15 | 0 |
| pricealerts | 0 | 9 | 0 |
| discountusages | 0 | 8 | 0 |
| userchallengeprogresses | 34 | 8 | 0 |
| stock_history | 0 | 13 | 0 |
| wallets | 21 | 7 | 0 |
| userofferinteractions | 0 | 9 | 0 |
| conversations | 0 | 9 | 0 |
| reviews | 5 | 22 | 5 |
| stocknotifications | 0 | 9 | 0 |
| projects | 16 | 14 | 0 |
| notifications | 0 | 19 | 0 |
| cointransactions | 57 | 8 | 0 |
| offers | 12 | 37 | 10 |
| voucherbrands | 28 | 12 | 10 |
| userproducts | 0 | 6 | 0 |
| storecomparisons | 0 | 4 | 0 |
| auditlogs | 1 | 9 | 0 |
| users | 53 | 12 | 0 |
| partners | 11 | 6 | 10 |
| orders | 15 | 14 | 0 |
| quizquestions | 50 | 7 | 0 |
| uservouchers | 13 | 9 | 0 |
| subscriptions | 22 | 11 | 5 |
| storeanalytics | 34 | 10 | 0 |
| morders | 0 | 3 | 0 |
| offerredemptions | 3 | 14 | 0 |
| supporttickets | 0 | 11 | 0 |
| minigames | 929 | 7 | 0 |
| events | 6 | 9 | 6 |
| activityinteractions | 0 | 3 | 0 |
| gamesessions | 0 | 8 | 0 |
| consultations | 0 | 6 | 0 |
| storevouchers | 0 | 9 | 0 |
| videos | 141 | 23 | 0 |
| usercoupons | 10 | 8 | 0 |
| eventbookings | 4 | 6 | 0 |
| challenges | 27 | 9 | 0 |
| paymentmethods | 4 | 5 | 0 |
| cashbackrequests | 20 | 3 | 7 |
| userachievements | 90 | 5 | 0 |
| triviaquestions | 1 | 8 | 0 |
| serviceappointments | 0 | 11 | 0 |
| payments | 0 | 11 | 0 |
| tablebookings | 0 | 9 | 0 |
| merchants | 3 | 6 | 0 |

## Detailed Collection Analysis

### categories

**Document Count:** 24

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68ecdb9f55f086b04de299ef","68ecdb9f55f086b04de29... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,236,219,159,85,240,1... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [236,236,236]... |
| _id.buffer.2 | 100.0% | number | 0 | [219,219,219]... |
| _id.buffer.3 | 100.0% | number | 0 | [159,159,159]... |
| _id.buffer.4 | 100.0% | number | 0 | [85,85,85]... |
| _id.buffer.5 | 100.0% | number | 0 | [240,240,240]... |
| _id.buffer.6 | 100.0% | number | 0 | [134,134,134]... |
| _id.buffer.7 | 100.0% | number | 0 | [176,176,176]... |
| _id.buffer.8 | 100.0% | number | 0 | [77,77,77]... |
| _id.buffer.9 | 100.0% | number | 0 | [226,226,226]... |
| _id.buffer.10 | 100.0% | number | 0 | [153,153,153]... |
| _id.buffer.11 | 100.0% | number | 0 | [239,242,243]... |
| name | 100.0% | string | 0 | ["Fashion & Beauty","Grocery & Essentials","Electr... |
| slug | 100.0% | string | 0 | ["fashion-beauty","grocery-essentials","electronic... |
| description | 100.0% | string | 0 | ["Trending fashion items and beauty products for m... |
| icon | 100.0% | string | 0 | ["shirt-outline","basket-outline","phone-portrait-... |
| image | 100.0% | string | 0 | ["https://images.unsplash.com/photo-1483985988355-... |
| bannerImage | 100.0% | string | 0 | ["https://images.unsplash.com/photo-1483985988355-... |
| type | 100.0% | string | 0 | ["going_out","home_delivery","general"]... |
| childCategories | 100.0% | array | 0 | [["690af030ae136d963e5c98af","690af030ae136d963e5c... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| sortOrder | 100.0% | number | 0 | [1,4,5]... |
| metadata | 100.0% | object | 0 | [{"color":"#E91E63","tags":["fashion","beauty","cl... |
| metadata.color | 100.0% | string | 0 | ["#E91E63","#4CAF50","#2196F3"]... |
| metadata.tags | 100.0% | array | 0 | [["fashion","beauty","clothing","accessories"],["g... |
| metadata.description | 100.0% | string | 0 | ["Latest fashion trends, clothing, and beauty prod... |
| metadata.featured | 100.0% | boolean | 0 | [true,true,true]... |
| productCount | 100.0% | number | 0 | [1,9,22]... |
| storeCount | 100.0% | number | 0 | [0,3,0]... |
| __v | 100.0% | number | 0 | [1,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-13T10:59:43.338Z","2025-10-13T10:59:43.3... |
| updatedAt | 100.0% | object | 0 | ["2025-10-13T10:59:43.338Z","2025-10-13T10:59:43.3... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "slug": 1
    },
    "name": "slug_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "type": 1,
      "isActive": 1
    },
    "name": "type_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "parentCategory": 1
    },
    "name": "parentCategory_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "sortOrder": 1
    },
    "name": "sortOrder_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.featured": 1,
      "isActive": 1
    },
    "name": "metadata.featured_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "type": 1,
      "parentCategory": 1,
      "sortOrder": 1
    },
    "name": "type_1_parentCategory_1_sortOrder_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68ecdb9f55f086b04de299ef",
  "name": "Fashion & Beauty",
  "slug": "fashion-beauty",
  "description": "Trending fashion items and beauty products for men and women",
  "icon": "shirt-outline",
  "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
  "bannerImage": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80",
  "type": "going_out",
  "childCategories": [
    "690af030ae136d963e5c98af",
    "690af030ae136d963e5c98b2",
    "690af030ae136d963e5c98b5",
    "690af030ae136d963e5c98b8",
    "690af030ae136d963e5c98bb",
    "690af030ae136d963e5c98be"
  ],
  "isActive": true,
  "sortOrder": 1,
  "metadata": {
    "color": "#E91E63",
    "tags": [
      "fashion",
      "beauty",
      "clothing",
      "accessories"
    ],
    "description": "Latest fashion trends, clothing, and beauty products",
    "featured": true
  },
  "productCount": 1,
  "storeCount": 0,
  "__v": 1,
  "createdAt": "2025-10-13T10:59:43.338Z",
  "updatedAt": "2025-10-13T10:59:43.338Z"
}
```

---

### usercashbacks

**Document Count:** 28

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68e25c91d08e367fca9b7b51","68e25c91d08e367fca9b7... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,226,92,145,208,142,5... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [226,226,226]... |
| _id.buffer.2 | 100.0% | number | 0 | [92,92,92]... |
| _id.buffer.3 | 100.0% | number | 0 | [145,145,145]... |
| _id.buffer.4 | 100.0% | number | 0 | [208,208,208]... |
| _id.buffer.5 | 100.0% | number | 0 | [142,142,142]... |
| _id.buffer.6 | 100.0% | number | 0 | [54,54,54]... |
| _id.buffer.7 | 100.0% | number | 0 | [127,127,127]... |
| _id.buffer.8 | 100.0% | number | 0 | [202,202,202]... |
| _id.buffer.9 | 100.0% | number | 0 | [155,155,155]... |
| _id.buffer.10 | 100.0% | number | 0 | [123,123,123]... |
| _id.buffer.11 | 100.0% | number | 0 | [81,84,85]... |
| user | 100.0% | object | 0 | ["68c1447aa6d2db865ad82459","68c1447aa6d2db865ad82... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,68,122,166,210,2... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [68,68,68]... |
| user.buffer.3 | 100.0% | number | 0 | [122,122,122]... |
| user.buffer.4 | 100.0% | number | 0 | [166,166,166]... |
| user.buffer.5 | 100.0% | number | 0 | [210,210,210]... |
| user.buffer.6 | 100.0% | number | 0 | [219,219,219]... |
| user.buffer.7 | 100.0% | number | 0 | [134,134,134]... |
| user.buffer.8 | 100.0% | number | 0 | [90,90,90]... |
| user.buffer.9 | 100.0% | number | 0 | [216,216,216]... |
| user.buffer.10 | 100.0% | number | 0 | [36,36,36]... |
| user.buffer.11 | 100.0% | number | 0 | [89,89,90]... |
| amount | 100.0% | number | 0 | [100,75,106]... |
| cashbackRate | 100.0% | number | 0 | [0,0,5]... |
| source | 100.0% | string | 0 | ["signup","bonus","order"]... |
| status | 100.0% | string | 0 | ["credited","credited","credited"]... |
| earnedDate | 100.0% | object | 0 | ["2025-09-05T11:54:57.010Z","2025-09-30T11:54:57.0... |
| creditedDate | 70.0% | object | 0 | ["2025-09-05T11:54:57.010Z","2025-10-04T11:54:57.0... |
| expiryDate | 100.0% | object | 0 | ["2025-12-04T11:54:57.010Z","2025-12-29T11:54:57.0... |
| description | 100.0% | string | 0 | ["Welcome bonus - Thank you for joining REZ!","Loy... |
| metadata | 100.0% | object | 0 | [{"orderAmount":0,"productCategories":[],"campaign... |
| metadata.orderAmount | 100.0% | number | 0 | [0,0,2121.64]... |
| metadata.productCategories | 100.0% | array | 0 | [[],[],["Electronics"]]... |
| metadata.campaignName | 60.0% | string | 0 | ["Welcome Bonus","Loyalty Rewards","Loyalty Reward... |
| metadata.bonusMultiplier | 100.0% | number | 0 | [1,1.5,1]... |
| pendingDays | 100.0% | number | 0 | [0,4,7]... |
| isRedeemed | 100.0% | boolean | 0 | [true,false,true]... |
| redeemedAt | 40.0% | object | 0 | ["2025-09-07T11:54:57.010Z","2025-10-02T11:54:57.0... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-05T11:54:57.058Z","2025-10-05T11:54:57.0... |
| updatedAt | 100.0% | object | 0 | ["2025-10-05T11:54:57.058Z","2025-10-05T11:54:57.0... |
| order | 30.0% | object | 0 | ["68db3c84d464e157783eb4aa","68de65b78a170479a718f... |
| order.buffer | 30.0% | object | 0 | [{"type":"Buffer","data":[104,219,60,132,212,100,2... |
| order.buffer.0 | 30.0% | number | 0 | [104,104,104]... |
| order.buffer.1 | 30.0% | number | 0 | [219,222,222]... |
| order.buffer.2 | 30.0% | number | 0 | [60,101,101]... |
| order.buffer.3 | 30.0% | number | 0 | [132,183,183]... |
| order.buffer.4 | 30.0% | number | 0 | [212,138,138]... |
| order.buffer.5 | 30.0% | number | 0 | [100,23,23]... |
| order.buffer.6 | 30.0% | number | 0 | [225,4,4]... |
| order.buffer.7 | 30.0% | number | 0 | [87,121,121]... |
| order.buffer.8 | 30.0% | number | 0 | [120,167,167]... |
| order.buffer.9 | 30.0% | number | 0 | [62,24,24]... |
| order.buffer.10 | 30.0% | number | 0 | [180,254,254]... |
| order.buffer.11 | 30.0% | number | 0 | [170,93,87]... |
| metadata.storeName | 40.0% | string | 0 | ["Sample Store","Home Essentials","Sample Store"]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "order": 1
    },
    "name": "order_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "source": 1
    },
    "name": "source_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "earnedDate": 1
    },
    "name": "earnedDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiryDate": 1
    },
    "name": "expiryDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "expiryDate": 1
    },
    "name": "user_1_expiryDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "expiryDate": 1
    },
    "name": "status_1_expiryDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "earnedDate": -1
    },
    "name": "earnedDate_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68e25c91d08e367fca9b7b51",
  "user": "68c1447aa6d2db865ad82459",
  "amount": 100,
  "cashbackRate": 0,
  "source": "signup",
  "status": "credited",
  "earnedDate": "2025-09-05T11:54:57.010Z",
  "creditedDate": "2025-09-05T11:54:57.010Z",
  "expiryDate": "2025-12-04T11:54:57.010Z",
  "description": "Welcome bonus - Thank you for joining REZ!",
  "metadata": {
    "orderAmount": 0,
    "productCategories": [],
    "campaignName": "Welcome Bonus",
    "bonusMultiplier": 1
  },
  "pendingDays": 0,
  "isRedeemed": true,
  "redeemedAt": "2025-09-07T11:54:57.010Z",
  "__v": 0,
  "createdAt": "2025-10-05T11:54:57.058Z",
  "updatedAt": "2025-10-05T11:54:57.058Z"
}
```

---

### menus

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "storeId": 1
    },
    "name": "storeId_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1,
      "isActive": 1
    },
    "name": "storeId_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "categories.items.category": 1
    },
    "name": "categories.items.category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "categories.items.name_text",
    "background": true,
    "weights": {
      "categories.items.name": 1
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  }
]
```

---

### processed_webhook_events

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "eventId": 1
    },
    "name": "eventId_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "eventType": 1
    },
    "name": "eventType_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "subscriptionId": 1
    },
    "name": "subscriptionId_1",
    "background": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "processedAt": 1
    },
    "name": "processedAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true,
    "expireAfterSeconds": 0
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "errorMessage": 1
    },
    "name": "errorMessage_1",
    "background": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "lastRetryAt": 1
    },
    "name": "lastRetryAt_1",
    "background": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "ipAddress": 1
    },
    "name": "ipAddress_1",
    "background": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "userAgent": 1
    },
    "name": "userAgent_1",
    "background": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "eventType": 1,
      "processedAt": -1
    },
    "name": "eventType_1_processedAt_-1",
    "background": true
  }
]
```

---

### userstreaks

**Document Count:** 4

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68fb4efcf05f4b83cd6a54cc","68fb4efcf05f4b83cd6a5... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,78,252,240,95,75... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [251,251,251]... |
| _id.buffer.2 | 100.0% | number | 0 | [78,78,78]... |
| _id.buffer.3 | 100.0% | number | 0 | [252,252,252]... |
| _id.buffer.4 | 100.0% | number | 0 | [240,240,240]... |
| _id.buffer.5 | 100.0% | number | 0 | [95,95,95]... |
| _id.buffer.6 | 100.0% | number | 0 | [75,75,75]... |
| _id.buffer.7 | 100.0% | number | 0 | [131,131,131]... |
| _id.buffer.8 | 100.0% | number | 0 | [205,205,205]... |
| _id.buffer.9 | 100.0% | number | 0 | [106,106,106]... |
| _id.buffer.10 | 100.0% | number | 0 | [84,84,84]... |
| _id.buffer.11 | 100.0% | number | 0 | [204,209,217]... |
| user | 100.0% | object | 0 | ["68ef4d41061faaf045222506","68ef4d41061faaf045222... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,239,77,65,6,31,170,2... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [239,239,239]... |
| user.buffer.2 | 100.0% | number | 0 | [77,77,77]... |
| user.buffer.3 | 100.0% | number | 0 | [65,65,65]... |
| user.buffer.4 | 100.0% | number | 0 | [6,6,6]... |
| user.buffer.5 | 100.0% | number | 0 | [31,31,31]... |
| user.buffer.6 | 100.0% | number | 0 | [170,170,170]... |
| user.buffer.7 | 100.0% | number | 0 | [240,240,240]... |
| user.buffer.8 | 100.0% | number | 0 | [69,69,69]... |
| user.buffer.9 | 100.0% | number | 0 | [34,34,34]... |
| user.buffer.10 | 100.0% | number | 0 | [37,37,37]... |
| user.buffer.11 | 100.0% | number | 0 | [6,6,6]... |
| type | 100.0% | string | 0 | ["review","login","order"]... |
| currentStreak | 100.0% | number | 0 | [0,2,0]... |
| longestStreak | 100.0% | number | 0 | [0,3,0]... |
| lastActivityDate | 100.0% | object | 0 | ["2025-10-24T10:03:40.436Z","2025-11-14T05:58:42.9... |
| streakStartDate | 100.0% | object | 0 | ["2025-10-24T10:03:40.436Z","2025-11-13T00:00:00.0... |
| totalDays | 100.0% | number | 0 | [0,7,0]... |
| milestones | 100.0% | array | 0 | [[{"day":3,"rewardsClaimed":false,"_id":"68fb4efcf... |
| frozen | 100.0% | boolean | 0 | [false,false,false]... |
| createdAt | 100.0% | object | 0 | ["2025-10-24T10:03:40.443Z","2025-10-24T10:03:40.4... |
| updatedAt | 100.0% | object | 0 | ["2025-10-24T10:03:40.443Z","2025-11-14T05:58:42.9... |
| __v | 100.0% | number | 0 | [0,0,0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "type": 1
    },
    "name": "type_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "lastActivityDate": 1
    },
    "name": "lastActivityDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "type": 1
    },
    "name": "user_1_type_1",
    "background": true,
    "unique": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68fb4efcf05f4b83cd6a54cc",
  "user": "68ef4d41061faaf045222506",
  "type": "review",
  "currentStreak": 0,
  "longestStreak": 0,
  "lastActivityDate": "2025-10-24T10:03:40.436Z",
  "streakStartDate": "2025-10-24T10:03:40.436Z",
  "totalDays": 0,
  "milestones": [
    {
      "day": 3,
      "rewardsClaimed": false,
      "_id": "68fb4efcf05f4b83cd6a54cd"
    },
    {
      "day": 7,
      "rewardsClaimed": false,
      "_id": "68fb4efcf05f4b83cd6a54ce"
    },
    {
      "day": 14,
      "rewardsClaimed": false,
      "_id": "68fb4efcf05f4b83cd6a54cf"
    }
  ],
  "frozen": false,
  "createdAt": "2025-10-24T10:03:40.443Z",
  "updatedAt": "2025-10-24T10:03:40.443Z",
  "__v": 0
}
```

---

### servicerequests

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "requestNumber": 1
    },
    "name": "requestNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "scheduledDate": 1
    },
    "name": "scheduledDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "scheduledDate": 1
    },
    "name": "status_1_scheduledDate_1",
    "background": true
  }
]
```

---

### faqs

**Document Count:** 32

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["690226e2a433c0e05b8cd712","690226e2a433c0e05b8cd... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,2,38,226,164,51,192,... |
| _id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| _id.buffer.1 | 100.0% | number | 0 | [2,2,2]... |
| _id.buffer.2 | 100.0% | number | 0 | [38,38,38]... |
| _id.buffer.3 | 100.0% | number | 0 | [226,226,226]... |
| _id.buffer.4 | 100.0% | number | 0 | [164,164,164]... |
| _id.buffer.5 | 100.0% | number | 0 | [51,51,51]... |
| _id.buffer.6 | 100.0% | number | 0 | [192,192,192]... |
| _id.buffer.7 | 100.0% | number | 0 | [224,224,224]... |
| _id.buffer.8 | 100.0% | number | 0 | [91,91,91]... |
| _id.buffer.9 | 100.0% | number | 0 | [140,140,140]... |
| _id.buffer.10 | 100.0% | number | 0 | [215,215,215]... |
| _id.buffer.11 | 100.0% | number | 0 | [18,19,26]... |
| id | 100.0% | string | 0 | ["faq-general-2","faq-general-3","faq-levels-2"]... |
| category | 100.0% | string | 0 | ["general","general","levels"]... |
| question | 100.0% | string | 0 | ["Who can join the REZ Partner Program?","Can I sh... |
| answer | 100.0% | string | 0 | ["All REZ users are automatically enrolled in the ... |
| order | 100.0% | number | 0 | [2,3,10]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| analytics | 100.0% | object | 0 | [{"views":0,"helpfulVotes":0,"notHelpfulVotes":0},... |
| analytics.views | 100.0% | number | 0 | [0,0,0]... |
| analytics.helpfulVotes | 100.0% | number | 0 | [0,0,0]... |
| analytics.notHelpfulVotes | 100.0% | number | 0 | [0,0,0]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-29T14:38:26.994Z","2025-10-29T14:38:26.9... |
| updatedAt | 100.0% | object | 0 | ["2025-10-29T14:38:26.994Z","2025-10-29T14:38:26.9... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "id": 1
    },
    "name": "id_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "order": 1
    },
    "name": "order_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "isActive": 1,
      "order": 1
    },
    "name": "category_1_isActive_1_order_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "subcategory": 1
    },
    "name": "subcategory_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "question_text",
    "background": true,
    "weights": {
      "question": 1
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "tags": 1
    },
    "name": "tags_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1,
      "viewCount": -1
    },
    "name": "isActive_1_viewCount_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1,
      "isActive": 1
    },
    "name": "tags_1_isActive_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "690226e2a433c0e05b8cd712",
  "id": "faq-general-2",
  "category": "general",
  "question": "Who can join the REZ Partner Program?",
  "answer": "All REZ users are automatically enrolled in the Partner Program! There's no signup fee or special requirements. Simply create an account and start shopping to begin earning rewards and unlocking benefits.",
  "order": 2,
  "isActive": true,
  "analytics": {
    "views": 0,
    "helpfulVotes": 0,
    "notHelpfulVotes": 0
  },
  "__v": 0,
  "createdAt": "2025-10-29T14:38:26.994Z",
  "updatedAt": "2025-10-29T14:38:26.994Z"
}
```

---

### flashsales

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "title": 1
    },
    "name": "title_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "startTime": 1
    },
    "name": "startTime_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "endTime": 1
    },
    "name": "endTime_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "enabled": 1
    },
    "name": "enabled_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "startTime": 1,
      "endTime": 1
    },
    "name": "startTime_1_endTime_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "isActive": 1
    },
    "name": "status_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "priority": -1
    },
    "name": "priority_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "products": 1
    },
    "name": "products_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  }
]
```

---

### messages

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "conversationId": 1
    },
    "name": "conversationId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "sentAt": 1
    },
    "name": "sentAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "conversationId": 1,
      "sentAt": -1
    },
    "name": "conversationId_1_sentAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "conversationId": 1,
      "status": 1
    },
    "name": "conversationId_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "senderId": 1,
      "senderType": 1,
      "sentAt": -1
    },
    "name": "senderId_1_senderType_1_sentAt_-1",
    "background": true
  }
]
```

---

### transactions

**Document Count:** 205

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68db48da5c21fe2f565e15b7","68db48e55c21fe2f565e1... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,219,72,218,92,33,254... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [219,219,222]... |
| _id.buffer.2 | 100.0% | number | 0 | [72,72,75]... |
| _id.buffer.3 | 100.0% | number | 0 | [218,229,220]... |
| _id.buffer.4 | 100.0% | number | 0 | [92,92,136]... |
| _id.buffer.5 | 100.0% | number | 0 | [33,33,194]... |
| _id.buffer.6 | 100.0% | number | 0 | [254,254,216]... |
| _id.buffer.7 | 100.0% | number | 0 | [47,47,70]... |
| _id.buffer.8 | 100.0% | number | 0 | [86,86,121]... |
| _id.buffer.9 | 100.0% | number | 0 | [94,94,168]... |
| _id.buffer.10 | 100.0% | number | 0 | [21,21,216]... |
| _id.buffer.11 | 100.0% | number | 0 | [183,234,170]... |
| user | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c","68c145d5f016515d8eb31... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [69,69,68]... |
| user.buffer.3 | 100.0% | number | 0 | [213,213,122]... |
| user.buffer.4 | 100.0% | number | 0 | [240,240,166]... |
| user.buffer.5 | 100.0% | number | 0 | [22,22,210]... |
| user.buffer.6 | 100.0% | number | 0 | [81,81,219]... |
| user.buffer.7 | 100.0% | number | 0 | [93,93,134]... |
| user.buffer.8 | 100.0% | number | 0 | [142,142,90]... |
| user.buffer.9 | 100.0% | number | 0 | [179,179,216]... |
| user.buffer.10 | 100.0% | number | 0 | [28,28,36]... |
| user.buffer.11 | 100.0% | number | 0 | [12,12,90]... |
| type | 100.0% | string | 0 | ["credit","debit","credit"]... |
| category | 100.0% | string | 0 | ["topup","spending","bonus"]... |
| amount | 100.0% | number | 0 | [5000,1500,775]... |
| currency | 100.0% | string | 0 | ["RC","RC","RC"]... |
| description | 100.0% | string | 0 | ["Wallet topup - UPI","Test purchase","Welcome bon... |
| source | 100.0% | object | 0 | [{"type":"topup","reference":"68db478631cb4ce47720... |
| source.type | 100.0% | string | 0 | ["topup","order","bonus"]... |
| source.reference | 100.0% | object | 0 | ["68db478631cb4ce477209cdb","68db478631cb4ce477209... |
| source.reference.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,219,71,134,49,203,76... |
| source.reference.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| source.reference.buffer.1 | 100.0% | number | 0 | [219,219,193]... |
| source.reference.buffer.2 | 100.0% | number | 0 | [71,71,68]... |
| source.reference.buffer.3 | 100.0% | number | 0 | [134,134,122]... |
| source.reference.buffer.4 | 100.0% | number | 0 | [49,49,166]... |
| source.reference.buffer.5 | 100.0% | number | 0 | [203,203,210]... |
| source.reference.buffer.6 | 100.0% | number | 0 | [76,76,219]... |
| source.reference.buffer.7 | 100.0% | number | 0 | [228,228,134]... |
| source.reference.buffer.8 | 100.0% | number | 0 | [119,119,90]... |
| source.reference.buffer.9 | 100.0% | number | 0 | [32,32,216]... |
| source.reference.buffer.10 | 100.0% | number | 0 | [156,156,36]... |
| source.reference.buffer.11 | 100.0% | number | 0 | [219,219,90]... |
| source.description | 100.0% | string | 0 | ["Wallet topup via UPI","Purchase from Test Store"... |
| status | 100.0% | object | 0 | [{"current":"completed","history":[{"status":"comp... |
| status.current | 100.0% | string | 0 | ["completed","completed","completed"]... |
| status.history | 100.0% | array | 0 | [[{"status":"completed","timestamp":"2025-09-30T03... |
| balanceBefore | 100.0% | number | 0 | [0,5000,0]... |
| balanceAfter | 100.0% | number | 0 | [5000,3500,775]... |
| fees | 100.0% | number | 0 | [0,0,0]... |
| tax | 100.0% | number | 0 | [0,0,0]... |
| isReversible | 100.0% | boolean | 0 | [true,true,false]... |
| retryCount | 20.0% | number | 0 | [0,0]... |
| maxRetries | 20.0% | number | 0 | [3,3]... |
| createdAt | 100.0% | object | 0 | ["2025-09-30T03:04:58.081Z","2025-09-30T03:05:09.4... |
| updatedAt | 100.0% | object | 0 | ["2025-09-30T03:04:58.081Z","2025-09-30T03:05:09.4... |
| transactionId | 100.0% | string | 0 | ["CR17592014981170001","DR17592015094580002","CR17... |
| netAmount | 20.0% | number | 0 | [5000,1500]... |
| processedAt | 20.0% | object | 0 | ["2025-09-30T03:04:58.118Z","2025-09-30T03:05:09.4... |
| processingTime | 20.0% | number | 0 | [0,0]... |
| __v | 20.0% | number | 0 | [0,0]... |
| source.metadata | 90.0% | object | 0 | [{"orderNumber":"ORD_1759201509414","storeInfo":{"... |
| source.metadata.orderNumber | 10.0% | string | 0 | ["ORD_1759201509414"]... |
| source.metadata.storeInfo | 10.0% | object | 0 | [{"name":"Test Store"}]... |
| source.metadata.storeInfo.name | 10.0% | string | 0 | ["Test Store"]... |
| source.metadata.source | 80.0% | string | 0 | ["seed_script","seed_script","seed_script"]... |
| source.metadata.timestamp | 80.0% | object | 0 | ["2025-10-02T09:54:36.510Z","2025-10-02T09:54:36.5... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "transactionId": 1
    },
    "name": "transactionId_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "type": 1
    },
    "name": "type_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status.current": 1
    },
    "name": "status.current_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true,
    "expireAfterSeconds": 0
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "type": 1,
      "createdAt": -1
    },
    "name": "user_1_type_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "category": 1,
      "createdAt": -1
    },
    "name": "user_1_category_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status.current": 1,
      "createdAt": -1
    },
    "name": "status.current_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "source.type": 1,
      "source.reference": 1
    },
    "name": "source.type_1_source.reference_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "scheduledAt": 1
    },
    "name": "scheduledAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "processedAt": -1
    },
    "name": "processedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status.current": 1,
      "createdAt": -1
    },
    "name": "user_1_status.current_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "type": 1,
      "category": 1,
      "createdAt": -1
    },
    "name": "type_1_category_1_createdAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68db48da5c21fe2f565e15b7",
  "user": "68c145d5f016515d8eb31c0c",
  "type": "credit",
  "category": "topup",
  "amount": 5000,
  "currency": "RC",
  "description": "Wallet topup - UPI",
  "source": {
    "type": "topup",
    "reference": "68db478631cb4ce477209cdb",
    "description": "Wallet topup via UPI"
  },
  "status": {
    "current": "completed",
    "history": [
      {
        "status": "completed",
        "timestamp": "2025-09-30T03:04:58.043Z",
        "_id": "68db48da5c21fe2f565e15b8"
      }
    ]
  },
  "balanceBefore": 0,
  "balanceAfter": 5000,
  "fees": 0,
  "tax": 0,
  "isReversible": true,
  "retryCount": 0,
  "maxRetries": 3,
  "createdAt": "2025-09-30T03:04:58.081Z",
  "updatedAt": "2025-09-30T03:04:58.081Z",
  "transactionId": "CR17592014981170001",
  "netAmount": 5000,
  "processedAt": "2025-09-30T03:04:58.118Z",
  "processingTime": 0,
  "__v": 0
}
```

---

### discounts

**Document Count:** 5

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68eb3d5d5073c15832c0efd2","68eb3d5d5073c15832c0e... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,235,61,93,80,115,193... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [235,235,235]... |
| _id.buffer.2 | 100.0% | number | 0 | [61,61,61]... |
| _id.buffer.3 | 100.0% | number | 0 | [93,93,93]... |
| _id.buffer.4 | 100.0% | number | 0 | [80,80,80]... |
| _id.buffer.5 | 100.0% | number | 0 | [115,115,115]... |
| _id.buffer.6 | 100.0% | number | 0 | [193,193,193]... |
| _id.buffer.7 | 100.0% | number | 0 | [88,88,88]... |
| _id.buffer.8 | 100.0% | number | 0 | [50,50,50]... |
| _id.buffer.9 | 100.0% | number | 0 | [192,192,192]... |
| _id.buffer.10 | 100.0% | number | 0 | [239,239,239]... |
| _id.buffer.11 | 100.0% | number | 0 | [210,209,212]... |
| code | 100.0% | string | 0 | ["CARD15","SAVE20","MEGA25"]... |
| name | 100.0% | string | 0 | ["Card Payment Offer","Get Instant Discount","Mega... |
| description | 100.0% | string | 0 | ["Get 15% off on card payments","Get 20% off on bi... |
| type | 100.0% | string | 0 | ["percentage","percentage","percentage"]... |
| value | 100.0% | number | 0 | [15,20,25]... |
| minOrderValue | 100.0% | number | 0 | [3000,5000,10000]... |
| maxDiscountAmount | 100.0% | number | 0 | [500,1000,2500]... |
| applicableOn | 100.0% | string | 0 | ["bill_payment","bill_payment","bill_payment"]... |
| applicableProducts | 100.0% | array | 0 | [[],[],[]]... |
| applicableCategories | 100.0% | array | 0 | [[],[],[]]... |
| validFrom | 100.0% | object | 0 | ["2025-01-01T00:00:00.000Z","2025-01-01T00:00:00.0... |
| validUntil | 100.0% | object | 0 | ["2025-12-31T00:00:00.000Z","2025-12-31T00:00:00.0... |
| usageLimit | 100.0% | number | 0 | [5000,1000,500]... |
| usageLimitPerUser | 100.0% | number | 0 | [10,5,3]... |
| usedCount | 100.0% | number | 0 | [0,0,0]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| priority | 100.0% | number | 0 | [2,1,3]... |
| restrictions | 100.0% | object | 0 | [{"isOfflineOnly":false,"notValidAboveStoreDiscoun... |
| restrictions.isOfflineOnly | 100.0% | boolean | 0 | [false,true,true]... |
| restrictions.notValidAboveStoreDiscount | 100.0% | boolean | 0 | [false,true,true]... |
| restrictions.singleVoucherPerBill | 100.0% | boolean | 0 | [true,true,true]... |
| restrictions.newUsersOnly | 100.0% | boolean | 0 | [false,false,false]... |
| restrictions.excludedProducts | 100.0% | array | 0 | [[],[],[]]... |
| restrictions.excludedCategories | 100.0% | array | 0 | [[],[],[]]... |
| metadata | 100.0% | object | 0 | [{"displayText":"Card Payment Offer"},{"displayTex... |
| metadata.displayText | 100.0% | string | 0 | ["Card Payment Offer","Get Instant Discount","Mega... |
| createdBy | 100.0% | object | 0 | ["68eb3d5c5073c15832c0efc0","68eb3d5c5073c15832c0e... |
| createdBy.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,235,61,92,80,115,193... |
| createdBy.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| createdBy.buffer.1 | 100.0% | number | 0 | [235,235,235]... |
| createdBy.buffer.2 | 100.0% | number | 0 | [61,61,61]... |
| createdBy.buffer.3 | 100.0% | number | 0 | [92,92,92]... |
| createdBy.buffer.4 | 100.0% | number | 0 | [80,80,80]... |
| createdBy.buffer.5 | 100.0% | number | 0 | [115,115,115]... |
| createdBy.buffer.6 | 100.0% | number | 0 | [193,193,193]... |
| createdBy.buffer.7 | 100.0% | number | 0 | [88,88,88]... |
| createdBy.buffer.8 | 100.0% | number | 0 | [50,50,50]... |
| createdBy.buffer.9 | 100.0% | number | 0 | [192,192,192]... |
| createdBy.buffer.10 | 100.0% | number | 0 | [239,239,239]... |
| createdBy.buffer.11 | 100.0% | number | 0 | [192,192,192]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-12T05:32:13.080Z","2025-10-12T05:32:13.0... |
| updatedAt | 100.0% | object | 0 | ["2025-10-12T05:32:13.080Z","2025-10-12T05:32:13.0... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "code": 1
    },
    "name": "code_1",
    "background": true,
    "unique": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "name": 1
    },
    "name": "name_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validFrom": 1
    },
    "name": "validFrom_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validUntil": 1
    },
    "name": "validUntil_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "priority": 1
    },
    "name": "priority_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1,
      "validFrom": 1,
      "validUntil": 1
    },
    "name": "isActive_1_validFrom_1_validUntil_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "applicableOn": 1,
      "isActive": 1
    },
    "name": "applicableOn_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdBy": 1
    },
    "name": "createdBy_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68eb3d5d5073c15832c0efd2",
  "code": "CARD15",
  "name": "Card Payment Offer",
  "description": "Get 15% off on card payments",
  "type": "percentage",
  "value": 15,
  "minOrderValue": 3000,
  "maxDiscountAmount": 500,
  "applicableOn": "bill_payment",
  "applicableProducts": [],
  "applicableCategories": [],
  "validFrom": "2025-01-01T00:00:00.000Z",
  "validUntil": "2025-12-31T00:00:00.000Z",
  "usageLimit": 5000,
  "usageLimitPerUser": 10,
  "usedCount": 0,
  "isActive": true,
  "priority": 2,
  "restrictions": {
    "isOfflineOnly": false,
    "notValidAboveStoreDiscount": false,
    "singleVoucherPerBill": true,
    "newUsersOnly": false,
    "excludedProducts": [],
    "excludedCategories": []
  },
  "metadata": {
    "displayText": "Card Payment Offer"
  },
  "createdBy": "68eb3d5c5073c15832c0efc0",
  "__v": 0,
  "createdAt": "2025-10-12T05:32:13.080Z",
  "updatedAt": "2025-10-12T05:32:13.080Z"
}
```

---

### mproducts

**Document Count:** 1

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68abe342dd7d6ed7f70c41d1"]... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,171,227,66,221,125,1... |
| _id.buffer.0 | 100.0% | number | 0 | [104]... |
| _id.buffer.1 | 100.0% | number | 0 | [171]... |
| _id.buffer.2 | 100.0% | number | 0 | [227]... |
| _id.buffer.3 | 100.0% | number | 0 | [66]... |
| _id.buffer.4 | 100.0% | number | 0 | [221]... |
| _id.buffer.5 | 100.0% | number | 0 | [125]... |
| _id.buffer.6 | 100.0% | number | 0 | [110]... |
| _id.buffer.7 | 100.0% | number | 0 | [215]... |
| _id.buffer.8 | 100.0% | number | 0 | [247]... |
| _id.buffer.9 | 100.0% | number | 0 | [12]... |
| _id.buffer.10 | 100.0% | number | 0 | [65]... |
| _id.buffer.11 | 100.0% | number | 0 | [209]... |
| merchantId | 100.0% | object | 0 | ["68aaa623d4ae0ab11dc2436f"]... |
| merchantId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,170,166,35,212,174,1... |
| merchantId.buffer.0 | 100.0% | number | 0 | [104]... |
| merchantId.buffer.1 | 100.0% | number | 0 | [170]... |
| merchantId.buffer.2 | 100.0% | number | 0 | [166]... |
| merchantId.buffer.3 | 100.0% | number | 0 | [35]... |
| merchantId.buffer.4 | 100.0% | number | 0 | [212]... |
| merchantId.buffer.5 | 100.0% | number | 0 | [174]... |
| merchantId.buffer.6 | 100.0% | number | 0 | [10]... |
| merchantId.buffer.7 | 100.0% | number | 0 | [177]... |
| merchantId.buffer.8 | 100.0% | number | 0 | [29]... |
| merchantId.buffer.9 | 100.0% | number | 0 | [194]... |
| merchantId.buffer.10 | 100.0% | number | 0 | [67]... |
| merchantId.buffer.11 | 100.0% | number | 0 | [111]... |
| name | 100.0% | string | 0 | ["jdjdjd"]... |
| description | 100.0% | string | 0 | ["Nsjnshhsnsnsnns"]... |
| sku | 100.0% | string | 0 | ["JDJ298297"]... |
| category | 100.0% | string | 0 | ["Electronics"]... |
| price | 100.0% | number | 0 | [1000]... |
| currency | 100.0% | string | 0 | ["INR"]... |
| inventory | 100.0% | object | 0 | [{"stock":100,"lowStockThreshold":5,"trackInventor... |
| inventory.stock | 100.0% | number | 0 | [100]... |
| inventory.lowStockThreshold | 100.0% | number | 0 | [5]... |
| inventory.trackInventory | 100.0% | boolean | 0 | [true]... |
| inventory.allowBackorders | 100.0% | boolean | 0 | [false]... |
| inventory.reservedStock | 100.0% | number | 0 | [0]... |
| images | 100.0% | array | 0 | [[{"url":"http://172.20.10.4:5001/uploads/68aaa623... |
| dimensions | 100.0% | object | 0 | [{"unit":"cm"}]... |
| dimensions.unit | 100.0% | string | 0 | ["cm"]... |
| tags | 100.0% | array | 0 | [[]]... |
| searchKeywords | 100.0% | array | 0 | [[]]... |
| status | 100.0% | string | 0 | ["active"]... |
| visibility | 100.0% | string | 0 | ["public"]... |
| cashback | 100.0% | object | 0 | [{"percentage":5,"isActive":true,"conditions":[]}]... |
| cashback.percentage | 100.0% | number | 0 | [5]... |
| cashback.isActive | 100.0% | boolean | 0 | [true]... |
| cashback.conditions | 100.0% | array | 0 | [[]]... |
| seo | 100.0% | object | 0 | [{"keywords":[]}]... |
| seo.keywords | 100.0% | array | 0 | [[]]... |
| isFeatured | 100.0% | boolean | 0 | [false]... |
| sortOrder | 100.0% | number | 0 | [0]... |
| videos | 100.0% | array | 0 | [[]]... |
| variants | 100.0% | array | 0 | [[]]... |
| createdAt | 100.0% | object | 0 | ["2025-08-25T04:14:58.391Z"]... |
| updatedAt | 100.0% | object | 0 | ["2025-08-25T04:14:58.391Z"]... |
| __v | 100.0% | number | 0 | [0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "sku": 1
    },
    "name": "sku_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "merchantId": 1
    },
    "name": "merchantId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "name_text_description_text_tags_text",
    "background": true,
    "weights": {
      "description": 1,
      "name": 1,
      "tags": 1
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "inventory.stock": 1
    },
    "name": "inventory.stock_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "price": 1
    },
    "name": "price_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68abe342dd7d6ed7f70c41d1",
  "merchantId": "68aaa623d4ae0ab11dc2436f",
  "name": "jdjdjd",
  "description": "Nsjnshhsnsnsnns",
  "sku": "JDJ298297",
  "category": "Electronics",
  "price": 1000,
  "currency": "INR",
  "inventory": {
    "stock": 100,
    "lowStockThreshold": 5,
    "trackInventory": true,
    "allowBackorders": false,
    "reservedStock": 0
  },
  "images": [
    {
      "url": "http://172.20.10.4:5001/uploads/68aaa623d4ae0ab11dc2436f/image-1756095285744-247324491.jpg",
      "sortOrder": 0,
      "isMain": true,
      "_id": "68abe342dd7d6ed7f70c41d2"
    }
  ],
  "dimensions": {
    "unit": "cm"
  },
  "tags": [],
  "searchKeywords": [],
  "status": "active",
  "visibility": "public",
  "cashback": {
    "percentage": 5,
    "isActive": true,
    "conditions": []
  },
  "seo": {
    "keywords": []
  },
  "isFeatured": false,
  "sortOrder": 0,
  "videos": [],
  "variants": [],
  "createdAt": "2025-08-25T04:14:58.391Z",
  "updatedAt": "2025-08-25T04:14:58.391Z",
  "__v": 0
}
```

---

### coupons

**Document Count:** 16

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68e24bfad858440d163126b8","68e24bfad858440d16312... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,226,75,250,216,88,68... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [226,226,226]... |
| _id.buffer.2 | 100.0% | number | 0 | [75,75,75]... |
| _id.buffer.3 | 100.0% | number | 0 | [250,250,251]... |
| _id.buffer.4 | 100.0% | number | 0 | [216,216,216]... |
| _id.buffer.5 | 100.0% | number | 0 | [88,88,88]... |
| _id.buffer.6 | 100.0% | number | 0 | [68,68,68]... |
| _id.buffer.7 | 100.0% | number | 0 | [13,13,13]... |
| _id.buffer.8 | 100.0% | number | 0 | [22,22,22]... |
| _id.buffer.9 | 100.0% | number | 0 | [49,49,49]... |
| _id.buffer.10 | 100.0% | number | 0 | [38,38,38]... |
| _id.buffer.11 | 100.0% | number | 0 | [184,190,196]... |
| couponCode | 100.0% | string | 0 | ["WELCOME10","FEST2025","TECH20"]... |
| title | 100.0% | string | 0 | ["Welcome Offer - Get 10% Off","Festive Sale - Fla... |
| description | 100.0% | string | 0 | ["Welcome to REZ! Get 10% off on your first purcha... |
| discountType | 100.0% | string | 0 | ["PERCENTAGE","FIXED","PERCENTAGE"]... |
| discountValue | 100.0% | number | 0 | [10,500,20]... |
| minOrderValue | 100.0% | number | 0 | [500,2000,1000]... |
| maxDiscountCap | 100.0% | number | 0 | [500,0,2000]... |
| validFrom | 100.0% | object | 0 | ["2025-10-05T10:44:10.867Z","2025-10-05T10:44:10.9... |
| validTo | 100.0% | object | 0 | ["2026-01-03T10:44:10.867Z","2025-11-04T10:44:10.9... |
| usageLimit | 100.0% | object | 0 | [{"totalUsage":0,"perUser":1,"usedCount":0},{"tota... |
| usageLimit.totalUsage | 100.0% | number | 0 | [0,1000,500]... |
| usageLimit.perUser | 100.0% | number | 0 | [1,2,1]... |
| usageLimit.usedCount | 100.0% | number | 0 | [0,0,1]... |
| applicableTo | 100.0% | object | 0 | [{"categories":[],"products":[],"stores":[],"userT... |
| applicableTo.categories | 100.0% | array | 0 | [[],[],["68e24b6d4381285a768357d0"]]... |
| applicableTo.products | 100.0% | array | 0 | [[],[],[]]... |
| applicableTo.stores | 100.0% | array | 0 | [[],[],[]]... |
| applicableTo.userTiers | 100.0% | array | 0 | [["all"],["all"],["all"]]... |
| autoApply | 100.0% | boolean | 0 | [true,false,true]... |
| autoApplyPriority | 100.0% | number | 0 | [10,8,7]... |
| status | 100.0% | string | 0 | ["active","active","active"]... |
| termsAndConditions | 100.0% | array | 0 | [["Valid for new users only","Minimum order value ... |
| createdBy | 100.0% | object | 0 | ["68c1447aa6d2db865ad82459","68c1447aa6d2db865ad82... |
| createdBy.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,68,122,166,210,2... |
| createdBy.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| createdBy.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| createdBy.buffer.2 | 100.0% | number | 0 | [68,68,68]... |
| createdBy.buffer.3 | 100.0% | number | 0 | [122,122,122]... |
| createdBy.buffer.4 | 100.0% | number | 0 | [166,166,166]... |
| createdBy.buffer.5 | 100.0% | number | 0 | [210,210,210]... |
| createdBy.buffer.6 | 100.0% | number | 0 | [219,219,219]... |
| createdBy.buffer.7 | 100.0% | number | 0 | [134,134,134]... |
| createdBy.buffer.8 | 100.0% | number | 0 | [90,90,90]... |
| createdBy.buffer.9 | 100.0% | number | 0 | [216,216,216]... |
| createdBy.buffer.10 | 100.0% | number | 0 | [36,36,36]... |
| createdBy.buffer.11 | 100.0% | number | 0 | [89,89,89]... |
| tags | 100.0% | array | 0 | [["welcome","new-user","first-order"],["festive","... |
| imageUrl | 70.0% | string | 0 | ["https://images.unsplash.com/photo-1607082348824-... |
| isNewlyAdded | 100.0% | boolean | 0 | [true,true,false]... |
| isFeatured | 100.0% | boolean | 0 | [true,true,true]... |
| viewCount | 100.0% | number | 0 | [0,0,0]... |
| claimCount | 100.0% | number | 0 | [2,1,2]... |
| usageCount | 100.0% | number | 0 | [0,0,1]... |
| createdAt | 100.0% | object | 0 | ["2025-10-05T10:44:10.880Z","2025-10-05T10:44:10.9... |
| updatedAt | 100.0% | object | 0 | ["2025-10-05T10:59:40.649Z","2025-10-05T10:44:11.6... |
| __v | 100.0% | number | 0 | [0,0,0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "couponCode": 1
    },
    "name": "couponCode_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "validTo": 1
    },
    "name": "validTo_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "validTo": 1
    },
    "name": "status_1_validTo_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "couponCode": 1,
      "status": 1
    },
    "name": "couponCode_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1,
      "status": 1
    },
    "name": "isFeatured_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1,
      "status": 1
    },
    "name": "tags_1_status_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68e24bfad858440d163126b8",
  "couponCode": "WELCOME10",
  "title": "Welcome Offer - Get 10% Off",
  "description": "Welcome to REZ! Get 10% off on your first purchase",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "minOrderValue": 500,
  "maxDiscountCap": 500,
  "validFrom": "2025-10-05T10:44:10.867Z",
  "validTo": "2026-01-03T10:44:10.867Z",
  "usageLimit": {
    "totalUsage": 0,
    "perUser": 1,
    "usedCount": 0
  },
  "applicableTo": {
    "categories": [],
    "products": [],
    "stores": [],
    "userTiers": [
      "all"
    ]
  },
  "autoApply": true,
  "autoApplyPriority": 10,
  "status": "active",
  "termsAndConditions": [
    "Valid for new users only",
    "Minimum order value ₹500",
    "Maximum discount ₹500",
    "Cannot be combined with other offers"
  ],
  "createdBy": "68c1447aa6d2db865ad82459",
  "tags": [
    "welcome",
    "new-user",
    "first-order"
  ],
  "imageUrl": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500",
  "isNewlyAdded": true,
  "isFeatured": true,
  "viewCount": 0,
  "claimCount": 2,
  "usageCount": 0,
  "createdAt": "2025-10-05T10:44:10.880Z",
  "updatedAt": "2025-10-05T10:59:40.649Z",
  "__v": 0
}
```

---

### outlets

**Document Count:** 3

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68eb3e0374f09c26ab5709a9","68eb3e0374f09c26ab570... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,235,62,3,116,240,156... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [235,235,235]... |
| _id.buffer.2 | 100.0% | number | 0 | [62,62,62]... |
| _id.buffer.3 | 100.0% | number | 0 | [3,3,3]... |
| _id.buffer.4 | 100.0% | number | 0 | [116,116,116]... |
| _id.buffer.5 | 100.0% | number | 0 | [240,240,240]... |
| _id.buffer.6 | 100.0% | number | 0 | [156,156,156]... |
| _id.buffer.7 | 100.0% | number | 0 | [38,38,38]... |
| _id.buffer.8 | 100.0% | number | 0 | [171,171,171]... |
| _id.buffer.9 | 100.0% | number | 0 | [87,87,87]... |
| _id.buffer.10 | 100.0% | number | 0 | [9,9,9]... |
| _id.buffer.11 | 100.0% | number | 0 | [169,177,185]... |
| store | 100.0% | object | 0 | ["68e24b6d4381285a768357db","68e24b6d4381285a76835... |
| store.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,226,75,109,67,129,40... |
| store.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| store.buffer.1 | 100.0% | number | 0 | [226,226,226]... |
| store.buffer.2 | 100.0% | number | 0 | [75,75,75]... |
| store.buffer.3 | 100.0% | number | 0 | [109,109,109]... |
| store.buffer.4 | 100.0% | number | 0 | [67,67,67]... |
| store.buffer.5 | 100.0% | number | 0 | [129,129,129]... |
| store.buffer.6 | 100.0% | number | 0 | [40,40,40]... |
| store.buffer.7 | 100.0% | number | 0 | [90,90,90]... |
| store.buffer.8 | 100.0% | number | 0 | [118,118,118]... |
| store.buffer.9 | 100.0% | number | 0 | [131,131,131]... |
| store.buffer.10 | 100.0% | number | 0 | [87,87,87]... |
| store.buffer.11 | 100.0% | number | 0 | [219,219,219]... |
| name | 100.0% | string | 0 | ["Main Branch","Downtown Branch","Westside Branch"... |
| address | 100.0% | string | 0 | ["123 Main Street, New York, NY 10001, USA","456 B... |
| location | 100.0% | object | 0 | [{"type":"Point","coordinates":[-73.935242,40.7306... |
| location.type | 100.0% | string | 0 | ["Point","Point","Point"]... |
| location.coordinates | 100.0% | array | 0 | [[-73.935242,40.73061],[-73.988235,40.722531],[-74... |
| phone | 100.0% | string | 0 | ["+1-212-555-0101","+1-212-555-0102","+1-212-555-0... |
| email | 100.0% | string | 0 | ["main@store.com","downtown@store.com","westside@s... |
| openingHours | 100.0% | array | 0 | [[{"day":"Monday","open":"09:00","close":"21:00","... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| offers | 100.0% | array | 0 | [[],[],[]]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-12T05:34:59.942Z","2025-10-12T05:34:59.9... |
| updatedAt | 100.0% | object | 0 | ["2025-10-12T05:34:59.942Z","2025-10-12T05:34:59.9... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "location": "2dsphere"
    },
    "name": "location_2dsphere",
    "background": true,
    "2dsphereIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "isActive": 1
    },
    "name": "store_1_isActive_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68eb3e0374f09c26ab5709a9",
  "store": "68e24b6d4381285a768357db",
  "name": "Main Branch",
  "address": "123 Main Street, New York, NY 10001, USA",
  "location": {
    "type": "Point",
    "coordinates": [
      -73.935242,
      40.73061
    ]
  },
  "phone": "+1-212-555-0101",
  "email": "main@store.com",
  "openingHours": [
    {
      "day": "Monday",
      "open": "09:00",
      "close": "21:00",
      "isClosed": false,
      "_id": "68eb3e0374f09c26ab5709aa"
    },
    {
      "day": "Tuesday",
      "open": "09:00",
      "close": "21:00",
      "isClosed": false,
      "_id": "68eb3e0374f09c26ab5709ab"
    },
    {
      "day": "Wednesday",
      "open": "09:00",
      "close": "21:00",
      "isClosed": false,
      "_id": "68eb3e0374f09c26ab5709ac"
    },
    {
      "day": "Thursday",
      "open": "09:00",
      "close": "21:00",
      "isClosed": false,
      "_id": "68eb3e0374f09c26ab5709ad"
    },
    {
      "day": "Friday",
      "open": "09:00",
      "close": "22:00",
      "isClosed": false,
      "_id": "68eb3e0374f09c26ab5709ae"
    },
    {
      "day": "Saturday",
      "open": "10:00",
      "close": "22:00",
      "isClosed": false,
      "_id": "68eb3e0374f09c26ab5709af"
    },
    {
      "day": "Sunday",
      "open": "10:00",
      "close": "20:00",
      "isClosed": false,
      "_id": "68eb3e0374f09c26ab5709b0"
    }
  ],
  "isActive": true,
  "offers": [],
  "__v": 0,
  "createdAt": "2025-10-12T05:34:59.942Z",
  "updatedAt": "2025-10-12T05:34:59.942Z"
}
```

---

### follows

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "follower": 1,
      "following": 1
    },
    "name": "follower_1_following_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "following": 1,
      "follower": 1
    },
    "name": "following_1_follower_1",
    "background": true
  }
]
```

---

### scratchcards

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "userId": 1
    },
    "name": "userId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true,
    "expireAfterSeconds": 0
  }
]
```

---

### offercategories

**Document Count:** 5

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68ee29d08c4fa11015d70340","68ee29d08c4fa11015d70... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [238,238,238]... |
| _id.buffer.2 | 100.0% | number | 0 | [41,41,41]... |
| _id.buffer.3 | 100.0% | number | 0 | [208,208,208]... |
| _id.buffer.4 | 100.0% | number | 0 | [140,140,140]... |
| _id.buffer.5 | 100.0% | number | 0 | [79,79,79]... |
| _id.buffer.6 | 100.0% | number | 0 | [161,161,161]... |
| _id.buffer.7 | 100.0% | number | 0 | [16,16,16]... |
| _id.buffer.8 | 100.0% | number | 0 | [21,21,21]... |
| _id.buffer.9 | 100.0% | number | 0 | [215,215,215]... |
| _id.buffer.10 | 100.0% | number | 0 | [3,3,3]... |
| _id.buffer.11 | 100.0% | number | 0 | [64,66,65]... |
| name | 100.0% | string | 0 | ["Electronics","Food & Dining","Fashion"]... |
| slug | 100.0% | string | 0 | ["electronics","food-dining","fashion"]... |
| description | 100.0% | string | 0 | ["Latest gadgets and electronics","Delicious food ... |
| icon | 100.0% | string | 0 | ["smartphone","utensils","shirt"]... |
| color | 100.0% | string | 0 | ["#3B82F6","#F59E0B","#EC4899"]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| priority | 100.0% | number | 0 | [1,3,2]... |
| offers | 100.0% | array | 0 | [[],[],[]]... |
| metadata | 100.0% | object | 0 | [{"displayOrder":0,"isFeatured":false,"subcategori... |
| metadata.displayOrder | 100.0% | number | 0 | [0,0,0]... |
| metadata.isFeatured | 100.0% | boolean | 0 | [false,false,false]... |
| metadata.subcategories | 100.0% | array | 0 | [[],[],[]]... |
| metadata.tags | 100.0% | array | 0 | [[],[],[]]... |
| createdBy | 100.0% | object | 0 | ["68ee29d08c4fa11015d70339","68ee29d08c4fa11015d70... |
| createdBy.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| createdBy.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| createdBy.buffer.1 | 100.0% | number | 0 | [238,238,238]... |
| createdBy.buffer.2 | 100.0% | number | 0 | [41,41,41]... |
| createdBy.buffer.3 | 100.0% | number | 0 | [208,208,208]... |
| createdBy.buffer.4 | 100.0% | number | 0 | [140,140,140]... |
| createdBy.buffer.5 | 100.0% | number | 0 | [79,79,79]... |
| createdBy.buffer.6 | 100.0% | number | 0 | [161,161,161]... |
| createdBy.buffer.7 | 100.0% | number | 0 | [16,16,16]... |
| createdBy.buffer.8 | 100.0% | number | 0 | [21,21,21]... |
| createdBy.buffer.9 | 100.0% | number | 0 | [215,215,215]... |
| createdBy.buffer.10 | 100.0% | number | 0 | [3,3,3]... |
| createdBy.buffer.11 | 100.0% | number | 0 | [57,57,57]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-14T10:45:36.699Z","2025-10-14T10:45:36.7... |
| updatedAt | 100.0% | object | 0 | ["2025-10-14T10:45:36.699Z","2025-10-14T10:45:36.7... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "name": 1
    },
    "name": "name_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "slug": 1
    },
    "name": "slug_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "priority": 1
    },
    "name": "priority_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.displayOrder": 1
    },
    "name": "metadata.displayOrder_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.isFeatured": 1
    },
    "name": "metadata.isFeatured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdBy": 1
    },
    "name": "createdBy_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "slug": 1,
      "isActive": 1
    },
    "name": "slug_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1,
      "priority": -1
    },
    "name": "isActive_1_priority_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.isFeatured": 1,
      "isActive": 1
    },
    "name": "metadata.isFeatured_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.parentCategory": 1,
      "isActive": 1
    },
    "name": "metadata.parentCategory_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.displayOrder": 1,
      "isActive": 1
    },
    "name": "metadata.displayOrder_1_isActive_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68ee29d08c4fa11015d70340",
  "name": "Electronics",
  "slug": "electronics",
  "description": "Latest gadgets and electronics",
  "icon": "smartphone",
  "color": "#3B82F6",
  "isActive": true,
  "priority": 1,
  "offers": [],
  "metadata": {
    "displayOrder": 0,
    "isFeatured": false,
    "subcategories": [],
    "tags": []
  },
  "createdBy": "68ee29d08c4fa11015d70339",
  "__v": 0,
  "createdAt": "2025-10-14T10:45:36.699Z",
  "updatedAt": "2025-10-14T10:45:36.699Z"
}
```

---

### bills

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "merchant": 1
    },
    "name": "merchant_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "billImage.imageHash": 1
    },
    "name": "billImage.imageHash_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "billNumber": 1
    },
    "name": "billNumber_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "verificationStatus": 1
    },
    "name": "verificationStatus_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "cashbackStatus": 1
    },
    "name": "cashbackStatus_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "merchant": 1,
      "createdAt": -1
    },
    "name": "merchant_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "verificationStatus": 1
    },
    "name": "user_1_verificationStatus_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "verificationStatus": 1,
      "createdAt": -1
    },
    "name": "verificationStatus_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "billDate": -1
    },
    "name": "billDate_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.fraudScore": 1
    },
    "name": "metadata.fraudScore_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "merchant": 1,
      "amount": 1,
      "billDate": 1
    },
    "name": "user_1_merchant_1_amount_1_billDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "billNumber": 1
    },
    "name": "user_1_billNumber_1",
    "background": true,
    "sparse": true
  }
]
```

---

### promocodes

**Document Count:** 9

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["6905b4090b96a63d3d9b4a79","6905b4090b96a63d3d9b4... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,5,180,9,11,150,166,6... |
| _id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| _id.buffer.1 | 100.0% | number | 0 | [5,5,5]... |
| _id.buffer.2 | 100.0% | number | 0 | [180,180,180]... |
| _id.buffer.3 | 100.0% | number | 0 | [9,9,9]... |
| _id.buffer.4 | 100.0% | number | 0 | [11,11,11]... |
| _id.buffer.5 | 100.0% | number | 0 | [150,150,150]... |
| _id.buffer.6 | 100.0% | number | 0 | [166,166,166]... |
| _id.buffer.7 | 100.0% | number | 0 | [61,61,61]... |
| _id.buffer.8 | 100.0% | number | 0 | [61,61,61]... |
| _id.buffer.9 | 100.0% | number | 0 | [155,155,155]... |
| _id.buffer.10 | 100.0% | number | 0 | [74,74,74]... |
| _id.buffer.11 | 100.0% | number | 0 | [121,124,126]... |
| code | 100.0% | string | 0 | ["WELCOME10","SAVE20","FLAT50"]... |
| description | 100.0% | string | 0 | ["Welcome offer - 10% off on any subscription","20... |
| discountType | 100.0% | string | 0 | ["percentage","percentage","fixed"]... |
| discountValue | 100.0% | number | 0 | [10,20,50]... |
| applicableTiers | 100.0% | array | 0 | [["premium","vip"],["premium","vip"],["premium"]]... |
| applicableBillingCycles | 100.0% | array | 0 | [["monthly","yearly"],["yearly"],["monthly"]]... |
| validFrom | 100.0% | object | 0 | ["2025-01-01T00:00:00.000Z","2025-01-01T00:00:00.0... |
| validUntil | 100.0% | object | 0 | ["2025-12-31T00:00:00.000Z","2025-12-31T00:00:00.0... |
| maxUses | 100.0% | number | 0 | [0,100,50]... |
| maxUsesPerUser | 100.0% | number | 0 | [1,1,1]... |
| usedCount | 100.0% | number | 0 | [0,0,0]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| metadata | 100.0% | object | 0 | [{"campaign":"Welcome Campaign 2025","source":"Mar... |
| metadata.campaign | 100.0% | string | 0 | ["Welcome Campaign 2025","Annual Subscription Push... |
| metadata.source | 100.0% | string | 0 | ["Marketing","Marketing","Marketing"]... |
| metadata.notes | 100.0% | string | 0 | ["General welcome offer for new subscribers","Enco... |
| usedBy | 100.0% | array | 0 | [[],[],[]]... |
| createdAt | 100.0% | object | 0 | ["2025-11-01T07:17:29.070Z","2025-11-01T07:17:29.1... |
| updatedAt | 100.0% | object | 0 | ["2025-11-01T07:17:29.070Z","2025-11-01T07:17:29.1... |
| __v | 100.0% | number | 0 | [0,0,0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "code": 1
    },
    "name": "code_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "code": 1,
      "isActive": 1
    },
    "name": "code_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validFrom": 1,
      "validUntil": 1
    },
    "name": "validFrom_1_validUntil_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.campaign": 1
    },
    "name": "metadata.campaign_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "6905b4090b96a63d3d9b4a79",
  "code": "WELCOME10",
  "description": "Welcome offer - 10% off on any subscription",
  "discountType": "percentage",
  "discountValue": 10,
  "applicableTiers": [
    "premium",
    "vip"
  ],
  "applicableBillingCycles": [
    "monthly",
    "yearly"
  ],
  "validFrom": "2025-01-01T00:00:00.000Z",
  "validUntil": "2025-12-31T00:00:00.000Z",
  "maxUses": 0,
  "maxUsesPerUser": 1,
  "usedCount": 0,
  "isActive": true,
  "metadata": {
    "campaign": "Welcome Campaign 2025",
    "source": "Marketing",
    "notes": "General welcome offer for new subscribers"
  },
  "usedBy": [],
  "createdAt": "2025-11-01T07:17:29.070Z",
  "updatedAt": "2025-11-01T07:17:29.070Z",
  "__v": 0
}
```

---

### preorders

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "orderNumber": 1
    },
    "name": "orderNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1
    },
    "name": "storeId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1
    },
    "name": "userId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1,
      "status": 1
    },
    "name": "storeId_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "createdAt": -1
    },
    "name": "userId_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  }
]
```

---

### activities

**Document Count:** 50

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68db882a3e4f892d1c633d02","68db882a3e4f892d1c633... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,219,136,42,62,79,137... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [219,219,219]... |
| _id.buffer.2 | 100.0% | number | 0 | [136,136,136]... |
| _id.buffer.3 | 100.0% | number | 0 | [42,42,42]... |
| _id.buffer.4 | 100.0% | number | 0 | [62,62,62]... |
| _id.buffer.5 | 100.0% | number | 0 | [79,79,79]... |
| _id.buffer.6 | 100.0% | number | 0 | [137,137,137]... |
| _id.buffer.7 | 100.0% | number | 0 | [45,45,45]... |
| _id.buffer.8 | 100.0% | number | 0 | [28,28,28]... |
| _id.buffer.9 | 100.0% | number | 0 | [99,99,99]... |
| _id.buffer.10 | 100.0% | number | 0 | [61,61,61]... |
| _id.buffer.11 | 100.0% | number | 0 | [2,3,4]... |
| user | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c","68c145d5f016515d8eb31... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [69,69,69]... |
| user.buffer.3 | 100.0% | number | 0 | [213,213,213]... |
| user.buffer.4 | 100.0% | number | 0 | [240,240,240]... |
| user.buffer.5 | 100.0% | number | 0 | [22,22,22]... |
| user.buffer.6 | 100.0% | number | 0 | [81,81,81]... |
| user.buffer.7 | 100.0% | number | 0 | [93,93,93]... |
| user.buffer.8 | 100.0% | number | 0 | [142,142,142]... |
| user.buffer.9 | 100.0% | number | 0 | [179,179,179]... |
| user.buffer.10 | 100.0% | number | 0 | [28,28,28]... |
| user.buffer.11 | 100.0% | number | 0 | [12,12,12]... |
| type | 100.0% | string | 0 | ["CASHBACK","REVIEW","ACHIEVEMENT"]... |
| title | 100.0% | string | 0 | ["Cashback earned","Review submitted","Achievement... |
| description | 100.0% | string | 0 | ["From your recent purchase","Thank you for your f... |
| amount | 10.0% | number | 0 | [12.5]... |
| icon | 100.0% | string | 0 | ["cash","star","trophy"]... |
| color | 100.0% | string | 0 | ["#F59E0B","#EC4899","#F59E0B"]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-09-30T07:35:06.207Z","2025-09-30T07:35:06.2... |
| updatedAt | 100.0% | object | 0 | ["2025-09-30T07:35:06.207Z","2025-09-30T07:35:06.2... |
| relatedEntity | 70.0% | object | 0 | [{"id":"68db357475c73d30b8dccdb3","type":"Order"},... |
| relatedEntity.id | 70.0% | object | 0 | ["68db357475c73d30b8dccdb3","68db35c84aa7f6265d4f7... |
| relatedEntity.id.buffer | 70.0% | object | 0 | [{"type":"Buffer","data":[104,219,53,116,117,199,6... |
| relatedEntity.id.buffer.0 | 70.0% | number | 0 | [104,104,104]... |
| relatedEntity.id.buffer.1 | 70.0% | number | 0 | [219,219,219]... |
| relatedEntity.id.buffer.2 | 70.0% | number | 0 | [53,53,60]... |
| relatedEntity.id.buffer.3 | 70.0% | number | 0 | [116,200,132]... |
| relatedEntity.id.buffer.4 | 70.0% | number | 0 | [117,74,212]... |
| relatedEntity.id.buffer.5 | 70.0% | number | 0 | [199,167,100]... |
| relatedEntity.id.buffer.6 | 70.0% | number | 0 | [61,246,225]... |
| relatedEntity.id.buffer.7 | 70.0% | number | 0 | [48,38,87]... |
| relatedEntity.id.buffer.8 | 70.0% | number | 0 | [184,93,120]... |
| relatedEntity.id.buffer.9 | 70.0% | number | 0 | [220,79,62]... |
| relatedEntity.id.buffer.10 | 70.0% | number | 0 | [205,119,180]... |
| relatedEntity.id.buffer.11 | 70.0% | number | 0 | [179,225,170]... |
| relatedEntity.type | 70.0% | string | 0 | ["Order","Order","Order"]... |
| metadata | 70.0% | object | 0 | [{"storeName":"BookWorld","status":"cancelled","or... |
| metadata.storeName | 70.0% | string | 0 | ["BookWorld","BookWorld","BookWorld"]... |
| metadata.status | 70.0% | string | 0 | ["cancelled","cancelled","cancelled"]... |
| metadata.orderNumber | 70.0% | string | 0 | ["ORD17591965328290001","ORD17591966166430002","OR... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "type": 1
    },
    "name": "type_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "type": 1,
      "createdAt": -1
    },
    "name": "user_1_type_1_createdAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68db882a3e4f892d1c633d02",
  "user": "68c145d5f016515d8eb31c0c",
  "type": "CASHBACK",
  "title": "Cashback earned",
  "description": "From your recent purchase",
  "amount": 12.5,
  "icon": "cash",
  "color": "#F59E0B",
  "__v": 0,
  "createdAt": "2025-09-30T07:35:06.207Z",
  "updatedAt": "2025-09-30T07:35:06.207Z"
}
```

---

### favorites

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "store": 1
    },
    "name": "user_1_store_1",
    "background": true,
    "unique": true
  }
]
```

---

### storevisits

**Document Count:** 1

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["6915b5b874a855c21ed4f278"]... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,21,181,184,116,168,8... |
| _id.buffer.0 | 100.0% | number | 0 | [105]... |
| _id.buffer.1 | 100.0% | number | 0 | [21]... |
| _id.buffer.2 | 100.0% | number | 0 | [181]... |
| _id.buffer.3 | 100.0% | number | 0 | [184]... |
| _id.buffer.4 | 100.0% | number | 0 | [116]... |
| _id.buffer.5 | 100.0% | number | 0 | [168]... |
| _id.buffer.6 | 100.0% | number | 0 | [85]... |
| _id.buffer.7 | 100.0% | number | 0 | [194]... |
| _id.buffer.8 | 100.0% | number | 0 | [30]... |
| _id.buffer.9 | 100.0% | number | 0 | [212]... |
| _id.buffer.10 | 100.0% | number | 0 | [242]... |
| _id.buffer.11 | 100.0% | number | 0 | [120]... |
| storeId | 100.0% | object | 0 | ["69059ef2cdd7a84b808a74a4"]... |
| storeId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,5,158,242,205,215,16... |
| storeId.buffer.0 | 100.0% | number | 0 | [105]... |
| storeId.buffer.1 | 100.0% | number | 0 | [5]... |
| storeId.buffer.2 | 100.0% | number | 0 | [158]... |
| storeId.buffer.3 | 100.0% | number | 0 | [242]... |
| storeId.buffer.4 | 100.0% | number | 0 | [205]... |
| storeId.buffer.5 | 100.0% | number | 0 | [215]... |
| storeId.buffer.6 | 100.0% | number | 0 | [168]... |
| storeId.buffer.7 | 100.0% | number | 0 | [75]... |
| storeId.buffer.8 | 100.0% | number | 0 | [128]... |
| storeId.buffer.9 | 100.0% | number | 0 | [138]... |
| storeId.buffer.10 | 100.0% | number | 0 | [116]... |
| storeId.buffer.11 | 100.0% | number | 0 | [164]... |
| userId | 100.0% | object | 0 | ["68ef4d41061faaf045222506"]... |
| userId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,239,77,65,6,31,170,2... |
| userId.buffer.0 | 100.0% | number | 0 | [104]... |
| userId.buffer.1 | 100.0% | number | 0 | [239]... |
| userId.buffer.2 | 100.0% | number | 0 | [77]... |
| userId.buffer.3 | 100.0% | number | 0 | [65]... |
| userId.buffer.4 | 100.0% | number | 0 | [6]... |
| userId.buffer.5 | 100.0% | number | 0 | [31]... |
| userId.buffer.6 | 100.0% | number | 0 | [170]... |
| userId.buffer.7 | 100.0% | number | 0 | [240]... |
| userId.buffer.8 | 100.0% | number | 0 | [69]... |
| userId.buffer.9 | 100.0% | number | 0 | [34]... |
| userId.buffer.10 | 100.0% | number | 0 | [37]... |
| userId.buffer.11 | 100.0% | number | 0 | [6]... |
| visitType | 100.0% | string | 0 | ["scheduled"]... |
| visitDate | 100.0% | object | 0 | ["2025-11-13T10:27:56.030Z"]... |
| visitTime | 100.0% | string | 0 | ["05:00 PM"]... |
| customerName | 100.0% | string | 0 | ["Mukul Raj"]... |
| customerPhone | 100.0% | string | 0 | ["91821022430"]... |
| customerEmail | 100.0% | string | 0 | ["mukulraj756@gmail.com"]... |
| status | 100.0% | string | 0 | ["pending"]... |
| estimatedDuration | 100.0% | number | 0 | [30]... |
| createdAt | 100.0% | object | 0 | ["2025-11-13T10:40:56.765Z"]... |
| updatedAt | 100.0% | object | 0 | ["2025-11-13T10:40:56.765Z"]... |
| visitNumber | 100.0% | string | 0 | ["SV-1763030456766-3787"]... |
| __v | 100.0% | number | 0 | [0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "visitNumber": 1
    },
    "name": "visitNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1
    },
    "name": "storeId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1
    },
    "name": "userId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "visitDate": 1
    },
    "name": "visitDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "queueNumber": 1
    },
    "name": "queueNumber_1",
    "background": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1,
      "visitDate": 1
    },
    "name": "storeId_1_visitDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1,
      "queueNumber": 1,
      "visitDate": 1
    },
    "name": "storeId_1_queueNumber_1_visitDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "createdAt": -1
    },
    "name": "userId_1_createdAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "6915b5b874a855c21ed4f278",
  "storeId": "69059ef2cdd7a84b808a74a4",
  "userId": "68ef4d41061faaf045222506",
  "visitType": "scheduled",
  "visitDate": "2025-11-13T10:27:56.030Z",
  "visitTime": "05:00 PM",
  "customerName": "Mukul Raj",
  "customerPhone": "91821022430",
  "customerEmail": "mukulraj756@gmail.com",
  "status": "pending",
  "estimatedDuration": 30,
  "createdAt": "2025-11-13T10:40:56.765Z",
  "updatedAt": "2025-11-13T10:40:56.765Z",
  "visitNumber": "SV-1763030456766-3787",
  "__v": 0
}
```

---

### articles

**Document Count:** 11

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["690f446fab1de0e050f3292a","690f446fab1de0e050f32... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,15,68,111,171,29,224... |
| _id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| _id.buffer.1 | 100.0% | number | 0 | [15,15,15]... |
| _id.buffer.2 | 100.0% | number | 0 | [68,68,68]... |
| _id.buffer.3 | 100.0% | number | 0 | [111,111,111]... |
| _id.buffer.4 | 100.0% | number | 0 | [171,171,171]... |
| _id.buffer.5 | 100.0% | number | 0 | [29,29,29]... |
| _id.buffer.6 | 100.0% | number | 0 | [224,224,224]... |
| _id.buffer.7 | 100.0% | number | 0 | [224,224,224]... |
| _id.buffer.8 | 100.0% | number | 0 | [80,80,80]... |
| _id.buffer.9 | 100.0% | number | 0 | [243,243,243]... |
| _id.buffer.10 | 100.0% | number | 0 | [41,41,41]... |
| _id.buffer.11 | 100.0% | number | 0 | [42,38,39]... |
| title | 100.0% | string | 0 | ["Best Budget Smartphones of 2025: Complete Guide"... |
| excerpt | 100.0% | string | 0 | ["Find the perfect budget-friendly smartphone with... |
| content | 100.0% | string | 0 | ["# Best Budget Smartphones of 2025: Complete Guid... |
| coverImage | 100.0% | string | 0 | ["https://images.unsplash.com/photo-1511707171634-... |
| author | 100.0% | object | 0 | ["690f4394ebb40efd0129922f","690e1240f6a9c6e39b4ea... |
| author.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,15,67,148,235,180,14... |
| author.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| author.buffer.1 | 100.0% | number | 0 | [15,14,15]... |
| author.buffer.2 | 100.0% | number | 0 | [67,18,67]... |
| author.buffer.3 | 100.0% | number | 0 | [148,64,148]... |
| author.buffer.4 | 100.0% | number | 0 | [235,246,235]... |
| author.buffer.5 | 100.0% | number | 0 | [180,169,180]... |
| author.buffer.6 | 100.0% | number | 0 | [14,198,14]... |
| author.buffer.7 | 100.0% | number | 0 | [253,227,253]... |
| author.buffer.8 | 100.0% | number | 0 | [1,155,1]... |
| author.buffer.9 | 100.0% | number | 0 | [41,78,41]... |
| author.buffer.10 | 100.0% | number | 0 | [146,175,146]... |
| author.buffer.11 | 100.0% | number | 0 | [47,78,36]... |
| authorType | 100.0% | string | 0 | ["merchant","user","merchant"]... |
| category | 100.0% | string | 0 | ["tech","beauty","beauty"]... |
| tags | 100.0% | array | 0 | [["smartphones","tech-reviews","budget-tech","mobi... |
| products | 100.0% | array | 0 | [["6905afbb5f8c7aa14aa2997b"],[],["6905afbc5f8c7aa... |
| stores | 100.0% | array | 0 | [["69059ef3cdd7a84b808a74e5"],[],[]]... |
| engagement | 100.0% | object | 0 | [{"likes":["68ee29d08c4fa11015d70339","68ef4c43262... |
| engagement.likes | 100.0% | array | 0 | [["68ee29d08c4fa11015d70339","68ef4c432629859fd113... |
| engagement.bookmarks | 100.0% | array | 0 | [["68ee29d08c4fa11015d70339","68ef4c432629859fd113... |
| engagement.shares | 100.0% | number | 0 | [316,1835,2231]... |
| engagement.comments | 100.0% | number | 0 | [13,15,20]... |
| analytics | 100.0% | object | 0 | [{"totalViews":15830,"uniqueViews":12082,"avgReadT... |
| analytics.totalViews | 100.0% | number | 0 | [15830,22941,37196]... |
| analytics.uniqueViews | 100.0% | number | 0 | [12082,14051,26781]... |
| analytics.avgReadTime | 100.0% | number | 0 | [243,268,242]... |
| analytics.completionRate | 100.0% | number | 0 | [72,54,45]... |
| analytics.engagementRate | 100.0% | number | 0 | [7,19,11]... |
| analytics.shareRate | 100.0% | number | 0 | [2,8,6]... |
| analytics.likeRate | 100.0% | number | 0 | [14,14,23]... |
| analytics.viewsByDate | 100.0% | object | 0 | [{},{},{}]... |
| analytics.topLocations | 100.0% | array | 0 | [["Bangalore","Mumbai","Delhi"],["Bangalore","Mumb... |
| analytics.deviceBreakdown | 100.0% | object | 0 | [{"mobile":66,"tablet":10,"desktop":36},{"mobile":... |
| analytics.deviceBreakdown.mobile | 100.0% | number | 0 | [66,57,63]... |
| analytics.deviceBreakdown.tablet | 100.0% | number | 0 | [10,11,14]... |
| analytics.deviceBreakdown.desktop | 100.0% | number | 0 | [36,35,32]... |
| readTime | 100.0% | string | 0 | ["7 min read","6 min read","6 min read"]... |
| isPublished | 100.0% | boolean | 0 | [true,true,true]... |
| isFeatured | 100.0% | boolean | 0 | [false,false,false]... |
| isApproved | 100.0% | boolean | 0 | [true,true,true]... |
| moderationStatus | 100.0% | string | 0 | ["approved","approved","approved"]... |
| moderationReasons | 100.0% | array | 0 | [[],[],[]]... |
| publishedAt | 100.0% | object | 0 | ["2025-10-29T13:23:59.325Z","2025-10-30T13:23:59.3... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-11-08T13:23:59.348Z","2025-11-08T13:23:59.3... |
| updatedAt | 100.0% | object | 0 | ["2025-11-08T14:43:03.656Z","2025-11-08T14:43:03.5... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "author": 1
    },
    "name": "author_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isPublished": 1
    },
    "name": "isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1
    },
    "name": "isFeatured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "moderationStatus": 1
    },
    "name": "moderationStatus_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "publishedAt": 1
    },
    "name": "publishedAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "author": 1,
      "isPublished": 1,
      "createdAt": -1
    },
    "name": "author_1_isPublished_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "isPublished": 1,
      "publishedAt": -1
    },
    "name": "category_1_isPublished_1_publishedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1,
      "isPublished": 1
    },
    "name": "isFeatured_1_isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1,
      "isPublished": 1
    },
    "name": "tags_1_isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "analytics.totalViews": -1,
      "isPublished": 1
    },
    "name": "analytics.totalViews_-1_isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "publishedAt": -1
    },
    "name": "publishedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "title_text_excerpt_text_content_text_tags_text",
    "background": true,
    "weights": {
      "content": 1,
      "excerpt": 5,
      "tags": 3,
      "title": 10
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "analytics.totalViews": -1,
      "publishedAt": -1
    },
    "name": "category_1_analytics.totalViews_-1_publishedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "author": 1,
      "publishedAt": -1
    },
    "name": "author_1_publishedAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "690f446fab1de0e050f3292a",
  "title": "Best Budget Smartphones of 2025: Complete Guide",
  "excerpt": "Find the perfect budget-friendly smartphone with our comprehensive guide to the best affordable phones of 2025.",
  "content": "# Best Budget Smartphones of 2025: Complete Guide\n\nYou don't need to spend a fortune to get a great smartphone. The budget smartphone market in 2025 offers incredible value, with features that were flagship-exclusive just a few years ago. This guide helps you find the perfect affordable phone.\n\n## What Counts as \"Budget\"?\n\nFor this guide:\n- **Budget:** Under $300\n- **Mid-Budget:** $300-$500\n- **Premium Budget:** $500-$700\n\n## Top Picks by Category\n\n### Best Overall Budget Phone\n\n**Google Pixel 7a - $449**\n\n**Pros:**\n- Excellent camera (best in class)\n- Clean Android experience\n- Regular updates (7 years!)\n- Wireless charging\n- Water resistance (IP67)\n\n**Cons:**\n- Average battery life\n- No expandable storage\n- 60Hz display\n\n**Best For:** Photography enthusiasts, stock Android lovers\n\n### Best Value\n\n**Samsung Galaxy A54 5G - $449**\n\n**Pros:**\n- Beautiful 120Hz display\n- Excellent battery life\n- Expandable storage\n- Water resistance\n- Premium design\n\n**Cons:**\n- Camera less impressive than Pixel\n- Bloatware included\n- Slower processor\n\n**Best For:** All-around solid choice, Samsung ecosystem users\n\n### Best for Gamers\n\n**OnePlus Nord 3 - $399**\n\n**Pros:**\n- Powerful processor\n- Fast 120Hz display\n- Quick charging (80W!)\n- Great speakers\n- Lots of RAM (up to 16GB)\n\n**Cons:**\n- Average camera\n- Short update commitment\n- No wireless charging\n\n**Best For:** Mobile gamers, power users\n\n### Best Battery Life\n\n**Moto G Power (2025) - $199**\n\n**Pros:**\n- Massive battery (5000mAh+)\n- Affordable\n- Near-stock Android\n- Headphone jack!\n- Expandable storage\n\n**Cons:**\n- Weak processor\n- Basic camera\n- Slow charging\n- Plastic build\n\n**Best For:** Battery-first users, minimal needs\n\n### Best Camera Phone Under $300\n\n**Google Pixel 6a - $349**\n\n**Pros:**\n- Flagship-quality photos\n- Night Sight feature\n- Clean Android\n- Compact size\n- Regular updates\n\n**Cons:**\n- Dated processor\n- Slow fingerprint sensor\n- No expandable storage\n\n**Best For:** Photography on a budget\n\n### Best for Content Creation\n\n**Nothing Phone (2a) - $399**\n\n**Pros:**\n- Unique design\n- Clean software\n- Good cameras\n- Bright display\n- Fast charging\n\n**Cons:**\n- Limited availability\n- No wireless charging\n- Average battery\n\n**Best For:** Style-conscious users, content creators\n\n## Key Features to Consider\n\n### Display\n\n**What to Look For:**\n- **Resolution:** 1080p minimum (FHD+)\n- **Refresh Rate:** 90Hz+ for smoothness\n- **Size:** 6.4-6.7\" is standard\n- **Type:** AMOLED > LCD for colors and blacks\n\n**Budget Reality:**\nMany budget phones now offer 120Hz AMOLED displays—features that were premium-only in 2020!\n\n### Camera\n\n**Megapixels Aren't Everything:**\n\n**More Important:**\n- Sensor size\n- Software processing\n- Night mode capability\n- Stabilization\n\n**Realistic Expectations:**\n- Main camera usually good\n- Ultra-wide acceptable\n- Macro/depth sensors often gimmicky\n- No optical zoom at this price\n- Night photos improved but not flagship-level\n\n### Performance\n\n**Processor Guide:**\n\n**Budget:**\n- Snapdragon 4 Gen 2\n- MediaTek Dimensity 700\n- Google Tensor G2\n\n**Mid-Budget:**\n- Snapdragon 695/778G\n- MediaTek Dimensity 8000\n- Apple A15 (older iPhones)\n\n**RAM:**\n- Minimum: 4GB (basic use)\n- Recommended: 6-8GB (smooth performance)\n- Ideal: 8GB+ (futureproofing)\n\n**Storage:**\n- Minimum: 64GB (will fill fast)\n- Recommended: 128GB\n- Ideal: 256GB or expandable\n\n### Battery\n\n**Capacity:**\n- Small: Under 4000mAh\n- Average: 4000-4500mAh\n- Large: 5000mAh+\n\n**Charging Speed:**\n- Basic: 15-18W\n- Fast: 25-33W\n- Very Fast: 60W+\n- Wireless: Rare at this price\n\n**Battery Life Factors:**\n- Processor efficiency\n- Display resolution/refresh rate\n- Software optimization\n- Your usage patterns\n\n### Software & Updates\n\n**Why This Matters:**\n- Security\n- New features\n- Bug fixes\n- Longevity\n\n**Update Commitments (2025):**\n- **Google:** 7 years!\n- **Samsung:** 4 OS updates, 5 years security\n- **OnePlus:** 3 OS updates, 4 years security\n- **Motorola:** 2 OS updates, 3 years security\n\n**Stock vs. Custom Android:**\n- **Stock (Google, Motorola):** Clean, fast, timely updates\n- **Custom (Samsung, OnePlus):** More features, potential bloat\n\n### Build Quality\n\n**Materials:**\n- **Glass:** Premium feel, fragile\n- **Plastic:** Durable, cheap feel\n- **Metal:** Strong, premium (rare at budget)\n\n**Water Resistance:**\n- IP67/68: Excellent (rare)\n- IP54/55: Splashes okay\n- None: Keep it dry!\n\n### Extra Features\n\n**Nice to Have:**\n- Headphone jack (increasingly rare)\n- Expandable storage (microSD)\n- Dual SIM\n- NFC (for payments)\n- In-display fingerprint sensor\n- Stereo speakers\n\n## Brand Breakdown\n\n### Google Pixel (A-series)\n\n**Strengths:**\n- Best cameras\n- Clean software\n- Longest updates\n\n**Weaknesses:**\n- Higher price\n- Limited availability\n- Battery life\n\n### Samsung (A-series)\n\n**Strengths:**\n- Broad selection\n- Good displays\n- Water resistance\n- Ecosystem integration\n\n**Weaknesses:**\n- Bloatware\n- Slower updates\n- Average cameras\n\n### OnePlus (Nord)\n\n**Strengths:**\n- Performance focus\n- Fast charging\n- Value pricing\n\n**Weaknesses:**\n- Average cameras\n- Shorter update cycle\n\n### Motorola (Moto G)\n\n**Strengths:**\n- Very affordable\n- Clean software\n- Long battery\n\n**Weaknesses:**\n- Weak performance\n- Basic cameras\n- Short updates\n\n### Nothing\n\n**Strengths:**\n- Unique design\n- Clean software\n- Good value\n\n**Weaknesses:**\n- Limited availability\n- Newer brand (less proven)\n\n### Xiaomi/Redmi\n\n**Strengths:**\n- Excellent value\n- Great specs on paper\n- Fast charging\n\n**Weaknesses:**\n- Heavy software skin (MIUI)\n- Ads in system apps\n- Shorter update cycle\n\n## Making Your Decision\n\n### Use Cases\n\n**Casual User (Calls, Social Media, Photos):**\n→ **Moto G Power** ($199)\n→ **Samsung A14** ($199)\n\n**Photography Enthusiast:**\n→ **Google Pixel 7a** ($449)\n→ **Google Pixel 6a** ($349)\n\n**Mobile Gamer:**\n→ **OnePlus Nord 3** ($399)\n→ **Poco X5 Pro** ($299)\n\n**All-Arounder:**\n→ **Samsung Galaxy A54** ($449)\n→ **Nothing Phone (2a)** ($399)\n\n**Ultra-Budget (Under $200):**\n→ **Moto G Play** ($169)\n→ **Samsung A03s** ($159)\n\n### Checklist Before Buying\n\n✓ **Carrier Compatibility:** Verify bands\n✓ **Warranty:** Check coverage\n✓ **Return Policy:** Know your window\n✓ **Reviews:** Watch video reviews\n✓ **Hands-On:** Try in store if possible\n✓ **Accessories:** Budget for case, screen protector\n✓ **Trade-In:** Check if you qualify\n\n## Where to Buy\n\n**Best Deals:**\n- Carrier promotions (activation required)\n- Black Friday/Cyber Monday\n- Prime Day (Amazon)\n- Manufacturer direct sales\n- Trade-in programs\n\n**Buy Unlocked If Possible:**\n- Carrier flexibility\n- No bloatware\n- Better resale value\n- Freedom to switch plans\n\n## Common Mistakes\n\n❌ **Only comparing specs:** Real-world performance varies\n\n❌ **Ignoring software updates:** Security matters\n\n❌ **Falling for \"Pro\" camera specs:** Processing > megapixels\n\n❌ **Buying too cheap:** Frustration isn't worth $50 savings\n\n❌ **Ignoring reviews:** Specs don't tell whole story\n\n❌ **Not checking compatibility:** Verify with your carrier\n\n## Extending Your Phone's Life\n\n**Day One:**\n- Quality case\n- Tempered glass screen protector\n- Set up automatic backups\n\n**Ongoing:**\n- Install updates promptly\n- Avoid extreme temperatures\n- Use original or certified chargers\n- Clear cache periodically\n- Uninstall unused apps\n\n**Goal:** 3-4 years of reliable use\n\n## When to Splurge vs. Save\n\n**Worth Spending More:**\n- Camera quality critical\n- Need water resistance\n- Want longest updates\n- Heavy gamer\n\n**Save Money If:**\n- Basic use only\n- Can handle slower performance\n- Upgrade frequently\n- Tight budget\n\n## Alternatives to Consider\n\n**Certified Refurbished Flagships:**\n- iPhone 12/13 ($300-500)\n- Samsung S21/S22 ($350-550)\n- Google Pixel 6 Pro ($400)\n\n**Pros:**\n- Flagship features\n- Better cameras\n- Premium build\n\n**Cons:**\n- Shorter update runway\n- Potential wear\n- Limited warranty\n\n## 2025 Trends\n\n**Coming to Budget Phones:**\n- 120Hz displays (now standard)\n- 5G connectivity (universal)\n- 50MP+ main cameras\n- Faster charging (33W+)\n- Cleaner software\n\n**Still Premium:**\n- Periscope zoom cameras\n- Wireless charging\n- Premium materials\n- Advanced AI features\n\n## Final Recommendations\n\n**Best Overall:**\n**Google Pixel 7a** ($449) - Best camera, longest updates\n\n**Best Value:**\n**Samsung Galaxy A54** ($449) - All-around excellence\n\n**Best Budget:**\n**Moto G Power** ($199) - Battery champ, ultra-affordable\n\n**Best for Gamers:**\n**OnePlus Nord 3** ($399) - Performance beast\n\n**Best Style:**\n**Nothing Phone (2a)** ($399) - Unique and capable\n\n## Conclusion\n\nThe budget smartphone market in 2025 is better than ever. You can get a genuinely great phone without breaking the bank. Decide what matters most to you, do your research, and you'll find a device that serves you well for years.\n\n**Remember:** The best phone is the one that fits YOUR needs and budget, not the one with the highest specs on paper.\n\n**Happy phone hunting!**",
  "coverImage": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop",
  "author": "690f4394ebb40efd0129922f",
  "authorType": "merchant",
  "category": "tech",
  "tags": [
    "smartphones",
    "tech-reviews",
    "budget-tech",
    "mobile-phones",
    "buying-guide"
  ],
  "products": [
    "6905afbb5f8c7aa14aa2997b"
  ],
  "stores": [
    "69059ef3cdd7a84b808a74e5"
  ],
  "engagement": {
    "likes": [
      "68ee29d08c4fa11015d70339",
      "68ef4c432629859fd1137200",
      "68ef4d41061faaf045222506",
      "68fb5d9318377fe11cba74b8",
      "68fb5d9318377fe11cba74b7",
      "68fb5d9318377fe11cba74b4",
      "68fb5d9318377fe11cba74b5",
      "68fb5d9318377fe11cba74b6",
      "68fb5d9318377fe11cba74bb",
      "68fb5d9318377fe11cba74bc",
      "68fb5d9318377fe11cba74b9",
      "68fb5d9318377fe11cba74ba",
      "68fb5d9318377fe11cba74bd",
      "68fb5d9318377fe11cba74be",
      "68fb5d9318377fe11cba74bf",
      "68fd437e47c313aa521818c4",
      "6909d11570927098b1c6a95c",
      "690e1240f6a9c6e39b4eaf4e",
      "690e22def6a9c6e39b4eb2e3",
      "690f43d782ba8b537e58a3b8"
    ],
    "bookmarks": [
      "68ee29d08c4fa11015d70339",
      "68ef4c432629859fd1137200",
      "68ef4d41061faaf045222506",
      "68fb5d9318377fe11cba74b8",
      "68fb5d9318377fe11cba74b7",
      "68fb5d9318377fe11cba74b4",
      "68fb5d9318377fe11cba74b5",
      "68fb5d9318377fe11cba74b6",
      "68fb5d9318377fe11cba74bb",
      "68fb5d9318377fe11cba74bc",
      "68fb5d9318377fe11cba74b9",
      "68fb5d9318377fe11cba74ba",
      "68fb5d9318377fe11cba74bd",
      "68fb5d9318377fe11cba74be",
      "68fb5d9318377fe11cba74bf",
      "68fd437e47c313aa521818c4",
      "6909d11570927098b1c6a95c",
      "690e1240f6a9c6e39b4eaf4e",
      "690e22def6a9c6e39b4eb2e3",
      "690f43d782ba8b537e58a3b8"
    ],
    "shares": 316,
    "comments": 13
  },
  "analytics": {
    "totalViews": 15830,
    "uniqueViews": 12082,
    "avgReadTime": 243,
    "completionRate": 72,
    "engagementRate": 7,
    "shareRate": 2,
    "likeRate": 14,
    "viewsByDate": {},
    "topLocations": [
      "Bangalore",
      "Mumbai",
      "Delhi"
    ],
    "deviceBreakdown": {
      "mobile": 66,
      "tablet": 10,
      "desktop": 36
    }
  },
  "readTime": "7 min read",
  "isPublished": true,
  "isFeatured": false,
  "isApproved": true,
  "moderationStatus": "approved",
  "moderationReasons": [],
  "publishedAt": "2025-10-29T13:23:59.325Z",
  "__v": 0,
  "createdAt": "2025-11-08T13:23:59.348Z",
  "updatedAt": "2025-11-08T14:43:03.656Z"
}
```

---

### addresses

**Document Count:** 5

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68e0b7cf33c1a11f47aeadb4","68e0b7cf33c1a11f47aea... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,224,183,207,51,193,1... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [224,224,224]... |
| _id.buffer.2 | 100.0% | number | 0 | [183,183,183]... |
| _id.buffer.3 | 100.0% | number | 0 | [207,207,207]... |
| _id.buffer.4 | 100.0% | number | 0 | [51,51,51]... |
| _id.buffer.5 | 100.0% | number | 0 | [193,193,193]... |
| _id.buffer.6 | 100.0% | number | 0 | [161,161,161]... |
| _id.buffer.7 | 100.0% | number | 0 | [31,31,31]... |
| _id.buffer.8 | 100.0% | number | 0 | [71,71,71]... |
| _id.buffer.9 | 100.0% | number | 0 | [174,174,174]... |
| _id.buffer.10 | 100.0% | number | 0 | [173,173,173]... |
| _id.buffer.11 | 100.0% | number | 0 | [180,178,179]... |
| user | 100.0% | object | 0 | ["68c1447aa6d2db865ad82459","68c1447aa6d2db865ad82... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,68,122,166,210,2... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [68,68,68]... |
| user.buffer.3 | 100.0% | number | 0 | [122,122,122]... |
| user.buffer.4 | 100.0% | number | 0 | [166,166,166]... |
| user.buffer.5 | 100.0% | number | 0 | [210,210,210]... |
| user.buffer.6 | 100.0% | number | 0 | [219,219,219]... |
| user.buffer.7 | 100.0% | number | 0 | [134,134,134]... |
| user.buffer.8 | 100.0% | number | 0 | [90,90,90]... |
| user.buffer.9 | 100.0% | number | 0 | [216,216,216]... |
| user.buffer.10 | 100.0% | number | 0 | [36,36,36]... |
| user.buffer.11 | 100.0% | number | 0 | [89,89,89]... |
| type | 100.0% | string | 0 | ["OTHER","HOME","OFFICE"]... |
| title | 100.0% | string | 0 | ["Mom's House","Home","Office"]... |
| addressLine1 | 100.0% | string | 0 | ["789 Oak Lane","123 Elm Street","456 Business Ave... |
| addressLine2 | 100.0% | string | 0 | ["","Apt 4B","Suite 200"]... |
| city | 100.0% | string | 0 | ["Brooklyn","New York","New York"]... |
| state | 100.0% | string | 0 | ["NY","NY","NY"]... |
| postalCode | 100.0% | string | 0 | ["11201","10001","10002"]... |
| country | 100.0% | string | 0 | ["USA","USA","USA"]... |
| coordinates | 80.0% | object | 0 | [{"latitude":40.6782,"longitude":-73.9442},{"latit... |
| coordinates.latitude | 80.0% | number | 0 | [40.6782,40.7589,40.7128]... |
| coordinates.longitude | 80.0% | number | 0 | [-73.9442,-73.9851,-74.006]... |
| isDefault | 100.0% | boolean | 0 | [false,true,false]... |
| instructions | 100.0% | string | 0 | ["Call upon arrival, gate code is 1234","Ring door... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-04T05:59:43.406Z","2025-10-04T05:59:43.4... |
| updatedAt | 100.0% | object | 0 | ["2025-10-04T05:59:43.406Z","2025-10-04T05:59:43.4... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "isDefault": 1
    },
    "name": "user_1_isDefault_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68e0b7cf33c1a11f47aeadb4",
  "user": "68c1447aa6d2db865ad82459",
  "type": "OTHER",
  "title": "Mom's House",
  "addressLine1": "789 Oak Lane",
  "addressLine2": "",
  "city": "Brooklyn",
  "state": "NY",
  "postalCode": "11201",
  "country": "USA",
  "coordinates": {
    "latitude": 40.6782,
    "longitude": -73.9442
  },
  "isDefault": false,
  "instructions": "Call upon arrival, gate code is 1234",
  "__v": 0,
  "createdAt": "2025-10-04T05:59:43.406Z",
  "updatedAt": "2025-10-04T05:59:43.406Z"
}
```

---

### storepromocoins

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "store": 1
    },
    "name": "user_1_store_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "isActive": 1
    },
    "name": "user_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "amount": -1
    },
    "name": "user_1_amount_-1",
    "background": true
  }
]
```

---

### wishlists

**Document Count:** 164

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68c1461ce0d463dd1a6e4a43","68c14838e0d463dd1a6e4... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,70,28,224,212,99... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| _id.buffer.2 | 100.0% | number | 0 | [70,72,72]... |
| _id.buffer.3 | 100.0% | number | 0 | [28,56,70]... |
| _id.buffer.4 | 100.0% | number | 0 | [224,224,224]... |
| _id.buffer.5 | 100.0% | number | 0 | [212,212,212]... |
| _id.buffer.6 | 100.0% | number | 0 | [99,99,99]... |
| _id.buffer.7 | 100.0% | number | 0 | [221,221,221]... |
| _id.buffer.8 | 100.0% | number | 0 | [26,26,26]... |
| _id.buffer.9 | 100.0% | number | 0 | [110,110,110]... |
| _id.buffer.10 | 100.0% | number | 0 | [74,75,75]... |
| _id.buffer.11 | 100.0% | number | 0 | [67,21,26]... |
| user | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c","68c145d5f016515d8eb31... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [69,69,69]... |
| user.buffer.3 | 100.0% | number | 0 | [213,213,213]... |
| user.buffer.4 | 100.0% | number | 0 | [240,240,240]... |
| user.buffer.5 | 100.0% | number | 0 | [22,22,22]... |
| user.buffer.6 | 100.0% | number | 0 | [81,81,81]... |
| user.buffer.7 | 100.0% | number | 0 | [93,93,93]... |
| user.buffer.8 | 100.0% | number | 0 | [142,142,142]... |
| user.buffer.9 | 100.0% | number | 0 | [179,179,179]... |
| user.buffer.10 | 100.0% | number | 0 | [28,28,28]... |
| user.buffer.11 | 100.0% | number | 0 | [12,12,12]... |
| name | 100.0% | string | 0 | ["My Wishlist","My Wishlist","My Wishlist"]... |
| description | 100.0% | string | 0 | ["Default wishlist","Default wishlist","Default wi... |
| category | 100.0% | string | 0 | ["personal","personal","personal"]... |
| isDefault | 100.0% | boolean | 0 | [false,false,false]... |
| sharing | 100.0% | object | 0 | [{"isPublic":false,"sharedWith":[],"allowCopying":... |
| sharing.isPublic | 100.0% | boolean | 0 | [false,false,false]... |
| sharing.sharedWith | 100.0% | array | 0 | [[],[],[]]... |
| sharing.allowCopying | 100.0% | boolean | 0 | [true,true,true]... |
| sharing.allowComments | 100.0% | boolean | 0 | [true,true,true]... |
| analytics | 100.0% | object | 0 | [{"priceRangeAnalysis":{"min":0,"max":0,"avg":0,"m... |
| analytics.priceRangeAnalysis | 100.0% | object | 0 | [{"min":0,"max":0,"avg":0,"median":0},{"min":0,"ma... |
| analytics.priceRangeAnalysis.min | 100.0% | number | 0 | [0,0,0]... |
| analytics.priceRangeAnalysis.max | 100.0% | number | 0 | [0,0,0]... |
| analytics.priceRangeAnalysis.avg | 100.0% | number | 0 | [0,0,0]... |
| analytics.priceRangeAnalysis.median | 100.0% | number | 0 | [0,0,0]... |
| analytics.totalViews | 100.0% | number | 0 | [0,0,0]... |
| analytics.totalShares | 100.0% | number | 0 | [0,0,0]... |
| analytics.conversionRate | 100.0% | number | 0 | [0,0,0]... |
| analytics.avgTimeToConversion | 100.0% | number | 0 | [0,0,0]... |
| analytics.popularCategories | 100.0% | object | 0 | [{},{},{}]... |
| analytics.monthlyStats | 100.0% | array | 0 | [[],[],[]]... |
| totalValue | 100.0% | number | 0 | [0,0,0]... |
| availableItems | 100.0% | number | 0 | [0,0,0]... |
| priceChangeAlerts | 100.0% | boolean | 0 | [true,true,true]... |
| stockAlerts | 100.0% | boolean | 0 | [true,true,true]... |
| items | 100.0% | array | 0 | [[],[],[]]... |
| createdAt | 100.0% | object | 0 | ["2025-09-10T09:34:20.105Z","2025-09-10T09:43:20.9... |
| updatedAt | 100.0% | object | 0 | ["2025-09-10T09:34:20.105Z","2025-09-10T09:43:20.9... |
| __v | 100.0% | number | 0 | [0,0,0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "sharing.shareCode": 1
    },
    "name": "sharing.shareCode_1",
    "background": true,
    "unique": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "isDefault": 1
    },
    "name": "user_1_isDefault_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "sharing.isPublic": 1,
      "createdAt": -1
    },
    "name": "sharing.isPublic_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "items.itemType": 1,
      "items.itemId": 1
    },
    "name": "items.itemType_1_items.itemId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "items.priority": 1
    },
    "name": "items.priority_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "name_text_description_text_items.notes_text_items.tags_text",
    "background": true,
    "weights": {
      "description": 5,
      "items.notes": 1,
      "items.tags": 3,
      "name": 10
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  }
]
```

**Sample Document:**

```json
{
  "_id": "68c1461ce0d463dd1a6e4a43",
  "user": "68c145d5f016515d8eb31c0c",
  "name": "My Wishlist",
  "description": "Default wishlist",
  "category": "personal",
  "isDefault": false,
  "sharing": {
    "isPublic": false,
    "sharedWith": [],
    "allowCopying": true,
    "allowComments": true
  },
  "analytics": {
    "priceRangeAnalysis": {
      "min": 0,
      "max": 0,
      "avg": 0,
      "median": 0
    },
    "totalViews": 0,
    "totalShares": 0,
    "conversionRate": 0,
    "avgTimeToConversion": 0,
    "popularCategories": {},
    "monthlyStats": []
  },
  "totalValue": 0,
  "availableItems": 0,
  "priceChangeAlerts": true,
  "stockAlerts": true,
  "items": [],
  "createdAt": "2025-09-10T09:34:20.105Z",
  "updatedAt": "2025-09-10T09:34:20.105Z",
  "__v": 0
}
```

---

### referrals

**Document Count:** 14

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68fb6ce25435fc657cb04a86","68fb6ce25435fc657cb04... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,108,226,84,53,25... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [251,251,251]... |
| _id.buffer.2 | 100.0% | number | 0 | [108,108,108]... |
| _id.buffer.3 | 100.0% | number | 0 | [226,226,226]... |
| _id.buffer.4 | 100.0% | number | 0 | [84,84,84]... |
| _id.buffer.5 | 100.0% | number | 0 | [53,53,53]... |
| _id.buffer.6 | 100.0% | number | 0 | [252,252,252]... |
| _id.buffer.7 | 100.0% | number | 0 | [101,101,101]... |
| _id.buffer.8 | 100.0% | number | 0 | [124,124,124]... |
| _id.buffer.9 | 100.0% | number | 0 | [176,176,176]... |
| _id.buffer.10 | 100.0% | number | 0 | [74,74,74]... |
| _id.buffer.11 | 100.0% | number | 0 | [134,135,136]... |
| referrer | 100.0% | object | 0 | ["68ee29d08c4fa11015d70339","68ef4c432629859fd1137... |
| referrer.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| referrer.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| referrer.buffer.1 | 100.0% | number | 0 | [238,239,239]... |
| referrer.buffer.2 | 100.0% | number | 0 | [41,76,77]... |
| referrer.buffer.3 | 100.0% | number | 0 | [208,67,65]... |
| referrer.buffer.4 | 100.0% | number | 0 | [140,38,6]... |
| referrer.buffer.5 | 100.0% | number | 0 | [79,41,31]... |
| referrer.buffer.6 | 100.0% | number | 0 | [161,133,170]... |
| referrer.buffer.7 | 100.0% | number | 0 | [16,159,240]... |
| referrer.buffer.8 | 100.0% | number | 0 | [21,209,69]... |
| referrer.buffer.9 | 100.0% | number | 0 | [215,19,34]... |
| referrer.buffer.10 | 100.0% | number | 0 | [3,114,37]... |
| referrer.buffer.11 | 100.0% | number | 0 | [57,0,6]... |
| referee | 100.0% | object | 0 | ["68ef4c432629859fd1137200","68ef4d41061faaf045222... |
| referee.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,239,76,67,38,41,133,... |
| referee.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| referee.buffer.1 | 100.0% | number | 0 | [239,239,251]... |
| referee.buffer.2 | 100.0% | number | 0 | [76,77,93]... |
| referee.buffer.3 | 100.0% | number | 0 | [67,65,147]... |
| referee.buffer.4 | 100.0% | number | 0 | [38,6,24]... |
| referee.buffer.5 | 100.0% | number | 0 | [41,31,55]... |
| referee.buffer.6 | 100.0% | number | 0 | [133,170,127]... |
| referee.buffer.7 | 100.0% | number | 0 | [159,240,225]... |
| referee.buffer.8 | 100.0% | number | 0 | [209,69,28]... |
| referee.buffer.9 | 100.0% | number | 0 | [19,34,186]... |
| referee.buffer.10 | 100.0% | number | 0 | [114,37,116]... |
| referee.buffer.11 | 100.0% | number | 0 | [0,6,180]... |
| referralCode | 100.0% | string | 0 | ["U75ZV4","91166E","REF222506"]... |
| status | 100.0% | string | 0 | ["completed","completed","completed"]... |
| tier | 100.0% | string | 0 | ["STARTER","STARTER","STARTER"]... |
| rewards | 100.0% | object | 0 | [{"referrerAmount":50,"refereeDiscount":50,"milest... |
| rewards.referrerAmount | 100.0% | number | 0 | [50,50,50]... |
| rewards.refereeDiscount | 100.0% | number | 0 | [50,50,50]... |
| rewards.milestoneBonus | 100.0% | number | 0 | [20,20,20]... |
| rewards.description | 100.0% | string | 0 | ["STARTER tier referral rewards","STARTER tier ref... |
| referrerRewarded | 100.0% | boolean | 0 | [true,true,true]... |
| refereeRewarded | 100.0% | boolean | 0 | [true,true,true]... |
| milestoneRewarded | 100.0% | boolean | 0 | [true,true,true]... |
| qualificationCriteria | 100.0% | object | 0 | [{"minOrders":1,"minSpend":500,"timeframeDays":30}... |
| qualificationCriteria.minOrders | 100.0% | number | 0 | [1,1,1]... |
| qualificationCriteria.minSpend | 100.0% | number | 0 | [500,500,500]... |
| qualificationCriteria.timeframeDays | 100.0% | number | 0 | [30,30,30]... |
| completedAt | 100.0% | object | 0 | ["2025-10-05T14:57:31.587Z","2025-09-02T19:48:29.1... |
| registeredAt | 100.0% | object | 0 | ["2025-10-01T02:45:28.679Z","2025-08-28T03:52:52.5... |
| qualifiedAt | 100.0% | object | 0 | ["2025-10-04T06:44:38.369Z","2025-09-02T00:50:29.6... |
| expiresAt | 100.0% | object | 0 | ["2025-12-28T05:54:59.047Z","2025-11-25T13:20:11.3... |
| metadata | 100.0% | object | 0 | [{"shareMethod":"qr","sharedAt":"2025-09-28T10:33:... |
| metadata.shareMethod | 100.0% | string | 0 | ["qr","facebook","qr"]... |
| metadata.sharedAt | 100.0% | object | 0 | ["2025-09-28T10:33:39.993Z","2025-08-26T23:57:53.1... |
| metadata.signupSource | 100.0% | string | 0 | ["mobile","web","mobile"]... |
| metadata.deviceId | 100.0% | string | 0 | ["device_z1jcig","device_piltw","device_4si6po"]... |
| metadata.refereeFirstOrder | 100.0% | object | 0 | [{"orderId":"68fb6ce25435fc657cb04a7b","amount":12... |
| metadata.refereeFirstOrder.orderId | 100.0% | object | 0 | ["68fb6ce25435fc657cb04a7b","68fb6ce25435fc657cb04... |
| metadata.refereeFirstOrder.orderId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,108,226,84,53,25... |
| metadata.refereeFirstOrder.orderId.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| metadata.refereeFirstOrder.orderId.buffer.1 | 100.0% | number | 0 | [251,251,251]... |
| metadata.refereeFirstOrder.orderId.buffer.2 | 100.0% | number | 0 | [108,108,108]... |
| metadata.refereeFirstOrder.orderId.buffer.3 | 100.0% | number | 0 | [226,226,226]... |
| metadata.refereeFirstOrder.orderId.buffer.4 | 100.0% | number | 0 | [84,84,84]... |
| metadata.refereeFirstOrder.orderId.buffer.5 | 100.0% | number | 0 | [53,53,53]... |
| metadata.refereeFirstOrder.orderId.buffer.6 | 100.0% | number | 0 | [252,252,252]... |
| metadata.refereeFirstOrder.orderId.buffer.7 | 100.0% | number | 0 | [101,101,101]... |
| metadata.refereeFirstOrder.orderId.buffer.8 | 100.0% | number | 0 | [124,124,124]... |
| metadata.refereeFirstOrder.orderId.buffer.9 | 100.0% | number | 0 | [176,176,176]... |
| metadata.refereeFirstOrder.orderId.buffer.10 | 100.0% | number | 0 | [74,74,74]... |
| metadata.refereeFirstOrder.orderId.buffer.11 | 100.0% | number | 0 | [123,124,125]... |
| metadata.refereeFirstOrder.amount | 100.0% | number | 0 | [1257,632,887]... |
| metadata.refereeFirstOrder.completedAt | 100.0% | object | 0 | ["2025-10-04T06:44:38.369Z","2025-09-02T00:50:29.6... |
| metadata.milestoneOrders | 100.0% | object | 0 | [{"count":6,"totalAmount":2258,"lastOrderAt":"2025... |
| metadata.milestoneOrders.count | 100.0% | number | 0 | [6,6,4]... |
| metadata.milestoneOrders.totalAmount | 100.0% | number | 0 | [2258,3758,4863]... |
| metadata.milestoneOrders.lastOrderAt | 100.0% | object | 0 | ["2025-10-05T14:57:31.587Z","2025-09-02T19:48:29.1... |
| createdAt | 100.0% | object | 0 | ["2025-09-29T05:54:59.047Z","2025-08-27T13:20:11.3... |
| updatedAt | 100.0% | object | 0 | ["2025-10-05T14:57:31.587Z","2025-09-02T19:48:29.1... |
| __v | 100.0% | number | 0 | [0,0,0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "referrer": 1
    },
    "name": "referrer_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "referee": 1
    },
    "name": "referee_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "referralCode": 1
    },
    "name": "referralCode_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "referrer": 1,
      "status": 1
    },
    "name": "referrer_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "referee": 1,
      "status": 1
    },
    "name": "referee_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "expiresAt": 1
    },
    "name": "status_1_expiresAt_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68fb6ce25435fc657cb04a86",
  "referrer": "68ee29d08c4fa11015d70339",
  "referee": "68ef4c432629859fd1137200",
  "referralCode": "U75ZV4",
  "status": "completed",
  "tier": "STARTER",
  "rewards": {
    "referrerAmount": 50,
    "refereeDiscount": 50,
    "milestoneBonus": 20,
    "description": "STARTER tier referral rewards"
  },
  "referrerRewarded": true,
  "refereeRewarded": true,
  "milestoneRewarded": true,
  "qualificationCriteria": {
    "minOrders": 1,
    "minSpend": 500,
    "timeframeDays": 30
  },
  "completedAt": "2025-10-05T14:57:31.587Z",
  "registeredAt": "2025-10-01T02:45:28.679Z",
  "qualifiedAt": "2025-10-04T06:44:38.369Z",
  "expiresAt": "2025-12-28T05:54:59.047Z",
  "metadata": {
    "shareMethod": "qr",
    "sharedAt": "2025-09-28T10:33:39.993Z",
    "signupSource": "mobile",
    "deviceId": "device_z1jcig",
    "refereeFirstOrder": {
      "orderId": "68fb6ce25435fc657cb04a7b",
      "amount": 1257,
      "completedAt": "2025-10-04T06:44:38.369Z"
    },
    "milestoneOrders": {
      "count": 6,
      "totalAmount": 2258,
      "lastOrderAt": "2025-10-05T14:57:31.587Z"
    }
  },
  "createdAt": "2025-09-29T05:54:59.047Z",
  "updatedAt": "2025-10-05T14:57:31.587Z",
  "__v": 0
}
```

---

### usersettings

**Document Count:** 21

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68e25bd3a9efbdc8bddbd87b","68e25bd3a9efbdc8bddbd... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,226,91,211,169,239,1... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [226,226,226]... |
| _id.buffer.2 | 100.0% | number | 0 | [91,91,91]... |
| _id.buffer.3 | 100.0% | number | 0 | [211,211,211]... |
| _id.buffer.4 | 100.0% | number | 0 | [169,169,169]... |
| _id.buffer.5 | 100.0% | number | 0 | [239,239,239]... |
| _id.buffer.6 | 100.0% | number | 0 | [189,189,189]... |
| _id.buffer.7 | 100.0% | number | 0 | [200,200,200]... |
| _id.buffer.8 | 100.0% | number | 0 | [189,189,189]... |
| _id.buffer.9 | 100.0% | number | 0 | [219,219,219]... |
| _id.buffer.10 | 100.0% | number | 0 | [216,216,216]... |
| _id.buffer.11 | 100.0% | number | 0 | [123,131,133]... |
| user | 100.0% | object | 0 | ["68c1447aa6d2db865ad8245a","68dc35fc3c548fba1d40c... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,68,122,166,210,2... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,220,220]... |
| user.buffer.2 | 100.0% | number | 0 | [68,53,145]... |
| user.buffer.3 | 100.0% | number | 0 | [122,252,237]... |
| user.buffer.4 | 100.0% | number | 0 | [166,60,223]... |
| user.buffer.5 | 100.0% | number | 0 | [210,84,227]... |
| user.buffer.6 | 100.0% | number | 0 | [219,143,213]... |
| user.buffer.7 | 100.0% | number | 0 | [134,186,2]... |
| user.buffer.8 | 100.0% | number | 0 | [90,29,166]... |
| user.buffer.9 | 100.0% | number | 0 | [216,64,172]... |
| user.buffer.10 | 100.0% | number | 0 | [36,198,148]... |
| user.buffer.11 | 100.0% | number | 0 | [90,101,124]... |
| general | 100.0% | object | 0 | [{"language":"en","currency":"INR","timezone":"Asi... |
| general.language | 100.0% | string | 0 | ["en","en","en"]... |
| general.currency | 100.0% | string | 0 | ["INR","INR","INR"]... |
| general.timezone | 100.0% | string | 0 | ["Asia/Kolkata","Asia/Kolkata","Asia/Kolkata"]... |
| general.dateFormat | 100.0% | string | 0 | ["DD/MM/YYYY","DD/MM/YYYY","DD/MM/YYYY"]... |
| general.timeFormat | 100.0% | string | 0 | ["12h","12h","12h"]... |
| general.theme | 100.0% | string | 0 | ["auto","auto","auto"]... |
| notifications | 100.0% | object | 0 | [{"push":{"enabled":true,"orderUpdates":true,"prom... |
| notifications.push | 100.0% | object | 0 | [{"enabled":true,"orderUpdates":true,"promotions":... |
| notifications.push.enabled | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.push.orderUpdates | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.push.promotions | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.push.recommendations | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.push.priceAlerts | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.push.deliveryUpdates | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.push.paymentUpdates | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.push.securityAlerts | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.push.chatMessages | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.email | 100.0% | object | 0 | [{"enabled":true,"newsletters":false,"orderReceipt... |
| notifications.email.enabled | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.email.newsletters | 100.0% | boolean | 0 | [false,false,false]... |
| notifications.email.orderReceipts | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.email.weeklyDigest | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.email.promotions | 100.0% | boolean | 0 | [false,false,false]... |
| notifications.email.securityAlerts | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.email.accountUpdates | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.sms | 100.0% | object | 0 | [{"enabled":true,"orderUpdates":true,"deliveryAler... |
| notifications.sms.enabled | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.sms.orderUpdates | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.sms.deliveryAlerts | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.sms.paymentConfirmations | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.sms.securityAlerts | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.sms.otpMessages | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.inApp | 100.0% | object | 0 | [{"enabled":true,"showBadges":true,"soundEnabled":... |
| notifications.inApp.enabled | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.inApp.showBadges | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.inApp.soundEnabled | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.inApp.vibrationEnabled | 100.0% | boolean | 0 | [true,true,true]... |
| notifications.inApp.bannerStyle | 100.0% | string | 0 | ["BANNER","BANNER","BANNER"]... |
| privacy | 100.0% | object | 0 | [{"profileVisibility":"FRIENDS","showActivity":tru... |
| privacy.profileVisibility | 100.0% | string | 0 | ["FRIENDS","FRIENDS","FRIENDS"]... |
| privacy.showActivity | 100.0% | boolean | 0 | [true,true,true]... |
| privacy.showPurchaseHistory | 100.0% | boolean | 0 | [false,false,false]... |
| privacy.allowMessaging | 100.0% | boolean | 0 | [true,true,true]... |
| privacy.allowFriendRequests | 100.0% | boolean | 0 | [true,true,true]... |
| privacy.dataSharing | 100.0% | object | 0 | [{"shareWithPartners":false,"shareForMarketing":fa... |
| privacy.dataSharing.shareWithPartners | 100.0% | boolean | 0 | [false,false,false]... |
| privacy.dataSharing.shareForMarketing | 100.0% | boolean | 0 | [false,false,false]... |
| privacy.dataSharing.shareForRecommendations | 100.0% | boolean | 0 | [true,true,true]... |
| privacy.dataSharing.shareForAnalytics | 100.0% | boolean | 0 | [true,true,true]... |
| privacy.dataSharing.sharePurchaseData | 100.0% | boolean | 0 | [false,false,false]... |
| privacy.analytics | 100.0% | object | 0 | [{"allowUsageTracking":true,"allowCrashReporting":... |
| privacy.analytics.allowUsageTracking | 100.0% | boolean | 0 | [true,true,true]... |
| privacy.analytics.allowCrashReporting | 100.0% | boolean | 0 | [true,true,true]... |
| privacy.analytics.allowPerformanceTracking | 100.0% | boolean | 0 | [true,true,true]... |
| privacy.analytics.allowLocationTracking | 100.0% | boolean | 0 | [false,false,false]... |
| security | 100.0% | object | 0 | [{"twoFactorAuth":{"enabled":true,"method":"2FA_SM... |
| security.twoFactorAuth | 100.0% | object | 0 | [{"enabled":true,"method":"2FA_SMS","backupCodes":... |
| security.twoFactorAuth.enabled | 100.0% | boolean | 0 | [true,true,true]... |
| security.twoFactorAuth.method | 100.0% | string | 0 | ["2FA_SMS","2FA_SMS","2FA_SMS"]... |
| security.twoFactorAuth.backupCodes | 100.0% | array | 0 | [["ABC123XYZ","DEF456UVW","GHI789RST"],["ABC123XYZ... |
| security.twoFactorAuth.lastUpdated | 100.0% | object | 0 | ["2025-10-05T11:51:47.022Z","2025-10-05T11:51:47.0... |
| security.biometric | 100.0% | object | 0 | [{"fingerprintEnabled":true,"faceIdEnabled":false,... |
| security.biometric.fingerprintEnabled | 100.0% | boolean | 0 | [true,true,true]... |
| security.biometric.faceIdEnabled | 100.0% | boolean | 0 | [false,false,false]... |
| security.biometric.voiceEnabled | 100.0% | boolean | 0 | [false,false,false]... |
| security.biometric.availableMethods | 100.0% | array | 0 | [["FINGERPRINT"],["FINGERPRINT"],["FINGERPRINT"]]... |
| security.sessionManagement | 100.0% | object | 0 | [{"autoLogoutTime":30,"allowMultipleSessions":true... |
| security.sessionManagement.autoLogoutTime | 100.0% | number | 0 | [30,30,30]... |
| security.sessionManagement.allowMultipleSessions | 100.0% | boolean | 0 | [true,true,true]... |
| security.sessionManagement.rememberMe | 100.0% | boolean | 0 | [true,true,true]... |
| security.loginAlerts | 100.0% | boolean | 0 | [true,true,true]... |
| delivery | 100.0% | object | 0 | [{"deliveryInstructions":"Please ring the doorbell... |
| delivery.deliveryInstructions | 100.0% | string | 0 | ["Please ring the doorbell","Please ring the doorb... |
| delivery.deliveryTime | 100.0% | object | 0 | [{"preferred":"ASAP","workingDays":["MON","TUE","W... |
| delivery.deliveryTime.preferred | 100.0% | string | 0 | ["ASAP","ASAP","ASAP"]... |
| delivery.deliveryTime.workingDays | 100.0% | array | 0 | [["MON","TUE","WED","THU","FRI"],["MON","TUE","WED... |
| delivery.contactlessDelivery | 100.0% | boolean | 0 | [true,true,true]... |
| delivery.deliveryNotifications | 100.0% | boolean | 0 | [true,true,true]... |
| payment | 100.0% | object | 0 | [{"autoPayEnabled":false,"paymentPinEnabled":true,... |
| payment.autoPayEnabled | 100.0% | boolean | 0 | [false,false,false]... |
| payment.paymentPinEnabled | 100.0% | boolean | 0 | [true,true,true]... |
| payment.biometricPaymentEnabled | 100.0% | boolean | 0 | [true,true,true]... |
| payment.transactionLimits | 100.0% | object | 0 | [{"dailyLimit":10000,"weeklyLimit":50000,"monthlyL... |
| payment.transactionLimits.dailyLimit | 100.0% | number | 0 | [10000,10000,10000]... |
| payment.transactionLimits.weeklyLimit | 100.0% | number | 0 | [50000,50000,50000]... |
| payment.transactionLimits.monthlyLimit | 100.0% | number | 0 | [200000,200000,200000]... |
| payment.transactionLimits.singleTransactionLimit | 100.0% | number | 0 | [25000,25000,25000]... |
| preferences | 100.0% | object | 0 | [{"startupScreen":"HOME","defaultView":"CARD","aut... |
| preferences.startupScreen | 100.0% | string | 0 | ["HOME","HOME","HOME"]... |
| preferences.defaultView | 100.0% | string | 0 | ["CARD","CARD","CARD"]... |
| preferences.autoRefresh | 100.0% | boolean | 0 | [true,true,true]... |
| preferences.offlineMode | 100.0% | boolean | 0 | [false,false,false]... |
| preferences.dataSaver | 100.0% | boolean | 0 | [false,false,false]... |
| preferences.highQualityImages | 100.0% | boolean | 0 | [true,true,true]... |
| preferences.animations | 100.0% | boolean | 0 | [true,true,true]... |
| preferences.sounds | 100.0% | boolean | 0 | [true,true,true]... |
| preferences.hapticFeedback | 100.0% | boolean | 0 | [true,true,true]... |
| courier | 100.0% | object | 0 | [{"preferredCourier":"any","deliveryTimePreference... |
| courier.preferredCourier | 100.0% | string | 0 | ["any","any","any"]... |
| courier.deliveryTimePreference | 100.0% | object | 0 | [{"weekdays":["MON","TUE","WED","THU","FRI"],"pref... |
| courier.deliveryTimePreference.weekdays | 100.0% | array | 0 | [["MON","TUE","WED","THU","FRI"],["MON","TUE","WED... |
| courier.deliveryTimePreference.preferredTimeSlot | 100.0% | object | 0 | [{"start":"09:00","end":"18:00"},{"start":"09:00",... |
| courier.deliveryTimePreference.preferredTimeSlot.start | 100.0% | string | 0 | ["09:00","09:00","09:00"]... |
| courier.deliveryTimePreference.preferredTimeSlot.end | 100.0% | string | 0 | ["18:00","18:00","18:00"]... |
| courier.deliveryTimePreference.avoidWeekends | 100.0% | boolean | 0 | [false,false,false]... |
| courier.deliveryInstructions | 100.0% | object | 0 | [{"contactlessDelivery":true,"leaveAtDoor":false,"... |
| courier.deliveryInstructions.contactlessDelivery | 100.0% | boolean | 0 | [true,true,true]... |
| courier.deliveryInstructions.leaveAtDoor | 100.0% | boolean | 0 | [false,false,false]... |
| courier.deliveryInstructions.signatureRequired | 100.0% | boolean | 0 | [false,false,false]... |
| courier.deliveryInstructions.callBeforeDelivery | 100.0% | boolean | 0 | [true,true,true]... |
| courier.deliveryInstructions.specificInstructions | 100.0% | string | 0 | ["Please call 5 minutes before delivery","Please c... |
| courier.courierNotifications | 100.0% | object | 0 | [{"smsUpdates":true,"emailUpdates":true,"whatsappU... |
| courier.courierNotifications.smsUpdates | 100.0% | boolean | 0 | [true,true,true]... |
| courier.courierNotifications.emailUpdates | 100.0% | boolean | 0 | [true,true,true]... |
| courier.courierNotifications.whatsappUpdates | 100.0% | boolean | 0 | [false,false,false]... |
| courier.courierNotifications.callUpdates | 100.0% | boolean | 0 | [false,false,false]... |
| lastUpdated | 100.0% | object | 0 | ["2025-10-05T11:51:47.022Z","2025-10-05T11:51:47.0... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-05T11:51:47.242Z","2025-10-05T11:51:47.2... |
| updatedAt | 100.0% | object | 0 | ["2025-10-05T11:51:47.242Z","2025-10-05T11:51:47.2... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true,
    "unique": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68e25bd3a9efbdc8bddbd87b",
  "user": "68c1447aa6d2db865ad8245a",
  "general": {
    "language": "en",
    "currency": "INR",
    "timezone": "Asia/Kolkata",
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "12h",
    "theme": "auto"
  },
  "notifications": {
    "push": {
      "enabled": true,
      "orderUpdates": true,
      "promotions": true,
      "recommendations": true,
      "priceAlerts": true,
      "deliveryUpdates": true,
      "paymentUpdates": true,
      "securityAlerts": true,
      "chatMessages": true
    },
    "email": {
      "enabled": true,
      "newsletters": false,
      "orderReceipts": true,
      "weeklyDigest": true,
      "promotions": false,
      "securityAlerts": true,
      "accountUpdates": true
    },
    "sms": {
      "enabled": true,
      "orderUpdates": true,
      "deliveryAlerts": true,
      "paymentConfirmations": true,
      "securityAlerts": true,
      "otpMessages": true
    },
    "inApp": {
      "enabled": true,
      "showBadges": true,
      "soundEnabled": true,
      "vibrationEnabled": true,
      "bannerStyle": "BANNER"
    }
  },
  "privacy": {
    "profileVisibility": "FRIENDS",
    "showActivity": true,
    "showPurchaseHistory": false,
    "allowMessaging": true,
    "allowFriendRequests": true,
    "dataSharing": {
      "shareWithPartners": false,
      "shareForMarketing": false,
      "shareForRecommendations": true,
      "shareForAnalytics": true,
      "sharePurchaseData": false
    },
    "analytics": {
      "allowUsageTracking": true,
      "allowCrashReporting": true,
      "allowPerformanceTracking": true,
      "allowLocationTracking": false
    }
  },
  "security": {
    "twoFactorAuth": {
      "enabled": true,
      "method": "2FA_SMS",
      "backupCodes": [
        "ABC123XYZ",
        "DEF456UVW",
        "GHI789RST"
      ],
      "lastUpdated": "2025-10-05T11:51:47.022Z"
    },
    "biometric": {
      "fingerprintEnabled": true,
      "faceIdEnabled": false,
      "voiceEnabled": false,
      "availableMethods": [
        "FINGERPRINT"
      ]
    },
    "sessionManagement": {
      "autoLogoutTime": 30,
      "allowMultipleSessions": true,
      "rememberMe": true
    },
    "loginAlerts": true
  },
  "delivery": {
    "deliveryInstructions": "Please ring the doorbell",
    "deliveryTime": {
      "preferred": "ASAP",
      "workingDays": [
        "MON",
        "TUE",
        "WED",
        "THU",
        "FRI"
      ]
    },
    "contactlessDelivery": true,
    "deliveryNotifications": true
  },
  "payment": {
    "autoPayEnabled": false,
    "paymentPinEnabled": true,
    "biometricPaymentEnabled": true,
    "transactionLimits": {
      "dailyLimit": 10000,
      "weeklyLimit": 50000,
      "monthlyLimit": 200000,
      "singleTransactionLimit": 25000
    }
  },
  "preferences": {
    "startupScreen": "HOME",
    "defaultView": "CARD",
    "autoRefresh": true,
    "offlineMode": false,
    "dataSaver": false,
    "highQualityImages": true,
    "animations": true,
    "sounds": true,
    "hapticFeedback": true
  },
  "courier": {
    "preferredCourier": "any",
    "deliveryTimePreference": {
      "weekdays": [
        "MON",
        "TUE",
        "WED",
        "THU",
        "FRI"
      ],
      "preferredTimeSlot": {
        "start": "09:00",
        "end": "18:00"
      },
      "avoidWeekends": false
    },
    "deliveryInstructions": {
      "contactlessDelivery": true,
      "leaveAtDoor": false,
      "signatureRequired": false,
      "callBeforeDelivery": true,
      "specificInstructions": "Please call 5 minutes before delivery"
    },
    "courierNotifications": {
      "smsUpdates": true,
      "emailUpdates": true,
      "whatsappUpdates": false,
      "callUpdates": false
    }
  },
  "lastUpdated": "2025-10-05T11:51:47.022Z",
  "__v": 0,
  "createdAt": "2025-10-05T11:51:47.242Z",
  "updatedAt": "2025-10-05T11:51:47.242Z"
}
```

---

### pricehistories

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "productId": 1
    },
    "name": "productId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "variantId": 1
    },
    "name": "variantId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "recordedAt": 1
    },
    "name": "recordedAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "productId": 1,
      "recordedAt": -1
    },
    "name": "productId_1_recordedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "productId": 1,
      "variantId": 1,
      "recordedAt": -1
    },
    "name": "productId_1_variantId_1_recordedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "changeType": 1,
      "recordedAt": -1
    },
    "name": "changeType_1_recordedAt_-1",
    "background": true
  }
]
```

---

### userstorevouchers

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "voucher": 1
    },
    "name": "voucher_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "assignedAt": 1
    },
    "name": "assignedAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "voucher": 1
    },
    "name": "user_1_voucher_1",
    "background": true,
    "unique": true
  }
]
```

---

### products

**Document Count:** 389

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68ecdae37084846c4f4f71c1","68ecdae37084846c4f4f7... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,236,218,227,112,132,... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [236,236,236]... |
| _id.buffer.2 | 100.0% | number | 0 | [218,218,218]... |
| _id.buffer.3 | 100.0% | number | 0 | [227,227,227]... |
| _id.buffer.4 | 100.0% | number | 0 | [112,112,112]... |
| _id.buffer.5 | 100.0% | number | 0 | [132,132,132]... |
| _id.buffer.6 | 100.0% | number | 0 | [132,132,132]... |
| _id.buffer.7 | 100.0% | number | 0 | [108,108,108]... |
| _id.buffer.8 | 100.0% | number | 0 | [79,79,79]... |
| _id.buffer.9 | 100.0% | number | 0 | [79,79,79]... |
| _id.buffer.10 | 100.0% | number | 0 | [113,113,113]... |
| _id.buffer.11 | 100.0% | number | 0 | [193,194,190]... |
| title | 100.0% | string | 0 | ["Premium Cotton T-Shirt","Denim Jacket","Samsung ... |
| name | 100.0% | string | 0 | ["Premium Cotton T-Shirt","Classic Denim Jacket","... |
| slug | 100.0% | string | 0 | ["premium-cotton-t-shirt-4","classic-denim-jacket-... |
| sku | 100.0% | string | 0 | ["PRE99555004","CLA99555005","SAM99555001"]... |
| brand | 100.0% | string | 0 | ["FashionForward","UrbanStyle","Samsung"]... |
| description | 100.0% | string | 0 | ["100% premium cotton comfortable t-shirt","Vintag... |
| image | 100.0% | string | 0 | ["https://images.unsplash.com/photo-1521572163474-... |
| price | 100.0% | object | 0 | [{"current":1999,"original":2499,"currency":"₹","d... |
| price.current | 100.0% | number | 0 | [1999,3499,89999]... |
| price.original | 100.0% | number | 0 | [2499,4299,99999]... |
| price.currency | 100.0% | string | 0 | ["₹","₹","₹"]... |
| price.discount | 100.0% | number | 0 | [20,19,10]... |
| category | 100.0% | object | 0 | ["68ecdb9f55f086b04de299ef","68ecdb9f55f086b04de29... |
| category.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,236,219,159,85,240,1... |
| category.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| category.buffer.1 | 100.0% | number | 0 | [236,236,236]... |
| category.buffer.2 | 100.0% | number | 0 | [219,219,219]... |
| category.buffer.3 | 100.0% | number | 0 | [159,159,159]... |
| category.buffer.4 | 100.0% | number | 0 | [85,85,85]... |
| category.buffer.5 | 100.0% | number | 0 | [240,240,240]... |
| category.buffer.6 | 100.0% | number | 0 | [134,134,134]... |
| category.buffer.7 | 100.0% | number | 0 | [176,176,176]... |
| category.buffer.8 | 100.0% | number | 0 | [77,77,77]... |
| category.buffer.9 | 100.0% | number | 0 | [226,226,226]... |
| category.buffer.10 | 100.0% | number | 0 | [153,153,153]... |
| category.buffer.11 | 100.0% | number | 0 | [239,239,243]... |
| rating | 100.0% | object | 0 | [{"value":4.4,"count":156},{"value":4.5,"count":98... |
| rating.value | 100.0% | number | 0 | [4.4,4.5,4.7]... |
| rating.count | 100.0% | number | 0 | [156,98,189]... |
| availabilityStatus | 100.0% | string | 0 | ["in_stock","in_stock","in_stock"]... |
| tags | 100.0% | array | 0 | [["t-shirt","cotton","casual","comfortable","every... |
| isRecommended | 100.0% | boolean | 0 | [false,true,true]... |
| isFeatured | 100.0% | boolean | 0 | [true,true,true]... |
| isNewArrival | 100.0% | boolean | 0 | [true,true,true]... |
| arrivalDate | 70.0% | string | 0 | ["2025-09-10","2025-09-12","2025-09-15"]... |
| store | 100.0% | object | 0 | ["68ee29d08c4fa11015d7034b","68ee29d08c4fa11015d70... |
| store.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| store.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| store.buffer.1 | 100.0% | number | 0 | [238,238,238]... |
| store.buffer.2 | 100.0% | number | 0 | [41,41,41]... |
| store.buffer.3 | 100.0% | number | 0 | [208,208,208]... |
| store.buffer.4 | 100.0% | number | 0 | [140,140,140]... |
| store.buffer.5 | 100.0% | number | 0 | [79,79,79]... |
| store.buffer.6 | 100.0% | number | 0 | [161,161,161]... |
| store.buffer.7 | 100.0% | number | 0 | [16,16,16]... |
| store.buffer.8 | 100.0% | number | 0 | [21,21,21]... |
| store.buffer.9 | 100.0% | number | 0 | [215,215,215]... |
| store.buffer.10 | 100.0% | number | 0 | [3,3,3]... |
| store.buffer.11 | 100.0% | number | 0 | [75,75,74]... |
| type | 100.0% | string | 0 | ["product","product","product"]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| inventory | 100.0% | object | 0 | [{"isAvailable":true,"stock":100,"lowStockThreshol... |
| inventory.isAvailable | 100.0% | boolean | 0 | [true,true,true]... |
| inventory.stock | 100.0% | number | 0 | [100,100,100]... |
| inventory.lowStockThreshold | 100.0% | number | 0 | [5,5,5]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-13T10:56:35.625Z","2025-10-13T10:56:35.6... |
| updatedAt | 100.0% | object | 0 | ["2025-11-08T13:20:58.936Z","2025-11-08T13:20:58.9... |
| analytics | 100.0% | object | 0 | [{"views":70},{"views":67},{"views":80}]... |
| analytics.views | 100.0% | number | 0 | [70,67,80]... |
| pricing | 10.0% | object | 0 | [{"basePrice":999,"salePrice":699,"currency":"INR"... |
| pricing.basePrice | 10.0% | number | 0 | [999]... |
| pricing.salePrice | 10.0% | number | 0 | [699]... |
| pricing.currency | 10.0% | string | 0 | ["INR"]... |
| pricing.taxable | 10.0% | boolean | 0 | [true]... |
| pricing.base | 10.0% | number | 0 | [999]... |
| pricing.mrp | 10.0% | number | 0 | [999]... |
| pricing.selling | 10.0% | number | 0 | [699]... |
| images | 100.0% | array | 0 | [["https://images.unsplash.com/photo-1523381210434... |
| ratings | 100.0% | object | 0 | [{"average":4.5,"count":11},{"average":4.5,"count"... |
| ratings.average | 100.0% | number | 0 | [4.5,4.5,4.5]... |
| ratings.count | 100.0% | number | 0 | [11,59,43]... |
| merchantId | 100.0% | object | 0 | ["690f4394ebb40efd01299224","690f4394ebb40efd01299... |
| merchantId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,15,67,148,235,180,14... |
| merchantId.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| merchantId.buffer.1 | 100.0% | number | 0 | [15,15,15]... |
| merchantId.buffer.2 | 100.0% | number | 0 | [67,67,67]... |
| merchantId.buffer.3 | 100.0% | number | 0 | [148,148,148]... |
| merchantId.buffer.4 | 100.0% | number | 0 | [235,235,235]... |
| merchantId.buffer.5 | 100.0% | number | 0 | [180,180,180]... |
| merchantId.buffer.6 | 100.0% | number | 0 | [14,14,14]... |
| merchantId.buffer.7 | 100.0% | number | 0 | [253,253,253]... |
| merchantId.buffer.8 | 100.0% | number | 0 | [1,1,1]... |
| merchantId.buffer.9 | 100.0% | number | 0 | [41,41,41]... |
| merchantId.buffer.10 | 100.0% | number | 0 | [146,146,146]... |
| merchantId.buffer.11 | 100.0% | number | 0 | [36,36,36]... |
| analytics.todayViews | 20.0% | number | 0 | [1,14]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "slug": 1
    },
    "name": "slug_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "barcode": 1
    },
    "name": "barcode_1",
    "background": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "isActive": 1
    },
    "name": "category_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "isActive": 1
    },
    "name": "store_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "brand": 1,
      "isActive": 1
    },
    "name": "brand_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "pricing.selling": 1
    },
    "name": "pricing.selling_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "ratings.average": -1,
      "isActive": 1
    },
    "name": "ratings.average_-1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1,
      "isActive": 1
    },
    "name": "isFeatured_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1,
      "isActive": 1
    },
    "name": "tags_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "inventory.stock": 1,
      "inventory.isAvailable": 1
    },
    "name": "inventory.stock_1_inventory.isAvailable_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "name_text_description_text_tags_text_brand_text",
    "background": true,
    "weights": {
      "brand": 3,
      "description": 1,
      "name": 10,
      "tags": 5
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "pricing.selling": 1,
      "isActive": 1
    },
    "name": "category_1_pricing.selling_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "ratings.average": -1
    },
    "name": "store_1_ratings.average_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1,
      "ratings.average": -1,
      "isActive": 1
    },
    "name": "isFeatured_1_ratings.average_-1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "sku": 1
    },
    "name": "sku_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68ecdae37084846c4f4f71c1",
  "title": "Premium Cotton T-Shirt",
  "name": "Premium Cotton T-Shirt",
  "slug": "premium-cotton-t-shirt-4",
  "sku": "PRE99555004",
  "brand": "FashionForward",
  "description": "100% premium cotton comfortable t-shirt",
  "image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
  "price": {
    "current": 1999,
    "original": 2499,
    "currency": "₹",
    "discount": 20
  },
  "category": "68ecdb9f55f086b04de299ef",
  "rating": {
    "value": 4.4,
    "count": 156
  },
  "availabilityStatus": "in_stock",
  "tags": [
    "t-shirt",
    "cotton",
    "casual",
    "comfortable",
    "everyday"
  ],
  "isRecommended": false,
  "isFeatured": true,
  "isNewArrival": true,
  "arrivalDate": "2025-09-10",
  "store": "68ee29d08c4fa11015d7034b",
  "type": "product",
  "isActive": true,
  "inventory": {
    "isAvailable": true,
    "stock": 100,
    "lowStockThreshold": 5
  },
  "__v": 0,
  "createdAt": "2025-10-13T10:56:35.625Z",
  "updatedAt": "2025-11-08T13:20:58.936Z",
  "analytics": {
    "views": 70
  },
  "pricing": {
    "basePrice": 999,
    "salePrice": 699,
    "currency": "INR",
    "taxable": true,
    "base": 999,
    "mrp": 999,
    "selling": 699
  },
  "images": [
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500"
  ],
  "ratings": {
    "average": 4.5,
    "count": 11
  },
  "merchantId": "690f4394ebb40efd01299224"
}
```

---

### herobanners

**Document Count:** 2

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68ee29d08c4fa11015d7035b","68ee29d08c4fa11015d70... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [238,238]... |
| _id.buffer.2 | 100.0% | number | 0 | [41,41]... |
| _id.buffer.3 | 100.0% | number | 0 | [208,208]... |
| _id.buffer.4 | 100.0% | number | 0 | [140,140]... |
| _id.buffer.5 | 100.0% | number | 0 | [79,79]... |
| _id.buffer.6 | 100.0% | number | 0 | [161,161]... |
| _id.buffer.7 | 100.0% | number | 0 | [16,16]... |
| _id.buffer.8 | 100.0% | number | 0 | [21,21]... |
| _id.buffer.9 | 100.0% | number | 0 | [215,215]... |
| _id.buffer.10 | 100.0% | number | 0 | [3,3]... |
| _id.buffer.11 | 100.0% | number | 0 | [91,92]... |
| title | 100.0% | string | 0 | ["Welcome to Offers","Student Special"]... |
| subtitle | 100.0% | string | 0 | ["Discover amazing deals and save big!","Exclusive... |
| description | 100.0% | string | 0 | ["Find the best offers from your favorite stores a... |
| image | 100.0% | string | 0 | ["https://picsum.photos/800/400.jpg","https://pics... |
| ctaText | 100.0% | string | 0 | ["Explore Offers","View Student Offers"]... |
| ctaAction | 100.0% | string | 0 | ["navigate","navigate"]... |
| ctaUrl | 100.0% | string | 0 | ["/offers","/offers/students"]... |
| backgroundColor | 100.0% | string | 0 | ["#3B82F6","#EC4899"]... |
| isActive | 100.0% | boolean | 0 | [true,true]... |
| priority | 100.0% | number | 0 | [0,0]... |
| validFrom | 100.0% | object | 0 | ["2025-10-14T10:45:35.350Z","2025-10-14T10:45:35.3... |
| validUntil | 100.0% | object | 0 | ["2026-10-14T10:45:35.350Z","2026-04-12T10:45:35.3... |
| targetAudience | 100.0% | object | 0 | [{"userTypes":["all"],"locations":["Delhi","Mumbai... |
| targetAudience.userTypes | 100.0% | array | 0 | [["all"],["student"]]... |
| targetAudience.locations | 100.0% | array | 0 | [["Delhi","Mumbai","Bangalore"],["Delhi","Mumbai",... |
| targetAudience.categories | 100.0% | array | 0 | [["electronics","fashion","food"],["fashion","book... |
| analytics | 100.0% | object | 0 | [{"views":0,"clicks":0,"conversions":0},{"views":0... |
| analytics.views | 100.0% | number | 0 | [0,0]... |
| analytics.clicks | 100.0% | number | 0 | [0,0]... |
| analytics.conversions | 100.0% | number | 0 | [0,0]... |
| metadata | 100.0% | object | 0 | [{"page":"offers","position":"top","size":"medium"... |
| metadata.page | 100.0% | string | 0 | ["offers","offers"]... |
| metadata.position | 100.0% | string | 0 | ["top","middle"]... |
| metadata.size | 100.0% | string | 0 | ["medium","medium"]... |
| metadata.animation | 100.0% | string | 0 | ["fade","fade"]... |
| metadata.tags | 100.0% | array | 0 | [[],[]]... |
| createdBy | 100.0% | object | 0 | ["68ee29d08c4fa11015d70339","68ee29d08c4fa11015d70... |
| createdBy.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| createdBy.buffer.0 | 100.0% | number | 0 | [104,104]... |
| createdBy.buffer.1 | 100.0% | number | 0 | [238,238]... |
| createdBy.buffer.2 | 100.0% | number | 0 | [41,41]... |
| createdBy.buffer.3 | 100.0% | number | 0 | [208,208]... |
| createdBy.buffer.4 | 100.0% | number | 0 | [140,140]... |
| createdBy.buffer.5 | 100.0% | number | 0 | [79,79]... |
| createdBy.buffer.6 | 100.0% | number | 0 | [161,161]... |
| createdBy.buffer.7 | 100.0% | number | 0 | [16,16]... |
| createdBy.buffer.8 | 100.0% | number | 0 | [21,21]... |
| createdBy.buffer.9 | 100.0% | number | 0 | [215,215]... |
| createdBy.buffer.10 | 100.0% | number | 0 | [3,3]... |
| createdBy.buffer.11 | 100.0% | number | 0 | [57,57]... |
| __v | 100.0% | number | 0 | [0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-14T10:45:36.888Z","2025-10-14T10:45:36.8... |
| updatedAt | 100.0% | object | 0 | ["2025-10-14T10:45:36.888Z","2025-10-14T10:45:36.8... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "title": 1
    },
    "name": "title_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "priority": 1
    },
    "name": "priority_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validFrom": 1
    },
    "name": "validFrom_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validUntil": 1
    },
    "name": "validUntil_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.page": 1
    },
    "name": "metadata.page_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.position": 1
    },
    "name": "metadata.position_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdBy": 1
    },
    "name": "createdBy_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1,
      "validFrom": 1,
      "validUntil": 1
    },
    "name": "isActive_1_validFrom_1_validUntil_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.page": 1,
      "metadata.position": 1,
      "isActive": 1
    },
    "name": "metadata.page_1_metadata.position_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "priority": -1,
      "isActive": 1
    },
    "name": "priority_-1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validFrom": 1,
      "validUntil": 1,
      "isActive": 1
    },
    "name": "validFrom_1_validUntil_1_isActive_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68ee29d08c4fa11015d7035b",
  "title": "Welcome to Offers",
  "subtitle": "Discover amazing deals and save big!",
  "description": "Find the best offers from your favorite stores and brands. Limited time deals waiting for you!",
  "image": "https://picsum.photos/800/400.jpg",
  "ctaText": "Explore Offers",
  "ctaAction": "navigate",
  "ctaUrl": "/offers",
  "backgroundColor": "#3B82F6",
  "isActive": true,
  "priority": 0,
  "validFrom": "2025-10-14T10:45:35.350Z",
  "validUntil": "2026-10-14T10:45:35.350Z",
  "targetAudience": {
    "userTypes": [
      "all"
    ],
    "locations": [
      "Delhi",
      "Mumbai",
      "Bangalore"
    ],
    "categories": [
      "electronics",
      "fashion",
      "food"
    ]
  },
  "analytics": {
    "views": 0,
    "clicks": 0,
    "conversions": 0
  },
  "metadata": {
    "page": "offers",
    "position": "top",
    "size": "medium",
    "animation": "fade",
    "tags": []
  },
  "createdBy": "68ee29d08c4fa11015d70339",
  "__v": 0,
  "createdAt": "2025-10-14T10:45:36.888Z",
  "updatedAt": "2025-10-14T10:45:36.888Z"
}
```

---

### carts

**Document Count:** 1

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["691703c1b6353e194e87d88e"]... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,23,3,193,182,53,62,2... |
| _id.buffer.0 | 100.0% | number | 0 | [105]... |
| _id.buffer.1 | 100.0% | number | 0 | [23]... |
| _id.buffer.2 | 100.0% | number | 0 | [3]... |
| _id.buffer.3 | 100.0% | number | 0 | [193]... |
| _id.buffer.4 | 100.0% | number | 0 | [182]... |
| _id.buffer.5 | 100.0% | number | 0 | [53]... |
| _id.buffer.6 | 100.0% | number | 0 | [62]... |
| _id.buffer.7 | 100.0% | number | 0 | [25]... |
| _id.buffer.8 | 100.0% | number | 0 | [78]... |
| _id.buffer.9 | 100.0% | number | 0 | [135]... |
| _id.buffer.10 | 100.0% | number | 0 | [216]... |
| _id.buffer.11 | 100.0% | number | 0 | [142]... |
| user | 100.0% | object | 0 | ["68ef4d41061faaf045222506"]... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,239,77,65,6,31,170,2... |
| user.buffer.0 | 100.0% | number | 0 | [104]... |
| user.buffer.1 | 100.0% | number | 0 | [239]... |
| user.buffer.2 | 100.0% | number | 0 | [77]... |
| user.buffer.3 | 100.0% | number | 0 | [65]... |
| user.buffer.4 | 100.0% | number | 0 | [6]... |
| user.buffer.5 | 100.0% | number | 0 | [31]... |
| user.buffer.6 | 100.0% | number | 0 | [170]... |
| user.buffer.7 | 100.0% | number | 0 | [240]... |
| user.buffer.8 | 100.0% | number | 0 | [69]... |
| user.buffer.9 | 100.0% | number | 0 | [34]... |
| user.buffer.10 | 100.0% | number | 0 | [37]... |
| user.buffer.11 | 100.0% | number | 0 | [6]... |
| items | 100.0% | array | 0 | [[{"product":"6905afbd5f8c7aa14aa299e4","store":"6... |
| totals | 100.0% | object | 0 | [{"subtotal":3596,"tax":179.8,"delivery":0,"discou... |
| totals.subtotal | 100.0% | number | 0 | [3596]... |
| totals.tax | 100.0% | number | 0 | [179.8]... |
| totals.delivery | 100.0% | number | 0 | [0]... |
| totals.discount | 100.0% | number | 0 | [0]... |
| totals.cashback | 100.0% | number | 0 | [71.92]... |
| totals.total | 100.0% | number | 0 | [3775.8]... |
| totals.savings | 100.0% | number | 0 | [1440]... |
| isActive | 100.0% | boolean | 0 | [true]... |
| expiresAt | 100.0% | object | 0 | ["2025-11-21T10:27:36.408Z"]... |
| reservedItems | 100.0% | array | 0 | [[{"productId":"6905afbd5f8c7aa14aa299e4","quantit... |
| lockedItems | 100.0% | array | 0 | [[]]... |
| createdAt | 100.0% | object | 0 | ["2025-11-14T10:26:09.721Z"]... |
| updatedAt | 100.0% | object | 0 | ["2025-11-14T10:27:36.533Z"]... |
| __v | 100.0% | number | 0 | [8]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true,
    "expireAfterSeconds": 0
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "isActive": 1
    },
    "name": "user_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "items.product": 1
    },
    "name": "items.product_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "items.store": 1
    },
    "name": "items.store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "updatedAt": -1
    },
    "name": "updatedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "reservedItems.expiresAt": 1
    },
    "name": "reservedItems.expiresAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "lockedItems.expiresAt": 1
    },
    "name": "lockedItems.expiresAt_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "691703c1b6353e194e87d88e",
  "user": "68ef4d41061faaf045222506",
  "items": [
    {
      "product": "6905afbd5f8c7aa14aa299e4",
      "store": "69059ef3cdd7a84b808a74db",
      "quantity": 1,
      "price": 299,
      "originalPrice": 389,
      "discount": 23,
      "addedAt": "2025-11-14T10:26:16.820Z",
      "_id": "691703c8b6353e194e87d89c"
    },
    {
      "product": "6905b1d4d9053e850f003b37",
      "store": "69059ef3cdd7a84b808a7512",
      "quantity": 1,
      "price": 499,
      "originalPrice": 699,
      "discount": 29,
      "addedAt": "2025-11-14T10:26:38.654Z",
      "_id": "691703deb6353e194e87d938"
    },
    {
      "product": "6905b1d3d9053e850f003b0a",
      "store": "69059ef2cdd7a84b808a74bd",
      "quantity": 1,
      "price": 299,
      "originalPrice": 449,
      "discount": 33,
      "addedAt": "2025-11-14T10:27:02.982Z",
      "_id": "691703f6b6353e194e87da0b"
    },
    {
      "product": "6905b1d3d9053e850f003b04",
      "store": "69059ef2cdd7a84b808a74ae",
      "quantity": 1,
      "price": 2499,
      "originalPrice": 3499,
      "discount": 29,
      "addedAt": "2025-11-14T10:27:36.407Z",
      "_id": "69170418b6353e194e87daac"
    }
  ],
  "totals": {
    "subtotal": 3596,
    "tax": 179.8,
    "delivery": 0,
    "discount": 0,
    "cashback": 71.92,
    "total": 3775.8,
    "savings": 1440
  },
  "isActive": true,
  "expiresAt": "2025-11-21T10:27:36.408Z",
  "reservedItems": [
    {
      "productId": "6905afbd5f8c7aa14aa299e4",
      "quantity": 1,
      "reservedAt": "2025-11-14T10:26:17.052Z",
      "expiresAt": "2025-11-14T10:41:17.051Z",
      "_id": "691703c9b6353e194e87d8a2"
    },
    {
      "productId": "6905b1d4d9053e850f003b37",
      "quantity": 1,
      "reservedAt": "2025-11-14T10:26:38.796Z",
      "expiresAt": "2025-11-14T10:41:38.796Z",
      "_id": "691703deb6353e194e87d940"
    },
    {
      "productId": "6905b1d3d9053e850f003b0a",
      "quantity": 1,
      "reservedAt": "2025-11-14T10:27:03.112Z",
      "expiresAt": "2025-11-14T10:42:03.112Z",
      "_id": "691703f7b6353e194e87da15"
    },
    {
      "productId": "6905b1d3d9053e850f003b04",
      "quantity": 1,
      "reservedAt": "2025-11-14T10:27:36.530Z",
      "expiresAt": "2025-11-14T10:42:36.530Z",
      "_id": "69170418b6353e194e87dab8"
    }
  ],
  "lockedItems": [],
  "createdAt": "2025-11-14T10:26:09.721Z",
  "updatedAt": "2025-11-14T10:27:36.533Z",
  "__v": 8
}
```

---

### stores

**Document Count:** 84

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68ee29d08c4fa11015d7034b","68ee29d08c4fa11015d70... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [238,238,238]... |
| _id.buffer.2 | 100.0% | number | 0 | [41,41,41]... |
| _id.buffer.3 | 100.0% | number | 0 | [208,208,208]... |
| _id.buffer.4 | 100.0% | number | 0 | [140,140,140]... |
| _id.buffer.5 | 100.0% | number | 0 | [79,79,79]... |
| _id.buffer.6 | 100.0% | number | 0 | [161,161,161]... |
| _id.buffer.7 | 100.0% | number | 0 | [16,16,16]... |
| _id.buffer.8 | 100.0% | number | 0 | [21,21,21]... |
| _id.buffer.9 | 100.0% | number | 0 | [215,215,215]... |
| _id.buffer.10 | 100.0% | number | 0 | [3,3,3]... |
| _id.buffer.11 | 100.0% | number | 0 | [75,78,74]... |
| name | 100.0% | string | 0 | ["Fashion Hub","Sports Central","TechMart Electron... |
| slug | 100.0% | string | 0 | ["fashion-hub","sports-central","techmart-electron... |
| logo | 100.0% | string | 0 | ["https://images.unsplash.com/photo-1489987707025-... |
| category | 100.0% | object | 0 | ["68ecdb9f55f086b04de299ef","68ecdb9f55f086b04de29... |
| category.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,236,219,159,85,240,1... |
| category.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| category.buffer.1 | 100.0% | number | 0 | [236,236,236]... |
| category.buffer.2 | 100.0% | number | 0 | [219,219,219]... |
| category.buffer.3 | 100.0% | number | 0 | [159,159,159]... |
| category.buffer.4 | 100.0% | number | 0 | [85,85,85]... |
| category.buffer.5 | 100.0% | number | 0 | [240,240,240]... |
| category.buffer.6 | 100.0% | number | 0 | [134,134,134]... |
| category.buffer.7 | 100.0% | number | 0 | [176,176,176]... |
| category.buffer.8 | 100.0% | number | 0 | [77,77,77]... |
| category.buffer.9 | 100.0% | number | 0 | [226,226,226]... |
| category.buffer.10 | 100.0% | number | 0 | [153,153,153]... |
| category.buffer.11 | 100.0% | number | 0 | [239,239,239]... |
| subCategories | 80.0% | array | 0 | [[],[],[]]... |
| location | 100.0% | object | 0 | [{"address":"Karol Bagh, New Delhi","city":"New De... |
| location.address | 100.0% | string | 0 | ["Karol Bagh, New Delhi","Lajpat Nagar, New Delhi"... |
| location.city | 100.0% | string | 0 | ["New Delhi","New Delhi","New Delhi"]... |
| location.state | 100.0% | string | 0 | ["Delhi","Delhi","Delhi"]... |
| location.pincode | 100.0% | string | 0 | ["110005","110024","110001"]... |
| location.coordinates | 100.0% | array | 0 | [[77.2295,28.6129],[77.209,28.6039],[77.209,28.613... |
| location.deliveryRadius | 100.0% | number | 0 | [5,5,5]... |
| location.landmark | 70.0% | string | 0 | ["Near India Gate","Near Nehru Stadium","Near Conn... |
| ratings | 100.0% | object | 0 | [{"distribution":{"1":20,"2":30,"3":80,"4":250,"5"... |
| ratings.distribution | 100.0% | object | 0 | [{"1":20,"2":30,"3":80,"4":250,"5":600},{"1":5,"2"... |
| ratings.distribution.1 | 100.0% | number | 0 | [20,5,20]... |
| ratings.distribution.2 | 100.0% | number | 0 | [30,15,30]... |
| ratings.distribution.3 | 100.0% | number | 0 | [80,50,100]... |
| ratings.distribution.4 | 100.0% | number | 0 | [250,180,300]... |
| ratings.distribution.5 | 100.0% | number | 0 | [600,500,800]... |
| ratings.average | 100.0% | number | 0 | [4.8,4.6,4.5]... |
| ratings.count | 100.0% | number | 0 | [520,750,1250]... |
| offers | 100.0% | object | 0 | [{"discounts":[],"isPartner":true,"cashback":15,"m... |
| offers.discounts | 80.0% | array | 0 | [[],[],[]]... |
| offers.isPartner | 100.0% | boolean | 0 | [true,true,true]... |
| offers.cashback | 100.0% | number | 0 | [15,8,10]... |
| offers.maxCashback | 100.0% | number | 0 | [150,200,100]... |
| offers.minOrderAmount | 100.0% | number | 0 | [800,1000,500]... |
| offers.partnerLevel | 100.0% | string | 0 | ["platinum","silver","gold"]... |
| operationalInfo | 100.0% | object | 0 | [{"hours":{"monday":{"closed":false},"tuesday":{"c... |
| operationalInfo.hours | 100.0% | object | 0 | [{"monday":{"closed":false},"tuesday":{"closed":fa... |
| operationalInfo.hours.monday | 100.0% | object | 0 | [{"closed":false},{"closed":false},{"closed":false... |
| operationalInfo.hours.monday.closed | 100.0% | boolean | 0 | [false,false,false]... |
| operationalInfo.hours.tuesday | 100.0% | object | 0 | [{"closed":false},{"closed":false},{"closed":false... |
| operationalInfo.hours.tuesday.closed | 100.0% | boolean | 0 | [false,false,false]... |
| operationalInfo.hours.wednesday | 100.0% | object | 0 | [{"closed":false},{"closed":false},{"closed":false... |
| operationalInfo.hours.wednesday.closed | 100.0% | boolean | 0 | [false,false,false]... |
| operationalInfo.hours.thursday | 100.0% | object | 0 | [{"closed":false},{"closed":false},{"closed":false... |
| operationalInfo.hours.thursday.closed | 100.0% | boolean | 0 | [false,false,false]... |
| operationalInfo.hours.friday | 100.0% | object | 0 | [{"closed":false},{"closed":false},{"closed":false... |
| operationalInfo.hours.friday.closed | 100.0% | boolean | 0 | [false,false,false]... |
| operationalInfo.hours.saturday | 100.0% | object | 0 | [{"closed":false},{"closed":false},{"closed":false... |
| operationalInfo.hours.saturday.closed | 100.0% | boolean | 0 | [false,false,false]... |
| operationalInfo.hours.sunday | 100.0% | object | 0 | [{"closed":false},{"closed":false},{"closed":false... |
| operationalInfo.hours.sunday.closed | 100.0% | boolean | 0 | [false,false,false]... |
| operationalInfo.deliveryTime | 100.0% | string | 0 | ["45-60 mins","40-55 mins","30-45 mins"]... |
| operationalInfo.minimumOrder | 100.0% | number | 0 | [800,1000,500]... |
| operationalInfo.deliveryFee | 100.0% | number | 0 | [50,60,40]... |
| operationalInfo.acceptsWalletPayment | 100.0% | boolean | 0 | [true,true,true]... |
| operationalInfo.paymentMethods | 100.0% | array | 0 | [["Cash","Card","UPI","Wallet"],["Cash","Card","UP... |
| operationalInfo.freeDeliveryAbove | 100.0% | number | 0 | [1500,2000,1000]... |
| deliveryCategories | 100.0% | object | 0 | [{"fastDelivery":false,"budgetFriendly":false,"nin... |
| deliveryCategories.fastDelivery | 100.0% | boolean | 0 | [false,false,false]... |
| deliveryCategories.budgetFriendly | 100.0% | boolean | 0 | [false,false,false]... |
| deliveryCategories.ninetyNineStore | 100.0% | boolean | 0 | [false,false,false]... |
| deliveryCategories.premium | 100.0% | boolean | 0 | [false,false,false]... |
| deliveryCategories.organic | 100.0% | boolean | 0 | [false,false,false]... |
| deliveryCategories.alliance | 100.0% | boolean | 0 | [false,false,false]... |
| deliveryCategories.lowestPrice | 100.0% | boolean | 0 | [false,false,false]... |
| deliveryCategories.mall | 100.0% | boolean | 0 | [false,false,false]... |
| deliveryCategories.cashStore | 100.0% | boolean | 0 | [false,false,false]... |
| analytics | 100.0% | object | 0 | [{"totalOrders":0,"totalRevenue":0,"avgOrderValue"... |
| analytics.totalOrders | 100.0% | number | 0 | [0,0,0]... |
| analytics.totalRevenue | 100.0% | number | 0 | [0,0,0]... |
| analytics.avgOrderValue | 100.0% | number | 0 | [0,0,0]... |
| analytics.repeatCustomers | 100.0% | number | 0 | [0,0,0]... |
| analytics.popularProducts | 80.0% | array | 0 | [[],[],[]]... |
| analytics.peakHours | 80.0% | array | 0 | [[],[],[]]... |
| analytics.monthlyStats | 80.0% | array | 0 | [[],[],[]]... |
| tags | 100.0% | array | 0 | [["Fashion","Clothing","Accessories","Shoes","Bags... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| isFeatured | 100.0% | boolean | 0 | [true,false,true]... |
| isVerified | 100.0% | boolean | 0 | [true,true,true]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-14T10:45:36.769Z","2025-10-14T10:45:36.7... |
| updatedAt | 100.0% | object | 0 | ["2025-11-14T10:43:56.123Z","2025-11-08T13:20:59.1... |
| banner | 70.0% | string | 0 | ["https://images.unsplash.com/photo-1445205170230-... |
| contact | 100.0% | object | 0 | [{"phone":"+91-11-2345-6789","email":"hello@fashio... |
| contact.phone | 100.0% | string | 0 | ["+91-11-2345-6789","+91-11-2456-7890","+91-11-223... |
| contact.email | 100.0% | string | 0 | ["hello@fashionhub.com","support@sportscentral.com... |
| contact.website | 70.0% | string | 0 | ["www.fashionhub.com","www.sportscentral.com","www... |
| contact.whatsapp | 70.0% | string | 0 | ["+91-98765-43211","+91-98765-43212","+91-98765-43... |
| description | 100.0% | string | 0 | ["Trendy fashion for everyone. From casual wear to... |
| videos | 100.0% | array | 0 | [[{"url":"https://commondatastorage.googleapis.com... |
| merchantId | 100.0% | object | 0 | ["690f4394ebb40efd01299224","690f4394ebb40efd01299... |
| merchantId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,15,67,148,235,180,14... |
| merchantId.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| merchantId.buffer.1 | 100.0% | number | 0 | [15,15,15]... |
| merchantId.buffer.2 | 100.0% | number | 0 | [67,67,67]... |
| merchantId.buffer.3 | 100.0% | number | 0 | [148,148,148]... |
| merchantId.buffer.4 | 100.0% | number | 0 | [235,235,235]... |
| merchantId.buffer.5 | 100.0% | number | 0 | [180,180,180]... |
| merchantId.buffer.6 | 100.0% | number | 0 | [14,14,14]... |
| merchantId.buffer.7 | 100.0% | number | 0 | [253,253,253]... |
| merchantId.buffer.8 | 100.0% | number | 0 | [1,1,1]... |
| merchantId.buffer.9 | 100.0% | number | 0 | [41,41,41]... |
| merchantId.buffer.10 | 100.0% | number | 0 | [146,146,146]... |
| merchantId.buffer.11 | 100.0% | number | 0 | [36,36,36]... |
| owner | 100.0% | object | 0 | ["690f4394ebb40efd01299224","690f4394ebb40efd01299... |
| owner.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,15,67,148,235,180,14... |
| owner.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| owner.buffer.1 | 100.0% | number | 0 | [15,15,15]... |
| owner.buffer.2 | 100.0% | number | 0 | [67,67,67]... |
| owner.buffer.3 | 100.0% | number | 0 | [148,148,148]... |
| owner.buffer.4 | 100.0% | number | 0 | [235,235,235]... |
| owner.buffer.5 | 100.0% | number | 0 | [180,180,180]... |
| owner.buffer.6 | 100.0% | number | 0 | [14,14,14]... |
| owner.buffer.7 | 100.0% | number | 0 | [253,253,253]... |
| owner.buffer.8 | 100.0% | number | 0 | [1,1,1]... |
| owner.buffer.9 | 100.0% | number | 0 | [41,41,41]... |
| owner.buffer.10 | 100.0% | number | 0 | [146,146,146]... |
| owner.buffer.11 | 100.0% | number | 0 | [36,37,36]... |
| bookingConfig | 100.0% | object | 0 | [{"enabled":false,"requiresAdvanceBooking":false,"... |
| bookingConfig.enabled | 100.0% | boolean | 0 | [false,false,false]... |
| bookingConfig.requiresAdvanceBooking | 100.0% | boolean | 0 | [false,false,false]... |
| bookingConfig.allowWalkIn | 100.0% | boolean | 0 | [true,true,true]... |
| bookingConfig.slotDuration | 100.0% | number | 0 | [30,30,30]... |
| bookingConfig.advanceBookingDays | 100.0% | number | 0 | [7,7,7]... |
| bookingConfig.workingHours | 100.0% | object | 0 | [{"start":"09:00","end":"21:00"},{"start":"09:00",... |
| bookingConfig.workingHours.start | 100.0% | string | 0 | ["09:00","09:00","09:00"]... |
| bookingConfig.workingHours.end | 100.0% | string | 0 | ["21:00","21:00","21:00"]... |
| bookingType | 100.0% | string | 0 | ["RETAIL","RETAIL","RETAIL"]... |
| consultationTypes | 100.0% | array | 0 | [[],[],[]]... |
| serviceTypes | 100.0% | array | 0 | [[],[],[]]... |
| storeVisitConfig | 100.0% | object | 0 | [{"enabled":true,"features":["visit_scheduling","l... |
| storeVisitConfig.enabled | 100.0% | boolean | 0 | [true,true,true]... |
| storeVisitConfig.features | 100.0% | array | 0 | [["visit_scheduling","live_availability"],["visit_... |
| storeVisitConfig.maxVisitorsPerSlot | 100.0% | number | 0 | [20,20,20]... |
| storeVisitConfig.averageVisitDuration | 100.0% | number | 0 | [30,30,30]... |
| operationalInfo.hours.monday.open | 50.0% | string | 0 | ["10:00","10:00","10:00"]... |
| operationalInfo.hours.monday.close | 50.0% | string | 0 | ["22:00","22:00","22:00"]... |
| operationalInfo.hours.tuesday.open | 50.0% | string | 0 | ["10:00","10:00","10:00"]... |
| operationalInfo.hours.tuesday.close | 50.0% | string | 0 | ["22:00","22:00","22:00"]... |
| operationalInfo.hours.wednesday.open | 50.0% | string | 0 | ["10:00","10:00","10:00"]... |
| operationalInfo.hours.wednesday.close | 50.0% | string | 0 | ["22:00","22:00","22:00"]... |
| operationalInfo.hours.thursday.open | 50.0% | string | 0 | ["10:00","10:00","10:00"]... |
| operationalInfo.hours.thursday.close | 50.0% | string | 0 | ["22:00","22:00","22:00"]... |
| operationalInfo.hours.friday.open | 50.0% | string | 0 | ["10:00","10:00","10:00"]... |
| operationalInfo.hours.friday.close | 50.0% | string | 0 | ["22:00","22:00","22:00"]... |
| operationalInfo.hours.saturday.open | 50.0% | string | 0 | ["10:00","10:00","10:00"]... |
| operationalInfo.hours.saturday.close | 50.0% | string | 0 | ["22:00","22:00","22:00"]... |
| operationalInfo.hours.sunday.open | 50.0% | string | 0 | ["11:00","11:00","11:00"]... |
| operationalInfo.hours.sunday.close | 50.0% | string | 0 | ["21:00","21:00","21:00"]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "slug": 1
    },
    "name": "slug_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "location.coordinates": "2dsphere"
    },
    "name": "location.coordinates_2dsphere",
    "background": true,
    "2dsphereIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "isActive": 1
    },
    "name": "category_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "location.city": 1,
      "isActive": 1
    },
    "name": "location.city_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "location.pincode": 1
    },
    "name": "location.pincode_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "ratings.average": -1,
      "isActive": 1
    },
    "name": "ratings.average_-1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1,
      "isActive": 1
    },
    "name": "isFeatured_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "offers.isPartner": 1,
      "isActive": 1
    },
    "name": "offers.isPartner_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1,
      "isActive": 1
    },
    "name": "tags_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "location.city": 1,
      "isActive": 1
    },
    "name": "category_1_location.city_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "offers.isPartner": 1,
      "ratings.average": -1
    },
    "name": "offers.isPartner_1_ratings.average_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "deliveryCategories.fastDelivery": 1,
      "isActive": 1
    },
    "name": "deliveryCategories.fastDelivery_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "deliveryCategories.budgetFriendly": 1,
      "isActive": 1
    },
    "name": "deliveryCategories.budgetFriendly_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "deliveryCategories.premium": 1,
      "isActive": 1
    },
    "name": "deliveryCategories.premium_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "deliveryCategories.organic": 1,
      "isActive": 1
    },
    "name": "deliveryCategories.organic_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "deliveryCategories.alliance": 1,
      "isActive": 1
    },
    "name": "deliveryCategories.alliance_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "deliveryCategories.lowestPrice": 1,
      "isActive": 1
    },
    "name": "deliveryCategories.lowestPrice_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "deliveryCategories.mall": 1,
      "isActive": 1
    },
    "name": "deliveryCategories.mall_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "deliveryCategories.cashStore": 1,
      "isActive": 1
    },
    "name": "deliveryCategories.cashStore_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "hasMenu": 1,
      "isActive": 1
    },
    "name": "hasMenu_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "bookingType": 1,
      "isActive": 1
    },
    "name": "bookingType_1_isActive_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68ee29d08c4fa11015d7034b",
  "name": "Fashion Hub",
  "slug": "fashion-hub",
  "logo": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop",
  "category": "68ecdb9f55f086b04de299ef",
  "subCategories": [],
  "location": {
    "address": "Karol Bagh, New Delhi",
    "city": "New Delhi",
    "state": "Delhi",
    "pincode": "110005",
    "coordinates": [
      77.2295,
      28.6129
    ],
    "deliveryRadius": 5,
    "landmark": "Near India Gate"
  },
  "ratings": {
    "distribution": {
      "1": 20,
      "2": 30,
      "3": 80,
      "4": 250,
      "5": 600
    },
    "average": 4.8,
    "count": 520
  },
  "offers": {
    "discounts": [],
    "isPartner": true,
    "cashback": 15,
    "maxCashback": 150,
    "minOrderAmount": 800,
    "partnerLevel": "platinum"
  },
  "operationalInfo": {
    "hours": {
      "monday": {
        "closed": false
      },
      "tuesday": {
        "closed": false
      },
      "wednesday": {
        "closed": false
      },
      "thursday": {
        "closed": false
      },
      "friday": {
        "closed": false
      },
      "saturday": {
        "closed": false
      },
      "sunday": {
        "closed": false
      }
    },
    "deliveryTime": "45-60 mins",
    "minimumOrder": 800,
    "deliveryFee": 50,
    "acceptsWalletPayment": true,
    "paymentMethods": [
      "Cash",
      "Card",
      "UPI",
      "Wallet"
    ],
    "freeDeliveryAbove": 1500
  },
  "deliveryCategories": {
    "fastDelivery": false,
    "budgetFriendly": false,
    "ninetyNineStore": false,
    "premium": false,
    "organic": false,
    "alliance": false,
    "lowestPrice": false,
    "mall": false,
    "cashStore": false
  },
  "analytics": {
    "totalOrders": 0,
    "totalRevenue": 0,
    "avgOrderValue": 0,
    "repeatCustomers": 0,
    "popularProducts": [],
    "peakHours": [],
    "monthlyStats": []
  },
  "tags": [
    "Fashion",
    "Clothing",
    "Accessories",
    "Shoes",
    "Bags",
    "fashion",
    "clothing",
    "apparel"
  ],
  "isActive": true,
  "isFeatured": true,
  "isVerified": true,
  "__v": 0,
  "createdAt": "2025-10-14T10:45:36.769Z",
  "updatedAt": "2025-11-14T10:43:56.123Z",
  "banner": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=400&fit=crop",
  "contact": {
    "phone": "+91-11-2345-6789",
    "email": "hello@fashionhub.com",
    "website": "www.fashionhub.com",
    "whatsapp": "+91-98765-43211"
  },
  "description": "Trendy fashion for everyone. From casual wear to formal attire, discover the latest styles and brands at unbeatable prices.",
  "videos": [
    {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      "thumbnail": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=300&fit=crop",
      "title": "Fashion Hub - New Collection 2025",
      "duration": 40
    },
    {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      "thumbnail": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop",
      "title": "Summer Fashion Trends",
      "duration": 35
    }
  ],
  "merchantId": "690f4394ebb40efd01299224",
  "owner": "690f4394ebb40efd01299224",
  "bookingConfig": {
    "enabled": false,
    "requiresAdvanceBooking": false,
    "allowWalkIn": true,
    "slotDuration": 30,
    "advanceBookingDays": 7,
    "workingHours": {
      "start": "09:00",
      "end": "21:00"
    }
  },
  "bookingType": "RETAIL",
  "consultationTypes": [],
  "serviceTypes": [],
  "storeVisitConfig": {
    "enabled": true,
    "features": [
      "visit_scheduling",
      "live_availability"
    ],
    "maxVisitorsPerSlot": 20,
    "averageVisitDuration": 30
  }
}
```

---

### socialmediaposts

**Document Count:** 2

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68df886d8408627d6f242a12","68eb20b1fa01687f36a9b... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,223,136,109,132,8,98... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [223,235]... |
| _id.buffer.2 | 100.0% | number | 0 | [136,32]... |
| _id.buffer.3 | 100.0% | number | 0 | [109,177]... |
| _id.buffer.4 | 100.0% | number | 0 | [132,250]... |
| _id.buffer.5 | 100.0% | number | 0 | [8,1]... |
| _id.buffer.6 | 100.0% | number | 0 | [98,104]... |
| _id.buffer.7 | 100.0% | number | 0 | [125,127]... |
| _id.buffer.8 | 100.0% | number | 0 | [111,54]... |
| _id.buffer.9 | 100.0% | number | 0 | [36,169]... |
| _id.buffer.10 | 100.0% | number | 0 | [42,187]... |
| _id.buffer.11 | 100.0% | number | 0 | [18,63]... |
| user | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c","68c145d5f016515d8eb31... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| user.buffer.0 | 100.0% | number | 0 | [104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [69,69]... |
| user.buffer.3 | 100.0% | number | 0 | [213,213]... |
| user.buffer.4 | 100.0% | number | 0 | [240,240]... |
| user.buffer.5 | 100.0% | number | 0 | [22,22]... |
| user.buffer.6 | 100.0% | number | 0 | [81,81]... |
| user.buffer.7 | 100.0% | number | 0 | [93,93]... |
| user.buffer.8 | 100.0% | number | 0 | [142,142]... |
| user.buffer.9 | 100.0% | number | 0 | [179,179]... |
| user.buffer.10 | 100.0% | number | 0 | [28,28]... |
| user.buffer.11 | 100.0% | number | 0 | [12,12]... |
| platform | 100.0% | string | 0 | ["instagram","instagram"]... |
| postUrl | 100.0% | string | 0 | ["https://instagram.com/p/test123","https://www.in... |
| status | 100.0% | string | 0 | ["pending","pending"]... |
| cashbackAmount | 100.0% | number | 0 | [0,0]... |
| cashbackPercentage | 100.0% | number | 0 | [5,5]... |
| submittedAt | 100.0% | object | 0 | ["2025-10-03T08:25:17.890Z","2025-10-12T03:29:53.8... |
| metadata | 100.0% | object | 0 | [{"orderNumber":"","postId":"test123"},{"orderNumb... |
| metadata.orderNumber | 100.0% | string | 0 | ["",""]... |
| metadata.postId | 50.0% | string | 0 | ["test123"]... |
| createdAt | 100.0% | object | 0 | ["2025-10-03T08:25:17.898Z","2025-10-12T03:29:53.8... |
| updatedAt | 100.0% | object | 0 | ["2025-10-03T08:25:17.898Z","2025-10-12T03:29:53.8... |
| __v | 100.0% | number | 0 | [0,0]... |
| order | 50.0% | object | 0 | ["68e24b6d4381285a768357e4"]... |
| order.buffer | 50.0% | object | 0 | [{"type":"Buffer","data":[104,226,75,109,67,129,40... |
| order.buffer.0 | 50.0% | number | 0 | [104]... |
| order.buffer.1 | 50.0% | number | 0 | [226]... |
| order.buffer.2 | 50.0% | number | 0 | [75]... |
| order.buffer.3 | 50.0% | number | 0 | [109]... |
| order.buffer.4 | 50.0% | number | 0 | [67]... |
| order.buffer.5 | 50.0% | number | 0 | [129]... |
| order.buffer.6 | 50.0% | number | 0 | [40]... |
| order.buffer.7 | 50.0% | number | 0 | [90]... |
| order.buffer.8 | 50.0% | number | 0 | [118]... |
| order.buffer.9 | 50.0% | number | 0 | [131]... |
| order.buffer.10 | 50.0% | number | 0 | [87]... |
| order.buffer.11 | 50.0% | number | 0 | [228]... |
| submissionIp | 50.0% | string | 0 | ["127.0.0.1"]... |
| userAgent | 50.0% | string | 0 | ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "order": 1
    },
    "name": "order_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "platform": 1
    },
    "name": "platform_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "submittedAt": 1
    },
    "name": "submittedAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "submittedAt": 1
    },
    "name": "status_1_submittedAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "platform": 1,
      "status": 1
    },
    "name": "platform_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "submissionIp": 1
    },
    "name": "submissionIp_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "deviceFingerprint": 1
    },
    "name": "deviceFingerprint_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "order": 1
    },
    "name": "user_1_order_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "submissionIp": 1,
      "submittedAt": -1
    },
    "name": "submissionIp_1_submittedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "submittedAt": -1
    },
    "name": "user_1_submittedAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68df886d8408627d6f242a12",
  "user": "68c145d5f016515d8eb31c0c",
  "platform": "instagram",
  "postUrl": "https://instagram.com/p/test123",
  "status": "pending",
  "cashbackAmount": 0,
  "cashbackPercentage": 5,
  "submittedAt": "2025-10-03T08:25:17.890Z",
  "metadata": {
    "orderNumber": "",
    "postId": "test123"
  },
  "createdAt": "2025-10-03T08:25:17.898Z",
  "updatedAt": "2025-10-03T08:25:17.898Z",
  "__v": 0
}
```

---

### pricealerts

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "userId": 1
    },
    "name": "userId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "productId": 1
    },
    "name": "productId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "variantId": 1
    },
    "name": "variantId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "productId": 1,
      "variantId": 1,
      "status": 1
    },
    "name": "productId_1_variantId_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "status": 1
    },
    "name": "userId_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "expiresAt": 1
    },
    "name": "status_1_expiresAt_1",
    "background": true
  }
]
```

---

### discountusages

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "discount": 1
    },
    "name": "discount_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "order": 1
    },
    "name": "order_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "usedAt": 1
    },
    "name": "usedAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "discount": 1,
      "user": 1
    },
    "name": "discount_1_user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "usedAt": -1
    },
    "name": "user_1_usedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "discount": 1,
      "usedAt": -1
    },
    "name": "discount_1_usedAt_-1",
    "background": true
  }
]
```

---

### userchallengeprogresses

**Document Count:** 34

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68fb5fd770cd9d7de50e6544","68fb5fd770cd9d7de50e6... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,95,215,112,205,1... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [251,251,251]... |
| _id.buffer.2 | 100.0% | number | 0 | [95,95,95]... |
| _id.buffer.3 | 100.0% | number | 0 | [215,215,215]... |
| _id.buffer.4 | 100.0% | number | 0 | [112,112,112]... |
| _id.buffer.5 | 100.0% | number | 0 | [205,205,205]... |
| _id.buffer.6 | 100.0% | number | 0 | [157,157,157]... |
| _id.buffer.7 | 100.0% | number | 0 | [125,125,125]... |
| _id.buffer.8 | 100.0% | number | 0 | [229,229,229]... |
| _id.buffer.9 | 100.0% | number | 0 | [14,14,14]... |
| _id.buffer.10 | 100.0% | number | 0 | [101,101,101]... |
| _id.buffer.11 | 100.0% | number | 0 | [68,70,74]... |
| user | 100.0% | object | 0 | ["68ee29d08c4fa11015d70339","68ef4c432629859fd1137... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [238,239,239]... |
| user.buffer.2 | 100.0% | number | 0 | [41,76,77]... |
| user.buffer.3 | 100.0% | number | 0 | [208,67,65]... |
| user.buffer.4 | 100.0% | number | 0 | [140,38,6]... |
| user.buffer.5 | 100.0% | number | 0 | [79,41,31]... |
| user.buffer.6 | 100.0% | number | 0 | [161,133,170]... |
| user.buffer.7 | 100.0% | number | 0 | [16,159,240]... |
| user.buffer.8 | 100.0% | number | 0 | [21,209,69]... |
| user.buffer.9 | 100.0% | number | 0 | [215,19,34]... |
| user.buffer.10 | 100.0% | number | 0 | [3,114,37]... |
| user.buffer.11 | 100.0% | number | 0 | [57,0,6]... |
| challenge | 100.0% | object | 0 | ["68fb5fd770cd9d7de50e6531","68fb5fd770cd9d7de50e6... |
| challenge.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,95,215,112,205,1... |
| challenge.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| challenge.buffer.1 | 100.0% | number | 0 | [251,251,251]... |
| challenge.buffer.2 | 100.0% | number | 0 | [95,95,95]... |
| challenge.buffer.3 | 100.0% | number | 0 | [215,215,215]... |
| challenge.buffer.4 | 100.0% | number | 0 | [112,112,112]... |
| challenge.buffer.5 | 100.0% | number | 0 | [205,205,205]... |
| challenge.buffer.6 | 100.0% | number | 0 | [157,157,157]... |
| challenge.buffer.7 | 100.0% | number | 0 | [125,125,125]... |
| challenge.buffer.8 | 100.0% | number | 0 | [229,229,229]... |
| challenge.buffer.9 | 100.0% | number | 0 | [14,14,14]... |
| challenge.buffer.10 | 100.0% | number | 0 | [101,101,101]... |
| challenge.buffer.11 | 100.0% | number | 0 | [49,50,51]... |
| progress | 100.0% | number | 0 | [1,3,2]... |
| target | 100.0% | number | 0 | [1,3,2]... |
| completed | 100.0% | boolean | 0 | [true,true,true]... |
| completedAt | 100.0% | object | 0 | ["2025-10-18T13:26:08.414Z","2025-10-19T16:11:10.7... |
| rewardsClaimed | 100.0% | boolean | 0 | [false,false,false]... |
| startedAt | 100.0% | object | 0 | ["2025-10-21T08:29:51.035Z","2025-10-22T18:28:45.7... |
| lastUpdatedAt | 100.0% | object | 0 | ["2025-10-18T13:26:08.414Z","2025-10-19T16:11:10.7... |
| progressHistory | 100.0% | array | 0 | [[{"amount":1,"timestamp":"2025-10-16T14:43:03.764... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-24T11:15:35.916Z","2025-10-24T11:15:35.9... |
| updatedAt | 100.0% | object | 0 | ["2025-11-04T10:55:15.762Z","2025-11-04T10:55:15.8... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "challenge": 1
    },
    "name": "challenge_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "completed": 1
    },
    "name": "completed_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "rewardsClaimed": 1
    },
    "name": "rewardsClaimed_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "challenge": 1
    },
    "name": "user_1_challenge_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "completed": 1,
      "rewardsClaimed": 1
    },
    "name": "user_1_completed_1_rewardsClaimed_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "challenge": 1,
      "completed": 1
    },
    "name": "challenge_1_completed_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68fb5fd770cd9d7de50e6544",
  "user": "68ee29d08c4fa11015d70339",
  "challenge": "68fb5fd770cd9d7de50e6531",
  "progress": 1,
  "target": 1,
  "completed": true,
  "completedAt": "2025-10-18T13:26:08.414Z",
  "rewardsClaimed": false,
  "startedAt": "2025-10-21T08:29:51.035Z",
  "lastUpdatedAt": "2025-10-18T13:26:08.414Z",
  "progressHistory": [
    {
      "amount": 1,
      "timestamp": "2025-10-16T14:43:03.764Z",
      "source": "action_1",
      "_id": "68fb5fd770cd9d7de50e6545"
    }
  ],
  "__v": 0,
  "createdAt": "2025-10-24T11:15:35.916Z",
  "updatedAt": "2025-11-04T10:55:15.762Z"
}
```

---

### stock_history

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "product": 1
    },
    "name": "product_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "changeType": 1
    },
    "name": "changeType_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "order": 1
    },
    "name": "order_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "timestamp": 1
    },
    "name": "timestamp_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "product": 1,
      "timestamp": -1
    },
    "name": "product_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "timestamp": -1
    },
    "name": "store_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "changeType": 1,
      "timestamp": -1
    },
    "name": "changeType_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "timestamp": -1
    },
    "name": "user_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "product": 1,
      "variant.type": 1,
      "variant.value": 1,
      "timestamp": -1
    },
    "name": "product_1_variant.type_1_variant.value_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "changeType": 1,
      "timestamp": -1
    },
    "name": "store_1_changeType_1_timestamp_-1",
    "background": true
  }
]
```

---

### wallets

**Document Count:** 21

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68db478631cb4ce477209cdb","68dc36c13c548fba1d40c... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,219,71,134,49,203,76... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [219,220,222]... |
| _id.buffer.2 | 100.0% | number | 0 | [71,54,75]... |
| _id.buffer.3 | 100.0% | number | 0 | [134,193,220]... |
| _id.buffer.4 | 100.0% | number | 0 | [49,60,136]... |
| _id.buffer.5 | 100.0% | number | 0 | [203,84,194]... |
| _id.buffer.6 | 100.0% | number | 0 | [76,143,216]... |
| _id.buffer.7 | 100.0% | number | 0 | [228,186,70]... |
| _id.buffer.8 | 100.0% | number | 0 | [119,29,121]... |
| _id.buffer.9 | 100.0% | number | 0 | [32,64,168]... |
| _id.buffer.10 | 100.0% | number | 0 | [156,198,216]... |
| _id.buffer.11 | 100.0% | number | 0 | [219,172,158]... |
| user | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c","68dc34e83c548fba1d40c... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,220,193]... |
| user.buffer.2 | 100.0% | number | 0 | [69,52,68]... |
| user.buffer.3 | 100.0% | number | 0 | [213,232,122]... |
| user.buffer.4 | 100.0% | number | 0 | [240,60,166]... |
| user.buffer.5 | 100.0% | number | 0 | [22,84,210]... |
| user.buffer.6 | 100.0% | number | 0 | [81,143,219]... |
| user.buffer.7 | 100.0% | number | 0 | [93,186,134]... |
| user.buffer.8 | 100.0% | number | 0 | [142,29,90]... |
| user.buffer.9 | 100.0% | number | 0 | [179,64,216]... |
| user.buffer.10 | 100.0% | number | 0 | [28,197,36]... |
| user.buffer.11 | 100.0% | number | 0 | [12,114,89]... |
| balance | 100.0% | object | 0 | [{"total":8116,"available":6903,"pending":0,"paybi... |
| balance.total | 100.0% | number | 0 | [8116,3654,4705]... |
| balance.available | 100.0% | number | 0 | [6903,3654,4705]... |
| balance.pending | 100.0% | number | 0 | [0,0,0]... |
| balance.paybill | 10.0% | number | 0 | [1213]... |
| currency | 100.0% | string | 0 | ["RC","RC","RC"]... |
| statistics | 100.0% | object | 0 | [{"totalEarned":5074,"totalSpent":3199,"totalCashb... |
| statistics.totalEarned | 100.0% | number | 0 | [5074,5510,6249]... |
| statistics.totalSpent | 100.0% | number | 0 | [3199,1856,1544]... |
| statistics.totalCashback | 100.0% | number | 0 | [0,0,0]... |
| statistics.totalRefunds | 100.0% | number | 0 | [0,0,0]... |
| statistics.totalTopups | 100.0% | number | 0 | [5120,0,0]... |
| statistics.totalWithdrawals | 100.0% | number | 0 | [0,0,0]... |
| statistics.totalPayBill | 10.0% | number | 0 | [1121]... |
| statistics.totalPayBillDiscount | 10.0% | number | 0 | [92]... |
| limits | 100.0% | object | 0 | [{"maxBalance":100000,"minWithdrawal":100,"dailySp... |
| limits.maxBalance | 100.0% | number | 0 | [100000,100000,100000]... |
| limits.minWithdrawal | 100.0% | number | 0 | [100,100,100]... |
| limits.dailySpendLimit | 100.0% | number | 0 | [10000,10000,10000]... |
| limits.dailySpent | 100.0% | number | 0 | [0,0,0]... |
| limits.lastResetDate | 20.0% | object | 0 | ["2025-10-11T09:41:57.437Z","2025-09-30T20:00:01.7... |
| settings | 100.0% | object | 0 | [{"autoTopup":false,"autoTopupThreshold":100,"auto... |
| settings.autoTopup | 100.0% | boolean | 0 | [false,false,false]... |
| settings.autoTopupThreshold | 100.0% | number | 0 | [100,100,100]... |
| settings.autoTopupAmount | 100.0% | number | 0 | [500,500,500]... |
| settings.lowBalanceAlert | 100.0% | boolean | 0 | [true,true,true]... |
| settings.lowBalanceThreshold | 100.0% | number | 0 | [100,50,50]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| isFrozen | 100.0% | boolean | 0 | [false,false,false]... |
| createdAt | 100.0% | object | 0 | ["2025-09-30T02:59:18.628Z","2025-09-30T20:00:01.7... |
| updatedAt | 100.0% | object | 0 | ["2025-10-11T16:13:38.518Z","2025-10-02T09:54:37.8... |
| __v | 20.0% | number | 0 | [0,0]... |
| lastTransactionAt | 10.0% | object | 0 | ["2025-10-11T16:13:38.517Z"]... |
| coins | 100.0% | array | 0 | [[{"type":"wasil","amount":3500,"isActive":true,"e... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFrozen": 1
    },
    "name": "isFrozen_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1,
      "isFrozen": 1
    },
    "name": "isActive_1_isFrozen_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "balance.available": 1
    },
    "name": "balance.available_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "lastTransactionAt": -1
    },
    "name": "lastTransactionAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68db478631cb4ce477209cdb",
  "user": "68c145d5f016515d8eb31c0c",
  "balance": {
    "total": 8116,
    "available": 6903,
    "pending": 0,
    "paybill": 1213
  },
  "currency": "RC",
  "statistics": {
    "totalEarned": 5074,
    "totalSpent": 3199,
    "totalCashback": 0,
    "totalRefunds": 0,
    "totalTopups": 5120,
    "totalWithdrawals": 0,
    "totalPayBill": 1121,
    "totalPayBillDiscount": 92
  },
  "limits": {
    "maxBalance": 100000,
    "minWithdrawal": 100,
    "dailySpendLimit": 10000,
    "dailySpent": 0,
    "lastResetDate": "2025-10-11T09:41:57.437Z"
  },
  "settings": {
    "autoTopup": false,
    "autoTopupThreshold": 100,
    "autoTopupAmount": 500,
    "lowBalanceAlert": true,
    "lowBalanceThreshold": 100
  },
  "isActive": true,
  "isFrozen": false,
  "createdAt": "2025-09-30T02:59:18.628Z",
  "updatedAt": "2025-10-11T16:13:38.518Z",
  "__v": 0,
  "lastTransactionAt": "2025-10-11T16:13:38.517Z",
  "coins": [
    {
      "type": "wasil",
      "amount": 3500,
      "isActive": true,
      "earnedDate": "2025-09-30T02:59:18.628Z"
    },
    {
      "type": "promotion",
      "amount": 0,
      "isActive": true,
      "earnedDate": "2025-09-30T02:59:18.628Z"
    }
  ]
}
```

---

### userofferinteractions

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "offer": 1
    },
    "name": "offer_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "action": 1
    },
    "name": "action_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "timestamp": 1
    },
    "name": "timestamp_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "offer": 1,
      "action": 1
    },
    "name": "user_1_offer_1_action_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "offer": 1,
      "action": 1,
      "timestamp": -1
    },
    "name": "offer_1_action_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "action": 1,
      "timestamp": -1
    },
    "name": "user_1_action_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "timestamp": -1
    },
    "name": "timestamp_-1",
    "background": true
  }
]
```

---

### conversations

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "customerId": 1
    },
    "name": "customerId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1
    },
    "name": "storeId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "lastActivityAt": 1
    },
    "name": "lastActivityAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "customerId": 1,
      "storeId": 1
    },
    "name": "customerId_1_storeId_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "customerId": 1,
      "status": 1,
      "lastActivityAt": -1
    },
    "name": "customerId_1_status_1_lastActivityAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "customerId": 1,
      "unreadCount": 1
    },
    "name": "customerId_1_unreadCount_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1,
      "status": 1,
      "lastActivityAt": -1
    },
    "name": "storeId_1_status_1_lastActivityAt_-1",
    "background": true
  }
]
```

---

### reviews

**Document Count:** 5

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68df7b004754e8c0a67064ac","68df7b004754e8c0a6706... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,223,123,0,71,84,232,... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [223,223,223]... |
| _id.buffer.2 | 100.0% | number | 0 | [123,123,123]... |
| _id.buffer.3 | 100.0% | number | 0 | [0,0,0]... |
| _id.buffer.4 | 100.0% | number | 0 | [71,71,71]... |
| _id.buffer.5 | 100.0% | number | 0 | [84,84,84]... |
| _id.buffer.6 | 100.0% | number | 0 | [232,232,232]... |
| _id.buffer.7 | 100.0% | number | 0 | [192,192,192]... |
| _id.buffer.8 | 100.0% | number | 0 | [166,166,166]... |
| _id.buffer.9 | 100.0% | number | 0 | [112,112,112]... |
| _id.buffer.10 | 100.0% | number | 0 | [100,100,100]... |
| _id.buffer.11 | 100.0% | number | 0 | [172,174,176]... |
| user | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c","68c145d5f016515d8eb31... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [69,69,69]... |
| user.buffer.3 | 100.0% | number | 0 | [213,213,213]... |
| user.buffer.4 | 100.0% | number | 0 | [240,240,240]... |
| user.buffer.5 | 100.0% | number | 0 | [22,22,22]... |
| user.buffer.6 | 100.0% | number | 0 | [81,81,81]... |
| user.buffer.7 | 100.0% | number | 0 | [93,93,93]... |
| user.buffer.8 | 100.0% | number | 0 | [142,142,142]... |
| user.buffer.9 | 100.0% | number | 0 | [179,179,179]... |
| user.buffer.10 | 100.0% | number | 0 | [28,28,28]... |
| user.buffer.11 | 100.0% | number | 0 | [12,12,12]... |
| store | 100.0% | object | 0 | ["68da61d8a9d4bc0bf86affa5","68da61d8a9d4bc0bf86af... |
| store.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,218,97,216,169,212,1... |
| store.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| store.buffer.1 | 100.0% | number | 0 | [218,218,218]... |
| store.buffer.2 | 100.0% | number | 0 | [97,97,97]... |
| store.buffer.3 | 100.0% | number | 0 | [216,216,216]... |
| store.buffer.4 | 100.0% | number | 0 | [169,169,169]... |
| store.buffer.5 | 100.0% | number | 0 | [212,212,212]... |
| store.buffer.6 | 100.0% | number | 0 | [188,188,188]... |
| store.buffer.7 | 100.0% | number | 0 | [11,11,11]... |
| store.buffer.8 | 100.0% | number | 0 | [248,248,248]... |
| store.buffer.9 | 100.0% | number | 0 | [106,106,106]... |
| store.buffer.10 | 100.0% | number | 0 | [255,255,255]... |
| store.buffer.11 | 100.0% | number | 0 | [165,166,167]... |
| rating | 100.0% | number | 0 | [5,4,5]... |
| title | 100.0% | string | 0 | ["Excellent service!","Great products","Best store... |
| comment | 100.0% | string | 0 | ["Amazing experience! The staff was very friendly ... |
| images | 100.0% | array | 0 | [[],[],[]]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| isVerifiedPurchase | 100.0% | boolean | 0 | [true,true,true]... |
| helpfulCount | 100.0% | number | 0 | [4,5,17]... |
| unhelpfulCount | 100.0% | number | 0 | [1,1,2]... |
| createdAt | 100.0% | object | 0 | ["2025-09-16T05:49:36.047Z","2025-09-14T23:23:08.5... |
| updatedAt | 100.0% | object | 0 | ["2025-10-03T07:28:00.675Z","2025-10-03T07:28:00.7... |
| merchantReply | 40.0% | string | 0 | ["Thank you for your feedback! We appreciate your ... |
| merchantReplyDate | 40.0% | object | 0 | ["2025-10-03T07:28:00.791Z","2025-10-03T07:28:00.8... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "targetType": 1
    },
    "name": "targetType_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "targetId": 1
    },
    "name": "targetId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "moderation.status": 1
    },
    "name": "moderation.status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "targetType": 1,
      "targetId": 1,
      "moderation.status": 1,
      "createdAt": -1
    },
    "name": "targetType_1_targetId_1_moderation.status_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "rating": -1,
      "moderation.status": 1
    },
    "name": "rating_-1_moderation.status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "helpfulness.helpfulnessScore": -1,
      "moderation.status": 1
    },
    "name": "helpfulness.helpfulnessScore_-1_moderation.status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "verification.isVerifiedPurchase": 1,
      "moderation.status": 1
    },
    "name": "verification.isVerifiedPurchase_1_moderation.status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1,
      "moderation.status": 1
    },
    "name": "tags_1_moderation.status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "moderation.status": 1,
      "createdAt": -1
    },
    "name": "moderation.status_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "title_text_content_text_tags_text",
    "background": true,
    "weights": {
      "content": 5,
      "tags": 3,
      "title": 10
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "targetType": 1,
      "targetId": 1,
      "rating": -1
    },
    "name": "targetType_1_targetId_1_rating_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "verification.isVerifiedPurchase": 1
    },
    "name": "user_1_verification.isVerifiedPurchase_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "rating": 1
    },
    "name": "rating_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "rating": 1
    },
    "name": "store_1_rating_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "createdAt": -1
    },
    "name": "store_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "isActive": 1
    },
    "name": "store_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "rating": 1,
      "isActive": 1
    },
    "name": "rating_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "store": 1
    },
    "name": "user_1_store_1",
    "background": true,
    "unique": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68df7b004754e8c0a67064ac",
  "user": "68c145d5f016515d8eb31c0c",
  "store": "68da61d8a9d4bc0bf86affa5",
  "rating": 5,
  "title": "Excellent service!",
  "comment": "Amazing experience! The staff was very friendly and the products were top quality. Will definitely come back again. Highly recommend this store to everyone.",
  "images": [],
  "isActive": true,
  "isVerifiedPurchase": true,
  "helpfulCount": 4,
  "unhelpfulCount": 1,
  "createdAt": "2025-09-16T05:49:36.047Z",
  "updatedAt": "2025-10-03T07:28:00.675Z"
}
```

---

### stocknotifications

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "userId": 1
    },
    "name": "userId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "productId": 1
    },
    "name": "productId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "productId": 1
    },
    "name": "userId_1_productId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "productId": 1,
      "status": 1
    },
    "name": "productId_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "status": 1
    },
    "name": "userId_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "productId": 1,
      "status": 1
    },
    "name": "userId_1_productId_1_status_1",
    "background": true,
    "unique": true,
    "partialFilterExpression": {
      "status": "pending"
    }
  }
]
```

---

### projects

**Document Count:** 16

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68db77e6a6d6d5e838ee85f0","68db77e6a6d6d5e838ee8... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,219,119,230,166,214,... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [219,219,219]... |
| _id.buffer.2 | 100.0% | number | 0 | [119,119,119]... |
| _id.buffer.3 | 100.0% | number | 0 | [230,230,230]... |
| _id.buffer.4 | 100.0% | number | 0 | [166,166,166]... |
| _id.buffer.5 | 100.0% | number | 0 | [214,214,214]... |
| _id.buffer.6 | 100.0% | number | 0 | [213,213,213]... |
| _id.buffer.7 | 100.0% | number | 0 | [232,232,232]... |
| _id.buffer.8 | 100.0% | number | 0 | [56,56,56]... |
| _id.buffer.9 | 100.0% | number | 0 | [238,238,238]... |
| _id.buffer.10 | 100.0% | number | 0 | [133,133,133]... |
| _id.buffer.11 | 100.0% | number | 0 | [240,241,242]... |
| title | 100.0% | string | 0 | ["Review Our New Beauty Products - Earn ₹100","Sha... |
| description | 100.0% | string | 0 | ["We're launching a new line of organic beauty pro... |
| shortDescription | 60.0% | string | 0 | ["Create video review of our new beauty products a... |
| category | 100.0% | string | 0 | ["review","social_share","store_visit"]... |
| type | 100.0% | string | 0 | ["video","photo","checkin"]... |
| brand | 60.0% | string | 0 | ["BeautyGlow","FashionHub","MegaMart"]... |
| sponsor | 40.0% | object | 0 | ["68da61d8a9d4bc0bf86affa5","68da61d8a9d4bc0bf86af... |
| sponsor.buffer | 40.0% | object | 0 | [{"type":"Buffer","data":[104,218,97,216,169,212,1... |
| sponsor.buffer.0 | 40.0% | number | 0 | [104,104,104]... |
| sponsor.buffer.1 | 40.0% | number | 0 | [218,218,218]... |
| sponsor.buffer.2 | 40.0% | number | 0 | [97,97,97]... |
| sponsor.buffer.3 | 40.0% | number | 0 | [216,216,216]... |
| sponsor.buffer.4 | 40.0% | number | 0 | [169,169,169]... |
| sponsor.buffer.5 | 40.0% | number | 0 | [212,212,212]... |
| sponsor.buffer.6 | 40.0% | number | 0 | [188,188,188]... |
| sponsor.buffer.7 | 40.0% | number | 0 | [11,11,11]... |
| sponsor.buffer.8 | 40.0% | number | 0 | [248,248,248]... |
| sponsor.buffer.9 | 40.0% | number | 0 | [106,106,106]... |
| sponsor.buffer.10 | 40.0% | number | 0 | [255,255,255]... |
| sponsor.buffer.11 | 40.0% | number | 0 | [165,166,167]... |
| requirements | 100.0% | object | 0 | [{"minDuration":60,"maxDuration":180,"minPhotos":3... |
| requirements.minDuration | 30.0% | number | 0 | [60,30,30]... |
| requirements.maxDuration | 20.0% | number | 0 | [180,90]... |
| requirements.minPhotos | 40.0% | number | 0 | [3,3,2]... |
| requirements.demographics | 100.0% | object | 0 | [{"minAge":18,"maxAge":45,"gender":"any","language... |
| requirements.demographics.minAge | 60.0% | number | 0 | [18,16,18]... |
| requirements.demographics.maxAge | 50.0% | number | 0 | [45,35,60]... |
| requirements.demographics.gender | 100.0% | string | 0 | ["any","any","any"]... |
| requirements.demographics.languages | 100.0% | array | 0 | [[],[],[]]... |
| requirements.deviceRequirements | 100.0% | object | 0 | [{"camera":true,"microphone":true,"location":false... |
| requirements.deviceRequirements.camera | 100.0% | boolean | 0 | [true,true,true]... |
| requirements.deviceRequirements.microphone | 100.0% | boolean | 0 | [true,false,false]... |
| requirements.deviceRequirements.location | 100.0% | boolean | 0 | [false,false,true]... |
| requirements.location | 100.0% | object | 0 | [{"required":false},{"required":false},{"required"... |
| requirements.location.required | 100.0% | boolean | 0 | [false,false,true]... |
| requirements.products | 100.0% | array | 0 | [[],[],[]]... |
| requirements.stores | 100.0% | array | 0 | [[],[],[]]... |
| requirements.categories | 100.0% | array | 0 | [[],[],[]]... |
| requirements.skills | 100.0% | array | 0 | [[],[],[]]... |
| reward | 100.0% | object | 0 | [{"amount":100,"currency":"INR","type":"fixed","bo... |
| reward.amount | 100.0% | number | 0 | [100,150,50]... |
| reward.currency | 100.0% | string | 0 | ["INR","INR","INR"]... |
| reward.type | 100.0% | string | 0 | ["fixed","fixed","fixed"]... |
| reward.bonusMultiplier | 100.0% | number | 0 | [1.5,2,1]... |
| reward.paymentMethod | 100.0% | string | 0 | ["wallet","wallet","wallet"]... |
| reward.paymentSchedule | 100.0% | string | 0 | ["immediate","daily","immediate"]... |
| reward.milestones | 100.0% | array | 0 | [[],[],[]]... |
| limits | 100.0% | object | 0 | [{"maxCompletions":100,"totalBudget":15000,"dailyB... |
| limits.maxCompletions | 50.0% | number | 0 | [100,50,200]... |
| limits.totalBudget | 50.0% | number | 0 | [15000,10000,10000]... |
| limits.dailyBudget | 20.0% | number | 0 | [2000,1000]... |
| limits.maxCompletionsPerUser | 100.0% | number | 0 | [1,2,1]... |
| limits.expiryDate | 100.0% | object | 0 | ["2025-10-30T06:25:42.823Z","2025-10-15T06:25:42.8... |
| limits.startDate | 50.0% | object | 0 | ["2025-09-30T06:25:42.823Z","2025-09-30T06:25:42.8... |
| instructions | 100.0% | array | 0 | [["Purchase any product from our beauty range","Us... |
| examples | 100.0% | array | 0 | [[],[],[]]... |
| tags | 100.0% | array | 0 | [["beauty","review","video","skincare","organic"],... |
| difficulty | 100.0% | string | 0 | ["easy","easy","easy"]... |
| estimatedTime | 100.0% | number | 0 | [30,20,15]... |
| status | 100.0% | string | 0 | ["active","active","active"]... |
| priority | 100.0% | string | 0 | ["high","medium","high"]... |
| analytics | 100.0% | object | 0 | [{"totalViews":1250,"totalApplications":45,"totalS... |
| analytics.totalViews | 100.0% | number | 0 | [1250,903,2343]... |
| analytics.totalApplications | 100.0% | number | 0 | [45,28,156]... |
| analytics.totalSubmissions | 100.0% | number | 0 | [32,1,1]... |
| analytics.approvedSubmissions | 100.0% | number | 0 | [28,0,0]... |
| analytics.rejectedSubmissions | 100.0% | number | 0 | [4,0,0]... |
| analytics.avgCompletionTime | 100.0% | number | 0 | [2.5,1.8,0.5]... |
| analytics.avgQualityScore | 100.0% | number | 0 | [7.8,8.2,7]... |
| analytics.totalPayout | 100.0% | number | 0 | [2800,3000,6700]... |
| analytics.conversionRate | 100.0% | number | 0 | [71.1,78.6,85.9]... |
| analytics.approvalRate | 100.0% | number | 0 | [87.5,0,0]... |
| analytics.participantDemographics | 100.0% | object | 0 | [{"ageGroups":{},"genderSplit":{},"locationSplit":... |
| analytics.participantDemographics.ageGroups | 100.0% | object | 0 | [{},{},{}]... |
| analytics.participantDemographics.genderSplit | 100.0% | object | 0 | [{},{},{}]... |
| analytics.participantDemographics.locationSplit | 100.0% | object | 0 | [{},{},{}]... |
| analytics.dailyStats | 100.0% | array | 0 | [[],[],[]]... |
| isFeatured | 100.0% | boolean | 0 | [true,true,false]... |
| isSponsored | 100.0% | boolean | 0 | [true,true,true]... |
| approvalRequired | 100.0% | boolean | 0 | [true,true,false]... |
| qualityControl | 100.0% | object | 0 | [{"enabled":true,"minScore":6,"manualReview":true,... |
| qualityControl.enabled | 100.0% | boolean | 0 | [true,true,true]... |
| qualityControl.minScore | 100.0% | number | 0 | [6,5,5]... |
| qualityControl.manualReview | 100.0% | boolean | 0 | [true,true,false]... |
| qualityControl.autoApprove | 100.0% | boolean | 0 | [false,false,true]... |
| targetAudience | 100.0% | object | 0 | [{"size":100,"demographics":"Women and men aged 18... |
| targetAudience.size | 60.0% | number | 0 | [100,50,200]... |
| targetAudience.demographics | 60.0% | string | 0 | ["Women and men aged 18-45 interested in beauty an... |
| targetAudience.interests | 100.0% | array | 0 | [["beauty","skincare","organic products"],["fashio... |
| createdBy | 100.0% | object | 0 | ["68c1447aa6d2db865ad82459","68c1447aa6d2db865ad82... |
| createdBy.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,68,122,166,210,2... |
| createdBy.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| createdBy.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| createdBy.buffer.2 | 100.0% | number | 0 | [68,68,68]... |
| createdBy.buffer.3 | 100.0% | number | 0 | [122,122,122]... |
| createdBy.buffer.4 | 100.0% | number | 0 | [166,166,166]... |
| createdBy.buffer.5 | 100.0% | number | 0 | [210,210,210]... |
| createdBy.buffer.6 | 100.0% | number | 0 | [219,219,219]... |
| createdBy.buffer.7 | 100.0% | number | 0 | [134,134,134]... |
| createdBy.buffer.8 | 100.0% | number | 0 | [90,90,90]... |
| createdBy.buffer.9 | 100.0% | number | 0 | [216,216,216]... |
| createdBy.buffer.10 | 100.0% | number | 0 | [36,36,36]... |
| createdBy.buffer.11 | 100.0% | number | 0 | [89,89,89]... |
| managedBy | 100.0% | array | 0 | [[],[],[]]... |
| submissions | 100.0% | array | 0 | [[],[{"user":"68ef4d41061faaf045222506","submitted... |
| __v | 100.0% | number | 0 | [0,1,1]... |
| createdAt | 100.0% | object | 0 | ["2025-09-30T06:25:42.876Z","2025-09-30T06:25:42.8... |
| updatedAt | 100.0% | object | 0 | ["2025-09-30T06:25:42.876Z","2025-11-07T10:24:40.7... |
| requirements.location.specific | 10.0% | string | 0 | ["MegaMart - Mumbai Central"]... |
| requirements.location.radius | 10.0% | number | 0 | [0.5]... |
| requirements.location.coordinates | 10.0% | array | 0 | [[72.8347,19.0144]]... |
| limits.maxCompletionsPerDay | 10.0% | number | 0 | [20]... |
| requirements.minWords | 10.0% | number | 0 | [100]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "requirements.location.coordinates": "2dsphere"
    },
    "name": "requirements.location.coordinates_2dsphere",
    "background": true,
    "2dsphereIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1
    },
    "name": "isFeatured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "status": 1,
      "createdAt": -1
    },
    "name": "category_1_status_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "isFeatured": 1
    },
    "name": "status_1_isFeatured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "reward.amount": -1,
      "status": 1
    },
    "name": "reward.amount_-1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "difficulty": 1,
      "status": 1
    },
    "name": "difficulty_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "limits.expiryDate": 1
    },
    "name": "limits.expiryDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1,
      "status": 1
    },
    "name": "tags_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "sponsor": 1,
      "status": 1
    },
    "name": "sponsor_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdBy": 1,
      "createdAt": -1
    },
    "name": "createdBy_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "title_text_description_text_tags_text",
    "background": true,
    "weights": {
      "description": 1,
      "tags": 5,
      "title": 10
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  }
]
```

**Sample Document:**

```json
{
  "_id": "68db77e6a6d6d5e838ee85f0",
  "title": "Review Our New Beauty Products - Earn ₹100",
  "description": "We're launching a new line of organic beauty products and need your honest reviews! Try our products and share your experience in a detailed video review.",
  "shortDescription": "Create video review of our new beauty products and earn instant rewards",
  "category": "review",
  "type": "video",
  "brand": "BeautyGlow",
  "sponsor": "68da61d8a9d4bc0bf86affa5",
  "requirements": {
    "minDuration": 60,
    "maxDuration": 180,
    "minPhotos": 3,
    "demographics": {
      "minAge": 18,
      "maxAge": 45,
      "gender": "any",
      "languages": []
    },
    "deviceRequirements": {
      "camera": true,
      "microphone": true,
      "location": false
    },
    "location": {
      "required": false
    },
    "products": [],
    "stores": [],
    "categories": [],
    "skills": []
  },
  "reward": {
    "amount": 100,
    "currency": "INR",
    "type": "fixed",
    "bonusMultiplier": 1.5,
    "paymentMethod": "wallet",
    "paymentSchedule": "immediate",
    "milestones": []
  },
  "limits": {
    "maxCompletions": 100,
    "totalBudget": 15000,
    "dailyBudget": 2000,
    "maxCompletionsPerUser": 1,
    "expiryDate": "2025-10-30T06:25:42.823Z",
    "startDate": "2025-09-30T06:25:42.823Z"
  },
  "instructions": [
    "Purchase any product from our beauty range",
    "Use the product for at least 3 days",
    "Record a 1-3 minute video showing the product and sharing your honest opinion",
    "Upload clear photos of the product and its effects",
    "Submit your review through the app"
  ],
  "examples": [],
  "tags": [
    "beauty",
    "review",
    "video",
    "skincare",
    "organic"
  ],
  "difficulty": "easy",
  "estimatedTime": 30,
  "status": "active",
  "priority": "high",
  "analytics": {
    "totalViews": 1250,
    "totalApplications": 45,
    "totalSubmissions": 32,
    "approvedSubmissions": 28,
    "rejectedSubmissions": 4,
    "avgCompletionTime": 2.5,
    "avgQualityScore": 7.8,
    "totalPayout": 2800,
    "conversionRate": 71.1,
    "approvalRate": 87.5,
    "participantDemographics": {
      "ageGroups": {},
      "genderSplit": {},
      "locationSplit": {}
    },
    "dailyStats": []
  },
  "isFeatured": true,
  "isSponsored": true,
  "approvalRequired": true,
  "qualityControl": {
    "enabled": true,
    "minScore": 6,
    "manualReview": true,
    "autoApprove": false
  },
  "targetAudience": {
    "size": 100,
    "demographics": "Women and men aged 18-45 interested in beauty and skincare",
    "interests": [
      "beauty",
      "skincare",
      "organic products"
    ]
  },
  "createdBy": "68c1447aa6d2db865ad82459",
  "managedBy": [],
  "submissions": [],
  "__v": 0,
  "createdAt": "2025-09-30T06:25:42.876Z",
  "updatedAt": "2025-09-30T06:25:42.876Z"
}
```

---

### notifications

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "type": 1
    },
    "name": "type_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "priority": 1
    },
    "name": "priority_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isRead": 1
    },
    "name": "isRead_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isArchived": 1
    },
    "name": "isArchived_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true,
    "expireAfterSeconds": 0
  },
  {
    "v": 2,
    "key": {
      "scheduledAt": 1
    },
    "name": "scheduledAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "batchId": 1
    },
    "name": "batchId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "campaignId": 1
    },
    "name": "campaignId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "isRead": 1,
      "createdAt": -1
    },
    "name": "user_1_isRead_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "category": 1,
      "createdAt": -1
    },
    "name": "user_1_category_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "type": 1,
      "createdAt": -1
    },
    "name": "user_1_type_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "priority": 1,
      "createdAt": -1
    },
    "name": "priority_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "source": 1,
      "createdAt": -1
    },
    "name": "source_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "isRead": 1,
      "isArchived": 1,
      "createdAt": -1
    },
    "name": "user_1_isRead_1_isArchived_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "priority": 1,
      "createdAt": -1
    },
    "name": "category_1_priority_1_createdAt_-1",
    "background": true
  }
]
```

---

### cointransactions

**Document Count:** 57

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68fb5fd870cd9d7de50e65c1","68fb5fd870cd9d7de50e6... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,95,216,112,205,1... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [251,251,251]... |
| _id.buffer.2 | 100.0% | number | 0 | [95,95,95]... |
| _id.buffer.3 | 100.0% | number | 0 | [216,216,216]... |
| _id.buffer.4 | 100.0% | number | 0 | [112,112,112]... |
| _id.buffer.5 | 100.0% | number | 0 | [205,205,205]... |
| _id.buffer.6 | 100.0% | number | 0 | [157,157,157]... |
| _id.buffer.7 | 100.0% | number | 0 | [125,125,125]... |
| _id.buffer.8 | 100.0% | number | 0 | [229,229,229]... |
| _id.buffer.9 | 100.0% | number | 0 | [14,14,14]... |
| _id.buffer.10 | 100.0% | number | 0 | [101,101,101]... |
| _id.buffer.11 | 100.0% | number | 0 | [193,194,195]... |
| user | 100.0% | object | 0 | ["68fb5d9318377fe11cba74b8","68ee29d08c4fa11015d70... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,93,147,24,55,127... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [251,238,251]... |
| user.buffer.2 | 100.0% | number | 0 | [93,41,93]... |
| user.buffer.3 | 100.0% | number | 0 | [147,208,147]... |
| user.buffer.4 | 100.0% | number | 0 | [24,140,24]... |
| user.buffer.5 | 100.0% | number | 0 | [55,79,55]... |
| user.buffer.6 | 100.0% | number | 0 | [127,161,127]... |
| user.buffer.7 | 100.0% | number | 0 | [225,16,225]... |
| user.buffer.8 | 100.0% | number | 0 | [28,21,28]... |
| user.buffer.9 | 100.0% | number | 0 | [186,215,186]... |
| user.buffer.10 | 100.0% | number | 0 | [116,3,116]... |
| user.buffer.11 | 100.0% | number | 0 | [184,57,181]... |
| type | 100.0% | string | 0 | ["earned","earned","earned"]... |
| amount | 100.0% | number | 0 | [25,75,50]... |
| balance | 100.0% | number | 0 | [25,75,50]... |
| source | 100.0% | string | 0 | ["bill_upload","order","spin_wheel"]... |
| description | 100.0% | string | 0 | ["Bill upload reward","Purchase reward","Spin whee... |
| createdAt | 100.0% | object | 0 | ["2025-09-24T13:06:15.030Z","2025-09-24T13:33:31.9... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| updatedAt | 100.0% | object | 0 | ["2025-10-24T11:15:36.066Z","2025-10-24T11:15:36.0... |
| metadata | 10.0% | object | 0 | [{"challengeId":"68fb5fd770cd9d7de50e6538"}]... |
| metadata.challengeId | 10.0% | object | 0 | ["68fb5fd770cd9d7de50e6538"]... |
| metadata.challengeId.buffer | 10.0% | object | 0 | [{"type":"Buffer","data":[104,251,95,215,112,205,1... |
| metadata.challengeId.buffer.0 | 10.0% | number | 0 | [104]... |
| metadata.challengeId.buffer.1 | 10.0% | number | 0 | [251]... |
| metadata.challengeId.buffer.2 | 10.0% | number | 0 | [95]... |
| metadata.challengeId.buffer.3 | 10.0% | number | 0 | [215]... |
| metadata.challengeId.buffer.4 | 10.0% | number | 0 | [112]... |
| metadata.challengeId.buffer.5 | 10.0% | number | 0 | [205]... |
| metadata.challengeId.buffer.6 | 10.0% | number | 0 | [157]... |
| metadata.challengeId.buffer.7 | 10.0% | number | 0 | [125]... |
| metadata.challengeId.buffer.8 | 10.0% | number | 0 | [229]... |
| metadata.challengeId.buffer.9 | 10.0% | number | 0 | [14]... |
| metadata.challengeId.buffer.10 | 10.0% | number | 0 | [101]... |
| metadata.challengeId.buffer.11 | 10.0% | number | 0 | [56]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "type": 1
    },
    "name": "type_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "source": 1
    },
    "name": "source_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "type": 1,
      "createdAt": -1
    },
    "name": "user_1_type_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "source": 1,
      "createdAt": -1
    },
    "name": "user_1_source_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68fb5fd870cd9d7de50e65c1",
  "user": "68fb5d9318377fe11cba74b8",
  "type": "earned",
  "amount": 25,
  "balance": 25,
  "source": "bill_upload",
  "description": "Bill upload reward",
  "createdAt": "2025-09-24T13:06:15.030Z",
  "__v": 0,
  "updatedAt": "2025-10-24T11:15:36.066Z"
}
```

---

### offers

**Document Count:** 12

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68ee29d08c4fa11015d70354","68ee29d08c4fa11015d70... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [238,238,238]... |
| _id.buffer.2 | 100.0% | number | 0 | [41,41,41]... |
| _id.buffer.3 | 100.0% | number | 0 | [208,208,208]... |
| _id.buffer.4 | 100.0% | number | 0 | [140,140,140]... |
| _id.buffer.5 | 100.0% | number | 0 | [79,79,79]... |
| _id.buffer.6 | 100.0% | number | 0 | [161,161,161]... |
| _id.buffer.7 | 100.0% | number | 0 | [16,16,16]... |
| _id.buffer.8 | 100.0% | number | 0 | [21,21,21]... |
| _id.buffer.9 | 100.0% | number | 0 | [215,215,215]... |
| _id.buffer.10 | 100.0% | number | 0 | [3,3,3]... |
| _id.buffer.11 | 100.0% | number | 0 | [84,83,85]... |
| title | 100.0% | string | 0 | ["New Arrival - Food Combo","Student Special - Fas... |
| subtitle | 100.0% | string | 0 | ["Try our new menu items","50% off for students","... |
| description | 100.0% | string | 0 | ["Experience our latest culinary creations with th... |
| image | 100.0% | string | 0 | ["https://picsum.photos/400/302.jpg","https://pics... |
| category | 100.0% | string | 0 | ["new_arrival","student","trending"]... |
| type | 100.0% | string | 0 | ["combo","discount","cashback"]... |
| cashbackPercentage | 100.0% | number | 0 | [30,50,20]... |
| originalPrice | 100.0% | number | 0 | [800,2000,500]... |
| discountedPrice | 100.0% | number | 0 | [560,1000,400]... |
| location | 100.0% | object | 0 | [{"type":"Point","coordinates":[77.219,28.6149]},{... |
| location.type | 100.0% | string | 0 | ["Point","Point","Point"]... |
| location.coordinates | 100.0% | array | 0 | [[77.219,28.6149],[77.2295,28.6129],[77.199,28.613... |
| store | 100.0% | object | 0 | [{"id":"68ee29d08c4fa11015d7034c","name":"Foodie P... |
| store.id | 100.0% | object | 0 | ["68ee29d08c4fa11015d7034c","68ee29d08c4fa11015d70... |
| store.id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| store.id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| store.id.buffer.1 | 100.0% | number | 0 | [238,238,238]... |
| store.id.buffer.2 | 100.0% | number | 0 | [41,41,41]... |
| store.id.buffer.3 | 100.0% | number | 0 | [208,208,208]... |
| store.id.buffer.4 | 100.0% | number | 0 | [140,140,140]... |
| store.id.buffer.5 | 100.0% | number | 0 | [79,79,79]... |
| store.id.buffer.6 | 100.0% | number | 0 | [161,161,161]... |
| store.id.buffer.7 | 100.0% | number | 0 | [16,16,16]... |
| store.id.buffer.8 | 100.0% | number | 0 | [21,21,21]... |
| store.id.buffer.9 | 100.0% | number | 0 | [215,215,215]... |
| store.id.buffer.10 | 100.0% | number | 0 | [3,3,3]... |
| store.id.buffer.11 | 100.0% | number | 0 | [76,75,77]... |
| store.name | 100.0% | string | 0 | ["Foodie Paradise","Fashion Hub","BookWorld"]... |
| store.logo | 100.0% | string | 0 | ["https://picsum.photos/200/202.jpg","https://pics... |
| store.rating | 100.0% | number | 0 | [4.7,4.2,4.3]... |
| store.verified | 100.0% | boolean | 0 | [true,true,true]... |
| validity | 100.0% | object | 0 | [{"startDate":"2025-10-14T10:45:35.350Z","endDate"... |
| validity.startDate | 100.0% | object | 0 | ["2025-10-14T10:45:35.350Z","2025-10-14T10:45:35.3... |
| validity.endDate | 100.0% | object | 0 | ["2025-10-21T10:45:35.350Z","2025-10-29T10:45:35.3... |
| validity.isActive | 100.0% | boolean | 0 | [true,true,true]... |
| engagement | 100.0% | object | 0 | [{"likesCount":67,"sharesCount":12,"viewsCount":23... |
| engagement.likesCount | 100.0% | number | 0 | [67,89,134]... |
| engagement.sharesCount | 100.0% | number | 0 | [12,15,28]... |
| engagement.viewsCount | 100.0% | number | 0 | [234,456,678]... |
| restrictions | 100.0% | object | 0 | [{"minOrderValue":300,"maxDiscountAmount":500,"app... |
| restrictions.minOrderValue | 50.0% | number | 0 | [300,500,200]... |
| restrictions.maxDiscountAmount | 50.0% | number | 0 | [500,2000,300]... |
| restrictions.applicableOn | 100.0% | array | 0 | [["online","offline"],["offline"],["online","offli... |
| restrictions.usageLimitPerUser | 50.0% | number | 0 | [3,1,5]... |
| restrictions.usageLimit | 50.0% | number | 0 | [200,500,300]... |
| restrictions.excludedProducts | 100.0% | array | 0 | [[],[],[]]... |
| restrictions.userTypeRestriction | 100.0% | string | 0 | ["all","student","all"]... |
| metadata | 100.0% | object | 0 | [{"isNew":true,"isTrending":false,"isBestSeller":f... |
| metadata.isNew | 100.0% | boolean | 0 | [true,true,false]... |
| metadata.isTrending | 100.0% | boolean | 0 | [false,false,true]... |
| metadata.isBestSeller | 100.0% | boolean | 0 | [false,false,true]... |
| metadata.isSpecial | 100.0% | boolean | 0 | [false,true,false]... |
| metadata.priority | 100.0% | number | 0 | [3,2,4]... |
| metadata.featured | 100.0% | boolean | 0 | [false,false,true]... |
| metadata.tags | 100.0% | array | 0 | [[],[],[]]... |
| metadata.flashSale | 100.0% | object | 0 | [{"isActive":false},{"isActive":false},{"isActive"... |
| metadata.flashSale.isActive | 100.0% | boolean | 0 | [false,false,false]... |
| createdBy | 100.0% | object | 0 | ["68ee29d08c4fa11015d70339","68ee29d08c4fa11015d70... |
| createdBy.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| createdBy.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| createdBy.buffer.1 | 100.0% | number | 0 | [238,238,238]... |
| createdBy.buffer.2 | 100.0% | number | 0 | [41,41,41]... |
| createdBy.buffer.3 | 100.0% | number | 0 | [208,208,208]... |
| createdBy.buffer.4 | 100.0% | number | 0 | [140,140,140]... |
| createdBy.buffer.5 | 100.0% | number | 0 | [79,79,79]... |
| createdBy.buffer.6 | 100.0% | number | 0 | [161,161,161]... |
| createdBy.buffer.7 | 100.0% | number | 0 | [16,16,16]... |
| createdBy.buffer.8 | 100.0% | number | 0 | [21,21,21]... |
| createdBy.buffer.9 | 100.0% | number | 0 | [215,215,215]... |
| createdBy.buffer.10 | 100.0% | number | 0 | [3,3,3]... |
| createdBy.buffer.11 | 100.0% | number | 0 | [57,57,57]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-14T10:45:36.831Z","2025-10-14T10:45:36.8... |
| updatedAt | 100.0% | object | 0 | ["2025-10-14T10:45:36.831Z","2025-10-15T05:15:30.5... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "title": 1
    },
    "name": "title_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "product": 1
    },
    "name": "product_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "location.coordinates": "2dsphere"
    },
    "name": "location.coordinates_2dsphere",
    "background": true,
    "2dsphereIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "redemptionCode": 1
    },
    "name": "redemptionCode_1",
    "background": true,
    "unique": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "isNew": 1
    },
    "name": "isNew_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isTrending": 1
    },
    "name": "isTrending_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isBestSeller": 1
    },
    "name": "isBestSeller_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isSpecial": 1
    },
    "name": "isSpecial_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1
    },
    "name": "isFeatured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "isActive": 1
    },
    "name": "category_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1,
      "isActive": 1
    },
    "name": "isFeatured_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isTrending": 1,
      "isActive": 1
    },
    "name": "isTrending_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "endDate": 1
    },
    "name": "endDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "startDate": 1,
      "endDate": 1
    },
    "name": "startDate_1_endDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "title_text_description_text_tags_text",
    "background": true,
    "weights": {
      "description": 1,
      "tags": 1,
      "title": 1
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "store.id": 1
    },
    "name": "store.id_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validity.startDate": 1
    },
    "name": "validity.startDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validity.endDate": 1
    },
    "name": "validity.endDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validity.isActive": 1
    },
    "name": "validity.isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.isNew": 1
    },
    "name": "metadata.isNew_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.isTrending": 1
    },
    "name": "metadata.isTrending_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.isBestSeller": 1
    },
    "name": "metadata.isBestSeller_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.isSpecial": 1
    },
    "name": "metadata.isSpecial_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.priority": 1
    },
    "name": "metadata.priority_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.featured": 1
    },
    "name": "metadata.featured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdBy": 1
    },
    "name": "createdBy_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "validity.isActive": 1,
      "validity.endDate": 1
    },
    "name": "category_1_validity.isActive_1_validity.endDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.isTrending": 1,
      "validity.isActive": 1
    },
    "name": "metadata.isTrending_1_validity.isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.isNew": 1,
      "validity.isActive": 1
    },
    "name": "metadata.isNew_1_validity.isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.featured": 1,
      "validity.isActive": 1
    },
    "name": "metadata.featured_1_validity.isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store.id": 1,
      "validity.isActive": 1
    },
    "name": "store.id_1_validity.isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.priority": -1,
      "validity.isActive": 1
    },
    "name": "metadata.priority_-1_validity.isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "location": "2dsphere"
    },
    "name": "location_2dsphere",
    "background": true,
    "2dsphereIndexVersion": 3
  }
]
```

**Sample Document:**

```json
{
  "_id": "68ee29d08c4fa11015d70354",
  "title": "New Arrival - Food Combo",
  "subtitle": "Try our new menu items",
  "description": "Experience our latest culinary creations with this special combo offer.",
  "image": "https://picsum.photos/400/302.jpg",
  "category": "new_arrival",
  "type": "combo",
  "cashbackPercentage": 30,
  "originalPrice": 800,
  "discountedPrice": 560,
  "location": {
    "type": "Point",
    "coordinates": [
      77.219,
      28.6149
    ]
  },
  "store": {
    "id": "68ee29d08c4fa11015d7034c",
    "name": "Foodie Paradise",
    "logo": "https://picsum.photos/200/202.jpg",
    "rating": 4.7,
    "verified": true
  },
  "validity": {
    "startDate": "2025-10-14T10:45:35.350Z",
    "endDate": "2025-10-21T10:45:35.350Z",
    "isActive": true
  },
  "engagement": {
    "likesCount": 67,
    "sharesCount": 12,
    "viewsCount": 234
  },
  "restrictions": {
    "minOrderValue": 300,
    "maxDiscountAmount": 500,
    "applicableOn": [
      "online",
      "offline"
    ],
    "usageLimitPerUser": 3,
    "usageLimit": 200,
    "excludedProducts": [],
    "userTypeRestriction": "all"
  },
  "metadata": {
    "isNew": true,
    "isTrending": false,
    "isBestSeller": false,
    "isSpecial": false,
    "priority": 3,
    "featured": false,
    "tags": [],
    "flashSale": {
      "isActive": false
    }
  },
  "createdBy": "68ee29d08c4fa11015d70339",
  "__v": 0,
  "createdAt": "2025-10-14T10:45:36.831Z",
  "updatedAt": "2025-10-14T10:45:36.831Z"
}
```

---

### voucherbrands

**Document Count:** 28

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68de65b88a170479a718fe86","68de65b88a170479a718f... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,222,101,184,138,23,4... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [222,222,222]... |
| _id.buffer.2 | 100.0% | number | 0 | [101,101,101]... |
| _id.buffer.3 | 100.0% | number | 0 | [184,184,184]... |
| _id.buffer.4 | 100.0% | number | 0 | [138,138,138]... |
| _id.buffer.5 | 100.0% | number | 0 | [23,23,23]... |
| _id.buffer.6 | 100.0% | number | 0 | [4,4,4]... |
| _id.buffer.7 | 100.0% | number | 0 | [121,121,121]... |
| _id.buffer.8 | 100.0% | number | 0 | [167,167,167]... |
| _id.buffer.9 | 100.0% | number | 0 | [24,24,24]... |
| _id.buffer.10 | 100.0% | number | 0 | [254,254,254]... |
| _id.buffer.11 | 100.0% | number | 0 | [134,135,136]... |
| name | 100.0% | string | 0 | ["Amazon","Flipkart","Swiggy"]... |
| logo | 100.0% | string | 0 | ["🛒","🛍️","🍔"]... |
| backgroundColor | 100.0% | string | 0 | ["#FF9900","#2874F0","#FC8019"]... |
| logoColor | 100.0% | string | 0 | ["#FFFFFF","#FFFFFF","#FFFFFF"]... |
| description | 100.0% | string | 0 | ["Shop everything online","India's shopping destin... |
| cashbackRate | 100.0% | number | 0 | [5,4,10]... |
| rating | 100.0% | number | 0 | [4.8,4.6,4.5]... |
| ratingCount | 100.0% | number | 0 | [12500,10000,8000]... |
| category | 100.0% | string | 0 | ["shopping","shopping","food"]... |
| isNewlyAdded | 100.0% | boolean | 0 | [false,false,true]... |
| isFeatured | 100.0% | boolean | 0 | [true,true,true]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| denominations | 100.0% | array | 0 | [[100,500,1000,2000],[200,500,1000],[100,200,500]]... |
| termsAndConditions | 100.0% | array | 0 | [["Valid for 1 year from date of purchase","Can be... |
| purchaseCount | 100.0% | number | 0 | [5001,4000,3000]... |
| viewCount | 100.0% | number | 0 | [25000,20000,15000]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-02T11:44:56.080Z","2025-10-02T11:44:56.0... |
| updatedAt | 100.0% | object | 0 | ["2025-10-31T18:56:13.044Z","2025-10-31T11:16:05.5... |
| store | 100.0% | object | 0 | ["69049a75e80417f9f8d64ef2","69049a75e80417f9f8d64... |
| store.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,4,154,117,232,4,23,2... |
| store.buffer.0 | 100.0% | number | 0 | [105,105,104]... |
| store.buffer.1 | 100.0% | number | 0 | [4,4,238]... |
| store.buffer.2 | 100.0% | number | 0 | [154,154,41]... |
| store.buffer.3 | 100.0% | number | 0 | [117,117,208]... |
| store.buffer.4 | 100.0% | number | 0 | [232,232,140]... |
| store.buffer.5 | 100.0% | number | 0 | [4,4,79]... |
| store.buffer.6 | 100.0% | number | 0 | [23,23,161]... |
| store.buffer.7 | 100.0% | number | 0 | [249,249,16]... |
| store.buffer.8 | 100.0% | number | 0 | [248,248,21]... |
| store.buffer.9 | 100.0% | number | 0 | [214,214,215]... |
| store.buffer.10 | 100.0% | number | 0 | [78,78,3]... |
| store.buffer.11 | 100.0% | number | 0 | [242,242,74]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "name": 1
    },
    "name": "name_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isNewlyAdded": 1
    },
    "name": "isNewlyAdded_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1
    },
    "name": "isFeatured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "isActive": 1
    },
    "name": "category_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1,
      "isActive": 1
    },
    "name": "isFeatured_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isNewlyAdded": 1,
      "isActive": 1
    },
    "name": "isNewlyAdded_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "name_text_description_text",
    "background": true,
    "weights": {
      "description": 1,
      "name": 1
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "isActive": 1
    },
    "name": "store_1_isActive_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68de65b88a170479a718fe86",
  "name": "Amazon",
  "logo": "🛒",
  "backgroundColor": "#FF9900",
  "logoColor": "#FFFFFF",
  "description": "Shop everything online",
  "cashbackRate": 5,
  "rating": 4.8,
  "ratingCount": 12500,
  "category": "shopping",
  "isNewlyAdded": false,
  "isFeatured": true,
  "isActive": true,
  "denominations": [
    100,
    500,
    1000,
    2000
  ],
  "termsAndConditions": [
    "Valid for 1 year from date of purchase",
    "Can be used for all products",
    "Not transferable"
  ],
  "purchaseCount": 5001,
  "viewCount": 25000,
  "__v": 0,
  "createdAt": "2025-10-02T11:44:56.080Z",
  "updatedAt": "2025-10-31T18:56:13.044Z",
  "store": "69049a75e80417f9f8d64ef2"
}
```

---

### userproducts

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "purchaseDate": -1
    },
    "name": "user_1_purchaseDate_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "warranty.endDate": 1
    },
    "name": "warranty.endDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "amc.endDate": 1
    },
    "name": "amc.endDate_1",
    "background": true
  }
]
```

---

### storecomparisons

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "stores": 1
    },
    "name": "user_1_stores_1",
    "background": true
  }
]
```

---

### auditlogs

**Document Count:** 1

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68eb20b1fa01687f36a9bb41"]... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,235,32,177,250,1,104... |
| _id.buffer.0 | 100.0% | number | 0 | [104]... |
| _id.buffer.1 | 100.0% | number | 0 | [235]... |
| _id.buffer.2 | 100.0% | number | 0 | [32]... |
| _id.buffer.3 | 100.0% | number | 0 | [177]... |
| _id.buffer.4 | 100.0% | number | 0 | [250]... |
| _id.buffer.5 | 100.0% | number | 0 | [1]... |
| _id.buffer.6 | 100.0% | number | 0 | [104]... |
| _id.buffer.7 | 100.0% | number | 0 | [127]... |
| _id.buffer.8 | 100.0% | number | 0 | [54]... |
| _id.buffer.9 | 100.0% | number | 0 | [169]... |
| _id.buffer.10 | 100.0% | number | 0 | [187]... |
| _id.buffer.11 | 100.0% | number | 0 | [65]... |
| userId | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c"]... |
| userId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| userId.buffer.0 | 100.0% | number | 0 | [104]... |
| userId.buffer.1 | 100.0% | number | 0 | [193]... |
| userId.buffer.2 | 100.0% | number | 0 | [69]... |
| userId.buffer.3 | 100.0% | number | 0 | [213]... |
| userId.buffer.4 | 100.0% | number | 0 | [240]... |
| userId.buffer.5 | 100.0% | number | 0 | [22]... |
| userId.buffer.6 | 100.0% | number | 0 | [81]... |
| userId.buffer.7 | 100.0% | number | 0 | [93]... |
| userId.buffer.8 | 100.0% | number | 0 | [142]... |
| userId.buffer.9 | 100.0% | number | 0 | [179]... |
| userId.buffer.10 | 100.0% | number | 0 | [28]... |
| userId.buffer.11 | 100.0% | number | 0 | [12]... |
| action | 100.0% | string | 0 | ["social_media_post_submitted"]... |
| resource | 100.0% | string | 0 | ["SocialMediaPost"]... |
| resourceId | 100.0% | object | 0 | ["68eb20b1fa01687f36a9bb3f"]... |
| resourceId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,235,32,177,250,1,104... |
| resourceId.buffer.0 | 100.0% | number | 0 | [104]... |
| resourceId.buffer.1 | 100.0% | number | 0 | [235]... |
| resourceId.buffer.2 | 100.0% | number | 0 | [32]... |
| resourceId.buffer.3 | 100.0% | number | 0 | [177]... |
| resourceId.buffer.4 | 100.0% | number | 0 | [250]... |
| resourceId.buffer.5 | 100.0% | number | 0 | [1]... |
| resourceId.buffer.6 | 100.0% | number | 0 | [104]... |
| resourceId.buffer.7 | 100.0% | number | 0 | [127]... |
| resourceId.buffer.8 | 100.0% | number | 0 | [54]... |
| resourceId.buffer.9 | 100.0% | number | 0 | [169]... |
| resourceId.buffer.10 | 100.0% | number | 0 | [187]... |
| resourceId.buffer.11 | 100.0% | number | 0 | [63]... |
| changes | 100.0% | object | 0 | [{"platform":"instagram","postUrl":"https://www.in... |
| changes.platform | 100.0% | string | 0 | ["instagram"]... |
| changes.postUrl | 100.0% | string | 0 | ["https://www.instagram.com/instagram/p/DPjy55CEh3... |
| changes.cashbackAmount | 100.0% | number | 0 | [0]... |
| changes.orderId | 100.0% | string | 0 | ["68e24b6d4381285a768357e4"]... |
| metadata | 100.0% | object | 0 | [{"ipAddress":"127.0.0.1","userAgent":"Mozilla/5.0... |
| metadata.ipAddress | 100.0% | string | 0 | ["127.0.0.1"]... |
| metadata.userAgent | 100.0% | string | 0 | ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac... |
| timestamp | 100.0% | object | 0 | ["2025-10-12T03:29:53.950Z"]... |
| createdAt | 100.0% | object | 0 | ["2025-10-12T03:29:53.954Z"]... |
| __v | 100.0% | number | 0 | [0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "userId": 1
    },
    "name": "userId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "action": 1
    },
    "name": "action_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "resource": 1
    },
    "name": "resource_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "resourceId": 1
    },
    "name": "resourceId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "timestamp": 1
    },
    "name": "timestamp_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "timestamp": -1
    },
    "name": "userId_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "resource": 1,
      "action": 1,
      "timestamp": -1
    },
    "name": "resource_1_action_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "resourceId": 1,
      "timestamp": -1
    },
    "name": "resourceId_1_timestamp_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68eb20b1fa01687f36a9bb41",
  "userId": "68c145d5f016515d8eb31c0c",
  "action": "social_media_post_submitted",
  "resource": "SocialMediaPost",
  "resourceId": "68eb20b1fa01687f36a9bb3f",
  "changes": {
    "platform": "instagram",
    "postUrl": "https://www.instagram.com/instagram/p/DPjy55CEh3F/...",
    "cashbackAmount": 0,
    "orderId": "68e24b6d4381285a768357e4"
  },
  "metadata": {
    "ipAddress": "127.0.0.1",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"
  },
  "timestamp": "2025-10-12T03:29:53.950Z",
  "createdAt": "2025-10-12T03:29:53.954Z",
  "__v": 0
}
```

---

### users

**Document Count:** 53

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68ee29d08c4fa11015d70339","68ef4c432629859fd1137... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [238,239,239]... |
| _id.buffer.2 | 100.0% | number | 0 | [41,76,77]... |
| _id.buffer.3 | 100.0% | number | 0 | [208,67,65]... |
| _id.buffer.4 | 100.0% | number | 0 | [140,38,6]... |
| _id.buffer.5 | 100.0% | number | 0 | [79,41,31]... |
| _id.buffer.6 | 100.0% | number | 0 | [161,133,170]... |
| _id.buffer.7 | 100.0% | number | 0 | [16,159,240]... |
| _id.buffer.8 | 100.0% | number | 0 | [21,209,69]... |
| _id.buffer.9 | 100.0% | number | 0 | [215,19,34]... |
| _id.buffer.10 | 100.0% | number | 0 | [3,114,37]... |
| _id.buffer.11 | 100.0% | number | 0 | [57,0,6]... |
| phoneNumber | 100.0% | string | 0 | ["+91-9999999999","+919876543210","+918210224305"]... |
| email | 100.0% | string | 0 | ["admin@offers.com","test@example.com","mukulraj75... |
| profile | 100.0% | object | 0 | [{"avatar":"https://images.unsplash.com/photo-1472... |
| profile.avatar | 100.0% | string | 8 | ["https://images.unsplash.com/photo-1472099645785-... |
| profile.bio | 90.0% | string | 0 | ["System administrator for offers management","ear... |
| profile.locationHistory | 100.0% | array | 0 | [[],[],[]]... |
| profile.timezone | 100.0% | string | 0 | ["Asia/Kolkata","Asia/Kolkata","Asia/Kolkata"]... |
| profile.jewelryPreferences | 100.0% | object | 0 | [{"preferredMetals":[],"preferredStones":[]},{"pre... |
| profile.jewelryPreferences.preferredMetals | 100.0% | array | 0 | [[],[],[]]... |
| profile.jewelryPreferences.preferredStones | 100.0% | array | 0 | [[],[],[]]... |
| preferences | 100.0% | object | 0 | [{"language":"en","notifications":true,"categories... |
| preferences.language | 100.0% | string | 0 | ["en","en","en"]... |
| preferences.notifications | 100.0% | boolean, object | 0 | [true,true,{"push":true,"email":true,"sms":true}]... |
| preferences.categories | 100.0% | array | 0 | [[],[],[]]... |
| preferences.theme | 100.0% | string | 0 | ["light","light","light"]... |
| preferences.emailNotifications | 100.0% | boolean | 0 | [true,true,true]... |
| preferences.pushNotifications | 100.0% | boolean | 0 | [true,true,true]... |
| preferences.smsNotifications | 100.0% | boolean | 0 | [false,false,false]... |
| wallet | 100.0% | object | 0 | [{"balance":350,"totalEarned":50,"totalSpent":0,"p... |
| wallet.balance | 100.0% | number | 0 | [350,50,50]... |
| wallet.totalEarned | 100.0% | number | 0 | [50,50,50]... |
| wallet.totalSpent | 100.0% | number | 0 | [0,0,0]... |
| wallet.pendingAmount | 100.0% | number | 0 | [0,0,0]... |
| auth | 100.0% | object | 0 | [{"isVerified":false,"isOnboarded":false,"loginAtt... |
| auth.isVerified | 100.0% | boolean | 0 | [false,false,false]... |
| auth.isOnboarded | 100.0% | boolean | 0 | [false,false,true]... |
| auth.loginAttempts | 90.0% | number | 0 | [0,0,0]... |
| referral | 100.0% | object | 0 | [{"referredUsers":["68ef4c432629859fd1137200"],"to... |
| referral.referredUsers | 100.0% | array | 0 | [["68ef4c432629859fd1137200"],["68ef4d41061faaf045... |
| referral.totalReferrals | 100.0% | number | 0 | [1,1,1]... |
| referral.referralEarnings | 100.0% | number | 0 | [50,50,50]... |
| referral.referralCode | 100.0% | string | 0 | ["U75ZV4","91166E","REF222506"]... |
| role | 100.0% | string | 0 | ["admin","user","user"]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| createdAt | 100.0% | object | 0 | ["2025-10-14T10:45:36.606Z","2025-10-15T07:24:51.5... |
| updatedAt | 100.0% | object | 0 | ["2025-10-24T12:11:14.536Z","2025-10-27T08:50:45.9... |
| __v | 100.0% | number | 0 | [0,1,2]... |
| walletBalance | 100.0% | number | 0 | [350,50,50]... |
| auth.otpCode | 20.0% | string | 0 | ["149092","195979"]... |
| auth.otpExpiry | 20.0% | object | 0 | ["2025-10-27T09:00:44.342Z","2025-11-14T10:19:11.8... |
| auth.lastLogin | 90.0% | object | 0 | ["2025-10-27T08:50:44.516Z","2025-11-14T10:09:17.5... |
| referral.referredBy | 90.0% | string | 0 | ["U75ZV4","91166E","REF222506"]... |
| interests | 90.0% | array | 0 | [[],[],[]]... |
| isPremium | 90.0% | boolean | 0 | [false,false,false]... |
| referralTier | 90.0% | string | 0 | ["STARTER","STARTER","STARTER"]... |
| userType | 90.0% | string | 0 | ["regular","regular","regular"]... |
| profile.location | 80.0% | object | 0 | [{"address":"patna"},{"address":"Area 32, Mumbai",... |
| profile.location.address | 80.0% | string | 0 | ["patna","Area 32, Mumbai","Area 16, Mumbai"]... |
| profile.firstName | 80.0% | string | 0 | ["Mukul","Raj","Priya"]... |
| profile.lastName | 80.0% | string | 0 | ["Raj","Kumar","Sharma"]... |
| profile.email | 10.0% | string | 0 | ["mukulraj756@gmail.com"]... |
| profile.dateOfBirth | 80.0% | object | 0 | ["1994-12-31T18:30:00.000Z","1989-12-31T18:30:00.0... |
| profile.gender | 80.0% | string | 0 | ["male","male","female"]... |
| profile.website | 10.0% | string | 0 | ["https://moviesmod.plus/"]... |
| preferences.notifications.push | 80.0% | boolean | 0 | [true,true,true]... |
| preferences.notifications.email | 80.0% | boolean | 0 | [true,true,true]... |
| preferences.notifications.sms | 80.0% | boolean | 0 | [true,true,false]... |
| preferences.privacy | 10.0% | object | 0 | [{"profileVisibility":"public","showPhone":false}]... |
| preferences.privacy.profileVisibility | 10.0% | string | 0 | ["public"]... |
| preferences.privacy.showPhone | 10.0% | boolean | 0 | [false]... |
| preferences.currency | 10.0% | string | 0 | ["INR"]... |
| preferences.timezone | 10.0% | string | 0 | ["Asia/Kolkata"]... |
| wallet.currency | 10.0% | string | 0 | ["INR"]... |
| isOnboarded | 10.0% | boolean | 0 | [true]... |
| auth.otpVerified | 10.0% | boolean | 0 | [true]... |
| auth.lastOtpVerification | 10.0% | object | 0 | ["2025-10-15T07:29:05.793Z"]... |
| auth.refreshToken | 10.0% | string | 0 | ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQ... |
| referral.code | 10.0% | string | 0 | ["MUKUL123"]... |
| referral.totalEarnings | 10.0% | number | 0 | [0]... |
| referral._id | 10.0% | object | 0 | ["690993b779c53058662588d2"]... |
| referral._id.buffer | 10.0% | object | 0 | [{"type":"Buffer","data":[105,9,147,183,121,197,48... |
| referral._id.buffer.0 | 10.0% | number | 0 | [105]... |
| referral._id.buffer.1 | 10.0% | number | 0 | [9]... |
| referral._id.buffer.2 | 10.0% | number | 0 | [147]... |
| referral._id.buffer.3 | 10.0% | number | 0 | [183]... |
| referral._id.buffer.4 | 10.0% | number | 0 | [121]... |
| referral._id.buffer.5 | 10.0% | number | 0 | [197]... |
| referral._id.buffer.6 | 10.0% | number | 0 | [48]... |
| referral._id.buffer.7 | 10.0% | number | 0 | [88]... |
| referral._id.buffer.8 | 10.0% | number | 0 | [102]... |
| referral._id.buffer.9 | 10.0% | number | 0 | [37]... |
| referral._id.buffer.10 | 10.0% | number | 0 | [136]... |
| referral._id.buffer.11 | 10.0% | number | 0 | [210]... |
| referralCode | 10.0% | string | 0 | ["REF222506"]... |
| age | 10.0% | number | 0 | [30]... |
| fullName | 10.0% | string | 0 | ["Mukul Raj"]... |
| location | 10.0% | string | 0 | ["patna"]... |
| profile.location.city | 70.0% | string | 0 | ["Mumbai","Mumbai","Mumbai"]... |
| profile.location.state | 70.0% | string | 0 | ["Maharashtra","Maharashtra","Maharashtra"]... |
| profile.location.pincode | 70.0% | string | 0 | ["400069","400041","400095"]... |
| profile.location.coordinates | 70.0% | array | 0 | [[72.86976938099768,19.096279455042367],[72.836807... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "phoneNumber": 1
    },
    "name": "phoneNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "email": 1
    },
    "name": "email_1",
    "background": true,
    "unique": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "profile.location.coordinates": "2dsphere"
    },
    "name": "profile.location.coordinates_2dsphere",
    "background": true,
    "2dsphereIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "referral.referralCode": 1
    },
    "name": "referral.referralCode_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "referral.referredBy": 1
    },
    "name": "referral.referredBy_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "auth.isVerified": 1
    },
    "name": "auth.isVerified_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "role": 1
    },
    "name": "role_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "referralCode": 1
    },
    "name": "referralCode_1",
    "background": true,
    "unique": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "username": 1
    },
    "name": "username_1",
    "background": true,
    "unique": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "referralTier": 1
    },
    "name": "referralTier_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68ee29d08c4fa11015d70339",
  "phoneNumber": "+91-9999999999",
  "email": "admin@offers.com",
  "profile": {
    "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    "bio": "System administrator for offers management",
    "locationHistory": [],
    "timezone": "Asia/Kolkata",
    "jewelryPreferences": {
      "preferredMetals": [],
      "preferredStones": []
    }
  },
  "preferences": {
    "language": "en",
    "notifications": true,
    "categories": [],
    "theme": "light",
    "emailNotifications": true,
    "pushNotifications": true,
    "smsNotifications": false
  },
  "wallet": {
    "balance": 350,
    "totalEarned": 50,
    "totalSpent": 0,
    "pendingAmount": 0
  },
  "auth": {
    "isVerified": false,
    "isOnboarded": false,
    "loginAttempts": 0
  },
  "referral": {
    "referredUsers": [
      "68ef4c432629859fd1137200"
    ],
    "totalReferrals": 1,
    "referralEarnings": 50,
    "referralCode": "U75ZV4"
  },
  "role": "admin",
  "isActive": true,
  "createdAt": "2025-10-14T10:45:36.606Z",
  "updatedAt": "2025-10-24T12:11:14.536Z",
  "__v": 0,
  "walletBalance": 350
}
```

---

### partners

**Document Count:** 11

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["6901b77cc839502e8d4ace8c","6901b77cc839502e8d4ac... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,1,183,124,200,57,80,... |
| _id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| _id.buffer.1 | 100.0% | number | 0 | [1,1,1]... |
| _id.buffer.2 | 100.0% | number | 0 | [183,183,183]... |
| _id.buffer.3 | 100.0% | number | 0 | [124,124,124]... |
| _id.buffer.4 | 100.0% | number | 0 | [200,200,200]... |
| _id.buffer.5 | 100.0% | number | 0 | [57,57,57]... |
| _id.buffer.6 | 100.0% | number | 0 | [80,80,80]... |
| _id.buffer.7 | 100.0% | number | 0 | [46,46,46]... |
| _id.buffer.8 | 100.0% | number | 0 | [141,141,141]... |
| _id.buffer.9 | 100.0% | number | 0 | [74,74,74]... |
| _id.buffer.10 | 100.0% | number | 0 | [206,206,206]... |
| _id.buffer.11 | 100.0% | number | 0 | [140,156,172]... |
| userId | 100.0% | object | 0 | ["68ee29d08c4fa11015d70339","68fb5d9318377fe11cba7... |
| userId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| userId.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| userId.buffer.1 | 100.0% | number | 0 | [238,251,251]... |
| userId.buffer.2 | 100.0% | number | 0 | [41,93,93]... |
| userId.buffer.3 | 100.0% | number | 0 | [208,147,147]... |
| userId.buffer.4 | 100.0% | number | 0 | [140,24,24]... |
| userId.buffer.5 | 100.0% | number | 0 | [79,55,55]... |
| userId.buffer.6 | 100.0% | number | 0 | [161,127,127]... |
| userId.buffer.7 | 100.0% | number | 0 | [16,225,225]... |
| userId.buffer.8 | 100.0% | number | 0 | [21,28,28]... |
| userId.buffer.9 | 100.0% | number | 0 | [215,186,186]... |
| userId.buffer.10 | 100.0% | number | 0 | [3,116,116]... |
| userId.buffer.11 | 100.0% | number | 0 | [57,190,188]... |
| name | 100.0% | string | 0 | ["admin","Karan Desai","Arjun Agarwal"]... |
| email | 100.0% | string | 0 | ["admin@offers.com","karan.desai13@test.com","arju... |
| avatar | 100.0% | string | 9 | ["https://images.unsplash.com/photo-1472099645785-... |
| currentLevel | 100.0% | object | 0 | [{"level":1,"name":"Partner","requirements":{"orde... |
| currentLevel.level | 100.0% | number | 0 | [1,1,1]... |
| currentLevel.name | 100.0% | string | 0 | ["Partner","Partner","Partner"]... |
| currentLevel.requirements | 100.0% | object | 0 | [{"orders":15,"timeframe":44},{"orders":15,"timefr... |
| currentLevel.requirements.orders | 100.0% | number | 0 | [15,15,15]... |
| currentLevel.requirements.timeframe | 100.0% | number | 0 | [44,44,44]... |
| currentLevel.achievedAt | 100.0% | object | 0 | ["2025-10-29T06:43:04.229Z","2025-10-29T06:43:04.2... |
| currentLevel._id | 100.0% | object | 0 | ["6901b77cc839502e8d4ace8b","6901b77cc839502e8d4ac... |
| currentLevel._id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,1,183,124,200,57,80,... |
| currentLevel._id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| currentLevel._id.buffer.1 | 100.0% | number | 0 | [1,1,1]... |
| currentLevel._id.buffer.2 | 100.0% | number | 0 | [183,183,183]... |
| currentLevel._id.buffer.3 | 100.0% | number | 0 | [124,124,124]... |
| currentLevel._id.buffer.4 | 100.0% | number | 0 | [200,200,200]... |
| currentLevel._id.buffer.5 | 100.0% | number | 0 | [57,57,57]... |
| currentLevel._id.buffer.6 | 100.0% | number | 0 | [80,80,80]... |
| currentLevel._id.buffer.7 | 100.0% | number | 0 | [46,46,46]... |
| currentLevel._id.buffer.8 | 100.0% | number | 0 | [141,141,141]... |
| currentLevel._id.buffer.9 | 100.0% | number | 0 | [74,74,74]... |
| currentLevel._id.buffer.10 | 100.0% | number | 0 | [206,206,206]... |
| currentLevel._id.buffer.11 | 100.0% | number | 0 | [139,155,171]... |
| totalOrders | 100.0% | number | 0 | [0,0,0]... |
| ordersThisLevel | 100.0% | number | 0 | [0,0,0]... |
| totalSpent | 100.0% | number | 0 | [0,0,0]... |
| milestones | 100.0% | array | 0 | [[{"orderCount":5,"reward":{"type":"cashback","val... |
| tasks | 100.0% | array | 0 | [[{"title":"Complete Your Profile","description":"... |
| jackpotProgress | 100.0% | array | 0 | [[{"spendAmount":25000,"title":"Silver Jackpot","d... |
| claimableOffers | 100.0% | array | 0 | [[{"title":"10% Off on Electronics","description":... |
| earnings | 100.0% | object | 0 | [{"total":0,"pending":0,"paid":0,"thisMonth":0,"la... |
| earnings.total | 100.0% | number | 0 | [0,0,0]... |
| earnings.pending | 100.0% | number | 0 | [0,0,0]... |
| earnings.paid | 100.0% | number | 0 | [0,0,0]... |
| earnings.thisMonth | 100.0% | number | 0 | [0,0,0]... |
| earnings.lastMonth | 100.0% | number | 0 | [0,0,0]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| status | 100.0% | string | 0 | ["active","active","active"]... |
| levelHistory | 100.0% | array | 0 | [[],[],[]]... |
| joinDate | 100.0% | object | 0 | ["2025-10-29T06:43:08.223Z","2025-10-29T06:43:08.3... |
| levelStartDate | 100.0% | object | 0 | ["2025-10-29T06:43:08.223Z","2025-10-29T06:43:08.3... |
| validUntil | 100.0% | object | 0 | ["2025-12-12T06:43:08.223Z","2025-12-12T06:43:08.3... |
| lastActivityDate | 100.0% | object | 0 | ["2025-10-29T06:43:08.223Z","2025-10-29T06:43:08.3... |
| createdAt | 100.0% | object | 0 | ["2025-10-29T06:43:08.272Z","2025-10-29T06:43:08.3... |
| updatedAt | 100.0% | object | 0 | ["2025-10-29T06:43:08.272Z","2025-10-29T06:43:08.3... |
| __v | 100.0% | number | 0 | [0,0,0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "userId": 1
    },
    "name": "userId_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "email": 1
    },
    "name": "email_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "currentLevel.level": 1
    },
    "name": "currentLevel.level_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "isActive": 1
    },
    "name": "status_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validUntil": 1
    },
    "name": "validUntil_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "6901b77cc839502e8d4ace8c",
  "userId": "68ee29d08c4fa11015d70339",
  "name": "admin",
  "email": "admin@offers.com",
  "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
  "currentLevel": {
    "level": 1,
    "name": "Partner",
    "requirements": {
      "orders": 15,
      "timeframe": 44
    },
    "achievedAt": "2025-10-29T06:43:04.229Z",
    "_id": "6901b77cc839502e8d4ace8b"
  },
  "totalOrders": 0,
  "ordersThisLevel": 0,
  "totalSpent": 0,
  "milestones": [
    {
      "orderCount": 5,
      "reward": {
        "type": "cashback",
        "value": 100,
        "title": "₹100 Cashback",
        "description": "Complete 5 orders"
      },
      "achieved": false,
      "_id": "6901b77cc839502e8d4ace8d"
    },
    {
      "orderCount": 10,
      "reward": {
        "type": "voucher",
        "value": 200,
        "title": "₹200 Shopping Voucher",
        "description": "Complete 10 orders"
      },
      "achieved": false,
      "_id": "6901b77cc839502e8d4ace8e"
    },
    {
      "orderCount": 15,
      "reward": {
        "type": "cashback",
        "value": 500,
        "title": "₹500 Cashback Bonus",
        "description": "Complete 15 orders and upgrade to Influencer"
      },
      "achieved": false,
      "_id": "6901b77cc839502e8d4ace8f"
    },
    {
      "orderCount": 20,
      "reward": {
        "type": "points",
        "value": 1000,
        "title": "1000 Loyalty Points",
        "description": "Complete 20 orders"
      },
      "achieved": false,
      "_id": "6901b77cc839502e8d4ace90"
    }
  ],
  "tasks": [
    {
      "title": "Complete Your Profile",
      "description": "Add your profile picture and complete all details",
      "type": "profile",
      "reward": {
        "type": "points",
        "value": 100,
        "title": "100 Points"
      },
      "progress": {
        "current": 0,
        "target": 1
      },
      "completed": false,
      "claimed": false,
      "_id": "6901b77cc839502e8d4ace91"
    },
    {
      "title": "Write 5 Reviews",
      "description": "Share your experience with products",
      "type": "review",
      "reward": {
        "type": "cashback",
        "value": 50,
        "title": "₹50 Cashback"
      },
      "progress": {
        "current": 0,
        "target": 5
      },
      "completed": false,
      "claimed": false,
      "_id": "6901b77cc839502e8d4ace92"
    },
    {
      "title": "Refer 3 Friends",
      "description": "Invite friends to join REZ",
      "type": "referral",
      "reward": {
        "type": "cashback",
        "value": 150,
        "title": "₹150 Cashback"
      },
      "progress": {
        "current": 0,
        "target": 3
      },
      "completed": false,
      "claimed": false,
      "_id": "6901b77cc839502e8d4ace93"
    },
    {
      "title": "Share on Social Media",
      "description": "Share REZ on your social media",
      "type": "social",
      "reward": {
        "type": "points",
        "value": 200,
        "title": "200 Points"
      },
      "progress": {
        "current": 0,
        "target": 3
      },
      "completed": false,
      "claimed": false,
      "_id": "6901b77cc839502e8d4ace94"
    }
  ],
  "jackpotProgress": [
    {
      "spendAmount": 25000,
      "title": "Silver Jackpot",
      "description": "Spend ₹25,000 to unlock",
      "reward": {
        "type": "cashback",
        "value": 1000,
        "title": "₹1000 Cashback"
      },
      "achieved": false,
      "_id": "6901b77cc839502e8d4ace95"
    },
    {
      "spendAmount": 50000,
      "title": "Gold Jackpot",
      "description": "Spend ₹50,000 to unlock",
      "reward": {
        "type": "voucher",
        "value": 2500,
        "title": "₹2500 Shopping Voucher"
      },
      "achieved": false,
      "_id": "6901b77cc839502e8d4ace96"
    },
    {
      "spendAmount": 100000,
      "title": "Platinum Jackpot",
      "description": "Spend ₹1,00,000 to unlock",
      "reward": {
        "type": "product",
        "value": 5000,
        "title": "Premium Gift Hamper Worth ₹5000"
      },
      "achieved": false,
      "_id": "6901b77cc839502e8d4ace97"
    }
  ],
  "claimableOffers": [
    {
      "title": "10% Off on Electronics",
      "description": "Get 10% discount on all electronics",
      "discount": 10,
      "category": "Electronics",
      "validFrom": "2025-10-29T06:43:08.148Z",
      "validUntil": "2025-11-28T06:43:08.148Z",
      "termsAndConditions": [
        "Valid for 30 days from activation",
        "Minimum purchase of ₹1000",
        "Cannot be combined with other offers"
      ],
      "claimed": false,
      "minPurchase": 1000,
      "maxDiscount": 500,
      "_id": "6901b77cc839502e8d4ace98"
    },
    {
      "title": "15% Off on Fashion",
      "description": "Get 15% discount on fashion items",
      "discount": 15,
      "category": "Fashion",
      "validFrom": "2025-10-29T06:43:08.148Z",
      "validUntil": "2025-11-28T06:43:08.148Z",
      "termsAndConditions": [
        "Valid for 30 days from activation",
        "Minimum purchase of ₹500",
        "Maximum discount ₹300"
      ],
      "claimed": false,
      "minPurchase": 500,
      "maxDiscount": 300,
      "_id": "6901b77cc839502e8d4ace99"
    }
  ],
  "earnings": {
    "total": 0,
    "pending": 0,
    "paid": 0,
    "thisMonth": 0,
    "lastMonth": 0
  },
  "isActive": true,
  "status": "active",
  "levelHistory": [],
  "joinDate": "2025-10-29T06:43:08.223Z",
  "levelStartDate": "2025-10-29T06:43:08.223Z",
  "validUntil": "2025-12-12T06:43:08.223Z",
  "lastActivityDate": "2025-10-29T06:43:08.223Z",
  "createdAt": "2025-10-29T06:43:08.272Z",
  "updatedAt": "2025-10-29T06:43:08.272Z",
  "__v": 0
}
```

---

### orders

**Document Count:** 15

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68db357475c73d30b8dccdb3","68db35c84aa7f6265d4f7... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,219,53,116,117,199,6... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [219,219,219]... |
| _id.buffer.2 | 100.0% | number | 0 | [53,53,60]... |
| _id.buffer.3 | 100.0% | number | 0 | [116,200,132]... |
| _id.buffer.4 | 100.0% | number | 0 | [117,74,212]... |
| _id.buffer.5 | 100.0% | number | 0 | [199,167,100]... |
| _id.buffer.6 | 100.0% | number | 0 | [61,246,225]... |
| _id.buffer.7 | 100.0% | number | 0 | [48,38,87]... |
| _id.buffer.8 | 100.0% | number | 0 | [184,93,120]... |
| _id.buffer.9 | 100.0% | number | 0 | [220,79,62]... |
| _id.buffer.10 | 100.0% | number | 0 | [205,119,180]... |
| _id.buffer.11 | 100.0% | number | 0 | [179,225,170]... |
| orderNumber | 100.0% | string | 0 | ["ORD17591965328290001","ORD17591966166430002","OR... |
| user | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c","68c145d5f016515d8eb31... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [69,69,69]... |
| user.buffer.3 | 100.0% | number | 0 | [213,213,213]... |
| user.buffer.4 | 100.0% | number | 0 | [240,240,240]... |
| user.buffer.5 | 100.0% | number | 0 | [22,22,22]... |
| user.buffer.6 | 100.0% | number | 0 | [81,81,81]... |
| user.buffer.7 | 100.0% | number | 0 | [93,93,93]... |
| user.buffer.8 | 100.0% | number | 0 | [142,142,142]... |
| user.buffer.9 | 100.0% | number | 0 | [179,179,179]... |
| user.buffer.10 | 100.0% | number | 0 | [28,28,28]... |
| user.buffer.11 | 100.0% | number | 0 | [12,12,12]... |
| items | 100.0% | array | 0 | [[{"product":"68da62658dc2bd85d0afdb58","store":"6... |
| totals | 100.0% | object | 0 | [{"subtotal":303694,"tax":54664.92,"delivery":0,"d... |
| totals.subtotal | 100.0% | number | 0 | [303694,3697,1798]... |
| totals.tax | 100.0% | number | 0 | [54664.92,665.46,323.64]... |
| totals.delivery | 100.0% | number | 0 | [0,0,0]... |
| totals.discount | 100.0% | number | 0 | [30369.4,369.7,0]... |
| totals.cashback | 100.0% | number | 0 | [5466.49,66.55,0]... |
| totals.total | 100.0% | number | 0 | [327989.52,3992.76,2121.64]... |
| totals.paidAmount | 100.0% | number | 0 | [0,0,0]... |
| totals.refundAmount | 100.0% | number | 0 | [0,0,0]... |
| payment | 100.0% | object | 0 | [{"method":"cod","status":"pending"},{"method":"co... |
| payment.method | 100.0% | string | 0 | ["cod","cod","cod"]... |
| payment.status | 100.0% | string | 0 | ["pending","pending","pending"]... |
| delivery | 100.0% | object | 0 | [{"method":"standard","status":"pending","address"... |
| delivery.method | 100.0% | string | 0 | ["standard","standard","standard"]... |
| delivery.status | 100.0% | string | 0 | ["pending","pending","pending"]... |
| delivery.address | 100.0% | object | 0 | [{"name":"John Doe","phone":"+919876543210","addre... |
| delivery.address.name | 100.0% | string | 0 | ["John Doe","John Doe","Test User"]... |
| delivery.address.phone | 100.0% | string | 0 | ["+919876543210","+919876543210","9876543210"]... |
| delivery.address.addressLine1 | 100.0% | string | 0 | ["123 Test Street","123 Test Street","123 Test Str... |
| delivery.address.addressLine2 | 30.0% | string | 0 | ["Near Test Park","Near Test Park",""]... |
| delivery.address.city | 100.0% | string | 0 | ["Mumbai","Mumbai","Bangalore"]... |
| delivery.address.state | 100.0% | string | 0 | ["Maharashtra","Maharashtra","Karnataka"]... |
| delivery.address.pincode | 100.0% | string | 0 | ["400001","400001","560001"]... |
| delivery.address.landmark | 30.0% | string | 0 | ["Opposite City Mall","Opposite City Mall",""]... |
| delivery.address.addressType | 100.0% | string | 0 | ["home","home","home"]... |
| delivery.address.country | 100.0% | string | 0 | ["India","India","India"]... |
| delivery.deliveryFee | 100.0% | number | 0 | [0,0,0]... |
| delivery.attempts | 100.0% | array | 0 | [[],[],[]]... |
| timeline | 100.0% | array | 0 | [[{"status":"placed","message":"Order has been pla... |
| analytics | 100.0% | object | 0 | [{"source":"app"},{"source":"app"},{"source":"app"... |
| analytics.source | 100.0% | string | 0 | ["app","app","app"]... |
| status | 100.0% | string | 0 | ["cancelled","cancelled","cancelled"]... |
| couponCode | 20.0% | string | 0 | ["WELCOME10","WELCOME10"]... |
| specialInstructions | 30.0% | string | 0 | ["Please deliver between 10 AM - 2 PM","Please del... |
| rating | 100.0% | object | 0 | [{"ratedAt":"2025-09-30T01:42:12.838Z"},{"ratedAt"... |
| rating.ratedAt | 100.0% | object | 0 | ["2025-09-30T01:42:12.838Z","2025-09-30T01:43:36.6... |
| createdAt | 100.0% | object | 0 | ["2025-09-30T01:42:12.842Z","2025-09-30T01:43:36.6... |
| updatedAt | 100.0% | object | 0 | ["2025-09-30T01:47:55.312Z","2025-09-30T01:46:28.4... |
| __v | 100.0% | number | 0 | [1,1,1]... |
| cancelReason | 20.0% | string | 0 | ["Testing order cancellation workflow","Customer r... |
| cancelledAt | 20.0% | object | 0 | ["2025-09-30T01:47:55.302Z","2025-10-03T07:17:05.0... |
| cancellation | 10.0% | object | 0 | [{"reason":"Changed my mind - testing cancellation... |
| cancellation.reason | 10.0% | string | 0 | ["Changed my mind - testing cancellation"]... |
| cancellation.cancelledAt | 10.0% | object | 0 | ["2025-09-30T01:46:28.430Z"]... |
| payment.transactionId | 60.0% | string | 0 | ["TXN17594054957560","TXN17594054957561","TXN17594... |
| payment.paidAt | 60.0% | object | 0 | ["2025-09-27T11:44:55.756Z","2025-09-24T11:44:55.7... |
| delivery.deliveredAt | 20.0% | object | 0 | ["2025-09-30T11:44:55.756Z","2025-09-18T11:44:55.7... |
| payment.coinsUsed | 10.0% | object | 0 | [{"wasilCoins":0,"promoCoins":0,"totalCoinsValue":... |
| payment.coinsUsed.wasilCoins | 10.0% | number | 0 | [0]... |
| payment.coinsUsed.promoCoins | 10.0% | number | 0 | [0]... |
| payment.coinsUsed.totalCoinsValue | 10.0% | number | 0 | [0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "orderNumber": 1
    },
    "name": "orderNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "delivery.address.coordinates": "2dsphere"
    },
    "name": "delivery.address.coordinates_2dsphere",
    "background": true,
    "2dsphereIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "createdAt": -1
    },
    "name": "status_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "payment.status": 1
    },
    "name": "payment.status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "delivery.status": 1
    },
    "name": "delivery.status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "items.store": 1,
      "createdAt": -1
    },
    "name": "items.store_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "delivery.estimatedTime": 1
    },
    "name": "delivery.estimatedTime_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1,
      "createdAt": -1
    },
    "name": "user_1_status_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "items.store": 1,
      "status": 1
    },
    "name": "items.store_1_status_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68db357475c73d30b8dccdb3",
  "orderNumber": "ORD17591965328290001",
  "user": "68c145d5f016515d8eb31c0c",
  "items": [
    {
      "product": "68da62658dc2bd85d0afdb58",
      "store": "68da61d8a9d4bc0bf86affa9",
      "name": "Data Science Handbook",
      "image": "https://via.placeholder.com/150",
      "quantity": 1,
      "price": 0,
      "originalPrice": 0,
      "discount": 0,
      "subtotal": 0,
      "_id": "68db357475c73d30b8dccdb4"
    },
    {
      "product": "68da62658dc2bd85d0afdb4e",
      "store": "68da61d8a9d4bc0bf86affa7",
      "name": "iPhone 15 Pro",
      "image": "https://via.placeholder.com/150",
      "quantity": 3,
      "price": 99999,
      "originalPrice": 109999,
      "discount": 9,
      "subtotal": 299997,
      "_id": "68db357475c73d30b8dccdb5"
    },
    {
      "product": "68da62658dc2bd85d0afdb57",
      "store": "68da61d8a9d4bc0bf86affa9",
      "name": "JavaScript: The Complete Guide",
      "image": "https://via.placeholder.com/150",
      "quantity": 2,
      "price": 899,
      "originalPrice": 1299,
      "discount": 31,
      "subtotal": 1798,
      "_id": "68db357475c73d30b8dccdb6"
    },
    {
      "product": "68da62658dc2bd85d0afdb59",
      "store": "68da61d8a9d4bc0bf86affaa",
      "name": "Professional Yoga Mat",
      "image": "https://via.placeholder.com/150",
      "quantity": 1,
      "price": 1899,
      "originalPrice": 2499,
      "discount": 24,
      "subtotal": 1899,
      "_id": "68db357475c73d30b8dccdb7"
    }
  ],
  "totals": {
    "subtotal": 303694,
    "tax": 54664.92,
    "delivery": 0,
    "discount": 30369.4,
    "cashback": 5466.49,
    "total": 327989.52,
    "paidAmount": 0,
    "refundAmount": 0
  },
  "payment": {
    "method": "cod",
    "status": "pending"
  },
  "delivery": {
    "method": "standard",
    "status": "pending",
    "address": {
      "name": "John Doe",
      "phone": "+919876543210",
      "addressLine1": "123 Test Street",
      "addressLine2": "Near Test Park",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "landmark": "Opposite City Mall",
      "addressType": "home",
      "country": "India"
    },
    "deliveryFee": 0,
    "attempts": []
  },
  "timeline": [
    {
      "status": "placed",
      "message": "Order has been placed successfully",
      "timestamp": "2025-09-30T01:42:12.829Z",
      "_id": "68db357475c73d30b8dccdb8"
    },
    {
      "status": "cancelled",
      "message": "Order has been cancelled",
      "timestamp": "2025-09-30T01:47:55.313Z",
      "_id": "68db36cbd464e157783eb169"
    }
  ],
  "analytics": {
    "source": "app"
  },
  "status": "cancelled",
  "couponCode": "WELCOME10",
  "specialInstructions": "Please deliver between 10 AM - 2 PM",
  "rating": {
    "ratedAt": "2025-09-30T01:42:12.838Z"
  },
  "createdAt": "2025-09-30T01:42:12.842Z",
  "updatedAt": "2025-09-30T01:47:55.312Z",
  "__v": 1,
  "cancelReason": "Testing order cancellation workflow",
  "cancelledAt": "2025-09-30T01:47:55.302Z"
}
```

---

### quizquestions

**Document Count:** 50

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["690890475c1dfec16055b4ab","690890475c1dfec16055b... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,8,144,71,92,29,254,1... |
| _id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| _id.buffer.1 | 100.0% | number | 0 | [8,8,8]... |
| _id.buffer.2 | 100.0% | number | 0 | [144,144,144]... |
| _id.buffer.3 | 100.0% | number | 0 | [71,71,71]... |
| _id.buffer.4 | 100.0% | number | 0 | [92,92,92]... |
| _id.buffer.5 | 100.0% | number | 0 | [29,29,29]... |
| _id.buffer.6 | 100.0% | number | 0 | [254,254,254]... |
| _id.buffer.7 | 100.0% | number | 0 | [193,193,193]... |
| _id.buffer.8 | 100.0% | number | 0 | [96,96,96]... |
| _id.buffer.9 | 100.0% | number | 0 | [85,85,85]... |
| _id.buffer.10 | 100.0% | number | 0 | [180,180,180]... |
| _id.buffer.11 | 100.0% | number | 0 | [171,174,191]... |
| question | 100.0% | string | 0 | ["What is the primary purpose of a fashion lookboo... |
| options | 100.0% | array | 0 | [["To sell directly to customers","To showcase a c... |
| correctAnswer | 100.0% | number | 0 | [1,1,1]... |
| category | 100.0% | string | 0 | ["fashion","food","lifestyle"]... |
| difficulty | 100.0% | string | 0 | ["easy","easy","easy"]... |
| points | 100.0% | number | 0 | [10,10,10]... |
| explanation | 100.0% | string | 0 | ["A lookbook presents a curated collection of outf... |
| tags | 100.0% | array | 0 | [["marketing","styling"],["local","fresh"],["welln... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| usageCount | 100.0% | number | 0 | [0,0,0]... |
| correctAnswerCount | 100.0% | number | 0 | [0,0,0]... |
| incorrectAnswerCount | 100.0% | number | 0 | [0,0,0]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-11-03T11:21:43.464Z","2025-11-03T11:21:43.4... |
| updatedAt | 100.0% | object | 0 | ["2025-11-03T11:21:43.464Z","2025-11-03T11:21:43.4... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "difficulty": 1
    },
    "name": "difficulty_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "difficulty": 1,
      "isActive": 1
    },
    "name": "category_1_difficulty_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "difficulty": 1,
      "isActive": 1,
      "usageCount": 1
    },
    "name": "difficulty_1_isActive_1_usageCount_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1,
      "isActive": 1
    },
    "name": "tags_1_isActive_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "690890475c1dfec16055b4ab",
  "question": "What is the primary purpose of a fashion lookbook?",
  "options": [
    "To sell directly to customers",
    "To showcase a collection and inspire styling ideas",
    "To list prices",
    "To show store locations"
  ],
  "correctAnswer": 1,
  "category": "fashion",
  "difficulty": "easy",
  "points": 10,
  "explanation": "A lookbook presents a curated collection of outfits to inspire customers and showcase styling possibilities.",
  "tags": [
    "marketing",
    "styling"
  ],
  "isActive": true,
  "usageCount": 0,
  "correctAnswerCount": 0,
  "incorrectAnswerCount": 0,
  "__v": 0,
  "createdAt": "2025-11-03T11:21:43.464Z",
  "updatedAt": "2025-11-03T11:21:43.464Z"
}
```

---

### uservouchers

**Document Count:** 13

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68de65b88a170479a718fe91","68de65b88a170479a718f... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,222,101,184,138,23,4... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [222,222,222]... |
| _id.buffer.2 | 100.0% | number | 0 | [101,101,101]... |
| _id.buffer.3 | 100.0% | number | 0 | [184,184,184]... |
| _id.buffer.4 | 100.0% | number | 0 | [138,138,138]... |
| _id.buffer.5 | 100.0% | number | 0 | [23,23,23]... |
| _id.buffer.6 | 100.0% | number | 0 | [4,4,4]... |
| _id.buffer.7 | 100.0% | number | 0 | [121,121,121]... |
| _id.buffer.8 | 100.0% | number | 0 | [167,167,167]... |
| _id.buffer.9 | 100.0% | number | 0 | [24,24,24]... |
| _id.buffer.10 | 100.0% | number | 0 | [254,254,254]... |
| _id.buffer.11 | 100.0% | number | 0 | [145,146,147]... |
| user | 100.0% | object | 0 | ["68c1447aa6d2db865ad82459","68c1447aa6d2db865ad82... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,68,122,166,210,2... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [68,68,68]... |
| user.buffer.3 | 100.0% | number | 0 | [122,122,122]... |
| user.buffer.4 | 100.0% | number | 0 | [166,166,166]... |
| user.buffer.5 | 100.0% | number | 0 | [210,210,210]... |
| user.buffer.6 | 100.0% | number | 0 | [219,219,219]... |
| user.buffer.7 | 100.0% | number | 0 | [134,134,134]... |
| user.buffer.8 | 100.0% | number | 0 | [90,90,90]... |
| user.buffer.9 | 100.0% | number | 0 | [216,216,216]... |
| user.buffer.10 | 100.0% | number | 0 | [36,36,36]... |
| user.buffer.11 | 100.0% | number | 0 | [89,89,89]... |
| brand | 100.0% | object | 0 | ["68de65b88a170479a718fe86","68de65b88a170479a718f... |
| brand.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,222,101,184,138,23,4... |
| brand.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| brand.buffer.1 | 100.0% | number | 0 | [222,222,222]... |
| brand.buffer.2 | 100.0% | number | 0 | [101,101,101]... |
| brand.buffer.3 | 100.0% | number | 0 | [184,184,184]... |
| brand.buffer.4 | 100.0% | number | 0 | [138,138,138]... |
| brand.buffer.5 | 100.0% | number | 0 | [23,23,23]... |
| brand.buffer.6 | 100.0% | number | 0 | [4,4,4]... |
| brand.buffer.7 | 100.0% | number | 0 | [121,121,121]... |
| brand.buffer.8 | 100.0% | number | 0 | [167,167,167]... |
| brand.buffer.9 | 100.0% | number | 0 | [24,24,24]... |
| brand.buffer.10 | 100.0% | number | 0 | [254,254,254]... |
| brand.buffer.11 | 100.0% | number | 0 | [134,135,136]... |
| voucherCode | 100.0% | string | 0 | ["AMADBWMRI","FLILAV8X2","SWIOQFR9A"]... |
| denomination | 100.0% | number | 0 | [100,500,500]... |
| purchasePrice | 100.0% | number | 0 | [100,500,500]... |
| purchaseDate | 100.0% | object | 0 | ["2025-09-22T11:44:56.191Z","2025-09-17T11:44:56.1... |
| expiryDate | 100.0% | object | 0 | ["2026-09-22T11:44:56.191Z","2026-09-17T11:44:56.1... |
| validityDays | 100.0% | number | 0 | [365,365,365]... |
| status | 100.0% | string | 0 | ["active","used","expired"]... |
| deliveryMethod | 100.0% | string | 0 | ["app","app","app"]... |
| deliveryStatus | 100.0% | string | 0 | ["delivered","delivered","delivered"]... |
| deliveredAt | 100.0% | object | 0 | ["2025-09-22T11:44:56.191Z","2025-09-17T11:44:56.1... |
| paymentMethod | 100.0% | string | 0 | ["wallet","wallet","wallet"]... |
| transactionId | 100.0% | string | 0 | ["VCH17594054961910","VCH17594054961911","VCH17594... |
| __v | 50.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-02T11:44:56.195Z","2025-10-02T11:44:56.1... |
| updatedAt | 100.0% | object | 0 | ["2025-10-02T11:44:56.195Z","2025-10-02T11:44:56.1... |
| usedDate | 70.0% | object | 4 | ["2025-10-02T11:44:56.191Z","2025-09-17T11:44:56.1... |
| usedAt | 70.0% | string | 4 | ["Online Shopping","Online Shopping","Online Shopp... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "brand": 1
    },
    "name": "brand_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "voucherCode": 1
    },
    "name": "voucherCode_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "transactionId": 1
    },
    "name": "transactionId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiryDate": 1
    },
    "name": "expiryDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "purchaseDate": 1
    },
    "name": "purchaseDate_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68de65b88a170479a718fe91",
  "user": "68c1447aa6d2db865ad82459",
  "brand": "68de65b88a170479a718fe86",
  "voucherCode": "AMADBWMRI",
  "denomination": 100,
  "purchasePrice": 100,
  "purchaseDate": "2025-09-22T11:44:56.191Z",
  "expiryDate": "2026-09-22T11:44:56.191Z",
  "validityDays": 365,
  "status": "active",
  "deliveryMethod": "app",
  "deliveryStatus": "delivered",
  "deliveredAt": "2025-09-22T11:44:56.191Z",
  "paymentMethod": "wallet",
  "transactionId": "VCH17594054961910",
  "__v": 0,
  "createdAt": "2025-10-02T11:44:56.195Z",
  "updatedAt": "2025-10-02T11:44:56.195Z"
}
```

---

### subscriptions

**Document Count:** 22

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68fb5e0451a04996f1493e3d","68fb5e0451a04996f1493... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,94,4,81,160,73,1... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [251,251,251]... |
| _id.buffer.2 | 100.0% | number | 0 | [94,94,94]... |
| _id.buffer.3 | 100.0% | number | 0 | [4,4,4]... |
| _id.buffer.4 | 100.0% | number | 0 | [81,81,81]... |
| _id.buffer.5 | 100.0% | number | 0 | [160,160,160]... |
| _id.buffer.6 | 100.0% | number | 0 | [73,73,73]... |
| _id.buffer.7 | 100.0% | number | 0 | [150,150,150]... |
| _id.buffer.8 | 100.0% | number | 0 | [241,241,241]... |
| _id.buffer.9 | 100.0% | number | 0 | [73,73,73]... |
| _id.buffer.10 | 100.0% | number | 0 | [62,62,62]... |
| _id.buffer.11 | 100.0% | number | 0 | [61,65,67]... |
| user | 100.0% | object | 0 | ["68ee29d08c4fa11015d70339","68ef4c432629859fd1137... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [238,239,239]... |
| user.buffer.2 | 100.0% | number | 0 | [41,76,77]... |
| user.buffer.3 | 100.0% | number | 0 | [208,67,65]... |
| user.buffer.4 | 100.0% | number | 0 | [140,38,6]... |
| user.buffer.5 | 100.0% | number | 0 | [79,41,31]... |
| user.buffer.6 | 100.0% | number | 0 | [161,133,170]... |
| user.buffer.7 | 100.0% | number | 0 | [16,159,240]... |
| user.buffer.8 | 100.0% | number | 0 | [21,209,69]... |
| user.buffer.9 | 100.0% | number | 0 | [215,19,34]... |
| user.buffer.10 | 100.0% | number | 0 | [3,114,37]... |
| user.buffer.11 | 100.0% | number | 0 | [57,0,6]... |
| tier | 100.0% | string | 0 | ["free","free","free"]... |
| status | 100.0% | string | 0 | ["active","active","active"]... |
| billingCycle | 100.0% | string | 0 | ["monthly","monthly","monthly"]... |
| price | 100.0% | number | 0 | [0,0,0]... |
| startDate | 100.0% | object | 0 | ["2025-07-26T11:07:48.804Z","2025-09-09T11:07:48.8... |
| endDate | 100.0% | object | 0 | ["2025-08-26T11:07:48.804Z","2025-10-09T11:07:48.8... |
| autoRenew | 100.0% | boolean | 0 | [true,true,true]... |
| benefits | 100.0% | object | 0 | [{"cashbackMultiplier":1,"freeDelivery":false,"pri... |
| benefits.cashbackMultiplier | 100.0% | number | 0 | [1,1,1]... |
| benefits.freeDelivery | 100.0% | boolean | 0 | [false,false,false]... |
| benefits.prioritySupport | 100.0% | boolean | 0 | [false,false,false]... |
| benefits.exclusiveDeals | 100.0% | boolean | 0 | [false,false,false]... |
| benefits.unlimitedWishlists | 100.0% | boolean | 0 | [false,false,false]... |
| benefits.earlyFlashSaleAccess | 100.0% | boolean | 0 | [false,false,false]... |
| benefits.personalShopper | 100.0% | boolean | 0 | [false,false,false]... |
| benefits.premiumEvents | 100.0% | boolean | 0 | [false,false,false]... |
| benefits.conciergeService | 100.0% | boolean | 0 | [false,false,false]... |
| benefits.birthdayOffer | 100.0% | boolean | 0 | [false,false,false]... |
| benefits.anniversaryOffer | 100.0% | boolean | 0 | [false,false,false]... |
| usage | 100.0% | object | 0 | [{"totalSavings":0,"ordersThisMonth":0,"ordersAllT... |
| usage.totalSavings | 100.0% | number | 0 | [0,0,0]... |
| usage.ordersThisMonth | 100.0% | number | 0 | [0,0,0]... |
| usage.ordersAllTime | 100.0% | number | 0 | [0,0,0]... |
| usage.cashbackEarned | 100.0% | number | 0 | [0,0,0]... |
| usage.deliveryFeesSaved | 100.0% | number | 0 | [0,0,0]... |
| usage.exclusiveDealsUsed | 100.0% | number | 0 | [0,0,0]... |
| paymentRetryCount | 100.0% | number | 0 | [0,0,0]... |
| isGrandfathered | 100.0% | boolean | 0 | [false,false,false]... |
| proratedCredit | 100.0% | number | 0 | [0,0,0]... |
| metadata | 100.0% | object | 0 | [{"source":"app"},{"source":"web"},{"source":"app"... |
| metadata.source | 100.0% | string | 0 | ["app","web","app"]... |
| createdAt | 100.0% | object | 0 | ["2025-10-24T11:07:48.825Z","2025-10-24T11:07:48.8... |
| updatedAt | 100.0% | object | 0 | ["2025-10-24T11:07:48.825Z","2025-10-24T11:07:48.8... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| metadata.campaign | 50.0% | string | 0 | ["refer-a-friend","premium-launch","free-trial-202... |
| trialEndDate | 50.0% | object | 0 | ["2025-09-01T11:07:48.804Z","2025-10-28T11:07:48.8... |
| paymentMethod | 50.0% | string | 0 | ["razorpay","razorpay","razorpay"]... |
| razorpaySubscriptionId | 50.0% | string | 0 | ["sub_bstpp7pmq8j7d10s3fbrim","sub_bwubwqde35tp6sq... |
| razorpayPlanId | 50.0% | string | 0 | ["plan_ecqapyayqqqhd0vnc0onfq","plan_cwbgnk1v5dnh0... |
| razorpayCustomerId | 50.0% | string | 0 | ["cust_viak0yh1tglzsqpo4vrb6c","cust_heieuxxexqp48... |
| gracePeriodStartDate | 10.0% | object | 0 | ["2025-10-22T11:07:48.804Z"]... |
| lastPaymentRetryDate | 10.0% | object | 0 | ["2025-10-23T11:07:48.804Z"]... |
| metadata.promoCode | 10.0% | string | 0 | ["SAVE20"]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tier": 1
    },
    "name": "tier_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "endDate": 1
    },
    "name": "endDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "razorpaySubscriptionId": 1
    },
    "name": "razorpaySubscriptionId_1",
    "background": true,
    "unique": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tier": 1,
      "status": 1
    },
    "name": "tier_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "endDate": 1,
      "status": 1
    },
    "name": "endDate_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "metadata.campaign": 1
    },
    "name": "metadata.campaign_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68fb5e0451a04996f1493e3d",
  "user": "68ee29d08c4fa11015d70339",
  "tier": "free",
  "status": "active",
  "billingCycle": "monthly",
  "price": 0,
  "startDate": "2025-07-26T11:07:48.804Z",
  "endDate": "2025-08-26T11:07:48.804Z",
  "autoRenew": true,
  "benefits": {
    "cashbackMultiplier": 1,
    "freeDelivery": false,
    "prioritySupport": false,
    "exclusiveDeals": false,
    "unlimitedWishlists": false,
    "earlyFlashSaleAccess": false,
    "personalShopper": false,
    "premiumEvents": false,
    "conciergeService": false,
    "birthdayOffer": false,
    "anniversaryOffer": false
  },
  "usage": {
    "totalSavings": 0,
    "ordersThisMonth": 0,
    "ordersAllTime": 0,
    "cashbackEarned": 0,
    "deliveryFeesSaved": 0,
    "exclusiveDealsUsed": 0
  },
  "paymentRetryCount": 0,
  "isGrandfathered": false,
  "proratedCredit": 0,
  "metadata": {
    "source": "app"
  },
  "createdAt": "2025-10-24T11:07:48.825Z",
  "updatedAt": "2025-10-24T11:07:48.825Z",
  "__v": 0
}
```

---

### storeanalytics

**Document Count:** 34

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68c11787750a74f0829e0335","68c12802e64e7c0036a37... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,23,135,117,10,11... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| _id.buffer.2 | 100.0% | number | 0 | [23,40,40]... |
| _id.buffer.3 | 100.0% | number | 0 | [135,2,12]... |
| _id.buffer.4 | 100.0% | number | 0 | [117,230,230]... |
| _id.buffer.5 | 100.0% | number | 0 | [10,78,78]... |
| _id.buffer.6 | 100.0% | number | 0 | [116,124,124]... |
| _id.buffer.7 | 100.0% | number | 0 | [240,0,0]... |
| _id.buffer.8 | 100.0% | number | 0 | [130,54,54]... |
| _id.buffer.9 | 100.0% | number | 0 | [158,163,163]... |
| _id.buffer.10 | 100.0% | number | 0 | [3,125,125]... |
| _id.buffer.11 | 100.0% | number | 0 | [53,89,92]... |
| store | 100.0% | object | 0 | ["68c010a771305ffc33baadc8","68c010a771305ffc33baa... |
| store.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,192,16,167,113,48,95... |
| store.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| store.buffer.1 | 100.0% | number | 0 | [192,192,192]... |
| store.buffer.2 | 100.0% | number | 0 | [16,16,16]... |
| store.buffer.3 | 100.0% | number | 0 | [167,167,167]... |
| store.buffer.4 | 100.0% | number | 0 | [113,113,113]... |
| store.buffer.5 | 100.0% | number | 0 | [48,48,48]... |
| store.buffer.6 | 100.0% | number | 0 | [95,95,95]... |
| store.buffer.7 | 100.0% | number | 0 | [252,252,252]... |
| store.buffer.8 | 100.0% | number | 0 | [51,51,51]... |
| store.buffer.9 | 100.0% | number | 0 | [186,186,186]... |
| store.buffer.10 | 100.0% | number | 0 | [173,173,173]... |
| store.buffer.11 | 100.0% | number | 0 | [200,200,199]... |
| eventType | 100.0% | string | 0 | ["compare","click","click"]... |
| eventData | 100.0% | object | 0 | [{"source":"comparison","referrer":"http://localho... |
| eventData.source | 100.0% | string | 0 | ["comparison","store_card","store_card"]... |
| eventData.referrer | 100.0% | string | 0 | ["http://localhost:8081/","http://localhost:8081/"... |
| eventData.userAgent | 100.0% | string | 0 | ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac... |
| eventData.location | 100.0% | object | 0 | [{"coordinates":[77.62288487205235,12.930389422290... |
| eventData.location.coordinates | 100.0% | array | 0 | [[77.62288487205235,12.930389422290512],[77.622861... |
| eventData.location.address | 100.0% | string | 0 | ["675/A, 6th A Cross Road, Koramangala, Bengaluru ... |
| eventData.metadata | 100.0% | object | 0 | [{"action":"add"},{"category":"fastDelivery"},{"ca... |
| eventData.metadata.action | 20.0% | string | 0 | ["add","add"]... |
| timestamp | 100.0% | object | 0 | ["2025-09-10T06:15:35.400Z","2025-09-10T07:25:54.3... |
| ipAddress | 100.0% | string | 0 | ["127.0.0.1","127.0.0.1","127.0.0.1"]... |
| createdAt | 100.0% | object | 0 | ["2025-09-10T06:15:35.402Z","2025-09-10T07:25:54.3... |
| updatedAt | 100.0% | object | 0 | ["2025-09-10T06:15:35.402Z","2025-09-10T07:25:54.3... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| eventData.metadata.category | 80.0% | string | 0 | ["fastDelivery","fastDelivery","fastDelivery"]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "eventType": 1
    },
    "name": "eventType_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "timestamp": 1
    },
    "name": "timestamp_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "sessionId": 1
    },
    "name": "sessionId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "eventType": 1,
      "timestamp": -1
    },
    "name": "store_1_eventType_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "eventType": 1,
      "timestamp": -1
    },
    "name": "user_1_eventType_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "eventType": 1,
      "timestamp": -1
    },
    "name": "eventType_1_timestamp_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "timestamp": -1
    },
    "name": "store_1_timestamp_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68c11787750a74f0829e0335",
  "store": "68c010a771305ffc33baadc8",
  "eventType": "compare",
  "eventData": {
    "source": "comparison",
    "referrer": "http://localhost:8081/",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "location": {
      "coordinates": [
        77.62288487205235,
        12.930389422290512
      ],
      "address": "675/A, 6th A Cross Road, Koramangala, Bengaluru - 560034, Karnataka, India"
    },
    "metadata": {
      "action": "add"
    }
  },
  "timestamp": "2025-09-10T06:15:35.400Z",
  "ipAddress": "127.0.0.1",
  "createdAt": "2025-09-10T06:15:35.402Z",
  "updatedAt": "2025-09-10T06:15:35.402Z",
  "__v": 0
}
```

---

### morders

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "merchantId": 1
    },
    "name": "merchantId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "orderNumber": 1
    },
    "name": "orderNumber_1",
    "background": true,
    "unique": true
  }
]
```

---

### offerredemptions

**Document Count:** 3

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["6904684f2f1cc9d30aaef956","69046ed080070d1e3cfd7... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,4,104,79,47,28,201,2... |
| _id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| _id.buffer.1 | 100.0% | number | 0 | [4,4,14]... |
| _id.buffer.2 | 100.0% | number | 0 | [104,110,18]... |
| _id.buffer.3 | 100.0% | number | 0 | [79,208,116]... |
| _id.buffer.4 | 100.0% | number | 0 | [47,128,246]... |
| _id.buffer.5 | 100.0% | number | 0 | [28,7,169]... |
| _id.buffer.6 | 100.0% | number | 0 | [201,13,198]... |
| _id.buffer.7 | 100.0% | number | 0 | [211,30,227]... |
| _id.buffer.8 | 100.0% | number | 0 | [10,60,155]... |
| _id.buffer.9 | 100.0% | number | 0 | [174,253,78]... |
| _id.buffer.10 | 100.0% | number | 0 | [249,113,176]... |
| _id.buffer.11 | 100.0% | number | 0 | [86,154,209]... |
| user | 100.0% | object | 0 | ["68ef4d41061faaf045222506","68ef4d41061faaf045222... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,239,77,65,6,31,170,2... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,105]... |
| user.buffer.1 | 100.0% | number | 0 | [239,239,14]... |
| user.buffer.2 | 100.0% | number | 0 | [77,77,18]... |
| user.buffer.3 | 100.0% | number | 0 | [65,65,64]... |
| user.buffer.4 | 100.0% | number | 0 | [6,6,246]... |
| user.buffer.5 | 100.0% | number | 0 | [31,31,169]... |
| user.buffer.6 | 100.0% | number | 0 | [170,170,198]... |
| user.buffer.7 | 100.0% | number | 0 | [240,240,227]... |
| user.buffer.8 | 100.0% | number | 0 | [69,69,155]... |
| user.buffer.9 | 100.0% | number | 0 | [34,34,78]... |
| user.buffer.10 | 100.0% | number | 0 | [37,37,175]... |
| user.buffer.11 | 100.0% | number | 0 | [6,6,78]... |
| offer | 100.0% | object | 0 | ["68ee29d08c4fa11015d70352","68ee29d08c4fa11015d70... |
| offer.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| offer.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| offer.buffer.1 | 100.0% | number | 0 | [238,238,251]... |
| offer.buffer.2 | 100.0% | number | 0 | [41,41,108]... |
| offer.buffer.3 | 100.0% | number | 0 | [208,208,191]... |
| offer.buffer.4 | 100.0% | number | 0 | [140,140,144]... |
| offer.buffer.5 | 100.0% | number | 0 | [79,79,224]... |
| offer.buffer.6 | 100.0% | number | 0 | [161,161,247]... |
| offer.buffer.7 | 100.0% | number | 0 | [16,16,47]... |
| offer.buffer.8 | 100.0% | number | 0 | [21,21,167]... |
| offer.buffer.9 | 100.0% | number | 0 | [215,215,234]... |
| offer.buffer.10 | 100.0% | number | 0 | [3,3,161]... |
| offer.buffer.11 | 100.0% | number | 0 | [82,82,221]... |
| redemptionType | 100.0% | string | 0 | ["online","online","online"]... |
| redemptionDate | 100.0% | object | 0 | ["2025-10-31T07:42:07.801Z","2025-10-31T08:09:52.7... |
| validityDays | 100.0% | number | 0 | [30,30,30]... |
| status | 100.0% | string | 0 | ["active","cancelled","active"]... |
| ipAddress | 100.0% | string | 0 | ["127.0.0.1","127.0.0.1","10.17.102.174"]... |
| userAgent | 100.0% | string | 0 | ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac... |
| location | 100.0% | object | 0 | [{"coordinates":[]},{"coordinates":[]},{"coordinat... |
| location.coordinates | 100.0% | array | 0 | [[],[],[]]... |
| createdAt | 100.0% | object | 0 | ["2025-10-31T07:42:07.807Z","2025-10-31T08:09:52.7... |
| updatedAt | 100.0% | object | 0 | ["2025-10-31T07:42:07.807Z","2025-10-31T08:09:52.7... |
| redemptionCode | 100.0% | string | 0 | ["RED-MHEJP9KW-YJ38","RED-MHEKOY93-TVMM","RED-MHP0... |
| expiryDate | 100.0% | object | 0 | ["2025-11-30T07:42:07.801Z","2025-11-30T08:09:52.7... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| cancellationReason | 33.3% | string | 0 | ["Duplicate redemption - removed by cleanup script... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "offer": 1
    },
    "name": "offer_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "redemptionCode": 1
    },
    "name": "redemptionCode_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "redemptionDate": 1
    },
    "name": "redemptionDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiryDate": 1
    },
    "name": "expiryDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "usedDate": 1
    },
    "name": "usedDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "order": 1
    },
    "name": "order_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "offer": 1
    },
    "name": "user_1_offer_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "offer": 1,
      "status": 1
    },
    "name": "offer_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "redemptionDate": 1,
      "status": 1
    },
    "name": "redemptionDate_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiryDate": 1,
      "status": 1
    },
    "name": "expiryDate_1_status_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "6904684f2f1cc9d30aaef956",
  "user": "68ef4d41061faaf045222506",
  "offer": "68ee29d08c4fa11015d70352",
  "redemptionType": "online",
  "redemptionDate": "2025-10-31T07:42:07.801Z",
  "validityDays": 30,
  "status": "active",
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  "location": {
    "coordinates": []
  },
  "createdAt": "2025-10-31T07:42:07.807Z",
  "updatedAt": "2025-10-31T07:42:07.807Z",
  "redemptionCode": "RED-MHEJP9KW-YJ38",
  "expiryDate": "2025-11-30T07:42:07.801Z",
  "__v": 0
}
```

---

### supporttickets

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "ticketNumber": 1
    },
    "name": "ticketNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "priority": 1
    },
    "name": "priority_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "assignedTo": 1
    },
    "name": "assignedTo_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "ticketNumber": 1,
      "user": 1
    },
    "name": "ticketNumber_1_user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "priority": -1
    },
    "name": "status_1_priority_-1",
    "background": true
  }
]
```

---

### minigames

**Document Count:** 929

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68fb5fd870cd9d7de50e6615","68fb5fd870cd9d7de50e6... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,95,216,112,205,1... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [251,251,251]... |
| _id.buffer.2 | 100.0% | number | 0 | [95,95,95]... |
| _id.buffer.3 | 100.0% | number | 0 | [216,216,216]... |
| _id.buffer.4 | 100.0% | number | 0 | [112,112,112]... |
| _id.buffer.5 | 100.0% | number | 0 | [205,205,205]... |
| _id.buffer.6 | 100.0% | number | 0 | [157,157,157]... |
| _id.buffer.7 | 100.0% | number | 0 | [125,125,125]... |
| _id.buffer.8 | 100.0% | number | 0 | [229,229,229]... |
| _id.buffer.9 | 100.0% | number | 0 | [14,14,14]... |
| _id.buffer.10 | 100.0% | number | 0 | [102,102,102]... |
| _id.buffer.11 | 100.0% | number | 0 | [21,22,23]... |
| user | 100.0% | object | 0 | ["68ee29d08c4fa11015d70339","68ef4c432629859fd1137... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,238,41,208,140,79,16... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [238,239,239]... |
| user.buffer.2 | 100.0% | number | 0 | [41,76,77]... |
| user.buffer.3 | 100.0% | number | 0 | [208,67,65]... |
| user.buffer.4 | 100.0% | number | 0 | [140,38,6]... |
| user.buffer.5 | 100.0% | number | 0 | [79,41,31]... |
| user.buffer.6 | 100.0% | number | 0 | [161,133,170]... |
| user.buffer.7 | 100.0% | number | 0 | [16,159,240]... |
| user.buffer.8 | 100.0% | number | 0 | [21,209,69]... |
| user.buffer.9 | 100.0% | number | 0 | [215,19,34]... |
| user.buffer.10 | 100.0% | number | 0 | [3,114,37]... |
| user.buffer.11 | 100.0% | number | 0 | [57,0,6]... |
| gameType | 100.0% | string | 0 | ["spin_wheel","scratch_card","quiz"]... |
| status | 100.0% | string | 0 | ["active","expired","expired"]... |
| difficulty | 100.0% | string | 0 | ["easy","easy","easy"]... |
| startedAt | 100.0% | object | 0 | ["2025-10-19T06:23:55.197Z","2025-10-20T09:24:33.7... |
| expiresAt | 100.0% | object | 0 | ["2025-10-20T06:23:55.197Z","2025-10-21T09:24:33.7... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-24T11:15:36.459Z","2025-10-24T11:15:36.4... |
| updatedAt | 100.0% | object | 0 | ["2025-10-24T11:15:36.459Z","2025-10-24T11:15:36.4... |
| completedAt | 50.0% | object | 0 | ["2025-10-19T04:15:01.690Z","2025-10-19T17:23:41.8... |
| reward | 50.0% | object | 0 | [{"coins":50},{"coins":500},{"coins":50}]... |
| reward.coins | 50.0% | number | 0 | [50,500,50]... |
| metadata | 50.0% | object | 0 | [{"segment":5,"prize":"coins"},{"totalQuestions":5... |
| metadata.segment | 30.0% | number | 0 | [5,3,4]... |
| metadata.prize | 30.0% | string | 0 | ["coins","coins","coins"]... |
| metadata.totalQuestions | 10.0% | number | 0 | [5]... |
| metadata.correctAnswers | 10.0% | number | 0 | [3]... |
| metadata.score | 10.0% | number | 0 | [60]... |
| metadata.revealed | 10.0% | boolean | 0 | [true]... |
| metadata.revealedPrize | 10.0% | boolean | 0 | [true]... |
| metadata.winningPrize | 10.0% | object | 0 | [{"type":"coins","value":100,"label":"100 Coins","... |
| metadata.winningPrize.type | 10.0% | string | 0 | ["coins"]... |
| metadata.winningPrize.value | 10.0% | number | 0 | [100]... |
| metadata.winningPrize.label | 10.0% | string | 0 | ["100 Coins"]... |
| metadata.winningPrize.color | 10.0% | string | 0 | ["#8B5CF6"]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "gameType": 1
    },
    "name": "gameType_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "gameType": 1,
      "status": 1
    },
    "name": "user_1_gameType_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68fb5fd870cd9d7de50e6615",
  "user": "68ee29d08c4fa11015d70339",
  "gameType": "spin_wheel",
  "status": "active",
  "difficulty": "easy",
  "startedAt": "2025-10-19T06:23:55.197Z",
  "expiresAt": "2025-10-20T06:23:55.197Z",
  "__v": 0,
  "createdAt": "2025-10-24T11:15:36.459Z",
  "updatedAt": "2025-10-24T11:15:36.459Z"
}
```

---

### events

**Document Count:** 6

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["690445cf163be31c3a6535b8","690445cf163be31c3a653... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,4,69,207,22,59,227,2... |
| _id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| _id.buffer.1 | 100.0% | number | 0 | [4,4,4]... |
| _id.buffer.2 | 100.0% | number | 0 | [69,69,69]... |
| _id.buffer.3 | 100.0% | number | 0 | [207,207,207]... |
| _id.buffer.4 | 100.0% | number | 0 | [22,22,22]... |
| _id.buffer.5 | 100.0% | number | 0 | [59,59,59]... |
| _id.buffer.6 | 100.0% | number | 0 | [227,227,227]... |
| _id.buffer.7 | 100.0% | number | 0 | [28,28,28]... |
| _id.buffer.8 | 100.0% | number | 0 | [58,58,58]... |
| _id.buffer.9 | 100.0% | number | 0 | [101,101,101]... |
| _id.buffer.10 | 100.0% | number | 0 | [53,53,53]... |
| _id.buffer.11 | 100.0% | number | 0 | [184,186,183]... |
| title | 100.0% | string | 0 | ["Tech Meetup - AI Revolution","Startup Pitch Comp... |
| subtitle | 100.0% | string | 0 | ["Free • Venue","Free • Online","₹299 • Venue"]... |
| description | 100.0% | string | 0 | ["Latest trends in AI and machine learning. Join i... |
| image | 100.0% | string | 0 | ["https://images.unsplash.com/photo-1540575467063-... |
| images | 100.0% | array | 0 | [[],[],[]]... |
| price | 100.0% | object | 0 | [{"amount":0,"currency":"₹","isFree":true},{"amoun... |
| price.amount | 100.0% | number | 0 | [0,0,299]... |
| price.currency | 100.0% | string | 0 | ["₹","₹","₹"]... |
| price.isFree | 100.0% | boolean | 0 | [true,true,false]... |
| location | 100.0% | object | 0 | [{"name":"Tech Park, Whitefield","address":"ITPL M... |
| location.name | 100.0% | string | 0 | ["Tech Park, Whitefield","Online Event","Bangalore... |
| location.address | 100.0% | string | 0 | ["ITPL Main Road, Whitefield","Online","Palace Roa... |
| location.city | 100.0% | string | 0 | ["Bangalore","Online","Bangalore"]... |
| location.state | 66.7% | string | 0 | ["Karnataka","Karnataka","Karnataka"]... |
| location.country | 100.0% | string | 0 | ["India","India","India"]... |
| location.coordinates | 66.7% | object | 0 | [{"lat":12.9698,"lng":77.75},{"lat":12.9981,"lng":... |
| location.coordinates.lat | 66.7% | number | 0 | [12.9698,12.9981,12.9507]... |
| location.coordinates.lng | 66.7% | number | 0 | [77.75,77.5925,77.5848]... |
| location.isOnline | 100.0% | boolean | 0 | [false,true,false]... |
| date | 100.0% | object | 0 | ["2025-11-21T05:14:55.654Z","2025-12-05T05:14:55.6... |
| time | 100.0% | string | 0 | ["10:00 AM","2:00 PM","6:30 PM"]... |
| endTime | 100.0% | string | 0 | ["5:00 PM","6:00 PM","10:00 PM"]... |
| category | 100.0% | string | 0 | ["Technology","Business","Music"]... |
| organizer | 100.0% | object | 0 | [{"name":"Bangalore Tech Community","email":"conta... |
| organizer.name | 100.0% | string | 0 | ["Bangalore Tech Community","Startup India Foundat... |
| organizer.email | 100.0% | string | 0 | ["contact@bangaloretech.com","contact@startupindia... |
| organizer.phone | 100.0% | string | 0 | ["+91-9876543212","+91-9876543214","+91-9876543211... |
| organizer.website | 100.0% | string | 0 | ["https://www.bangaloretech.com","https://www.star... |
| organizer.description | 100.0% | string | 0 | ["Leading tech community in Bangalore","Supporting... |
| merchantId | 50.0% | object | 0 | ["68aaa623d4ae0ab11dc2436f","68aaa4246c6c69bd6a3f1... |
| merchantId.buffer | 50.0% | object | 0 | [{"type":"Buffer","data":[104,170,166,35,212,174,1... |
| merchantId.buffer.0 | 50.0% | number | 0 | [104,104,104]... |
| merchantId.buffer.1 | 50.0% | number | 0 | [170,170,170]... |
| merchantId.buffer.2 | 50.0% | number | 0 | [166,164,24]... |
| merchantId.buffer.3 | 50.0% | number | 0 | [35,36,185]... |
| merchantId.buffer.4 | 50.0% | number | 0 | [212,108,30]... |
| merchantId.buffer.5 | 50.0% | number | 0 | [174,108,35]... |
| merchantId.buffer.6 | 50.0% | number | 0 | [10,105,83]... |
| merchantId.buffer.7 | 50.0% | number | 0 | [177,189,15]... |
| merchantId.buffer.8 | 50.0% | number | 0 | [29,106,75]... |
| merchantId.buffer.9 | 50.0% | number | 0 | [194,63,186]... |
| merchantId.buffer.10 | 50.0% | number | 0 | [67,18,172]... |
| merchantId.buffer.11 | 50.0% | number | 0 | [111,7,224]... |
| isOnline | 100.0% | boolean | 0 | [false,true,false]... |
| registrationRequired | 100.0% | boolean | 0 | [true,true,true]... |
| availableSlots | 100.0% | array | 0 | [[{"id":"slot1","time":"10:00 AM","available":true... |
| status | 100.0% | string | 0 | ["published","published","published"]... |
| tags | 100.0% | array | 0 | [["ai","machine-learning","tech","networking","inn... |
| maxCapacity | 100.0% | number | 0 | [150,500,200]... |
| requirements | 100.0% | array | 0 | [[],[],[]]... |
| includes | 100.0% | array | 0 | [["Lunch","Networking session","Goodie bag"],["Pit... |
| analytics | 100.0% | object | 0 | [{"views":156,"bookings":43,"shares":15,"favorites... |
| analytics.views | 100.0% | number | 0 | [156,315,191]... |
| analytics.bookings | 100.0% | number | 0 | [43,156,68]... |
| analytics.shares | 100.0% | number | 0 | [15,24,8]... |
| analytics.favorites | 100.0% | number | 0 | [18,67,23]... |
| featured | 100.0% | boolean | 0 | [true,true,true]... |
| priority | 100.0% | number | 0 | [3,5,2]... |
| publishedAt | 100.0% | object | 0 | ["2025-10-31T05:14:55.654Z","2025-10-31T05:14:55.6... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-31T05:14:55.690Z","2025-10-31T05:14:55.6... |
| updatedAt | 100.0% | object | 0 | ["2025-10-31T05:14:55.690Z","2025-11-09T14:11:05.2... |
| location.meetingUrl | 33.3% | string | 0 | ["https://zoom.us/j/987654321","https://zoom.us/j/... |
| bookingUrl | 33.3% | string | 0 | ["https://www.startupindia.org/pitch-competition",... |
| analytics.lastViewed | 50.0% | object | 0 | ["2025-11-09T14:11:05.231Z","2025-11-07T10:20:23.0... |
| price.originalPrice | 33.3% | number | 0 | [399,299]... |
| price.discount | 33.3% | number | 0 | [25,33]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "date": 1
    },
    "name": "status_1_date_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "status": 1
    },
    "name": "category_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "location.city": 1,
      "status": 1
    },
    "name": "location.city_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "featured": 1,
      "status": 1
    },
    "name": "featured_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1
    },
    "name": "tags_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "title_text_description_text",
    "background": true,
    "weights": {
      "description": 1,
      "title": 1
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "date": 1,
      "status": 1,
      "featured": 1
    },
    "name": "date_1_status_1_featured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "merchantId": 1
    },
    "name": "merchantId_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "690445cf163be31c3a6535b8",
  "title": "Tech Meetup - AI Revolution",
  "subtitle": "Free • Venue",
  "description": "Latest trends in AI and machine learning. Join industry experts and tech enthusiasts for discussions on AI innovations and networking.",
  "image": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop",
  "images": [],
  "price": {
    "amount": 0,
    "currency": "₹",
    "isFree": true
  },
  "location": {
    "name": "Tech Park, Whitefield",
    "address": "ITPL Main Road, Whitefield",
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India",
    "coordinates": {
      "lat": 12.9698,
      "lng": 77.75
    },
    "isOnline": false
  },
  "date": "2025-11-21T05:14:55.654Z",
  "time": "10:00 AM",
  "endTime": "5:00 PM",
  "category": "Technology",
  "organizer": {
    "name": "Bangalore Tech Community",
    "email": "contact@bangaloretech.com",
    "phone": "+91-9876543212",
    "website": "https://www.bangaloretech.com",
    "description": "Leading tech community in Bangalore"
  },
  "merchantId": "68aaa623d4ae0ab11dc2436f",
  "isOnline": false,
  "registrationRequired": true,
  "availableSlots": [
    {
      "id": "slot1",
      "time": "10:00 AM",
      "available": true,
      "maxCapacity": 150,
      "bookedCount": 85
    },
    {
      "id": "slot2",
      "time": "2:00 PM",
      "available": true,
      "maxCapacity": 150,
      "bookedCount": 52
    }
  ],
  "status": "published",
  "tags": [
    "ai",
    "machine-learning",
    "tech",
    "networking",
    "innovation"
  ],
  "maxCapacity": 150,
  "requirements": [],
  "includes": [
    "Lunch",
    "Networking session",
    "Goodie bag"
  ],
  "analytics": {
    "views": 156,
    "bookings": 43,
    "shares": 15,
    "favorites": 18
  },
  "featured": true,
  "priority": 3,
  "publishedAt": "2025-10-31T05:14:55.654Z",
  "__v": 0,
  "createdAt": "2025-10-31T05:14:55.690Z",
  "updatedAt": "2025-10-31T05:14:55.690Z"
}
```

---

### activityinteractions

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "activity": 1
    },
    "name": "activity_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "activity": 1,
      "user": 1,
      "type": 1
    },
    "name": "activity_1_user_1_type_1",
    "background": true,
    "unique": true,
    "partialFilterExpression": {
      "type": "like"
    }
  }
]
```

---

### gamesessions

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "gameType": 1
    },
    "name": "gameType_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "sessionId": 1
    },
    "name": "sessionId_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "gameType": 1,
      "status": 1
    },
    "name": "user_1_gameType_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  }
]
```

---

### consultations

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "consultationNumber": 1
    },
    "name": "consultationNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1,
      "consultationDate": 1
    },
    "name": "storeId_1_consultationDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "status": 1
    },
    "name": "userId_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "consultationDate": 1
    },
    "name": "status_1_consultationDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1,
      "status": 1
    },
    "name": "storeId_1_status_1",
    "background": true
  }
]
```

---

### storevouchers

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "code": 1
    },
    "name": "code_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validFrom": 1
    },
    "name": "validFrom_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "validUntil": 1
    },
    "name": "validUntil_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "isActive": 1
    },
    "name": "store_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1,
      "validFrom": 1,
      "validUntil": 1
    },
    "name": "isActive_1_validFrom_1_validUntil_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "code": 1,
      "store": 1
    },
    "name": "code_1_store_1",
    "background": true
  }
]
```

---

### videos

**Document Count:** 141

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["690f54c92a2881d4531c28be","690f54c92a2881d4531c2... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,15,84,201,42,40,129,... |
| _id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| _id.buffer.1 | 100.0% | number | 0 | [15,15,15]... |
| _id.buffer.2 | 100.0% | number | 0 | [84,84,84]... |
| _id.buffer.3 | 100.0% | number | 0 | [201,201,201]... |
| _id.buffer.4 | 100.0% | number | 0 | [42,42,42]... |
| _id.buffer.5 | 100.0% | number | 0 | [40,40,40]... |
| _id.buffer.6 | 100.0% | number | 0 | [129,129,129]... |
| _id.buffer.7 | 100.0% | number | 0 | [212,212,212]... |
| _id.buffer.8 | 100.0% | number | 0 | [83,83,83]... |
| _id.buffer.9 | 100.0% | number | 0 | [28,28,28]... |
| _id.buffer.10 | 100.0% | number | 0 | [40,40,40]... |
| _id.buffer.11 | 100.0% | number | 0 | [190,207,212]... |
| title | 100.0% | string | 0 | ["Men's Grooming Essentials","How to Tie a Tie - 5... |
| description | 100.0% | string | 0 | ["Complete grooming routine for modern men","Maste... |
| creator | 100.0% | object | 0 | ["690f43d982ba8b537e58a40c","68fb5d9318377fe11cba7... |
| creator.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,15,67,217,130,186,13... |
| creator.buffer.0 | 100.0% | number | 0 | [105,104,104]... |
| creator.buffer.1 | 100.0% | number | 0 | [15,251,251]... |
| creator.buffer.2 | 100.0% | number | 0 | [67,93,93]... |
| creator.buffer.3 | 100.0% | number | 0 | [217,147,147]... |
| creator.buffer.4 | 100.0% | number | 0 | [130,24,24]... |
| creator.buffer.5 | 100.0% | number | 0 | [186,55,55]... |
| creator.buffer.6 | 100.0% | number | 0 | [139,127,127]... |
| creator.buffer.7 | 100.0% | number | 0 | [83,225,225]... |
| creator.buffer.8 | 100.0% | number | 0 | [126,28,28]... |
| creator.buffer.9 | 100.0% | number | 0 | [88,186,186]... |
| creator.buffer.10 | 100.0% | number | 0 | [164,116,116]... |
| creator.buffer.11 | 100.0% | number | 0 | [12,187,182]... |
| videoUrl | 100.0% | string | 0 | ["https://commondatastorage.googleapis.com/gtv-vid... |
| thumbnail | 100.0% | string | 0 | ["https://commondatastorage.googleapis.com/gtv-vid... |
| preview | 100.0% | string | 0 | ["https://commondatastorage.googleapis.com/gtv-vid... |
| category | 100.0% | string | 0 | ["trending_me","trending_me","trending_her"]... |
| subcategory | 100.0% | string | 0 | ["ugc","merchant","ugc"]... |
| tags | 100.0% | array | 0 | [["grooming","skincare","men","beauty"],["tie","me... |
| hashtags | 100.0% | array | 0 | [["#grooming","#skincare","#men","#beauty"],["#tie... |
| products | 100.0% | array | 0 | [["6905afbe5f8c7aa14aa29a04","68ece1f934b0337d12aa... |
| stores | 100.0% | array | 0 | [["68ee29d08c4fa11015d7034d","69059ef3cdd7a84b808a... |
| engagement | 100.0% | object | 0 | [{"views":93208,"likes":["690f43d882ba8b537e58a3ea... |
| engagement.views | 100.0% | number | 0 | [93208,49923,93122]... |
| engagement.likes | 100.0% | array | 0 | [["690f43d882ba8b537e58a3ea","68ef4d41061faaf04522... |
| engagement.shares | 100.0% | number | 0 | [4660,499,1862]... |
| engagement.comments | 100.0% | number | 0 | [4660,2496,7449]... |
| engagement.saves | 100.0% | number | 0 | [2796,1996,1862]... |
| engagement.reports | 100.0% | number | 0 | [0,0,0]... |
| metadata | 100.0% | object | 0 | [{"duration":43,"resolution":"720p","fileSize":619... |
| metadata.duration | 100.0% | number | 0 | [43,176,133]... |
| metadata.resolution | 100.0% | string | 0 | ["720p","720p","720p"]... |
| metadata.fileSize | 100.0% | number | 0 | [61952852,224134240,183821029]... |
| metadata.format | 100.0% | string | 0 | ["webm","webm","mp4"]... |
| metadata.aspectRatio | 100.0% | string | 0 | ["1:1","16:9","9:16"]... |
| metadata.fps | 100.0% | number | 0 | [30,60,30]... |
| processing | 100.0% | object | 0 | [{"status":"completed","originalUrl":"https://res.... |
| processing.status | 100.0% | string | 0 | ["completed","completed","completed"]... |
| processing.originalUrl | 100.0% | string | 0 | ["https://res.cloudinary.com/demo/video/upload/v1/... |
| processing.processedUrl | 100.0% | string | 0 | ["https://res.cloudinary.com/demo/video/upload/v1/... |
| processing.thumbnailUrl | 100.0% | string | 0 | ["https://res.cloudinary.com/demo/video/upload/so_... |
| processing.previewUrl | 100.0% | string | 0 | ["https://res.cloudinary.com/demo/video/upload/v1/... |
| processing.processedAt | 100.0% | object | 0 | ["2025-10-25T14:33:45.335Z","2025-10-30T14:33:45.3... |
| analytics | 100.0% | object | 0 | [{"totalViews":93208,"uniqueViews":79226,"avgWatch... |
| analytics.totalViews | 100.0% | number | 0 | [93208,49923,93122]... |
| analytics.uniqueViews | 100.0% | number | 0 | [79226,42434,79153]... |
| analytics.avgWatchTime | 100.0% | number | 0 | [73,85,16]... |
| analytics.completionRate | 100.0% | number | 0 | [75,82,90]... |
| analytics.engagementRate | 100.0% | number | 0 | [19.99828340914943,24.998497686437112,33.998410687... |
| analytics.shareRate | 100.0% | number | 0 | [4.999570852287357,0.9995392905073813,1.9995275015... |
| analytics.likeRate | 100.0% | number | 0 | [9.999141704574715,18.99925885864231,23.9996993191... |
| analytics.viewsByHour | 100.0% | object | 0 | [{},{},{}]... |
| analytics.viewsByDate | 100.0% | object | 0 | [{},{},{}]... |
| analytics.topLocations | 100.0% | array | 0 | [["Hyderabad","Delhi","Pune"],["Chennai","Hyderaba... |
| analytics.deviceBreakdown | 100.0% | object | 0 | [{"mobile":79,"tablet":16,"desktop":12},{"mobile":... |
| analytics.deviceBreakdown.mobile | 100.0% | number | 0 | [79,79,73]... |
| analytics.deviceBreakdown.tablet | 100.0% | number | 0 | [16,16,20]... |
| analytics.deviceBreakdown.desktop | 100.0% | number | 0 | [12,29,17]... |
| isPublished | 100.0% | boolean | 0 | [true,true,true]... |
| isFeatured | 100.0% | boolean | 0 | [false,false,false]... |
| isApproved | 100.0% | boolean | 0 | [true,true,true]... |
| isTrending | 100.0% | boolean | 0 | [false,false,true]... |
| isSponsored | 100.0% | boolean | 0 | [false,false,false]... |
| sponsorInfo | 100.0% | object | 0 | [{"isDisclosed":true},{"isDisclosed":true},{"isDis... |
| sponsorInfo.isDisclosed | 100.0% | boolean | 0 | [true,true,true]... |
| moderationStatus | 100.0% | string | 0 | ["approved","approved","approved"]... |
| moderationReasons | 100.0% | array | 0 | [[],[],[]]... |
| location | 100.0% | object | 0 | [{"name":"Ahmedabad","coordinates":[72.5714,23.022... |
| location.name | 100.0% | string | 0 | ["Ahmedabad","Bangalore","Mumbai"]... |
| location.coordinates | 100.0% | array | 0 | [[72.5714,23.0225],[77.5946,12.9716],[72.8777,19.0... |
| location.city | 100.0% | string | 0 | ["Ahmedabad","Bangalore","Mumbai"]... |
| location.country | 100.0% | string | 0 | ["India","India","India"]... |
| music | 100.0% | object | 0 | [{"title":"Jazz Smooth","artist":"Jazz Trio","star... |
| music.title | 100.0% | string | 0 | ["Jazz Smooth","Acoustic Guitar","Indie Rock"]... |
| music.artist | 100.0% | string | 0 | ["Jazz Trio","Guitarist","Indie Band"]... |
| music.startTime | 100.0% | number | 0 | [0,0,0]... |
| music.duration | 100.0% | number | 0 | [30,30,30]... |
| effects | 100.0% | array | 0 | [["Dramatic","Sharp"],["Vibrant"],["Vintage","Warm... |
| privacy | 100.0% | string | 0 | ["public","public","public"]... |
| allowComments | 100.0% | boolean | 0 | [true,true,true]... |
| allowSharing | 100.0% | boolean | 0 | [true,true,true]... |
| publishedAt | 100.0% | object | 0 | ["2025-09-18T14:33:45.335Z","2025-10-11T14:33:45.3... |
| createdAt | 100.0% | object | 0 | ["2025-08-25T14:33:45.335Z","2025-08-20T14:33:45.3... |
| updatedAt | 100.0% | object | 0 | ["2025-11-08T14:33:45.335Z","2025-11-08T14:33:45.3... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| contentType | 100.0% | string | 0 | ["merchant","ugc","merchant"]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "creator": 1
    },
    "name": "creator_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isPublished": 1
    },
    "name": "isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1
    },
    "name": "isFeatured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isTrending": 1
    },
    "name": "isTrending_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "moderationStatus": 1
    },
    "name": "moderationStatus_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "location.coordinates": "2dsphere"
    },
    "name": "location.coordinates_2dsphere",
    "background": true,
    "2dsphereIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "publishedAt": 1
    },
    "name": "publishedAt_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "creator": 1,
      "isPublished": 1,
      "createdAt": -1
    },
    "name": "creator_1_isPublished_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "isPublished": 1,
      "publishedAt": -1
    },
    "name": "category_1_isPublished_1_publishedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isFeatured": 1,
      "isPublished": 1
    },
    "name": "isFeatured_1_isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isTrending": 1,
      "isPublished": 1
    },
    "name": "isTrending_1_isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "tags": 1,
      "isPublished": 1
    },
    "name": "tags_1_isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "hashtags": 1,
      "isPublished": 1
    },
    "name": "hashtags_1_isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "engagement.views": -1,
      "isPublished": 1
    },
    "name": "engagement.views_-1_isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "engagement.likes": -1,
      "isPublished": 1
    },
    "name": "engagement.likes_-1_isPublished_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "publishedAt": -1
    },
    "name": "publishedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "_fts": "text",
      "_ftsx": 1
    },
    "name": "title_text_description_text_tags_text_hashtags_text",
    "background": true,
    "weights": {
      "description": 1,
      "hashtags": 3,
      "tags": 5,
      "title": 10
    },
    "default_language": "english",
    "language_override": "language",
    "textIndexVersion": 3
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "engagement.views": -1,
      "publishedAt": -1
    },
    "name": "category_1_engagement.views_-1_publishedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "creator": 1,
      "privacy": 1,
      "publishedAt": -1
    },
    "name": "creator_1_privacy_1_publishedAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "contentType": 1
    },
    "name": "contentType_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "contentType": 1,
      "isPublished": 1,
      "publishedAt": -1
    },
    "name": "contentType_1_isPublished_1_publishedAt_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "690f54c92a2881d4531c28be",
  "title": "Men's Grooming Essentials",
  "description": "Complete grooming routine for modern men",
  "creator": "690f43d982ba8b537e58a40c",
  "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "thumbnail": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
  "preview": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
  "category": "trending_me",
  "subcategory": "ugc",
  "tags": [
    "grooming",
    "skincare",
    "men",
    "beauty"
  ],
  "hashtags": [
    "#grooming",
    "#skincare",
    "#men",
    "#beauty"
  ],
  "products": [
    "6905afbe5f8c7aa14aa29a04",
    "68ece1f934b0337d12aaa6e5"
  ],
  "stores": [
    "68ee29d08c4fa11015d7034d",
    "69059ef3cdd7a84b808a74f9"
  ],
  "engagement": {
    "views": 93208,
    "likes": [
      "690f43d882ba8b537e58a3ea",
      "68ef4d41061faaf045222506",
      "690f4394ebb40efd0129922f",
      "690f4394ebb40efd01299231",
      "690f43d882ba8b537e58a3d8",
      "690f43d882ba8b537e58a3fc",
      "690f43d782ba8b537e58a3b8",
      "690f43d882ba8b537e58a3d2",
      "690f4394ebb40efd0129922e",
      "6909d11570927098b1c6a95c",
      "690f4394ebb40efd0129922d",
      "690f4394ebb40efd01299224",
      "690e22def6a9c6e39b4eb2e3",
      "690f43d882ba8b537e58a3c5",
      "690e1240f6a9c6e39b4eaf4e",
      "690f43d882ba8b537e58a3e5",
      "68fd437e47c313aa521818c4",
      "690f43d882ba8b537e58a3df",
      "690f4394ebb40efd01299225",
      "68fb5d9318377fe11cba74b8"
    ],
    "shares": 4660,
    "comments": 4660,
    "saves": 2796,
    "reports": 0
  },
  "metadata": {
    "duration": 43,
    "resolution": "720p",
    "fileSize": 61952852,
    "format": "webm",
    "aspectRatio": "1:1",
    "fps": 30
  },
  "processing": {
    "status": "completed",
    "originalUrl": "https://res.cloudinary.com/demo/video/upload/v1/cld-sample-video.mp4",
    "processedUrl": "https://res.cloudinary.com/demo/video/upload/v1/cld-sample-video.mp4",
    "thumbnailUrl": "https://res.cloudinary.com/demo/video/upload/so_0,w_400,h_600,c_fill,q_auto/v1/cld-sample-video.jpg",
    "previewUrl": "https://res.cloudinary.com/demo/video/upload/v1/cld-sample-video.mp4",
    "processedAt": "2025-10-25T14:33:45.335Z"
  },
  "analytics": {
    "totalViews": 93208,
    "uniqueViews": 79226,
    "avgWatchTime": 73,
    "completionRate": 75,
    "engagementRate": 19.99828340914943,
    "shareRate": 4.999570852287357,
    "likeRate": 9.999141704574715,
    "viewsByHour": {},
    "viewsByDate": {},
    "topLocations": [
      "Hyderabad",
      "Delhi",
      "Pune"
    ],
    "deviceBreakdown": {
      "mobile": 79,
      "tablet": 16,
      "desktop": 12
    }
  },
  "isPublished": true,
  "isFeatured": false,
  "isApproved": true,
  "isTrending": false,
  "isSponsored": false,
  "sponsorInfo": {
    "isDisclosed": true
  },
  "moderationStatus": "approved",
  "moderationReasons": [],
  "location": {
    "name": "Ahmedabad",
    "coordinates": [
      72.5714,
      23.0225
    ],
    "city": "Ahmedabad",
    "country": "India"
  },
  "music": {
    "title": "Jazz Smooth",
    "artist": "Jazz Trio",
    "startTime": 0,
    "duration": 30
  },
  "effects": [
    "Dramatic",
    "Sharp"
  ],
  "privacy": "public",
  "allowComments": true,
  "allowSharing": true,
  "publishedAt": "2025-09-18T14:33:45.335Z",
  "createdAt": "2025-08-25T14:33:45.335Z",
  "updatedAt": "2025-11-08T14:33:45.335Z",
  "__v": 0,
  "contentType": "merchant"
}
```

---

### usercoupons

**Document Count:** 10

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68e24bfbd858440d163126e5","68e24bfbd858440d16312... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,226,75,251,216,88,68... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [226,226,226]... |
| _id.buffer.2 | 100.0% | number | 0 | [75,75,75]... |
| _id.buffer.3 | 100.0% | number | 0 | [251,251,251]... |
| _id.buffer.4 | 100.0% | number | 0 | [216,216,216]... |
| _id.buffer.5 | 100.0% | number | 0 | [88,88,88]... |
| _id.buffer.6 | 100.0% | number | 0 | [68,68,68]... |
| _id.buffer.7 | 100.0% | number | 0 | [13,13,13]... |
| _id.buffer.8 | 100.0% | number | 0 | [22,22,22]... |
| _id.buffer.9 | 100.0% | number | 0 | [49,49,49]... |
| _id.buffer.10 | 100.0% | number | 0 | [38,38,38]... |
| _id.buffer.11 | 100.0% | number | 0 | [229,232,237]... |
| user | 100.0% | object | 0 | ["68c1447aa6d2db865ad82459","68c1447aa6d2db865ad82... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,68,122,166,210,2... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [68,68,68]... |
| user.buffer.3 | 100.0% | number | 0 | [122,122,122]... |
| user.buffer.4 | 100.0% | number | 0 | [166,166,166]... |
| user.buffer.5 | 100.0% | number | 0 | [210,210,210]... |
| user.buffer.6 | 100.0% | number | 0 | [219,219,219]... |
| user.buffer.7 | 100.0% | number | 0 | [134,134,134]... |
| user.buffer.8 | 100.0% | number | 0 | [90,90,90]... |
| user.buffer.9 | 100.0% | number | 0 | [216,216,216]... |
| user.buffer.10 | 100.0% | number | 0 | [36,36,36]... |
| user.buffer.11 | 100.0% | number | 0 | [89,89,90]... |
| coupon | 100.0% | object | 0 | ["68e24bfad858440d163126b8","68e24bfad858440d16312... |
| coupon.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,226,75,250,216,88,68... |
| coupon.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| coupon.buffer.1 | 100.0% | number | 0 | [226,226,226]... |
| coupon.buffer.2 | 100.0% | number | 0 | [75,75,75]... |
| coupon.buffer.3 | 100.0% | number | 0 | [250,250,251]... |
| coupon.buffer.4 | 100.0% | number | 0 | [216,216,216]... |
| coupon.buffer.5 | 100.0% | number | 0 | [88,88,88]... |
| coupon.buffer.6 | 100.0% | number | 0 | [68,68,68]... |
| coupon.buffer.7 | 100.0% | number | 0 | [13,13,13]... |
| coupon.buffer.8 | 100.0% | number | 0 | [22,22,22]... |
| coupon.buffer.9 | 100.0% | number | 0 | [49,49,49]... |
| coupon.buffer.10 | 100.0% | number | 0 | [38,38,38]... |
| coupon.buffer.11 | 100.0% | number | 0 | [184,190,196]... |
| claimedDate | 100.0% | object | 0 | ["2025-09-30T10:44:11.338Z","2025-10-02T10:44:11.3... |
| expiryDate | 100.0% | object | 0 | ["2026-01-03T10:44:10.867Z","2025-11-04T10:44:10.9... |
| usedDate | 100.0% | object | 9 | ["2025-10-03T10:44:11.453Z"]... |
| usedInOrder | 100.0% |  | 10 | []... |
| status | 100.0% | string | 0 | ["available","available","used"]... |
| notifications | 100.0% | object | 0 | [{"expiryReminder":true,"expiryReminderSent":null}... |
| notifications.expiryReminder | 100.0% | boolean | 0 | [true,true,false]... |
| notifications.expiryReminderSent | 100.0% | object | 9 | ["2025-09-30T10:44:11.507Z"]... |
| createdAt | 100.0% | object | 0 | ["2025-10-05T10:44:11.339Z","2025-10-05T10:44:11.3... |
| updatedAt | 100.0% | object | 0 | ["2025-10-05T10:44:11.339Z","2025-10-05T10:44:11.3... |
| __v | 100.0% | number | 0 | [0,0,0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "coupon": 1
    },
    "name": "coupon_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiryDate": 1
    },
    "name": "expiryDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "coupon": 1
    },
    "name": "user_1_coupon_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "expiryDate": 1
    },
    "name": "status_1_expiryDate_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68e24bfbd858440d163126e5",
  "user": "68c1447aa6d2db865ad82459",
  "coupon": "68e24bfad858440d163126b8",
  "claimedDate": "2025-09-30T10:44:11.338Z",
  "expiryDate": "2026-01-03T10:44:10.867Z",
  "usedDate": null,
  "usedInOrder": null,
  "status": "available",
  "notifications": {
    "expiryReminder": true,
    "expiryReminderSent": null
  },
  "createdAt": "2025-10-05T10:44:11.339Z",
  "updatedAt": "2025-10-05T10:44:11.339Z",
  "__v": 0
}
```

---

### eventbookings

**Document Count:** 4

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["690dc146eabf3217703bdd38","690dc416cb14ba31019da... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,13,193,70,234,191,50... |
| _id.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| _id.buffer.1 | 100.0% | number | 0 | [13,13,13]... |
| _id.buffer.2 | 100.0% | number | 0 | [193,196,197]... |
| _id.buffer.3 | 100.0% | number | 0 | [70,22,243]... |
| _id.buffer.4 | 100.0% | number | 0 | [234,203,255]... |
| _id.buffer.5 | 100.0% | number | 0 | [191,20,165]... |
| _id.buffer.6 | 100.0% | number | 0 | [50,186,12]... |
| _id.buffer.7 | 100.0% | number | 0 | [23,49,127]... |
| _id.buffer.8 | 100.0% | number | 0 | [112,1,136]... |
| _id.buffer.9 | 100.0% | number | 0 | [59,157,245]... |
| _id.buffer.10 | 100.0% | number | 0 | [221,175,34]... |
| _id.buffer.11 | 100.0% | number | 0 | [56,215,175]... |
| eventId | 100.0% | object | 0 | ["690445cf163be31c3a6535bb","690445cf163be31c3a653... |
| eventId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,4,69,207,22,59,227,2... |
| eventId.buffer.0 | 100.0% | number | 0 | [105,105,105]... |
| eventId.buffer.1 | 100.0% | number | 0 | [4,4,4]... |
| eventId.buffer.2 | 100.0% | number | 0 | [69,69,69]... |
| eventId.buffer.3 | 100.0% | number | 0 | [207,207,207]... |
| eventId.buffer.4 | 100.0% | number | 0 | [22,22,22]... |
| eventId.buffer.5 | 100.0% | number | 0 | [59,59,59]... |
| eventId.buffer.6 | 100.0% | number | 0 | [227,227,227]... |
| eventId.buffer.7 | 100.0% | number | 0 | [28,28,28]... |
| eventId.buffer.8 | 100.0% | number | 0 | [58,58,58]... |
| eventId.buffer.9 | 100.0% | number | 0 | [101,101,101]... |
| eventId.buffer.10 | 100.0% | number | 0 | [53,53,53]... |
| eventId.buffer.11 | 100.0% | number | 0 | [187,187,187]... |
| userId | 100.0% | object | 0 | ["68ef4d41061faaf045222506","68ef4d41061faaf045222... |
| userId.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,239,77,65,6,31,170,2... |
| userId.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| userId.buffer.1 | 100.0% | number | 0 | [239,239,239]... |
| userId.buffer.2 | 100.0% | number | 0 | [77,77,77]... |
| userId.buffer.3 | 100.0% | number | 0 | [65,65,65]... |
| userId.buffer.4 | 100.0% | number | 0 | [6,6,6]... |
| userId.buffer.5 | 100.0% | number | 0 | [31,31,31]... |
| userId.buffer.6 | 100.0% | number | 0 | [170,170,170]... |
| userId.buffer.7 | 100.0% | number | 0 | [240,240,240]... |
| userId.buffer.8 | 100.0% | number | 0 | [69,69,69]... |
| userId.buffer.9 | 100.0% | number | 0 | [34,34,34]... |
| userId.buffer.10 | 100.0% | number | 0 | [37,37,37]... |
| userId.buffer.11 | 100.0% | number | 0 | [6,6,6]... |
| slotId | 100.0% | string | 0 | ["slot1","slot1","slot1"]... |
| status | 100.0% | string | 0 | ["cancelled","cancelled","confirmed"]... |
| paymentStatus | 100.0% | string | 0 | ["pending","pending","completed"]... |
| amount | 100.0% | number | 0 | [199,199,199]... |
| currency | 100.0% | string | 0 | ["₹","₹","₹"]... |
| attendeeInfo | 100.0% | object | 0 | [{"name":"Mukul Raj","email":"mukulraj756@gmail.co... |
| attendeeInfo.name | 100.0% | string | 0 | ["Mukul Raj","Mukul Raj Mukul Raj","Mukul Raj"]... |
| attendeeInfo.email | 100.0% | string | 0 | ["mukulraj756@gmail.com","mukulraj756@gmail.com","... |
| attendeeInfo.phone | 100.0% | string | 0 | ["8210224305","8210224305","08210224305"]... |
| attendeeInfo.age | 100.0% | number | 0 | [24,23,33]... |
| attendeeInfo.specialRequirements | 100.0% | string | 0 | ["ouoijoj","gjhhbj","khkj"]... |
| bookingReference | 100.0% | string | 0 | ["EVTmhoofdyeVBARWN","EVTmhoout54GUO4FS","EVTmhop5... |
| bookingDate | 100.0% | object | 0 | ["2025-11-07T09:52:06.759Z","2025-11-07T10:04:06.2... |
| createdAt | 100.0% | object | 0 | ["2025-11-07T09:52:06.760Z","2025-11-07T10:04:06.2... |
| updatedAt | 100.0% | object | 0 | ["2025-11-07T10:03:37.115Z","2025-11-07T10:08:03.7... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| notes | 50.0% | string | 0 | ["Cancelled by user","Cancelled by user"]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "bookingReference": 1
    },
    "name": "bookingReference_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "eventId": 1,
      "userId": 1
    },
    "name": "eventId_1_userId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "status": 1
    },
    "name": "userId_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "bookingDate": 1
    },
    "name": "status_1_bookingDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "paymentStatus": 1
    },
    "name": "paymentStatus_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "690dc146eabf3217703bdd38",
  "eventId": "690445cf163be31c3a6535bb",
  "userId": "68ef4d41061faaf045222506",
  "slotId": "slot1",
  "status": "cancelled",
  "paymentStatus": "pending",
  "amount": 199,
  "currency": "₹",
  "attendeeInfo": {
    "name": "Mukul Raj",
    "email": "mukulraj756@gmail.com",
    "phone": "8210224305",
    "age": 24,
    "specialRequirements": "ouoijoj"
  },
  "bookingReference": "EVTmhoofdyeVBARWN",
  "bookingDate": "2025-11-07T09:52:06.759Z",
  "createdAt": "2025-11-07T09:52:06.760Z",
  "updatedAt": "2025-11-07T10:03:37.115Z",
  "__v": 0,
  "notes": "Cancelled by user"
}
```

---

### challenges

**Document Count:** 27

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68fb5fd770cd9d7de50e6531","68fb5fd770cd9d7de50e6... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,251,95,215,112,205,1... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [251,251,251]... |
| _id.buffer.2 | 100.0% | number | 0 | [95,95,95]... |
| _id.buffer.3 | 100.0% | number | 0 | [215,215,215]... |
| _id.buffer.4 | 100.0% | number | 0 | [112,112,112]... |
| _id.buffer.5 | 100.0% | number | 0 | [205,205,205]... |
| _id.buffer.6 | 100.0% | number | 0 | [157,157,157]... |
| _id.buffer.7 | 100.0% | number | 0 | [125,125,125]... |
| _id.buffer.8 | 100.0% | number | 0 | [229,229,229]... |
| _id.buffer.9 | 100.0% | number | 0 | [14,14,14]... |
| _id.buffer.10 | 100.0% | number | 0 | [101,101,101]... |
| _id.buffer.11 | 100.0% | number | 0 | [49,50,51]... |
| type | 100.0% | string | 0 | ["daily","daily","daily"]... |
| title | 100.0% | string | 0 | ["Daily Check-In","Store Explorer","Social Sharer"... |
| description | 100.0% | string | 0 | ["Login to the app today and claim your reward","V... |
| icon | 100.0% | string | 0 | ["🎯","🏪","📱"]... |
| requirements | 100.0% | object | 0 | [{"action":"login_streak","target":1,"stores":[],"... |
| requirements.action | 100.0% | string | 0 | ["login_streak","visit_stores","share_deals"]... |
| requirements.target | 100.0% | number | 0 | [1,3,2]... |
| requirements.stores | 100.0% | array | 0 | [[],[],[]]... |
| requirements.categories | 100.0% | array | 0 | [[],[],[]]... |
| rewards | 100.0% | object | 0 | [{"coins":10,"badges":["daily-warrior"],"exclusive... |
| rewards.coins | 100.0% | number | 0 | [10,15,20]... |
| rewards.badges | 100.0% | array | 0 | [["daily-warrior"],[],["social-butterfly"]]... |
| rewards.exclusiveDeals | 100.0% | array | 0 | [[],[],[]]... |
| difficulty | 100.0% | string | 0 | ["easy","easy","medium"]... |
| startDate | 100.0% | object | 0 | ["2025-11-03T18:30:00.000Z","2025-11-03T18:30:00.0... |
| endDate | 100.0% | object | 0 | ["2025-11-04T18:30:00.000Z","2025-11-04T18:30:00.0... |
| participantCount | 100.0% | number | 0 | [121,85,60]... |
| completionCount | 100.0% | number | 0 | [96,42,35]... |
| active | 100.0% | boolean | 0 | [true,true,true]... |
| featured | 100.0% | boolean | 0 | [true,false,false]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-10-24T11:15:35.840Z","2025-10-24T11:15:35.8... |
| updatedAt | 100.0% | object | 0 | ["2025-11-04T10:33:18.647Z","2025-11-04T09:01:05.6... |
| rewards.multiplier | 40.0% | number | 0 | [1.2,1.5,2]... |
| requirements.minAmount | 10.0% | number | 0 | [2000]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "type": 1
    },
    "name": "type_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "difficulty": 1
    },
    "name": "difficulty_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "startDate": 1
    },
    "name": "startDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "endDate": 1
    },
    "name": "endDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "active": 1
    },
    "name": "active_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "featured": 1
    },
    "name": "featured_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "type": 1,
      "active": 1,
      "startDate": 1,
      "endDate": 1
    },
    "name": "type_1_active_1_startDate_1_endDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "active": 1,
      "featured": 1,
      "endDate": -1
    },
    "name": "active_1_featured_1_endDate_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68fb5fd770cd9d7de50e6531",
  "type": "daily",
  "title": "Daily Check-In",
  "description": "Login to the app today and claim your reward",
  "icon": "🎯",
  "requirements": {
    "action": "login_streak",
    "target": 1,
    "stores": [],
    "categories": []
  },
  "rewards": {
    "coins": 10,
    "badges": [
      "daily-warrior"
    ],
    "exclusiveDeals": []
  },
  "difficulty": "easy",
  "startDate": "2025-11-03T18:30:00.000Z",
  "endDate": "2025-11-04T18:30:00.000Z",
  "participantCount": 121,
  "completionCount": 96,
  "active": true,
  "featured": true,
  "__v": 0,
  "createdAt": "2025-10-24T11:15:35.840Z",
  "updatedAt": "2025-11-04T10:33:18.647Z"
}
```

---

### paymentmethods

**Document Count:** 4

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68db87d33e4f892d1c633cda","68e0dc808f797610089bf... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,219,135,211,62,79,13... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [219,224,224]... |
| _id.buffer.2 | 100.0% | number | 0 | [135,220,235]... |
| _id.buffer.3 | 100.0% | number | 0 | [211,128,24]... |
| _id.buffer.4 | 100.0% | number | 0 | [62,143,80]... |
| _id.buffer.5 | 100.0% | number | 0 | [79,121,197]... |
| _id.buffer.6 | 100.0% | number | 0 | [137,118,131]... |
| _id.buffer.7 | 100.0% | number | 0 | [45,16,191]... |
| _id.buffer.8 | 100.0% | number | 0 | [28,8,55]... |
| _id.buffer.9 | 100.0% | number | 0 | [99,155,153]... |
| _id.buffer.10 | 100.0% | number | 0 | [60,249,22]... |
| _id.buffer.11 | 100.0% | number | 0 | [218,94,230]... |
| user | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c","68c145d5f016515d8eb31... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [69,69,69]... |
| user.buffer.3 | 100.0% | number | 0 | [213,213,213]... |
| user.buffer.4 | 100.0% | number | 0 | [240,240,240]... |
| user.buffer.5 | 100.0% | number | 0 | [22,22,22]... |
| user.buffer.6 | 100.0% | number | 0 | [81,81,81]... |
| user.buffer.7 | 100.0% | number | 0 | [93,93,93]... |
| user.buffer.8 | 100.0% | number | 0 | [142,142,142]... |
| user.buffer.9 | 100.0% | number | 0 | [179,179,179]... |
| user.buffer.10 | 100.0% | number | 0 | [28,28,28]... |
| user.buffer.11 | 100.0% | number | 0 | [12,12,12]... |
| type | 100.0% | string | 0 | ["CARD","UPI","UPI"]... |
| card | 25.0% | object | 0 | [{"nickname":"Primary Visa Card"}]... |
| card.nickname | 25.0% | string | 0 | ["Primary Visa Card"]... |
| bankAccount | 100.0% | object | 0 | [{"isVerified":false},{"isVerified":false},{"isVer... |
| bankAccount.isVerified | 100.0% | boolean | 0 | [false,false,false]... |
| upi | 100.0% | object | 0 | [{"isVerified":false},{"vpa":"mukulraj756@gmail.co... |
| upi.isVerified | 100.0% | boolean | 0 | [false,false,false]... |
| isDefault | 100.0% | boolean | 0 | [false,false,false]... |
| isActive | 100.0% | boolean | 0 | [false,false,true]... |
| createdAt | 100.0% | object | 0 | ["2025-09-30T07:33:39.801Z","2025-10-04T08:36:16.9... |
| updatedAt | 100.0% | object | 0 | ["2025-10-04T09:43:22.066Z","2025-10-04T09:43:22.0... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| upi.vpa | 75.0% | string | 0 | ["mukulraj756@gmail.com","mukulraj756@gmail.com","... |
| upi.nickname | 75.0% | string | 0 | ["","",""]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "isDefault": 1
    },
    "name": "user_1_isDefault_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "isActive": 1
    },
    "name": "user_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "type": 1
    },
    "name": "user_1_type_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68db87d33e4f892d1c633cda",
  "user": "68c145d5f016515d8eb31c0c",
  "type": "CARD",
  "card": {
    "nickname": "Primary Visa Card"
  },
  "bankAccount": {
    "isVerified": false
  },
  "upi": {
    "isVerified": false
  },
  "isDefault": false,
  "isActive": false,
  "createdAt": "2025-09-30T07:33:39.801Z",
  "updatedAt": "2025-10-04T09:43:22.066Z",
  "__v": 0
}
```

---

### cashbackrequests

**Document Count:** 20

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68aa18d31e23530f4bbaacea","68aa18d31e23530f4bbaa... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,170,24,211,30,35,83,... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [170,170,170]... |
| _id.buffer.2 | 100.0% | number | 0 | [24,24,24]... |
| _id.buffer.3 | 100.0% | number | 0 | [211,211,211]... |
| _id.buffer.4 | 100.0% | number | 0 | [30,30,30]... |
| _id.buffer.5 | 100.0% | number | 0 | [35,35,35]... |
| _id.buffer.6 | 100.0% | number | 0 | [83,83,83]... |
| _id.buffer.7 | 100.0% | number | 0 | [15,15,15]... |
| _id.buffer.8 | 100.0% | number | 0 | [75,75,75]... |
| _id.buffer.9 | 100.0% | number | 0 | [186,186,186]... |
| _id.buffer.10 | 100.0% | number | 0 | [172,172,172]... |
| _id.buffer.11 | 100.0% | number | 0 | [234,241,248]... |
| requestNumber | 100.0% | string | 0 | ["CB25082493977333A","CB250824939845W2H","CB250824... |
| merchantId | 100.0% | string | 0 | ["68aa18b91e23530f4bbaace0","68aa18b91e23530f4bbaa... |
| customerId | 100.0% | string | 0 | ["customer_1","customer_2","customer_3"]... |
| orderId | 100.0% | string | 0 | ["order_1","order_1","order_1"]... |
| customer | 100.0% | object | 0 | [{"id":"customer_1","name":"John Smith","email":"j... |
| customer.id | 100.0% | string | 0 | ["customer_1","customer_2","customer_3"]... |
| customer.name | 100.0% | string | 0 | ["John Smith","Emily Johnson","Michael Davis"]... |
| customer.email | 100.0% | string | 0 | ["john.smith@example.com","emily.johnson@example.c... |
| customer.phone | 100.0% | string | 0 | ["+1-555-0101","+1-555-0102","+1-555-0103"]... |
| customer.avatar | 100.0% | string | 0 | ["https://api.dicebear.com/7.x/personas/svg?seed=j... |
| customer.totalCashbackEarned | 100.0% | number | 0 | [145.5,89.25,12.5]... |
| customer.accountAge | 100.0% | number | 0 | [120,45,5]... |
| customer.verificationStatus | 100.0% | string | 0 | ["verified","verified","pending"]... |
| order | 100.0% | object | 0 | [{"id":"order_1","orderNumber":"ORD24081601","tota... |
| order.id | 100.0% | string | 0 | ["order_1","order_1","order_1"]... |
| order.orderNumber | 100.0% | string | 0 | ["ORD24081601","ORD24081601","ORD24081601"]... |
| order.totalAmount | 100.0% | number | 0 | [75.99,75.99,75.99]... |
| order.orderDate | 100.0% | object | 0 | ["2025-08-21T19:38:59.773Z","2025-08-21T19:38:59.7... |
| order.items | 100.0% | array | 0 | [[{"productId":"product_1","productName":"Premium ... |
| requestedAmount | 100.0% | number | 0 | [29.799499435423755,21.908787892134903,10.15139892... |
| cashbackRate | 100.0% | number | 0 | [6.627736786594594,9.25273671926727,9.395090032155... |
| calculationBreakdown | 100.0% | array | 0 | [[{"productId":"product_1","productName":"Premium ... |
| status | 100.0% | string | 0 | ["paid","approved","paid"]... |
| priority | 100.0% | string | 0 | ["normal","urgent","high"]... |
| riskScore | 100.0% | number | 0 | [0,0,65]... |
| riskFactors | 100.0% | array | 0 | [[],[],[{"type":"account","severity":"high","descr... |
| flaggedForReview | 100.0% | boolean | 0 | [false,false,true]... |
| expiresAt | 100.0% | object | 0 | ["2025-08-30T19:38:59.773Z","2025-08-30T19:38:59.8... |
| timeline | 100.0% | array | 0 | [[{"status":"paid","timestamp":"2025-08-23T19:38:5... |
| createdAt | 100.0% | object | 0 | ["2025-08-23T19:38:59.783Z","2025-08-23T19:38:59.8... |
| updatedAt | 100.0% | object | 0 | ["2025-08-23T19:38:59.783Z","2025-08-23T19:38:59.8... |
| __v | 100.0% | number | 0 | [0,0,0]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "requestNumber": 1
    },
    "name": "requestNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "merchantId": 1
    },
    "name": "merchantId_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68aa18d31e23530f4bbaacea",
  "requestNumber": "CB25082493977333A",
  "merchantId": "68aa18b91e23530f4bbaace0",
  "customerId": "customer_1",
  "orderId": "order_1",
  "customer": {
    "id": "customer_1",
    "name": "John Smith",
    "email": "john.smith@example.com",
    "phone": "+1-555-0101",
    "avatar": "https://api.dicebear.com/7.x/personas/svg?seed=john",
    "totalCashbackEarned": 145.5,
    "accountAge": 120,
    "verificationStatus": "verified"
  },
  "order": {
    "id": "order_1",
    "orderNumber": "ORD24081601",
    "totalAmount": 75.99,
    "orderDate": "2025-08-21T19:38:59.773Z",
    "items": [
      {
        "productId": "product_1",
        "productName": "Premium Coffee Beans",
        "quantity": 2,
        "price": 24.99,
        "cashbackEligible": true,
        "_id": "68aa18d31e23530f4bbaaceb"
      },
      {
        "productId": "product_2",
        "productName": "Artisan Bread",
        "quantity": 1,
        "price": 8.5,
        "cashbackEligible": true,
        "_id": "68aa18d31e23530f4bbaacec"
      }
    ]
  },
  "requestedAmount": 29.799499435423755,
  "cashbackRate": 6.627736786594594,
  "calculationBreakdown": [
    {
      "productId": "product_1",
      "productName": "Premium Coffee Beans",
      "quantity": 2,
      "productPrice": 24.99,
      "cashbackRate": 6.627736786594594,
      "cashbackAmount": 3.312542845939978,
      "categoryId": "cat_food",
      "categoryName": "Food & Beverages",
      "_id": "68aa18d31e23530f4bbaaced"
    },
    {
      "productId": "product_2",
      "productName": "Artisan Bread",
      "quantity": 1,
      "productPrice": 8.5,
      "cashbackRate": 6.627736786594594,
      "cashbackAmount": 0.5633576268605405,
      "categoryId": "cat_food",
      "categoryName": "Food & Beverages",
      "_id": "68aa18d31e23530f4bbaacee"
    }
  ],
  "status": "paid",
  "priority": "normal",
  "riskScore": 0,
  "riskFactors": [],
  "flaggedForReview": false,
  "expiresAt": "2025-08-30T19:38:59.773Z",
  "timeline": [
    {
      "status": "paid",
      "timestamp": "2025-08-23T19:38:59.773Z",
      "notes": "Initial request created",
      "_id": "68aa18d31e23530f4bbaacef"
    }
  ],
  "createdAt": "2025-08-23T19:38:59.783Z",
  "updatedAt": "2025-08-23T19:38:59.783Z",
  "__v": 0
}
```

---

### userachievements

**Document Count:** 90

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68db87d83e4f892d1c633ce3","68db87d83e4f892d1c633... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,219,135,216,62,79,13... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [219,219,219]... |
| _id.buffer.2 | 100.0% | number | 0 | [135,135,135]... |
| _id.buffer.3 | 100.0% | number | 0 | [216,216,216]... |
| _id.buffer.4 | 100.0% | number | 0 | [62,62,62]... |
| _id.buffer.5 | 100.0% | number | 0 | [79,79,79]... |
| _id.buffer.6 | 100.0% | number | 0 | [137,137,137]... |
| _id.buffer.7 | 100.0% | number | 0 | [45,45,45]... |
| _id.buffer.8 | 100.0% | number | 0 | [28,28,28]... |
| _id.buffer.9 | 100.0% | number | 0 | [99,99,99]... |
| _id.buffer.10 | 100.0% | number | 0 | [60,60,60]... |
| _id.buffer.11 | 100.0% | number | 0 | [227,228,229]... |
| user | 100.0% | object | 0 | ["68c145d5f016515d8eb31c0c","68c145d5f016515d8eb31... |
| user.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,193,69,213,240,22,81... |
| user.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| user.buffer.1 | 100.0% | number | 0 | [193,193,193]... |
| user.buffer.2 | 100.0% | number | 0 | [69,69,69]... |
| user.buffer.3 | 100.0% | number | 0 | [213,213,213]... |
| user.buffer.4 | 100.0% | number | 0 | [240,240,240]... |
| user.buffer.5 | 100.0% | number | 0 | [22,22,22]... |
| user.buffer.6 | 100.0% | number | 0 | [81,81,81]... |
| user.buffer.7 | 100.0% | number | 0 | [93,93,93]... |
| user.buffer.8 | 100.0% | number | 0 | [142,142,142]... |
| user.buffer.9 | 100.0% | number | 0 | [179,179,179]... |
| user.buffer.10 | 100.0% | number | 0 | [28,28,28]... |
| user.buffer.11 | 100.0% | number | 0 | [12,12,12]... |
| type | 100.0% | string | 0 | ["FIRST_ORDER","ORDERS_10","ORDERS_50"]... |
| title | 100.0% | string | 0 | ["First Order","10 Orders","50 Orders"]... |
| description | 100.0% | string | 0 | ["Completed your first order","Completed 10 orders... |
| icon | 100.0% | string | 0 | ["cart","cart","cart"]... |
| color | 100.0% | string | 0 | ["#10B981","#10B981","#F59E0B"]... |
| unlocked | 100.0% | boolean | 0 | [false,false,false]... |
| progress | 100.0% | number | 0 | [0,0,0]... |
| currentValue | 100.0% | number | 0 | [0,0,0]... |
| targetValue | 100.0% | number | 0 | [1,10,50]... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| createdAt | 100.0% | object | 0 | ["2025-09-30T07:33:44.134Z","2025-09-30T07:33:44.1... |
| updatedAt | 100.0% | object | 0 | ["2025-09-30T07:33:44.134Z","2025-09-30T07:33:44.1... |
| unlockedDate | 10.0% | object | 0 | ["2025-10-12T03:29:54.168Z"]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "type": 1
    },
    "name": "user_1_type_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "unlocked": 1
    },
    "name": "user_1_unlocked_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "progress": -1
    },
    "name": "user_1_progress_-1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68db87d83e4f892d1c633ce3",
  "user": "68c145d5f016515d8eb31c0c",
  "type": "FIRST_ORDER",
  "title": "First Order",
  "description": "Completed your first order",
  "icon": "cart",
  "color": "#10B981",
  "unlocked": false,
  "progress": 0,
  "currentValue": 0,
  "targetValue": 1,
  "__v": 0,
  "createdAt": "2025-09-30T07:33:44.134Z",
  "updatedAt": "2025-09-30T07:33:44.134Z"
}
```

---

### triviaquestions

**Document Count:** 1

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["690891fa156c34256351672b"]... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[105,8,145,250,21,108,52,... |
| _id.buffer.0 | 100.0% | number | 0 | [105]... |
| _id.buffer.1 | 100.0% | number | 0 | [8]... |
| _id.buffer.2 | 100.0% | number | 0 | [145]... |
| _id.buffer.3 | 100.0% | number | 0 | [250]... |
| _id.buffer.4 | 100.0% | number | 0 | [21]... |
| _id.buffer.5 | 100.0% | number | 0 | [108]... |
| _id.buffer.6 | 100.0% | number | 0 | [52]... |
| _id.buffer.7 | 100.0% | number | 0 | [37]... |
| _id.buffer.8 | 100.0% | number | 0 | [99]... |
| _id.buffer.9 | 100.0% | number | 0 | [81]... |
| _id.buffer.10 | 100.0% | number | 0 | [103]... |
| _id.buffer.11 | 100.0% | number | 0 | [43]... |
| question | 100.0% | string | 0 | ["In which year did World War II end?"]... |
| options | 100.0% | array | 0 | [["1943","1944","1945","1946"]]... |
| correctAnswer | 100.0% | number | 0 | [2]... |
| category | 100.0% | string | 0 | ["history"]... |
| difficulty | 100.0% | string | 0 | ["easy"]... |
| points | 100.0% | number | 0 | [15]... |
| funFact | 100.0% | string | 0 | ["World War II officially ended on September 2, 19... |
| tags | 100.0% | array | 0 | [["WWII","wars","20th century"]]... |
| isActive | 100.0% | boolean | 0 | [true]... |
| usageCount | 100.0% | number | 0 | [0]... |
| correctAnswerCount | 100.0% | number | 0 | [0]... |
| incorrectAnswerCount | 100.0% | number | 0 | [0]... |
| __v | 100.0% | number | 0 | [0]... |
| createdAt | 100.0% | object | 0 | ["2025-11-03T11:28:58.966Z"]... |
| updatedAt | 100.0% | object | 0 | ["2025-11-03T11:28:58.966Z"]... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "category": 1
    },
    "name": "category_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "difficulty": 1
    },
    "name": "difficulty_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "dateOfDay": 1
    },
    "name": "dateOfDay_1",
    "background": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "category": 1,
      "difficulty": 1,
      "isActive": 1
    },
    "name": "category_1_difficulty_1_isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "dateOfDay": 1,
      "isActive": 1
    },
    "name": "dateOfDay_1_isActive_1",
    "background": true,
    "unique": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1,
      "usageCount": 1
    },
    "name": "isActive_1_usageCount_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "690891fa156c34256351672b",
  "question": "In which year did World War II end?",
  "options": [
    "1943",
    "1944",
    "1945",
    "1946"
  ],
  "correctAnswer": 2,
  "category": "history",
  "difficulty": "easy",
  "points": 15,
  "funFact": "World War II officially ended on September 2, 1945, when Japan signed the surrender documents aboard the USS Missouri.",
  "tags": [
    "WWII",
    "wars",
    "20th century"
  ],
  "isActive": true,
  "usageCount": 0,
  "correctAnswerCount": 0,
  "incorrectAnswerCount": 0,
  "__v": 0,
  "createdAt": "2025-11-03T11:28:58.966Z",
  "updatedAt": "2025-11-03T11:28:58.966Z"
}
```

---

### serviceappointments

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "appointmentNumber": 1
    },
    "name": "appointmentNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "store": 1
    },
    "name": "store_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "appointmentDate": 1
    },
    "name": "appointmentDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "appointmentDate": 1
    },
    "name": "store_1_appointmentDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "createdAt": -1
    },
    "name": "user_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "store": 1,
      "status": 1,
      "appointmentDate": 1
    },
    "name": "store_1_status_1_appointmentDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "appointmentDate": 1,
      "status": 1
    },
    "name": "appointmentDate_1_status_1",
    "background": true
  }
]
```

---

### payments

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "paymentId": 1
    },
    "name": "paymentId_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "orderId": 1
    },
    "name": "orderId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "user": 1
    },
    "name": "user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "paymentMethodId": 1
    },
    "name": "paymentMethodId_1",
    "background": true,
    "sparse": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "expiresAt": 1
    },
    "name": "expiresAt_1",
    "background": true,
    "expireAfterSeconds": 0
  },
  {
    "v": 2,
    "key": {
      "user": 1,
      "status": 1
    },
    "name": "user_1_status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "paymentId": 1,
      "user": 1
    },
    "name": "paymentId_1_user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "orderId": 1,
      "user": 1
    },
    "name": "orderId_1_user_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "createdAt": -1
    },
    "name": "createdAt_-1",
    "background": true
  }
]
```

---

### tablebookings

**Document Count:** 0

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "bookingNumber": 1
    },
    "name": "bookingNumber_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1
    },
    "name": "storeId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1
    },
    "name": "userId_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "bookingDate": 1
    },
    "name": "bookingDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1
    },
    "name": "status_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "storeId": 1,
      "bookingDate": 1
    },
    "name": "storeId_1_bookingDate_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "userId": 1,
      "createdAt": -1
    },
    "name": "userId_1_createdAt_-1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "status": 1,
      "bookingDate": 1
    },
    "name": "status_1_bookingDate_1",
    "background": true
  }
]
```

---

### merchants

**Document Count:** 3

**Schema:**

| Field | Presence | Types | Null Count | Sample Values |
|-------|----------|-------|------------|---------------|
| _id | 100.0% | object | 0 | ["68aa18b91e23530f4bbaace0","68aaa4246c6c69bd6a3f1... |
| _id.buffer | 100.0% | object | 0 | [{"type":"Buffer","data":[104,170,24,185,30,35,83,... |
| _id.buffer.0 | 100.0% | number | 0 | [104,104,104]... |
| _id.buffer.1 | 100.0% | number | 0 | [170,170,170]... |
| _id.buffer.2 | 100.0% | number | 0 | [24,164,166]... |
| _id.buffer.3 | 100.0% | number | 0 | [185,36,35]... |
| _id.buffer.4 | 100.0% | number | 0 | [30,108,212]... |
| _id.buffer.5 | 100.0% | number | 0 | [35,108,174]... |
| _id.buffer.6 | 100.0% | number | 0 | [83,105,10]... |
| _id.buffer.7 | 100.0% | number | 0 | [15,189,177]... |
| _id.buffer.8 | 100.0% | number | 0 | [75,106,29]... |
| _id.buffer.9 | 100.0% | number | 0 | [186,63,194]... |
| _id.buffer.10 | 100.0% | number | 0 | [172,18,67]... |
| _id.buffer.11 | 100.0% | number | 0 | [224,7,111]... |
| businessName | 100.0% | string | 0 | ["Test Store","Test Business","Mukul Test Business... |
| ownerName | 100.0% | string | 0 | ["Test Owner","Test Owner","Mukul Raj"]... |
| email | 100.0% | string | 0 | ["test@merchant.com","test@test.com","mukulraj756@... |
| password | 100.0% | string | 0 | ["$2b$10$fgouj5fUq4dCP24HgYWeMeTZM8iHjJjkdcJwDbFoY... |
| phone | 100.0% | string | 0 | ["+919876543210","1234567890","8210224305"]... |
| businessAddress | 100.0% | object | 0 | [{"street":"123 Test St","city":"Delhi","state":"D... |
| businessAddress.street | 100.0% | string | 0 | ["123 Test St","123 Test St","123 Test Street"]... |
| businessAddress.city | 100.0% | string | 0 | ["Delhi","Test City","Delhi"]... |
| businessAddress.state | 100.0% | string | 0 | ["Delhi","Test State","Delhi"]... |
| businessAddress.zipCode | 100.0% | string | 0 | ["110001","12345","110001"]... |
| businessAddress.country | 100.0% | string | 0 | ["India","USA","India"]... |
| verificationStatus | 100.0% | string | 0 | ["pending","pending","pending"]... |
| isActive | 100.0% | boolean | 0 | [true,true,true]... |
| galleryImages | 100.0% | array | 0 | [[],[],[]]... |
| isFeatured | 100.0% | boolean | 0 | [false,false,false]... |
| categories | 100.0% | array | 0 | [[],[],[]]... |
| tags | 100.0% | array | 0 | [[],[],[]]... |
| features | 100.0% | array | 0 | [[],[],[]]... |
| verification | 100.0% | object | 0 | [{"isVerified":false},{"isVerified":false},{"isVer... |
| verification.isVerified | 100.0% | boolean | 0 | [false,false,false]... |
| metrics | 100.0% | object | 0 | [{"totalOrders":0,"totalCustomers":0,"averageRespo... |
| metrics.totalOrders | 100.0% | number | 0 | [0,0,0]... |
| metrics.totalCustomers | 100.0% | number | 0 | [0,0,0]... |
| metrics.averageResponseTime | 100.0% | string | 0 | ["< 1 hour","< 1 hour","< 1 hour"]... |
| metrics.fulfillmentRate | 100.0% | number | 0 | [95,95,95]... |
| activePromotions | 100.0% | array | 0 | [[],[],[]]... |
| announcements | 100.0% | array | 0 | [[],[],[]]... |
| searchKeywords | 100.0% | array | 0 | [[],[],[]]... |
| sortOrder | 100.0% | number | 0 | [0,0,0]... |
| isPubliclyVisible | 100.0% | boolean | 0 | [true,true,true]... |
| searchable | 100.0% | boolean | 0 | [true,true,true]... |
| acceptingOrders | 100.0% | boolean | 0 | [true,true,true]... |
| showInDirectory | 100.0% | boolean | 0 | [true,true,true]... |
| showContact | 100.0% | boolean | 0 | [true,true,true]... |
| showRatings | 100.0% | boolean | 0 | [true,true,true]... |
| showBusinessHours | 100.0% | boolean | 0 | [true,true,true]... |
| allowCustomerMessages | 100.0% | boolean | 0 | [true,true,true]... |
| showPromotions | 100.0% | boolean | 0 | [true,true,true]... |
| createdAt | 100.0% | object | 0 | ["2025-08-23T19:38:33.746Z","2025-08-24T05:33:24.3... |
| updatedAt | 100.0% | object | 0 | ["2025-08-25T03:40:15.874Z","2025-08-24T05:33:24.3... |
| __v | 100.0% | number | 0 | [0,0,0]... |
| lastLogin | 66.7% | object | 0 | ["2025-08-25T03:40:15.869Z","2025-08-25T06:29:57.5... |

**Indexes:**

```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  },
  {
    "v": 2,
    "key": {
      "email": 1
    },
    "name": "email_1",
    "background": true,
    "unique": true
  },
  {
    "v": 2,
    "key": {
      "verificationStatus": 1
    },
    "name": "verificationStatus_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "isActive": 1
    },
    "name": "isActive_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "businessAddress.city": 1
    },
    "name": "businessAddress.city_1",
    "background": true
  },
  {
    "v": 2,
    "key": {
      "businessAddress.state": 1
    },
    "name": "businessAddress.state_1",
    "background": true
  }
]
```

**Sample Document:**

```json
{
  "_id": "68aa18b91e23530f4bbaace0",
  "businessName": "Test Store",
  "ownerName": "Test Owner",
  "email": "test@merchant.com",
  "password": "[REDACTED]",
  "phone": "+919876543210",
  "businessAddress": {
    "street": "123 Test St",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110001",
    "country": "India"
  },
  "verificationStatus": "pending",
  "isActive": true,
  "galleryImages": [],
  "isFeatured": false,
  "categories": [],
  "tags": [],
  "features": [],
  "verification": {
    "isVerified": false
  },
  "metrics": {
    "totalOrders": 0,
    "totalCustomers": 0,
    "averageResponseTime": "< 1 hour",
    "fulfillmentRate": 95
  },
  "activePromotions": [],
  "announcements": [],
  "searchKeywords": [],
  "sortOrder": 0,
  "isPubliclyVisible": true,
  "searchable": true,
  "acceptingOrders": true,
  "showInDirectory": true,
  "showContact": true,
  "showRatings": true,
  "showBusinessHours": true,
  "allowCustomerMessages": true,
  "showPromotions": true,
  "createdAt": "2025-08-23T19:38:33.746Z",
  "updatedAt": "2025-08-25T03:40:15.874Z",
  "__v": 0,
  "lastLogin": "2025-08-25T03:40:15.869Z"
}
```

---

