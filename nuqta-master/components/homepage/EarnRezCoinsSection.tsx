import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHomeTab } from '@/contexts/HomeTabContext';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_GAP = 10;

// Brand Colors - matching other homepage components
const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.brand.goldRich,
  primaryLight: colors.lavenderMist,
  white: colors.background.primary,
  textDark: colors.deepNavy,
  textMuted: colors.neutral[500],
  border: 'rgba(255, 205, 87, 0.15)',
  cardBg: 'rgba(255, 255, 255, 0.95)',
};

const EarnNuqtaCoinsSection: React.FC = () => {
  const router = useRouter();
  const { setActiveTab, scrollToTop } = useHomeTab();

  const handleViewAll = () => {
    router.push('/(tabs)/earn');
  };

  const handleOnlineShoppingPress = () => {
    setActiveTab('cash');
    // Scroll to top after switching tab
    setTimeout(() => {
      scrollToTop();
    }, 100);
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.headerIconGradient}
            >
              <Ionicons name="wallet" size={18} color={COLORS.white} />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.headerTitle}>Earn {BRAND.COIN_NAME}</Text>
            <Text style={styles.headerSubtitle}>Multiple ways to earn rewards</Text>
          </View>
        </View>
        <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
        </Pressable>
      </View>

      {/* Bento Box Grid */}
      <View style={styles.bentoGrid}>
        {/* Top Row */}
        <View style={styles.topRow}>
          {/* Large Card: Online Shopping */}
          <Pressable
            style={styles.largeCard}
            onPress={handleOnlineShoppingPress}
           
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']}
              style={styles.largeCardGradient}
            >
              {/* Subtle mustard overlay */}
              <LinearGradient
                colors={['rgba(255, 205, 87, 0.06)', 'rgba(255, 205, 87, 0.02)']}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Decorative circles */}
              <View style={styles.decorCircle1} />
              <View style={styles.decorCircle2} />

              {/* Header with badge */}
              <View style={styles.largeCardHeader}>
                <View style={styles.emojiContainer}>
                  <Text style={styles.largeEmoji}>🛒</Text>
                </View>
                <View style={styles.popularBadge}>
                  <Ionicons name="star" size={10} color={colors.lightMustard} />
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              </View>

              {/* Content */}
              <View style={styles.largeCardFooter}>
                <Text style={styles.largeCardTitle}>Online Shopping</Text>
                <Text style={styles.largeCardDesc}>2500+ brands available</Text>
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>Up to 25% cashback</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Right Column */}
          <View style={styles.rightColumn}>
            {/* Pay in Store Card */}
            <Pressable
              style={styles.payCard}
              onPress={() => router.push('/pay-in-store' as any)}
             
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']}
                style={styles.payCardGradient}
              >
                {/* Nile Blue tint overlay */}
                <LinearGradient
                  colors={['rgba(26, 58, 82, 0.08)', 'rgba(26, 58, 82, 0.03)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.payCardContent}>
                  <View style={styles.payIconBox}>
                    <Ionicons name="card-outline" size={20} color={colors.nileBlue} />
                  </View>
                  <View style={styles.payTextContent}>
                    <Text style={styles.payCardTitle}>Pay in Store</Text>
                    <Text style={styles.payCardDesc}>Scan & earn instantly</Text>
                  </View>
                </View>
                <View style={styles.payArrow}>
                  <Ionicons name="chevron-forward" size={16} color={colors.nileBlue} />
                </View>
              </LinearGradient>
            </Pressable>

            {/* Small Cards Row */}
            <View style={styles.smallCardsRow}>
              {/* Play Games */}
              <Pressable
                style={styles.smallCard}
                onPress={() => router.push('/playandearn' as any)}
               
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']}
                  style={styles.smallCardGradient}
                >
                  {/* Mustard tint */}
                  <LinearGradient
                    colors={['rgba(255, 205, 87, 0.15)', 'rgba(255, 205, 87, 0.06)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Text style={styles.smallEmoji}>🎮</Text>
                  <Text style={styles.smallCardText}>Play</Text>
                </LinearGradient>
              </Pressable>

              {/* Refer */}
              <Pressable
                style={styles.smallCard}
                onPress={() => router.push('/referral' as any)}
               
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']}
                  style={styles.smallCardGradient}
                >
                  {/* Peach tint */}
                  <LinearGradient
                    colors={['rgba(255, 215, 181, 0.25)', 'rgba(255, 215, 181, 0.1)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Text style={styles.smallEmoji}>👥</Text>
                  <Text style={styles.smallCardText}>Refer</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Bottom Row */}
        <View style={styles.bottomRow}>
          {/* Social Impact */}
          <Pressable
            style={styles.socialCard}
            onPress={() => router.push('/social-impact' as any)}
           
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']}
              style={styles.socialCardGradient}
            >
              {/* Nile Blue tint */}
              <LinearGradient
                colors={['rgba(26, 58, 82, 0.1)', 'rgba(26, 58, 82, 0.04)']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.socialIconBox}>
                <Text style={styles.socialEmoji}>🤝</Text>
              </View>
              <View style={styles.socialTextContent}>
                <Text style={styles.socialTitle}>Social Impact</Text>
                <Text style={styles.socialDesc}>CSR events</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Surveys */}
          <Pressable
            style={styles.miniCard}
            onPress={() => router.push('/surveys' as any)}
           
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']}
              style={styles.miniCardGradient}
            >
              {/* Lavender Mist tint */}
              <LinearGradient
                colors={['rgba(223, 235, 247, 0.4)', 'rgba(223, 235, 247, 0.15)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.miniEmoji}>📋</Text>
              <Text style={styles.miniCardText}>Surveys</Text>
            </LinearGradient>
          </Pressable>

          {/* Reviews */}
          <Pressable
            style={styles.miniCard}
            onPress={() => router.push('/my-reviews' as any)}
           
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.92)']}
              style={styles.miniCardGradient}
            >
              {/* Mustard tint */}
              <LinearGradient
                colors={['rgba(255, 205, 87, 0.15)', 'rgba(255, 205, 87, 0.06)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.miniEmoji}>⭐</Text>
              <Text style={styles.miniCardText}>Reviews</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },

  // Header - matching PlayAndEarnSection style
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  headerIconContainer: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Bento Grid
  bentoGrid: {
    gap: CARD_GAP,
  },
  topRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    height: 170,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    height: 70,
  },

  // Large Card - Online Shopping
  largeCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  largeCardGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 10,
    left: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 205, 87, 0.05)',
  },
  largeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emojiContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 205, 87, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  largeEmoji: {
    fontSize: 22,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.25)',
  },
  popularText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  largeCardFooter: {
    gap: 3,
  },
  largeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 20,
  },
  largeCardDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  cashbackBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 205, 87, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },

  // Right Column
  rightColumn: {
    flex: 1,
    gap: CARD_GAP,
  },

  // Pay in Store Card
  payCard: {
    height: 66,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  payCardGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  payCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  payIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(26, 58, 82, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.2)',
  },
  payTextContent: {
    flex: 1,
  },
  payCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  payCardDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  payArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(26, 58, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Small Cards Row (Play & Refer)
  smallCardsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  smallCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  smallCardGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  smallEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  smallCardText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },

  // Social Impact Card
  socialCard: {
    flex: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  socialCardGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  socialIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(26, 58, 82, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.2)',
  },
  socialEmoji: {
    fontSize: 18,
  },
  socialTextContent: {
    flex: 1,
  },
  socialTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  socialDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // Mini Cards (Surveys & Reviews)
  miniCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  miniCardGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  miniEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  miniCardText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDark,
  },
});

export default React.memo(EarnNuqtaCoinsSection);
