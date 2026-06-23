import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import analyticsService from '@/services/analyticsService';
import { useRouter } from 'expo-router';
import { useBackButton } from '@/hooks/useSafeNavigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useLocationPermission } from '@/hooks/useLocation';
import { useAuthUser } from '@/stores/selectors';
import { navigationDebugger } from '@/utils/navigationDebug';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
function LocationPermissionScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  useBackButton(() => true); // Block back navigation
  const { updateUserData, setLoading, state } = useOnboarding();
  const user = useAuthUser();
  const { permissionStatus, isRequesting, requestPermission } = useLocationPermission();
  const [permissionRequested, setPermissionRequested] = useState(false);

  useEffect(() => {
    analyticsService.track('location_permission_viewed');
  }, []);

  const requestLocationPermission = async () => {
    if (permissionRequested || isRequesting) return;

    setPermissionRequested(true);
    setLoading(true);

    try {
      const granted = await requestPermission();

      if (!granted) {
        analyticsService.track('location_permission_responded', { result: 'denied' });
        platformAlertConfirm(
          'Location Permission Required',
          'Please enable location access to find the best deals near you.',
          () => setPermissionRequested(false),
          'Try Again'
        );
        if (!isMounted()) return;
        setLoading(false);
        setPermissionRequested(false);
        return;
      }

      analyticsService.track('location_permission_responded', { result: 'granted' });

      updateUserData({
        location: {
          latitude: 0,
          longitude: 0,
        }
      });

      if (user?.isOnboarded) {
        navigationDebugger.logNavigation('location-permission', '(tabs)', 'location-granted-onboarded-user');
        router.replace('/(tabs)');
      } else {
        // Navigate to notification permission before loading
        navigationDebugger.logNavigation('location-permission', 'notification-permission', 'location-granted');
        router.replace('/onboarding/notification-permission');
      }

    } catch (error) {
      platformAlertConfirm(
        'Location Error',
        'Unable to get your location. Please try again.',
        () => setPermissionRequested(false),
        'Retry'
      );
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
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

      <View style={styles.content}>
        <View style={styles.glassCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            style={styles.glassShine}
          />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Enable Location</Text>
            <Text style={styles.subtitle}>
              Allow location access to discover{'\n'}the best deals near you
            </Text>

            <View style={styles.underlineContainer}>
              <LinearGradient
                colors={[Colors.gold, '#B8860B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.underline}
              />
            </View>
          </View>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <View style={styles.phoneContainer}>
              {/* Phone Frame */}
              <View style={styles.phone}>
                <LinearGradient
                  colors={[colors.background.primary, colors.tint.coolGray]}
                  style={styles.phoneScreen}
                >
                  {/* Map Lines */}
                  <View style={styles.mapLines}>
                    <View style={[styles.mapLine, styles.mapLine1]} />
                    <View style={[styles.mapLine, styles.mapLine2]} />
                    <View style={[styles.mapLine, styles.mapLine3]} />
                  </View>

                  {/* Store Icons */}
                  <View style={[styles.storeIcon, styles.store1]}>
                    <LinearGradient
                      colors={[Colors.gold, Colors.nileBlue]}
                      style={styles.storeIconInner}
                    >
                      <Ionicons name="restaurant" size={12} color={colors.background.primary} />
                    </LinearGradient>
                  </View>
                  <View style={[styles.storeIcon, styles.store2]}>
                    <LinearGradient
                      colors={[Colors.gold, '#B8860B']}
                      style={styles.storeIconInner}
                    >
                      <Ionicons name="cart" size={12} color={colors.background.primary} />
                    </LinearGradient>
                  </View>
                  <View style={[styles.storeIcon, styles.store3]}>
                    <LinearGradient
                      colors={[Colors.gold, Colors.nileBlue]}
                      style={styles.storeIconInner}
                    >
                      <Ionicons name="cafe" size={12} color={colors.background.primary} />
                    </LinearGradient>
                  </View>
                </LinearGradient>
                <View style={styles.phoneButton} />
              </View>

              {/* Location Pin */}
              <View style={styles.locationPin}>
                <LinearGradient
                  colors={[Colors.gold, '#B8860B']}
                  style={styles.pinTop}
                >
                  <Ionicons name="location" size={16} color={colors.background.primary} />
                </LinearGradient>
                <View style={styles.pinShadow} />
              </View>

              {/* Pulse Rings */}
              <View style={styles.pulseRings}>
                <View style={[styles.pulseRing, styles.pulseRing1]} />
                <View style={[styles.pulseRing, styles.pulseRing2]} />
              </View>
            </View>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="storefront-outline" size={18} color={Colors.gold} />
              </View>
              <Text style={styles.featureText}>Find nearby stores</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="pricetags-outline" size={18} color={Colors.gold} />
              </View>
              <Text style={styles.featureText}>Exclusive local deals</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="flash-outline" size={18} color={Colors.gold} />
              </View>
              <Text style={styles.featureText}>Quick delivery options</Text>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            style={styles.primaryButtonWrapper}
            onPress={requestLocationPermission}
            disabled={state.isLoading || isRequesting}
           
          >
            <LinearGradient
              colors={
                (state.isLoading || isRequesting)
                  ? [colors.neutral[300], colors.neutral[300]]
                  : [Colors.gold, Colors.nileBlue]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Ionicons name="location" size={20} color={colors.background.primary} />
              <Text style={styles.primaryButtonText}>
                {(state.isLoading || isRequesting) ? 'Getting Location...' : 'Allow Location Access'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Skip Button */}
          <Pressable
            style={styles.skipButton}
            onPress={() => {
              analyticsService.track('location_permission_responded', { result: 'skipped' });
              updateUserData({
                location: { latitude: 0, longitude: 0 }
              });
              if (user?.isOnboarded) {
                router.replace('/(tabs)');
              } else {
                router.replace('/onboarding/notification-permission');
              }
            }}
           
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
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
    marginBottom: Spacing.xl,
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
    fontSize: 14,
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
    paddingVertical: Spacing.lg,
  },
  phoneContainer: {
    position: 'relative',
    width: 160,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: 120,
    height: 180,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    borderWidth: 3,
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  phoneScreen: {
    flex: 1,
    margin: 6,
    borderRadius: 14,
    position: 'relative',
  },
  mapLines: {
    flex: 1,
    position: 'relative',
  },
  mapLine: {
    position: 'absolute',
    backgroundColor: 'rgba(26, 58, 82, 0.2)',  // Nile Blue
    borderRadius: 2,
  },
  mapLine1: {
    width: 50,
    height: 2,
    top: '25%',
    left: '15%',
  },
  mapLine2: {
    width: 60,
    height: 2,
    top: '50%',
    right: '10%',
  },
  mapLine3: {
    width: 35,
    height: 2,
    top: '75%',
    left: '25%',
  },
  storeIcon: {
    position: 'absolute',
  },
  storeIconInner: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  store1: {
    top: '20%',
    left: '20%',
  },
  store2: {
    top: '45%',
    right: '15%',
  },
  store3: {
    bottom: '25%',
    left: '35%',
  },
  phoneButton: {
    width: 30,
    height: 4,
    backgroundColor: Colors.gold,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  locationPin: {
    position: 'absolute',
    top: 30,
    right: 20,
    alignItems: 'center',
  },
  pinTop: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  pinShadow: {
    width: 16,
    height: 4,
    backgroundColor: 'rgba(255, 200, 87, 0.3)',
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  pulseRings: {
    position: 'absolute',
    top: 30,
    right: 12,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 87, 0.3)',
  },
  pulseRing1: {
    width: 48,
    height: 48,
    top: -8,
    left: -8,
  },
  pulseRing2: {
    width: 64,
    height: 64,
    top: -16,
    left: -16,
  },

  // Features
  features: {
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 205, 87, 0.15)',  // Light Mustard
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
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
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: Spacing.sm,
  },
  skipButtonText: {
    color: Colors.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default withErrorBoundary(LocationPermissionScreen, 'OnboardingLocationPermission');
