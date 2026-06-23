# Store Visit Page Accessibility Enhancements

## Summary
This document details the comprehensive accessibility features that need to be added to the Store Visit page (`app/store-visit.tsx`).

## Current File Location
`C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\store-visit.tsx`

## Accessibility Features to Add

### 1. Header Section (Line ~752-784)
**Components Affected:**
- Back button (TouchableOpacity)
- Store name header (Text)
- Category badge (View)
- Address container (View)

**Enhancements:**

```tsx
// LinearGradient header - Add:
accessible={true}
accessibilityRole="header"

// Back Button (TouchableOpacity) - Add:
accessible={true}
accessibilityLabel="Go back to previous screen"
accessibilityRole="button"
accessibilityHint="Navigates back to the previous page"
testID="store-visit-back-button"

// Store Name (Text) - Add:
accessible={true}
accessibilityRole="header"
accessibilityLabel={`${store.name} store`}
testID="store-name-header"

// Category Badge (View) - Add:
accessible={true}
accessibilityLabel={`Category: ${store.category.name}`}
accessibilityRole="text"

// Address Container (View) - Add:
accessible={true}
accessibilityLabel={`Located at ${store.address?.street}, ${store.address?.city}`}
accessibilityRole="text"
```

---

### 2. Live Availability Card (Line ~792-834)
**Components Affected:**
- LinearGradient card wrapper
- Crowd status badge
- Queue number display
- Updated timestamp

**Key Accessibility Patterns:**
- `accessibilityLiveRegion="polite"` for crowd level (updates every 30 seconds)
- `accessibilityLiveRegion="polite"` for queue number (dynamic content)
- `accessibilityRole="status"` for real-time indicators

**Enhancements:**

```tsx
// Availability Card LinearGradient - Add:
accessible={true}
accessibilityRole="region"
accessibilityLabel="Live Store Availability"

// Crowd Badge LinearGradient - Add:
accessible={true}
accessibilityLiveRegion="polite"
accessibilityLabel={`Current crowd level: ${crowdLevel}`}
accessibilityRole="status"
testID="crowd-level-status"

// Queue Number Display LinearGradient - Add:
accessible={true}
accessibilityLiveRegion="polite"
accessibilityLabel={`Your queue number is ${queueNumber}`}
accessibilityRole="status"
testID="queue-number-display"

// Updated Time Container - Add:
accessible={true}
accessibilityLabel={`Updated ${getTimeSinceUpdate()}`}
accessibilityRole="text"
```

---

### 3. Store Hours Card (Line ~837-864)
**Components Affected:**
- Card container
- Status badge (Open/Closed)
- Hours text

**Enhancements:**

```tsx
// Hours Card View - Add:
accessible={true}
accessibilityRole="region"
accessibilityLabel="Store Hours Information"

// Status Badge LinearGradient - Add:
accessible={true}
accessibilityLabel={isOpen ? 'Store is open now' : 'Store is closed'}
accessibilityRole="status"
testID="store-open-status"

// Hours Text Container - Add:
accessible={true}
accessibilityLabel={`Store hours: ${todayHours.open} to ${todayHours.close}`}
accessibilityRole="text"
```

---

### 4. Customer Details Form (Line ~867-929)
**Components Affected:**
- Form container
- Name input field
- Phone input field
- Email input field
- Input labels

**Key Accessibility Patterns:**
- `accessibilityLabelledBy="nativeID"` for input labels
- `accessibilityHint` with validation requirements
- `accessible={true}` for TextInput components

**Enhancements:**

```tsx
// Details Card View - Add:
accessible={true}
accessibilityRole="region"
accessibilityLabel="Enter Your Details"

// Name Label - Add:
accessible={true}
accessibilityRole="header"
nativeID="name-label"

// Name Input TextInput - Add:
accessible={true}
accessibilityLabel="Full name input"
accessibilityHint="Enter your full name, at least 2 characters"
accessibilityRole="text"
testID="input-name"
accessibilityLabelledBy="name-label"

// Phone Label - Add:
accessible={true}
accessibilityRole="header"
nativeID="phone-label"

// Phone Input TextInput - Add:
accessible={true}
accessibilityLabel="Phone number input"
accessibilityHint="Enter your 10-digit phone number"
accessibilityRole="text"
testID="input-phone"
accessibilityLabelledBy="phone-label"

// Email Label - Add:
accessible={true}
accessibilityRole="header"
nativeID="email-label"

// Email Input TextInput - Add:
accessible={true}
accessibilityLabel="Email input"
accessibilityHint="Enter your email address. This field is optional"
accessibilityRole="text"
testID="input-email"
accessibilityLabelledBy="email-label"
```

---

### 5. Date Selection Section (Line ~943-947 + map)
**Components Affected:**
- "Select Date" header
- Date scroll container
- Individual date buttons
- Date cards (selected vs unselected)

**Key Accessibility Patterns:**
- `accessibilityRole="button"` for date buttons
- `accessibilityState={{ selected: isSelected }}` for selection state
- `accessibilityRole="adjustable"` for scroll container

**Enhancements:**

```tsx
// Date Section Header - Add:
accessible={true}
accessibilityRole="header"

// Date Scroll ScrollView - Add:
accessible={true}
accessibilityRole="adjustable"
accessibilityLabel="Date selection carousel"

// Date Button TouchableOpacity - Add:
accessible={true}
accessibilityLabel={dateLabel} // "Monday, 11/13"
accessibilityRole="button"
accessibilityState={{ selected: isSelected }}
accessibilityHint={isSelected ? 'Selected date' : 'Double tap to select this date'}
testID={`date-button-${index}`}

// Date Card Text elements - Add:
accessible={true}
accessibilityRole="text"
```

---

### 6. Time Selection Section (Line ~943-1000+)
**Components Affected:**
- "Select Time" header
- Time grid container
- Individual time buttons
- No time slots alert

**Key Accessibility Patterns:**
- `accessibilityRole="button"` for time slot buttons
- `accessibilityState={{ selected: isSelected }}` for selection state
- `accessibilityRole="alert"` for no-slots message
- `accessibilityLiveRegion="assertive"` for no-slots alert

**Enhancements:**

```tsx
// Time Section Header - Add:
accessible={true}
accessibilityRole="header"

// Time Grid View - Add:
accessible={true}
accessibilityRole="region"
accessibilityLabel="Available time slots"

// Time Button TouchableOpacity - Add:
accessible={true}
accessibilityLabel={`${time} time slot`}
accessibilityRole="button"
accessibilityState={{ selected: isSelected }}
accessibilityHint={isSelected ? 'Selected time' : 'Double tap to select this time'}
testID={`time-button-${time}`}

// No Time Slots Alert - Add:
accessible={true}
accessibilityRole="alert"
accessibilityLiveRegion="assertive"
testID="no-time-slots-alert"
```

---

### 7. Action Buttons Section (Line ~1100+)
**Components Affected:**
- "Get Queue" button
- "Directions" button
- "Schedule Visit" button
- Button loading states

**Key Accessibility Patterns:**
- `accessibilityState={{ disabled: isLoading }}` for disabled state
- `accessibilityHint` describing button purpose and action
- `accessible={true}` for ActivityIndicator when loading

**Enhancements:**

```tsx
// Get Queue Button - Add:
accessible={true}
accessibilityLabel="Get queue number"
accessibilityRole="button"
accessibilityState={{ disabled: gettingQueue }}
accessibilityHint="Tap to get your queue number for this store"
testID="get-queue-button"

// Directions Button - Add:
accessible={true}
accessibilityLabel="Get directions to store"
accessibilityRole="button"
accessibilityHint="Opens maps application with store location"
testID="directions-button"

// Schedule Visit Button - Add:
accessible={true}
accessibilityLabel="Schedule store visit"
accessibilityRole="button"
accessibilityState={{ disabled: schedulingVisit }}
accessibilityHint="Tap to schedule your visit with the selected date and time"
testID="schedule-visit-button"

// Loading Indicators - Add:
accessible={true}
accessibilityLabel="Getting queue number" // or appropriate action
```

---

## Accessibility Patterns Used

### 1. Live Region Updates
- **Crowd Level Badge**: Uses `accessibilityLiveRegion="polite"` to announce updates when crowd status changes (every 30 seconds)
- **Queue Number**: Uses `accessibilityLiveRegion="polite"` to announce when queue number is assigned
- **No Time Slots Alert**: Uses `accessibilityLiveRegion="assertive"` for immediate attention

### 2. State Management
- **Selected Date/Time**: Uses `accessibilityState={{ selected: true/false }}` for button groups
- **Disabled Buttons**: Uses `accessibilityState={{ disabled: true/false }}` during loading states
- **Status Indicators**: Uses `accessibilityRole="status"` for real-time information

### 3. Form Accessibility
- **Input Labels**: Uses `nativeID` and `accessibilityLabelledBy` to link labels to inputs
- **Input Hints**: Provides `accessibilityHint` with validation requirements
- **Required Fields**: Marked with asterisk (*) in accessible label

### 4. Navigation Hierarchy
- **Headers**: Proper use of `accessibilityRole="header"` for heading hierarchy
- **Regions**: Logical grouping with `accessibilityRole="region"` and descriptive labels
- **Buttons**: Clear action labels with helpful hints

### 5. Testing Integration
All key interactive components have `testID` props for automated testing:
- `store-visit-back-button`
- `store-name-header`
- `crowd-level-status`
- `queue-number-display`
- `store-open-status`
- `input-name`, `input-phone`, `input-email`
- `date-button-${index}`
- `time-button-${time}`
- `get-queue-button`
- `directions-button`
- `schedule-visit-button`
- `no-time-slots-alert`

---

## Expected Impact

### Components Made Accessible
**Total Components with Accessibility Props: 45+**

1. Back button
2. Store name header
3. Category badge
4. Address container
5. Live availability card
6. Crowd level indicator
7. Queue number display
8. Updated timestamp
9. Store hours card
10. Status badge (open/closed)
11. Hours text
12. Details form container
13. Name label & input
14. Phone label & input
15. Email label & input
16. Date section header
17. Date scroll container
18. 7x Date buttons + cards
19. Time section header
20. Time grid container
21. 12x Time slot buttons
22. No time slots alert
23. Action buttons container
24. Get Queue button
25. Directions button
26. Schedule Visit button
27. Loading indicators (3x)

### Key Accessible Areas
1. **Navigation**: Back button fully accessible with hints
2. **Real-Time Status**: Crowd level and queue number with live region announcements
3. **Date/Time Selection**: Full keyboard and screen reader support for date picker
4. **Form Inputs**: All inputs with labels, hints, and validation feedback
5. **Action Buttons**: Clear labels and state indicators
6. **Dynamic Content**: Alerts for unavailable time slots with live region support

---

## Accessibility Compliance
- WCAG 2.1 Level AA
- React Native Accessibility Guidelines
- iOS VoiceOver compatibility
- Android TalkBack compatibility
- Keyboard navigation support
- Screen reader announcements for dynamic content

---

## Implementation Notes
1. All icon-only elements have `accessible={false}` to prevent redundant announcements
2. Wrapper containers with just visual purposes marked `accessible={false}`
3. Dynamic state changes use appropriate live regions (polite for status, assertive for alerts)
4. Form accessibility uses semantic linking with nativeID and accessibilityLabelledBy
5. All buttons have both action labels and helpful hints for context
