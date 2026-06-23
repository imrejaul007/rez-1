import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { GoingOutProductCard } from './GoingOutProductCard';
import { CashbackHubSectionProps } from '@/types/going-out.types';
import { colors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = 160;
const CARD_SPACING = 12;

function _CashbackHubSectionInner({
  section,
  onProductPress,
  onToggleWishlist,
  onViewAll,
  wishlist = [],
}: CashbackHubSectionProps) {
  const handleViewAll = () => {
    onViewAll(section);
  };

  // Don't render section if no products
  if (!section.products || section.products.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View
        style={styles.header}
        accessibilityRole="header"
        accessibilityLabel={`${section.title}${section.subtitle ? '. ' + section.subtitle : ''}`}
      >
        <View style={styles.headerLeft}>
          <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
          {section.subtitle && (
            <ThemedText style={styles.sectionSubtitle}>{section.subtitle}</ThemedText>
          )}
        </View>

      </View>

      {/* Products Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        accessibilityRole="list"
        accessibilityLabel={`${section.title} products. Swipe to browse ${section.products.length} items`}
      >
        {section.products.map((product, index) => (
          <View
            key={product.id}
            style={[
              styles.productContainer,
              index === 0 && styles.firstProduct,
              index === section.products.length - 1 && styles.lastProduct,
            ]}
          >
            <GoingOutProductCard
              product={product}
              onPress={onProductPress}
              onToggleWishlist={onToggleWishlist}
              width={CARD_WIDTH}
              showAddToCart={true}
              isInWishlist={wishlist.includes(product.id)}
            />
          </View>
        ))}
      </ScrollView>

      {/* Section Stats */}
      <View
        style={styles.sectionStats}
        accessibilityRole="summary"
        accessibilityLabel={`Section statistics. ${section.products.length} ${section.products.length === 1 ? 'product' : 'products'}${section.products.filter(p => p.rating && p.rating.value >= 4.5).length > 0 ? `. ${section.products.filter(p => p.rating && p.rating.value >= 4.5).length} top rated` : ''}${section.products.length > 0 && Math.max(...section.products.map(p => p.cashback.percentage)) > 0 ? `. Up to ${Math.max(...section.products.map(p => p.cashback.percentage))}% cashback` : ''}`}
      >
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name="grid-outline" size={16} color={colors.brand.purpleLight} />
          </View>
          <ThemedText style={styles.statText}>
            {section.products.length} {section.products.length === 1 ? 'product' : 'products'}
          </ThemedText>
        </View>

        {section.products.filter(p => p.rating && p.rating.value >= 4.5).length > 0 && (
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.tint.greenLight }]}>
              <Ionicons name="star" size={16} color={colors.successScale[400]} />
            </View>
            <ThemedText style={styles.statText}>
              {section.products.filter(p => p.rating && p.rating.value >= 4.5).length} top rated
            </ThemedText>
          </View>
        )}

        {section.products.length > 0 && Math.max(...section.products.map(p => p.cashback.percentage)) > 0 && (
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.tint.amberLight }]}>
              <Ionicons name="wallet" size={16} color={colors.warningScale[400]} />
            </View>
            <ThemedText style={styles.statText}>
              Up to {Math.max(...section.products.map(p => p.cashback.percentage))}% cashback
            </ThemedText>
          </View>
        )}
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
    backgroundColor: colors.background.primary,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral[800],
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: colors.neutral[500],
    lineHeight: 22,
    fontWeight: '500',
  },
  scrollView: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  productContainer: {
    marginRight: CARD_SPACING,
  },
  firstProduct: {
    marginLeft: 20,
  },
  lastProduct: {
    marginRight: 20,
  },
  sectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.tint.coolGray,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slateLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
    flex: 1,
  },
});

export const CashbackHubSection = React.memo(_CashbackHubSectionInner);
