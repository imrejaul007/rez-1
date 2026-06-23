// @ts-nocheck
/**
 * ProductPageSkeleton Component
 * Skeleton loader that matches the ProductPage layout
 * Provides a better loading experience than a simple spinner
 */

import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import ShimmerEffect from '@/components/common/ShimmerEffect';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';

const { width: screenWidth } = Dimensions.get('window');

interface ProductPageSkeletonProps {
  showVariants?: boolean;
  showReviews?: boolean;
}

function ProductPageSkeleton({
  showVariants = true,
  showReviews = false,
}: ProductPageSkeletonProps) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <ShimmerEffect width={40} height={40} style={styles.headerButton} />
        <ShimmerEffect width={120} height={20} />
        <View style={styles.headerRight}>
          <ShimmerEffect width={40} height={40} style={styles.headerButton} />
          <ShimmerEffect width={40} height={40} style={styles.headerButton} />
          <ShimmerEffect width={40} height={40} style={styles.headerButton} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Carousel Skeleton */}
        <View style={styles.imageCarouselContainer}>
          <ShimmerEffect width={screenWidth} height={400} style={styles.imageCarousel} />

          {/* Image Pagination Dots */}
          <View style={styles.paginationContainer}>
            <ShimmerEffect width={8} height={8} style={styles.paginationDot} />
            <ShimmerEffect width={8} height={8} style={styles.paginationDot} />
            <ShimmerEffect width={8} height={8} style={styles.paginationDot} />
            <ShimmerEffect width={8} height={8} style={styles.paginationDot} />
          </View>
        </View>

        {/* Product Info Skeleton */}
        <View style={styles.infoSection}>
          <View style={styles.brandRow}>
            <ShimmerEffect width={100} height={16} />
            <ShimmerEffect width={80} height={16} />
          </View>
          <ShimmerEffect width="90%" height={24} style={styles.titleSkeleton} />
          <ShimmerEffect width="70%" height={24} style={styles.titleSkeleton} />

          <View style={styles.priceRow}>
            <ShimmerEffect width={120} height={32} />
            <ShimmerEffect width={80} height={20} style={styles.marginLeft} />
            <ShimmerEffect width={60} height={24} style={styles.marginLeft} />
          </View>

          <ShimmerEffect width={150} height={28} style={styles.stockBadge} />
        </View>

        {/* Cashback Card Skeleton */}
        <View style={styles.section}>
          <ShimmerEffect width="100%" height={100} style={styles.cardSkeleton} />
        </View>

        {/* Variant Selector Skeleton */}
        {showVariants && (
          <View style={styles.section}>
            <ShimmerEffect width={120} height={20} style={styles.sectionTitleSkeleton} />
            <View style={styles.variantOptions}>
              <ShimmerEffect width={80} height={40} style={styles.variantButton} />
              <ShimmerEffect width={80} height={40} style={styles.variantButton} />
              <ShimmerEffect width={80} height={40} style={styles.variantButton} />
              <ShimmerEffect width={80} height={40} style={styles.variantButton} />
            </View>
            <ShimmerEffect width="100%" height={48} style={styles.sizeGuideButton} />
          </View>
        )}

        {/* Frequently Bought Together Skeleton */}
        <View style={styles.section}>
          <ShimmerEffect width={200} height={20} style={styles.sectionTitleSkeleton} />
          <View style={styles.frequentlyBoughtContainer}>
            <ShimmerEffect width={100} height={100} style={styles.productImageSkeleton} />
            <ShimmerEffect width={100} height={100} style={[styles.productImageSkeleton, styles.marginLeft]} />
            <ShimmerEffect width={100} height={100} style={[styles.productImageSkeleton, styles.marginLeft]} />
          </View>
        </View>

        {/* Delivery Info Skeleton */}
        <View style={styles.section}>
          <ShimmerEffect width="100%" height={120} style={styles.cardSkeleton} />
        </View>

        {/* Tabs Skeleton */}
        <View style={styles.tabsContainer}>
          <View style={styles.tab}>
            <ShimmerEffect width={80} height={20} />
          </View>
          <View style={styles.tab}>
            <ShimmerEffect width={100} height={20} />
          </View>
        </View>

        {/* Description Section Skeleton */}
        <View style={styles.section}>
          <ShimmerEffect width={120} height={20} style={styles.sectionTitleSkeleton} />
          <ShimmerEffect width="100%" height={16} style={styles.descriptionLine} />
          <ShimmerEffect width="95%" height={16} style={styles.descriptionLine} />
          <ShimmerEffect width="90%" height={16} style={styles.descriptionLine} />
          <ShimmerEffect width="85%" height={16} style={styles.descriptionLine} />
        </View>

        {/* Specifications Skeleton */}
        <View style={styles.section}>
          <ShimmerEffect width={140} height={20} style={styles.sectionTitleSkeleton} />
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.specRow}>
              <ShimmerEffect width={100} height={16} />
              <ShimmerEffect width={120} height={16} />
            </View>
          ))}
        </View>

        {/* Return Policy Skeleton */}
        <View style={styles.section}>
          <ShimmerEffect width="100%" height={80} style={styles.cardSkeleton} />
        </View>

        {/* Seller Info Skeleton */}
        <View style={styles.section}>
          <ShimmerEffect width="100%" height={100} style={styles.cardSkeleton} />
        </View>

        {/* Related Products Skeleton */}
        <View style={styles.section}>
          <ShimmerEffect width={160} height={20} style={styles.sectionTitleSkeleton} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.relatedProductCard}>
                <ShimmerEffect width={140} height={140} style={styles.productImageSkeleton} />
                <ShimmerEffect width={120} height={16} style={styles.productNameSkeleton} />
                <ShimmerEffect width={80} height={20} style={styles.productPriceSkeleton} />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Bottom Action Bar Skeleton */}
      <View style={styles.actionBar}>
        <ShimmerEffect width={100} height={40} style={styles.quantitySkeleton} />
        <View style={styles.actionButtons}>
          <ShimmerEffect width={120} height={48} style={styles.addToCartButton} />
          <ShimmerEffect width={120} height={48} style={[styles.buyNowButton, styles.marginLeft]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.medium,
  },
  headerButton: {
    borderRadius: BorderRadius.full,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  imageCarouselContainer: {
    position: 'relative',
  },
  imageCarousel: {
    borderRadius: 0,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: Spacing.base,
    left: 0,
    right: 0,
    gap: Spacing.sm,
  },
  paginationDot: {
    borderRadius: BorderRadius.full,
  },
  infoSection: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleSkeleton: {
    marginBottom: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  stockBadge: {
    borderRadius: BorderRadius.lg,
  },
  section: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  cardSkeleton: {
    borderRadius: BorderRadius.md,
  },
  sectionTitleSkeleton: {
    marginBottom: Spacing.md,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  variantButton: {
    borderRadius: BorderRadius.md,
  },
  sizeGuideButton: {
    borderRadius: BorderRadius.md,
  },
  frequentlyBoughtContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  productImageSkeleton: {
    borderRadius: BorderRadius.md,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.medium,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  descriptionLine: {
    marginBottom: Spacing.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  relatedProductCard: {
    width: 140,
    marginRight: Spacing.md,
  },
  productNameSkeleton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  productPriceSkeleton: {
    marginTop: Spacing.xs,
  },
  bottomSpace: {
    height: 100,
  },
  actionBar: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantitySkeleton: {
    borderRadius: BorderRadius.md,
  },
  actionButtons: {
    flexDirection: 'row',
    flex: 1,
    marginLeft: Spacing.base,
  },
  addToCartButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
  },
  buyNowButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
  },
  marginLeft: {
    marginLeft: Spacing.sm,
  },
});

export default React.memo(ProductPageSkeleton);
