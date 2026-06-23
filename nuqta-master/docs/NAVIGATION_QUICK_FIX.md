# Navigation Quick Fix Guide

## Problem: Navigation crashes and workarounds everywhere

## Solution: Use the new safe navigation system

---

## Quick Fixes

### 1. Replace Manual Back Handlers

**Before:**
```typescript
const handleGoBack = () => {
  try {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (router?.push) {
      router.push('/');
    } else {
      router.replace('/');
    }
  } catch (error) {
    router.replace('/');
  }
};
```

**After:**
```typescript
import { useSafeNavigation } from '@/hooks/useSafeNavigation';

const { goBack } = useSafeNavigation();

const handleGoBack = () => {
  goBack('/'); // Fallback route
};
```

---

### 2. Replace Back Button Components

**Before:**
```typescript
<TouchableOpacity onPress={handleGoBack}>
  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
</TouchableOpacity>
```

**After:**
```typescript
import { HeaderBackButton } from '@/components/navigation';

<HeaderBackButton
  onPress={handleGoBack}
  iconColor="#FFFFFF"
/>
```

---

### 3. Replace Direct Router Calls

**Before:**
```typescript
router.push('/profile');
```

**After:**
```typescript
const { navigate } = useSafeNavigation();
await navigate('/profile');
```

---

## Complete File Fix Example

### Before (bill-upload.tsx):

```typescript
import { useRouter, useNavigation } from 'expo-router';

export default function BillUploadPage() {
  const router = useRouter();
  const navigation = useNavigation();

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
    <View style={styles.header}>
      <TouchableOpacity onPress={handleGoBack}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Upload Bill</Text>
    </View>
  );
}
```

### After (bill-upload.tsx):

```typescript
import { useRouter, useNavigation } from 'expo-router';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { HeaderBackButton } from '@/components/navigation';

export default function BillUploadPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { goBack } = useSafeNavigation();

  const handleGoBack = () => {
    goBack('/');
  };

  return (
    <View style={styles.header}>
      <HeaderBackButton onPress={handleGoBack} iconColor="#333" />
      <Text style={styles.headerTitle}>Upload Bill</Text>
    </View>
  );
}
```

---

## Files to Update

Run this script to find all files with navigation issues:

```bash
# Find files with handleGoBack
grep -r "handleGoBack" app/

# Find files with canGoBack checks
grep -r "canGoBack()" app/

# Find files with try-catch navigation
grep -r "try.*navigation" app/
```

### Priority Files (Already Fixed):
- ✅ app/bill-upload.tsx
- ✅ app/my-products.tsx
- ✅ app/my-vouchers.tsx
- ✅ app/my-earnings.tsx

### Remaining Files:
Update these files using the same pattern:
- app/bill-history.tsx
- app/order-history.tsx
- app/profile/edit.tsx
- app/profile/achievements.tsx
- app/account/addresses.tsx
- app/search.tsx
- app/wishlist.tsx
- app/going-out.tsx
- app/home-delivery.tsx
- app/EventPage.tsx
- app/tracking.tsx
- app/payment.tsx
- app/coin-detail.tsx
- app/scratch-card.tsx
- app/ring-sizer.tsx
- app/loyalty.tsx
- app/faq.tsx
- app/referral.tsx
- app/social-media.tsx
- app/my-reviews.tsx
- And ~50+ more files

---

## Steps to Fix Any File

### Step 1: Add Imports

```typescript
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { HeaderBackButton } from '@/components/navigation';
```

### Step 2: Use Hook

```typescript
const { goBack, navigate } = useSafeNavigation();
```

### Step 3: Replace Handler

```typescript
const handleGoBack = () => {
  goBack('/fallback-route');
};
```

### Step 4: Replace Button

```typescript
<HeaderBackButton
  onPress={handleGoBack}
  iconColor="#FFFFFF"
/>
```

---

## Common Patterns

### Pattern 1: Simple Back Button

```typescript
const { goBack } = useSafeNavigation();

<HeaderBackButton
  onPress={() => goBack('/home')}
  iconColor="#FFFFFF"
/>
```

### Pattern 2: Back Button with Confirmation

```typescript
<HeaderBackButton
  onPress={() => goBack('/home')}
  showConfirmation={true}
  confirmationMessage="Are you sure you want to leave?"
/>
```

### Pattern 3: Custom Fallback Chain

```typescript
const { goBackOrFallback } = useSafeNavigation();

const handleBack = () => {
  goBackOrFallback('/profile'); // Goes back if possible, otherwise to /profile
};
```

### Pattern 4: Navigate with Error Handling

```typescript
const { navigate } = useSafeNavigation();

const handleNavigate = async () => {
  const result = await navigate('/profile', {
    fallbackRoute: '/home',
    onError: (error) => {
      Alert.alert('Error', 'Navigation failed');
    },
  });

  if (result.status === 'success') {
    console.log('Navigated successfully');
  }
};
```

---

## Testing Your Changes

### 1. Test Back Button

```typescript
// Navigate to screen
await navigate('/my-screen');

// Press back button
// Should go back or use fallback
```

### 2. Test No History

```typescript
// Navigate directly to screen (no history)
router.replace('/my-screen');

// Press back button
// Should use fallback route instead of crashing
```

### 3. Test Invalid Route

```typescript
// Try invalid route
await navigate('/invalid-route', {
  fallbackRoute: '/home',
});

// Should use fallback
```

---

## Quick Commands

### Find and Replace in VSCode

1. Open Find & Replace (Ctrl+H)
2. Enable regex mode (Alt+R)

**Find:**
```regex
const handleGoBack = \(\) => \{[\s\S]*?\};
```

**Replace:**
```typescript
const { goBack } = useSafeNavigation();

const handleGoBack = () => {
  goBack('/');
};
```

---

## Bulk Update Script

Create a script to update multiple files:

```bash
#!/bin/bash

# Update all files with navigation issues
for file in $(grep -l "handleGoBack" app/**/*.tsx); do
  echo "Fixing $file"
  # Add your sed/awk commands here
done
```

---

## Checklist for Each File

- [ ] Add import: `useSafeNavigation`
- [ ] Add import: `HeaderBackButton`
- [ ] Replace `handleGoBack` with safe version
- [ ] Replace back button component
- [ ] Remove try-catch blocks
- [ ] Remove `router.canGoBack()` checks
- [ ] Test navigation works
- [ ] Test back button works
- [ ] Test fallback works

---

## Need Help?

If you encounter issues:

1. Check NAVIGATION_SYSTEM.md for full documentation
2. Look at fixed files for examples
3. Check console for navigation errors
4. Verify imports are correct
5. Ensure fallback routes are valid

---

## Status

**Completed:** 4 files
**Remaining:** ~88 files
**Total:** ~92 files

Use this guide to systematically fix all navigation issues throughout the app.
