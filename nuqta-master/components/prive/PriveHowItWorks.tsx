/**
 * PriveHowItWorks - 3-step earn/share/pay guide
 * Shows how ReZ Privé works with coin type explainer
 */

import { colors } from '@/constants/theme';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';

interface HowItWorksStep {
  id: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  route?: string;
}

const getSteps = (currencySymbol: string): HowItWorksStep[] => [
  {
    id: 'earn',
    icon: '↑',
    iconColor: colors.brand.emerald,
    iconBgColor: 'rgba(76, 175, 80, 0.15)',
    title: 'Earn Coins',
    description: 'Shop, share content, & complete campaigns',
    badge: '+15-50%',
    badgeColor: colors.brand.emerald,
    route: '/explore',
  },
  {
    id: 'share',
    icon: '◎',
    iconColor: '#64B5F6',
    iconBgColor: 'rgba(100, 181, 246, 0.15)',
    title: 'Share & Earn More',
    description: 'Post your experience, submit link, get bonus',
    badge: 'Cashback',
    badgeColor: '#64B5F6',
    route: '/prive/review-earn',
  },
  {
    id: 'pay',
    icon: '◈',
    iconColor: PRIVE_COLORS.gold.primary,
    iconBgColor: PRIVE_COLORS.transparent.gold15,
    title: 'Pay with Coins',
    description: `Use ${BRAND.APP_NAME}, Branded, or Privé coins at checkout`,
    badge: `Save ${currencySymbol}${currencySymbol}`,
    badgeColor: PRIVE_COLORS.gold.primary,
    route: '/prive/redeem',
  },
];

const COIN_TYPES = [
  { color: PRIVE_COLORS.gold.primary, name: BRAND.APP_NAME, type: 'Universal' },
  { color: '#B8860B', name: 'Privé', type: 'Premium' },
  { color: '#64B5F6', name: 'Branded', type: 'Brand-specific' },
];

export const PriveHowItWorks: React.FC = () => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const steps = getSteps(currencySymbol);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>HOW REZ PRIVE WORKS</Text>

      <View style={styles.howItWorksCard}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <Pressable
              style={styles.step}
              onPress={() => step.route && router.push(step.route as any)}
             
            >
              <View style={[styles.stepIcon, { backgroundColor: step.iconBgColor }]}>
                <Text style={[styles.stepIconText, { color: step.iconColor }]}>{step.icon}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
              <View style={styles.stepBadge}>
                <Text style={[styles.stepBadgeText, { color: step.badgeColor }]}>{step.badge}</Text>
              </View>
            </Pressable>
            {index < steps.length - 1 && <View style={styles.stepDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Coin Types Explainer */}
      <View style={styles.coinTypesCard}>
        <Text style={styles.coinTypesTitle}>Your Coin Types:</Text>
        <View style={styles.coinTypesRow}>
          {COIN_TYPES.map((coin) => (
            <View key={coin.name} style={styles.coinTypeItem}>
              <View style={[styles.coinTypeDot, { backgroundColor: coin.color }]} />
              <Text style={styles.coinTypeName}>{coin.name}</Text>
              <Text style={styles.coinTypeType}>{coin.type}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: PRIVE_SPACING.xxl,
    paddingHorizontal: PRIVE_SPACING.xl,
  },
  sectionLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    letterSpacing: 1.5,
    marginBottom: PRIVE_SPACING.lg,
  },
  howItWorksCard: {
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    overflow: 'hidden',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: PRIVE_SPACING.lg,
    gap: PRIVE_SPACING.md,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconText: {
    fontSize: 20,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
    gap: PRIVE_SPACING.xs,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  stepDescription: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  stepBadge: {
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: PRIVE_SPACING.xs,
    backgroundColor: PRIVE_COLORS.transparent.white05,
    borderRadius: PRIVE_RADIUS.sm,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepDivider: {
    height: 1,
    backgroundColor: PRIVE_COLORS.transparent.white08,
    marginHorizontal: PRIVE_SPACING.lg,
  },
  coinTypesCard: {
    marginTop: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  coinTypesTitle: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    marginBottom: PRIVE_SPACING.md,
  },
  coinTypesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  coinTypeItem: {
    alignItems: 'center',
    gap: PRIVE_SPACING.xs,
  },
  coinTypeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: PRIVE_SPACING.xs,
  },
  coinTypeName: {
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
    fontWeight: '500',
  },
  coinTypeType: {
    fontSize: 10,
    color: PRIVE_COLORS.text.tertiary,
  },
});

export default React.memo(PriveHowItWorks);
