# Accessibility Testing Guide

Complete manual testing procedures for the Rez App using VoiceOver (iOS) and TalkBack (Android).

## Table of Contents

1. [Before You Begin](#before-you-begin)
2. [VoiceOver Testing (iOS)](#voiceover-testing-ios)
3. [TalkBack Testing (Android)](#talkback-testing-android)
4. [Test Scenarios by Feature](#test-scenarios-by-feature)
5. [Common Issues and How to Test](#common-issues-and-how-to-test)
6. [Expected Behavior](#expected-behavior)
7. [Reporting Issues](#reporting-issues)

---

## Before You Begin

### Prerequisites
- Physical device or simulator with screen reader enabled
- Test account with sample data
- Headphones (recommended for better audio clarity)
- Notepad for tracking issues

### What to Test
Focus on these WCAG 2.1 Level AA requirements:
- ✅ All functionality is keyboard accessible
- ✅ All images have text alternatives
- ✅ Color is not the only way to convey information
- ✅ Text can be resized up to 200%
- ✅ Interactive elements have clear focus indicators
- ✅ Form inputs have associated labels
- ✅ Error messages are clear and helpful

---

## VoiceOver Testing (iOS)

### Enabling VoiceOver
1. Go to **Settings** > **Accessibility** > **VoiceOver**
2. Toggle **VoiceOver** on
3. Or use triple-click home button shortcut

### Basic VoiceOver Gestures
| Gesture | Action |
|---------|--------|
| Single tap | Select item |
| Double tap | Activate selected item |
| Swipe right | Move to next element |
| Swipe left | Move to previous element |
| Two-finger swipe up | Read all from current position |
| Two-finger tap | Pause/resume speaking |
| Three-finger swipe left/right | Scroll pages |
| Rotor (two fingers, rotate) | Change navigation mode |

### VoiceOver Rotor Settings
Enable these rotor options for testing:
- Headings
- Links
- Form Controls
- Buttons
- Lists
- Landmarks

To access: **Settings** > **Accessibility** > **VoiceOver** > **Rotor**

### Testing Checklist

#### 1. Launch and Initial Navigation
- [ ] App announces app name on launch
- [ ] Loading states are announced
- [ ] Splash screen has appropriate announcement
- [ ] First focusable element receives focus

#### 2. Home Screen
- [ ] All tab bar items are announced with labels
- [ ] Selected tab state is announced
- [ ] Product cards announce: name, price, rating
- [ ] Category buttons are clearly labeled
- [ ] Scroll actions work smoothly
- [ ] Pull-to-refresh announces loading

#### 3. Navigation
- [ ] Back button announces "Back" or "Navigate back"
- [ ] Navigation announces screen name on change
- [ ] Breadcrumbs announce current location
- [ ] Skip links work (if present)

#### 4. Search
- [ ] Search field announces "Search" with hint
- [ ] Search results count is announced
- [ ] "No results" message is clear
- [ ] Filter buttons are labeled
- [ ] Selected filters are announced

#### 5. Product Pages
- [ ] Product name is announced as heading
- [ ] Price is announced clearly
- [ ] Stock status is announced
- [ ] Size/color selectors have clear labels
- [ ] Selected options are announced
- [ ] Add to cart announces action result
- [ ] Images have descriptive alt text

#### 6. Cart
- [ ] Cart item count is announced
- [ ] Each item announces: name, quantity, price
- [ ] Quantity buttons announce purpose
- [ ] Remove button confirms item name
- [ ] Total price is announced
- [ ] Empty cart state is announced

#### 7. Checkout
- [ ] Step indicator announces current step
- [ ] Form labels are associated with inputs
- [ ] Required fields are announced
- [ ] Validation errors are announced
- [ ] Error messages are helpful
- [ ] Payment method options are clear

#### 8. Payment
- [ ] Secure payment indicator is announced
- [ ] Card fields have clear labels
- [ ] CVV help text is available
- [ ] Payment button announces amount
- [ ] Processing state is announced
- [ ] Success/failure messages are clear

#### 9. Account Settings
- [ ] All settings items are labeled
- [ ] Toggle switches announce on/off state
- [ ] Save button announces action
- [ ] Confirmation messages are announced

#### 10. Modals and Dialogs
- [ ] Modal title is announced when opened
- [ ] Focus moves to modal
- [ ] Close button is clearly labeled
- [ ] Focus returns after close

---

## TalkBack Testing (Android)

### Enabling TalkBack
1. Go to **Settings** > **Accessibility** > **TalkBack**
2. Toggle **Use TalkBack** on
3. Or use volume key shortcut: Press both volume keys for 3 seconds

### Basic TalkBack Gestures
| Gesture | Action |
|---------|--------|
| Single tap | Explore by touch |
| Double tap | Activate selected item |
| Swipe right | Move to next element |
| Swipe left | Move to previous element |
| Swipe down then right | Read from top |
| Swipe up then down | Read from current position |
| Swipe right then left | Back navigation |
| Swipe down then left | Home button |

### TalkBack Reading Controls
- **Reading menu**: Swipe down then up
- **Local context menu**: Swipe up then right
- **Global context menu**: Swipe down then right
- **Granularity control**: Swipe up/down to change reading level

### Testing Checklist

#### 1. Launch and Initial Navigation
- [ ] App name is announced on launch
- [ ] Loading screen announces status
- [ ] First screen content is readable
- [ ] Tab navigation works correctly

#### 2. Touch Exploration
- [ ] All interactive elements are discoverable
- [ ] Non-interactive elements don't interrupt flow
- [ ] Grouped content announces as single item
- [ ] Decorative images are hidden

#### 3. Linear Navigation
- [ ] Logical reading order
- [ ] Headings are announced properly
- [ ] Lists announce item count
- [ ] Forms group related fields

#### 4. Forms and Input
- [ ] Text fields announce label and hint
- [ ] Keyboard appears for text input
- [ ] Input type affects keyboard (email, phone, etc.)
- [ ] Validation announces errors immediately
- [ ] Error messages are associated with fields

#### 5. Buttons and Links
- [ ] All buttons announce as "Button"
- [ ] Links announce as "Link"
- [ ] Disabled state is announced
- [ ] Loading state is announced

#### 6. Switches and Checkboxes
- [ ] Switches announce on/off state
- [ ] State changes are announced
- [ ] Checkboxes announce checked/unchecked
- [ ] Radio buttons indicate selection

#### 7. Lists and Grids
- [ ] List announces item count
- [ ] Each item announces position
- [ ] Grid layout is understandable
- [ ] Empty states are announced

#### 8. Dynamic Content
- [ ] Loading states are announced
- [ ] Content updates are announced
- [ ] Error messages interrupt appropriately
- [ ] Success messages are announced

#### 9. Modals and Overlays
- [ ] Modal announces when opened
- [ ] Focus trapped within modal
- [ ] Close action is available
- [ ] Background content is hidden

#### 10. Custom Gestures
- [ ] Swipe actions announce purpose
- [ ] Alternative activation methods exist
- [ ] Complex gestures have simpler alternatives

---

## Test Scenarios by Feature

### Account Registration Flow

#### VoiceOver Testing
1. Launch app and navigate to registration
2. Verify each field announces:
   - Field name
   - Field type (email, password, etc.)
   - Required status
   - Any hints (e.g., "Password must be 8 characters")
3. Enter invalid data and verify error announcements
4. Navigate through errors with rotor > Form Controls
5. Submit and verify success announcement

#### TalkBack Testing
1. Same as VoiceOver but use TalkBack gestures
2. Verify keyboard types match field types
3. Check error announcements don't disappear too quickly
4. Verify success takes user to next screen with announcement

### Product Search and Filter

#### VoiceOver Testing
1. Navigate to search
2. Activate search field and enter query
3. Verify results count is announced
4. Open filters with rotor > Buttons
5. Select filters and verify selection announced
6. Apply filters and verify results update announced
7. Clear filters and verify announcement

#### TalkBack Testing
1. Search using voice input if available
2. Verify filter chips are announced with state
3. Check filtered results announce new count
4. Verify sort options are clear

### Cart Management

#### VoiceOver Testing
1. Add item to cart from product page
2. Verify "Added to cart" announcement
3. Navigate to cart
4. Verify cart count in tab bar
5. Locate item and verify full announcement
6. Test quantity controls:
   - Decrease quantity
   - Verify new quantity announced
   - Increase quantity
   - Verify update
7. Remove item and verify announcement
8. Verify empty cart state

#### TalkBack Testing
1. Same steps as VoiceOver
2. Additionally test:
   - Touch exploration of cart items
   - Local context menu for cart actions
   - Quick navigation to checkout

### Checkout Process

#### VoiceOver Testing
1. Proceed to checkout from cart
2. Verify step indicator announces "Step 1 of 4"
3. Fill delivery address form:
   - Navigate using rotor > Form Controls
   - Verify each field has label
   - Test autofill if available
   - Verify required field indicators
4. Move to payment step
5. Select payment method
6. Enter payment details
7. Review order summary
8. Place order and verify all announcements

#### TalkBack Testing
1. Same checkout flow
2. Verify keyboard navigation works
3. Check form validation announces clearly
4. Verify payment security indicators
5. Test OTP input if required

### Account Settings

#### VoiceOver Testing
1. Navigate to account settings
2. Test each setting type:
   - **Toggle switches**: Verify on/off announced
   - **Radio groups**: Verify selection
   - **Dropdowns**: Verify menu opens and selection
3. Change profile information
4. Verify save action announces result
5. Test notification settings
6. Verify logout confirms and announces

#### TalkBack Testing
1. Same as VoiceOver
2. Additionally test gesture controls
3. Verify settings persist after changes

---

## Common Issues and How to Test

### Issue: Missing Labels
**Test**:
- Navigate to each interactive element
- Verify it announces a meaningful label
- Buttons should not announce "Button" only

### Issue: Poor Reading Order
**Test**:
- Navigate linearly through screen (swipe right)
- Verify order makes logical sense
- Headers should come before related content

### Issue: Non-Descriptive Links
**Test**:
- Use rotor to navigate to links
- Verify each link describes its destination
- Avoid "Click here" or "Read more" without context

### Issue: Form Errors Not Announced
**Test**:
- Submit form with errors
- Verify error message is announced immediately
- Check error is associated with correct field
- Verify field remains focused or moves to error

### Issue: Dynamic Content Not Announced
**Test**:
- Add item to cart
- Verify announcement of action result
- Check loading states announce
- Verify completion is announced

### Issue: Modals Trap Focus
**Test**:
- Open modal
- Navigate through all elements
- Verify focus doesn't escape to background
- Verify close button is reachable
- Verify focus returns after close

### Issue: Images Without Alt Text
**Test**:
- Navigate to images
- Verify descriptive text is announced
- Decorative images should be hidden

### Issue: Insufficient Touch Targets
**Test**:
- Try activating small buttons
- Verify 44x44 minimum size
- Check spacing between interactive elements

---

## Expected Behavior

### Good Announcements Examples

#### Product Card
**VoiceOver**: "Nike Air Max, Button. Running shoes, Price: 12,999 rupees, Rating: 4.5 out of 5 stars"

**TalkBack**: "Nike Air Max, Button, Running shoes, Price: 12,999 rupees, Rating: 4.5 out of 5 stars, Double tap to activate"

#### Cart Item
**VoiceOver**: "Nike Air Max, Size: 10, Quantity: 2, Price: 25,998 rupees"

**TalkBack**: "Nike Air Max, Size: 10, Quantity: 2, Price: 25,998 rupees"

#### Form Input
**VoiceOver**: "Email address, Required, Text field. Enter your email address"

**TalkBack**: "Email address, Required, Text field, Enter your email address, Double tap to edit"

#### Button
**VoiceOver**: "Add to Cart, Button"

**TalkBack**: "Add to Cart, Button, Double tap to activate"

#### Toggle Switch
**VoiceOver**: "Push Notifications, On, Switch button"

**TalkBack**: "Push Notifications, Switch, On, Double tap to toggle"

#### Error Message
**VoiceOver**: "Alert: Invalid email address. Please enter a valid email in the format name@example.com"

**TalkBack**: "Invalid email address. Please enter a valid email in the format name@example.com"

### Bad Announcements Examples

❌ "Button" (no label)
❌ "Image" (no description)
❌ "Input" (no label or hint)
❌ "Click here" (non-descriptive link)
❌ "Item 1, Item 2, Item 3" (should be grouped)
❌ Silent dynamic updates (no announcement)

---

## Reporting Issues

### Issue Template

```markdown
**Screen**: [e.g., Product Details Page]
**Component**: [e.g., Add to Cart Button]
**Screen Reader**: [VoiceOver/TalkBack]
**Platform**: [iOS 17/Android 13]

**Expected Behavior**:
Button should announce "Add Nike Air Max to cart, Button"

**Actual Behavior**:
Button announces only "Button" with no label

**Steps to Reproduce**:
1. Enable VoiceOver
2. Navigate to any product page
3. Swipe to Add to Cart button
4. Listen to announcement

**Severity**: [Critical/High/Medium/Low]
**WCAG Criterion**: [e.g., 1.3.1 Info and Relationships]

**Screenshots/Recording**: [Attach if available]
```

### Severity Levels

- **Critical**: Completely blocks screen reader users (missing labels, broken navigation)
- **High**: Major usability issue (poor labels, confusing order)
- **Medium**: Suboptimal experience (verbose announcements, minor confusion)
- **Low**: Enhancement (could be more descriptive)

---

## Testing Schedule

### Sprint Testing
- Test new features before merge
- Test modified screens completely
- Regression test affected flows

### Release Testing
- Complete end-to-end flow testing
- Test on multiple devices
- Test with real screen reader users if possible

### Recommended Test Frequency
- **Critical paths** (login, checkout, payment): Every sprint
- **New features**: Before release
- **Bug fixes**: After fix applied
- **UI updates**: Always

---

## Resources

### Documentation
- [iOS VoiceOver Guide](https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f)
- [Android TalkBack Guide](https://support.google.com/accessibility/android/answer/6283677)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)

### Tools
- **Accessibility Scanner** (Android): Automated testing
- **Xcode Accessibility Inspector** (iOS): Element inspection
- **React Native Accessibility API**: Developer tools

### Training
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Deque University](https://dequeuniversity.com/)
- [Google Accessibility Courses](https://www.udacity.com/course/web-accessibility--ud891)

---

## Quick Reference Card

### Must-Test Items ✓
- [ ] All buttons have labels
- [ ] All images have alt text
- [ ] Forms have associated labels
- [ ] Errors are announced
- [ ] Success actions are announced
- [ ] Loading states are announced
- [ ] Modals announce and trap focus
- [ ] Touch targets are 44x44 minimum
- [ ] Reading order is logical
- [ ] Dynamic content announces updates

### Critical User Journeys
1. Registration → Login → Home
2. Search → Product → Add to Cart → Checkout
3. Cart → Checkout → Payment → Confirmation
4. Profile → Settings → Update → Save
5. Browse → Wishlist → Purchase

---

## Conclusion

Manual screen reader testing is essential for ensuring accessibility. Automated tests can catch many issues, but only real screen reader testing can verify the actual user experience.

**Remember**: The best test is having actual screen reader users test your app, but following this guide will catch most issues before release.

**Questions?** Contact the accessibility team or refer to our internal accessibility Slack channel.
