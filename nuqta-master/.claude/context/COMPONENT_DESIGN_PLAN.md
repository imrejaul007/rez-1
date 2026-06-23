# Component Design Plan - CombinedSection78

## Phase 2: Component Design Planning

### 1. Component Structure Analysis

#### Current Components Breakdown:
**Section7 Content:**
- Header row: title + save badge
- Minimum bill text
- Detail row 1: Globe icon + "Offline Only | More details"
- Detail row 2: Percent icon + "Not valid above store discount" + "Single voucher per bill"

**Section8 Content:**
- Add button with purple styling

#### New Combined Structure:
```jsx
<CombinedSection78>
  <Container style={unifiedCardStyle}>
    <Header>
      <Title>Get Instant Discount</Title>
      <SaveBadge>Save 20%</SaveBadge>
    </Header>
    
    <MinimumBill>Minimum bill: ₹5000</MinimumBill>
    
    <DetailsSection>
      <DetailRow>
        <Icon>🌐 → globe-outline</Icon>
        <Text>Offline Only | More details</Text>
      </DetailRow>
      <DetailRow>
        <Icon>% → percent-outline</Icon>
        <TextContainer>
          <Text>Not valid above store discount</Text>
          <SubText>Single voucher per bill</SubText>
        </TextContainer>
      </DetailRow>
    </DetailsSection>
    
    <AddButton>Add</AddButton>
  </Container>
</CombinedSection78>
```

### 2. Unified Styling Approach

#### Color Palette (from screenshot):
```typescript
const colors = {
  background: '#f3f2ff',      // Light purple card background
  border: '#e8e6ff',         // Subtle purple border
  title: '#333333',          // Dark text for title
  subtitle: '#666666',       // Medium gray for details
  badgeBackground: '#ffffff', // White badge background
  badgeText: '#6c63ff',      // Purple badge text
  buttonGradient: ['#8B5CF6', '#6D28D9'], // Purple gradient
  buttonText: '#ffffff',     // White button text
  iconColor: '#6c63ff',      // Purple for icons
}
```

#### Layout Structure:
```typescript
const layout = {
  cardPadding: 20,           // Internal card padding
  cardMargin: 20,            // Horizontal margin
  borderRadius: 16,          // Consistent corner radius
  headerSpacing: 12,         // Space below header
  detailSpacing: 14,         // Space between detail rows
  buttonSpacing: 18,         // Space above button
  iconMargin: 12,            // Space after icons
}
```

#### Typography Hierarchy:
```typescript
const typography = {
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.title,
    lineHeight: 22,
  },
  badge: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.badgeText,
  },
  minimumBill: {
    fontSize: 14,
    color: colors.subtitle,
    lineHeight: 20,
  },
  detailText: {
    fontSize: 14,
    color: colors.title,
    lineHeight: 20,
  },
  subText: {
    fontSize: 13,
    color: colors.subtitle,
    lineHeight: 18,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonText,
    letterSpacing: 0.5,
  }
}
```

### 3. Content Mapping Strategy

#### From Section7 → New Component:
- ✅ Header title: "Get Instant Discount"
- ✅ Save badge: "Save 20%" (repositioned to top-right)
- ✅ Minimum bill: "Minimum bill: ₹5000"
- ✅ Detail row 1: Globe icon + "Offline Only | More details"
- ✅ Detail row 2: Percent icon + discount text + subtext

#### From Section8 → New Component:
- ✅ Add button: Integrated into bottom of card
- ✅ Purple styling: Maintained with gradient
- ✅ Touch interaction: onPress handler

#### Icon Replacement Strategy:
- 🌐 → `<Ionicons name="globe-outline" size={18} color={iconColor} />`
- % → `<Ionicons name="percent-outline" size={18} color={iconColor} />`

### 4. Integration Plan with StorePage

#### Current StorePage Structure:
```jsx
<StoreHeader />
<ProductInfo />
<NewSection />
<Section1 />
<Section2 />
<Section3 />
<Section4 />
<Section5 />
<Section6 />
<Section7 />  ← Replace these two
<Section8 />  ← with single component
```

#### New StorePage Structure:
```jsx
<StoreHeader />
<ProductInfo />
<NewSection />
<Section1 />
<Section2 />
<Section3 />
<Section4 />
<Section5 />
<Section6 />
<CombinedSection78 />  ← Single combined component
```

#### Import Changes:
```typescript
// Remove these imports
// import Section7 from './StoreSection/Section7';
// import Section8 from './StoreSection/Section8';

// Add new import
import CombinedSection78 from './StoreSection/CombinedSection78';
```

### 5. Component Props Interface

```typescript
interface CombinedSection78Props {
  title?: string;
  savePercentage?: string;
  minimumBill?: string;
  onAddPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

const defaultProps = {
  title: "Get Instant Discount",
  savePercentage: "Save 20%",
  minimumBill: "Minimum bill: ₹5000",
  disabled: false,
}
```

### 6. Responsive Design Strategy

#### Breakpoints:
- Small screens (< 360px): Reduce padding, adjust font sizes
- Medium screens (360-768px): Standard design
- Large screens (> 768px): Maintain design, center if needed

#### Responsive Elements:
```typescript
const { width } = Dimensions.get('window');
const responsivePadding = width < 360 ? 16 : 20;
const responsiveMargin = width < 360 ? 16 : 20;
const responsiveFontSize = width < 360 ? 14 : 16;
```

### 7. Shadow and Elevation System

#### Card Shadow:
```typescript
const cardShadow = {
  shadowColor: '#6c63ff',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 3,
}
```

#### Button Shadow:
```typescript
const buttonShadow = {
  shadowColor: '#6c63ff',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
}
```

### 8. Implementation Order

1. **Container Setup**: Basic card structure with background
2. **Header Section**: Title + save badge positioning
3. **Content Section**: Minimum bill + detail rows
4. **Button Integration**: Add button within card
5. **Styling Polish**: Shadows, spacing, typography
6. **Responsive Features**: Dynamic sizing
7. **Integration**: Replace in StorePage

### 9. File Structure

```
StoreSection/
├── CombinedSection78.tsx    // Main combined component
├── Section7.tsx             // Will be deleted after migration
├── Section8.tsx             // Will be deleted after migration
└── [other sections...]
```

### 10. Testing Strategy

- Visual comparison with screenshot
- Touch interaction testing
- Responsive behavior verification
- Integration testing in StorePage
- Performance impact assessment

This design plan ensures a seamless combination of Section7 and Section8 while maintaining all functionality and achieving pixel-perfect design accuracy.