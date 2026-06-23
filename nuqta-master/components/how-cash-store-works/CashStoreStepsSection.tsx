/**
 * CashStoreStepsSection Component
 *
 * 6-step guide showing how to earn cashback through Cash Store
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const STEPS = [
  {
    id: 1,
    icon: 'search',
    title: 'Find Your Brand',
    description: 'Browse through 1000+ partner brands or search for your favorite store',
    color: colors.infoScale[400],
  },
  {
    id: 2,
    icon: 'hand-right',
    title: 'Click Through',
    description: 'Tap on the brand to visit their website through our secure link',
    color: colors.brand.purpleLight,
  },
  {
    id: 3,
    icon: 'cart',
    title: 'Shop as Usual',
    description: 'Browse products and add items to your cart on the brand\'s website',
    color: colors.brand.pink,
  },
  {
    id: 4,
    icon: 'card',
    title: 'Complete Purchase',
    description: 'Pay using any payment method and complete your order',
    color: colors.warningScale[400],
  },
  {
    id: 5,
    icon: 'time',
    title: 'Track Your Cashback',
    description: 'Cashback is tracked automatically and appears as pending within 24-48 hours',
    color: colors.successScale[400],
  },
  {
    id: 6,
    icon: 'wallet',
    title: 'Get Paid',
    description: 'Once confirmed, cashback is credited directly to your ReZ wallet',
    color: colors.brand.green,
  },
];

const StepCard: React.FC<{
  step: typeof STEPS[0];
  isLast: boolean;
}> = ({ step, isLast }) => (
  <View style={styles.stepContainer}>
    {/* Step Number & Icon */}
    <View style={styles.stepLeft}>
      <View style={[styles.stepIconContainer, { backgroundColor: `${step.color}15` }]}>
        <Ionicons name={step.icon as any} size={24} color={step.color} />
      </View>
      <View style={[styles.stepNumber, { backgroundColor: step.color }]}>
        <Text style={styles.stepNumberText}>{step.id}</Text>
      </View>
      {!isLast && <View style={[styles.connector, { backgroundColor: `${step.color}30` }]} />}
    </View>

    {/* Step Content */}
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.stepDescription}>{step.description}</Text>
    </View>
  </View>
);

const CashStoreStepsSection: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="list-circle" size={24} color={colors.brand.green} />
        </View>
        <Text style={styles.headerTitle}>How It Works</Text>
        <Text style={styles.headerSubtitle}>Follow these simple steps to earn cashback</Text>
      </View>

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <StepCard key={step.id} step={step} isLast={index === STEPS.length - 1} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: colors.background.primary,
    marginTop: 8,
  },
  header: {
    marginBottom: 24,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tint.greenLight,
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
  stepsContainer: {
    gap: 0,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLeft: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  stepIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background.primary,
  },
  connector: {
    width: 2,
    height: 40,
    marginTop: 8,
    borderRadius: 1,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 32,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    lineHeight: 22,
  },
});

export default memo(CashStoreStepsSection);
