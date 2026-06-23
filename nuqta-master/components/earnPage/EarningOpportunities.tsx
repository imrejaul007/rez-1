// Earning Opportunities Section Component
// Displays various ways to earn rewards (bill upload, referrals, challenges, etc.)

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate, useAnimatedScrollHandler } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface EarningOpportunity {
  id: string;
  title: string;
  description: string;
  icon: string;
  coins: string;
  gradient: string[];
  route: string;
  highlight?: boolean;
  badge?: string;
}

const opportunities: EarningOpportunity[] = [
  {
    id: 'bill-upload',
    title: 'Upload Bills',
    description: 'Earn 5% cashback on offline purchases',
    icon: 'document-text',
    coins: '100+',
    gradient: [colors.successScale[400], colors.successScale[700], '#047857'], // Enhanced green gradient
    route: '/bill-upload',
    highlight: true,
    badge: 'HOT',
  },
  {
    id: 'share-earn',
    title: 'Share & Earn',
    description: 'Share products, earn per click',
    icon: 'share-social',
    coins: '50+',
    gradient: [colors.brand.purpleLight, colors.brand.purple, colors.brand.purpleDeep], // Purple gradient
    route: '/earn/share',
    badge: 'NEW',
  },
  {
    id: 'review-earn',
    title: 'Review & Earn',
    description: 'Write reviews, get rewarded',
    icon: 'star',
    coins: '25-100',
    gradient: [colors.brand.pink, colors.deepPink, '#BE185D'], // Pink gradient
    route: '/earn/review',
  },
  {
    id: 'refer-friends',
    title: 'Refer Friends',
    description: 'Get 100 coins per referral',
    icon: 'people',
    coins: '100',
    gradient: [colors.error, colors.error, colors.errorScale[700]], // Enhanced red gradient
    route: '/referral',
    highlight: true,
  },
  {
    id: 'premium',
    title: 'Get Premium',
    description: '2x Cashback + Free Delivery',
    icon: 'diamond',
    coins: '2x',
    gradient: [colors.warningScale[400], colors.warningScale[700], colors.brand.amberDeep], // Enhanced gold gradient
    route: '/subscription/plans',
    badge: 'NEW',
  },
  {
    id: 'spin-wheel',
    title: 'Spin Wheel',
    description: 'Daily chance to win coins',
    icon: 'radio-button-on',
    coins: '50-500',
    gradient: [colors.brand.green, '#00A85C', colors.brand.teal], // ReZ green gradient
    route: '/games/spin-wheel',
  },
  {
    id: 'scratch-card',
    title: 'Scratch Card',
    description: 'Win instant rewards',
    icon: 'gift',
    coins: '25-1000',
    gradient: [colors.brand.orange, colors.brand.orangeDark, '#C2410C'], // Enhanced orange gradient
    route: '/scratch-card',
  },
];

function EarningOpportunities() {
  const router = useRouter();
  const scrollX = useSharedValue(0);
  const fadeAnim = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 600 });

    // cleanup handled by reanimated
  }, []);

  const handleOpportunityPress = (opportunity: EarningOpportunity) => {
    router.push(opportunity.route as any);
  };

  const renderOpportunityCard = (opportunity: EarningOpportunity, index: number) => {
    const isHighlight = opportunity.highlight;
    const scaleAnim = useSharedValue(1);

    const handlePressIn = () => {
      scaleAnim.value = withSpring(0.95, { stiffness: 300, damping: 10 });
    };

    const handlePressOut = () => {
      scaleAnim.value = withSpring(1, { stiffness: 300, damping: 10 });
    };

    return (
      <Animated.View
        key={opportunity.id}
        style={[
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: interpolate(fadeAnim.value, [0, 1], [20, 0]),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable
            style={[
              styles.opportunityCard,
              isHighlight && styles.highlightCard,
            ]}
            onPress={() => handleOpportunityPress(opportunity)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
           
          >
            <LinearGradient
              colors={opportunity.gradient as any}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Decorative background elements */}
              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />
              
              {opportunity.badge && (
                <View style={styles.badgeContainer}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0.25)']}
                    style={styles.badgeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.badgeText}>{opportunity.badge}</Text>
                  </LinearGradient>
                </View>
              )}

              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.15)']}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons
                      name={opportunity.icon as any}
                      size={isHighlight ? 36 : 32}
                      color="white"
                    />
                  </LinearGradient>
                </View>

                <View style={styles.cardInfo}>
                  <ThemedText style={styles.cardTitle}>
                    {opportunity.title}
                  </ThemedText>
                  <ThemedText style={styles.cardDescription}>
                    {opportunity.description}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.coinsContainer}>
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.9)', 'rgba(255, 193, 7, 0.9)']}
                    style={styles.coinsGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="star" size={18} color={colors.background.primary} style={styles.starIcon} />
                    <Text style={styles.coinsText}>
                      {opportunity.coins}
                    </Text>
                  </LinearGradient>
                </View>

                <View style={styles.arrowContainer}>
                  <View style={styles.arrowCircle}>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: interpolate(fadeAnim.value, [0, 1], [10, 0]),
              },
            ],
          },
        ]}
      >
        <View style={styles.titleContainer}>
          <ThemedText style={styles.sectionTitle}>Earning Opportunities</ThemedText>
          <View style={styles.titleUnderline} />
        </View>
        <ThemedText style={styles.sectionSubtitle}>
          Multiple ways to earn rewards
        </ThemedText>
      </Animated.View>

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={Dimensions.get('window').width * 0.72 + 16}
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        {opportunities.map((opp, index) => renderOpportunityCard(opp, index))}
      </Animated.ScrollView>
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    marginTop: 8,
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  titleContainer: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.neutral[800],
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  titleUnderline: {
    width: 50,
    height: 4,
    backgroundColor: colors.brand.goldWarm,
    borderRadius: 2,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: colors.neutral[500],
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingRight: 20,
  },
  opportunityCard: {
    width: SCREEN_WIDTH * 0.72,
    marginRight: 16,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  highlightCard: {
    width: SCREEN_WIDTH * 0.75,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  cardGradient: {
    padding: 24,
    minHeight: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -40,
    right: -40,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -20,
    left: -20,
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  badgeGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 20,
    zIndex: 5,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardInfo: {
    flex: 1,
    paddingTop: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
    letterSpacing: -0.3,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    zIndex: 5,
  },
  coinsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  coinsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  starIcon: {
    marginRight: 6,
  },
  coinsText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
});

export default React.memo(EarningOpportunities);
