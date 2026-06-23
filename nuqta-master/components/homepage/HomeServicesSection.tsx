/**
 * Home Services Section - Converted from V2
 * Repair Services, Deep Clean, Painting, Carpentry, etc.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import homeServicesApi, { HomeServiceCategory } from '@/services/homeServicesApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;

const COLORS = {
  white: colors.background.primary,
  navy: colors.nileBlue,
  gray600: colors.neutral[500],
  mustard: colors.lightMustard,
  lightPeach: colors.lightPeach,
  nileBlue: colors.nileBlue,
  green500: colors.lightMustard, // Migrated to mustard
};

const HomeServicesSection: React.FC = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<HomeServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  // Fetch categories from backend
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await homeServicesApi.getCategories();
      if (response.success && response.data) {
        if (!isMounted()) return;
        setCategories(response.data);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleViewAll = () => {
    router.push('/home-services' as any);
  };

  const handlePress = (route: string) => {
    router.push(route as any);
  };

  // Handle special navigation for "Today" and "Verified" - these are filters, not categories
  const handleTodayPress = () => {
    // Navigate to home services page with "today" filter or show all services
    router.push('/home-services' as any);
  };

  const handleVerifiedPress = () => {
    // Navigate to home services page with "verified" filter or show all services
    router.push('/home-services' as any);
  };

  // Get category data for main cards
  const repairCategory = categories.find(c => c.id === 'repair');
  const cleaningCategory = categories.find(c => c.id === 'cleaning');
  const paintingCategory = categories.find(c => c.id === 'painting');
  const carpentryCategory = categories.find(c => c.id === 'carpentry');

  // Helper to render icon based on iconType
  const renderIcon = (category: HomeServiceCategory | undefined, fallback: string, size: number) => {
    if (!category) {
      return <Text style={{ fontSize: size }}>{fallback}</Text>;
    }

    if (category.iconType === 'url' && category.icon) {
      return (
        <CachedImage
          source={category.icon}
          style={{ width: size, height: size }}
          contentFit="contain"
        />
      );
    }

    // Default to emoji/text rendering
    return <Text style={{ fontSize: size }}>{category.icon || fallback}</Text>;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingVertical: 20, alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={COLORS.green500} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="home-services-section">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏠 Home Services</Text>
          <Text style={styles.headerSubtitle}>Professional help at home</Text>
        </View>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {/* Main Cards Row */}
      <View style={styles.mainRow}>
        {/* Repair Services Card */}
        <Pressable
          style={styles.repairCard}
          onPress={() => handlePress('/home-services/repair')}
         
          testID="repair-card"
        >
          <LinearGradient
            colors={[colors.lightPeach, colors.brand.sand, colors.brand.caramel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.repairGradient}
            testID="repair-gradient"
          >
            <View style={styles.repairTop}>
              <View style={styles.repairIconBox}>
                {renderIcon(repairCategory, '🔧', 28)}
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ VERIFIED</Text>
              </View>
            </View>
            <Text style={styles.repairTitle}>{repairCategory?.title || 'Repair Services'}</Text>
            <Text style={styles.repairSubtitle}>AC • Plumbing • Electrical</Text>
            <View style={styles.repairBadges}>
              <View style={styles.sameDayBadge}>
                <Text style={styles.badgeText}>Same Day</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.badgeText}>
                  {repairCategory?.cashback ? `${repairCategory.cashback}% OFF` : '10% OFF'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Deep Clean Card */}
        <Pressable
          style={styles.cleanCard}
          onPress={() => handlePress('/home-services/cleaning')}
         
          testID="clean-card"
        >
          <LinearGradient
            colors={[colors.nileBlue, '#243f55', '#2d4a5f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cleanGradient}
            testID="clean-gradient"
          >
            <View style={styles.cleanIconBox}>
              {renderIcon(cleaningCategory, '🧹', 24)}
            </View>
            <Text style={styles.cleanTitle}>Deep</Text>
            <Text style={styles.cleanTitle}>Clean</Text>
            <Text style={styles.cleanSubtitle}>Pest control too</Text>
            <View style={styles.bookNowBadge}>
              <Text style={styles.bookNowText}>Book Now</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Bottom Row - Quick Actions */}
      <View style={styles.bottomRow}>
        {/* Painting */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/home-services/painting')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(255, 215, 181, 0.3)' }]}>
            {renderIcon(paintingCategory, '🎨', 20)}
          </View>
          <Text style={styles.bottomTitle}>{paintingCategory?.title || 'Painting'}</Text>
        </Pressable>

        {/* Carpentry */}
        <Pressable
          style={styles.bottomCard}
          onPress={() => handlePress('/home-services/carpentry')}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(26, 58, 82, 0.15)' }]}>
            {renderIcon(carpentryCategory, '🪚', 20)}
          </View>
          <Text style={styles.bottomTitle}>{carpentryCategory?.title || 'Carpentry'}</Text>
        </Pressable>

        {/* Today - Navigate to main home services page */}
        <Pressable
          style={styles.bottomCard}
          onPress={handleTodayPress}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(255, 205, 87, 0.2)' }]}>
            <Text style={styles.bottomIcon}>⚡</Text>
          </View>
          <Text style={styles.bottomTitle}>Today</Text>
        </Pressable>

        {/* Verified - Navigate to main home services page */}
        <Pressable
          style={styles.bottomCard}
          onPress={handleVerifiedPress}
         
        >
          <View style={[styles.bottomIconBox, { backgroundColor: 'rgba(255, 205, 87, 0.1)' }]}>
            <Text style={styles.bottomIcon}>✅</Text>
          </View>
          <Text style={styles.bottomTitle}>Verified</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
    // Web-specific: Prevent inspector overlay
    ...(Platform.OS === 'web' && {
      // @ts-ignore - Web-only CSS
      position: 'relative',
      isolation: 'isolate',
    }),
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

  // Repair Card
  repairCard: {
    flex: 1.3,
    borderRadius: 20,
    overflow: 'hidden',
  },
  repairGradient: {
    padding: 16,
    minHeight: 180,
  },
  repairTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  repairIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repairIcon: {
    fontSize: 28,
  },
  verifiedBadge: {
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  repairTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  repairSubtitle: {
    fontSize: 12,
    color: 'rgba(26, 58, 82, 0.8)',
    marginBottom: 12,
  },
  repairBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  sameDayBadge: {
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadge: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Clean Card
  cleanCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cleanGradient: {
    padding: 14,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cleanIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanIcon: {
    fontSize: 24,
  },
  cleanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 20,
  },
  cleanSubtitle: {
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

  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: 12,
    alignItems: 'center',
  },
  bottomIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bottomIcon: {
    fontSize: 20,
  },
  bottomTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
});

export default React.memo(HomeServicesSection);
