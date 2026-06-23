# Virtualization & Performance Optimization
## Best Practices Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-14
**Agent:** Agent 1

---

## 🎯 Core Principles

### 1. **Virtualize Everything**

**Always use FlatList for lists, never ScrollView with .map()**

❌ **Bad:**
```typescript
<ScrollView horizontal>
  {items.map(item => (
    <Card key={item.id} item={item} />
  ))}
</ScrollView>
```

✅ **Good:**
```typescript
<FlatList
  horizontal
  data={items}
  renderItem={({ item }) => <Card item={item} />}
  keyExtractor={item => item.id}
  getItemLayout={getItemLayout}
  windowSize={5}
/>
```

**Why:** FlatList only renders visible items, saving 80%+ memory.

---

### 2. **Always Implement getItemLayout**

**Critical for FlatList performance**

❌ **Bad:**
```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  // No getItemLayout - FlatList has to measure each item
/>
```

✅ **Good:**
```typescript
const ITEM_HEIGHT = 100;

const getItemLayout = (data, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

<FlatList
  data={items}
  renderItem={renderItem}
  getItemLayout={getItemLayout}
/>
```

**Why:** Enables instant scrolling, reduces layout calculations by 90%.

---

### 3. **Memoize Everything**

**Use React.memo, useMemo, useCallback aggressively**

❌ **Bad:**
```typescript
const MyComponent = ({ data }) => {
  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <Card item={item} />}
      keyExtractor={(item) => item.id}
    />
  );
};
```

✅ **Good:**
```typescript
const Card = React.memo(({ item }) => (
  <View>{/* render */}</View>
), (prev, next) => prev.item.id === next.item.id);

const MyComponent = ({ data }) => {
  const renderItem = useCallback(({ item }) => (
    <Card item={item} />
  ), []);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
    />
  );
};

export default React.memo(MyComponent);
```

**Why:** Prevents unnecessary re-renders, maintains 60fps.

---

### 4. **Lazy Load Below-the-Fold**

**Only load what the user can see**

❌ **Bad:**
```typescript
return (
  <ScrollView>
    <Section1 />
    <Section2 />
    <Section3 />
    <Section4 />
    <Section5 />
    <Section6 />
  </ScrollView>
);
```

✅ **Good:**
```typescript
return (
  <ScrollView>
    <Section1 />  {/* Above fold - load immediately */}
    <Section2 />  {/* Above fold - load immediately */}

    <LazySection sectionId="section3" renderSection={() => <Section3 />} />
    <LazySection sectionId="section4" renderSection={() => <Section4 />} />
    <LazySection sectionId="section5" renderSection={() => <Section5 />} />
    <LazySection sectionId="section6" renderSection={() => <Section6 />} />
  </ScrollView>
);
```

**Why:** Reduces initial bundle by 70%, faster time to interactive.

---

### 5. **Prefetch Intelligently**

**Load next content before user needs it**

❌ **Bad:**
```typescript
// Load section when user scrolls to it
const handleScroll = (sectionId) => {
  fetchSectionData(sectionId); // User waits 800ms
};
```

✅ **Good:**
```typescript
// Prefetch when section becomes visible
const handleSectionVisible = (sectionId) => {
  prefetchService.prefetchNextSections(sectionId, allSections);
};

// Data already loaded when user scrolls
// User sees instant content
```

**Why:** Perceived load time reduced by 90%.

---

### 6. **Clean Up Aggressively**

**Remove off-screen components and data**

❌ **Bad:**
```typescript
useEffect(() => {
  loadHeavyData();
  // No cleanup
}, []);
```

✅ **Good:**
```typescript
useEffect(() => {
  const componentId = `component-${id}`;

  memoryManager.registerComponent(componentId, 'heavy-component');
  loadHeavyData();

  return () => {
    memoryManager.unregisterComponent(componentId);
    cleanupHeavyData();
  };
}, [id]);
```

**Why:** Prevents memory leaks, maintains stable memory usage.

---

### 7. **Monitor Performance**

**Track metrics continuously**

❌ **Bad:**
```typescript
// No monitoring - blind to performance issues
```

✅ **Good:**
```typescript
useEffect(() => {
  virtualizationPerformanceMonitor.startMonitoring();

  const interval = setInterval(() => {
    const report = virtualizationPerformanceMonitor.getReport();

    if (report.avgFPS < 45) {
      console.warn('Low FPS detected!', report);
    }
  }, 60000);

  return () => {
    clearInterval(interval);
    virtualizationPerformanceMonitor.stopMonitoring();
  };
}, []);
```

**Why:** Catch performance regressions early, data-driven optimization.

---

## 🚀 Quick Wins

### Optimize FlatList Configuration

```typescript
<FlatList
  // Reduce memory footprint
  windowSize={5}              // Default is 21 (too much)
  initialNumToRender={3}      // Default is 10
  maxToRenderPerBatch={3}     // Default is 10

  // Remove off-screen views (native only)
  removeClippedSubviews={Platform.OS !== 'web'}

  // Enable faster scrolling
  getItemLayout={getItemLayout}

  // Batch updates
  updateCellsBatchingPeriod={50}
/>
```

**Impact:** 50-70% memory reduction, smoother scrolling

---

### Optimize Images

```typescript
import OptimizedImage from '@/components/common/OptimizedImage';

// Use optimized image component
<OptimizedImage
  source={imageUrl}
  width={280}
  height={200}
  lazy={true}
  priority={false}
  progressive={true}
  quality="auto"
  enableWebP={true}
/>
```

**Impact:** 60% faster image loads, 40% less bandwidth

---

### Optimize Scroll Handlers

❌ **Bad:**
```typescript
<ScrollView
  onScroll={(e) => {
    // Heavy calculation every frame
    const position = e.nativeEvent.contentOffset.y;
    updateComplexState(position);
  }}
/>
```

✅ **Good:**
```typescript
<ScrollView
  onScroll={(e) => {
    // Lightweight tracking
    const position = e.nativeEvent.contentOffset.y;
    trackScroll(position);
  }}
  scrollEventThrottle={16}  // Throttle to 60fps
/>
```

**Impact:** Maintains 60fps during scroll

---

## ⚠️ Common Pitfalls

### Pitfall 1: Inline Functions in FlatList

❌ **Bad:**
```typescript
<FlatList
  data={items}
  renderItem={({ item }) => <Card item={item} />}  // New function every render!
  keyExtractor={(item) => item.id}  // New function every render!
/>
```

✅ **Good:**
```typescript
const renderItem = useCallback(({ item }) => <Card item={item} />, []);
const keyExtractor = useCallback((item) => item.id, []);

<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
/>
```

---

### Pitfall 2: Incorrect getItemLayout

❌ **Bad:**
```typescript
const getItemLayout = (data, index) => ({
  length: 100,  // Wrong! Actual item is 120px
  offset: 100 * index,
  index,
});
```

✅ **Good:**
```typescript
const ITEM_HEIGHT = 120;  // Match actual rendered height

const getItemLayout = (data, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});
```

---

### Pitfall 3: Not Cleaning Up

❌ **Bad:**
```typescript
useEffect(() => {
  const subscription = subscribeToData();
  // No cleanup - memory leak!
}, []);
```

✅ **Good:**
```typescript
useEffect(() => {
  const subscription = subscribeToData();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

### Pitfall 4: Over-Prefetching

❌ **Bad:**
```typescript
// Prefetch everything immediately
prefetchService.configure({
  lookAhead: 10,  // Too many!
  maxConcurrent: 10,  // Too many!
});
```

✅ **Good:**
```typescript
// Prefetch smartly
prefetchService.configure({
  lookAhead: 2,  // Just next 2 sections
  maxConcurrent: 3,  // Limit concurrent
  networkTypes: [NetworkType.WIFI],  // Only on WiFi
});
```

---

## 📊 Performance Checklist

Before pushing to production:

- [ ] All lists use FlatList (not ScrollView)
- [ ] getItemLayout implemented for all FlatLists
- [ ] All renderItem callbacks memoized
- [ ] All list items use React.memo
- [ ] Lazy loading for below-fold content
- [ ] Prefetching configured
- [ ] Memory cleanup in all useEffects
- [ ] Performance monitoring active
- [ ] Images optimized
- [ ] Scroll handlers throttled
- [ ] No inline functions in render
- [ ] No unnecessary re-renders
- [ ] Memory usage < 100MB
- [ ] FPS >= 55
- [ ] Scroll jank < 5%

---

## 🔍 Debugging Tips

### Check FPS

```typescript
virtualizationPerformanceMonitor.logReport();
// Look for: avgFPS >= 55
```

### Check Memory

```typescript
const stats = memoryManager.getMemoryStats();
console.log(`Memory: ${stats.estimatedMemoryUsage}MB`);
console.log(`Active: ${stats.activeComponents}`);
// Target: < 100MB, < 50 active components
```

### Check Prefetch

```typescript
const stats = prefetchService.getStats();
console.log('Prefetch enabled:', stats.prefetchEnabled);
console.log('Queue length:', stats.queueLength);
console.log('Network:', stats.currentNetwork);
```

### Check Render Count

```typescript
// Add to component
const renderCount = useRef(0);
renderCount.current++;
console.log(`${componentName} rendered ${renderCount.current} times`);
```

### Enable React DevTools Profiler

```typescript
// Wrap component
import { Profiler } from 'react';

<Profiler id="MyComponent" onRender={(id, phase, actualDuration) => {
  console.log(`${id} ${phase} took ${actualDuration}ms`);
}}>
  <MyComponent />
</Profiler>
```

---

## 🎓 Advanced Techniques

### 1. Dynamic Window Size

Adjust based on device:

```typescript
const getWindowSize = () => {
  const totalMemory = DeviceInfo.getTotalMemory();

  if (totalMemory < 2 * 1024 * 1024 * 1024) return 3; // < 2GB
  if (totalMemory < 4 * 1024 * 1024 * 1024) return 5; // < 4GB
  return 7; // >= 4GB
};

<FlatList windowSize={getWindowSize()} />
```

---

### 2. Intelligent Prefetch Priority

```typescript
const getPrefetchPriority = (section: HomepageSection) => {
  if (section.id === 'just_for_you') return PrefetchPriority.HIGH;
  if (section.id === 'trending') return PrefetchPriority.NORMAL;
  return PrefetchPriority.LOW;
};
```

---

### 3. Adaptive Quality

```typescript
const getImageQuality = (networkSpeed: number) => {
  if (networkSpeed > 10000000) return 'high'; // > 10Mbps
  if (networkSpeed > 5000000) return 'medium'; // > 5Mbps
  return 'low';
};

<OptimizedImage quality={getImageQuality(currentSpeed)} />
```

---

## 📚 Further Reading

### Official Documentation
- [React Native FlatList](https://reactnative.dev/docs/flatlist)
- [React Performance Optimization](https://react.dev/reference/react/memo)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

### Internal Documentation
- `PHASE4_DAY11-12_VIRTUALIZATION_IMPLEMENTATION_GUIDE.md` - Full implementation guide
- `PHASE4_DAY11-12_PERFORMANCE_REPORT.md` - Detailed benchmarks
- Component README files

---

## ✅ Summary

**Remember the 7 Core Principles:**

1. ✅ Virtualize Everything (FlatList > ScrollView)
2. ✅ Always Implement getItemLayout
3. ✅ Memoize Everything (React.memo, useCallback, useMemo)
4. ✅ Lazy Load Below-the-Fold
5. ✅ Prefetch Intelligently
6. ✅ Clean Up Aggressively
7. ✅ Monitor Performance

**Follow these practices and you'll achieve:**
- 60fps scrolling
- < 100MB memory usage
- < 5% scroll jank
- Fast time to interactive
- Excellent user experience

---

**Last Updated:** 2025-11-14
**Maintained By:** Agent 1
**Questions?** Check the implementation guide or performance report.
