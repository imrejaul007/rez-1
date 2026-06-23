// components/cart/StockWarningBanner.tsx
// Banner component for displaying stock warnings and validation issues

import React, { useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions} from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import {
  StockWarningBannerProps,
  ValidationIssue,
  VALIDATION_ISSUE_ICONS,
  VALIDATION_ISSUE_COLORS,
} from '@/types/validation.types';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

function StockWarningBanner({
  issues,
  onDismiss,
  onViewDetails,
  autoHide = false,
  autoHideDuration = 5000,
}: StockWarningBannerProps) {
  const [visible, setVisible] = useState(true);
  const slideAnim = useSharedValue(-100);
  const fadeAnim = useSharedValue(0);
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${interpolate(fadeAnim.value, [0, 1], [0, 100])}%` as any,
  }));

  const handleDismiss = () => {
    slideAnim.value = withTiming(-100, { duration: 200 });
    fadeAnim.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 200);
  };

  useEffect(() => {
    if (issues.length > 0 && visible) {
      // Slide in and fade in
      slideAnim.value = withTiming(0, { duration: 300 });
      fadeAnim.value = withTiming(1, { duration: 300 });
    }
  }, [issues.length, visible]);

  if (issues.length === 0 || !visible) {
    return null;
  }

  // Categorize issues
  const errorIssues = issues.filter(issue => issue.severity === 'error');
  const warningIssues = issues.filter(issue => issue.severity === 'warning');
  const infoIssues = issues.filter(issue => issue.severity === 'info');

  // Determine banner type based on most severe issue
  const bannerType = errorIssues.length > 0
    ? 'error'
    : warningIssues.length > 0
    ? 'warning'
    : 'info';

  // Get primary issue to display
  const primaryIssue = errorIssues[0] || warningIssues[0] || infoIssues[0];

  const bannerStyles = getBannerStyles(bannerType);

  const getMessage = () => {
    const totalIssues = issues.length;

    if (totalIssues === 1) {
      return primaryIssue.message;
    }

    if (errorIssues.length > 0) {
      return `${errorIssues.length} item${errorIssues.length > 1 ? 's are' : ' is'} unavailable`;
    }

    if (warningIssues.length > 0) {
      return `${warningIssues.length} item${warningIssues.length > 1 ? 's have' : ' has'} low stock`;
    }

    if (infoIssues.length > 0) {
      return `${infoIssues.length} price change${infoIssues.length > 1 ? 's' : ''} detected`;
    }

    return `${totalIssues} issue${totalIssues > 1 ? 's' : ''} found in cart`;
  };

  const getIconName = () => {
    if (errorIssues.length > 0) return 'alert-circle';
    if (warningIssues.length > 0) return 'warning';
    return 'information-circle';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bannerStyles.bgColor,
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: bannerStyles.iconBg }]}>
          <Ionicons
            name={getIconName() as keyof typeof Ionicons.glyphMap}
            size={20}
            color={bannerStyles.color}
          />
        </View>

        <View style={styles.messageContainer}>
          <ThemedText style={[styles.message, { color: bannerStyles.textColor }]} numberOfLines={2}>
            {getMessage()}
          </ThemedText>
          {issues.length > 1 && (
            <ThemedText style={[styles.subMessage, { color: bannerStyles.subTextColor }]}>
              Tap to view details
            </ThemedText>
          )}
        </View>

        <View style={styles.actions}>
          {onViewDetails && (
            <Pressable
              style={styles.actionButton}
              onPress={onViewDetails}
             
            >
              <Ionicons name="chevron-forward" size={20} color={bannerStyles.color} />
            </Pressable>
          )}

          {onDismiss && (
            <Pressable
              style={styles.actionButton}
              onPress={handleDismiss}
             
            >
              <Ionicons name="close" size={20} color={bannerStyles.color} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Progress bar for auto-hide */}
      {autoHide && (
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: bannerStyles.color,
              },
              progressBarStyle,
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

function getBannerStyles(type: 'error' | 'warning' | 'info') {
  switch (type) {
    case 'error':
      return {
        bgColor: colors.errorScale[100],
        iconBg: colors.error,
        color: colors.error,
        textColor: '#991B1B',
        subTextColor: colors.errorScale[700],
      };
    case 'warning':
      return {
        bgColor: colors.tint.amberLight,
        iconBg: colors.warningScale[700],
        color: colors.warningScale[700],
        textColor: colors.brand.amberDark,
        subTextColor: colors.brand.amberDeep,
      };
    case 'info':
      return {
        bgColor: colors.tint.blueLight,
        iconBg: colors.brand.blue,
        color: colors.brand.blue,
        textColor: '#1E40AF',
        subTextColor: colors.brand.blue,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subMessage: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressBar: {
    height: '100%',
  },
});

// Export compact version for inline warnings
export function CompactStockWarning({
  issue,
  onPress,
}: {
  issue: ValidationIssue;
  onPress?: () => void;
}) {
  const iconName = VALIDATION_ISSUE_ICONS[issue.type] as keyof typeof Ionicons.glyphMap;
  const colors = VALIDATION_ISSUE_COLORS[issue.type] as any;

  const iconColor = issue.severity === 'error'
    ? colors.error
    : issue.severity === 'warning'
    ? colors.warning
    : colors.info;

  return (
    <Pressable
      style={[compactStyles.container, { backgroundColor: colors.bg }]}
      onPress={onPress}
     
      disabled={!onPress}
    >
      <Ionicons name={iconName} size={14} color={iconColor} />
      <ThemedText style={[compactStyles.text, { color: iconColor }]} numberOfLines={1}>
        {issue.message}
      </ThemedText>
    </Pressable>
);
}

const compactStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default React.memo(StockWarningBanner);
