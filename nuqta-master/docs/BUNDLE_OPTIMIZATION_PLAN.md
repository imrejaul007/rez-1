# Bundle Optimization Plan

**Project:** Rez App Frontend
**Goal:** Reduce bundle size by 25-35% (12-18 MB)
**Timeline:** 2-4 weeks
**Status:** Ready for Implementation

---

## Quick Reference Card

| Phase | Focus | Duration | Savings | Risk |
|-------|-------|----------|---------|------|
| 1 | Quick Wins | 1-2 days | 5-7 MB | LOW ✅ |
| 2 | Import Optimization | 3-5 days | 2-3 MB | LOW ✅ |
| 3 | Dependency Replacement | 1-2 weeks | 3-5 MB | MEDIUM ⚠️ |
| 4 | Code Cleanup | 1 week | 1-2 MB | LOW ✅ |

**Total Expected Savings:** 11-17 MB (22-35% reduction)

---

## PHASE 1: Quick Wins (1-2 Days)

### Day 1: Dependency Cleanup

#### Task 1.1: Remove Unused Dependencies (30 minutes)
**Impact:** HIGH | **Effort:** LOW | **Savings:** ~1 MB

```bash
# Run these commands
npm uninstall inline-style-prefixer
npm uninstall css-in-js-utils
npm uninstall react-native-worklets
npm uninstall ajv
npm uninstall react-router-dom
```

**Verification:**
```bash
npm run lint
npm run test
npm start
```

**Checklist:**
- [ ] Remove from package.json
- [ ] Delete package-lock.json entries
- [ ] Run `npm install`
- [ ] Verify app starts without errors
- [ ] Test critical flows (auth, navigation, payments)

#### Task 1.2: Delete Backup Files (5 minutes)
**Impact:** LOW | **Effort:** LOW | **Savings:** 16 KB

```bash
# Delete these files
rm services/stockNotificationApi.ts.backup
rm app/StoreSection/Section3.backup.tsx
rm app/_layout.tsx.backup
```

**Checklist:**
- [ ] Confirm files are truly backups
- [ ] Delete files
- [ ] Commit changes

#### Task 1.3: Create Metro Configuration (30 minutes)
**Impact:** HIGH | **Effort:** LOW | **Savings:** ~1-2 MB

Create `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Enable better tree-shaking
  config.resolver = {
    ...config.resolver,
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json', 'wasm'],
    blockList: [
      // Exclude test files from bundle
      /.*\/__tests__\/.*/,
      /.*\.test\.(ts|tsx|js|jsx)$/,
      /.*\.spec\.(ts|tsx|js|jsx)$/,
    ],
  };

  // Optimize transformer for production
  config.transformer = {
    ...config.transformer,
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      ecma: 8, // ES2017
      compress: {
        drop_console: process.env.NODE_ENV === 'production', // Remove console in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        passes: 3,
        dead_code: true,
        unsafe: false,
        unsafe_comps: false,
        warnings: false,
      },
      mangle: {
        keep_fnames: false,
        keep_classnames: false,
      },
      output: {
        comments: false,
        ascii_only: true,
      },
    },
  };

  // Optimize caching
  config.cacheStores = [
    ...config.cacheStores,
  ];

  return config;
})();
```

**Checklist:**
- [ ] Create metro.config.js
- [ ] Test development build
- [ ] Test production build
- [ ] Verify console.logs are removed in production
- [ ] Confirm app functionality

#### Task 1.4: Update Package Scripts (15 minutes)
**Impact:** MEDIUM | **Effort:** LOW

Update `package.json` scripts:

```json
{
  "scripts": {
    "start": "expo start",
    "start:prod": "NODE_ENV=production expo start --no-dev --minify",
    "start:clear": "expo start --clear",
    "build:analyze": "npx expo export && npx react-native-bundle-visualizer",
    "build:web": "expo export:web",
    "analyze:web": "expo export:web --no-minify && npx webpack-bundle-analyzer .expo/web/bundle-stats.json",
    "deps:check": "node scripts/check-unused-deps.js",
    "imports:check": "node scripts/check-wildcard-imports.js"
  }
}
```

**Checklist:**
- [ ] Update scripts
- [ ] Test new scripts
- [ ] Document in README

**Day 1 Expected Savings:** 2-3 MB
**Day 1 Risk:** LOW

---

### Day 2: High-Impact Import Fixes

#### Task 2.1: Fix Expo Wildcard Imports (2-3 hours)
**Impact:** MEDIUM | **Effort:** MEDIUM | **Savings:** 500KB-1MB

**Files to Update (Priority Order):**

1. **app/bill-upload.tsx**
```typescript
// BEFORE
import * as ExpoCamera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

// AFTER
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import {
  launchImageLibraryAsync,
  launchCameraAsync,
  MediaTypeOptions,
  requestMediaLibraryPermissionsAsync
} from 'expo-image-picker';
```

2. **app/bill-upload-enhanced.tsx**
```typescript
// Same changes as bill-upload.tsx
```

3. **app/my-earnings.tsx**
```typescript
// BEFORE
import * as Sharing from 'expo-sharing';

// AFTER
import { shareAsync, isAvailableAsync } from 'expo-sharing';
```

4. **app/my-vouchers.tsx, app/referral.tsx, app/offers/[id].tsx**
```typescript
// BEFORE
import * as Clipboard from 'expo-clipboard';

// AFTER
import { setStringAsync, getStringAsync } from 'expo-clipboard';
```

5. **app/onboarding/otp-verification.tsx**
```typescript
// BEFORE
import * as Location from 'expo-location';

// AFTER
import {
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
  LocationObject
} from 'expo-location';
```

6. **app/profile/edit.tsx, app/profile/index.tsx, app/ugc/upload.tsx**
```typescript
// BEFORE
import * as ImagePicker from 'expo-image-picker';

// AFTER
import {
  launchImageLibraryAsync,
  MediaTypeOptions,
  requestMediaLibraryPermissionsAsync,
  ImagePickerResult
} from 'expo-image-picker';
```

7. **app/support/chat.tsx**
```typescript
// BEFORE
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

// AFTER
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import { getDocumentAsync, DocumentPickerResult } from 'expo-document-picker';
```

**Automation Script (scripts/fix-expo-imports.js):**

```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const EXPO_IMPORTS = {
  'expo-camera': {
    pattern: /import \* as ExpoCamera from 'expo-camera';?/g,
    replacement: "import { Camera, CameraView, useCameraPermissions } from 'expo-camera';",
    usage: ['ExpoCamera.Camera', 'ExpoCamera.CameraView', 'ExpoCamera.useCameraPermissions']
  },
  'expo-image-picker': {
    pattern: /import \* as ImagePicker from 'expo-image-picker';?/g,
    replacement: "import { launchImageLibraryAsync, launchCameraAsync, MediaTypeOptions, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';",
    usage: ['ImagePicker.launchImageLibraryAsync', 'ImagePicker.MediaTypeOptions']
  },
  'expo-clipboard': {
    pattern: /import \* as Clipboard from 'expo-clipboard';?/g,
    replacement: "import { setStringAsync, getStringAsync } from 'expo-clipboard';",
    usage: ['Clipboard.setStringAsync', 'Clipboard.getStringAsync']
  },
  // Add more patterns...
};

// Find and fix imports
glob('app/**/*.tsx', (err, files) => {
  if (err) throw err;

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    Object.entries(EXPO_IMPORTS).forEach(([pkg, config]) => {
      if (config.pattern.test(content)) {
        content = content.replace(config.pattern, config.replacement);

        // Update usage patterns
        config.usage.forEach(usage => {
          const [namespace, method] = usage.split('.');
          const usagePattern = new RegExp(`${namespace}\\.${method}`, 'g');
          content = content.replace(usagePattern, method);
        });

        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
    }
  });
});
```

**Checklist:**
- [ ] Review automation script
- [ ] Backup files before running
- [ ] Run script on test files first
- [ ] Verify imports manually
- [ ] Test affected screens
- [ ] Run full test suite
- [ ] Fix TypeScript errors

**Day 2 Expected Savings:** 3-4 MB
**Day 2 Risk:** LOW-MEDIUM

**Phase 1 Total Savings:** 5-7 MB
**Phase 1 Total Time:** 1-2 days

---

## PHASE 2: Import Optimization (3-5 Days)

### Task 2.1: Audit Lucide-React Usage (1 day)
**Impact:** HIGH | **Effort:** MEDIUM | **Savings:** 800KB-1MB

**Investigation Steps:**

1. **Check actual usage:**
```bash
grep -r "from 'lucide-react'" --include="*.tsx" --include="*.ts" . | wc -l
```
Result: 0 files found

2. **Verify if truly unused:**
```bash
npm ls lucide-react
```

3. **Action:**
   - If unused: `npm uninstall lucide-react`
   - If used: Optimize imports

**If Used - Optimization:**
```typescript
// BEFORE (imports entire library)
import { Home, User, Settings } from 'lucide-react';

// AFTER (tree-shakeable)
import Home from 'lucide-react/dist/esm/icons/home';
import User from 'lucide-react/dist/esm/icons/user';
import Settings from 'lucide-react/dist/esm/icons/settings';

// OR create icon mapping
// utils/icons.ts
export { default as HomeIcon } from 'lucide-react/dist/esm/icons/home';
export { default as UserIcon } from 'lucide-react/dist/esm/icons/user';
```

**Checklist:**
- [ ] Verify usage
- [ ] Remove if unused
- [ ] Optimize imports if used
- [ ] Create icon mapping utility
- [ ] Update all icon imports
- [ ] Test icon rendering

### Task 2.2: Optimize @expo/vector-icons (1 day)
**Impact:** MEDIUM | **Effort:** LOW | **Savings:** 200-300KB

**Current Usage:** 416 files using @expo/vector-icons

**Optimization Strategy:**

```typescript
// Create centralized icon registry
// utils/iconRegistry.ts

import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

type IconFamily = 'Ionicons' | 'MaterialIcons' | 'FontAwesome';

export const IconRegistry = {
  // Navigation
  home: { family: 'Ionicons' as IconFamily, name: 'home' },
  search: { family: 'Ionicons' as IconFamily, name: 'search' },
  profile: { family: 'Ionicons' as IconFamily, name: 'person' },

  // Actions
  add: { family: 'Ionicons' as IconFamily, name: 'add' },
  edit: { family: 'Ionicons' as IconFamily, name: 'pencil' },
  delete: { family: 'Ionicons' as IconFamily, name: 'trash' },

  // Status
  success: { family: 'Ionicons' as IconFamily, name: 'checkmark-circle' },
  error: { family: 'Ionicons' as IconFamily, name: 'alert-circle' },
  warning: { family: 'Ionicons' as IconFamily, name: 'warning' },
} as const;

// Reusable Icon component
export const Icon = ({
  name,
  size = 24,
  color = '#000'
}: {
  name: keyof typeof IconRegistry;
  size?: number;
  color?: string;
}) => {
  const icon = IconRegistry[name];
  const IconComponent = {
    Ionicons,
    MaterialIcons,
    FontAwesome,
  }[icon.family];

  return <IconComponent name={icon.name} size={size} color={color} />;
};
```

**Usage:**
```typescript
// BEFORE
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="home" size={24} color="black" />

// AFTER
import { Icon } from '@/utils/iconRegistry';
<Icon name="home" size={24} color="black" />
```

**Benefits:**
- Centralized icon management
- Better tree-shaking
- Easier icon updates
- Type safety

**Checklist:**
- [ ] Create icon registry
- [ ] Map all used icons
- [ ] Update high-traffic screens first
- [ ] Gradually migrate all files
- [ ] Remove unused icon families

### Task 2.3: Fix Remaining Wildcard Imports (1-2 days)
**Impact:** MEDIUM | **Effort:** MEDIUM | **Savings:** 300-500KB

**Files with wildcard imports:** 86 total

**Priority List:**
1. Service files (20 files) - HIGH
2. Context files (15 files) - HIGH
3. Component files (30 files) - MEDIUM
4. Hook files (21 files) - MEDIUM

**Template for fixing:**
```typescript
// BEFORE
import * as ServiceName from '@/services/serviceName';

// AFTER
import { functionA, functionB, TypeA } from '@/services/serviceName';

// OR create namespace if many functions
import { ServiceNamespace } from '@/services/serviceName';
```

**Checklist:**
- [ ] Fix service files
- [ ] Fix context files
- [ ] Fix component files
- [ ] Fix hook files
- [ ] Run type checking
- [ ] Test affected features

**Phase 2 Total Savings:** 2-3 MB
**Phase 2 Total Time:** 3-5 days

---

## PHASE 3: Dependency Replacement (1-2 Weeks)

### Task 3.1: Replace Axios with Fetch (3-5 days)
**Impact:** MEDIUM | **Effort:** MEDIUM | **Savings:** ~300KB

**Step 1: Create Fetch Wrapper (1 day)**

```typescript
// utils/fetchWrapper.ts

interface FetchConfig extends RequestInit {
  timeout?: number;
  retry?: number;
  retryDelay?: number;
}

class FetchWrapper {
  private baseURL: string;
  private defaultTimeout: number = 30000;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async fetchWithTimeout(
    url: string,
    options: FetchConfig = {}
  ): Promise<Response> {
    const { timeout = this.defaultTimeout, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    config: FetchConfig = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      ...config,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await this.fetchWithTimeout(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  get<T>(endpoint: string, config?: FetchConfig): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  post<T>(endpoint: string, data?: any, config?: FetchConfig): Promise<T> {
    return this.request<T>('POST', endpoint, data, config);
  }

  put<T>(endpoint: string, data?: any, config?: FetchConfig): Promise<T> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  delete<T>(endpoint: string, config?: FetchConfig): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }

  patch<T>(endpoint: string, data?: any, config?: FetchConfig): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, config);
  }
}

export const apiClient = new FetchWrapper(process.env.EXPO_PUBLIC_API_URL || '');
```

**Step 2: Update API Services (2-3 days)**

Update each service file:

```typescript
// BEFORE (services/storesApi.ts)
import axios from 'axios';

export const getStores = async () => {
  const response = await axios.get('/api/stores');
  return response.data;
};

// AFTER
import { apiClient } from '@/utils/fetchWrapper';

export const getStores = async () => {
  return apiClient.get('/api/stores');
};
```

**Migration Priority:**
1. Low-traffic services first (testing)
2. Medium-traffic services
3. High-traffic services last
4. Critical auth services (careful testing)

**Step 3: Remove Axios (1 day)**

After all services migrated:
```bash
npm uninstall axios
npm install # Update lock file
```

**Checklist:**
- [ ] Create fetch wrapper
- [ ] Test wrapper thoroughly
- [ ] Migrate low-traffic services
- [ ] Test each service
- [ ] Migrate medium-traffic services
- [ ] Migrate high-traffic services
- [ ] Remove axios dependency
- [ ] Full regression testing

### Task 3.2: Remove react-hot-toast (1 day)
**Impact:** LOW | **Effort:** LOW | **Savings:** ~75KB

**Files using react-hot-toast:**
- `app/subscription/plans.tsx`
- `app/subscription/payment-success.tsx`

**Replacement Strategy:**

```typescript
// BEFORE
import toast from 'react-hot-toast';
toast.success('Payment successful!');

// AFTER
import { Toast } from '@/components/common/Toast';
Toast.show({ message: 'Payment successful!', type: 'success' });

// OR use existing ToastManager
import { ToastManager } from '@/components/common/ToastManager';
ToastManager.success('Payment successful!');
```

**Steps:**
1. Review existing Toast components
2. Update 2 files
3. Test toast notifications
4. Remove react-hot-toast

**Checklist:**
- [ ] Review existing toast components
- [ ] Update subscription pages
- [ ] Test all toast scenarios
- [ ] Remove react-hot-toast
- [ ] Verify no errors

### Task 3.3: Evaluate Pako Compression (2 days)
**Impact:** LOW | **Effort:** MEDIUM | **Savings:** ~115KB

**Current Usage:** `services/cacheService.ts` only

**Options:**

**Option A: Keep Pako (Recommended)**
- Compression provides value for caching
- 115KB is reasonable for functionality
- No action needed

**Option B: Remove Compression**
- Simplify cache service
- Accept larger cache size
- Test cache performance

**Option C: Use Native Compression**
- Use browser CompressionStreams (web)
- Limited React Native support
- Not recommended

**Recommendation:** Keep pako unless cache performance issues found

**Checklist:**
- [ ] Analyze cache compression ratio
- [ ] Measure cache performance
- [ ] Decision: Keep or Remove
- [ ] If removing, update cacheService
- [ ] Test cache functionality

### Task 3.4: Review Expo Modules (2-3 days)
**Impact:** MEDIUM | **Effort:** MEDIUM | **Savings:** ~680KB

**Modules to verify:**

1. **expo-blur** (~200KB)
```bash
grep -r "expo-blur" --include="*.tsx" --include="*.ts" .
```
- If unused: Remove
- If used: Keep

2. **expo-brightness** (~80KB)
```bash
grep -r "expo-brightness" --include="*.tsx" --include="*.ts" .
```
- If unused: Remove
- If used: Keep

3. **expo-print** (~150KB)
```bash
grep -r "expo-print" --include="*.tsx" --include="*.ts" .
```
- If unused: Remove
- If used: Keep

4. **expo-media-library** (~250KB)
```bash
grep -r "expo-media-library" --include="*.tsx" --include="*.ts" .
```
- If unused: Remove
- If used: Keep

**Steps:**
1. Search for each module usage
2. Verify in app functionality
3. Remove if truly unused
4. Test thoroughly

**Checklist:**
- [ ] Check expo-blur usage
- [ ] Check expo-brightness usage
- [ ] Check expo-print usage
- [ ] Check expo-media-library usage
- [ ] Remove unused modules
- [ ] Update app.json/app.config.js
- [ ] Test on device

**Phase 3 Total Savings:** 3-5 MB
**Phase 3 Total Time:** 1-2 weeks
**Phase 3 Risk:** MEDIUM

---

## PHASE 4: Code Cleanup (1 Week)

### Task 4.1: Consolidate Duplicate Utilities (2-3 days)
**Impact:** LOW | **Effort:** MEDIUM | **Savings:** 100-200KB

**Duplicate Patterns Found:**

1. **Date Formatting**
```typescript
// Create utils/dateUtils.ts
export const formatDate = (date: Date, format: string) => { ... };
export const getRelativeTime = (date: Date) => { ... };
export const isToday = (date: Date) => { ... };
```

2. **Validation Functions**
```typescript
// Create utils/validators.ts
export const validateEmail = (email: string) => { ... };
export const validatePhone = (phone: string) => { ... };
export const validateUrl = (url: string) => { ... };
```

3. **API Error Handlers**
```typescript
// Create utils/apiErrorHandler.ts
export const handleApiError = (error: any) => { ... };
export const getErrorMessage = (error: any) => { ... };
```

**Checklist:**
- [ ] Identify all duplicate functions
- [ ] Create consolidated utilities
- [ ] Update imports across codebase
- [ ] Remove duplicate implementations
- [ ] Test affected features

### Task 4.2: Address TODO/FIXME Markers (2 days)
**Impact:** LOW | **Effort:** LOW | **Savings:** Code quality

**Files with most TODOs:**
1. `app/UGCDetailScreen.tsx` - 8 TODOs
2. `app/StoreSection/ProductInfo.tsx` - 3 TODOs
3. `app/product/[id].tsx` - 3 TODOs
4. `app/account/delivery.tsx` - 3 TODOs

**Actions:**
- Review each TODO
- Complete implementation or remove
- Document deferred items
- Clean up commented code

**Checklist:**
- [ ] Review all 29 TODOs
- [ ] Complete or remove each
- [ ] Update documentation
- [ ] Remove commented code

### Task 4.3: Optimize Heavy Components (2-3 days)
**Impact:** MEDIUM | **Effort:** MEDIUM | **Savings:** Load time

**Target Components:**
- `app/UGCDetailScreen.tsx` - 52 console.logs
- `app/product/[id].tsx` - 25 imports
- `app/(tabs)/index.tsx` - 9 imports
- Heavy context providers

**Optimization Strategies:**

1. **Code Splitting:**
```typescript
// BEFORE
import { HeavyComponent } from './HeavyComponent';

// AFTER
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

2. **Memo-ization:**
```typescript
export const Component = React.memo(({ data }) => {
  // Component logic
});
```

3. **Context Splitting:**
```typescript
// Split large contexts into smaller ones
// Instead of one AuthContext with everything
// Create: AuthStateContext, AuthActionsContext
```

**Checklist:**
- [ ] Identify heavy components
- [ ] Add React.lazy where appropriate
- [ ] Add React.memo to pure components
- [ ] Split large contexts
- [ ] Measure performance improvements

**Phase 4 Total Savings:** 1-2 MB + Performance
**Phase 4 Total Time:** 1 week
**Phase 4 Risk:** LOW

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review entire plan with team
- [ ] Set up bundle analysis tools
- [ ] Create feature branch: `feat/bundle-optimization`
- [ ] Backup current codebase
- [ ] Document current bundle size
- [ ] Set up monitoring

### Phase 1 (Days 1-2)
- [ ] Day 1: Dependency cleanup
- [ ] Day 1: Delete backup files
- [ ] Day 1: Create metro.config.js
- [ ] Day 1: Update package scripts
- [ ] Day 2: Fix expo wildcard imports
- [ ] Verify savings: 5-7 MB

### Phase 2 (Days 3-7)
- [ ] Audit lucide-react
- [ ] Optimize @expo/vector-icons
- [ ] Fix remaining wildcard imports
- [ ] Verify savings: 2-3 MB

### Phase 3 (Days 8-19)
- [ ] Replace axios with fetch
- [ ] Remove react-hot-toast
- [ ] Evaluate pako
- [ ] Review expo modules
- [ ] Verify savings: 3-5 MB

### Phase 4 (Days 20-25)
- [ ] Consolidate utilities
- [ ] Address TODOs
- [ ] Optimize heavy components
- [ ] Verify savings: 1-2 MB

### Post-Implementation
- [ ] Measure final bundle size
- [ ] Compare before/after
- [ ] Update documentation
- [ ] Create monitoring dashboard
- [ ] Set up alerts for bundle size increases
- [ ] Merge to main branch

---

## Testing Strategy

### Automated Tests
```bash
# Before each phase
npm run test
npm run lint
npm run type-check

# After each phase
npm run test:coverage
npm run test:integration
```

### Manual Testing Checklist

**Critical Paths:**
- [ ] User authentication
- [ ] Navigation flows
- [ ] Payment processing
- [ ] Image upload
- [ ] Real-time features
- [ ] Offline functionality

**Platform Testing:**
- [ ] iOS (physical device)
- [ ] Android (physical device)
- [ ] Web (Chrome, Safari, Firefox)

**Performance Testing:**
- [ ] Initial load time
- [ ] Time to interactive
- [ ] Memory usage
- [ ] Bundle size analysis

---

## Rollback Plan

### If Issues Arise

**Phase 1 Rollback:**
```bash
git checkout main
npm install
```

**Phase 2 Rollback:**
```bash
# Revert import changes
git checkout main -- app/**/*.tsx
npm install
```

**Phase 3 Rollback:**
```bash
# Restore axios
npm install axios@^1.11.0
git checkout main -- services/
```

**Phase 4 Rollback:**
```bash
# No critical changes, safe to revert
git checkout main
```

---

## Success Metrics

### Target Metrics
| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Bundle Size | 50-64 MB | 35-45 MB | _____ MB |
| Code Size | 25-30 MB | 20-24 MB | _____ MB |
| Dependencies | 20-25 MB | 17-20 MB | _____ MB |
| Initial Load | 5-7s | 3-4s | _____ s |
| TTI | 8-10s | 5-6s | _____ s |
| Memory Usage | 250-300 MB | 180-220 MB | _____ MB |

### Quality Metrics
- [ ] No new TypeScript errors
- [ ] All tests passing
- [ ] No regression in functionality
- [ ] Improved performance metrics
- [ ] Reduced console warnings

---

## Monitoring & Maintenance

### Weekly Monitoring
```bash
# Run bundle analysis
npm run build:analyze

# Check for new unused dependencies
npm run deps:check

# Check for wildcard imports
npm run imports:check
```

### Monthly Reviews
- Review dependency updates
- Check for new optimizations
- Update optimization plan
- Review bundle size trends

### Tools Setup

**1. Dependency Cruiser**
```bash
npm install -D dependency-cruiser
npx depcruise --init
```

**2. Bundle Analyzer**
```bash
npm install -D react-native-bundle-visualizer
```

**3. Size Limit**
```bash
npm install -D size-limit @size-limit/preset-big-lib
```

Add to `package.json`:
```json
{
  "size-limit": [
    {
      "path": "dist/index.js",
      "limit": "40 MB"
    }
  ]
}
```

---

## Resources

### Scripts Created
1. `scripts/check-unused-deps.js` - Find unused dependencies
2. `scripts/fix-expo-imports.js` - Automate import fixes
3. `scripts/check-wildcard-imports.js` - Find wildcard imports

### Documentation
1. `BUNDLE_AUDIT_REPORT.md` - Detailed analysis
2. `BUNDLE_OPTIMIZATION_PLAN.md` - This file
3. `IMPORT_OPTIMIZATION_CHECKLIST.md` - Import guide

### External Resources
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Expo Bundle Optimization](https://docs.expo.dev/guides/customizing-metro/)
- [Metro Bundler Docs](https://facebook.github.io/metro/)

---

## Questions & Support

### Common Issues

**Q: App crashes after removing dependency**
**A:** Check if dependency is actually unused, restore if needed

**Q: TypeScript errors after import changes**
**A:** Update type imports, ensure all types are imported

**Q: Bundle size didn't decrease as expected**
**A:** Run production build, check tree-shaking configuration

**Q: Tests failing after changes**
**A:** Update test imports, mock new dependencies

---

**Plan Prepared By:** Bundle Optimization Team
**Date:** 2025-11-11
**Version:** 1.0
**Next Review:** After each phase completion
