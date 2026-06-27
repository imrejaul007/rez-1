# Bundle Size Optimization Report

## Project: Nuqta (Expo React Native App)

**Analysis Date:** 2026-06-25  
**Working Directory:** `C:\Users\user\Downloads\rez-backend-master\nuqta-master`

---

## 1. Large Dependencies Analysis

### 1.1 Dependencies That CAN Be Replaced

| Current Package | Size (approx) | Replacement | Savings |
|----------------|---------------|-------------|---------|
| **react-native-markdown-display** | ~300KB | `@吹/markdown` or custom parser | ~280KB |
| **axios** (in scripts only) | ~1.2MB | Native fetch | Dev-only impact |
| **socket.io-client** | ~200KB | Native WebSocket | ~150KB |

**Recommendation:** `react-native-markdown-display` is only used in 1 file (`app/article/[id].tsx`). Consider replacing with a lighter alternative.

### 1.2 Heavy Expo Packages (Required but Monitor)

| Package | Purpose | Notes |
|---------|---------|-------|
| `expo-router` | Navigation | Core dependency, ~500KB |
| `react-native-screens` | Navigation screens | Required by expo-router |
| `react-native-maps` | Maps integration | ~1MB, only used on specific screens |
| `@stripe/react-stripe-js` + `@stripe/stripe-js` | Payments | ~400KB combined |

---

## 2. Unused Dependencies Check

### 2.1 Dependencies NOT Used in Code

| Package | Status | Action |
|---------|--------|--------|
| `@react-native-firebase/analytics` | **NOT IMPORTED** | Can be removed if not used |
| `@react-native-firebase/app` | **NOT IMPORTED** | Can be removed if not used |
| `@testing-library/react-hooks` | Dev dependency | Deprecated, use `@testing-library/react` |
| `@types/jest` | Dev dependency | Check if jest config uses it |
| `react-native-markdown-display` | Used in 1 file only | Consider replacing |

### 2.2 Detected Usage in Codebase

```
axios: Used in scripts/verify-production-readiness.ts (dev script only)
socket.io-client: Used in scripts/test-leaderboard-realtime.ts (dev script only)
@stripe/*: Used in 29 files (payment flows)
@sentry/*: Used in 3 files (monitoring)
```

---

## 3. Lazy Loading Opportunities

### 3.1 Routes That CAN Be Lazy Loaded

**High Priority (Heavy screens):**

```typescript
// app/b/gamification/loyalty-hub.tsx - Contains gamification logic
// app/b/map/index.tsx - Maps integration (~1MB)
// app/b/ai-assistant.tsx - AI chat interface
// app/prive/* - Prive/membership screens
// app/subscription/* - Subscription flows
```

**Implementation Pattern:**
```typescript
// Current (eager loaded):
import AIAssistantPage from '@/app/b/ai-assistant';

// Recommended (lazy loaded with expo-router):
const AIAssistantPage = lazy(() => import('@/app/b/ai-assistant'));
```

### 3.2 Components Already Lazy Loaded

| File | Status |
|------|--------|
| `utils/lazyImports.ts` | Well implemented - lazy loads ImagePicker, Camera, Stripe |

### 3.3 Heavy Components to Consider for Dynamic Imports

1. **`react-native-maps`** - Only needed on:
   - `app/b/map/index.tsx`
   - `app/b/near-u/*` screens

2. **Stripe Payment Components** - Already using lazy pattern in `utils/lazyImports.ts`

---

## 4. Duplicate Dependencies

### 4.1 Check Results

No significant duplicate package versions detected in the `overrides` section:

```json
"overrides": {
  "markdown-it": {
    "entities": "~2.0.0"
  }
}
```

### 4.2 Expo SDK Version Consistency

All Expo packages use SDK 51 (`expo ~51.0.0`), which is good for consistency.

---

## 5. Bundle Size Reduction Recommendations

### 5.1 High Impact (Start Here)

1. **Remove unused firebase packages**
   ```bash
   npm uninstall @react-native-firebase/analytics @react-native-firebase/app
   ```
   **Estimated savings:** ~500KB

2. **Replace react-native-markdown-display**
   ```bash
   npm uninstall react-native-markdown-display
   npm install @tokenstream/native-markdown  # lighter alternative
   ```
   **Estimated savings:** ~280KB

### 5.2 Medium Impact

3. **Lazy load map screens**
   - Create wrapper components for map-dependent routes
   - Only load `react-native-maps` when user navigates to map screens
   **Estimated savings:** ~500KB on initial load

4. **Feature-flag gated routes**
   - The AI assistant already uses `FeatureFlagGate`
   - Apply same pattern to other heavy features (gamification, travel)

### 5.3 Lower Impact

5. **Use Native fetch instead of axios in scripts**
   - Scripts are not bundled, so this is cosmetic

---

## 6. Current Bundle Configuration

### 6.1 Metro Config Observations

The `package.json` shows awareness of memory constraints:
```json
"NODE_OPTIONS": "--max-old-space-size=10240"
```

This suggests the bundle is already large enough to require special handling.

### 6.2 Node Modules Size

**Current:** 734MB total `node_modules`

---

## 7. Action Plan

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Remove unused firebase packages | Low | High |
| 2 | Replace react-native-markdown-display | Medium | Medium |
| 3 | Add lazy loading to /b/map routes | Medium | Medium |
| 4 | Add lazy loading to /prive routes | Medium | Low |
| 5 | Audit all 40+ Expo packages for necessity | High | Medium |

---

## 8. Verification Commands

```bash
# Check bundle size
npx expo export --platform ios --output-dir dist

# Check for unused dependencies
npx depcheck

# Analyze bundle
npx expo customize metro.config.js  # Add bundle analyzer
```

---

## Summary

- **Total dependencies:** 67 packages
- **Likely unused:** 2 packages (firebase analytics/app)
- **Replaceable:** 1 package (markdown display)
- **Lazy load candidates:** 6+ route groups
- **Estimated savings:** 500-800KB if all recommendations implemented
