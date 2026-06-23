# Rez App Design System

Complete design system documentation including colors, typography, spacing, shadows, and component standards.

## Table of Contents

- [Overview](#overview)
- [Color Palette](#color-palette)
- [Typography](#typography)
- [Spacing System](#spacing-system)
- [Border Radius](#border-radius)
- [Shadows & Elevation](#shadows--elevation)
- [Icons](#icons)
- [Animation](#animation)
- [Breakpoints](#breakpoints)
- [Layout Grid](#layout-grid)

---

## Overview

The Rez App design system provides a consistent visual language across all platforms (iOS, Android, Web). It follows Material Design and iOS Human Interface Guidelines principles while maintaining a unique brand identity.

### Design Principles

1. **Consistency** - Uniform appearance and behavior
2. **Accessibility** - WCAG 2.1 AA compliant
3. **Performance** - Optimized for mobile devices
4. **Scalability** - Works across screen sizes
5. **Clarity** - Clear visual hierarchy

---

## Color Palette

### Theme Colors

The app supports both light and dark themes with automatic switching based on system preferences.

#### Light Theme

```typescript
light: {
  // Primary Colors
  text: '#0f172a',              // Slate 900 - Main text
  background: '#ffffff',         // White - Main background
  tint: '#6366f1',              // Indigo 500 - Interactive elements

  // Surface Colors
  surface: '#f8fafc',           // Slate 50 - Card backgrounds
  surfaceSecondary: '#f1f5f9',  // Slate 100 - Secondary surfaces

  // Border & Dividers
  border: '#e2e8f0',            // Slate 200 - Borders

  // Brand Colors
  primary: '#6366f1',           // Indigo 500 - Primary brand
  secondary: '#8b5cf6',         // Purple 500 - Secondary brand
  accent: '#06b6d4',            // Cyan 500 - Accent highlights

  // Status Colors
  success: '#10b981',           // Emerald 500 - Success states
  warning: '#f59e0b',           // Amber 500 - Warning states
  error: '#ef4444',             // Red 500 - Error states

  // Text Variants
  textSecondary: '#475569',     // Slate 600 - Secondary text
  textMuted: '#64748b',         // Slate 500 - Muted text

  // Icon Colors
  icon: '#64748b',              // Slate 500 - Default icons
  tabIconDefault: '#94a3b8',    // Slate 400 - Inactive tabs
  tabIconSelected: '#6366f1',   // Indigo 500 - Active tabs
}
```

#### Dark Theme

```typescript
dark: {
  // Primary Colors
  text: '#f8fafc',              // Slate 50 - Main text
  background: '#0f172a',         // Slate 900 - Main background
  tint: '#a5b4fc',              // Indigo 300 - Interactive elements

  // Surface Colors
  surface: '#1e293b',           // Slate 800 - Card backgrounds
  surfaceSecondary: '#334155',  // Slate 700 - Secondary surfaces

  // Border & Dividers
  border: '#475569',            // Slate 600 - Borders

  // Brand Colors
  primary: '#a5b4fc',           // Indigo 300 - Primary brand
  secondary: '#c4b5fd',         // Purple 300 - Secondary brand
  accent: '#67e8f9',            // Cyan 300 - Accent highlights

  // Status Colors
  success: '#34d399',           // Emerald 400 - Success states
  warning: '#fbbf24',           // Amber 400 - Warning states
  error: '#f87171',             // Red 400 - Error states

  // Text Variants
  textSecondary: '#cbd5e1',     // Slate 300 - Secondary text
  textMuted: '#94a3b8',         // Slate 400 - Muted text

  // Icon Colors
  icon: '#64748b',              // Slate 500 - Default icons
  tabIconDefault: '#475569',    // Slate 600 - Inactive tabs
  tabIconSelected: '#a5b4fc',   // Indigo 300 - Active tabs
}
```

### Usage

```typescript
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';

// In components
const backgroundColor = useThemeColor({}, 'background');
const primaryColor = useThemeColor({}, 'primary');

// Override theme colors
const customColor = useThemeColor(
  { light: '#FF0000', dark: '#FF6B6B' },
  'primary'
);
```

### Color Guidelines

**Do's:**
- Use primary color for main CTAs and interactive elements
- Use secondary color for less prominent actions
- Use semantic colors (success, warning, error) for status
- Maintain sufficient contrast (4.5:1 for text, 3:1 for UI elements)

**Don'ts:**
- Don't use too many colors in one view
- Don't use color as the only indicator of state
- Don't hardcode colors - use theme system
- Don't use saturated colors for large areas

### Semantic Color Usage

```typescript
// Success - Positive actions, confirmations
backgroundColor: Colors.light.success  // #10b981

// Warning - Cautions, important information
backgroundColor: Colors.light.warning  // #f59e0b

// Error - Errors, destructive actions
backgroundColor: Colors.light.error    // #ef4444

// Primary - Main CTAs, key interactions
backgroundColor: Colors.light.primary  // #6366f1

// Secondary - Less prominent actions
backgroundColor: Colors.light.secondary // #8b5cf6

// Accent - Highlights, special features
backgroundColor: Colors.light.accent   // #06b6d4
```

---

## Typography

### Font Scale

```typescript
// Display - Large headings
{
  fontSize: 32,
  lineHeight: 40,
  fontWeight: '700',
}

// Title - Page titles
{
  fontSize: 24,
  lineHeight: 32,
  fontWeight: '700',
}

// Heading - Section headings
{
  fontSize: 20,
  lineHeight: 28,
  fontWeight: '600',
}

// Subheading - Subsection headings
{
  fontSize: 18,
  lineHeight: 24,
  fontWeight: '600',
}

// Body - Regular text
{
  fontSize: 16,
  lineHeight: 24,
  fontWeight: '400',
}

// Body Semi-Bold - Emphasized text
{
  fontSize: 16,
  lineHeight: 24,
  fontWeight: '600',
}

// Small - Secondary information
{
  fontSize: 14,
  lineHeight: 20,
  fontWeight: '400',
}

// Caption - Labels, metadata
{
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '400',
}

// Tiny - Fine print
{
  fontSize: 10,
  lineHeight: 14,
  fontWeight: '400',
}
```

### ThemedText Types

```tsx
// Title (32px, bold)
<ThemedText type="title">Page Title</ThemedText>

// Subtitle (20px, bold)
<ThemedText type="subtitle">Section Heading</ThemedText>

// Default (16px, regular)
<ThemedText type="default">Body text</ThemedText>

// Default Semi-Bold (16px, semi-bold)
<ThemedText type="defaultSemiBold">Important text</ThemedText>

// Link (16px, colored)
<ThemedText type="link">Click here</ThemedText>
```

### Font Weights

```typescript
// Regular
fontWeight: '400'

// Medium
fontWeight: '500'

// Semi-Bold
fontWeight: '600'

// Bold
fontWeight: '700'
```

### Line Height

Use 1.5x multiplier for readability:

```typescript
fontSize: 16  → lineHeight: 24
fontSize: 14  → lineHeight: 20
fontSize: 12  → lineHeight: 16
```

### Typography Guidelines

**Do's:**
- Use ThemedText for all text
- Maintain consistent hierarchy
- Use appropriate line height
- Limit line length (60-70 characters)

**Don'ts:**
- Don't use too many font sizes
- Don't use all caps for long text
- Don't use font sizes below 12px for body text
- Don't use light font weights on colored backgrounds

---

## Spacing System

Based on 4px grid system for consistent spacing.

### Scale

```typescript
// Extra Small
xs: 4   // 4px

// Small
sm: 8   // 8px

// Medium
md: 12  // 12px

// Large
lg: 16  // 16px

// Extra Large
xl: 20  // 20px

// 2X Large
2xl: 24 // 24px

// 3X Large
3xl: 32 // 32px

// 4X Large
4xl: 40 // 40px

// 5X Large
5xl: 48 // 48px

// 6X Large
6xl: 64 // 64px
```

### Usage Examples

```typescript
// Padding
paddingHorizontal: 16,  // lg
paddingVertical: 12,    // md

// Margin
marginBottom: 8,        // sm
marginTop: 16,          // lg

// Gap (Flexbox)
gap: 12,                // md

// Component Spacing
marginVertical: 6,      // Between list items
padding: 16,            // Card padding
```

### Layout Spacing

```typescript
// Screen padding
screenPadding: 16       // lg

// Card padding
cardPadding: 16         // lg

// Section spacing
sectionSpacing: 24      // 2xl

// Element spacing
elementSpacing: 12      // md

// Inline spacing
inlineSpacing: 8        // sm
```

---

## Border Radius

Consistent corner rounding for visual harmony.

```typescript
// None
borderRadius: 0

// Small - Chips, badges
borderRadius: 4

// Medium - Buttons, inputs
borderRadius: 8

// Large - Cards
borderRadius: 12

// Extra Large - Modals
borderRadius: 16

// 2X Large - Bottom sheets
borderRadius: 20

// Circle - Icons, avatars
borderRadius: 999  // or 50% of width/height
```

### Usage Examples

```typescript
// Button
{
  borderRadius: 8,
}

// Card
{
  borderRadius: 12,
}

// Modal
{
  borderRadius: 16,
}

// Avatar
{
  borderRadius: 999,
  width: 40,
  height: 40,
}

// Badge
{
  borderRadius: 4,
  paddingHorizontal: 8,
  paddingVertical: 4,
}
```

---

## Shadows & Elevation

Following Material Design elevation levels.

### iOS Shadows

```typescript
// Small - Level 1
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
}

// Medium - Level 2
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
}

// Large - Level 3
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
}

// Extra Large - Level 4
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 24,
}
```

### Android Elevation

```typescript
// Small
elevation: 2

// Medium
elevation: 3

// Large
elevation: 6

// Extra Large
elevation: 12
```

### Combined (Cross-platform)

```typescript
// Small elevation
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 2,
}

// Medium elevation
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 3,
}

// Large elevation
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 6,
}
```

### Usage Guidelines

- **Level 0** - Flat surfaces, inline elements
- **Level 1** - Buttons, chips (2dp)
- **Level 2** - Cards, list items (3dp)
- **Level 3** - Modals, dialogs (6dp)
- **Level 4** - Bottom sheets, navigation drawers (12dp)

---

## Icons

Using Expo's Ionicons for consistent iconography.

### Icon Sizes

```typescript
// Extra Small
16  // Inline icons, badges

// Small
20  // Buttons, tabs

// Medium
24  // Default size, list items

// Large
32  // Headers, emphasis

// Extra Large
48  // Feature icons, empty states

// Huge
64  // Large empty states, illustrations
```

### Usage

```tsx
import { Ionicons } from '@expo/vector-icons';

// In button
<Ionicons name="cart" size={20} color="#FFFFFF" />

// In header
<Ionicons name="menu" size={24} color="#0f172a" />

// Empty state
<Ionicons name="cart-outline" size={64} color="#9CA3AF" />
```

### Icon Naming Conventions

- Use `-outline` suffix for outlined variants
- Use `-sharp` suffix for sharp variants
- Default is filled solid style

### Common Icons

```typescript
// Navigation
'arrow-back', 'arrow-forward', 'close', 'menu'

// Actions
'add', 'remove', 'edit', 'delete', 'save', 'share'

// Status
'checkmark-circle', 'alert-circle', 'information-circle'

// E-commerce
'cart', 'heart', 'star', 'wallet', 'card'

// Media
'play', 'pause', 'image', 'camera', 'video'

// Communication
'mail', 'call', 'chatbubble', 'notifications'

// User
'person', 'settings', 'log-in', 'log-out'

// Location
'location', 'map', 'navigate'

// Time
'time', 'calendar', 'stopwatch'
```

---

## Animation

Consistent animation timing for smooth interactions.

### Duration

```typescript
// Instant - Immediate feedback
75   // ms

// Quick - Fast transitions
150  // ms

// Normal - Default animations
200  // ms

// Smooth - Smooth transitions
300  // ms

// Slow - Emphasis animations
400  // ms

// Drawer - Slide-in panels
500  // ms
```

### Easing

```typescript
// Default easing
Easing.bezier(0.4, 0.0, 0.2, 1)  // Material Design standard

// Ease In
Easing.bezier(0.4, 0.0, 1, 1)

// Ease Out
Easing.bezier(0.0, 0.0, 0.2, 1)

// Ease In Out
Easing.bezier(0.4, 0.0, 0.2, 1)
```

### Common Animations

```tsx
// Fade in
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,
}).start();

// Scale (press feedback)
Animated.sequence([
  Animated.timing(scaleAnim, {
    toValue: 0.95,
    duration: 100,
    useNativeDriver: true,
  }),
  Animated.timing(scaleAnim, {
    toValue: 1,
    duration: 100,
    useNativeDriver: true,
  }),
]).start();

// Slide in
Animated.timing(slideAnim, {
  toValue: 0,
  duration: 300,
  easing: Easing.bezier(0.4, 0.0, 0.2, 1),
  useNativeDriver: true,
}).start();
```

---

## Breakpoints

Responsive design breakpoints for different screen sizes.

### Screen Sizes

```typescript
// Extra Small (phones in portrait)
xs: 0    // 0-374px

// Small (phones)
sm: 375  // 375-767px

// Medium (tablets in portrait)
md: 768  // 768-1023px

// Large (tablets in landscape, small desktops)
lg: 1024 // 1024-1279px

// Extra Large (desktops)
xl: 1280 // 1280px+
```

### Usage

```tsx
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const isSmallScreen = width < 375;
const isMediumScreen = width >= 768 && width < 1024;
const isLargeScreen = width >= 1024;

// Responsive styling
const styles = StyleSheet.create({
  container: {
    padding: isSmallScreen ? 12 : 16,
  },
  text: {
    fontSize: isSmallScreen ? 14 : 16,
  },
});
```

---

## Layout Grid

12-column grid system for consistent layouts.

### Grid System

```typescript
// Column width calculation
const columnWidth = (containerWidth - gutters) / 12;

// Standard gutters
const gutter = 16; // Between columns

// Margins
const margin = 16; // Screen edges
```

### Common Layouts

```typescript
// Full width (12 columns)
width: '100%'

// Half width (6 columns)
width: '50%'

// Third width (4 columns)
width: '33.333%'

// Quarter width (3 columns)
width: '25%'

// Two-thirds (8 columns)
width: '66.666%'
```

### Responsive Columns

```tsx
// 2 columns on small, 3 on medium, 4 on large
const numColumns = width < 768 ? 2 : width < 1024 ? 3 : 4;

<FlatList
  data={items}
  numColumns={numColumns}
  key={numColumns} // Important for re-render
/>
```

---

## Component Standards

### Touch Targets

Minimum 44x44 points (iOS) / 48x48 dp (Android) for all interactive elements.

```typescript
const MIN_TOUCH_TARGET_SIZE = 44;

// Button
{
  minWidth: MIN_TOUCH_TARGET_SIZE,
  minHeight: MIN_TOUCH_TARGET_SIZE,
}
```

### Opacity

```typescript
// Disabled state
opacity: 0.5

// Pressed state
opacity: 0.7

// Hover state (web)
opacity: 0.9
```

### Active Opacity

```tsx
<TouchableOpacity activeOpacity={0.7}>
  <Text>Button</Text>
</TouchableOpacity>
```

---

## Design Tokens Reference

Quick reference for common design tokens:

```typescript
export const DesignTokens = {
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Border Radius
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 999,
  },

  // Font Sizes
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Font Weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Opacity
  opacity: {
    disabled: 0.5,
    pressed: 0.7,
    hover: 0.9,
  },

  // Touch Target
  touchTarget: 44,

  // Z-Index
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};
```

---

## Version History

- **v1.0.0** - Initial design system documentation (2025-11-11)
