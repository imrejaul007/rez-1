import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Terms & Conditions Page
// Terms of service with markdown content viewer

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { SectionListSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

// Mock legal content - in production, fetch from API
const TERMS_CONTENT = {
  lastUpdated: '2024-12-01',
  sections: [
    {
      title: 'Acceptance of Terms',
      content: `By accessing or using the ${BRAND.APP_NAME} application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please do not use the App.

These Terms constitute a legally binding agreement between you and ${BRAND.APP_NAME} Technologies Pvt Ltd ("Company", "we", "us", or "our").`,
    },
    {
      title: 'User Accounts',
      content: `To use certain features of the App, you must register for an account. When you register, you agree to:

• Provide accurate, current, and complete information
• Maintain the security of your account credentials
• Promptly update your information if it changes
• Accept responsibility for all activities under your account
• Notify us immediately of any unauthorized access`,
    },
    {
      title: `${BRAND.COIN_NAME} & Rewards`,
      content: `${BRAND.COIN_NAME} are digital rewards earned through eligible transactions. Key terms:

• Coins have no cash value and cannot be exchanged for currency
• Coins may expire if not used within the specified validity period
• We reserve the right to modify coin values and earning rates
• Fraudulent activities will result in forfeiture of all coins
• Coins are non-transferable except through designated features`,
    },
    {
      title: 'Transactions & Payments',
      content: `When making purchases through the App:

• All prices are displayed in Indian Rupees (INR)
• Payment processing is handled by third-party providers
• You are responsible for all applicable taxes
• Refunds are subject to merchant and our refund policies
• We are not liable for payment processor errors`,
    },
    {
      title: 'User Conduct',
      content: `You agree not to:

• Violate any applicable laws or regulations
• Infringe on intellectual property rights
• Engage in fraudulent or deceptive activities
• Attempt to manipulate the rewards system
• Share account credentials with others
• Use automated systems to access the App
• Post offensive, harmful, or misleading content`,
    },
    {
      title: 'Intellectual Property',
      content: `All content in the App, including text, graphics, logos, and software, is owned by ${BRAND.APP_NAME} Technologies or its licensors. You may not:

• Copy, modify, or distribute our content
• Use our trademarks without permission
• Reverse engineer the App
• Create derivative works`,
    },
    {
      title: 'Limitation of Liability',
      content: `To the maximum extent permitted by law:

• The App is provided "as is" without warranties
• We are not liable for indirect or consequential damages
• Our total liability is limited to the amount you paid us
• We do not guarantee uninterrupted service`,
    },
    {
      title: 'Changes to Terms',
      content: `We may modify these Terms at any time. Changes will be effective upon posting in the App. Continued use after changes constitutes acceptance of the modified Terms.`,
    },
    {
      title: 'Contact Us',
      content: `For questions about these Terms, contact us at:

Email: legal@rezapp.com
Address: ${BRAND.APP_NAME} Technologies Pvt Ltd, Bangalore, India`,
    },
  ],
};

function TermsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  useEffect(() => {
    // Content is static/hardcoded — brief delay for smooth UI transition only
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // Static content, just dismiss the refresh indicator
    setRefreshing(false);
  };

  const toggleSection = (index: number) => {
    setExpandedSection(expandedSection === index ? null : index);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />
        <LinearGradient colors={[Colors.primary[600], Colors.secondary[700]]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Terms & Conditions</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <SectionListSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessible={true}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Terms & Conditions</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Last Updated Badge */}
        <View style={styles.updateBadge}>
          <Ionicons name="time-outline" size={16} color={Colors.text.tertiary} />
          <ThemedText style={styles.updateText}>
            Last updated: {TERMS_CONTENT.lastUpdated}
          </ThemedText>
        </View>

        {/* Table of Contents */}
        <View style={styles.tocCard}>
          <ThemedText style={styles.tocTitle}>Table of Contents</ThemedText>
          {TERMS_CONTENT.sections.map((section, index) => (
            <Pressable
              key={index}
              style={styles.tocItem}
              onPress={() => toggleSection(index)}
            >
              <ThemedText style={styles.tocNumber}>{index + 1}.</ThemedText>
              <ThemedText style={styles.tocText}>{section.title}</ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Sections */}
        {TERMS_CONTENT.sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <Pressable
              style={styles.sectionHeader}
              onPress={() => toggleSection(index)}
              accessible={true}
              accessibilityLabel={`${section.title}, ${expandedSection === index ? 'expanded' : 'collapsed'}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: expandedSection === index }}
            >
              <View style={styles.sectionTitleContainer}>
                <ThemedText style={styles.sectionNumber}>{index + 1}</ThemedText>
                <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
              </View>
              <Ionicons
                name={expandedSection === index ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={Colors.text.tertiary}
              />
            </Pressable>
            {expandedSection === index && (
              <View style={styles.sectionContent}>
                <ThemedText style={styles.sectionText}>{section.content}</ThemedText>
              </View>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            {`By using ${BRAND.APP_NAME}, you agree to these terms.`}
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.base,
  },
  updateText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  tocCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  tocTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tocItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tocNumber: {
    ...Typography.body,
    color: Colors.primary[600],
    fontWeight: '600',
    width: 24,
  },
  tocText: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[100],
    color: Colors.primary[600],
    ...Typography.label,
    textAlign: 'center',
    lineHeight: 28,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: Spacing.md,
  },
  sectionText: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(TermsPage, 'LegalTerms');
