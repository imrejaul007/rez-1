// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Pay In Store - Enter Amount Screen
 *
 * Dark themed screen with:
 * - Store header with name and location
 * - Distance warning banner
 * - Bill amount input with custom keypad
 * - EMI plans banner
 * - Available offers section
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { EnterAmountParams, StorePaymentInfo, StorePaymentOffer, OffersResponse } from '@/types/storePayment.types';
import apiClient from '@/services/apiClient';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated, useRegionState } from '@/stores/selectors';
import { showToast } from '@/components/common/ToastManager';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function EnterAmountScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<EnterAmountParams>();
  const { storeId, storeName, storeLogo } = params;
  const getCurrencySymbol = useGetCurrencySymbol();
  const regionState = useRegionState();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  // EMI threshold varies by region (INR 4000 ≈ AED 180 ≈ CNY 3500)
  const emiThreshold = regionState.regionConfig?.currency === 'INR' ? 4000
    : regionState.regionConfig?.currency === 'AED' ? 180
    : regionState.regionConfig?.currency === 'CNY' ? 3500
    : 4000;

  const [amount, setAmount] = useState('0');
  const [store, setStore] = useState<StorePaymentInfo | null>(null);
  const [offers, setOffers] = useState<StorePaymentOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadStoreDetails();
    getUserLocation();
  }, [storeId, authLoading, isAuthenticated]);

  // Load offers when store is loaded
  useEffect(() => {
    if (store && !authLoading && isAuthenticated) {
      loadOffers();
    }
  }, [store, authLoading, isAuthenticated]);

  // Calculate distance when both user location and store coordinates are available
  useEffect(() => {
    if (userLocation && store?.location?.coordinates) {
      const [storeLng, storeLat] = store.location.coordinates;
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        storeLat,
        storeLng
      );
      setDistance(dist);
    }
  }, [userLocation, store]);

  // Get user's current location
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      if (!isMounted()) return;
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err) {
      // silently handle
    }
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Format distance for display
  const formatDistance = (dist: number): string => {
    if (dist < 1) {
      return `${Math.round(dist * 1000)} m`;
    }
    return `${dist.toFixed(1)} km`;
  };

  const loadStoreDetails = async () => {
    if (!storeId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setStoreError(null);
      const response = await apiClient.get<{ store: StorePaymentInfo }>(`/stores/${storeId}`);
      if (response.success && response.data?.store) {
        if (!isMounted()) return;
        setStore(response.data.store);
      } else {
        if (!isMounted()) return;
        setStoreError('Failed to load store details');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setStoreError(err.message || 'Failed to load store details. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const loadOffers = async () => {
    if (!storeId) return;

    try {
      setIsLoadingOffers(true);
      const response = await apiClient.get<OffersResponse>(`/store-payment/offers/${storeId}`, { amount: numericAmount || 0 });

      if (response.success && response.data) {
        const offersData = response.data;
        // Combine all offers for preview
        const allOffers = [
          ...(offersData.storeOffers || []),
          ...(offersData.bankOffers || []),
          ...(offersData.rezOffers || []),
        ].slice(0, 4); // Show max 4 offers in preview
        if (!isMounted()) return;
        setOffers(allOffers);
      }
    } catch (err: any) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoadingOffers(false);
    }
  };

  const handleKeyPress = useCallback((key: string) => {
    if (key === 'backspace') {
      setAmount(prev => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
    } else if (key === '.') {
      setAmount(prev => {
        if (prev.includes('.')) return prev;
        return prev + '.';
      });
    } else {
      setAmount(prev => {
        if (prev === '0' && key !== '.') return key;
        if (prev.includes('.') && prev.split('.')[1]?.length >= 2) return prev;
        if (prev.length >= 8) return prev;
        return prev + key;
      });
    }
  }, []);

  const numericAmount = parseFloat(amount) || 0;

  // Coin earning forecast (F-08)
  const forecastCoins = useMemo(() => {
    if (!numericAmount || numericAmount < 1) return 0;
    const cashbackPct = store?.rewardRules?.baseCashbackPercent ?? 0;
    if (!cashbackPct) return 0;
    return Math.floor(numericAmount * (cashbackPct / 100));
  }, [numericAmount, store?.rewardRules?.baseCashbackPercent]);

  const handleProceed = () => {
    if (numericAmount <= 0) return;

    router.push({
      pathname: '/pay-in-store/offers',
      params: {
        storeId,
        storeName,
        storeLogo: storeLogo || store?.logo || '',
        amount: numericAmount.toString(),
      },
    });
  };

  const formatDisplayAmount = (val: string) => {
    const num = parseFloat(val) || 0;
    if (val.includes('.')) {
      const parts = val.split('.');
      return parts[0] + '.' + (parts[1] || '').padEnd(2, '0').slice(0, 2);
    }
    return num.toFixed(2);
  };

  // Build store address from location data
  const getStoreAddress = () => {
    if (!store) {
      return '';
    }

    // Try location object first
    if (store.location) {
      const { address, city, state, pincode } = store.location;
      const parts = [address, city, state, pincode].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }

    // Fallback to address object if exists
    if ((store as any).address) {
      const addr = (store as any).address;
      if (typeof addr === 'string') return addr;
      const parts = [addr.street, addr.city, addr.state, addr.formattedAddress].filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1]; // Use formattedAddress if available
    }

    return '';
  };

  const storeAddress = getStoreAddress() || (isLoading ? 'Loading...' : '');
  const displayStoreName = storeName || store?.name || 'Store';

  // Get offer icon based on type
  const getOfferIcon = (offer: StorePaymentOffer): string => {
    switch (offer.type) {
      case 'FLAT_OFF':
        return 'tag-outline';
      case 'PERCENTAGE_OFF':
      case 'CASHBACK':
        return 'percent';
      case 'BONUS_COINS':
        return 'star-outline';
      default:
        return 'pricetag-outline';
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="chevron-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.storeName} numberOfLines={1}>{displayStoreName}</Text>
            <Text style={styles.storeAddress} numberOfLines={1}>{storeAddress}</Text>
          </View>
        </View>

        {/* Distance Warning Banner - Only show if user is far from store (> 500m) */}
        {distance !== null && distance > 0.5 && (
          <View style={styles.distanceWarning}>
            <Text style={styles.distanceText}>
              You're <Text style={styles.distanceBold}>{formatDistance(distance)}</Text> away from this store
            </Text>
            <Text style={styles.distanceSubtext}>Please ensure you're paying at the correct store</Text>
          </View>
        )}

        {/* Store Error */}
        {storeError && (
          <View style={styles.storeErrorContainer}>
            <Ionicons name="alert-circle" size={24} color={Colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.storeErrorTitle}>Unable to load store</Text>
              <Text style={styles.storeErrorText}>{storeError}</Text>
            </View>
            <Pressable style={styles.retryButton} onPress={loadStoreDetails}>
              <Ionicons name="refresh" size={18} color={Colors.text.inverse} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Amount Section */}
          <Text style={styles.amountLabel}>Enter your bill amount</Text>

          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
            <Text style={styles.amountDisplay}>{formatDisplayAmount(amount)}</Text>
          </View>

          {/* Coin earning forecast */}
          {forecastCoins > 0 && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(255,205,87,0.15)', borderRadius: 8,
              paddingHorizontal: 12, paddingVertical: 6, marginTop: 8,
            }}>
              <Text style={{ fontSize: 16 }}>🪙</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>
                You'll earn ~{forecastCoins} REZ coins
              </Text>
            </View>
          )}

          {/* EMI Banner - Nile Blue to Mustard */}
          <LinearGradient
            colors={[Colors.nileBlue, Colors.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emiBanner}
          >
            <View style={styles.emiIconContainer}>
              <Text style={styles.emiIconText}>0%</Text>
            </View>
            <View style={styles.emiContent}>
              <Text style={styles.emiTitle}>No Cost EMI plans available</Text>
              <Text style={styles.emiSubtitle}>above {currencySymbol}{emiThreshold}</Text>
            </View>
            <Pressable onPress={() => {
              showToast({
                message: `No Cost EMI available on bills above ${currencySymbol}${emiThreshold}. Split your payment into easy monthly installments at 0% interest.`,
                type: 'info',
                duration: 5000,
              });
            }}>
              <Text style={styles.knowMoreText}>Know more</Text>
            </Pressable>
          </LinearGradient>

          {/* Available Offers Section */}
          <Text style={styles.offersTitle}>Available Offers</Text>

          {isLoadingOffers ? (
            <View style={styles.offersLoading}>
              <ActivityIndicator size="small" color={Colors.gold} />
            </View>
          ) : offers.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offersContainer}
            >
              {offers.map((offer) => (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerIconContainer}>
                    <Ionicons
                      name={getOfferIcon(offer) as any}
                      size={20}
                      color={Colors.gold}
                    />
                  </View>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <Text style={styles.offerDescription} numberOfLines={2}>{offer.description}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noOffers}>
              <Text style={styles.noOffersText}>No offers available</Text>
            </View>
          )}
        </ScrollView>

        {/* Proceed Button */}
        <View style={styles.proceedContainer}>
          <Pressable
            style={[
              styles.proceedButton,
              numericAmount <= 0 && styles.proceedButtonDisabled,
            ]}
            onPress={handleProceed}
            disabled={numericAmount <= 0}
          >
            <Text style={[
              styles.proceedText,
              numericAmount <= 0 && styles.proceedTextDisabled,
            ]}>
              Proceed
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={numericAmount > 0 ? Colors.nileBlue : Colors.text.tertiary}
            />
          </Pressable>
        </View>

        {/* Custom Number Keypad */}
        <View style={styles.keypadContainer}>
          <View style={styles.keypadRow}>
            {['1', '2', '3'].map((key) => (
              <Pressable
                key={key}
                style={styles.keypadButton}
                onPress={() => handleKeyPress(key)}
              >
                <Text style={styles.keypadText}>{key}</Text>
                {key !== '1' && (
                  <Text style={styles.keypadSubText}>
                    {key === '2' ? 'ABC' : 'DEF'}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {['4', '5', '6'].map((key) => (
              <Pressable
                key={key}
                style={styles.keypadButton}
                onPress={() => handleKeyPress(key)}
              >
                <Text style={styles.keypadText}>{key}</Text>
                <Text style={styles.keypadSubText}>
                  {key === '4' ? 'GHI' : key === '5' ? 'JKL' : 'MNO'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {['7', '8', '9'].map((key) => (
              <Pressable
                key={key}
                style={styles.keypadButton}
                onPress={() => handleKeyPress(key)}
              >
                <Text style={styles.keypadText}>{key}</Text>
                <Text style={styles.keypadSubText}>
                  {key === '7' ? 'PQRS' : key === '8' ? 'TUV' : 'WXYZ'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.keypadRow}>
            <Pressable
              style={styles.keypadButton}
              onPress={() => handleKeyPress('.')}
            >
              <Text style={styles.keypadText}>.</Text>
            </Pressable>
            <Pressable
              style={styles.keypadButton}
              onPress={() => handleKeyPress('0')}
            >
              <Text style={styles.keypadText}>0</Text>
            </Pressable>
            <Pressable
              style={styles.keypadButton}
              onPress={() => handleKeyPress('backspace')}
            >
              <Ionicons name="backspace-outline" size={22} color={Colors.text.primary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  storeName: {
    ...Typography.h3,
    color: Colors.nileBlue,
  },
  storeAddress: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  distanceWarning: {
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: colors.brand.goldWarm,
  },
  distanceText: {
    ...Typography.body,
    color: colors.brand.amberDark,
  },
  distanceBold: {
    fontWeight: '700',
  },
  distanceSubtext: {
    ...Typography.caption,
    color: colors.brand.amberDeep,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 120,
  },
  amountLabel: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.base,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.gold,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.gold,
    marginRight: Spacing.xs,
  },
  amountDisplay: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  emiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    marginBottom: Spacing.xl,
  },
  emiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emiIconText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  emiContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  emiTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  emiSubtitle: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  knowMoreText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
    textDecorationLine: 'underline',
  },
  offersTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  offersContainer: {
    paddingRight: Spacing.base,
    gap: Spacing.md,
  },
  offerCard: {
    width: SCREEN_WIDTH * 0.55,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Shadows.subtle,
  },
  offerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  offerDescription: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    lineHeight: 16,
  },
  offersLoading: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noOffers: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  noOffersText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  storeErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorScale[50],
    padding: 14,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.errorScale[200],
  },
  storeErrorTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.error,
  },
  storeErrorText: {
    ...Typography.caption,
    color: '#991B1B',
    marginTop: 2,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  retryButtonText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  proceedContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    ...Shadows.medium,
  },
  proceedButtonDisabled: {
    backgroundColor: Colors.border.default,
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  proceedTextDisabled: {
    color: Colors.text.tertiary,
  },
  keypadContainer: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? Spacing.base : Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 5,
  },
  keypadButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 3,
    backgroundColor: Colors.background.primary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  keypadText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  keypadSubText: {
    fontSize: 8,
    color: Colors.text.tertiary,
    marginTop: 1,
    letterSpacing: 1,
  },
});

export default withErrorBoundary(EnterAmountScreen, 'PayInStoreEnterAmount');
