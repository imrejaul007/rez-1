/**
 * SearchBar Component
 *
 * Premium search input with debounce for mall pages
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search brands...',
  value: externalValue,
  onSearch,
  debounceMs = 300,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState(externalValue || '');
  const [isFocused, setIsFocused] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  // Sync with external value
  useEffect(() => {
    if (externalValue !== undefined && externalValue !== query) {
      setQuery(externalValue);
    }
  }, [externalValue]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  return (
    <View style={styles.wrapper}>
      {isFocused && (
        <LinearGradient
          colors={[colors.nileBlue, colors.nileBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.focusBorder}
        />
      )}
      <View style={[styles.container, isFocused && styles.containerFocused]}>
        <View style={[styles.iconWrapper, isFocused && styles.iconWrapperFocused]}>
          <Ionicons
            name="search"
            size={18}
            color={isFocused ? colors.background.primary : colors.neutral[400]}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[400]}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearButton}>
            <View style={styles.clearButtonInner}>
              <Ionicons name="close" size={14} color={colors.neutral[500]} />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    position: 'relative',
  },
  focusBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  containerFocused: {
    borderColor: 'transparent',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapperFocused: {
    backgroundColor: colors.nileBlue,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[900],
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(SearchBar);
