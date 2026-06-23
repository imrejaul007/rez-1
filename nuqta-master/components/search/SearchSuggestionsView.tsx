import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { SearchSuggestion } from '@/types/search.types';
import { NUQTA } from './searchTheme';

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  product: { label: 'Products', icon: 'cube-outline' },
  store: { label: 'Stores', icon: 'storefront-outline' },
  category: { label: 'Categories', icon: 'grid-outline' },
  brand: { label: 'Brands', icon: 'pricetag-outline' },
};

interface SearchSuggestionsViewProps {
  suggestions: SearchSuggestion[];
  query: string;
  onSuggestionPress: (suggestion: SearchSuggestion) => void;
}

function SearchSuggestionsView({
  suggestions,
  query,
  onSuggestionPress,
}: SearchSuggestionsViewProps) {
  const { filtered, grouped } = useMemo(() => {
    const f = suggestions
      .filter(s => s.text.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 12);

    const g: Record<string, typeof f> = {};
    for (const s of f) {
      const type = s.type || 'product';
      if (!g[type]) g[type] = [];
      g[type].push(s);
    }
    return { filtered: f, grouped: g };
  }, [suggestions, query]);

  const hasGroups = Object.keys(grouped).length > 1;

  return (
    <ScrollView
      style={styles.suggestionsContainer}
      accessibilityLabel="Search suggestions list"
      accessibilityRole="list"
    >
      <View style={styles.suggestionsHeader}>
        <View style={styles.suggestionsIconContainer}>
          <Ionicons name="bulb-outline" size={18} color={NUQTA.lightMustard} />
        </View>
        <Text style={styles.suggestionsTitle}>Suggestions</Text>
      </View>
      {hasGroups ? (
        Object.entries(grouped).map(([type, items]) => (
          <View key={type}>
            <View style={styles.suggestionGroupHeader}>
              <Ionicons
                name={(TYPE_LABELS[type]?.icon || 'search-outline') as any}
                size={14}
                color={NUQTA.text.muted}
              />
              <Text style={styles.suggestionGroupTitle}>
                {TYPE_LABELS[type]?.label || 'Results'}
              </Text>
            </View>
            {items.map((suggestion) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                icon={(TYPE_LABELS[type]?.icon || 'search-outline') as any}
                onPress={onSuggestionPress}
              />
            ))}
          </View>
        ))
      ) : (
        filtered.map((suggestion) => (
          <SuggestionItem
            key={suggestion.id}
            suggestion={suggestion}
            icon={suggestion.type === 'category' ? 'grid-outline' : 'search-outline'}
            onPress={onSuggestionPress}
          />
        ))
      )}
    </ScrollView>
  );
}

function SuggestionItem({
  suggestion,
  icon,
  onPress,
}: {
  suggestion: SearchSuggestion;
  icon: string;
  onPress: (s: SearchSuggestion) => void;
}) {
  return (
    <Pressable
      style={styles.suggestionItem}
      onPress={() => onPress(suggestion)}
      accessibilityLabel={`Search for ${suggestion.text}${suggestion.resultCount ? `, ${suggestion.resultCount} results available` : ''}`}
      accessibilityRole="button"
    >
      <View style={styles.suggestionIconWrapper}>
        <Ionicons name={icon as any} size={16} color={NUQTA.nileBlue} />
      </View>
      <Text style={styles.suggestionText}>{suggestion.text}</Text>
      {suggestion.resultCount ? (
        <View style={styles.suggestionCountBadge}>
          <Text style={styles.suggestionCount}>{suggestion.resultCount}</Text>
        </View>
      ) : null}
      <Ionicons name="arrow-forward" size={16} color={NUQTA.text.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  suggestionsContainer: {
    backgroundColor: Colors.background.primary,
    margin: Spacing.base,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: NUQTA.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(26, 58, 82, 0.08)',
      },
    }),
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  suggestionsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: NUQTA.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NUQTA.nileBlue,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: NUQTA.linen,
    gap: Spacing.md,
  },
  suggestionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: NUQTA.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionText: {
    flex: 1,
    ...Typography.body,
    color: NUQTA.nileBlue,
    fontWeight: '500',
  },
  suggestionCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    backgroundColor: NUQTA.lightMustard,
    borderRadius: BorderRadius.md,
  },
  suggestionCount: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: NUQTA.nileBlue,
  },
  suggestionGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: Spacing.xs,
  },
  suggestionGroupTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: NUQTA.text.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
});

export default React.memo(SearchSuggestionsView);
