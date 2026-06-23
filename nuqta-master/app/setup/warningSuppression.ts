/**
 * Warning suppression for known harmless third-party warnings.
 * Import this file for side effects only — it patches console/LogBox on load.
 */
import { LogBox, Platform } from 'react-native';

// Suppress console output in production builds
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  // Keep console.error for crash reporting
}

// Hide React DevTools overlay on web (CSS-only, no expensive DOM scanning)
if (__DEV__ && Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.id = 'hide-inspector-overlay';
  style.textContent = `
    [data-react-devtools-overlay], [data-react-devtools-highlight],
    .react-devtools-overlay, .__react-devtools-overlay__,
    [data-inspector], [data-layout-inspector] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    input, textarea, [contenteditable] { user-select: text !important; }
  `;
  const existing = document.getElementById('hide-inspector-overlay');
  if (existing) existing.remove();
  document.head.appendChild(style);
}

const SUPPRESSED_WARNINGS = [
  'Require cycle: node_modules/react-native-gesture-handler',
  'Require cycle: node_modules/react-native-reanimated',
  'Require cycle:',
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'AsyncStorage has been extracted',
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
  'Each child in a list should have a unique "key" prop',
  'componentWillReceiveProps has been renamed',
  'componentWillMount has been renamed',
  'props.pointerEvents is deprecated',
  '"shadow*" style props are deprecated',
  '"textShadow*" style props are deprecated',
  'shadow* style props are deprecated',
  'textShadow* style props are deprecated',
  '`useNativeDriver` is not supported',
  'Cannot record touch end without a touch start',
  "Property 'document' doesn't exist",
  'Excessive number of pending callbacks',
];

// Suppress known harmless warnings from third-party libraries (native)
LogBox.ignoreLogs(SUPPRESSED_WARNINGS);

// Suppress warnings on web by patching console.warn
if (Platform.OS === 'web') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    const shouldSuppress = SUPPRESSED_WARNINGS.some(warning => message.includes(warning));
    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };
}
