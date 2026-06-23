// @ts-nocheck
/**
 * MallCollections Component
 *
 * Horizontal scrolling section for curated collections
 * Upgraded with gradient container, premium header, and decorative elements
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallCollection } from '../../types/mall.types';
import MallCollectionCard from './cards/MallCollectionCard';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

interface MallCollectionsProps {
  collections: MallCollection[];
  isLoading?: boolean;
  onCollectionPress: (collection: MallCollection) => void;
  onViewAllPress?: () => void;
}

const MallCollections: React.FC<MallCollectionsProps> = ({
  collections,
  isLoading = false,
  onCollectionPress,
  onViewAllPress,
}) => {
  const renderCollection = useCallback(
    ({ item }: { item: MallCollection }) => (
      <MallCollectionCard collection={item} onPress={onCollectionPress} />
    ),
    [onCollectionPress]
  );

  const keyExtractor = useCallback((item: MallCollection) => item.id || item._id, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.tint.blue, '#E0F2FE', colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.brand.sky, colors.brand.skyDark]}
              style={styles.iconWrapper}
            >
              <Ionicons name="grid" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Curated Collections</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.brand.sky} />
            <Text style={styles.loadingText}>Loading collections...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Empty state
  if (!collections || collections.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.tint.blue, '#E0F2FE', colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Section Header */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[colors.brand.sky, colors.brand.skyDark]}
              style={styles.iconWrapper}
            >
              <Ionicons name="grid" size={18} color={colors.background.primary} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Curated Collections</Text>
              <Text style={styles.subtitle}>
                Handpicked selections for every occasion
              </Text>
            </View>
          </View>

          {/* Empty State Placeholder */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="albums-outline" size={24} color={colors.neutral[400]} />
            <Text style={styles.emptyStateText}>Curated collections coming soon</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.tint.blue, '#E0F2FE', colors.background.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Decorative Elements */}
        <View style={styles.decorativeElements}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </View>

        {/* Section Header */}
        <View style={styles.headerRow}>
          <LinearGradient
            colors={[colors.brand.sky, colors.brand.skyDark]}
            style={styles.iconWrapper}
          >
            <Ionicons name="grid" size={18} color={colors.background.primary} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Curated Collections</Text>
            <Text style={styles.subtitle}>
              Handpicked selections for every occasion
            </Text>
          </View>
          {onViewAllPress && (
            <Pressable
              style={styles.viewAllButton}
              onPress={onViewAllPress}
             
            >
              <LinearGradient
                colors={[colors.brand.sky, colors.brand.skyDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.viewAllGradient}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <View style={styles.viewAllArrow}>
                  <Ionicons name="arrow-forward" size={14} color={colors.background.primary} />
                </View>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Collections List */}
        <FlashList
          data={collections}
          renderItem={renderCollection}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={4}
          windowSize={4}
          initialNumToRender={2}
          estimatedItemSize={150}
        />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  gradientBackground: {
    paddingVertical: 20,
    borderRadius: 24,
    marginHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeElements: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
  },
  decorCircle1: {
    width: 140,
    height: 140,
    top: -40,
    right: -20,
  },
  decorCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.sky,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.brand.skyDark,
    marginTop: 2,
  },
  viewAllButton: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.sky,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    gap: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
  },
  viewAllArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 28,
    paddingBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: colors.brand.skyDark,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: colors.neutral[400],
    fontWeight: '500',
  },
});

export default memo(MallCollections);
