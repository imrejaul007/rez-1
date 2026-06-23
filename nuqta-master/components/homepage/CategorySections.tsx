/**
 * CategorySections Component
 *
 * Extracted from app/(tabs)/index.tsx (lines 719-873)
 * Displays horizontal scrollable category sections (Going Out, Home Delivery)
 *
 * @component
 */

import React from 'react';
import { View, ScrollView, Pressable, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

/**
 * Category Item Interface
 */
export interface CategoryItem {
  /** Unique identifier */
  id: string;
  /** Category slug for navigation */
  slug: string;
  /** Display label */
  label: string;
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Callback when category is pressed */
  onPress: () => void;
}

/**
 * CategorySection Interface
 */
export interface CategorySection {
  /** Section title */
  title: string;
  /** Array of category items */
  categories: CategoryItem[];
  /** Callback for 'View all' button */
  onViewAll: () => void;
}

/**
 * CategorySections Props Interface
 */
export interface CategorySectionsProps {
  /** Array of category sections to display */
  sections: CategorySection[];
  /** Custom container styles */
  style?: any;
}

/**
 * CategorySections Component
 *
 * Renders category sections with:
 * - Section header with title and 'View all' button
 * - Horizontal scrollable category items
 * - Platform-specific rendering (web vs native)
 */
export const CategorySections: React.FC<CategorySectionsProps> = ({ sections, style }) => {
  return (
    <View style={style}>
      {sections.map((section, index) => (
        <View key={index} style={styles.section}>
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            <Pressable
              style={styles.viewAllButton}
              onPress={section.onViewAll}
             
              accessibilityLabel={`View all ${section.title.toLowerCase()} categories`}
              accessibilityRole="button"
              accessibilityHint={`Double tap to view all ${section.title.toLowerCase()} category options`}
            >
              <ThemedText style={styles.viewAllText}>View all</ThemedText>
            </Pressable>
          </View>

          {/* Category Items - Platform-specific rendering */}
          {Platform.OS === 'web' ? (
            // Web: Use wrapper for better layout control
            <View style={styles.webScrollContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.webScrollContent}
              >
                {section.categories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={styles.horizontalCategoryItem}
                    onPress={category.onPress}
                   
                    accessibilityLabel={`${category.label} category`}
                    accessibilityRole="button"
                    accessibilityHint={`Double tap to browse ${category.label.toLowerCase()} stores and products`}
                  >
                    <View style={styles.categoryIcon}>
                      <Ionicons name={category.icon} size={24} color={colors.lightMustard} />
                    </View>
                    <ThemedText style={styles.categoryLabel}>{category.label}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : (
            // Native: Direct ScrollView
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {section.categories.map((category) => (
                <Pressable
                  key={category.id}
                  style={styles.horizontalCategoryItem}
                  onPress={category.onPress}
                 
                  accessibilityLabel={`${category.label} category`}
                  accessibilityRole="button"
                  accessibilityHint={`Double tap to browse ${category.label.toLowerCase()} stores and products`}
                >
                  <View style={styles.categoryIcon}>
                    <Ionicons name={category.icon} size={24} color={colors.lightMustard} />
                  </View>
                  <ThemedText style={styles.categoryLabel}>{category.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    fontFamily: 'Poppins',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 58, 82, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.15)',
  },
  viewAllText: {
    fontSize: 13,
    color: colors.nileBlue,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  horizontalScrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  webScrollContainer: {
    paddingHorizontal: 4,
  },
  webScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalCategoryItem: {
    alignItems: 'center',
    minWidth: 72,
    marginRight: 14,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(255, 205, 87, 0.1)',
      },
    }),
  },
  categoryLabel: {
    fontSize: 11,
    color: colors.nileBlue,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 8,
    fontFamily: 'Inter',
  },
});

export default React.memo(CategorySections);
