# ReferralQRModal - Visual Reference Guide

**Quick reference for Agent 4 during implementation**

---

## Component Hierarchy

```
Modal (transparent)
└── Backdrop (animated opacity)
    └── Modal Container (animated translateY)
        ├── Header (gradient)
        │   ├── Title Text
        │   └── Close Button (44x44)
        │
        └── ScrollView
            ├── QR Code Section
            │   ├── Section Title
            │   ├── QR Container (240x240)
            │   │   └── QRCode Component (200x200)
            │   └── Subtitle Text
            │
            ├── Code Display Section
            │   ├── Section Title
            │   └── Code Container
            │       ├── Code Text
            │       └── Copy Button (40x40)
            │
            ├── Platforms Section
            │   ├── Section Title
            │   └── Platform Grid (3x3)
            │       ├── Platform Button x7
            │       │   ├── Icon Circle (56x56)
            │       │   └── Label Text
            │       └── [empty space]
            │
            └── Download Button (full width)
```

---

## Layout Measurements (Quick Reference)

```
┌─────────────────────────────────────────┐
│  HEADER                           [X]   │ ← 64px height
│  Gradient: #8B5CF6 → #7C3AED           │
├─────────────────────────────────────────┤
│                                         │
│              QR Code Section            │ ← 20px top padding
│                                         │
│          ┌─────────────────┐          │
│          │                 │          │ ← QR: 240x240
│          │   QR 200x200    │          │   (20px padding)
│          │                 │          │
│          └─────────────────┘          │
│      "Scan to join with code"         │ ← 12px text
│                                         │
├─────────────────────────────────────────┤ ← 24px gap
│                                         │
│          Your Referral Code            │ ← 16px title
│                                         │
│  ┌───────────────────────────────────┐│
│  │ REF2025          [Copy Icon]     ││ ← 56px height
│  └───────────────────────────────────┘│   2px dashed
│                                         │
├─────────────────────────────────────────┤ ← 24px gap
│                                         │
│              Share via                  │ ← 16px title
│                                         │
│   [WhatsApp] [Facebook] [Instagram]   │
│      56x56       56x56      56x56      │ ← 16px gap
│                                         │
│   [Telegram]    [SMS]      [Email]    │
│      56x56       56x56      56x56      │ ← 20px row gap
│                                         │
│          [Copy Link]                   │
│            56x56                        │
│                                         │
├─────────────────────────────────────────┤ ← 24px gap
│                                         │
│  ┌───────────────────────────────────┐│
│  │ [📥] Download QR Code            ││ ← 56px height
│  └───────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘ ← 24px bottom
```

---

## Color Quick Reference

### Most Used Colors

```typescript
// Primary Actions
PRIMARY = '#8B5CF6'      // Main purple
PRIMARY_DARK = '#7C3AED' // Gradient end

// Backgrounds
WHITE = '#FFFFFF'        // Modal, QR container
GRAY_50 = '#F9FAFB'     // Code container background

// Text
GRAY_900 = '#111827'     // Main text
GRAY_500 = '#6B7280'     // Secondary text
GRAY_400 = '#9CA3AF'     // Tertiary text

// Borders
GRAY_200 = '#E5E7EB'     // Standard borders
GRAY_300 = '#D1D5DB'     // Dashed borders

// Platform Colors
WHATSAPP = '#25D366'
FACEBOOK = '#1877f2'
INSTAGRAM = '#E4405F'
TELEGRAM = '#0088cc'
SMS = '#10b981'
EMAIL = '#6366f1'
```

---

## Typography Quick Reference

```typescript
// Use these exact values
headerTitle: { fontSize: 20, fontWeight: '700' }
sectionTitle: { fontSize: 16, fontWeight: '600' }
bodyMedium: { fontSize: 14, fontWeight: '400' }
bodySmall: { fontSize: 12, fontWeight: '400' }
platformLabel: { fontSize: 12, fontWeight: '400' }
referralCode: { fontSize: 18, fontWeight: '700', letterSpacing: 2 }
```

---

## Animation Quick Reference

```typescript
// Modal Entrance
BACKDROP_FADE: 300ms, ease-out, opacity 0→1
SLIDE_UP: 400ms, spring (damping: 25, stiffness: 300)

// QR Code Reveal
DELAY: 200ms
DURATION: 300ms
FADE: opacity 0→1
SCALE: scale 0.9→1

// Platform Buttons
INITIAL_DELAY: 300ms
STAGGER: 50ms per button
DURATION: 250ms
FADE: opacity 0→1
TRANSLATE: translateY 10→0

// Button Press
PRESS_IN: scale 1→0.95, 100ms
PRESS_OUT: scale 0.95→1, 150ms
```

---

## Shadow Quick Reference

```typescript
// QR Container
shadow: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
}

// Platform Icons
shadow: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 4,
  elevation: 3,
}

// Modal Container
shadow: {
  // Implicit from borderTopRadius
  elevation: 8,
}
```

---

## Touch Targets

```
Minimum: 44x44 (iOS HIG)
Recommended: 48x48 (Material Design)

Element Sizes:
Close Button: 44x44 ✓
Copy Button: 40x40 ✓ (within 56px container)
Platform Icon: 56x56 ✓
Download Button: 56px height, full width ✓
```

---

## Spacing Values

```typescript
const SPACING = {
  xs: 4,    // Rarely used
  sm: 8,    // Icon-text gap
  md: 12,   // QR subtitle, small gaps
  lg: 16,   // Section padding, column gap
  xl: 20,   // Header padding, row gap
  xxl: 24,  // Section gaps
  xxxl: 32, // Large gaps (if needed)
};
```

---

## Border Radius Values

```typescript
const RADIUS = {
  sm: 8,    // Copy button, retry button
  md: 12,   // Code container, platform buttons
  lg: 16,   // QR container, download button
  xl: 20,   // Large cards
  xxl: 24,  // Modal top corners
  full: 28, // Platform icons (56÷2)
};
```

---

## State Visual Indicators

### Loading State
```
┌─────────────────┐
│                 │
│   [Spinner]     │  ← ActivityIndicator, purple
│  "Generating    │
│   QR code..."   │
│                 │
└─────────────────┘
```

### Error State
```
┌─────────────────┐
│                 │
│   [⚠️ Icon]     │  ← alert-circle, red
│  "QR Code       │
│  Unavailable"   │
│                 │
│ [Try Again]     │  ← Retry button
└─────────────────┘
```

### Copy Success
```
Before: [📋 Copy]
After:  [✓ Copied]  (2 seconds)
```

---

## Platform Icons Mapping

```typescript
const ICON_MAP = {
  whatsapp: 'logo-whatsapp',
  facebook: 'logo-facebook',
  instagram: 'logo-instagram',
  telegram: 'paper-plane',
  sms: 'chatbox',
  email: 'mail',
  copy: 'copy-outline',
};
```

---

## Grid Calculation

```typescript
// 3 columns with 16px gap
const screenWidth = Dimensions.get('window').width;
const contentPadding = 40; // 20px each side
const columnGap = 32; // 2 gaps × 16px
const buttonWidth = (screenWidth - contentPadding - columnGap) / 3;

// Result: ~110px per button on standard phone
```

---

## Accessibility Labels Template

```typescript
// Close Button
accessibilityLabel="Close share modal"
accessibilityHint="Closes the QR code sharing screen"
accessibilityRole="button"

// Platform Button (example)
accessibilityLabel="Share via WhatsApp"
accessibilityHint="Opens WhatsApp to share your referral code"
accessibilityRole="button"

// QR Code
accessibilityLabel="Your referral QR code"
accessibilityHint="QR code containing your referral link: {link}"
accessibilityRole="image"

// Copy Button
accessibilityLabel={copied ? "Code copied" : "Copy referral code"}
accessibilityHint="Copies your referral code to clipboard"
accessibilityRole="button"
```

---

## Common Pitfalls to Avoid

### ❌ Don't
```typescript
// Don't hardcode dimensions
width: 350

// Don't use inline styles for colors
color: '#8B5CF6'

// Don't skip accessibility
<TouchableOpacity onPress={...}>

// Don't use setTimeout without cleanup
setTimeout(() => setCopied(false), 2000)

// Don't animate without useNativeDriver
Animated.timing(value, { useNativeDriver: false })
```

### ✅ Do
```typescript
// Do use relative dimensions
width: Dimensions.get('window').width - 40

// Do use color constants
color: COLORS.primary

// Do add accessibility
<TouchableOpacity
  onPress={...}
  accessibilityLabel="..."
  accessibilityRole="button"
>

// Do cleanup timeouts
useEffect(() => {
  const timer = setTimeout(...);
  return () => clearTimeout(timer);
}, []);

// Do use native driver
Animated.timing(value, { useNativeDriver: true })
```

---

## Import Checklist

```typescript
// Required imports
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { ThemedText } from '@/components/ThemedText';
```

---

## Testing Quick Commands

```bash
# Run tests
npm test ReferralQRModal

# Visual regression
npm run test:visual

# Accessibility audit
npm run test:a11y

# Performance profile
npm run test:perf
```

---

## Integration Code Snippet

```typescript
// In app/referral.tsx
import ReferralQRModal from '@/components/referral/ReferralQRModal';

const [qrModalVisible, setQRModalVisible] = useState(false);

// Add button
<TouchableOpacity onPress={() => setQRModalVisible(true)}>
  <Ionicons name="qr-code-outline" size={24} />
  <Text>View QR Code</Text>
</TouchableOpacity>

// Add modal
<ReferralQRModal
  visible={qrModalVisible}
  referralCode={codeInfo?.referralCode || ''}
  referralLink={codeInfo?.referralLink || ''}
  onClose={() => setQRModalVisible(false)}
  onShare={(platform) => console.log('Shared via', platform)}
/>
```

---

## Performance Targets

```
Modal Open Time: <400ms
QR Generation: <1000ms
Animation FPS: 60fps
Memory Usage: <50MB increase
Bundle Size: <100KB added
```

---

## Quick Links

- Full Spec: `REFERRAL_QR_MODAL_DESIGN_SPEC.md`
- Summary: `AGENT_5_DELIVERY_SUMMARY.md`
- Existing Modal: `components/referral/ShareModal.tsx`
- QR Page: `app/profile/qr-code.tsx`
- Referral Page: `app/referral.tsx`

---

**This is a quick reference only. See full specification for complete details.**
