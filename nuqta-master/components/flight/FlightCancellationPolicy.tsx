/**
 * Flight Cancellation Policy - Displays cancellation terms
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface CancellationPolicy {
  freeCancellation: boolean;
  cancellationDeadline: string; // hours before departure
  refundPercentage: number;
}

interface FlightCancellationPolicyProps {
  policy: CancellationPolicy;
}

const FlightCancellationPolicy: React.FC<FlightCancellationPolicyProps> = ({
  policy,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={24} color={colors.success} />
        <Text style={styles.title}>Cancellation Policy</Text>
      </View>

      <View style={styles.content}>
        {policy.freeCancellation ? (
          <View style={styles.policyItem}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.policyText}>
              Free cancellation available up to {policy.cancellationDeadline} hours before departure
            </Text>
          </View>
        ) : (
          <View style={styles.policyItem}>
            <Ionicons name="information-circle" size={20} color={colors.warningScale[400]} />
            <Text style={styles.policyText}>
              Cancellation charges apply. Refund: {policy.refundPercentage}% if cancelled before {policy.cancellationDeadline} hours
            </Text>
          </View>
        )}

        <View style={styles.policyItem}>
          <Ionicons name="time-outline" size={20} color={colors.neutral[500]} />
          <Text style={styles.policyText}>
            No refund for no-shows or cancellations within {policy.cancellationDeadline} hours of departure
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.successScale[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  content: {
    gap: 12,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  policyText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 20,
  },
});

export default React.memo(FlightCancellationPolicy);
