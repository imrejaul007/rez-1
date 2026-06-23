// Stripe Card Payment Form Component - WEB VERSION (Real Stripe.js)
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js';
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

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: colors.neutral[900],
      '::placeholder': {
        color: colors.neutral[400],
      },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    invalid: {
      color: colors.error,
      iconColor: colors.error,
    },
  },
};

function StripeCardForm({
  clientSecret,
  amount,
  onSuccess,
  onError,
  onCancel,
}: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string>('');
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);
  const isMounted = useIsMounted();

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      setCardError('Stripe.js has not loaded yet. Please try again.');
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      setCardError('Card input not found. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setCardError('');

    try {
      // Only log in development, never log sensitive data
      if (__DEV__) {

        // Never log client secrets or sensitive payment data

      }

      // Confirm payment using Stripe.js
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
        },
      });

      if (confirmError) {
        if (__DEV__) {
        }

        // Handle specific error types
        let errorMessage = confirmError.message || 'Payment failed';

        // Check for authentication errors (401)
        if (confirmError.type === 'invalid_request_error' && confirmError.message?.includes('No such payment_intent')) {
          errorMessage = 'Payment session expired. Please try again.';
        } else if (confirmError.type === 'invalid_request_error') {
          errorMessage = 'Payment configuration error. Please ensure you are using the correct Stripe keys (test mode for testing).';
        } else if (confirmError.type === 'card_error') {
          // Card-specific errors (declined, insufficient funds, etc.)
          errorMessage = confirmError.message || 'Card payment failed. Please check your card details.';
        }

        if (!isMounted()) return;
        setCardError(errorMessage);
        onError(errorMessage);
      } else if (paymentIntent) {
        if (__DEV__) {

        }

        if (paymentIntent.status === 'succeeded') {
          onSuccess(paymentIntent.id);
        } else {
          const errorMsg = `Payment not completed. Status: ${paymentIntent.status}`;
          if (!isMounted()) return;
          setCardError(errorMsg);
          onError(errorMsg);
        }
      }
    } catch (err: any) {
      if (__DEV__) {
      }
      if (!isMounted()) return;
      setCardError(err.message || 'An error occurred');
      onError(err.message || 'An error occurred');
    } finally {
      if (!isMounted()) return;
      setIsProcessing(false);
    }
  };

  const cardComplete = cardNumberComplete && cardExpiryComplete && cardCvcComplete;

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
          <View style={styles.stripeInputContainer}>
            <CardNumberElement
              options={CARD_ELEMENT_OPTIONS}
              onChange={(e) => {
                setCardNumberComplete(e.complete);
                if (e.error) {
                  setCardError(e.error.message);
                } else {
                  setCardError('');
                }
              }}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Expiry Date</Text>
            <View style={styles.stripeInputContainer}>
              <CardExpiryElement
                options={CARD_ELEMENT_OPTIONS}
                onChange={(e) => {
                  setCardExpiryComplete(e.complete);
                  if (e.error) {
                    setCardError(e.error.message);
                  } else if (!cardError) {
                    setCardError('');
                  }
                }}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>CVV</Text>
            <View style={styles.stripeInputContainer}>
              <CardCvcElement
                options={CARD_ELEMENT_OPTIONS}
                onChange={(e) => {
                  setCardCvcComplete(e.complete);
                  if (e.error) {
                    setCardError(e.error.message);
                  } else if (!cardError) {
                    setCardError('');
                  }
                }}
              />
            </View>
          </View>
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
          Your payment is secured by Stripe. We never see your card details
        </Text>
      </View>

      <View style={styles.testCardInfo}>
        <Text style={styles.testCardTitle}>🧪 Test Cards (For Testing)</Text>
        <Text style={styles.testCardText}>
          {`• Card: 4242 4242 4242 4242\n• Expiry: Any future date\n• CVC: Any 3 digits`}
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
            (!cardComplete || isProcessing || !stripe) && styles.payButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!cardComplete || isProcessing || !stripe}
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
  stripeInputContainer: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 12,
    padding: 16,
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
