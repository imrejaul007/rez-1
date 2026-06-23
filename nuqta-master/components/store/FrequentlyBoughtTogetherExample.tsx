/**
 * FrequentlyBoughtTogether Integration Examples
 *
 * Shows how to integrate the FrequentlyBoughtTogether component
 * in different pages and scenarios
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import FrequentlyBoughtTogether from './FrequentlyBoughtTogether';
import { ProductItem } from '@/types/homepage.types';
import { useIsMounted } from '@/hooks/useIsMounted';

// Example 1: Product Detail Page Integration
export function ProductDetailPageExample() {
  // Sample product from product detail page
  const currentProduct: ProductItem = {
    id: '507f1f77bcf86cd799439011',
    type: 'product',
    name: 'Premium Wireless Headphones',
    brand: 'AudioMax',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    description: 'High-quality wireless headphones with active noise cancellation',
    title: 'Premium Wireless Headphones',
    price: {
      current: 4999,
      original: 7999,
      currency: 'INR',
      discount: 38,
    },
    category: 'Electronics',
    rating: { value: 4.8, count: 1250 },
    availabilityStatus: 'in_stock',
    tags: ['electronics', 'audio', 'wireless'],
  };

  const handleBundleAdded = () => {
    // Optional: Navigate to cart, show confirmation, etc.
  };

  return (
    <ScrollView style={styles.container}>
      {/* ... Product details, images, description, etc. ... */}

      {/* Frequently Bought Together Section */}
      <FrequentlyBoughtTogether
        currentProduct={currentProduct}
        onBundleAdded={handleBundleAdded}
      />

      {/* ... Reviews, Q&A, related products, etc. ... */}
    </ScrollView>
  );
}

// Example 2: MainStorePage Integration
export function MainStorePageExample() {
  // Product from store page
  const storeProduct: ProductItem = {
    id: '507f1f77bcf86cd799439022',
    type: 'product',
    name: 'Smart Fitness Watch',
    brand: 'FitTech Pro',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    description: 'Advanced fitness tracking with heart rate monitoring',
    title: 'Smart Fitness Watch',
    price: {
      current: 3499,
      original: 5999,
      currency: 'INR',
      discount: 42,
    },
    category: 'Wearables',
    rating: { value: 4.6, count: 890 },
    availabilityStatus: 'in_stock',
    tags: ['fitness', 'smartwatch', 'health'],
  };

  return (
    <ScrollView style={styles.container}>
      {/* ... Store header, product image, details ... */}

      {/* Bundle Recommendations */}
      <FrequentlyBoughtTogether
        currentProduct={storeProduct}
        onBundleAdded={() => {
          // Track analytics
        }}
      />

      {/* ... Store policies, reviews, etc. ... */}
    </ScrollView>
  );
}

// Example 3: Dynamic Product Page Integration
export function DynamicProductExample() {
  const [currentProduct, setCurrentProduct] = React.useState<ProductItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const isMounted = useIsMounted();

  React.useEffect(() => {
    // Load product from API
    loadProduct();
  }, []);

  const loadProduct = async () => {
    try {
      setLoading(true);
      // Fetch product from API
      // const response = await productsService.getProductById(productId);
      // setCurrentProduct(response.data);

      // For demo purposes, using mock data
      if (!isMounted()) return;
      setCurrentProduct({
        id: '507f1f77bcf86cd799439033',
        type: 'product',
        name: 'Professional Camera Kit',
        brand: 'PhotoPro',
        image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
        description: 'Complete DSLR camera kit for professionals',
        title: 'Professional Camera Kit',
        price: {
          current: 45999,
          original: 65999,
          currency: 'INR',
          discount: 30,
        },
        category: 'Photography',
        rating: { value: 4.9, count: 567 },
        availabilityStatus: 'in_stock',
        tags: ['camera', 'photography', 'professional'],
      });
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  if (loading || !currentProduct) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Product details */}

      {/* Only show bundle if product exists */}
      {currentProduct && (
        <FrequentlyBoughtTogether
          currentProduct={currentProduct}
          onBundleAdded={() => {
            // Optional callback
          }}
        />
      )}
    </ScrollView>
  );
}

// Example 4: Cart Recommendations (Before Checkout)
export function CartRecommendationsExample() {
  const cartItems: ProductItem[] = [
    {
      id: '507f1f77bcf86cd799439044',
      type: 'product',
      name: 'Gaming Laptop',
      brand: 'TechGaming',
      image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800',
      description: 'High-performance gaming laptop',
      title: 'Gaming Laptop',
      price: {
        current: 89999,
        original: 119999,
        currency: 'INR',
        discount: 25,
      },
      category: 'Computers',
      rating: { value: 4.7, count: 345 },
      availabilityStatus: 'in_stock',
      tags: ['gaming', 'laptop', 'computers'],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Cart items list */}

      {/* Show bundle recommendations for cart items */}
      {cartItems.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>Complete Your Setup</Text>
          <FrequentlyBoughtTogether
            currentProduct={cartItems[0]}
            onBundleAdded={() => {
            }}
          />
        </View>
      )}

      {/* Checkout button */}
    </ScrollView>
  );
}

// Example 5: Multiple Bundle Sections (Different Products)
export function MultipleBundlesExample() {
  const featuredProducts: ProductItem[] = [
    {
      id: '507f1f77bcf86cd799439055',
      type: 'product',
      name: 'Ergonomic Office Chair',
      brand: 'ComfortMax',
      image: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800',
      description: 'Premium ergonomic chair for office',
      title: 'Ergonomic Office Chair',
      price: {
        current: 12999,
        original: 18999,
        currency: 'INR',
        discount: 32,
      },
      category: 'Furniture',
      rating: { value: 4.8, count: 234 },
      availabilityStatus: 'in_stock',
      tags: ['furniture', 'office', 'ergonomic'],
    },
    {
      id: '507f1f77bcf86cd799439066',
      type: 'product',
      name: 'Standing Desk',
      brand: 'DeskPro',
      image: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800',
      description: 'Adjustable height standing desk',
      title: 'Standing Desk',
      price: {
        current: 24999,
        original: 34999,
        currency: 'INR',
        discount: 29,
      },
      category: 'Furniture',
      rating: { value: 4.7, count: 456 },
      availabilityStatus: 'in_stock',
      tags: ['furniture', 'office', 'desk'],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Home Office Essentials</Text>

      {featuredProducts.map((product) => (
        <View key={product.id} style={styles.bundleSection}>
          <FrequentlyBoughtTogether
            currentProduct={product}
            onBundleAdded={() => {
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  recommendationsSection: {
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    padding: 16,
  },
  bundleSection: {
    marginBottom: 12,
  },
});

// Export all examples
export default {
  ProductDetailPageExample,
  MainStorePageExample,
  DynamicProductExample,
  CartRecommendationsExample,
  MultipleBundlesExample,
};
