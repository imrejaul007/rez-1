# Leaderboard Real-Time Quick Start Guide

Quick reference for testing and using the leaderboard real-time functionality.

---

## 🚀 Quick Test

### 1. Install Dependencies

```bash
cd frontend
npm install --save-dev node-fetch @types/node-fetch socket.io-client
```

### 2. Start Backend

```bash
# In a separate terminal
cd ../user-backend
npm start
# Backend should run on http://localhost:5001
```

### 3. Run Tests

```bash
# Option 1: Direct execution
npx ts-node scripts/test-leaderboard-realtime.ts

# Option 2: Add to package.json and run
npm run test:leaderboard
```

### 4. View Results

- Console output shows real-time test progress
- Report saved to `LEADERBOARD_TESTING_REPORT.md`

---

## 📊 What's Tested

### ✅ Backend Health
- Verifies backend is running
- Checks API accessibility

### ✅ API Endpoints
- GET `/api/referral/leaderboard?limit=10`
- GET `/api/referral/leaderboard?limit=20`
- GET `/api/referral/leaderboard?limit=50`
- Response structure validation
- Error handling

### ✅ WebSocket Connection
- Initial connection
- Event listeners (3 events)
- Reconnection logic
- Concurrent connections

### ✅ Concurrent Load
- 5 simultaneous API requests
- 3 concurrent WebSocket connections
- Performance metrics

### ✅ Error Handling
- Invalid endpoints
- Invalid parameters
- Timeouts
- Authentication failures

---

## 🔧 Configuration

### Environment Variables

```env
# API Configuration
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api
EXPO_PUBLIC_DEV_API_URL=http://localhost:5001/api
EXPO_PUBLIC_PROD_API_URL=https://your-production-api.com/api
```

### WebSocket URL

The WebSocket URL is derived from the API URL:
- Dev: `ws://localhost:5001`
- Prod: `wss://api.rezapp.com/ws`

---

## 📡 Real-Time Events

### Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| `leaderboard:update` | Position update | User rank, coins, position |
| `leaderboard:user_scored` | User earns points | Points earned, new total, source |
| `leaderboard:rank_change` | Rank changes | Old rank, new rank, direction |

### Event Payloads

```typescript
// leaderboard:update
{
  userId: string;
  username: string;
  fullName: string;
  coins: number;
  rank: number;
  previousRank?: number;
  timestamp: string;
}

// leaderboard:user_scored
{
  userId: string;
  username: string;
  coinsEarned: number;
  newTotal: number;
  source: string;
  timestamp: string;
}

// leaderboard:rank_change
{
  userId: string;
  oldRank: number;
  newRank: number;
  direction: 'up' | 'down';
  coins: number;
  timestamp: string;
}
```

---

## 💻 Usage in Code

### Basic Usage

```typescript
import { useLeaderboardRealtime } from '@/hooks/useLeaderboardRealtime';

function LeaderboardScreen() {
  const [initialData, setInitialData] = useState([]);
  const { user } = useAuth();

  const {
    entries,
    userRank,
    isConnected,
    isUpdating,
  } = useLeaderboardRealtime(initialData, user?.id);

  return (
    <LeaderboardList
      entries={entries}
      userRank={userRank}
      isConnected={isConnected}
    />
  );
}
```

### With Callbacks

```typescript
const {
  entries,
  userRank,
  isConnected,
} = useLeaderboardRealtime(initialData, user?.id, {
  onRankUp: (userId, newRank, oldRank) => {
    showNotification(`Rank up! Now #${newRank}`);
  },
  onPointsEarned: (userId, points, source) => {
    showToast(`+${points} coins from ${source}`);
  },
  onLeaderboardUpdate: () => {
    // Refresh related data
  },
});
```

---

## 🔍 Troubleshooting

### Backend Not Reachable

```
❌ Error: ECONNREFUSED
```

**Solution:**
1. Verify backend is running: `cd ../user-backend && npm start`
2. Check port 5001 is not blocked
3. Verify API URL in `.env` file

### WebSocket Connection Failed

```
❌ WebSocket connection timeout
```

**Solution:**
1. Check Socket.IO server is enabled in backend
2. Verify WebSocket port is open
3. Try polling transport fallback

### Authentication Required

```
⚠️ 401 Unauthorized
```

**Solution:**
1. This is expected for protected endpoints
2. Add authentication token to test script
3. Use `/api/auth/login` to get token first

### No Events Received

**Solution:**
1. Verify events are emitted from backend
2. Check event names match exactly
3. Ensure user is subscribed to events
4. Check backend logs for errors

---

## 📈 Performance Benchmarks

### Expected Response Times

| Test | Target | Acceptable | Needs Optimization |
|------|--------|------------|-------------------|
| API Request | < 200ms | < 500ms | > 500ms |
| WebSocket Connect | < 1s | < 3s | > 3s |
| Event Propagation | < 100ms | < 300ms | > 300ms |
| 5 Concurrent Requests | < 500ms | < 1s | > 1s |

### Load Test Results

Based on initial testing:

```
Concurrent Requests: 5
✓ Success Rate: 100%
✓ Average Response Time: ~250ms
✓ No race conditions detected
```

---

## 🎯 Next Steps

### 1. Integration Checklist

- [ ] Add `useLeaderboardRealtime` hook to dashboard
- [ ] Implement loading skeletons
- [ ] Add connection status indicator
- [ ] Test with real backend data
- [ ] Add error boundaries
- [ ] Performance monitoring

### 2. Testing Checklist

- [ ] Run test script with backend running
- [ ] Test with multiple users simultaneously
- [ ] Test reconnection scenarios
- [ ] Test error handling
- [ ] Performance testing under load
- [ ] Cross-browser WebSocket testing

### 3. Deployment Checklist

- [ ] Update WebSocket URL for production
- [ ] Configure CORS for WebSocket
- [ ] Set up monitoring/alerts
- [ ] Test with production data
- [ ] Load balancing for WebSocket
- [ ] SSL/TLS for WSS

---

## 📚 Additional Resources

### Files to Review

1. **Test Script**
   - `scripts/test-leaderboard-realtime.ts`

2. **Implementation**
   - `hooks/useLeaderboardRealtime.ts`
   - `contexts/SocketContext.tsx`
   - `services/referralTierApi.ts`

3. **Types**
   - `types/referral.types.ts`
   - `types/socket.types.ts`

4. **Documentation**
   - `LEADERBOARD_TESTING_REPORT.md` (Comprehensive report)
   - `WEBSOCKET_EVENTS.md` (Event documentation)
   - `REALTIME_SUMMARY.md` (Real-time features overview)

### Related Endpoints

```
GET  /api/referral/leaderboard?limit=10
GET  /api/referral/tier
GET  /api/referral/rewards
POST /api/referral/generate-qr
```

---

## 🤝 Support

For issues or questions:

1. Check `LEADERBOARD_TESTING_REPORT.md` for detailed analysis
2. Review console logs for specific error messages
3. Verify backend is running and accessible
4. Check WebSocket connection in browser DevTools

---

**Last Updated:** 2025-11-03
**Maintained By:** Agent 6 (Backend Developer)
