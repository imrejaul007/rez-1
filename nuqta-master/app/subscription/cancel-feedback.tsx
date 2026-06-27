// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Cancellation Feedback Flow
// Multi-step wizard for subscription cancellation with retention attempts

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import subscriptionAPI from '@/services/subscriptionApi';
import ProgressSteps, { Step } from '@/components/subscription/ProgressSteps';
import RetentionOfferCard from '@/components/subscription/RetentionOfferCard';
import { TIER_NAMES } from '@/types/subscription.types';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type CancellationReason =
  | 'too_expensive'
  | 'not_using_enough'
  | 'missing_features'
  | 'found_alternative'
  | 'technical_issues'
  | 'other';

type CancellationType = 'immediate' | 'end_of_cycle';

const CANCELLATION_REASONS: { value: CancellationReason; label: string; icon: string }[] = [
  { value: 'too_expensive', label: 'Too expensive', icon: 'cash-outline' },
  { value: 'not_using_enough', label: 'Not using enough', icon: 'time-outline' },
  { value: 'missing_features', label: 'Missing features I need', icon: 'construct-outline' },
  { value: 'found_alternative', label: 'Found a better alternative', icon: 'swap-horizontal-outline' },
  { value: 'technical_issues', label: 'Technical issues', icon: 'bug-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

function CancelFeedbackPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { state, actions, computed } = useSubscription();
  const currentTier = state.currentSubscription?.tier || 'free';

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null);
  const [otherReasonText, setOtherReasonText] = useState('');
  const [featureRequest, setFeatureRequest] = useState('');
  const [finalFeedback, setFinalFeedback] = useState('');
  const [cancellationType, setCancellationType] = useState<CancellationType>('end_of_cycle');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showRetentionOffer, setShowRetentionOffer] = useState(false);
  const isMounted = useIsMounted();

  const steps: Step[] = [
    { id: 'reason', title: 'Tell us why', icon: 'chatbubble-outline' },
    { id: 'retention', title: 'Special offer', icon: 'gift-outline' },
    { id: 'pause', title: 'Pause option', icon: 'pause-outline' },
    { id: 'confirm', title: 'Confirm', icon: 'checkmark-outline' },
  ];

  // Get retention offer based on reason
  const getRetentionOffer = () => {
    switch (selectedReason) {
      case 'too_expensive':
        return {
          type: 'discount' as const,
          title: 'Special Discount for You',
          description: 'We understand budgets are tight. How about a 20% discount for the next 3 months?',
          ctaText: 'Accept 20% Discount',
          icon: 'pricetag',
          value: '20% OFF',
        };
      case 'not_using_enough':
        return {
          type: 'usage_tips' as const,
          title: 'You Might Be Missing Out',
          description: `Did you know ${TIER_NAMES[currentTier]} members save an average of ${currencySymbol}${currentTier === 'vip' ? '2,500' : '1,200'} per month? Let us show you how!`,
          ctaText: 'Show Me Tips',
          icon: 'bulb',
          value: '',
        };
      case 'missing_features':
        return {
          type: 'benefits_reminder' as const,
          title: 'Tell Us What You Need',
          description: 'Your feedback helps us improve. What features would make you stay?',
          ctaText: 'Share Feedback',
          icon: 'chatbubbles',
          value: '',
        };
      default:
        return null;
    }
  };

  // Handle step 1: Reason selection
  const handleReasonSelect = (reason: CancellationReason) => {
    setSelectedReason(reason);
  };

  const handleContinueFromReason = () => {
    if (!selectedReason) {
      platformAlertSimple('Selection Required', 'Please select a reason before continuing');
      return;
    }
    if (selectedReason === 'other' && !otherReasonText.trim()) {
      platformAlertSimple('Details Required', 'Please provide more details about your reason');
      return;
    }

    // Check if we should show retention offer
    if (['too_expensive', 'not_using_enough', 'missing_features'].includes(selectedReason)) {
      setShowRetentionOffer(true);
      setCurrentStep(1);
    } else {
      // Skip retention offer for other reasons
      setCurrentStep(2);
    }
  };

  // Handle retention offer
  const handleAcceptOffer = () => {
    if (selectedReason === 'too_expensive') {
      // Apply discount
      platformAlertSimple('Discount Applied!', 'Your 20% discount has been applied for the next 3 months. Thank you for staying with us!');
      router.push('/subscription/manage');
    } else if (selectedReason === 'not_using_enough') {
      // Show usage tips
      router.push('/subscription/benefits');
    } else if (selectedReason === 'missing_features') {
      // Go to feature request
      setCurrentStep(2);
    }
  };

  const handleDeclineOffer = () => {
    setCurrentStep(2);
  };

  // Handle pause option
  const handlePauseSubscription = async () => {
    try {
      platformAlertSimple('Subscription Paused', 'Your subscription has been paused for 1 month. You can resume anytime!');
      router.push('/subscription/manage');
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to pause subscription');
    }
  };

  const handleSkipPause = () => {
    setCurrentStep(3);
  };

  // Handle final cancellation
  const handleFinalCancel = async () => {
    try {
      setIsCancelling(true);

      const cancelRequest = {
        reason: selectedReason === 'other' ? otherReasonText : selectedReason,
        feedback: finalFeedback,
        cancelImmediately: cancellationType === 'immediate',
      };

      await subscriptionAPI.cancelSubscription(cancelRequest);
      await actions.loadSubscription(true);

      const accessMessage = cancellationType === 'immediate'
        ? 'You will lose access to premium features immediately.'
        : `You will keep access to premium features until ${new Date(state.currentSubscription?.endDate || '').toLocaleDateString()}`;

      platformAlertSimple('Subscription Cancelled', `Your subscription has been cancelled. ${accessMessage}`);
      router.push('/subscription/manage');
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to cancel subscription');
    } finally {
      if (!isMounted()) return;
      setIsCancelling(false);
    }
  };

  const handleKeepSubscription = () => {
    router.push('/subscription/manage');
  };

  // Render Step 1: Reason Selection
  const renderReasonSelection = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Ionicons name="sad-outline" size={64} color={Colors.error} />
        <ThemedText style={styles.stepTitle}>We're sorry to see you go</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Help us improve by sharing why you're cancelling
        </ThemedText>
      </View>

      <View style={styles.reasonsContainer}>
        {CANCELLATION_REASONS.map((reason) => (
          <Pressable
            key={reason.value}
            style={[
              styles.reasonOption,
              selectedReason === reason.value && styles.reasonOptionSelected,
            ]}
            onPress={() => handleReasonSelect(reason.value)}
            accessibilityLabel={`Reason: ${reason.label}. ${selectedReason === reason.value ? 'Selected' : ''}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedReason === reason.value }}
            accessibilityHint="Double tap to select this cancellation reason"
          >
            <View style={styles.radioButton}>
              {selectedReason === reason.value && <View style={styles.radioButtonInner} />}
            </View>
            <Ionicons
              name={reason.icon as any}
              size={24}
              color={selectedReason === reason.value ? Colors.error : Colors.text.tertiary}
            />
            <ThemedText style={styles.reasonLabel}>{reason.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      {selectedReason === 'other' && (
        <View style={styles.otherReasonContainer}>
          <TextInput
            style={styles.textArea}
            value={otherReasonText}
            onChangeText={setOtherReasonText}
            placeholder="Please tell us more..."
            placeholderTextColor={Colors.text.tertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Other cancellation reason"
            accessibilityHint="Enter details about why you want to cancel"
          />
        </View>
      )}

      <Pressable
        style={styles.continueButton}
        onPress={handleContinueFromReason}
        accessibilityLabel="Continue to next step"
        accessibilityRole="button"
        accessibilityHint="Double tap to proceed with cancellation"
      >
        <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
        <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
      </Pressable>
    </View>
  );

  // Render Step 2: Retention Offer
  const renderRetentionOffer = () => {
    const offer = getRetentionOffer();
    if (!offer) return null;

    if (selectedReason === 'missing_features') {
      return (
        <View style={styles.stepContent}>
          <View style={styles.stepHeader}>
            <Ionicons name="bulb-outline" size={64} color={Colors.warning} />
            <ThemedText style={styles.stepTitle}>Tell Us What You Need</ThemedText>
            <ThemedText style={styles.stepSubtitle}>
              Your feedback helps us build better features
            </ThemedText>
          </View>

          <TextInput
            style={styles.textArea}
            value={featureRequest}
            onChangeText={setFeatureRequest}
            placeholder="What features would make you stay?"
            placeholderTextColor={Colors.text.tertiary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <View style={styles.buttonGroup}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                if (featureRequest.trim()) {
                  platformAlertSimple('Thank You!', 'Your feedback has been submitted to our team.');
                }
                setCurrentStep(2);
              }}
            >
              <ThemedText style={styles.primaryButtonText}>Submit Feedback</ThemedText>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleDeclineOffer}>
              <ThemedText style={styles.secondaryButtonText}>Cancel Anyway</ThemedText>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        <RetentionOfferCard
          offer={offer}
          onAccept={handleAcceptOffer}
          onDecline={handleDeclineOffer}
        />
      </View>
    );
  };

  // Render Step 3: Pause Option
  const renderPauseOption = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Ionicons name="pause-circle-outline" size={64} color={Colors.brand.purpleLight} />
        <ThemedText style={styles.stepTitle}>Would you like to pause instead?</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Take a break without losing your benefits
        </ThemedText>
      </View>

      <View style={styles.pauseBenefitsCard}>
        <View style={styles.pauseBenefitRow}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <ThemedText style={styles.pauseBenefitText}>
            Keep your benefits for 1 month
          </ThemedText>
        </View>
        <View style={styles.pauseBenefitRow}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <ThemedText style={styles.pauseBenefitText}>Resume anytime you want</ThemedText>
        </View>
        <View style={styles.pauseBenefitRow}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <ThemedText style={styles.pauseBenefitText}>No charge during pause</ThemedText>
        </View>
      </View>

      <View style={styles.buttonGroup}>
        <Pressable
          style={styles.primaryButton}
          onPress={handlePauseSubscription}
          accessibilityLabel="Pause my subscription"
          accessibilityRole="button"
          accessibilityHint="Double tap to pause subscription for 1 month instead of cancelling"
        >
          <ThemedText style={styles.primaryButtonText}>Pause My Subscription</ThemedText>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={handleSkipPause}
          accessibilityLabel="No, cancel permanently"
          accessibilityRole="button"
          accessibilityHint="Double tap to skip pause option and proceed with cancellation"
        >
          <ThemedText style={styles.secondaryButtonText}>No, Cancel Permanently</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  // Render Step 4: Final Confirmation
  const renderFinalConfirmation = () => {
    const endDate = new Date(state.currentSubscription?.endDate || '');
    const formattedEndDate = endDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const benefits = [
      `${currentTier === 'vip' ? '3x' : '2x'} cashback on all orders`,
      'Free delivery',
      'Priority customer support',
      'Exclusive deals & early access',
      currentTier === 'vip' ? 'Personal shopper assistance' : 'Unlimited wishlists',
    ];

    return (
      <View style={styles.stepContent}>
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={32} color={Colors.error} />
          <ThemedText style={styles.warningTitle}>Your subscription will be cancelled</ThemedText>
          <ThemedText style={styles.warningText}>
            You'll lose access on {cancellationType === 'immediate' ? 'now' : formattedEndDate}
          </ThemedText>
        </View>

        <View style={styles.benefitsLossCard}>
          <ThemedText style={styles.benefitsLossTitle}>Benefits You'll Lose:</ThemedText>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitLossRow}>
              <Ionicons name="close-circle" size={20} color={Colors.error} />
              <ThemedText style={styles.benefitLossText}>{benefit}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.feedbackSection}>
          <ThemedText style={styles.feedbackLabel}>Any final thoughts?</ThemedText>
          <TextInput
            style={styles.textArea}
            value={finalFeedback}
            onChangeText={setFinalFeedback}
            placeholder="Share your feedback (optional)"
            placeholderTextColor={Colors.text.tertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Final feedback"
            accessibilityHint="Optionally share any final thoughts about your cancellation"
          />
        </View>

        <View style={styles.cancellationTypeContainer}>
          <Pressable
            style={[
              styles.typeOption,
              cancellationType === 'end_of_cycle' && styles.typeOptionSelected,
            ]}
            onPress={() => setCancellationType('end_of_cycle')}
            accessibilityLabel={`Cancel at end of billing cycle. Keep access until ${formattedEndDate}. ${cancellationType === 'end_of_cycle' ? 'Selected' : ''}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: cancellationType === 'end_of_cycle' }}
            accessibilityHint="Double tap to cancel at the end of your billing cycle"
          >
            <View style={styles.checkbox}>
              {cancellationType === 'end_of_cycle' && (
                <Ionicons name="checkmark" size={16} color={Colors.brand.purpleLight} />
              )}
            </View>
            <View style={styles.typeContent}>
              <ThemedText style={styles.typeTitle}>Cancel at end of billing cycle</ThemedText>
              <ThemedText style={styles.typeSubtitle}>
                Keep access until {formattedEndDate}
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.typeOption,
              cancellationType === 'immediate' && styles.typeOptionSelected,
            ]}
            onPress={() => setCancellationType('immediate')}
            accessibilityLabel={`Cancel immediately. Lose access now. ${cancellationType === 'immediate' ? 'Selected' : ''}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: cancellationType === 'immediate' }}
            accessibilityHint="Double tap to cancel immediately and lose access right away"
          >
            <View style={styles.checkbox}>
              {cancellationType === 'immediate' && (
                <Ionicons name="checkmark" size={16} color={Colors.error} />
              )}
            </View>
            <View style={styles.typeContent}>
              <ThemedText style={styles.typeTitle}>Cancel immediately</ThemedText>
              <ThemedText style={styles.typeSubtitle}>Lose access now</ThemedText>
            </View>
          </Pressable>
        </View>

        <View style={styles.finalActions}>
          <Pressable
            style={styles.keepButton}
            onPress={handleKeepSubscription}
            disabled={isCancelling}
            accessibilityLabel="Keep my subscription"
            accessibilityRole="button"
            accessibilityState={{ disabled: isCancelling }}
            accessibilityHint="Double tap to keep your subscription and go back"
          >
            <LinearGradient
              colors={[colors.brand.purpleLight, colors.brand.purple]}
              style={styles.keepButtonGradient}
            >
              <ThemedText style={styles.keepButtonText}>Keep My Subscription</ThemedText>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={handleFinalCancel}
            disabled={isCancelling}
            accessibilityLabel={isCancelling ? 'Cancelling subscription' : 'Cancel my subscription'}
            accessibilityRole="button"
            accessibilityState={{ disabled: isCancelling, busy: isCancelling }}
            accessibilityHint="Double tap to confirm subscription cancellation"
          >
            {isCancelling ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <ThemedText style={styles.cancelButtonText}>Cancel My Subscription</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    if (currentStep === 0) return renderReasonSelection();
    if (currentStep === 1 && showRetentionOffer) return renderRetentionOffer();
    if (currentStep === 2) return renderPauseOption();
    if (currentStep === 3) return renderFinalConfirmation();
    return null;
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.error} />

      {/* Header */}
      <LinearGradient colors={[colors.error, colors.error]} style={styles.header}>
        <View style={styles.headerContainer}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}
            accessibilityLabel="Cancel and go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to cancel and return to previous screen"
          >
            <Ionicons name="close" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Cancel Subscription</ThemedText>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Progress Steps */}
        <ProgressSteps steps={steps} currentStep={currentStep} />

        {/* Step Content */}
        {renderStepContent()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: Spacing.lg,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  stepTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: Spacing.base,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  reasonsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.border.default,
    gap: Spacing.md,
  },
  reasonOptionSelected: {
    borderColor: Colors.error,
    backgroundColor: colors.errorScale[50],
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
  },
  reasonLabel: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
  },
  otherReasonContainer: {
    marginBottom: Spacing.xl,
  },
  textArea: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    minHeight: 100,
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: Colors.error,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  continueButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
  buttonGroup: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.text.tertiary,
    ...Typography.body,
    fontWeight: '600',
  },
  pauseBenefitsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.base,
    marginBottom: Spacing.xl,
  },
  pauseBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pauseBenefitText: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
  },
  warningBox: {
    backgroundColor: colors.errorScale[50],
    borderWidth: 2,
    borderColor: colors.errorScale[100],
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  warningTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.error,
    marginTop: Spacing.md,
  },
  warningText: {
    ...Typography.body,
    color: Colors.error,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  benefitsLossCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  benefitsLossTitle: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  benefitLossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  benefitLossText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  feedbackSection: {
    marginBottom: Spacing.xl,
  },
  feedbackLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  cancellationTypeContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.border.default,
    gap: Spacing.md,
  },
  typeOptionSelected: {
    borderColor: Colors.brand.purpleLight,
    backgroundColor: '#8B5CF605',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeContent: {
    flex: 1,
  },
  typeTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  typeSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  finalActions: {
    gap: Spacing.md,
  },
  keepButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  keepButtonGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  keepButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: colors.errorScale[50],
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.errorScale[100],
  },
  cancelButtonText: {
    color: Colors.error,
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
});

export default withErrorBoundary(CancelFeedbackPage, 'SubscriptionCancelFeedback');
