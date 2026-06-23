import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWalletData, useBrandedCoins } from '@/stores/selectors';
import { COIN_TYPES } from '@/types/wallet';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
function BrandedCoinsScreen() {
  const router = useRouter();
  const walletData = useWalletData();
  const brandedCoinsFromCtx = useBrandedCoins();

  const screenWidth = Dimensions.get('window').width;
  const styles = useMemo(() => createStyles(screenWidth), [screenWidth]);

  const brandedCoins = brandedCoinsFromCtx || [];
  const totalBranded = walletData?.brandedCoinsTotal || 0;

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={[colors.brand.indigo, '#4F46E5'] as const}
        style={styles.headerBg}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={22} color={colors.background.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Branded Coins</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Branded Coins</Text>
          <Text style={styles.totalAmount}>RC {totalBranded}</Text>
          <Text style={styles.totalSubtext}>
            From {brandedCoins.length} {brandedCoins.length === 1 ? 'store' : 'stores'}
          </Text>
        </View>
      </LinearGradient>

      {/* Store Coins List */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {brandedCoins.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No Branded Coins Yet</Text>
            <Text style={styles.emptySubtext}>
              When stores reward you with branded coins, they will appear here
            </Text>
          </View>
        ) : (
          brandedCoins.map((bc) => (
            <View key={bc.merchantId} style={styles.storeCard}>
              <View style={styles.storeRow}>
                <View style={[styles.storeIcon, { backgroundColor: (bc.merchantColor || COIN_TYPES.branded.color) + '15' }]}>
                  {bc.merchantLogo ? (
                    <CachedImage
                      source={bc.merchantLogo}
                      style={styles.storeLogo}
                      contentFit="contain"
                    />
                  ) : (
                    <Ionicons
                      name="storefront"
                      size={24}
                      color={bc.merchantColor || COIN_TYPES.branded.color}
                    />
                  )}
                </View>

                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{bc.merchantName}</Text>
                  <Text style={styles.storeDesc}>Use only at {bc.merchantName}</Text>
                </View>

                <View style={styles.storeAmountWrap}>
                  <Text style={[styles.storeAmount, { color: bc.merchantColor || COIN_TYPES.branded.color }]}>
                    RC {bc.amount}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.brand.indigo} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How Branded Coins Work</Text>
              <Text style={styles.infoText}>
                Branded coins are awarded by stores as rewards. Each store's coins can only be used at that specific store. They are used automatically during checkout.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (screenWidth: number) => {
  const isSmallScreen = screenWidth < 375;
  const isTablet = screenWidth > 768;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: Colors.background.secondary,
    },
    headerBg: {
      paddingTop: Platform.OS === 'ios' ? 50 : 40,
      paddingBottom: 28,
      paddingHorizontal: isSmallScreen ? 16 : 22,
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.xl,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.text.inverse,
    },
    totalSection: {
      alignItems: 'center',
    },
    totalLabel: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '500',
      marginBottom: 6,
    },
    totalAmount: {
      fontSize: 36,
      fontWeight: '800',
      color: Colors.text.inverse,
      letterSpacing: 0.5,
    },
    totalSubtext: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: Spacing.xs,
    },
    scrollContent: {
      flex: 1,
      paddingHorizontal: isSmallScreen ? 16 : 22,
      paddingTop: 20,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.text.primary,
      marginTop: Spacing.base,
    },
    emptySubtext: {
      fontSize: 14,
      color: Colors.text.tertiary,
      marginTop: Spacing.sm,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    storeCard: {
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius.lg,
      padding: isTablet ? 20 : 16,
      marginBottom: Spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    storeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    storeIcon: {
      width: isTablet ? 52 : 46,
      height: isTablet ? 52 : 46,
      borderRadius: isTablet ? 16 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    storeLogo: {
      width: 28,
      height: 28,
      borderRadius: 6,
    },
    storeInfo: {
      flex: 1,
    },
    storeName: {
      fontSize: isTablet ? 17 : 16,
      fontWeight: '700',
      color: Colors.text.primary,
      marginBottom: 3,
    },
    storeDesc: {
      fontSize: 13,
      color: Colors.text.tertiary,
      fontWeight: '500',
    },
    storeAmountWrap: {
      alignItems: 'flex-end',
    },
    storeAmount: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    infoSection: {
      marginTop: Spacing.md,
    },
    infoCard: {
      flexDirection: 'row',
      backgroundColor: colors.indigoMist,
      borderRadius: 14,
      padding: Spacing.base,
      gap: Spacing.md,
    },
    infoContent: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#4F46E5',
      marginBottom: Spacing.xs,
    },
    infoText: {
      fontSize: 13,
      color: Colors.text.tertiary,
      lineHeight: 18,
    },
  });
};

export default withErrorBoundary(BrandedCoinsScreen, 'BrandedCoinsScreen');
