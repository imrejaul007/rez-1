import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface WalletSummarySectionProps {
  rezCoins: number;
  totalBrandedCoins: number;
  totalPromoCoins: number;
  currencySymbol: string;
  monthlyEarnings: number;
  navigateTo: (path: string) => void;
}

const WalletSummarySection = React.memo(function WalletSummarySection({
  rezCoins,
  totalBrandedCoins,
  totalPromoCoins,
  currencySymbol,
  monthlyEarnings,
  navigateTo,
}: WalletSummarySectionProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{'\u{1F4B0}'} Your Earnings</Text>

      <View style={styles.walletGrid}>
        <View style={[styles.walletCard, { backgroundColor: '#FFF9E6', borderColor: '#80DFAD' }]}>
          <Text style={styles.walletLabel}>{BRAND.COIN_NAME}</Text>
          <Text style={[styles.walletValue, { color: '#00A85D' }]}>{rezCoins.toLocaleString()}</Text>
        </View>
        <View style={[styles.walletCard, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
          <Text style={styles.walletLabel}>Branded</Text>
          <Text style={[styles.walletValue, { color: '#9333EA' }]}>{totalBrandedCoins.toLocaleString()}</Text>
        </View>
        <View style={[styles.walletCard, { backgroundColor: colors.tint.amber, borderColor: colors.warningScale[200] }]}>
          <Text style={styles.walletLabel}>Promo</Text>
          <Text style={[styles.walletValue, { color: '#E6B34F' }]}>{totalPromoCoins.toLocaleString()}</Text>
        </View>
      </View>

      <LinearGradient
        colors={['#FFF9E6', colors.tint.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.monthlyCard}
      >
        <View>
          <Text style={styles.monthlyLabel}>This Month Earned</Text>
          <Text style={styles.monthlyValue}>{currencySymbol}{monthlyEarnings.toLocaleString()}</Text>
        </View>
        <View style={styles.monthlyButtons}>
          <Pressable style={styles.walletButton} onPress={() => navigateTo('/wallet')}>
            <Text style={styles.walletButtonText}>View Wallet</Text>
          </Pressable>
          <Pressable style={styles.howButton} onPress={() => navigateTo(BRAND.HOW_IT_WORKS_ROUTE)}>
            <Text style={styles.howButtonText}>How Coins Work</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
});

export default WalletSummarySection;
