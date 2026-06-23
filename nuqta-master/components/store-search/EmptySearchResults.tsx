import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { 
  COLORS, 
  TYPOGRAPHY, 
  SPACING, 
  BORDER_RADIUS,
  DEFAULTS 
} from '@/constants/search-constants';

interface EmptySearchResultsProps {
  searchQuery?: string;
  categoryName?: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  onTryAgain?: () => void;
  suggestions?: string[];
  onSuggestionPress?: (suggestion: string) => void;
}

const EmptySearchResults: React.FC<EmptySearchResultsProps> = ({
  searchQuery,
  categoryName,
  hasFilters = false,
  onClearFilters,
  onTryAgain,
  suggestions = [],
  onSuggestionPress,
}) => {
  const screenWidth = Dimensions.get('window').width;

  const getEmptyStateContent = () => {
    if (searchQuery && searchQuery.trim().length > 0) {
      return {
        icon: 'search-outline',
        title: 'No products found',
        subtitle: hasFilters
          ? `No results for "${searchQuery}" with current filters. Try adjusting your filters or search terms.`
          : `No results found for "${searchQuery}". Try different search terms.`,
      };
    }

    if (categoryName) {
      return {
        icon: 'storefront-outline',
        title: 'No stores yet',
        subtitle: `Currently don't have any stores under ${categoryName}. Check back soon!`,
      };
    }

    return {
      icon: 'storefront-outline',
      title: 'Start searching',
      subtitle: DEFAULTS.EMPTY_SEARCH_MESSAGE,
    };
  };

  const { icon, title, subtitle } = getEmptyStateContent();
  const styles = createStyles(screenWidth);

  return (
    <View style={styles.container}>
      {/* Empty State Icon */}
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon as any}
          size={64}
          color={COLORS.GRAY_400}
        />
      </View>

      {/* Empty State Content */}
      <View style={styles.contentContainer}>
        <ThemedText style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {hasFilters && onClearFilters && (
          <Pressable
            style={styles.clearFiltersButton}
            onPress={onClearFilters}
           
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
          >
            <Ionicons
              name="close-circle-outline"
              size={20}
              color={COLORS.PRIMARY}
              style={styles.buttonIcon}
            />
            <ThemedText style={styles.clearFiltersText}>
              Clear Filters
            </ThemedText>
          </Pressable>
        )}

        {onTryAgain && (
          <Pressable
            style={styles.tryAgainButton}
            onPress={onTryAgain}
           
            accessibilityRole="button"
            accessibilityLabel="Try searching again"
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={COLORS.WHITE}
              style={styles.buttonIcon}
            />
            <ThemedText style={styles.tryAgainText}>
              Try Again
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Search Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ThemedText style={styles.suggestionsTitle}>
            Try searching for:
          </ThemedText>
          <View style={styles.suggestionsList}>
            {suggestions.map((suggestion, index) => (
              <Pressable
                key={index}
                style={styles.suggestionChip}
                onPress={() => onSuggestionPress?.(suggestion)}
               
                accessibilityRole="button"
                accessibilityLabel={`Search for ${suggestion}`}
              >
                <Ionicons
                  name="search"
                  size={14}
                  color={COLORS.PRIMARY}
                  style={styles.suggestionIcon}
                />
                <ThemedText style={styles.suggestionText}>
                  {suggestion}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (screenWidth: number) => {
  const isTablet = screenWidth > 768;
  const horizontalPadding = isTablet ? 48 : 32;

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: horizontalPadding,
      paddingVertical: SPACING.XXXXL,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
    },
    iconContainer: {
      marginBottom: SPACING.XL,
      opacity: 0.6,
    },
    contentContainer: {
      alignItems: 'center',
      marginBottom: SPACING.XL,
    },
    title: {
      fontSize: isTablet ? TYPOGRAPHY.FONT_SIZE_3XL : TYPOGRAPHY.FONT_SIZE_2XL,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
      color: COLORS.TEXT_PRIMARY,
      textAlign: 'center',
      marginBottom: SPACING.SM,
    },
    subtitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      color: COLORS.TEXT_SECONDARY,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.LINE_HEIGHT_RELAXED * TYPOGRAPHY.FONT_SIZE_BASE,
      maxWidth: isTablet ? 400 : 280,
    },
    actionsContainer: {
      flexDirection: isTablet ? 'row' : 'column',
      alignItems: 'center',
      marginBottom: SPACING.XL,
    },
    clearFiltersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.WHITE,
      borderWidth: 2,
      borderColor: COLORS.PRIMARY,
      paddingHorizontal: SPACING.XL,
      paddingVertical: SPACING.MD,
      borderRadius: BORDER_RADIUS.XL,
      marginBottom: isTablet ? 0 : SPACING.MD,
      marginRight: isTablet ? SPACING.MD : 0,
    },
    tryAgainButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: SPACING.XL,
      paddingVertical: SPACING.MD,
      borderRadius: BORDER_RADIUS.XL,
    },
    buttonIcon: {
      marginRight: SPACING.SM,
    },
    clearFiltersText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
      color: COLORS.PRIMARY,
    },
    tryAgainText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
      color: COLORS.WHITE,
    },
    suggestionsContainer: {
      width: '100%',
      alignItems: 'center',
    },
    suggestionsTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: SPACING.MD,
    },
    suggestionsList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: SPACING.SM,
    },
    suggestionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.GRAY_50,
      borderWidth: 1,
      borderColor: COLORS.BORDER_DEFAULT,
      paddingHorizontal: SPACING.MD,
      paddingVertical: SPACING.SM,
      borderRadius: BORDER_RADIUS.XL,
      marginBottom: SPACING.SM,
    },
    suggestionIcon: {
      marginRight: SPACING.XS,
    },
    suggestionText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    },
  });
};

export default React.memo(EmptySearchResults);