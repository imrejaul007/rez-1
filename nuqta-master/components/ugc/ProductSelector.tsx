// @ts-nocheck
// Product Selector Component
// Modal component for searching and selecting products for UGC video tagging

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useProductSearch } from '@/hooks/useProductSearch';
import { ProductSelectorProps, ProductSelectorProduct } from '@/types/product-selector.types';
import ProductCard from './ProductCard';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

function ProductSelector({
  visible,
  onClose,
  selectedProducts: initialSelectedProducts,
  onProductsChange,
  maxProducts = 10,
  minProducts = 1,
  title = 'Select Products',
  confirmButtonText = 'Done',
  allowMultiple = true,
  requireSelection = true,
  showStoreFilter = false,
  showCategoryFilter = false,
  initialSearchQuery = '',
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const slideAnim = useSharedValue(0);

  // Use product search hook
  const {
    products,
    loading,
    error,
    hasMore,
    query,
    total,
    searchProducts,
    loadMore,
    clearSearch,
    refresh,
    selectedProducts,
    selectProduct,
    deselectProduct,
    toggleProduct,
    isSelected,
    canSelectMore,
  } = useProductSearch({
    maxProducts,
    minProducts,
    initialProducts: initialSelectedProducts,
    debounceMs: 500,
  });

  // Animate modal entrance
  React.useEffect(() => {
    if (visible) {
      slideAnim.value = withSpring(1, { damping: 8, stiffness: 50 });
    } else {
      slideAnim.value = 0;
    }
  }, [visible]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(slideAnim.value, [0, 1], [600, 0]) }],
  }));

  // Handle search input change
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      searchProducts(text);
    },
    [searchProducts]
  );

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    clearSearch();
  }, [clearSearch]);

  // Handle product toggle
  const handleProductToggle = useCallback(
    (product: ProductSelectorProduct) => {
      if (allowMultiple) {
        toggleProduct(product);
      } else {
        // Single selection mode
        if (isSelected(product._id)) {
          deselectProduct(product._id);
        } else {
          // Clear previous selection and select new
          selectedProducts.forEach((p) => deselectProduct(p._id));
          selectProduct(product);
        }
      }
    },
    [allowMultiple, toggleProduct, isSelected, selectProduct, deselectProduct, selectedProducts]
  );

  // Handle remove from selection
  const handleRemoveProduct = useCallback(
    (productId: string) => {
      deselectProduct(productId);
    },
    [deselectProduct]
  );

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (requireSelection && selectedProducts.length < minProducts) {
      alert(`Please select at least ${minProducts} product${minProducts > 1 ? 's' : ''}`);
      return;
    }

    onProductsChange(selectedProducts);
    onClose();
  }, [selectedProducts, minProducts, requireSelection, onProductsChange, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Render product card item
  const renderProductItem = useCallback(
    ({ item }: { item: ProductSelectorProduct }) => (
      <ProductCard
        product={item}
        isSelected={isSelected(item._id)}
        onToggleSelect={handleProductToggle}
        disabled={!canSelectMore && !isSelected(item._id)}
        showStore={true}
        showPrice={true}
        showRating={true}
      />
    ),
    [isSelected, handleProductToggle, canSelectMore]
  );

  // Render selected product item
  const renderSelectedItem = useCallback(
    ({ item }: { item: ProductSelectorProduct }) => (
      <View style={styles.selectedItem}>
        <View style={styles.selectedItemInfo}>
          <Ionicons name="checkmark-circle" size={16} color={colors.brand.indigo} />
          <Text style={styles.selectedItemName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <Pressable
          onPress={() => handleRemoveProduct(item._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name}`}
        >
          <Ionicons name="close-circle" size={20} color={colors.error} />
        </Pressable>
      </View>
    ),
    [handleRemoveProduct]
  );

  // Render empty state
  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.emptyStateTitle}>Error Loading Products</Text>
          <Text style={styles.emptyStateMessage}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Ionicons name="refresh" size={20} color={colors.background.primary} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (query && products.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={colors.neutral[400]} />
          <Text style={styles.emptyStateTitle}>No Products Found</Text>
          <Text style={styles.emptyStateMessage}>
            Try adjusting your search to find what you're looking for
          </Text>
          <Pressable style={styles.clearButton} onPress={handleClearSearch}>
            <Text style={styles.clearButtonText}>Clear Search</Text>
          </Pressable>
        </View>
      );
    }

    if (products.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color={colors.neutral[400]} />
          <Text style={styles.emptyStateTitle}>No Products Available</Text>
          <Text style={styles.emptyStateMessage}>
            There are no products available at the moment
          </Text>
        </View>
      );
    }

    return null;
  };

  // Render footer loading
  const renderFooter = () => {
    if (!loading || products.length === 0) {
      return null;
    }

    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={colors.brand.indigo} />
        <Text style={styles.footerLoadingText}>Loading more products...</Text>
      </View>
    );
  };

  // Render header loading
  const renderHeaderLoading = () => {
    if (!loading || products.length > 0) {
      return null;
    }

    return (
      <View style={styles.headerLoading}>
        <ActivityIndicator size="large" color={colors.brand.indigo} />
        <Text style={styles.headerLoadingText}>Loading products...</Text>
      </View>
    );
  };

  const canConfirm = !requireSelection || selectedProducts.length >= minProducts;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable
          style={styles.backdrop}
         
          onPress={handleCancel}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            modalAnimatedStyle,
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>{title}</Text>
                <Text style={styles.headerSubtitle}>
                  {selectedProducts.length}/{maxProducts} selected
                  {total > 0 && ` • ${total} total`}
                </Text>
              </View>
              <Pressable
                onPress={handleCancel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={28} color={colors.neutral[500]} />
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.neutral[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor={colors.neutral[400]}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search products"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={handleClearSearch}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
                </Pressable>
              )}
            </View>

            {/* Product List */}
            <View style={styles.contentContainer}>
              {renderHeaderLoading()}
              <FlashList
                data={products}
                renderItem={renderProductItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={renderFooter}
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                windowSize={10}
                estimatedItemSize={70}
              />
            </View>

            {/* Selected Products Section */}
            {selectedProducts.length > 0 && (
              <View style={styles.selectedSection}>
                <View style={styles.selectedHeader}>
                  <Text style={styles.selectedTitle}>
                    Selected Products ({selectedProducts.length})
                  </Text>
                  {selectedProducts.length >= minProducts && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.lightMustard} />
                  )}
                </View>
                <FlashList
                  data={selectedProducts}
                  renderItem={renderSelectedItem}
                  keyExtractor={(item) => item._id}
                  style={styles.selectedList}
                  showsVerticalScrollIndicator={false}
                  estimatedItemSize={44}
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.footer}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleCancel}
               
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmButton,
                  !canConfirm && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm}
               
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    !canConfirm && styles.confirmButtonTextDisabled,
                  ]}
                >
                  {confirmButtonText}
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={canConfirm ? colors.background.primary : colors.neutral[400]}
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral[800],
    marginLeft: 12,
    padding: 0,
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  footerLoadingText: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.indigo,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginTop: 20,
  },
  clearButtonText: {
    color: colors.brand.indigo,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedSection: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    backgroundColor: colors.neutral[50],
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    maxHeight: 180,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  selectedList: {
    maxHeight: 120,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  selectedItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedItemName: {
    fontSize: 13,
    color: colors.neutral[800],
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    backgroundColor: colors.background.primary,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.indigo,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.neutral[100],
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background.primary,
  },
  confirmButtonTextDisabled: {
    color: colors.neutral[400],
  },
});

export default React.memo(ProductSelector);
