/**
 * FAQSection Component
 *
 * Frequently asked questions about Cash Store
 */

import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getFAQS = (currencySymbol: string) => [
  {
    id: 1,
    question: 'How do I earn cashback?',
    answer: 'Simply click on any brand through Cash Store, shop as usual on their website, and complete your purchase. The cashback will be automatically tracked and credited to your ReZ wallet.',
  },
  {
    id: 2,
    question: 'How long does it take to get cashback?',
    answer: 'Cashback tracking typically starts within 24-48 hours. The confirmation time varies by brand - usually 7-30 days. Once confirmed, cashback is instantly credited to your wallet.',
  },
  {
    id: 3,
    question: 'Can I use coupon codes with cashback?',
    answer: 'Yes! You can stack cashback with most coupon codes. However, some exclusive codes may not be compatible. We recommend using our verified codes for guaranteed savings.',
  },
  {
    id: 4,
    question: 'What if my cashback is not tracked?',
    answer: 'If your purchase is not tracked within 48 hours, you can raise a missing cashback claim from the Help section. Make sure you have the order confirmation and clicked through Cash Store.',
  },
  {
    id: 5,
    question: 'How do gift card cashbacks work?',
    answer: 'When you buy a gift card through Cash Store, you earn instant cashback on the purchase. You can then use the gift card on the brand\'s website for additional savings.',
  },
  {
    id: 6,
    question: 'Can I withdraw cashback to my bank?',
    answer: `Yes! Once your cashback is confirmed and in your ReZ wallet, you can withdraw it directly to your linked bank account. Minimum withdrawal amount is ${currencySymbol}10.`,
  },
];

interface FAQItemType {
  id: number;
  question: string;
  answer: string;
}

const FAQItem: React.FC<{
  faq: FAQItemType;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ faq, isExpanded, onToggle }) => (
  <Pressable
    style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
    onPress={onToggle}
   
  >
    <View style={styles.questionRow}>
      <Text style={styles.question}>{faq.question}</Text>
      <View style={[styles.iconContainer, isExpanded && styles.iconContainerExpanded]}>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={isExpanded ? colors.lightMustard : colors.neutral[500]}
        />
      </View>
    </View>
    {isExpanded && (
      <Text style={styles.answer}>{faq.answer}</Text>
    )}
  </Pressable>
);

const FAQSection: React.FC = () => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const FAQS = getFAQS(currencySymbol);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleToggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="help-circle" size={24} color={colors.brand.purpleLight} />
        </View>
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        <Text style={styles.headerSubtitle}>
          Got questions? We've got answers
        </Text>
      </View>

      {/* FAQ List */}
      <View style={styles.faqList}>
        {FAQS.map((faq) => (
          <FAQItem
            key={faq.id}
            faq={faq}
            isExpanded={expandedId === faq.id}
            onToggle={() => handleToggle(faq.id)}
          />
        ))}
      </View>

      {/* Help Link */}
      <Pressable style={styles.helpLink}>
        <Text style={styles.helpLinkText}>Still have questions?</Text>
        <View style={styles.helpButton}>
          <Text style={styles.helpButtonText}>Contact Support</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.lightMustard} />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: colors.background.primary,
    marginTop: 8,
  },
  header: {
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  faqList: {
    gap: 12,
    marginBottom: 24,
  },
  faqItem: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  faqItemExpanded: {
    backgroundColor: colors.linen,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  question: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    paddingRight: 12,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerExpanded: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
  },
  answer: {
    fontSize: 13,
    color: colors.neutral[600],
    lineHeight: 21,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 205, 87, 0.15)',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
  },
  helpLinkText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lightMustard,
  },
});

export default memo(FAQSection);
