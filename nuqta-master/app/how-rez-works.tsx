import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HowNuqtaWorksFlow from '@/components/how-rez-works-flow';
import { colors } from '@/constants/theme';

const HowNuqtaWorksPage: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      <HowNuqtaWorksFlow />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});

export default withErrorBoundary(HowNuqtaWorksPage, 'HowRezWorks');
