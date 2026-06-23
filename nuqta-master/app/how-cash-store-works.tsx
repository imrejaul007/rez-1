import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * How Cash Store Works Page
 *
 * Detailed guide explaining how to earn cashback through Cash Store
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import {
  HowCashStoreWorksHeader,
  CashStoreHeroSection,
  CashStoreStepsSection,
  ExtraWaysToSaveSection,
  CashbackTrackingSection,
  SafetySection,
  FAQSection,
  CashStoreFooterCTA,
} from '@/components/how-cash-store-works';

function HowCashStoreWorksScreen() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />

        {/* Fixed Header */}
        <HowCashStoreWorksHeader />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Hero Section */}
          <CashStoreHeroSection />

          {/* How It Works Steps */}
          <CashStoreStepsSection />

          {/* Extra Ways to Save */}
          <ExtraWaysToSaveSection />

          {/* Cashback Tracking */}
          <CashbackTrackingSection />

          {/* Safety & Security */}
          <SafetySection />

          {/* FAQs */}
          <FAQSection />

          {/* Footer CTA */}
          <CashStoreFooterCTA />
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
});

export default withErrorBoundary(HowCashStoreWorksScreen, 'HowCashStoreWorks');
