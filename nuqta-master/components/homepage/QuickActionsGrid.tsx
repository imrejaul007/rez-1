/**
 * QuickActionsGrid Component
 *
 * Extracted from app/(tabs)/index.tsx (lines 599-702)
 * Displays quick action buttons for tracking, wallet, offers, and store
 *
 * @component
 */

import React from 'react';
import { View, Pressable, Platform, StyleSheet, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

/**
 * Quick Action Item Interface
 */
export interface QuickAction {
  /** Unique identifier for the action */
  id: string;
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Label text */
  label: string;
  /** Value to display (e.g., '3 Active', '₹ 1,250') */
  value: string;
  /** Callback when action is pressed */
  onPress: () => void;
  /** Accessibility label */
  accessibilityLabel: string;
  /** Accessibility hint */
  accessibilityHint: string;
  /** Whether to use iOS-specific wrapper */
  useIOSWrapper?: boolean;
}

/**
 * QuickActionsGrid Props Interface
 */
export interface QuickActionsGridProps {
  /** Array of quick action items */
  actions: QuickAction[];
  /** Custom container styles */
  style?: any;
}

/**
 * QuickActionsGrid Component
 *
 * Renders a horizontal grid of quick action buttons with:
 * - Icon
 * - Label
 * - Value/status
 * - Tap handling
 */
export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ actions, style }) => {
  return (
    <View style={[styles.quickActions, style]}>
      {actions.map((action) => (
        <View key={action.id} style={styles.actionItem}>
          {action.useIOSWrapper ? (
            <Pressable
              style={Platform.OS === 'ios' ? styles.iosActionWrapper : styles.defaultActionWrapper}
              onPress={() => {
                try {
                  if (Platform.OS === 'ios') {
                    InteractionManager.runAfterInteractions(() => {
                      action.onPress();
                    });
                  } else {
                    action.onPress();
                  }
                } catch (error) {
                  // silently handle
                }
              }}
             
              accessibilityLabel={action.accessibilityLabel}
              accessibilityRole="button"
              accessibilityHint={action.accessibilityHint}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={24} color={colors.darkGray} />
              </View>
              <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
              <ThemedText style={styles.actionValue}>{action.value}</ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={styles.actionTouchable}
              onPress={() => {
                try {
                  action.onPress();
                } catch (error) {
                  // silently handle
                }
              }}
             
              accessibilityLabel={action.accessibilityLabel}
              accessibilityRole="button"
              accessibilityHint={action.accessibilityHint}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={24} color={colors.darkGray} />
              </View>
              <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
              <ThemedText style={styles.actionValue}>{action.value}</ThemedText>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 12,
    elevation: 3,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionTouchable: {
    alignItems: 'center',
    width: '100%',
  },
  iosActionWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  defaultActionWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    color: colors.darkGray,
    fontWeight: '500',
    marginTop: 8,
  },
  actionValue: {
    fontSize: 12,
    color: colors.lightMustard,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});

export default React.memo(QuickActionsGrid);
