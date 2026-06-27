// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Menu Page - Restaurant/Store Menu Display with Dine-In Ordering & Pre-order
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import menuApi, { MenuCategory as ApiMenuCategory, MenuItem as ApiMenuItem } from '@/services/menuApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category: string;
  isAvailable: boolean;
  preparationTime?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  spicyLevel?: number;
  allergens?: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

function MenuPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.storeId as string;
  const isDineIn = params.dineIn === 'true';
  const tableNumber = params.table as string | undefined;
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dineInTable, setDineInTable] = useState(tableNumber || '');

  // Transform API response to local MenuItem format
  const transformMenuItem = (item: ApiMenuItem): MenuItem => ({
    id: item._id,
    name: item.name,
    description: item.description,
    price: item.price,
    originalPrice: item.originalPrice,
    image: item.image,
    category: item.category,
    isAvailable: item.isAvailable,
    preparationTime: item.preparationTime,
    isVegetarian: item.dietaryInfo?.isVegetarian,
    isVegan: item.dietaryInfo?.isVegan,
    spicyLevel: item.spicyLevel,
    allergens: item.allergens,
  });

  // Fetch menu data from real API
  const fetchMenu = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await menuApi.getStoreMenu(storeId);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setStoreName(response.data.storeName || 'Restaurant');
        const transformedCategories: MenuCategory[] = (response.data.categories || []).map((cat: ApiMenuCategory) => ({
          id: cat._id,
          name: cat.name,
          items: (cat.items || []).map(transformMenuItem),
        }));
        if (!isMounted()) return;
        setCategories(transformedCategories);
      } else {
        if (!isMounted()) return;
        setStoreName('Restaurant');
        if (!isMounted()) return;
        setCategories([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load menu';
      if (!isMounted()) return;
      setError(errorMessage);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId && !authLoading) {
      fetchMenu();
    }
  }, [storeId, authLoading, fetchMenu]);

  const handleRefresh = () => fetchMenu(true);

  // Add to cart
  const handleAddToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }, []);

  // Remove from cart
  const handleRemoveFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.menuItem.id !== itemId);
    });
  }, []);

  // Place dine-in order via pre-order API
  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      platformAlertSimple('Login Required', 'Please login to place an order.');
      return;
    }

    if (isDineIn && !dineInTable.trim()) {
      platformAlertSimple('Table Number Required', 'Please enter your table number.');
      return;
    }

    const confirmed = await platformAlertConfirm(
      'Place Order',
      isDineIn
        ? `Place dine-in order for Table ${dineInTable}? (${cartItemCount} items, ${currencySymbol}${cartTotal.toFixed(2)})`
        : `Place order? (${cartItemCount} items, ${currencySymbol}${cartTotal.toFixed(2)})`
    );
    if (!confirmed) return;

    if (!isMounted()) return;
    setSubmitting(true);
    try {
      const response = await menuApi.createPreOrder({
        storeId,
        items: cart.map(c => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          specialInstructions: c.specialInstructions,
        })),
        deliveryType: isDineIn ? 'dine_in' : 'pickup',
        tableNumber: isDineIn ? dineInTable : undefined,
        contactPhone: '',
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setCart([]);
        platformAlertSimple(
          'Order Placed!',
          isDineIn
            ? `Your dine-in order for Table ${dineInTable} has been placed. Order #${response.data.orderNumber}`
            : `Your order has been placed. Order #${response.data.orderNumber}`
        );
        if (isDineIn) {
          router.replace({
            pathname: '/dinein-tracking',
            params: { orderId: response.data._id },
          } as any);
        } else {
          router.canGoBack() ? router.back() : router.replace('/(tabs)');
        }
      } else {
        platformAlertSimple('Error', response.error || 'Failed to place order');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to place order');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Get filtered menu items
  const filteredItems = selectedCategory === 'all'
    ? categories.flatMap(cat => cat.items)
    : categories.find(cat => cat.id === selectedCategory)?.items || [];

  const getCartQuantity = useCallback((itemId: string) => cart.find(c => c.menuItem.id === itemId)?.quantity || 0, [cart]);

  // FlatList renderItem
  const renderMenuItem = useCallback(({ item }: { item: MenuItem }) => {
    const quantity = getCartQuantity(item.id);

    return (
      <View style={[styles.menuCard, !item.isAvailable && styles.menuCardUnavailable]}>
        <View style={styles.menuCardRow}>
          {/* Left: Info */}
          <View style={styles.menuCardInfo}>
            {/* Veg/Non-veg badge */}
            <View style={styles.menuCardBadges}>
              {item.isVegetarian !== undefined && (
                <View style={[styles.vegBadge, item.isVegetarian ? styles.vegBadgeGreen : styles.vegBadgeRed]}>
                  <View style={[styles.vegDot, item.isVegetarian ? styles.vegDotGreen : styles.vegDotRed]} />
                </View>
              )}
              {item.spicyLevel && item.spicyLevel > 0 ? (
                <View style={styles.spicyBadge}>
                  <ThemedText style={styles.spicyText}>
                    {'🌶️'.repeat(Math.min(item.spicyLevel, 3))}
                  </ThemedText>
                </View>
              ) : null}
              {!item.isAvailable && (
                <View style={styles.unavailableBadge}>
                  <ThemedText style={styles.unavailableText}>Unavailable</ThemedText>
                </View>
              )}
            </View>

            <ThemedText style={styles.menuItemName} numberOfLines={2}>{item.name}</ThemedText>

            {item.description ? (
              <ThemedText style={styles.menuItemDesc} numberOfLines={2}>{item.description}</ThemedText>
            ) : null}

            {/* Price row */}
            <View style={styles.priceRow}>
              <ThemedText style={styles.menuItemPrice}>{currencySymbol}{item.price}</ThemedText>
              {item.originalPrice && item.originalPrice > item.price ? (
                <ThemedText style={styles.menuItemOriginalPrice}>{currencySymbol}{item.originalPrice}</ThemedText>
              ) : null}
              {item.preparationTime ? (
                <View style={styles.prepTimeBadge}>
                  <Ionicons name="time-outline" size={11} color={Colors.text.tertiary} />
                  <ThemedText style={styles.prepTimeText}>{item.preparationTime}</ThemedText>
                </View>
              ) : null}
            </View>

            {/* Allergens */}
            {item.allergens && item.allergens.length > 0 ? (
              <View style={styles.allergenRow}>
                <Ionicons name="alert-circle" size={12} color={Colors.warning} />
                <ThemedText style={styles.allergenText} numberOfLines={1}>
                  {item.allergens.join(', ')}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {/* Right: Image + Add button */}
          <View style={styles.menuCardRight}>
            {item.image ? (
              <CachedImage
                source={{ uri: item.image }}
                style={styles.menuItemImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.menuItemImagePlaceholder}>
                <Ionicons name="fast-food-outline" size={28} color={Colors.border.default} />
              </View>
            )}

            {/* Add / Quantity control */}
            {item.isAvailable && (
              <View style={styles.addControlWrap}>
                {quantity === 0 ? (
                  <Pressable
                    style={styles.addBtn}
                    onPress={() => handleAddToCart(item)}
                  >
                    <ThemedText style={styles.addBtnText}>ADD</ThemedText>
                    <Ionicons name="add" size={14} color={Colors.brand.purple} style={{ marginLeft: 2 }} />
                  </Pressable>
                ) : (
                  <View style={styles.qtyControl}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => handleRemoveFromCart(item.id)}
                    >
                      <Ionicons name="remove" size={16} color={Colors.text.inverse} />
                    </Pressable>
                    <ThemedText style={styles.qtyText}>{quantity}</ThemedText>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Ionicons name="add" size={16} color={Colors.text.inverse} />
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [getCartQuantity, currencySymbol, handleAddToCart, handleRemoveFromCart]);

  const keyExtractor = useCallback((item: MenuItem) => item.id, []);

  const ListHeaderContent = useMemo(() => (
    <View style={styles.itemsCountBar}>
      <ThemedText style={styles.itemsCountText}>
        {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
      </ThemedText>
    </View>
  ), [filteredItems.length]);

  const ListEmptyContent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="restaurant-outline" size={40} color={Colors.border.default} />
      </View>
      <ThemedText style={styles.emptyTitle}>
        {categories.length === 0 ? 'Menu not available' : 'No items here'}
      </ThemedText>
      <ThemedText style={styles.emptyText}>
        {categories.length === 0
          ? 'This restaurant hasn\'t set up their menu yet.'
          : 'Try selecting a different category.'}
      </ThemedText>
    </View>
  ), [categories.length]);

  const ListFooterContent = useMemo(() => (
    <View style={{ height: cart.length > 0 ? 160 : 120 }} />
  ), [cart.length]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CardGridSkeleton />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Menu</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          </View>
          <ThemedText style={styles.errorTitle}>Couldn't load menu</ThemedText>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => fetchMenu()}>
            <Ionicons name="refresh" size={18} color={Colors.text.inverse} />
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>{storeName}</ThemedText>
          {isDineIn && dineInTable ? (
            <View style={styles.tableBadge}>
              <Ionicons name="restaurant-outline" size={11} color={Colors.brand.purple} />
              <ThemedText style={styles.tableBadgeText}>Table {dineInTable}</ThemedText>
            </View>
          ) : null}
        </View>
        {cart.length > 0 ? (
          <View style={styles.cartBadgeWrap}>
            <Ionicons name="cart-outline" size={24} color={Colors.brand.purple} />
            <View style={styles.cartCountBadge}>
              <ThemedText style={styles.cartCountText}>{cartItemCount}</ThemedText>
            </View>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Dine-in table number input */}
      {isDineIn && !tableNumber && (
        <View style={styles.tableInputWrapper}>
          <View style={styles.tableInputContainer}>
            <View style={styles.tableIconWrap}>
              <Ionicons name="restaurant" size={16} color={Colors.brand.purple} />
            </View>
            <TextInput
              style={styles.tableInput}
              placeholder="Enter your table number"
              placeholderTextColor={Colors.text.tertiary}
              value={dineInTable}
              onChangeText={setDineInTable}
              keyboardType="default"
              autoCapitalize="characters"
            />
            {dineInTable ? (
              <View style={styles.tableCheckmark}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* Category Filters */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          <Pressable
            style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Ionicons
              name="grid-outline"
              size={14}
              color={selectedCategory === 'all' ? Colors.text.inverse : Colors.text.tertiary}
              style={{ marginRight: 4 }}
            />
            <ThemedText style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
              All
            </ThemedText>
          </Pressable>
          {categories.map(category => (
            <Pressable
              key={category.id}
              style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <ThemedText style={[styles.categoryText, selectedCategory === category.id && styles.categoryTextActive]}>
                {category.name}
              </ThemedText>
              <View style={[styles.categoryCount, selectedCategory === category.id && styles.categoryCountActive]}>
                <ThemedText style={[styles.categoryCountText, selectedCategory === category.id && styles.categoryCountTextActive]}>
                  {category.items.length}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Menu Items */}
      <FlashList
        data={filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.menuContent}
        ListHeaderComponent={ListHeaderContent}
        ListEmptyComponent={ListEmptyContent}
        ListFooterComponent={ListFooterContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.brand.purple} />
        }
        estimatedItemSize={100}
      />

      {/* Cart Footer */}
      {cart.length > 0 && (
        <View style={styles.cartFooter}>
          <LinearGradient
            colors={[Colors.brand.purple, colors.brand.purpleDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cartGradient}
          >
            <View style={styles.cartLeft}>
              <ThemedText style={styles.cartItemCount}>
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
              </ThemedText>
              <ThemedText style={styles.cartTotal}>
                {currencySymbol}{cartTotal.toFixed(2)}
              </ThemedText>
            </View>
            <Pressable
              style={styles.placeOrderBtn}
              onPress={handlePlaceOrder}
              disabled={submitting}
             
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.brand.purple} />
              ) : (
                <>
                  <ThemedText style={styles.placeOrderText}>
                    Place Order
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={18} color={Colors.brand.purple} />
                </>
              )}
            </Pressable>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius['3xl'] + 8,
    backgroundColor: Colors.errorScale[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  errorTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 28,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tableBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.brand.purple,
  },
  cartBadgeWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartCountBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.sm,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  cartCountText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },

  // Table input
  tableInputWrapper: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.background.primary,
  },
  tableInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F5FF',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
  },
  tableIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.tint.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tableInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
    padding: 0,
  },
  tableCheckmark: {
    marginLeft: Spacing.sm,
  },

  // Categories
  categoriesWrapper: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.brand.purple,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  categoryTextActive: {
    color: Colors.text.inverse,
  },
  categoryCount: {
    marginLeft: 6,
    backgroundColor: Colors.border.default,
    borderRadius: BorderRadius.sm,
    minWidth: 20,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  categoryCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.tertiary,
  },
  categoryCountTextActive: {
    color: Colors.text.inverse,
  },

  // Items count bar
  itemsCountBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.secondary,
  },
  itemsCountText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },

  // Menu list
  menuContainer: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: Spacing.base,
  },

  // Menu card (Swiggy/Zomato style - horizontal layout)
  menuCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    marginBottom: Spacing.md,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    }),
  },
  menuCardUnavailable: {
    opacity: 0.5,
  },
  menuCardRow: {
    flexDirection: 'row',
  },
  menuCardInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  menuCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  vegBadge: {
    width: 16,
    height: 16,
    borderRadius: 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegBadgeGreen: {
    borderColor: Colors.success,
  },
  vegBadgeRed: {
    borderColor: Colors.error,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vegDotGreen: {
    backgroundColor: Colors.success,
  },
  vegDotRed: {
    backgroundColor: Colors.error,
  },
  spicyBadge: {
    marginLeft: 2,
  },
  spicyText: {
    fontSize: 11,
  },
  unavailableBadge: {
    backgroundColor: Colors.errorScale[50],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  unavailableText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.error,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 3,
    lineHeight: 20,
  },
  menuItemDesc: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    lineHeight: 17,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  menuItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  menuItemOriginalPrice: {
    fontSize: 13,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  prepTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
  },
  prepTimeText: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  allergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  allergenText: {
    fontSize: 11,
    color: colors.brand.amberDark,
  },

  // Right side (image + add button)
  menuCardRight: {
    alignItems: 'center',
    width: 110,
  },
  menuItemImage: {
    width: 110,
    height: 90,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
  },
  menuItemImagePlaceholder: {
    width: 110,
    height: 90,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.background.secondary,
  },
  addControlWrap: {
    marginTop: -14,
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderWidth: 1.5,
    borderColor: Colors.brand.purple,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 18,
    paddingVertical: 6,
    minWidth: 80,
    ...Platform.select({
      ios: { shadowColor: Colors.brand.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 4px rgba(124,58,237,0.15)' },
    }),
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.brand.purple,
    letterSpacing: 0.5,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.sm,
    minWidth: 80,
    ...Platform.select({
      ios: { shadowColor: Colors.brand.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 4px rgba(124,58,237,0.2)' },
    }),
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qtyText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
    minWidth: 20,
    textAlign: 'center',
  },

  // Empty state
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: colors.neutral[700],
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },

  // Cart footer
  cartFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 12 },
      web: { boxShadow: '0 -3px 12px rgba(0,0,0,0.12)' },
    }),
  },
  cartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  cartLeft: {},
  cartItemCount: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  cartTotal: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginTop: 2,
  },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  placeOrderText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.brand.purple,
  },
});

export default withErrorBoundary(MenuPage, 'MenuStoreId');
