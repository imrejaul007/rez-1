import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { CategoryTabsProps } from '@/types/going-out.types';
import { colors } from '@/constants/theme';

function _CategoryTabsInner({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  const getIconForCategory = (categorySlug: string) => {
    const iconMap: Record<string, string> = {
      all: 'grid-outline',
      perfume: 'flower-outline',
      gold: 'diamond-outline',
      gifts: 'gift-outline',
      'fashion-beauty': 'shirt-outline',
      'fashion-&-beauty': 'shirt-outline',
      'food-dining': 'restaurant-outline',
      'food-&-dining': 'restaurant-outline',
      entertainment: 'musical-notes-outline',
      'health-wellness': 'medical-outline',
      'health-&-wellness': 'medical-outline',
      'travel-tourism': 'airplane-outline',
      'travel-&-tourism': 'airplane-outline',
      'sports-fitness': 'fitness-outline',
      'sports-&-fitness': 'fitness-outline',
      'home-garden': 'home-outline',
      'home-&-garden': 'home-outline',
      'electronics': 'phone-portrait-outline',
      'automotive': 'car-outline',
      'books-media': 'book-outline',
      'books-&-media': 'book-outline',
    };
    return iconMap[categorySlug] || 'ellipse-outline';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        decelerationRate="fast"
        snapToInterval={120}
      >
        {categories.map((category) => {
          const isActive = category.id === activeCategory;
          
          return (
            <Pressable
              key={category.id}
              style={styles.categoryTabWrapper}
              onPress={() => onCategoryChange(category.id)}
             
              accessibilityLabel={`${category.name} tab`}
              accessibilityRole="tab"
              accessibilityHint={`Double tap to view ${category.name} items`}
              accessibilityState={{ selected: isActive }}
            >
              {isActive ? (
                <LinearGradient
                  colors={[colors.brand.purpleLight, colors.brand.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.categoryTab, styles.categoryTabActive]}
                >
                  {/* Count Badge - Top Right Corner */}
                  {(category.productCount ?? 0) > 0 && (
                    <View style={styles.countBadgeActive}>
                      <ThemedText style={styles.countTextActive}>
                        {category.productCount ?? 0}
                      </ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.categoryContent}>
                    {/* Icon with gradient background */}
                    <View style={styles.iconContainerActive}>
                      <Ionicons
                        name={getIconForCategory(category.slug) as any}
                        size={23}
                        color={colors.background.primary}
                      />
                    </View>
                    
                    <ThemedText style={styles.categoryTextActive}>
                      {category.name}
                    </ThemedText>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.categoryTab}>
                  {/* Count Badge - Top Right Corner */}
                  {(category.productCount ?? 0) > 0 && (
                    <View style={styles.countBadge}>
                      <ThemedText style={styles.countText}>
                        {category.productCount ?? 0}
                      </ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.categoryContent}>
                    {/* Icon with subtle background */}
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name={getIconForCategory(category.slug) as any}
                        size={23}
                        color={colors.brand.purpleLight}
                      />
                    </View>
                    
                    <ThemedText style={styles.categoryText}>
                      {category.name}
                    </ThemedText>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.tint.coolGray,
    paddingVertical: 4,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  categoryTabWrapper: {
    marginHorizontal: 4,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    minWidth: 110,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  categoryTabActive: {
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purpleLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 8px 20px rgba(139, 92, 246, 0.3)',
      },
    }),
  },
  categoryContent: {
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral[200],
  },
  iconContainerActive: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
    textAlign: 'center',
    lineHeight: 16,
  },
  countBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.brand.purpleLight,
    minWidth: 22,
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purpleLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(139, 92, 246, 0.3)',
      },
    }),
  },
  countBadgeActive: {
    position: 'absolute',
    top: 2,
    right: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.background.primary,
    minWidth: 22,
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.background.primary,
    textAlign: 'center',
  },
  countTextActive: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brand.purpleLight,
    textAlign: 'center',
  },
});

export const CategoryTabs = React.memo(_CategoryTabsInner);
