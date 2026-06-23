import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FAQItem } from '@/types/partner.types';
import { colors } from '@/constants/theme';

interface FAQAccordionProps {
  faqs: FAQItem[];
  onContactPress?: () => void;
}

interface AccordionItemProps {
  faq: FAQItem;
  isExpanded: boolean;
  onToggle: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ faq, isExpanded, onToggle }) => {
  const getCategoryColor = (category: FAQItem['category']) => {
    switch (category) {
      case 'general':
        return colors.brand.green;
      case 'transactions':
        return colors.successScale[400];
      case 'rewards':
        return colors.warningScale[400];
      case 'levels':
        return colors.error;
      default:
        return colors.neutral[500];
    }
  };

  const getCategoryIcon = (category: FAQItem['category']) => {
    switch (category) {
      case 'general':
        return 'information-circle-outline';
      case 'transactions':
        return 'card-outline';
      case 'rewards':
        return 'gift-outline';
      case 'levels':
        return 'trophy-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const handleToggle = () => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    onToggle();
  };

  return (
    <View style={[styles.accordionItem, isExpanded && styles.expandedAccordionItem]}>
      <Pressable
        style={styles.accordionHeader}
        onPress={handleToggle}
       
        accessibilityLabel={`${faq.question}. ${isExpanded ? 'Expanded' : 'Collapsed'}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to expand or collapse this FAQ"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.questionContainer}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(faq.category) + '20' }]}>
            <Ionicons 
              name={getCategoryIcon(faq.category) as any} 
              size={14} 
              color={getCategoryColor(faq.category)} 
            />
          </View>
          <Text style={styles.questionText}>{faq.question}</Text>
        </View>
        <Animated.View style={[
          styles.expandIcon,
          { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }
        ]}>
          <Ionicons name="chevron-down" size={20} color={colors.neutral[500]} />
        </Animated.View>
      </Pressable>

      {isExpanded && (
        <View style={styles.accordionContent}>
          <Text style={styles.answerText}>{faq.answer}</Text>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryText, { color: getCategoryColor(faq.category) }]}>
              {faq.category.charAt(0).toUpperCase() + faq.category.slice(1)} • FAQ #{faq.id.split('-')[1]}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

function FAQAccordion({ faqs, onContactPress }: FAQAccordionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { key: 'all', name: 'All', icon: 'apps-outline', color: colors.neutral[500] },
    { key: 'general', name: 'General', icon: 'information-circle-outline', color: colors.brand.green },
    { key: 'transactions', name: 'Transactions', icon: 'card-outline', color: colors.successScale[400] },
    { key: 'rewards', name: 'Rewards', icon: 'gift-outline', color: colors.warningScale[400] },
    { key: 'levels', name: 'Levels', icon: 'trophy-outline', color: colors.error },
  ];

  const filteredFAQs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  const toggleItem = (faqId: string) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(faqId)) {
      newExpandedItems.delete(faqId);
    } else {
      newExpandedItems.add(faqId);
    }
    setExpandedItems(newExpandedItems);
  };

  const expandAll = () => {
    setExpandedItems(new Set(filteredFAQs.map(faq => faq.id)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <LinearGradient
            colors={[colors.brand.green, colors.brand.teal]}
            style={styles.headerIconGradient}
          >
            <Ionicons name="help-circle" size={20} color="white" />
          </LinearGradient>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>FAQs</Text>
          <Text style={styles.headerSubtitle}>Frequently asked questions about partner rewards</Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        {categories.map((category) => (
          <Pressable
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && styles.selectedCategoryButton,
              { borderColor: category.color }
            ]}
            onPress={() => setSelectedCategory(category.key)}
            accessibilityLabel={`${category.name} category`}
            accessibilityRole="button"
            accessibilityHint={`Double tap to filter FAQs by ${category.name}`}
            accessibilityState={{ selected: selectedCategory === category.key }}
          >
            <Ionicons 
              name={category.icon as any} 
              size={16} 
              color={selectedCategory === category.key ? 'white' : category.color} 
            />
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.key && styles.selectedCategoryButtonText,
              { color: selectedCategory === category.key ? 'white' : category.color }
            ]}>
              {category.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        <Text style={styles.controlsInfo}>
          Showing {filteredFAQs.length} of {faqs.length} questions
        </Text>
        <View style={styles.controlButtons}>
          <Pressable
            style={styles.controlButton}
            onPress={expandAll}
            accessibilityLabel="Expand all FAQs"
            accessibilityRole="button"
            accessibilityHint="Double tap to expand all FAQ items"
          >
            <Ionicons name="chevron-down-circle-outline" size={16} color={colors.brand.green} />
            <Text style={styles.controlButtonText}>Expand All</Text>
          </Pressable>
          <Pressable
            style={styles.controlButton}
            onPress={collapseAll}
            accessibilityLabel="Collapse all FAQs"
            accessibilityRole="button"
            accessibilityHint="Double tap to collapse all FAQ items"
          >
            <Ionicons name="chevron-up-circle-outline" size={16} color={colors.brand.green} />
            <Text style={styles.controlButtonText}>Collapse All</Text>
          </Pressable>
        </View>
      </View>

      {/* FAQ List */}
      <ScrollView 
        style={styles.faqList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.faqListContent}
      >
        {filteredFAQs.length > 0 ? (
          filteredFAQs.map((faq, index) => (
            <AccordionItem
              key={faq.id}
              faq={faq}
              isExpanded={expandedItems.has(faq.id)}
              onToggle={() => toggleItem(faq.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyStateTitle}>No FAQs Found</Text>
            <Text style={styles.emptyStateText}>
              No questions found for the selected category.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Contact Support */}
      <Pressable
        style={styles.contactButton}
        onPress={onContactPress}
       
        accessibilityLabel="Contact support"
        accessibilityRole="button"
        accessibilityHint="Double tap to chat with support"
      >
        <LinearGradient
          colors={[colors.brand.green, colors.brand.teal]}
          style={styles.contactButtonGradient}
        >
          <View style={styles.contactButtonContent}>
            <View style={styles.contactButtonLeft}>
              <Ionicons name="chatbubble-ellipses" size={20} color="white" />
              <Text style={styles.contactButtonText}>Still have doubts chat us</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    marginRight: 12,
  },
  headerIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  categoryFilter: {
    marginBottom: 16,
  },
  categoryFilterContent: {
    paddingRight: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: 'white',
  },
  selectedCategoryButton: {
    backgroundColor: colors.brand.green,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  controlsInfo: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 12,
    color: colors.brand.green,
    fontWeight: '500',
    marginLeft: 4,
  },
  faqList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  faqListContent: {
    paddingBottom: 10,
  },
  accordionItem: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  expandedAccordionItem: {
    borderColor: colors.brand.green,
    backgroundColor: colors.tint.coolGray,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  questionContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    flex: 1,
    lineHeight: 20,
  },
  expandIcon: {
    marginLeft: 12,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  answerText: {
    fontSize: 14,
    color: colors.neutral[600],
    lineHeight: 22,
    marginBottom: 12,
  },
  categoryInfo: {
    alignItems: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[400],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.neutral[300],
    textAlign: 'center',
    lineHeight: 20,
  },
  contactButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactButtonGradient: {
    padding: 16,
  },
  contactButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});

export default React.memo(FAQAccordion);
