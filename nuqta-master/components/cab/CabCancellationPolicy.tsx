/**
 * Cab Cancellation Policy - Displays cancellation terms
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface CancellationPolicy {
  freeCancellation: boolean;
  cancellationDeadline: string;
  refundPercentage: number;
}

interface CabCancellationPolicyProps {
  policy: CancellationPolicy;
}

const CabCancellationPolicy: React.FC<CabCancellationPolicyProps> = ({ policy }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={24} color={colors.brand.amber} />
        <Text style={styles.title}>Cancellation Policy</Text>
      </View>
      
      <View style={styles.policyCard}>
        <View style={styles.policyHeader}>
          <Ionicons 
            name={policy.freeCancellation ? 'checkmark-circle' : 'close-circle'} 
            size={24} 
            color={policy.freeCancellation ? colors.success : colors.error} 
          />
          <Text style={styles.policyTitle}>
            {policy.freeCancellation ? 'Free Cancellation' : 'Cancellation Policy'}
          </Text>
        </View>
        
        <Text style={styles.policyText}>
          Cancel {policy.cancellationDeadline} hours before pickup for a {policy.refundPercentage}% refund.
        </Text>
        
        {policy.freeCancellation && (
          <View style={styles.badge}>
            <Ionicons name="gift" size={16} color={colors.success} />
            <Text style={styles.badgeText}>No cancellation fees</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  policyCard: {
    padding: 20,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  policyText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.neutral[600],
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.tint.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
});

export default React.memo(CabCancellationPolicy);
