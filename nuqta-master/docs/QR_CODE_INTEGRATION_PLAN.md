# QR Code Integration Plan

## Executive Summary
This document provides a comprehensive analysis of QR code components in the REZ app codebase, their APIs, dependencies, and integration recommendations for the referral system.

---

## Components Found

### 1. QRCodeModal (Voucher QR Code Component)
**File Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\components\vouchers\QRCodeModal.tsx`

**Purpose:** Displays QR codes for voucher redemption with advanced features like brightness control, sharing, and copy functionality.

**Props Interface:**
```typescript
interface QRCodeModalProps {
  visible: boolean;
  voucher: VoucherData | null;
  onClose: () => void;
  onMarkAsUsed?: () => void;
}

interface VoucherData {
  id: string;
  code: string;
  brandName: string;
  brandLogo?: string;
  value: number;
  description: string;
  expiryDate: string;
  userId: string;
}
```

**Key Features:**
- ✅ QR code generation with embedded voucher data (JSON format)
- ✅ Automatic brightness increase for better scanning
- ✅ Brightness restoration on modal close
- ✅ Copy voucher code to clipboard
- ✅ Share voucher details
- ✅ Brand logo in center of QR code
- ✅ Mark as used functionality
- ✅ Responsive sizing (60% of screen width)
- ✅ Expiry date display

**Dependencies Used:**
- `react-native-qrcode-svg` - QR code generation
- `expo-clipboard` - Copy functionality
- `expo-brightness` - Screen brightness control
- `expo-file-system` - File operations
- `expo-sharing` - Share functionality

**QR Data Structure:**
```typescript
{
  type: 'VOUCHER',
  voucherId: string,
  code: string,
  userId: string,
  brandName: string,
  value: number,
  expiryDate: string,
  timestamp: string (ISO format)
}
```

---

### 2. QR Code Page (Profile & Wallet QR)
**File Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\profile\qr-code.tsx`

**Purpose:** Display QR codes for profile sharing and wallet payment receiving.

**Features:**
- ✅ Dual-mode: Profile QR and Wallet QR
- ✅ Tab-based navigation between modes
- ✅ Profile link generation
- ✅ Wallet ID generation
- ✅ Copy link/ID to clipboard
- ✅ Share functionality
- ✅ Scanner button (placeholder - TODO)
- ⚠️ Currently uses placeholder QR pattern (not actual QR code)

**Current Implementation:**
- Uses a visual placeholder (8x8 grid pattern)
- Contains commented-out code for actual QR implementation
- Mentions referral bonus (line 252: "Earn referral bonus when they sign up")

**Placeholder QR Pattern:**
```typescript
// Simple 8x8 checkerboard pattern
{[...Array(8)].map((_, row) => (
  <View key={row} style={styles.qrRow}>
    {[...Array(8)].map((_, col) => (
      <View
        key={col}
        style={[
          styles.qrDot,
          (row + col) % 2 === 0 && styles.qrDotFilled,
        ]}
      />
    ))}
  </View>
))}
```

**Ready-to-use QR Code Implementation (Commented):**
```typescript
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={activeTab === 'profile' ? profileLink : walletId}
  size={220}
  color="#111827"
  backgroundColor="white"
  logo={require('@/assets/images/logo.png')}
  logoSize={40}
/>
```

---

### 3. Referral Dashboard (Referral QR Code)
**File Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\referral\dashboard.tsx`

**Purpose:** Display referral dashboard with QR code generation capability.

**QR Integration:**
- Fetches QR data from API: `referralTierApi.generateQR()`
- Stores QR data in state
- Displays referral code with copy functionality
- **Missing:** Actual QR code display component

**API Response:**
```typescript
{
  qrCode: string;        // QR code data/image
  referralLink: string;  // Full referral URL
  referralCode: string;  // Unique referral code
}
```

**Current State:**
```typescript
const [qrData, setQrData] = useState<{
  qrCode: string;
  referralLink: string;
  referralCode: string;
} | null>(null);
```

**Displays:**
- ✅ Referral code (large, centered, copyable)
- ❌ QR code visualization (missing)
- ✅ Share button
- ✅ Copy code button

---

## API Integration

### Referral Tier API
**File Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\services\referralTierApi.ts`

**QR Generation Endpoint:**
```typescript
async generateQR(): Promise<{
  qrCode: string;
  referralLink: string;
  referralCode: string;
}> {
  const response = await apiClient.post('/api/referral/generate-qr');
  const data = (response.data as any)?.data;
  return data;
}
```

**Backend Endpoint:** `POST /api/referral/generate-qr`

---

### Share Service
**File Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\services\shareService.ts`

**QR Code Data Generation:**
```typescript
static generateQRCodeData(userId: string): string {
  return this.generateProfileUrl(userId);
}
```

**Note:** Currently just returns the profile URL, not specialized QR data.

---

## Dependencies Installed

### Current Package Versions
```json
{
  "react-native-qrcode-svg": "^6.3.20",
  "react-native-svg": "15.2.0",
  "expo-clipboard": "(included in Expo)",
  "expo-brightness": "(included in Expo)",
  "expo-sharing": "(included in Expo)"
}
```

All required dependencies are **already installed** and ready to use.

---

## QR Code Library Documentation

### react-native-qrcode-svg

**Installation:** ✅ Already installed (v6.3.20)

**Basic Usage:**
```typescript
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value="Hello World"
  size={200}
/>
```

**Advanced Props:**
```typescript
<QRCode
  // Core props
  value={string}           // Required: The data to encode
  size={number}            // QR code size (default: 100)

  // Styling
  color={string}           // Foreground color (default: black)
  backgroundColor={string} // Background color (default: white)

  // Logo/Image in center
  logo={ImageSourcePropType}     // Logo image
  logoSize={number}              // Logo size
  logoBackgroundColor={string}   // Logo background
  logoBorderRadius={number}      // Logo border radius
  logoMargin={number}            // Space around logo

  // Error correction
  ecl={'L' | 'M' | 'Q' | 'H'}   // Error correction level
                                 // L=7%, M=15%, Q=25%, H=30%

  // Advanced
  getRef={(ref) => setQrRef(ref)} // Get SVG reference
  onError={(error) => {}}         // Error callback
  quietZone={number}              // White border size
  enableLinearGradient={boolean}  // Enable gradient
  linearGradient={['color1', 'color2']} // Gradient colors
  gradientDirection={['x1','y1','x2','y2']} // Gradient direction
/>
```

---

## Integration Recommendations

### 1. Referral QR Code Component (Highest Priority)

**Create:** `components/referral/ReferralQRModal.tsx`

**Purpose:** Dedicated modal for displaying referral QR codes with sharing capabilities.

**Recommended Implementation:**

```typescript
import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Brightness from 'expo-brightness';

interface ReferralQRModalProps {
  visible: boolean;
  onClose: () => void;
  referralCode: string;
  referralLink: string;
  userName?: string;
}

const ReferralQRModal: React.FC<ReferralQRModalProps> = ({
  visible,
  onClose,
  referralCode,
  referralLink,
  userName,
}) => {
  const [qrRef, setQrRef] = useState<any>(null);
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);

  // Generate QR data with referral information
  const generateQRData = () => {
    const qrData = {
      type: 'REFERRAL',
      code: referralCode,
      link: referralLink,
      referrer: userName,
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(qrData);
  };

  // Increase brightness for scanning
  const handleModalShow = async () => {
    try {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        const currentBrightness = await Brightness.getBrightnessAsync();
        setOriginalBrightness(currentBrightness);
        await Brightness.setBrightnessAsync(1);
      }
    } catch (error) {
      console.error('Brightness error:', error);
    }
  };

  // Restore brightness
  const handleModalClose = async () => {
    try {
      if (originalBrightness !== null) {
        await Brightness.setBrightnessAsync(originalBrightness);
      }
    } catch (error) {
      console.error('Brightness error:', error);
    }
    onClose();
  };

  // Copy referral code
  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  // Share referral
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on REZ App and get ₹30 off! Use code: ${referralCode}\n\n${referralLink}`,
        title: 'Join REZ App',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleModalShow}
      onRequestClose={handleModalClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Your Referral</Text>
            <TouchableOpacity onPress={handleModalClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <QRCode
              value={generateQRData()}
              size={Dimensions.get('window').width * 0.6}
              color="#000000"
              backgroundColor="#FFFFFF"
              getRef={(ref) => setQrRef(ref)}
              ecl="M"
              quietZone={10}
            />
          </View>

          {/* Referral Code */}
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Your Referral Code</Text>
            <View style={styles.codeBox}>
              <Text style={styles.code}>{referralCode}</Text>
              <TouchableOpacity onPress={handleCopyCode}>
                <Ionicons name="copy-outline" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.shareGradient}
            >
              <Ionicons name="share-social" size={20} color="white" />
              <Text style={styles.shareText}>Share Referral</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  codeSection: {
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
  },
  code: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 2,
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  shareText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ReferralQRModal;
```

**Integration in Referral Dashboard:**
```typescript
// In app/referral/dashboard.tsx

import ReferralQRModal from '@/components/referral/ReferralQRModal';

const [showQRModal, setShowQRModal] = useState(false);

// Add button to open QR modal
<TouchableOpacity
  style={styles.qrButton}
  onPress={() => setShowQRModal(true)}
>
  <Ionicons name="qr-code" size={24} color="#7c3aed" />
  <Text>Show QR Code</Text>
</TouchableOpacity>

// Add modal
<ReferralQRModal
  visible={showQRModal}
  onClose={() => setShowQRModal(false)}
  referralCode={qrData?.referralCode || ''}
  referralLink={qrData?.referralLink || ''}
  userName={user?.name}
/>
```

---

### 2. Update Profile QR Code Page

**File:** `app/profile/qr-code.tsx`

**Action Required:** Replace placeholder QR pattern with actual QR code component.

**Implementation:**
```typescript
// Remove placeholder code (lines 121-140)
// Replace with:

import QRCode from 'react-native-qrcode-svg';

<View style={styles.qrContainer}>
  <QRCode
    value={activeTab === 'profile' ? profileLink : walletId}
    size={220}
    color="#111827"
    backgroundColor="white"
    ecl="M"
    quietZone={10}
  />
</View>
```

**Optional Enhancement - Add Logo:**
```typescript
// Add REZ logo to center of QR code
<QRCode
  value={activeTab === 'profile' ? profileLink : walletId}
  size={220}
  color="#111827"
  backgroundColor="white"
  logo={require('@/assets/images/logo.png')}  // Add your logo
  logoSize={40}
  logoBackgroundColor="white"
  logoBorderRadius={20}
  ecl="M"
/>
```

---

### 3. Implement QR Scanner

**Create:** `components/common/QRScanner.tsx`

**Dependencies Needed:**
```bash
npx expo install expo-camera expo-barcode-scanner
```

**Basic Implementation:**
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Camera, CameraView, BarCodeScanner } from 'expo-camera';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    try {
      // Try to parse as JSON (for structured QR codes)
      const parsed = JSON.parse(data);

      if (parsed.type === 'REFERRAL') {
        onScan(parsed.code);
      } else if (parsed.type === 'VOUCHER') {
        onScan(parsed.code);
      } else {
        onScan(data);
      }
    } catch {
      // Plain text QR code
      onScan(data);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
});

export default QRScanner;
```

---

## QR Data Standards

### Recommended QR Data Structure

**For Referrals:**
```typescript
{
  type: 'REFERRAL',
  code: string,           // Referral code
  link: string,           // Full referral URL
  referrer: string,       // Referrer name
  timestamp: string,      // ISO timestamp
  app: 'REZ'             // App identifier
}
```

**For Vouchers:**
```typescript
{
  type: 'VOUCHER',
  voucherId: string,
  code: string,
  userId: string,
  brandName: string,
  value: number,
  expiryDate: string,
  timestamp: string
}
```

**For Profile:**
```typescript
{
  type: 'PROFILE',
  userId: string,
  profileUrl: string,
  username: string,
  timestamp: string
}
```

**For Wallet:**
```typescript
{
  type: 'WALLET',
  walletId: string,
  userId: string,
  username: string,
  timestamp: string
}
```

---

## Best Practices

### 1. Error Correction Levels
- **Low (L):** 7% - Use for simple codes with low data
- **Medium (M):** 15% - **Recommended default**
- **Quartile (Q):** 25% - Use when adding logos
- **High (H):** 30% - Use for critical data or harsh conditions

### 2. Size Recommendations
- **Minimum:** 150px (for basic scanning)
- **Recommended:** 200-250px (good balance)
- **Large displays:** 300-400px (optimal for sharing)
- **Voucher redemption:** 60% of screen width (current implementation)

### 3. Color Contrast
- **Foreground:** Dark colors (#000000, #1F2937)
- **Background:** White or light colors (#FFFFFF, #F9FAFB)
- **Minimum contrast ratio:** 4.5:1 for accessibility

### 4. Brightness Control
- Always increase brightness when displaying QR codes
- Store original brightness level
- Restore on modal close
- Request permissions before accessing brightness API

### 5. Logo Usage
- Keep logo size ≤ 30% of QR code size
- Use error correction level Q or H when adding logos
- Add background color to logo for better visibility
- Round corners for better aesthetics

---

## Code Examples

### Example 1: Basic Referral QR Code
```typescript
<QRCode
  value={referralLink}
  size={200}
  color="#000000"
  backgroundColor="#FFFFFF"
  ecl="M"
/>
```

### Example 2: Referral QR with Logo
```typescript
<QRCode
  value={JSON.stringify({
    type: 'REFERRAL',
    code: 'REF123',
    link: 'https://rezapp.com/invite/REF123'
  })}
  size={250}
  color="#000000"
  backgroundColor="#FFFFFF"
  logo={require('@/assets/logo.png')}
  logoSize={50}
  logoBackgroundColor="#FFFFFF"
  logoBorderRadius={25}
  ecl="H"
/>
```

### Example 3: Voucher QR Code (From Existing Component)
```typescript
<QRCode
  value={JSON.stringify({
    type: 'VOUCHER',
    voucherId: voucher.id,
    code: voucher.code,
    userId: voucher.userId,
    brandName: voucher.brandName,
    value: voucher.value,
    expiryDate: voucher.expiryDate,
    timestamp: new Date().toISOString(),
  })}
  size={width * 0.6}
  color="#000000"
  backgroundColor="#FFFFFF"
  logo={voucher.brandLogo ? { uri: voucher.brandLogo } : undefined}
  logoSize={50}
  logoBackgroundColor="transparent"
  logoBorderRadius={25}
  getRef={(ref) => setQrRef(ref)}
/>
```

### Example 4: With Gradient Background
```typescript
<QRCode
  value={data}
  size={200}
  enableLinearGradient={true}
  linearGradient={['#8B5CF6', '#7C3AED']}
  gradientDirection={['0%', '0%', '100%', '100%']}
  backgroundColor="#FFFFFF"
/>
```

---

## Testing Checklist

### Functionality Tests
- [ ] QR code generates correctly with referral data
- [ ] QR code scans successfully on different devices
- [ ] Copy to clipboard works
- [ ] Share functionality works on all platforms
- [ ] Brightness control works (iOS & Android)
- [ ] Brightness restores after modal close
- [ ] Logo displays correctly in center
- [ ] Modal animations are smooth

### Visual Tests
- [ ] QR code is clearly visible
- [ ] Size is appropriate for scanning
- [ ] Colors have sufficient contrast
- [ ] Layout is responsive on different screen sizes
- [ ] Logo doesn't interfere with scanning

### Edge Cases
- [ ] Very long referral codes
- [ ] Special characters in data
- [ ] Network failure during QR generation
- [ ] Permission denied for brightness/camera
- [ ] Low battery mode (brightness may be limited)

---

## Performance Considerations

### Optimization Tips
1. **Cache QR Code Generation**
   - Generate once, reuse the same QR code
   - Store in component state, not regenerate on every render

2. **Lazy Loading**
   - Only generate QR code when modal opens
   - Unload when modal closes

3. **Image Format**
   - SVG format is lightweight and scalable
   - react-native-qrcode-svg uses SVG by default

4. **Memory Management**
   - Clear refs when component unmounts
   - Cleanup event listeners and timers

---

## Migration Steps

### Phase 1: Update Profile QR Page (Immediate)
1. Import `react-native-qrcode-svg`
2. Replace placeholder pattern with actual QRCode component
3. Test on iOS and Android devices
4. Verify scanning works with standard QR readers

### Phase 2: Create Referral QR Modal (High Priority)
1. Create `components/referral/ReferralQRModal.tsx`
2. Implement QR generation with referral data
3. Add brightness control
4. Integrate into referral dashboard
5. Test sharing and copying functionality

### Phase 3: Implement QR Scanner (Optional)
1. Install expo-camera
2. Create QRScanner component
3. Add scan button to relevant pages
4. Implement scan result handling
5. Test with all QR code types (referral, voucher, profile)

---

## Dependencies Summary

### Already Installed ✅
- `react-native-qrcode-svg@6.3.20` - QR code generation
- `react-native-svg@15.2.0` - SVG rendering
- `expo-clipboard` - Copy to clipboard
- `expo-brightness` - Brightness control
- `expo-sharing` - Share functionality

### To Install (Optional) 📦
```bash
# For QR scanning functionality
npx expo install expo-camera
```

---

## Support & Resources

### Documentation
- **react-native-qrcode-svg:** https://github.com/awesomejerry/react-native-qrcode-svg
- **Expo Camera:** https://docs.expo.dev/versions/latest/sdk/camera/
- **Expo Brightness:** https://docs.expo.dev/versions/latest/sdk/brightness/

### Testing Tools
- **QR Code Reader Apps:**
  - iOS: Native Camera app
  - Android: Google Lens, QR Code Reader apps
- **QR Code Validators:**
  - https://www.qr-code-generator.com/qr-code-scanner/
  - https://zxing.org/w/decode.jspx

---

## Conclusion

The REZ app has a **solid foundation** for QR code functionality:

1. ✅ **QRCodeModal** component is production-ready for vouchers
2. ⚠️ **Profile QR page** needs implementation (currently placeholder)
3. ❌ **Referral QR modal** needs to be created
4. ✅ All required dependencies are installed
5. ✅ Backend API supports QR generation

**Recommended Next Steps:**
1. Implement actual QR code in profile/qr-code.tsx (15 min)
2. Create ReferralQRModal component (2-3 hours)
3. Integrate into referral dashboard (30 min)
4. Test on physical devices (1 hour)

**Total Estimated Time:** 4-5 hours for complete QR code integration across all features.
