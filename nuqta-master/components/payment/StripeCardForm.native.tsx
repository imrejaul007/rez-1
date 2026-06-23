// Stripe Card Payment Form Component - NATIVE (iOS/Android)
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface StripeCardFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

function StripeCardForm({
  clientSecret,
  amount,
  onSuccess,
  onError,
  onCancel,
}: StripeCardFormProps) {
  const { confirmPayment } = useStripe();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string>('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const isMounted = useIsMounted();

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateCard = () => {
    const cleanedCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanedCardNumber.length < 15) {
      setCardError('Card number must be at least 15 digits');
      return false;
    }
    if (expiryDate.length !== 5) {
      setCardError('Expiry date must be in MM/YY format');
      return false;
    }
    if (cvv.length < 3) {
      setCardError('CVV must be at least 3 digits');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateCard()) {
      return;
    }

    setIsProcessing(true);
    setCardError('');

    try {

      // Confirm payment with Stripe React Native SDK
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            address: {
              postalCode: postalCode,
            },
          },
        },
      });

      if (error) {
        if (!isMounted()) return;
        setCardError(error.message || 'Payment failed');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent) {

        if (paymentIntent.status === 'Succeeded') {
          onSuccess(paymentIntent.id);
        } else {
          const errorMsg = `Payment not completed. Status: ${paymentIntent.status}`;
          if (!isMounted()) return;
          setCardError(errorMsg);
          onError(errorMsg);
        }
      } else {
        const errorMsg = 'Payment could not be completed';
        setCardError(errorMsg);
        onError(errorMsg);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setCardError(err.message || 'An error occurred');
      onError(err.message || 'An error occurred');
    } finally {
      if (!isMounted()) return;
      setIsProcessing(false);
    }
  };

  const cardComplete = cardNumber.replace(/\s/g, '').length >= 15 && expiryDate.length === 5 && cvv.length >= 3;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Enter Card Details</Text>
          <Text style={styles.subtitle}>Amount: {currencySymbol}{amount}</Text>
        </View>
        <Pressable onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.neutral[500]} />
        </Pressable>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Card Number</Text>
          <TextInput
            style={styles.input}
            placeholder="4242 4242 4242 4242"
            value={cardNumber}
            onChangeText={(text) => setCardNumber(formatCardNumber(text.replace(/\D/g, '')))}
            keyboardType="numeric"
            maxLength={19}
            editable={!isProcessing}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/YY"
              value={expiryDate}
              onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
              keyboardType="numeric"
              maxLength={5}
              editable={!isProcessing}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>CVV</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              value={cvv}
              onChangeText={(text) => setCvv(text.replace(/\D/g, ''))}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              editable={!isProcessing}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Postal Code</Text>
          <TextInput
            style={styles.input}
            placeholder="110001"
            value={postalCode}
            onChangeText={(text) => setPostalCode(text.replace(/\D/g, ''))}
            keyboardType="numeric"
            maxLength={6}
            editable={!isProcessing}
          />
        </View>
      </View>

      {cardError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{cardError}</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark" size={20} color={colors.successScale[400]} />
        <Text style={styles.infoText}>
          Your payment is secured by Stripe. We never see your card details.
        </Text>
      </View>

      <View style={styles.testCardInfo}>
        <Text style={styles.testCardTitle}>🧪 Test Cards (For Testing)</Text>
        <Text style={styles.testCardText}>
          • Card: 4242 4242 4242 4242{'\n'}
          • Expiry: Any future date{'\n'}
          • CVC: Any 3 digits{'\n'}
          • Postal: Any 6 digits
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[
            styles.payButton,
            (!cardComplete || isProcessing) && styles.payButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!cardComplete || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.background.primary} />
          ) : (
            <Text style={styles.payButtonText}>Pay {currencySymbol}{amount}</Text>
          )}
        </Pressable>
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.neutral[900],
    backgroundColor: colors.background.primary,
  },
  row: {
    flexDirection: 'row',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[100],
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    marginLeft: 8,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successScale[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: colors.successScale[700],
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  testCardInfo: {
    backgroundColor: colors.tint.amberLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  testCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.amberDark,
    marginBottom: 6,
  },
  testCardText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  payButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.purpleLight,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default React.memo(StripeCardForm);
