// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Help & Support Main Page
// Central hub for user assistance and support

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  route: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  isExpanded?: boolean;
}

interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  iconColor: string;
  itemCount: number;
  route: string;
}

function HelpPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const handleBackPress = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleFAQPress = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const quickActions: QuickAction[] = [
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      icon: 'chatbubble-ellipses',
      iconColor: Colors.success,
      route: '/help/chat',
    },
    {
      id: 'call',
      title: 'Call Support',
      description: 'Speak directly with a support agent',
      icon: 'call',
      iconColor: Colors.info,
      route: '/help/call',
    },
    {
      id: 'email',
      title: 'Email Us',
      description: 'Send us a detailed message',
      icon: 'mail',
      iconColor: Colors.brand.purpleLight,
      route: '/help/email',
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      description: 'Share your thoughts and suggestions',
      icon: 'star',
      iconColor: Colors.warning,
      route: '/help/feedback',
    },
  ];

  const helpCategories: HelpCategory[] = [
    {
      id: 'orders',
      title: 'Orders & Delivery',
      icon: 'bag-handle',
      iconColor: Colors.success,
      itemCount: 12,
      route: '/help/orders',
    },
    {
      id: 'payments',
      title: 'Payments & Refunds',
      icon: 'card',
      iconColor: Colors.info,
      itemCount: 8,
      route: '/help/payments',
    },
    {
      id: 'account',
      title: 'Account & Profile',
      icon: 'person',
      iconColor: Colors.brand.purpleLight,
      itemCount: 6,
      route: '/help/account',
    },
    {
      id: 'technical',
      title: 'Technical Issues',
      icon: 'settings',
      iconColor: Colors.error,
      itemCount: 10,
      route: '/help/technical',
    },
    {
      id: 'features',
      title: 'App Features',
      icon: 'apps',
      iconColor: Colors.warning,
      itemCount: 15,
      route: '/help/features',
    },
    {
      id: 'policies',
      title: 'Policies & Terms',
      icon: 'document-text',
      iconColor: Colors.text.tertiary,
      itemCount: 5,
      route: '/help/policies',
    },
  ];

  const popularFAQs: FAQItem[] = [
    {
      id: 'faq1',
      question: 'How do I track my order?',
      answer: 'You can track your order by going to the "Tracking" section in the app or by clicking on the order number in your order history. You\'ll see real-time updates on your order status, estimated delivery time, and delivery partner information.',
      category: 'orders',
    },
    {
      id: 'faq2',
      question: 'How do I cancel my order?',
      answer: 'You can cancel your order within 5 minutes of placing it by going to "My Orders" and clicking the cancel button. If it\'s been longer than 5 minutes, you can contact our support team for assistance.',
      category: 'orders',
    },
    {
      id: 'faq3',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, UPI, net banking, digital wallets, and cash on delivery. You can manage your payment methods in the "Payment Methods" section of your account.',
      category: 'payments',
    },
    {
      id: 'faq4',
      question: 'How do I get a refund?',
      answer: 'Refunds are processed automatically for cancelled orders. For other refund requests, please contact our support team with your order details. Refunds typically take 3-5 business days to reflect in your account.',
      category: 'payments',
    },
    {
      id: 'faq5',
      question: 'How do I change my delivery address?',
      answer: 'You can update your delivery address during checkout or manage saved addresses in your account settings. Note that address changes may not be possible after the order has been confirmed.',
      category: 'account',
    },
  ];

  const filteredFAQs = popularFAQs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderQuickAction = (action: QuickAction) => (
    <Pressable
      key={action.id}
      style={styles.quickAction}
      onPress={() => router.push(action.route as any)}
     
      accessibilityLabel={`${action.title}. ${action.description}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to access this support option"
    >
      <View style={[styles.quickActionIcon, { backgroundColor: action.iconColor + '15' }]}>
        <Ionicons name={action.icon as any} size={24} color={action.iconColor} />
      </View>
      <ThemedText style={styles.quickActionTitle}>{action.title}</ThemedText>
      <ThemedText style={styles.quickActionDescription}>{action.description}</ThemedText>
    </Pressable>
  );

  const renderHelpCategory = (category: HelpCategory) => (
    <Pressable
      key={category.id}
      style={styles.helpCategory}
      onPress={() => router.push(category.route as any)}
     
      accessibilityLabel={`${category.title} category. ${category.itemCount} articles available`}
      accessibilityRole="button"
      accessibilityHint="Double tap to browse articles in this category"
    >
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryIcon, { backgroundColor: category.iconColor + '15' }]}>
          <Ionicons name={category.icon as any} size={20} color={category.iconColor} />
        </View>

        <View style={styles.categoryText}>
          <ThemedText style={styles.categoryTitle}>{category.title}</ThemedText>
          <ThemedText style={styles.categoryCount}>
            {category.itemCount} articles
          </ThemedText>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
    </Pressable>
  );

  const renderFAQItem = (faq: FAQItem) => {
    const isExpanded = expandedFAQ === faq.id;
    return (
      <Pressable
        key={faq.id}
        style={styles.faqItem}
        onPress={() => handleFAQPress(faq.id)}
       
        accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} FAQ: ${faq.question}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view answer"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.faqHeader}>
          <ThemedText style={styles.faqQuestion}>{faq.question}</ThemedText>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={Colors.text.tertiary}
          />
        </View>

        {isExpanded && (
          <View
            style={styles.faqAnswer}
            accessibilityLabel={`Answer: ${faq.answer}`}
            accessibilityRole="text"
          >
            <ThemedText style={styles.faqAnswerText}>{faq.answer}</ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.brand.purpleLight}
        translucent={false}
      />
      
      {/* Header */}
      <LinearGradient
        colors={[Colors.brand.purpleLight, colors.brand.purpleMedium] as const}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          
          <ThemedText style={styles.headerTitle}>Help & Support</ThemedText>
          
          <View style={styles.headerRight} />
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            accessibilityLabel="Search help articles"
            accessibilityHint="Enter keywords to search for help articles"
            accessibilityRole="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              accessibilityHint="Double tap to clear search text"
            >
              <Ionicons name="close" size={18} color={Colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Get Quick Help</ThemedText>
          <View style={styles.quickActions}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* Help Categories */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Browse by Category</ThemedText>
          <View style={styles.helpCategories}>
            {helpCategories.map(renderHelpCategory)}
          </View>
        </View>

        {/* Popular FAQs */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {searchQuery ? `Search Results (${filteredFAQs.length})` : 'Popular Questions'}
          </ThemedText>
          <View style={styles.faqList}>
            {filteredFAQs.map(renderFAQItem)}
          </View>
          
          {filteredFAQs.length === 0 && searchQuery && (
            <View style={styles.noResults}>
              <Ionicons name="search" size={48} color={Colors.border.default} />
              <ThemedText style={styles.noResultsTitle}>No results found</ThemedText>
              <ThemedText style={styles.noResultsText}>
                Try searching with different keywords or browse our help categories above.
              </ThemedText>
            </View>
          )}
        </View>

        {/* Contact Info */}
        <View style={styles.contactInfo}>
          <ThemedText style={styles.contactTitle}>Still need help?</ThemedText>
          <ThemedText style={styles.contactText}>
            Our support team is available 24/7 to assist you.
          </ThemedText>
          
          <Pressable
            style={styles.contactButton}
            onPress={() => router.push('/help/chat' as any)}
            accessibilityLabel="Contact Support"
            accessibilityRole="button"
            accessibilityHint="Double tap to contact our 24/7 support team"
          >
            <ThemedText style={styles.contactButtonText}>Contact Support</ThemedText>
          </Pressable>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: Spacing.base,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickAction: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  quickActionTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  quickActionDescription: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Help Categories
  helpCategories: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  helpCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  categoryCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  
  // FAQ List
  faqList: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  faqQuestion: {
    flex: 1,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginRight: Spacing.md,
  },
  faqAnswer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  faqAnswerText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  
  // No Results
  noResults: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  noResultsTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  noResultsText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Contact Info
  contactInfo: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  contactTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  contactText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.base,
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  contactButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    ...Typography.bodyLarge,
  },
  
  bottomSpace: {
    height: 20,
  },
});
export default withErrorBoundary(HelpPage, 'HelpIndex');
