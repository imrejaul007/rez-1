// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Wishlist Page
// Page for managing user's wishlists with saved deals support

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import wishlistApi, { Wishlist, WishlistItem as ApiWishlistItem, DiscountSnapshot } from '@/services/wishlistApi';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { useWishlist } from '@/contexts/WishlistContext';
import ShareModal from '@/components/wishlist/ShareModal';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import { WishlistItemSkeleton } from '@/components/common/SkeletonLoader';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface WishlistItem {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  inStock: boolean;
  addedAt: string;
  productId: string;
  itemType: 'product' | 'discount' | 'store' | 'video';
  discountSnapshot?: DiscountSnapshot;
  notes?: string;
}

// Helper to check if a deal is expired
const isDealExpired = (validUntil?: string): boolean => {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
};

// Helper to get days until expiry
const getDaysUntilExpiry = (validUntil?: string): number | null => {
  if (!validUntil) return null;
  const expiryDate = new Date(validUntil);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper to format discount value - note: currencySymbol must be passed as parameter
const formatDiscountValue = (snapshot?: DiscountSnapshot, currencySymbol: string): string => {
  if (!snapshot) return '';
  if (snapshot.type === 'percentage') {
    return `${snapshot.value}% OFF`;
  }
  return `${currencySymbol}${snapshot.value} OFF`;
};

interface WishlistData {
  id: string;
  name: string;
  description?: string;
  items: WishlistItem[];
  itemCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

function WishlistPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { refreshWishlist } = useWishlist(); // Global wishlist context for syncing state
  const [wishlists, setWishlists] = useState<WishlistData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [newWishlistDescription, setNewWishlistDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedWishlistForShare, setSelectedWishlistForShare] = useState<WishlistData | null>(null);
  const isMounted = useIsMounted();

  // Helper to normalize MongoDB ObjectId to string
  const normalizeId = (id: any): string => {
    if (!id) return '';
    // Handle MongoDB ObjectId format
    if (typeof id === 'object' && id.$oid) return id.$oid;
    if (typeof id === 'object' && id._id) return normalizeId(id._id);
    if (typeof id === 'object' && id.toString) return id.toString();
    return String(id);
  };

  // Check if itemId is populated (object with data) vs just an ObjectId reference
  const isPopulated = (itemId: any): boolean => {
    return itemId && typeof itemId === 'object' && (itemId.name || itemId.title || itemId.images);
  };

  // Convert backend wishlist item to frontend format
  const convertWishlistItem = (apiItem: any, index: number, wishlistId: string): WishlistItem => {
    // Backend uses capitalized itemType: 'Product', 'Store', 'Video', 'Discount'
    // Normalize to lowercase for frontend
    const rawItemType = apiItem.itemType || 'Product';
    const itemType = (typeof rawItemType === 'string' ? rawItemType.toLowerCase() : 'product') as WishlistItem['itemType'];

    // Generate a unique ID - use multiple fallbacks with wishlistId for uniqueness
    const rawId = apiItem.id || apiItem._id;
    const uniqueId = rawId ? normalizeId(rawId) : `item-${wishlistId}-${index}-${Date.now()}`;

    // Handle discount items - check for discountSnapshot
    if (itemType === 'discount' || apiItem.discountSnapshot) {
      const snapshot = apiItem.discountSnapshot;
      if (snapshot) {
        return {
          id: uniqueId,
          name: snapshot.name || 'Saved Deal',
          image: '',
          price: 0,
          discount: snapshot.value,
          inStock: !isDealExpired(snapshot.validUntil),
          addedAt: apiItem.addedAt || new Date().toISOString(),
          productId: normalizeId(snapshot.discountId) || uniqueId,
          itemType: 'discount',
          discountSnapshot: snapshot,
          notes: apiItem.notes,
        };
      }
    }

    // Backend populates itemId with the document - check if it's populated
    // itemId will be an object with data if populated, or just an ObjectId string if not
    const populatedItem = isPopulated(apiItem.itemId) ? apiItem.itemId : null;

    // Get the actual itemId for reference
    const actualItemId = populatedItem
      ? normalizeId(populatedItem._id || populatedItem.id)
      : normalizeId(apiItem.itemId);

    // ===== HANDLE STORE ITEMS =====
    if (itemType === 'store') {
      // Store fields: name, logo, coverImage, slug, description
      const storeName = populatedItem?.name || 'Followed Store';
      const storeImage = populatedItem?.logo || populatedItem?.coverImage || populatedItem?.images?.[0] || '';

      return {
        id: uniqueId,
        name: storeName,
        image: storeImage,
        price: 0, // Stores don't have prices
        originalPrice: undefined,
        discount: undefined,
        inStock: true, // Stores are always "in stock"
        addedAt: apiItem.addedAt || new Date().toISOString(),
        productId: actualItemId || uniqueId,
        itemType: 'store',
        notes: apiItem.notes,
      };
    }

    // ===== HANDLE PRODUCT ITEMS =====
    if (itemType === 'product') {
      // Product fields: name, images, basePrice, salePrice, title
      const productName = populatedItem?.name || populatedItem?.title || 'Saved Product';
      const productImage = populatedItem?.images?.[0] || populatedItem?.image || populatedItem?.thumbnail || '';

      // Get price - prefer salePrice over basePrice
      let productPrice = 0;
      if (typeof populatedItem?.salePrice === 'number') {
        productPrice = populatedItem.salePrice;
      } else if (typeof populatedItem?.basePrice === 'number') {
        productPrice = populatedItem.basePrice;
      } else if (typeof populatedItem?.price === 'number') {
        productPrice = populatedItem.price;
      } else if (apiItem.priceWhenAdded) {
        productPrice = apiItem.priceWhenAdded;
      }

      // Get original price for discount display
      const originalPrice = populatedItem?.basePrice || populatedItem?.originalPrice;

      // Calculate discount percentage if both prices exist
      let discountPercent: number | undefined;
      if (originalPrice && productPrice && originalPrice > productPrice) {
        discountPercent = Math.round(((originalPrice - productPrice) / originalPrice) * 100);
      }

      // Determine stock status
      const inStock = populatedItem?.availability === 'available' ||
                      populatedItem?.inStock === true ||
                      populatedItem?.stock > 0 ||
                      !populatedItem?.outOfStock;

      return {
        id: uniqueId,
        name: productName,
        image: productImage,
        price: productPrice,
        originalPrice: originalPrice !== productPrice ? originalPrice : undefined,
        discount: discountPercent,
        inStock: inStock !== false, // Default to true if not specified
        addedAt: apiItem.addedAt || new Date().toISOString(),
        productId: actualItemId || uniqueId,
        itemType: 'product',
        notes: apiItem.notes,
      };
    }

    // ===== HANDLE VIDEO ITEMS =====
    if (itemType === 'video') {
      const videoName = populatedItem?.title || populatedItem?.name || 'Saved Video';
      const videoImage = populatedItem?.thumbnail || populatedItem?.thumbnailUrl || populatedItem?.images?.[0] || '';

      return {
        id: uniqueId,
        name: videoName,
        image: videoImage,
        price: 0,
        originalPrice: undefined,
        discount: undefined,
        inStock: true,
        addedAt: apiItem.addedAt || new Date().toISOString(),
        productId: actualItemId || uniqueId,
        itemType: 'video',
        notes: apiItem.notes,
      };
    }

    // ===== FALLBACK FOR UNKNOWN TYPES =====
    return {
      id: uniqueId,
      name: populatedItem?.name || populatedItem?.title || 'Saved Item',
      image: populatedItem?.images?.[0] || populatedItem?.image || '',
      price: populatedItem?.price || populatedItem?.salePrice || populatedItem?.basePrice || 0,
      originalPrice: undefined,
      discount: undefined,
      inStock: true,
      addedAt: apiItem.addedAt || new Date().toISOString(),
      productId: actualItemId || uniqueId,
      itemType: itemType,
      notes: apiItem.notes,
    };
  };

  // Convert backend wishlist to frontend format with deduplication
  const convertWishlist = (apiWishlist: any): WishlistData => {
    // Normalize wishlist ID first
    const wishlistId = normalizeId(apiWishlist.id || apiWishlist._id) || `wishlist-${Date.now()}`;

    // Convert items, passing wishlistId for unique key generation
    const rawItems = Array.isArray(apiWishlist.items)
      ? apiWishlist.items.map((item: any, index: number) => convertWishlistItem(item, index, wishlistId))
      : [];

    // Deduplicate items by ID
    const seenIds = new Set<string>();
    const items = rawItems.filter((item: WishlistItem) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });

    return {
      id: wishlistId,
      name: apiWishlist.name || 'My Wishlist',
      description: apiWishlist.description,
      items: items,
      itemCount: items.length,
      isPublic: apiWishlist.isPublic || false,
      createdAt: apiWishlist.createdAt || new Date().toISOString(),
      updatedAt: apiWishlist.updatedAt || new Date().toISOString(),
    };
  };

  const fetchWishlists = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isAuthenticated) {
        setWishlists([]);
        setIsLoading(false);
        return;
      }

      const response = await wishlistApi.getWishlists(1, 50);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch wishlists');
      }

      // Convert and deduplicate wishlists by normalized ID
      const fetchedWishlists = response.data.wishlists.map(convertWishlist);
      const seenWishlistIds = new Set<string>();
      const uniqueWishlists = fetchedWishlists.filter((wishlist) => {
        const normalizedId = normalizeId(wishlist.id);
        if (seenWishlistIds.has(normalizedId)) {
          return false;
        }
        seenWishlistIds.add(normalizedId);
        return true;
      });

      // Filter wishlists: show all non-empty + max 1 empty wishlist
      // This prevents showing multiple empty "My Wishlist" sections
      const nonEmptyWishlists = uniqueWishlists.filter(w => w.itemCount > 0);
      const emptyWishlists = uniqueWishlists.filter(w => w.itemCount === 0);
      const filteredWishlists = [
        ...nonEmptyWishlists,
        // Keep only 1 empty wishlist for users to add items to
        ...(emptyWishlists.length > 0 ? [emptyWishlists[0]] : [])
      ];

      if (!isMounted()) return;
      setWishlists(filteredWishlists);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wishlists';
      if (!errorMessage.includes('401') && !errorMessage.includes('Access token')) {
        setError(errorMessage);
      } else {
        if (!isMounted()) return;
        setWishlists([]);
      }
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlists();
  }, [fetchWishlists]);

  // Refresh wishlist data when screen regains focus (e.g., after removing item on detail page)
  useFocusEffect(
    useCallback(() => {
      fetchWishlists();
    }, [fetchWishlists])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchWishlists();
  }, [fetchWishlists]);

  const handleBackPress = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handleCreateWishlist = useCallback(() => {
    setShowCreateModal(true);
    setNewWishlistName('');
    setNewWishlistDescription('');
  }, []);

  const handleCreateWishlistSubmit = useCallback(async () => {
    if (!newWishlistName.trim()) {
      showAlert('Error', 'Please enter a wishlist name', undefined, 'error');
      return;
    }

    try {
      setIsCreating(true);
      const response = await wishlistApi.createWishlist({
        name: newWishlistName.trim(),
        description: newWishlistDescription.trim() || undefined,
        isPublic: false,
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to create wishlist');
      }

      if (!isMounted()) return;
      setShowCreateModal(false);
      showAlert('Success', 'Wishlist created successfully!', undefined, 'success');
      await fetchWishlists();
    } catch (err) {
      showAlert('Error', 'Failed to create wishlist. Please try again.', undefined, 'error');
    } finally {
      if (!isMounted()) return;
      setIsCreating(false);
    }
  }, [newWishlistName, newWishlistDescription, fetchWishlists]);

  const handleWishlistPress = useCallback((wishlist: WishlistData) => {
    // Navigate to wishlist detail page or show items
    // For now, just show an alert with wishlist info
    showAlert(wishlist.name, `${wishlist.itemCount} items`, undefined, 'info');
  }, []);

  const handleItemPress = useCallback((item: WishlistItem) => {
    if (item.itemType === 'discount' && item.discountSnapshot?.storeId) {
      router.push(`/MainStorePage?storeId=${item.discountSnapshot.storeId}`);
    } else if (item.itemType === 'product') {
      // Use ProductPage with cardId and cardType query params
      router.push(`/product-page?cardId=${item.productId}&cardType=product`);
    } else if (item.itemType === 'store') {
      router.push(`/MainStorePage?storeId=${item.productId}`);
    } else if (item.itemType === 'video') {
      router.push(`/ugc/${item.productId}`);
    }
  }, [router]);

  const handleRemoveItem = useCallback(async (itemId: string, wishlistId: string) => {
    showAlert(
      'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setWishlists(prev =>
                prev.map(wishlist =>
                  wishlist.id === wishlistId
                    ? {
                        ...wishlist,
                        items: wishlist.items.filter(item => item.id !== itemId),
                        itemCount: wishlist.itemCount - 1,
                      }
                    : wishlist
                )
              );
              await wishlistApi.removeFromWishlist(itemId);
              // Sync with global wishlist context so product pages update
              await refreshWishlist();
              showAlert('Success', 'Item removed from wishlist', undefined, 'success');
            } catch (err) {
              showAlert('Error', 'Failed to remove item. Please try again.', undefined, 'error');
              await fetchWishlists();
            }
          },
        },
      ],
      'warning'
    );
  }, [fetchWishlists, refreshWishlist]);

  const handleDeleteWishlist = useCallback(async (wishlistId: string, wishlistName: string) => {
    showAlert(
      'Delete Wishlist',
      `Are you sure you want to delete "${wishlistName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setWishlists(prev => prev.filter(w => w.id !== wishlistId));
              await wishlistApi.deleteWishlist(wishlistId);
              // Sync with global wishlist context so product pages update
              await refreshWishlist();
              showAlert('Success', 'Wishlist deleted', undefined, 'success');
            } catch (err) {
              showAlert('Error', 'Failed to delete wishlist.', undefined, 'error');
              await fetchWishlists();
            }
          },
        },
      ],
      'warning'
    );
  }, [fetchWishlists, refreshWishlist]);

  // Render a deal/discount card (key is handled by FlatList keyExtractor)
  const renderDealCard = (item: WishlistItem, wishlistId: string) => {
    const snapshot = item.discountSnapshot;
    const daysLeft = getDaysUntilExpiry(snapshot?.validUntil);
    const isExpired = isDealExpired(snapshot?.validUntil);

    return (
      <Pressable
        style={[styles.dealCard, isExpired && styles.dealCardExpired]}
        onPress={() => handleItemPress(item)}
      >
        {/* Discount Badge */}
        <View style={[styles.discountBadge, isExpired && styles.discountBadgeExpired]}>
          <Ionicons name="pricetag" size={14} color={isExpired ? Colors.error : Colors.primary[500]} />
          <ThemedText style={[styles.discountBadgeText, isExpired && styles.discountBadgeTextExpired]}>
            {formatDiscountValue(snapshot, currencySymbol)}
          </ThemedText>
        </View>

        {/* Deal Info */}
        <ThemedText style={[styles.dealName, isExpired && styles.dealNameExpired]} numberOfLines={2}>
          {item.name}
        </ThemedText>

        {snapshot?.storeName && (
          <View style={styles.storeRow}>
            <Ionicons name="storefront-outline" size={12} color={Colors.text.secondary} />
            <ThemedText style={styles.dealStoreName}>{snapshot.storeName}</ThemedText>
          </View>
        )}

        {snapshot?.minOrderValue && snapshot.minOrderValue > 0 && (
          <ThemedText style={styles.minOrder}>Min: {currencySymbol}{snapshot.minOrderValue}</ThemedText>
        )}

        {/* Expiry Status */}
        <View style={styles.expiryRow}>
          {isExpired ? (
            <View style={styles.expiredBadge}>
              <Ionicons name="time-outline" size={12} color={Colors.error} />
              <ThemedText style={styles.expiredText}>Expired</ThemedText>
            </View>
          ) : daysLeft !== null && daysLeft <= 7 ? (
            <View style={[styles.expiryBadge, daysLeft <= 3 && styles.expiryBadgeUrgent]}>
              <Ionicons name="time-outline" size={12} color={daysLeft <= 3 ? colors.warningScale[400] : Colors.primary[500]} />
              <ThemedText style={[styles.expiryText, daysLeft <= 3 && styles.expiryTextUrgent]}>
                {daysLeft <= 0 ? 'Today' : `${daysLeft}d left`}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.primary[500]} />
              <ThemedText style={styles.activeText}>Active</ThemedText>
            </View>
          )}

          <Pressable
            style={styles.removeBtn}
            onPress={() => handleRemoveItem(item.id, wishlistId)}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // Render a store card (key is handled by FlatList keyExtractor)
  const renderStoreCard = (item: WishlistItem, wishlistId: string) => (
    <Pressable
      style={styles.storeCard}
      onPress={() => handleItemPress(item)}
    >
      {item.image ? (
        <CachedImage source={item.image} style={styles.storeLogo} />
      ) : (
        <View style={styles.storeLogoPlaceholder}>
          <Ionicons name="storefront-outline" size={28} color={Colors.primary[500]} />
        </View>
      )}
      <View style={styles.storeInfo}>
        <ThemedText style={styles.storeName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        <View style={styles.storeFooter}>
          <View style={styles.followingBadge}>
            <Ionicons name="heart" size={12} color={Colors.primary[500]} />
            <ThemedText style={styles.followingText}>Following</ThemedText>
          </View>
          <Pressable
            style={styles.removeBtn}
            onPress={() => handleRemoveItem(item.id, wishlistId)}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  // Render a product card (key is handled by FlatList keyExtractor)
  const renderProductCard = (item: WishlistItem, wishlistId: string) => (
    <Pressable
      style={styles.productCard}
      onPress={() => handleItemPress(item)}
    >
      {item.image ? (
        <CachedImage source={item.image} style={styles.productImage} />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Ionicons name="image-outline" size={32} color={Colors.text.disabled} />
        </View>
      )}
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        {item.price > 0 && (
          <ThemedText style={styles.productPrice}>
            {currencySymbol}{item.price.toLocaleString()}
          </ThemedText>
        )}
        <View style={styles.productFooter}>
          <View style={[styles.stockBadge, { backgroundColor: item.inStock ? Colors.primary[500] : Colors.error }]}>
            <ThemedText style={styles.stockText}>
              {item.inStock ? 'In Stock' : 'Out of Stock'}
            </ThemedText>
          </View>
          <Pressable
            style={styles.removeBtn}
            onPress={() => handleRemoveItem(item.id, wishlistId)}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  // Render a video card (key is handled by FlatList keyExtractor)
  const renderVideoCard = (item: WishlistItem, wishlistId: string) => (
    <Pressable
      style={styles.videoCard}
      onPress={() => handleItemPress(item)}
    >
      {item.image ? (
        <View style={styles.videoThumbnailContainer}>
          <CachedImage source={item.image} style={styles.videoThumbnail} />
          <View style={styles.playIconOverlay}>
            <Ionicons name="play-circle" size={40} color={Colors.background.primary} />
          </View>
        </View>
      ) : (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam-outline" size={32} color={Colors.text.disabled} />
        </View>
      )}
      <View style={styles.videoInfo}>
        <ThemedText style={styles.videoName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        <Pressable
          style={styles.removeBtn}
          onPress={() => handleRemoveItem(item.id, wishlistId)}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </Pressable>
      </View>
    </Pressable>
  );

  const renderWishlistItem = (wishlistId: string) => ({ item, index }: { item: WishlistItem; index: number }) => {
    switch (item.itemType) {
      case 'discount':
        return renderDealCard(item, wishlistId);
      case 'store':
        return renderStoreCard(item, wishlistId);
      case 'video':
        return renderVideoCard(item, wishlistId);
      case 'product':
      default:
        return renderProductCard(item, wishlistId);
    }
  };

  // Render wishlist card (key is handled by FlatList keyExtractor)
  const renderWishlist = useCallback(({ item: wishlist, index }: { item: WishlistData; index: number }) => {
    // Separate items by type
    const deals = wishlist.items.filter(i => i.itemType === 'discount');
    const stores = wishlist.items.filter(i => i.itemType === 'store');
    const videos = wishlist.items.filter(i => i.itemType === 'video');
    const products = wishlist.items.filter(i => i.itemType === 'product');

    // Build metadata string
    const metaParts: string[] = [];
    metaParts.push(`${wishlist.itemCount} item${wishlist.itemCount !== 1 ? 's' : ''}`);
    if (deals.length > 0) metaParts.push(`${deals.length} deal${deals.length !== 1 ? 's' : ''}`);
    if (stores.length > 0) metaParts.push(`${stores.length} store${stores.length !== 1 ? 's' : ''}`);

    return (
      <View style={styles.wishlistCard}>
        <View style={styles.wishlistHeader}>
          <View style={styles.wishlistInfo}>
            <ThemedText style={styles.wishlistName}>{wishlist.name}</ThemedText>
            <ThemedText style={styles.wishlistMeta}>
              {metaParts.join(' • ')}
            </ThemedText>
          </View>
          <View style={styles.wishlistActions}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => handleWishlistPress(wishlist)}
            >
              <Ionicons name="eye-outline" size={20} color={Colors.primary[500]} />
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                setSelectedWishlistForShare(wishlist);
                setShowShareModal(true);
              }}
            >
              <Ionicons name="share-outline" size={20} color={Colors.primary[500]} />
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => handleDeleteWishlist(wishlist.id, wishlist.name)}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Deals Section */}
        {deals.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag" size={16} color={Colors.primary[500]} />
              <ThemedText style={styles.sectionTitle}>Saved Deals</ThemedText>
            </View>
            <FlashList
              data={deals}
              renderItem={renderWishlistItem(wishlist.id)}
              keyExtractor={(item, idx) => `deal-${wishlist.id}-${item.id}-${idx}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itemsRow}
              estimatedItemSize={70}
            />
          </View>
        )}

        {/* Stores Section */}
        {stores.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="storefront-outline" size={16} color={Colors.primary[500]} />
              <ThemedText style={styles.sectionTitle}>Following Stores</ThemedText>
            </View>
            <FlashList
              data={stores.slice(0, 5)}
              renderItem={renderWishlistItem(wishlist.id)}
              keyExtractor={(item, idx) => `store-${wishlist.id}-${item.id}-${idx}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itemsRow}
              estimatedItemSize={70}
            />
          </View>
        )}

        {/* Products Section */}
        {products.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bag-outline" size={16} color={Colors.primary[500]} />
              <ThemedText style={styles.sectionTitle}>Products</ThemedText>
            </View>
            <FlashList
              data={products.slice(0, 5)}
              renderItem={renderWishlistItem(wishlist.id)}
              keyExtractor={(item, idx) => `product-${wishlist.id}-${item.id}-${idx}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itemsRow}
              estimatedItemSize={70}
            />
          </View>
        )}

        {/* Videos Section */}
        {videos.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="videocam-outline" size={16} color={Colors.primary[500]} />
              <ThemedText style={styles.sectionTitle}>Saved Videos</ThemedText>
            </View>
            <FlashList
              data={videos.slice(0, 5)}
              renderItem={renderWishlistItem(wishlist.id)}
              keyExtractor={(item, idx) => `video-${wishlist.id}-${item.id}-${idx}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.itemsRow}
              estimatedItemSize={70}
            />
          </View>
        )}

        {/* Empty State */}
        {wishlist.items.length === 0 && (
          <View style={styles.emptyWishlist}>
            <Ionicons name="heart-outline" size={40} color={Colors.border.medium} />
            <ThemedText style={styles.emptyText}>No items yet</ThemedText>
          </View>
        )}

        {wishlist.items.length > 5 && (
          <Pressable style={styles.viewAllBtn} onPress={() => handleWishlistPress(wishlist)}>
            <ThemedText style={styles.viewAllText}>View all {wishlist.itemCount} items</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary[500]} />
          </Pressable>
        )}
      </View>
    );
  }, [handleWishlistPress, handleDeleteWishlist, renderWishlistItem, handleItemPress, handleRemoveItem, currencySymbol]);

  // Loading State
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary[500]} />
        <LinearGradient colors={[Colors.primary[500], colors.brand.teal]} style={styles.header}>
          <Pressable style={styles.backBtn} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>My Wishlists</ThemedText>
          <Pressable style={styles.addBtn} onPress={handleCreateWishlist}>
            <Ionicons name="add" size={24} color={Colors.text.inverse} />
          </Pressable>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={{ paddingHorizontal: Spacing.base }}>
              <WishlistItemSkeleton />
            </View>
          ))}
        </View>
      </ThemedView>
    );
  }

  // Error State
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary[500]} />
        <LinearGradient colors={[Colors.primary[500], colors.brand.teal]} style={styles.header}>
          <Pressable style={styles.backBtn} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>My Wishlists</ThemedText>
          <View style={styles.addBtn} />
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <ThemedText style={styles.errorTitle}>Error</ThemedText>
          <ThemedText style={styles.errorDetails}>{error}</ThemedText>
          <Pressable style={styles.retryBtn} onPress={handleRefresh}>
            <ThemedText style={styles.retryBtnText}>Try Again</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[500]} />
      <LinearGradient colors={[Colors.primary[500], colors.brand.teal]} style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>My Wishlists</ThemedText>
        <Pressable style={styles.addBtn} onPress={handleCreateWishlist}>
          <Ionicons name="add" size={24} color={Colors.text.inverse} />
        </Pressable>
      </LinearGradient>

      <View style={styles.content}>
        {wishlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color={Colors.border.medium} />
            <ThemedText style={styles.emptyTitle}>No Wishlists Yet</ThemedText>
            <ThemedText style={styles.emptyDesc}>
              Save your favorite products and deals here
            </ThemedText>
            <Pressable style={styles.createBtn} onPress={handleCreateWishlist}>
              <ThemedText style={styles.createBtnText}>Create Wishlist</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={wishlists}
            renderItem={renderWishlist}
            keyExtractor={(item, index) => `wishlist-${item.id}-${index}`}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary[500]} />
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            estimatedItemSize={200}
          />
        )}
      </View>

      {/* Create Wishlist Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Create New Wishlist</ThemedText>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Wishlist Name"
              placeholderTextColor={Colors.text.tertiary}
              value={newWishlistName}
              onChangeText={setNewWishlistName}
              autoFocus
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.text.tertiary}
              value={newWishlistDescription}
              onChangeText={setNewWishlistDescription}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, (!newWishlistName.trim() || isCreating) && styles.submitBtnDisabled]}
                onPress={handleCreateWishlistSubmit}
                disabled={isCreating || !newWishlistName.trim()}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <ThemedText style={styles.submitBtnText}>Create</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Modal */}
      {selectedWishlistForShare && (
        <ShareModal
          visible={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedWishlistForShare(null);
          }}
          wishlistId={selectedWishlistForShare.id}
          wishlistName={selectedWishlistForShare.name}
          itemCount={selectedWishlistForShare.itemCount}
          ownerName={user?.profile?.firstName || 'User'}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  backBtn: {
    padding: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text.inverse,
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
  },
  addBtn: {
    padding: Spacing.sm,
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  listContainer: {
    paddingBottom: Spacing.xl,
  },

  // Wishlist Card
  wishlistCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.medium,
  },
  wishlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  wishlistInfo: {
    flex: 1,
  },
  wishlistName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  wishlistMeta: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.secondary,
  },
  wishlistActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray[100],
  },

  // Section
  sectionContainer: {
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  itemsRow: {
    paddingVertical: 4,
    paddingBottom: 120,
  },

  // Deal Card
  dealCard: {
    backgroundColor: '#E6F7F1',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.md,
    width: 160,
    borderWidth: 1,
    borderColor: '#B8E5D6',
  },
  dealCardExpired: {
    backgroundColor: colors.errorScale[50],
    borderColor: colors.errorScale[200],
    opacity: 0.85,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1F7E5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  discountBadgeExpired: {
    backgroundColor: colors.errorScale[100],
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary[500],
  },
  discountBadgeTextExpired: {
    color: Colors.error,
  },
  dealName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  dealNameExpired: {
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dealStoreName: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.secondary,
  },
  minOrder: {
    fontSize: 10,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  expiryBadgeUrgent: {
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiryText: {
    fontSize: 10,
    color: Colors.nileBlue,
    fontWeight: '500',
  },
  expiryTextUrgent: {
    color: colors.warningScale[400],
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiredText: {
    fontSize: 10,
    color: Colors.error,
    fontWeight: '500',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  activeText: {
    fontSize: 10,
    color: Colors.nileBlue,
    fontWeight: '500',
  },

  // Product Card
  productCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginRight: Spacing.md,
    width: 140,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray[100],
  },
  productImagePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    marginTop: Spacing.sm,
  },
  productName: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary[500],
    marginBottom: 6,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  removeBtn: {
    padding: 4,
  },

  // Store Card
  storeCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginRight: Spacing.md,
    width: 140,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  storeLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gray[100],
  },
  storeLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F7F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  storeName: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  storeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  followingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F7F1',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  followingText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
    color: Colors.primary[500],
  },

  // Video Card
  videoCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginRight: Spacing.md,
    width: 160,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  videoThumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 90,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.gray[100],
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoPlaceholder: {
    width: '100%',
    height: 90,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  videoName: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },

  // Empty States
  emptyWishlist: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  createBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  createBtnText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },

  // View All
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  viewAllText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.primary[500],
    marginRight: 4,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 15,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.error,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorDetails: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryBtnText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.gray[100],
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default withErrorBoundary(WishlistPage, 'Wishlist');
