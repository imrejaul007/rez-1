# Referral System QA Test Scenarios

## Overview
Comprehensive test scenarios covering all aspects of the referral system across iOS, Android, and Web platforms.

**Test Environment**: Staging → Production
**Platforms**: iOS 14+, Android 10+, Web (Chrome, Safari, Firefox)
**Test Cycle**: Pre-Production Launch

---

## Test Scenario Categories

1. [Functional Testing](#1-functional-testing) (20 scenarios)
2. [Cross-Platform Testing](#2-cross-platform-testing) (15 scenarios)
3. [Accessibility Testing](#3-accessibility-testing) (10 scenarios)
4. [Security Testing](#4-security-testing) (12 scenarios)
5. [Performance Testing](#5-performance-testing) (8 scenarios)
6. [Edge Cases & Error Handling](#6-edge-cases--error-handling) (15 scenarios)

**Total Scenarios**: 80

---

## 1. Functional Testing

### 1.1 Referral Page Load
**Priority**: Critical
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open app and navigate to referral page | Loading indicator shown | ⬜ |
| 2 | Wait for data load | Referral code displayed (not "LOADING...") | ⬜ |
| 3 | Verify stats section | Total referrals and earnings displayed | ⬜ |
| 4 | Verify "How it Works" section | 3 steps displayed with icons | ⬜ |
| 5 | Scroll to bottom | Terms & conditions visible | ⬜ |

**Pass Criteria**: All elements load within 2 seconds
**Bug Report**: ________________

---

### 1.2 Copy Referral Code
**Priority**: Critical
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to referral page | Referral code visible in dashed box | ⬜ |
| 2 | Tap copy button (circular purple button) | Copy icon changes to checkmark | ⬜ |
| 3 | See alert | "Copied!" alert shown | ⬜ |
| 4 | Open notes app and paste | Referral code pasted correctly | ⬜ |
| 5 | Wait 2 seconds | Copy icon reverts to copy symbol | ⬜ |

**Pass Criteria**: Code copied to clipboard, visual feedback shown
**Bug Report**: ________________

---

### 1.3 Share Referral via ShareModal
**Priority**: Critical
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to referral page | See "Share with Friends" button | ⬜ |
| 2 | Tap "Share with Friends" | ShareModal opens from bottom | ⬜ |
| 3 | Verify QR code section | QR code generated and visible | ⬜ |
| 4 | Verify referral code section | Code displayed with copy button | ⬜ |
| 5 | Verify referral link section | Full link displayed with copy icon | ⬜ |
| 6 | Verify share platforms | 6 platforms visible (WhatsApp, Facebook, Instagram, Telegram, SMS, Email) | ⬜ |
| 7 | Scroll to top | Tier progress shown (if applicable) | ⬜ |

**Pass Criteria**: Modal opens smoothly, all elements visible
**Bug Report**: ________________

---

### 1.4 Share via WhatsApp
**Priority**: High
**Platform**: iOS, Android

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open ShareModal | See WhatsApp icon (green) | ⬜ |
| 2 | Tap WhatsApp icon | WhatsApp app opens | ⬜ |
| 3 | Verify message content | Pre-filled message with code and link | ⬜ |
| 4 | Select contact and send | Message sent successfully | ⬜ |
| 5 | Return to app | ShareModal still visible or closed gracefully | ⬜ |

**Pass Criteria**: WhatsApp opens with pre-filled message
**Bug Report**: ________________

---

### 1.5 Share via SMS
**Priority**: High
**Platform**: iOS, Android

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open ShareModal | See SMS icon (green message bubble) | ⬜ |
| 2 | Tap SMS icon | Native SMS app opens | ⬜ |
| 3 | Verify message content | "Hey! Join REZ and get ₹30 off. Code: [CODE] [LINK]" | ⬜ |
| 4 | Add recipient and send | Message sent successfully | ⬜ |
| 5 | Return to app | App state preserved | ⬜ |

**Pass Criteria**: SMS app opens with pre-filled message
**Bug Report**: ________________

---

### 1.6 Share via Email
**Priority**: Medium
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open ShareModal | See Email icon (purple mail icon) | ⬜ |
| 2 | Tap Email icon | Email client opens (or picker shown) | ⬜ |
| 3 | Verify subject | "Get ₹30 off on REZ - My referral gift!" | ⬜ |
| 4 | Verify body | Formatted message with code and link | ⬜ |
| 5 | Add recipient and send | Email sent successfully | ⬜ |

**Pass Criteria**: Email client opens with pre-filled content
**Bug Report**: ________________

---

### 1.7 QR Code Generation
**Priority**: High
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open ShareModal | QR code visible in center | ⬜ |
| 2 | Scan QR with another device | QR code scans successfully | ⬜ |
| 3 | Verify redirect | Opens referral link in browser | ⬜ |
| 4 | Test deep link | If app installed, opens app with referral code | ⬜ |
| 5 | Close and reopen modal | Same QR code shown (memoized) | ⬜ |

**Pass Criteria**: QR code scans and redirects correctly
**Bug Report**: ________________

---

### 1.8 Copy Referral Link
**Priority**: Medium
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open ShareModal | See referral link section | ⬜ |
| 2 | Tap on link container | "Copied!" alert shown | ⬜ |
| 3 | Open browser and paste | Full link pasted (https://rezapp.com/invite/...) | ⬜ |
| 4 | Open link in browser | Redirects to app or web signup | ⬜ |

**Pass Criteria**: Link copied and works correctly
**Bug Report**: ________________

---

### 1.9 Referral Statistics Display
**Priority**: High
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to referral page with 0 referrals | Shows "0" for total referrals, "₹0" for earnings | ⬜ |
| 2 | Make 3 referrals (backend setup) | Stats update to show 3 referrals | ⬜ |
| 3 | Complete 1 referral (backend) | Earnings update, pending section shown | ⬜ |
| 4 | Pull to refresh | Stats reload and update | ⬜ |

**Pass Criteria**: Stats accurately reflect backend data
**Bug Report**: ________________

---

### 1.10 Referral History Display
**Priority**: Medium
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to referral page with history | "Referral History" section visible | ⬜ |
| 2 | Verify first item | Shows name (or anonymized), status badge, reward amount, date | ⬜ |
| 3 | Check status colors | Green (completed), Orange (active), Gray (pending), Red (expired) | ⬜ |
| 4 | Verify email anonymization | Email shows as "m***@gmail.com" format | ⬜ |
| 5 | Verify date format | Shows as "15 Jan 2025" format | ⬜ |

**Pass Criteria**: History displays correctly with anonymized PII
**Bug Report**: ________________

---

### 1.11 Pull to Refresh
**Priority**: Medium
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to referral page | Content loaded | ⬜ |
| 2 | Pull down from top | Refresh indicator appears | ⬜ |
| 3 | Release | API call triggered, data refreshes | ⬜ |
| 4 | Verify updates | Stats, history updated if changed | ⬜ |
| 5 | Pull while offline | Shows appropriate error message | ⬜ |

**Pass Criteria**: Refresh works, error handling graceful
**Bug Report**: ________________

---

### 1.12 Dashboard Navigation
**Priority**: High
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to referral page | See "View Full Dashboard" button with gradient | ⬜ |
| 2 | Tap button | Navigates to /referral/dashboard | ⬜ |
| 3 | Verify dashboard loads | Shows tier badge, stats, progress bar | ⬜ |
| 4 | Tap back button | Returns to referral page | ⬜ |
| 5 | Verify state preserved | Previous scroll position maintained | ⬜ |

**Pass Criteria**: Navigation smooth, state preserved
**Bug Report**: ________________

---

### 1.13 Dashboard Tier Display
**Priority**: High
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to dashboard (STARTER tier) | Purple gradient header, "STARTER" tier badge | ⬜ |
| 2 | Verify stats row | Shows qualified referrals, earnings, success rate | ⬜ |
| 3 | Check progress section | "Progress to PRO" with progress bar | ⬜ |
| 4 | View next tier rewards | Lists tier bonus, voucher, premium (if applicable) | ⬜ |

**Pass Criteria**: Tier system displays correctly
**Bug Report**: ________________

---

### 1.14 Dashboard Leaderboard
**Priority**: Medium
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to dashboard | Scroll to leaderboard section | ⬜ |
| 2 | Verify user rank card | Yellow card with trophy icon, shows rank and referrals | ⬜ |
| 3 | View top 5 leaderboard | Shows rank, name, referrals, earnings, tier badge | ⬜ |
| 4 | Tap "View All" | (Future: navigates to full leaderboard page) | ⬜ |

**Pass Criteria**: Leaderboard displays correctly
**Bug Report**: ________________

---

### 1.15 Dashboard Claimable Rewards
**Priority**: High
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to dashboard with claimable rewards | "Claimable Rewards" section visible | ⬜ |
| 2 | Verify reward card | Shows reward type icon, description, amount | ⬜ |
| 3 | Tap "Claim" button | API call triggered | ⬜ |
| 4 | Verify success | "Success" alert, reward disappears from list | ⬜ |
| 5 | Check wallet | Reward credited to user balance | ⬜ |

**Pass Criteria**: Rewards can be claimed successfully
**Bug Report**: ________________

---

### 1.16 Dashboard Share Section
**Priority**: Medium
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to dashboard | See "Invite Friends" gradient button | ⬜ |
| 2 | Verify reward amount | Shows "Earn ₹[X] per referral" based on tier | ⬜ |
| 3 | View referral code box | Code displayed with "Copy Code" button | ⬜ |
| 4 | Tap "Invite Friends" | (Future: navigates to share page or opens modal) | ⬜ |
| 5 | Tap "Copy Code" | Code copied to clipboard | ⬜ |

**Pass Criteria**: Share section functional
**Bug Report**: ________________

---

### 1.17 Back Navigation
**Priority**: High
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to referral page | See back arrow in header | ⬜ |
| 2 | Tap back arrow | Returns to previous screen | ⬜ |
| 3 | Open ShareModal | Modal visible | ⬜ |
| 4 | Tap backdrop | Modal closes | ⬜ |
| 5 | Use device back button (Android) | App navigates back | ⬜ |

**Pass Criteria**: All navigation paths work correctly
**Bug Report**: ________________

---

### 1.18 Authentication Check
**Priority**: Critical
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Log out of app | Logged out state | ⬜ |
| 2 | Try to navigate to /referral | (Should not be possible or redirects) | ⬜ |
| 3 | Sign in | Authentication successful | ⬜ |
| 4 | Navigate to referral page | Page loads with user data | ⬜ |
| 5 | Log out while on referral page | Alert shown, redirected to sign-in | ⬜ |

**Pass Criteria**: Authentication required, proper redirects
**Bug Report**: ________________

---

### 1.19 Terms & Conditions Display
**Priority**: Low
**Platform**: All

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to referral page | Scroll to bottom | ⬜ |
| 2 | View terms card | Gray card with terms text | ⬜ |
| 3 | Read all bullet points | 5 terms listed correctly | ⬜ |
| 4 | Verify text formatting | Bullets, line breaks correct | ⬜ |

**Pass Criteria**: Terms displayed correctly
**Bug Report**: ________________

---

### 1.20 Tier Progression (End-to-End)
**Priority**: Critical
**Platform**: All (Backend + Frontend)

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Start with 0 referrals (STARTER) | Tier shows STARTER | ⬜ |
| 2 | Make 5 successful referrals | Tier upgrades to PRO | ⬜ |
| 3 | Check dashboard | Progress bar shows 0% to next tier | ⬜ |
| 4 | Receive tier bonus | Reward credited to wallet | ⬜ |
| 5 | Make 15 more referrals (20 total) | Tier upgrades to ELITE | ⬜ |

**Pass Criteria**: Tier progression works correctly
**Bug Report**: ________________

---

## 2. Cross-Platform Testing

### 2.1 iOS 14 (iPhone 8)
**Priority**: High

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Referral page load | No layout overflow, all elements visible | ⬜ |
| Touch | Tap copy button | Button responds, code copied | ⬜ |
| Share | WhatsApp share | Opens WhatsApp correctly | ⬜ |
| QR Code | QR generation | QR code displays correctly | ⬜ |
| Clipboard | Copy functionality | Clipboard API works | ⬜ |

**Pass Criteria**: All features work on iOS 14
**Bug Report**: ________________

---

### 2.2 iOS 17 (iPhone 15 Pro)
**Priority**: High

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Referral page | Utilizes Dynamic Island correctly | ⬜ |
| Performance | Page load | <1.5s load time | ⬜ |
| Animations | Modal open/close | Smooth 60fps animations | ⬜ |
| Haptics | Button press | Haptic feedback on interactions | ⬜ |
| Dark Mode | Toggle dark mode | Colors adapt correctly | ⬜ |

**Pass Criteria**: Optimized for latest iOS
**Bug Report**: ________________

---

### 2.3 iOS (iPad Pro 12.9")
**Priority**: Medium

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Referral page | Layout adapts to large screen | ⬜ |
| Modal | ShareModal size | Modal sized appropriately (not full screen) | ⬜ |
| Touch | Touch targets | 44x44pt minimum maintained | ⬜ |
| Split View | Run in split view | Layout responsive | ⬜ |

**Pass Criteria**: Tablet layout optimized
**Bug Report**: ________________

---

### 2.4 Android 10 (Samsung Galaxy S10)
**Priority**: High

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Referral page | Material design respected | ⬜ |
| Share | Native share sheet | Android share picker works | ⬜ |
| Back Button | Hardware back | Navigates correctly | ⬜ |
| Clipboard | Copy code | Clipboard API works | ⬜ |
| Performance | Page load | <2s load time | ⬜ |

**Pass Criteria**: Works on Android 10
**Bug Report**: ________________

---

### 2.5 Android 14 (Google Pixel 8)
**Priority**: High

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Referral page | Uses Material You theming | ⬜ |
| Performance | Page load | <1.5s load time | ⬜ |
| Animations | Modal transitions | Smooth animations | ⬜ |
| Share | Native share | Android 14 share picker works | ⬜ |
| Permissions | Clipboard | No permission prompt (Android 14+) | ⬜ |

**Pass Criteria**: Optimized for Android 14
**Bug Report**: ________________

---

### 2.6 Android (Samsung Galaxy Fold 5)
**Priority**: Medium

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Folded | Referral page | Layout adapts to narrow screen | ⬜ |
| Unfolded | Referral page | Layout adapts to wide screen | ⬜ |
| Transition | Fold while viewing | App handles transition gracefully | ⬜ |
| Modal | ShareModal | Modal positioned correctly | ⬜ |

**Pass Criteria**: Foldable support works
**Bug Report**: ________________

---

### 2.7 Web (Chrome Desktop)
**Priority**: High

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Referral page | Responsive design, centered content | ⬜ |
| Share | Share button | Falls back to clipboard copy or native share | ⬜ |
| QR Code | QR display | QR code renders correctly | ⬜ |
| Keyboard | Tab navigation | Can navigate with keyboard | ⬜ |
| Responsive | Resize window | Layout adapts smoothly | ⬜ |

**Pass Criteria**: Web version functional
**Bug Report**: ________________

---

### 2.8 Web (Safari Desktop)
**Priority**: Medium

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Referral page | No webkit-specific issues | ⬜ |
| Clipboard | Copy code | Clipboard API works in Safari | ⬜ |
| Permissions | Clipboard prompt | User prompted appropriately | ⬜ |
| QR Code | QR display | SVG renders correctly | ⬜ |

**Pass Criteria**: Safari compatible
**Bug Report**: ________________

---

### 2.9 Web (Mobile Chrome)
**Priority**: High

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Referral page | Mobile layout, no horizontal scroll | ⬜ |
| Touch | Touch targets | 48x48px minimum for touch | ⬜ |
| Share | Native share | Uses Web Share API if available | ⬜ |
| Performance | Page load | <2s on 4G | ⬜ |

**Pass Criteria**: Mobile web optimized
**Bug Report**: ________________

---

### 2.10 Landscape Orientation (iOS)
**Priority**: Low

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Rotate to landscape | Layout adapts, no overflow | ⬜ |
| Modal | ShareModal | Modal height adjusted | ⬜ |
| Scroll | Scrolling | Can scroll through all content | ⬜ |

**Pass Criteria**: Landscape support works
**Bug Report**: ________________

---

### 2.11 Landscape Orientation (Android)
**Priority**: Low

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Layout | Rotate to landscape | Layout adapts correctly | ⬜ |
| State | Orientation change | State preserved during rotation | ⬜ |
| Modal | ShareModal | Modal responsive to landscape | ⬜ |

**Pass Criteria**: Landscape support works
**Bug Report**: ________________

---

### 2.12 Dark Mode (iOS)
**Priority**: Medium

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Colors | Referral page | Dark mode colors applied | ⬜ |
| Contrast | Text readability | All text readable (WCAG AA) | ⬜ |
| Images | QR code | QR code visible in dark mode | ⬜ |
| Modal | ShareModal | Modal uses dark theme | ⬜ |

**Pass Criteria**: Dark mode fully supported
**Bug Report**: ________________

---

### 2.13 Dark Mode (Android)
**Priority**: Medium

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Colors | Referral page | Dark mode colors applied | ⬜ |
| System | Toggle system dark mode | App follows system setting | ⬜ |
| Contrast | Text readability | All text readable | ⬜ |

**Pass Criteria**: Dark mode works on Android
**Bug Report**: ________________

---

### 2.14 Font Scaling (iOS Accessibility)
**Priority**: Medium

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Small Font | Set to smallest size | All text readable, layout intact | ⬜ |
| Large Font | Set to largest size | Text scales, no overflow | ⬜ |
| Extra Large | Set to XXL (accessibility) | Layout adapts, scrollable | ⬜ |

**Pass Criteria**: Font scaling supported
**Bug Report**: ________________

---

### 2.15 Font Scaling (Android Accessibility)
**Priority**: Medium

| Component | Test | Expected Result | Status |
|-----------|------|-----------------|--------|
| Small Font | Set to smallest size | All text readable | ⬜ |
| Large Font | Set to largest size | Text scales correctly | ⬜ |
| Extra Large | Set to XXL | Layout adapts | ⬜ |

**Pass Criteria**: Font scaling works
**Bug Report**: ________________

---

## 3. Accessibility Testing

### 3.1 VoiceOver Navigation (iOS)
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Enable VoiceOver | VoiceOver announces screen | ⬜ |
| 2 | Swipe to referral code | Announces "Your Referral Code: [CODE]" | ⬜ |
| 3 | Swipe to copy button | Announces "Copy referral code button" | ⬜ |
| 4 | Double-tap to activate | Code copied, confirmation announced | ⬜ |
| 5 | Swipe through share button | Announces "Share with Friends button" | ⬜ |

**Pass Criteria**: All elements have proper labels, navigation logical
**Bug Report**: ________________

---

### 3.2 TalkBack Navigation (Android)
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Enable TalkBack | TalkBack announces screen | ⬜ |
| 2 | Swipe to referral code | Announces code and purpose | ⬜ |
| 3 | Swipe to copy button | Announces action and state | ⬜ |
| 4 | Double-tap to activate | Code copied, feedback provided | ⬜ |
| 5 | Navigate through history | Each item announced clearly | ⬜ |

**Pass Criteria**: All interactive elements accessible
**Bug Report**: ________________

---

### 3.3 Keyboard Navigation (Web)
**Priority**: Medium

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Press Tab from top | Focus moves to back button | ⬜ |
| 2 | Continue tabbing | Focus moves through interactive elements in logical order | ⬜ |
| 3 | Tab to copy button | Focus visible, button outlined | ⬜ |
| 4 | Press Enter | Code copied | ⬜ |
| 5 | Tab to share button | Can activate with Enter | ⬜ |

**Pass Criteria**: All interactive elements keyboard accessible
**Bug Report**: ________________

---

### 3.4 Color Contrast (WCAG AA)
**Priority**: High

| Element | FG Color | BG Color | Ratio | Required | Status |
|---------|----------|----------|-------|----------|--------|
| Referral code | #8B5CF6 | #F3F4F6 | ___ | 4.5:1 | ⬜ |
| Stats values | #8B5CF6 | #FFFFFF | ___ | 4.5:1 | ⬜ |
| Step descriptions | #6B7280 | #FFFFFF | ___ | 4.5:1 | ⬜ |
| Terms text | #6B7280 | #F3F4F6 | ___ | 4.5:1 | ⬜ |

**Pass Criteria**: All text meets WCAG AA (4.5:1 for text, 3:1 for large text)
**Bug Report**: ________________

---

### 3.5 Touch Target Size
**Priority**: High

| Element | Size | Minimum | Pass |
|---------|------|---------|------|
| Copy button | ___ x ___ | 44x44pt | ⬜ |
| Share button | ___ x ___ | 44x44pt | ⬜ |
| Dashboard button | ___ x ___ | 44x44pt | ⬜ |
| Back button | ___ x ___ | 44x44pt | ⬜ |
| ShareModal close | ___ x ___ | 44x44pt | ⬜ |

**Pass Criteria**: All interactive elements >= 44x44pt (iOS) or 48x48dp (Android)
**Bug Report**: ________________

---

### 3.6 Focus Indicators (Web)
**Priority**: Medium

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Tab to copy button | Visible focus ring/outline | ⬜ |
| 2 | Tab to share button | Visible focus indicator | ⬜ |
| 3 | Open ShareModal | Focus moves to modal | ⬜ |
| 4 | Tab through modal | Focus trapped in modal | ⬜ |
| 5 | Close modal | Focus returns to trigger button | ⬜ |

**Pass Criteria**: Focus always visible, focus management correct
**Bug Report**: ________________

---

### 3.7 Screen Reader Announcements
**Priority**: High

| Action | Expected Announcement | Status |
|--------|----------------------|--------|
| Page load | "Refer & Earn. Your Referral Code: [CODE]" | ⬜ |
| Copy code | "Copied. Referral code copied to clipboard" | ⬜ |
| Pull to refresh | "Refreshing. Loading new referral data" | ⬜ |
| Error | "Error. Failed to load referral data" | ⬜ |
| Tier upgrade | "Congratulations! You've reached PRO tier" | ⬜ |

**Pass Criteria**: All state changes announced
**Bug Report**: ________________

---

### 3.8 Semantic HTML (Web)
**Priority**: Medium

| Element | Expected Tag | Actual | Status |
|---------|-------------|--------|--------|
| Page title | `<h1>` | ___ | ⬜ |
| Section titles | `<h2>` | ___ | ⬜ |
| Copy button | `<button>` | ___ | ⬜ |
| Share button | `<button>` | ___ | ⬜ |
| Referral history | `<ul>` or `<ol>` | ___ | ⬜ |

**Pass Criteria**: Proper semantic HTML used
**Bug Report**: ________________

---

### 3.9 Reduced Motion
**Priority**: Low

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Enable "Reduce Motion" (iOS/Android) | System setting enabled | ⬜ |
| 2 | Open ShareModal | Modal appears without slide animation | ⬜ |
| 3 | Navigate pages | Transitions simplified or removed | ⬜ |
| 4 | Pull to refresh | Indicator animation reduced | ⬜ |

**Pass Criteria**: Respects reduced motion preference
**Bug Report**: ________________

---

### 3.10 Accessibility Hints
**Priority**: Medium

| Element | Accessibility Hint | Status |
|---------|-------------------|--------|
| Back button | "Returns to previous screen" | ⬜ |
| Copy button | "Copies your referral code to clipboard" | ⬜ |
| Share button | "Opens share menu to invite friends" | ⬜ |
| Dashboard button | "Opens the full referral dashboard with tier progression and leaderboard" | ⬜ |

**Pass Criteria**: All interactive elements have helpful hints
**Bug Report**: ________________

---

## 4. Security Testing

### 4.1 Authentication Token Handling
**Priority**: Critical

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Inspect network requests | Authorization header present | ⬜ |
| 2 | Check token format | Valid JWT format | ⬜ |
| 3 | Token expiration | Expired token triggers refresh | ⬜ |
| 4 | Invalid token | Shows authentication error, redirects to sign-in | ⬜ |
| 5 | Token in logs | Token NOT logged in console | ⬜ |

**Pass Criteria**: Token handled securely, never exposed
**Bug Report**: ________________

---

### 4.2 API Authorization
**Priority**: Critical

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Call `/referral/statistics` without token | Returns 401 Unauthorized | ⬜ |
| 2 | Call with invalid token | Returns 401 Unauthorized | ⬜ |
| 3 | Call with another user's token | Can only see own data | ⬜ |
| 4 | Attempt to access other user's referrals | Returns 403 Forbidden | ⬜ |

**Pass Criteria**: All endpoints properly secured
**Bug Report**: ________________

---

### 4.3 PII Anonymization
**Priority**: High (GDPR)

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | View referral history | Emails anonymized (m***@gmail.com) | ⬜ |
| 2 | Inspect network response | Full email in API response (OK for own data) | ⬜ |
| 3 | View leaderboard | Names anonymized for other users | ⬜ |
| 4 | Copy referral link | No PII in link | ⬜ |
| 5 | Share via social | No PII in share message | ⬜ |

**Pass Criteria**: PII anonymized in UI (line 433 implemented)
**Bug Report**: ________________

---

### 4.4 Input Validation (Referral Code)
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Enter referral code with special chars | Rejected or sanitized | ⬜ |
| 2 | Enter very long code (>100 chars) | Truncated or rejected | ⬜ |
| 3 | Enter SQL injection attempt | Sanitized, no error | ⬜ |
| 4 | Enter XSS payload | Escaped, not executed | ⬜ |

**Pass Criteria**: All inputs validated and sanitized
**Bug Report**: ________________

---

### 4.5 Rate Limiting
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Call API 100 times in 1 minute | All succeed | ⬜ |
| 2 | Call API 101 times in 1 minute | 101st request returns 429 Too Many Requests | ⬜ |
| 3 | Wait 1 minute | Rate limit reset, requests succeed again | ⬜ |
| 4 | Frontend debouncing | Prevents excessive API calls | ⬜ |

**Pass Criteria**: Rate limiting enforced (100 req/min)
**Bug Report**: ________________

---

### 4.6 Deep Link Security
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open malicious deep link | App validates link format | ⬜ |
| 2 | Open link with XSS payload | Payload sanitized | ⬜ |
| 3 | Open link with SQL injection | Rejected or sanitized | ⬜ |
| 4 | Open link to different domain | Rejected (only rezapp.com) | ⬜ |

**Pass Criteria**: Deep links validated and sanitized
**Bug Report**: ________________

---

### 4.7 Clipboard Security
**Priority**: Medium

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Copy referral code | Only code copied (no extra data) | ⬜ |
| 2 | Paste in secure field | Code pastes correctly | ⬜ |
| 3 | Check clipboard after 5 minutes | Clipboard not auto-cleared (user controls) | ⬜ |

**Pass Criteria**: Clipboard used safely
**Bug Report**: ________________

---

### 4.8 HTTPS Enforcement
**Priority**: Critical

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Inspect network requests | All requests use HTTPS | ⬜ |
| 2 | Attempt HTTP request | Upgraded to HTTPS or blocked | ⬜ |
| 3 | Check referral link | Uses HTTPS (https://rezapp.com) | ⬜ |

**Pass Criteria**: All connections encrypted
**Bug Report**: ________________

---

### 4.9 Sensitive Data in Logs
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Enable dev tools | Open console | ⬜ |
| 2 | Navigate to referral page | No tokens logged | ⬜ |
| 3 | Copy referral code | Code not logged | ⬜ |
| 4 | Trigger error | Error message doesn't contain PII | ⬜ |

**Pass Criteria**: No sensitive data in logs
**Bug Report**: ________________

---

### 4.10 Session Management
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Log in | Session starts | ⬜ |
| 2 | Navigate to referral page | Data loads | ⬜ |
| 3 | Session expires (backend) | App detects, prompts re-login | ⬜ |
| 4 | Log out | Session cleared, can't access data | ⬜ |

**Pass Criteria**: Session managed securely
**Bug Report**: ________________

---

### 4.11 Third-Party Libraries Security
**Priority**: Medium

| Library | Version | Vulnerabilities | Status |
|---------|---------|-----------------|--------|
| react-native-qrcode-svg | 6.3.15 | ___ | ⬜ |
| expo-clipboard | 6.0.3 | ___ | ⬜ |
| react-native-svg | 15.2.0 | ___ | ⬜ |

**Pass Criteria**: No known vulnerabilities (run `npm audit`)
**Bug Report**: ________________

---

### 4.12 Data Retention Compliance
**Priority**: Medium (GDPR)

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Check referral data retention policy | Data retained for 90 days | ⬜ |
| 2 | Request data deletion | Data deleted within 30 days | ⬜ |
| 3 | Export user data | Can export in machine-readable format | ⬜ |

**Pass Criteria**: GDPR compliant
**Bug Report**: ________________

---

## 5. Performance Testing

### 5.1 Initial Load Time
**Priority**: Critical

| Device | Network | Load Time | Target | Status |
|--------|---------|-----------|--------|--------|
| iPhone 15 Pro | WiFi | ___s | <1.5s | ⬜ |
| iPhone 12 | 4G | ___s | <2.5s | ⬜ |
| Pixel 8 | WiFi | ___s | <1.5s | ⬜ |
| Pixel 5 | 4G | ___s | <2.5s | ⬜ |

**Pass Criteria**: Load time within targets
**Bug Report**: ________________

---

### 5.2 Memory Usage
**Priority**: High

| Action | Memory (MB) | Target | Status |
|--------|-------------|--------|--------|
| App launch | ___ | <100MB | ⬜ |
| Navigate to referral | ___ | <120MB | ⬜ |
| Open ShareModal | ___ | <150MB | ⬜ |
| After 50 navigations | ___ | <120MB (no leak) | ⬜ |

**Pass Criteria**: Memory stable, no leaks
**Test Tool**: Xcode Instruments / Android Studio Profiler
**Bug Report**: ________________

---

### 5.3 FlatList Performance (History)
**Priority**: High

| Items | FPS | Target | Status |
|-------|-----|--------|--------|
| 10 items | ___ | 60fps | ⬜ |
| 50 items | ___ | 60fps | ⬜ |
| 100 items | ___ | 55fps+ | ⬜ |

**Pass Criteria**: Smooth scrolling maintained
**Test Tool**: React DevTools Profiler
**Bug Report**: ________________

---

### 5.4 API Response Time
**Priority**: High

| Endpoint | Response Time | Target | Status |
|----------|---------------|--------|--------|
| /referral/statistics | ___ms | <300ms | ⬜ |
| /referral/history | ___ms | <500ms | ⬜ |
| /referral/generate-link | ___ms | <200ms | ⬜ |

**Pass Criteria**: API responses within targets
**Bug Report**: ________________

---

### 5.5 QR Code Generation Time
**Priority**: Medium

| Action | Time | Target | Status |
|--------|------|--------|--------|
| First QR generation | ___ms | <200ms | ⬜ |
| Re-open modal | ___ms | <50ms (memoized) | ⬜ |

**Pass Criteria**: QR code generates quickly
**Bug Report**: ________________

---

### 5.6 Bundle Size
**Priority**: Medium

| Bundle | Size | Target | Status |
|--------|------|--------|--------|
| Main bundle | ___ KB | <500KB | ⬜ |
| Referral code (estimated) | ___ KB | <150KB | ⬜ |

**Pass Criteria**: Bundle size within limits
**Test Tool**: `npx expo export:web` → check build size
**Bug Report**: ________________

---

### 5.7 Render Performance
**Priority**: High

| Component | Renders | Unnecessary | Status |
|-----------|---------|-------------|--------|
| Referral page | ___ | 0 | ⬜ |
| FlatList item | ___ | 0 (with memo) | ⬜ |
| ShareModal | ___ | 0 | ⬜ |

**Pass Criteria**: No unnecessary re-renders
**Test Tool**: React DevTools Profiler
**Bug Report**: ________________

---

### 5.8 Network Performance (Poor Connection)
**Priority**: High

| Action | 2G Network | 3G Network | Status |
|--------|-----------|-----------|--------|
| Page load | <10s | <5s | ⬜ |
| Refresh | <8s | <3s | ⬜ |
| Share | <5s | <2s | ⬜ |

**Pass Criteria**: Acceptable performance on slow networks
**Test Tool**: Chrome DevTools Network Throttling
**Bug Report**: ________________

---

## 6. Edge Cases & Error Handling

### 6.1 Offline Mode
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Disable network | Airplane mode or offline | ⬜ |
| 2 | Navigate to referral page | Shows cached data if available | ⬜ |
| 3 | Pull to refresh | Shows "No internet connection" message | ⬜ |
| 4 | Tap share button | Shows error: "Please check your connection" | ⬜ |
| 5 | Re-enable network | Data refreshes automatically | ⬜ |

**Pass Criteria**: Graceful offline handling
**Bug Report**: ________________

---

### 6.2 API Error Handling
**Priority**: Critical

| Error | Expected Behavior | Status |
|-------|------------------|--------|
| 401 Unauthorized | Redirect to sign-in | ⬜ |
| 403 Forbidden | Show "Access denied" message | ⬜ |
| 404 Not Found | Show "Data not found" | ⬜ |
| 429 Rate Limit | Show "Too many requests, try again later" | ⬜ |
| 500 Server Error | Show "Server error, please try again" | ⬜ |

**Pass Criteria**: All errors handled gracefully
**Bug Report**: ________________

---

### 6.3 Empty States
**Priority**: Medium

| Condition | Expected UI | Status |
|-----------|------------|--------|
| 0 referrals | Stats show "0", no history section | ⬜ |
| 0 pending earnings | Pending section hidden | ⬜ |
| 0 claimable rewards (dashboard) | Claimable section hidden | ⬜ |
| No leaderboard data | Shows "No data available" message | ⬜ |

**Pass Criteria**: Empty states handled elegantly
**Bug Report**: ________________

---

### 6.4 Long Text Handling
**Priority**: Medium

| Scenario | Expected Behavior | Status |
|----------|------------------|--------|
| Very long referral code (100 chars) | Scrollable or wrapped | ⬜ |
| Long user name | Truncated with ellipsis | ⬜ |
| Long email | Truncated or wrapped | ⬜ |

**Pass Criteria**: Long text doesn't break layout
**Bug Report**: ________________

---

### 6.5 Rapid Interactions
**Priority**: High

| Action | Expected Behavior | Status |
|--------|------------------|--------|
| Tap copy button 10 times rapidly | Only copies once, debounced | ⬜ |
| Pull to refresh repeatedly | Debounced, doesn't trigger multiple API calls | ⬜ |
| Open/close modal rapidly | Modal state managed correctly | ⬜ |
| Navigate back/forth 50 times | No memory leak, performance stable | ⬜ |

**Pass Criteria**: No race conditions or crashes
**Bug Report**: ________________

---

### 6.6 Slow API Responses
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Simulate 5s API delay | Loading indicator shown | ⬜ |
| 2 | Wait for response | Data loads after 5s | ⬜ |
| 3 | Navigate away during load | API call cancelled, no crash | ⬜ |
| 4 | Return to page | Fresh API call triggered | ⬜ |

**Pass Criteria**: Loading states handled, no memory leaks
**Bug Report**: ________________

---

### 6.7 Simultaneous API Calls
**Priority**: Medium

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open page (triggers 3 API calls) | All 3 calls execute in parallel | ⬜ |
| 2 | One call fails | Other 2 succeed, partial data shown | ⬜ |
| 3 | All calls fail | Error message shown | ⬜ |
| 4 | Pull to refresh immediately | Previous calls cancelled, new calls triggered | ⬜ |

**Pass Criteria**: Race conditions prevented (Section 3.1 fix)
**Bug Report**: ________________

---

### 6.8 App Backgrounding
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to referral page | Page loads | ⬜ |
| 2 | Open ShareModal | Modal visible | ⬜ |
| 3 | Background app (home button) | App paused | ⬜ |
| 4 | Wait 30 seconds | Timers cleaned up | ⬜ |
| 5 | Return to app | Modal still visible, state preserved | ⬜ |

**Pass Criteria**: State preserved, no crashes
**Bug Report**: ________________

---

### 6.9 Deep Link with Invalid Code
**Priority**: High

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Open link with invalid code | App opens referral page | ⬜ |
| 2 | Attempt to use invalid code | Shows "Invalid referral code" error | ⬜ |
| 3 | User can still view own referral code | Own code displayed correctly | ⬜ |

**Pass Criteria**: Invalid deep links handled
**Bug Report**: ________________

---

### 6.10 Maximum Referrals Reached
**Priority**: Medium

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | User at LEGEND tier | Dashboard shows LEGEND badge | ⬜ |
| 2 | Check progress section | No "Next Tier" section (already at max) | ⬜ |
| 3 | Can still refer | Referral code still works | ⬜ |
| 4 | Rewards still credited | Continues to earn per-referral bonus | ⬜ |

**Pass Criteria**: Max tier handled gracefully
**Bug Report**: ________________

---

### 6.11 Concurrent Users (Shared Device)
**Priority**: Low

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | User A logs in | Sees User A's referral data | ⬜ |
| 2 | User A logs out | Data cleared | ⬜ |
| 3 | User B logs in | Sees User B's referral data | ⬜ |
| 4 | Verify no data leakage | User B can't see User A's data | ⬜ |

**Pass Criteria**: User data isolated
**Bug Report**: ________________

---

### 6.12 Very Old Referrals
**Priority**: Low

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | View referral from 2 years ago | Displays correctly with old date | ⬜ |
| 2 | Check status | Shows "completed" or "expired" | ⬜ |
| 3 | Verify data format | Date formatted correctly (e.g., "15 Jan 2023") | ⬜ |

**Pass Criteria**: Old data displays correctly
**Bug Report**: ________________

---

### 6.13 Time Zone Handling
**Priority**: Low

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | User in PST views referral | Date/time in PST | ⬜ |
| 2 | User travels to EST | Date/time updates to EST | ⬜ |
| 3 | Cross-date comparisons | Handles timezone correctly | ⬜ |

**Pass Criteria**: Timezones handled correctly
**Bug Report**: ________________

---

### 6.14 Low Memory Conditions
**Priority**: Medium

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Run memory-intensive app | Device low on memory | ⬜ |
| 2 | Navigate to referral page | Page loads (may be slower) | ⬜ |
| 3 | OS kills app (background) | App restarts cleanly on return | ⬜ |
| 4 | State restoration | Previous page restored | ⬜ |

**Pass Criteria**: Handles low memory gracefully
**Bug Report**: ________________

---

### 6.15 Locale/Language Support
**Priority**: Low

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Change device language to Hindi | Numbers formatted correctly (Devanagari or Latin) | ⬜ |
| 2 | Check currency display | Shows ₹ symbol correctly | ⬜ |
| 3 | Date formatting | Respects locale (e.g., DD/MM/YYYY vs MM/DD/YYYY) | ⬜ |

**Pass Criteria**: Locale respected
**Bug Report**: ________________

---

## Test Summary Report

### Overall Test Results

| Category | Total | Passed | Failed | Blocked | Pass % |
|----------|-------|--------|--------|---------|--------|
| Functional | 20 | ___ | ___ | ___ | ___% |
| Cross-Platform | 15 | ___ | ___ | ___ | ___% |
| Accessibility | 10 | ___ | ___ | ___ | ___% |
| Security | 12 | ___ | ___ | ___ | ___% |
| Performance | 8 | ___ | ___ | ___ | ___% |
| Edge Cases | 15 | ___ | ___ | ___ | ___% |
| **TOTAL** | **80** | ___ | ___ | ___ | ___% |

### Critical Issues Found
1. _______________
2. _______________
3. _______________

### High Priority Issues
1. _______________
2. _______________

### Recommendation
- [ ] **PASS**: Ready for production
- [ ] **PASS WITH NOTES**: Minor issues, can deploy
- [ ] **FAIL**: Critical issues must be fixed

---

**Tested By**: ________________
**Date**: ________________
**Environment**: ________________
**Build Version**: ________________

**Approval**:
- QA Lead: ________________ Date: ______
- Engineering Lead: ________________ Date: ______
- Product Manager: ________________ Date: ______

---

## Appendix: Testing Tools

### Recommended Tools
- **Performance**: React DevTools Profiler, Xcode Instruments, Android Profiler
- **Accessibility**: Xcode Accessibility Inspector, Android Accessibility Scanner
- **Network**: Charles Proxy, Proxyman, Chrome DevTools
- **Security**: Burp Suite, OWASP ZAP
- **Load Testing**: k6, Apache JMeter
- **Bundle Analysis**: `npx expo export:web` + Bundle Analyzer

### Bug Report Template
```markdown
**Bug ID**: REF-XXX
**Severity**: Critical / High / Medium / Low
**Platform**: iOS / Android / Web
**Test Scenario**: [Scenario Number]

**Steps to Reproduce**:
1.
2.
3.

**Expected Result**:

**Actual Result**:

**Screenshots/Videos**:

**Device Info**:
- Model:
- OS Version:
- App Version:

**Logs**:
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Owner**: Agent 8 (Performance Optimizer)
