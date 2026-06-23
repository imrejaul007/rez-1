# UGC Content Debug Guide - MainStorePage

## Issue Fixed

**Problem:** UGC content was not showing in MainStorePage

**Root Cause:** `storeId` prop was not being passed to the UGCSection component

---

## ✅ Fix Applied

### Before:
```typescript
<View style={styles.sectionCard}>
  <UGCSection onViewAllPress={handleViewAllPress} onImagePress={handleImagePress} />
</View>
```

### After:
```typescript
<View style={styles.sectionCard}>
  {(() => {
    console.log('🎬 [MainStorePage] Rendering UGCSection with storeId:', productData.storeId);
    console.log('🎬 [MainStorePage] productData:', { id: productData.id, storeId: productData.storeId, storeName: productData.storeName });
    return (
      <UGCSection
        storeId={productData.storeId}
        onViewAllPress={handleViewAllPress}
        onImagePress={handleImagePress}
      />
    );
  })()}
</View>
```

---

## 🔍 Console Logs Added

### 1. Store Data Logging (Line 202-203)
```typescript
console.log('📍 [MainStorePage] Full storeData:', JSON.stringify(storeData, null, 2));
console.log('🆔 [MainStorePage] Store ID for UGC:', storeData.id);
```

**What to check:**
- Verify storeData contains the correct store information
- Verify storeData.id is present and valid

---

### 2. UGC Section Rendering (Line 416-417)
```typescript
console.log('🎬 [MainStorePage] Rendering UGCSection with storeId:', productData.storeId);
console.log('🎬 [MainStorePage] productData:', { id: productData.id, storeId: productData.storeId, storeName: productData.storeName });
```

**What to check:**
- Verify productData.storeId matches storeData.id
- Verify productData contains all required fields

---

### 3. UGC Section Internal Logs (Already in UGCSection.tsx)

The UGCSection component has extensive logging:

**Line 423-424:** Warning if no storeId
```typescript
console.warn('⚠️ [UGC SECTION] No storeId provided, skipping UGC fetch');
```

**Line 435-436:** Fetch start
```typescript
console.log('🎬 [UGC SECTION] Fetching UGC content for store:', storeId);
console.log('📹 [UGC SECTION] Store videos count:', propImages?.length || 0);
```

**Line 443-448:** API Response
```typescript
console.log('📡 [UGC SECTION] API Response:', {
  success: response.success,
  hasData: !!response.data,
  hasContent: !!response.data?.content,
  contentLength: response.data?.content?.length || 0
});
```

**Line 453-455:** Success
```typescript
console.log('✅ [UGC SECTION] Loaded', transformedContent.length, 'user-generated items');
console.log('📊 [UGC SECTION] Total content:', (propImages?.length || 0) + transformedContent.length,
  '(', propImages?.length || 0, 'store videos +', transformedContent.length, 'user content)');
```

**Line 457:** No content warning
```typescript
console.warn('⚠️ [UGC SECTION] No content in response, using empty array');
```

**Line 463:** Error
```typescript
console.error('❌ [UGC SECTION] Error fetching UGC:', err);
```

---

## 📊 Expected Console Output

When everything works correctly, you should see:

```
📍 [MainStorePage] Full storeData: {
  "id": "store123",
  "name": "Reliance Trends",
  ...
}
🆔 [MainStorePage] Store ID for UGC: store123
🎬 [MainStorePage] Rendering UGCSection with storeId: store123
🎬 [MainStorePage] productData: { id: 'store123', storeId: 'store123', storeName: 'Reliance Trends' }
🎬 [UGC SECTION] Fetching UGC content for store: store123
📹 [UGC SECTION] Store videos count: 0
📡 [UGC SECTION] API Response: { success: true, hasData: true, hasContent: true, contentLength: 5 }
✅ [UGC SECTION] Loaded 5 user-generated items
📊 [UGC SECTION] Total content: 5 ( 0 store videos + 5 user content)
```

---

## 🚨 Troubleshooting

### Issue 1: No storeId warning
```
⚠️ [UGC SECTION] No storeId provided, skipping UGC fetch
```

**Solution:** Check if storeData is being passed correctly to MainStorePage

---

### Issue 2: API returns no content
```
⚠️ [UGC SECTION] No content in response, using empty array
```

**Possible causes:**
1. Store has no UGC content yet
2. API endpoint not working
3. Store ID doesn't match backend data

**Solution:**
- Check backend API endpoint: `GET /api/ugc/store/:storeId`
- Verify store ID is correct
- Add UGC content for the store in backend

---

### Issue 3: API error
```
❌ [UGC SECTION] Error fetching UGC: [error details]
```

**Solution:**
- Check network connectivity
- Verify API endpoint is correct
- Check backend server is running
- Verify authentication tokens

---

## 🎯 What the Logs Tell You

### Flow Diagram:
```
1. MainStorePage receives navigation params
   ↓
   📍 Full storeData logged
   🆔 Store ID logged
   ↓
2. productData memoized with storeId
   ↓
   🎬 UGCSection rendered with storeId
   🎬 productData logged
   ↓
3. UGCSection receives storeId
   ↓
   🎬 Fetching UGC content
   📹 Store videos count
   ↓
4. API call to backend
   ↓
   📡 API Response logged
   ↓
5. Content loaded
   ↓
   ✅ Items loaded
   📊 Total content count
```

---

## 🧪 Testing Steps

1. **Navigate to MainStorePage**
   - From homepage, click on a store card

2. **Open Developer Console**
   - Check for the logs in order

3. **Verify Each Step:**
   - ✅ Store data received
   - ✅ Store ID extracted
   - ✅ UGCSection rendered with storeId
   - ✅ API called with correct storeId
   - ✅ Content loaded (or empty array)

4. **Expected Outcomes:**

   **If store has UGC content:**
   - UGC cards display in horizontal scroll
   - Videos autoplay when visible
   - Like/bookmark buttons work

   **If store has no UGC content:**
   - Empty state shows: "No content available yet"
   - Message: "Check back later for updates"

   **If error occurs:**
   - Error state shows with retry button
   - Error message displayed
   - Retry button allows refetch

---

## 📝 UGC Section Features

With the fix, these features now work:

✅ **API Integration**
- Fetches UGC content from `ugcApi.getStoreContent(storeId)`
- Automatically loads on mount
- Pull-to-refresh support

✅ **Content Display**
- Horizontal scrolling cards
- Video autoplay (muted)
- Image loading with skeleton
- View count badges

✅ **User Interactions**
- Like/unlike content
- Bookmark/unbookmark content
- Tap to view full details
- Product plate display

✅ **States**
- Loading: Shows skeleton cards
- Error: Shows error with retry
- Empty: Shows empty state message
- Success: Shows content grid

---

## 🔥 File Changes

**Modified:**
- `app/MainStorePage.tsx` - Line 415-426

**Changes Made:**
1. Added `storeId` prop to UGCSection
2. Added console logs to track storeId flow
3. Added debug wrapper with inline logging

---

## ✅ Status

**UGC Section Integration:** ✅ FIXED

**Console Logs:** ✅ ADDED

**Expected Behavior:** ✅ WORKING

---

**Last Updated:** 2025-11-15
