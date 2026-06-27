// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Coin System Guide Page
// Educational/informational page about the ReZ coin system

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Platform,
  UIManager,
  LayoutAnimation,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTotalBalance, useWalletLoading, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import walletApi from '@/services/walletApi';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// ============================================
// COIN TYPE DATA
// ============================================

interface CoinTypeInfo {
  name: string;
  color: string;
  backgroundColor: string;
  gradientColors: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  expiry: string;
  earnedFrom: string;
  usableAt: string;
}

// Static template — expiry values are overridden dynamically inside the component
const COIN_TYPE_TEMPLATES = [
  {
    key: 'rez' as const,
    name: 'ReZ Coins',
    color: colors.brand.greenDark,
    backgroundColor: colors.successScale[50],
    gradientColors: [colors.brand.greenDark, colors.successScale[700]] as [string, string],
    icon: 'diamond' as const,
    description: 'Universal coins that work everywhere on the platform. The backbone of your rewards.',
    defaultExpiry: 'Never expires',
    earnedFrom: 'Shopping, games, challenges, referrals',
    usableAt: 'Everywhere on ReZ',
  },
  {
    key: 'prive' as const,
    name: 'Priv\u00e9 Coins',
    color: colors.brand.amberDeep,
    backgroundColor: colors.tint.amber,
    gradientColors: [colors.warningScale[400], colors.warningScale[700]] as [string, string],
    icon: 'diamond-outline' as const,
    description: 'Premium tier coins with higher value. Earned from Priv\u00e9-eligible purchases.',
    defaultExpiry: '12 months',
    earnedFrom: 'Priv\u00e9-eligible purchases',
    usableAt: 'All Priv\u00e9 partners',
  },
  {
    key: 'branded' as const,
    name: 'Branded Coins',
    color: colors.brand.blue,
    backgroundColor: colors.tint.blue,
    gradientColors: [colors.infoScale[400], colors.brand.blue] as [string, string],
    icon: 'storefront' as const,
    description: 'Store-specific coins earned from participating merchants. Only usable at the issuing store.',
    defaultExpiry: 'Set by merchant',
    earnedFrom: 'Participating stores',
    usableAt: 'Issuing store only',
  },
  {
    key: 'promo' as const,
    name: 'Promo Coins',
    color: colors.warningScale[700],
    backgroundColor: colors.tint.amberLight,
    gradientColors: [colors.warningScale[400], colors.warningScale[700]] as [string, string],
    icon: 'gift' as const,
    description: 'Campaign-based coins from special promotions and events. Limited time availability.',
    defaultExpiry: 'Per campaign',
    earnedFrom: 'Special promotions',
    usableAt: 'As per campaign rules',
  },
];

// ============================================
// EARNING METHODS DATA
// ============================================

interface EarningMethod {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  backgroundColor: string;
}

const EARNING_METHODS: EarningMethod[] = [
  {
    icon: 'cart',
    title: 'Shopping',
    description: 'Earn ReZ coins on every order you place',
    color: colors.brand.greenDark,
    backgroundColor: colors.successScale[50],
  },
  {
    icon: 'game-controller',
    title: 'Games',
    description: 'Play daily games for coins and prizes',
    color: Colors.nileBlue,
    backgroundColor: colors.tint.purpleLight,
  },
  {
    icon: 'flag',
    title: 'Challenges',
    description: 'Complete challenges for bonus coin rewards',
    color: colors.brand.orangeDark,
    backgroundColor: colors.tint.orange,
  },
  {
    icon: 'people',
    title: 'Referrals',
    description: 'Refer friends and earn coins when they join',
    color: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  {
    icon: 'receipt',
    title: 'Bill Upload',
    description: 'Upload receipts from partner stores for cashback',
    color: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  {
    icon: 'calendar',
    title: 'Daily Check-in',
    description: 'Maintain streaks for increasing bonus coins',
    color: colors.warningScale[400],
    backgroundColor: colors.tint.amber,
  },
  {
    icon: 'star',
    title: 'Reviews',
    description: 'Write product and store reviews for coins',
    color: Colors.nileBlue,
    backgroundColor: colors.indigoMist,
  },
];

// ============================================
// FAQ DATA
// ============================================

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS_STATIC: FAQItem[] = [
  {
    question: 'Do my coins expire?',
    answer: '__DYNAMIC_EXPIRY__', // Replaced dynamically inside component
  },
  {
    question: 'How are coins spent?',
    answer: 'When you make a purchase, coins are automatically applied in priority order: Promo Coins first (since they expire soonest), then Branded Coins (if applicable to the store), then Priv\u00e9 Coins, and finally ReZ Coins. Within each type, the lowest-expiry coins are used first.',
  },
  {
    question: 'Can I transfer coins to someone else?',
    answer: 'No, coins are personal and tied to your account. They cannot be transferred to another user. However, you can gift coins through the Gift Coins feature in your wallet, which sends new coins from a special gifting pool.',
  },
  {
    question: 'Where can I see my balance?',
    answer: 'You can view your complete coin balance breakdown on the Wallet page. Each coin type is displayed separately with its current balance, expiry information, and recent transactions. You can also see a summary on the Play & Earn page.',
  },
  {
    question: 'What is the spending priority?',
    answer: 'The system automatically prioritizes spending in this order: Promo Coins (campaign-based, expire first) > Branded Coins (store-specific) > Priv\u00e9 Coins (premium tier) > ReZ Coins (universal, never expire). This ensures you use expiring coins before permanent ones.',
  },
  {
    question: 'How much is 1 coin worth?',
    answer: 'The value of 1 coin depends on the type. ReZ Coins and Promo Coins have a standard value set by the platform. Priv\u00e9 Coins typically have a higher redemption value. Branded Coins have values set by the issuing store. Check each coin\'s details in your Wallet for exact values.',
  },
];

// ============================================
// SPENDING PRIORITY DATA
// ============================================

const SPENDING_PRIORITY = [
  { name: 'Promo Coins', color: colors.warningScale[700], icon: 'gift' as keyof typeof Ionicons.glyphMap, priority: 1 },
  { name: 'Branded Coins', color: colors.brand.blue, icon: 'storefront' as keyof typeof Ionicons.glyphMap, priority: 2 },
  { name: 'Priv\u00e9 Coins', color: colors.brand.amberDeep, icon: 'diamond-outline' as keyof typeof Ionicons.glyphMap, priority: 3 },
  { name: 'ReZ Coins', color: colors.brand.greenDark, icon: 'diamond' as keyof typeof Ionicons.glyphMap, priority: 4 },
];

// ============================================
// COMPONENT
// ============================================

const FAQItemComponent = ({ faq, index, isExpanded, onToggle }: {
  faq: FAQItem; index: number; isExpanded: boolean; onToggle: (index: number) => void;
}) => {
  const chevronAnim = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(chevronAnim.value, [0, 1], [0, 180])}deg` }],
  }));

  React.useEffect(() => {
    chevronAnim.value = withTiming(isExpanded ? 1 : 0, { duration: 250 });
  }, [isExpanded]);

  return (
    <View style={styles.faqItem}>
      <Pressable
        style={styles.faqQuestion}
        onPress={() => onToggle(index)}
        accessibilityLabel={`FAQ: ${faq.question}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={styles.faqQuestionText}>{faq.question}</Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={20} color={Colors.text.tertiary} />
        </Animated.View>
      </Pressable>
      {isExpanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{faq.answer}</Text>
        </View>
      )}
    </View>
  );
};

const CoinSystemPage = () => {
  const router = useRouter();
  const walletBalance = useTotalBalance();
  const loadingWallet = useWalletLoading();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const isMounted = useIsMounted();
  const [liveExpiryConfig, setLiveExpiryConfig] = useState<Record<string, { expiryDays: number; maxUsagePct: number }> | null>(null);

  // Fetch live coin expiry config from admin settings
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    walletApi.getCoinRules().then((res: any) => {
      if (!isMounted()) return;
      if (res?.success && res.data?.coinExpiryConfig) {
        setLiveExpiryConfig(res.data.coinExpiryConfig);
      }
    }).catch(() => {/* use defaults */});
  }, [isAuthenticated, authLoading]);

  // Convert expiryDays to user-friendly string
  const getExpiryText = (coinType: string, defaultText: string): string => {
    if (!liveExpiryConfig?.[coinType]) return defaultText;
    const days = liveExpiryConfig[coinType]?.expiryDays ?? 0;
    if (days === 0) return 'Never expires';
    if (days <= 31) return `${days} days`;
    if (days === 90) return '3 months';
    if (days === 180) return '6 months';
    if (days === 365) return '12 months';
    return `${Math.round(days / 30)} months`;
  };

  // Build FAQ with dynamic expiry answer
  const FAQ_ITEMS: FAQItem[] = FAQ_ITEMS_STATIC.map(item =>
    item.answer === '__DYNAMIC_EXPIRY__'
      ? { ...item, answer: `It depends on the coin type. ReZ Coins: ${getExpiryText('rez', 'Never expires')}. Privé Coins: ${getExpiryText('prive', '12 months')}. Branded Coins: ${getExpiryText('branded', 'Set by merchant')}. Promo Coins expire based on the specific campaign end date. Check expiry in your Wallet.` }
      : item
  );

  // Build COIN_TYPES with dynamic expiry from admin config
  const COIN_TYPES: CoinTypeInfo[] = COIN_TYPE_TEMPLATES.map(t => ({
    name: t.name,
    color: t.color,
    backgroundColor: t.backgroundColor,
    gradientColors: t.gradientColors,
    icon: t.icon,
    description: t.description,
    expiry: t.key === 'promo'
      ? (getExpiryText(t.key, t.defaultExpiry) === 'Never expires' ? 'Per campaign' : getExpiryText(t.key, t.defaultExpiry))
      : getExpiryText(t.key, t.defaultExpiry),
    earnedFrom: t.earnedFrom,
    usableAt: t.usableAt,
  }));

  const toggleFAQ = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFAQ(prev => prev === index ? null : index);
  };

  // ============================================
  // RENDER SECTIONS
  // ============================================

  const renderCoinTypeCard = (coin: CoinTypeInfo, index: number) => (
    <View key={coin.name ?? `coin-${index}`} style={[styles.coinCard, { borderLeftColor: coin.color }]}>
      <View style={styles.coinCardHeader}>
        <View style={[styles.coinIconContainer, { backgroundColor: coin.backgroundColor }]}>
          <Ionicons name={coin.icon} size={24} color={coin.color} />
        </View>
        <View style={styles.coinCardHeaderText}>
          <Text style={[styles.coinName, { color: coin.color }]}>{coin.name}</Text>
          <View style={[styles.expiryBadge, { backgroundColor: coin.backgroundColor }]}>
            <Ionicons name="time-outline" size={12} color={coin.color} />
            <Text style={[styles.expiryBadgeText, { color: coin.color }]}>{coin.expiry}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.coinDescription}>{coin.description}</Text>
      <View style={styles.coinDetails}>
        <View style={styles.coinDetailRow}>
          <Text style={styles.coinDetailLabel}>Earned from:</Text>
          <Text style={styles.coinDetailValue}>{coin.earnedFrom}</Text>
        </View>
        <View style={styles.coinDetailRow}>
          <Text style={styles.coinDetailLabel}>Usable at:</Text>
          <Text style={styles.coinDetailValue}>{coin.usableAt}</Text>
        </View>
      </View>
    </View>
  );

  const renderEarningMethod = (method: EarningMethod, index: number) => (
    <View key={method.title ?? `earn-${index}`} style={styles.earningCard}>
      <View style={[styles.earningIconContainer, { backgroundColor: method.backgroundColor }]}>
        <Ionicons name={method.icon} size={22} color={method.color} />
      </View>
      <View style={styles.earningContent}>
        <Text style={styles.earningTitle}>{method.title}</Text>
        <Text style={styles.earningDescription}>{method.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.border.default} />
    </View>
  );

  const renderSpendingPriority = () => (
    <View style={styles.priorityContainer}>
      {SPENDING_PRIORITY.map((item, index) => (
        <React.Fragment key={item.name ?? `priority-${index}`}>
          <View style={styles.priorityItem}>
            <View style={[styles.priorityNumber, { backgroundColor: item.color }]}>
              <Text style={styles.priorityNumberText}>{item.priority}</Text>
            </View>
            <View style={[styles.priorityIconBg, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.priorityName}>{item.name}</Text>
          </View>
          {index < SPENDING_PRIORITY.length - 1 && (
            <View style={styles.priorityArrow}>
              <Ionicons name="arrow-down" size={18} color={Colors.border.default} />
            </View>
          )}
        </React.Fragment>
      ))}
      <View style={styles.priorityNote}>
        <Ionicons name="information-circle" size={16} color={Colors.text.tertiary} />
        <Text style={styles.priorityNoteText}>
          Coins with the nearest expiry are used first within each type
        </Text>
      </View>
    </View>
  );

  const renderExpiryTable = () => (
    <View style={styles.expiryTable}>
      <View style={styles.expiryTableHeader}>
        <Text style={[styles.expiryTableCell, styles.expiryTableHeaderText, { flex: 1.5 }]}>Coin Type</Text>
        <Text style={[styles.expiryTableCell, styles.expiryTableHeaderText, { flex: 1 }]}>Expiry</Text>
        <Text style={[styles.expiryTableCell, styles.expiryTableHeaderText, { flex: 1.2 }]}>Scope</Text>
      </View>
      {COIN_TYPES.map((coin, index) => (
        <View
          key={coin.name ?? `expiry-${index}`}
          style={[
            styles.expiryTableRow,
            index % 2 === 0 ? styles.expiryTableRowEven : null,
          ]}
        >
          <View style={[styles.expiryTableCell, { flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <View style={[styles.expiryDot, { backgroundColor: coin.color }]} />
            <Text style={styles.expiryTableText}>{coin.name}</Text>
          </View>
          <Text style={[styles.expiryTableCell, styles.expiryTableText, { flex: 1 }]}>{coin.expiry}</Text>
          <Text style={[styles.expiryTableCell, styles.expiryTableText, { flex: 1.2 }]}>{coin.usableAt}</Text>
        </View>
      ))}
    </View>
  );

  const renderFAQItem = (faq: FAQItem, index: number) => (
    <FAQItemComponent
      key={faq.question ?? `faq-${index}`}
      faq={faq}
      index={index}
      isExpanded={expandedFAQ === index}
      onToggle={toggleFAQ}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.nileBlue, '#2d5a7b'] as const}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>ReZ Coin System</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        {walletBalance !== null && (
          <View style={styles.headerBalance}>
            <Ionicons name="diamond" size={16} color={Colors.gold} />
            <Text style={styles.headerBalanceText}>
              Your Balance: RC {walletBalance}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Intro Section */}
        <View style={styles.introSection}>
          <View style={styles.introIconRow}>
            <Ionicons name="diamond" size={32} color={colors.brand.greenDark} />
            <Ionicons name="diamond-outline" size={28} color={colors.warningScale[400]} />
            <Ionicons name="storefront" size={28} color={colors.infoScale[400]} />
            <Ionicons name="gift" size={28} color={colors.warningScale[700]} />
          </View>
          <Text style={styles.introTitle}>Understanding Your Coins</Text>
          <Text style={styles.introSubtitle}>
            ReZ uses a multi-coin system to reward you in different ways. Each coin type has unique properties and uses.
          </Text>
        </View>

        {/* Section: Coin Types */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers" size={22} color={Colors.nileBlue} />
            <Text style={styles.sectionTitle}>Coin Types</Text>
          </View>
          {COIN_TYPES.map(renderCoinTypeCard)}
        </View>

        {/* Section: How to Earn */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={22} color={Colors.nileBlue} />
            <Text style={styles.sectionTitle}>How to Earn</Text>
          </View>
          <View style={styles.earningList}>
            {EARNING_METHODS.map(renderEarningMethod)}
          </View>
        </View>

        {/* Section: Spending Priority */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="swap-vertical" size={22} color={Colors.nileBlue} />
            <Text style={styles.sectionTitle}>Spending Priority</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            When you spend coins, the system automatically uses them in this order:
          </Text>
          {renderSpendingPriority()}
        </View>

        {/* Section: Expiry Rules */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={22} color={Colors.nileBlue} />
            <Text style={styles.sectionTitle}>Expiry Rules</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Quick reference for coin expiry policies
          </Text>
          {renderExpiryTable()}
        </View>

        {/* Section: FAQ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={22} color={Colors.nileBlue} />
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
          <View style={styles.faqList}>
            {FAQ_ITEMS.map(renderFAQItem)}
          </View>
        </View>

        {/* CTA: View My Wallet */}
        <View style={styles.ctaSection}>
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push('/wallet')}
           
            accessibilityLabel="View My Wallet"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[Colors.nileBlue, '#2d5a7b'] as const}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="wallet" size={22} color={Colors.gold} />
              <Text style={styles.ctaText}>View My Wallet</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
            </LinearGradient>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.inverse,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  headerBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignSelf: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  headerBalanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Intro Section
  introSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 28,
    backgroundColor: Colors.background.primary,
    marginBottom: Spacing.sm,
  },
  introIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: Spacing.base,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 21,
  },

  // Section
  section: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background.primary,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base,
    lineHeight: 20,
  },

  // Coin Type Cards
  coinCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderLeftWidth: 4,
    ...Shadows.subtle,
  },
  coinCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  coinIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coinCardHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coinName: {
    fontSize: 16,
    fontWeight: '700',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
  },
  expiryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  coinDescription: {
    fontSize: 13,
    color: Colors.text.tertiary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  coinDetails: {
    gap: 6,
  },
  coinDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  coinDetailLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '600',
    width: 90,
  },
  coinDetailValue: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },

  // Earning Methods
  earningList: {
    gap: 8,
  },
  earningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  earningIconContainer: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  earningContent: {
    flex: 1,
  },
  earningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  earningDescription: {
    fontSize: 12,
    color: Colors.text.tertiary,
    lineHeight: 17,
  },

  // Spending Priority
  priorityContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  priorityNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  priorityIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  priorityArrow: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  priorityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.sm,
  },
  priorityNoteText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    flex: 1,
    lineHeight: 17,
  },

  // Expiry Table
  expiryTable: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  expiryTableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.nileBlue,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  expiryTableHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  expiryTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  expiryTableRowEven: {
    backgroundColor: Colors.background.secondary,
  },
  expiryTableCell: {
    fontSize: 13,
  },
  expiryTableText: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  expiryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // FAQ Section
  faqList: {
    gap: 8,
  },
  faqItem: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  faqAnswerText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    lineHeight: 22,
    paddingHorizontal: Spacing.base,
    paddingBottom: 14,
  },

  // CTA Section
  ctaSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
  },
  ctaButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: Colors.nileBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
});

export default withErrorBoundary(CoinSystemPage, 'CoinSystem');
