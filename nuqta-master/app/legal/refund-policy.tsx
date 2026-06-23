import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Refund Policy Page
// Refund terms with FAQ accordion

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

const REFUND_CONTENT = {
  lastUpdated: '2024-12-01',
  overview: 'We want you to be completely satisfied with your purchases. If you\'re not happy, we\'re here to help with returns and refunds.',
  sections: [
    {
      title: 'Eligibility for Refunds',
      icon: 'checkmark-circle-outline',
      content: `You may be eligible for a refund if:

• Product is defective or damaged
• Product received is different from what was ordered
• Service was not delivered as described
• Order was cancelled before dispatch
• Quality issues with food or perishable items

Refund requests must be made within 7 days of delivery.`,
    },
    {
      title: 'Non-Refundable Items',
      icon: 'close-circle-outline',
      content: `The following are not eligible for refunds:

• Digital products once downloaded
• Gift cards and vouchers (unless expired unused)
• Customized or personalized items
• Perishable goods after consumption
• Services already rendered
• Items purchased during final sale`,
    },
    {
      title: 'Refund Process',
      icon: 'sync-outline',
      content: `How to request a refund:

1. Go to Orders in your account
2. Select the order you want to refund
3. Choose "Request Refund" and select reason
4. Upload photos if product is damaged
5. Submit your request

We will review and respond within 2-3 business days.`,
    },
    {
      title: 'Refund Timeline',
      icon: 'time-outline',
      content: `Once approved, refunds are processed as follows:

• Original Payment Method: 5-7 business days
• ${BRAND.COIN_NAME}: Instant credit to wallet
• Bank Transfer: 3-5 business days
• Credit/Debit Card: 7-10 business days (depends on bank)

You'll receive email confirmation at each step.`,
    },
    {
      title: `${BRAND.COIN_NAME} Refunds`,
      icon: 'wallet-outline',
      content: `For transactions made with ${BRAND.COIN_NAME}:

• Coins are refunded to your wallet instantly
• Promotional coins may not be refunded
• Expired coins cannot be restored
• Bonus coins earned from purchase are forfeited

Coins refunded maintain their original expiry date.`,
    },
    {
      title: 'Partial Refunds',
      icon: 'pie-chart-outline',
      content: `Partial refunds may be issued when:

• Only some items in order are returned
• Product shows signs of use
• Missing original packaging or tags
• Service was partially delivered
• Promotional discounts were applied`,
    },
  ],
  faqs: [
    {
      question: 'How long do I have to request a refund?',
      answer: 'You have 7 days from the delivery date to request a refund for most items. Food and perishable items must be reported within 24 hours.',
    },
    {
      question: 'Can I get a refund for a service booking?',
      answer: 'Yes, if the service was not provided or was significantly different from what was described. Cancellations made 24+ hours before the appointment receive full refunds.',
    },
    {
      question: 'What if my refund is taking too long?',
      answer: 'If your refund hasn\'t arrived after the expected timeline, please contact our support team with your order ID. Bank processing times may vary.',
    },
    {
      question: 'Can I exchange instead of getting a refund?',
      answer: 'Yes, for most physical products, you can choose to exchange for a different size, color, or product of equal value instead of a refund.',
    },
    {
      question: 'Do I need to return the product for a refund?',
      answer: 'For most refunds, yes. We\'ll provide a prepaid return label. Some low-value items may not require return - we\'ll let you know.',
    },
  ],
};

function RefundPolicyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
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
            <ThemedText style={styles.headerTitle}>Refund Policy</ThemedText>
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
          <ThemedText style={styles.headerTitle}>Refund Policy</ThemedText>
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
            Last updated: {REFUND_CONTENT.lastUpdated}
          </ThemedText>
        </View>

        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <Ionicons name="refresh-circle" size={32} color={Colors.primary[600]} />
          <ThemedText style={styles.overviewText}>
            {REFUND_CONTENT.overview}
          </ThemedText>
        </View>

        {/* Policy Sections */}
        <ThemedText style={styles.sectionHeader}>Policy Details</ThemedText>
        {REFUND_CONTENT.sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <Pressable
              style={styles.sectionTitleRow}
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

        {/* FAQs */}
        <ThemedText style={styles.sectionHeader}>Frequently Asked Questions</ThemedText>
        {REFUND_CONTENT.faqs.map((faq, index) => (
          <View key={index} style={styles.faqCard}>
            <Pressable
              style={styles.faqQuestion}
              onPress={() => toggleFaq(index)}
              accessible={true}
              accessibilityLabel={`${faq.question}, ${expandedFaq === index ? 'expanded' : 'collapsed'}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: expandedFaq === index }}
            >
              <View style={styles.faqIcon}>
                <Ionicons name="help-circle" size={24} color={Colors.info} />
              </View>
              <ThemedText style={styles.faqQuestionText}>{faq.question}</ThemedText>
              <Ionicons
                name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.text.tertiary}
              />
            </Pressable>
            {expandedFaq === index && (
              <View style={styles.faqAnswer}>
                <ThemedText style={styles.faqAnswerText}>{faq.answer}</ThemedText>
              </View>
            )}
          </View>
        ))}

        {/* Contact Support */}
        <View style={styles.supportCard}>
          <Ionicons name="headset" size={32} color={Colors.primary[600]} />
          <View style={styles.supportContent}>
            <ThemedText style={styles.supportTitle}>Need Help?</ThemedText>
            <ThemedText style={styles.supportDescription}>
              Contact our support team for refund assistance
            </ThemedText>
          </View>
          <Pressable
            style={styles.supportButton}
            onPress={() => router.push('/support' as any)}
            accessible={true}
            accessibilityLabel="Contact support"
            accessibilityRole="button"
          >
            <ThemedText style={styles.supportButtonText}>Contact Us</ThemedText>
          </Pressable>
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
  overviewCard: {
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  overviewText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: 22,
  },
  sectionHeader: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  sectionTitleRow: {
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
  faqCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  faqIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqQuestionText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
    fontWeight: '500',
  },
  faqAnswer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: Spacing.md,
  },
  faqAnswerText: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  supportCard: {
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  supportContent: {
    alignItems: 'center',
  },
  supportTitle: {
    ...Typography.h4,
    color: Colors.secondary[700],
    marginBottom: Spacing.xs,
  },
  supportDescription: {
    ...Typography.body,
    color: Colors.secondary[600],
    textAlign: 'center',
  },
  supportButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  supportButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(RefundPolicyPage, 'LegalRefundPolicy');
