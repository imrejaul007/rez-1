/**
 * SectionHeader Component
 *
 * Reusable section header with title, subtitle, accent line, and "View All" link
 * Follows ReZ brand styling
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { Spacing, Typography, Colors } from '@/constants/DesignSystem';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
  viewAllText?: string;
  rightElement?: React.ReactNode;
  accentColor?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  showViewAll = true,
  onViewAll,
  viewAllText = 'View All',
  rightElement,
  accentColor,
}) => {
  const { theme, isDark } = useOffersTheme();
  const primaryColor = accentColor || theme.colors.accent.secondary; // Nile Blue

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: iconColor
        ? `${iconColor}15`
        : `${primaryColor}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    textContainer: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text.primary,
      letterSpacing: -0.3,
    },
    accentLine: {
      width: 3,
      height: 16,
      backgroundColor: primaryColor,
      borderRadius: 2,
      marginRight: 10,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
      paddingLeft: Spacing.sm,
    },
    viewAllText: {
      fontSize: 13,
      fontWeight: '600',
      color: primaryColor,
      marginRight: 2,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.leftSection}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons
                name={icon}
                size={20}
                color={iconColor || primaryColor}
              />
            </View>
          )}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              {!icon && <View style={styles.accentLine} />}
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {rightElement ? (
          rightElement
        ) : showViewAll && onViewAll ? (
          <Pressable
            style={styles.viewAllButton}
            onPress={onViewAll}
           
          >
            <Text style={styles.viewAllText}>{viewAllText}</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={primaryColor}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

export default React.memo(SectionHeader);
