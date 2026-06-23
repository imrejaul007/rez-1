/**
 * Secure Payment Header
 *
 * Premium header component showing security badge and trust indicators
 * Updated with Nuqta design palette
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BRAND } from '@/constants/brand';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';

interface SecurePaymentHeaderProps {
  storeName?: string;
  onBack?: () => void;
}

export const SecurePaymentHeader: React.FC<SecurePaymentHeaderProps> = ({
  storeName,
  onBack,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color={colors.nuqta.nileBlue} />
      </Pressable>

      <View style={styles.headerContent}>
        {/* Title Row with Lock Icon */}
        <View style={styles.titleRow}>
          <View style={styles.lockIconWrapper}>
            <Ionicons name="lock-closed" size={16} color={colors.nuqta.mustard} />
          </View>
          <Text style={styles.title}>Secure Payment</Text>
        </View>

        {/* Store Name */}
        {storeName && (
          <Text style={styles.storeName}>{storeName}</Text>
        )}

        {/* Trust Badge with Gradient */}
        <LinearGradient
          colors={[colors.nuqta.mustard, colors.nuqta.peach]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.trustBadge}
        >
          <Ionicons name="shield-checkmark" size={12} color={colors.nuqta.nileBlue} />
          <Text style={styles.trustText}>{`Powered by ${BRAND.APP_NAME} Wallet • Encrypted & Safe`}</Text>
        </LinearGradient>
      </View>

      <View style={styles.placeholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...Platform.select({
      ios: {
        shadowColor: colors.nuqta.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.nuqta.lavender,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lockIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.nuqta.linen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
    color: colors.nuqta.nileBlue,
    fontWeight: '700',
  },
  storeName: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  trustText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.nuqta.nileBlue,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
});

export default React.memo(SecurePaymentHeader);
