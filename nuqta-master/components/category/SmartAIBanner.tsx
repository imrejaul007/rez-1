/**
 * SmartAIBanner Component
 * AI-powered search suggestions banner
 * Adapted from Rez_v-2-main AISuggestions pattern
 */

import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface SmartAIBannerProps {
  categorySlug: string;
  categoryName?: string;
  onSearch?: (query: string) => void;
}

const getAISuggestions = (currencySymbol: string): Record<string, string[]> => ({
  'food-dining': [
    `Find me a romantic dinner spot under ${currencySymbol}2,000`,
    'Best biryani places with 60-min delivery',
    'Healthy lunch options near me',
  ],
  'fashion': [
    `Find me a wedding outfit under ${currencySymbol}10,000`,
    'Trendy streetwear for college',
    'Formal shoes matching navy suit',
  ],
  'beauty-wellness': [
    'Best facial for glowing skin',
    `Organic skincare routine under ${currencySymbol}3,000`,
    'Bridal makeup packages near me',
  ],
  'healthcare': [
    'Vitamins for immunity boost',
    'Best deals on protein supplements',
    'Health checkup packages nearby',
  ],
  'grocery-essentials': [
    `Organic vegetables under ${currencySymbol}500`,
    'Best deals on monthly grocery',
    'Fresh fruits with home delivery',
  ],
  'fitness-sports': [
    `Running shoes under ${currencySymbol}5,000`,
    'Gym equipment for home workout',
    'Yoga accessories near me',
  ],
  'education-learning': [
    'Best coding courses for beginners',
    'Competitive exam preparation',
    'Language learning classes nearby',
  ],
  'home-services': [
    'AC repair services near me',
    'Deep cleaning for 2BHK apartment',
    'Best plumbers with quick service',
  ],
  'travel-experiences': [
    `Weekend getaway under ${currencySymbol}10,000`,
    'Beach destinations near me',
    'Adventure trips with best deals',
  ],
  'entertainment': [
    'Movie tickets with cashback',
    'Live concerts this weekend',
    'Gaming cafes near me',
  ],
  'financial-lifestyle': [
    'Best credit cards with rewards',
    'Mobile recharge offers today',
    'Insurance plans with cashback',
  ],
  default: [
    'Find me the best deals today',
    'Compare prices across stores',
    'Show trending products with cashback',
  ],
});

// Category-specific placeholders
const getPlaceholderText = (currencySymbol: string): Record<string, string> => ({
  'food-dining': `E.g., Biryani places under ${currencySymbol}500...`,
  'fashion': `E.g., Wedding outfit under ${currencySymbol}10,000...`,
  'beauty-wellness': 'E.g., Facial spa near me...',
  'healthcare': 'E.g., Vitamins for immunity...',
  'grocery-essentials': 'E.g., Organic vegetables...',
  'fitness-sports': `E.g., Running shoes under ${currencySymbol}5,000...`,
  'education-learning': 'E.g., Coding courses for beginners...',
  'home-services': 'E.g., AC repair near me...',
  'travel-experiences': `E.g., Weekend getaway under ${currencySymbol}10K...`,
  'entertainment': 'E.g., Movie tickets with cashback...',
  'financial-lifestyle': 'E.g., Best credit card rewards...',
  default: 'E.g., Find the best deals today...',
});

const SmartAIBanner: React.FC<SmartAIBannerProps> = ({
  categorySlug,
  categoryName = 'this category',
  onSearch,
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [query, setQuery] = useState('');
  const AI_SUGGESTIONS = getAISuggestions(currencySymbol);
  const PLACEHOLDER_TEXT = getPlaceholderText(currencySymbol);
  const suggestions = AI_SUGGESTIONS[categorySlug] || AI_SUGGESTIONS.default;
  const placeholder = PLACEHOLDER_TEXT[categorySlug] || PLACEHOLDER_TEXT.default;

  const handleSearch = () => {
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        router.push({
          pathname: '/search',
          params: { q: query, ai: 'true', category: categorySlug },
        } as any);
      }
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    if (onSearch) {
      onSearch(suggestion);
    } else {
      router.push({
        pathname: '/search',
        params: { q: suggestion, ai: 'true', category: categorySlug },
      } as any);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purpleDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.sparkleIcon}>
            <Ionicons name="sparkles" size={20} color={colors.background.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Smart AI Search</Text>
            <Text style={styles.subtitle}>Describe what you're looking for</Text>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable
            style={styles.searchButton}
            onPress={handleSearch}
           
          >
            <Ionicons name="arrow-forward" size={18} color={colors.brand.purpleLight} />
          </Pressable>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>Try asking:</Text>
          <View style={styles.suggestionsList}>
            {suggestions.map((suggestion, index) => (
              <Pressable
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSuggestionPress(suggestion)}
               
              >
                <Text style={styles.suggestionText} numberOfLines={1}>
                  "{suggestion}"
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purpleLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
      },
    }),
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sparkleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingLeft: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: colors.background.primary,
  },
  searchButton: {
    width: 40,
    height: 40,
    margin: 2,
    borderRadius: 10,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    gap: 10,
  },
  suggestionsLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
});

export default memo(SmartAIBanner);
