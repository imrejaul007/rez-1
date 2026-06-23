import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthUser, useIsAuthenticated, useRezBalance, useRawWalletData } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface HowRezWorksHeaderProps {
  onBackPress?: () => void;
}

const HowRezWorksHeader: React.FC<HowRezWorksHeaderProps> = ({ onBackPress }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const coinBalance = useRezBalance();
  const rawBackendData = useRawWalletData();

  // Derive cash balance from raw backend data
  const cashBalance = rawBackendData?.cash?.available || rawBackendData?.cashBalance || 0;

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleWalletPress = () => {
    router.push('/wallet-screen');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow}>
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
         
        >
          <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
        </Pressable>

        {/* Title */}
        <Text style={styles.title}>How ReZ Works</Text>

        {/* Coin Balance */}
        <Pressable
          style={styles.balanceContainer}
          onPress={handleWalletPress}
         
        >
          <View style={styles.coinSection}>
            <View style={styles.coinIcon}>
              <Ionicons name="wallet" size={14} color={colors.brand.goldWarm} />
            </View>
            <Text style={styles.coinText}>
              {coinBalance.toLocaleString()}
            </Text>
          </View>
          {cashBalance > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.cashText}>
                {'\u20B9'}{cashBalance}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Save smarter, every time you spend.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
    flex: 1,
    marginLeft: 12,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successScale[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tint.green,
  },
  coinSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.tint.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  coinText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.successScale[700],
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: colors.tint.green,
    marginHorizontal: 10,
  },
  cashText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[400],
    textAlign: 'center',
    marginTop: 4,
  },
});

export default React.memo(HowRezWorksHeader);
