import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  image?: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  staff?: {
    id: string;
    name: string;
    image?: string;
  };
  availability?: 'available' | 'limited' | 'unavailable';
}

interface ServiceCardProps {
  service: ServiceItem;
  onBookPress: (service: ServiceItem) => void;
  onPress?: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onBookPress,
  onPress,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} mins`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const getAvailabilityColor = () => {
    switch (service.availability) {
      case 'available':
        return colors.lightMustard;
      case 'limited':
        return colors.warningScale[400];
      case 'unavailable':
        return colors.error;
      default:
        return colors.lightMustard;
    }
  };

  const getAvailabilityText = () => {
    switch (service.availability) {
      case 'available':
        return 'Available';
      case 'limited':
        return 'Limited slots';
      case 'unavailable':
        return 'Fully booked';
      default:
        return 'Available';
    }
  };

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
     
    >
      {/* Service Image */}
      <View style={styles.imageContainer}>
        {service.image ? (
          <CachedImage source={service.image} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="cut-outline" size={32} color={colors.brand.purple} />
          </View>
        )}

        {/* Availability Badge */}
        {service.availability && (
          <View
            style={[
              styles.availabilityBadge,
              { backgroundColor: getAvailabilityColor() },
            ]}
          >
            <Text style={styles.availabilityText}>
              {getAvailabilityText()}
            </Text>
          </View>
        )}

        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{service.category}</Text>
        </View>
      </View>

      {/* Service Info */}
      <View style={styles.infoContainer}>
        {/* Service Name */}
        <Text style={styles.serviceName} numberOfLines={1}>
          {service.name}
        </Text>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {service.description}
        </Text>

        {/* Rating & Duration */}
        <View style={styles.metaRow}>
          {service.rating !== undefined && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={colors.warningScale[400]} />
              <Text style={styles.rating}>{service.rating.toFixed(1)}</Text>
              {service.reviewCount !== undefined && (
                <Text style={styles.reviewCount}>({service.reviewCount})</Text>
              )}
            </View>
          )}

          <View style={styles.durationContainer}>
            <Ionicons name="time-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.duration}>
              {formatDuration(service.duration)}
            </Text>
          </View>
        </View>

        {/* Staff Info (if available) */}
        {service.staff && (
          <View style={styles.staffContainer}>
            {service.staff.image ? (
              <CachedImage
                source={service.staff.image}
                style={styles.staffImage}
              />
            ) : (
              <View style={[styles.staffImage, styles.staffImagePlaceholder]}>
                <Ionicons name="person" size={12} color={colors.brand.purple} />
              </View>
            )}
            <Text style={styles.staffName} numberOfLines={1}>
              {service.staff.name}
            </Text>
          </View>
        )}

        {/* Price & Book Button */}
        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.price}>{currencySymbol}{service.price.toLocaleString()}</Text>
          </View>

          <Pressable
            style={[
              styles.bookButton,
              service.availability === 'unavailable' && styles.bookButtonDisabled,
            ]}
            onPress={() => onBookPress(service)}
            disabled={service.availability === 'unavailable'}
           
          >
            <Text style={styles.bookButtonText}>
              {service.availability === 'unavailable' ? 'Unavailable' : 'Book'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginBottom: 16,
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
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  availabilityText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  reviewCount: {
    fontSize: 11,
    color: colors.neutral[400],
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duration: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  staffContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  staffImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  staffImagePlaceholder: {
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffName: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '500',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 9,
    color: colors.neutral[400],
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand.purple,
  },
  bookButton: {
    backgroundColor: colors.brand.purple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  bookButtonText: {
    color: colors.background.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default React.memo(ServiceCard);
