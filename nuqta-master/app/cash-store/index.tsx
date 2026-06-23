import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CashStoreSectionContainer from '../../components/cash-store/CashStoreSectionContainer';
import BonusCampaignBanner from '@/components/earn/BonusCampaignBanner';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';

function CashStorePage() {
  const router = useRouter();
  const { bonusCampaignSlug } = useLocalSearchParams<{ bonusCampaignSlug?: string }>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIcon}>
            <Ionicons name="cash" size={16} color={Colors.text.inverse} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Cash Store</Text>
            <Text style={styles.headerSubtitle}>Gift Cards, Coupons & More</Text>
          </View>
        </View>
        <Pressable
          style={styles.trackButton}
          onPress={() => router.push('/account/cashback' as any)}
        >
          <Ionicons name="time" size={20} color={Colors.nileBlue} />
        </Pressable>
      </View>

      {/* Bonus Campaign Banner */}
      <BonusCampaignBanner campaignSlug={bonusCampaignSlug as string} />

      {/* Body — all sections powered by useCashStoreSection hook */}
      <CashStoreSectionContainer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  backButton: {
    width: 40, height: 40, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary, justifyContent: 'center', alignItems: 'center',
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.nileBlue, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.primary },
  headerSubtitle: { ...Typography.caption, color: Colors.text.tertiary, fontWeight: '500' },
  trackButton: {
    width: 40, height: 40, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary, justifyContent: 'center', alignItems: 'center',
  },
});

export default withErrorBoundary(CashStorePage, 'CashStoreIndex');
