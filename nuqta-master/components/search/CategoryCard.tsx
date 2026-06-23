import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CategoryCardProps } from '@/types/search.types';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

function CategoryCard({
  category,
  onPress,
  size = 'medium',
  showCashback = true,
}: CategoryCardProps) {
  const cardSize = getCardSize(size);

  const handlePress = () => {
    onPress(category);
  };

  const [imageError, setImageError] = React.useState(false);

  const renderImage = () => {
    if (category.image && !imageError) {
      return (
        <CachedImage
          source={category.image || 'https://via.placeholder.com/200x200?text=No+Image'}
          style={[styles.categoryImage, { height: cardSize.imageHeight }]}
          contentFit="cover"
          onError={() => setImageError(true)}
        />
      );
    }

    // Fallback with gradient and icon/text (when no image or image fails to load)
    return (
      <LinearGradient
        colors={getCategoryGradient(category.name) as [string, string, ...string[]]}
        style={[styles.categoryImagePlaceholder, { height: cardSize.imageHeight }]}
      >
        <View style={styles.placeholderContent}>
          {category.icon ? (
            <Ionicons name={category.icon as any} size={cardSize.iconSize} color="white" />
          ) : (
            <Text style={[styles.placeholderText, { fontSize: cardSize.textSize }]}>
              {category.name.charAt(0)}
            </Text>
          )}
        </View>
      </LinearGradient>
    );
  };

  return (
    <Pressable
      style={[styles.categoryCard, cardSize.container]}
      onPress={handlePress}
     
    >
      {/* Category Image */}
      <View style={styles.imageContainer}>
        {renderImage()}
        
        {/* Popular Badge */}
        {category.isPopular && (
          <View style={styles.popularBadge}>
            <Ionicons name="trending-up" size={10} color="white" />
            <Text style={styles.popularBadgeText}>Popular</Text>
          </View>
        )}

        {/* Cashback Badge */}
        {showCashback && (
          <View style={styles.cashbackBadge}>
            <Text style={styles.cashbackText}>
              {category.cashbackPercentage || 0}%
            </Text>
          </View>
        )}
      </View>

      {/* Category Info */}
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, { fontSize: cardSize.nameSize }]} numberOfLines={2}>
          {category.name || 'Category'}
        </Text>
        {showCashback && (
          <Text style={[styles.categoryCashback, { fontSize: cardSize.cashbackSize }]}>
            Upto {category.cashbackPercentage || 0}% cash back
          </Text>
        )}
        {category.description && size !== 'small' && (
          <Text style={[styles.categoryDescription, { fontSize: cardSize.descriptionSize }]} numberOfLines={2}>
            {category.description || 'No description available'}
          </Text>
        )}
      </View>

      {/* Arrow Icon */}
      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
      </View>
    </Pressable>
);
}

const getCardSize = (size: 'small' | 'medium' | 'large') => {
  const cardWidth = (width - 56) / 2; // Account for padding and gap
  
  switch (size) {
    case 'small':
      return {
        container: { 
          width: cardWidth, 
          height: 200, // Fixed height for consistency
          minHeight: 200,
          maxHeight: 200,
        },
        imageHeight: 100,
        iconSize: 20,
        textSize: 18,
        nameSize: 14,
        cashbackSize: 10,
        descriptionSize: 11,
      };
    case 'large':
      return {
        container: { 
          width: cardWidth, 
          height: 140, // Fixed height for consistency
          minHeight: 140,
          maxHeight: 140,
        },
        imageHeight: 80,
        iconSize: 28,
        textSize: 24,
        nameSize: 18,
        cashbackSize: 14,
        descriptionSize: 13,
      };
    default: // medium
      return {
        container: { 
          width: cardWidth, 
          height: 220, // Fixed height for consistency
          minHeight: 220,
          maxHeight: 220,
        },
        imageHeight: 120,
        iconSize: 24,
        textSize: 20,
        nameSize: 16,
        cashbackSize: 12,
        descriptionSize: 12,
      };
  }
};

const getCategoryGradient = (categoryName: string): string[] => {
  const gradients: Record<string, string[]> = {
    'Perfume': ['#FF6B9D', '#C44569'],
    'Gold': [colors.brand.goldBright, '#FFA500'],
    'Fashion': [colors.nileBlue, '#243f55'],
    'Gifts': [colors.successScale[400], colors.successScale[700]],
    'Electronic': [colors.infoScale[400], '#1E40AF'],
    'Restaurant': [colors.error, colors.error],
    'Groceries': [colors.success, colors.brand.greenDark],
    'Fruits': [colors.warningScale[400], colors.warningScale[700]],
    'Meat & Seafood': [colors.error, colors.errorScale[700]],
    'Pet Care': [colors.nileBlue, '#0f2637'],
  };

  return gradients[categoryName] || [colors.neutral[500], colors.neutral[600]];
};

const styles = StyleSheet.create({
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(139, 92, 246, 0.12)',
      },
    }),
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    backgroundColor: colors.tint.coolGray,
  },
  categoryImagePlaceholder: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontWeight: '800',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.successScale[400],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.successScale[400],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  popularBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cashbackText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  categoryInfo: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  categoryName: {
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 6,
    lineHeight: 20,
  },
  categoryCashback: {
    color: colors.successScale[400],
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  categoryDescription: {
    color: colors.neutral[500],
    lineHeight: 18,
    fontWeight: '500',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.tint.coolGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slateLight,
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
});

export default React.memo(CategoryCard);
