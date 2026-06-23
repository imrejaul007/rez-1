// Redemption Flow Component
// Step-by-step wizard for voucher redemption

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from '@/components/ThemedText';
import {
  VoucherRedemption,
  RedemptionRestrictions,
  VoucherValidation,
  ValidationError,
  ValidationWarning,
} from '@/types/voucher-redemption.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface RedemptionFlowProps {
  visible: boolean;
  onClose: () => void;
  vouchers: VoucherRedemption['voucher'][];
  onRedeem: (voucherId: string, method: 'online' | 'in_store') => Promise<VoucherRedemption>;
}

function RedemptionFlow({
  visible,
  onClose,
  vouchers,
  onRedeem,
}: RedemptionFlowProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRedemption['voucher'] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'online' | 'in_store' | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [redemption, setRedemption] = useState<VoucherRedemption | null>(null);
  const [validation, setValidation] = useState<VoucherValidation | null>(null);
  const isMounted = useIsMounted();

  const totalSteps = 5; // Select, Method, Terms, Confirm, Success

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setTimeout(() => {
        setCurrentStep(0);
        setSelectedVoucher(null);
        setSelectedMethod(null);
        setTermsAccepted(false);
        setIsProcessing(false);
        setRedemption(null);
        setValidation(null);
      }, 300);
    }
  }, [visible]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleConfirmRedemption = useCallback(async () => {
    if (!selectedVoucher || !selectedMethod) return;

    try {
      setIsProcessing(true);
      const result = await onRedeem(selectedVoucher.id, selectedMethod);
      if (!isMounted()) return;
      setRedemption(result);
      handleNext();
    } catch (error) {
      platformAlertSimple('Error', 'Failed to redeem voucher. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsProcessing(false);
    }
  }, [selectedVoucher, selectedMethod, onRedeem, handleNext]);

  const handleClose = useCallback(() => {
    if (isProcessing) return;
    onClose();
  }, [isProcessing, onClose]);

  // Mock restrictions - in real app, fetch from API
  const restrictions: RedemptionRestrictions = {
    minPurchaseAmount: selectedVoucher?.denomination ? selectedVoucher.denomination * 2 : 0,
    maxDiscount: selectedVoucher?.denomination,
    usageLimit: 1,
    usesRemaining: 1,
    applicableOn: 'all',
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View key={index} style={styles.stepDot}>
          <View
            style={[
              styles.stepDotInner,
              index <= currentStep && styles.stepDotActive,
            ]}
          />
        </View>
      ))}
    </View>
  );

  // Step 1: Select Voucher
  const renderSelectVoucherStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText style={styles.stepTitle}>Select Voucher</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        Choose which voucher you'd like to redeem
      </ThemedText>

      <ScrollView style={styles.voucherList} showsVerticalScrollIndicator={false}>
        {vouchers.map((voucher) => (
          <Pressable
            key={voucher.id}
            style={[
              styles.voucherCard,
              selectedVoucher?.id === voucher.id && styles.voucherCardSelected,
            ]}
            onPress={() => setSelectedVoucher(voucher)}
          >
            <View style={styles.voucherCardContent}>
              <View style={styles.voucherBrand}>
                <ThemedText style={styles.voucherBrandText}>{voucher.brand}</ThemedText>
              </View>
              <View style={styles.voucherDetails}>
                <ThemedText style={styles.voucherValue}>
                  {currencySymbol}{voucher.denomination}
                </ThemedText>
                <ThemedText style={styles.voucherCashback}>
                  {voucher.cashbackRate}% Cashback
                </ThemedText>
                <ThemedText style={styles.voucherExpiry}>
                  Expires: {new Date(voucher.expiryDate).toLocaleDateString()}
                </ThemedText>
              </View>
              {selectedVoucher?.id === voucher.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.lightMustard} />
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.stepActions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleClose}
        >
          <ThemedText style={styles.buttonSecondaryText}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.button,
            styles.buttonPrimary,
            !selectedVoucher && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedVoucher}
        >
          <ThemedText style={styles.buttonPrimaryText}>Next</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  // Step 2: Select Method
  const renderMethodSelectionStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText style={styles.stepTitle}>Choose Redemption Method</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        How would you like to use this voucher?
      </ThemedText>

      <View style={styles.methodOptions}>
        <Pressable
          style={[
            styles.methodCard,
            selectedMethod === 'online' && styles.methodCardSelected,
          ]}
          onPress={() => setSelectedMethod('online')}
        >
          <View style={styles.methodIcon}>
            <Ionicons
              name="laptop-outline"
              size={32}
              color={selectedMethod === 'online' ? colors.brand.purpleLight : colors.neutral[500]}
            />
          </View>
          <ThemedText style={styles.methodTitle}>Online</ThemedText>
          <ThemedText style={styles.methodDescription}>
            Auto-apply at checkout when shopping online
          </ThemedText>
          {selectedMethod === 'online' && (
            <View style={styles.methodCheckmark}>
              <Ionicons name="checkmark-circle" size={24} color={colors.lightMustard} />
            </View>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.methodCard,
            selectedMethod === 'in_store' && styles.methodCardSelected,
          ]}
          onPress={() => setSelectedMethod('in_store')}
        >
          <View style={styles.methodIcon}>
            <Ionicons
              name="storefront-outline"
              size={32}
              color={selectedMethod === 'in_store' ? colors.brand.purpleLight : colors.neutral[500]}
            />
          </View>
          <ThemedText style={styles.methodTitle}>In-Store</ThemedText>
          <ThemedText style={styles.methodDescription}>
            Generate QR code to scan at physical store
          </ThemedText>
          {selectedMethod === 'in_store' && (
            <View style={styles.methodCheckmark}>
              <Ionicons name="checkmark-circle" size={24} color={colors.lightMustard} />
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.stepActions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleBack}
        >
          <ThemedText style={styles.buttonSecondaryText}>Back</ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.button,
            styles.buttonPrimary,
            !selectedMethod && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedMethod}
        >
          <ThemedText style={styles.buttonPrimaryText}>Next</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  // Step 3: Terms & Conditions
  const renderTermsStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText style={styles.stepTitle}>Terms & Conditions</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        Please review before proceeding
      </ThemedText>

      <ScrollView style={styles.termsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.restrictionCard}>
          <View style={styles.restrictionRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.brand.purpleLight} />
            <ThemedText style={styles.restrictionLabel}>Minimum Purchase</ThemedText>
            <ThemedText style={styles.restrictionValue}>
              {currencySymbol}{restrictions.minPurchaseAmount}
            </ThemedText>
          </View>
          <View style={styles.restrictionRow}>
            <Ionicons name="pricetag-outline" size={20} color={colors.brand.purpleLight} />
            <ThemedText style={styles.restrictionLabel}>Maximum Discount</ThemedText>
            <ThemedText style={styles.restrictionValue}>
              {currencySymbol}{restrictions.maxDiscount}
            </ThemedText>
          </View>
          <View style={styles.restrictionRow}>
            <Ionicons name="repeat-outline" size={20} color={colors.brand.purpleLight} />
            <ThemedText style={styles.restrictionLabel}>Usage Limit</ThemedText>
            <ThemedText style={styles.restrictionValue}>
              {restrictions.usageLimit} time
            </ThemedText>
          </View>
        </View>

        {selectedVoucher?.termsAndConditions && (
          <View style={styles.termsList}>
            {selectedVoucher.termsAndConditions.map((term, index) => (
              <View key={index} style={styles.termItem}>
                <View style={styles.termBullet} />
                <ThemedText style={styles.termText}>{term}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={styles.checkbox}
        onPress={() => setTermsAccepted(!termsAccepted)}
      >
        <View style={[styles.checkboxBox, termsAccepted && styles.checkboxBoxChecked]}>
          {termsAccepted && <Ionicons name="checkmark" size={16} color={colors.background.primary} />}
        </View>
        <ThemedText style={styles.checkboxLabel}>
          I accept the terms and conditions
        </ThemedText>
      </Pressable>

      <View style={styles.stepActions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleBack}
        >
          <ThemedText style={styles.buttonSecondaryText}>Back</ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.button,
            styles.buttonPrimary,
            !termsAccepted && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={!termsAccepted}
        >
          <ThemedText style={styles.buttonPrimaryText}>Next</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  // Step 4: Confirmation
  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <ThemedText style={styles.stepTitle}>Confirm Redemption</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        Please review your selection
      </ThemedText>

      <View style={styles.confirmationCard}>
        <View style={styles.confirmationSection}>
          <ThemedText style={styles.confirmationLabel}>Voucher</ThemedText>
          <View style={styles.confirmationVoucher}>
            <ThemedText style={styles.confirmationBrand}>
              {selectedVoucher?.brand}
            </ThemedText>
            <ThemedText style={styles.confirmationValue}>
              {currencySymbol}{selectedVoucher?.denomination}
            </ThemedText>
          </View>
        </View>

        <View style={styles.confirmationDivider} />

        <View style={styles.confirmationSection}>
          <ThemedText style={styles.confirmationLabel}>Method</ThemedText>
          <View style={styles.confirmationMethod}>
            <Ionicons
              name={selectedMethod === 'online' ? 'laptop-outline' : 'storefront-outline'}
              size={20}
              color={colors.neutral[800]}
            />
            <ThemedText style={styles.confirmationMethodText}>
              {selectedMethod === 'online' ? 'Online' : 'In-Store'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.confirmationDivider} />

        <View style={styles.confirmationSection}>
          <ThemedText style={styles.confirmationLabel}>Expected Savings</ThemedText>
          <ThemedText style={styles.confirmationSavings}>
            Up to {currencySymbol}{selectedVoucher?.denomination}
          </ThemedText>
        </View>
      </View>

      <View style={styles.stepActions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleBack}
          disabled={isProcessing}
        >
          <ThemedText style={styles.buttonSecondaryText}>Back</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleConfirmRedemption}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.background.primary} />
          ) : (
            <ThemedText style={styles.buttonPrimaryText}>Confirm</ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );

  // Step 5: Success
  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color={colors.lightMustard} />
      </View>

      <ThemedText style={styles.successTitle}>Redemption Successful!</ThemedText>
      <ThemedText style={styles.successSubtitle}>
        Your voucher has been redeemed
      </ThemedText>

      {selectedMethod === 'in_store' && redemption?.qrCode && (
        <View style={styles.qrCodeContainer}>
          <ThemedText style={styles.qrCodeLabel}>Show this QR code at the store</ThemedText>
          <View style={styles.qrCodeWrapper}>
            <QRCode
              value={redemption.qrCode}
              size={200}
              backgroundColor="white"
              color="black"
            />
          </View>
          <ThemedText style={styles.qrCodeCode}>
            Code: {redemption.redemptionCode}
          </ThemedText>
        </View>
      )}

      {selectedMethod === 'online' && (
        <View style={styles.onlineSuccess}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.lightMustard} />
          <ThemedText style={styles.onlineSuccessText}>
            Voucher will be auto-applied at checkout
          </ThemedText>
        </View>
      )}

      <View style={styles.savingsCard}>
        <ThemedText style={styles.savingsLabel}>Amount Saved</ThemedText>
        <ThemedText style={styles.savingsValue}>
          {currencySymbol}{redemption?.amountSaved || 0}
        </ThemedText>
      </View>

      <View style={styles.stepActions}>
        <Pressable
          style={[styles.button, styles.buttonPrimary, { flex: 1 }]}
          onPress={handleClose}
        >
          <ThemedText style={styles.buttonPrimaryText}>Done</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderSelectVoucherStep();
      case 1:
        return renderMethodSelectionStep();
      case 2:
        return renderTermsStep();
      case 3:
        return renderConfirmationStep();
      case 4:
        return renderSuccessStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={[colors.brand.purpleLight, colors.brand.purple]}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ThemedText style={styles.modalTitle}>Redeem Voucher</ThemedText>
            <Pressable onPress={handleClose} disabled={isProcessing}>
              <Ionicons name="close" size={28} color={colors.background.primary} />
            </Pressable>
          </LinearGradient>

          {currentStep < totalSteps - 1 && renderStepIndicator()}

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStep()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  stepDot: {
    width: 32,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  stepDotInner: {
    flex: 1,
    borderRadius: 4,
  },
  stepDotActive: {
    backgroundColor: colors.brand.purpleLight,
  },
  modalBody: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral[800],
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.neutral[500],
    marginBottom: 24,
  },
  voucherList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  voucherCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voucherCardSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },
  voucherCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voucherBrand: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voucherBrandText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.background.primary,
    textAlign: 'center',
  },
  voucherDetails: {
    flex: 1,
  },
  voucherValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[800],
  },
  voucherCashback: {
    fontSize: 14,
    color: colors.nileBlue,
    fontWeight: '500',
  },
  voucherExpiry: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  methodOptions: {
    gap: 16,
    marginBottom: 20,
  },
  methodCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    position: 'relative',
  },
  methodCardSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },
  methodIcon: {
    marginBottom: 12,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  methodCheckmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  termsContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  restrictionCard: {
    backgroundColor: colors.tint.pink,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  restrictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  restrictionLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[500],
  },
  restrictionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  termsList: {
    gap: 12,
  },
  termItem: {
    flexDirection: 'row',
    gap: 12,
  },
  termBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.purpleLight,
    marginTop: 6,
  },
  termText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.brand.purpleLight,
    borderColor: colors.brand.purpleLight,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[800],
  },
  confirmationCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  confirmationSection: {
    marginVertical: 12,
  },
  confirmationLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  confirmationVoucher: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmationBrand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[800],
  },
  confirmationValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brand.purpleLight,
  },
  confirmationDivider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 8,
  },
  confirmationMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmationMethodText: {
    fontSize: 16,
    color: colors.neutral[800],
    fontWeight: '500',
  },
  confirmationSavings: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.nileBlue,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral[800],
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 16,
  },
  qrCodeWrapper: {
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  qrCodeCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  onlineSuccess: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  onlineSuccessText: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 12,
  },
  savingsCard: {
    backgroundColor: colors.linen,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  savingsLabel: {
    fontSize: 14,
    color: colors.nileBlue,
    marginBottom: 4,
  },
  savingsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.nileBlue,
  },
  stepActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.brand.purpleLight,
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.neutral[100],
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default React.memo(RedemptionFlow);
