import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useBackButton } from '@/hooks/useSafeNavigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { navigationDebugger } from '@/utils/navigationDebug';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

// Nuqta Design System Colors

function RewardsIntroScreen() {
  const router = useRouter();
  useBackButton(() => true); // Block back navigation

  const handleNext = () => {
    navigationDebugger.logNavigation('rewards-intro', 'transactions-preview', 'rewards-understood');
    router.replace('/onboarding/transactions-preview');
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
            <Text style={styles.title}>Shop, Share & Earn!</Text>
            <Text style={styles.subtitle}>
              Share your purchases and earn{'\n'}${BRAND.COIN_NAME} as rewards
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

          {/* Social Media Mockup */}
          <View style={styles.illustrationContainer}>
            <View style={styles.socialMediaContainer}>
              {/* Main Post Card */}
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  <LinearGradient
                    colors={[Colors.gold, Colors.nileBlue]}
                    style={styles.profilePic}
                  >
                    <Text style={styles.profileInitial}>S</Text>
                  </LinearGradient>
                  <View style={styles.postInfo}>
                    <Text style={styles.username}>Sarah M.</Text>
                    <Text style={styles.timestamp}>Just now • Public</Text>
                  </View>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                  </View>
                </View>

                <View style={styles.postContent}>
                  <View style={styles.foodImage}>
                    <View style={[styles.foodItem, styles.foodItem1]}>
                      <Ionicons name="pizza" size={20} color={Colors.gold} />
                    </View>
                    <View style={[styles.foodItem, styles.foodItem2]}>
                      <Ionicons name="cafe" size={18} color={Colors.gold} />
                    </View>
                    <View style={[styles.foodItem, styles.foodItem3]}>
                      <Ionicons name="ice-cream" size={16} color={colors.brand.pink} />
                    </View>
                  </View>

                  <View style={styles.postActions}>
                    <Pressable style={styles.actionButton}>
                      <Ionicons name="heart" size={18} color={colors.brand.pink} />
                      <Text style={styles.actionCount}>24</Text>
                    </Pressable>
                    <Pressable style={styles.actionButton}>
                      <Ionicons name="chatbubble-outline" size={18} color={Colors.text.tertiary} />
                      <Text style={styles.actionCount}>5</Text>
                    </Pressable>
                    <Pressable style={styles.actionButton}>
                      <Ionicons name="share-social-outline" size={18} color={Colors.text.tertiary} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Floating Coins */}
              <View style={[styles.coin, styles.coin1]}>
                <LinearGradient
                  colors={[Colors.gold, Colors.warning]}
                  style={styles.coinInner}
                >
                  <Text style={styles.coinText}>R</Text>
                </LinearGradient>
              </View>
              <View style={[styles.coin, styles.coin2]}>
                <LinearGradient
                  colors={[Colors.gold, Colors.warning]}
                  style={styles.coinInner}
                >
                  <Text style={styles.coinText}>R</Text>
                </LinearGradient>
              </View>
              <View style={[styles.coin, styles.coin3]}>
                <LinearGradient
                  colors={[Colors.gold, Colors.warning]}
                  style={styles.coinInner}
                >
                  <Text style={styles.coinText}>R</Text>
                </LinearGradient>
              </View>

              {/* Reward Badge */}
              <View style={styles.rewardBadge}>
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  style={styles.rewardBadgeInner}
                >
                  <Text style={styles.rewardText}>+50</Text>
                  <Text style={styles.rewardLabel}>coins</Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* How it Works */}
          <View style={styles.howItWorks}>
            <Text style={styles.howItWorksTitle}>How it works</Text>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Shop anywhere</Text>
                <Text style={styles.stepDesc}>Make purchases at partner stores</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: Colors.gold }]}>
                <Text style={[styles.stepNumberText, { color: Colors.text.primary }]}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share on social</Text>
                <Text style={styles.stepDesc}>Post about your experience</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{`Earn ${BRAND.COIN_NAME}`}</Text>
                <Text style={styles.stepDesc}>Get coins for every share</Text>
              </View>
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
              <Text style={styles.primaryButtonText}>Get Started</Text>
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

  // Illustration
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  socialMediaContainer: {
    position: 'relative',
    width: 240,
    height: 220,
  },
  postCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    width: 200,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  profilePic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileInitial: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  postInfo: {
    flex: 1,
  },
  username: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timestamp: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  verifiedBadge: {
    marginLeft: Spacing.xs,
  },
  postContent: {
    flex: 1,
  },
  foodImage: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 14,
    padding: Spacing.lg,
    position: 'relative',
    marginBottom: Spacing.md,
    height: 80,
  },
  foodItem: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  foodItem1: {
    top: 10,
    left: 20,
  },
  foodItem2: {
    top: 25,
    right: 30,
  },
  foodItem3: {
    bottom: 10,
    left: 50,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: Spacing.base,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },

  // Floating Coins
  coin: {
    position: 'absolute',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  coinInner: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  coinText: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  coin1: {
    top: 20,
    right: 10,
  },
  coin2: {
    bottom: 60,
    left: 5,
  },
  coin3: {
    bottom: 20,
    right: 40,
  },

  // Reward Badge
  rewardBadge: {
    position: 'absolute',
    top: 60,
    right: 0,
  },
  rewardBadgeInner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  rewardText: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  rewardLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // How it Works
  howItWorks: {
    marginBottom: Spacing.xl,
  },
  howItWorksTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepNumberText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  stepDesc: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
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

export default withErrorBoundary(RewardsIntroScreen, 'OnboardingRewardsIntro');
