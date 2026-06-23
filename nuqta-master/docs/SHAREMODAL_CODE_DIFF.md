# ShareModal Integration - Exact Code Changes

**File**: `app/referral.tsx`
**Changes Required**: 3 additions, 1 modification

---

## Change 1: Add Import (Line 1-33)

### Location: Top of file, with other imports

```diff
  import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
  import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Share,
    Alert,
    ActivityIndicator,
    RefreshControl,
    FlatList,
  } from 'react-native';
  import { LinearGradient } from 'expo-linear-gradient';
  import { Ionicons } from '@expo/vector-icons';
  import { useRouter, Stack } from 'expo-router';
  import { ThemedText } from '@/components/ThemedText';
  import * as Clipboard from 'expo-clipboard';
  import { useAuth } from '@/contexts/AuthContext';
  import {
    getReferralStats,
    getReferralHistory,
    getReferralCode,
    trackShare,
    type ReferralStats,
    type ReferralHistoryItem,
  } from '@/services/referralApi';
  import { anonymizeEmail } from '@/utils/privacy';
+ import ShareModal from '@/components/referral/ShareModal';
```

**Line Number**: After line 32 (after privacy import)

---

## Change 2: Add State (Line 34-47)

### Location: Inside ReferralPage component, with other useState declarations

```diff
  const ReferralPage = () => {
    const router = useRouter();
    const { state } = useAuth();
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
    const [codeInfo, setCodeInfo] = useState<{
      referralCode: string;
      referralLink: string;
      shareMessage: string;
    } | null>(null);
+   const [shareModalVisible, setShareModalVisible] = useState(false);

    // Refs for cleanup
    const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
```

**Line Number**: After line 46 (after codeInfo state)

---

## Change 3: Update Share Button (Line 330-339)

### Location: Inside Referral Code Card section

**BEFORE**:
```typescript
<TouchableOpacity
  style={styles.shareButton}
  onPress={handleShareReferral}
  accessibilityLabel="Share referral"
  accessibilityHint="Opens share menu to invite friends"
>
  <Ionicons name="share-social" size={20} color="white" />
  <Text style={styles.shareButtonText}>Share with Friends</Text>
</TouchableOpacity>
```

**AFTER**:
```diff
  <TouchableOpacity
    style={styles.shareButton}
-   onPress={handleShareReferral}
+   onPress={() => setShareModalVisible(true)}
    accessibilityLabel="Share referral"
-   accessibilityHint="Opens share menu to invite friends"
+   accessibilityHint="Opens advanced sharing options with QR code"
  >
    <Ionicons name="share-social" size={20} color="white" />
    <Text style={styles.shareButtonText}>Share with Friends</Text>
  </TouchableOpacity>
```

**Line Numbers**: Lines 330-339

---

## Change 4: Add ShareModal Component (Line 500+)

### Location: End of return statement, after ScrollView closing tag

**BEFORE**:
```typescript
      </ScrollView>
    </View>
  );
};
```

**AFTER**:
```diff
        </ScrollView>
+
+       {/* ShareModal for Advanced Sharing */}
+       <ShareModal
+         visible={shareModalVisible}
+         referralCode={referralCode}
+         referralLink={referralLink}
+         currentTierProgress={stats ? {
+           current: stats.completedReferrals || 0,
+           target: 5,
+           nextTier: "Pro"
+         } : undefined}
+         onClose={() => setShareModalVisible(false)}
+       />
      </View>
    );
  };
```

**Line Number**: After line 499 (before closing View tag)

---

## Complete Modified Section

### Full Code Block (Lines 300-510)

```typescript
return (
  <View style={styles.container}>
    <Stack.Screen options={{ headerShown: false }} />
    <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

    {/* Header */}
    <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityHint="Returns to previous screen"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Refer & Earn</ThemedText>
        <View style={styles.placeholder} />
      </View>
    </LinearGradient>

    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B5CF6']} />
      }
    >
      {/* Referral Code Card */}
      <View style={styles.codeCard}>
        <View style={styles.codeHeader}>
          <Ionicons name="gift" size={32} color="#8B5CF6" />
          <ThemedText style={styles.codeTitle}>Your Referral Code</ThemedText>
        </View>

        <View style={styles.codeBox}>
          <ThemedText style={styles.code}>{referralCode}</ThemedText>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyCode}
            accessibilityLabel="Copy referral code"
            accessibilityHint="Copies your referral code to clipboard"
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={20}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {/* ✅ MODIFIED: Changed onPress handler */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => setShareModalVisible(true)}
          accessibilityLabel="Share referral"
          accessibilityHint="Opens advanced sharing options with QR code"
        >
          <Ionicons name="share-social" size={20} color="white" />
          <Text style={styles.shareButtonText}>Share with Friends</Text>
        </TouchableOpacity>
      </View>

      {/* ... rest of ScrollView content ... */}
    </ScrollView>

    {/* ✅ NEW: ShareModal Component */}
    <ShareModal
      visible={shareModalVisible}
      referralCode={referralCode}
      referralLink={referralLink}
      currentTierProgress={stats ? {
        current: stats.completedReferrals || 0,
        target: 5,
        nextTier: "Pro"
      } : undefined}
      onClose={() => setShareModalVisible(false)}
    />
  </View>
);
```

---

## Optional: Keep Old Share Handler as Fallback

If you want to keep both native share AND ShareModal:

### Add Quick Share Button

```typescript
{/* Referral Code Card */}
<View style={styles.codeCard}>
  {/* ... code display ... */}

  {/* Row of share buttons */}
  <View style={{ flexDirection: 'row', gap: 12 }}>
    {/* Quick Share (Native) */}
    <TouchableOpacity
      style={[styles.shareButton, { flex: 1 }]}
      onPress={handleShareReferral}
    >
      <Ionicons name="share-outline" size={20} color="white" />
      <Text style={styles.shareButtonText}>Quick Share</Text>
    </TouchableOpacity>

    {/* Advanced Share (Modal) */}
    <TouchableOpacity
      style={[styles.shareButton, { flex: 1 }]}
      onPress={() => setShareModalVisible(true)}
    >
      <Ionicons name="options-outline" size={20} color="white" />
      <Text style={styles.shareButtonText}>More Options</Text>
    </TouchableOpacity>
  </View>
</View>
```

---

## Remove Old Handler (Optional)

If you want to completely remove native share:

### Delete Function (Lines 189-224)

```diff
- const handleShareReferral = useCallback(async () => {
-   try {
-     if (!referralCode || referralCode === 'LOADING...') {
-       Alert.alert('Error', 'Referral code not loaded yet');
-       return;
-     }
-
-     const shareMessage = codeInfo?.shareMessage ||
-       `Join me on REZ App and get ₹30 off on your first order! Use my referral code: ${referralCode}\n\nDownload now: ${referralLink}`;
-
-     const result = await Share.share({
-       message: shareMessage,
-       title: 'Join REZ App',
-     });
-
-     if (result.action === Share.sharedAction) {
-       try {
-         await trackShare('whatsapp');
-       } catch (trackError) {
-         console.error('Error tracking share:', trackError);
-       }
-     }
-   } catch (error: any) {
-     if (error?.message?.includes('User did not share')) {
-       console.log('User cancelled share');
-     } else {
-       console.error('Error sharing:', error);
-       Alert.alert('Error', 'Failed to share referral. Please try again.');
-     }
-   }
- }, [referralCode, referralLink, codeInfo?.shareMessage]);
```

**Note**: Keep this function if you want both quick share and advanced share options.

---

## Imports Cleanup (Optional)

If you remove `handleShareReferral`, you can also remove:

```diff
  import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
-   Share,
    Alert,
    ActivityIndicator,
    RefreshControl,
    FlatList,
  } from 'react-native';
```

**Note**: Only remove if you're not using native Share anywhere else.

---

## Summary of Changes

| Change | Type        | Lines     | Impact      |
|--------|-------------|-----------|-------------|
| 1      | Add import  | ~33       | Required    |
| 2      | Add state   | ~47       | Required    |
| 3      | Modify btn  | 330-339   | Required    |
| 4      | Add modal   | 500-512   | Required    |
| 5      | Remove fn   | 189-224   | Optional    |
| 6      | Remove imp  | ~12       | Optional    |

**Total Required Changes**: 4
**Total Optional Changes**: 2

---

## Validation

After making changes, verify:

```typescript
// 1. Import exists
import ShareModal from '@/components/referral/ShareModal'; ✅

// 2. State declared
const [shareModalVisible, setShareModalVisible] = useState(false); ✅

// 3. Button updated
onPress={() => setShareModalVisible(true)} ✅

// 4. Modal added
<ShareModal visible={shareModalVisible} ... /> ✅
```

---

## Test Plan

```bash
# 1. Save file
# 2. Restart development server (if needed)
npm start

# 3. Test on device/emulator
# - Navigate to Referral page
# - Tap "Share with Friends"
# - Verify ShareModal opens
# - Test all platforms
# - Verify QR code displays
# - Test copy buttons
# - Verify modal closes
```

---

## Rollback Plan

If issues occur:

```diff
# Revert all changes
- import ShareModal from '@/components/referral/ShareModal';
- const [shareModalVisible, setShareModalVisible] = useState(false);

# Restore original button
- onPress={() => setShareModalVisible(true)}
+ onPress={handleShareReferral}

# Remove modal component
- <ShareModal visible={shareModalVisible} ... />
```

---

**Integration Complete!** 🎉

See full documentation: `SHAREMODAL_INTEGRATION_PLAN.md`
See quick guide: `SHAREMODAL_QUICK_INTEGRATION.md`
