// @ts-nocheck
/**
 * Dine-In Scan - Entry Screen
 *
 * Reuses the same QRScanner component from pay-in-store.
 * User scans the store QR on their table → resolves store → enters table number → starts ordering.
 * Also supports dine-in specific QR codes that embed table number.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRScanner from '@/components/store-payment/QRScanner';
import { ScannerPlaceholder } from '@/components/store-payment';
import apiClient from '@/services/apiClient';
import { useCartActions, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import analyticsService from '@/services/analyticsService';
import { FormPageSkeleton } from '@/components/skeletons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { errorReporter } from '@/utils/errorReporter';
import { useIsMounted } from '@/hooks/useIsMounted';
interface ResolvedStore {
  _id: string;
  name: string;
  logo?: string;
}

function DineInScanScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<{ storeId?: string; storeName?: string; table?: string }>();
  const cartActions = useCartActions();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store resolved from QR scan
  const [resolvedStore, setResolvedStore] = useState<ResolvedStore | null>(
    params.storeId ? { _id: params.storeId, name: params.storeName || 'Restaurant' } : null
  );
  const [tableNumber, setTableNumber] = useState(params.table || '');

  // If storeId came from params, skip straight to table entry
  useEffect(() => {
    if (params.storeId) {
      setResolvedStore({ _id: params.storeId, name: params.storeName || 'Restaurant' });
    }
  }, [params.storeId, params.storeName]);

  // QR scan handler — works exactly like pay-in-store:
  // receives the QR code string from the scanner, looks up the store
  const handleQRScan = useCallback(async (qrCode: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setShowScanner(false);

      // First try: if the QR data is JSON with embedded table info (dine-in specific QR)
      try {
        const parsed = JSON.parse(qrCode);
        if (parsed.type === 'REZ_DINE_IN' && parsed.storeId) {
          // Dine-in QR has store + table built in → resolve store and pre-fill table
          const storeResponse = await apiClient.get(`/store-payment/lookup/${parsed.storeId}`);
          if (storeResponse.success && storeResponse.data) {
            const store = storeResponse.data as ResolvedStore;
            setResolvedStore(store);
            if (parsed.tableNumber) {
              setTableNumber(parsed.tableNumber);
            }
            try { analyticsService.trackDineInScanCompleted({ storeId: store._id, storeName: store.name, tableNumber: parsed.tableNumber, scanMethod: 'qr_dine_in' }); } catch {} // Silent: non-critical analytics
          } else {
            // Fallback: use storeId directly
            setResolvedStore({ _id: parsed.storeId, name: parsed.storeName || 'Restaurant' });
            if (parsed.tableNumber) setTableNumber(parsed.tableNumber);
            try { analyticsService.trackDineInScanCompleted({ storeId: parsed.storeId, storeName: parsed.storeName || '', tableNumber: parsed.tableNumber, scanMethod: 'qr_dine_in' }); } catch {} // Silent: non-critical analytics
          }
          return;
        }
      } catch { // Silent: non-critical — not JSON, treat as regular store QR code
      }

      // Regular store QR code (same as pay-in-store) → look up via API
      const response = await apiClient.get(`/store-payment/lookup/${qrCode}`);
      if (response.success && response.data) {
        const store = response.data as ResolvedStore;
        setResolvedStore(store);
        try { analyticsService.trackDineInScanCompleted({ storeId: store._id, storeName: store.name, scanMethod: 'qr_store' }); } catch {} // Silent: non-critical analytics
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Store not found. Please try again.');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to find store. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  const handleManualEntry = useCallback(() => {
    setShowScanner(false);
  }, []);

  // Start dine-in session: set cart context and navigate to store menu
  const startDineIn = useCallback(() => {
    if (!resolvedStore || !tableNumber.trim()) {
      setError('Please enter your table number');
      return;
    }

    // Set dine-in context on cart
    cartActions.setDineInContext({
      storeId: resolvedStore._id,
      tableNumber: tableNumber.trim(),
      storeName: resolvedStore.name,
    });

    // Navigate to store menu for dine-in ordering
    router.replace(
      `/store/${resolvedStore._id}?dineIn=true&table=${encodeURIComponent(tableNumber.trim())}` as any
    );
  }, [resolvedStore, tableNumber, cartActions, router]);

  // Auth gate
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <FormPageSkeleton />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.gold} />
          <Text style={styles.authTitle}>Sign in Required</Text>
          <Text style={styles.authSubtitle}>Please sign in to place dine-in orders</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/sign-in')}>
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Full-screen QR scanner (same as pay-in-store)
  if (showScanner) {
    return (
      <QRScanner
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
        onManualEntry={handleManualEntry}
      />
    );
  }

  const openScanner = () => {
    try { analyticsService.trackDineInScanStarted({ storeId: params.storeId }); } catch {} // Silent: non-critical analytics
    setShowScanner(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Dine-In</Text>
          <Text style={styles.headerSubtitle}>Scan QR on your table to start ordering</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Scanner Placeholder — same component as pay-in-store */}
          {!resolvedStore && (
            <>
              <ScannerPlaceholder onPress={openScanner} />

              <Pressable
                style={styles.manualSearchButton}
                onPress={openScanner}
              >
                <Ionicons name="qr-code-outline" size={20} color={Colors.gold} />
                <Text style={styles.manualSearchText}>Scan store QR code</Text>
              </Pressable>
            </>
          )}

          {/* Loading */}
          {isLoading && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={styles.loadingText}>Finding store...</Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => setError(null)}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
              </Pressable>
            </View>
          )}

          {/* Store resolved → show store card + table number input */}
          {resolvedStore && !isLoading && (
            <View style={styles.resolvedSection}>
              {/* Store Card */}
              <View style={styles.storeCard}>
                <View style={styles.storeIconWrap}>
                  <Ionicons name="restaurant" size={28} color={Colors.nileBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeName}>{resolvedStore.name}</Text>
                  <Text style={styles.storeSubtext}>Dine-in ordering</Text>
                </View>
                <Pressable
                  style={styles.changeStoreBtn}
                  onPress={() => {
                    setResolvedStore(null);
                    setTableNumber('');
                    setError(null);
                  }}
                >
                  <Text style={styles.changeStoreText}>Change</Text>
                </Pressable>
              </View>

              {/* Table Number Input */}
              <View style={styles.tableSection}>
                <Text style={styles.tableSectionTitle}>Enter your table number</Text>
                <Text style={styles.tableSectionSub}>
                  You can find it on the table tent or receipt holder
                </Text>

                <TextInput
                  style={styles.tableInput}
                  placeholder="e.g. T1, 12, A5"
                  placeholderTextColor={Colors.text.tertiary}
                  value={tableNumber}
                  onChangeText={setTableNumber}
                  autoCapitalize="characters"
                  autoFocus={!tableNumber}
                  maxLength={20}
                />
              </View>

              {/* Start Ordering Button */}
              <Pressable
                style={[styles.startBtn, !tableNumber.trim() && styles.startBtnDisabled]}
                onPress={startDineIn}
                disabled={!tableNumber.trim()}
               
              >
                <Ionicons name="restaurant-outline" size={20} color={Colors.nileBlue} />
                <Text style={styles.startBtnText}>Start Ordering</Text>
              </Pressable>
            </View>
          )}

          {/* Illustration when no store is resolved */}
          {!resolvedStore && !isLoading && (
            <View style={styles.illustrationSection}>
              <View style={styles.illustrationCircle}>
                <Ionicons name="restaurant" size={48} color={Colors.nileBlue} />
              </View>
              <Text style={styles.illustrationTitle}>How it works</Text>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <Text style={styles.stepText}>Scan the QR code on your table</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <Text style={styles.stepText}>Enter your table number</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                <Text style={styles.stepText}>Browse menu & place your order</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
                <Text style={styles.stepText}>Food arrives at your table!</Text>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: 12 },
  authTitle: { fontSize: 22, fontWeight: '700', color: Colors.nileBlue },
  authSubtitle: { fontSize: 15, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  primaryBtn: { backgroundColor: Colors.gold, paddingHorizontal: Spacing['2xl'], paddingVertical: 14, borderRadius: BorderRadius.md, marginTop: 8 },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: Colors.nileBlue },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.background.secondary, borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  backButton: { width: 40, height: 40, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.nileBlue },
  headerSubtitle: { fontSize: 12, color: Colors.text.secondary, marginTop: 2, textAlign: 'center' },

  scrollContent: { paddingTop: 16, paddingBottom: 120 },

  manualSearchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.base, marginBottom: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.gold, backgroundColor: Colors.background.secondary, gap: 8 },
  manualSearchText: { fontSize: 15, fontWeight: '600', color: Colors.gold },

  loadingCard: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing['2xl'], alignItems: 'center', marginHorizontal: Spacing.base, gap: 12 },
  loadingText: { fontSize: 14, color: Colors.text.secondary },

  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.errorLight, padding: Spacing.md, borderRadius: BorderRadius.md, marginHorizontal: Spacing.base, marginBottom: Spacing.base, gap: 8 },
  errorText: { flex: 1, fontSize: 14, color: Colors.error },

  resolvedSection: { paddingHorizontal: 16 },

  storeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.lg, borderWidth: 1.5, borderColor: Colors.nileBlue },
  storeIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#f0f6fa', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  storeName: { fontSize: 17, fontWeight: '700', color: Colors.nileBlue },
  storeSubtext: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  changeStoreBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.sm, backgroundColor: '#f0f6fa' },
  changeStoreText: { fontSize: 13, fontWeight: '600', color: Colors.nileBlue },

  tableSection: { marginBottom: 24 },
  tableSectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.nileBlue, marginBottom: 4 },
  tableSectionSub: { fontSize: 13, color: Colors.text.secondary, marginBottom: 14 },
  tableInput: { backgroundColor: Colors.background.secondary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 18, fontSize: 18, fontWeight: '600', color: Colors.nileBlue, borderWidth: 1.5, borderColor: Colors.border.default, textAlign: 'center', letterSpacing: 1 },

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gold, paddingVertical: Spacing.base, borderRadius: 14, gap: 10 },
  startBtnDisabled: { opacity: 0.45 },
  startBtnText: { fontSize: 17, fontWeight: '700', color: Colors.nileBlue },

  illustrationSection: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 10 },
  illustrationCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f0f6fa', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  illustrationTitle: { fontSize: 18, fontWeight: '700', color: Colors.nileBlue, marginBottom: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 14, gap: 14 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 14, fontWeight: '700', color: Colors.nileBlue },
  stepText: { fontSize: 15, color: Colors.nileBlue, flex: 1 },
});

export default withErrorBoundary(DineInScanScreen, 'Dine-In Scan');
