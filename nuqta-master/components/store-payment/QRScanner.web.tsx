// @ts-nocheck
/**
 * QR Scanner Component - Web
 *
 * Premium QR scanner UI for web with:
 * - Live camera feed with QR detection using jsQR
 * - Dark themed camera-style background
 * - Promo banner showing rewards
 * - Animated scan frame
 * - Manual code entry fallback
 * - Security badges
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import jsQR from 'jsqr';
import { QRCodeData } from '@/types/storePayment.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCANNER_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);

// Nuqta Brand Colors
const NUQTA_COLORS = {
  primary: colors.lightMustard,
  primaryGlow: 'rgba(255, 205, 87, 0.5)',
  orange: colors.brand.orange,
  navy: colors.brand.navyDark,
  background: '#18181B',
  surface: '#27272A',
  border: 'rgba(255, 255, 255, 0.1)',
};

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onClose: () => void;
  onManualEntry?: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasWebcam, setHasWebcam] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'no-detector' | 'detected'>('idle');
  const isMounted = useIsMounted();
  const scanLineAnim = useSharedValue(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasScannedRef = useRef(false);

  // Check webcam availability and auto-start camera
  useEffect(() => {
    checkWebcamAndStart();

    // Animate scan line
    scanLineAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500 }),
        withTiming(0, { duration: 0 })
      ),
      -1
    );

    return () => {
      stopScanning();
    };
  }, []);

  const checkWebcamAndStart = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setShowManualEntry(true);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some((d) => d.kind === 'videoinput');
      if (!isMounted()) return;
      setHasWebcam(hasCamera);

      if (hasCamera) {
        // Auto-start camera
        startScanning();
      } else {
        if (!isMounted()) return;
        setShowManualEntry(true);
      }
    } catch {
      setHasWebcam(false);
      setShowManualEntry(true);
    }
  };

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanLineAnim.value, [0, 1], [0, SCANNER_SIZE - 4]) }],
    opacity: interpolate(scanLineAnim.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
  }));

  const startScanning = async () => {
    if (isScanning) return;

    try {
      setIsScanning(true);
      setError(null);
      hasScannedRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      // Wait for video element to be ready
      if (!isMounted()) return;
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().then(() => {
            if (!isMounted()) return;
            setCameraReady(true);
            startQRDetection();
          }).catch((err) => {
            if (!isMounted()) return;
            setError('Failed to start camera. Use manual entry.');
            setShowManualEntry(true);
          });
        }
      }, 100);
    } catch (err: any) {
      if (!isMounted()) return;
      setError('Camera access denied. Please use manual entry.');
      setIsScanning(false);
      setShowManualEntry(true);
    }
  };

  const startQRDetection = () => {
    setScannerStatus('scanning');

    // Create canvas for jsQR processing
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && !hasScannedRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (canvas && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code) {
              setScannerStatus('detected');
              handleQRCodeDetected(code.data);
            }
          }
        }
      }
    }, 150);
  };

  const handleQRCodeDetected = (data: string) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;

    try {
      // Try parsing as JSON first
      const qrData: QRCodeData = JSON.parse(data);
      if (qrData.type === 'REZ_STORE_PAYMENT' && qrData.code) {
        stopScanning();
        onScan(qrData.code);
        return;
      }
    } catch (e) {
      // Not JSON, try as plain text
    }

    // Try as plain text
    if (data.startsWith('REZ-STORE-') || data.length >= 6) {
      stopScanning();
      onScan(data);
    } else {
      hasScannedRef.current = false;
      setError(`Invalid QR code. Please scan a ${BRAND.APP_NAME} store QR.`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    canvasRef.current = null;
    setIsScanning(false);
    setCameraReady(false);
    setScannerStatus('idle');
  };

  const validateAndSubmit = () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a store code');
      return;
    }

    try {
      const qrData: QRCodeData = JSON.parse(code);
      if (qrData.type === 'REZ_STORE_PAYMENT' && qrData.code) {
        stopScanning();
        onScan(qrData.code);
        return;
      }
    } catch {}

    if (code.startsWith('REZ-STORE-') || code.length >= 6) {
      stopScanning();
      onScan(code);
    } else {
      setError('Invalid store code format');
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', NUQTA_COLORS.background, NUQTA_COLORS.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={handleClose}>
          <Ionicons name="close" size={24} color={colors.background.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan & Pay</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={() => setShowManualEntry(!showManualEntry)}
        >
          <Ionicons name={showManualEntry ? "camera" : "keypad"} size={22} color={colors.background.primary} />
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

      {/* Scanner Area */}
      <View style={styles.scannerContainer}>
        <View style={styles.scannerFrame}>
          {/* Video Element for Camera */}
          {isScanning && Platform.OS === 'web' && (
            <video
              ref={videoRef as any}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 24,
              }}
              playsInline
              muted
              autoPlay
            />
          )}

          {/* Corner Markers */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {/* Animated Scan Line */}
          {cameraReady && (
            <Animated.View
              style={[
                styles.scanLine,
                scanLineStyle,
              ]}
            />
          )}

          {/* Center Content when not scanning */}
          {!cameraReady && (
            <View style={styles.frameContent}>
              {isScanning ? (
                <>
                  <ActivityIndicator size="large" color={NUQTA_COLORS.primary} />
                  <Text style={styles.scanningText}>Starting camera...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="qr-code" size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.frameHint}>
                    {hasWebcam ? 'Tap to start camera' : 'Enter code below'}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Scanning indicator */}
        {cameraReady && (
          <Text style={styles.scanHint}>Point camera at QR code</Text>
        )}

        {/* Scanner Status Indicator */}
        {cameraReady && (
          <View style={styles.statusContainer}>
            {scannerStatus === 'scanning' && (
              <View style={[styles.statusBadge, styles.statusScanning]}>
                <Ionicons name="scan" size={16} color={colors.background.primary} />
                <Text style={styles.statusText}>Scanner Active - Looking for QR</Text>
              </View>
            )}
            {scannerStatus === 'no-detector' && (
              <View style={[styles.statusBadge, styles.statusError]}>
                <Ionicons name="warning" size={16} color={colors.background.primary} />
                <Text style={styles.statusText}>QR Detection Not Supported - Use Manual Entry</Text>
              </View>
            )}
            {scannerStatus === 'detected' && (
              <View style={[styles.statusBadge, styles.statusSuccess]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.background.primary} />
                <Text style={styles.statusText}>QR Detected!</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={colors.background.primary} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Manual Entry Section */}
      {(showManualEntry || !hasWebcam) && (
        <View style={styles.entrySection}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter store code (e.g., REZ-STORE-ABC123)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={manualCode}
              onChangeText={(t) => {
                setManualCode(t.toUpperCase());
                setError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={validateAndSubmit}
            />
          </View>

          <Pressable
            style={[styles.submitBtn, !manualCode && styles.submitBtnDisabled]}
            onPress={validateAndSubmit}
            disabled={!manualCode}
          >
            <Text style={styles.submitBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
          </Pressable>
        </View>
      )}

      {/* Camera Controls when scanning */}
      {isScanning && cameraReady && !showManualEntry && (
        <View style={styles.cameraControls}>
          <Pressable style={styles.controlBtn} onPress={() => setShowManualEntry(true)}>
            <Ionicons name="keypad" size={24} color={colors.background.primary} />
            <Text style={styles.controlBtnText}>Enter Code</Text>
          </Pressable>
        </View>
      )}

      {/* Start Camera Button when not scanning */}
      {!isScanning && hasWebcam && !showManualEntry && (
        <View style={styles.startCameraSection}>
          <Pressable style={styles.startCameraBtn} onPress={startScanning}>
            <Ionicons name="camera" size={24} color={colors.background.primary} />
            <Text style={styles.startCameraBtnText}>Start Camera</Text>
          </Pressable>
        </View>
      )}

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>{`Pay securely at any ${BRAND.APP_NAME} store`}</Text>
          <View style={styles.infoDivider} />
          <View style={styles.infoIcons}>
            <View style={[styles.paymentIcon, { backgroundColor: NUQTA_COLORS.primary }]}>
              <Text style={styles.paymentIconText}>R</Text>
            </View>
            <Text style={styles.infoSubtext}>{BRAND.PAY_NAME}</Text>
          </View>
        </View>

        <View style={styles.securityRow}>
          <View style={styles.rezLogo}>
            <Text style={styles.rezLogoText}>{BRAND.APP_NAME}</Text>
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
              <Ionicons name="lock-closed" size={14} color={NUQTA_COLORS.primary} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background.primary,
  },
  promoBanner: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  promoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: NUQTA_COLORS.border,
    gap: 10,
  },
  promoIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: NUQTA_COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoIconText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.background.primary,
  },
  promoText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  promoSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  scannerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: NUQTA_COLORS.primary,
    borderWidth: 4,
    zIndex: 10,
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
    zIndex: 10,
    shadowColor: NUQTA_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  frameContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  frameHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },
  scanningText: {
    fontSize: 14,
    color: colors.background.primary,
    marginTop: 12,
  },
  scanHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 16,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.background.primary,
    flex: 1,
  },
  entrySection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    fontSize: 15,
    color: colors.background.primary,
    backgroundColor: NUQTA_COLORS.surface,
    borderWidth: 1,
    borderColor: NUQTA_COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: NUQTA_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  controlBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  startCameraSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  startCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NUQTA_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  startCameraBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: NUQTA_COLORS.border,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  infoDivider: {
    width: 1,
    height: 14,
    backgroundColor: NUQTA_COLORS.border,
  },
  infoIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentIconText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.background.primary,
  },
  infoSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rezLogo: {
    backgroundColor: NUQTA_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rezLogoText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background.primary,
  },
  securityBadges: {
    flexDirection: 'row',
    gap: 14,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background.primary,
  },
  badgeSubtitle: {
    fontSize: 6,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
  },
  statusContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  statusScanning: {
    backgroundColor: NUQTA_COLORS.primary,
  },
  statusError: {
    backgroundColor: colors.error,
  },
  statusSuccess: {
    backgroundColor: colors.lightMustard,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background.primary,
  },
});
