/**
 * EnhancedAISuggestionsSection Component
 * Smart AI Search banner with suggestions, placeholders, and example prompts
 * Based on reference design from Rez_v-2-main
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EnhancedAISuggestionsSectionProps, AISuggestion } from '@/types/categoryTypes';
import { colors } from '@/constants/theme';

// Rez Brand Colors
const COLORS = {
  primaryGreen: colors.lightMustard,
  primaryGold: colors.warningScale[400],
  purple: colors.brand.purpleLight,
  purpleLight: 'rgba(139, 92, 246, 0.2)',
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.background.primary,
};

const EnhancedAISuggestionsSection: React.FC<EnhancedAISuggestionsSectionProps> = ({
  categorySlug,
  categoryName,
  suggestions,
  placeholders = [
    'What are you looking for?',
    'Describe what you need...',
    'Ask me anything...',
  ],
  onSearch,
  onSuggestionPress,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Rotate placeholders
  useEffect(() => {
    if (!placeholders || placeholders.length <= 1) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [placeholders]);

  const handleSearch = () => {
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    if (onSearch) {
      onSearch(suggestion);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.15)', 'rgba(168, 85, 247, 0.1)']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={24} color={COLORS.purple} />
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
            placeholder={placeholders[placeholderIndex]}
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable
            style={styles.searchButton}
            onPress={handleSearch}
           
          >
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </Pressable>
        </View>

        {/* Try Asking Label */}
        <Text style={styles.tryAskingLabel}>Try asking:</Text>

        {/* Example Prompts */}
        <View style={styles.promptsContainer}>
          {placeholders.map((prompt, index) => (
            <Pressable
              key={index}
              style={styles.promptChip}
              onPress={() => handleSuggestionPress(prompt)}
             
            >
              <Text style={styles.promptText} numberOfLines={1}>"{prompt}"</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.purple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingLeft: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.purple,
    borderRadius: 10,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tryAskingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  promptsContainer: {
    gap: 8,
  },
  promptChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  promptText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
});

export default React.memo(EnhancedAISuggestionsSection);
