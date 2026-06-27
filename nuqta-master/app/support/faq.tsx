// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// FAQ Page
// Comprehensive Frequently Asked Questions page with search and categories

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, StatusBar, Platform, RefreshControl, TextInput, ActivityIndicator, Animated, LayoutAnimation } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import supportService, { FAQ, FAQCategory } from '@/services/supportApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Gradients, Spacing } from '@/constants/DesignSystem';
import { SectionListSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function FAQPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Search bar is HIDDEN by default - only shown when user clicks search icon
  const [showSearch, setShowSearch] = useState(false);

  const [allFAQs, setAllFAQs] = useState<FAQ[]>([]);
  const [displayedFAQs, setDisplayedFAQs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set());

  // Track feedback for FAQs
  const [faqFeedback, setFaqFeedback] = useState<{ [key: string]: boolean | null }>({});
  const isMounted = useIsMounted();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterFAQs();
  }, [selectedCategory, allFAQs, searchQuery]);

  // If FAQ ID is passed in params, expand that FAQ
  useEffect(() => {
    if (params.id && typeof params.id === 'string') {
      setExpandedFAQs(new Set([params.id]));
      // Scroll to that FAQ (implement if needed)
    }
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [faqsResponse, categoriesResponse] = await Promise.all([
        supportService.getAllFAQs(),
        supportService.getFAQCategories(),
      ]);

      if (faqsResponse.success && faqsResponse.data) {
        if (!isMounted()) return;
        setAllFAQs(faqsResponse.data.faqs);
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        if (!isMounted()) return;
        setCategories(categoriesResponse.data.categories);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load FAQs. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const filterFAQs = () => {
    let filtered = allFAQs;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(faq =>
        faq.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setDisplayedFAQs(filtered);
  };

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      // If query is empty, just filter locally
      if (!query.trim()) {
        return;
      }

      // Perform API search for better results
      setSearching(true);
      try {
        const response = await supportService.searchFAQs(query, 50);
        if (response.success && response.data) {
          setDisplayedFAQs(response.data.faqs);
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setSearching(false);
      }
    },
    []
  );

  const toggleFAQ = async (faqId: string) => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

    const newExpanded = new Set(expandedFAQs);
    const wasExpanded = newExpanded.has(faqId);

    if (wasExpanded) {
      newExpanded.delete(faqId);
    } else {
      newExpanded.add(faqId);
      // Track view when FAQ is expanded
      try {
        await supportService.trackFAQView(faqId);
      } catch (error) {
        // silently handle
      }
    }

    if (!isMounted()) return;
    setExpandedFAQs(newExpanded);
  };

  const handleFAQFeedback = async (faqId: string, helpful: boolean) => {
    try {
      await supportService.markFAQHelpful(faqId, helpful);
      if (!isMounted()) return;
      setFaqFeedback(prev => ({ ...prev, [faqId]: helpful }));

      // Show success feedback
      platformAlertSimple('Thank you!', 'Your feedback helps us improve our support.');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  const expandAll = () => {
    setExpandedFAQs(new Set(displayedFAQs.map(faq => faq._id)));
  };

  const collapseAll = () => {
    setExpandedFAQs(new Set());
  };

  const handleBackPress = () => {
    // Check if there's a previous screen to go back to
    if (router.canGoBack()) {
      router.back();
    } else {
      // If no previous screen (e.g., page was refreshed), navigate to account page
      router.push('/account' as any);
    }
  };

  const handleContactSupport = () => {
    // Navigate to support hub for live chat/ticket creation
    router.push('/support' as any);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      order: Colors.secondary[600],
      payment: Colors.primary[500],
      product: Colors.warning,
      account: Colors.error,
      technical: Colors.secondary[500],
      delivery: colors.brand.pink,
      refund: Colors.success,
      other: Colors.gray[600],
    };
    return colors[category.toLowerCase()] || Colors.gray[600];
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      order: 'cube-outline',
      payment: 'card-outline',
      product: 'pricetag-outline',
      account: 'person-outline',
      technical: 'construct-outline',
      delivery: 'car-outline',
      refund: 'arrow-undo-outline',
      other: 'help-circle-outline',
    };
    return icons[category.toLowerCase()] || 'help-circle-outline';
  };

  const renderCategoryFilter = () => {
    const allCategories = [
      { key: 'all', name: 'All', count: allFAQs.length },
      ...categories.map(cat => ({
        key: cat.category.toLowerCase(),
        name: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
        count: cat.count,
      })),
    ];

    return (
      <View style={styles.categoryFilterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          {allCategories.map((category) => (
            <Pressable
              key={category.key}
              style={[
                styles.categoryButton,
                selectedCategory === category.key && styles.selectedCategoryButton,
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Ionicons
                name={getCategoryIcon(category.key) as any}
                size={16}
                color={selectedCategory === category.key ? 'white' : Colors.gray[600]}
              />
              <ThemedText
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category.key && styles.selectedCategoryButtonText,
                ]}
              >
                {category.name}
              </ThemedText>
              {category.count > 0 && (
                <View
                  style={[
                    styles.categoryBadge,
                    selectedCategory === category.key && styles.selectedCategoryBadge,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.categoryBadgeText,
                      selectedCategory === category.key && styles.selectedCategoryBadgeText,
                    ]}
                  >
                    {category.count}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFAQListItem = useCallback(({ item }: { item: FAQ }) => renderFAQItem(item), [expandedFAQs, faqFeedback]);

  const renderFAQItem = (faq: FAQ) => {
    const isExpanded = expandedFAQs.has(faq._id);
    const categoryColor = getCategoryColor(faq.category);
    const feedback = faqFeedback[faq._id];

    return (
      <View
        key={faq._id}
        style={[styles.faqItem, isExpanded && styles.expandedFAQItem]}
      >
        <Pressable
          style={styles.faqHeader}
          onPress={() => toggleFAQ(faq._id)}
         
        >
          <View style={styles.questionContainer}>
            <View
              style={[
                styles.categoryIndicator,
                { backgroundColor: `${categoryColor}20` },
              ]}
            >
              <Ionicons
                name={getCategoryIcon(faq.category) as any}
                size={14}
                color={categoryColor}
              />
            </View>
            <ThemedText style={styles.questionText}>{faq.question}</ThemedText>
          </View>
          <Animated.View
            style={[
              styles.expandIcon,
              { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] },
            ]}
          >
            <Ionicons name="chevron-down" size={20} color={Colors.gray[600]} />
          </Animated.View>
        </Pressable>

        {isExpanded && (
          <View style={styles.faqContent}>
            <ThemedText style={styles.answerText}>{faq.answer}</ThemedText>

            {/* View count and helpful stats */}
            <View style={styles.faqMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={14} color={Colors.gray[400]} />
                <ThemedText style={styles.metaText}>{faq.viewCount} views</ThemedText>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="thumbs-up-outline" size={14} color={Colors.success} />
                <ThemedText style={styles.metaText}>{faq.helpfulCount}</ThemedText>
              </View>
              <View style={styles.categoryTag}>
                <ThemedText style={[styles.categoryTagText, { color: categoryColor }]}>
                  {faq.category}
                </ThemedText>
              </View>
            </View>

            {/* Helpful feedback */}
            {feedback === null || feedback === undefined ? (
              <View style={styles.feedbackContainer}>
                <ThemedText style={styles.feedbackQuestion}>Was this helpful?</ThemedText>
                <View style={styles.feedbackButtons}>
                  <Pressable
                    style={styles.feedbackButton}
                    onPress={() => handleFAQFeedback(faq._id, true)}
                  >
                    <Ionicons name="thumbs-up-outline" size={20} color={Colors.success} />
                    <ThemedText style={[styles.feedbackButtonText, { color: Colors.success }]}>
                      Yes
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.feedbackButton}
                    onPress={() => handleFAQFeedback(faq._id, false)}
                  >
                    <Ionicons name="thumbs-down-outline" size={20} color={Colors.error} />
                    <ThemedText style={[styles.feedbackButtonText, { color: Colors.error }]}>
                      No
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.feedbackThanks}>
                <Ionicons
                  name={feedback ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={feedback ? Colors.success : Colors.error}
                />
                <ThemedText style={styles.feedbackThanksText}>
                  Thank you for your feedback!
                </ThemedText>
              </View>
            )}

            {/* Related questions */}
            {faq.relatedQuestions && faq.relatedQuestions.length > 0 && (
              <View style={styles.relatedQuestions}>
                <ThemedText style={styles.relatedTitle}>Related Questions:</ThemedText>
                {faq.relatedQuestions.slice(0, 3).map((relatedFaq) => (
                  <Pressable
                    key={relatedFaq._id}
                    style={styles.relatedItem}
                    onPress={() => toggleFAQ(relatedFaq._id)}
                  >
                    <Ionicons name="arrow-forward" size={14} color={Colors.secondary[600]} />
                    <ThemedText style={styles.relatedText} numberOfLines={1}>
                      {relatedFaq.question}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.secondary[600]} translucent={true} />

        {/* Header */}
        <LinearGradient colors={Gradients.nileBlue as unknown as string[]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={handleBackPress} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color="white" />
            </View>
          </Pressable>

          <View style={styles.headerTitleSection}>
            <ThemedText style={styles.headerTitle}>FAQs</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Find answers to common questions
            </ThemedText>
          </View>

          <Pressable
            style={styles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name={showSearch ? 'close' : 'search'} size={22} color="white" />
            </View>
          </Pressable>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={Colors.gray[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search FAQs..."
                placeholderTextColor={Colors.gray[400]}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={Colors.gray[400]} />
                </Pressable>
              )}
              {searching && <ActivityIndicator size="small" color={Colors.secondary[600]} />}
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Controls */}
      <View style={styles.controls}>
        <ThemedText style={styles.controlsInfo}>
          Showing {displayedFAQs.length} of {allFAQs.length} questions
        </ThemedText>
        <View style={styles.controlButtons}>
          <Pressable style={styles.controlButton} onPress={expandAll}>
            <Ionicons name="chevron-down-circle-outline" size={16} color={Colors.secondary[600]} />
            <ThemedText style={styles.controlButtonText}>Expand All</ThemedText>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={collapseAll}>
            <Ionicons name="chevron-up-circle-outline" size={16} color={Colors.secondary[600]} />
            <ThemedText style={styles.controlButtonText}>Collapse All</ThemedText>
          </Pressable>
        </View>
      </View>

      {/* FAQ List */}
      {loading ? (
        <SectionListSkeleton />
      ) : (
        <FlashList
          data={displayedFAQs}
          keyExtractor={(item) => item._id}
          renderItem={renderFAQListItem}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={80}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={Colors.gray[300]} />
              <ThemedText style={styles.emptyStateTitle}>No FAQs Found</ThemedText>
              <ThemedText style={styles.emptyStateText}>
                {searchQuery
                  ? `No results found for "${searchQuery}"`
                  : 'No questions found for this category.'}
              </ThemedText>
              {searchQuery && (
                <Pressable
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <ThemedText style={styles.clearSearchText}>Clear Search</ThemedText>
                </Pressable>
              )}
            </View>
          }
          ListFooterComponent={
            <>
              {/* Contact Support Card */}
              <Pressable style={styles.contactCard} onPress={handleContactSupport}>
                <LinearGradient colors={Gradients.nileBlue as unknown as string[]} style={styles.contactGradient}>
                  <View style={styles.contactContent}>
                    <Ionicons name="chatbubble-ellipses" size={24} color="white" />
                    <View style={styles.contactText}>
                      <ThemedText style={styles.contactTitle}>Still need help?</ThemedText>
                      <ThemedText style={styles.contactDescription}>
                        Chat with our support team
                      </ThemedText>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </View>
                </LinearGradient>
              </Pressable>
              <View style={styles.footer} />
            </>
          }
        />
      )}
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 12,
  },
  searchButton: {
    marginLeft: 12,
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleSection: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  searchBarContainer: {
    marginTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.secondary[600],
  },
  categoryFilterWrapper: {
    backgroundColor: Colors.gray[50],
  },
  categoryFilter: {
    flexGrow: 0,
    paddingVertical: 16,
  },
  categoryFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    backgroundColor: 'white',
    gap: 6,
    height: 42,
  },
  selectedCategoryButton: {
    backgroundColor: Colors.secondary[600],
    borderColor: Colors.secondary[600],
    shadowColor: Colors.secondary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray[600],
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
  categoryBadge: {
    backgroundColor: Colors.gray[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  selectedCategoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gray[600],
  },
  selectedCategoryBadgeText: {
    color: 'white',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  controlsInfo: {
    fontSize: 12,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlButtonText: {
    fontSize: 12,
    color: Colors.secondary[600],
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  faqList: {
    padding: 16,
  },
  faqItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  expandedFAQItem: {
    borderColor: Colors.secondary[600],
    backgroundColor: Colors.background.secondary,
    shadowOpacity: 0.12,
    elevation: 4,
    borderWidth: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  questionContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[600],
    lineHeight: 22,
  },
  expandIcon: {
    marginLeft: 12,
  },
  faqContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[50],
  },
  answerText: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 24,
    paddingTop: 16,
    marginBottom: 16,
  },
  faqMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.gray[400],
  },
  categoryTag: {
    backgroundColor: Colors.gray[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  feedbackContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  feedbackQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[600],
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    backgroundColor: 'white',
  },
  feedbackButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackThanks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.background.accent,
    borderRadius: 8,
    marginTop: 8,
  },
  feedbackThanksText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '500',
  },
  relatedQuestions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[600],
    marginBottom: 12,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  relatedText: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondary[600],
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 80,
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray[600],
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray[600],
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: Colors.gray[400],
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  clearSearchButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: Colors.secondary[600],
    borderRadius: 12,
    shadowColor: Colors.secondary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  clearSearchText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  contactCard: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.secondary[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  contactGradient: {
    padding: 20,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  footer: {
    height: 40,
  },
});

export default withErrorBoundary(FAQPage, 'SupportFaq');
