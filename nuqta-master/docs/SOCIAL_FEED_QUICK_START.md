# Social Feed - Quick Start Guide 🚀

## 5-Minute Setup

### Step 1: Add Context Provider (1 min)

Open `app/_layout.tsx` and wrap your app with `SocialProvider`:

```tsx
import { SocialProvider } from '../contexts/SocialContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocialProvider>  {/* ← Add this */}
        <CartProvider>
          <WishlistProvider>
            {/* ... other providers ... */}
            <Stack>
              {/* Routes */}
            </Stack>
          </WishlistProvider>
        </CartProvider>
      </SocialProvider>  {/* ← Add this */}
    </AuthProvider>
  );
}
```

### Step 2: Add to Tab Navigation (2 min)

Open `app/(tabs)/_layout.tsx` and add the feed tab:

```tsx
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs>
      {/* Existing tabs */}
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> }}
      />

      {/* ADD THIS: Social Feed Tab */}
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />
        }}
      />

      {/* Other tabs */}
      <Tabs.Screen
        name="earn"
        options={{ title: 'Earn', tabBarIcon: ({ color }) => <Ionicons name="gift" size={24} color={color} /> }}
      />
    </Tabs>
  );
}
```

### Step 3: Create Feed Tab File (1 min)

Create `app/(tabs)/feed.tsx`:

```tsx
import ActivityFeedPage from '../feed/index';

export default ActivityFeedPage;
```

### Step 4: Auto-Create Activities (1 min)

Add activity creation to your existing flows. For example, in your order completion:

```tsx
// In your order completion handler
import { createActivity } from '../../services/activityFeedApi';

const handleOrderComplete = async (order: Order) => {
  // Existing order logic...

  // Create activity
  try {
    await createActivity({
      type: 'ORDER',
      title: 'Placed an order',
      description: `Ordered ${order.items.length} items from ${order.storeName}`,
      amount: order.total,
      icon: 'checkmark-circle',
      color: '#10B981',
      relatedEntity: { id: order._id, type: 'Order' }
    });
  } catch (error) {
    console.log('Failed to create activity:', error);
    // Non-critical, don't block order completion
  }
};
```

### Step 5: Test It! (30 seconds)

```bash
# Make sure backend is running
cd user-backend
npm run dev

# In another terminal, start frontend
cd frontend
npx expo start
```

Navigate to the Feed tab and you should see:
- Suggested users to follow
- Empty state if no activities
- Activities from followed users

## Adding Activities to Other Actions

### After Review Posted

```tsx
// In review submission
await createActivity({
  type: 'REVIEW',
  title: 'Left a review',
  description: `Reviewed ${productName}: "${reviewText.substring(0, 50)}..."`,
  icon: 'star',
  color: '#EC4899',
  relatedEntity: { id: reviewId, type: 'Review' },
  metadata: { rating, productId }
});
```

### After Cashback Earned

```tsx
// In cashback handler
await createActivity({
  type: 'CASHBACK',
  title: 'Earned cashback!',
  description: `Received cashback from ${storeName}`,
  amount: cashbackAmount,
  icon: 'cash',
  color: '#F59E0B',
  relatedEntity: { id: orderId, type: 'Order' }
});
```

### After Video Upload

```tsx
// In video upload handler
await createActivity({
  type: 'VIDEO',
  title: 'Uploaded a video',
  description: videoTitle,
  icon: 'videocam',
  color: '#8B5CF6',
  relatedEntity: { id: videoId, type: 'Video' }
});
```

### After Voucher Redeemed

```tsx
// In voucher redemption
await createActivity({
  type: 'VOUCHER',
  title: 'Redeemed a voucher',
  description: voucherName,
  amount: voucherValue,
  icon: 'ticket',
  color: '#F59E0B',
  relatedEntity: { id: voucherId, type: 'Voucher' }
});
```

### After Achievement Unlocked

```tsx
// In achievement handler
await createActivity({
  type: 'ACHIEVEMENT',
  title: 'Unlocked an achievement!',
  description: achievementName,
  icon: 'trophy',
  color: '#F59E0B',
  metadata: { achievementId, achievementType }
});
```

## Using Social Features in Other Pages

### Show Follow Button on Profile

```tsx
import FollowButton from '../../components/social/FollowButton';

// In profile page
<View style={styles.profileHeader}>
  <Image source={{ uri: user.profilePicture }} />
  <Text>{user.name}</Text>

  {/* Add follow button if not own profile */}
  {user.id !== currentUserId && (
    <FollowButton userId={user.id} />
  )}
</View>
```

### Show User's Activities on Profile

```tsx
import { useSocial } from '../../contexts/SocialContext';

const ProfilePage = ({ userId }) => {
  const { loadUserActivities } = useSocial();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadActivities();
  }, [userId]);

  const loadActivities = async () => {
    const userActivities = await loadUserActivities(userId);
    setActivities(userActivities);
  };

  return (
    <FlatList
      data={activities}
      renderItem={({ item }) => <ActivityCard activity={item} />}
    />
  );
};
```

### Show Follow Counts

```tsx
import { getFollowCounts } from '../../services/activityFeedApi';

const [followCounts, setFollowCounts] = useState({ followersCount: 0, followingCount: 0 });

useEffect(() => {
  loadCounts();
}, [userId]);

const loadCounts = async () => {
  const counts = await getFollowCounts(userId);
  setFollowCounts(counts);
};

// In UI
<View style={styles.statsRow}>
  <TouchableOpacity onPress={() => showFollowers()}>
    <Text style={styles.statNumber}>{followCounts.followersCount}</Text>
    <Text style={styles.statLabel}>Followers</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => showFollowing()}>
    <Text style={styles.statNumber}>{followCounts.followingCount}</Text>
    <Text style={styles.statLabel}>Following</Text>
  </TouchableOpacity>
</View>
```

## Customization

### Custom Activity Colors

```tsx
// Define your brand colors
const ACTIVITY_COLORS = {
  ORDER: '#10B981',
  CASHBACK: '#F59E0B',
  REVIEW: '#EC4899',
  SPECIAL: '#FF6B6B'  // Custom type
};

await createActivity({
  type: 'SPECIAL',
  color: ACTIVITY_COLORS.SPECIAL,
  // ...
});
```

### Custom Activity Icons

```tsx
const ACTIVITY_ICONS = {
  ORDER: 'checkmark-circle',
  CASHBACK: 'cash',
  REVIEW: 'star',
  SPECIAL: 'sparkles'  // Custom icon
};
```

### Custom Follow Button Styles

```tsx
<FollowButton
  userId={userId}
  style={{
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#FF6B6B'  // Custom color
  }}
  onFollowChange={(isFollowing) => {
    console.log('Follow status changed:', isFollowing);
    // Custom callback
  }}
/>
```

## Troubleshooting

### Issue: "useSocial must be used within a SocialProvider"
**Fix:** Make sure `SocialProvider` wraps your component tree in `_layout.tsx`

### Issue: Feed shows empty
**Causes:**
1. No activities created yet → Create some test activities
2. Not following anyone → Follow some users via suggested users
3. Backend not running → Start backend with `npm run dev`

### Issue: Follow button not working
**Causes:**
1. Not authenticated → Make sure user is logged in
2. Invalid userId → Check userId is correct
3. Network error → Check backend connection

### Issue: Activities not appearing after creation
**Causes:**
1. Activity creation failed → Check console for errors
2. Need to refresh → Pull down to refresh feed
3. Visibility settings → Check activity visibility is 'followers' or 'public'

## Testing

### Create Test Activities (Run in Backend)

```javascript
// Using MongoDB shell or API testing tool
POST /api/social/activities
Authorization: Bearer <token>

{
  "type": "ORDER",
  "title": "Test Order",
  "description": "Testing the feed",
  "amount": 100,
  "icon": "checkmark-circle",
  "color": "#10B981"
}
```

### Follow Test Users

```javascript
POST /api/social/users/:userId/follow
Authorization: Bearer <token>
```

### Test Like/Comment

```javascript
// Like
POST /api/social/activities/:activityId/like

// Comment
POST /api/social/activities/:activityId/comment
{
  "comment": "Great job!"
}
```

## Best Practices

### 1. Non-blocking Activity Creation
Always wrap activity creation in try-catch and don't block main flows:

```tsx
try {
  await createActivity({ /* ... */ });
} catch (error) {
  console.log('Activity creation failed:', error);
  // Don't show error to user, it's not critical
}
```

### 2. Debounce Multiple Likes
Prevent spam by debouncing like button:

```tsx
const [isLiking, setIsLiking] = useState(false);

const handleLike = async () => {
  if (isLiking) return;
  setIsLiking(true);

  try {
    await likeActivity(activityId);
  } finally {
    setTimeout(() => setIsLiking(false), 500);
  }
};
```

### 3. Cache Follow Status
Reduce API calls by caching follow status:

```tsx
const followCache = new Map();

const checkFollowStatus = async (userId) => {
  if (followCache.has(userId)) {
    return followCache.get(userId);
  }

  const status = await api.checkFollowStatus(userId);
  followCache.set(userId, status);
  return status;
};
```

### 4. Lazy Load Comments
Only load comments when modal opens:

```tsx
const [comments, setComments] = useState([]);
const [commentsLoaded, setCommentsLoaded] = useState(false);

const handleOpenComments = async () => {
  setShowModal(true);

  if (!commentsLoaded) {
    const data = await loadComments(activityId);
    setComments(data);
    setCommentsLoaded(true);
  }
};
```

## Performance Tips

1. **Use FlatList's `initialNumToRender`**: Start with 10 items
2. **Implement `getItemLayout`**: For consistent item heights
3. **Use `keyExtractor`**: Always use activity._id
4. **Memoize ActivityCard**: Use React.memo for cards
5. **Optimize Images**: Use appropriate image sizes for avatars

## Next Steps

1. ✅ Set up feed in navigation
2. ✅ Create test activities
3. ✅ Test follow/unfollow
4. ✅ Test like/comment
5. 📱 Add to your existing pages
6. 🎨 Customize colors/icons
7. 📊 Monitor engagement metrics
8. 🚀 Launch to users!

## Support

- **Documentation:** See `SOCIAL_FEED_IMPLEMENTATION.md` for detailed docs
- **Summary:** See `SOCIAL_FEED_COMPLETE.md` for overview
- **API Reference:** Check backend routes in `activityFeedRoutes.ts`

---

**That's it!** Your social feed is ready to use. Start creating activities and engaging with users! 🎉
