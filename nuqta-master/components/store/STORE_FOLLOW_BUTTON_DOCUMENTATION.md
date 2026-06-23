# StoreFollowButton Component Documentation

## Overview

The `StoreFollowButton` is a production-ready React Native component that provides a complete follow/unfollow functionality for stores with full backend integration.

## Features

- ✅ **Real-time Backend Synchronization** - Instant sync with backend API
- ✅ **Optimistic Updates** - Instant UI feedback before API response
- ✅ **Error Rollback** - Automatic state rollback on API failure
- ✅ **Toast Notifications** - User feedback for all actions
- ✅ **Follower Count Display** - Shows and updates follower count
- ✅ **Multiple Variants** - 3 variants for different use cases
- ✅ **Authentication Check** - Prompts user to sign in if not authenticated
- ✅ **Smooth Animations** - Scale and heart animations
- ✅ **Accessibility Support** - Full screen reader support
- ✅ **Loading States** - Visual feedback during API calls
- ✅ **Hover Effects** - "Unfollow" text on hover (web)

---

## Installation

The component is already integrated and ready to use. Required dependencies:
- `@expo/vector-icons` (Ionicons)
- `expo-router`
- `@/contexts/AuthContext`
- `@/hooks/useToast`
- `@/services/storesApi`

---

## Props

```tsx
interface StoreFollowButtonProps {
  storeId: string;                          // Required: Store ID
  storeName?: string;                       // Optional: Store name for toast messages
  initialFollowing?: boolean;               // Optional: Initial follow state
  initialFollowerCount?: number;            // Optional: Initial follower count
  onFollowChange?: (isFollowing: boolean) => void;  // Optional: Callback on state change
  variant?: 'default' | 'compact' | 'icon-only';    // Optional: Button variant
  showCount?: boolean;                      // Optional: Show follower count (default: true)
}
```

### Prop Details

#### `storeId` (required)
- **Type:** `string`
- **Description:** The unique identifier for the store
- **Example:** `"store-123"` or `"60d5f9a8e8b6c72d8c8e4567"`

#### `storeName` (optional)
- **Type:** `string`
- **Default:** `"this store"`
- **Description:** Display name for toast notifications
- **Example:** `"Fashion Boutique"`

#### `initialFollowing` (optional)
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Initial follow state (will be updated from API)
- **Note:** Component auto-checks status from backend on mount

#### `initialFollowerCount` (optional)
- **Type:** `number`
- **Default:** `0`
- **Description:** Initial follower count to display
- **Note:** Updates optimistically on follow/unfollow

#### `onFollowChange` (optional)
- **Type:** `(isFollowing: boolean) => void`
- **Description:** Callback fired when follow state changes
- **Example:** `(isFollowing) => console.log('Follow state:', isFollowing)`

#### `variant` (optional)
- **Type:** `'default' | 'compact' | 'icon-only'`
- **Default:** `'default'`
- **Description:** Button appearance variant
  - `default`: Full button with text and count badge
  - `compact`: Smaller button with icon and text
  - `icon-only`: Heart icon only (minimal)

#### `showCount` (optional)
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether to display follower count badge
- **Note:** Only applies to `default` variant

---

## Usage Examples

### 1. Default Variant (Full Button)

```tsx
import StoreFollowButton from '@/components/store/StoreFollowButton';

function StoreHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.storeName}>Fashion Boutique</Text>
      <StoreFollowButton
        storeId="store-123"
        storeName="Fashion Boutique"
        initialFollowerCount={1234}
        showCount={true}
        variant="default"
        onFollowChange={(isFollowing) => {
          console.log('Follow state changed:', isFollowing);
        }}
      />
    </View>
  );
}
```

**Appearance:**
- Full-width button with "Follow" or "Following" text
- Heart icon on the left
- Follower count badge on the right
- Hover effect shows "Unfollow" when following

---

### 2. Compact Variant (Small Button)

```tsx
<StoreFollowButton
  storeId="store-456"
  storeName="Tech Store"
  variant="compact"
  showCount={false}
/>
```

**Appearance:**
- Smaller rounded button
- Heart icon + text
- No follower count
- Perfect for cards and lists

---

### 3. Icon-Only Variant (Minimal)

```tsx
<StoreFollowButton
  storeId="store-789"
  storeName="Book Store"
  variant="icon-only"
  showCount={false}
/>
```

**Appearance:**
- Circular button with just heart icon
- Minimal space usage
- Perfect for tight layouts

---

## Integration with MainStorePage

Add the follow button to your store header:

```tsx
// app/MainStorePage.tsx

import StoreFollowButton from '@/components/store/StoreFollowButton';

export default function MainStorePage({ /* props */ }) {
  const [storeData, setStoreData] = useState<DynamicStoreData | null>(null);

  return (
    <ThemedView style={styles.page}>
      <LinearGradient colors={["#7C3AED", "#8B5CF6"]} style={styles.headerGradient}>
        <View style={styles.headerContainer}>
          {/* Store Header */}
          <MainStoreHeader
            storeName={storeData?.name || "Store"}
            onBack={handleBackPress}
          />

          {/* Follow Button */}
          <View style={styles.followButtonContainer}>
            <StoreFollowButton
              storeId={storeData?.id || ""}
              storeName={storeData?.name}
              initialFollowerCount={storeData?.followerCount || 0}
              variant="compact"
              showCount={true}
              onFollowChange={(isFollowing) => {
                // Optional: Update local state or analytics
                console.log('User now follows:', isFollowing);
              }}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Rest of your page */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  followButtonContainer: {
    marginLeft: 12,
  },
});
```

---

## Integration with Store Cards

Add follow button to store cards in search results or homepage:

```tsx
// components/homepage/cards/StoreCard.tsx

import StoreFollowButton from '@/components/store/StoreFollowButton';

export default function StoreCard({ store }: { store: StoreItem }) {
  return (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: store.image }} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.storeName}>{store.name}</Text>
        <Text style={styles.description}>{store.description}</Text>

        {/* Follow Button - Icon Only */}
        <View style={styles.followButton}>
          <StoreFollowButton
            storeId={store.id}
            storeName={store.name}
            variant="icon-only"
            showCount={false}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  followButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
```

---

## Backend API Integration

The component uses the following API endpoints from `storesApi`:

### 1. Check Follow Status
```typescript
GET /stores/:storeId/follow-status
Response: { following: boolean, followedAt?: string }
```

### 2. Follow Store
```typescript
POST /stores/:storeId/follow
Response: { message: string }
```

### 3. Unfollow Store
```typescript
DELETE /stores/:storeId/follow
Response: { message: string }
```

### 4. Get Followers (optional)
```typescript
GET /stores/:storeId/followers?page=1&limit=20
Response: {
  followers: Array<{ id, name, avatar, followedAt }>,
  pagination: { current, pages, total, limit }
}
```

### 5. Get Follower Count (optional)
```typescript
GET /stores/:storeId/followers/count
Response: { count: number }
```

---

## State Management Flow

### On Component Mount:
1. Component renders with `initialFollowing` and `initialFollowerCount`
2. If user is authenticated, checks actual status from backend
3. Updates state with backend data

### On Follow Button Press:
1. **Authentication Check**: Redirects to sign-in if not logged in
2. **Optimistic Update**: Immediately updates UI (isFollowing, followerCount)
3. **API Call**: Sends request to backend
4. **Success**: Shows success toast
5. **Error**: Rolls back to previous state, shows error toast

### Flow Diagram:
```
User Clicks Button
    ↓
Check Auth → Not Logged In → Redirect to Sign-In
    ↓ Logged In
Optimistic Update UI
    ↓
Call Backend API
    ↓
Success → Keep Updated State + Show Success Toast
    ↓
Error → Rollback State + Show Error Toast
```

---

## Animations

### 1. Button Scale Animation
- Press: scales to 0.95
- Release: scales back to 1.0
- Duration: 200ms

### 2. Heart Icon Animation
- On follow: scales to 1.3, then back to 1.0
- Creates a "pop" effect
- Duration: 400ms total

---

## Accessibility

The component is fully accessible with:

### Screen Reader Support
```tsx
accessibilityRole="button"
accessibilityLabel="Follow Fashion Store. 1.2K followers"
accessibilityState={{ disabled: isLoading }}
accessibilityHint="Double tap to toggle follow status"
```

### Labels by State:
- Not Following: `"Follow {storeName}"`
- Following: `"Unfollow {storeName}. {count} followers"`
- Loading: `"Loading..."`

---

## Styling Customization

You can customize the button by wrapping it in a View and applying styles:

```tsx
<View style={{
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
}}>
  <StoreFollowButton
    storeId="store-123"
    variant="default"
  />
</View>
```

---

## Error Handling

The component handles errors gracefully:

### Network Errors
- Rolls back optimistic update
- Shows error toast: "Failed to update. Please try again."
- Logs error to console for debugging

### Authentication Errors
- Shows toast: "Please sign in to follow stores"
- Redirects to sign-in page after 1 second

### Backend Errors
- Displays error message from API
- Falls back to generic message if none provided
- Maintains previous state

---

## Testing

### Manual Testing Checklist

1. **Follow Action**
   - [ ] Button changes from "Follow" to "Following"
   - [ ] Follower count increments by 1
   - [ ] Success toast appears
   - [ ] Backend updates correctly

2. **Unfollow Action**
   - [ ] Button changes from "Following" to "Follow"
   - [ ] Follower count decrements by 1
   - [ ] Success toast appears
   - [ ] Backend updates correctly

3. **Error Handling**
   - [ ] State rolls back on API error
   - [ ] Error toast appears
   - [ ] No console errors

4. **Authentication**
   - [ ] Logged out users see sign-in prompt
   - [ ] Redirects to sign-in page
   - [ ] Returns to store after sign-in

5. **Variants**
   - [ ] Default variant displays correctly
   - [ ] Compact variant displays correctly
   - [ ] Icon-only variant displays correctly

6. **Animations**
   - [ ] Button scales on press
   - [ ] Heart icon animates on follow

7. **Accessibility**
   - [ ] Screen reader announces correctly
   - [ ] Can be focused and activated
   - [ ] Loading state is announced

---

## Performance Considerations

### Optimizations:
1. **Debouncing**: Prevents multiple simultaneous API calls
2. **Optimistic Updates**: Instant UI feedback
3. **Memoization**: Component props are memoized
4. **Conditional Rendering**: Only renders necessary elements

### Best Practices:
- Don't create new StoreFollowButton instances in render methods
- Pass stable `onFollowChange` callbacks (use `useCallback`)
- Avoid passing new objects as props on every render

---

## Common Issues & Solutions

### Issue 1: Button doesn't update after follow
**Solution:** Ensure `storeId` is a valid, non-empty string

### Issue 2: Toast notifications not showing
**Solution:** Verify `ToastProvider` is wrapped around the app in `_layout.tsx`

### Issue 3: Authentication redirect not working
**Solution:** Check that `expo-router` is properly configured

### Issue 4: Follower count not updating
**Solution:** Ensure backend returns success response correctly

---

## Advanced Usage

### Custom Analytics Tracking

```tsx
<StoreFollowButton
  storeId="store-123"
  storeName="Fashion Store"
  onFollowChange={(isFollowing) => {
    // Track with analytics
    analytics.track('store_follow_changed', {
      storeId: 'store-123',
      storeName: 'Fashion Store',
      action: isFollowing ? 'followed' : 'unfollowed',
      timestamp: new Date().toISOString(),
    });
  }}
/>
```

### Conditional Rendering

```tsx
{userHasPermission && (
  <StoreFollowButton
    storeId={store.id}
    storeName={store.name}
    variant="compact"
  />
)}
```

### Integration with Redux/State Management

```tsx
function ConnectedFollowButton({ storeId }: { storeId: string }) {
  const dispatch = useDispatch();
  const store = useSelector(state => state.stores.byId[storeId]);

  return (
    <StoreFollowButton
      storeId={storeId}
      storeName={store.name}
      initialFollowerCount={store.followerCount}
      onFollowChange={(isFollowing) => {
        dispatch(updateStoreFollowStatus(storeId, isFollowing));
      }}
    />
  );
}
```

---

## FAQ

**Q: Can I use this component outside of MainStorePage?**
A: Yes! It works anywhere in your app (search results, store cards, store lists, etc.)

**Q: Does it work offline?**
A: The component requires network connectivity. Consider adding offline queue support.

**Q: Can I customize the colors?**
A: Yes, modify the styles object in the component file. We recommend using your theme colors.

**Q: How do I get the initial follower count?**
A: Fetch it from your store details API and pass it as `initialFollowerCount`

**Q: What happens if the user is not logged in?**
A: The component shows an error toast and redirects to the sign-in page.

---

## Version History

### v1.0.0 (Current)
- Initial release
- Full backend integration
- Three variants (default, compact, icon-only)
- Optimistic updates with rollback
- Toast notifications
- Accessibility support
- Smooth animations

---

## Support

For issues or questions:
1. Check this documentation
2. Review the component source code
3. Check backend API endpoints
4. Verify authentication is working
5. Test with network debugging enabled

---

## License

This component is part of the Rez App project.
