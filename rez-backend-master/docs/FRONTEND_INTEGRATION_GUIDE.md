# Frontend Integration Guide - New Gamification Endpoints

## Overview

Three new gamification endpoints are now available for frontend integration. All endpoints use JWT authentication and return consistent response formats.

---

## Base URL

```
http://localhost:5000/api/gamification
```

Or in production:
```
https://your-api-domain.com/api/gamification
```

---

## Quick Start - Frontend Service

Add these methods to your gamification API service:

```typescript
// frontend/services/gamificationApi.ts

import apiClient from './apiClient';

export const gamificationApi = {
  /**
   * Get user's challenge progress with statistics
   * @returns Promise with challenges array and stats object
   */
  async getMyChallengeProgress() {
    const response = await apiClient.get('/gamification/challenges/my-progress');
    return response.data;
  },

  /**
   * Get current user's login streak
   * @returns Promise with streak data
   */
  async getCurrentStreak() {
    const response = await apiClient.get('/gamification/streaks');
    return response.data;
  },

  /**
   * Get complete gamification statistics
   * @returns Promise with comprehensive stats
   */
  async getStats() {
    const response = await apiClient.get('/gamification/stats');
    return response.data;
  }
};
```

---

## Endpoint Details

### 1. Get My Challenge Progress

**Endpoint**: `GET /api/gamification/challenges/my-progress`

**Request**:
```typescript
// No parameters needed - uses JWT token
await gamificationApi.getMyChallengeProgress();
```

**Response Type**:
```typescript
interface ChallengeProgressResponse {
  success: boolean;
  message: string;
  data: {
    challenges: Array<{
      _id: string;
      user: string;
      challenge: {
        _id: string;
        title: string;
        description: string;
        type: 'daily' | 'weekly' | 'monthly' | 'special';
        requirements: {
          action: string;
          target: number;
        };
        rewards: {
          coins: number;
          badges?: string[];
        };
        active: boolean;
      };
      progress: number;
      target: number;
      completed: boolean;
      rewardsClaimed: boolean;
      startedAt: string;
      lastUpdatedAt: string;
    }>;
    stats: {
      completed: number;
      active: number;
      expired: number;
      totalCoinsEarned: number;
    };
  };
}
```

**Example Response**:
```json
{
  "success": true,
  "message": "Challenge progress retrieved successfully",
  "data": {
    "challenges": [
      {
        "_id": "673456...",
        "challenge": {
          "title": "Visit 5 Stores",
          "type": "daily",
          "rewards": { "coins": 100 }
        },
        "progress": 3,
        "target": 5,
        "completed": false
      }
    ],
    "stats": {
      "completed": 12,
      "active": 3,
      "expired": 2,
      "totalCoinsEarned": 2500
    }
  }
}
```

**Usage Example**:
```typescript
// In a React component
import { useEffect, useState } from 'react';
import { gamificationApi } from '@/services';

function ChallengesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChallenges = async () => {
      try {
        const result = await gamificationApi.getMyChallengeProgress();
        setData(result.data);
      } catch (error) {
        console.error('Failed to load challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChallenges();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <View>
      <Text>Active Challenges: {data.stats.active}</Text>
      <Text>Completed: {data.stats.completed}</Text>
      {data.challenges.map(challenge => (
        <ChallengeCard key={challenge._id} challenge={challenge} />
      ))}
    </View>
  );
}
```

---

### 2. Get Current User Streak

**Endpoint**: `GET /api/gamification/streaks`

**Request**:
```typescript
// No parameters needed - uses JWT token
await gamificationApi.getCurrentStreak();
```

**Response Type**:
```typescript
interface StreakResponse {
  success: boolean;
  message: string;
  data: {
    streak: number;              // Current consecutive days
    lastLogin: string;           // ISO date string
    type: 'login';              // Always 'login' for this endpoint
    longestStreak: number;       // User's best streak ever
    totalDays: number;           // Total days logged in
    frozen: boolean;             // Premium feature
    freezeExpiresAt: string | null;
    streakStartDate: string;     // When current streak started
  };
}
```

**Example Response**:
```json
{
  "success": true,
  "message": "Login streak retrieved successfully",
  "data": {
    "streak": 7,
    "lastLogin": "2025-11-03T08:00:00Z",
    "type": "login",
    "longestStreak": 14,
    "totalDays": 50,
    "frozen": false,
    "freezeExpiresAt": null,
    "streakStartDate": "2025-10-27T08:00:00Z"
  }
}
```

**Usage Example**:
```typescript
// In a React component
function StreakDisplay() {
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    const loadStreak = async () => {
      try {
        const result = await gamificationApi.getCurrentStreak();
        setStreak(result.data);
      } catch (error) {
        console.error('Failed to load streak:', error);
      }
    };

    loadStreak();
  }, []);

  if (!streak) return null;

  return (
    <View style={styles.streakContainer}>
      <Text style={styles.streakIcon}>🔥</Text>
      <Text style={styles.streakNumber}>{streak.streak}</Text>
      <Text style={styles.streakLabel}>Day Streak</Text>
      {streak.frozen && (
        <Text style={styles.frozenBadge}>❄️ Protected</Text>
      )}
    </View>
  );
}
```

---

### 3. Get Gamification Stats

**Endpoint**: `GET /api/gamification/stats`

**Request**:
```typescript
// No parameters needed - uses JWT token
await gamificationApi.getStats();
```

**Response Type**:
```typescript
interface GamificationStatsResponse {
  success: boolean;
  message: string;
  data: {
    // Game stats
    gamesPlayed: number;
    gamesWon: number;

    // Coins
    totalCoins: number;

    // Achievements
    achievements: number;

    // Streaks
    streak: number;
    longestStreak: number;

    // Challenges
    challengesCompleted: number;
    challengesActive: number;

    // Rankings
    rank: number;              // Primary rank (spending)
    allRanks: {
      spending: number;
      reviews: number;
      referrals: number;
      coins: number;
      cashback: number;
    };
  };
}
```

**Example Response**:
```json
{
  "success": true,
  "message": "Gamification stats retrieved successfully",
  "data": {
    "gamesPlayed": 50,
    "gamesWon": 35,
    "totalCoins": 5000,
    "achievements": 12,
    "streak": 7,
    "longestStreak": 14,
    "challengesCompleted": 8,
    "challengesActive": 3,
    "rank": 15,
    "allRanks": {
      "spending": 15,
      "reviews": 8,
      "referrals": 25,
      "coins": 10,
      "cashback": 20
    }
  }
}
```

**Usage Example**:
```typescript
// In a React component - Dashboard
function GamificationDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await gamificationApi.getStats();
        setStats(result.data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView>
      <StatsCard
        title="Games"
        value={`${stats.gamesWon}/${stats.gamesPlayed}`}
        subtitle="Games Won"
        icon="🎮"
      />

      <StatsCard
        title="Coins"
        value={stats.totalCoins}
        subtitle="Total Coins"
        icon="💰"
      />

      <StatsCard
        title="Streak"
        value={`${stats.streak} days`}
        subtitle={`Best: ${stats.longestStreak} days`}
        icon="🔥"
      />

      <StatsCard
        title="Challenges"
        value={stats.challengesCompleted}
        subtitle={`${stats.challengesActive} active`}
        icon="✅"
      />

      <StatsCard
        title="Rank"
        value={`#${stats.rank}`}
        subtitle="Overall Ranking"
        icon="🏆"
      />
    </ScrollView>
  );
}
```

---

## React Native Hook Example

Create a custom hook for easy integration:

```typescript
// frontend/hooks/useGamification.ts

import { useState, useEffect } from 'react';
import { gamificationApi } from '@/services';

export function useGamification() {
  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState(null);
  const [challenges, setChallenges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [statsRes, streakRes, challengesRes] = await Promise.all([
        gamificationApi.getStats(),
        gamificationApi.getCurrentStreak(),
        gamificationApi.getMyChallengeProgress()
      ]);

      setStats(statsRes.data);
      setStreak(streakRes.data);
      setChallenges(challengesRes.data);
    } catch (err) {
      setError(err);
      console.error('Failed to load gamification data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await gamificationApi.getStats();
      setStats(result.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadStreak = async () => {
    try {
      const result = await gamificationApi.getCurrentStreak();
      setStreak(result.data);
    } catch (err) {
      console.error('Failed to load streak:', err);
    }
  };

  const loadChallenges = async () => {
    try {
      const result = await gamificationApi.getMyChallengeProgress();
      setChallenges(result.data);
    } catch (err) {
      console.error('Failed to load challenges:', err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  return {
    stats,
    streak,
    challenges,
    loading,
    error,
    refresh: loadAll,
    refreshStats: loadStats,
    refreshStreak: loadStreak,
    refreshChallenges: loadChallenges
  };
}

// Usage in component
function MyComponent() {
  const { stats, streak, challenges, loading, refresh } = useGamification();

  if (loading) return <LoadingSpinner />;

  return (
    <View>
      <Text>Streak: {streak?.streak} days</Text>
      <Text>Coins: {stats?.totalCoins}</Text>
      <Text>Active Challenges: {challenges?.stats.active}</Text>
      <Button title="Refresh" onPress={refresh} />
    </View>
  );
}
```

---

## Error Handling

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  meta: {
    timestamp: string;
  };
}
```

**Common Errors**:

1. **401 Unauthorized** - Invalid or missing JWT token
```json
{
  "success": false,
  "message": "Authentication required",
  "meta": {
    "timestamp": "2025-11-03T12:00:00Z"
  }
}
```

2. **500 Internal Server Error** - Backend error
```json
{
  "success": false,
  "message": "Internal server error",
  "meta": {
    "timestamp": "2025-11-03T12:00:00Z"
  }
}
```

**Error Handling Example**:
```typescript
try {
  const result = await gamificationApi.getStats();
  // Handle success
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
    navigation.navigate('Login');
  } else {
    // Show error message
    showToast('Failed to load stats. Please try again.');
  }
}
```

---

## TypeScript Type Definitions

Add these to your types file:

```typescript
// frontend/types/gamification.types.ts

export interface Challenge {
  _id: string;
  user: string;
  challenge: {
    _id: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'special';
    requirements: {
      action: string;
      target: number;
    };
    rewards: {
      coins: number;
      badges?: string[];
    };
    active: boolean;
  };
  progress: number;
  target: number;
  completed: boolean;
  rewardsClaimed: boolean;
  startedAt: string;
  lastUpdatedAt: string;
}

export interface ChallengeStats {
  completed: number;
  active: number;
  expired: number;
  totalCoinsEarned: number;
}

export interface ChallengeProgressData {
  challenges: Challenge[];
  stats: ChallengeStats;
}

export interface StreakData {
  streak: number;
  lastLogin: string;
  type: 'login';
  longestStreak: number;
  totalDays: number;
  frozen: boolean;
  freezeExpiresAt: string | null;
  streakStartDate: string;
}

export interface GamificationStats {
  gamesPlayed: number;
  gamesWon: number;
  totalCoins: number;
  achievements: number;
  streak: number;
  longestStreak: number;
  challengesCompleted: number;
  challengesActive: number;
  rank: number;
  allRanks: {
    spending: number;
    reviews: number;
    referrals: number;
    coins: number;
    cashback: number;
  };
}
```

---

## Performance Tips

1. **Caching**: Consider caching stats for 1-5 minutes
2. **Parallel Loading**: Use `Promise.all` to load multiple endpoints
3. **Optimistic Updates**: Update UI immediately, sync in background
4. **Error Recovery**: Retry failed requests with exponential backoff

```typescript
// Example with caching
let cachedStats = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getStatsWithCache() {
  const now = Date.now();

  if (cachedStats && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    return cachedStats;
  }

  const result = await gamificationApi.getStats();
  cachedStats = result.data;
  cacheTime = now;

  return cachedStats;
}
```

---

## Testing

Mock data for testing:

```typescript
// frontend/__mocks__/gamificationApi.ts

export const mockChallengeProgress = {
  challenges: [
    {
      _id: '1',
      challenge: {
        title: 'Test Challenge',
        type: 'daily',
        rewards: { coins: 100 }
      },
      progress: 3,
      target: 5,
      completed: false
    }
  ],
  stats: {
    completed: 5,
    active: 2,
    expired: 1,
    totalCoinsEarned: 1000
  }
};

export const mockStreak = {
  streak: 7,
  lastLogin: '2025-11-03T08:00:00Z',
  type: 'login',
  longestStreak: 14,
  totalDays: 50,
  frozen: false
};

export const mockStats = {
  gamesPlayed: 50,
  gamesWon: 35,
  totalCoins: 5000,
  achievements: 12,
  streak: 7,
  longestStreak: 14,
  challengesCompleted: 8,
  challengesActive: 3,
  rank: 15,
  allRanks: {
    spending: 15,
    reviews: 8,
    referrals: 25,
    coins: 10,
    cashback: 20
  }
};
```

---

## Summary

✅ **3 New Endpoints Ready**
- Challenge progress with stats
- User streak (JWT-based)
- Complete gamification stats

✅ **Features**
- JWT authentication (no manual userId)
- Consistent response format
- Comprehensive error handling
- Production-ready

✅ **What You Need**
- Add service methods to `gamificationApi`
- Import TypeScript types
- Use in components/hooks
- Handle errors appropriately

---

**Questions?** See `docs/NEW_GAMIFICATION_ENDPOINTS.md` for full API documentation.
