import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

/**
 * ReturnPolicyCard Component
 *
 * Displays return and exchange policy information
 * Features:
 * - Collapsible policy details
 * - Return window information
 * - Conditions and requirements
 * - Contact information
 * - Visual indicators for policy status
 */

interface ReturnPolicy {
  isReturnable: boolean;
  returnWindow: number; // Days
  isExchangeable: boolean;
  exchangeWindow: number; // Days
  conditions: string[];
  nonReturnableReasons?: string[];
  contactInfo?: string;
}

interface ReturnPolicyCardProps {
  productId: string;
  categoryId?: string;
  storeId?: string;
  customPolicy?: ReturnPolicy;
}

export const ReturnPolicyCard: React.FC<ReturnPolicyCardProps> = ({
  productId,
  categoryId,
  storeId,
  customPolicy,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Default policy if not provided
  const defaultPolicy: ReturnPolicy = {
    isReturnable: true,
    returnWindow: 7,
    isExchangeable: true,
    exchangeWindow: 7,
    conditions: [
      'Product must be unused and in original packaging',
      'Tags and labels should be intact',
      'Return initiated within the return window',
      'Original invoice/receipt required',
    ],
    nonReturnableReasons: [
      'Product is damaged or used',
      'Return window has expired',
      'Missing original packaging or tags',
    ],
    contactInfo: 'Contact customer support for assistance',
  };

  // Use custom policy or default
  const policy = customPolicy || defaultPolicy;

  /**
   * Get policy status icon and color
   */
  const getPolicyStatus = () => {
    if (policy.isReturnable && policy.isExchangeable) {
      return {
        icon: 'checkmark-circle' as const,
        color: colors.successScale[400],
        text: 'Returns & Exchanges Available',
      };
    } else if (policy.isReturnable) {
      return {
        icon: 'checkmark-circle' as const,
        color: colors.successScale[400],
        text: 'Returns Available',
      };
    } else if (policy.isExchangeable) {
      return {
        icon: 'swap-horizontal' as const,
        color: colors.warningScale[400],
        text: 'Exchanges Only',
      };
    } else {
      return {
        icon: 'close-circle' as const,
        color: colors.error,
        text: 'No Returns or Exchanges',
      };
    }
  };

  const policyStatus = getPolicyStatus();

  return (
    <View style={styles.container}>
      {/* Header - Always Visible */}
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
       
      >
        <View style={styles.headerLeft}>
          <Ionicons name="refresh" size={20} color={colors.brand.purpleLight} />
          <ThemedText style={styles.title}>Return & Exchange Policy</ThemedText>
        </View>

        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.neutral[500]}
        />
      </Pressable>

      {/* Quick Status - Always Visible */}
      <View style={styles.statusRow}>
        <Ionicons name={policyStatus.icon} size={18} color={policyStatus.color} />
        <ThemedText style={[styles.statusText, { color: policyStatus.color }]}>
          {policyStatus.text}
        </ThemedText>
      </View>

      {/* Time Windows - Always Visible */}
      <View style={styles.quickInfo}>
        {policy.isReturnable && (
          <View style={styles.quickInfoItem}>
            <Ionicons name="time-outline" size={16} color={colors.neutral[500]} />
            <ThemedText style={styles.quickInfoText}>
              {policy.returnWindow}-day returns
            </ThemedText>
          </View>
        )}
        {policy.isExchangeable && (
          <View style={styles.quickInfoItem}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.neutral[500]} />
            <ThemedText style={styles.quickInfoText}>
              {policy.exchangeWindow}-day exchange
            </ThemedText>
          </View>
        )}
      </View>

      {/* Detailed Policy - Expandable */}
      {isExpanded && (
        <View style={styles.detailsContainer}>
          {/* Divider */}
          <View style={styles.divider} />

          {/* Return Policy Details */}
          {policy.isReturnable && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="arrow-undo" size={18} color={colors.brand.purpleLight} />
                <ThemedText style={styles.sectionTitle}>Return Policy</ThemedText>
              </View>
              <ThemedText style={styles.sectionDescription}>
                Items can be returned within {policy.returnWindow} days of delivery for a full
                refund.
              </ThemedText>
            </View>
          )}

          {/* Exchange Policy Details */}
          {policy.isExchangeable && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="swap-horizontal" size={18} color={colors.brand.purpleLight} />
                <ThemedText style={styles.sectionTitle}>Exchange Policy</ThemedText>
              </View>
              <ThemedText style={styles.sectionDescription}>
                Items can be exchanged within {policy.exchangeWindow} days for a different size,
                color, or variant.
              </ThemedText>
            </View>
          )}

          {/* Conditions */}
          {policy.conditions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={18} color={colors.brand.purpleLight} />
                <ThemedText style={styles.sectionTitle}>Conditions</ThemedText>
              </View>
              <View style={styles.conditionsList}>
                {policy.conditions.map((condition, index) => (
                  <View key={index} style={styles.conditionItem}>
                    <View style={styles.bullet} />
                    <ThemedText style={styles.conditionText}>{condition}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Non-Returnable Reasons */}
          {policy.nonReturnableReasons && policy.nonReturnableReasons.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle" size={18} color={colors.warningScale[400]} />
                <ThemedText style={styles.sectionTitle}>Non-Returnable If</ThemedText>
              </View>
              <View style={styles.conditionsList}>
                {policy.nonReturnableReasons.map((reason, index) => (
                  <View key={index} style={styles.conditionItem}>
                    <Ionicons name="close-circle" size={12} color={colors.error} />
                    <ThemedText style={styles.conditionText}>{reason}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contact Info */}
          {policy.contactInfo && (
            <View style={styles.contactContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.brand.purpleLight} />
              <ThemedText style={styles.contactText}>{policy.contactInfo}</ThemedText>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable style={styles.actionButton}>
              <Ionicons name="document-text-outline" size={18} color={colors.brand.purpleLight} />
              <ThemedText style={styles.actionButtonText}>View Full Policy</ThemedText>
            </Pressable>

            {(policy.isReturnable || policy.isExchangeable) && (
              <Pressable style={styles.actionButton}>
                <Ionicons name="arrow-undo-outline" size={18} color={colors.brand.purpleLight} />
                <ThemedText style={styles.actionButtonText}>Initiate Return</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: 16,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Quick Info
  quickInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickInfoText: {
    fontSize: 13,
    color: colors.neutral[500],
  },

  // Details Container
  detailsContainer: {
    marginTop: 16,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginBottom: 16,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    lineHeight: 20,
  },

  // Conditions List
  conditionsList: {
    gap: 8,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.purpleLight,
    marginTop: 6,
  },
  conditionText: {
    fontSize: 13,
    color: colors.neutral[500],
    flex: 1,
    lineHeight: 18,
  },

  // Contact
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.pink,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  contactText: {
    fontSize: 13,
    color: colors.brand.purple,
    flex: 1,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.pink,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
});

export default React.memo(ReturnPolicyCard);
