import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useWalletData, useWalletLoading, useRefreshWallet, useBrandedCoins } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

// Overlapping coins icon component
const OverlappingCoinsIcon: React.FC<{ color: string }> = ({ color }) => (
  <View style={styles.overlappingCoinsContainer}>
    <View style={[styles.coinCircle, { backgroundColor: color, left: 0 }]} />
    <View style={[styles.coinCircle, { backgroundColor: color, right: 0, opacity: 0.8 }]} />
  </View>
);

// Skeleton Loader Component
const SkeletonLoader: React.FC = () => (
  <View style={styles.cardWrapper}>
    <View style={styles.cardContainer}>
      <View style={styles.skeletonCard}>
        <View style={styles.headerRow}>
          <View style={styles.walletTitleContainer}>
            <View style={[styles.skeletonBox, { width: 20, height: 20, borderRadius: 10 }]} />
            <View style={[styles.skeletonBox, { width: 80, height: 16 }]} />
          </View>
          <View style={[styles.skeletonBox, { width: 60, height: 16 }]} />
        </View>
        <View style={styles.coinsGrid}>
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={[styles.coinCard, { opacity: 0.5 }]}>
              <View style={[styles.skeletonBox, { width: 40, height: 40, borderRadius: 20 }]} />
              <View style={[styles.skeletonBox, { width: 50, height: 20, marginTop: 8 }]} />
              <View style={[styles.skeletonBox, { width: 40, height: 12, marginTop: 4 }]} />
            </View>
          ))}
        </View>
        <View style={styles.actionsContainer}>
          {[1, 2, 3].map((_, i) => (
            <View key={i} style={[styles.actionButton, { opacity: 0.5 }]}>
              <View style={[styles.skeletonBoxDark, { width: 40, height: 40, borderRadius: 12 }]} />
            </View>
          ))}
        </View>
      </View>
    </View>
  </View>
);

const WalletSnapshotCard: React.FC = () => {
  const router = useRouter();
  const hasInitialData = useRef(false);

  // Use the shared wallet context
  const walletData = useWalletData();
  const isLoading = useWalletLoading();
  const refreshWallet = useRefreshWallet();
  const brandedCoinsFromCtx = useBrandedCoins();

  // Track when we have initial data (without triggering re-renders)
  if (walletData && !hasInitialData.current) {
    hasInitialData.current = true;
  }

  // Refresh wallet data when the screen comes into focus (e.g., after placing an order)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we already have data (don't double-fetch on initial mount)
      if (hasInitialData.current) {
        refreshWallet();
      }
    }, [refreshWallet])
  );

  // Show skeleton while loading
  if (isLoading && !walletData) {
    return <SkeletonLoader />;
  }

  // Get coin balances
  const rezCoin = walletData?.coins?.find(c => c.type === 'rez');
  const promoCoin = walletData?.coins?.find(c => c.type === 'promo');
  const brandedCoins = brandedCoinsFromCtx || [];

  const rezCoins = rezCoin?.amount || 0;
  const promoCoins = promoCoin?.amount || 0;
  const totalBrandedCoins = brandedCoins.reduce((sum: number, coin: any) => sum + (coin.amount || 0), 0);

  // Calculate expiring coins (from promo coins with expiry date)
  // Show expiry warning if there are expiring coins, otherwise show default
  let expiringCoins = promoCoin?.expiryDate 
    ? new Date(promoCoin.expiryDate) > new Date() 
      ? promoCoins 
      : 0
    : 0;
  
  let expiryDays = promoCoin?.expiryDate
    ? Math.ceil((new Date(promoCoin.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Hide expiry banner entirely when no coins are actually expiring

  // Navigation handlers
  const handleUseCoins = () => {
    router.push('/coins' as any);
  };

  const handleViewWallet = () => {
    router.push('/wallet');
  };

  const handleEarnMore = () => {
    router.push('/my-earnings' as any);
  };

  const handleExpiryAlert = () => {
    router.push('/wallet');
  };

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.walletTitleContainer}>
              <Ionicons name="wallet" size={18} color={colors.nileBlue} />
              <Text style={styles.walletTitle}>{BRAND.APP_NAME} Wallet</Text>
            </View>
            <Pressable 
              style={styles.viewAllButton} 
              onPress={handleViewWallet}
             
            >
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.brand.amberDeep} />
            </Pressable>
          </View>

          {/* Coin Balances */}
          <View style={styles.coinsGrid}>
            {/* Rez Coins */}
            <View style={styles.coinCard}>
              <View style={styles.nuqtaCoinIconContainer}>
                <CachedImage
                  source={BRAND.COIN_IMAGE}
                  style={styles.nuqtaCoinImage}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.coinAmount}>{rezCoins.toLocaleString()}</Text>
              <Text style={styles.coinLabel}>{BRAND.COIN_NAME}</Text>
            </View>

            {/* Branded */}
            <View style={styles.coinCard}>
              <View style={styles.brandedCoinIconContainer}>
                <OverlappingCoinsIcon color={colors.nileBlue} />
              </View>
              <Text style={styles.coinAmount}>{totalBrandedCoins.toLocaleString()}</Text>
              <Text style={styles.coinLabel}>Branded</Text>
            </View>

            {/* Promo */}
            <View style={styles.coinCard}>
              <View style={styles.promoCoinIconContainer}>
                <OverlappingCoinsIcon color={colors.lightPeach} />
              </View>
              <Text style={styles.coinAmount}>{promoCoins.toLocaleString()}</Text>
              <Text style={styles.coinLabel}>Promo</Text>
            </View>
          </View>

          {/* Expiry Warning */}
          {expiringCoins > 0 && (
            <Pressable
              style={styles.expiryAlert}
              onPress={handleExpiryAlert}
             
            >
              <View style={styles.alertIconContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.background.primary} />
              </View>
              <Text style={styles.expiryText}>
                <Text style={styles.expiryAmount}>{expiringCoins} coins</Text> expiring in {expiryDays} days
              </Text>
              <Pressable
                style={styles.useNowButton}
                onPress={handleUseCoins}
               
              >
                <Text style={styles.useNowText}>Use now</Text>
              </Pressable>
            </Pressable>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={[styles.actionButton, styles.useCoinsButton]}
              onPress={handleUseCoins}
             
            >
              <Ionicons name="arrow-forward" size={16} color={colors.nileBlue} />
              <Text style={[styles.actionButtonText, styles.useCoinsButtonText]}>Use Coins</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.viewWalletButton]}
              onPress={handleViewWallet}
             
            >
              <Text style={[styles.actionButtonText, styles.viewWalletButtonText]}>View Wallet</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.earnMoreButton]}
              onPress={handleEarnMore}
             
            >
              <Ionicons name="add" size={16} color={colors.brand.amberDeep} />
              <Text style={[styles.actionButtonText, styles.earnMoreButtonText]}>Earn More</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 4, // Further reduced for maximum width
    marginVertical: 8, // Reduced vertical margin
  },
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  card: {
    backgroundColor: colors.lavenderMist, // Lavender background
    borderRadius: 16,
    padding: 12, // Reduced padding significantly
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // Reduced
  },
  walletTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue, // Nile blue
    letterSpacing: 0.2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
  },
  viewAllText: {
    fontSize: 13,
    color: colors.brand.amberDeep, // Dark amber for better contrast
    fontWeight: '600',
  },
  coinsGrid: {
    flexDirection: 'row',
    gap: 8, // Reduced gap
    marginBottom: 12, // Reduced
  },
  coinCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // More opaque white for better contrast
    borderRadius: 12,
    padding: 10, // Reduced padding
    alignItems: 'center',
    minHeight: 85, // Reduced height
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  // Nuqta Coin Icon Container
  nuqtaCoinIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.warningScale[200], // Brighter amber/yellow
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6, // Reduced
    ...Platform.select({
      ios: {
        shadowColor: colors.warningScale[400],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  nuqtaCoinImage: {
    width: 32,
    height: 32,
  },
  // Branded Coin Icon Container
  brandedCoinIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(168, 85, 247, 0.2)', // More vibrant purple
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6, // Reduced
  },
  // Promo Coin Icon Container
  promoCoinIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(236, 72, 153, 0.2)', // More vibrant pink
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6, // Reduced
  },
  overlappingCoinsContainer: {
    width: 28,
    height: 28,
    position: 'relative',
  },
  coinCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    top: 5,
  },
  coinAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nileBlue, // Nile blue for better readability
    marginBottom: 3, // Reduced
    letterSpacing: -0.3,
  },
  coinLabel: {
    fontSize: 10,
    color: '#2d5c7e', // Lighter nile blue for labels
    fontWeight: '600',
  },
  expiryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120, 53, 15, 0.6)', // Lighter brownish-grey
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.4)',
  },
  alertIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.warningScale[400], // Solid yellow background
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryText: {
    flex: 1,
    fontSize: 13,
    color: colors.background.primary, // Pure white for better visibility
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  expiryAmount: {
    fontWeight: '700',
    color: colors.background.primary,
  },
  useNowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(153, 27, 27, 0.9)', // Darker reddish-brown, more opaque
  },
  useNowText: {
    fontSize: 12,
    color: colors.background.primary, // White text for better visibility
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8, // Reduced
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5, // Reduced
    paddingVertical: 10, // Reduced
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  useCoinsButton: {
    backgroundColor: colors.lightMustard, // Mustard accent
  },
  viewWalletButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // More opaque white/grey
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.2)',
  },
  earnMoreButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)', // More vibrant golden-brown
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  useCoinsButtonText: {
    color: colors.nileBlue, // Nile blue for contrast on mustard
  },
  viewWalletButtonText: {
    color: colors.nileBlue, // Nile blue for better contrast
  },
  earnMoreButtonText: {
    color: colors.brand.amberDeep, // Darker amber for better visibility
  },
  // Skeleton styles
  skeletonBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  skeletonBoxDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
  },
  skeletonCard: {
    backgroundColor: colors.lavenderMist,
    borderRadius: 16,
    padding: 12,
  },
});

export default React.memo(WalletSnapshotCard);
