# Follower Stats API - Quick Reference

## Base URL
```
http://localhost:5001/api/stores/:storeId/followers
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Endpoints

### 1️⃣ GET `/count` - Get Follower Count
**Purpose**: Get total number of followers for a store

**Response**:
```json
{ "followersCount": 150 }
```

---

### 2️⃣ GET `/list` - Get Followers List
**Purpose**: Get paginated list of followers with details

**Query Params**:
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response**:
```json
{
  "followers": [
    {
      "userId": "...",
      "name": "John Doe",
      "profilePicture": "...",
      "email": "...",
      "phone": "...",
      "followedAt": "2024-11-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### 3️⃣ GET `/analytics` - Get Follower Analytics
**Purpose**: Get comprehensive follower analytics and growth trends

**Response**:
```json
{
  "totalFollowers": 150,
  "followersThisWeek": 12,
  "followersThisMonth": 45,
  "growthRate": 28.57,
  "followersOverTime": [
    { "date": "2024-10-28", "count": 105 },
    { "date": "2024-10-29", "count": 107 }
    // ... 31 days
  ]
}
```

**Growth Rate Calculation**:
```
growthRate = ((followersThisMonth - followersPreviousMonth) / followersPreviousMonth) × 100
```

---

### 4️⃣ GET `/top` - Get Top Followers
**Purpose**: Get most engaged followers by orders and reviews

**Query Params**:
- `limit` (optional, default: 10)

**Response**:
```json
{
  "topFollowers": [
    {
      "userId": "...",
      "name": "Jane Smith",
      "profilePicture": "...",
      "email": "...",
      "phone": "...",
      "followedAt": "2024-09-20T14:20:00.000Z",
      "engagement": {
        "orderCount": 15,
        "reviewCount": 8,
        "totalSpent": 12500.50,
        "engagementScore": 315
      }
    }
  ]
}
```

**Engagement Score Formula**:
```
engagementScore = (orderCount × 10) + (reviewCount × 5) + (totalSpent ÷ 100)
```

---

## Frontend Integration Examples

### React/JavaScript
```javascript
const API_BASE = 'http://localhost:5001/api';
const token = localStorage.getItem('authToken');

// Get follower count
async function getFollowerCount(storeId) {
  const response = await fetch(
    `${API_BASE}/stores/${storeId}/followers/count`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data.followersCount;
}

// Get followers list with pagination
async function getFollowersList(storeId, page = 1, limit = 20) {
  const response = await fetch(
    `${API_BASE}/stores/${storeId}/followers/list?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data;
}

// Get analytics
async function getAnalytics(storeId) {
  const response = await fetch(
    `${API_BASE}/stores/${storeId}/followers/analytics`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data;
}

// Get top followers
async function getTopFollowers(storeId, limit = 10) {
  const response = await fetch(
    `${API_BASE}/stores/${storeId}/followers/top?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data.topFollowers;
}
```

### React Native
```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:5001/api';

// Create axios instance with auth
const createApiClient = async () => {
  const token = await AsyncStorage.getItem('authToken');
  return axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

// Get follower count
export const getFollowerCount = async (storeId) => {
  const api = await createApiClient();
  const response = await api.get(`/stores/${storeId}/followers/count`);
  return response.data.data.followersCount;
};

// Get followers list
export const getFollowersList = async (storeId, page = 1, limit = 20) => {
  const api = await createApiClient();
  const response = await api.get(`/stores/${storeId}/followers/list`, {
    params: { page, limit }
  });
  return response.data.data;
};

// Get analytics
export const getFollowerAnalytics = async (storeId) => {
  const api = await createApiClient();
  const response = await api.get(`/stores/${storeId}/followers/analytics`);
  return response.data.data;
};

// Get top followers
export const getTopFollowers = async (storeId, limit = 10) => {
  const api = await createApiClient();
  const response = await api.get(`/stores/${storeId}/followers/top`, {
    params: { limit }
  });
  return response.data.data.topFollowers;
};
```

---

## Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 401 | Access token is required | Add JWT token to Authorization header |
| 403 | You do not have permission... | User is not the store owner |
| 404 | Store not found | Verify storeId is correct |
| 500 | Failed to get... | Server error, check logs |

---

## UI Component Ideas

### 1. Dashboard Card
```
┌─────────────────────────────┐
│ 👥 Store Followers          │
├─────────────────────────────┤
│ Total: 1,234                │
│ This Week: +52              │
│ Growth: +15.3%              │
└─────────────────────────────┘
```

### 2. Followers Chart
Use `followersOverTime` data to display line/area chart showing growth trend.

### 3. Top Followers Table
```
┌──────────────────────────────────────────┐
│ Top Engaged Followers                    │
├──────────┬───────┬─────────┬─────────────┤
│ Name     │Orders │ Reviews │ Total Spent │
├──────────┼───────┼─────────┼─────────────┤
│ Jane S.  │  15   │    8    │  ₹12,500   │
│ John D.  │  12   │    6    │  ₹10,200   │
│ Alice W. │  10   │    7    │   ₹9,800   │
└──────────┴───────┴─────────┴─────────────┘
```

### 4. Followers List
```
┌────────────────────────────────────────┐
│ All Followers                          │
├────────────────────────────────────────┤
│ 👤 John Doe                            │
│    Followed: Nov 15, 2024              │
│    john@example.com                    │
├────────────────────────────────────────┤
│ 👤 Jane Smith                          │
│    Followed: Nov 10, 2024              │
│    jane@example.com                    │
└────────────────────────────────────────┘
```

---

## Performance Notes

- **Caching**: Consider caching analytics data (updates every 1 hour)
- **Pagination**: Use pagination for follower lists (default: 20 per page)
- **Indexing**: Database indexes on `items.itemType` and `items.itemId` for fast queries
- **Lazy Loading**: Load top followers on-demand, not on initial page load

---

## Database Models Used

1. **Wishlist** - Stores follower data (users who added store to wishlist)
2. **Store** - Validates store ownership via `merchantId`
3. **Order** - Calculates engagement (orders placed)
4. **Review** - Calculates engagement (reviews written)

---

## Testing with Postman

### 1. Set Environment Variables
```
API_BASE = http://localhost:5001/api
AUTH_TOKEN = your_jwt_token_here
STORE_ID = 64a1b2c3d4e5f6g7h8i9j0k1
```

### 2. Create Requests
- GET `{{API_BASE}}/stores/{{STORE_ID}}/followers/count`
- GET `{{API_BASE}}/stores/{{STORE_ID}}/followers/list?page=1&limit=20`
- GET `{{API_BASE}}/stores/{{STORE_ID}}/followers/analytics`
- GET `{{API_BASE}}/stores/{{STORE_ID}}/followers/top?limit=10`

### 3. Add Authorization Header
```
Key: Authorization
Value: Bearer {{AUTH_TOKEN}}
```

---

## Support & Troubleshooting

### Issue: Getting 403 Forbidden
**Cause**: User is not the store owner
**Solution**: Ensure `store.merchantId` matches the authenticated user's ID

### Issue: Empty followers list
**Cause**: No users have added this store to their wishlist
**Solution**: This is expected for new stores. Followers are users who "favorited" the store.

### Issue: Growth rate showing 100%
**Cause**: No followers in previous month
**Solution**: This is expected for new stores. Growth rate = 100% when starting from 0.

---

## Related Documentation
- Store Management API
- Wishlist API
- Analytics Dashboard Guide
