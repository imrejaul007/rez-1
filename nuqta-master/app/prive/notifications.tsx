import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList,
  RefreshControl, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { Colors } from '@/constants/DesignSystem';
import { PriveEmptyState } from '@/components/prive/PriveEmptyState';
import priveApi from '@/services/priveApi';
import { NotificationListSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { catchAndReport } from '@/utils/catchAndReport';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  urgency: 'critical' | 'warning' | 'info';
  daysRemaining?: number;
  deepLink?: string;
}

function NotificationsScreen() {
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await priveApi.getNotifications();
      if (response.success && response.data) {
        setNotifications(response.data.notifications || []);
        setCounts(response.data.counts || { critical: 0, warning: 0, info: 0 });
      }
    } catch (e) { catchAndReport(e, setError, 'Notifications/fetchData'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  const isMounted = useIsMounted();
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchData();
  }, [fetchData, isAuthenticated, authLoading]);
  const onRefresh = () => { setIsRefreshing(true); fetchData(); };

  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'critical') return PRIVE_COLORS.status.error;
    if (urgency === 'warning') return PRIVE_COLORS.status.warning;
    return PRIVE_COLORS.status.info;
  };

  const getUrgencyIcon = (type: string) => {
    const icons: Record<string, string> = {
      voucher_expiry: '🎫',
      offer_expiry: '🏷️',
      mission_deadline: '🎯',
      tier_risk: '📊',
      invite_expiry: '✉️',
    };
    return icons[type] || '🔔';
  };

  const renderNotificationItem = useCallback(({ item }: { item: NotificationItem }) => (
    <Pressable
      style={styles.notifCard}
      onPress={() => item.deepLink && router.push(item.deepLink as any)}
    >
      <Text style={styles.notifIcon}>{getUrgencyIcon(item.type)}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.notifMessage}>{item.message}</Text>
      </View>
      <View style={styles.notifRight}>
        {item.daysRemaining != null && (
          <Text style={[styles.countdown, { color: getUrgencyColor(item.urgency) }]}>
            {item.daysRemaining <= 0 ? 'Today' : `${item.daysRemaining}d`}
          </Text>
        )}
        {item.deepLink && <Text style={styles.arrow}>→</Text>}
      </View>
    </Pressable>
  ), [router]);

  // Group by urgency timing
  const groupNotifications = () => {
    const today: NotificationItem[] = [];
    const thisWeek: NotificationItem[] = [];
    const later: NotificationItem[] = [];

    notifications.forEach(n => {
      if (n.daysRemaining != null && n.daysRemaining <= 1) today.push(n);
      else if (n.daysRemaining != null && n.daysRemaining <= 7) thisWeek.push(n);
      else later.push(n);
    });

    const sections = [];
    if (today.length > 0) sections.push({ title: 'Expiring Today', data: today });
    if (thisWeek.length > 0) sections.push({ title: 'This Week', data: thisWeek });
    if (later.length > 0) sections.push({ title: 'Later', data: later });
    return sections;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <NotificationListSkeleton />
      </View>
    );
  }

  const sections = groupNotifications();

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />

      {/* Urgency Banner */}
      {counts.critical > 0 && (
        <View style={styles.urgencyBanner}>
          <Text style={styles.urgencyText}>
            {counts.critical} item{counts.critical > 1 ? 's' : ''} expiring within 24 hours
          </Text>
        </View>
      )}

      {notifications.length === 0 ? (
        <PriveEmptyState icon="🔔" title="All clear!" subtitle="No expiring items or alerts right now" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIVE_COLORS.gold.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  urgencyBanner: {
    backgroundColor: 'rgba(239, 83, 80, 0.15)',
    paddingVertical: PRIVE_SPACING.md,
    paddingHorizontal: PRIVE_SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 83, 80, 0.3)',
  },
  urgencyText: { fontSize: 13, fontWeight: '600', color: PRIVE_COLORS.status.error, textAlign: 'center' },
  listContent: { paddingHorizontal: PRIVE_SPACING.xl, paddingBottom: 120 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIVE_COLORS.text.secondary,
    marginTop: PRIVE_SPACING.xl,
    marginBottom: PRIVE_SPACING.md,
    letterSpacing: 0.5,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  notifIcon: { fontSize: 24 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: PRIVE_COLORS.text.primary },
  notifMessage: { fontSize: 12, color: PRIVE_COLORS.text.tertiary, marginTop: 2 },
  notifRight: { alignItems: 'flex-end', gap: 4 },
  countdown: { fontSize: 13, fontWeight: '700' },
  arrow: { fontSize: 16, color: PRIVE_COLORS.gold.primary },
});

export default withErrorBoundary(NotificationsScreen, 'PriveNotifications');
