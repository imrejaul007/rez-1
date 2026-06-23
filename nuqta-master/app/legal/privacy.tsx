import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Privacy Policy Page
// Privacy policy with section navigation

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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

const PRIVACY_CONTENT = {
  lastUpdated: '2024-12-01',
  summary: 'We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information.',
  sections: [
    {
      title: 'Information We Collect',
      icon: 'document-text-outline',
      content: `We collect information you provide directly:

• Account Information: Name, email, phone number, profile photo
• Transaction Data: Purchase history, payment methods, order details
• Location Data: With your permission, to show nearby offers
• Device Information: Device type, OS version, app version
• Usage Data: App interactions, preferences, search history

We may also collect data automatically through cookies and similar technologies.`,
    },
    {
      title: 'How We Use Your Data',
      icon: 'analytics-outline',
      content: `Your data helps us provide and improve our services:

• Process transactions and deliver rewards
• Personalize your experience and recommendations
• Send notifications about offers and updates
• Prevent fraud and ensure security
• Analyze usage patterns to improve the app
• Comply with legal requirements
• Communicate about your account`,
    },
    {
      title: 'Data Sharing',
      icon: 'share-social-outline',
      content: `We may share your information with:

• Partner Merchants: To process transactions and rewards
• Payment Processors: To handle secure payments
• Service Providers: Who help us operate the app
• Legal Authorities: When required by law
• Business Transfers: In case of merger or acquisition

We do NOT sell your personal data to third parties for marketing purposes.`,
    },
    {
      title: 'Data Security',
      icon: 'shield-checkmark-outline',
      content: `We implement robust security measures:

• Encryption of sensitive data in transit and at rest
• Regular security audits and vulnerability assessments
• Access controls and authentication requirements
• Secure payment processing through certified providers
• Employee training on data protection

However, no method of transmission is 100% secure.`,
    },
    {
      title: 'Your Rights',
      icon: 'person-outline',
      content: `You have the right to:

• Access: Request a copy of your personal data
• Correction: Update or correct inaccurate data
• Deletion: Request deletion of your data
• Portability: Receive your data in a portable format
• Objection: Object to certain processing activities
• Withdrawal: Withdraw consent at any time

Contact us at privacy@rezapp.com to exercise these rights.`,
    },
    {
      title: 'Cookies & Tracking',
      icon: 'cookie-outline',
      content: `We use cookies and similar technologies to:

• Remember your preferences
• Analyze app performance
• Personalize content and ads
• Measure marketing effectiveness

You can manage cookie preferences in your device settings.`,
    },
    {
      title: 'Data Retention',
      icon: 'time-outline',
      content: `We retain your data for:

• As long as your account is active
• As required to provide services
• As necessary to comply with legal obligations
• To resolve disputes and enforce agreements

You can request deletion by contacting support.`,
    },
    {
      title: 'Children\'s Privacy',
      icon: 'people-outline',
      content: `Our app is not intended for children under 18. We do not knowingly collect data from children. If you believe we have collected data from a child, please contact us immediately.`,
    },
    {
      title: 'Contact Us',
      icon: 'mail-outline',
      content: `For privacy-related inquiries:

Email: privacy@rezapp.com
Data Protection Officer: dpo@rezapp.com
Address: ${BRAND.APP_NAME} Technologies Pvt Ltd, Bangalore, India

We aim to respond within 30 days.`,
    },
  ],
};

function PrivacyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

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
            <ThemedText style={styles.headerTitle}>Privacy Policy</ThemedText>
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
          <ThemedText style={styles.headerTitle}>Privacy Policy</ThemedText>
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
        {/* Last Updated */}
        <View style={styles.updateBadge}>
          <Ionicons name="time-outline" size={16} color={Colors.text.tertiary} />
          <ThemedText style={styles.updateText}>
            Last updated: {PRIVACY_CONTENT.lastUpdated}
          </ThemedText>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Ionicons name="shield-checkmark" size={32} color={Colors.primary[600]} />
          <ThemedText style={styles.summaryText}>
            {PRIVACY_CONTENT.summary}
          </ThemedText>
        </View>

        {/* Sections */}
        {PRIVACY_CONTENT.sections.map((section, index) => (
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
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={section.icon as any}
                    size={24}
                    color={Colors.primary[600]}
                  />
                </View>
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
            Your privacy matters to us. If you have questions, please contact our Privacy Team.
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
  summaryCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  summaryText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: 22,
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(PrivacyPage, 'LegalPrivacy');
