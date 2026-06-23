/**
 * SearchHeader Component
 *
 * Search bar with input, clear button, search history, and search suggestions dropdown.
 * Used in the StoreProductsPage for product search functionality.
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import analyticsService from '@/services/analyticsService';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SearchHeaderProps {
  storeId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  onClear: () => void;
  searchHistory: string[];
  suggestions: string[];
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  onSuggestionSelect: (suggestion: string) => void;
  onSaveSearchHistory: (query: string) => void;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

function SearchHeader({
  storeId,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClear,
  searchHistory,
  suggestions,
  showSuggestions,
  onShowSuggestionsChange,
  onSuggestionSelect,
  onSaveSearchHistory,
  onToggleFilters,
  hasActiveFilters,
}: SearchHeaderProps) {
  const handleTextChange = useCallback((text: string) => {
    // Sanitize input - remove special characters that could cause issues
    const sanitized = text.replace(/[<>{}[\]\\]/g, '').slice(0, 100);
    onSearchChange(sanitized);
    onShowSuggestionsChange(sanitized.trim().length > 0);
  }, [onSearchChange, onShowSuggestionsChange]);

  const handleFocus = useCallback(() => {
    if (searchQuery.trim() || searchHistory.length > 0) {
      onShowSuggestionsChange(true);
    }
  }, [searchQuery, searchHistory.length, onShowSuggestionsChange]);

  const handleBlur = useCallback(() => {
    // Delay to allow suggestion click
    setTimeout(() => onShowSuggestionsChange(false), 200);
  }, [onShowSuggestionsChange]);

  const handleSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      onSaveSearchHistory(searchQuery);
      onShowSuggestionsChange(false);
      onSearchSubmit();
    }
  }, [searchQuery, onSaveSearchHistory, onShowSuggestionsChange, onSearchSubmit]);

  const handleClear = useCallback(() => {
    onClear();
    onShowSuggestionsChange(false);
  }, [onClear, onShowSuggestionsChange]);

  const handleSuggestionPress = useCallback((item: string) => {
    onSuggestionSelect(item);
    onShowSuggestionsChange(false);
    onSaveSearchHistory(item);
  }, [onSuggestionSelect, onShowSuggestionsChange, onSaveSearchHistory]);

  const handleFilterPress = useCallback(() => {
    onToggleFilters();
    analyticsService.track('filter_modal_opened', { storeId });
  }, [onToggleFilters, storeId]);

  return (
    <View style={styles.searchFilterBar}>
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            accessible={true}
            accessibilityLabel="Search products"
            accessibilityRole="search"
            accessibilityHint="Type to search for products. Press / to focus, Ctrl+K for quick search"
            data-search-input={true}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={handleClear}
              style={styles.clearButton}
              accessible={true}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </Pressable>
          )}
        </View>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
          <View style={styles.suggestionsDropdown}>
            <ScrollView
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
            >
              {/* Search History */}
              {searchHistory.length > 0 && !searchQuery.trim() && (
                <>
                  <ThemedText style={styles.suggestionsHeader}>Recent Searches</ThemedText>
                  {searchHistory.slice(0, 5).map((item, index) => (
                    <Pressable
                      key={`history-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionPress(item)}
                      accessible={true}
                      accessibilityLabel={`Recent search: ${item}`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="time-outline" size={18} color={Colors.text.tertiary} />
                      <ThemedText style={styles.suggestionItemText}>{item}</ThemedText>
                    </Pressable>
                  ))}
                </>
              )}

              {/* Search Suggestions */}
              {suggestions.length > 0 && searchQuery.trim() && (
                <>
                  <ThemedText style={styles.suggestionsHeader}>Suggestions</ThemedText>
                  {suggestions.map((suggestion, index) => (
                    <Pressable
                      key={`suggestion-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionPress(suggestion)}
                      accessible={true}
                      accessibilityLabel={`Search suggestion: ${suggestion}`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="search-outline" size={18} color={Colors.text.tertiary} />
                      <ThemedText style={styles.suggestionItemText}>{suggestion}</ThemedText>
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      <Pressable
        style={styles.filterButton}
        onPress={handleFilterPress}
        accessible={true}
        accessibilityLabel="Open filters"
        accessibilityRole="button"
        accessibilityHint="Double tap to open filter options"
      >
        <Ionicons name="filter" size={20} color={Colors.text.inverse} />
        {hasActiveFilters && <View style={styles.filterBadge} />}
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchFilterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    gap: Spacing.md,
    position: 'relative',
    zIndex: 10,
  },
  searchWrapper: {
    flex: 1,
    position: 'relative',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: Spacing.sm,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Shadows.medium,
    maxHeight: 300,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionsHeader: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  suggestionItemText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: Spacing.xs,
    backgroundColor: Colors.error,
  },
});

export default React.memo(SearchHeader);
