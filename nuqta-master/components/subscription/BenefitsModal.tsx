// Benefits Modal Component
// Shows detailed tier benefits comparison in a modal

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { SubscriptionTier, TIER_COLORS, TIER_GRADIENTS } from '@/types/subscription.types';
import {
  SUBSCRIPTION_COLORS,
  SUBSCRIPTION_SPACING,
  SUBSCRIPTION_BORDER_RADIUS,
  SUBSCRIPTION_SHADOW,
} from '@/styles/subscriptionStyles';
import { colors } from '@/constants/theme';

interface BenefitsModalProps {
  visible: boolean;
  tier?: SubscriptionTier;
  onClose: () => void;
  onUpgrade?: () => void;
}

interface BenefitItem {
  icon: string;
  title: string;
  description: string;
  available: {
    free: boolean;
    premium: boolean;
    vip: boolean;
  };
}

const BENEFITS_DATA: BenefitItem[] = [
  {
    icon: 'cash-outline',
    title: 'Cashback Rate',
    description: 'Earn cashback on every purchase',
    available: {
      free: true,
      premium: true,
      vip: true,
    },
  },
  {
    icon: 'bicycle-outline',
    title: 'Free Delivery',
    description: 'Get free shipping on orders',
    available: {
      free: false,
      premium: true,
      vip: true,
    },
  },
  {
    icon: 'headset-outline',
    title: 'Priority Support',
    description: '24/7 dedicated customer support',
    available: {
      free: false,
      premium: true,
      vip: true,
    },
  },
  {
    icon: 'pricetag-outline',
    title: 'Exclusive Deals',
    description: 'Access exclusive member-only offers',
    available: {
      free: false,
      premium: true,
      vip: true,
    },
  },
  {
    icon: 'heart-outline',
    title: 'Unlimited Wishlists',
    description: 'Create unlimited product wishlists',
    available: {
      free: true,
      premium: true,
      vip: true,
    },
  },
  {
    icon: 'flash-outline',
    title: 'Early Flash Sales',
    description: 'Access flash sales before others',
    available: {
      free: false,
      premium: false,
      vip: true,
    },
  },
  {
    icon: 'person-outline',
    title: 'Personal Shopper',
    description: 'Get personalized shopping assistance',
    available: {
      free: false,
      premium: false,
      vip: true,
    },
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Concierge Service',
    description: 'Premium concierge assistance',
    available: {
      free: false,
      premium: false,
      vip: true,
    },
  },
  {
    icon: 'calendar-outline',
    title: 'Premium Events',
    description: 'Exclusive VIP member events',
    available: {
      free: false,
      premium: false,
      vip: true,
    },
  },
];

function BenefitsModal({
  visible,
  tier,
  onClose,
  onUpgrade,
}: BenefitsModalProps) {
  const tierColor = tier ? TIER_COLORS[tier] : SUBSCRIPTION_COLORS.purple;
  const tierGradient = tier ? TIER_GRADIENTS[tier] : [colors.brand.purpleLight, colors.brand.purpleSoft];

  const renderBenefitRow = (benefit: BenefitItem) => (
    <View key={benefit.title} style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Ionicons name={benefit.icon as any} size={20} color={tierColor} />
      </View>
      <View style={styles.benefitContent}>
        <ThemedText style={styles.benefitTitle}>{benefit.title}</ThemedText>
        <ThemedText style={styles.benefitDescription}>{benefit.description}</ThemedText>
      </View>
      <View style={styles.benefitChecks}>
        {['free', 'premium', 'vip'].map((t) => {
          const isAvailable = benefit.available[t as SubscriptionTier];
          return (
            <View
              key={t}
              style={[
                styles.checkIcon,
                {
                  backgroundColor: isAvailable ? `${tierColor}20` : SUBSCRIPTION_COLORS.border,
                },
              ]}
            >
              <Ionicons
                name={isAvailable ? 'checkmark' : 'close'}
                size={16}
                color={isAvailable ? tierColor : SUBSCRIPTION_COLORS.textSecondary}
              />
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient colors={tierGradient as any} style={styles.header}>
          <View style={styles.headerContent}>
            <ThemedText style={styles.headerTitle}>Subscription Benefits</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Compare features across all tiers
            </ThemedText>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={SUBSCRIPTION_COLORS.white} />
          </Pressable>
        </LinearGradient>

        {/* Tier Headers */}
        <View style={styles.tierHeaderContainer}>
          <View style={styles.tierHeaderLabel} />
          {(['free', 'premium', 'vip'] as SubscriptionTier[]).map((t) => (
            <View key={t} style={styles.tierHeader}>
              <ThemedText style={styles.tierHeaderText}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Benefits List */}
        <ScrollView
          style={styles.benefitsContainer}
          contentContainerStyle={styles.benefitsContent}
          showsVerticalScrollIndicator={false}
        >
          {BENEFITS_DATA.map(renderBenefitRow)}
        </ScrollView>

        {/* Footer CTA */}
        {tier && tier !== 'vip' && (
          <View style={styles.footerCTA}>
            <Pressable
              style={[styles.upgradeButton, { backgroundColor: tierColor }]}
              onPress={() => {
                onUpgrade?.();
                onClose();
              }}
            >
              <ThemedText style={styles.upgradeButtonText}>
                {tier === 'free' ? 'View Premium Plans' : 'Upgrade to VIP'}
              </ThemedText>
              <Ionicons name="arrow-forward" size={20} color={SUBSCRIPTION_COLORS.white} />
            </Pressable>
            <Pressable style={styles.closeButtonFooter} onPress={onClose}>
              <ThemedText style={styles.closeButtonText}>Close</ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SUBSCRIPTION_COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: SUBSCRIPTION_SPACING.xl,
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
    marginRight: SUBSCRIPTION_SPACING.lg,
  },
  headerTitle: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SUBSCRIPTION_SPACING.xs,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  closeButton: {
    padding: SUBSCRIPTION_SPACING.md,
    marginTop: -SUBSCRIPTION_SPACING.md,
    marginRight: -SUBSCRIPTION_SPACING.md,
  },
  tierHeaderContainer: {
    flexDirection: 'row',
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    paddingVertical: SUBSCRIPTION_SPACING.md,
    backgroundColor: SUBSCRIPTION_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: SUBSCRIPTION_COLORS.border,
  },
  tierHeaderLabel: {
    flex: 1.5,
  },
  tierHeader: {
    flex: 1,
    alignItems: 'center',
  },
  tierHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.text,
    textAlign: 'center',
  },
  benefitsContainer: {
    flex: 1,
  },
  benefitsContent: {
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    paddingVertical: SUBSCRIPTION_SPACING.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: SUBSCRIPTION_COLORS.border,
    gap: SUBSCRIPTION_SPACING.md,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    backgroundColor: `${SUBSCRIPTION_COLORS.purple}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1.5,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SUBSCRIPTION_COLORS.text,
    marginBottom: SUBSCRIPTION_SPACING.xs,
  },
  benefitDescription: {
    fontSize: 12,
    color: SUBSCRIPTION_COLORS.textSecondary,
  },
  benefitChecks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: SUBSCRIPTION_SPACING.sm,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCTA: {
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: SUBSCRIPTION_COLORS.border,
    backgroundColor: SUBSCRIPTION_COLORS.white,
    gap: SUBSCRIPTION_SPACING.md,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    gap: SUBSCRIPTION_SPACING.md,
  },
  upgradeButtonText: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButtonFooter: {
    paddingVertical: SUBSCRIPTION_SPACING.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: SUBSCRIPTION_COLORS.textSecondary,
  },
});

export default React.memo(BenefitsModal);
