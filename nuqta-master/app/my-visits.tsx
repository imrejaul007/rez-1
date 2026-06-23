import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import storeVisitApi from '@/services/storeVisitApi';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Visit {
  id: string;
  visitNumber: string;
  visitDate: string;
  visitTime: string;
  store: {
    id: string;
    name: string;
    logo?: string;
  };
  status: 'pending' | 'checked_in' | 'completed' | 'cancelled';
  visitType: 'scheduled' | 'queue';
  queueNumber?: number;
}

function MyVisitsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Wait for auth state to be loaded before checking
      if (isLoading) {
        return;
      }

      if (!isAuthenticated) {
        showAlert(
          'Login Required',
          'Please sign in to view your visits',
          [
            { text: 'Go to Login', onPress: () => router.push('/sign-in') },
            { text: 'Cancel', style: 'cancel', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)') }
          ],
          'warning'
        );
        return;
      }

      loadVisits();
    }, [isAuthenticated, isLoading])
  );

  const loadVisits = async () => {
    try {
      setLoading(true);
      const response = await storeVisitApi.getUserVisits();

      if (response.success && response.data) {
        // Transform backend data structure to match frontend interface
        const transformedVisits = response.data.map((visit: any) => ({
          id: visit.id || visit._id,
          visitNumber: visit.visitNumber,
          visitDate: visit.visitDate,
          visitTime: visit.visitTime,
          store: {
            id: visit.storeId?._id || visit.storeId?.id || visit.storeId,
            name: visit.storeId?.name || 'Unknown Store',
            logo: visit.storeId?.images?.[0] || visit.storeId?.logo
          },
          status: visit.status,
          visitType: visit.visitType || (visit.visitTime ? 'scheduled' : 'queue'),
          queueNumber: visit.queueNumber,
        }));

        if (!isMounted()) return;
        setVisits(transformedVisits);
        setError(null);
      } else {
        showAlert('Error', response.message || 'Failed to load visits', undefined, 'error');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unable to load your visits. Please try again.';
      if (!isMounted()) return;
      setError(errorMessage);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadVisits();
  };

  const handleCancelVisit = async (visitId: string) => {
    showAlert(
      'Cancel Visit',
      'Are you sure you want to cancel this visit?',
      [
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await storeVisitApi.cancelVisit(visitId);
              if (response.success) {
                showAlert('Cancelled', 'Your visit has been cancelled', undefined, 'success');
                loadVisits(); // Reload visits
              } else {
                showAlert('Error', response.message || 'Failed to cancel visit', undefined, 'error');
              }
            } catch (error) {
              showAlert('Error', 'Unable to cancel visit. Please try again.', undefined, 'error');
            }
          }
        },
        { text: 'No', style: 'cancel' }
      ],
      'warning'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return Colors.success; // Green
      case 'checked_in':
        return Colors.info; // Blue
      case 'completed':
        return Colors.text.tertiary; // Gray
      case 'cancelled':
        return Colors.error; // Red
      default:
        return colors.brand.green;
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'pending':
        return 'calendar';
      case 'checked_in':
        return 'log-in';
      case 'completed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'time';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Scheduled';
      case 'checked_in':
        return 'Checked In';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const upcomingVisits = visits.filter(v => v.status === 'pending' || v.status === 'checked_in');
  const pastVisits = visits.filter(v => v.status === 'completed' || v.status === 'cancelled');
  const displayedVisits = activeTab === 'upcoming' ? upcomingVisits : pastVisits;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <CardGridSkeleton />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[colors.brand.green, colors.brand.teal]} style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>My Visits</Text>
        <Pressable onPress={loadVisits} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="white" />
        </Pressable>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingVisits.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past ({pastVisits.length})
          </Text>
        </Pressable>
      </View>

      {/* Error State */}
      {error && !loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40 }}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.error} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.deepNavy, marginTop: 16, textAlign: 'center' }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: colors.midGray, marginTop: 8, textAlign: 'center' }}>{error}</Text>
          <Pressable
            onPress={() => { setError(null); loadVisits(); }}
            style={{ marginTop: 20, backgroundColor: '#667eea', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {/* Visits List */}
      {!error && (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.brand.green]}
            tintColor={colors.brand.green}
          />
        }
      >
        {displayedVisits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={80} color={colors.neutral[200]} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming' ? 'No Upcoming Visits' : 'No Past Visits'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'You haven\'t scheduled any store visits yet'
                : 'Your visit history will appear here'}
            </Text>
            <Pressable style={styles.browseButton} onPress={() => router.push('/(tabs)')}>
              <Ionicons name="search" size={20} color={colors.background.primary} />
              <Text style={styles.browseButtonText}>Browse Stores</Text>
            </Pressable>
          </View>
        ) : (
          displayedVisits.map((visit) => (
            <Pressable key={visit.id} onPress={() => router.push(`/store-visit?storeId=${visit.store.id}`)}>
              <View style={styles.visitCard}>
                {/* Store Info */}
                <View style={styles.storeHeader}>
                  <View style={styles.storeIconContainer}>
                    <Ionicons name="storefront" size={24} color={colors.brand.green} />
                  </View>
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>{visit.store.name}</Text>
                    <Text style={styles.visitNumber}>#{visit.visitNumber}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(visit.status)}20` }]}>
                    <Ionicons name={getStatusIcon(visit.status)} size={16} color={getStatusColor(visit.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(visit.status) }]}>
                      {getStatusLabel(visit.status)}
                    </Text>
                  </View>
                </View>

                {/* Visit Type Indicator */}
                <View style={styles.visitTypeBadgeRow}>
                  <View style={[
                    styles.visitTypeBadge,
                    { backgroundColor: visit.visitType === 'scheduled' ? colors.indigoMist : colors.tint.orange }
                  ]}>
                    <Ionicons
                      name={visit.visitType === 'scheduled' ? 'calendar' : 'people'}
                      size={14}
                      color={visit.visitType === 'scheduled' ? '#667eea' : colors.warningScale[400]}
                    />
                    <Text style={[
                      styles.visitTypeBadgeText,
                      { color: visit.visitType === 'scheduled' ? '#667eea' : colors.warningScale[400] }
                    ]}>
                      {visit.visitType === 'scheduled' ? 'Scheduled Visit' : 'Queue Visit'}
                    </Text>
                    {visit.visitType === 'queue' && visit.queueNumber != null && (
                      <View style={styles.queueNumberBadge}>
                        <Text style={styles.queueNumberText}>#{visit.queueNumber}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Visit Details */}
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.neutral[500]} />
                    <Text style={styles.detailText}>{formatDate(visit.visitDate)}</Text>
                  </View>
                  {visit.visitTime && (
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={18} color={colors.neutral[500]} />
                      <Text style={styles.detailText}>{visit.visitTime}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                {(visit.status === 'pending' || visit.status === 'checked_in') && (
                  <View style={styles.actionsContainer}>
                    <View style={styles.actionsRow}>
                      {visit.status === 'pending' && (
                        <Pressable
                          style={styles.rescheduleButton}
                          onPress={() => router.push(`/store-visit?storeId=${visit.store.id}&rescheduleVisitId=${visit.id}`)}
                        >
                          <Ionicons name="calendar-outline" size={18} color="#667eea" />
                          <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={styles.cancelButton}
                        onPress={() => handleCancelVisit(visit.id)}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                        <Text style={styles.cancelButtonText}>Cancel Visit</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      )}
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: Spacing.base,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.brand.green,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  activeTabText: {
    color: colors.brand.green,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  visitCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  storeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  storeName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  visitNumber: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  detailsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    ...Typography.body,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  actionsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
    paddingTop: Spacing.base,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    flex: 1,
  },
  rescheduleButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#667eea',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    flex: 1,
  },
  cancelButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.error,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.brand.green,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
  browseButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  visitTypeBadgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  visitTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  visitTypeBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  queueNumberBadge: {
    backgroundColor: Colors.warning,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  queueNumberText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(MyVisitsPage, 'MyVisits');
