// @ts-nocheck
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

interface StatBox {
  value: number | string;
  label: string;
  valueColor?: string;
}

interface LoyaltyRewardsHubCardProps {
  activeBrands?: number;
  streaks?: number;
  unlocked?: number;
  tiers?: number;
  isLoading?: boolean;
  onPress?: () => void;
}

const LoyaltyRewardsHubCard: React.FC<LoyaltyRewardsHubCardProps> = ({
  activeBrands = 0,
  streaks = 0,
  unlocked = 0,
  tiers = 0,
  isLoading = false,
  onPress,
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/loyalty-rewards-hub');
    }
  };

  const stats: StatBox[] = [
    { value: activeBrands, label: 'Active Brands' },
    { value: streaks, label: 'Streaks', valueColor: colors.lightMustard },
    { value: unlocked, label: 'Unlocked', valueColor: colors.lightMustard },
    { value: tiers, label: 'Tiers', valueColor: colors.nileBlue },
  ];

  // Loading skeleton for stat box
  const renderSkeletonStatBox = (index: number) => (
    <View key={index} style={styles.statBox}>
      <View style={styles.skeletonValue} />
      <View style={styles.skeletonLabel} />
    </View>
  );

  return (
    <View style={styles.cardWrapper}>
      <Pressable
       
        onPress={handlePress}
        style={styles.cardContainer}
        disabled={isLoading}
      >
        <LinearGradient
          colors={[colors.linen, colors.lightPeach]} // Linen to light purple gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardGradient}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.headerLeft}>
              {/* Trophy Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name="trophy" size={24} color={colors.lightMustard} />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Loyalty & Rewards Hub</Text>
                <Text style={styles.subtitle}>Your progress with every brand.</Text>
              </View>
            </View>
            {/* View Link */}
            <Pressable
              onPress={handlePress}
             
              style={styles.viewLink}
              disabled={isLoading}
            >
              <Text style={styles.viewLinkText}>View</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.lightMustard} />
            </Pressable>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            {isLoading
              ? [0, 1, 2, 3].map(renderSkeletonStatBox)
              : stats.map((stat, index) => (
                  <View key={index} style={styles.statBox}>
                    <Text
                      style={[
                        styles.statValue,
                        stat.valueColor && { color: stat.valueColor },
                      ]}
                    >
                      {stat.value}
                    </Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 6,
    marginVertical: 8,
  },
  cardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardGradient: {
    padding: 16,
    borderRadius: 20,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '400',
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: colors.nileBlue,
    fontWeight: '500',
    textAlign: 'center',
  },
  skeletonValue: {
    width: 24,
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonLabel: {
    width: 50,
    height: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 4,
  },
});

export default React.memo(LoyaltyRewardsHubCard);

