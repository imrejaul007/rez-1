import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import logger from '@/utils/logger';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

/**
 * DeliveryInformation Component
 *
 * Displays delivery estimates, shipping options, and location-based delivery info
 * Features:
 * - Pin code checking for delivery availability
 * - Estimated delivery date
 * - Multiple shipping options
 * - Free delivery threshold indicator
 * - Express/standard delivery options
 */

interface DeliveryEstimate {
  isAvailable: boolean;
  estimatedDays: number;
  estimatedDate: string;
  minDays?: number;
  maxDays?: number;
  shippingCost: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold?: number;
}

interface ShippingOption {
  id: string;
  name: string;
  description: string;
  cost: number;
  estimatedDays: number;
  isAvailable: boolean;
}

interface DeliveryInformationProps {
  productId: string;
  storeId?: string;
  productPrice: number;
  onPinCodeChange?: (pinCode: string) => void;
}

export const DeliveryInformation: React.FC<DeliveryInformationProps> = ({
  productId,
  storeId,
  productPrice,
  onPinCodeChange,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [pinCode, setPinCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  /**
   * Check delivery availability for pin code
   */
  const checkDelivery = async () => {
    if (!pinCode || pinCode.length !== 6) {
      setError('Please enter a valid 6-digit pin code');
      return;
    }

    try {
      setIsChecking(true);
      setError(null);

      logger.debug('📦 [DeliveryInfo] Checking delivery for pin code:', pinCode);

      // TODO: Replace with actual API call
      // const response = await deliveryApi.checkAvailability(productId, pinCode);

      // Simulated API response
      if (!isMounted()) return;
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock delivery estimate
      const isFreeDelivery = productPrice >= 500;
      const estimate: DeliveryEstimate = {
        isAvailable: true,
        estimatedDays: 3,
        minDays: 2,
        maxDays: 4,
        estimatedDate: getEstimatedDate(3),
        shippingCost: isFreeDelivery ? 0 : 50,
        isFreeDelivery,
        freeDeliveryThreshold: isFreeDelivery ? undefined : 500,
      };

      // Mock shipping options
      const options: ShippingOption[] = [
        {
          id: 'standard',
          name: 'Standard Delivery',
          description: '3-5 business days',
          cost: isFreeDelivery ? 0 : 50,
          estimatedDays: 4,
          isAvailable: true,
        },
        {
          id: 'express',
          name: 'Express Delivery',
          description: '1-2 business days',
          cost: 100,
          estimatedDays: 2,
          isAvailable: true,
        },
      ];

      setDeliveryEstimate(estimate);
      setShippingOptions(options);
      setSelectedShipping('standard');

      if (onPinCodeChange) {
        onPinCodeChange(pinCode);
      }

      logger.debug('✅ [DeliveryInfo] Delivery estimate:', estimate);
    } catch (err: any) {
      logger.error('❌ [DeliveryInfo] Error checking delivery:', err);
      if (!isMounted()) return;
      setError('Unable to check delivery. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsChecking(false);
    }
  };

  /**
   * Calculate estimated delivery date
   */
  const getEstimatedDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };

    return date.toLocaleDateString('en-IN', options);
  };

  /**
   * Handle pin code input
   */
  const handlePinCodeChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 6) {
      setPinCode(numericText);
      setError(null);
      // Clear previous estimate when pin code changes
      if (deliveryEstimate && numericText.length < 6) {
        setDeliveryEstimate(null);
      }
    }
  };

  /**
   * Handle shipping option selection
   */
  const handleShippingSelect = (optionId: string) => {
    setSelectedShipping(optionId);
    const option = shippingOptions.find(o => o.id === optionId);
    if (option && deliveryEstimate) {
      setDeliveryEstimate({
        ...deliveryEstimate,
        estimatedDays: option.estimatedDays,
        estimatedDate: getEstimatedDate(option.estimatedDays),
        shippingCost: option.cost,
        isFreeDelivery: option.cost === 0,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="location" size={20} color={colors.brand.purpleLight} />
        <ThemedText style={styles.title}>Check Delivery</ThemedText>
      </View>

      {/* Pin Code Input */}
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Pin Code"
            placeholderTextColor={colors.neutral[400]}
            value={pinCode}
            onChangeText={handlePinCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            editable={!isChecking}
          />
        </View>

        <Pressable
          style={[
            styles.checkButton,
            (isChecking || pinCode.length !== 6) && styles.checkButtonDisabled,
          ]}
          onPress={checkDelivery}
          disabled={isChecking || pinCode.length !== 6}
         
        >
          {isChecking ? (
            <ActivityIndicator size="small" color={colors.background.primary} />
          ) : (
            <ThemedText style={styles.checkButtonText}>Check</ThemedText>
          )}
        </Pressable>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {/* Delivery Estimate */}
      {deliveryEstimate && deliveryEstimate.isAvailable && (
        <View style={styles.estimateContainer}>
          {/* Delivery Date */}
          <View style={styles.estimateRow}>
            <Ionicons name="time-outline" size={20} color={colors.successScale[400]} />
            <View style={styles.estimateContent}>
              <ThemedText style={styles.estimateLabel}>Estimated Delivery</ThemedText>
              <ThemedText style={styles.estimateValue}>
                {deliveryEstimate.minDays && deliveryEstimate.maxDays
                  ? `${deliveryEstimate.minDays}-${deliveryEstimate.maxDays} days`
                  : `${deliveryEstimate.estimatedDays} days`}
                {' '}• {deliveryEstimate.estimatedDate}
              </ThemedText>
            </View>
          </View>

          {/* Shipping Cost */}
          <View style={styles.estimateRow}>
            <Ionicons
              name={deliveryEstimate.isFreeDelivery ? 'gift' : 'cash-outline'}
              size={20}
              color={deliveryEstimate.isFreeDelivery ? colors.successScale[400] : colors.neutral[500]}
            />
            <View style={styles.estimateContent}>
              <ThemedText style={styles.estimateLabel}>Shipping Cost</ThemedText>
              {deliveryEstimate.isFreeDelivery ? (
                <ThemedText style={styles.freeDeliveryText}>FREE Delivery</ThemedText>
              ) : (
                <View style={styles.costRow}>
                  <ThemedText style={styles.estimateValue}>
                    {currencySymbol}{deliveryEstimate.shippingCost}
                  </ThemedText>
                  {deliveryEstimate.freeDeliveryThreshold && (
                    <ThemedText style={styles.thresholdText}>
                      • Free above {currencySymbol}{deliveryEstimate.freeDeliveryThreshold}
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Shipping Options Toggle */}
          {shippingOptions.length > 1 && (
            <Pressable
              style={styles.optionsToggle}
              onPress={() => setShowOptions(!showOptions)}
             
            >
              <ThemedText style={styles.optionsToggleText}>
                {showOptions ? 'Hide' : 'View'} Shipping Options
              </ThemedText>
              <Ionicons
                name={showOptions ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.brand.purpleLight}
              />
            </Pressable>
          )}

          {/* Shipping Options List */}
          {showOptions && (
            <View style={styles.optionsList}>
              {shippingOptions.map(option => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionItem,
                    selectedShipping === option.id && styles.optionItemSelected,
                  ]}
                  onPress={() => handleShippingSelect(option.id)}
                 
                >
                  <View style={styles.radioButton}>
                    {selectedShipping === option.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>

                  <View style={styles.optionContent}>
                    <View style={styles.optionHeader}>
                      <ThemedText style={styles.optionName}>{option.name}</ThemedText>
                      {option.cost === 0 ? (
                        <View style={styles.freeBadge}>
                          <ThemedText style={styles.freeBadgeText}>FREE</ThemedText>
                        </View>
                      ) : (
                        <ThemedText style={styles.optionCost}>{currencySymbol}{option.cost}</ThemedText>
                      )}
                    </View>
                    <ThemedText style={styles.optionDescription}>
                      {option.description}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Delivery Not Available */}
      {deliveryEstimate && !deliveryEstimate.isAvailable && (
        <View style={styles.notAvailableContainer}>
          <Ionicons name="close-circle" size={24} color={colors.error} />
          <ThemedText style={styles.notAvailableText}>
            Delivery not available to this location
          </ThemedText>
        </View>
      )}

      {/* Delivery Benefits */}
      <View style={styles.benefits}>
        <View style={styles.benefitItem}>
          <Ionicons name="shield-checkmark" size={16} color={colors.successScale[400]} />
          <ThemedText style={styles.benefitText}>Safe & Secure Delivery</ThemedText>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="cube" size={16} color={colors.successScale[400]} />
          <ThemedText style={styles.benefitText}>Quality Checked</ThemedText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: 16,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 8,
    backgroundColor: colors.neutral[50],
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.neutral[900],
  },
  checkButton: {
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  checkButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  checkButtonText: {
    color: colors.background.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[100],
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
  },

  // Estimate
  estimateContainer: {
    backgroundColor: colors.neutral[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  estimateContent: {
    flex: 1,
  },
  estimateLabel: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  estimateValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  freeDeliveryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.successScale[400],
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  thresholdText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginLeft: 4,
  },

  // Options Toggle
  optionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  optionsToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },

  // Options List
  optionsList: {
    marginTop: 12,
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    gap: 12,
  },
  optionItemSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },

  // Radio Button
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.purpleLight,
  },

  // Option Content
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  optionCost: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  freeBadge: {
    backgroundColor: colors.tint.green,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successScale[700],
  },
  optionDescription: {
    fontSize: 13,
    color: colors.neutral[500],
  },

  // Not Available
  notAvailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[100],
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  notAvailableText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
  },

  // Benefits
  benefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
});

export default React.memo(DeliveryInformation);
