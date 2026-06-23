import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface DeliveryInfo {
  estimatedDate: string;
  charge: number;
  isFree: boolean;
  message: string;
}

interface DeliveryEstimatorProps {
  productId: string;
  onCheckDelivery?: (pincode: string) => Promise<DeliveryInfo>;
}

function DeliveryEstimator({ productId, onCheckDelivery }: DeliveryEstimatorProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [error, setError] = useState('');
  const isMounted = useIsMounted();

  const handleCheck = async () => {
    if (pincode.length !== 6) {
      setError('Please enter a valid 6-digit PIN code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (onCheckDelivery) {
        const info = await onCheckDelivery(pincode);
        if (!isMounted()) return;
        setDeliveryInfo(info);
      } else {
        // Mock delivery estimation
        if (!isMounted()) return;
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockInfo: DeliveryInfo = {
          estimatedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          charge: pincode.startsWith('1') ? 0 : 50,
          isFree: pincode.startsWith('1'),
          message: 'Usually delivered in 2-3 business days',
        };
        setDeliveryInfo(mockInfo);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Unable to check delivery. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check Delivery</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter PIN code"
          placeholderTextColor="#999999"
          value={pincode}
          onChangeText={(text) => {
            setPincode(text.replace(/[^0-9]/g, ''));
            setError('');
            setDeliveryInfo(null);
          }}
          keyboardType="number-pad"
          maxLength={6}
        />
        <Pressable
          style={[styles.checkButton, loading && styles.buttonDisabled]}
          onPress={handleCheck}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background.primary} size="small" />
          ) : (
            <Text style={styles.buttonText}>Check</Text>
          )}
        </Pressable>
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      {deliveryInfo && (
        <View style={styles.infoContainer}>
          <Text style={styles.estimatedDate}>
            Delivery by <Text style={styles.bold}>{deliveryInfo.estimatedDate}</Text>
          </Text>
          <Text style={styles.charge}>
            {deliveryInfo.isFree ? (
              <Text style={styles.freeDelivery}>FREE Delivery</Text>
            ) : (
              `${currencySymbol}${deliveryInfo.charge} delivery charge`
            )}
          </Text>
          <Text style={styles.message}>{deliveryInfo.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: colors.background.primary,
  },
  checkButton: {
    height: 44,
    paddingHorizontal: 24,
    backgroundColor: '#6C47FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: 8,
  },
  infoContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  estimatedDate: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 6,
  },
  bold: {
    fontWeight: '600',
  },
  charge: {
    fontSize: 13,
    color: colors.midGray,
    marginBottom: 6,
  },
  freeDelivery: {
    color: '#15803d',
    fontWeight: '600',
  },
  message: {
    fontSize: 12,
    color: '#999999',
  },
});

export default React.memo(DeliveryEstimator);
