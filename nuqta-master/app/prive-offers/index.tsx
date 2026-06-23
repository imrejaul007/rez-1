import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Prive Offers Page (Dark Theme)
 *
 * Premium/exclusive offers with dark theme
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { OffersThemeProvider } from '@/contexts/OffersThemeContext';
import { OffersPageContent } from '@/components/offers/OffersPageContent';
import { useAuthUser, useIsAuthenticated, useRezBalance, useRefreshWallet } from '@/stores/selectors';
import { NuqtaCoin as ReZCoin } from '@/components/homepage/ReZCoin';
import { Spacing, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

// Dark theme colors
const DarkColors = {
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  text: colors.background.primary,
  textSecondary: '#A1A1A6',
  accent: colors.lightMustard,
  border: '#2C2C2E',
};

function PriveOffersScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const userCoins = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const [isFavorited, setIsFavorited] = useState(false);

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out exclusive Prive offers on ${BRAND.APP_NAME}! Redeem your coins for premium rewards.`,
        title: `${BRAND.APP_NAME} Prive Offers`,
      });
    } catch (_error) {
      // User cancelled share or share failed silently
    }
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const handleRefresh = useCallback(async () => {
    await refreshWallet();
  }, [refreshWallet]);
  const isMounted = useIsMounted();

  return (
    <OffersThemeProvider mode="dark">
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
           
          >
            <Ionicons name="arrow-back" size={24} color={DarkColors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.priveBadge}>
              <Ionicons name="diamond" size={12} color={colors.brand.purpleSoft} />
            </View>
            <ThemedText style={styles.headerTitle}>Prive Offers</ThemedText>
            <ReZCoin
              balance={userCoins}
              size="small"
              onPress={() => router.push('/coins')}
              style={styles.coinPill}
            />
          </View>

          <View style={styles.headerRight}>
            <Pressable
              style={styles.iconButton}
              onPress={handleShare}
             
            >
              <Ionicons
                name="share-outline"
                size={22}
                color={DarkColors.text}
              />
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={handleFavorite}
             
            >
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorited ? colors.error : DarkColors.text}
              />
            </Pressable>
          </View>
        </View>

        {/* Page Content */}
        <OffersPageContent onRefresh={handleRefresh} />
      </SafeAreaView>
    </OffersThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: DarkColors.background,
    borderBottomWidth: 1,
    borderBottomColor: DarkColors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: DarkColors.backgroundSecondary,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  priveBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DarkColors.text,
    letterSpacing: -0.3,
  },
  coinPill: {
    backgroundColor: 'rgba(255, 205, 87, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: DarkColors.backgroundSecondary,
  },
});

export default withErrorBoundary(PriveOffersScreen, 'PriveOffersIndex');
