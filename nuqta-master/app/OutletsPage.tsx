import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import outletsApi, { Outlet } from '@/services/outletsApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function OutletsPage() {
  const isMounted = useIsMounted();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const storeId = params.storeId as string;
  const storeName = params.storeName as string;

  useEffect(() => {
    if (storeId) {
      fetchOutlets();
    }
  }, [storeId]);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await outletsApi.getOutletsByStore(storeId);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setOutlets(response.data.outlets || []);
        if (!isMounted()) return;
        setTotalCount(response.data.total || 0);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to load outlets');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError('Unable to load outlets. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          platformAlertSimple('Error', 'Phone calling is not supported on this device');
        }
      })
      .catch((err) => {
        platformAlertSimple('Error', 'Unable to make call');
      });
  };

  const handleNavigate = (outlet: Outlet) => {
    const [lng, lat] = outlet.location.coordinates;
    const label = encodeURIComponent(outlet.name);
    let url = '';
    if (Platform.OS === 'ios') {
      url = `maps:0,0?q=${label}@${lat},${lng}`;
    } else {
      url = `geo:0,0?q=${lat},${lng}(${label})`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((err) => {
        platformAlertSimple('Error', 'Unable to open maps');
      });
  };

  const getCurrentDayHours = (outlet: Outlet) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    const dayName = days[today];

    const hours = outlet.openingHours?.find(
      (h) => h.day.toLowerCase() === dayName
    );

    if (!hours || hours.isClosed) return { isOpen: false, text: 'Closed today' };

    // Check if currently open
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const isOpen = currentTime >= hours.open && currentTime <= hours.close;

    return {
      isOpen,
      text: `${hours.open} - ${hours.close}`,
      opensAt: hours.open,
      closesAt: hours.close
    };
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${suffix}`;
  };

  // Render Header
  const renderHeader = () => (
    <LinearGradient
      colors={[colors.successScale[400], colors.successScale[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {storeName ? `${storeName}` : 'Store Outlets'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {totalCount} {totalCount === 1 ? 'Location' : 'Locations'} Available
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.locationIconBg}>
            <Ionicons name="location" size={20} color={colors.successScale[400]} />
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  // Render Outlet Card
  const renderOutletCard = (outlet: Outlet, index: number) => {
    const hoursInfo = getCurrentDayHours(outlet);

    return (
      <View key={outlet._id} style={styles.outletCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.outletIconContainer}>
            <LinearGradient
              colors={[colors.successScale[400], colors.successScale[700]]}
              style={styles.outletIconGradient}
            >
              <Ionicons name="storefront" size={24} color={colors.background.primary} />
            </LinearGradient>
          </View>
          <View style={styles.outletHeaderInfo}>
            <Text style={styles.outletName} numberOfLines={1}>{outlet.name}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: hoursInfo.isOpen ? colors.tint.greenLight : colors.errorScale[50] }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: hoursInfo.isOpen ? colors.successScale[400] : colors.error }
              ]} />
              <Text style={[
                styles.statusText,
                { color: hoursInfo.isOpen ? colors.successScale[400] : colors.error }
              ]}>
                {hoursInfo.isOpen ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          </View>
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Address */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <Ionicons name="location-outline" size={16} color={colors.successScale[400]} />
            </View>
            <Text style={styles.infoText} numberOfLines={2}>{outlet.address}</Text>
          </View>

          {/* Phone */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <Ionicons name="call-outline" size={16} color={colors.infoScale[400]} />
            </View>
            <Text style={styles.infoText}>{outlet.phone}</Text>
          </View>

          {/* Hours */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBg}>
              <Ionicons name="time-outline" size={16} color={colors.warningScale[400]} />
            </View>
            <View style={styles.hoursContainer}>
              <Text style={styles.hoursLabel}>Today's Hours:</Text>
              <Text style={[
                styles.hoursValue,
                { color: hoursInfo.isOpen ? colors.successScale[400] : colors.error }
              ]}>
                {hoursInfo.text === 'Closed today'
                  ? hoursInfo.text
                  : `${formatTime(hoursInfo.opensAt || '09:00')} - ${formatTime(hoursInfo.closesAt || '21:00')}`
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.callButton}
            onPress={() => handleCall(outlet.phone)}
           
          >
            <LinearGradient
              colors={[colors.successScale[400], colors.successScale[700]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.callButtonGradient}
            >
              <Ionicons name="call" size={18} color={colors.background.primary} />
              <Text style={styles.callButtonText}>Call Now</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.navigateButton}
            onPress={() => handleNavigate(outlet)}
           
          >
            <Ionicons name="navigate" size={18} color={colors.successScale[400]} />
            <Text style={styles.navigateButtonText}>Get Directions</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <CardGridSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <View style={styles.errorContainer}>
          <View style={styles.errorIconBg}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchOutlets}>
            <LinearGradient
              colors={[colors.successScale[400], colors.successScale[700]]}
              style={styles.retryButtonGradient}
            >
              <Ionicons name="refresh" size={20} color={colors.background.primary} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}

      <FlatList
        data={outlets}
        keyExtractor={(item) => item._id}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => renderOutletCard(item, index)}
        ListHeaderComponent={
          outlets.length > 0 ? (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={[colors.successScale[400], colors.successScale[700]]}
                  style={styles.statIconBg}
                >
                  <Ionicons name="location" size={18} color={colors.background.primary} />
                </LinearGradient>
                <Text style={styles.statValue}>{totalCount}</Text>
                <Text style={styles.statLabel}>Outlets</Text>
              </View>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={[colors.infoScale[400], '#1D4ED8']}
                  style={styles.statIconBg}
                >
                  <Ionicons name="checkmark-circle" size={18} color={colors.background.primary} />
                </LinearGradient>
                <Text style={styles.statValue}>
                  {outlets.filter(o => getCurrentDayHours(o).isOpen).length}
                </Text>
                <Text style={styles.statLabel}>Open Now</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[colors.tint.green, '#A7F3D0']}
              style={styles.emptyIconBg}
            >
              <Ionicons name="location-outline" size={56} color={colors.successScale[400]} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Outlets Found</Text>
            <Text style={styles.emptyText}>
              This store doesn't have any outlet locations listed yet. Please check back later.
            </Text>
            <Pressable
              style={styles.backToStoreButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            >
              <Ionicons name="arrow-back" size={18} color={colors.successScale[400]} />
              <Text style={styles.backToStoreText}>Back to Store</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  headerRight: {
    marginLeft: Spacing.md,
  },
  locationIconBg: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  errorIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.errorScale[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 10,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  backToStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successScale[100],
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: 14,
    gap: Spacing.sm,
  },
  backToStoreText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
  },

  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
    marginTop: 2,
  },

  // Outlet Card
  outletCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outletIconContainer: {
    marginRight: 14,
  },
  outletIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outletHeaderInfo: {
    flex: 1,
  },
  outletName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background.secondary,
    marginVertical: Spacing.base,
  },
  infoSection: {
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 20,
    paddingTop: 5,
  },
  hoursContainer: {
    flex: 1,
    paddingTop: 5,
  },
  hoursLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  hoursValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  callButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  callButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  callButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  navigateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successScale[100],
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  navigateButtonText: {
    color: Colors.success,
    ...Typography.body,
    fontWeight: '600',
  },
});

export default withErrorBoundary(OutletsPage, 'OutletsPage');
