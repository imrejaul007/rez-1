/**
 * MoreForYouSection - Collapsible utility group
 * Contains Profile, Scratch Card, Refer, Orders, Wishlist, Saved Address, Ring Sizer
 */
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';

// Enable layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MoreForYouOption {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: string;
}

interface MoreForYouSectionProps {
  options: MoreForYouOption[];
  initialExpanded?: boolean;
}

export const MoreForYouSection: React.FC<MoreForYouSectionProps> = ({
  options,
  initialExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.create(
      350,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ));
    setExpanded(prev => !prev);
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={toggleExpand}
       
        accessibilityRole="button"
        accessibilityLabel={`More for you. ${expanded ? 'Collapse' : 'Expand'}`}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="grid-outline" size={18} color={Colors.nileBlue} />
          <ThemedText style={styles.headerTitle}>More for You</ThemedText>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.text.tertiary}
        />
      </Pressable>

      {expanded && (
        <View style={styles.optionsList}>
          {options.map((option, index) => (
            <Pressable
              key={option.id}
              style={[styles.optionRow, index < options.length - 1 && styles.optionBorder]}
              onPress={option.onPress}
             
              accessibilityLabel={option.title}
              accessibilityHint={option.subtitle}
              accessibilityRole="button"
            >
              <View style={styles.optionIconBg}>
                <Ionicons name={option.icon} size={18} color={Colors.nileBlue} />
              </View>
              <View style={styles.optionContent}>
                <ThemedText style={styles.optionTitle}>{option.title}</ThemedText>
                <ThemedText style={styles.optionSubtitle}>{option.subtitle}</ThemedText>
              </View>
              {option.badge && (
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>{option.badge}</ThemedText>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  optionsList: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  optionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.background.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  optionSubtitle: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  badge: {
    backgroundColor: Colors.lightMustard + '30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
});

export default React.memo(MoreForYouSection);
