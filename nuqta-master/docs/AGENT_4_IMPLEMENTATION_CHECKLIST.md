# Agent 4 Implementation Checklist - ReferralQRModal

**Component:** ReferralQRModal
**Estimated Time:** 4-6 hours
**Priority:** HIGH

---

## Pre-Implementation

### Documentation Review
- [ ] Read `REFERRAL_QR_MODAL_DESIGN_SPEC.md` (full specifications)
- [ ] Review `AGENT_5_DELIVERY_SUMMARY.md` (overview)
- [ ] Check `REFERRAL_QR_MODAL_VISUAL_GUIDE.md` (quick reference)
- [ ] Understand existing `ShareModal.tsx` pattern
- [ ] Review `qr-code.tsx` for QR implementation patterns

### Environment Setup
- [ ] Verify all dependencies installed:
  - [ ] `expo-linear-gradient`
  - [ ] `@expo/vector-icons`
  - [ ] `react-native-qrcode-svg`
  - [ ] `expo-clipboard`
  - [ ] `expo-file-system`
  - [ ] `expo-media-library`
- [ ] Create component file: `components/referral/ReferralQRModal.tsx`
- [ ] Create test file: `components/referral/__tests__/ReferralQRModal.test.tsx`

---

## Phase 1: Core Structure (1-2 hours)

### Modal Container
- [ ] Import all required dependencies
- [ ] Set up component props interface
- [ ] Create Modal wrapper with transparent background
- [ ] Add backdrop with TouchableOpacity
- [ ] Set up Animated.Value refs for animations
- [ ] Implement modal container with borderTopRadius: 24

### Header Section
- [ ] Add LinearGradient header (#8B5CF6 → #7C3AED)
- [ ] Add header title "Share Referral"
- [ ] Add close button (44x44 touch target)
- [ ] Add close button accessibility labels
- [ ] Test header on various screen sizes

### ScrollView Layout
- [ ] Add ScrollView with proper padding (20px horizontal)
- [ ] Set up contentContainerStyle
- [ ] Add bottom safe area padding
- [ ] Test scrolling behavior

**Checkpoint:** Modal opens/closes, header visible, can scroll

---

## Phase 2: QR Code Section (1 hour)

### QR Container
- [ ] Add section title "Your Referral QR Code"
- [ ] Create QR container (240x240) with:
  - [ ] White background
  - [ ] 2px border (#E5E7EB)
  - [ ] 16px border radius
  - [ ] Shadow (elevation: 4)
- [ ] Center QR container

### QR Code Component
- [ ] Import QRCode from react-native-qrcode-svg
- [ ] Set size to 200x200
- [ ] Use referralLink as value
- [ ] Set color to #111827
- [ ] Set backgroundColor to white
- [ ] Add accessibility label with referral link

### Loading State
- [ ] Create loading state variable
- [ ] Add ActivityIndicator (purple)
- [ ] Add "Generating QR code..." text
- [ ] Simulate 500ms generation delay
- [ ] Add accessibility announcement

### Error State
- [ ] Create error state variable
- [ ] Add error icon (alert-circle, red)
- [ ] Add error title "QR Code Unavailable"
- [ ] Add error message
- [ ] Add retry button
- [ ] Handle retry logic

### Subtitle
- [ ] Add "Scan to join with your code" text
- [ ] Style: 12px, #6B7280, centered
- [ ] 12px margin top

**Checkpoint:** QR code generates, loading works, error state works

---

## Phase 3: Code Display Section (30 minutes)

### Code Container
- [ ] Add section title "Your Referral Code"
- [ ] Create code container with:
  - [ ] Height: 56px
  - [ ] Background: #F9FAFB
  - [ ] Border: 2px dashed #D1D5DB
  - [ ] Border radius: 12px
  - [ ] Flexbox layout (space-between)

### Code Display
- [ ] Display referralCode
- [ ] Style: 18px, bold, letter-spacing: 2, purple
- [ ] Truncate if too long

### Copy Button
- [ ] Create copy button (40x40)
- [ ] Purple background, white icon
- [ ] Icon: copy-outline / checkmark
- [ ] Add copied state (2 second timeout)
- [ ] Implement copy to clipboard
- [ ] Add accessibility labels
- [ ] Show alert on copy

**Checkpoint:** Code displays, copy works, feedback shows

---

## Phase 4: Platform Grid (1 hour)

### Platform Data
- [ ] Define PLATFORMS array with 7 platforms:
  - [ ] WhatsApp (#25D366, logo-whatsapp)
  - [ ] Facebook (#1877f2, logo-facebook)
  - [ ] Instagram (#E4405F, logo-instagram)
  - [ ] Telegram (#0088cc, paper-plane)
  - [ ] SMS (#10b981, chatbox)
  - [ ] Email (#6366f1, mail)
  - [ ] Copy Link (#8B5CF6, copy-outline)

### Grid Layout
- [ ] Add section title "Share via"
- [ ] Create grid container:
  - [ ] flexDirection: row
  - [ ] flexWrap: wrap
  - [ ] justifyContent: space-between
  - [ ] gap: 16px

### Platform Button Component
- [ ] Create renderPlatformButton function
- [ ] Platform button container:
  - [ ] Width: 30% (for 3 columns)
  - [ ] alignItems: center
  - [ ] marginBottom: 20px
- [ ] Icon circle:
  - [ ] 56x56 size
  - [ ] Border radius: 28
  - [ ] Platform-specific background color
  - [ ] Shadow (elevation: 3)
  - [ ] 24px icon size, white color
- [ ] Label text:
  - [ ] 12px, #374151
  - [ ] 8px margin top
  - [ ] Centered

### Share Handlers
- [ ] Implement handlePlatformShare function
- [ ] Add platform-specific logic:
  - [ ] WhatsApp: whatsapp://send
  - [ ] Facebook: fb://facewebmodal
  - [ ] Telegram: tg://msg
  - [ ] SMS: sms:
  - [ ] Email: mailto:
  - [ ] Copy: Clipboard.setStringAsync
- [ ] Add error handling for unavailable apps
- [ ] Add success feedback
- [ ] Call onShare prop if provided
- [ ] Add accessibility labels for each button

**Checkpoint:** All 7 buttons render, clicking works, navigation works

---

## Phase 5: Download Button (30 minutes)

### Button Layout
- [ ] Create full-width button
- [ ] Height: 56px
- [ ] Border radius: 14px
- [ ] White background
- [ ] 2px purple border (#8B5CF6)
- [ ] Flexbox layout (centered)

### Button Content
- [ ] Add download icon (download-outline, 20px)
- [ ] Add "Download QR Code" text (16px, bold, purple)
- [ ] 8px gap between icon and text

### Download Logic
- [ ] Request MediaLibrary permissions
- [ ] Capture QR code as SVG/image
- [ ] Save to device gallery
- [ ] Show success/error alert
- [ ] Add downloading state
- [ ] Show spinner during download

### Accessibility
- [ ] Add accessibility label
- [ ] Add accessibility hint
- [ ] Announce download status

**Checkpoint:** Download button works, saves QR to gallery

---

## Phase 6: Animations (1-2 hours)

### Entrance Animation
- [ ] Set up translateY ref (initial: screenHeight)
- [ ] Set up backdropOpacity ref (initial: 0)
- [ ] Implement showModal function:
  - [ ] Backdrop fade: 300ms
  - [ ] Slide up: 400ms spring
  - [ ] Parallel execution
- [ ] Implement hideModal function:
  - [ ] Backdrop fade: 250ms
  - [ ] Slide down: 250ms
  - [ ] Callback onClose after animation
- [ ] Trigger animations on visible prop change

### QR Code Animation
- [ ] Set up qrOpacity ref (initial: 0)
- [ ] Set up qrScale ref (initial: 0.9)
- [ ] Implement animateQRCode function:
  - [ ] 200ms delay
  - [ ] 300ms fade + scale
  - [ ] Parallel execution
- [ ] Trigger after loading completes

### Platform Buttons Stagger
- [ ] Create animation refs for each button (opacity, translateY)
- [ ] Implement stagger sequence:
  - [ ] 300ms initial delay
  - [ ] 50ms per button
  - [ ] 250ms duration per button
- [ ] Trigger after QR animation

### Button Press Feedback
- [ ] Create buttonScale ref for each button
- [ ] Implement onPressIn: scale to 0.95
- [ ] Implement onPressOut: scale to 1
- [ ] Use spring animation (150ms)
- [ ] Apply to all interactive buttons

### Close Button Animation (Optional)
- [ ] Add rotation animation on press
- [ ] 45deg rotation, 200ms

### Reduced Motion
- [ ] Check AccessibilityInfo.isReduceMotionEnabled
- [ ] Skip animations if enabled
- [ ] Set immediate values instead

**Checkpoint:** All animations smooth, 60fps maintained

---

## Phase 7: Accessibility (1 hour)

### Touch Targets
- [ ] Verify close button ≥44x44
- [ ] Verify copy button ≥44x44
- [ ] Verify platform buttons ≥44x44
- [ ] Verify download button ≥56px height
- [ ] Test on smallest device (iPhone SE)

### Accessibility Labels
- [ ] Add to close button
- [ ] Add to QR code image
- [ ] Add to copy button (with dynamic state)
- [ ] Add to all 7 platform buttons
- [ ] Add to download button
- [ ] Verify hints are descriptive

### Screen Reader
- [ ] Set accessibilityViewIsModal={true}
- [ ] Announce modal opening
- [ ] Test VoiceOver (iOS simulator)
- [ ] Test TalkBack (Android emulator)
- [ ] Verify element order is logical

### Focus Management
- [ ] Auto-focus close button on open
- [ ] Tab order is correct
- [ ] Focus trap within modal

### Color Contrast
- [ ] Test all text/background combinations
- [ ] Verify ≥4.5:1 ratio (WCAG AA)
- [ ] Use contrast checker tool
- [ ] Fix any failures

### Live Regions
- [ ] Add to loading state
- [ ] Add to error state
- [ ] Add to success messages
- [ ] Test announcements

**Checkpoint:** Full accessibility compliance verified

---

## Phase 8: Testing (1 hour)

### Unit Tests
- [ ] Component renders without crashing
- [ ] Props are passed correctly
- [ ] Modal opens on visible=true
- [ ] Modal closes on visible=false
- [ ] Copy button copies correct code
- [ ] Platform buttons call correct handlers
- [ ] Download triggers correctly
- [ ] Loading state displays
- [ ] Error state displays
- [ ] Retry works after error

### Integration Tests
- [ ] Import in referral.tsx works
- [ ] Modal opens from referral page
- [ ] Data flows correctly
- [ ] Share tracking calls API
- [ ] Download saves to device

### Visual Tests
- [ ] Screenshot test - light mode
- [ ] Screenshot test - dark mode
- [ ] Screenshot test - loading state
- [ ] Screenshot test - error state
- [ ] Test on iPhone SE (small)
- [ ] Test on iPhone 14 Pro Max (large)
- [ ] Test on iPad (tablet)

### Accessibility Tests
- [ ] Run axe accessibility audit
- [ ] Test with VoiceOver
- [ ] Test with TalkBack
- [ ] Test keyboard navigation
- [ ] Verify contrast ratios
- [ ] Test with large text

### Performance Tests
- [ ] Modal opens in <400ms
- [ ] QR generates in <1s
- [ ] Animations run at 60fps
- [ ] No memory leaks
- [ ] No console warnings/errors

### Manual Tests
- [ ] Open/close modal multiple times
- [ ] Test all platform share buttons
- [ ] Copy code multiple times
- [ ] Download QR code
- [ ] Test on slow network
- [ ] Test with no network
- [ ] Force error state
- [ ] Test landscape orientation
- [ ] Test split-screen mode

**Checkpoint:** All tests passing, no bugs found

---

## Phase 9: Integration (30 minutes)

### Referral Page Integration
- [ ] Import ReferralQRModal in app/referral.tsx
- [ ] Add state for modal visibility
- [ ] Add "View QR Code" button to UI
- [ ] Pass correct props (code, link)
- [ ] Test integration end-to-end

### Dashboard Integration (if exists)
- [ ] Import in app/referral/dashboard.tsx
- [ ] Add QR button
- [ ] Test integration

### Share Modal Enhancement (optional)
- [ ] Add "View QR" option in ShareModal
- [ ] Link to ReferralQRModal
- [ ] Test flow

**Checkpoint:** Component integrated and working in app

---

## Phase 10: Documentation & Cleanup (30 minutes)

### Code Documentation
- [ ] Add JSDoc comments to component
- [ ] Document all props
- [ ] Add usage examples
- [ ] Document platform-specific notes

### README
- [ ] Create component README
- [ ] Add usage instructions
- [ ] Add screenshots
- [ ] Document known issues

### Code Cleanup
- [ ] Remove console.logs
- [ ] Remove commented code
- [ ] Format code (Prettier)
- [ ] Run linter (ESLint)
- [ ] Fix all warnings

### Performance Optimization
- [ ] Memoize callback functions
- [ ] Use React.memo if needed
- [ ] Optimize re-renders
- [ ] Profile performance

**Checkpoint:** Code is clean, documented, optimized

---

## Final Checklist

### Functionality
- [ ] ✅ Modal opens/closes smoothly
- [ ] ✅ QR code generates correctly
- [ ] ✅ All 7 platforms share correctly
- [ ] ✅ Copy to clipboard works
- [ ] ✅ Download QR works
- [ ] ✅ Loading state displays
- [ ] ✅ Error state handles failures
- [ ] ✅ Retry button works

### Design
- [ ] ✅ Matches design specifications exactly
- [ ] ✅ Colors are correct
- [ ] ✅ Typography is correct
- [ ] ✅ Spacing is correct
- [ ] ✅ Shadows render correctly
- [ ] ✅ Responsive on all screen sizes
- [ ] ✅ Dark mode works (if applicable)

### Animations
- [ ] ✅ Entrance animation smooth
- [ ] ✅ QR reveal animated
- [ ] ✅ Platform stagger works
- [ ] ✅ Button press feedback
- [ ] ✅ 60fps maintained
- [ ] ✅ Reduced motion respected

### Accessibility
- [ ] ✅ All touch targets ≥44px
- [ ] ✅ All labels present
- [ ] ✅ Screen reader tested
- [ ] ✅ Focus management works
- [ ] ✅ Contrast ratios pass
- [ ] ✅ Keyboard navigation works

### Testing
- [ ] ✅ Unit tests written and passing
- [ ] ✅ Integration tests passing
- [ ] ✅ Visual regression tests passing
- [ ] ✅ Accessibility audit passing
- [ ] ✅ Performance targets met
- [ ] ✅ Manual testing complete

### Code Quality
- [ ] ✅ No console warnings
- [ ] ✅ No memory leaks
- [ ] ✅ ESLint passing
- [ ] ✅ Prettier formatted
- [ ] ✅ TypeScript types correct
- [ ] ✅ Code documented

### Integration
- [ ] ✅ Integrated in referral page
- [ ] ✅ Props passed correctly
- [ ] ✅ End-to-end flow works
- [ ] ✅ No breaking changes

---

## Sign-off

### Developer Sign-off
- [ ] All checklist items completed
- [ ] Component is production-ready
- [ ] Documentation complete
- [ ] Ready for code review

**Developer:** _______________ **Date:** _______________

### Design Review
- [ ] Matches design specifications
- [ ] No visual bugs
- [ ] Animations approved

**Reviewer:** _______________ **Date:** _______________

### Accessibility Review
- [ ] WCAG AA compliant
- [ ] Screen reader tested
- [ ] No accessibility issues

**Reviewer:** _______________ **Date:** _______________

### QA Sign-off
- [ ] All tests passing
- [ ] No functional bugs
- [ ] Performance acceptable

**QA Engineer:** _______________ **Date:** _______________

---

## Post-Implementation

### Monitoring
- [ ] Add analytics tracking
- [ ] Monitor error rates
- [ ] Track usage metrics
- [ ] Monitor performance

### Feedback
- [ ] Gather user feedback
- [ ] Monitor app reviews
- [ ] Track support tickets
- [ ] Iterate on issues

### Future Enhancements
- [ ] QR code customization (colors, logo)
- [ ] Social media preview cards
- [ ] Share analytics dashboard
- [ ] Animated QR code
- [ ] Custom share messages per platform

---

## Resources

### Documentation
- Full Spec: `REFERRAL_QR_MODAL_DESIGN_SPEC.md`
- Summary: `AGENT_5_DELIVERY_SUMMARY.md`
- Visual Guide: `REFERRAL_QR_MODAL_VISUAL_GUIDE.md`

### Reference Files
- `components/referral/ShareModal.tsx`
- `app/profile/qr-code.tsx`
- `app/referral.tsx`
- `constants/Colors.ts`

### Tools
- React DevTools
- Flipper (debugging)
- Xcode Accessibility Inspector
- Android Accessibility Scanner
- Contrast checker: https://webaim.org/resources/contrastchecker/

---

## Support

**Questions?** Contact:
- Design: Agent 5 (UI/UX Enhancer)
- Accessibility: Agent 6
- Performance: Agent 7
- Backend: Agent 8

**Stuck?** Review:
1. Full design spec (most detailed)
2. Visual guide (quick reference)
3. Existing ShareModal implementation
4. React Native docs

---

**Estimated Total Time:** 4-6 hours
**Actual Time Spent:** _______ hours

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
