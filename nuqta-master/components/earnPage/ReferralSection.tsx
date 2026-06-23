import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ReferralSectionProps } from '@/types/earnPage.types';
import { EARN_COLORS } from '@/constants/EarnPageColors';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

function ReferralSection({
  referralData,
  onShare,
  onLearnMore
}: ReferralSectionProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const scaleAnim = useSharedValue(0.95);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 600 });
    slideAnim.value = withTiming(0, { duration: 600 });
    scaleAnim.value = withSpring(1);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: slideAnim.value },
      { scale: scaleAnim.value },
    ],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: interpolate(fadeAnim.value, [0, 1], [10, 0]) },
    ],
  }));

  const coinFadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: interpolate(fadeAnim.value, [0, 1], [0, 1]) }],
  }));

  const phoneLeftStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateX: interpolate(fadeAnim.value, [0, 1], [-20, 0]) }],
  }));

  const phoneRightStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateX: interpolate(fadeAnim.value, [0, 1], [20, 0]) }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: interpolate(fadeAnim.value, [0, 1], [0, 1]) }],
  }));

  const statsCardStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: interpolate(fadeAnim.value, [0, 1], [0.8, 1]) }],
  }));

  const statsSlideUpStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(fadeAnim.value, [0, 1], [20, 0]) }],
  }));

  const stepsSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(fadeAnim.value, [0, 1], [30, 0]) }],
  }));

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
    >
      <Animated.View
        style={[
          styles.header,
          headerStyle,
        ]}
      >
        <View style={styles.titleContainer}>
          <ThemedText style={styles.title}>
            Refer to different apps and services
          </ThemedText>
          <View style={styles.titleUnderline} />
        </View>
      </Animated.View>
      
      <Animated.View
        style={[styles.card, headerStyle]}
      >
        <LinearGradient
          colors={[colors.background.primary, colors.tint.coolGray, colors.tint.slate]}
          style={styles.cardBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative background elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          {/* Illustration Area */}
          <View style={styles.illustrationContainer}>
            <View style={styles.illustration}>
              {/* Animated Stars/Coins */}
              {[1, 2, 3, 4, 5].map((idx) => (
                <Animated.View
                  key={idx}
                  style={[
                    styles.coin,
                    styles[`coin${idx}` as keyof typeof styles],
                    coinFadeStyle,
                  ]}
                >
                  <LinearGradient
                    colors={[colors.brand.goldBright, '#FFA500']}
                    style={styles.coinGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="star" size={idx === 3 ? 14 : idx === 1 ? 12 : idx === 5 ? 13 : 10} color={colors.background.primary} />
                  </LinearGradient>
                </Animated.View>
              ))}
              
              {/* Central Elements */}
              <View style={styles.centralElements}>
                {/* Left Phone */}
                <Animated.View 
                  style={[
                    styles.phone,
                    styles.phoneLeft,
                    phoneLeftStyle,
                  ]}
                >
                  <LinearGradient
                    colors={[colors.brand.indigo, '#4F46E5']}
                    style={styles.phoneGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="phone-portrait" size={28} color={colors.background.primary} />
                    <View style={styles.phoneScreen}>
                      <View style={styles.screenLine} />
                      <View style={styles.screenLine} />
                      <View style={styles.screenLine} />
                    </View>
                  </LinearGradient>
                </Animated.View>
                
                {/* Right Phone/Download */}
                <Animated.View 
                  style={[
                    styles.phone,
                    styles.phoneRight,
                    phoneRightStyle,
                  ]}
                >
                  <LinearGradient
                    colors={[colors.lightMustard, colors.nileBlue]}
                    style={styles.phoneGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="download" size={28} color={colors.background.primary} />
                    <View style={styles.phoneScreen}>
                      <Ionicons name="arrow-down" size={16} color={colors.background.primary} />
                    </View>
                  </LinearGradient>
                </Animated.View>
              </View>
              
              {/* People */}
              <Animated.View 
                style={[
                  styles.person,
                  styles.personLeft,
                  arrowStyle,
                ]}
              >
                <LinearGradient
                  colors={[colors.brand.pink, colors.deepPink]}
                  style={styles.personAvatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person" size={16} color={colors.background.primary} />
                </LinearGradient>
              </Animated.View>
              
              <Animated.View
                style={[
                  styles.person,
                  styles.personRight,
                  arrowStyle,
                ]}
              >
                <LinearGradient
                  colors={[colors.lightMustard, colors.nileBlue]}
                  style={styles.personAvatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person" size={16} color={colors.background.primary} />
                </LinearGradient>
              </Animated.View>
            </View>
          </View>
          
          {/* Stats */}
          <Animated.View 
            style={[
              styles.stats,
              statsSlideUpStyle,
            ]}
          >
            {[
              { value: referralData.totalReferrals, label: 'Total Referrals', icon: 'people', gradient: [colors.lightMustard, colors.nileBlue] },
              { value: `${currencySymbol}${referralData.totalEarningsFromReferrals}`, label: 'Earned', icon: 'wallet', gradient: [colors.lightMustard, colors.nileBlue] },
              { value: `${currencySymbol}${referralData.referralBonus}`, label: 'Per Referral', icon: 'gift', gradient: [colors.brand.goldWarm, '#F5A623'] },
            ].map((stat, idx) => (
              <View key={idx} style={styles.statItem}>
                <LinearGradient
                  colors={stat.gradient as any}
                  style={styles.statIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={stat.icon as any} size={18} color={colors.background.primary} />
                </LinearGradient>
                <View style={styles.statNumberWrapper}>
                  <ThemedText style={styles.statNumber}>
                    {stat.value}
                  </ThemedText>
                </View>
                <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
              </View>
            ))}
          </Animated.View>

          
          {/* Action Buttons */}
          <Animated.View 
            style={[
              styles.actions,
              statsSlideUpStyle,
            ]}
          >
            <Pressable 
              style={styles.actionButton}
              onPress={onShare}
             
            >
              <LinearGradient
                colors={[colors.lightMustard, '#e5b84e', colors.nileBlue]}
                style={styles.shareButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="share-social" size={18} color={colors.background.primary} />
                <ThemedText style={styles.shareButtonText}>Share Link</ThemedText>
              </LinearGradient>
            </Pressable>
            
            <Pressable
              style={styles.learnButton}
              onPress={onLearnMore}
             
            >
              <LinearGradient
                colors={['rgba(255, 205, 87, 0.1)', 'rgba(255, 205, 87, 0.05)']}
                style={styles.learnButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <ThemedText style={styles.learnButtonText}>Learn More</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={EARN_COLORS.primary} />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: EARN_COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: colors.brand.goldWarm,
    borderRadius: 2,
    marginTop: 2,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 200, 87, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.goldWarm,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 16px rgba(255, 200, 87, 0.2)',
      },
    }),
  },
  cardBackground: {
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 200, 87, 0.12)',
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 205, 87, 0.05)',
    bottom: -20,
    left: -20,
  },
  illustrationContainer: {
    height: 120,
    marginBottom: 20,
    position: 'relative',
  },
  illustration: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.goldBright,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(255, 215, 0, 0.3)',
      },
    }),
  },
  coinGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coin1: { top: 10, left: 30 },
  coin2: { top: 20, right: 40 },
  coin3: { bottom: 30, left: 20 },
  coin4: { bottom: 20, right: 30 },
  coin5: { top: 30, left: '50%', marginLeft: -12 },
  
  centralElements: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  phone: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  phoneGradient: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneLeft: {},
  phoneRight: {},
  phoneScreen: {
    marginTop: 6,
    alignItems: 'center',
  },
  screenLine: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginVertical: 2,
    borderRadius: 1,
  },
  
  person: {
    position: 'absolute',
  },
  personLeft: { left: 60, bottom: 10 },
  personRight: { right: 60, bottom: 10 },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 6px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  
 stats: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: 18,
  paddingVertical: 18,
  paddingHorizontal: 12,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: 'rgba(0, 0, 0, 0.05)',
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
  }),
},
statItem: {
  alignItems: 'center',
  flex: 1,
  gap: 8,
},
statIconGradient: {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 6,
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 3,
    },
    web: {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
    },
  }),
},
statNumberWrapper: {
  width: '100%',
  alignItems: 'center',
},
statNumber: {
  fontSize: 20,
  fontWeight: '800',
  color: colors.neutral[800],
  marginBottom: 2,
  letterSpacing: -0.3,
  textAlign: 'center',
},
statLabel: {
  fontSize: 11,
  color: colors.neutral[500],
  fontWeight: '600',
  textAlign: 'center',
  letterSpacing: 0.2,
},

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: EARN_COLORS.border,
    marginHorizontal: 16,
  },
  
  actions: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 5,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 4px 8px rgba(255, 205, 87, 0.3)',
      },
    }),
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.2,
  },
  learnButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: EARN_COLORS.primary,
  },
  learnButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  learnButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: EARN_COLORS.primary,
    letterSpacing: 0.2,
  },
});

export default React.memo(ReferralSection);
