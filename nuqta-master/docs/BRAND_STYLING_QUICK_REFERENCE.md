# ReZ Brand Styling Quick Reference Card

## 🎨 Brand Colors (Copy-Paste Ready)

```typescript
// Primary Colors
const COLORS = {
  primaryGreen: '#00C06A',
  deepTeal: '#00796B',
  sunGold: '#FFC857',
  midnightNavy: '#0B2240',
  surface: '#F7FAFC',
};

// Tint Variations (for backgrounds)
const TINTS = {
  green8: 'rgba(0, 192, 106, 0.08)',
  green10: 'rgba(0, 192, 106, 0.1)',
  green15: 'rgba(0, 192, 106, 0.15)',
  green20: 'rgba(0, 192, 106, 0.2)',
};
```

---

## 📦 Card Shadow Template

```typescript
// Premium Card Shadow (for main cards)
{
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.15)',
  ...Platform.select({
    ios: {
      shadowColor: '#00C06A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: '0px 8px 20px rgba(0, 192, 106, 0.15)',
    },
  }),
}

// Medium Card Shadow (for action grids)
{
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.1)',
  ...Platform.select({
    ios: {
      shadowColor: '#00C06A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
    },
    web: {
      boxShadow: '0px 6px 16px rgba(0, 192, 106, 0.12)',
    },
  }),
}

// Light Icon Shadow (for icons)
{
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.15)',
  ...Platform.select({
    ios: {
      shadowColor: '#00C06A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0px 4px 8px rgba(0, 192, 106, 0.1)',
    },
  }),
}
```

---

## 🔘 Icon Container Template

```typescript
// Standard Icon Container
{
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: 'rgba(0, 192, 106, 0.08)',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.15)',
}

// Small Icon Container
{
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: 'rgba(0, 192, 106, 0.08)',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.2)',
}

// Large Icon Container
{
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: 'rgba(0, 192, 106, 0.1)',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.2)',
}
```

---

## 📝 Typography Templates

```typescript
// Section Title
{
  fontSize: 18,
  fontWeight: '700',
  fontFamily: 'Poppins-Bold',
  color: '#00796B', // Deep Teal
}

// Card Title
{
  fontSize: 16,
  fontWeight: '600',
  color: '#0B2240', // Midnight Navy
}

// Body Text
{
  fontSize: 14,
  fontWeight: '500',
  color: '#0B2240', // Midnight Navy
}

// Label Text
{
  fontSize: 12,
  fontWeight: '600',
  color: '#0B2240', // Midnight Navy
}

// Value/Accent Text
{
  fontSize: 12,
  fontWeight: '600',
  fontFamily: 'Inter-SemiBold',
  color: '#00C06A', // Primary Green
}

// Highlight Text
{
  fontSize: 14,
  fontWeight: '700',
  color: '#FFC857', // Sun Gold
}
```

---

## 🏷️ Badge Templates

```typescript
// NEW Badge (Primary Green)
{
  backgroundColor: '#00C06A',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
}
// Badge Text: white

// HOT Badge (Sun Gold)
{
  backgroundColor: '#FFC857',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
}
// Badge Text: #0B2240

// POPULAR Badge (on gradients)
{
  backgroundColor: 'rgba(11, 34, 64, 0.3)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.4)',
}
// Badge Text: white
```

---

## 🎨 Gradient Templates

```typescript
// Sun Gold Gradient (Premium)
colors={['#FFC857', '#FFB020']}
start={{ x: 0, y: 0 }}
end={{ x: 1, y: 1 }}

// Primary Green Gradient (Actions)
colors={['#00C06A', '#00A16B']}
start={{ x: 0, y: 0 }}
end={{ x: 1, y: 1 }}

// Deep Teal Gradient (Secondary)
colors={['#00796B', '#005B52']}
start={{ x: 0, y: 0 }}
end={{ x: 1, y: 1 }}

// Header Gradient (Multi-color)
colors={['#00C06A', '#00A16B', '#FFC857']}
start={{ x: 0, y: 0 }}
end={{ x: 1, y: 1 }}
```

---

## 🔲 Button Templates

```typescript
// Primary Button
{
  backgroundColor: '#00C06A',
  paddingHorizontal: 20,
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: 'center',
}
// Text: white, fontSize: 16, fontWeight: '600'

// Secondary Button
{
  backgroundColor: 'white',
  paddingHorizontal: 20,
  paddingVertical: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.3)',
  alignItems: 'center',
}
// Text: #00C06A, fontSize: 16, fontWeight: '600'

// View All Button (Pill)
{
  backgroundColor: 'rgba(0, 192, 106, 0.08)',
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.2)',
}
// Text: #00C06A, fontSize: 14, fontWeight: '600'
```

---

## 📏 Spacing System

```typescript
// Base unit: 4px

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

// Common paddings
padding: 16,        // Standard card padding
paddingVertical: 14,   // Button padding
paddingHorizontal: 20, // Button padding

// Common margins
marginBottom: 16,   // Between sections
marginBottom: 18,   // Larger section gaps
```

---

## 🔢 Border Radius System

```typescript
const RADIUS = {
  sm: 8,    // Small elements
  md: 12,   // Medium buttons
  lg: 16,   // Cards
  xl: 20,   // Large cards/Feature cards
  pill: 24, // Pill buttons
  circle: 999, // Perfectly round
};

// Icon containers use half of width/height
// Example: width: 48 → borderRadius: 24
```

---

## ⚡ Icon Size Guide

```typescript
// Icon sizes
const ICON_SIZES = {
  xs: 16,   // Tiny icons in badges
  sm: 20,   // Small UI icons
  md: 24,   // Standard icons
  lg: 28,   // Large emoji/icons
  xl: 40,   // Feature icons
};

// Container sizes
const CONTAINER_SIZES = {
  xs: 32,   // Small containers
  sm: 44,   // Minimum touch target
  md: 48,   // Standard
  lg: 56,   // Large
  xl: 60,   // Extra large
};
```

---

## 🎯 When to Use Which Color

### Primary Green (#00C06A)
- ✅ Primary actions
- ✅ Success states
- ✅ Value displays (coins, savings)
- ✅ Active/selected states
- ✅ Shadows (as tint)

### Deep Teal (#00796B)
- ✅ Section headers
- ✅ Navigation elements
- ✅ Secondary gradients
- ✅ Category labels

### Sun Gold (#FFC857)
- ✅ Premium features
- ✅ Highlights & accents
- ✅ HOT badges
- ✅ Points/rewards
- ✅ Call-to-attention

### Midnight Navy (#0B2240)
- ✅ Body text
- ✅ Labels
- ✅ Descriptive text
- ✅ Icon colors (for contrast)

### Surface (#F7FAFC)
- ✅ Page backgrounds
- ✅ Section backgrounds
- ✅ Card inner sections

---

## 🚀 Quick Copy-Paste Snippets

### Full Card Style
```typescript
cardContainer: {
  backgroundColor: 'white',
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.15)',
  ...Platform.select({
    ios: {
      shadowColor: '#00C06A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
    web: { boxShadow: '0px 8px 20px rgba(0, 192, 106, 0.15)' },
  }),
}
```

### Icon with Background
```typescript
iconContainer: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: 'rgba(0, 192, 106, 0.08)',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.15)',
}

<View style={iconContainer}>
  <Ionicons name="icon-name" size={24} color="#0B2240" />
</View>
```

### Section Header
```typescript
<View style={styles.sectionHeader}>
  <ThemedText style={styles.sectionTitle}>Section Title</ThemedText>
  <TouchableOpacity style={styles.viewAllButton}>
    <ThemedText style={styles.viewAllText}>View all</ThemedText>
  </TouchableOpacity>
</View>

sectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
}

sectionTitle: {
  fontSize: 18,
  fontWeight: '700',
  fontFamily: 'Poppins-Bold',
  color: '#00796B',
}

viewAllButton: {
  backgroundColor: 'rgba(0, 192, 106, 0.08)',
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(0, 192, 106, 0.2)',
}

viewAllText: {
  fontSize: 14,
  color: '#00C06A',
  fontWeight: '600',
}
```

---

## 🧪 Testing Checklist

### Visual
- [ ] Green tint visible in shadows
- [ ] Borders subtle but present
- [ ] Text readable on all backgrounds
- [ ] Icons properly sized
- [ ] Spacing feels comfortable

### Platform
- [ ] iOS: Shadows render smoothly
- [ ] Android: Elevation looks correct
- [ ] Web: Box shadows display properly

### Accessibility
- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Touch targets ≥ 44x44px
- [ ] Icons have descriptive labels
- [ ] Color not sole information carrier

---

**Quick Reference Version**: 1.0
**Last Updated**: December 3, 2025
**For**: ReZ App Premium UI Updates
