# StoreFollowButton - Quick Reference Guide

## 🚀 Quick Start

```tsx
import StoreFollowButton from '@/components/store/StoreFollowButton';

<StoreFollowButton
  storeId="store-123"
  storeName="Fashion Store"
  variant="default"
/>
```

---

## 📋 Props Cheat Sheet

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `storeId` | `string` | ✅ Yes | - | Store unique identifier |
| `storeName` | `string` | ❌ No | `"this store"` | Store display name |
| `initialFollowing` | `boolean` | ❌ No | `false` | Initial follow state |
| `initialFollowerCount` | `number` | ❌ No | `0` | Initial follower count |
| `onFollowChange` | `(isFollowing: boolean) => void` | ❌ No | - | Callback on state change |
| `variant` | `'default' \| 'compact' \| 'icon-only'` | ❌ No | `'default'` | Button style variant |
| `showCount` | `boolean` | ❌ No | `true` | Show follower count badge |

---

## 🎨 Variants

### Default (Full Button)
```tsx
<StoreFollowButton
  storeId="store-123"
  variant="default"
  showCount={true}
/>
```
**Best for:** Store headers, detail pages

### Compact (Small Button)
```tsx
<StoreFollowButton
  storeId="store-123"
  variant="compact"
  showCount={false}
/>
```
**Best for:** Store lists, navigation bars

### Icon-Only (Minimal)
```tsx
<StoreFollowButton
  storeId="store-123"
  variant="icon-only"
/>
```
**Best for:** Store cards, tight layouts

---

## 🔌 Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/stores/:storeId/follow-status` | Check follow status |
| `POST` | `/stores/:storeId/follow` | Follow store |
| `DELETE` | `/stores/:storeId/follow` | Unfollow store |
| `GET` | `/stores/:storeId/followers` | Get followers list |
| `GET` | `/stores/:storeId/followers/count` | Get follower count |

---

## 📱 Integration Examples

### MainStorePage Header
```tsx
<View style={styles.header}>
  <Text style={styles.storeName}>Fashion Store</Text>
  <StoreFollowButton
    storeId="store-123"
    storeName="Fashion Store"
    initialFollowerCount={1234}
    variant="compact"
  />
</View>
```

### Store Card (Search Results)
```tsx
<View style={styles.card}>
  <Image source={{ uri: store.image }} />
  <Text>{store.name}</Text>

  {/* Top-right corner */}
  <View style={styles.followButton}>
    <StoreFollowButton
      storeId={store.id}
      storeName={store.name}
      variant="icon-only"
    />
  </View>
</View>
```

### Store List Item
```tsx
<View style={styles.listItem}>
  <Image source={{ uri: store.logo }} />
  <View style={styles.content}>
    <Text>{store.name}</Text>
    <Text>{store.category}</Text>
  </View>
  <StoreFollowButton
    storeId={store.id}
    variant="compact"
  />
</View>
```

---

## 🎯 Features Checklist

- ✅ Real-time backend sync
- ✅ Optimistic updates
- ✅ Error rollback
- ✅ Toast notifications
- ✅ Authentication check
- ✅ Loading states
- ✅ Smooth animations
- ✅ Follower count display
- ✅ Number formatting (1.2K, 5.3M)
- ✅ Accessibility support
- ✅ Hover effects (web)
- ✅ Multiple variants

---

## 🔄 State Flow

```
User Clicks → Auth Check → Optimistic Update → API Call → Success/Error
                  ↓              ↓                ↓            ↓
            Not Logged In    UI Updates      Backend Sync   Keep/Rollback
                  ↓
              Sign-In Page
```

---

## 🎬 Animations

1. **Button Press**: Scale 1.0 → 0.95 → 1.0 (200ms)
2. **Heart Icon**: Scale 1.0 → 1.3 → 1.0 (400ms on follow)

---

## 📊 Follower Count Formatting

| Count | Display |
|-------|---------|
| 0-999 | Exact number (e.g., "123") |
| 1,000-999,999 | Thousands + K (e.g., "1.2K") |
| 1,000,000+ | Millions + M (e.g., "5.3M") |

---

## 🚨 Error Handling

| Error Type | Behavior |
|------------|----------|
| Network Error | Rollback + Error toast |
| Auth Error | Sign-in prompt + Redirect |
| API Error | Rollback + Error message |

---

## 🎨 Color Palette

| State | Background | Border | Text | Icon |
|-------|------------|--------|------|------|
| **Not Following** | White | Purple (#7C3AED) | Purple | Outline heart |
| **Following** | Purple (#7C3AED) | Purple | White | Filled heart |
| **Loading** | Same (70% opacity) | Same | Same | Spinner |

---

## ⚡ Performance Tips

1. ✅ Pass stable `onFollowChange` callbacks (use `useCallback`)
2. ✅ Don't recreate component in render methods
3. ✅ Avoid passing new objects as props
4. ✅ Use memoization for parent components

**Bad:**
```tsx
<StoreFollowButton
  onFollowChange={(isFollowing) => setFollowing(isFollowing)}
/>
```

**Good:**
```tsx
const handleFollowChange = useCallback((isFollowing) => {
  setFollowing(isFollowing);
}, []);

<StoreFollowButton
  onFollowChange={handleFollowChange}
/>
```

---

## 🔍 Debugging Checklist

- [ ] `storeId` is valid and non-empty
- [ ] User is authenticated (or sign-in redirect works)
- [ ] Backend API endpoints are working
- [ ] `ToastProvider` is in `_layout.tsx`
- [ ] `AuthContext` is available
- [ ] Network connectivity is available
- [ ] Console shows no errors

---

## 🛠️ Common Issues

### Issue: Button doesn't update
**Fix:** Check `storeId` is valid

### Issue: No toast notifications
**Fix:** Ensure `ToastProvider` wraps app

### Issue: Auth redirect not working
**Fix:** Verify `expo-router` setup

### Issue: Count not updating
**Fix:** Check backend response format

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `StoreFollowButton.tsx` | Main component |
| `STORE_FOLLOW_BUTTON_DOCUMENTATION.md` | Full documentation |
| `STORE_FOLLOW_BUTTON_INTEGRATION_EXAMPLES.tsx` | Code examples |
| `STORE_FOLLOW_BUTTON_QUICK_REFERENCE.md` | This file |

---

## 📞 API Response Examples

### Follow Status Response
```json
{
  "success": true,
  "data": {
    "following": true,
    "followedAt": "2025-01-15T10:30:00Z"
  }
}
```

### Follow/Unfollow Response
```json
{
  "success": true,
  "data": {
    "message": "Successfully followed store"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Store not found"
}
```

---

## 🎓 Usage Guidelines

### ✅ DO:
- Use appropriate variant for context
- Pass store name for better UX
- Handle `onFollowChange` for analytics
- Test with network issues
- Check authentication states

### ❌ DON'T:
- Create new instances in loops
- Pass unstable callbacks
- Ignore error states
- Skip accessibility testing
- Hardcode colors in wrapper

---

## 🚀 Getting Started in 3 Steps

1. **Import the component:**
   ```tsx
   import StoreFollowButton from '@/components/store/StoreFollowButton';
   ```

2. **Add to your UI:**
   ```tsx
   <StoreFollowButton
     storeId={store.id}
     storeName={store.name}
   />
   ```

3. **Test it:**
   - Click to follow
   - Check toast notification
   - Verify count updates
   - Test unfollow

---

## 📖 Full Documentation

For complete documentation, see:
- `STORE_FOLLOW_BUTTON_DOCUMENTATION.md` - Full docs
- `STORE_FOLLOW_BUTTON_INTEGRATION_EXAMPLES.tsx` - Code examples

---

## ⚙️ Backend Setup Required

Ensure these endpoints exist in your backend:

```typescript
// user-backend/routes/stores.js

router.get('/stores/:storeId/follow-status', authMiddleware, getFollowStatus);
router.post('/stores/:storeId/follow', authMiddleware, followStore);
router.delete('/stores/:storeId/follow', authMiddleware, unfollowStore);
router.get('/stores/:storeId/followers', getFollowers);
router.get('/stores/:storeId/followers/count', getFollowerCount);
```

---

## 🎯 Summary

**StoreFollowButton** is a production-ready component that:
- Integrates seamlessly with your backend
- Provides instant UI feedback
- Handles all edge cases
- Works across all platforms
- Follows accessibility standards

**Ready to use!** Just import and add to your components.
