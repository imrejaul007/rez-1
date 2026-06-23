import { withErrorBoundary } from '@/utils/withErrorBoundary';
// FAQ Page
// Frequently Asked Questions with search and categories

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import supportService, { FAQ as FAQType, FAQCategory } from '@/services/supportApi';
import { SectionListSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function FAQPage() {
  const isMounted = useIsMounted();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState<FAQType[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchFAQs();
    } else if (searchQuery.length === 0) {
      loadData();
    }
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [faqsResponse, categoriesResponse] = await Promise.all([
        supportService.getAllFAQs(selectedCategory || undefined),
        supportService.getFAQCategories(),
      ]);

      if (faqsResponse.success && faqsResponse.data) {
        if (!isMounted()) return;
        setFaqs(faqsResponse.data.faqs);
      } else {
        throw new Error(faqsResponse.error || 'Failed to fetch FAQs');
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        if (!isMounted()) return;
        setCategories(categoriesResponse.data.categories);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : 'Failed to load FAQs');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  const searchFAQs = async () => {
    try {
      const response = await supportService.searchFAQs(searchQuery, 50);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setFaqs(response.data.faqs);
      }
    } catch (err) {
      // silently handle
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setSearchQuery('');
    loadData();
  };

  const handleFAQPress = async (faq: FAQType) => {
    if (expandedFAQ === faq._id) {
      setExpandedFAQ(null);
    } else {
      setExpandedFAQ(faq._id);

      // Track view
      try {
        await supportService.trackFAQView(faq._id);
      } catch (err) {
        // silently handle
      }
    }
  };

  const handleHelpful = async (faqId: string, helpful: boolean) => {
    try {
      await supportService.markFAQHelpful(faqId, helpful);
    } catch (err) {
      // silently handle
    }
  };

  const renderCategory = (category: FAQCategory, index: number) => (
    <Pressable
      key={index}
      style={[
        styles.categoryChip,
        selectedCategory === category.category && styles.categoryChipActive,
      ]}
      onPress={() => handleCategorySelect(category.category)}
      accessible={true}
      accessibilityLabel={`${category.category} category, ${category.count} FAQs`}
      accessibilityRole="button"
      accessibilityState={{ selected: selectedCategory === category.category }}
      accessibilityHint={`Filter FAQs by ${category.category}`}
    >
      <ThemedText
        style={[
          styles.categoryText,
          selectedCategory === category.category && styles.categoryTextActive,
        ]}
      >
        {category.category} ({category.count})
      </ThemedText>
    </Pressable>
  );

  const renderFAQ = (faq: FAQType) => {
    const isExpanded = expandedFAQ === faq._id;

    return (
      <View key={faq._id} style={styles.faqCard}>
        <Pressable
          style={styles.faqHeader}
          onPress={() => handleFAQPress(faq)}
         
          accessible={true}
          accessibilityLabel={`FAQ: ${faq.question}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityHint={isExpanded ? "Collapse answer" : "Expand to view answer"}
        >
          <View style={styles.faqIcon}>
            <Ionicons name="help-circle" size={24} color={Colors.info} />
          </View>
          <ThemedText style={styles.faqQuestion}>{faq.question}</ThemedText>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.text.tertiary}
          />
        </Pressable>

        {isExpanded && (
          <View style={styles.faqContent}>
            <ThemedText style={styles.faqAnswer}>{faq.answer}</ThemedText>

            {faq.tags && faq.tags.length > 0 && (
              <View style={styles.faqTags}>
                {faq.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <ThemedText style={styles.tagText}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.faqFooter}>
              <ThemedText style={styles.helpfulText}>Was this helpful?</ThemedText>
              <View style={styles.helpfulButtons}>
                <Pressable
                  style={styles.helpfulButton}
                  onPress={() => handleHelpful(faq._id, true)}
                  accessible={true}
                  accessibilityLabel={`Mark as helpful, ${faq.helpfulCount} users found this helpful`}
                  accessibilityRole="button"
                  accessibilityHint="Rate this FAQ as helpful"
                >
                  <Ionicons name="thumbs-up-outline" size={18} color={Colors.success} />
                  <ThemedText style={styles.helpfulCount}>{faq.helpfulCount}</ThemedText>
                </Pressable>
                <Pressable
                  style={styles.helpfulButton}
                  onPress={() => handleHelpful(faq._id, false)}
                  accessible={true}
                  accessibilityLabel={`Mark as not helpful, ${faq.notHelpfulCount} users found this not helpful`}
                  accessibilityRole="button"
                  accessibilityHint="Rate this FAQ as not helpful"
                >
                  <Ionicons name="thumbs-down-outline" size={18} color={Colors.error} />
                  <ThemedText style={styles.helpfulCount}>{faq.notHelpfulCount}</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && !faqs.length) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <LinearGradient colors={['#667eea', '#764ba2'] as const} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              accessible={true}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityHint="Navigate to previous screen"
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.headerTitle} accessible={true} accessibilityRole="header">FAQs</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <SectionListSkeleton />
      </View>
    );
  }

  if (error && !faqs.length) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <LinearGradient colors={['#667eea', '#764ba2'] as const} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>FAQs</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={loadData}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" translucent={true} />

      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2'] as const} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>FAQs</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessible={true}
            accessibilityLabel="Search FAQs"
            accessibilityRole="search"
            accessibilityHint="Enter keywords to search frequently asked questions"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              accessible={true}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              accessibilityHint="Clear the search field"
            >
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Categories */}
        {categories.length > 0 && !searchQuery && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
            >
              <Pressable
                style={[
                  styles.categoryChip,
                  selectedCategory === null && styles.categoryChipActive,
                ]}
                onPress={() => handleCategorySelect(null)}
              >
                <ThemedText
                  style={[
                    styles.categoryText,
                    selectedCategory === null && styles.categoryTextActive,
                  ]}
                >
                  All
                </ThemedText>
              </Pressable>
              {categories.map(renderCategory)}
            </ScrollView>
          </View>
        )}

        {/* FAQs List */}
        <View style={styles.section}>
          {searchQuery && (
            <ThemedText style={styles.resultsText}>
              {faqs.length} result{faqs.length !== 1 ? 's' : ''} for "{searchQuery}"
            </ThemedText>
          )}
          {faqs.length > 0 ? (
            faqs.map(renderFAQ)
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={Colors.border.default} />
              <ThemedText style={styles.emptyTitle}>No FAQs Found</ThemedText>
              <ThemedText style={styles.emptyDescription}>
                Try adjusting your search or browsing different categories
              </ThemedText>
            </View>
          )}
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <View style={styles.contactCard}>
            <Ionicons name="chatbubbles" size={32} color="#667eea" />
            <View style={styles.contactContent}>
              <ThemedText style={styles.contactTitle}>Still need help?</ThemedText>
              <ThemedText style={styles.contactDescription}>
                Contact our support team for personalized assistance
              </ThemedText>
            </View>
            <Pressable
              style={styles.contactButton}
              onPress={() => router.push('/support' as any)}
              accessible={true}
              accessibilityLabel="Contact support team"
              accessibilityRole="button"
              accessibilityHint="Navigate to support page for personalized assistance"
            >
              <ThemedText style={styles.contactButtonText}>Contact Us</ThemedText>
            </Pressable>
          </View>
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
    marginBottom: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.inverse,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  resultsText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  categoriesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: Spacing.base,
  },
  categoryChip: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  categoryChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  categoryTextActive: {
    color: Colors.text.inverse,
  },
  faqCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  faqIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.tint.blue,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    ...Typography.body,
    fontWeight: '600',
  },
  faqContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  faqAnswer: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Spacing.base,
  },
  faqTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  tag: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  tagText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  faqFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
  },
  helpfulText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  helpfulButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  helpfulCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  contactCard: {
    backgroundColor: colors.tint.blue,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.md,
  },
  contactContent: {
    alignItems: 'center',
  },
  contactTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: Spacing.xs,
  },
  contactDescription: {
    ...Typography.body,
    color: Colors.info,
    textAlign: 'center',
  },
  contactButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  contactButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  errorText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(FAQPage, 'Faq');
