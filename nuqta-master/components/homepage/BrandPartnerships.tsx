// @ts-nocheck
import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useBrandPartnerships } from '@/hooks/useHomepage';
import brandApiService, { BrandPartnership } from '@/services/brandApi';
import { colors } from '@/constants/theme';

interface BrandPartnershipsProps {
  onBrandPress?: (brandId: string) => void;
}

// Fallback gradient colors if not provided by backend - Nuqta palette
const DEFAULT_GRADIENTS: Record<string, [string, string]> = {
  luxury: [colors.nileBlue, '#243f55'],
  exclusive: [colors.nileBlue, '#2d4a5f'],
  premium: [colors.lavenderMist, colors.lightPeach],
  standard: [colors.linen, colors.lightPeach],
};

// Fallback emoji icons for brands without logos
const BRAND_EMOJI_FALLBACK: Record<string, string> = {
  nike: '\uD83D\uDC5F',
  apple: '\uD83C\uDF4E',
  starbucks: '\u2615',
  zara: '\uD83D\uDC57',
  samsung: '\uD83D\uDCF1',
  dominos: '\uD83C\uDF55',
};

const BrandPartnerships: React.FC<BrandPartnershipsProps> = ({
  onBrandPress,
}) => {
  const router = useRouter();
  const { section, loading, error } = useBrandPartnerships();

  // Extract brands from section
  const brands = useMemo(() => {
    if (!section?.items || section.items.length === 0) {
      return [];
    }
    return section.items as BrandPartnership[];
  }, [section?.items]);

  // Track views when brands are loaded
  useEffect(() => {
    if (brands.length > 0) {
      // Track views for analytics (fire and forget)
      brands.forEach(brand => {
        brandApiService.trackBrandView(brand.id).catch(() => {});
      });
    }
  }, [brands]);

  const handleBrandPress = async (brand: BrandPartnership) => {
    // Track click for analytics
    brandApiService.trackBrandClick(brand.id).catch(() => {});

    if (onBrandPress) {
      onBrandPress(brand.id);
    } else {
      router.push(`/brand/${brand.slug}` as any);
    }
  };

  // Get gradient colors for a brand
  const getGradientColors = (brand: BrandPartnership): [string, string] => {
    if (brand.gradientColors && brand.gradientColors.length === 2) {
      return brand.gradientColors;
    }
    return DEFAULT_GRADIENTS[brand.tier] || DEFAULT_GRADIENTS.standard;
  };

  // Get display icon/logo for brand
  const getBrandIcon = (brand: BrandPartnership): string => {
    if (brand.logo) {
      return brand.logo;
    }
    return BRAND_EMOJI_FALLBACK[brand.slug] || '\uD83C\uDFE2';
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="pricetag" size={20} color={colors.lightMustard} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Brand Partnerships</Text>
              <Text style={styles.subtitle}>Exclusive deals on top brands</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.lightMustard} />
        </View>
      </View>
    );
  }

  // Empty state - hide section entirely
  if (!loading && brands.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="pricetag" size={20} color={colors.lightMustard} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Brand Partnerships</Text>
            <Text style={styles.subtitle}>Exclusive deals on top brands</Text>
          </View>
        </View>
      </View>

      {/* Brand Grid */}
      <View style={styles.grid}>
        {brands.map((brand) => (
          <Pressable
            key={brand.id}
            onPress={() => handleBrandPress(brand)}
           
            style={styles.brandCard}
          >
            <LinearGradient
              colors={getGradientColors(brand)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Exclusive Badge */}
              {brand.badges?.includes('exclusive') && (
                <View style={styles.exclusiveBadge}>
                  <Text style={styles.exclusiveBadgeText}>EXCLUSIVE</Text>
                </View>
              )}

              {/* Icon/Logo Container */}
              <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                  {brand.logo ? (
                    <CachedImage
                      source={brand.logo}
                      style={styles.brandLogo}
                      contentFit="contain"
                    />
                  ) : (
                    <Text style={styles.iconText}>{getBrandIcon(brand)}</Text>
                  )}
                </View>
              </View>

              {/* Brand Name */}
              <Text style={styles.brandName} numberOfLines={1}>
                {brand.name}
              </Text>

              {/* Deal */}
              <View style={styles.dealContainer}>
                <Text style={styles.dealText}>{brand.deal}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  headerTextContainer: {
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
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  brandCard: {
    width: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 150,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.08)',
  },
  exclusiveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exclusiveBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  iconContainer: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  iconText: {
    fontSize: 36,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  dealContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  dealText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
    textAlign: 'center',
  },
});

export default React.memo(BrandPartnerships);
