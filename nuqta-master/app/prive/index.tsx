import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Privé Home Screen
 *
 * Main landing page for Privé tab - displays the full Privé dashboard
 * using the existing PriveSectionContainer component.
 */

import { colors } from '@/constants/theme';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PriveSectionContainer } from '@/components/prive/PriveSectionContainer';

function PriveHomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PriveSectionContainer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midGrayAlt,
  },
});

export default withErrorBoundary(PriveHomeScreen, 'PriveIndex');
