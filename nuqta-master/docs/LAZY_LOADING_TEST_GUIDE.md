# Lazy Loading Testing Guide

## Quick Test Checklist

Run through these tests to verify lazy loading is working correctly.

---

## 1. Visual Verification (5 minutes)

### Test 1: Page Load
```
1. Open homepage
2. Watch initial load
3. ✅ Header, search, quick actions appear instantly
4. ✅ No errors in console
5. ✅ Page is interactive immediately
```

### Test 2: Scroll Behavior
```
1. Scroll down slowly
2. ✅ Brief spinner appears for VoucherNavButton
3. ✅ NavigationShortcuts loads smoothly
4. ✅ FeatureHighlights appears below
5. ✅ No layout shift or jank
```

### Test 3: Profile Modal
```
1. Click profile avatar in header
2. ✅ Modal opens instantly
3. ✅ Content appears without delay
4. ✅ All menu items clickable
```

### Test 4: Quick Access FAB
```
1. Wait 2-3 seconds after page load
2. ✅ FAB appears in bottom-right corner
3. ✅ Clickable and functional
```

---

## 2. Network Throttling Test (10 minutes)

### Chrome DevTools Method
```bash
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Throttling dropdown → Fast 3G
4. Hard refresh (Ctrl+Shift+R)
5. Observe loading behavior
```

### Expected Results:
```
✅ Initial content loads in ~1-2s
✅ Lazy components show brief spinners (200-400ms)
✅ All components eventually load
✅ No errors or timeouts
✅ Page remains interactive during loading
```

---

## 3. Bundle Size Verification (5 minutes)

### Build and Check Size
```bash
cd frontend
npm run build

# Check main bundle
du -h build/static/js/main.*.js

# Or on Windows
dir build\static\js\main.*.js
```

### Expected Results:
```
✅ Main bundle < 550 KB
✅ Multiple chunk files exist (code splitting working)
✅ Chunk files for lazy components (~5-20 KB each)
```

### Verify Code Splitting
```bash
# List all chunks
ls -lh build/static/js/*.chunk.js

# Or on Windows
dir build\static\js\*.chunk.js
```

---

## 4. React DevTools Profiler (10 minutes)

### Setup
```
1. Install React DevTools extension
2. Open DevTools
3. Go to "Profiler" tab
4. Click record button
5. Interact with page
6. Stop recording
```

### Check for Lazy Components
```
1. Look for "Suspense" boundaries in tree
2. Click on Suspense nodes
3. ✅ Should show fallback components
4. ✅ Check load times (<300ms)
5. ✅ Verify components render correctly
```

---

## 5. Console Debugging (2 minutes)

### Add Temporary Logging
```javascript
// In app/(tabs)/index.tsx (temporary)
React.useEffect(() => {
  console.log('🏠 Homepage mounted');

  const lazyComponents = [
    'ProfileMenuModal',
    'VoucherNavButton',
    'NavigationShortcuts',
    'QuickAccessFAB',
    'FeatureHighlights'
  ];

  lazyComponents.forEach(name => {
    console.log(`⏳ Lazy component registered: ${name}`);
  });
}, []);
```

### Expected Console Output:
```
🏠 Homepage mounted
⏳ Lazy component registered: ProfileMenuModal
⏳ Lazy component registered: VoucherNavButton
⏳ Lazy component registered: NavigationShortcuts
⏳ Lazy component registered: QuickAccessFAB
⏳ Lazy component registered: FeatureHighlights
```

---

## 6. Error Boundary Test (5 minutes)

### Simulate Component Failure
```typescript
// Temporarily break a lazy component
const VoucherNavButton = React.lazy(() =>
  import('@/components/voucher/WRONG_PATH')
);
```

### Expected Results:
```
✅ Page doesn't crash completely
✅ Suspense fallback appears
✅ Error logged to console
✅ Other components still work
```

**Remember to revert after testing!**

---

## 7. Mobile Device Testing (10 minutes)

### iOS Safari
```
1. Open in iOS Safari
2. Test on iPhone SE (smallest viewport)
3. ✅ Initial load is fast
4. ✅ Scroll works smoothly
5. ✅ Lazy components appear correctly
6. ✅ No white screens or crashes
```

### Android Chrome
```
1. Open in Android Chrome
2. Test on various devices
3. ✅ Initial load is fast
4. ✅ Scroll works smoothly
5. ✅ Lazy components appear correctly
6. ✅ No ANRs (App Not Responding)
```

---

## 8. Performance Metrics (15 minutes)

### Lighthouse Audit
```bash
# For web version
npm run build:web
npx lighthouse http://localhost:8081 --view

# Check these metrics:
✅ Performance Score: >80
✅ Time to Interactive: <3s
✅ First Contentful Paint: <2s
✅ Total Bundle Size: Noted reduction
```

### React Native Performance
```javascript
// Add performance markers
const startTime = performance.now();

React.useEffect(() => {
  const loadTime = performance.now() - startTime;
  console.log(`⏱️ Homepage load time: ${loadTime}ms`);
}, []);
```

---

## 9. Regression Testing (10 minutes)

### Functionality Checklist
```
User Action                      Expected Result
─────────────────────────────────────────────────────────────
Load homepage                  → ✅ Instant header/search
Scroll down                    → ✅ Lazy components appear
Click profile avatar           → ✅ Modal opens instantly
Click voucher button           → ✅ Navigates correctly
Use navigation shortcuts       → ✅ All links work
View feature highlights        → ✅ Content displays
Click FAB                      → ✅ Quick actions appear
Refresh page                   → ✅ Everything reloads correctly
Navigate away and back         → ✅ Components cached properly
```

---

## 10. Automated Testing (Optional)

### Jest Test Template
```typescript
// __tests__/lazy-loading.test.tsx
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '@/app/(tabs)/index';

describe('Lazy Loading', () => {
  it('renders critical components immediately', () => {
    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('header')).toBeTruthy();
    expect(getByTestId('search-bar')).toBeTruthy();
  });

  it('loads VoucherNavButton lazily', async () => {
    const { findByTestId } = render(<HomeScreen />);
    const component = await findByTestId('voucher-nav-button');
    expect(component).toBeTruthy();
  });

  // Add more tests for other lazy components
});
```

---

## Common Issues & Solutions

### Issue 1: Components Not Loading
```
Problem: Lazy component never appears
Solution:
  1. Check console for errors
  2. Verify import path is correct
  3. Ensure component has default export
  4. Check Suspense boundary is present
```

### Issue 2: Fallback Not Showing
```
Problem: No spinner visible during load
Solution:
  1. Check fallback component renders
  2. Verify Suspense boundary wraps component
  3. Test on slow connection (throttling)
  4. Ensure fallback has visible styling
```

### Issue 3: Layout Shift
```
Problem: Page jumps when lazy component loads
Solution:
  1. Add placeholder height to fallback
  2. Use skeleton loader instead of spinner
  3. Preload component on hover/interaction
  4. Reserve space with min-height
```

### Issue 4: Modal Not Opening
```
Problem: ProfileMenuModal doesn't open
Solution:
  1. Check Suspense fallback is null (not blocking)
  2. Verify conditional rendering logic
  3. Ensure modal state management works
  4. Test without Suspense to isolate issue
```

---

## Performance Benchmarks

### Target Metrics
```
Metric                      Target    Acceptable    Poor
─────────────────────────────────────────────────────────
Initial Bundle Size       <450 KB      <550 KB    >600 KB
Time to Interactive         <2.5s        <3.5s      >4.0s
First Contentful Paint      <1.5s        <2.0s      >2.5s
Lazy Component Load         <150ms       <300ms     >500ms
```

### Measure in Production
```javascript
// Add to analytics
analytics.track('lazy_load_performance', {
  component: 'VoucherNavButton',
  loadTime: 120, // ms
  networkSpeed: '4G',
  deviceType: 'mobile'
});
```

---

## Sign-Off Checklist

Before marking as complete:

- [ ] All 5 lazy components load correctly
- [ ] No console errors or warnings
- [ ] Bundle size reduced by 8-10%
- [ ] TTI improved by 15-20%
- [ ] Mobile testing passed (iOS + Android)
- [ ] Network throttling test passed
- [ ] Profile modal opens instantly
- [ ] No layout shift or jank
- [ ] All functionality preserved
- [ ] Documentation complete

---

## Quick Test Script

Run this in browser console:

```javascript
// Paste in DevTools console
console.log('🧪 Testing Lazy Loading...');

const tests = {
  suspense: document.querySelectorAll('Suspense').length > 0,
  initialLoad: performance.now() < 3000,
  errors: console.errors || 0
};

console.table(tests);
console.log(tests.suspense && tests.initialLoad && tests.errors === 0
  ? '✅ All tests passed!'
  : '❌ Some tests failed');
```

---

## Reporting Results

After testing, document:

```markdown
## Test Results

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** [iOS/Android/Web]

### Results
- Initial Bundle: XXX KB
- TTI: X.Xs
- All lazy components working: ✅/❌
- Issues found: [List any issues]

### Conclusion
Ready for production: ✅/❌
```

---

## Next Steps After Testing

1. ✅ If all tests pass → Deploy to production
2. ⚠️ If minor issues → Fix and re-test
3. ❌ If major issues → Investigate and rollback if needed

---

*Testing guide for Agent 3 Lazy Loading implementation*
*See AGENT_3_LAZY_LOADING_DELIVERY_REPORT.md for full details*
