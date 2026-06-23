# Design System Guide

A comprehensive design system for the Rez App, built to match Amazon/Flipkart quality standards.

## Table of Contents

1. [Overview](#overview)
2. [Design Tokens](#design-tokens)
3. [UI Components](#ui-components)
4. [Usage Examples](#usage-examples)
5. [Migration Guide](#migration-guide)
6. [Best Practices](#best-practices)

---

## Overview

This design system provides a centralized source of truth for all design values, ensuring consistency, maintainability, and professional UI across the application.

### Key Benefits

- **Consistency**: Unified design language across all screens
- **Maintainability**: Update once, apply everywhere
- **Performance**: Optimized components with proper memoization
- **Accessibility**: Built-in ARIA labels and proper contrast ratios
- **Developer Experience**: TypeScript support with autocomplete

### Design Principles

1. **8px Grid System**: All spacing follows 8px increments (4, 8, 16, 24, 32...)
2. **Semantic Colors**: Use named colors (primary, error, success) instead of hex values
3. **Component Composition**: Build complex UIs from simple, reusable components
4. **Mobile-First**: Optimized for mobile devices with responsive considerations

---

## Design Tokens

Design tokens are the smallest design decisions in your design system, represented as data.

### Spacing Scale

Based on 8px grid system for visual consistency:

```typescript
import { SPACING } from '@/constants/DesignTokens';

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,        // 16px
    gap: SPACING.sm,            // 8px
    marginBottom: SPACING.lg,   // 24px
  },
});
```

**Available Spacing:**
- `xs`: 4px - Tight spacing within components
- `sm`: 8px - Small gaps between related items
- `md`: 16px - Default spacing for most use cases
- `lg`: 24px - Section spacing
- `xl`: 32px - Large section spacing
- `xxl`: 48px - Extra large spacing
- `xxxl`: 64px - Maximum spacing

### Typography Scale

Predefined text styles for consistent typography:

```typescript
import { TYPOGRAPHY } from '@/constants/DesignTokens';

const styles = StyleSheet.create({
  heading: {
    ...TYPOGRAPHY.h2,  // fontSize: 24, fontWeight: '600', lineHeight: 32
  },
  body: {
    ...TYPOGRAPHY.body, // fontSize: 16, fontWeight: '400', lineHeight: 24
  },
});
```

**Available Typography:**

| Variant | Size | Weight | Use Case |
|---------|------|--------|----------|
| `h1` | 32px | 700 | Page titles |
| `h2` | 24px | 600 | Section headings |
| `h3` | 20px | 600 | Subsection headings |
| `h4` | 18px | 600 | Card titles |
| `body` | 16px | 400 | Body text |
| `bodySmall` | 14px | 400 | Secondary text |
| `caption` | 12px | 400 | Small text |
| `overline` | 10px | 600 | Labels (uppercase) |
| `button` | 16px | 600 | Button text |
| `buttonSmall` | 14px | 600 | Small buttons |
| `link` | 16px | 500 | Hyperlinks |

### Color Palette

Semantic color system with accessibility-compliant contrast ratios:

```typescript
import { COLORS } from '@/constants/DesignTokens';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.primary,
    borderColor: COLORS.border.default,
  },
  text: {
    color: COLORS.text.primary,
  },
  button: {
    backgroundColor: COLORS.primary[500],
  },
});
```

**Color Categories:**

1. **Primary Brand Colors** (`COLORS.primary`)
   - Shades 50-900 for all brand color needs
   - Main: `primary[500]` - #6366F1

2. **Semantic Colors**
   - `error[500]`: #EF4444 - Errors, destructive actions
   - `warning[500]`: #F59E0B - Warnings, cautions
   - `success[500]`: #22C55E - Success states
   - `info[500]`: #3B82F6 - Informational messages

3. **Text Colors**
   - `text.primary`: #111827 - Main text
   - `text.secondary`: #6B7280 - Secondary text
   - `text.tertiary`: #9CA3AF - Tertiary text
   - `text.inverse`: #FFFFFF - Light text on dark backgrounds

4. **Background Colors**
   - `background.primary`: #FFFFFF - Main background
   - `background.secondary`: #F9FAFB - Secondary background
   - `background.tertiary`: #F3F4F6 - Tertiary background

5. **Border Colors**
   - `border.light`: #E5E7EB
   - `border.default`: #D1D5DB
   - `border.dark`: #9CA3AF

### Border Radius

Consistent corner radius values:

```typescript
import { BORDER_RADIUS } from '@/constants/DesignTokens';

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,    // 12px - Cards
  },
  button: {
    borderRadius: BORDER_RADIUS.md,    // 8px - Buttons
  },
  pill: {
    borderRadius: BORDER_RADIUS.full,  // 9999px - Pills/badges
  },
});
```

**Available Values:**
- `none`: 0px
- `xs`: 2px
- `sm`: 4px
- `md`: 8px
- `lg`: 12px
- `xl`: 16px
- `xxl`: 24px
- `full`: 9999px (circular)

### Shadows

Pre-configured shadow styles for depth:

```typescript
import { SHADOWS } from '@/constants/DesignTokens';

const styles = StyleSheet.create({
  card: {
    ...SHADOWS.md,  // Includes shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation
  },
});
```

**Available Shadows:**
- `none`: No shadow
- `sm`: Subtle shadow for small components
- `md`: Default shadow for cards
- `lg`: Prominent shadow for floating elements
- `xl`: Maximum shadow for modals

### Layout Constants

```typescript
import { LAYOUT } from '@/constants/DesignTokens';

// Max widths for responsive design
const maxWidth = LAYOUT.containerMaxWidth; // 1280px

// Common dimensions
const headerHeight = LAYOUT.headerHeight; // 56px
```

### Animation

```typescript
import { ANIMATION } from '@/constants/DesignTokens';

Animated.timing(animatedValue, {
  duration: ANIMATION.duration.normal, // 300ms
  easing: Easing.bezier(0.4, 0, 0.2, 1),
}).start();
```

### Icon Sizes

```typescript
import { ICON_SIZES } from '@/constants/DesignTokens';

<Icon size={ICON_SIZES.md} /> // 24px
```

---

## UI Components

Pre-built, accessible components following the design system.

### Button

A versatile button component with multiple variants and sizes.

```typescript
import { Button } from '@/components/ui';

// Primary button
<Button
  title="Add to Cart"
  onPress={() => {}}
  variant="primary"
  size="large"
  fullWidth
/>

// Outline button
<Button
  title="Cancel"
  onPress={() => {}}
  variant="outline"
  size="medium"
/>

// With loading state
<Button
  title="Processing..."
  onPress={() => {}}
  loading={true}
  disabled={true}
/>

// With icon
<Button
  title="Share"
  onPress={() => {}}
  icon={<ShareIcon />}
  variant="ghost"
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | - | Button text (required) |
| `onPress` | function | - | Click handler (required) |
| `variant` | 'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger' | 'primary' | Visual style |
| `size` | 'small' \| 'medium' \| 'large' | 'medium' | Button size |
| `disabled` | boolean | false | Disabled state |
| `loading` | boolean | false | Loading state |
| `fullWidth` | boolean | false | Full width button |
| `icon` | ReactNode | - | Icon element |

**Variants:**
- `primary`: Solid primary color (blue)
- `secondary`: Solid secondary color (green)
- `outline`: Transparent with border
- `ghost`: Text-only button
- `danger`: Red button for destructive actions

**Sizes:**
- `small`: 36px height
- `medium`: 44px height
- `large`: 52px height

### Card

A container component with elevation and styling options.

```typescript
import { Card } from '@/components/ui';

// Elevated card (default)
<Card variant="elevated" padding="md">
  <Text>Card content</Text>
</Card>

// Outlined card
<Card variant="outlined" padding="lg">
  <Text>Card content</Text>
</Card>

// Pressable card
<Card
  variant="elevated"
  padding="md"
  onPress={() => console.log('Card pressed')}
>
  <Text>Clickable card</Text>
</Card>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Card content (required) |
| `variant` | 'elevated' \| 'outlined' \| 'filled' | 'elevated' | Visual style |
| `padding` | SpacingKey | 'md' | Internal padding |
| `onPress` | function | - | Makes card pressable |

**Variants:**
- `elevated`: Shadow effect (default)
- `outlined`: Border without shadow
- `filled`: Background color

### Text

Typography component with semantic variants.

```typescript
import { Text } from '@/components/ui';

// Heading
<Text variant="h2" color="primary">
  Section Title
</Text>

// Body text
<Text variant="body" color="secondary">
  Description text
</Text>

// Caption
<Text variant="caption" color="tertiary">
  Helper text
</Text>

// Aligned text
<Text variant="body" align="center">
  Centered text
</Text>

// Truncated text
<Text variant="body" numberOfLines={2}>
  Long text that will be truncated...
</Text>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Text content (required) |
| `variant` | TypographyKey | 'body' | Typography style |
| `color` | TextColor | 'primary' | Text color |
| `align` | 'left' \| 'center' \| 'right' | 'left' | Text alignment |
| `numberOfLines` | number | - | Max lines (truncates) |

**Color Options:**
- `primary`: Main text color
- `secondary`: Secondary text color
- `tertiary`: Tertiary text color
- `inverse`: White text
- `error`: Red text
- `success`: Green text
- `warning`: Orange text
- `info`: Blue text

### Badge

Small status indicator with text.

```typescript
import { Badge } from '@/components/ui';

<Badge label="10% Cashback" variant="success" size="small" />
<Badge label="Out of Stock" variant="error" size="medium" />
<Badge label="New" variant="info" size="large" />
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Badge text (required) |
| `variant` | BadgeVariant | 'primary' | Color variant |
| `size` | 'small' \| 'medium' \| 'large' | 'medium' | Badge size |

**Variants:**
- `primary`, `secondary`, `success`, `error`, `warning`, `info`, `neutral`

**Sizes:**
- `small`: 20px height
- `medium`: 24px height
- `large`: 32px height

### Input

Form input with label, error, and icon support.

```typescript
import { Input } from '@/components/ui';

// Basic input
<Input
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
/>

// Input with error
<Input
  label="Password"
  placeholder="Enter password"
  value={password}
  onChangeText={setPassword}
  error="Password is required"
  secureTextEntry
/>

// Input with icons
<Input
  label="Search"
  placeholder="Search products..."
  leftIcon={<SearchIcon />}
  rightIcon={<ClearIcon />}
/>

// Input with helper text
<Input
  label="Phone"
  placeholder="+1 (555) 123-4567"
  helperText="We'll never share your phone number"
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Input label |
| `error` | string | - | Error message |
| `helperText` | string | - | Helper text |
| `leftIcon` | ReactNode | - | Left icon |
| `rightIcon` | ReactNode | - | Right icon |
| All TextInput props | - | - | Passes through |

### Chip

Compact element for filters, tags, or selections.

```typescript
import { Chip } from '@/components/ui';

// Basic chip
<Chip label="Fashion" onPress={() => {}} />

// Selected chip
<Chip label="Electronics" selected={true} onPress={() => {}} />

// Chip with icons
<Chip
  label="Favorites"
  leftIcon={<HeartIcon />}
  rightIcon={<CloseIcon />}
  onPress={() => {}}
/>

// Different variants
<Chip label="Filled" variant="filled" />
<Chip label="Outlined" variant="outlined" />
<Chip label="Soft" variant="soft" />
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Chip text (required) |
| `onPress` | function | - | Click handler |
| `variant` | 'filled' \| 'outlined' \| 'soft' | 'filled' | Visual style |
| `size` | 'small' \| 'medium' | 'medium' | Chip size |
| `selected` | boolean | false | Selected state |
| `disabled` | boolean | false | Disabled state |
| `leftIcon` | ReactNode | - | Left icon |
| `rightIcon` | ReactNode | - | Right icon |

**Sizes:**
- `small`: 28px height
- `medium`: 36px height

### Divider

Horizontal or vertical line separator.

```typescript
import { Divider } from '@/components/ui';

// Horizontal divider (default)
<Divider spacing="md" />

// Vertical divider
<Divider orientation="vertical" spacing="sm" />

// Custom color and thickness
<Divider
  color={COLORS.primary[500]}
  thickness={2}
  spacing="lg"
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | 'horizontal' \| 'vertical' | 'horizontal' | Divider direction |
| `spacing` | SpacingKey | 'md' | Margin around divider |
| `color` | string | COLORS.border.light | Divider color |
| `thickness` | number | 1 | Line thickness |

---

## Usage Examples

### Complete Product Card

```typescript
import { Card, Text, Badge, Button, Divider } from '@/components/ui';
import { SPACING } from '@/constants/DesignTokens';

const ProductCard = ({ product }) => (
  <Card variant="elevated" padding="md">
    {/* Header */}
    <View style={{ marginBottom: SPACING.sm }}>
      <Text variant="h4" color="primary">
        {product.name}
      </Text>
      <View style={{ flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs }}>
        <Badge label="Fashion" variant="primary" size="small" />
        <Badge label="In Stock" variant="success" size="small" />
      </View>
    </View>

    <Divider spacing="sm" />

    {/* Price */}
    <View style={{ marginVertical: SPACING.sm }}>
      <Text variant="h2" color="primary">
        ₹2,199
      </Text>
      <Text variant="bodySmall" color="secondary">
        BTM • 0.7 Km away
      </Text>
    </View>

    {/* Description */}
    <Text variant="body" color="secondary" numberOfLines={2}>
      {product.description}
    </Text>

    <Divider spacing="md" />

    {/* Actions */}
    <View style={{ gap: SPACING.sm }}>
      <Button
        title="Add to Cart"
        onPress={() => {}}
        variant="primary"
        size="medium"
        fullWidth
      />
      <Button
        title="View Details"
        onPress={() => {}}
        variant="outline"
        size="medium"
        fullWidth
      />
    </View>
  </Card>
);
```

### Filter Bar with Chips

```typescript
import { Chip } from '@/components/ui';
import { SPACING } from '@/constants/DesignTokens';

const FilterBar = ({ activeFilters, onFilterChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: SPACING.sm, paddingHorizontal: SPACING.md }}
  >
    {['All', 'Fashion', 'Electronics', 'Home', 'Beauty'].map((filter) => (
      <Chip
        key={filter}
        label={filter}
        selected={activeFilters.includes(filter)}
        onPress={() => onFilterChange(filter)}
        variant="outlined"
        size="medium"
      />
    ))}
  </ScrollView>
);
```

### Form with Input Components

```typescript
import { Input, Button } from '@/components/ui';
import { SPACING } from '@/constants/DesignTokens';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  return (
    <View style={{ padding: SPACING.md, gap: SPACING.md }}>
      <Input
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Password"
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
      />

      <Button
        title="Sign In"
        onPress={handleSubmit}
        variant="primary"
        size="large"
        fullWidth
        loading={isLoading}
      />
    </View>
  );
};
```

---

## Migration Guide

### Step 1: Import Design Tokens

Replace magic numbers with design tokens:

```typescript
// Before
const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
    borderRadius: 12,
  },
});

// After
import { SPACING, BORDER_RADIUS } from '@/constants/DesignTokens';

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
});
```

### Step 2: Replace Hardcoded Colors

Use semantic colors:

```typescript
// Before
const styles = StyleSheet.create({
  text: {
    color: '#6B7280',
  },
  background: {
    backgroundColor: '#F9FAFB',
  },
});

// After
import { COLORS } from '@/constants/DesignTokens';

const styles = StyleSheet.create({
  text: {
    color: COLORS.text.secondary,
  },
  background: {
    backgroundColor: COLORS.background.secondary,
  },
});
```

### Step 3: Use Typography Tokens

Replace font styles:

```typescript
// Before
const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
});

// After
import { TYPOGRAPHY } from '@/constants/DesignTokens';

const styles = StyleSheet.create({
  title: {
    ...TYPOGRAPHY.h2,
  },
});
```

### Step 4: Replace Custom Components

Use design system components:

```typescript
// Before
<TouchableOpacity style={buttonStyle}>
  <Text style={buttonText}>Click Me</Text>
</TouchableOpacity>

// After
import { Button } from '@/components/ui';

<Button
  title="Click Me"
  onPress={() => {}}
  variant="primary"
  size="medium"
/>
```

---

## Best Practices

### 1. Always Use Design Tokens

❌ **Don't:**
```typescript
padding: 16,
color: '#6B7280',
borderRadius: 12,
```

✅ **Do:**
```typescript
padding: SPACING.md,
color: COLORS.text.secondary,
borderRadius: BORDER_RADIUS.lg,
```

### 2. Use Semantic Colors

❌ **Don't:**
```typescript
backgroundColor: '#EF4444'
```

✅ **Do:**
```typescript
backgroundColor: COLORS.error[500]
```

### 3. Compose Components

❌ **Don't:**
```typescript
<View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
  <Text style={{ fontSize: 18, fontWeight: '600' }}>Title</Text>
</View>
```

✅ **Do:**
```typescript
<Card variant="elevated" padding="md">
  <Text variant="h4">Title</Text>
</Card>
```

### 4. Follow 8px Grid

All spacing should be multiples of 4 or 8:

✅ **Good:** 4, 8, 12, 16, 24, 32, 48, 64
❌ **Bad:** 15, 17, 22, 35

### 5. Accessibility

Always include accessibility props:

```typescript
<Button
  title="Submit"
  onPress={handleSubmit}
  accessibilityLabel="Submit form"
  accessibilityHint="Submits the registration form"
/>
```

### 6. Consistent Component Usage

Use design system components consistently:

```typescript
// All buttons in your app
<Button variant="primary" ... />
<Button variant="outline" ... />

// All cards
<Card variant="elevated" ... />

// All text
<Text variant="h2" ... />
<Text variant="body" ... />
```

---

## Performance Tips

### 1. Memoize Styles

```typescript
const styles = useMemo(() => StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
}), []);
```

### 2. Avoid Inline Styles

❌ **Don't:**
```typescript
<View style={{ padding: SPACING.md, backgroundColor: COLORS.background.primary }} />
```

✅ **Do:**
```typescript
const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    backgroundColor: COLORS.background.primary,
  },
});

<View style={styles.container} />
```

### 3. Use Component Props Instead of Conditional Styles

❌ **Don't:**
```typescript
<Text style={isError ? errorStyle : normalStyle}>Message</Text>
```

✅ **Do:**
```typescript
<Text variant="body" color={isError ? 'error' : 'primary'}>Message</Text>
```

---

## Quick Reference

### Common Patterns

```typescript
// Section container
<View style={{ padding: SPACING.md, gap: SPACING.sm }}>
  ...
</View>

// Card spacing
<Card variant="elevated" padding="md" style={{ marginBottom: SPACING.lg }}>
  ...
</Card>

// Text hierarchy
<Text variant="h2" color="primary">Title</Text>
<Text variant="body" color="secondary">Description</Text>
<Text variant="caption" color="tertiary">Metadata</Text>

// Button group
<View style={{ gap: SPACING.sm }}>
  <Button variant="primary" ... />
  <Button variant="outline" ... />
</View>

// Badge row
<View style={{ flexDirection: 'row', gap: SPACING.xs }}>
  <Badge label="New" variant="info" size="small" />
  <Badge label="Sale" variant="error" size="small" />
</View>
```

---

## Support

For questions or issues with the design system:

1. Check this documentation
2. Review `MAINSTORE_DESIGN_SYSTEM_EXAMPLES.tsx` for code examples
3. Look at existing components in `components/ui/`
4. Check design tokens in `constants/DesignTokens.ts`

---

## Version History

**v1.0.0** (Current)
- Initial design system implementation
- 7 core components (Button, Card, Text, Badge, Input, Chip, Divider)
- Complete design token system
- 8px grid system
- Accessibility-compliant colors
- TypeScript support
