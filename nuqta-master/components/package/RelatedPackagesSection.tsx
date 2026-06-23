/**
 * Related Packages Section - Displays similar packages
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import travelApi from '@/services/travelApi';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface RelatedPackagesSectionProps {
  currentPackageId: string;
}

const RelatedPackagesSection: React.FC<RelatedPackagesSectionProps> = ({ currentPackageId }) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();
  const [relatedPackages, setRelatedPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadRelatedPackages();
  }, [currentPackageId]);

  const loadRelatedPackages = async () => {
    try {
      setIsLoading(true);
      const response = await travelApi.getByCategory('packages', {
        page: 1,
        limit: 10,
        sortBy: 'rating',
      });

      if (response.success && response.data?.services) {
        const filtered = response.data.services
          .filter((pkg: any) => (pkg._id || pkg.id) !== currentPackageId)
          .slice(0, 5);
        if (!isMounted()) return;
        setRelatedPackages(filtered);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handlePackagePress = (packageId: string) => {
    router.push(`/package/${packageId}` as any);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Related Packages</Text>
        <ActivityIndicator size="small" color={colors.brand.purpleLight} style={styles.loader} />
      </View>
    );
  }

  if (relatedPackages.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bag" size={24} color={colors.brand.purpleLight} />
        <Text style={styles.title}>Related Packages</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {relatedPackages.map((pkg) => {
          const packageId = pkg._id || pkg.id;
          const imageUrl = pkg.images?.[0] || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400';
          const price = pkg.pricing?.selling || 0;
          const rating = pkg.ratings?.average || 0;
          const cashback = pkg.cashback?.percentage || pkg.serviceCategory?.cashbackPercentage || 0;

          return (
            <Pressable
              key={packageId}
              style={styles.packageCard}
              onPress={() => handlePackagePress(packageId)}
             
            >
              <CachedImage source={{ uri: imageUrl }} style={styles.packageImage} contentFit="cover" cachePolicy="memory-disk" />
              {cashback > 0 && (
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{cashback}%</Text>
                </View>
              )}
              <View style={styles.packageInfo}>
                <Text style={styles.packageName} numberOfLines={1}>{pkg.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.priceText}>From {currencySymbol}{price.toLocaleString(locale)}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.3,
  },
  loader: {
    marginTop: 20,
  },
  scrollContent: {
    gap: 16,
  },
  packageCard: {
    width: 280,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginRight: 16,
  },
  packageImage: {
    width: '100%',
    height: 180,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },
  packageInfo: {
    padding: 16,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.purpleLight,
  },
});

export default React.memo(RelatedPackagesSection);
