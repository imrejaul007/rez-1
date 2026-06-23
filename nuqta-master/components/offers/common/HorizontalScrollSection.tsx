/**
 * HorizontalScrollSection Component
 *
 * Wrapper for horizontal scrollable sections
 */

import React from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Spacing } from '@/constants/DesignSystem';

interface HorizontalScrollSectionProps {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  showsScrollIndicator?: boolean;
  gap?: number;
  paddingHorizontal?: number;
}

export const HorizontalScrollSection: React.FC<HorizontalScrollSectionProps> = ({
  children,
  contentContainerStyle,
  showsScrollIndicator = false,
  gap = Spacing.md,
  paddingHorizontal = Spacing.base,
}) => {
  const styles = StyleSheet.create({
    scrollView: {
      flexGrow: 0,
    },
    contentContainer: {
      paddingHorizontal,
      gap,
      flexDirection: 'row',
      paddingBottom: Spacing.xs,
    },
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={showsScrollIndicator}
      style={styles.scrollView}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      decelerationRate="fast"
      snapToAlignment="start"
    >
      {children}
    </ScrollView>
  );
};

export default React.memo(HorizontalScrollSection);
