// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useAddressSearch } from '@/hooks/useLocation';
import { AddressSearchResult } from '@/types/location.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface AddressSearchProps {
  placeholder?: string;
  onAddressSelect?: (address: AddressSearchResult) => void;
  onSearch?: (query: string) => void;
  showResults?: boolean;
  maxResults?: number;
  debounceMs?: number;
  style?: any;
  inputStyle?: any;
  resultsStyle?: any;
  itemStyle?: any;
}

function AddressSearch({
  placeholder = 'Search for an address...',
  onAddressSelect,
  onSearch,
  showResults = true,
  maxResults = 5,
  debounceMs = 300,
  style,
  inputStyle,
  resultsStyle,
  itemStyle,
}: AddressSearchProps) {
  const { search, searchResults, isSearching, clearResults } = useAddressSearch();
  const [query, setQuery] = useState('');
  const [showResultsList, setShowResultsList] = useState(false);
  const isMounted = useIsMounted();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, debounceMs) as any;
    } else {
      clearResults();
      setShowResultsList(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceMs]);

  const performSearch = async (searchQuery: string) => {
    try {
      const results = await search(searchQuery);
      if (!isMounted()) return;
      setShowResultsList(showResults && results.length > 0);
      onSearch?.(searchQuery);
    } catch (error) {
      platformAlertSimple('Search Error', 'Failed to search addresses. Please try again.');
    }
  };

  const handleAddressSelect = (address: AddressSearchResult) => {
    setQuery(address.formattedAddress);
    setShowResultsList(false);
    onAddressSelect?.(address);
  };

  const handleInputChange = (text: string) => {
    setQuery(text);
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowResultsList(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for selection
    setTimeout(() => {
      setShowResultsList(false);
    }, 200);
  };

  const clearSearch = () => {
    setQuery('');
    clearResults();
    setShowResultsList(false);
  };

  const renderAddressItem = ({ item }: { item: AddressSearchResult }) => (
    <Pressable
      style={[styles.resultItem, itemStyle]}
      onPress={() => handleAddressSelect(item)}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultAddress}>{item.address}</Text>
        <Text style={styles.resultCoordinates}>
          {item.coordinates.latitude.toFixed(4)}, {item.coordinates.longitude.toFixed(4)}
        </Text>
      </View>
      <Text style={styles.resultArrow}>→</Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          value={query}
          onChangeText={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          autoCorrect={false}
          autoCapitalize="none"
        />
        
        {/* Clear Button */}
        {query.length > 0 && (
          <Pressable
            style={styles.clearButton}
            onPress={clearSearch}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </Pressable>
        )}
        
        {/* Loading Indicator */}
        {isSearching && (
          <ActivityIndicator
            size="small"
            color={colors.brand.ios}
            style={styles.loadingIndicator}
          />
        )}
      </View>

      {/* Search Results */}
      {showResultsList && searchResults.length > 0 && (
        <View style={[styles.resultsContainer, resultsStyle]}>
          <FlashList
            data={searchResults.slice(0, maxResults)}
            renderItem={renderAddressItem}
            keyExtractor={(item, index) => `${item.address}-${index}`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            estimatedItemSize={60}
          />
        </View>
      )}

      {/* No Results */}
      {showResultsList && !isSearching && searchResults.length === 0 && query.length >= 2 && (
        <View style={[styles.noResultsContainer, resultsStyle]}>
          <Text style={styles.noResultsText}>
            No addresses found for "{query}"
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.darkGray,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: colors.midGray,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultContent: {
    flex: 1,
  },
  resultAddress: {
    fontSize: 16,
    color: colors.darkGray,
    marginBottom: 2,
  },
  resultCoordinates: {
    fontSize: 12,
    color: colors.midGray,
  },
  resultArrow: {
    fontSize: 18,
    color: colors.brand.ios,
    marginLeft: 8,
  },
  noResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    marginTop: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
  },
});

// Compact version for small spaces
export function CompactAddressSearch(props: AddressSearchProps) {
  return (
    <AddressSearch
      {...props}
      maxResults={3}
      debounceMs={500}
    />
  );
}

// Full version with all features
export function FullAddressSearch(props: AddressSearchProps) {
  return (
    <AddressSearch
      {...props}
      maxResults={8}
      debounceMs={200}
    />
  );
}

export default React.memo(AddressSearch);
