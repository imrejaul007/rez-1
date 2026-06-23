# Report Button - Visual Design Guide

## Button Placement in UGCDetailScreen

### Full Screen Layout
```
┌──────────────────────────────────────────────────────┐
│  ┌──────┐                   ┌────┐ ┌────┐ ┌────────┐│
│  │  ←   │                   │ 🚩 │ │ 🛍️3│ │👁 2.5L ││
│  │ Back │                   └────┘ └────┘ └────────┘│
│  └──────┘                                            │
│                                                      │
│                                                      │
│                   VIDEO PLAYER                       │
│                   (Full Screen)                      │
│                                                      │
│                                                      │
│                                                      │
│  "Watch me slay the look..."                         │
│  #Check Stripes                                      │
│  ❤️ 1.2K  💬 345  🔄 89                               │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │        PRODUCT CAROUSEL (Bottom)              │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Header Button Details

### Normal State (Active - Can Report)
```
┌─────────────────────┐
│  🚩  Report         │  ← Light red background (#FEE2E2)
└─────────────────────┘
      ↑
   Red icon & text (#EF4444)
   Outline flag icon
   Pressable/Interactive
```

### Reported State (Disabled)
```
┌─────────────────────┐
│  🏴  Reported       │  ← Light gray background (#F3F4F6)
└─────────────────────┘
      ↑
   Gray icon & text (#9CA3AF)
   Filled flag icon
   Disabled/Non-interactive
```

---

## Button Comparison with Other Header Elements

### Header Right Section Layout
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  [Report Button] [Product Count] [View Count]         │
│   8px margin →    8px margin →                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Individual Button Specifications

#### 1. Report Button (NEW) 🚩
- **Width**: Auto (based on text + icon + padding)
- **Height**: 32px
- **Padding**: 10px horizontal
- **Border Radius**: 18px (pill shape)
- **Margin Right**: 8px
- **Background**: `#FEE2E2` (active) / `#F3F4F6` (reported)
- **Icon**: `flag-outline` (14px) / `flag` (14px)
- **Icon Color**: `#EF4444` (active) / `#9CA3AF` (reported)
- **Text**: "Report" / "Reported"
- **Text Size**: 12px
- **Text Weight**: 700 (bold)
- **Text Color**: `#EF4444` (active) / `#9CA3AF` (reported)

#### 2. Product Count Badge 🛍️
- **Width**: Auto
- **Height**: 32px
- **Padding**: 10px horizontal
- **Border Radius**: 18px
- **Margin Right**: 8px
- **Background**: `#6F45FFE6` (purple with opacity)
- **Icon**: `bag-outline` (14px)
- **Icon Color**: `#FFFFFF`
- **Text**: Product count number
- **Text Size**: Default
- **Text Weight**: 700
- **Text Color**: `#FFFFFF`
- **Conditional**: Only shown if `hasProducts`

#### 3. View Count Badge 👁️
- **Width**: Auto
- **Height**: 32px
- **Padding**: 10px horizontal
- **Border Radius**: 18px
- **Margin Right**: 0px (last element)
- **Background**: `#FFFFFFE6` (white with opacity)
- **Icon**: `eye` (14px)
- **Icon Color**: `#111827`
- **Text**: View count (e.g., "2.5L")
- **Text Size**: Default
- **Text Weight**: 700
- **Text Color**: `#111827`

---

## Color Palette

### Report Button Active State
```
Background:  #FEE2E2  ■■■■■  (Red-50)
Icon/Text:   #EF4444  ■■■■■  (Red-500)
```

### Report Button Reported State
```
Background:  #F3F4F6  ■■■■■  (Gray-100)
Icon/Text:   #9CA3AF  ■■■■■  (Gray-400)
```

### Product Count Badge
```
Background:  #6F45FFE6  ■■■■■  (Purple with 90% opacity)
Icon/Text:   #FFFFFF    ■■■■■  (White)
```

### View Count Badge
```
Background:  #FFFFFFE6  ■■■■■  (White with 90% opacity)
Icon/Text:   #111827    ■■■■■  (Gray-900)
```

---

## Interaction States

### State Flow Diagram
```
┌─────────────┐
│   INITIAL   │
│  "Report"   │  ← User not logged in OR not reported yet
│  (Active)   │
└──────┬──────┘
       │
       │ User presses button
       │
       ├───── User not authenticated ─────┐
       │                                   ▼
       │                          Show "Sign In Required" alert
       │                                   │
       │                                   ├─ Cancel ──> Return to initial
       │                                   │
       │                                   └─ Sign In ──> Navigate to /sign-in
       │
       ├───── Already reported ───────┐
       │                               ▼
       │                      Show "Already Reported" alert
       │                               │
       │                               └──> Return to reported state
       │
       └───── Authenticated & Not reported ───┐
                                               ▼
                                      Open ReportModal
                                               │
                                               ├─ Cancel ──> Return to initial
                                               │
                                               └─ Submit ──┐
                                                           ▼
                                                  ┌─────────────┐
                                                  │  REPORTED   │
                                                  │ "Reported"  │
                                                  │ (Disabled)  │
                                                  └─────────────┘
```

---

## Responsive Behavior

### On Small Screens (< 375px width)
- Button text may truncate if necessary
- Maintains minimum touchable area (32px height)
- May wrap to second row if space is limited

### On Large Screens (> 768px width)
- All buttons remain on single row
- Adequate spacing maintained
- No layout changes needed

---

## Accessibility Features

### Screen Reader Announcements

#### Active State
```
Label: "Report video"
Role: Button
State: Pressable
Hint: "Double tap to report this video"
```

#### Reported State
```
Label: "Already reported"
Role: Button
State: Disabled
Hint: "You have reported this video"
```

### Focus Indicators
- Follows platform default focus styles
- Clear visual distinction when focused
- Keyboard navigation support (web)

### Touch Targets
- Minimum 32px height (exceeds 24px accessibility minimum)
- Adequate padding for easy tapping
- No overlapping touch areas

---

## Animation States (Future Enhancement)

### Potential Animations
1. **Press Animation**: Slight scale down (0.95) on press
2. **State Change**: Smooth color transition (300ms) when changing to reported state
3. **Icon Swap**: Crossfade between outline and filled flag icons
4. **Success Feedback**: Brief scale pulse (1.05) after successful report

*Note: These animations are not currently implemented but can be added for enhanced UX.*

---

## Platform-Specific Considerations

### iOS
- Respects system haptic feedback settings
- Uses native alert dialogs
- Smooth 60fps interactions

### Android
- Material Design ripple effect on press
- Native alert dialogs
- Follows Android accessibility guidelines

### Web
- Hover state changes cursor to pointer
- Focus outline for keyboard navigation
- Uses custom alert/toast implementation

---

## Design Rationale

### Why Red for Report Button?
- **Universal Signal**: Red universally indicates warning/caution/stop
- **Clear Intent**: Users immediately understand this is a negative action
- **Contrast**: Stands out from other positive actions (purple product badge)
- **Familiarity**: Matches common platform patterns (flag/report features)

### Why Pill Shape?
- **Consistency**: Matches existing header badges
- **Clean Design**: Maintains minimalist video player aesthetic
- **Grouping**: Visually connects related header actions
- **Modern**: Follows current mobile UI trends

### Why Disable After Reporting?
- **Prevent Spam**: Stops duplicate reports
- **Clear Feedback**: Visual confirmation action was completed
- **User Guidance**: Communicates state clearly
- **Best Practice**: Standard pattern for one-time actions

---

## Component Hierarchy

```
UGCDetailScreen (Container)
├── Video Player (Background)
├── Top Gradient (Overlay)
├── Bottom Gradient (Overlay)
├── Header (Absolute positioned)
│   ├── Back Button (Left)
│   └── Header Right (Right)
│       ├── Report Button ⭐ NEW
│       ├── Product Count Badge (Conditional)
│       └── View Count Badge
├── Video Info Section
│   ├── Caption
│   ├── Tag
│   └── Engagement Metrics
├── Product Carousel (Bottom)
└── Report Modal (Overlay) ⏳ Coming from Agent 1
```

---

## CSS-in-JS Implementation

### Button Styles (React Native StyleSheet)
```typescript
// Base pill style (reused for all header badges)
iconPill: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',  // Default, overridden inline
  paddingHorizontal: 10,
  height: 32,
  borderRadius: 18,
}

// Applied inline for report button
{
  backgroundColor: isReported ? '#F3F4F6' : '#FEE2E2',
  marginRight: 8
}

// Text styles (applied inline)
{
  marginLeft: 6,
  fontWeight: '700',
  color: isReported ? '#9CA3AF' : '#EF4444',
  fontSize: 12
}
```

---

## Testing Scenarios - Visual QA

### Checklist
- [ ] Button appears in correct position (header right, first element)
- [ ] Spacing between buttons is consistent (8px)
- [ ] Button height matches other badges (32px)
- [ ] Border radius creates perfect pill shape (18px)
- [ ] Icon and text are vertically centered
- [ ] Icon and text have correct spacing (6px)
- [ ] Colors match design spec exactly
- [ ] Active state uses red (#EF4444)
- [ ] Reported state uses gray (#9CA3AF)
- [ ] Background colors are correct
- [ ] Icon changes from outline to filled when reported
- [ ] Text changes from "Report" to "Reported" when reported
- [ ] Button is disabled (non-interactive) when reported
- [ ] Button press shows visual feedback (platform-specific)
- [ ] Layout doesn't break on small screens
- [ ] Layout doesn't break with/without product badge
- [ ] No text truncation on standard screen sizes
- [ ] Adequate contrast for accessibility

---

## Browser/Device Testing Matrix

| Platform | Status | Notes |
|----------|--------|-------|
| iOS Safari | ⏳ To Test | Test alert dialogs |
| Android Chrome | ⏳ To Test | Test alert dialogs |
| Web Chrome | ⏳ To Test | Test toast implementation |
| Web Firefox | ⏳ To Test | Test toast implementation |
| Web Safari | ⏳ To Test | Test toast implementation |

---

## Comparison: Before vs After

### BEFORE (Without Report Button)
```
Header Right:
[🛍️ Products: 3] [👁️ 2.5L]
```

### AFTER (With Report Button)
```
Header Right:
[🚩 Report] [🛍️ Products: 3] [👁️ 2.5L]
```

### Benefits Added
✅ User safety feature
✅ Content moderation capability
✅ Community guidelines enforcement
✅ Better user experience
✅ Platform trust & safety

---

## Related Documentation

- **Technical Implementation**: See `AGENT_2_REPORT_BUTTON_INTEGRATION_COMPLETE.md`
- **ReportModal Spec**: See Agent 1's documentation (pending)
- **Toast Notifications**: See Agent 3's documentation (pending)
- **Auth System**: See `frontend/contexts/AuthContext.tsx`
- **Alert Utilities**: See `frontend/utils/alert.ts`

---

## Questions & Answers

### Q: Why is the report button first in the header?
**A**: Left-to-right reading order places most important/immediate actions first. Report is a critical safety feature, so it gets priority placement while still being visually distinct from positive actions.

### Q: Can users un-report a video?
**A**: Not in current implementation. The `isReported` state is permanent during the session. Future enhancement could add backend persistence and un-report capability.

### Q: What happens if the user reports while signed out?
**A**: They see a "Sign In Required" alert with options to cancel or navigate to sign-in page. This prevents anonymous reports while guiding users toward authentication.

### Q: How does this work on tablets/large screens?
**A**: The layout is responsive and will maintain proper spacing and alignment. The pill buttons will remain in a single horizontal row with consistent spacing.

### Q: Is the reported state persisted across app restarts?
**A**: Not currently. The `isReported` state is component-level and resets when unmounting. Future enhancement would check backend API to persist this state.

---

**End of Visual Design Guide**
