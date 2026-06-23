# Import Optimization Checklist

**Purpose:** Guide for optimizing import statements to reduce bundle size
**Target:** Fix 86+ wildcard imports and optimize tree-shaking
**Expected Savings:** 1.5-2.5 MB

---

## Quick Reference

### Import Optimization Patterns

```typescript
// ❌ BAD: Imports entire namespace
import * as Module from 'module';

// ✅ GOOD: Named imports (tree-shakeable)
import { specificFunction, SpecificType } from 'module';

// ❌ BAD: Default import of entire library
import _ from 'lodash';

// ✅ GOOD: Specific function imports
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

// ❌ BAD: Importing entire icon set
import { Icons } from 'all-icons';

// ✅ GOOD: Platform-specific or lazy loading
import HomeIcon from 'all-icons/home';
```

---

## Section 1: Expo Module Imports

### 1.1 Camera (expo-camera)

**Files Affected:** 2 files
- `app/bill-upload.tsx`
- `app/bill-upload-enhanced.tsx`

**Current Pattern:**
```typescript
import * as ExpoCamera from 'expo-camera';

// Usage
const [permission] = ExpoCamera.useCameraPermissions();
<ExpoCamera.Camera />
```

**Optimized Pattern:**
```typescript
import { Camera, CameraView, useCameraPermissions, CameraType } from 'expo-camera';

// Usage
const [permission] = useCameraPermissions();
<Camera />
```

**Checklist:**
- [ ] Update imports in bill-upload.tsx
- [ ] Update imports in bill-upload-enhanced.tsx
- [ ] Update all ExpoCamera.* references
- [ ] Test camera functionality
- [ ] Test permission requests
- [ ] Verify on iOS and Android

---

### 1.2 Image Picker (expo-image-picker)

**Files Affected:** 6+ files
- `app/bill-upload.tsx`
- `app/bill-upload-enhanced.tsx`
- `app/profile/edit.tsx`
- `app/profile/index.tsx`
- `app/support/chat.tsx`
- `app/ugc/upload.tsx`

**Current Pattern:**
```typescript
import * as ImagePicker from 'expo-image-picker';

// Usage
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
});
```

**Optimized Pattern:**
```typescript
import {
  launchImageLibraryAsync,
  launchCameraAsync,
  MediaTypeOptions,
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
  ImagePickerResult,
  ImagePickerAsset
} from 'expo-image-picker';

// Usage
const result = await launchImageLibraryAsync({
  mediaTypes: MediaTypeOptions.Images,
});
```

**Checklist:**
- [ ] Update imports in all 6 files
- [ ] Replace ImagePicker.* references
- [ ] Test image selection
- [ ] Test camera capture
- [ ] Test permission requests
- [ ] Verify image quality

---

### 1.3 Clipboard (expo-clipboard)

**Files Affected:** 4 files
- `app/my-vouchers.tsx`
- `app/referral.tsx`
- `app/offers/[id].tsx`
- `app/profile/qr-code.tsx`

**Current Pattern:**
```typescript
import * as Clipboard from 'expo-clipboard';

// Usage
await Clipboard.setStringAsync(text);
const content = await Clipboard.getStringAsync();
```

**Optimized Pattern:**
```typescript
import { setStringAsync, getStringAsync } from 'expo-clipboard';

// Usage
await setStringAsync(text);
const content = await getStringAsync();
```

**Checklist:**
- [ ] Update imports in my-vouchers.tsx
- [ ] Update imports in referral.tsx
- [ ] Update imports in offers/[id].tsx
- [ ] Update imports in profile/qr-code.tsx
- [ ] Test copy functionality
- [ ] Test paste functionality

---

### 1.4 Location (expo-location)

**Files Affected:** 1 file
- `app/onboarding/otp-verification.tsx`

**Current Pattern:**
```typescript
import * as Location from 'expo-location';

// Usage
const { status } = await Location.requestForegroundPermissionsAsync();
const location = await Location.getCurrentPositionAsync();
```

**Optimized Pattern:**
```typescript
import {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  LocationObject,
  LocationAccuracy
} from 'expo-location';

// Usage
const { status } = await requestForegroundPermissionsAsync();
const location = await getCurrentPositionAsync();
```

**Checklist:**
- [ ] Update imports in otp-verification.tsx
- [ ] Replace Location.* references
- [ ] Test location permission
- [ ] Test location fetching
- [ ] Verify accuracy settings

---

### 1.5 Sharing (expo-sharing)

**Files Affected:** 1 file
- `app/my-earnings.tsx`

**Current Pattern:**
```typescript
import * as Sharing from 'expo-sharing';

// Usage
const available = await Sharing.isAvailableAsync();
await Sharing.shareAsync(uri);
```

**Optimized Pattern:**
```typescript
import { shareAsync, isAvailableAsync } from 'expo-sharing';

// Usage
const available = await isAvailableAsync();
await shareAsync(uri);
```

**Checklist:**
- [ ] Update imports in my-earnings.tsx
- [ ] Replace Sharing.* references
- [ ] Test share functionality
- [ ] Verify platform availability

---

### 1.6 Document Picker (expo-document-picker)

**Files Affected:** 1 file
- `app/support/chat.tsx`

**Current Pattern:**
```typescript
import * as DocumentPicker from 'expo-document-picker';

// Usage
const result = await DocumentPicker.getDocumentAsync();
```

**Optimized Pattern:**
```typescript
import { getDocumentAsync, DocumentPickerResult } from 'expo-document-picker';

// Usage
const result = await getDocumentAsync();
```

**Checklist:**
- [ ] Update imports in support/chat.tsx
- [ ] Replace DocumentPicker.* references
- [ ] Test document selection
- [ ] Verify file types

---

## Section 2: Service/API Imports

### 2.1 Social Media API

**Files Affected:** 1 file
- `app/social-media.tsx`

**Current Pattern:**
```typescript
import * as socialMediaApi from '@/services/socialMediaApi';

// Usage
const posts = await socialMediaApi.getInstagramPosts();
```

**Optimized Pattern:**
```typescript
import {
  getInstagramPosts,
  verifyAccount,
  connectAccount,
  disconnectAccount
} from '@/services/socialMediaApi';

// Usage
const posts = await getInstagramPosts();
```

**Checklist:**
- [ ] Update imports in social-media.tsx
- [ ] Replace socialMediaApi.* references
- [ ] Test all social media functions
- [ ] Verify API calls

---

## Section 3: Icon Optimization

### 3.1 @expo/vector-icons

**Files Affected:** 416 files (extensive use)

**Current Pattern (Good - No Change Needed):**
```typescript
import { Ionicons } from '@expo/vector-icons';

<Ionicons name="home" size={24} color="black" />
```

**Recommended Enhancement (Optional):**

Create `utils/iconRegistry.ts`:

```typescript
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

type IconFamily = 'Ionicons' | 'MaterialIcons' | 'FontAwesome';

interface IconDefinition {
  family: IconFamily;
  name: string;
}

export const IconRegistry = {
  // Navigation
  home: { family: 'Ionicons' as IconFamily, name: 'home' },
  search: { family: 'Ionicons' as IconFamily, name: 'search' },
  profile: { family: 'Ionicons' as IconFamily, name: 'person' },
  cart: { family: 'Ionicons' as IconFamily, name: 'cart' },
  menu: { family: 'Ionicons' as IconFamily, name: 'menu' },

  // Actions
  add: { family: 'Ionicons' as IconFamily, name: 'add' },
  edit: { family: 'Ionicons' as IconFamily, name: 'pencil' },
  delete: { family: 'Ionicons' as IconFamily, name: 'trash' },
  save: { family: 'Ionicons' as IconFamily, name: 'save' },
  cancel: { family: 'Ionicons' as IconFamily, name: 'close' },

  // Status
  success: { family: 'Ionicons' as IconFamily, name: 'checkmark-circle' },
  error: { family: 'Ionicons' as IconFamily, name: 'alert-circle' },
  warning: { family: 'Ionicons' as IconFamily, name: 'warning' },
  info: { family: 'Ionicons' as IconFamily, name: 'information-circle' },

  // Social
  facebook: { family: 'Ionicons' as IconFamily, name: 'logo-facebook' },
  instagram: { family: 'Ionicons' as IconFamily, name: 'logo-instagram' },
  twitter: { family: 'Ionicons' as IconFamily, name: 'logo-twitter' },

  // Commerce
  payment: { family: 'Ionicons' as IconFamily, name: 'card' },
  wallet: { family: 'Ionicons' as IconFamily, name: 'wallet' },
  store: { family: 'Ionicons' as IconFamily, name: 'storefront' },

  // Media
  camera: { family: 'Ionicons' as IconFamily, name: 'camera' },
  image: { family: 'Ionicons' as IconFamily, name: 'image' },
  video: { family: 'Ionicons' as IconFamily, name: 'videocam' },
} as const;

type IconName = keyof typeof IconRegistry;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000' }) => {
  const icon = IconRegistry[name];

  const IconComponent = {
    Ionicons,
    MaterialIcons,
    FontAwesome,
  }[icon.family];

  return <IconComponent name={icon.name as any} size={size} color={color} />;
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
- Type-safe icon names
- Easier to switch icon families
- Better documentation
- Prevents typos

**Checklist (Optional Enhancement):**
- [ ] Create iconRegistry.ts
- [ ] Map all used icons
- [ ] Update high-traffic screens
- [ ] Gradually migrate other screens
- [ ] Remove unused icon families

---

### 3.2 Lucide React (If Used)

**Files Affected:** 0 files found

**Action:** Remove package if truly unused

```bash
npm uninstall lucide-react
```

**Verification:**
```bash
# Search one more time to be sure
grep -r "lucide-react" --include="*.tsx" --include="*.ts" .

# Check package-lock.json
grep "lucide-react" package-lock.json
```

**Checklist:**
- [ ] Verify no usage in codebase
- [ ] Remove package
- [ ] Update package-lock.json
- [ ] Test build
- [ ] Verify no errors

---

## Section 4: Context & Hook Imports

### 4.1 Context Files

**Pattern to Check:**
```typescript
// In services/contexts
import * as Something from './something';

// Should be:
export { ContextProvider, useContext, type ContextType } from './something';
```

**Files to Review:**
- `contexts/AuthContext.tsx`
- `contexts/CartContext.tsx`
- `contexts/ProfileContext.tsx`
- `contexts/WishlistContext.tsx`
- And others...

**Checklist:**
- [ ] Review all context files
- [ ] Ensure proper exports
- [ ] Update wildcard imports
- [ ] Test context consumers

---

### 4.2 Hook Files

**Pattern to Check:**
```typescript
// Avoid
export const useCustomHook = () => { ... };

// Prefer for lazy loading
export default function useCustomHook() { ... };
```

**Checklist:**
- [ ] Review hook export patterns
- [ ] Consider default exports
- [ ] Update import statements
- [ ] Test hook functionality

---

## Section 5: Utility Function Imports

### 5.1 Consolidate Utilities

**Current State:** Scattered utility functions

**Target State:** Centralized utilities

```typescript
// utils/index.ts (barrel export)
export * from './dateUtils';
export * from './validators';
export * from './formatters';
export * from './apiHelpers';
```

**Optimized Pattern:**
```typescript
// BEFORE
import { formatDate } from '@/utils/dateUtils';
import { validateEmail } from '@/utils/validators';
import { formatCurrency } from '@/utils/formatters';

// AFTER (still tree-shakeable)
import {
  formatDate,
  validateEmail,
  formatCurrency
} from '@/utils';
```

**Checklist:**
- [ ] Create barrel exports
- [ ] Group related utilities
- [ ] Update imports
- [ ] Verify tree-shaking works

---

## Section 6: Component Imports

### 6.1 Component Lazy Loading

**For Large/Heavy Components:**

```typescript
// BEFORE
import { HeavyComponent } from './HeavyComponent';

// AFTER
import React, { Suspense, lazy } from 'react';
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Usage
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

**Candidates for Lazy Loading:**
- Game components
- Video players
- Image galleries
- Chart/graph components
- Large form components

**Checklist:**
- [ ] Identify heavy components
- [ ] Implement lazy loading
- [ ] Add Suspense boundaries
- [ ] Test loading states
- [ ] Measure performance improvement

---

### 6.2 Default vs Named Exports

**Recommendation:**
```typescript
// For components (better for lazy loading)
export default function MyComponent() { ... }

// For utilities/hooks (better for tree-shaking)
export const myUtility = () => { ... };
export const myHook = () => { ... };
```

**Checklist:**
- [ ] Review component exports
- [ ] Update where appropriate
- [ ] Test lazy loading
- [ ] Verify imports

---

## Section 7: Type Imports

### 7.1 Type-Only Imports

**Pattern:**
```typescript
// ❌ BAD: Imports values and types
import { User, UserRole } from './types';

// ✅ GOOD: Separate type imports
import type { User, UserRole } from './types';
import { getUser } from './api';

// ✅ GOOD: Mixed imports
import { getUser, type User, type UserRole } from './api';
```

**Benefits:**
- Smaller bundle size
- Faster compilation
- Clear separation of concerns

**Checklist:**
- [ ] Review type imports
- [ ] Add 'type' keyword where appropriate
- [ ] Test TypeScript compilation
- [ ] Verify no runtime errors

---

## Section 8: Platform-Specific Imports

### 8.1 Conditional Imports

**Pattern:**
```typescript
// BEFORE (imports both)
import { Component } from './Component.web';
import { Component } from './Component.native';

// AFTER (platform-specific)
// Component.web.tsx
export const Component = () => { ... };

// Component.native.tsx
export const Component = () => { ... };

// Usage - Metro automatically picks the right one
import { Component } from './Component';
```

**Examples:**
- Stripe payment components
- Platform-specific APIs
- Native modules

**Checklist:**
- [ ] Identify platform-specific code
- [ ] Create .web and .native files
- [ ] Update imports
- [ ] Test on both platforms

---

## Section 9: Testing & Verification

### 9.1 Automated Checks

**Script: check-wildcard-imports.js**
```javascript
const fs = require('fs');
const glob = require('glob');

console.log('Checking for wildcard imports...\n');

glob('**/*.{ts,tsx}', { ignore: ['node_modules/**', 'dist/**'] }, (err, files) => {
  if (err) throw err;

  const issues = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const wildcardMatches = content.match(/import \* as \w+ from ['"][^'"]+['"]/g);

    if (wildcardMatches) {
      issues.push({
        file,
        count: wildcardMatches.length,
        imports: wildcardMatches
      });
    }
  });

  if (issues.length === 0) {
    console.log('✅ No wildcard imports found!');
  } else {
    console.log(`❌ Found ${issues.length} files with wildcard imports:\n`);
    issues.forEach(({ file, count, imports }) => {
      console.log(`${file} (${count} imports)`);
      imports.forEach(imp => console.log(`  - ${imp}`));
      console.log('');
    });
  }
});
```

**Checklist:**
- [ ] Create check script
- [ ] Run before optimization
- [ ] Run after optimization
- [ ] Compare results

---

### 9.2 Bundle Size Verification

**Before Optimization:**
```bash
# Build and measure
npm run build:analyze

# Note the size
echo "Before: X MB" > bundle-size-log.txt
```

**After Optimization:**
```bash
# Build and measure again
npm run build:analyze

# Compare
echo "After: Y MB" >> bundle-size-log.txt
echo "Saved: (X-Y) MB" >> bundle-size-log.txt
```

**Checklist:**
- [ ] Measure before size
- [ ] Measure after size
- [ ] Calculate savings
- [ ] Document results

---

### 9.3 Functionality Testing

**Critical Paths to Test:**

**Authentication:**
- [ ] Sign in
- [ ] Sign up
- [ ] Password reset
- [ ] Token refresh

**Navigation:**
- [ ] Tab navigation
- [ ] Stack navigation
- [ ] Deep linking
- [ ] Back button

**Media:**
- [ ] Image upload
- [ ] Camera capture
- [ ] Video playback
- [ ] Image optimization

**Commerce:**
- [ ] Product browsing
- [ ] Add to cart
- [ ] Checkout
- [ ] Payment processing

**Social:**
- [ ] Share content
- [ ] Copy links
- [ ] Social media connect
- [ ] Referrals

**Other:**
- [ ] Location services
- [ ] Notifications
- [ ] Offline functionality
- [ ] Real-time features

---

## Section 10: Rollback Procedures

### 10.1 File-Level Rollback

**If import optimization breaks a file:**
```bash
# Restore single file
git checkout HEAD -- path/to/file.tsx

# Or restore from backup
cp path/to/file.tsx.backup path/to/file.tsx
```

**Checklist:**
- [ ] Identify broken file
- [ ] Restore from git
- [ ] Test file
- [ ] Document issue

---

### 10.2 Module-Level Rollback

**If entire module needs reverting:**
```bash
# Restore expo module wildcard
# Revert changes in all files using that module
git checkout HEAD -- app/bill-upload.tsx app/bill-upload-enhanced.tsx

# Verify functionality
npm start
```

**Checklist:**
- [ ] Identify affected files
- [ ] Restore all files
- [ ] Test module functionality
- [ ] Document decision

---

## Section 11: Progress Tracking

### 11.1 Import Optimization Progress

| Category | Total | Optimized | Remaining | % Complete |
|----------|-------|-----------|-----------|------------|
| Expo Camera | 2 | 0 | 2 | 0% |
| Image Picker | 6 | 0 | 6 | 0% |
| Clipboard | 4 | 0 | 4 | 0% |
| Location | 1 | 0 | 1 | 0% |
| Sharing | 1 | 0 | 1 | 0% |
| Document Picker | 1 | 0 | 1 | 0% |
| Service APIs | 1 | 0 | 1 | 0% |
| Other | 70 | 0 | 70 | 0% |
| **TOTAL** | **86** | **0** | **86** | **0%** |

**Update this table as you progress!**

---

### 11.2 Size Savings Tracker

| Optimization | Estimated Savings | Actual Savings | Status |
|--------------|------------------|----------------|--------|
| Expo imports | 500KB-1MB | ___ KB | Pending |
| Service imports | 100-200KB | ___ KB | Pending |
| Icon optimization | 200-300KB | ___ KB | Pending |
| Type imports | 50-100KB | ___ KB | Pending |
| Lazy loading | 500KB-1MB | ___ KB | Pending |
| **TOTAL** | **1.5-2.5 MB** | **___ MB** | **___** |

---

## Section 12: Best Practices

### 12.1 Going Forward

**New Code Guidelines:**

1. **Always use named imports:**
   ```typescript
   import { specific, imports } from 'module';
   ```

2. **Avoid wildcard imports:**
   ```typescript
   // ❌ Don't do this
   import * as Everything from 'module';
   ```

3. **Use type imports:**
   ```typescript
   import type { MyType } from './types';
   ```

4. **Consider lazy loading:**
   ```typescript
   const Heavy = lazy(() => import('./Heavy'));
   ```

5. **Platform-specific files:**
   ```
   Component.tsx (shared)
   Component.web.tsx (web-specific)
   Component.native.tsx (native-specific)
   ```

---

### 12.2 Code Review Checklist

**For PR Reviews:**
- [ ] No wildcard imports added
- [ ] Types imported with 'type' keyword
- [ ] Heavy components lazy loaded
- [ ] Platform-specific code separated
- [ ] Icons use centralized registry
- [ ] Utilities properly exported

---

### 12.3 CI/CD Integration

**Add to CI pipeline:**

```yaml
# .github/workflows/bundle-check.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  check-bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check wildcard imports
        run: npm run imports:check
      - name: Check bundle size
        run: npm run size:check
```

**Checklist:**
- [ ] Add import check to CI
- [ ] Add bundle size check to CI
- [ ] Set size limits
- [ ] Configure notifications

---

## Summary Checklist

### Phase 1: Expo Modules (Priority: HIGH)
- [ ] Fix expo-camera imports (2 files)
- [ ] Fix expo-image-picker imports (6 files)
- [ ] Fix expo-clipboard imports (4 files)
- [ ] Fix expo-location imports (1 file)
- [ ] Fix expo-sharing imports (1 file)
- [ ] Fix expo-document-picker imports (1 file)

### Phase 2: Services & APIs (Priority: HIGH)
- [ ] Fix service wildcard imports
- [ ] Update API call patterns
- [ ] Test all API integrations

### Phase 3: Icons (Priority: MEDIUM)
- [ ] Remove lucide-react if unused
- [ ] Create icon registry (optional)
- [ ] Standardize icon usage

### Phase 4: Types & Utilities (Priority: MEDIUM)
- [ ] Add type-only imports
- [ ] Consolidate utilities
- [ ] Create barrel exports

### Phase 5: Components (Priority: LOW)
- [ ] Add lazy loading to heavy components
- [ ] Review export patterns
- [ ] Platform-specific separation

### Phase 6: Verification (Priority: HIGH)
- [ ] Run automated checks
- [ ] Measure bundle size
- [ ] Test all critical paths
- [ ] Document results

---

**Checklist Prepared By:** Bundle Optimization Team
**Date:** 2025-11-11
**Version:** 1.0
**Last Updated:** ___________
