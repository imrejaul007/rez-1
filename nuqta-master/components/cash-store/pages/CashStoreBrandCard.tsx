import React, { memo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CashStoreBrand } from '../../../types/cash-store.types';
import { colors } from '@/constants/theme';

interface CashStoreBrandCardProps {
  brand: CashStoreBrand;
  index: number;
  onPress: (brand: CashStoreBrand) => void;
}

const CashStoreBrandCard: React.FC<CashStoreBrandCardProps> = ({ brand, index, onPress }) => {
  const fadeAnim = useSharedValue(0);
  const pressAnim = useSharedValue(1);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 350 });
  }, [index]);

  const handlePressIn = () => {
    pressAnim.value = withSpring(0.975, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    pressAnim.value = withSpring(1, { damping: 15, stiffness: 120 });
  };

  const isHot = brand.cashbackRate >= 10;
  const cashbackColor = isHot ? colors.successScale[700] : colors.nileBlue;
  const cashbackBg = isHot ? colors.tint.greenLight : '#F0F4F8';

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { scale: pressAnim.value },
      { translateY: interpolate(fadeAnim.value, [0, 1], [12, 0]) },
    ],
  }));

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <Pressable
        onPress={() => onPress(brand)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}

        style={styles.card}
      >
        {/* Hot deal accent */}
        {isHot && <View style={styles.hotAccent} />}

        {/* Logo */}
        <View style={[styles.logoArea, isHot && styles.logoAreaHot]}>
          {brand.logo?.startsWith('http') && !logoError ? (
            <CachedImage
              source={brand.logo}
              style={styles.logo}
              contentFit="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <LinearGradient colors={[colors.nileBlue, colors.brand.nileBlueLight]} style={styles.logoPlaceholder}>
              <Text style={styles.logoInitial}>{(!brand.logo || logoError) ? brand.name.charAt(0).toUpperCase() : brand.logo}</Text>
            </LinearGradient>
          )}
        </View>

        {/* Info Column */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.brandName} numberOfLines={1}>
              {brand.name}
            </Text>
            {brand.isFeatured && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.infoScale[400]} />
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {brand.category ? (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{brand.category}</Text>
              </View>
            ) : null}
            {brand.rating ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={9} color={colors.warningScale[400]} />
                <Text style={styles.ratingText}>{brand.rating.toFixed(1)}</Text>
                {brand.ratingCount ? (
                  <Text style={styles.ratingCount}>
                    ({brand.ratingCount > 999 ? `${(brand.ratingCount / 1000).toFixed(0)}K` : brand.ratingCount})
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Trust indicators row */}
          <View style={styles.trustRow}>
            {isHot && (
              <View style={styles.hotTag}>
                <Ionicons name="flame" size={10} color={colors.background.primary} />
                <Text style={styles.hotTagText}>Hot Deal</Text>
              </View>
            )}
            {brand.successRate && brand.successRate >= 90 ? (
              <View style={styles.trustPill}>
                <Ionicons name="shield-checkmark" size={9} color={colors.successScale[700]} />
                <Text style={styles.trustText}>{Math.round(brand.successRate)}% success</Text>
              </View>
            ) : null}
            <View style={styles.trustPill}>
              <Ionicons name="time-outline" size={9} color="#7C8A97" />
              <Text style={styles.trustText}>~7 day payout</Text>
            </View>
          </View>
        </View>

        {/* REZ Coin Reward Badge */}
        <View style={styles.cashbackOuter}>
          <View style={[styles.cashbackBadge, { backgroundColor: cashbackBg }]}>
            {(() => {
              const coins = brand.rezCoinReward?.coinsPerHundred;
              const coinActive = brand.rezCoinReward?.isActive !== false;
              if (coins != null && coinActive) {
                return (
                  <>
                    <Text style={[styles.cashbackUpTo, { color: isHot ? colors.successScale[700] : colors.neutral[400] }]}>
                      {coins}
                    </Text>
                    <Text style={[styles.cashbackRate, { color: cashbackColor, fontSize: 10 }]}>coins</Text>
                    <Text style={[styles.cashbackLabel, { color: isHot ? colors.successScale[700] : colors.neutral[500] }]}>
                      /₹100
                    </Text>
                  </>
                );
              }
              return (
                <>
                  {brand.maxCashback ? (
                    <Text style={[styles.cashbackUpTo, { color: isHot ? colors.successScale[700] : colors.neutral[400] }]}>Up to</Text>
                  ) : null}
                  <Text style={[styles.cashbackRate, { color: cashbackColor }]}>{brand.cashbackRate}%</Text>
                  <Text style={[styles.cashbackLabel, { color: isHot ? colors.successScale[700] : colors.neutral[500] }]}>cashback</Text>
                </>
              );
            })()}
          </View>
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={12} color={colors.nileBlue} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: { marginHorizontal: 16, marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.primary,
    borderRadius: 18, padding: 14, gap: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EBE4',
    ...Platform.select({
      ios: { shadowColor: colors.nileBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 10px rgba(26,58,82,0.06)' },
    }),
  },
  hotAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: colors.successScale[400], borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  logoArea: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#F8F5F0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#EFEBE6' },
  logoAreaHot: { borderColor: 'rgba(16,185,129,0.2)' },
  logo: { width: 34, height: 34 },
  logoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  logoInitial: { fontSize: 18, fontWeight: '700', color: colors.background.primary },
  infoContainer: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandName: { fontSize: 14, fontWeight: '700', color: '#0F172A', flexShrink: 1, letterSpacing: -0.2 },
  verifiedBadge: { marginLeft: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  categoryChip: { backgroundColor: '#F4F1ED', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  categoryText: { fontSize: 10, fontWeight: '600', color: '#7C8A97', textTransform: 'capitalize' },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#7C8A97' },
  ratingCount: { fontSize: 10, color: '#B0B8C1' },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  hotTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.successScale[400], paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  hotTagText: { fontSize: 10, fontWeight: '700', color: colors.background.primary },
  trustPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F4F1ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  trustText: { fontSize: 9, fontWeight: '600', color: '#7C8A97' },
  cashbackOuter: { alignItems: 'center', gap: 6 },
  cashbackBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, minWidth: 56 },
  cashbackUpTo: { fontSize: 8, fontWeight: '600', marginBottom: -2 },
  cashbackRate: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  cashbackLabel: { fontSize: 9, fontWeight: '600', marginTop: -1 },
  arrowCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F4F1ED', justifyContent: 'center', alignItems: 'center' },
});

export default memo(CashStoreBrandCard);
