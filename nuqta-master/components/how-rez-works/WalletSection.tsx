import React from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface CoinType {
  type: string;
  badge: string;
  badgeColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  description: string;
  features: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }[];
  tip: string;
  tipIcon: keyof typeof Ionicons.glyphMap;
  cardBgColor: string;
  borderColor: string;
}

const coinTypes: CoinType[] = [
  {
    type: BRAND.COIN_NAME,
    badge: 'Universal',
    badgeColor: colors.lightMustard,
    icon: 'layers-outline',
    iconBgColor: colors.linen,
    iconColor: colors.nileBlue,
    description: 'Earned on most purchases',
    features: [
      { icon: 'checkmark', text: `Can be used at any ${BRAND.APP_NAME} store`, color: colors.nileBlue },
      { icon: 'time-outline', text: 'Short validity (to encourage usage)', color: colors.nileBlue },
    ],
    tip: 'Think of this as your everyday savings currency.',
    tipIcon: 'bulb-outline',
    cardBgColor: colors.linen,
    borderColor: colors.lightMustard,
  },
  {
    type: 'Brand Coins',
    badge: 'Store-specific',
    badgeColor: colors.nileBlue,
    icon: 'storefront-outline',
    iconBgColor: colors.lavenderMist,
    iconColor: colors.nileBlue,
    description: 'Earned at specific brands',
    features: [
      { icon: 'checkmark', text: 'Can be used only at that brand', color: colors.nileBlue },
      { icon: 'infinite-outline', text: 'Never expire', color: colors.nileBlue },
    ],
    tip: 'Rewards loyalty to your favorite stores.',
    tipIcon: 'heart-outline',
    cardBgColor: colors.lavenderMist,
    borderColor: colors.nileBlue,
  },
  {
    type: 'Promo Coins',
    badge: 'Limited-time',
    badgeColor: colors.lightMustard,
    icon: 'flame-outline',
    iconBgColor: colors.lightPeach,
    iconColor: colors.nileBlue,
    description: 'Earned during campaigns',
    features: [
      { icon: 'checkmark', text: 'Higher value', color: colors.nileBlue },
      { icon: 'hourglass-outline', text: 'Short expiry', color: colors.error },
    ],
    tip: 'Use them fast to maximize savings.',
    tipIcon: 'flash-outline',
    cardBgColor: colors.lightPeach,
    borderColor: colors.lightMustard,
  },
];

const WalletSection: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="wallet" size={28} color={colors.nileBlue} />
        </View>
        <Text style={styles.sectionTitle}>Your {BRAND.APP_NAME} Wallet</Text>
        <Text style={styles.sectionSubtitle}>
          Your wallet stores <Text style={styles.boldText}>all rewards transparently</Text>.
        </Text>
      </View>

      {/* Coin Type Cards */}
      {coinTypes.map((coin, index) => (
        <View
          key={index}
          style={[
            styles.coinCard,
            { backgroundColor: coin.cardBgColor, borderColor: coin.borderColor },
          ]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.coinIconContainer, { backgroundColor: coin.iconBgColor }]}>
              <Ionicons name={coin.icon} size={22} color={coin.iconColor} />
            </View>
            <View style={styles.cardTitleContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.coinType}>{coin.type}</Text>
                <View style={[styles.badge, { backgroundColor: `${coin.badgeColor}20` }]}>
                  <Text style={[styles.badgeText, { color: coin.badgeColor }]}>
                    {coin.badge}
                  </Text>
                </View>
              </View>
              <Text style={styles.coinDescription}>{coin.description}</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {coin.features.map((feature, featureIndex) => (
              <View key={featureIndex} style={styles.featureRow}>
                <Ionicons name={feature.icon} size={16} color={feature.color} />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Tip */}
          <View style={styles.tipContainer}>
            <Ionicons name={coin.tipIcon} size={14} color={coin.iconColor} />
            <Text style={[styles.tipText, { color: coin.iconColor }]}>{coin.tip}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.neutral[50],
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.linen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '600',
    color: colors.neutral[800],
  },
  coinCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  coinIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  coinType: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  coinDescription: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  featuresContainer: {
    gap: 10,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: colors.neutral[700],
    flex: 1,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  tipText: {
    fontSize: 13,
    fontStyle: 'italic',
    flex: 1,
  },
});

export default React.memo(WalletSection);
