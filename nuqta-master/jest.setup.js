// Import Jest Native matchers for @testing-library/react-native
import '@testing-library/jest-native/extend-expect';

// ============================================
// Mock AsyncStorage with actual storage implementation
// ============================================
const storage = new Map();

const mockAsyncStorage = {
  setItem: jest.fn((key, value) => {
    storage.set(key, value);
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => Promise.resolve(storage.get(key) || null)),
  removeItem: jest.fn((key) => {
    storage.delete(key);
    return Promise.resolve();
  }),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([key, value]) => storage.set(key, value));
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys) =>
    Promise.resolve(keys.map(key => [key, storage.get(key) || null]))
  ),
  multiRemove: jest.fn((keys) => {
    keys.forEach(key => storage.delete(key));
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    storage.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

// ============================================
// Mock Expo Clipboard
// ============================================
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('')),
  hasStringAsync: jest.fn(() => Promise.resolve(false)),
  setString: jest.fn(),
  getString: jest.fn(() => ''),
}));

// ============================================
// Mock NativeSettingsManager before react-native
// ============================================
jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  __esModule: true,
  default: {
    getConstants: jest.fn(() => ({ settings: {} })),
    setValues: jest.fn(),
    deleteValues: jest.fn(),
  },
}));

// ============================================
// Mock React Native modules
// ============================================
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = require('react');

  // Passthrough TouchableOpacity that forwards all props (including `onPress`)
  // to the rendered host element. The real RN TouchableOpacity consumes
  // `onPress` via Pressability and only exposes `onClick` on the inner View,
  // which breaks test patterns like `el.props.onPress()` used in some unit
  // tests. We keep the real `TouchableOpacity`'s default `accessible: true`
  // behavior so that accessibility role lookups still find the element.
  const TestTouchableOpacity = React.forwardRef((props, ref) => {
    const {
      accessible,
      // Accept aria-* aliases and translate them, like real TouchableOpacity
      'aria-label': ariaLabel,
      'aria-busy': ariaBusy,
      'aria-checked': ariaChecked,
      'aria-disabled': ariaDisabled,
      'aria-expanded': ariaExpanded,
      'aria-selected': ariaSelected,
      'aria-valuemax': ariaValueMax,
      'aria-valuemin': ariaValueMin,
      'aria-valuenow': ariaValueNow,
      'aria-valuetext': ariaValueText,
      'aria-live': ariaLive,
      'aria-hidden': ariaHidden,
      'aria-modal': ariaModal,
      accessibilityState: a11yState,
      accessibilityValue: a11yValue,
      ...rest
    } = props;

    const accessibilityState = a11yState ?? {
      ...(ariaBusy !== undefined && { busy: ariaBusy }),
      ...(ariaChecked !== undefined && { checked: ariaChecked }),
      ...(ariaDisabled !== undefined && { disabled: ariaDisabled }),
      ...(ariaExpanded !== undefined && { expanded: ariaExpanded }),
      ...(ariaSelected !== undefined && { selected: ariaSelected }),
    };

    const accessibilityValue = a11yValue ?? {
      ...(ariaValueMax !== undefined && { max: ariaValueMax }),
      ...(ariaValueMin !== undefined && { min: ariaValueMin }),
      ...(ariaValueNow !== undefined && { now: ariaValueNow }),
      ...(ariaValueText !== undefined && { text: ariaValueText }),
    };

    const merged = {
      ...rest,
      accessible: accessible !== false,
      accessibilityLabel: ariaLabel ?? rest.accessibilityLabel,
      accessibilityState: Object.keys(accessibilityState).length > 0 ? accessibilityState : rest.accessibilityState,
      accessibilityValue: Object.keys(accessibilityValue).length > 0 ? accessibilityValue : rest.accessibilityValue,
      accessibilityLiveRegion:
        ariaLive === 'off' ? 'none' : (ariaLive ?? rest.accessibilityLiveRegion),
      accessibilityElementsHidden:
        ariaHidden ?? rest.accessibilityElementsHidden,
      importantForAccessibility:
        ariaHidden === true ? 'no-hide-descendants' : rest.importantForAccessibility,
      accessibilityViewIsModal: ariaModal ?? rest.accessibilityViewIsModal,
    };

    return React.createElement(RN.View, { ...merged, ref });
  });
  TestTouchableOpacity.displayName = 'TouchableOpacity';

  return {
    ...RN,
    TouchableOpacity: TestTouchableOpacity,
    Settings: {
      get: jest.fn((key) => null),
      set: jest.fn((settings) => {}),
      watchKeys: jest.fn(() => ({
        remove: jest.fn(),
      })),
    },
    Share: {
      share: jest.fn(() =>
        Promise.resolve({
          action: 'sharedAction',
          activityType: null,
        })
      ),
      sharedAction: 'sharedAction',
      dismissedAction: 'dismissedAction',
    },
    Alert: {
      alert: jest.fn(),
    },
    // Override BackHandler so individual tests can spy on addEventListener
    // and removeEventListener. The real react-native BackHandler exports
    // a non-mock function, which makes matchers like toHaveBeenCalledWith
    // throw "received value must be a mock or spy function".
    BackHandler: {
      ...(RN.BackHandler || {}),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    Platform: {
      ...RN.Platform,
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
  };
});

// ============================================
// Mock Stores Selectors
// ============================================
jest.mock('@/stores/selectors', () => ({
  useIsAuthenticated: jest.fn(() => true),
  useAuthLoading: jest.fn(() => false),
  useAuthUser: jest.fn(() => ({ id: 'test-user-id', email: 'test@example.com' })),
  useGetCurrencySymbol: jest.fn(() => () => 'Rs. '),
  useGetLocale: jest.fn(() => () => 'en-US'),
  useUserId: jest.fn(() => 'test-user-id'),
  useIsOnboarded: jest.fn(() => true),
  useAuthError: jest.fn(() => null),
  useAuthActions: jest.fn(() => ({})),
}));

// ============================================
// Mock Expo Router
// ============================================
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  useSegments: jest.fn(() => []),
  Stack: {
    Screen: jest.fn(({ children }) => children),
  },
  Link: jest.fn(({ children }) => children),
  Redirect: jest.fn(() => null),
}));

// ============================================
// Mock Expo Linear Gradient
// ============================================
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: jest.fn(({ children }) => children),
}));

// ============================================
// Mock Expo Vector Icons
// ============================================
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  Feather: 'Feather',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

// ============================================
// Mock Expo Status Bar
// ============================================
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// ============================================
// Mock Expo Font
// ============================================
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// ============================================
// Mock Expo Splash Screen
// ============================================
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// ============================================
// Mock Expo Linking
// ============================================
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `exp://localhost:8081/${path}`),
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// ============================================
// Mock NetInfo
// ============================================
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
}));

// ============================================
// Mock Socket.io Client
// ============================================
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  };
  return {
    io: jest.fn(() => mockSocket),
  };
});

// ============================================
// Mock Expo Camera
// ============================================
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
    getCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
  },
}));

// ============================================
// Mock Expo Location
// ============================================
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 28.7041,
        longitude: 77.1025,
        accuracy: 10,
      },
    })
  ),
}));

// ============================================
// Mock Expo Notifications
// ============================================
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'ExponentPushToken[test]' })
  ),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// ============================================
// Mock Stripe React Native
// ============================================
jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: jest.fn(({ children }) => children),
  CardField: jest.fn(() => null),
  useStripe: jest.fn(() => ({
    confirmPayment: jest.fn(() => Promise.resolve({ paymentIntent: {} })),
    createPaymentMethod: jest.fn(() => Promise.resolve({ paymentMethod: {} })),
  })),
}));

// ============================================
// Mock Reanimated
// ============================================
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// ============================================
// Mock Gesture Handler
// ============================================
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn((Component) => Component),
    Directions: {},
  };
});

// ============================================
// Mock React Navigation
// ============================================
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  useFocusEffect: jest.fn(),
}));

// ============================================
// Silence the warning: Animated: `useNativeDriver` is not supported
// ============================================
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// ============================================
// Mock React Native modules
// ============================================
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// ============================================
// Global test timeout
// ============================================
jest.setTimeout(10000);

// ============================================
// Console error/warning suppression for known issues
// ============================================
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('Not implemented: HTMLFormElement'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('componentWillReceiveProps') ||
      args[0].includes('componentWillMount'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// ============================================
// Clear all mocks after each test
// ============================================
afterEach(() => {
  jest.clearAllMocks();
  storage.clear();
});

