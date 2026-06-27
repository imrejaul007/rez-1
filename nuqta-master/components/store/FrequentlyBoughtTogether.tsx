// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProductItem } from '@/types/homepage.types';
import { useCartActions, useGetCurrencySymbol } from '@/stores/selectors';
import { useToast } from '@/hooks/useToast';
import ProductVariantModal, { VariantSelection } from '@/components/cart/ProductVariantModal';
import productsService from '@/services/productsApi';
import CoinIcon from '@/components/ui/CoinIcon';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

export interface BundleProduct extends ProductItem {
  bundleDiscount?: number; // Additional discount when bundled
  purchaseCorrelation?: number; // How often bought together (0-1)
}

interface FrequentlyBoughtTogetherProps {
  currentProduct: ProductItem;
  storeId?: string; // Optional: If provided, fetch products from this store instead
  onBundleAdded?: () => void;
}

function FrequentlyBoughtTogether({
  currentProduct,
  storeId,
  onBundleAdded,
}: FrequentlyBoughtTogetherProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [bundleProducts, setBundleProducts] = useState<BundleProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<ProductItem | null>(null);
  const [pendingVariant, setPendingVariant] = useState<VariantSelection | null>(null);
  const isMounted = useIsMounted();

  const cartActions = useCartActions();
  const { showSuccess, showError } = useToast();

  // Load frequently bought together products
  useEffect(() => {
    // Only load if we have a valid storeId or productId
    if (storeId || currentProduct.id) {
      loadBundleProducts();
    }
  }, [currentProduct.id, storeId]);

  // Auto-select current product by default (only on product pages, not store pages)
  useEffect(() => {
    if (currentProduct && !storeId) {
      setSelectedProducts(new Set([currentProduct.id]));
    } else {
      setSelectedProducts(new Set());
    }
  }, [currentProduct.id, storeId]);

  const loadBundleProducts = async () => {
    try {
      setLoading(true);
      let response;

      // If storeId is provided, fetch products from that store
      if (storeId && storeId.length > 0) {
        try {
          // Get products by store
          const storeResponse = await productsService.getProductsByStore(storeId, {});

          if (storeResponse.success && storeResponse.data) {
            // Handle the store products response format
            const dataArray = Array.isArray(storeResponse.data) ? storeResponse.data : [storeResponse.data];
            if (dataArray.length > 0) {
              const storeData = dataArray[0];
              if (storeData && storeData.products && Array.isArray(storeData.products)) {
                const storeProducts = storeData.products
                  .filter((p: any) => p._id !== currentProduct.id && p.id !== currentProduct.id)
                  .slice(0, 4);
                response = { success: true, data: storeProducts };
              }
            }
          }

          if (!response) {
            response = { success: false, data: [] };
          }
        } catch (err) {
          response = { success: false, data: [] };
        }
      } else {
        // Use the frequently bought together API for product pages
        response = await productsService.getFrequentlyBoughtTogether(currentProduct.id, 4);
      }

      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Map API response to BundleProduct format and filter invalid products
        const products: BundleProduct[] = response.data
          .filter((product: any) => {
            // Only filter out products with ₹0 or missing price - be lenient on images
            const price = product.pricing?.basePrice || product.pricing?.selling || product.price?.current || product.price || 0;
            const hasValidPrice = price && price > 0;
            return hasValidPrice;
          })
          .map((product: any) => ({
            id: product.id || product._id,
            type: 'product',
            name: product.name,
            brand: product.brand || '',
            image: product.image || product.images?.[0]?.url || product.images?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
            description: product.description,
            title: product.name,
            price: {
              current: product.pricing?.selling || product.pricing?.basePrice || product.price?.current || product.price || 0,
              original: product.pricing?.mrp || product.pricing?.original || product.price?.original,
              currency: 'INR',
              discount: product.pricing?.discount || product.price?.discount || 0,
            },
            category: product.category?.name || product.category || 'General',
            rating: (product.ratings && product.ratings.average > 0) ? {
              value: product.ratings.average,
              count: product.ratings.count,
            } : undefined,
            availabilityStatus: (product.isActive !== false && product.inventory?.isAvailable !== false) ? 'in_stock' : 'out_of_stock',
            tags: product.tags || [],
            bundleDiscount: 10,
            purchaseCorrelation: 0.8,
          }));

        if (!isMounted()) return;
        setBundleProducts(products);
      } else {
        // No mock data - just show empty if API returns nothing
        setBundleProducts([]);
      }
    } catch (error) {
      // No mock data on error - just show empty
      if (!isMounted()) return;
      setBundleProducts([]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const generateMockBundleProducts = (): BundleProduct[] => {
    const mockProducts: BundleProduct[] = [
      {
        id: 'bundle-1',
        type: 'product',
        name: 'Premium Product Care Kit',
        brand: 'CareMax',
        image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400',
        description: 'Complete care kit for your products',
        title: 'Premium Product Care Kit',
        price: {
          current: 499,
          original: 699,
          currency: 'INR',
          discount: 29,
        },
        category: 'Accessories',
        rating: { value: 4.5, count: 234 },
        availabilityStatus: 'in_stock',
        tags: ['care', 'accessories'],
        bundleDiscount: 10,
        purchaseCorrelation: 0.85,
      },
      {
        id: 'bundle-2',
        type: 'product',
        name: 'Extended Warranty Plan',
        brand: 'SecurePlus',
        image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
        description: '2-year extended warranty coverage',
        title: 'Extended Warranty Plan',
        price: {
          current: 999,
          original: 1499,
          currency: 'INR',
          discount: 33,
        },
        category: 'Protection',
        rating: { value: 4.7, count: 567 },
        availabilityStatus: 'in_stock',
        tags: ['warranty', 'protection'],
        bundleDiscount: 15,
        purchaseCorrelation: 0.78,
      },
      {
        id: 'bundle-3',
        type: 'product',
        name: 'Replacement Parts Set',
        brand: 'SpareMax',
        image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=400',
        description: 'Essential replacement parts kit',
        title: 'Replacement Parts Set',
        price: {
          current: 799,
          original: 1199,
          currency: 'INR',
          discount: 33,
        },
        category: 'Parts',
        rating: { value: 4.3, count: 189 },
        availabilityStatus: 'in_stock',
        tags: ['parts', 'replacement'],
        bundleDiscount: 12,
        purchaseCorrelation: 0.72,
      },
    ];

    return mockProducts;
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        // Don't allow deselecting the current product
        if (productId === currentProduct.id) return prev;
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const calculateBundlePrice = () => {
    let total = 0;
    let originalTotal = 0;

    // Add current product (only on product pages)
    if (!storeId && selectedProducts.has(currentProduct.id)) {
      total += currentProduct.price.current;
      originalTotal += currentProduct.price.original || currentProduct.price.current;
    }

    // Add bundle/store products
    bundleProducts.forEach((product) => {
      if (selectedProducts.has(product.id)) {
        // No bundle discount on store pages
        const discountedPrice = storeId
          ? product.price.current
          : product.price.current * (1 - (product.bundleDiscount || 0) / 100);
        total += discountedPrice;
        originalTotal += product.price.original || product.price.current;
      }
    });

    const savings = originalTotal - total;
    const savingsPercent = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

    return { total, originalTotal, savings, savingsPercent };
  };

  const handleAddAllToCart = async () => {
    if (selectedProducts.size === 0) {
      showError('Please select at least one product');
      return;
    }

    setAddingToCart(true);

    try {
      const productsToAdd: ProductItem[] = [];

      // Add current product if selected (only on product pages)
      if (!storeId && selectedProducts.has(currentProduct.id)) {
        productsToAdd.push(currentProduct);
      }

      // Add bundle products if selected
      bundleProducts.forEach((product) => {
        if (selectedProducts.has(product.id)) {
          productsToAdd.push(product);
        }
      });

      // Check if any product needs variant selection
      const needsVariant = productsToAdd.find(
        (p) => p.tags?.includes('has-variants') || p.tags?.includes('variant-required')
      );

      if (needsVariant) {
        // Show variant modal for first product that needs it
        setPendingProduct(needsVariant);
        setVariantModalVisible(true);
        return;
      }

      // Add all products to cart
      let successCount = 0;
      let failCount = 0;

      for (const product of productsToAdd) {
        try {
          await cartActions.addItem({
            id: product.id,
            name: product.name,
            image: product.image,
            originalPrice: product.price.original || product.price.current,
            discountedPrice: product.price.current,
            discount: product.price.discount,
          });
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        showSuccess(
          `${successCount} ${successCount === 1 ? 'item' : 'items'} added to cart!`,
          3000
        );
        onBundleAdded?.();
      }

      if (failCount > 0) {
        showError(`Failed to add ${failCount} ${failCount === 1 ? 'item' : 'items'}`, 3000);
      }
    } catch (error) {
      showError('Failed to add items to cart');
    } finally {
      if (!isMounted()) return;
      setAddingToCart(false);
    }
  };

  const handleVariantConfirm = async (variant: VariantSelection) => {
    if (!pendingProduct) return;

    setPendingVariant(variant);
    setVariantModalVisible(false);

    try {
      // Add product with variant to cart
      await cartActions.addItem({
        id: pendingProduct.id,
        name: pendingProduct.name,
        image: pendingProduct.image,
        originalPrice: variant.price || pendingProduct.price.current,
        discountedPrice: variant.price || pendingProduct.price.current,
        discount: pendingProduct.price.discount,
        variant: variant,
      });

      // Continue adding remaining products
      const productsToAdd = bundleProducts.filter(
        (p) => selectedProducts.has(p.id) && p.id !== pendingProduct.id
      );

      // Add current product only on product pages
      if (!storeId && selectedProducts.has(currentProduct.id) && currentProduct.id !== pendingProduct.id) {
        productsToAdd.unshift(currentProduct);
      }

      let successCount = 1; // Already added variant product
      for (const product of productsToAdd) {
        try {
          await cartActions.addItem({
            id: product.id,
            name: product.name,
            image: product.image,
            originalPrice: product.price.original || product.price.current,
            discountedPrice: product.price.current,
            discount: product.price.discount,
          });
          successCount++;
        } catch (error) {
          // silently handle
        }
      }

      showSuccess(`${successCount} ${successCount === 1 ? 'item' : 'items'} added to cart!`, 3000);
      onBundleAdded?.();
    } catch (error) {
      showError('Failed to add item to cart');
    } finally {
      if (!isMounted()) return;
      setPendingProduct(null);
      setPendingVariant(null);
      setAddingToCart(false);
    }
  };

  const handleVariantCancel = () => {
    setVariantModalVisible(false);
    setPendingProduct(null);
    setAddingToCart(false);
  };

  // Use different title for store pages vs product pages
  const sectionTitle = storeId ? 'Popular Products' : 'Frequently Bought Together';
  const subtitle = storeId
    ? 'Top picks from this store'
    : 'Customers who bought this item also purchased';

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{sectionTitle}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.lightMustard} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </View>
    );
  }

  if (bundleProducts.length === 0) {
    return null; // Don't show section if no bundle products
  }

  const { total, originalTotal, savings, savingsPercent } = calculateBundlePrice();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={storeId ? "cube" : "gift"} size={20} color={colors.lightMustard} />
          <Text style={styles.title}>{sectionTitle}</Text>
        </View>
        {savings > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Save {savingsPercent}%</Text>
          </View>
        )}
      </View>

      <Text style={styles.subtitle}>
        {subtitle}
      </Text>

      {/* Products List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsContainer}
      >
        {/* Current Product - Only show on product pages, not store pages */}
        {!storeId && (
          <>
            <BundleProductCard
              product={currentProduct}
              isSelected={selectedProducts.has(currentProduct.id)}
              onToggle={toggleProductSelection}
              isCurrentProduct={true}
            />
            <View style={styles.plusIconContainer}>
              <Ionicons name="add" size={18} color={colors.neutral[400]} />
            </View>
          </>
        )}

        {/* Bundle/Store Products */}
        {bundleProducts.map((product, index) => (
          <React.Fragment key={product.id}>
            <BundleProductCard
              product={product}
              isSelected={selectedProducts.has(product.id)}
              onToggle={toggleProductSelection}
              bundleDiscount={storeId ? undefined : product.bundleDiscount}
            />
            {index < bundleProducts.length - 1 && (
              <View style={styles.plusIconContainer}>
                <Ionicons name="add" size={18} color={colors.neutral[400]} />
              </View>
            )}
          </React.Fragment>
        ))}
      </ScrollView>

      {/* Price Summary */}
      <View style={styles.priceContainer}>
        <View style={styles.priceRow}>
          <Text style={styles.selectedCountText}>
            {selectedProducts.size} {selectedProducts.size === 1 ? 'item' : 'items'} selected
          </Text>
          <View style={styles.priceColumn}>
            {originalTotal > total && (
              <Text style={styles.originalPrice}>{currencySymbol}{originalTotal.toFixed(0)}</Text>
            )}
            <Text style={styles.totalPrice}>{currencySymbol}{total.toFixed(0)}</Text>
          </View>
        </View>

        {savings > 0 && (
          <View style={styles.savingsRow}>
            <Ionicons name="pricetag" size={14} color={colors.lightMustard} />
            <Text style={styles.savingsAmount}>
              You save {currencySymbol}{savings.toFixed(0)} ({savingsPercent}% off)
            </Text>
          </View>
        )}
      </View>

      {/* Add All to Cart Button */}
      <Pressable
        style={[styles.addButton, selectedProducts.size === 0 && styles.addButtonDisabled]}
        onPress={handleAddAllToCart}
        disabled={selectedProducts.size === 0 || addingToCart}
       
      >
        <LinearGradient
          colors={selectedProducts.size === 0 ? [colors.neutral[300], colors.neutral[400]] : [colors.lightMustard, colors.nileBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.addButtonGradient}
        >
          {addingToCart ? (
            <>
              <ActivityIndicator size="small" color={colors.background.primary} />
              <Text style={styles.addButtonText}>Adding to Cart...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cart" size={16} color={colors.background.primary} />
              <Text style={styles.addButtonText}>Add All to Cart</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>

      {/* Variant Modal */}
      {pendingProduct && (
        <ProductVariantModal
          visible={variantModalVisible}
          product={pendingProduct}
          onConfirm={handleVariantConfirm}
          onCancel={handleVariantCancel}
          loading={addingToCart}
        />
      )}
    </View>
  );
}

// Bundle Product Card Component
interface BundleProductCardProps {
  product: ProductItem | BundleProduct;
  isSelected: boolean;
  onToggle: (id: string) => void;
  isCurrentProduct?: boolean;
  bundleDiscount?: number;
}

function BundleProductCard({
  product,
  isSelected,
  onToggle,
  isCurrentProduct = false,
  bundleDiscount,
}: BundleProductCardProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const finalPrice = bundleDiscount
    ? product.price.current * (1 - bundleDiscount / 100)
    : product.price.current;

  return (
    <Pressable
      style={[styles.productCard, isSelected && styles.productCardSelected]}
      onPress={() => !isCurrentProduct && onToggle(product.id)}
     
      disabled={isCurrentProduct}
    >
      {/* Selection Checkbox */}
      <View style={styles.checkboxContainer}>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color={colors.background.primary} />}
        </View>
      </View>

      {/* Product Image */}
      <View style={styles.productImageContainer}>
        <CachedImage source={product.image} style={styles.productImage} contentFit="cover" />
        {isCurrentProduct && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>This Item</Text>
          </View>
        )}
        {bundleDiscount && bundleDiscount > 0 && (
          <View style={styles.bundleDiscountBadge}>
            <Text style={styles.bundleDiscountText}>-{bundleDiscount}%</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price */}
        <View style={styles.priceInfo}>
          <Text style={styles.productPrice}>{currencySymbol}{finalPrice.toFixed(0)}</Text>
          {bundleDiscount && bundleDiscount > 0 && (
            <Text style={styles.productOriginalPrice}>{currencySymbol}{product.price.current.toFixed(0)}</Text>
          )}
        </View>

        {/* Rating */}
        {product.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={10} color={colors.warningScale[400]} />
            <Text style={styles.ratingText}>
              {typeof product.rating.value === 'number'
                ? product.rating.value.toFixed(1)
                : product.rating.value}
            </Text>
          </View>
        )}

        {/* Coin Earnings */}
        <View style={styles.coinEarningsRow}>
          <CoinIcon size={12} />
          <Text style={styles.coinEarningsText}>
            Earn {Math.round(finalPrice * 0.05)} coins
          </Text>
        </View>

        {/* Stock Status */}
        {product.availabilityStatus !== 'in_stock' && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>
              {product.availabilityStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderTopWidth: 0,
    borderTopColor: colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 10,
  },
  savingsBadge: {
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warningScale[700],
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  productsContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  plusIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  productCard: {
    width: 150,
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productCardSelected: {
    borderColor: colors.lightMustard,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    shadowColor: colors.lightMustard,
    shadowOpacity: 0.2,
    elevation: 4,
  },
  checkboxContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.lightMustard,
    borderColor: colors.lightMustard,
  },
  productImageContainer: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.neutral[50],
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  currentBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.text.white,
    textTransform: 'uppercase',
  },
  bundleDiscountBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bundleDiscountText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.white,
  },
  productInfo: {
    gap: 4,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[900],
    lineHeight: 15,
    height: 30,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.lightMustard,
  },
  productOriginalPrice: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.3)',
  },
  ratingText: {
    fontSize: 10,
    color: '#E5A500',
    fontWeight: '700',
  },
  coinEarningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  coinEmoji: {
    fontSize: 10,
    marginRight: 4,
  },
  coinEarningsText: {
    fontSize: 10,
    color: colors.lightMustard,
    fontWeight: '700',
  },
  stockBadge: {
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.error,
  },
  priceContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.gray[900],
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  savingsAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.white,
    letterSpacing: 0.3,
  },
});

export default React.memo(FrequentlyBoughtTogether);
