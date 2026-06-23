import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReportModalProps, REPORT_REASONS, ReportReason } from '@/types/report.types';
import { useVideoReport } from '@/hooks/useVideoReport';
import { colors } from '@/constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function ReportModal({
  visible,
  onClose,
  videoId,
  videoTitle,
  onReportSuccess,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const { isSubmitting, error, success, submitReport, reset, clearError } = useVideoReport();

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(screenHeight);

  // Animation effects
  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 300 });
      slideAnim.value = withSpring(0, { damping: 12, stiffness: 120 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 200 });
      slideAnim.value = withTiming(screenHeight, { duration: 250 });
    }
  }, [visible]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const modalSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  // Handle success state
  useEffect(() => {
    if (success && !showSuccess) {
      setShowSuccess(true);

      // Auto-close after showing success message
      setTimeout(() => {
        handleClose();
        if (onReportSuccess) {
          onReportSuccess();
        }
      }, 2000);
    }
  }, [success]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setSelectedReason(null);
        setAdditionalDetails('');
        setShowSuccess(false);
        reset();
      }, 300);
    }
  }, [visible]);

  const handleClose = () => {
    clearError();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      return;
    }

    const result = await submitReport(
      videoId,
      selectedReason,
      additionalDetails.trim() || undefined
    );

    // Success is handled by useEffect watching the success state
  };

  const handleReasonSelect = (reason: ReportReason) => {
    setSelectedReason(reason);
    clearError();
  };

  const isSubmitDisabled = !selectedReason || isSubmitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          overlayAnimatedStyle,
        ]}
      >
        <Pressable
          style={styles.overlayTouchable}
         
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            modalSlideStyle,
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            {/* Success View */}
            {showSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color={colors.lightMustard} />
                </View>
                <Text style={styles.successTitle}>Report Submitted</Text>
                <Text style={styles.successMessage}>
                  Thank you for helping keep our community safe. We'll review this video.
                </Text>
              </View>
            ) : (
              <>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.dragIndicator} />
                  <View style={styles.headerContent}>
                    <Text style={styles.title}>Report Video</Text>
                    <Pressable
                      onPress={handleClose}
                      style={styles.closeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={24} color={colors.midGray} />
                    </Pressable>
                  </View>
                  {videoTitle && (
                    <Text style={styles.videoTitle} numberOfLines={1}>
                      {videoTitle}
                    </Text>
                  )}
                </View>

                <ScrollView
                  style={styles.content}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Instructions */}
                  <Text style={styles.instructions}>
                    Please select a reason for reporting this video:
                  </Text>

                  {/* Report Reasons */}
                  <View style={styles.reasonsContainer}>
                    {REPORT_REASONS.map((reason) => (
                      <Pressable
                        key={reason.value}
                        style={[
                          styles.reasonOption,
                          selectedReason === reason.value && styles.reasonOptionSelected,
                        ]}
                        onPress={() => handleReasonSelect(reason.value)}
                       
                      >
                        <View style={styles.radioButton}>
                          {selectedReason === reason.value ? (
                            <View style={styles.radioButtonSelected}>
                              <View style={styles.radioButtonInner} />
                            </View>
                          ) : (
                            <View style={styles.radioButtonUnselected} />
                          )}
                        </View>
                        <View style={styles.reasonContent}>
                          <Text style={styles.reasonLabel}>{reason.label}</Text>
                          <Text style={styles.reasonDescription}>{reason.description}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>

                  {/* Additional Details */}
                  <View style={styles.detailsContainer}>
                    <Text style={styles.detailsLabel}>
                      Additional details (optional)
                    </Text>
                    <TextInput
                      style={styles.detailsInput}
                      placeholder="Provide more context about why you're reporting this video..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={4}
                      maxLength={500}
                      value={additionalDetails}
                      onChangeText={setAdditionalDetails}
                      textAlignVertical="top"
                    />
                    <Text style={styles.characterCount}>
                      {additionalDetails.length}/500
                    </Text>
                  </View>

                  {/* Error Message */}
                  {error && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={20} color={colors.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  {/* Info Message */}
                  <View style={styles.infoContainer}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.brand.indigo} />
                    <Text style={styles.infoText}>
                      Your report is anonymous. We review all reports carefully.
                    </Text>
                  </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.footer}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={handleClose}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.submitButtonWrapper,
                      isSubmitDisabled && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitDisabled}
                   
                  >
                    <LinearGradient
                      colors={
                        isSubmitDisabled
                          ? [colors.neutral[300], colors.neutral[400]]
                          : [colors.brand.purple, colors.brand.indigo]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitButton}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={colors.background.primary} size="small" />
                      ) : (
                        <>
                          <Ionicons name="flag" size={20} color={colors.background.primary} />
                          <Text style={styles.submitButtonText}>Submit Report</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: screenHeight * 0.75,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  keyboardView: {
    flex: 1,
    maxHeight: screenHeight * 0.75,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: 4,
  },
  videoTitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  instructions: {
    fontSize: 15,
    color: colors.neutral[700],
    marginTop: 20,
    marginBottom: 16,
    lineHeight: 22,
  },
  reasonsContainer: {
    gap: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[100],
  },
  reasonOptionSelected: {
    backgroundColor: colors.indigoMist,
    borderColor: colors.brand.indigo,
  },
  radioButton: {
    marginRight: 12,
    marginTop: 2,
  },
  radioButtonUnselected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    backgroundColor: colors.background.primary,
  },
  radioButtonSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.brand.indigo,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.indigo,
  },
  reasonContent: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  detailsContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  detailsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 12,
  },
  detailsInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.neutral[900],
    minHeight: 100,
    maxHeight: 150,
  },
  characterCount: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'right',
    marginTop: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[100],
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.indigoMist,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.brand.indigo,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  submitButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButton: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  successContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});

export default React.memo(ReportModal);
