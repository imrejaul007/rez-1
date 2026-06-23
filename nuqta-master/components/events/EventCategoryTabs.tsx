/**
 * EventCategoryTabs Component
 * Horizontal scrollable category tabs for filtering events
 */

import React, { memo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

// Event categories
export const EVENT_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps-outline' as const },
  { id: 'wellness', label: 'Wellness', icon: 'leaf-outline' as const },
  { id: 'music', label: 'Music', icon: 'musical-notes-outline' as const },
  { id: 'sports', label: 'Sports', icon: 'football-outline' as const },
  { id: 'food', label: 'Food & Drink', icon: 'restaurant-outline' as const },
  { id: 'technology', label: 'Tech', icon: 'laptop-outline' as const },
  { id: 'arts', label: 'Arts', icon: 'color-palette-outline' as const },
  { id: 'fitness', label: 'Fitness', icon: 'barbell-outline' as const },
  { id: 'business', label: 'Business', icon: 'briefcase-outline' as const },
  { id: 'education', label: 'Education', icon: 'school-outline' as const },
  { id: 'entertainment', label: 'Entertainment', icon: 'film-outline' as const },
];

interface EventCategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const EventCategoryTabs: React.FC<EventCategoryTabsProps> = ({
  activeCategory,
  onCategoryChange,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to active category on mount
  useEffect(() => {
    const index = EVENT_CATEGORIES.findIndex(cat => cat.id === activeCategory);
    if (index > 0 && scrollViewRef.current) {
      const scrollPosition = Math.max(0, index * 90 - screenWidth / 2 + 45);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false });
      }, 100);
    }
  }, []);

  const handleCategoryPress = useCallback((categoryId: string) => {
    onCategoryChange(categoryId);
  }, [onCategoryChange]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {EVENT_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <Pressable
              key={category.id}
              style={[
                styles.categoryTab,
                isActive && styles.categoryTabActive,
              ]}
              onPress={() => handleCategoryPress(category.id)}
             
              accessibilityLabel={`${category.label} category`}
              accessibilityState={{ selected: isActive }}
            >
              <View
                style={[
                  styles.iconContainer,
                  isActive && styles.iconContainerActive,
                ]}
              >
                <Ionicons
                  name={category.icon}
                  size={18}
                  color={isActive ? colors.background.primary : colors.neutral[500]}
                />
              </View>
              <ThemedText
                style={[
                  styles.categoryLabel,
                  isActive && styles.categoryLabelActive,
                ]}
              >
                {category.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 70,
  },
  categoryTabActive: {
    backgroundColor: 'rgba(26, 58, 82, 0.08)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconContainerActive: {
    backgroundColor: colors.nileBlue,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral[500],
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: colors.nileBlue,
    fontWeight: '600',
  },
});

export default memo(EventCategoryTabs);
