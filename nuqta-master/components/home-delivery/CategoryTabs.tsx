import React from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { CategoryTabsProps } from '@/types/home-delivery.types';
import { colors } from '@/constants/theme';

// Nuqta Design System Colors
const COLORS = {
  primary: colors.nileBlue,
  primaryDark: colors.nileBlue,
  gold: colors.lightMustard,
  navy: colors.brand.navyDark,
  slate: '#1F2D3D',
  muted: colors.gray[400],
  surface: '#F7FAFC',
  glassWhite: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.4)',
};

function _CategoryTabsInner({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <View style={styles.container}>
      {/* Glassmorphism background */}
      <View style={styles.glassBackground} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        decelerationRate="fast"
        snapToInterval={100}
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
              accessibilityHint={`Double tap to view ${category.name} products`}
              accessibilityState={{ selected: isActive }}
            >
              {isActive ? (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.categoryTab, styles.categoryTabActive]}
                >
                  {/* Count Badge - Top Right Corner */}
                  {category.productCount > 0 && (
                    <View style={styles.countBadgeActive}>
                      <ThemedText style={styles.countTextActive}>
                        {category.productCount}
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.categoryContent}>
                    {/* Icon with glass background */}
                    <View style={styles.iconContainerActive}>
                      <Ionicons
                        name={category.icon as any || 'cube-outline'}
                        size={22}
                        color={colors.background.primary}
                      />
                    </View>

                    <ThemedText style={styles.categoryTextActive}>
                      {category.name}
                    </ThemedText>
                  </View>

                  {/* Gold accent line */}
                  <View style={styles.activeAccent} />
                </LinearGradient>
              ) : (
                <View style={styles.categoryTab}>
                  {/* Count Badge - Top Right Corner */}
                  {category.productCount > 0 && (
                    <View style={styles.countBadge}>
                      <ThemedText style={styles.countText}>
                        {category.productCount}
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.categoryContent}>
                    {/* Icon with subtle background */}
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name={category.icon as any || 'cube-outline'}
                        size={22}
                        color={COLORS.primary}
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
    backgroundColor: COLORS.surface,
    paddingVertical: 4,
    position: 'relative',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.glassWhite,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      },
    }),
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  categoryTabWrapper: {
    marginHorizontal: 4,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: COLORS.glassWhite,
    minWidth: 100,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
    }),
  },
  categoryTabActive: {
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0px 6px 24px rgba(26, 58, 82, 0.35)',
      },
    }),
  },
  categoryContent: {
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 58, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(26, 58, 82, 0.2)',
  },
  iconContainerActive: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate,
    textAlign: 'center',
    lineHeight: 15,
  },
  categoryTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
    textAlign: 'center',
    lineHeight: 15,
  },
  activeAccent: {
    position: 'absolute',
    bottom: 6,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    minWidth: 22,
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(26, 58, 82, 0.3)',
      },
    }),
  },
  countBadgeActive: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    minWidth: 22,
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(255, 200, 87, 0.35)',
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
    color: COLORS.navy,
    textAlign: 'center',
  },
});

export const CategoryTabs = React.memo(_CategoryTabsInner);
