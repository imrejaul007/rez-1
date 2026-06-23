import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { useGreetingDisplay, useGreetingTime, useGreetingAnimation } from '@/hooks/useGreeting';
import { useLocationBasedGreeting } from '@/hooks/useGreeting';
import { GreetingData } from '@/types/greeting.types';
import { colors } from '@/constants/theme';

interface GreetingDisplayProps {
  showEmoji?: boolean;
  showTime?: boolean;
  showLocation?: boolean;
  animationType?: 'fade' | 'slide' | 'bounce' | 'none';
  maxLength?: number;
  onPress?: () => void;
  style?: any;
  textStyle?: any;
  timeStyle?: any;
  locationStyle?: any;
  emojiStyle?: any;
}

function GreetingDisplay({
  showEmoji = true,
  showTime = true,
  showLocation = true,
  animationType = 'fade',
  maxLength = 50,
  onPress,
  style,
  textStyle,
  timeStyle,
  locationStyle,
  emojiStyle,
}: GreetingDisplayProps) {
  const { greeting, isLoading, error } = useGreetingDisplay();
  const { formattedTime, timeOfDay } = useGreetingTime();
  const { isAnimating, animationKey, triggerAnimation } = useGreetingAnimation();
  const { getGreetingWithLocation } = useLocationBasedGreeting();
  
  const [displayGreeting, setDisplayGreeting] = useState<GreetingData | null>(null);
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);

  // Update greeting when context changes
  useEffect(() => {
    if (greeting) {
      setDisplayGreeting(greeting);
      triggerAnimation();
    }
  }, [greeting, triggerAnimation]);

  // Handle animation
  useEffect(() => {
    let _anim: any;
    if (animationType === 'fade') {
      _anim = fadeAnim.value = withSequence(withTiming(0, { duration: 200 }), withTiming(1, { duration: 300 }));
    } else if (animationType === 'slide') {
      _anim = slideAnim.value = withSequence(withTiming(-20, { duration: 200 }), withTiming(0, { duration: 300 }));
    }
  
    }, [animationKey, animationType, fadeAnim, slideAnim]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default behavior: refresh greeting
      const newGreeting = getGreetingWithLocation();
      setDisplayGreeting(newGreeting);
      triggerAnimation();
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const getTimeBasedColor = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'morning':
        return '#FFA500'; // Orange
      case 'afternoon':
        return colors.brand.goldBright; // Gold
      case 'evening':
        return '#FF6347'; // Tomato
      case 'night':
        return '#4169E1'; // Royal Blue
      default:
        return colors.darkGray;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={colors.brand.ios} />
        <Text style={[styles.loadingText, textStyle]}>Loading greeting...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.errorText, textStyle]}>Unable to load greeting</Text>
      </View>
    );
  }

  if (!displayGreeting) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.defaultText, textStyle]}>Hello!</Text>
      </View>
    );
  }

  const animatedStyle = {
    opacity: animationType === 'fade' ? fadeAnim : 1,
    transform: animationType === 'slide' ? [{ translateY: slideAnim }] : [],
  };

  const timeColor = getTimeBasedColor(displayGreeting.timeOfDay);

  return (
    <Pressable
      style={[styles.container, style]}
      onPress={handlePress}
     
    >
      <Animated.View style={[styles.content, animatedStyle]}>
        {/* Main Greeting */}
        <View style={styles.greetingRow}>
          {showEmoji && displayGreeting.emoji && (
            <Text style={[styles.emoji, emojiStyle]}>{displayGreeting.emoji}</Text>
          )}
          <Text style={[styles.greetingText, textStyle, { color: timeColor }]}>
            {truncateText(displayGreeting.personalizedMessage, maxLength)}
          </Text>
        </View>

        {/* Time Display */}
        {showTime && (
          <Text style={[styles.timeText, timeStyle]}>
            {formattedTime}
          </Text>
        )}

        {/* Location Display */}
        {showLocation && displayGreeting.personalizedMessage.includes('from') && (
          <Text style={[styles.locationText, locationStyle]}>
            📍 {displayGreeting.personalizedMessage.split('from ')[1]?.replace('!', '')}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    alignItems: 'flex-start',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    lineHeight: 24,
  },
  timeText: {
    fontSize: 14,
    color: colors.midGray,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 16,
    color: colors.midGray,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  defaultText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
  },
});

// Compact version for smaller spaces
export function CompactGreetingDisplay(props: GreetingDisplayProps) {
  return (
    <GreetingDisplay
      {...props}
      showTime={false}
      showLocation={false}
      maxLength={30}
      style={[props.style, { padding: 8 }]}
      textStyle={[props.textStyle, { fontSize: 16 }]}
    />
  );
}

// Full version with all features
export function FullGreetingDisplay(props: GreetingDisplayProps) {
  return (
    <GreetingDisplay
      {...props}
      showEmoji={true}
      showTime={true}
      showLocation={true}
      maxLength={80}
      style={[props.style, { padding: 20 }]}
      textStyle={[props.textStyle, { fontSize: 20 }]}
    />
  );
}

export default React.memo(GreetingDisplay);
