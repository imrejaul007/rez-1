# Design System Quick Reference

One-page cheat sheet for the Rez App Design System.

## Import Statements

```typescript
// Design Tokens
import {
  SPACING,
  TYPOGRAPHY,
  COLORS,
  BORDER_RADIUS,
  SHADOWS,
  LAYOUT,
  Z_INDEX,
  ANIMATION,
  ICON_SIZES
} from '@/constants/DesignTokens';

// UI Components
import {
  Button,
  Card,
  Text,
  Badge,
  Input,
  Chip,
  Divider
} from '@/components/ui';
```

---

## Spacing (8px Grid)

```typescript
SPACING.xs      // 4px  - Tight spacing
SPACING.sm      // 8px  - Small gaps
SPACING.md      // 16px - Default spacing ⭐
SPACING.lg      // 24px - Section spacing
SPACING.xl      // 32px - Large sections
SPACING.xxl     // 48px - Extra large
SPACING.xxxl    // 64px - Maximum
```

**Usage:**
```typescript
padding: SPACING.md,
gap: SPACING.sm,
marginBottom: SPACING.lg
```

---

## Typography

| Variant | Size | Weight | Usage |
|---------|------|--------|-------|
| `h1` | 32px | 700 | Page titles |
| `h2` | 24px | 600 | Section headings ⭐ |
| `h3` | 20px | 600 | Subsections |
| `h4` | 18px | 600 | Card titles |
| `body` | 16px | 400 | Body text ⭐ |
| `bodySmall` | 14px | 400 | Secondary text |
| `caption` | 12px | 400 | Helper text |
| `button` | 16px | 600 | Button text |

**Usage:**
```typescript
// As style
...TYPOGRAPHY.h2

// As component
<Text variant="h2">Heading</Text>
```

---

## Colors

### Primary/Brand
```typescript
COLORS.primary[500]  // #6366F1 - Main brand color ⭐
```

### Semantic
```typescript
COLORS.error[500]    // #EF4444 - Red
COLORS.warning[500]  // #F59E0B - Orange
COLORS.success[500]  // #22C55E - Green
COLORS.info[500]     // #3B82F6 - Blue
```

### Text
```typescript
COLORS.text.primary    // #111827 - Main text ⭐
COLORS.text.secondary  // #6B7280 - Secondary text ⭐
COLORS.text.tertiary   // #9CA3AF - Tertiary text
COLORS.text.inverse    // #FFFFFF - Light text
```

### Background
```typescript
COLORS.background.primary    // #FFFFFF - White ⭐
COLORS.background.secondary  // #F9FAFB - Light gray
COLORS.background.tertiary   // #F3F4F6 - Gray
```

### Borders
```typescript
COLORS.border.light    // #E5E7EB - Light border ⭐
COLORS.border.default  // #D1D5DB - Default border
COLORS.border.dark     // #9CA3AF - Dark border
```

---

## Border Radius

```typescript
BORDER_RADIUS.sm    // 4px  - Small elements
BORDER_RADIUS.md    // 8px  - Buttons ⭐
BORDER_RADIUS.lg    // 12px - Cards ⭐
BORDER_RADIUS.xl    // 16px - Large cards
BORDER_RADIUS.full  // 9999 - Pills/badges ⭐
```

---

## Shadows

```typescript
...SHADOWS.sm   // Subtle
...SHADOWS.md   // Cards (default) ⭐
...SHADOWS.lg   // Floating elements
...SHADOWS.xl   // Modals
```

---

## Components

### Button

```typescript
<Button
  title="Add to Cart"
  onPress={() => {}}
  variant="primary"     // primary | secondary | outline | ghost | danger
  size="medium"         // small | medium | large
  fullWidth={false}
  loading={false}
  disabled={false}
/>
```

**Variants:**
- `primary` - Blue solid ⭐
- `outline` - Transparent with border
- `ghost` - Text only
- `danger` - Red solid

**Sizes:**
- `small` - 36px height
- `medium` - 44px height ⭐
- `large` - 52px height

---

### Card

```typescript
<Card
  variant="elevated"    // elevated | outlined | filled
  padding="md"          // xs | sm | md | lg | xl
  onPress={undefined}   // Makes pressable
>
  {children}
</Card>
```

**Common Usage:**
```typescript
<Card variant="elevated" padding="md">
  <Text variant="h4">Title</Text>
</Card>
```

---

### Text

```typescript
<Text
  variant="body"        // h1 | h2 | h3 | h4 | body | bodySmall | caption
  color="primary"       // primary | secondary | tertiary | error | success
  align="left"          // left | center | right
  numberOfLines={2}     // Truncate
>
  Content
</Text>
```

**Common Patterns:**
```typescript
<Text variant="h2" color="primary">Title</Text>
<Text variant="body" color="secondary">Description</Text>
<Text variant="caption" color="tertiary">Helper</Text>
```

---

### Badge

```typescript
<Badge
  label="10% OFF"
  variant="success"     // primary | secondary | success | error | warning | info
  size="small"          // small | medium | large
/>
```

**Common Usage:**
```typescript
<Badge label="New" variant="info" size="small" />
<Badge label="Sale" variant="error" size="small" />
```

---

### Input

```typescript
<Input
  label="Email"
  placeholder="Enter email"
  value={email}
  onChangeText={setEmail}
  error="Required"              // Error message
  helperText="Optional"         // Helper text
  leftIcon={<SearchIcon />}
  rightIcon={<ClearIcon />}
/>
```

---

### Chip

```typescript
<Chip
  label="Fashion"
  onPress={() => {}}
  variant="filled"      // filled | outlined | soft
  size="medium"         // small | medium
  selected={false}
  leftIcon={<Icon />}
/>
```

**Common Usage (Filters):**
```typescript
<Chip
  label="Electronics"
  selected={activeFilter === 'electronics'}
  onPress={() => setFilter('electronics')}
  variant="outlined"
/>
```

---

### Divider

```typescript
<Divider
  orientation="horizontal"  // horizontal | vertical
  spacing="md"              // xs | sm | md | lg
  color={COLORS.border.light}
  thickness={1}
/>
```

---

## Common Layouts

### Section Container
```typescript
<View style={{ padding: SPACING.md, gap: SPACING.sm }}>
  {/* Content */}
</View>
```

### Card with Content
```typescript
<Card variant="elevated" padding="md" style={{ marginBottom: SPACING.lg }}>
  <Text variant="h4" color="primary">Title</Text>
  <Text variant="body" color="secondary">Description</Text>
</Card>
```

### Button Group
```typescript
<View style={{ gap: SPACING.sm }}>
  <Button title="Primary" variant="primary" fullWidth />
  <Button title="Secondary" variant="outline" fullWidth />
</View>
```

### Badge Row
```typescript
<View style={{ flexDirection: 'row', gap: SPACING.xs }}>
  <Badge label="New" variant="info" size="small" />
  <Badge label="Sale" variant="error" size="small" />
</View>
```

### Text Hierarchy
```typescript
<View style={{ gap: SPACING.xs }}>
  <Text variant="h2" color="primary">Main Title</Text>
  <Text variant="body" color="secondary">Description text</Text>
  <Text variant="caption" color="tertiary">Additional info</Text>
</View>
```

---

## Before/After Examples

### Magic Numbers → Design Tokens

```typescript
// ❌ Before
const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
});

// ✅ After
const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background.secondary,
  },
});
```

### Hardcoded Text → Typography

```typescript
// ❌ Before
<Text style={{ fontSize: 24, fontWeight: '600', lineHeight: 32, color: '#111827' }}>
  Title
</Text>

// ✅ After
<Text variant="h2" color="primary">
  Title
</Text>
```

### Custom Button → Design System

```typescript
// ❌ Before
<TouchableOpacity
  style={{
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  }}
>
  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
    Click Me
  </Text>
</TouchableOpacity>

// ✅ After
<Button
  title="Click Me"
  onPress={() => {}}
  variant="primary"
  size="medium"
/>
```

---

## Pro Tips

### 1. Follow 8px Grid
All spacing: 4, 8, 12, 16, 24, 32, 48, 64

### 2. Use Semantic Colors
`COLORS.text.primary` instead of `'#111827'`

### 3. Compose Components
Build complex UIs from simple components

### 4. Memoize Styles
```typescript
const styles = useMemo(() => StyleSheet.create({...}), []);
```

### 5. Accessibility
Always add `accessibilityLabel` and `accessibilityRole`

---

## Most Common Patterns

### Product Card
```typescript
<Card variant="elevated" padding="md">
  <Text variant="h4">Product Name</Text>
  <Text variant="body" color="secondary">Description</Text>
  <View style={{ flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm }}>
    <Badge label="10% OFF" variant="success" size="small" />
  </View>
  <Button title="Add to Cart" variant="primary" fullWidth />
</Card>
```

### Section Header
```typescript
<View style={{ padding: SPACING.md }}>
  <Text variant="h2" color="primary">Section Title</Text>
  <Text variant="bodySmall" color="secondary">Subtitle</Text>
</View>
<Divider spacing="sm" />
```

### Filter Bar
```typescript
<ScrollView horizontal>
  {filters.map(filter => (
    <Chip
      key={filter}
      label={filter}
      selected={active === filter}
      onPress={() => setActive(filter)}
    />
  ))}
</ScrollView>
```

---

## File Locations

```
constants/
  └── DesignTokens.ts          // All design tokens

components/ui/
  ├── Button.tsx               // Button component
  ├── Card.tsx                 // Card component
  ├── Text.tsx                 // Text component
  ├── Badge.tsx                // Badge component
  ├── Input.tsx                // Input component
  ├── Chip.tsx                 // Chip component
  ├── Divider.tsx              // Divider component
  └── index.ts                 // Export all

DESIGN_SYSTEM_GUIDE.md         // Full documentation
DESIGN_SYSTEM_QUICK_REFERENCE.md  // This file
MAINSTORE_DESIGN_SYSTEM_EXAMPLES.tsx  // Code examples
```

---

## Need Help?

1. Check `DESIGN_SYSTEM_GUIDE.md` for detailed documentation
2. Review `MAINSTORE_DESIGN_SYSTEM_EXAMPLES.tsx` for real examples
3. Look at component source in `components/ui/`
4. Check tokens in `constants/DesignTokens.ts`
