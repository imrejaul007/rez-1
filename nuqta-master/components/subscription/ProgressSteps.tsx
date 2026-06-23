// Progress Steps Component
// Multi-step wizard progress indicator

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

export interface Step {
  id: string;
  title: string;
  icon: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
}

function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  const renderStep = (step: Step, index: number) => {
    const isCompleted = index < currentStep;
    const isCurrent = index === currentStep;
    const isUpcoming = index > currentStep;

    const stepStatus = isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming';
    const accessibilityLabel = `Step ${index + 1} of ${steps.length}: ${step.title}. Status: ${stepStatus}`;

    return (
      <View
        key={step.id}
        style={styles.stepContainer}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="progressbar"
        accessible={true}
      >
        {/* Step Circle */}
        <View style={styles.stepCircleContainer}>
          <View
            style={[
              styles.stepCircle,
              isCompleted && styles.stepCircleCompleted,
              isCurrent && styles.stepCircleCurrent,
              isUpcoming && styles.stepCircleUpcoming,
            ]}
          >
            {isCompleted ? (
              <Ionicons name="checkmark" size={20} color={colors.background.primary} />
            ) : (
              <ThemedText
                style={[
                  styles.stepNumber,
                  isCurrent && styles.stepNumberCurrent,
                  isUpcoming && styles.stepNumberUpcoming,
                ]}
              >
                {index + 1}
              </ThemedText>
            )}
          </View>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <View
              style={[
                styles.connector,
                isCompleted && styles.connectorCompleted,
              ]}
            />
          )}
        </View>

        {/* Step Label */}
        <ThemedText
          style={[
            styles.stepTitle,
            isCurrent && styles.stepTitleCurrent,
            isUpcoming && styles.stepTitleUpcoming,
          ]}
        >
          {step.title}
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {steps.map((step, index) => renderStep(step, index))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.background.primary,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepCircleContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCircleCompleted: {
    backgroundColor: colors.successScale[400],
  },
  stepCircleCurrent: {
    backgroundColor: colors.brand.purpleLight,
  },
  stepCircleUpcoming: {
    backgroundColor: colors.neutral[200],
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepNumberCurrent: {
    color: colors.background.primary,
  },
  stepNumberUpcoming: {
    color: colors.neutral[400],
  },
  connector: {
    position: 'absolute',
    left: 19,
    top: 40,
    width: 2,
    height: 40,
    backgroundColor: colors.neutral[200],
    zIndex: 1,
  },
  connectorCompleted: {
    backgroundColor: colors.successScale[400],
  },
  stepTitle: {
    fontSize: 14,
    marginLeft: 4,
  },
  stepTitleCurrent: {
    fontWeight: 'bold',
    color: colors.brand.purpleLight,
  },
  stepTitleUpcoming: {
    color: colors.neutral[400],
  },
});

export default React.memo(ProgressSteps);
