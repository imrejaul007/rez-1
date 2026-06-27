import React from 'react';
import { View, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { CategoryHeaderProps, CategoryTab, PLAY_PAGE_COLORS, CATEGORY_TYPES } from '@/types/playPage.types';
import { colors } from '@/constants/theme';

// Default labels per category type — used as a final fallback so the UI
// always renders a friendly name even when a category object only supplies
// `type` (e.g. test mocks, partial server responses).
const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  trending_me: 'For Me',
  trending_her: 'For Her',
  waist: 'Waist pe',
  article: 'Article',
  featured: 'Featured',
  all: 'All',
};

const getCategoryDisplay = (category: CategoryTab) => {
  // Prefer a canonical, type-driven label (e.g. "For Me" for `trending_me`)
  // so every Play tab surfaces consistent, recognisable category names.
  if (category.type && DEFAULT_CATEGORY_LABELS[category.type]) {
    return DEFAULT_CATEGORY_LABELS[category.type];
  }
  if (category.type && CATEGORY_TYPES[category.type]) {
    return CATEGORY_TYPES[category.type];
  }
  // Fall back to the explicit title/label on the category object when the
  // type is unknown or unmapped.
  const title = (category as any).title || (category as any).label;
  if (title) return title;
  return '';
};

const getCategoryEmoji = (category: CategoryTab) => {
  return (category as any).emoji || '';
};

// ReZ Design System Colors
const COLORS = {
  primary: colors.brand.green,
  primaryDark: colors.brand.teal,
  gold: colors.brand.goldWarm,
  navy: colors.brand.navyDark,
};

function CategoryHeader({
  categories,
  onCategoryPress
}: CategoryHeaderProps) {

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Glass overlay */}
      <View style={styles.glassOverlay} />

      {/* Decorative elements */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      {/* Header Title */}
      <View style={styles.headerTop}>
        <ThemedText style={styles.headerTitle}>
          Watch & Shop Your Favorites
        </ThemedText>
        <View style={styles.titleUnderline} />
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((category) => {
          const isActive = category.isActive;
          const displayLabel = getCategoryDisplay(category);
          const displayEmoji = getCategoryEmoji(category);
          return (
            <Pressable
              key={category.id}
              style={[
                styles.tabButton,
                isActive && styles.activeTabButton
              ]}
              onPress={() => onCategoryPress(category)}

            >
              <LinearGradient
                colors={
                  isActive
                    ? [colors.background.primary, 'rgba(255,255,255,0.9)']
                    : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']
                }
                style={styles.tabContent}
              >
                {displayEmoji ? (
                  <ThemedText style={styles.tabEmoji}>
                    {displayEmoji}
                  </ThemedText>
                ) : null}
                <ThemedText
                  style={[
                    styles.tabText,
                    isActive && styles.activeTabText
                  ]}
                >
                  {displayLabel}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 38,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0px 8px 32px rgba(0, 192, 106, 0.35)',
      },
    }),
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    top: 60,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 200, 87, 0.15)',
  },
  decorCircle3: {
    position: 'absolute',
    bottom: 20,
    right: 60,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTop: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  headerTitle: {
    color: colors.background.primary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 28,
    ...Platform.select({
      web: {
        textShadow: '0 1px 2px rgba(0,0,0,0.15)',
      },
      default: {
        textShadowColor: 'rgba(0,0,0,0.15)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
    }),
  },
  titleUnderline: {
    width: 50,
    height: 4,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
    marginTop: 8,
    opacity: 0.9,
  },
  tabsContainer: {
    paddingLeft: 20,
    zIndex: 2,
  },
  tabsContent: {
    paddingRight: 20,
    alignItems: 'center',
  },
  tabButton: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    minWidth: 130,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      },
    }),
  },
  activeTabButton: {
    transform: [{ scale: 1.02 }],
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(255, 200, 87, 0.5)',
      },
      ios: {
        shadowColor: COLORS.gold,
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 87, 0.4)',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  tabEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  tabText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: COLORS.navy,
    fontWeight: '700',
  },
});

export default React.memo(CategoryHeader);
