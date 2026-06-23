# Component Architecture Plan

## Phase 2: Component Structure Planning

### 1. Component Architecture ✅

Based on the existing project structure and screenshot analysis, I'll create:

```
app/StoreSection/
├── NewSection.tsx (main container - will be placed above Section1)
└── components/
    ├── PayBillCard.tsx (pay your bill card)
    └── InstagramCard.tsx (earn from instagram card)
```

**Naming Convention**: Following existing pattern (Section1, Section2, etc.), the new component will be `NewSection.tsx`

**Integration Point**: 
- File: `app/StorePage.tsx`
- Location: Between `<ProductInfo />` and `<Section1 />`

### 2. Component Responsibilities

#### NewSection.tsx (Main Container)
- Container for both cards
- Overall section spacing and layout
- Theme integration
- Responsive container management

#### PayBillCard.tsx
- "Pay your bill" card UI
- "Save 20%" badge positioning
- Amount input field styling
- "Pay bill" button with gradient
- Bill icon integration

#### InstagramCard.tsx  
- "Earn from Instagram" card UI
- Instagram icon integration
- Purple gradient background
- Typography styling

### 3. Styling Strategy

#### Theme Integration
```typescript
// Follow existing pattern from Section1.tsx
const backgroundColor = useThemeColor({}, 'background');
const surfaceColor = useThemeColor({}, 'surface');
const primaryColor = useThemeColor({}, 'primary');
const textColor = useThemeColor({}, 'text');
```

#### StyleSheet Structure
```typescript
const styles = StyleSheet.create({
  // Container styles
  container: { /* main section container */ },
  cardsContainer: { /* cards wrapper */ },
  
  // Card base styles
  cardBase: { /* shared card properties */ },
  
  // Specific card styles
  payBillCard: { /* pay bill card specific */ },
  instagramCard: { /* instagram card specific */ },
  
  // Content styles
  cardTitle: { /* card title typography */ },
  badge: { /* save 20% badge */ },
  button: { /* button base styles */ },
  
  // Responsive styles
  responsiveContainer: { /* responsive adjustments */ }
});
```

### 4. Reusable Patterns Identified

#### From Existing Components:
- **Container Pattern**: `View + backgroundColor from theme`
- **Typography**: `ThemedText` with custom styles
- **Spacing**: `paddingHorizontal: 20, paddingVertical: 24`
- **Shadow System**: Consistent elevation and shadow properties
- **Border Radius**: `borderRadius: 16-24` for modern look
- **Touch Interactions**: `TouchableOpacity` with `activeOpacity: 0.8`

#### New Patterns for This Section:
- **Card Layout**: Consistent card container with shadow
- **Badge Positioning**: Absolute positioning for "Save 20%"
- **Gradient Buttons**: LinearGradient integration
- **Icon + Text Combination**: Icon + title layout pattern

### 5. Responsive Design Strategy

#### Breakpoints:
- **Small screens** (< 360px): Reduce padding, adjust font sizes
- **Medium screens** (360-768px): Standard design
- **Large screens** (> 768px): Maintain max width, center content

#### Responsive Elements:
- Card padding adjusts based on screen width
- Typography scales appropriately
- Button heights maintain minimum touch targets (44px)
- Horizontal margins scale with screen size

#### Implementation:
```typescript
// Dynamic sizing based on screen dimensions
const { width } = Dimensions.get('window');
const cardPadding = width < 360 ? 16 : 20;
const fontSize = width < 360 ? 14 : 16;
```

### 6. Color Scheme (from Screenshot Analysis)

```typescript
const colors = {
  payBillCard: {
    background: '#FFFFFF', // or surfaceColor from theme
    badge: '#F3F4F6',
    badgeText: '#374151',
    button: ['#8B5CF6', '#7C3AED'], // gradient
    buttonText: '#FFFFFF'
  },
  instagramCard: {
    background: ['#EC4899', '#8B5CF6'], // pink to purple gradient
    text: '#FFFFFF',
    icon: '#FFFFFF'
  }
};
```

### 7. Icon Strategy

#### Icons Needed:
- **Bill Icon**: `Ionicons name="document-text-outline"`
- **Instagram Icon**: `Ionicons name="logo-instagram"`

#### Icon Sizing:
- Card icons: 24px
- Button icons: 18px
- Consistent with existing component patterns

### 8. Component Integration Plan

#### StorePage.tsx Changes:
```typescript
// Add import
import NewSection from './StoreSection/NewSection';

// Add in render between ProductInfo and Section1
<ProductInfo />
<NewSection />        // ← New component here
<Section1 />
```

### 9. File Structure Implementation

```
StoreSection/
├── NewSection.tsx           // Main container
├── components/
│   ├── PayBillCard.tsx     // Pay bill card
│   └── InstagramCard.tsx   // Instagram card
└── styles/
    └── NewSectionStyles.ts // Shared styles (if needed)
```

### 10. Development Order

1. Create `NewSection.tsx` with basic container
2. Implement `PayBillCard.tsx` with all elements
3. Implement `InstagramCard.tsx` with gradient
4. Integrate cards into `NewSection.tsx`
5. Add to `StorePage.tsx`
6. Test responsive behavior
7. Fine-tune styling to match screenshot

This architecture follows the existing project patterns while creating a clean, maintainable structure for the new UI section.