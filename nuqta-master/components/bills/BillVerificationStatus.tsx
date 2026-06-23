// @ts-nocheck
// Bill Verification Status
// Shows real-time verification progress

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BillVerificationState } from '@/types/billVerification.types';
import { colors } from '@/constants/theme';

interface BillVerificationStatusProps {
  state: BillVerificationState;
}

function BillVerificationStatus({ state }: BillVerificationStatusProps) {
  const getStatusIcon = () => {
    switch (state.status) {
      case 'uploading':
        return 'cloud-upload';
      case 'ocr_processing':
        return 'scan';
      case 'merchant_matching':
        return 'search';
      case 'amount_verification':
        return 'calculator';
      case 'fraud_check':
        return 'shield-checkmark';
      case 'cashback_calculation':
        return 'gift';
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'failed':
        return 'alert-circle';
      default:
        return 'time';
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'approved':
        return colors.brand.emerald;
      case 'rejected':
      case 'failed':
        return '#F44336';
      case 'fraud_check':
        return '#FF9800';
      default:
        return '#2196F3';
    }
  };

  const isProcessing =
    state.status !== 'approved' && state.status !== 'rejected' && state.status !== 'failed';

  return (
    <View style={styles.container}>
      {/* Status Icon */}
      <View style={[styles.iconContainer, { backgroundColor: getStatusColor() + '20' }]}>
        {isProcessing ? (
          <ActivityIndicator size="large" color={getStatusColor()} />
        ) : (
          <Ionicons name={getStatusIcon()} size={40} color={getStatusColor()} />
        )}
      </View>

      {/* Status Message */}
      <Text style={styles.message}>{state.message}</Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${state.progress}%`,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Step {state.currentStep} of {state.totalSteps}
        </Text>
      </View>

      {/* Step Details */}
      <View style={styles.stepsContainer}>
        {[
          { step: 1, label: 'Image Analysis', icon: 'image' },
          { step: 2, label: 'OCR Processing', icon: 'scan' },
          { step: 3, label: 'Merchant Match', icon: 'search' },
          { step: 4, label: 'Verification', icon: 'checkmark-circle' },
          { step: 5, label: 'Fraud Check', icon: 'shield-checkmark' },
          { step: 6, label: 'Cashback Calc', icon: 'gift' },
        ].map((item) => (
          <View key={item.step} style={styles.stepItem}>
            <View
              style={[
                styles.stepIcon,
                item.step === state.currentStep && styles.stepIconActive,
                item.step < state.currentStep && styles.stepIconComplete,
              ]}
            >
              <Ionicons
                name={item.step < state.currentStep ? 'checkmark' : item.icon}
                size={16}
                color={
                  item.step <= state.currentStep
                    ? colors.background.primary
                    : '#999'
                }
              />
            </View>
            <Text
              style={[
                styles.stepLabel,
                item.step === state.currentStep && styles.stepLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.midGray,
    textAlign: 'center',
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  stepItem: {
    alignItems: 'center',
    width: 70,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepIconActive: {
    backgroundColor: '#2196F3',
  },
  stepIconComplete: {
    backgroundColor: colors.brand.emerald,
  },
  stepLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default React.memo(BillVerificationStatus);
