import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useBackButton } from '@/hooks/useSafeNavigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthActions } from '@/stores/selectors';
import { navigationDebugger } from '@/utils/navigationDebug';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

// ReZ Design System Colors

interface BrandItem {
  id: string;
  name: string;
  icon: string;
  originalPrice: number;
  discountedPrice: number;
  isEnabled: boolean;
  gradientColors: string[];
}

const brands: BrandItem[] = [
  {
    id: 'puma',
    name: 'Puma',
    icon: 'fitness-outline',
    originalPrice: 100,
    discountedPrice: 90,
    isEnabled: true,
    gradientColors: [Colors.gold, Colors.nileBlue]
  },
  {
    id: 'nike',
    name: 'Nike',
    icon: 'checkmark-outline',
    originalPrice: 200,
    discountedPrice: 180,
    isEnabled: true,
    gradientColors: [Colors.gold, Colors.warning]
  },
  {
    id: 'kfc',
    name: 'KFC',
    icon: 'restaurant-outline',
    originalPrice: 50,
    discountedPrice: 45,
    isEnabled: true,
    gradientColors: [Colors.gold, Colors.nileBlue]
  },
  {
    id: 'dominos',
    name: "Domino's",
    icon: 'pizza-outline',
    originalPrice: 75,
    discountedPrice: 68,
    isEnabled: true,
    gradientColors: [Colors.gold, Colors.warning]
  },
  {
    id: 'pizzahut',
    name: 'Pizza HUT',
    icon: 'fast-food-outline',
    originalPrice: 60,
    discountedPrice: 54,
    isEnabled: false,
    gradientColors: [colors.neutral[300], colors.neutral[400]]
  },
];

function TransactionsPreviewScreen() {
  const router = useRouter();
  useBackButton(() => true); // Block back navigation
  const actions = useAuthActions();

  const handleFinish = async () => {
    try {
      await actions.completeOnboarding({
        preferences: {
          notifications: {
            push: true,
            email: true,
            sms: true
          },
          theme: 'light'
        }
      });

      navigationDebugger.logNavigation('transactions-preview', '(tabs)', 'onboarding-completed');
      router.replace('/(tabs)');

    } catch (error) {
      router.replace('/(tabs)');
    }
  };

  const renderBrandItem = (brand: BrandItem, index: number) => {
    const discount = brand.originalPrice - brand.discountedPrice;
    const discountPercentage = Math.round((discount / brand.originalPrice) * 100);

    return (
      <View
        key={brand.id}
        style={[
          styles.brandItem,
          !brand.isEnabled && styles.brandItemDisabled,
        ]}
        accessible={true}
        accessibilityLabel={`${brand.name} transaction example. Original price ${brand.originalPrice} dirhams, discounted price ${brand.discountedPrice} dirhams. Save ${discount} dirhams, ${discountPercentage} percent off${!brand.isEnabled ? '. Coming soon' : ''}`}
        accessibilityRole="text"
      >
        <View style={styles.brandInfo}>
          <LinearGradient
            colors={brand.gradientColors}
            style={styles.brandIconGradient}
          >
            <Ionicons
              name={brand.icon as any}
              size={22}
              color={Colors.text.inverse}
            />
          </LinearGradient>
          <View style={styles.brandDetails}>
            <Text style={[
              styles.brandName,
              !brand.isEnabled && styles.brandNameDisabled,
            ]}>
              {brand.name}
            </Text>
            {brand.isEnabled && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save AED {discount}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.priceInfo}>
          <Text style={[
            styles.originalPrice,
            !brand.isEnabled && styles.priceDisabled,
          ]}>
            AED {brand.originalPrice}
          </Text>
          <View style={styles.arrowContainer}>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={brand.isEnabled ? Colors.gold : colors.neutral[400]}
            />
          </View>
          <Text style={[
            styles.discountedPrice,
            !brand.isEnabled && styles.priceDisabled,
          ]}>
            AED {brand.discountedPrice}
          </Text>
        </View>

        {!brand.isEnabled && (
          <View style={styles.comingSoonOverlay}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        )}
      </View>
    );
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
            <Text style={styles.title}>Seamless Transactions{'\n'}& Rewards!</Text>

            <View style={styles.underlineContainer}>
              <LinearGradient
                colors={[Colors.gold, Colors.warning]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.underline}
              />
            </View>

            <Text style={styles.subtitle}>
              Shop your favorite brands and get{'\n'}
              up to 10% discount. Earn ${BRAND.COIN_NAME}!
            </Text>

            {/* Floating Coins */}
            <View style={styles.coinsContainer}>
              <View style={[styles.coin, styles.coin1]}>
                <LinearGradient
                  colors={[Colors.gold, Colors.warning]}
                  style={styles.coinGradient}
                >
                  <Text style={styles.coinText}>N</Text>
                </LinearGradient>
              </View>
              <View style={[styles.coin, styles.coin2]}>
                <LinearGradient
                  colors={[Colors.gold, Colors.warning]}
                  style={styles.coinGradient}
                >
                  <Text style={styles.coinText}>N</Text>
                </LinearGradient>
              </View>
              <View style={[styles.coin, styles.coin3]}>
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  style={styles.coinGradient}
                >
                  <Ionicons name="gift" size={12} color={Colors.text.inverse} />
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Transactions Section */}
          <View style={styles.transactionsSection}>
            <View style={styles.transactionsTitleRow}>
              <Text style={styles.transactionsTitle}>Sample Transactions</Text>
              <View style={styles.discountBadge}>
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  style={styles.discountBadgeGradient}
                >
                  <Text style={styles.discountBadgeText}>10% OFF</Text>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.brandsList}>
              {brands.map(renderBrandItem)}
            </View>
          </View>

          {/* Finish Button */}
          <Pressable
            style={styles.primaryButtonWrapper}
            onPress={handleFinish}
           
            accessibilityLabel="Complete onboarding and start shopping"
            accessibilityRole="button"
            accessibilityHint="Double tap to finish setup and explore the app"
          >
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Start Shopping</Text>
              <Ionicons name="rocket" size={20} color={Colors.text.inverse} />
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
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
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
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  title: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  underlineContainer: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  underline: {
    width: 50,
    height: 4,
    borderRadius: 2,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Floating Coins
  coinsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  coin: {
    position: 'absolute',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  coinGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  coinText: {
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  coin1: {
    top: 0,
    left: 10,
  },
  coin2: {
    top: 30,
    right: 5,
  },
  coin3: {
    top: 70,
    left: 30,
  },

  // Transactions Section
  transactionsSection: {
    marginBottom: Spacing.xl,
  },
  transactionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  transactionsTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  discountBadge: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  discountBadgeGradient: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
  },
  discountBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  brandsList: {
    gap: Spacing.md,
  },
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  brandItemDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.background.secondary,
  },
  brandInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandIconGradient: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  brandDetails: {
    flex: 1,
  },
  brandName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  brandNameDisabled: {
    color: Colors.text.tertiary,
  },
  savingsBadge: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  savingsText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.gold,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  arrowContainer: {
    marginHorizontal: 6,
  },
  discountedPrice: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.gold,
  },
  priceDisabled: {
    color: Colors.text.tertiary,
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
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

export default withErrorBoundary(TransactionsPreviewScreen, 'OnboardingTransactionsPreview');
