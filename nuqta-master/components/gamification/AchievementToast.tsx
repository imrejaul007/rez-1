import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Achievement } from '@/services/achievementApi';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
  onPress?: () => void;
  autoHideDuration?: number;
}

function AchievementToast({
  achievement,
  onDismiss,
  onPress,
  autoHideDuration = 5000,
}: AchievementToastProps) {
  const slideAnim = useSharedValue(-200);
  const scaleAnim = useSharedValue(0.8);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Slide in animation
    slideAnim.value = withSpring(0, { stiffness: 50, damping: 7 });
    scaleAnim.value = withSpring(1, { stiffness: 50, damping: 7 });

    // Auto-hide timer
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoHideDuration);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    slideAnim.value = withTiming(-200, { duration: 300 });
    scaleAnim.value = withTiming(0.8, { duration: 300 });
    setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 300);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
       
        onPress={handlePress}
        style={styles.touchable}
      >
        <LinearGradient
          colors={[achievement.color || colors.brand.purpleLight, colors.brand.purple]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.content}>
            {/* Achievement Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBg}>
                <Ionicons
                  name={achievement.icon as any || 'trophy'}
                  size={32}
                  color={colors.brand.goldBright}
                />
              </View>
              {/* Sparkle effect */}
              <View style={styles.sparkle}>
                <Ionicons name="sparkles" size={16} color={colors.brand.goldBright} />
              </View>
            </View>

            {/* Achievement Details */}
            <View style={styles.details}>
              <Text style={styles.badge}>Achievement Unlocked!</Text>
              <Text style={styles.title} numberOfLines={1}>
                {achievement.title}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {achievement.description}
              </Text>
            </View>

            {/* Close Button */}
            <Pressable
              style={styles.closeButton}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.8)" />
            </Pressable>
          </View>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 50 : 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  touchable: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  gradient: {
    borderRadius: 16,
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  details: {
    flex: 1,
    marginRight: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
});

export default React.memo(AchievementToast);
