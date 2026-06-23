# FlatList Optimization Guide

## Overview

This guide provides comprehensive FlatList optimization techniques to prevent memory leaks and improve performance.

## Key Optimizations

### 1. Basic FlatList Optimization

```tsx
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}

  // PERFORMANCE OPTIMIZATIONS
  removeClippedSubviews={true}  // Remove off-screen items from memory
  maxToRenderPerBatch={10}       // Render 10 items per batch
  updateCellsBatchingPeriod={50} // Update every 50ms
  initialNumToRender={10}        // Render first 10 items
  windowSize={5}                 // Keep 5 screen heights in memory

  // MEMORY OPTIMIZATIONS
  getItemLayout={getItemLayout}  // Fixed height optimization
/>
```

### 2. Memoized Render Functions

```tsx
import React, { useCallback, useMemo } from 'react';

function MyList({ data }) {
  // OPTIMIZATION: Memoize key extractor
  const keyExtractor = useCallback((item: Item) => item.id, []);

  // OPTIMIZATION: Memoize render item
  const renderItem = useCallback(
    ({ item }: { item: Item }) => <ItemCard item={item} />,
    []
  );

  // OPTIMIZATION: Memoize getItemLayout (for fixed height items)
  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: 150, // Fixed item height
      offset: 150 * index,
      index,
    }),
    []
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
}
```

### 3. Optimized List Item Component

```tsx
import React, { memo } from 'react';

interface ItemCardProps {
  item: Item;
  onPress?: (item: Item) => void;
}

// OPTIMIZATION: Memoize component to prevent unnecessary re-renders
const ItemCard = memo<ItemCardProps>(({ item, onPress }) => {
  // OPTIMIZATION: Memoize press handler
  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [item, onPress]);

  return (
    <TouchableOpacity onPress={handlePress}>
      <View style={styles.card}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <Text>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.title === nextProps.item.title;
});
```

### 4. Paginated List with Pull-to-Refresh

```tsx
function PaginatedList() {
  const [data, setData] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // OPTIMIZATION: Memoize refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    const newData = await fetchData(1);
    setData(newData);
    setRefreshing(false);
  }, []);

  // OPTIMIZATION: Memoize load more handler
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    const newData = await fetchData(page + 1);
    setData(prev => [...prev, ...newData]);
    setPage(prev => prev + 1);
    setHasMore(newData.length > 0);
    setLoading(false);
  }, [loading, hasMore, page]);

  // OPTIMIZATION: Memoize footer component
  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return <ActivityIndicator />;
  }, [loading]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
}
```

### 5. Horizontal ScrollView Optimization

```tsx
function HorizontalList({ items }) {
  // OPTIMIZATION: Use FlatList instead of ScrollView for large lists
  return (
    <FlatList
      horizontal
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      showsHorizontalScrollIndicator={false}

      // HORIZONTAL LIST OPTIMIZATIONS
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}  // Fewer items for horizontal
      windowSize={3}           // Smaller window for horizontal
      initialNumToRender={5}   // Show 5 items initially

      // CONTENT CONTAINER
      contentContainerStyle={styles.horizontalScrollContent}
    />
  );
}
```

### 6. Image Optimization in Lists

```tsx
import FastImage from 'react-native-fast-image';

const ItemCard = memo(({ item }) => {
  return (
    <View style={styles.card}>
      {/* OPTIMIZATION: Use FastImage with priority and caching */}
      <FastImage
        source={{
          uri: item.image,
          priority: FastImage.priority.normal,
          cache: FastImage.cacheControl.immutable,
        }}
        style={styles.image}
        resizeMode={FastImage.resizeMode.cover}
      />
      <Text>{item.title}</Text>
    </View>
  );
});
```

### 7. Avoid Inline Functions and Styles

```tsx
// ❌ BAD: Inline functions and styles create new references every render
<FlatList
  data={data}
  renderItem={({ item }) => <ItemCard item={item} onPress={() => handlePress(item)} />}
  contentContainerStyle={{ padding: 16 }}
/>

// ✅ GOOD: Memoize functions and use StyleSheet
const renderItem = useCallback(({ item }) => (
  <ItemCard item={item} onPress={handlePress} />
), [handlePress]);

const contentContainerStyle = useMemo(() => ({ padding: 16 }), []);

<FlatList
  data={data}
  renderItem={renderItem}
  contentContainerStyle={contentContainerStyle}
/>
```

### 8. Section List Optimization

```tsx
function OptimizedSectionList() {
  const sections = useMemo(() => [
    { title: 'Category A', data: dataA },
    { title: 'Category B', data: dataB },
  ], [dataA, dataB]);

  const renderSectionHeader = useCallback(({ section }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  ), []);

  const keyExtractor = useCallback((item: Item, index: number) =>
    `${item.id}-${index}`,
  []);

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={keyExtractor}

      // OPTIMIZATIONS
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
      stickySectionHeadersEnabled={false} // Disable if not needed
    />
  );
}
```

## Performance Checklist

- [ ] Use `keyExtractor` with unique, stable keys
- [ ] Memoize `renderItem` with `useCallback`
- [ ] Memoize list item components with `React.memo`
- [ ] Use `getItemLayout` for fixed-height items
- [ ] Enable `removeClippedSubviews={true}`
- [ ] Set appropriate `windowSize` (default 21 is too high)
- [ ] Set `maxToRenderPerBatch` (10-15 for optimal performance)
- [ ] Avoid inline functions and styles
- [ ] Use `FastImage` for images with caching
- [ ] Implement pagination with `onEndReached`
- [ ] Use `initialNumToRender` (10-15 items)
- [ ] Avoid complex calculations in render functions

## Common Mistakes

### 1. Not Using Unique Keys

```tsx
// ❌ BAD: Using index as key
<FlatList keyExtractor={(item, index) => String(index)} />

// ✅ GOOD: Using unique ID
<FlatList keyExtractor={(item) => item.id} />
```

### 2. Recreating Functions on Every Render

```tsx
// ❌ BAD: New function every render
<FlatList renderItem={(info) => <Item {...info} />} />

// ✅ GOOD: Memoized function
const renderItem = useCallback((info) => <Item {...info} />, []);
<FlatList renderItem={renderItem} />
```

### 3. Not Memoizing List Items

```tsx
// ❌ BAD: Component re-renders even when data doesn't change
const ItemCard = ({ item }) => <View>...</View>;

// ✅ GOOD: Memoized component
const ItemCard = memo(({ item }) => <View>...</View>);
```

## Memory Leak Prevention

### 1. Cleanup Timers and Intervals

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);

  // CLEANUP
  return () => clearInterval(interval);
}, []);
```

### 2. Cancel Async Operations

```tsx
useEffect(() => {
  let cancelled = false;

  const fetchData = async () => {
    const data = await api.fetch();
    if (!cancelled) {
      setData(data);
    }
  };

  fetchData();

  // CLEANUP
  return () => {
    cancelled = true;
  };
}, []);
```

### 3. Unsubscribe from Listeners

```tsx
useEffect(() => {
  const subscription = someService.subscribe(data => {
    setData(data);
  });

  // CLEANUP
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## Further Reading

- [React Native FlatList Documentation](https://reactnative.dev/docs/flatlist)
- [Performance Optimization](https://reactnative.dev/docs/performance)
- [React Hooks Optimization](https://react.dev/reference/react/hooks)
