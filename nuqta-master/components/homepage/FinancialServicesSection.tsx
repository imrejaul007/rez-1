/**
 * Financial Services Section - Converted from V2
 * Pay Bills, OTT Plans, Recharge, Gold, Insurance, Offers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import financialServicesApi, { FinancialServiceCategory } from '@/services/financialServicesApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;

const COLORS = {
  white: colors.background.primary,
  navy: colors.nileBlue,
  gray600: colors.neutral[500],
  mustard: colors.lightMustard,
  green500: colors.lightMustard, // Migrated to mustard
};

const FinancialServicesSection: React.FC = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<FinancialServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await financialServicesApi.getCategories();
      if (response.success && response.data) {
        if (!isMounted()) return;
        setCategories(response.data);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleViewAll = () => {
    router.push('/financial' as any);
  };

  const handlePress = (route: string) => {
    router.push(route as any);
  };

  // Get category data
  const billsCategory = categories.find(c => c.slug === 'bills');
  const ottCategory = categories.find(c => c.slug === 'ott');
  const rechargeCategory = categories.find(c => c.slug === 'recharge');
  const goldCategory = categories.find(c => c.slug === 'gold');
  const insuranceCategory = categories.find(c => c.slug === 'insurance');
  const offersCategory = categories.find(c => c.slug === 'offers');

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingVertical: 20, alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={COLORS.green500} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>💳 Financial Services</Text>
          <Text style={styles.headerSubtitle}>Pay bills, recharge & more</Text>
        </View>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* Main Cards Row */}
      <View style={styles.mainRow}>
        {/* Pay Bills Card */}
        <Pressable
          style={styles.billsCard}
          onPress={() => handlePress('/financial/bills')}
         
        >
          <LinearGradient
            colors={[colors.nileBlue, colors.brand.nileBlueLight, '#2d5c7e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.billsGradient}
          >
            <View style={styles.billsIconBox}>
              <Text style={styles.billsIcon}>💳</Text>
            </View>
            <Text style={styles.billsTitle}>Pay Bills</Text>
            <Text style={styles.billsSubtitle}>Electricity • Water • Gas</Text>
            <View style={styles.billsBadges}>
              <View style={styles.cashbackBadge}>
                <Text style={styles.cashbackText}>
                  {billsCategory?.cashbackPercentage || 3}% Cashback
                </Text>
              </View>
              <Text style={styles.secureText}>SECURE</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* OTT Plans Card */}
        <Pressable
          style={styles.ottCard}
          onPress={() => handlePress('/financial/ott')}
         
        >
          <LinearGradient
            colors={[colors.lightMustard, '#e6b84e', '#d4a645']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ottGradient}
          >
            <View style={styles.ottIconBox}>
              <Text style={styles.ottIcon}>📺</Text>
            </View>
            <Text style={styles.ottTitle}>OTT Plans</Text>
            <Text style={styles.ottSubtitle}>Netflix • Prime • Disney+</Text>
            <View style={styles.specialBadge}>
              <Text style={styles.specialText}>
                {ottCategory?.cashbackPercentage || 10}% Cashback
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Bottom Row - Quick Actions */}
      <View style={styles.bottomRow}>
        {/* Recharge */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/financial/recharge')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Text style={styles.bottomIcon}>📱</Text>
          </View>
          <Text style={styles.bottomTitle}>Recharge</Text>
        </Pressable>

        {/* Gold */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/financial/gold')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
            <Text style={styles.bottomIcon}>🪙</Text>
          </View>
          <Text style={styles.bottomTitle}>Gold</Text>
        </Pressable>

        {/* Insurance */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/financial/insurance')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(255, 205, 87, 0.1)' }]}>
            <Text style={styles.bottomIcon}>🛡️</Text>
          </View>
          <Text style={styles.bottomTitle}>Insurance</Text>
        </Pressable>

        {/* Offers */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/financial/offers')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Text style={styles.bottomIcon}>🎁</Text>
          </View>
          <Text style={styles.bottomTitle}>Offers</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green500,
  },

  // Main Row
  mainRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // Bills Card
  billsCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  billsGradient: {
    padding: 16,
    minHeight: 170,
  },
  billsIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  billsIcon: {
    fontSize: 28,
  },
  billsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  billsSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  billsBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cashbackBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  secureText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },

  // OTT Card
  ottCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  ottGradient: {
    padding: 16,
    minHeight: 170,
  },
  ottIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ottIcon: {
    fontSize: 28,
  },
  ottTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  ottSubtitle: {
    fontSize: 12,
    color: 'rgba(26,58,82,0.8)',
    marginBottom: 12,
  },
  specialBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26,58,82,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specialText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },

  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: 12,
    alignItems: 'center',
  },
  bottomIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bottomIcon: {
    fontSize: 20,
  },
  bottomTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
});

export default React.memo(FinancialServicesSection);
