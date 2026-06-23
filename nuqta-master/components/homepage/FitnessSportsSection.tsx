/**
 * Fitness & Sports Section - Connected to real API
 * Gyms, Studios, Personal Trainers, Sports Store, Challenges
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import apiClient from '@/services/apiClient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;

const COLORS = {
  white: colors.background.primary,
  navy: colors.nileBlue,
  gray600: colors.neutral[500],
  mustard: colors.lightMustard,
  green500: colors.lightMustard, // Migrated to mustard
};

interface FitnessStats {
  maxCashback: number;
  activeStudioCount: number;
}

const FitnessSportsSection: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState<FitnessStats>({ maxCashback: 25, activeStudioCount: 0 });
  const isMounted = useIsMounted();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch gyms to get max cashback
        const response = await apiClient.get('/stores/by-category-slug/gyms?limit=10');
        const stores = (response.data as any)?.stores || [];

        if (stores.length > 0) {
          const maxCashback = Math.max(...stores.map((s: any) => s.offers?.cashback || 0));
          if (!isMounted()) return;
          setStats(prev => ({ ...prev, maxCashback: maxCashback || 25 }));
        }
      } catch (error) {
        // Use default values on error
      }
    };

    fetchStats();
  }, []);

  const handleViewAll = () => {
    router.push('/fitness' as any);
  };

  const handlePress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>💪 Fitness & Sports</Text>
          <Text style={styles.headerSubtitle}>Get fit, get rewards</Text>
        </View>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* Main Cards Row */}
      <View style={styles.mainRow}>
        {/* GYMS Card */}
        <Pressable
          style={styles.gymsCard}
          onPress={() => handlePress('/fitness/gyms')}
         
        >
          <LinearGradient
            colors={[colors.lightPeach, colors.brand.sand, colors.brand.caramel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gymsGradient}
          >
            <View style={styles.gymsTop}>
              <View style={styles.gymsIconBox}>
                <Text style={styles.gymsIcon}>🏋️</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{stats.maxCashback}% OFF</Text>
              </View>
            </View>
            <Text style={styles.gymsTitle}>GYMS</Text>
            <Text style={styles.gymsSubtitle}>Premium equipment • Expert trainers</Text>
          </LinearGradient>
        </Pressable>

        {/* Studios Card */}
        <Pressable
          style={styles.studiosCard}
          onPress={() => handlePress('/fitness/studios')}
         
        >
          <LinearGradient
            colors={[colors.nileBlue, '#243f55', '#2d4a5f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.studiosGradient}
          >
            <Text style={styles.studiosIcon}>🧘</Text>
            <Text style={styles.studiosTitle}>Studios</Text>
            <Text style={styles.studiosSubtitle}>Yoga • Dance</Text>
            <View style={styles.bookNowBadge}>
              <Text style={styles.bookNowText}>Book Now</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Small Cards Row */}
      <View style={styles.smallRow}>
        {/* Personal Trainers */}
        <Pressable
          style={styles.smallCard}
          onPress={() => handlePress('/fitness/trainers')}
         
        >
          <View style={styles.smallCardContent}>
            <View style={styles.smallIconBox}>
              <Text style={styles.smallIcon}>🏃</Text>
            </View>
            <Text style={styles.smallTitle}>Personal</Text>
            <Text style={styles.smallTitle}>Trainers</Text>
            <Text style={styles.smallSubtitle}>1-on-1</Text>
          </View>
        </Pressable>

        {/* Sports Store */}
        <Pressable
          style={styles.smallCard}
          onPress={() => handlePress('/fitness/store')}
         
        >
          <View style={styles.smallCardContent}>
            <View style={styles.smallIconBoxBlue}>
              <Text style={styles.smallIcon}>🎽</Text>
            </View>
            <Text style={styles.smallTitle}>Sports</Text>
            <Text style={styles.smallTitle}>Store</Text>
            <Text style={styles.smallSubtitle}>Gear up</Text>
          </View>
        </Pressable>

        {/* Challenges */}
        <Pressable
          style={styles.smallCard}
          onPress={() => handlePress('/challenges')}
         
        >
          <View style={styles.smallCardContent}>
            <View style={styles.smallIconBoxYellow}>
              <Text style={styles.smallIcon}>🏆</Text>
            </View>
            <Text style={styles.smallTitle}>Challenges</Text>
            <Text style={styles.smallSubtitle}>Win big</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green500,
  },

  // Main Row
  mainRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // GYMS Card
  gymsCard: {
    flex: 1.3,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gymsGradient: {
    padding: 16,
    minHeight: 160,
  },
  gymsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  gymsIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymsIcon: {
    fontSize: 28,
  },
  discountBadge: {
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.3)',
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  gymsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 4,
  },
  gymsSubtitle: {
    fontSize: 12,
    color: 'rgba(26, 58, 82, 0.8)',
  },

  // Studios Card
  studiosCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  studiosGradient: {
    padding: 14,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  studiosIcon: {
    fontSize: 28,
  },
  studiosTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 8,
  },
  studiosSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  bookNowBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bookNowText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Small Cards Row
  smallRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  smallCard: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  smallCardContent: {
    padding: 12,
    alignItems: 'center',
  },
  smallIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 181, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  smallIconBoxBlue: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 58, 82, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  smallIconBoxYellow: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 205, 87, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  smallIcon: {
    fontSize: 22,
  },
  smallTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
  },
  smallSubtitle: {
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 2,
  },
});

export default React.memo(FitnessSportsSection);
