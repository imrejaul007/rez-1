# React Hooks Optimization Guide

## Overview

This guide provides best practices for optimizing React hooks to prevent memory leaks and reduce re-renders.

## 1. useMemo - Expensive Computations

### When to Use

Use `useMemo` when:
- Computing expensive calculations
- Creating new objects/arrays that are passed as props
- Filtering or transforming large datasets

### Examples

```tsx
// ❌ BAD: Recalculates on every render
function ProductList({ products }) {
  const sortedProducts = products.sort((a, b) => b.price - a.price);
  const totalPrice = products.reduce((sum, p) => sum + p.price, 0);

  return <List items={sortedProducts} total={totalPrice} />;
}

// ✅ GOOD: Only recalculates when products change
function ProductList({ products }) {
  const sortedProducts = useMemo(() =>
    products.sort((a, b) => b.price - a.price),
    [products]
  );

  const totalPrice = useMemo(() =>
    products.reduce((sum, p) => sum + p.price, 0),
    [products]
  );

  return <List items={sortedProducts} total={totalPrice} />;
}
```

### Complex Object Creation

```tsx
// ❌ BAD: Creates new object every render, causing child re-renders
function UserProfile({ user }) {
  const profileData = {
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };

  return <Profile data={profileData} />;
}

// ✅ GOOD: Memoizes object
function UserProfile({ user }) {
  const profileData = useMemo(() => ({
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  }), [user.name, user.email, user.avatar]);

  return <Profile data={profileData} />;
}
```

## 2. useCallback - Function References

### When to Use

Use `useCallback` when:
- Passing callbacks to memoized child components
- Callbacks are dependencies of other hooks
- Optimizing event handlers in large lists

### Examples

```tsx
// ❌ BAD: Creates new function every render
function ParentComponent() {
  const handlePress = (id) => {
    console.log('Pressed:', id);
  };

  return <ChildComponent onPress={handlePress} />;
}

// ✅ GOOD: Memoizes function
function ParentComponent() {
  const handlePress = useCallback((id) => {
    console.log('Pressed:', id);
  }, []);

  return <ChildComponent onPress={handlePress} />;
}
```

### With Dependencies

```tsx
function ProductCard({ product, cartItems }) {
  // Function depends on cartItems
  const handleAddToCart = useCallback(() => {
    const isInCart = cartItems.some(item => item.id === product.id);
    if (!isInCart) {
      addToCart(product);
    }
  }, [product, cartItems]); // Recreate only when these change

  return <Button onPress={handleAddToCart} />;
}
```

### Async Callbacks

```tsx
function DataFetcher({ userId }) {
  const [data, setData] = useState(null);

  const fetchUserData = useCallback(async () => {
    const result = await api.getUser(userId);
    setData(result);
  }, [userId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]); // Safe to use as dependency now

  return <UserView data={data} />;
}
```

## 3. React.memo - Component Memoization

### Basic Usage

```tsx
// ❌ BAD: Re-renders on every parent render
function ProductCard({ product }) {
  return (
    <View>
      <Text>{product.name}</Text>
      <Text>{product.price}</Text>
    </View>
  );
}

// ✅ GOOD: Only re-renders when props change
const ProductCard = memo(({ product }) => {
  return (
    <View>
      <Text>{product.name}</Text>
      <Text>{product.price}</Text>
    </View>
  );
});
```

### Custom Comparison Function

```tsx
const ProductCard = memo(
  ({ product, onPress }) => {
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{product.name}</Text>
        <Text>{product.price}</Text>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.price === nextProps.product.price &&
      prevProps.onPress === nextProps.onPress
    );
  }
);
```

## 4. useEffect Cleanup

### Timer Cleanup

```tsx
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    // CLEANUP: Clear interval on unmount
    return () => clearInterval(interval);
  }, []);

  return <Text>{seconds}s</Text>;
}
```

### Event Listener Cleanup

```tsx
function WindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    // CLEANUP: Remove listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <Text>{size.width} x {size.height}</Text>;
}
```

### Subscription Cleanup

```tsx
function RealtimeData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const subscription = dataService.subscribe(newData => {
      setData(newData);
    });

    // CLEANUP: Unsubscribe
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <DataView data={data} />;
}
```

### Async Operation Cleanup

```tsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      const data = await api.getUser(userId);

      // Only update state if not cancelled
      if (!cancelled) {
        setUser(data);
      }
    };

    fetchUser();

    // CLEANUP: Set cancelled flag
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return user ? <UserView user={user} /> : <Loading />;
}
```

## 5. useRef - Avoiding Re-renders

### Storing Mutable Values

```tsx
function VideoPlayer({ videoUrl }) {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(() => {
    playerRef.current?.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
  }, []);

  return (
    <View>
      <Video ref={playerRef} source={{ uri: videoUrl }} />
      <Button onPress={isPlaying ? pause : play} />
    </View>
  );
}
```

### Storing Previous Values

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const prevCountRef = useRef(0);

  useEffect(() => {
    prevCountRef.current = count;
  }, [count]);

  const prevCount = prevCountRef.current;

  return (
    <View>
      <Text>Current: {count}</Text>
      <Text>Previous: {prevCount}</Text>
    </View>
  );
}
```

### Avoiding Stale Closures

```tsx
function SearchInput() {
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const search = useCallback(() => {
    // Always uses latest query value
    api.search(queryRef.current);
  }, []); // No dependencies needed

  return <Input value={query} onChange={setQuery} onSubmit={search} />;
}
```

## 6. Context Optimization

### Split Large Contexts

```tsx
// ❌ BAD: One large context causes all consumers to re-render
const AppContext = createContext({
  user: null,
  cart: [],
  settings: {},
  theme: 'light',
});

// ✅ GOOD: Split into separate contexts
const UserContext = createContext(null);
const CartContext = createContext([]);
const SettingsContext = createContext({});
const ThemeContext = createContext('light');
```

### Memoize Context Value

```tsx
function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  // Memoize context value to prevent re-renders
  const value = useMemo(() => ({
    items,
    addItem: (item) => setItems(prev => [...prev, item]),
    removeItem: (id) => setItems(prev => prev.filter(i => i.id !== id)),
  }), [items]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
```

### Context Selectors

```tsx
// Custom hook with selector to prevent unnecessary re-renders
function useCartCount() {
  const { items } = useCart();

  // Only re-render when count changes, not when items change
  return useMemo(() => items.length, [items.length]);
}

function CartBadge() {
  const count = useCartCount(); // Only re-renders when count changes

  return <Badge count={count} />;
}
```

## 7. Debouncing and Throttling

### Debounced Input

```tsx
function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useMemo(
    () =>
      debounce(async (q) => {
        const data = await api.search(q);
        setResults(data);
      }, 300),
    []
  );

  useEffect(() => {
    if (query.length > 2) {
      debouncedSearch(query);
    }
  }, [query, debouncedSearch]);

  return (
    <View>
      <Input value={query} onChangeText={setQuery} />
      <ResultsList results={results} />
    </View>
  );
}
```

### Throttled Scroll

```tsx
function InfiniteScroll() {
  const [items, setItems] = useState([]);

  const handleScroll = useMemo(
    () =>
      throttle((event) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const isNearBottom =
          contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;

        if (isNearBottom) {
          loadMoreItems();
        }
      }, 200),
    []
  );

  return <FlatList data={items} onScroll={handleScroll} />;
}
```

## 8. Lazy Loading

### Lazy Component Loading

```tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyChart = lazy(() => import('./components/HeavyChart'));
const HeavyMap = lazy(() => import('./components/HeavyMap'));

function Dashboard() {
  return (
    <View>
      <Suspense fallback={<Loading />}>
        <HeavyChart />
      </Suspense>

      <Suspense fallback={<Loading />}>
        <HeavyMap />
      </Suspense>
    </View>
  );
}
```

## Optimization Checklist

- [ ] Use `useMemo` for expensive calculations
- [ ] Use `useCallback` for function props
- [ ] Memoize components with `React.memo`
- [ ] Clean up intervals and timers in `useEffect`
- [ ] Clean up event listeners
- [ ] Cancel async operations on unmount
- [ ] Unsubscribe from subscriptions
- [ ] Use `useRef` for mutable values
- [ ] Split large contexts into smaller ones
- [ ] Memoize context values
- [ ] Debounce/throttle frequent updates
- [ ] Lazy load heavy components
- [ ] Avoid inline functions in render
- [ ] Avoid inline styles in render

## Common Mistakes

### 1. Over-optimization

```tsx
// ❌ BAD: Unnecessary memoization for simple values
const count = useMemo(() => 1 + 1, []); // Overhead > benefit

// ✅ GOOD: Only memoize expensive computations
const count = 1 + 1;
```

### 2. Missing Dependencies

```tsx
// ❌ BAD: Missing dependency causes stale closure
const handlePress = useCallback(() => {
  console.log(userId); // Stale userId
}, []); // Missing userId dependency

// ✅ GOOD: Include all dependencies
const handlePress = useCallback(() => {
  console.log(userId);
}, [userId]);
```

### 3. Using Index as Key

```tsx
// ❌ BAD: Using index causes re-render issues
{items.map((item, index) => <Item key={index} data={item} />)}

// ✅ GOOD: Use stable unique identifier
{items.map(item => <Item key={item.id} data={item} />)}
```

## Further Reading

- [React Hooks API Reference](https://react.dev/reference/react/hooks)
- [useMemo Hook](https://react.dev/reference/react/useMemo)
- [useCallback Hook](https://react.dev/reference/react/useCallback)
- [React.memo API](https://react.dev/reference/react/memo)
