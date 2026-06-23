# Cart Page Component Architecture

## Phase 2: Component Architecture Planning

### 1. CartPage Component Structure ✅

#### Main Component Hierarchy:
```tsx
<CartPage>
  <View style={styles.container}>
    <CartHeader onBack={handleBack} />
    
    <SlidingTabs 
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
    
    <View style={styles.content}>
      <FlatList
        data={currentItems}
        renderItem={({ item }) => (
          <CartItem 
            item={item}
            onRemove={handleRemoveItem}
          />
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
    
    <PriceSection 
      totalPrice={totalPrice}
      onBuyNow={handleBuyNow}
    />
  </View>
</CartPage>
```

#### Component Breakdown:
- **CartPage**: Main container with state management
- **CartHeader**: Purple gradient header with back button
- **SlidingTabs**: Products/Service tab switcher
- **CartItem**: Individual cart item card
- **PriceSection**: Fixed bottom price and buy now section

### 2. Sliding Tabs Implementation Strategy ✅

#### Tab State Management:
```tsx
const [activeTab, setActiveTab] = useState<'products' | 'service'>('products');

const tabData = [
  { key: 'products', title: 'Products', icon: 'cube-outline' },
  { key: 'service', title: 'Service', icon: 'construct-outline' }
];
```

#### Animation Strategy:
- **Underline Animation**: Animated.View with translateX
- **Text Color Transition**: Smooth color interpolation
- **Tab Press Feedback**: Scale animation on touch

#### Implementation Pattern:
```tsx
// Animated underline position
const underlinePosition = useRef(new Animated.Value(0)).current;

const animateTab = (tabIndex: number) => {
  Animated.timing(underlinePosition, {
    toValue: tabIndex * (screenWidth / 2),
    duration: 200,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  }).start();
};
```

### 3. Cart Item Data Model & State Management ✅

#### TypeScript Interfaces:
```tsx
interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  cashback: string;
  category: 'products' | 'service';
}

interface CartState {
  products: CartItem[];
  services: CartItem[];
  activeTab: 'products' | 'service';
}
```

#### State Management Pattern:
```tsx
const [cartData, setCartData] = useState<CartState>({
  products: mockProductsData,
  services: mockServicesData,
  activeTab: 'products'
});

// Computed values
const currentItems = cartData[cartData.activeTab];
const totalPrice = currentItems.reduce((sum, item) => sum + item.price, 0);

// Actions
const removeItem = (id: string) => {
  setCartData(prev => ({
    ...prev,
    [prev.activeTab]: prev[prev.activeTab].filter(item => item.id !== id)
  }));
};

const switchTab = (tab: 'products' | 'service') => {
  setCartData(prev => ({ ...prev, activeTab: tab }));
};
```

#### Mock Data Structure:
```tsx
const mockProductsData: CartItem[] = [
  {
    id: '1',
    name: 'Classic Cotton Shirt',
    price: 799,
    image: require('@/assets/images/shirt.jpg'),
    cashback: 'Upto 12% cash back',
    category: 'products'
  },
  {
    id: '2', 
    name: 'Shoes',
    price: 799,
    image: require('@/assets/images/shoes.jpg'),
    cashback: 'Upto 12% cash back',
    category: 'products'
  },
  // ... more items matching screenshot
];
```

### 4. Responsive Design Approach ✅

#### Breakpoint Strategy:
```tsx
const { width, height } = Dimensions.get('window');

// Responsive values
const responsiveValues = {
  headerHeight: height < 700 ? 90 : 100,
  tabHeight: 50,
  itemHeight: 80,
  bottomHeight: 100,
  padding: width < 360 ? 12 : 16,
  margin: width < 360 ? 8 : 12,
  fontSize: {
    title: width < 360 ? 15 : 16,
    subtitle: width < 360 ? 12 : 13,
    price: width < 360 ? 14 : 15,
  }
};
```

#### Layout Strategy:
- **Flexible Container**: Use flex: 1 for main content area
- **Fixed Positions**: Header and bottom section use absolute positioning
- **Dynamic Sizing**: Font sizes and spacing scale with screen size
- **Safe Areas**: Proper handling of status bar and bottom safe areas

#### Component Responsive Patterns:
```tsx
// Dynamic styling based on screen size
const getResponsiveStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'ios' ? StatusBar.currentHeight || 44 : StatusBar.currentHeight || 24,
  },
  content: {
    flex: 1,
    paddingTop: responsiveValues.headerHeight + responsiveValues.tabHeight,
    paddingBottom: responsiveValues.bottomHeight,
  },
  // ... more responsive styles
});
```

### 5. TypeScript Interfaces & Types ✅

#### Core Types:
```tsx
// types/cart.ts
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string | number; // string for URL, number for require()
  cashback: string;
  category: 'products' | 'service';
}

export interface CartState {
  products: CartItem[];
  services: CartItem[];
  activeTab: 'products' | 'service';
}

export type TabType = 'products' | 'service';

// Component Props
export interface CartPageProps {
  navigation?: any; // React Navigation type
  route?: any;
}

export interface CartHeaderProps {
  onBack: () => void;
  title?: string;
}

export interface SlidingTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabs?: TabData[];
}

export interface TabData {
  key: TabType;
  title: string;
  icon: string;
}

export interface CartItemProps {
  item: CartItem;
  onRemove: (id: string) => void;
  showAnimation?: boolean;
}

export interface PriceSectionProps {
  totalPrice: number;
  onBuyNow: () => void;
  itemCount?: number;
  loading?: boolean;
}
```

#### Style Types:
```tsx
// Style interfaces for better type safety
interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  tabContainer: ViewStyle;
  tabButton: ViewStyle;
  tabText: TextStyle;
  activeTabText: TextStyle;
  underline: ViewStyle;
  itemCard: ViewStyle;
  itemImage: ImageStyle;
  itemInfo: ViewStyle;
  itemName: TextStyle;
  itemPrice: TextStyle;
  cashbackText: TextStyle;
  deleteButton: ViewStyle;
  priceSection: ViewStyle;
  totalText: TextStyle;
  buyNowButton: ViewStyle;
  buttonText: TextStyle;
}
```

#### Utility Types:
```tsx
// Animation types
export interface AnimationConfig {
  duration: number;
  easing: any;
  useNativeDriver: boolean;
}

// Event handlers
export type RemoveItemHandler = (id: string) => void;
export type TabChangeHandler = (tab: TabType) => void;
export type BuyNowHandler = () => void;

// State updaters
export type CartUpdater = (updater: (prev: CartState) => CartState) => void;
```

### 6. File Structure Implementation

```
app/
├── CartPage.tsx                 // Main cart screen
├── components/
│   ├── cart/
│   │   ├── CartHeader.tsx       // Header component
│   │   ├── SlidingTabs.tsx      // Tab switcher
│   │   ├── CartItem.tsx         // Individual item
│   │   └── PriceSection.tsx     // Bottom price section
│   └── common/
│       └── AnimatedButton.tsx   // Reusable button
├── types/
│   └── cart.ts                  // TypeScript definitions
├── hooks/
│   ├── useCart.ts               // Cart state management
│   └── useTabAnimation.ts       // Tab animation logic
├── utils/
│   ├── cartHelpers.ts           // Helper functions
│   └── mockData.ts              // Mock cart data
└── styles/
    └── cartStyles.ts            // Shared styles
```

### 7. Performance Optimization Strategy

#### FlatList Optimization:
```tsx
<FlatList
  data={currentItems}
  renderItem={renderCartItem}
  keyExtractor={keyExtractor}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
  initialNumToRender={8}
  getItemLayout={(data, index) => ({
    length: 80,
    offset: 80 * index,
    index,
  })}
/>
```

#### Memoization:
```tsx
const renderCartItem = useCallback(({ item }: { item: CartItem }) => (
  <CartItem item={item} onRemove={removeItem} />
), [removeItem]);

const keyExtractor = useCallback((item: CartItem) => item.id, []);

const totalPrice = useMemo(() => 
  currentItems.reduce((sum, item) => sum + item.price, 0),
  [currentItems]
);
```

### 8. Animation & Interaction Design

#### Tab Switching Animation:
- **Duration**: 200ms for smooth transition
- **Easing**: Ease-out for natural feel
- **Elements**: Underline position + text color

#### Item Deletion Animation:
- **Fade Out**: Opacity 1 → 0 (250ms)
- **Scale Down**: Scale 1 → 0.8 (250ms)
- **Slide Out**: TranslateX 0 → -100% (300ms)

#### Button Interactions:
- **Press**: Scale 0.95 (100ms)
- **Release**: Scale 1.0 (100ms)
- **Color**: Background color transition

This architecture provides a solid foundation for building a pixel-perfect, performant cart page that exactly matches the screenshot requirements while maintaining code quality and scalability.