import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { NUQTA } from './searchTheme';
import { colors } from '@/constants/theme';

interface SearchHeaderProps {
  query: string;
  inputFocused: boolean;
  activeFilterCount: number;
  initialQuery: string;
  onBack: () => void;
  onQueryChange: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmitEditing: () => void;
  onOpenFilters: () => void;
}

function SearchHeader({
  query,
  inputFocused,
  activeFilterCount,
  initialQuery,
  onBack,
  onQueryChange,
  onFocus,
  onBlur,
  onSubmitEditing,
  onOpenFilters,
}: SearchHeaderProps) {
  const searchInputRef = useRef<TextInput>(null);

  // Voice search: focus the search input so the device keyboard opens
  // (most mobile keyboards have a built-in voice input button)
  const handleVoiceSearch = () => {
    searchInputRef.current?.focus();
    onFocus();
  };

  return (
    <View style={styles.headerWrapper}>
      <LinearGradient
        colors={[NUQTA.nileBlue, NUQTA.nileBlueLight, NUQTA.nileBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Premium decorative elements */}
        <View style={styles.decorativeOrb1} />
        <View style={styles.decorativeOrb2} />
        <View style={styles.decorativeOrb3} />

        {/* Subtle pattern overlay */}
        <View style={styles.patternOverlay} />

        <View style={styles.headerContent}>
          {/* Back Button - Premium glass design */}
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Returns to the previous screen"
          >
            <LinearGradient
              colors={['rgba(255, 205, 87, 0.25)', 'rgba(255, 205, 87, 0.15)']}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={22} color={NUQTA.lightMustard} />
            </LinearGradient>
          </Pressable>

          {/* Search Container - Premium glass design */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, inputFocused && styles.searchInputFocused]}>
              <LinearGradient
                colors={[NUQTA.lightMustard, NUQTA.mustardDark]}
                style={styles.searchIconWrapper}
              >
                <Ionicons name="search" size={16} color={NUQTA.nileBlue} />
              </LinearGradient>
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.searchInput,
                  Platform.OS === 'web'
                    ? ({
                        outlineWidth: 0,
                        outlineColor: 'transparent',
                        outlineStyle: 'none',
                        WebkitTapHighlightColor: 'transparent',
                      } as any)
                    : undefined,
                ]}
                placeholder="Search for a service, store or category"
                placeholderTextColor={NUQTA.text.muted}
                value={query}
                onChangeText={onQueryChange}
                onFocus={onFocus}
                onBlur={onBlur}
                onSubmitEditing={onSubmitEditing}
                returnKeyType="search"
                autoFocus={!initialQuery}
                underlineColorAndroid="transparent"
                importantForAutofill="no"
                accessibilityLabel="Search input"
                accessibilityRole="search"
                accessibilityHint="Enter keywords to search for services, stores or categories"
                accessibilityValue={{ text: query }}
              />

              {query.length > 0 ? (
                <Pressable
                  onPress={() => onQueryChange('')}
                  style={styles.clearButton}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  accessibilityHint="Clears the current search text"
                >
                  <View style={styles.clearButtonInner}>
                    <Ionicons name="close" size={14} color={NUQTA.text.secondary} />
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleVoiceSearch}
                  style={styles.micButton}
                  accessibilityLabel="Voice search"
                  accessibilityRole="button"
                  accessibilityHint="Opens keyboard with voice input for hands-free search"
                >
                  <View style={styles.micButtonInner}>
                    <Ionicons name="mic-outline" size={18} color={NUQTA.nileBlue} />
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          {/* Filter Button - Premium design */}
          <Pressable
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive
            ]}
            onPress={onOpenFilters}
            accessibilityLabel={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
            accessibilityRole="button"
            accessibilityHint="Opens filter options to refine search results"
            accessibilityState={{ selected: activeFilterCount > 0 }}
          >
            <LinearGradient
              colors={activeFilterCount > 0
                ? [NUQTA.lightMustard, NUQTA.mustardDark]
                : ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.filterButtonGradient}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={activeFilterCount > 0 ? NUQTA.nileBlue : NUQTA.lightMustard}
              />
            </LinearGradient>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: NUQTA.nileBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0px 8px 32px rgba(26, 58, 82, 0.2)',
      },
    }),
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 0) + 14,
    paddingBottom: 18,
    paddingHorizontal: Spacing.base,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeOrb1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
  },
  decorativeOrb2: {
    position: 'absolute',
    top: 30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 205, 87, 0.06)',
  },
  decorativeOrb3: {
    position: 'absolute',
    bottom: -20,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    zIndex: 2,
  },
  backButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  searchInputFocused: {
    borderWidth: 2,
    borderColor: NUQTA.lightMustard,
    ...Platform.select({
      ios: {
        shadowColor: NUQTA.lightMustard,
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: NUQTA.nileBlue,
    fontWeight: '500',
    borderWidth: 0,
    padding: 0,
    paddingVertical: Spacing.sm,
    letterSpacing: 0.1,
  },
  clearButton: {
    marginLeft: Spacing.xs,
    marginRight: 6,
  },
  clearButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NUQTA.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    marginLeft: Spacing.xs,
    marginRight: 6,
  },
  micButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${NUQTA.lightMustard}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  filterButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {},
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: NUQTA.lightPeach,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: NUQTA.nileBlue,
  },
  filterBadgeText: {
    color: NUQTA.nileBlue,
    ...Typography.caption,
    fontWeight: '800',
  },
});

export default React.memo(SearchHeader);
