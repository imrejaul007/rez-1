/**
 * TransactionCTA - High-contrast primary action button to view all transactions
 */
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface TransactionCTAProps {
  onPress?: () => void;
}

export const TransactionCTA: React.FC<TransactionCTAProps> = ({ onPress }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/earnings-history' as any);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.button}
        onPress={handlePress}
       
        accessibilityLabel="View all transactions"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[Colors.nileBlue, '#2A5577'] as const}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="receipt-outline" size={18} color={colors.background.primary} />
            </View>
            <View style={styles.textContainer}>
              <ThemedText style={styles.title}>View All Transactions</ThemedText>
              <ThemedText style={styles.subtitle}>Complete history of earnings & spending</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  button: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  gradient: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.white,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
});

export default React.memo(TransactionCTA);
