# 📱 Header and Navigation Template for New Pages

## How to Hide Default Header and Handle Navigation

### 1. Import Required Hooks
```javascript
import React, { useLayoutEffect } from 'react';
import { useRouter, useNavigation } from 'expo-router';
```

### 2. Inside Your Component
```javascript
export default function YourPageName() {
  const router = useRouter();
  const navigation = useNavigation();

  // Hide the default navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Safe navigation function for web compatibility
  const handleGoBack = () => {
    try {
      if (navigation && navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else if (router && router.push) {
        // Navigate to home if can't go back
        router.push('/');
      } else {
        // Final fallback - replace current route with home
        router.replace('/');
      }
    } catch (error) {
      // If all else fails, navigate to home
      console.log('Navigation fallback to home');
      if (router) {
        router.replace('/');
      }
    }
  };

  // Your component code here...
}
```

### 3. Custom Header Implementation
```javascript
// In your render/return:
<View style={styles.header}>
  <TouchableOpacity onPress={handleGoBack}>
    <Ionicons name="arrow-back" size={24} color="#333" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Your Page Title</Text>
  <TouchableOpacity onPress={() => router?.push ? router.push('/some-page') : null}>
    <Ionicons name="some-icon" size={24} color="#333" />
  </TouchableOpacity>
</View>
```

## ✅ What This Solves:

1. **Double Header Issue** - Hides the default navigation header
2. **GO_BACK Warning** - Checks if can go back before attempting
3. **Web Compatibility** - Works on both web and mobile
4. **Fallback Navigation** - Always navigates to home if can't go back

## 🚨 Common Issues and Solutions:

### Issue: "The action 'GO_BACK' was not handled"
**Solution:** Use the `handleGoBack` function above which checks `canGoBack()` first

### Issue: Double headers showing
**Solution:** Use `useLayoutEffect` with `navigation.setOptions({ headerShown: false })`

### Issue: Router methods not working on web
**Solution:** Always check if methods exist before calling:
```javascript
router?.push ? router.push('/page') : console.warn('Router not available')
```

## 📝 Complete Example:

```javascript
import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NewPage() {
  const router = useRouter();
  const navigation = useNavigation();

  // Hide default header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Safe back navigation
  const handleGoBack = () => {
    try {
      if (navigation && navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        router.replace('/');
      }
    } catch (error) {
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Page Title</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Page Content */}
      <View style={styles.content}>
        <Text>Your page content here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
```

## 🎯 Use This Template For:
- All new pages with custom headers
- Pages accessed via modal or push navigation
- Any page that shows double headers
- Pages with back navigation

---

**Last Updated:** October 25, 2025
**Status:** Production Ready Template