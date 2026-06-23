// Global Preferences Service
// Provides utility functions for applying app preferences globally

import { useAppPreferences } from '@/contexts/AppPreferencesContext';
import { Animated, Easing } from 'react-native';

// Animation utilities
export const useGlobalAnimations = () => {
  const { shouldAnimate } = useAppPreferences();

  const createAnimatedValue = (initialValue: number = 0) => {
    return new Animated.Value(initialValue);
  };

  const fadeIn = (animatedValue: Animated.Value, duration: number = 300) => {
    if (!shouldAnimate()) {
      animatedValue.setValue(1);
      return;
    }

    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const fadeOut = (animatedValue: Animated.Value, duration: number = 300) => {
    if (!shouldAnimate()) {
      animatedValue.setValue(0);
      return;
    }

    Animated.timing(animatedValue, {
      toValue: 0,
      duration,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const slideIn = (animatedValue: Animated.Value, duration: number = 300) => {
    if (!shouldAnimate()) {
      animatedValue.setValue(0);
      return;
    }

    Animated.timing(animatedValue, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  };

  const slideOut = (animatedValue: Animated.Value, duration: number = 300) => {
    if (!shouldAnimate()) {
      animatedValue.setValue(-100);
      return;
    }

    Animated.timing(animatedValue, {
      toValue: -100,
      duration,
      easing: Easing.in(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  };

  const scaleIn = (animatedValue: Animated.Value, duration: number = 300) => {
    if (!shouldAnimate()) {
      animatedValue.setValue(1);
      return;
    }

    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  };

  const scaleOut = (animatedValue: Animated.Value, duration: number = 300) => {
    if (!shouldAnimate()) {
      animatedValue.setValue(0);
      return;
    }

    Animated.timing(animatedValue, {
      toValue: 0,
      duration,
      easing: Easing.in(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  };

  const bounce = (animatedValue: Animated.Value, duration: number = 600) => {
    if (!shouldAnimate()) {
      animatedValue.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.2,
        duration: duration / 2,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration / 2,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return {
    shouldAnimate,
    createAnimatedValue,
    fadeIn,
    fadeOut,
    slideIn,
    slideOut,
    scaleIn,
    scaleOut,
    bounce,
  };
};

// Sound utilities
export const useGlobalSounds = () => {
  const { shouldPlaySounds, playSound } = useAppPreferences();

  const playSuccessSound = () => {
    if (shouldPlaySounds()) {
      playSound('success');
    }
  };

  const playErrorSound = () => {
    if (shouldPlaySounds()) {
      playSound('error');
    }
  };

  const playNotificationSound = () => {
    if (shouldPlaySounds()) {
      playSound('notification');
    }
  };

  const playClickSound = () => {
    if (shouldPlaySounds()) {
      playSound('click');
    }
  };

  return {
    shouldPlaySounds,
    playSuccessSound,
    playErrorSound,
    playNotificationSound,
    playClickSound,
  };
};

// Haptic feedback utilities
export const useGlobalHaptics = () => {
  const { shouldUseHaptics, triggerHapticFeedback } = useAppPreferences();

  const lightHaptic = () => {
    if (shouldUseHaptics()) {
      triggerHapticFeedback('light');
    }
  };

  const mediumHaptic = () => {
    if (shouldUseHaptics()) {
      triggerHapticFeedback('medium');
    }
  };

  const heavyHaptic = () => {
    if (shouldUseHaptics()) {
      triggerHapticFeedback('heavy');
    }
  };

  const successHaptic = () => {
    if (shouldUseHaptics()) {
      triggerHapticFeedback('success');
    }
  };

  const warningHaptic = () => {
    if (shouldUseHaptics()) {
      triggerHapticFeedback('warning');
    }
  };

  const errorHaptic = () => {
    if (shouldUseHaptics()) {
      triggerHapticFeedback('error');
    }
  };

  return {
    shouldUseHaptics,
    lightHaptic,
    mediumHaptic,
    heavyHaptic,
    successHaptic,
    warningHaptic,
    errorHaptic,
  };
};

// Combined preferences hook
export const useGlobalPreferences = () => {
  const animations = useGlobalAnimations();
  const sounds = useGlobalSounds();
  const haptics = useGlobalHaptics();
  const { preferences, updatePreferences, isLoading, error } = useAppPreferences();

  return {
    preferences,
    updatePreferences,
    isLoading,
    error,
    animations,
    sounds,
    haptics,
  };
};

// Utility functions for components that don't use hooks
export const getGlobalPreferences = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const stored = await AsyncStorage.getItem('app_preferences');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
};

export const shouldAnimateGlobally = async (): Promise<boolean> => {
  const preferences = await getGlobalPreferences();
  return preferences?.animations || true;
};

export const shouldPlaySoundsGlobally = async (): Promise<boolean> => {
  const preferences = await getGlobalPreferences();
  return preferences?.sounds || true;
};

export const shouldUseHapticsGlobally = async (): Promise<boolean> => {
  const preferences = await getGlobalPreferences();
  return preferences?.hapticFeedback || true;
};
