# E2E Test Scenarios for Games Feature

This document outlines end-to-end test scenarios for manual and automated testing of the games feature.

## Test Environment Setup

### Prerequisites
- App installed on test device (iOS/Android)
- Test user account with known credentials
- Backend services running
- Network connectivity available

### Test Data
- **Test User**: test-user@example.com
- **Initial Coin Balance**: 1000 coins
- **Test Period**: Clean slate (no previous game history)

---

## Scenario 1: New User First Game Experience

### Objective
Verify that a new user can discover and play their first game successfully.

### Steps
1. Open the app and log in with new test account
2. Navigate to Games page from tab navigation
3. Observe the games hub display
4. Tap on "Spin & Win" game card
5. Read game instructions
6. Tap "SPIN NOW" button
7. Watch spin animation complete
8. View prize result modal
9. Confirm coin balance updated
10. Return to games hub
11. Verify coin counter shows updated balance

### Expected Results
- Games hub loads within 2 seconds
- All game cards display correctly
- Active games are tappable, locked games show lock icon
- Spin animation is smooth (60fps)
- Prize result displays immediately after spin
- Coin balance updates instantly
- Achievement "First Spin" unlocks
- Notification appears for achievement

### Pass Criteria
- All steps complete without errors
- Coin balance increases by prize amount
- Achievement unlocked and displayed
- User can navigate back successfully

---

## Scenario 2: Complete Quiz Game Flow

### Objective
Test complete quiz game session from start to finish.

### Steps
1. Navigate to Games page
2. Tap "Daily Quiz" game card (if active)
3. Quiz starts and displays first question
4. Note the timer countdown
5. Select answer option A
6. Tap "Submit Answer" button
7. Read feedback (Correct/Wrong)
8. Tap "Continue" to next question
9. Repeat steps 5-8 for all questions
10. View final score screen
11. Note total coins earned
12. Check wallet balance updated

### Expected Results
- Quiz loads with 5 questions
- Timer counts down from 30s per question
- Selected option highlights visually
- Feedback is immediate and accurate
- Score updates incrementally
- Final score matches correct answers
- Coins awarded for correct answers
- Wallet balance reflects earnings

### Pass Criteria
- Complete all questions within time limit
- Receive coins for correct answers
- Final score display matches performance
- No crashes or freezes during quiz

---

## Scenario 3: Daily Streak Maintenance

### Objective
Verify daily check-in and streak tracking functionality.

### Steps
1. Day 1: Open app, complete daily check-in
2. Note streak counter shows "1"
3. Receive 10 coins for check-in
4. Day 2: Open app next day
5. Complete daily check-in again
6. Verify streak counter shows "2"
7. Receive bonus coins for 2-day streak
8. Day 3-7: Repeat daily check-ins
9. On Day 7, verify "Dedicated Player" achievement
10. Skip Day 8 (miss check-in)
11. Day 9: Check-in again
12. Verify streak reset to "1"

### Expected Results
- Streak increments by 1 each consecutive day
- Bonus multiplier increases with streak (1.5x at 7 days)
- "Dedicated Player" achievement unlocks at 7-day streak
- Missing a day resets streak to 0
- First check-in after break starts new streak

### Pass Criteria
- Streak tracking is accurate
- Bonus coins calculated correctly
- Achievement triggers at 7 days
- Streak reset works properly
- No duplicate check-ins same day

---

## Scenario 4: Spin Wheel Cooldown

### Objective
Verify spin wheel cooldown mechanism prevents abuse.

### Steps
1. Navigate to Spin & Win game
2. Tap "SPIN NOW" and complete spin
3. After spin completes, try to spin again immediately
4. Observe "No Spins Left" or cooldown message
5. Note "Next spin in: XX hours" display
6. Wait 24 hours (or adjust system time for testing)
7. Return to spin wheel
8. Verify spin is available again
9. Complete second spin successfully

### Expected Results
- First spin completes successfully
- Second immediate spin is blocked
- Cooldown timer displays correctly
- Timer counts down accurately
- After 24 hours, spin is available
- Second spin awards prize normally

### Pass Criteria
- Cooldown enforced (no double spins)
- Timer accurate to within 1 minute
- Spin becomes available after cooldown
- No way to bypass cooldown
- Server-side validation prevents cheating

---

## Scenario 5: Multiple Games in Single Session

### Objective
Test playing multiple different games in one app session.

### Steps
1. Open Games page
2. Play Spin & Win (earn 50 coins)
3. Return to games hub
4. Play Scratch Card (earn 100 coins)
5. Return to games hub
6. Play Daily Quiz (earn 75 coins)
7. Check total coins earned display
8. Navigate to Wallet
9. Verify all transactions recorded
10. Check coin balance matches expectations

### Expected Results
- Can play multiple games consecutively
- Each game awards coins independently
- Coin balance accumulates correctly
- Transaction history shows all games
- No conflicts or race conditions
- Total earned: 225 coins (50+100+75)

### Pass Criteria
- All games playable in sequence
- No crashes between games
- Coin calculations accurate
- Transaction history complete
- Balance matches sum of earnings

---

## Scenario 6: Achievement Unlock Flow

### Objective
Verify achievement unlock, notification, and reward system.

### Steps
1. Check current achievement progress
2. Play games to trigger "Quiz Master" achievement (complete 10 quizzes)
3. On 10th quiz completion, observe achievement unlock animation
4. Read achievement details in popup
5. Tap "Claim Reward" button
6. Receive 200 bonus coins
7. Check achievement marked as "Unlocked" in profile
8. Verify achievement badge appears in profile
9. Share achievement on social media (optional)

### Expected Results
- Achievement progress tracks correctly (9/10, 10/10)
- Unlock animation plays smoothly
- Achievement popup displays immediately
- Bonus coins awarded on claim
- Achievement persists in profile
- Badge visible in user profile
- Share functionality works (if implemented)

### Pass Criteria
- Achievement unlocks at correct milestone
- Notification displays properly
- Reward coins added to balance
- Achievement saved permanently
- Progress tracking accurate

---

## Scenario 7: Wallet-Games Coin Synchronization

### Objective
Ensure coin balance stays synchronized between games and wallet.

### Steps
1. Check wallet balance (starting: 1000 coins)
2. Navigate to Games page
3. Note games page shows same balance (1000)
4. Play spin wheel, win 50 coins
5. Immediately check wallet balance
6. Should show 1050 coins
7. Spend 200 coins in store
8. Return to games page
9. Should show 850 coins
10. Play quiz, earn 30 coins
11. Check both wallet and games page
12. Both should show 880 coins

### Expected Results
- Wallet and games always show same balance
- Updates happen in real-time
- No delays or desyncs
- Earning and spending both sync correctly
- Balance consistent across app restarts

### Pass Criteria
- Perfect synchronization at all times
- Updates within 1 second
- No discrepancies between views
- Balance persists after app restart
- Server is source of truth

---

## Scenario 8: Error Recovery Scenarios

### Objective
Test app behavior during network errors or interruptions.

### Steps
1. Start quiz game with network ON
2. Answer first question
3. Turn OFF network/WiFi
4. Answer second question
5. Tap "Submit Answer"
6. Observe error message
7. Turn network back ON
8. Tap "Retry" or resume game
9. Verify game state preserved
10. Complete quiz normally
11. Verify coins awarded after recovery

### Expected Results
- Quiz state saved locally
- Error message clear and helpful
- Retry mechanism works
- No data loss during interruption
- Game resumes from last checkpoint
- Coins awarded after network restored

### Pass Criteria
- Graceful error handling
- Data integrity maintained
- User can recover and continue
- No duplicate rewards
- Progress not lost

---

## Scenario 9: Concurrent User Sessions

### Objective
Test behavior with same account on multiple devices.

### Steps
1. Log in on Device A (iOS)
2. Log in on Device B (Android)
3. Play spin wheel on Device A
4. Observe coin balance on Device B
5. Should update automatically via WebSocket/polling
6. Play quiz on Device B
7. Check balance on Device A
8. Both should show same balance
9. Try playing same game simultaneously
10. Verify server prevents conflicts

### Expected Results
- Both devices stay synchronized
- Real-time updates via WebSocket
- Server handles concurrent requests
- No duplicate game plays
- Cooldowns respected across devices
- Balance always consistent

### Pass Criteria
- Perfect sync across devices
- No race conditions
- Server-side validation prevents exploits
- User experience smooth
- No data corruption

---

## Scenario 10: Leaderboard Integration

### Objective
Verify user ranking updates based on game performance.

### Steps
1. Check current leaderboard position
2. Note rank (e.g., #150)
3. Play multiple games, earn 500 coins
4. Return to leaderboard
5. Verify rank improved (e.g., #120)
6. Check stats: total coins, games played
7. View top 10 players
8. Compare own stats to leaders
9. Play more games next day
10. Verify daily/weekly leaderboards update

### Expected Results
- Leaderboard updates after games
- Rank changes based on coins earned
- Stats accurate and detailed
- Top players displayed correctly
- Multiple time periods work (daily/weekly/monthly)
- Own rank highlighted

### Pass Criteria
- Rank updates within 5 minutes
- Statistics accurate
- Leaderboard refreshes on pull-down
- No fake/bot accounts
- Fair ranking algorithm

---

## Performance Test Scenarios

### Load Time Tests
- **Games Hub Load**: < 2 seconds
- **Spin Wheel Load**: < 1 second
- **Quiz Start**: < 1.5 seconds
- **Achievement Unlock**: < 0.5 seconds

### Animation Tests
- **Spin Wheel**: Smooth 60fps, 4-second animation
- **Quiz Timer**: Accurate 1-second intervals
- **Coin Counter**: Smooth increment animation
- **Achievement Popup**: Smooth slide-in

### Stress Tests
- Play 50 games in 1 hour
- Check app memory usage
- Verify no memory leaks
- Test battery consumption
- Check network data usage

---

## Accessibility Tests

### Screen Reader
- Games hub announces game titles
- Spin button announces "Spin Now"
- Quiz questions read aloud
- Timer announces remaining time
- Results announced clearly

### High Contrast Mode
- All text readable
- Button borders visible
- Icons distinguishable
- Animations not jarring

### Font Scaling
- UI adapts to large fonts
- No text overflow
- Buttons remain accessible
- Layouts don't break

---

## Security Test Scenarios

### Cheat Prevention
- Cannot spin wheel multiple times
- Cannot manipulate quiz answers
- Cannot fake achievements
- Cannot edit coin balance locally
- Server validates all operations

### Data Integrity
- Coins earned match server records
- Achievement unlocks verified server-side
- Transaction history immutable
- Audit logs maintained

---

## Regression Test Checklist

After each app update, verify:
- [ ] All games still playable
- [ ] Coin synchronization works
- [ ] Achievements unlock correctly
- [ ] Daily streak tracking accurate
- [ ] Cooldowns enforced
- [ ] Leaderboard updates
- [ ] No new crashes
- [ ] Performance not degraded
- [ ] UI still responsive
- [ ] Existing user data intact

---

## Test Data Cleanup

After testing:
1. Delete test user accounts
2. Reset test device to clean state
3. Clear app data and cache
4. Document any bugs found
5. Update test scenarios if needed

---

## Bug Reporting Template

When filing bugs:
- **Scenario**: Which test scenario failed
- **Step**: Exact step that failed
- **Expected**: What should happen
- **Actual**: What actually happened
- **Device**: iOS/Android, version
- **App Version**: e.g., 1.2.3
- **Screenshots**: Attach if applicable
- **Logs**: Include error logs
- **Reproducible**: Always/Sometimes/Once

---

## Success Metrics

Tests pass if:
- 95%+ scenarios complete successfully
- No critical bugs found
- Performance meets targets
- User experience smooth
- Security tests pass
- Accessibility standards met
