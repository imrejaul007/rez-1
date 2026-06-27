// @ts-nocheck
/**
 * CoinEducationOverlay — Swipeable education cards explaining coin types
 * Shows on first wallet visit or on "?" icon tap.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;

interface CoinType {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
  howToEarn: string[];
  howToUse: string;
  expiry: string;
}

const COIN_TYPES: CoinType[] = [
  {
    id: 'rez',
    name: `${BRAND.COIN_NAME}`,
    icon: 'star',
    color: colors.brand.purple,
    description: 'Your universal reward coins. Use them anywhere on the platform.',
    howToEarn: ['Shopping at partner stores', 'Daily check-ins', 'Referrals', 'Bill uploads'],
    howToUse: 'Redeem at any store or convert to vouchers',
    expiry: 'Never expire',
  },
  {
    id: 'promo',
    name: 'Promo Coins',
    icon: 'flash',
    color: '#F59E0B',
    description: 'Limited-time bonus coins from campaigns and promotions.',
    howToEarn: ['Special campaigns', 'Festival offers', 'First-time bonuses'],
    howToUse: 'Best for large bills — check max redemption per transaction',
    expiry: 'Expire based on campaign dates',
  },
  {
    id: 'branded',
    name: 'Branded Coins',
    icon: 'ribbon',
    color: '#3B82F6',
    description: 'Merchant-specific loyalty rewards — earn and redeem at specific stores.',
    howToEarn: ['Repeat visits to specific stores', 'Merchant loyalty programs'],
    howToUse: 'Only at the issuing store — great for your favorites',
    expiry: '6-month expiry',
  },
  {
    id: 'prive',
    name: `${BRAND.PRIVE_NAME} Coins`,
    icon: 'diamond',
    color: '#EC4899',
    description: 'Premium coins for elite members — higher value and exclusive perks.',
    howToEarn: ['Elite tier membership', 'Premium campaigns', 'Special achievements'],
    howToUse: 'Redeem for premium experiences and gift cards',
    expiry: '12-month expiry',
  },
];

interface CoinEducationOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

function CoinEducationOverlay({ visible, onDismiss }: CoinEducationOverlayProps) {
  const renderCard = useCallback(({ item }: { item: CoinType }) => (
    <View style={[styles.card, { borderColor: item.color + '30' }]}>
      <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>

      <Text style={styles.coinName}>{item.name}</Text>
      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to earn</Text>
        {item.howToEarn.map((way, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={[styles.bullet, { backgroundColor: item.color }]} />
            <Text style={styles.bulletText}>{way}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to use</Text>
        <Text style={styles.sectionText}>{item.howToUse}</Text>
      </View>

      <View style={[styles.expiryBadge, { backgroundColor: item.color + '10' }]}>
        <Ionicons name="time-outline" size={12} color={item.color} />
        <Text style={[styles.expiryText, { color: item.color }]}>{item.expiry}</Text>
      </View>
    </View>
  ), []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <CachedImage
                source={BRAND.COIN_IMAGE}
                style={styles.headerCoin}
                contentFit="contain"
              />
              <Text style={styles.headerTitle}>Understanding Your Coins</Text>
            </View>
            <Pressable onPress={onDismiss} hitSlop={12}>
              <Ionicons name="close-circle" size={28} color={colors.neutral[400]} />
            </Pressable>
          </View>

          <FlashList
            data={COIN_TYPES}
            keyExtractor={item => item.id}
            renderItem={renderCard}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 16}
            decelerationRate="fast"
            contentContainerStyle={styles.listContent}
            estimatedItemSize={150}
          />

          <Text style={styles.swipeHint}>Swipe to learn about each coin type</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    maxHeight: '80%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 8 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCoin: {
    width: 28,
    height: 28,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  coinName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 14,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  bulletText: {
    fontSize: 13,
    color: '#6B7280',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default React.memo(CoinEducationOverlay);
