// @ts-nocheck
/**
 * BillUploadForm - Form section for bill upload
 *
 * Merchant selection, amount, date, bill number, notes fields,
 * cashback preview, and submit button.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { VALIDATION_CONFIG } from '@/utils/billValidation';
import CashbackCalculator from '@/components/bills/CashbackCalculator';
import type { FormData, FormErrors } from './types';
import type { CashbackCalculation } from '@/types/billVerification.types';

interface BillUploadFormProps {
  formData: FormData;
  errors: FormErrors;
  touched: Record<string, boolean>;
  cashbackCalculation: CashbackCalculation | null;
  showCashbackPreview: boolean;
  isUploading: boolean;
  isFormValid: boolean;
  currencySymbol: string;
  amountInputRef: React.RefObject<TextInput>;
  billNumberInputRef: React.RefObject<TextInput>;
  notesInputRef: React.RefObject<TextInput>;
  onFieldChange: (fieldName: keyof FormData, value: any) => void;
  onFieldBlur: (fieldName: keyof FormData) => void;
  onOpenMerchantSelector: () => void;
  onToggleCashbackPreview: () => void;
  onSubmit: () => void;
}

const BillUploadForm = React.memo(function BillUploadForm({
  formData,
  errors,
  touched,
  cashbackCalculation,
  showCashbackPreview,
  isUploading,
  isFormValid,
  currencySymbol,
  amountInputRef,
  billNumberInputRef,
  notesInputRef,
  onFieldChange,
  onFieldBlur,
  onOpenMerchantSelector,
  onToggleCashbackPreview,
  onSubmit,
}: BillUploadFormProps) {
  return (
    <>
      {/* Merchant Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Merchant <Text style={styles.required}>*</Text>
        </Text>
        <Pressable
          style={[
            styles.merchantSelector,
            touched.merchantId && errors.merchantId && styles.inputError,
          ]}
          onPress={onOpenMerchantSelector}
        >
          {formData.merchantName ? (
            <View style={styles.selectedMerchantContainer}>
              <Ionicons name="storefront" size={20} color={colors.brand.green} />
              <Text style={styles.selectedMerchant}>{formData.merchantName}</Text>
            </View>
          ) : (
            <Text style={styles.placeholderText}>Select Merchant</Text>
          )}
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </Pressable>
        {touched.merchantId && errors.merchantId && (
          <Text style={styles.errorText}>{errors.merchantId}</Text>
        )}
      </View>

      {/* Bill Amount */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Bill Amount <Text style={styles.required}>*</Text>
        </Text>
        <View
          style={[
            styles.inputContainer,
            touched.amount && errors.amount && styles.inputError,
          ]}
        >
          <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
          <TextInput
            ref={amountInputRef}
            style={styles.input}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={formData.amount}
            onChangeText={(text) => onFieldChange('amount', text)}
            onBlur={() => onFieldBlur('amount')}
            returnKeyType="next"
            onSubmitEditing={() => billNumberInputRef.current?.focus()}
          />
        </View>
        {touched.amount && errors.amount ? (
          <Text style={styles.errorText}>{errors.amount}</Text>
        ) : (
          <Text style={styles.helperText}>
            Min: {currencySymbol}{VALIDATION_CONFIG.amount.min}, Max: {currencySymbol}
            {VALIDATION_CONFIG.amount.max.toLocaleString()}
          </Text>
        )}
      </View>

      {/* Bill Date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Bill Date <Text style={styles.required}>*</Text>
        </Text>
        <View
          style={[
            styles.inputContainer,
            touched.billDate && errors.billDate && styles.inputError,
          ]}
        >
          <Ionicons name="calendar-outline" size={20} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.billDate.toISOString().split('T')[0]}
            onChangeText={(text) => {
              try {
                const date = new Date(text);
                if (!isNaN(date.getTime())) {
                  onFieldChange('billDate', date);
                }
              } catch {
                // Invalid date format
              }
            }}
            onBlur={() => onFieldBlur('billDate')}
          />
        </View>
        {touched.billDate && errors.billDate ? (
          <Text style={styles.errorText}>{errors.billDate}</Text>
        ) : (
          <Text style={styles.helperText}>
            Bills older than {VALIDATION_CONFIG.date.maxDaysOld} days may be rejected
          </Text>
        )}
      </View>

      {/* Bill Number (Optional) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bill Number (Optional)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="document-text-outline" size={20} color="#999" />
          <TextInput
            ref={billNumberInputRef}
            style={styles.input}
            placeholder="Enter bill number"
            value={formData.billNumber}
            onChangeText={(text) => onFieldChange('billNumber', text)}
            onBlur={() => onFieldBlur('billNumber')}
            returnKeyType="next"
            onSubmitEditing={() => notesInputRef.current?.focus()}
          />
        </View>
        {touched.billNumber && errors.billNumber && (
          <Text style={styles.errorText}>{errors.billNumber}</Text>
        )}
      </View>

      {/* Notes (Optional) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextInput
          ref={notesInputRef}
          style={[styles.input, styles.textArea]}
          placeholder="Add any additional notes..."
          multiline
          numberOfLines={3}
          maxLength={VALIDATION_CONFIG.notes.maxLength}
          value={formData.notes}
          onChangeText={(text) => onFieldChange('notes', text)}
          onBlur={() => onFieldBlur('notes')}
          textAlignVertical="top"
        />
        <Text style={styles.characterCount}>
          {formData.notes.length}/{VALIDATION_CONFIG.notes.maxLength}
        </Text>
        {touched.notes && errors.notes && (
          <Text style={styles.errorText}>{errors.notes}</Text>
        )}
      </View>

      {/* Cashback Preview */}
      {cashbackCalculation && (
        <View style={styles.section}>
          <Pressable
            style={styles.cashbackPreviewHeader}
            onPress={onToggleCashbackPreview}
          >
            <View style={styles.cashbackPreviewTitleContainer}>
              <Ionicons name="gift" size={20} color={colors.brand.emerald} />
              <Text style={styles.cashbackPreviewTitle}>Estimated Cashback</Text>
            </View>
            <View style={styles.cashbackPreviewAmountContainer}>
              <Text style={styles.cashbackPreviewAmount}>
                {currencySymbol}{cashbackCalculation.finalCashback.toFixed(2)}
              </Text>
              <Ionicons
                name={showCashbackPreview ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.midGray}
              />
            </View>
          </Pressable>
          {showCashbackPreview && (
            <View style={styles.cashbackPreviewContent}>
              <CashbackCalculator calculation={cashbackCalculation} />
            </View>
          )}
          <Text style={styles.cashbackDisclaimer}>
            * Estimated cashback. Final amount may vary based on verification.
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <Pressable
        style={[
          styles.submitButton,
          (!isFormValid || isUploading) && styles.submitButtonDisabled,
        ]}
        onPress={onSubmit}
        disabled={!isFormValid || isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color={Colors.text.inverse} />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={20} color={Colors.text.inverse} />
            <Text style={styles.submitButtonText}>Upload Bill</Text>
          </>
        )}
      </Pressable>

      {/* Bottom spacing */}
      <View style={{ height: 100 }} />
    </>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  required: {
    color: Colors.error,
  },
  merchantSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  selectedMerchantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  selectedMerchant: {
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  placeholderText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  currencyPrefix: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    paddingVertical: 14,
  },
  textArea: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  helperText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: 6,
  },
  cashbackPreviewHeader: {
    backgroundColor: colors.greenMist,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashbackPreviewTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cashbackPreviewTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.brand.emerald,
  },
  cashbackPreviewAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cashbackPreviewAmount: {
    ...Typography.h3,
    fontWeight: '700',
    color: colors.brand.emerald,
  },
  cashbackPreviewContent: {
    marginTop: Spacing.md,
  },
  cashbackDisclaimer: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.brand.green,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.base,
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 192, 106, 0.3)',
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
      web: { boxShadow: 'none' },
    }),
  },
  submitButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});

export default BillUploadForm;
