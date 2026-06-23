# Design System Quick Start

**Get started with the Rez App Design System in 5 minutes.**

---

## Step 1: Import What You Need

```typescript
// Import design tokens
import { SPACING, COLORS, TYPOGRAPHY, BORDER_RADIUS } from '@/constants/DesignTokens';

// Import UI components
import { Button, Card, Text, Badge } from '@/components/ui';
```

---

## Step 2: Use Design Tokens in Styles

Replace magic numbers with tokens:

```typescript
const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,                    // Instead of: 16
    backgroundColor: COLORS.background.primary,  // Instead of: '#FFFFFF'
    borderRadius: BORDER_RADIUS.lg,        // Instead of: 12
  },
  title: {
    ...TYPOGRAPHY.h2,                      // Instead of: fontSize: 24, fontWeight: '600'
    color: COLORS.text.primary,            // Instead of: '#111827'
  },
});
```

---

## Step 3: Use UI Components

Replace custom components with design system components:

### Button Example

```typescript
// Instead of custom TouchableOpacity
<Button
  title="Add to Cart"
  onPress={handleAddToCart}
  variant="primary"
  size="medium"
  fullWidth
/>
```

### Card Example

```typescript
// Instead of custom View with styles
<Card variant="elevated" padding="md">
  <Text variant="h4">Product Title</Text>
  <Text variant="body" color="secondary">Description</Text>
</Card>
```

### Text Example

```typescript
// Instead of Text with inline styles
<Text variant="h2" color="primary">
  Section Heading
</Text>
```

---

## Step 4: Build a Complete Component

Here's a complete product card example:

```typescript
import React from 'react';
import { View } from 'react-native';
import { Card, Text, Badge, Button } from '@/components/ui';
import { SPACING } from '@/constants/DesignTokens';

export function ProductCard({ product }) {
  return (
    <Card variant="elevated" padding="md">
      {/* Header */}
      <Text variant="h4" color="primary">
        {product.name}
      </Text>

      {/* Badges */}
      <View style={{ flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs }}>
        <Badge label="New" variant="info" size="small" />
        <Badge label="10% OFF" variant="success" size="small" />
      </View>

      {/* Price */}
      <Text variant="h2" color="primary" style={{ marginTop: SPACING.sm }}>
        ₹{product.price}
      </Text>

      {/* Description */}
      <Text variant="body" color="secondary" numberOfLines={2} style={{ marginTop: SPACING.xs }}>
        {product.description}
      </Text>

      {/* Action */}
      <Button
        title="Add to Cart"
        onPress={() => {}}
        variant="primary"
        size="medium"
        fullWidth
        style={{ marginTop: SPACING.md }}
      />
    </Card>
  );
}
```

---

## Common Patterns

### Section with Header

```typescript
<View style={{ padding: SPACING.md }}>
  <Text variant="h2" color="primary">Products</Text>
  <Text variant="bodySmall" color="secondary">Browse our collection</Text>
  {/* Content */}
</View>
```

### Filter Bar

```typescript
import { Chip } from '@/components/ui';

<View style={{ flexDirection: 'row', gap: SPACING.sm }}>
  {['All', 'Fashion', 'Electronics'].map(filter => (
    <Chip
      key={filter}
      label={filter}
      selected={activeFilter === filter}
      onPress={() => setActiveFilter(filter)}
    />
  ))}
</View>
```

### Form

```typescript
import { Input, Button } from '@/components/ui';

<View style={{ gap: SPACING.md }}>
  <Input
    label="Email"
    placeholder="Enter email"
    value={email}
    onChangeText={setEmail}
  />

  <Input
    label="Password"
    placeholder="Enter password"
    value={password}
    onChangeText={setPassword}
    secureTextEntry
  />

  <Button
    title="Sign In"
    onPress={handleSubmit}
    fullWidth
    loading={isLoading}
  />
</View>
```

---

## Most Used Tokens

### Spacing
```typescript
SPACING.xs    // 4px
SPACING.sm    // 8px
SPACING.md    // 16px  ⭐ Most common
SPACING.lg    // 24px
```

### Colors
```typescript
COLORS.primary[500]           // Brand blue
COLORS.text.primary           // Main text
COLORS.text.secondary         // Secondary text
COLORS.background.primary     // White background
COLORS.border.light           // Light border
```

### Typography
```typescript
TYPOGRAPHY.h2       // Section headings
TYPOGRAPHY.body     // Body text
TYPOGRAPHY.caption  // Small text
```

---

## Component Props Quick Reference

### Button
```typescript
variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
size?: 'small' | 'medium' | 'large'
fullWidth?: boolean
loading?: boolean
disabled?: boolean
```

### Card
```typescript
variant?: 'elevated' | 'outlined' | 'filled'
padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
onPress?: () => void  // Makes card pressable
```

### Text
```typescript
variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption'
color?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success'
align?: 'left' | 'center' | 'right'
numberOfLines?: number
```

### Badge
```typescript
variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
size?: 'small' | 'medium' | 'large'
```

---

## Need Help?

1. **Full Guide**: See `DESIGN_SYSTEM_GUIDE.md` for complete documentation
2. **Quick Reference**: See `DESIGN_SYSTEM_QUICK_REFERENCE.md` for cheat sheet
3. **Examples**: See `MAINSTORE_DESIGN_SYSTEM_EXAMPLES.tsx` for code examples
4. **Visual Showcase**: See `DESIGN_SYSTEM_COMPONENT_SHOWCASE.tsx` for all components
5. **Colors**: See `DESIGN_SYSTEM_COLOR_PALETTE.md` for color system

---

## Testing Your Component

To see the design system in action:

1. Import the showcase component:
```typescript
import DesignSystemShowcase from '@/DESIGN_SYSTEM_COMPONENT_SHOWCASE';
```

2. Add it to a screen:
```typescript
export default function TestScreen() {
  return <DesignSystemShowcase />;
}
```

3. Run your app to see all components with all variants

---

## Best Practices

✅ **Do:**
- Use design tokens for all spacing, colors, typography
- Use design system components instead of custom ones
- Follow the 8px grid system
- Check color contrast for accessibility

❌ **Don't:**
- Use magic numbers (16, 24, etc.)
- Use hardcoded colors (#FFFFFF, etc.)
- Create custom buttons/cards when design system has them
- Skip accessibility props

---

## Migration Checklist

When refactoring existing code:

- [ ] Import design tokens and components
- [ ] Replace magic numbers with `SPACING` tokens
- [ ] Replace hardcoded colors with `COLORS` tokens
- [ ] Replace font styles with `TYPOGRAPHY` tokens
- [ ] Replace custom components with design system components
- [ ] Test accessibility with screen reader
- [ ] Verify color contrast

---

## Next Steps

1. **Explore**: Look at `DESIGN_SYSTEM_COMPONENT_SHOWCASE.tsx`
2. **Practice**: Build a simple card or form
3. **Refactor**: Update one existing component
4. **Read**: Check the full guide when needed

---

**You're ready to build with the design system! 🎨**
