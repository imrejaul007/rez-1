// @ts-nocheck
/**
 * ModeSwitcher Component
 *
 * 4-mode intent selector for Nuqta app:
 * - Near U: Rewards near you (local, everyday)
 * - Mall: Nuqta Mall (curated brands)
 * - Cash: Cash Store (cashback focus)
 * - Privé: Exclusive (reputation-based)
 *
 * Features:
 * - Animated sliding pill (200-250ms)
 * - Mode-specific colors
 * - Privé lock state for non-eligible users
 * - Gold glow animation for eligible Privé users
 * - Haptic feedback on tap
 *
 * Design Reference: rezprive-main/src/components/ModeSwitcher.tsx
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutChangeEvent,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ModeId,
  ModeConfig,
  PriveEligibility,
  TabLayout,
} from '@/types/mode.types';
import { triggerImpact } from '@/utils/haptics';
import { Timing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

// Mode configurations
const MODES: ModeConfig[] = [
  {
    id: 'near-u',
    label: 'Near U',
    icon: '📍',
    activeColor: colors.lightMustard, // Nuqta Gold
    microcopy: 'Save around you',
  },
  {
    id: 'mall',
    label: 'Mall',
    icon: '🛍',
    activeColor: colors.nileBlue, // Nile Blue
    microcopy: 'Curated brands',
  },
  {
    id: 'cash',
    label: 'Cash',
    icon: '💰',
    activeColor: colors.warningScale[400], // Orange/Gold
    microcopy: 'Cashback deals',
  },
  {
    id: 'prive',
    label: 'Privé',
    icon: '✦',
    activeColor: colors.brand.goldAccent, // Gold
    microcopy: 'Exclusive access',
  },
];

// Privé gradient colors
const PRIVE_GRADIENT: [string, string] = [colors.neutral[800], colors.brand.goldAccent];

interface ModeSwitcherProps {
  activeMode: ModeId;
  onModeChange: (mode: ModeId) => void;
  priveEligibility: PriveEligibility;
  onPriveLockedPress?: () => void;
  isPriveMode?: boolean;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  activeMode,
  onModeChange,
  priveEligibility,
  onPriveLockedPress,
  isPriveMode = false,
}) => {
  const router = useRouter();

  // Animation values
  const pillPosition = useSharedValue(0);
  const priveGlowOpacity = useSharedValue(0);

  // Tab layouts for animation
  const [tabLayouts, setTabLayouts] = useState<Record<ModeId, TabLayout>>({
    'near-u': { x: 0, width: 0 },
    'mall': { x: 0, width: 0 },
    'cash': { x: 0, width: 0 },
    'prive': { x: 0, width: 0 },
  });

  // Track if layouts are ready
  const [layoutsReady, setLayoutsReady] = useState(false);

  // Handle tab layout measurement
  const handleTabLayout = useCallback((mode: ModeId, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts((prev) => {
      const updated = { ...prev, [mode]: { x, width } };

      // Check if all layouts are ready
      const allReady = Object.values(updated).every((l) => l.width > 0);
      if (allReady && !layoutsReady) {
        setLayoutsReady(true);
      }

      return updated;
    });
  }, [layoutsReady]);

  // Animate pill to active mode
  useEffect(() => {
    if (!layoutsReady) return;

    const targetLayout = tabLayouts[activeMode];
    if (!targetLayout.width) return;

    pillPosition.value = withTiming(targetLayout.x, { duration: Timing.normal });
    // cleanup handled by reanimated
  }, [activeMode, tabLayouts, layoutsReady, pillPosition]);

  // Privé glow animation (once per session for eligible users)
  useEffect(() => {
    if (
      priveEligibility.isEligible &&
      !priveEligibility.hasSeenGlowThisSession
    ) {
      // Pulse glow animation
      priveGlowOpacity.value = withSequence(withTiming(0.8, { duration: 500 }), withTiming(0, { duration: 500 }));
    }
  }, [priveEligibility.isEligible, priveEligibility.hasSeenGlowThisSession, priveGlowOpacity]);

  const priveGlowStyle = useAnimatedStyle(() => ({
    opacity: priveGlowOpacity.value,
  }));

  const pillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillPosition.value }],
  }));

  // Handle mode press
  const handleModePress = useCallback(
    async (mode: ModeId) => {
      // Haptic feedback
      await triggerImpact('Light');

      // Handle locked Privé
      if (mode === 'prive' && !priveEligibility.isEligible) {
        if (onPriveLockedPress) {
          onPriveLockedPress();
        } else {
          // Default: navigate to subscription/eligibility screen
          router.push('/subscription');
        }
        return;
      }

      // Announce mode change for screen readers
      if (Platform.OS === 'ios') {
        const modeConfig = MODES.find((m) => m.id === mode);
        AccessibilityInfo.announceForAccessibility(
          `Switched to ${modeConfig?.label} mode. ${modeConfig?.microcopy}`
        );
      }

      onModeChange(mode);
    },
    [priveEligibility.isEligible, onPriveLockedPress, onModeChange, router]
  );

  // Get active mode config
  const activeModeConfig = MODES.find((m) => m.id === activeMode);
  const activeLayout = tabLayouts[activeMode];

  // Determine container background based on mode
  const containerBg = isPriveMode || activeMode === 'prive' ? colors.midGrayAlt : colors.neutral[100];
  const borderColor = isPriveMode || activeMode === 'prive' ? '#2A2A2A' : colors.neutral[200];

  return (
    <View style={[styles.container, { backgroundColor: containerBg, borderColor }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={false} // All tabs visible, no scroll needed
      >
        {/* Animated sliding pill background */}
        {layoutsReady && activeLayout.width > 0 && (
          <Animated.View
            style={[
              styles.slidingPill,
              {
                width: activeLayout.width,
                backgroundColor:
                  activeMode === 'prive'
                    ? activeModeConfig?.activeColor
                    : activeModeConfig?.activeColor,
              },
              pillAnimStyle,
            ]}
          >
            {/* Gradient for Privé mode */}
            {activeMode === 'prive' && (
              <LinearGradient
                colors={PRIVE_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
          </Animated.View>
        )}

        {/* Mode tabs */}
        {MODES.map((mode) => {
          const isActive = activeMode === mode.id;
          const isPrive = mode.id === 'prive';
          const isLocked = isPrive && !priveEligibility.isEligible;

          return (
            <Pressable
              key={mode.id}
              style={[
                styles.modeTab,
                isActive && styles.modeTabActive,
                isLocked && styles.modeTabLocked,
              ]}
              onPress={() => handleModePress(mode.id)}
              onLayout={(e) => handleTabLayout(mode.id, e)}
             
              accessible={true}
              accessibilityRole="tab"
              accessibilityLabel={`${mode.label} mode`}
              accessibilityHint={
                isLocked
                  ? 'Requires eligibility. Tap to learn more.'
                  : `Switch to ${mode.microcopy}`
              }
              accessibilityState={{
                selected: isActive,
                disabled: isLocked,
              }}
            >
              {/* Privé glow effect for eligible users */}
              {isPrive && priveEligibility.isEligible && (
                <Animated.View
                  style={[
                    styles.priveGlow,
                    priveGlowStyle,
                  ]}
                />
              )}

              {/* Lock icon for non-eligible Privé */}
              {isLocked && (
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color={isPriveMode || activeMode === 'prive' ? colors.neutral[500] : colors.neutral[400]}
                  style={styles.lockIcon}
                />
              )}

              {/* Mode icon */}
              <Text
                style={[
                  styles.modeIcon,
                  isActive && styles.modeIconActive,
                  isLocked && styles.modeIconLocked,
                ]}
              >
                {mode.icon}
              </Text>

              {/* Mode label */}
              <Text
                style={[
                  styles.modeLabel,
                  isActive && styles.modeLabelActive,
                  isPrive && isActive && styles.modeLabelPrive,
                  isLocked && styles.modeLabelLocked,
                  // Dark mode text
                  (isPriveMode || activeMode === 'prive') &&
                    !isActive &&
                    styles.modeLabelDarkMode,
                ]}
              >
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    marginHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  slidingPill: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 0,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    zIndex: 1,
    minHeight: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  modeTabActive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  modeTabLocked: {
    opacity: 0.6,
  },
  modeIcon: {
    fontSize: 14,
  },
  modeIconActive: {
    opacity: 1,
  },
  modeIconLocked: {
    opacity: 0.5,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[500], // Muted gray
  },
  modeLabelActive: {
    fontWeight: '600',
    color: colors.background.primary,
  },
  modeLabelPrive: {
    color: colors.midGrayAlt, // Dark text on gold
  },
  modeLabelLocked: {
    color: colors.neutral[400],
  },
  modeLabelDarkMode: {
    color: '#A0A0A0',
  },
  lockIcon: {
    marginRight: 2,
  },
  priveGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    backgroundColor: 'rgba(201, 169, 98, 0.4)', // Gold glow
  },
});

export default React.memo(ModeSwitcher);
