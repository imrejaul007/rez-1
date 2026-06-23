# Phase 4: UGC Report System - Testing Documentation

## Overview

This document provides comprehensive testing instructions for the UGC video reporting system implemented in Phase 4. The system allows users to report inappropriate or problematic video content through an intuitive modal interface with toast feedback.

## Table of Contents

1. [Manual Testing Checklist](#manual-testing-checklist)
2. [Edge Cases](#edge-cases)
3. [Backend API Testing](#backend-api-testing)
4. [Performance Testing](#performance-testing)
5. [Accessibility Testing](#accessibility-testing)
6. [Visual Testing](#visual-testing)
7. [Error Scenarios](#error-scenarios)

---

## Manual Testing Checklist

### Prerequisites
- Ensure the app is running (`npm start`)
- Have at least one UGC video available in the system
- Have both authenticated and unauthenticated test accounts ready

### Test Scenario 1: Authenticated User Reports Video

**Steps:**
1. Sign in to the app with a valid account
2. Navigate to the Play tab (`/play`)
3. Tap on any video card to open UGCDetailScreen
4. Locate the "Report" button in the top right header
5. Tap the "Report" button

**Expected Results:**
- Report modal slides up from bottom with smooth animation
- Modal displays with white background and rounded top corners
- Header shows "Report Video" title with close button
- Video description/title is displayed below header
- Drag indicator is visible at top of modal
- All 5 report reasons are displayed with radio buttons
- Optional text input field is shown
- Submit and Cancel buttons are visible at bottom

### Test Scenario 2: Select Report Reason

**Steps:**
1. In the open report modal, tap on "Inappropriate content"
2. Observe the visual feedback
3. Tap on "Spam or scam" to change selection
4. Tap the same option again

**Expected Results:**
- Tapping a reason highlights it with purple border (#6366F1)
- Radio button shows inner circle when selected
- Previously selected reason becomes unselected
- Only one reason can be selected at a time
- Background color changes to light purple (#EEF2FF)
- Any previous error message is cleared

### Test Scenario 3: Add Additional Details

**Steps:**
1. Select a report reason
2. Tap on the "Additional details" text input
3. Type "This video contains misleading product information"
4. Continue typing until reaching 500 characters

**Expected Results:**
- Keyboard appears
- Text input accepts typing
- Character count updates in real-time (e.g., "45/500")
- Input stops accepting characters at 500
- Character count shows "500/500" in red or warning color
- Text is multiline and wraps properly

### Test Scenario 4: Submit Valid Report

**Steps:**
1. Select a report reason (e.g., "Misleading information")
2. Optionally add details
3. Tap "Submit Report" button

**Expected Results:**
- Submit button shows loading spinner
- Both buttons become disabled during submission
- Modal closes automatically upon success
- Success toast appears at top of screen
- Toast message: "Thank you for your report. We'll review it shortly."
- Toast has green background (#10b981)
- Toast displays checkmark icon
- Toast auto-dismisses after 3 seconds
- Report button changes to "Reported" with gray color
- Report button shows filled flag icon
- Report button becomes disabled

### Test Scenario 5: Unauthenticated User Attempts Report

**Steps:**
1. Sign out of the app
2. Navigate to a video detail screen
3. Tap the "Report" button

**Expected Results:**
- Alert dialog appears
- Alert title: "Sign In Required"
- Alert message: "Please sign in to report videos"
- Two buttons: "Cancel" and "Sign In"
- Tapping "Sign In" navigates to sign-in page
- Tapping "Cancel" dismisses alert
- Report modal does NOT open

### Test Scenario 6: User Tries to Report Already Reported Video

**Steps:**
1. Report a video successfully (completing Test Scenario 4)
2. Tap the "Reported" button again

**Expected Results:**
- Alert appears with title "Already Reported"
- Alert message: "You have already reported this video."
- Button is disabled and cannot be pressed
- Button shows gray styling
- Icon is filled flag (not outline)

### Test Scenario 7: Cancel Report Submission

**Steps:**
1. Open report modal
2. Select a reason
3. Add some details
4. Tap "Cancel" button

**Expected Results:**
- Modal slides down and closes
- No API call is made
- Form is reset (reason and details cleared)
- No toast is displayed
- Report button remains in "Report" state

### Test Scenario 8: Close Modal via Overlay

**Steps:**
1. Open report modal
2. Tap outside the modal on the dark overlay

**Expected Results:**
- Modal closes smoothly
- Form is reset
- Same behavior as canceling

### Test Scenario 9: Close Modal via Close Button

**Steps:**
1. Open report modal
2. Tap the X close button in header

**Expected Results:**
- Modal closes immediately
- Form is reset
- Same behavior as canceling

---

## Edge Cases

### Edge Case 1: Submit Without Selecting Reason

**Steps:**
1. Open report modal
2. Type details but don't select a reason
3. Try to tap "Submit Report"

**Expected Results:**
- Submit button is disabled (grayed out)
- Button doesn't respond to taps
- No API call is made

### Edge Case 2: Network Failure During Submission

**Steps:**
1. Turn off WiFi/data
2. Open report modal and select reason
3. Tap Submit

**Expected Results:**
- Error toast appears
- Toast is red (#ef4444)
- Message: "Failed to submit report. Please check your connection."
- Modal remains open
- User can try again or cancel

### Edge Case 3: 500 Character Details Limit

**Steps:**
1. Open report modal
2. Paste or type exactly 500 characters
3. Try to add more characters

**Expected Results:**
- Input stops at 500 characters
- Counter shows "500/500"
- Validation prevents submission over limit

### Edge Case 4: Rapid Button Tapping

**Steps:**
1. Select a reason
2. Rapidly tap "Submit Report" button multiple times

**Expected Results:**
- Button becomes disabled after first tap
- Only one API call is made
- Loading spinner shows
- Subsequent taps have no effect

### Edge Case 5: Video ID Missing or Invalid

**Steps:**
1. Manually navigate to UGCDetailScreen with invalid/missing videoId
2. Try to report

**Expected Results:**
- Error is handled gracefully
- Toast shows: "Video not found."
- Modal can be closed

### Edge Case 6: Backend Returns 429 (Rate Limit)

**Steps:**
1. Submit multiple reports quickly
2. Trigger rate limiting

**Expected Results:**
- Error toast appears
- Message: "Too many requests. Please try again later."
- User can close modal and try later

### Edge Case 7: Backend Returns 401 (Unauthorized)

**Steps:**
1. Submit report with expired/invalid auth token
2. Observe error handling

**Expected Results:**
- Error toast: "Please sign in to report videos."
- User should be prompted to re-authenticate

---

## Backend API Testing

### API Endpoint
```
POST /api/videos/:videoId/report
```

### Test with cURL

#### Test 1: Valid Report Submission
```bash
curl -X POST \
  http://localhost:5000/api/videos/VIDEO_ID_HERE/report \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  -d '{
    "reason": "spam",
    "details": "This video is promoting a scam product"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "videoId": "VIDEO_ID_HERE",
    "reportCount": 1,
    "isReported": true
  }
}
```

#### Test 2: Duplicate Report
```bash
# Run the same cURL command twice
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "You have already reported this video"
}
```

#### Test 3: Missing Reason
```bash
curl -X POST \
  http://localhost:5000/api/videos/VIDEO_ID_HERE/report \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  -d '{
    "details": "Missing reason field"
  }'
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Report reason is required"
}
```

#### Test 4: Unauthenticated Request
```bash
curl -X POST \
  http://localhost:5000/api/videos/VIDEO_ID_HERE/report \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "spam"
  }'
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### Test 5: Invalid Video ID
```bash
curl -X POST \
  http://localhost:5000/api/videos/INVALID_ID/report \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  -d '{
    "reason": "spam"
  }'
```

**Expected Response (404):**
```json
{
  "success": false,
  "message": "Video not found"
}
```

### Backend Database Verification

After submitting a report, verify in MongoDB:

```javascript
// Find the video document
db.videos.findOne({ _id: ObjectId("VIDEO_ID") });

// Should show:
{
  "_id": ObjectId("VIDEO_ID"),
  "reports": [
    {
      "userId": ObjectId("USER_ID"),
      "reason": "spam",
      "details": "This video is promoting a scam product",
      "createdAt": ISODate("2025-01-08T12:00:00Z")
    }
  ],
  "reportCount": 1,
  "isFlagged": false  // true if reportCount >= 5
}
```

### Auto-Flagging Test

Submit 5 reports from different users and verify:
```javascript
db.videos.findOne({ _id: ObjectId("VIDEO_ID") }).isFlagged
// Should return: true
```

---

## Performance Testing

### Test 1: Modal Animation Smoothness
- Open modal on various devices (iOS, Android, Web)
- Animation should be 60 FPS
- No jank or stuttering
- Slide-up animation completes in ~300ms

### Test 2: Toast Display Timing
- Toast should appear within 100ms of success
- Auto-dismiss should occur exactly at 3000ms
- Fade out animation should be smooth

### Test 3: API Response Time
- Report submission should complete in < 1 second
- Loading spinner should be visible if > 300ms
- No UI blocking during submission

### Test 4: Memory Leaks
- Open and close modal 20 times
- Monitor app memory usage
- Should not increase significantly

---

## Accessibility Testing

### Screen Reader Testing

1. Enable TalkBack (Android) or VoiceOver (iOS)
2. Navigate to video detail screen
3. Test the following:

**Report Button:**
- Should announce: "Report video, button" or "Already reported, button"
- Double tap to activate

**Modal Elements:**
- Title: "Report Video, heading"
- Close button: "Close, button"
- Each reason: "Report reason: Inappropriate content, radio button, not checked/checked"
- Text input: "Additional details, optional, text field"
- Submit button: "Submit Report, button"
- Cancel button: "Cancel, button"

### Keyboard Navigation (Web)

1. Open modal
2. Press Tab to navigate
3. Press Space/Enter to select

**Expected:**
- Tab order: Close → Reasons → Text input → Cancel → Submit
- Selected reason is visually highlighted
- Enter key submits form if valid
- Escape key closes modal

---

## Visual Testing

### Test 1: Report Button States

**Normal State:**
- White background (#FFFFFF)
- Red text and icon (#EF4444)
- Text: "Report"
- Icon: flag-outline

**Reported State:**
- Light gray background (#F3F4F6)
- Gray text and icon (#9CA3AF)
- Text: "Reported"
- Icon: flag (filled)

### Test 2: Modal Visual Design

**Header:**
- Drag indicator: 40px wide, 4px height, gray (#E5E7EB)
- Title: 20px, bold (700), dark gray (#111827)
- Close button: X icon, 24px, gray (#666)

**Reason Cards:**
- Unselected: Light gray background (#F9FAFB), 2px gray border
- Selected: Light purple background (#EEF2FF), 2px purple border (#6366F1)
- Radio button: 20px circle, purple when selected

**Buttons:**
- Cancel: White background, gray border, gray text
- Submit: Purple gradient (#7C3AED → #6366F1), white text, white flag icon
- Disabled: Gray (#D1D5DB), 50% opacity

### Test 3: Toast Visual Design

**Success Toast:**
- Background: Green (#10b981)
- Icon: Checkmark circle, white
- Text: White, 15px, bold (600)
- Position: Top of screen, 16px padding
- Shadow: Dark with elevation

**Error Toast:**
- Background: Red (#ef4444)
- Icon: Close circle, white
- Text: White, 15px, bold (600)
- Same positioning and shadow

---

## Error Scenarios

### Scenario 1: Network Timeout
```javascript
// Simulate in browser DevTools
// Network tab → Offline
```
**Expected:** "Failed to submit report. Please check your connection."

### Scenario 2: Server Error (500)
**Expected:** "Something went wrong. Please try again later."

### Scenario 3: Invalid Auth Token
**Expected:** "Please sign in to report videos."

### Scenario 4: Validation Error
**Expected:** Display specific error message from API

### Scenario 5: Rate Limiting
**Expected:** "Too many requests. Please try again later."

---

## Test Results Template

Use this template to document test results:

```markdown
## Test Session: [Date]
**Tester:** [Name]
**Device:** [iOS 15 / Android 12 / Web Chrome]
**Build:** [Version]

### Manual Tests
- [ ] Scenario 1: Authenticated user reports ✓/✗
- [ ] Scenario 2: Select report reason ✓/✗
- [ ] Scenario 3: Add details ✓/✗
- [ ] Scenario 4: Submit valid report ✓/✗
- [ ] Scenario 5: Unauthenticated attempt ✓/✗
- [ ] Scenario 6: Already reported ✓/✗
- [ ] Scenario 7: Cancel submission ✓/✗
- [ ] Scenario 8: Close via overlay ✓/✗
- [ ] Scenario 9: Close via button ✓/✗

### Edge Cases
- [ ] Edge Case 1-7 ✓/✗

### Issues Found
1. [Description]
2. [Description]

### Screenshots
[Attach screenshots of success/error states]
```

---

## Automation Test Examples

### Jest Unit Test Example

```typescript
// __tests__/components/ugc/ReportModal.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReportModal from '@/components/ugc/ReportModal';

describe('ReportModal', () => {
  it('disables submit button when no reason selected', () => {
    const { getByText } = render(
      <ReportModal
        visible={true}
        videoId="123"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    const submitButton = getByText('Submit Report');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when reason selected', () => {
    const { getByText } = render(
      <ReportModal
        visible={true}
        videoId="123"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    fireEvent.press(getByText('Spam or scam'));
    const submitButton = getByText('Submit Report');
    expect(submitButton).toBeEnabled();
  });

  it('calls onSubmit with correct data', async () => {
    const onSubmit = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <ReportModal
        visible={true}
        videoId="123"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(getByText('Spam or scam'));
    fireEvent.changeText(
      getByPlaceholderText(/Provide more context/),
      'Test details'
    );
    fireEvent.press(getByText('Submit Report'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('spam', 'Test details');
    });
  });
});
```

---

## Summary

This testing documentation covers:
- ✅ 9 Manual test scenarios
- ✅ 7 Edge cases
- ✅ 5 API tests with cURL commands
- ✅ Performance testing criteria
- ✅ Accessibility requirements
- ✅ Visual design verification
- ✅ Error handling scenarios
- ✅ Test results template
- ✅ Automation test examples

**Estimated Testing Time:** 45-60 minutes for complete manual test pass

**Recommended Testing Frequency:**
- Full test pass: Before each release
- Smoke test (Scenarios 1-4): Daily during development
- Edge cases: Weekly
- Performance: Monthly

---

## Next Steps

After completing testing:
1. Document any bugs found in issue tracker
2. Verify fixes with regression testing
3. Update this document with new edge cases discovered
4. Add automated tests for critical paths
5. Perform load testing if needed
