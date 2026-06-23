import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import servicesService from '@/services/servicesApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const PARENT_PADDING = 16;

// Nuqta minimal colors
const COLORS = {
  primary: colors.lightMustard,
  navy: colors.nileBlue,
  textPrimary: colors.nileBlue,
  textSecondary: colors.midGray,
  white: colors.background.primary,
  cardBg: colors.background.primary,
  border: '#F0F0F0',
};

interface PopularService {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  images?: string[];
  price?: number;
  pricing?: {
    original: number;
    selling: number;
    discount?: number;
    currency?: string;
  };
  rating?: number;
  ratings?: {
    average: number;
    count: number;
  };
  store?: {
    _id: string;
    name: string;
    logo?: string;
  };
  serviceCategory?: string | {
    _id: string;
    name: string;
    icon: string;
    slug?: string;
    cashbackPercentage?: number;
  };
  serviceDetails?: {
    duration: number;
    serviceType: 'home' | 'store' | 'online';
  };
  cashback?: {
    percentage: number;
    maxAmount?: number;
    isActive?: boolean;
  };
}

interface PopularServicesSectionProps {
  title?: string;
  limit?: number;
}

// Simple Clean Service Card - matches screenshot style
const PopularServiceCard = memo(({
  service,
  onPress,
}: {
  service: PopularService;
  onPress: () => void;
}) => {
  const imageUrl = service.image || service.images?.[0] || 'https://via.placeholder.com/300x200';
  const description = service.shortDescription || service.description || 'Professional service';

  // Safely get category name
  let categoryName = 'Service';
  if (service.serviceCategory) {
    if (typeof service.serviceCategory === 'string') {
      categoryName = service.serviceCategory;
    } else if (typeof service.serviceCategory === 'object' && service.serviceCategory.name) {
      categoryName = typeof service.serviceCategory.name === 'string'
        ? service.serviceCategory.name
        : 'Service';
    }
  }

  return (
    <Pressable
      style={styles.serviceCard}
      onPress={onPress}
     
    >
      {/* Left side - Text content */}
      <View style={styles.textContent}>
        {/* Category name */}
        <ThemedText style={styles.categoryLabel}>
          {categoryName}
        </ThemedText>

        {/* Description */}
        <ThemedText style={styles.serviceDescription} numberOfLines={2}>
          {description}
        </ThemedText>

        {/* Book Button */}
        <Pressable
          style={styles.bookButton}
          onPress={onPress}
         
        >
          <ThemedText style={styles.bookButtonText}>
            Book now
          </ThemedText>
        </Pressable>
      </View>

      {/* Right side - Image */}
      <View style={styles.imageContainer}>
        <CachedImage
          source={imageUrl}
          style={styles.serviceImage}
          contentFit="cover"
        />
      </View>
    </Pressable>
  );
});

function PopularServicesSection({
  title = 'Popular Services',
  limit = 6,
}: PopularServicesSectionProps) {
  const router = useRouter();
  const [services, setServices] = useState<PopularService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const fetchPopularServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await servicesService.getPopularServices(limit);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setServices(response.data as PopularService[]);
      } else {
        setError('Failed to load popular services');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load popular services');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPopularServices();
  }, [fetchPopularServices]);

  const handleServicePress = (service: PopularService) => {
    const serviceId = service._id || service.id;
    router.push(`/product-page?cardId=${serviceId}&cardType=product`);
  };

  // Don't render if no services and not loading
  if (!loading && services.length === 0 && !error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={fetchPopularServices}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {services.map((service, index) => (
            <PopularServiceCard
              key={service._id || service.id || `popular-svc-${index}`}
              service={service}
              onPress={() => handleServicePress(service)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: PARENT_PADDING,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.navy,
  },
  listContainer: {
    gap: 12,
  },
  // Clean minimal card
  serviceCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  textContent: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bookButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default memo(PopularServicesSection);
