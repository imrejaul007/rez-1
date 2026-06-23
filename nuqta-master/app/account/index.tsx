import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Account Settings Page — Redesigned
// Compact header, sticky segmented control, sectioned cards, dynamic insights,
// micro-interactions, skeleton loading, and production-ready design tokens.

import React, { useState,  useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import AccountTabs from '@/components/account/AccountTabs';
import SettingsItem from '@/components/account/SettingsItem';
import AccountSkeleton from '@/components/account/AccountSkeleton';
import useAccountData from '@/hooks/useAccountData';
import { useRezBalance } from '@/stores';
import {
  AccountTabType,
  AccountSettingsCategory,
  AccountSection } from '@/types/account.types';
import { accountTabs } from '@/data/accountData';
import {
  Colors,
  Spacing,
  BorderRadius } from '@/constants/DesignSystem';
import analyticsService from '@/services/analyticsService';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useUserIdentityStore, IdentitySegment } from '@/stores/userIdentityStore';

// ---------------------------------------------------------------------------
// Section Card Component (memoized)
// ---------------------------------------------------------------------------

const SectionCard = React.memo(function SectionCard({
  section,
  onItemPress }: {
  section: AccountSection;
  onItemPress: (cat: AccountSettingsCategory) => void;
}) {
  return (
    <View style={styles.sectionContainer}>
      <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
      <View style={styles.sectionCard}>
        {section.items.map((item, idx) => (
          <SettingsItem
            key={item.id}
            category={item}
            onPress={onItemPress}
            isLast={idx === section.items.length - 1}
          />
        ))}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Main Account Page
// ---------------------------------------------------------------------------

function AccountPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<AccountTabType>('SETTINGS');
  const fadeAnim = useSharedValue(1);
  const fadeAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const { sections, loading, error, refreshing, refresh } =
    useAccountData(activeTab);

  const { segment, featureLevel, verificationSegment, statedIdentity } = useUserIdentityStore();
  // Wallet context for dynamic insights
  const rezBalance = useRezBalance();

  // Inject dynamic insights into sections
  const enrichedSections = useMemo(() => {
    if (!sections.length) return sections;
    return sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.id === 'wallet' && rezBalance > 0) {
          return {
            ...item,
            insight: `${BRAND.CURRENCY_CODE} ${rezBalance.toLocaleString()} available` };
        }
        return item;
      }) }));
  }, [sections, rezBalance]);

  // ---------- Handlers ----------

  const handleBackPress = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handleTabChange = useCallback(
    (tab: AccountTabType) => {
      if (tab === activeTab) return;
      analyticsService.track('account_tab_changed', { tab });

      // Fade out → switch → fade in
      fadeAnim.value = withTiming(0, { duration: 80 }, (finished) => {
        if (finished) {
          runOnJS(setActiveTab)(tab);
          fadeAnim.value = withTiming(1, { duration: 180 });
        }
      });
    },
    [activeTab, fadeAnim]
  );

  const handleCategoryPress = useCallback(
    (category: AccountSettingsCategory) => {
      analyticsService.track('account_category_pressed', {
        categoryId: category.id,
        tab: activeTab });

      switch (category.id) {
        case 'subscription':
          router.push('/subscription/manage');
          break;
        case 'delivery':
          router.push('/account/delivery');
          break;
        case 'payment':
          router.push('/account/payment');
          break;
        case 'wallet':
          router.push('/wallet');
          break;
        case 'voucher':
          router.push('/my-vouchers');
          break;
        case 'my_deals':
          router.push('/my-deals');
          break;
        case 'coupon':
          router.push('/account/coupons');
          break;
        case 'bill_upload':
          router.push('/bill-upload');
          break;
        case 'achievements':
          router.push('/profile/achievements');
          break;
        default:
          if (category.route) {
            router.push(category.route as any);
          }
          break;
      }
    },
    [activeTab, router]
  );

  // ---------- Render ----------

  const totalSections = enrichedSections.reduce(
    (sum, s) => sum + s.items.length,
    0
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.secondary[600]}
        translucent={true}
      />

      {/* Compact Gradient Header */}
      <LinearGradient
        colors={[Colors.secondary[600], Colors.secondary[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackPress}
           
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={colors.background.primary} />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Account</ThemedText>

          <Pressable
            style={styles.headerAction}
            onPress={() => router.push('/account/settings')}
           
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={20} color={colors.background.primary} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Sticky Segmented Control */}
      <View style={styles.tabsWrapper}>
        <AccountTabs
          tabs={accountTabs.map((tab) => ({
            ...tab,
            isActive: tab.id === activeTab }))}
          activeTab={activeTab}
          onTabPress={handleTabChange}
        />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.primary[500]}
            colors={[Colors.primary[500]]}
          />
        }
      >
        <Animated.View style={fadeAnimStyle}>
          {/* Loading State */}
          {loading && <AccountSkeleton />}

          {/* Error State */}
          {!loading && error && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconBg}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={32}
                  color={Colors.gray[400]}
                />
              </View>
              <ThemedText style={styles.errorTitle}>
                Something went wrong
              </ThemedText>
              <ThemedText style={styles.errorMessage}>{error}</ThemedText>
              <Pressable style={styles.retryButton} onPress={refresh}>
                <ThemedText style={styles.retryText}>Try Again</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Empty State */}
          {!loading && !error && totalSections === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="folder-open-outline"
                size={44}
                color={Colors.gray[400]}
              />
              <ThemedText style={styles.emptyText}>
                No items in this section
              </ThemedText>
            </View>
          )}

          {/* Identity Verification Section */}
          {!loading && activeTab === 'SETTINGS' && (() => {
            const SEGMENT_LABELS: Partial<Record<IdentitySegment, string>> = {
              verified_student: 'Student', verified_employee: 'Employee', verified_healthcare: 'Healthcare',
              verified_defence: 'Defence', verified_teacher: 'Teacher', verified_senior: 'Senior',
              verified_government: 'Government', verified_differentlyAbled: 'Accessibility',
            };
            const SEGMENT_ROUTES: Partial<Record<IdentitySegment, string>> = {
              verified_student: '/offers/student', verified_employee: '/offers/corporate',
              verified_healthcare: '/offers/zones/healthcare', verified_defence: '/offers/zones/defence',
              verified_teacher: '/offers/zones/teacher', verified_senior: '/offers/zones/senior',
              verified_government: '/offers/zones/government',
            };
            const verifiedLabel = SEGMENT_LABELS[segment];
            const isVerified = segment !== 'normal' && verifiedLabel;
            const isProvisional = verificationSegment === 'provisional';
            const needsVerification = segment === 'normal' && statedIdentity && statedIdentity !== 'general';

            if (!isVerified && !isProvisional && !needsVerification) return null;

            return (
              <View style={{ marginBottom: 16, paddingHorizontal: 16 }}>
                <Pressable
                  onPress={() => {
                    if (isVerified) {
                      const route = SEGMENT_ROUTES[segment];
                      if (route) router.push(route as any);
                    } else {
                      router.push('/onboarding/identity-select' as any);
                    }
                  }}
                  style={{
                    backgroundColor: isVerified ? '#ECFDF5' : isProvisional ? '#FFF7ED' : '#F0F9FF',
                    borderRadius: 14,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: isVerified ? '#A7F3D0' : isProvisional ? '#FED7AA' : '#BAE6FD',
                  }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: isVerified ? '#D1FAE5' : isProvisional ? '#FFEDD5' : '#E0F2FE',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Ionicons
                      name={isVerified ? 'checkmark-circle' : isProvisional ? 'time-outline' : 'lock-open-outline'}
                      size={22}
                      color={isVerified ? '#059669' : isProvisional ? '#EA580C' : '#0284C7'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
                      {isVerified
                        ? `${verifiedLabel} Verified`
                        : isProvisional
                          ? 'Verification in review'
                          : 'Verify your identity'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#6B7280' }}>
                      {isVerified
                        ? 'Your exclusive benefits are active'
                        : isProvisional
                          ? 'Usually takes 2-4 hours'
                          : 'Unlock exclusive student, corporate & healthcare offers'}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={isVerified ? '#059669' : '#9CA3AF'} />
                </Pressable>

                {/* Feature Level Progress */}
                {featureLevel < 5 && (
                  <View style={{ marginTop: 10, backgroundColor: colors.background.primary, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '600', color: '#6B7280' }}>Level {featureLevel} of 5</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: '#9CA3AF' }}>{Math.round((featureLevel / 5) * 100)}%</ThemedText>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${(featureLevel / 5) * 100}%`, backgroundColor: '#7C3AED', borderRadius: 3 }} />
                    </View>
                    <ThemedText style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                      {featureLevel === 1 && 'Verify identity to unlock streaks + bonus zone'}
                      {featureLevel === 2 && 'Complete your first order to level up'}
                      {featureLevel === 3 && '3 orders total to unlock more personalisation'}
                      {featureLevel === 4 && '10 orders total to unlock all premium features'}
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Section Cards */}
          {!loading &&
            enrichedSections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                onItemPress={handleCategoryPress}
              />
            ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },

  // Header
  header: {
    paddingBottom: 14,
    paddingHorizontal: Spacing.base },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: -0.2 },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center' },

  // Tabs
  tabsWrapper: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm },

  // Content
  content: {
    flex: 1 },
  scrollContent: {
    paddingTop: 4 },

  // Section
  sectionContainer: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.base },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray[600],
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: 4 },
  sectionCard: {
    backgroundColor: colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.midnightNavy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } as any }) },

  // Error state
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl },
  errorIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0EDE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 6 },
  errorMessage: {
    fontSize: 14,
    color: Colors.gray[600],
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20 },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[600] },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60 },
  emptyText: {
    fontSize: 15,
    color: Colors.gray[600],
    marginTop: Spacing.md } });

export default withErrorBoundary(AccountPage, 'AccountIndex');
