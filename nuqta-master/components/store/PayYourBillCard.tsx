// PayYourBillCard.tsx
// Card component for bill payment section specifically for service-based stores

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface PayYourBillCardProps {
  storeId: string;
  storeName: string;
  recentBillAmount?: number;
  onQuickPay?: () => void;
  onUploadBill?: () => void;
}

const PayYourBillCard: React.FC<PayYourBillCardProps> = ({
  storeId,
  storeName,
  recentBillAmount,
  onQuickPay,
  onUploadBill,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const router = useRouter();
  const [loading, setLoading] = useState<'quick' | 'upload' | null>(null);
  const isMounted = useIsMounted();

  const handleQuickPay = async () => {
    setLoading('quick');
    try {
      if (onQuickPay) {
        await onQuickPay();
      } else {
        // Navigate to quick pay flow
        router.push(`/payment?storeId=${storeId}&mode=quick`);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to initiate quick pay');
    } finally {
      if (!isMounted()) return;
      setLoading(null);
    }
  };

  const handleUploadBill = async () => {
    setLoading('upload');
    try {
      if (onUploadBill) {
        await onUploadBill();
      } else {
        // Navigate to bill upload page
        router.push(`/bill-upload?storeId=${storeId}`);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to open bill upload');
    } finally {
      if (!isMounted()) return;
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="receipt" size={24} color={colors.brand.purple} />
          </View>
          <View>
            <Text style={styles.title}>Pay Your Bill</Text>
            <Text style={styles.subtitle}>Upload bill & earn cashback</Text>
          </View>
        </View>
        {recentBillAmount && (
          <View style={styles.amountBadge}>
            <Text style={styles.amountLabel}>Last bill</Text>
            <Text style={styles.amountValue}>{currencySymbol}{recentBillAmount}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <Pressable
          style={[styles.actionButton, styles.quickPayButton]}
          onPress={handleQuickPay}
         
          disabled={loading !== null}
        >
          {loading === 'quick' ? (
            <ActivityIndicator color={colors.background.primary} size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color={colors.background.primary} />
              <Text style={styles.quickPayText}>Quick Pay</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.uploadButton]}
          onPress={handleUploadBill}
         
          disabled={loading !== null}
        >
          {loading === 'upload' ? (
            <ActivityIndicator color={colors.brand.purple} size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color={colors.brand.purple} />
              <Text style={styles.uploadText}>Upload Bill</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Info Text */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle" size={16} color={colors.neutral[500]} />
        <Text style={styles.infoText}>
          Upload your bill to get instant cashback and rewards
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  amountBadge: {
    backgroundColor: colors.tint.pink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: colors.brand.purple,
    fontWeight: '500',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  quickPayButton: {
    backgroundColor: colors.brand.purple,
  },
  uploadButton: {
    backgroundColor: colors.background.primary,
    borderWidth: 1.5,
    borderColor: colors.brand.purple,
  },
  quickPayText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.white,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.neutral[50],
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 16,
  },
});

export default React.memo(PayYourBillCard);
