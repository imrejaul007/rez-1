// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

// Merchant interface
export interface Merchant {
  _id: string;
  name: string;
  logo?: string;
  cashbackPercentage?: number;
  category?: string;
  description?: string;
  lastUsed?: Date;
  userCount?: number;
}

// Props interface
interface MerchantSelectorProps {
  merchants: Merchant[];
  selectedMerchant?: Merchant;
  onSelect: (merchant: Merchant) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  categories?: string[];
  visible?: boolean;
  onRequestMerchant?: (merchantName: string) => void;
}

const MerchantSelector: React.FC<MerchantSelectorProps> = ({
  merchants,
  selectedMerchant,
  onSelect,
  onCancel,
  isLoading = false,
  searchPlaceholder = 'Search merchants...',
  categories = [],
  visible = true,
  onRequestMerchant,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);

      // Add to search history if not empty and not already present
      if (searchQuery.trim() && !searchHistory.includes(searchQuery.trim())) {
        setSearchHistory(prev => [searchQuery.trim(), ...prev.slice(0, 4)]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Extract unique categories from merchants
  const allCategories = useMemo(() => {
    const uniqueCategories = ['All', ...new Set(merchants.map(m => m.category).filter(Boolean) as string[])];
    return categories.length > 0 ? ['All', ...categories] : uniqueCategories;
  }, [merchants, categories]);

  // Filter merchants based on search and category
  const filteredMerchants = useMemo(() => {
    let filtered = merchants;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    // Filter by search query
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.category?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }

    // Sort: selected first, then by name
    return filtered.sort((a, b) => {
      if (a._id === selectedMerchant?._id) return -1;
      if (b._id === selectedMerchant?._id) return 1;

      // Sort by last used if available
      if (a.lastUsed && b.lastUsed) {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      }
      if (a.lastUsed) return -1;
      if (b.lastUsed) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [merchants, selectedCategory, debouncedSearch, selectedMerchant]);

  // Handle merchant selection
  const handleSelectMerchant = useCallback((merchant: Merchant) => {
    onSelect(merchant);
  }, [onSelect]);

  // Handle category selection
  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  // Handle request merchant
  const handleRequestMerchant = useCallback(() => {
    if (onRequestMerchant && searchQuery.trim()) {
      onRequestMerchant(searchQuery.trim());
    }
  }, [onRequestMerchant, searchQuery]);

  // Format relative time
  const getRelativeTime = (date?: Date): string => {
    if (!date) return '';

    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  // Format user count
  const formatUserCount = (count?: number): string => {
    if (!count) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M+ users`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K+ users`;
    return `${count} users`;
  };

  // Render merchant item
  const renderMerchantItem = ({ item }: { item: Merchant }) => {
    const isSelected = item._id === selectedMerchant?._id;

    return (
      <Pressable
        style={[styles.merchantCard, isSelected && styles.merchantCardSelected]}
        onPress={() => handleSelectMerchant(item)}
       
      >
        <View style={styles.merchantContent}>
          {/* Selection indicator */}
          <View style={styles.checkboxContainer}>
            {isSelected ? (
              <Ionicons name="checkmark-circle" size={24} color={colors.successScale[400]} />
            ) : (
              <View style={styles.checkboxEmpty} />
            )}
          </View>

          {/* Merchant logo */}
          <View style={styles.logoContainer}>
            {item.logo ? (
              <CachedImage
                source={item.logo}
                style={styles.logo}
                contentFit="contain"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Merchant details */}
          <View style={styles.merchantDetails}>
            <View style={styles.merchantHeader}>
              <Text style={styles.merchantName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
              )}
            </View>

            <View style={styles.merchantMeta}>
              {item.cashbackPercentage !== undefined && (
                <Text style={styles.cashbackText}>
                  Cashback: {item.cashbackPercentage}%
                </Text>
              )}
              {item.lastUsed && (
                <>
                  <Text style={styles.metaDivider}>|</Text>
                  <Text style={styles.metaText}>
                    Last used: {getRelativeTime(item.lastUsed)}
                  </Text>
                </>
              )}
              {item.userCount && !item.lastUsed && (
                <>
                  <Text style={styles.metaDivider}>|</Text>
                  <Text style={styles.metaText}>
                    {formatUserCount(item.userCount)}
                  </Text>
                </>
              )}
            </View>

            {item.description && (
              <Text style={styles.merchantDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonCheckbox} />
          <View style={styles.skeletonLogo} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
          </View>
        </View>
      ))}
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={64} color={colors.neutral[400]} />
      <Text style={styles.emptyTitle}>No merchants found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `No results for "${searchQuery}"`
          : 'Try adjusting your search or category filter'}
      </Text>
      {searchQuery && onRequestMerchant && (
        <Pressable
          style={styles.requestButton}
          onPress={handleRequestMerchant}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.brand.purpleLight} />
          <Text style={styles.requestButtonText}>
            Request "{searchQuery}"
          </Text>
        </Pressable>
      )}
    </View>
  );

  // Render category pills
  const renderCategoryPills = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryScroll}
      contentContainerStyle={styles.categoryScrollContent}
    >
      {allCategories.map((category) => (
        <Pressable
          key={category}
          style={[
            styles.categoryPill,
            selectedCategory === category && styles.categoryPillActive,
          ]}
          onPress={() => handleCategorySelect(category)}
        >
          <Text
            style={[
              styles.categoryPillText,
              selectedCategory === category && styles.categoryPillTextActive,
            ]}
          >
            {category}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {onCancel && (
            <Pressable
              style={styles.backButton}
              onPress={onCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.neutral[900]} />
            </Pressable>
          )}
          <Text style={styles.headerTitle}>Select Merchant</Text>
          {onCancel && (
            <Pressable
              style={styles.closeButton}
              onPress={onCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.neutral[900]} />
            </Pressable>
          )}
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.neutral[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
            </Pressable>
          )}
        </View>

        {/* Category filters */}
        {allCategories.length > 1 && renderCategoryPills()}

        {/* Merchants list */}
        {isLoading ? (
          renderLoadingSkeleton()
        ) : filteredMerchants.length > 0 ? (
          <FlashList
            data={filteredMerchants.slice(0, 50)}
            renderItem={renderMerchantItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            estimatedItemSize={60}
          />
        ) : (
          renderEmptyState()
        )}

        {/* Request merchant footer */}
        {!isLoading && filteredMerchants.length > 0 && onRequestMerchant && (
          <View style={styles.footer}>
            <Pressable
              style={styles.requestFooterButton}
              onPress={() => onRequestMerchant('')}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.brand.purpleLight} />
              <Text style={styles.requestFooterText}>
                Can't find your store? Request it
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 3px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  backButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[900],
    padding: 0,
  },
  categoryScroll: {
    maxHeight: 50,
    marginBottom: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: colors.brand.purpleLight,
    borderColor: colors.brand.purpleLight,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  categoryPillTextActive: {
    color: colors.background.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  merchantCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  merchantCardSelected: {
    borderColor: colors.successScale[400],
    borderWidth: 2,
    backgroundColor: colors.successScale[50],
  },
  merchantContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[300],
  },
  logoContainer: {
    marginRight: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.brand.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
  },
  merchantDetails: {
    flex: 1,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: colors.indigoMist,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.brand.indigo,
  },
  merchantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cashbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.successScale[400],
  },
  metaDivider: {
    fontSize: 13,
    color: colors.neutral[300],
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  merchantDescription: {
    fontSize: 13,
    color: colors.neutral[400],
    marginTop: 2,
  },
  separator: {
    height: 1,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
  },
  skeletonCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.neutral[200],
    marginRight: 12,
  },
  skeletonLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  skeletonSubtitle: {
    height: 12,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    width: '40%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.pink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
  },
  requestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand.purpleLight,
    marginLeft: 8,
  },
  footer: {
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  requestFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  requestFooterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.brand.purpleLight,
    marginLeft: 8,
  },
});

export default React.memo(MerchantSelector);
