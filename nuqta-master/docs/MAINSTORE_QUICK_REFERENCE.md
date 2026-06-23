# MainStorePage Search/Filter/Sort - Quick Reference

## File Location
```
C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\MainStorePage.tsx
```

## Quick Links
- [Full Implementation Guide](./MAINSTORE_SEARCH_FILTER_SORT_INTEGRATION.md)
- [Component Structure](./MAINSTORE_COMPONENT_STRUCTURE.md)

## State Variables (Copy-Paste Ready)

```tsx
// Search state
const [searchQuery, setSearchQuery] = useState('');
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

// Filter state
const [filters, setFilters] = useState<FilterState>({
  priceRange: { min: 0, max: 100000 },
  rating: null,
  categories: [],
  inStock: false,
  cashbackMin: 0,
});

// Sort state
const [sortOption, setSortOption] = useState<'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular' | 'cashback'>('newest');

// Modal state
const [showFilterModal, setShowFilterModal] = useState(false);
const [showSortModal, setShowSortModal] = useState(false);

// Categories
const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string }>>([]);
```

## API Query Builder (Copy-Paste Ready)

```tsx
// Build query parameters
const queryParams: any = {
  page: 1,
  limit: 20,
  sort: sortOption === 'price_low' || sortOption === 'price_high' ? 'price' : sortOption === 'cashback' ? 'popularity' : sortOption,
  order: sortOption === 'price_low' || sortOption === 'rating' ? 'asc' : 'desc'
};

// Add search query
if (debouncedSearchQuery.trim()) {
  queryParams.search = debouncedSearchQuery.trim();
}

// Add category filter
if (filters.categories.length > 0) {
  queryParams.category = filters.categories[0];
}

// Add price range
if (filters.priceRange.min > 0 || filters.priceRange.max < 100000) {
  queryParams.minPrice = filters.priceRange.min;
  queryParams.maxPrice = filters.priceRange.max;
}

// Add tags
const tags: string[] = [];
if (filters.inStock) tags.push('in-stock');
if (filters.cashbackMin > 0) tags.push(`cashback-${filters.cashbackMin}`);
if (tags.length > 0) {
  queryParams.tags = tags;
}
```

## Helper Functions (Copy-Paste Ready)

```tsx
// Active filter count
const activeFilterCount = useMemo(() => {
  let count = 0;
  if (filters.categories.length > 0) count += filters.categories.length;
  if (filters.rating !== null) count++;
  if (filters.priceRange.min > 0 || filters.priceRange.max < 100000) count++;
  if (filters.inStock) count++;
  if (filters.cashbackMin > 0) count++;
  return count;
}, [filters]);

// Has active filters
const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim() !== '';

// Apply filters
const handleApplyFilters = useCallback((newFilters: FilterState) => {
  setFilters(newFilters);
  setShowFilterModal(false);
}, []);

// Remove single filter
const handleRemoveFilter = useCallback((filterType: string, value?: any) => {
  setFilters(prev => {
    const newFilters = { ...prev };
    switch (filterType) {
      case 'category':
        newFilters.categories = prev.categories.filter(c => c !== value);
        break;
      case 'rating':
        newFilters.rating = null;
        break;
      case 'priceRange':
        newFilters.priceRange = { min: 0, max: 100000 };
        break;
      case 'inStock':
        newFilters.inStock = false;
        break;
      case 'cashback':
        newFilters.cashbackMin = 0;
        break;
    }
    return newFilters;
  });
}, []);

// Clear all filters
const handleClearAllFilters = useCallback(() => {
  setFilters({
    priceRange: { min: 0, max: 100000 },
    rating: null,
    categories: [],
    inStock: false,
    cashbackMin: 0,
  });
  setSearchQuery('');
}, []);

// Handle sort change
const handleSortChange = useCallback((sort: string) => {
  setSortOption(sort as any);
  setShowSortModal(false);
}, []);

// Get sort label
const getSortLabel = useCallback(() => {
  switch (sortOption) {
    case 'relevance': return 'Most Relevant';
    case 'price_low': return 'Price: Low to High';
    case 'price_high': return 'Price: High to Low';
    case 'rating': return 'Highest Rated';
    case 'newest': return 'Newest First';
    case 'popular': return 'Most Popular';
    case 'cashback': return 'Highest Cashback';
    default: return 'Sort';
  }
}, [sortOption]);
```

## UI Components (Copy-Paste Ready)

### Search Bar
```tsx
<View style={styles.searchContainer}>
  <View style={styles.searchBar}>
    <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search products..."
      placeholderTextColor="#9CA3AF"
      value={searchQuery}
      onChangeText={setSearchQuery}
      returnKeyType="search"
    />
    {searchQuery.length > 0 && (
      <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    )}
  </View>
</View>
```

### Control Bar
```tsx
<View style={styles.controlsBar}>
  <TouchableOpacity
    style={[styles.controlButton, activeFilterCount > 0 && styles.controlButtonActive]}
    onPress={() => setShowFilterModal(true)}
    activeOpacity={0.7}
  >
    <Ionicons name="filter" size={18} color={activeFilterCount > 0 ? "#FFFFFF" : "#7C3AED"} />
    <Text style={[styles.controlButtonText, activeFilterCount > 0 && styles.controlButtonTextActive]}>
      Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.controlButton}
    onPress={() => setShowSortModal(true)}
    activeOpacity={0.7}
  >
    <Ionicons name="swap-vertical" size={18} color="#7C3AED" />
    <Text style={styles.controlButtonText}>{getSortLabel()}</Text>
    <Ionicons name="chevron-down" size={16} color="#7C3AED" />
  </TouchableOpacity>
</View>
```

### Filter Chips
```tsx
{hasActiveFilters && (
  <View style={styles.activeFiltersContainer}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
      {searchQuery.trim() !== '' && (
        <View style={styles.activeFilterChip}>
          <Text style={styles.activeFilterChipText} numberOfLines={1}>
            Search: "{searchQuery.substring(0, 15)}{searchQuery.length > 15 ? '...' : ''}"
          </Text>
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#7C3AED" />
          </TouchableOpacity>
        </View>
      )}
      {filters.categories.map((category) => (
        <View key={category} style={styles.activeFilterChip}>
          <Text style={styles.activeFilterChipText}>{category}</Text>
          <TouchableOpacity onPress={() => handleRemoveFilter('category', category)}>
            <Ionicons name="close-circle" size={16} color="#7C3AED" />
          </TouchableOpacity>
        </View>
      ))}
      {/* Add other filter chips */}
      <TouchableOpacity
        style={styles.clearAllButton}
        onPress={handleClearAllFilters}
        activeOpacity={0.7}
      >
        <Text style={styles.clearAllButtonText}>Clear All</Text>
      </TouchableOpacity>
    </ScrollView>
  </View>
)}
```

### Modals
```tsx
<FilterModal
  visible={showFilterModal}
  onClose={() => setShowFilterModal(false)}
  onApplyFilters={handleApplyFilters}
  currentFilters={filters}
/>

<SortModal
  visible={showSortModal}
  onClose={() => setShowSortModal(false)}
  onSelectSort={handleSortChange}
  currentSort={sortOption}
/>
```

## Styles (Copy-Paste Ready)

```tsx
// Search styles
searchContainer: {
  paddingHorizontal: HORIZONTAL_PADDING,
  paddingVertical: 12,
},
searchBar: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
  borderWidth: 1,
  borderColor: "#E5E7EB",
},
searchIcon: {
  marginRight: 8,
},
searchInput: {
  flex: 1,
  fontSize: 15,
  color: "#1F2937",
  paddingVertical: 4,
},
clearButton: {
  padding: 4,
},

// Control bar styles
controlsBar: {
  flexDirection: "row",
  paddingHorizontal: HORIZONTAL_PADDING,
  paddingVertical: 8,
  gap: 10,
},
controlButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 10,
  gap: 6,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
  borderWidth: 1.5,
  borderColor: "#E5E7EB",
},
controlButtonActive: {
  backgroundColor: "#7C3AED",
  borderColor: "#7C3AED",
},
controlButtonText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#7C3AED",
},
controlButtonTextActive: {
  color: "#FFFFFF",
},

// Filter chip styles
activeFiltersContainer: {
  paddingVertical: 8,
},
activeFiltersScroll: {
  paddingHorizontal: HORIZONTAL_PADDING,
  gap: 8,
},
activeFilterChip: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#EDE9FE",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  gap: 6,
  borderWidth: 1,
  borderColor: "#C4B5FD",
},
activeFilterChipText: {
  fontSize: 13,
  fontWeight: "600",
  color: "#7C3AED",
  maxWidth: 150,
},
clearAllButton: {
  backgroundColor: "#FEE2E2",
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#FCA5A5",
},
clearAllButtonText: {
  fontSize: 13,
  fontWeight: "600",
  color: "#DC2626",
},
```

## Required Imports

```tsx
import { TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FilterModal, { FilterState } from "@/components/search/FilterModal";
import SortModal from "@/components/search/SortModal";
```

## useEffect Dependencies

```tsx
// Debounce search
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 500);
  return () => clearTimeout(timer);
}, [searchQuery]);

// Load products with filters
useEffect(() => {
  // loadProducts implementation
}, [storeData?.id, params.storeId, debouncedSearchQuery, filters, sortOption]);
```

## Common Customizations

### Change Debounce Delay
```tsx
// From 500ms to 300ms
setTimeout(() => {
  setDebouncedSearchQuery(searchQuery);
}, 300); // Change this value
```

### Change Price Range
```tsx
// Default: 0 - 100000
const [filters, setFilters] = useState<FilterState>({
  priceRange: { min: 0, max: 50000 }, // Change max value
  // ...
});
```

### Add More Sort Options
```tsx
type SortOption = 'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular' | 'cashback' | 'alphabetical'; // Add new option

// In getSortLabel():
case 'alphabetical': return 'A-Z';
```

### Change Filter Colors
```tsx
// In styles:
controlButtonActive: {
  backgroundColor: "#10B981", // Change from purple to green
  borderColor: "#10B981",
}
```

## Common Issues & Solutions

### Issue: Search not working
**Solution**: Check if debounced search is in useEffect dependencies
```tsx
useEffect(() => {
  // ...
}, [debouncedSearchQuery]); // Must include this
```

### Issue: Filters not applying
**Solution**: Verify filters are passed to API
```tsx
if (filters.categories.length > 0) {
  queryParams.category = filters.categories[0];
}
```

### Issue: Filter count not updating
**Solution**: Check activeFilterCount useMemo dependencies
```tsx
const activeFilterCount = useMemo(() => {
  // ...
}, [filters]); // Must include filters
```

### Issue: Chips not disappearing
**Solution**: Ensure filter state is updated correctly
```tsx
const handleRemoveFilter = (filterType, value) => {
  setFilters(prev => {
    const newFilters = { ...prev }; // Create copy
    // Modify newFilters
    return newFilters; // Return new object
  });
};
```

## Testing Checklist

```bash
# Quick test commands
□ Type in search bar - see debounced results
□ Open filter modal - apply filters
□ Open sort modal - change sort
□ Click filter chip X - filter removes
□ Click "Clear All" - everything resets
□ Apply multiple filters - all work together
□ Check filter count badge - shows correct number
□ Test on empty results - shows empty state
□ Test on network error - shows error state
□ Test loading state - shows skeleton
```

## Performance Tips

1. **Always use useCallback** for event handlers
2. **Always use useMemo** for computed values
3. **Debounce search** to reduce API calls
4. **Memoize styles** based on screen dimensions
5. **Use conditional rendering** for chips

## Color Reference

```tsx
Primary: #7C3AED     // Purple
Light: #EDE9FE       // Light purple
Border: #C4B5FD      // Purple border
White: #FFFFFF       // White
Gray: #E5E7EB        // Border gray
Dark: #1F2937        // Text dark
Medium: #6B7280      // Text medium
Light: #9CA3AF       // Icon gray
Red: #DC2626         // Error red
Red Light: #FEE2E2   // Error background
```

## Font Weights

```tsx
Regular: "400" or "normal"
Medium: "500"
Semibold: "600"
Bold: "700"
Extrabold: "800"
```

## Icon Names (Ionicons)

```tsx
Search: "search"
Filter: "filter"
Sort: "swap-vertical"
Close: "close-circle"
Chevron: "chevron-down"
Star: "star"
Cash: "cash-outline"
```

## Z-Index Layers

```tsx
Base content: 0
Search bar: 1
Control bar: 1
Filter chips: 1
Modals: 100
Error toast: 200
```

## Animation Tips

```tsx
// Smooth transitions
activeOpacity={0.7}  // For buttons
animationType="slide"  // For modals
```

## Accessibility Labels

```tsx
accessibilityLabel="Search products"
accessibilityHint="Type to search for products"
accessibilityRole="search"  // For search input
accessibilityRole="button"  // For buttons
```

## API Response Structure Expected

```tsx
{
  success: boolean,
  data: {
    products: ProductItem[],
    pagination: {
      current: number,
      pages: number,
      total: number,
      limit: number
    },
    filters: {
      categories: Array<{
        id: string,
        name: string,
        count: number
      }>,
      priceRange: {
        min: number,
        max: number
      }
    }
  },
  message?: string
}
```

## Quick Debug Commands

```tsx
// In component:
console.log('Search:', debouncedSearchQuery);
console.log('Filters:', filters);
console.log('Sort:', sortOption);
console.log('Active filters:', activeFilterCount);
console.log('Products:', products.length);
```

## Ready to Use Component

All the code is in:
```
app/MainStorePage.tsx
```

All styling is in:
```
createStyles() function at the bottom
```

All state is at:
```
Lines 521-543
```

All handlers are at:
```
Lines 775-844
```

---

**That's it! You're ready to use the search, filter, and sort features.**
