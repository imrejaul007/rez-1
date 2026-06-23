/**
 * ExtraWaysToSaveSection Component
 *
 * Shows additional ways to maximize savings through Cash Store
 */

import React, { memo } from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const EXTRA_WAYS = [
  {
    id: 1,
    icon: 'gift',
    title: 'Buy Gift Cards',
    description: 'Get additional cashback when you purchase gift cards for popular brands',
    cashback: 'Up to 5% extra',
    color: colors.brand.pink,
    gradient: [colors.brand.pink, '#BE185D'],
  },
  {
    id: 2,
    icon: 'pricetag',
    title: 'Use Coupon Codes',
    description: 'Stack cashback with exclusive coupon codes for maximum savings',
    cashback: 'Extra discounts',
    color: colors.brand.purpleLight,
    gradient: [colors.brand.purpleLight, colors.brand.purpleDeep],
  },
  {
    id: 3,
    icon: 'flash',
    title: 'Flash Deals',
    description: 'Grab time-limited offers with boosted cashback rates',
    cashback: 'Up to 50% cashback',
    color: colors.warningScale[400],
    gradient: [colors.warningScale[400], colors.warningScale[700]],
  },
  {
    id: 4,
    icon: 'sparkles',
    title: `Earn ${BRAND.COIN_NAME}`,
    description: `Earn bonus ${BRAND.COIN_NAME} on select purchases for extra rewards`,
    cashback: 'Bonus coins',
    color: colors.lightMustard,
    gradient: [colors.lightMustard, colors.nileBlue],
  },
];

const ExtraWayCard: React.FC<{
  way: typeof EXTRA_WAYS[0];
}> = ({ way }) => (
  <View style={styles.cardWrapper}>
    <LinearGradient
      colors={way.gradient as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.cardIconContainer}>
        <Ionicons name={way.icon as any} size={28} color={colors.background.primary} />
      </View>
      <Text style={styles.cardTitle}>{way.title}</Text>
      <Text style={styles.cardDescription}>{way.description}</Text>
      <View style={styles.cashbackBadge}>
        <Text style={styles.cashbackText}>{way.cashback}</Text>
      </View>
    </LinearGradient>
  </View>
);

const ExtraWaysToSaveSection: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="bulb" size={24} color={colors.warningScale[400]} />
        </View>
        <Text style={styles.headerTitle}>Extra Ways to Save</Text>
        <Text style={styles.headerSubtitle}>
          Maximize your savings with these additional features
        </Text>
      </View>

      {/* Cards Grid */}
      <View style={styles.cardsGrid}>
        {EXTRA_WAYS.map((way) => (
          <ExtraWayCard key={way.id} way={way} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: colors.neutral[50],
  },
  header: {
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tint.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: {
    width: '48%',
    minWidth: 150,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    minHeight: 180,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: 12,
  },
  cashbackBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default memo(ExtraWaysToSaveSection);
