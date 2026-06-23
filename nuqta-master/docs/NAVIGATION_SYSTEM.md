# Navigation System Documentation

## Overview

The new navigation system provides robust, error-free navigation throughout the app with automatic fallbacks, platform-specific handling, and comprehensive error recovery.

## Key Features

- **Safe Navigation**: All navigation calls are wrapped with error handling
- **Automatic Fallbacks**: Intelligent fallback routing when navigation fails
- **Platform Detection**: Platform-specific behavior (web, iOS, Android)
- **History Tracking**: Complete navigation history management
- **Navigation Guards**: Middleware for authentication and route validation
- **Event System**: Subscribe to navigation events
- **Error Boundary**: Catches and recovers from navigation errors
- **Queue System**: Deferred navigation with priority support

## Components

### 1. Navigation Service (`services/navigationService.ts`)

Centralized navigation service managing all navigation operations.

```typescript
import { navigationService } from '@/services/navigationService';

// Initialize with router (done automatically in useSafeNavigation)
navigationService.initialize(router);

// Navigate to route
await navigationService.navigate('/profile');

// Navigate with options
await navigationService.navigate('/profile', {
  fallbackRoute: '/',
  onSuccess: () => console.log('Navigation successful'),
  onError: (error) => console.error('Navigation failed', error),
});

// Go back
await navigationService.goBack('/');

// Replace current route
await navigationService.replace('/home');
```

### 2. Safe Navigation Hook (`hooks/useSafeNavigation.ts`)

React hook for safe navigation in components.

```typescript
import { useSafeNavigation } from '@/hooks/useSafeNavigation';

function MyComponent() {
  const { navigate, goBack, canGoBack, isNavigating } = useSafeNavigation();

  const handlePress = async () => {
    await navigate('/profile');
  };

  const handleBack = async () => {
    await goBack('/home');
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>Go to Profile</Text>
    </TouchableOpacity>
  );
}
```

### 3. Safe Back Button (`components/navigation/SafeBackButton.tsx`)

Universal back button component with automatic fallbacks.

```typescript
import { HeaderBackButton } from '@/components/navigation';

function MyScreen() {
  return (
    <View style={styles.header}>
      <HeaderBackButton
        fallbackRoute="/home"
        iconColor="#FFFFFF"
      />
      <Text>My Screen</Text>
    </View>
  );
}
```

#### Variants

**ThemedSafeBackButton**: Pre-styled variants
```typescript
<ThemedSafeBackButton variant="light" />
<ThemedSafeBackButton variant="dark" />
<ThemedSafeBackButton variant="transparent" />
```

**SafeCloseButton**: For modals
```typescript
<SafeCloseButton onPress={handleClose} />
```

**MinimalBackButton**: Without container styling
```typescript
<MinimalBackButton />
```

### 4. Navigation Error Boundary

Catches navigation errors and provides recovery UI.

```typescript
import { NavigationErrorBoundary } from '@/components/navigation';

function App() {
  return (
    <NavigationErrorBoundary
      fallbackRoute="/"
      onError={(error, errorInfo) => {
        console.error('Navigation error:', error);
      }}
      showErrorDetails={__DEV__}
    >
      {/* Your app content */}
    </NavigationErrorBoundary>
  );
}
```

## Migration Guide

### Before (Old Way)

```typescript
// Old fragile navigation
const handleGoBack = () => {
  try {
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (router && router.push) {
      router.push('/');
    } else {
      router.replace('/');
    }
  } catch (error) {
    console.log('Navigation fallback to home');
    if (router) {
      router.replace('/');
    }
  }
};

return (
  <TouchableOpacity onPress={handleGoBack}>
    <Ionicons name="arrow-back" size={24} />
  </TouchableOpacity>
);
```

### After (New Way)

```typescript
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { HeaderBackButton } from '@/components/navigation';

const { goBack } = useSafeNavigation();

const handleGoBack = () => {
  goBack('/');
};

return <HeaderBackButton onPress={handleGoBack} />;
```

## Advanced Features

### Navigation Guards

Protect routes with authentication checks:

```typescript
import { useNavigationGuard } from '@/hooks/useSafeNavigation';

function MyComponent() {
  useNavigationGuard(async (to, from) => {
    if (requiresAuth(to) && !isAuthenticated) {
      // Block navigation
      return false;
    }
    return true;
  });
}
```

### Navigation Events

Listen to navigation events:

```typescript
import { useNavigationEvent } from '@/hooks/useSafeNavigation';
import { NavigationEvent } from '@/types/navigation.types';

function MyComponent() {
  useNavigationEvent(
    NavigationEvent.AFTER_NAVIGATE,
    (data) => {
      console.log('Navigated to:', data.to);
    }
  );
}
```

### Back Button Handler

Handle hardware/browser back button:

```typescript
import { useBackButton } from '@/hooks/useSafeNavigation';

function MyComponent() {
  useBackButton(() => {
    // Custom back button logic
    console.log('Back button pressed');
    return true; // Prevent default
  });
}
```

### Navigation Queue

Queue navigation for later execution:

```typescript
const { queueNavigation } = useSafeNavigation();

// Queue with priority
const id = navigationService.queueNavigation(
  '/profile',
  { replace: true },
  10 // priority
);

// Cancel queued navigation
navigationService.cancelQueuedNavigation(id);
```

## Platform-Specific Behavior

### Web
- Browser back button integration
- History API support
- URL parameter handling

### iOS
- Swipe gesture support
- Native navigation transitions

### Android
- Hardware back button handling
- Material design transitions

## Error Handling

All navigation methods return a `NavigationResult`:

```typescript
interface NavigationResult {
  status: 'success' | 'failed' | 'fallback';
  route?: string;
  error?: Error;
  fallbackUsed?: boolean;
}

const result = await navigate('/profile');

if (result.status === 'failed') {
  console.error('Navigation failed:', result.error);
} else if (result.status === 'fallback') {
  console.log('Used fallback route:', result.route);
}
```

## Best Practices

### 1. Always Use Safe Navigation

```typescript
// Bad
router.push('/profile');

// Good
const { navigate } = useSafeNavigation();
await navigate('/profile');
```

### 2. Provide Fallback Routes

```typescript
// Good
await navigate('/profile', {
  fallbackRoute: '/',
});

await goBack('/home');
```

### 3. Use HeaderBackButton

```typescript
// Instead of custom back buttons
<HeaderBackButton
  fallbackRoute="/home"
  iconColor="#FFFFFF"
/>
```

### 4. Handle Navigation Results

```typescript
const result = await navigate('/profile');

if (result.status !== 'success') {
  // Handle error
  Alert.alert('Navigation Failed', 'Please try again');
}
```

### 5. Wrap App in Error Boundary

```typescript
function App() {
  return (
    <NavigationErrorBoundary fallbackRoute="/">
      <YourApp />
    </NavigationErrorBoundary>
  );
}
```

## Testing

### Test Navigation

```typescript
import { navigationService } from '@/services/navigationService';

describe('Navigation', () => {
  it('should navigate successfully', async () => {
    const result = await navigationService.navigate('/profile');
    expect(result.status).toBe('success');
  });

  it('should use fallback on error', async () => {
    const result = await navigationService.navigate('/invalid', {
      fallbackRoute: '/',
    });
    expect(result.fallbackUsed).toBe(true);
  });
});
```

## Troubleshooting

### Navigation Not Working

1. Ensure navigation service is initialized
2. Check if route is valid
3. Verify fallback routes are set
4. Check console for errors

### Can't Go Back

Use `goBackOrFallback` which automatically handles this:

```typescript
const { goBackOrFallback } = useSafeNavigation();
await goBackOrFallback('/home');
```

### Deep Links Not Working

Use `resolveDeepLink` utility:

```typescript
import { resolveDeepLink } from '@/utils/navigationHelper';

const route = resolveDeepLink('myapp://profile?id=123');
if (route) {
  await navigate(route);
}
```

## API Reference

### useSafeNavigation Hook

```typescript
interface UseSafeNavigationReturn {
  // Navigation functions
  navigate: (route: Href, options?: NavigationOptions) => Promise<NavigationResult>;
  goBack: (fallbackRoute?: Href) => Promise<NavigationResult>;
  replace: (route: Href, options?: NavigationOptions) => Promise<NavigationResult>;
  navigateWithConfirmation: (route: Href, message: string, options?: NavigationOptions) => Promise<NavigationResult | null>;
  goToHome: () => Promise<NavigationResult>;
  goToProfile: () => Promise<NavigationResult>;
  goBackOrFallback: (fallbackRoute?: Href) => Promise<NavigationResult>;

  // State
  isNavigating: boolean;
  canGoBack: boolean;
  platform: Platform;

  // Service access
  getCurrentRoute: () => string;
  getHistory: () => NavigationHistoryEntry[];
  clearHistory: () => void;

  // Guards and events
  addGuard: (guard: NavigationGuard) => void;
  removeGuard: (guard: NavigationGuard) => void;
  addEventListener: (event: NavigationEvent, handler: any) => void;
  removeEventListener: (event: NavigationEvent, handler: any) => void;
}
```

### HeaderBackButton Props

```typescript
interface BackButtonConfig {
  fallbackRoute?: Href;
  onPress?: () => void;
  showConfirmation?: boolean;
  confirmationMessage?: string;
  style?: ViewStyle;
  iconColor?: string;
  iconSize?: number;
  iconName?: string;
}
```

## Performance

- Navigation calls are throttled to prevent rapid successive calls
- History is limited to 50 entries
- Queue processing is batched with delays
- Guards and middleware are executed efficiently

## Conclusion

The new navigation system eliminates all navigation crashes and provides a robust, consistent experience across all platforms. Always use the safe navigation utilities and components instead of direct router calls.
