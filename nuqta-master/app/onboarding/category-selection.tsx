import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import analyticsService from '@/services/analyticsService';
import { useRouter } from 'expo-router';
import { useBackButton } from '@/hooks/useSafeNavigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '@/hooks/useOnboarding';
import { navigationDebugger } from '@/utils/navigationDebug';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { platformAlertSimple } from '@/utils/platformAlert';

// Nuqta Design System Colors

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  isEnabled: boolean;
  color: string;
}

const categories: CategoryItem[] = [
  { id: 'fashion', name: 'Fashion', icon: 'shirt-outline', isEnabled: true, color: Colors.gold },
  { id: 'food', name: 'Food & Dining', icon: 'restaurant-outline', isEnabled: true, color: Colors.gold },
  { id: 'grocery', name: 'Grocery', icon: 'cart-outline', isEnabled: true, color: Colors.gold },
  { id: 'electronics', name: 'Electronics', icon: 'phone-portrait-outline', isEnabled: true, color: Colors.nileBlue },
  { id: 'beauty', name: 'Beauty', icon: 'sparkles-outline', isEnabled: true, color: Colors.gold },
  { id: 'medicine', name: 'Medicine', icon: 'medical-outline', isEnabled: false, color: Colors.text.tertiary },
];

function CategorySelectionScreen() {
  const router = useRouter();
  useBackButton(() => true); // Block back navigation
  const { updateUserData } = useOnboarding();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    analyticsService.track('category_selection_viewed');
  }, []);

  const handleCategorySelect = (categoryId: string, isEnabled: boolean) => {
    if (!isEnabled) return;

    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleNext = () => {
    if (selectedCategories.length === 0) {
      platformAlertSimple('Select Categories', 'Please select at least one category to personalize your experience.');
      return;
    }
    analyticsService.track('categories_selected', { count: selectedCategories.length });
    updateUserData({ selectedCategories });
    navigationDebugger.logNavigation('category-selection', 'rewards-intro', 'categories-selected');
    router.replace('/onboarding/rewards-intro');
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={[Colors.background.secondary, '#EDF2F7', Colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeCircles}>
        <View style={[styles.circle, styles.circleGreen]} />
        <View style={[styles.circle, styles.circleGold]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.glassCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            style={styles.glassShine}
          />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Find Best Deals</Text>
            <Text style={styles.subtitle}>
              Select your favorite categories{'\n'}to personalize your experience
            </Text>

            <View style={styles.underlineContainer}>
              <LinearGradient
                colors={[Colors.gold, Colors.warning]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.underline}
              />
            </View>
          </View>

          {/* Cashback Badge */}
          <View style={styles.cashbackContainer}>
            <LinearGradient
              colors={[Colors.gold, Colors.warning]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cashbackBadge}
            >
              <Text style={styles.cashbackTitle}>CASHBACK</Text>
              <Text style={styles.cashbackSubtitle}>on every purchase</Text>
            </LinearGradient>
          </View>

          {/* Categories */}
          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesTitle}>Choose Categories</Text>

            <View style={styles.categoriesList}>
              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      isSelected && styles.categoryItemSelected,
                      !category.isEnabled && styles.categoryItemDisabled,
                    ]}
                    onPress={() => handleCategorySelect(category.id, category.isEnabled)}
                    disabled={!category.isEnabled}
                   
                  >
                    <View
                      style={[
                        styles.categoryIcon,
                        isSelected && { backgroundColor: `${category.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={category.icon as any}
                        size={22}
                        color={!category.isEnabled ? colors.neutral[400] : isSelected ? category.color : Colors.text.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryName,
                        isSelected && { color: category.color },
                        !category.isEnabled && styles.categoryNameDisabled,
                      ]}
                    >
                      {category.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: category.color }]}>
                        <Ionicons name="checkmark" size={14} color={Colors.text.inverse} />
                      </View>
                    )}
                    {!category.isEnabled && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>Soon</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Next Button */}
          <Pressable
            style={styles.primaryButtonWrapper}
            onPress={handleNext}
           
          >
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 40,
  },

  // Decorative
  decorativeCircles: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  circleGreen: {
    width: 200,
    height: 200,
    top: -60,
    right: -60,
    backgroundColor: 'rgba(26, 58, 82, 0.08)',  // Nile Blue
  },
  circleGold: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -50,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
  },

  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 28,
    padding: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 15,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(30px)',
    }),
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.base,
  },
  underlineContainer: {
    alignItems: 'center',
  },
  underline: {
    width: 50,
    height: 4,
    borderRadius: 2,
  },

  // Cashback Badge
  cashbackContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  cashbackBadge: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cashbackTitle: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  cashbackSubtitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: 'rgba(11, 34, 64, 0.7)',
    marginTop: 2,
  },

  // Categories
  categoriesSection: {
    marginBottom: Spacing.xl,
  },
  categoriesTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  categoriesList: {
    gap: Spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryItemSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',  // Light Mustard
  },
  categoryItemDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.background.secondary,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  categoryName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  categoryNameDisabled: {
    color: Colors.text.tertiary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonBadge: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  comingSoonText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },

  // Primary Button
  primaryButtonWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButton: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
});

export default withErrorBoundary(CategorySelectionScreen, 'OnboardingCategorySelection');
