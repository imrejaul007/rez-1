/**
 * EventsHeader Component
 * Nile Blue gradient header with search bar for Events List Page
 */

import React, { memo, useCallback, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

interface EventsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBack: () => void;
  isLoading?: boolean;
  title?: string;
}

const EventsHeader: React.FC<EventsHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onBack,
  isLoading = false,
  title = 'Events',
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <LinearGradient
      colors={[colors.nileBlue, '#2A5577']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Top Row: Back Button + Title */}
      <View style={styles.topRow}>
        <Pressable
          style={styles.backButton}
          onPress={onBack}
         
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.background.primary} />
        </Pressable>

        <ThemedText style={styles.title}>{title}</ThemedText>

        {/* Spacer to balance layout */}
        <View style={styles.spacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputWrapper,
            isFocused && styles.searchInputWrapperFocused,
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={isFocused ? colors.nileBlue : colors.neutral[400]}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search events"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={handleClear}
              style={styles.clearButton}
             
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
            </Pressable>
          )}
          {isLoading && (
            <View style={styles.loadingIndicator}>
              <Ionicons name="ellipse" size={8} color={colors.nileBlue} />
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 0 : 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 4,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      web: { boxShadow: '0px 2px 6px rgba(0,0,0,0.1)' },
    }),
  },
  searchInputWrapperFocused: {
    borderWidth: 2,
    borderColor: 'rgba(255, 205, 87, 0.6)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[800],
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
});

export default memo(EventsHeader);
