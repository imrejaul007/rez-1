// Preferences Demo Component
// Demonstrates how app preferences work globally

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalPreferences } from '@/services/globalPreferencesService';
import { colors } from '@/constants/theme';

export default function PreferencesDemo() {
  const { preferences, animations, sounds, haptics } = useGlobalPreferences();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (preferences?.animations) {
      animations.fadeIn(fadeAnim, 500);
      animations.scaleIn(scaleAnim, 500);
    } else {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [preferences?.animations]);

  const handleButtonPress = () => {
    // Trigger haptic feedback
    haptics.mediumHaptic();

    // Play sound
    sounds.playClickSound();

    // Trigger animation
    if (preferences?.animations) {
      animations.bounce(scaleAnim, 400);
    }
  };

  const handleSuccessDemo = () => {
    haptics.successHaptic();
    sounds.playSuccessSound();

    if (preferences?.animations) {
      animations.bounce(scaleAnim, 600);
    }
  };

  const handleErrorDemo = () => {
    haptics.errorHaptic();
    sounds.playErrorSound();

    if (preferences?.animations) {
      animations.bounce(scaleAnim, 600);
    }
  };

  if (!preferences) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <Text style={styles.title}>App Preferences Demo</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Current Settings:</Text>
        <Text style={styles.statusText}>
          Animations: {preferences.animations ? '✅ Enabled' : '❌ Disabled'}
        </Text>
        <Text style={styles.statusText}>
          Sounds: {preferences.sounds ? '✅ Enabled' : '❌ Disabled'}
        </Text>
        <Text style={styles.statusText}>
          Haptic Feedback: {preferences.hapticFeedback ? '✅ Enabled' : '❌ Disabled'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={handleButtonPress}
         
        >
          <Ionicons name="flash" size={20} color="white" />
          <Text style={styles.buttonText}>Test All Effects</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.successButton]}
          onPress={handleSuccessDemo}
         
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.buttonText}>Success Demo</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.errorButton]}
          onPress={handleErrorDemo}
         
        >
          <Ionicons name="close-circle" size={20} color="white" />
          <Text style={styles.buttonText}>Error Demo</Text>
        </Pressable>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>How it works:</Text>
        <Text style={styles.infoText}>
          • Toggle preferences in Account Settings → App Preferences
        </Text>
        <Text style={styles.infoText}>
          • Changes apply globally across the entire app
        </Text>
        <Text style={styles.infoText}>
          • Settings sync with backend automatically
        </Text>
        <Text style={styles.infoText}>
          • Works offline with local storage fallback
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 30,
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: colors.neutral[700],
    marginBottom: 5,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: colors.brand.purpleLight,
  },
  successButton: {
    backgroundColor: colors.successScale[400],
  },
  errorButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 5,
    lineHeight: 20,
  },
});
