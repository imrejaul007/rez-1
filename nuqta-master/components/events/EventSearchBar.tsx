import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { colors } from '@/constants/theme';

interface EventSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onClearSearch: () => void;
  suggestions?: string[];
  showSuggestions?: boolean;
  onSuggestionPress?: (suggestion: string) => void;
  placeholder?: string;
  loading?: boolean;
}

function EventSearchBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  suggestions = [],
  showSuggestions = false,
  onSuggestionPress,
  placeholder = 'Search events...',
  loading = false
}: EventSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const animatedValue = useSharedValue(0);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: colors.neutral[200], dark: colors.neutral[700] }, 'border');
  const tintColor = useThemeColor({}, 'tint');
  const placeholderColor = useThemeColor({ light: colors.neutral[400], dark: colors.neutral[500] }, 'text');

  useEffect(() => {
    animatedValue.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleSubmit = () => {
    onSearchSubmit(searchQuery);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onClearSearch();
    inputRef.current?.focus();
  };

  const handleSuggestionPress = (suggestion: string) => {
    onSearchChange(suggestion);
    onSuggestionPress?.(suggestion);
    inputRef.current?.blur();
  };

  const borderAnimStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(animatedValue.value, [0, 1], [borderColor, tintColor]),
  }));

  return (
    <ThemedView style={styles.container}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            backgroundColor,
          },
          borderAnimStyle,
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={isFocused ? tintColor : placeholderColor}
            style={styles.searchIcon}
          />
          
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: textColor }]}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={onSearchChange}
            onSubmitEditing={handleSubmit}
            onFocus={handleFocus}
            onBlur={handleBlur}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never"
            accessible={true}
            accessibilityLabel="Search events"
            accessibilityHint="Enter search terms to find events"
            accessibilityValue={{ text: searchQuery || 'Empty' }}
          />

          {loading && (
            <Ionicons
              name="hourglass-outline"
              size={20}
              color={tintColor}
              style={styles.loadingIcon}
              accessible={false}
            />
          )}

          {searchQuery.length > 0 && !loading && (
            <Pressable
              onPress={handleClear}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              accessibilityHint="Double tap to clear search text"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={placeholderColor}
              />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && isFocused && (
        <ThemedView
          style={[styles.suggestionsContainer, { backgroundColor }]}
          accessible={false}
        >
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <Pressable
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(suggestion)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Search suggestion: ${suggestion}`}
              accessibilityHint="Double tap to search for this suggestion"
            >
              <Ionicons
                name="search"
                size={16}
                color={placeholderColor}
                style={styles.suggestionIcon}
              />
              <ThemedText style={[styles.suggestionText, { color: textColor }]}>
                {suggestion}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  searchContainer: {
    borderRadius: 12,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    maxHeight: 200,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

export default React.memo(EventSearchBar);
