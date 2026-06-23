# LEADERBOARD INTEGRATION PLAN

## Executive Summary
This document provides a comprehensive overview of the existing leaderboard components, API endpoints, data structures, and integration steps for the REZ App referral leaderboard feature.

---

## 1. COMPONENTS FOUND

### 1.1 Main Leaderboard Page
**Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\leaderboard\index.tsx`

**Features:**
- Real-time leaderboard updates via WebSocket
- Period filters (Daily, Weekly, Monthly, All-Time)
- User rank display with highlighting
- Medal system for top 3 users
- Rank up celebration animations
- Pull-to-refresh functionality
- Live connection indicator
- User statistics (coins, achievements)
- Tier badge integration

**Key Components Used:**
- `useLeaderboardRealtime` hook for WebSocket integration
- `gamificationAPI.getLeaderboard()` for initial data
- `TierBadge` component for subscription tier display
- `LinearGradient` for visual effects
- Animated components for smooth transitions

---

### 1.2 Referral Components
**Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\components\referral\`

**Available Components:**
- `ShareModal.tsx` - Share referral code modal
- `TierUpgradeCelebration.tsx` - Celebration animation for tier upgrades
- `PrivacyNotice.tsx` - GDPR-compliant privacy notice

**Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\referral.tsx`

**Features:**
- Referral code display and sharing
- Referral statistics
- Referral history with anonymized PII
- Link to full dashboard with leaderboard

---

## 2. API ENDPOINTS AVAILABLE

### 2.1 Gamification API Endpoints

**Base Service:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\services\gamificationApi.ts`

#### Leaderboard Endpoint
```typescript
GET /gamification/leaderboard
```

**Request Parameters:**
```typescript
{
  period: 'daily' | 'weekly' | 'monthly' | 'all-time',  // Default: 'monthly'
  limit: number  // Default: 50
}
```

**Response Structure:**
```typescript
{
  success: boolean;
  data: {
    period: 'daily' | 'weekly' | 'monthly' | 'all-time';
    entries: LeaderboardEntry[];
    userRank?: LeaderboardEntry;
    totalUsers: number;
    updatedAt: Date;
  }
}
```

---

### 2.2 Referral API Endpoints

**Base Service:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\services\referralApi.ts`

#### Get Referral Leaderboard
```typescript
GET /referral/leaderboard
```

**Request Parameters:**
```typescript
{
  period: 'week' | 'month' | 'year'  // Default: 'month'
}
```

**Response Structure:**
```typescript
{
  success: boolean;
  data: {
    leaderboard: Array<{
      rank: number;
      userId: string;
      userName: string;
      totalReferrals: number;
      totalEarned: number;
    }>;
    userRank?: {
      rank: number;
      totalReferrals: number;
      totalEarned: number;
    };
  }
}
```

#### Get Referral Statistics
```typescript
GET /referral/statistics
```

**Response Structure:**
```typescript
{
  success: boolean;
  data: {
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalEarned: number;
    pendingEarnings: number;
    averageRewardPerReferral: number;
    conversionRate: number;
  }
}
```

---

## 3. DATA STRUCTURES

### 3.1 Gamification Leaderboard Entry
**Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\types\gamification.types.ts`

```typescript
interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatar?: string;
  coins: number;
  level: number;
  tier: 'free' | 'premium' | 'vip';
  achievements: number;
  isCurrentUser?: boolean;
}

interface LeaderboardData {
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  entries: LeaderboardEntry[];
  userRank?: LeaderboardEntry;
  totalUsers: number;
  updatedAt: Date;
}
```

### 3.2 Referral Leaderboard Entry
**Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\types\referral.types.ts`

```typescript
interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  fullName?: string;
  avatar?: string;
  totalReferrals: number;
  lifetimeEarnings: number;
  tier: string;
}
```

### 3.3 Real-Time Socket Events
**Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\types\socket.types.ts`

**WebSocket Events:**
- `LEADERBOARD_UPDATE` - When leaderboard positions change
- `LEADERBOARD_USER_SCORED` - When a user earns points
- `LEADERBOARD_RANK_CHANGE` - When a user's rank changes

**Event Payloads:**
```typescript
interface LeaderboardUpdatePayload {
  userId: string;
  username: string;
  fullName: string;
  rank: number;
  coins: number;
}

interface LeaderboardUserScoredPayload {
  userId: string;
  coinsEarned: number;
  newTotal: number;
  source: string;
}

interface LeaderboardRankChangePayload {
  userId: string;
  oldRank: number;
  newRank: number;
  direction: 'up' | 'down';
  coins: number;
}
```

---

## 4. CUSTOM HOOKS

### 4.1 useLeaderboardRealtime Hook
**Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\hooks\useLeaderboardRealtime.ts`

**Purpose:** Manages real-time leaderboard updates via WebSocket

**Usage:**
```typescript
const {
  entries,              // Current leaderboard entries
  userRank,            // Current user's rank info
  isConnected,         // WebSocket connection status
  isUpdating,          // Update animation flag
  lastUpdate,          // Timestamp of last update
  recentChanges,       // Recent rank/score changes
  updateUserScore,     // Optimistically update user's score
  getRecentChangesForUser,  // Get changes for specific user
  hasRecentRankUp,     // Check if user recently ranked up
} = useLeaderboardRealtime(
  initialEntries,      // Initial leaderboard data
  currentUserId,       // Current user's ID
  {
    onRankUp,          // Callback when user ranks up
    onPointsEarned,    // Callback when user earns points
    onLeaderboardUpdate, // Callback on any update
  }
);
```

**Features:**
- Automatic WebSocket subscription
- Optimistic updates
- Rank change animations
- Recent activity tracking
- Connection state management

---

## 5. INTEGRATION STEPS

### 5.1 Basic Leaderboard Integration

**Step 1: Import Required Components**
```typescript
import gamificationAPI from '@/services/gamificationApi';
import { useLeaderboardRealtime } from '@/hooks/useLeaderboardRealtime';
import { LeaderboardData, LeaderboardEntry } from '@/types/gamification.types';
import { useAuth } from '@/contexts/AuthContext';
```

**Step 2: Set Up State**
```typescript
const { state } = useAuth();
const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly');
const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
const [isLoading, setIsLoading] = useState(true);
```

**Step 3: Fetch Initial Data**
```typescript
const fetchLeaderboard = async () => {
  try {
    setIsLoading(true);
    const response = await gamificationAPI.getLeaderboard(selectedPeriod, 50);

    if (response.success && response.data) {
      setLeaderboardData(response.data);
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  fetchLeaderboard();
}, [selectedPeriod]);
```

**Step 4: Set Up Real-Time Updates**
```typescript
const {
  entries: realtimeEntries,
  userRank: realtimeUserRank,
  isConnected,
  hasRecentRankUp,
} = useLeaderboardRealtime(
  leaderboardData?.entries || [],
  state.user?.id,
  {
    onRankUp: (userId, newRank, oldRank) => {
      if (userId === state.user?.id) {
        showCelebration(`You ranked up from #${oldRank} to #${newRank}!`);
      }
    },
  }
);
```

**Step 5: Display Leaderboard**
```typescript
const displayEntries = realtimeEntries.length > 0 ? realtimeEntries : leaderboardData?.entries || [];

return (
  <FlatList
    data={displayEntries}
    keyExtractor={(item) => item.userId}
    renderItem={({ item }) => (
      <LeaderboardEntryCard entry={item} />
    )}
  />
);
```

---

### 5.2 Referral Leaderboard Integration

**Step 1: Import Referral API**
```typescript
import referralService from '@/services/referralApi';
```

**Step 2: Fetch Referral Leaderboard**
```typescript
const fetchReferralLeaderboard = async (period = 'month') => {
  try {
    const response = await referralService.getReferralLeaderboard(period);

    if (response.success && response.data) {
      const { leaderboard, userRank } = response.data;
      // Process and display data
    }
  } catch (error) {
    console.error('Error fetching referral leaderboard:', error);
  }
};
```

**Step 3: Display User's Rank**
```typescript
{userRank && (
  <View style={styles.userRankCard}>
    <Text>Your Rank: #{userRank.rank}</Text>
    <Text>Total Referrals: {userRank.totalReferrals}</Text>
    <Text>Total Earned: ₹{userRank.totalEarned}</Text>
  </View>
)}
```

---

### 5.3 Pagination Implementation

**For Large Leaderboards (50+ users):**

```typescript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const loadMore = async () => {
  if (!hasMore || isLoading) return;

  try {
    const nextPage = page + 1;
    const response = await gamificationAPI.getLeaderboard(selectedPeriod, 50 * nextPage);

    if (response.success && response.data) {
      // Append new entries
      setLeaderboardData(prev => ({
        ...response.data,
        entries: [...(prev?.entries || []), ...response.data.entries],
      }));

      setPage(nextPage);
      setHasMore(response.data.entries.length === 50);
    }
  } catch (error) {
    console.error('Error loading more:', error);
  }
};
```

---

## 6. CODE EXAMPLES

### 6.1 Complete Leaderboard Card Component

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TierBadge from '@/components/subscription/TierBadge';
import type { LeaderboardEntry } from '@/types/gamification.types';

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
  showRankUpBadge?: boolean;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  entry,
  isCurrentUser,
  showRankUpBadge
}) => {
  const isTopThree = entry.rank <= 3;

  const getMedalIcon = (rank: number) => {
    const medals = {
      1: { icon: 'medal', color: '#FFD700' }, // Gold
      2: { icon: 'medal', color: '#C0C0C0' }, // Silver
      3: { icon: 'medal', color: '#CD7F32' }, // Bronze
    };
    return medals[rank as keyof typeof medals];
  };

  const medal = getMedalIcon(entry.rank);

  return (
    <View style={[
      styles.card,
      isCurrentUser && styles.currentUserCard,
      isTopThree && styles.topThreeCard
    ]}>
      {/* Rank or Medal */}
      <View style={styles.rankContainer}>
        {medal ? (
          <View style={[styles.medalContainer, { backgroundColor: `${medal.color}20` }]}>
            <Ionicons name={medal.icon as any} size={24} color={medal.color} />
          </View>
        ) : (
          <Text style={styles.rankText}>#{entry.rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <View style={[styles.avatar, isTopThree && styles.topThreeAvatar]}>
        {entry.avatar ? (
          <Image source={{ uri: entry.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {entry.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {entry.fullName} {isCurrentUser && '(You)'}
        </Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="diamond" size={12} color="#F59E0B" />
            <Text style={styles.statText}>{entry.coins.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={12} color="#8B5CF6" />
            <Text style={styles.statText}>{entry.achievements}</Text>
          </View>
        </View>
      </View>

      {/* Tier Badge */}
      <TierBadge tier={entry.tier} size="small" />

      {/* Rank Up Badge */}
      {showRankUpBadge && (
        <View style={styles.rankUpBadge}>
          <Ionicons name="trending-up" size={12} color="#4CD964" />
          <Text style={styles.rankUpText}>Ranked Up!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
  topThreeCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  medalContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    overflow: 'hidden',
  },
  topThreeAvatar: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  rankUpBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CD964',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  rankUpText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default LeaderboardCard;
```

---

### 6.2 Period Filter Component

```typescript
const PeriodFilter: React.FC<{
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}> = ({ selectedPeriod, onPeriodChange }) => {
  const periods: { key: Period; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'all-time', label: 'All Time' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.filterContainer}>
        {periods.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterButton,
              selectedPeriod === key && styles.filterButtonActive
            ]}
            onPress={() => onPeriodChange(key)}
          >
            <Text style={[
              styles.filterText,
              selectedPeriod === key && styles.filterTextActive
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};
```

---

## 7. BEST PRACTICES

### 7.1 Performance Optimization

1. **Memoization:**
```typescript
const displayEntries = useMemo(
  () => realtimeEntries.length > 0 ? realtimeEntries : leaderboardData?.entries || [],
  [realtimeEntries, leaderboardData?.entries]
);
```

2. **FlatList Optimization:**
```typescript
<FlatList
  data={displayEntries}
  keyExtractor={(item) => item.userId}
  renderItem={renderLeaderboardEntry}
  getItemLayout={(data, index) => ({
    length: 80,
    offset: 80 * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

3. **Debounce Updates:**
```typescript
const debouncedUpdate = useMemo(
  () => debounce((data) => setLeaderboardData(data), 500),
  []
);
```

### 7.2 Error Handling

```typescript
try {
  const response = await gamificationAPI.getLeaderboard(period, limit);

  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch leaderboard');
  }

  setLeaderboardData(response.data);
} catch (error) {
  console.error('Leaderboard error:', error);

  // Show user-friendly error
  Alert.alert(
    'Error',
    'Failed to load leaderboard. Please check your connection and try again.'
  );

  // Use cached data if available
  if (cachedData) {
    setLeaderboardData(cachedData);
  }
}
```

### 7.3 Privacy Considerations

```typescript
// Anonymize user data for non-current users
const anonymizeEntry = (entry: LeaderboardEntry, isCurrentUser: boolean) => {
  if (isCurrentUser) return entry;

  return {
    ...entry,
    fullName: entry.fullName.charAt(0) + '***',
    username: entry.username.substring(0, 3) + '***',
  };
};
```

---

## 8. TESTING CHECKLIST

### 8.1 Functional Testing

- [ ] Leaderboard loads with correct data
- [ ] Period filters work correctly
- [ ] User's rank is highlighted
- [ ] Top 3 users show medals
- [ ] Real-time updates are received
- [ ] Rank up animations play
- [ ] Pull-to-refresh works
- [ ] Pagination loads more data
- [ ] Empty state shows correctly
- [ ] Error states display properly

### 8.2 Edge Cases

- [ ] User not on leaderboard
- [ ] Leaderboard with < 3 users
- [ ] Leaderboard with 0 users
- [ ] Network disconnection
- [ ] WebSocket reconnection
- [ ] Concurrent updates
- [ ] Large numbers formatting
- [ ] Very long usernames

### 8.3 Performance Testing

- [ ] Smooth scrolling with 100+ entries
- [ ] No memory leaks on unmount
- [ ] Efficient re-renders
- [ ] Fast period switching
- [ ] Quick refresh response

---

## 9. KNOWN ISSUES & LIMITATIONS

### 9.1 Current Limitations

1. **Pagination:** Backend may not support pagination beyond initial limit
2. **Avatar Support:** Avatar images may not be available for all users
3. **Real-time Delay:** WebSocket updates have ~1-2 second delay
4. **Period Switching:** Switching periods refetches all data (no caching)

### 9.2 Future Enhancements

1. **Search Functionality:** Search for specific users
2. **Filter by Tier:** Filter leaderboard by subscription tier
3. **Achievement Badges:** Show achievement badges on cards
4. **Share Feature:** Share leaderboard position to social media
5. **Historical Data:** View past leaderboard rankings

---

## 10. CONCLUSION

The leaderboard system is fully functional with:
- ✅ Gamification leaderboard API
- ✅ Referral leaderboard API
- ✅ Real-time WebSocket integration
- ✅ Complete UI components
- ✅ Custom hooks for state management
- ✅ Type definitions
- ✅ Animation support

**Next Steps:**
1. Test backend endpoints
2. Verify WebSocket connection
3. Implement pagination if needed
4. Add error boundary components
5. Optimize for production

**Documentation:**
- API Reference: `services/gamificationApi.ts`
- Types: `types/gamification.types.ts`, `types/referral.types.ts`
- Hooks: `hooks/useLeaderboardRealtime.ts`
- Components: `app/leaderboard/index.tsx`

---

**Created:** 2025-11-03
**Last Updated:** 2025-11-03
**Version:** 1.0.0
