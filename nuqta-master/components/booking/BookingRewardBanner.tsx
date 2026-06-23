/**
 * BookingRewardBanner — Prominent reward display on booking pages
 * Shows cashback/coins the user will earn from this booking.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';

interface BookingRewardBannerProps {
  cashback?: number;
  coins?: number;
  discount?: number | string;
  storeName?: string;
}

function BookingRewardBanner({ cashback, coins, discount, storeName }: BookingRewardBannerProps) {
  const hasReward = (cashback && cashback > 0) || (coins && coins > 0) || discount;
  if (!hasReward) return null;

  const parts: string[] = [];
  if (cashback && cashback > 0) parts.push(`${cashback.toFixed(0)} cashback`);
  if (coins && coins > 0) parts.push(`${coins} ${BRAND.COIN_NAME}`);
  if (discount) parts.push(`${discount}${typeof discount === 'number' ? '%' : ''} off`);

  return (
    <LinearGradient
      colors={['#7C3AED', '#9333EA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <CachedImage
        source={BRAND.COIN_IMAGE}
        style={styles.coinImage}
        contentFit="contain"
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>You'll earn with this booking</Text>
        <Text style={styles.reward}>{parts.join(' + ')}</Text>
        {storeName ? (
          <Text style={styles.store}>at {storeName}</Text>
        ) : null}
      </View>
      <Ionicons name="gift-outline" size={20} color="rgba(255,255,255,0.5)" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#7C3AED', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  coinImage: {
    width: 36,
    height: 36,
    backgroundColor: 'transparent',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  reward: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  store: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
});

export default React.memo(BookingRewardBanner);
