# OFFERS API FIX
**File:** `src/controllers/offerController.ts`
**Issue:** API returns empty array despite 12 offers in database
**Cause:** Filter uses flat field names instead of nested paths

---

## THE PROBLEM

The Offer model uses nested structure:
```typescript
{
  validity: {
    isActive: boolean,
    startDate: Date,
    endDate: Date
  },
  metadata: {
    featured: boolean,
    isTrending: boolean,
    isNew: boolean
  }
}
```

But the controller filters using flat fields:
```typescript
// WRONG - These fields don't exist at top level
const filter = {
  isActive: true,          // ❌ Should be validity.isActive
  startDate: { ... },      // ❌ Should be validity.startDate
  endDate: { ... },        // ❌ Should be validity.endDate
  isFeatured: true,        // ❌ Should be metadata.featured
  isTrending: true,        // ❌ Should be metadata.isTrending
  isNew: true              // ❌ Should be metadata.isNew
};
```

---

## THE FIX

### Step 1: Open the file
```
C:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend\src\controllers\offerController.ts
```

### Step 2: Find `getOffers` function (around line 15)

### Step 3: Replace lines 31-58 with this:

```typescript
    // Build filter query
    const filter: any = {
      'validity.isActive': true,
      'validity.startDate': { $lte: new Date() },
      'validity.endDate': { $gte: new Date() },
    };

    if (category) {
      filter.category = category;
    }

    if (store) {
      filter['store.id'] = store;
    }

    if (featured === 'true') {
      filter['metadata.featured'] = true;
    }

    if (trending === 'true') {
      filter['metadata.isTrending'] = true;
    }

    if (isNew === 'true') {
      filter['metadata.isNew'] = true;
    }

    if (minCashback) {
      filter.cashbackPercentage = { $gte: Number(minCashback) };
    }
```

---

## COMPLETE FIXED FUNCTION

Here's the complete corrected `getOffers` function:

```typescript
export const getOffers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      store,
      featured,
      trending,
      new: isNew,
      minCashback,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    // Build filter query with correct nested paths
    const filter: any = {
      'validity.isActive': true,
      'validity.startDate': { $lte: new Date() },
      'validity.endDate': { $gte: new Date() },
    };

    if (category) {
      filter.category = category;
    }

    if (store) {
      filter['store.id'] = store;
    }

    if (featured === 'true') {
      filter['metadata.featured'] = true;
    }

    if (trending === 'true') {
      filter['metadata.isTrending'] = true;
    }

    if (isNew === 'true') {
      filter['metadata.isNew'] = true;
    }

    if (minCashback) {
      filter.cashbackPercentage = { $gte: Number(minCashback) };
    }

    // Sort options
    const sortOptions: any = {};
    const sortField = sortBy as string;
    sortOptions[sortField] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .populate('category', 'name slug')
        .populate('store', 'name logo location ratings')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
  } catch (error) {
    console.error('Error fetching offers:', error);
    sendError(res, 'Failed to fetch offers', 500);
  }
};
```

---

## VERIFICATION

After making the fix, test the endpoint:

```bash
curl -X GET "http://localhost:5001/api/offers" \
  -H "Authorization: Bearer <JWT_TOKEN_REDACTED>"
```

Expected response:
```json
{
  "success": true,
  "message": "Offers fetched successfully",
  "data": [
    // Array of 12 offers
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "pages": 1
    }
  }
}
```

---

## SUMMARY OF CHANGES

| Line | Old Code | New Code |
|------|----------|----------|
| 32 | `isActive: true` | `'validity.isActive': true` |
| 33 | `startDate: { $lte: ... }` | `'validity.startDate': { $lte: ... }` |
| 34 | `endDate: { $gte: ... }` | `'validity.endDate': { $gte: ... }` |
| 42 | `filter.store = store` | `filter['store.id'] = store` |
| 46 | `filter.isFeatured = true` | `filter['metadata.featured'] = true` |
| 50 | `filter.isTrending = true` | `filter['metadata.isTrending'] = true` |
| 54 | `filter.isNew = true` | `filter['metadata.isNew'] = true` |

---

## WHY THIS MATTERS

Without this fix:
- ❌ Offers API returns empty array
- ❌ Frontend cannot display any offers
- ❌ Users cannot see available deals

With this fix:
- ✅ All 12 offers returned from API
- ✅ Frontend can display offers
- ✅ Users can browse and use offers

---

**Estimated Fix Time:** 2 minutes
**Impact:** Critical for offers feature
**Priority:** Medium (has workaround with direct DB query)

