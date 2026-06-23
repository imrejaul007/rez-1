// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { storeSearchService } from '@/services/storeSearchService';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SearchSuggestion {
  id: string;
  name: string;
  type: 'store' | 'category' | 'location';
  icon: string;
  description?: string;
}

interface StoreSearchBarProps {
  onSearch: (query: string) => void;
  onSuggestionSelect: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  style?: any;
}

const StoreSearchBar: React.FC<StoreSearchBarProps> = ({
  onSearch,
  onSuggestionSelect,
  placeholder = 'Search stores, categories...',
  style,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const isMounted = useIsMounted();
  
  const searchTimeoutRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  // Predefined suggestions for quick access
  const quickSuggestions: SearchSuggestion[] = [
    { id: 'fast-delivery', name: '30 min delivery', type: 'category', icon: '🚀' },
    { id: 'budget-friendly', name: '1 rupee store', type: 'category', icon: '💰' },
    { id: 'premium', name: 'Luxury store', type: 'category', icon: '👑' },
    { id: 'organic', name: 'Organic Store', type: 'category', icon: '🌱' },
    { id: 'alliance', name: 'Alliance Store', type: 'category', icon: '🤝' },
    { id: 'lowest-price', name: 'Lowest Price', type: 'category', icon: '💸' },
    { id: 'mall', name: `${BRAND.APP_NAME} Mall`, type: 'category', icon: '🏬' },
    { id: 'cash-store', name: 'Cash Store', type: 'category', icon: '💵' },
  ];

  const locationSuggestions: SearchSuggestion[] = [
    { id: 'nearby', name: 'Nearby stores', type: 'location', icon: '📍', description: 'Stores near you' },
    { id: 'delivery-available', name: 'Delivery available', type: 'location', icon: '🚚', description: 'Stores that deliver to you' },
  ];

  useEffect(() => {
    if (query.length === 0) {
      setSuggestions([...quickSuggestions, ...locationSuggestions]);
      setShowSuggestions(true);
      return;
    }

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true);
      
      // Search in quick suggestions first
      const quickMatches = quickSuggestions.filter(suggestion =>
        suggestion.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // Search in location suggestions
      const locationMatches = locationSuggestions.filter(suggestion =>
        suggestion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (suggestion.description && suggestion.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      
      // TODO: Add actual store search API call here
      // const storeResults = await storeSearchService.searchStores(searchQuery);
      
      const allSuggestions = [...quickMatches, ...locationMatches];
      if (!isMounted()) return;
      setSuggestions(allSuggestions);
      setShowSuggestions(allSuggestions.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      if (!isMounted()) return;
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    setQuery(text);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for touch events
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onSuggestionSelect(suggestion);
  };

  const handleSearchPress = () => {
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleClearPress = () => {
    setQuery('');
    setSuggestions([...quickSuggestions, ...locationSuggestions]);
    setShowSuggestions(true);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const renderSuggestion = ({ item, index }: { item: SearchSuggestion; index: number }) => (
    <Pressable
      style={[
        styles.suggestionItem,
        index === selectedIndex && styles.suggestionItemSelected,
      ]}
      onPress={() => handleSuggestionPress(item)}
     
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.type === 'category' ? 'Category' : item.type === 'location' ? 'Location' : 'Store'}: ${item.name}${item.description ? `, ${item.description}` : ''}`}
      accessibilityHint="Double tap to search for this suggestion"
      accessibilityState={{ selected: index === selectedIndex }}
    >
      <Text style={styles.suggestionIcon} accessible={false}>{item.icon}</Text>
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.suggestionDescription}>{item.description}</Text>
        )}
      </View>
      <View style={styles.suggestionType} accessible={false}>
        <Text style={styles.suggestionTypeText}>
          {item.type === 'category' ? 'Category' :
           item.type === 'location' ? 'Location' : 'Store'}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="search" size={20} color={colors.midGray} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#999"
            value={query}
            onChangeText={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            returnKeyType="search"
            onSubmitEditing={handleSearchPress}
            autoCorrect={false}
            autoCapitalize="none"
            accessible={true}
            accessibilityLabel="Search stores and categories"
            accessibilityHint="Enter search terms to find stores, categories, or locations"
            accessibilityValue={{ text: query || 'Empty' }}
          />
          {query.length > 0 && (
            <Pressable
              onPress={handleClearPress}
              style={styles.clearButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              accessibilityHint="Double tap to clear search text"
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </Pressable>
          )}
          {loading && (
            <ActivityIndicator
              size="small"
              color="#7B61FF"
              style={styles.loadingIndicator}
              accessible={false}
            />
          )}
        </View>
        
        <Pressable
          style={styles.searchButton}
          onPress={handleSearchPress}
         
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Search"
          accessibilityHint="Double tap to perform search"
        >
          <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
        </Pressable>
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlashList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            estimatedItemSize={50}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.darkGray,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: '#7B61FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginTop: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 300,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionItemSelected: {
    backgroundColor: '#f8f9ff',
  },
  suggestionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
  },
  suggestionDescription: {
    fontSize: 14,
    color: colors.midGray,
    marginTop: 2,
  },
  suggestionType: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestionTypeText: {
    fontSize: 12,
    color: colors.midGray,
    fontWeight: '500',
  },
});

export default React.memo(StoreSearchBar);
