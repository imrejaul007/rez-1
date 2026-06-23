// @ts-nocheck
/**
 * QR Scanner Component - Native (iOS/Android)
 *
 * Premium QR scanner UI like PhonePe/GPay with:
 * - Full-screen camera with gradient overlay
 * - Promo banner showing rewards
 * - Animated scan line
 * - Flash and gallery buttons
 * - Security badges
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { QRCodeData } from '@/types/storePayment.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCANNER_SIZE = SCREEN_WIDTH * 0.75;

// Nuqta Brand Colors
const NUQTA_COLORS = {
  primary: colors.lightMustard,
  primaryGlow: 'rgba(255, 205, 87, 0.5)',
  orange: colors.brand.orange,
  navy: colors.brand.navyDark,
  background: '#18181B',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onClose: () => void;
  onManualEntry?: () => void;
}

function QRScanner({ onScan, onClose, onManualEntry }: QRScannerProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const scanLineAnim = useSharedValue(0);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');

    scanLineAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500 }),
        withTiming(0, { duration: 0 })
      ),
      -1
    );

    return () => {
      StatusBar.setBarStyle('dark-content');
    };
  }, []);

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;

    try {
      const data = result.data;

      try {
        const qrData: QRCodeData = JSON.parse(data);
        if (qrData.type !== 'REZ_STORE_PAYMENT' || !qrData.code) {
          showError(`Invalid QR code. Please scan a ${BRAND.APP_NAME} store QR.`);
          return;
        }
        setScanned(true);
        onScan(qrData.code);
      } catch {
        if (data.startsWith('REZ-STORE-')) {
          setScanned(true);
          onScan(data);
        } else {
          showError('Invalid QR code format.');
        }
      }
    } catch (err) {
      showError('Failed to process QR code.');
    }
  };

  const showError = (message: string) => {
    setError(message);
    setScanned(true);
    setTimeout(() => {
      setScanned(false);
      setError(null);
    }, 3000);
  };

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanLineAnim.value, [0, 1], [0, SCANNER_SIZE - 4]) }],
    opacity: interpolate(scanLineAnim.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
  }));

  // Permission states
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={64} color={NUQTA_COLORS.primary} />
          <Text style={styles.permissionText}>Initializing camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={48} color={NUQTA_COLORS.primary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSubtext}>
            To scan QR codes and pay at stores
          </Text>
          <Pressable style={styles.grantButton} onPress={requestPermission}>
            <Text style={styles.grantButtonText}>Allow Camera Access</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent', 'transparent', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.25, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={onClose}>
          <Ionicons name="close" size={26} color={colors.background.primary} />
        </Pressable>
        <Pressable style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.background.primary} />
        </Pressable>
      </View>

      {/* Promo Banner */}
      <View style={styles.promoBanner}>
        <View style={styles.promoPill}>
          <View style={styles.promoIcon}>
            <Text style={styles.promoIconText}>R</Text>
          </View>
          <Text style={styles.promoText}>{`5% ${BRAND.COIN_NAME} on every payment`}</Text>
        </View>
        <Text style={styles.promoSubtext}>On payments of {currencySymbol}25 and above</Text>
      </View>

      {/* Scanner Frame */}
      <View style={styles.scannerContainer}>
        <View style={styles.scannerFrame}>
          {/* Corner Markers */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {/* Animated Scan Line */}
          <Animated.View
            style={[
              styles.scanLine,
              scanLineStyle,
            ]}
          />

          {/* Outer shadow to darken outside scan area */}
          <View style={styles.scannerShadow} />
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={colors.background.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Ionicons
              name={flashOn ? 'flash' : 'flash-outline'}
              size={24}
              color={flashOn ? NUQTA_COLORS.primary : colors.background.primary}
            />
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={onManualEntry}>
            <Ionicons name="keypad-outline" size={24} color={colors.background.primary} />
          </Pressable>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>Scan any store QR code to pay</Text>
          <View style={styles.infoDivider} />
          <View style={styles.infoIcons}>
            <View style={[styles.paymentIcon, { backgroundColor: NUQTA_COLORS.primary }]}>
              <Text style={styles.paymentIconText}>R</Text>
            </View>
            <Text style={styles.infoSubtext}>{BRAND.PAY_NAME}</Text>
          </View>
        </View>

        {/* Security Badges */}
        <View style={styles.securityRow}>
          <View style={styles.brandBadge}>
            <View style={styles.rezLogo}>
              <Text style={styles.rezLogoText}>{BRAND.APP_NAME}</Text>
            </View>
          </View>

          <View style={styles.securityBadges}>
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={14} color={NUQTA_COLORS.primary} />
              <View>
                <Text style={styles.badgeTitle}>PCI DSS</Text>
                <Text style={styles.badgeSubtitle}>COMPLIANT</Text>
              </View>
            </View>
            <View style={styles.securityBadge}>
              <Ionicons name="globe-outline" size={14} color={NUQTA_COLORS.primary} />
              <View>
                <Text style={styles.badgeTitle}>256-BIT</Text>
                <Text style={styles.badgeSubtitle}>ENCRYPTED</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUQTA_COLORS.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: NUQTA_COLORS.background,
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: colors.neutral[400],
    marginTop: 16,
  },
  permissionSubtext: {
    fontSize: 15,
    color: colors.neutral[400],
    marginBottom: 32,
  },
  grantButton: {
    backgroundColor: NUQTA_COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 16,
  },
  grantButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    color: colors.neutral[400],
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  promoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  promoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: NUQTA_COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoIconText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.background.primary,
  },
  promoText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  promoSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderColor: NUQTA_COLORS.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: NUQTA_COLORS.primary,
    borderRadius: 2,
    shadowColor: NUQTA_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  scannerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  errorBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 180 : 160,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    zIndex: 30,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.background.primary,
    flex: 1,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
    marginBottom: 24,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  infoDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentIconText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.background.primary,
  },
  infoSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rezLogo: {
    backgroundColor: NUQTA_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rezLogoText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background.primary,
  },
  securityBadges: {
    flexDirection: 'row',
    gap: 16,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  badgeSubtitle: {
    fontSize: 7,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
  },
});

export default React.memo(QRScanner);
