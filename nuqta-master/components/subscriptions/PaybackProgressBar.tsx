/**
 * PaybackProgressBar - Shows how quickly a subscription pays for itself
 * through estimated monthly savings vs subscription cost.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface PaybackProgressBarProps {
  subscriptionCost: number;
  estimatedMonthlySavings: number;
  currencySymbol: string;
}

function PaybackProgressBar({
  subscriptionCost,
  estimatedMonthlySavings,
  currencySymbol,
}: PaybackProgressBarProps) {
  const progressAnim = useSharedValue(0);

  const ratio = subscriptionCost > 0
    ? Math.min(1, estimatedMonthlySavings / subscriptionCost)
    : 0;

  const paysForItself = estimatedMonthlySavings >= subscriptionCost && subscriptionCost > 0;
  const paybackOrders = estimatedMonthlySavings > 0
    ? Math.ceil(subscriptionCost / estimatedMonthlySavings)
    : 0;

  useEffect(() => {
    progressAnim.value = 0;
    progressAnim.value = withSpring(ratio, { damping: 20, stiffness: 80 });
  }, [ratio]);

  const animatedWidthStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  if (subscriptionCost <= 0) return null;

  return (
    <View style={styles.card}>
      {/* Cost vs Savings row */}
      <View style={styles.row}>
        <Text style={styles.costLabel}>
          Cost {currencySymbol}{subscriptionCost.toFixed(2)}
        </Text>
        <Text style={styles.savingsLabel}>
          Savings {currencySymbol}{estimatedMonthlySavings.toFixed(2)}/mo
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barBackground}>
        <Animated.View style={[styles.barFill, animatedWidthStyle]} />
      </View>

      {/* Payback message */}
      {paysForItself ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SAVES MORE THAN IT COSTS</Text>
        </View>
      ) : paybackOrders > 0 ? (
        <Text style={styles.paybackText}>
          Pays for itself in {paybackOrders} {paybackOrders === 1 ? 'order' : 'orders'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  costLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  savingsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2ECC71',
  },
  barBackground: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2ECC71',
  },
  paybackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a3a52',
    marginTop: 10,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
});

export default React.memo(PaybackProgressBar);
