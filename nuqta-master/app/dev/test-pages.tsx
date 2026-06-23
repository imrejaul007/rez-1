import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Test Pages Navigation
// Developer screen to test all 47 pages

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface PageLink {
  name: string;
  path: string;
  icon: string;
}

interface PageCategory {
  title: string;
  color: string;
  pages: PageLink[];
}

const PAGE_CATEGORIES: PageCategory[] = [
  {
    title: 'Legal Pages',
    color: colors.brand.indigo,
    pages: [
      { name: `About ${BRAND.APP_NAME}`, path: '/legal/about', icon: 'information-circle' },
      { name: 'Terms & Conditions', path: '/legal/terms', icon: 'document-text' },
      { name: 'Privacy Policy', path: '/legal/privacy', icon: 'shield-checkmark' },
      { name: 'Refund Policy', path: '/legal/refund-policy', icon: 'refresh-circle' },
    ],
  },
  {
    title: 'System Pages',
    color: colors.error,
    pages: [
      { name: 'App Update Required', path: '/system/app-update', icon: 'cloud-download' },
      { name: 'Maintenance', path: '/system/maintenance', icon: 'construct' },
      { name: 'Notification Permission', path: '/onboarding/notification-permission', icon: 'notifications' },
    ],
  },
  {
    title: 'Authentication',
    color: colors.successScale[400],
    pages: [
      { name: 'Account Recovery', path: '/account-recovery', icon: 'key' },
    ],
  },
  {
    title: 'Search Pages',
    color: colors.warningScale[400],
    pages: [
      { name: 'AI Search', path: '/search/ai-search', icon: 'sparkles' },
      { name: 'Nearby Hotspots', path: '/search/hotspots', icon: 'location' },
    ],
  },
  {
    title: 'Offers Pages',
    color: colors.brand.pink,
    pages: [
      { name: 'AI Recommended', path: '/offers/ai-recommended', icon: 'sparkles' },
      { name: 'Friends Redeemed', path: '/offers/friends-redeemed', icon: 'people' },
      { name: 'Double Cashback', path: '/offers/double-cashback', icon: 'flash' },
      { name: 'Sponsored Cashback', path: '/offers/sponsored', icon: 'megaphone' },
      { name: 'Birthday Rewards', path: '/offers/birthday', icon: 'gift' },
    ],
  },
  {
    title: 'Offer Zones',
    color: colors.brand.purpleLight,
    pages: [
      { name: 'Student Zone', path: '/offers/zones/student', icon: 'school' },
      { name: 'Corporate Zone', path: '/offers/zones/corporate', icon: 'briefcase' },
      { name: 'Women Zone', path: '/offers/zones/women', icon: 'female' },
      { name: 'Heroes Zone', path: '/offers/zones/heroes', icon: 'shield' },
    ],
  },
  {
    title: 'Mall & Store',
    color: '#0EA5E9',
    pages: [
      { name: 'Alliance Stores', path: '/mall/alliance-store', icon: 'link' },
      { name: 'Lowest Price', path: '/mall/lowest-price', icon: 'pricetag' },
      { name: 'Store EMI Info', path: '/store/emi-info', icon: 'card' },
    ],
  },
  {
    title: 'Wallet Pages',
    color: colors.brand.goldWarm,
    pages: [
      { name: 'P2P Transfer', path: '/wallet/transfer', icon: 'swap-horizontal' },
      { name: 'Gift Coins', path: '/wallet/gift', icon: 'gift' },
      { name: 'Expiry Tracker', path: '/wallet/expiry-tracker', icon: 'time' },
      { name: 'Gift Cards', path: '/wallet/gift-cards', icon: 'card' },
      { name: 'Scheduled Drops', path: '/wallet/scheduled-drops', icon: 'calendar' },
    ],
  },
  {
    title: 'Payments',
    color: colors.tealGreen,
    pages: [
      { name: 'Refund Initiated', path: '/payments/refund-initiated', icon: 'receipt' },
    ],
  },
  {
    title: 'Checkout',
    color: colors.brand.orange,
    pages: [
      { name: 'EMI Selection', path: '/checkout/emi-selection', icon: 'calculator' },
    ],
  },
  {
    title: 'Social Pages',
    color: '#E11D48',
    pages: [
      { name: 'Reels', path: '/social/reels', icon: 'videocam' },
      { name: 'Upload Content', path: '/social/upload', icon: 'add-circle' },
      { name: 'Comments', path: '/social/comments/test-123', icon: 'chatbubbles' },
    ],
  },
  {
    title: 'Earn Pages',
    color: colors.brand.purple,
    pages: [
      { name: 'Share to Earn', path: '/earn/share', icon: 'share-social' },
      { name: 'Review to Earn', path: '/earn/review', icon: 'star' },
    ],
  },
  {
    title: 'Support Pages',
    color: colors.successScale[700],
    pages: [
      { name: 'Ticket Detail', path: '/support/ticket/test-123', icon: 'ticket' },
      { name: 'Call Support', path: '/support/call', icon: 'call' },
      { name: 'Report Fraud', path: '/support/report-fraud', icon: 'warning' },
      { name: 'Feedback', path: '/support/feedback', icon: 'chatbox' },
    ],
  },
];

function TestPagesScreen() {
  const router = useRouter();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const totalPages = PAGE_CATEGORIES.reduce((sum, cat) => sum + cat.pages.length, 0);

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Test All Pages</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{totalPages}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Pages</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{PAGE_CATEGORIES.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Categories</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Ionicons name="flask" size={24} color={Colors.info} />
          <ThemedText style={styles.infoText}>
            Developer test screen. Tap any page to navigate and test.
          </ThemedText>
        </View>

        {PAGE_CATEGORIES.map(category => (
          <View key={category.title} style={styles.categoryContainer}>
            <Pressable
              style={[styles.categoryHeader, { borderLeftColor: category.color }]}
              onPress={() => toggleCategory(category.title)}
            >
              <View style={[styles.categoryBadge, { backgroundColor: category.color }]}>
                <ThemedText style={styles.categoryCount}>{category.pages.length}</ThemedText>
              </View>
              <ThemedText style={styles.categoryTitle}>{category.title}</ThemedText>
              <Ionicons
                name={expandedCategory === category.title ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.text.tertiary}
              />
            </Pressable>

            {expandedCategory === category.title && (
              <View style={styles.pagesContainer}>
                {category.pages.map(page => (
                  <Pressable
                    key={page.path}
                    style={styles.pageItem}
                    onPress={() => router.push(page.path as any)}
                  >
                    <View style={[styles.pageIcon, { backgroundColor: category.color + '20' }]}>
                      <Ionicons name={page.icon as any} size={18} color={category.color} />
                    </View>
                    <ThemedText style={styles.pageName}>{page.name}</ThemedText>
                    <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.quickLinksSection}>
          <ThemedText style={styles.quickLinksTitle}>Quick Test All</ThemedText>
          <View style={styles.quickLinksGrid}>
            {PAGE_CATEGORIES.slice(0, 6).map(category => (
              <Pressable
                key={category.title}
                style={[styles.quickLinkCard, { borderColor: category.color }]}
                onPress={() => router.push(category.pages[0].path as any)}
              >
                <View style={[styles.quickLinkIcon, { backgroundColor: category.color }]}>
                  <Ionicons name={category.pages[0].icon as any} size={20} color={colors.background.primary} />
                </View>
                <ThemedText style={styles.quickLinkText} numberOfLines={1}>
                  {category.title}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h1,
    color: colors.background.primary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.info + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    flex: 1,
  },
  categoryContainer: {
    marginBottom: Spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderLeftWidth: 4,
    ...Shadows.subtle,
  },
  categoryBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  categoryCount: {
    ...Typography.label,
    color: colors.background.primary,
    fontSize: 12,
  },
  categoryTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    flex: 1,
  },
  pagesContainer: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border.light,
    paddingLeft: Spacing.md,
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  pageIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageName: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  quickLinksSection: {
    marginTop: Spacing.xl,
  },
  quickLinksTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickLinkCard: {
    width: '31%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    ...Shadows.subtle,
  },
  quickLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickLinkText: {
    ...Typography.caption,
    color: Colors.text.primary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(TestPagesScreen, 'DevTestPages');
