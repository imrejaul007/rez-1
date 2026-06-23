/**
 * Enhanced Payment Method
 * 
 * Payment method card with offers, badges, and provider icons
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EnhancedPaymentMethod as EnhancedPaymentMethodType, PaymentBadgeType } from '@/types/storePayment.types';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

interface EnhancedPaymentMethodProps {
  method: EnhancedPaymentMethodType;
  isSelected: boolean;
  onSelect: () => void;
}

const BADGE_STYLES: Record<PaymentBadgeType, { bg: string; text: string; label: string }> = {
  best: { bg: colors.successScale[500], text: colors.background.primary, label: 'Best' },
  popular: { bg: colors.primary[500], text: colors.background.primary, label: 'Popular' },
  new: { bg: colors.secondary[500], text: colors.background.primary, label: 'New' },
};

export const EnhancedPaymentMethodCard: React.FC<EnhancedPaymentMethodProps> = ({
  method,
  isSelected,
  onSelect,
}) => {
  const hasOffers = method.offers && method.offers.length > 0;

  return (
    <Pressable
      style={[styles.container, isSelected && styles.containerSelected]}
      onPress={onSelect}
     
    >
      <View style={styles.mainRow}>
        {/* Icon */}
        <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
          <Ionicons
            name={method.icon as any}
            size={24}
            color={isSelected ? colors.primary[500] : colors.neutral[500]}
          />
        </View>

        {/* Method Info */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.methodName}>{method.name}</Text>
            {method.badge && (
              <View style={[styles.badge, { backgroundColor: BADGE_STYLES[method.badge].bg }]}>
                <Text style={[styles.badgeText, { color: BADGE_STYLES[method.badge].text }]}>
                  {BADGE_STYLES[method.badge].label}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.methodDesc}>{method.description}</Text>
        </View>

        {/* Selection Indicator */}
        {isSelected ? (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
        ) : (
          <Ionicons name="ellipse-outline" size={24} color={colors.neutral[300]} />
        )}
      </View>

      {/* Offers Section */}
      {hasOffers && (
        <View style={styles.offersContainer}>
          {method.offers.slice(0, 2).map((offer, index) => (
            <View key={index} style={styles.offerRow}>
              <View style={styles.offerIcon}>
                <Ionicons
                  name={
                    offer.type === 'cashback' ? 'cash-outline' :
                    offer.type === 'discount' ? 'pricetag-outline' :
                    offer.type === 'emi' ? 'calendar-outline' :
                    'gift-outline'
                  }
                  size={12}
                  color={colors.successScale[500]}
                />
              </View>
              <Text style={styles.offerText} numberOfLines={1}>
                {offer.title}
              </Text>
              {offer.banks && offer.banks.length > 0 && (
                <Text style={styles.offerBanks}>
                  {offer.banks.slice(0, 2).join(', ')}
                </Text>
              )}
            </View>
          ))}
          {method.offers.length > 2 && (
            <Text style={styles.moreOffers}>
              +{method.offers.length - 2} more offers
            </Text>
          )}
        </View>
      )}

      {/* Providers */}
      {method.providers && method.providers.length > 0 && method.type === 'pay_later' && (
        <View style={styles.providersContainer}>
          <Text style={styles.providersLabel}>Pay with:</Text>
          <View style={styles.providersList}>
            {method.providers.map((provider, index) => (
              <View key={index} style={styles.providerChip}>
                <Text style={styles.providerText}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  containerSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerSelected: {
    backgroundColor: colors.primary[100],
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  methodName: {
    ...typography.button,
    color: colors.text.primary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  methodDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  offersContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: spacing.xs,
  },
  offerIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.successScale[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerText: {
    ...typography.caption,
    color: colors.successScale[700],
    flex: 1,
  },
  offerBanks: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.tertiary,
  },
  moreOffers: {
    ...typography.caption,
    color: colors.primary[500],
    marginTop: 4,
  },
  providersContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  providersLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  providersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  providerChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
  },
  providerText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
});

export default React.memo(EnhancedPaymentMethodCard);
