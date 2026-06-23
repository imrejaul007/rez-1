/**
 * SavingsHero - Displays total savings prominently inside the wallet gradient header.
 * Text is white/light since it renders on a dark gradient background.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SEGMENT_SAVINGS_LABEL: Record<string, string> = {
  verified_student: 'Student Savings',
  verified_employee: 'Work Perks Saved',
  verified_healthcare: 'Healthcare Savings',
  verified_defence: 'Defence Savings',
  verified_teacher: 'Teacher Benefits',
  verified_senior: 'Senior Benefits',
  verified_government: 'Govt Benefits',
};

interface SavingsHeroProps {
  totalSaved: number;
  thisMonth: number;
  currencySymbol: string;
  isHidden: boolean;
  segment?: string;
}

function SavingsHero({ totalSaved, thisMonth, currencySymbol, isHidden, segment }: SavingsHeroProps) {
  const savingsLabel = SEGMENT_SAVINGS_LABEL[segment ?? ''] ?? 'Your Total Savings';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{savingsLabel}</Text>
      <Text style={styles.amount}>
        {currencySymbol}{isHidden ? '****' : totalSaved.toLocaleString()}
      </Text>
      {thisMonth > 0 && (
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            +{currencySymbol}{isHidden ? '***' : thisMonth.toLocaleString()} this month
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffcd57',
    marginTop: 4,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  pillText: {
    fontSize: 12,
    color: '#ffcd57',
    fontWeight: '600',
  },
});

export default React.memo(SavingsHero);
