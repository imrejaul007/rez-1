// Product Selector Usage Examples
// Example implementations for different use cases

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductSelector from './ProductSelector';
import { ProductSelectorProduct } from '@/types/product-selector.types';
import { useGetCurrencySymbol } from '@/stores/selectors';

/**
 * Example 1: Basic Video Upload with Product Tagging
 */
export function BasicVideoUploadExample() {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ProductSelectorProduct[]>([]);

  const handleProductsChange = (products: ProductSelectorProduct[]) => {
    setSelectedProducts(products);
  };

  return (
    <View style={styles.example}>
      <Text style={styles.exampleTitle}>Video Upload - Tag Products</Text>

      <Pressable
        style={styles.tagButton}
        onPress={() => setShowProductSelector(true)}
      >
        <Ionicons name="pricetag" size={20} color="#6366F1" />
        <Text style={styles.tagButtonText}>
          Tag Products ({selectedProducts.length}/10)
        </Text>
      </Pressable>

      {selectedProducts.length > 0 && (
        <View style={styles.taggedProducts}>
          <Text style={styles.taggedTitle}>Tagged Products:</Text>
          {selectedProducts.map((product) => (
            <Text key={product._id} style={styles.taggedItem}>
              • {product.name}
            </Text>
          ))}
        </View>
      )}

      <ProductSelector
        visible={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        selectedProducts={selectedProducts}
        onProductsChange={handleProductsChange}
        maxProducts={10}
        minProducts={1}
        title="Tag Products in Video"
      />
    </View>
  );
}

/**
 * Example 2: Review Form with Product Selection
 */
export function ReviewFormExample() {
  const [showSelector, setShowSelector] = useState(false);
  const [reviewedProduct, setReviewedProduct] = useState<ProductSelectorProduct | null>(
    null
  );

  const handleProductSelect = (products: ProductSelectorProduct[]) => {
    if (products.length > 0) {
      setReviewedProduct(products[0]);
    }
  };

  return (
    <View style={styles.example}>
      <Text style={styles.exampleTitle}>Product Review - Select Product</Text>

      <Pressable
        style={styles.selectButton}
        onPress={() => setShowSelector(true)}
      >
        <Ionicons name="search" size={20} color="#FFFFFF" />
        <Text style={styles.selectButtonText}>
          {reviewedProduct ? 'Change Product' : 'Select Product to Review'}
        </Text>
      </Pressable>

      {reviewedProduct && (
        <View style={styles.selectedProduct}>
          <Text style={styles.selectedProductName}>{reviewedProduct.name}</Text>
          <Text style={styles.selectedProductStore}>
            by {reviewedProduct.store.name}
          </Text>
        </View>
      )}

      <ProductSelector
        visible={showSelector}
        onClose={() => setShowSelector(false)}
        selectedProducts={reviewedProduct ? [reviewedProduct] : []}
        onProductsChange={handleProductSelect}
        allowMultiple={false}
        maxProducts={1}
        minProducts={1}
        title="Select Product to Review"
        confirmButtonText="Select Product"
      />
    </View>
  );
}

/**
 * Example 3: Shopping List Creator
 */
export function ShoppingListExample() {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [showSelector, setShowSelector] = useState(false);
  const [listProducts, setListProducts] = useState<ProductSelectorProduct[]>([]);

  const totalValue = listProducts.reduce(
    (sum, product) => sum + (product.salePrice || product.basePrice),
    0
  );

  return (
    <View style={styles.example}>
      <Text style={styles.exampleTitle}>Shopping List - Add Items</Text>

      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listCount}>{listProducts.length} Items</Text>
          <Text style={styles.listValue}>Total: {currencySymbol}{totalValue.toLocaleString('en-IN')}</Text>
        </View>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowSelector(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Items</Text>
        </Pressable>
      </View>

      {listProducts.length > 0 && (
        <ScrollView style={styles.listItems}>
          {listProducts.map((product, index) => (
            <View key={product._id} style={styles.listItem}>
              <Text style={styles.listItemNumber}>{index + 1}.</Text>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemName}>{product.name}</Text>
                <Text style={styles.listItemPrice}>
                  {currencySymbol}{(product.salePrice || product.basePrice).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <ProductSelector
        visible={showSelector}
        onClose={() => setShowSelector(false)}
        selectedProducts={listProducts}
        onProductsChange={setListProducts}
        maxProducts={50}
        minProducts={0}
        requireSelection={false}
        title="Add to Shopping List"
        confirmButtonText="Add to List"
      />
    </View>
  );
}

/**
 * Example 4: Product Comparison Tool
 */
export function ProductComparisonExample() {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [showSelector, setShowSelector] = useState(false);
  const [compareProducts, setCompareProducts] = useState<ProductSelectorProduct[]>([]);

  return (
    <View style={styles.example}>
      <Text style={styles.exampleTitle}>Compare Products</Text>

      <Pressable
        style={styles.compareButton}
        onPress={() => setShowSelector(true)}
        disabled={compareProducts.length >= 4}
      >
        <Ionicons name="git-compare" size={20} color="#FFFFFF" />
        <Text style={styles.compareButtonText}>
          {compareProducts.length === 0
            ? 'Select Products to Compare'
            : `Compare ${compareProducts.length} Products`}
        </Text>
      </Pressable>

      {compareProducts.length >= 2 && (
        <View style={styles.compareGrid}>
          {compareProducts.map((product) => (
            <View key={product._id} style={styles.compareCard}>
              <Text style={styles.compareCardName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.compareCardPrice}>
                {currencySymbol}{(product.salePrice || product.basePrice).toLocaleString('en-IN')}
              </Text>
              {product.rating && (
                <Text style={styles.compareCardRating}>
                  ⭐ {product.rating.average}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <ProductSelector
        visible={showSelector}
        onClose={() => setShowSelector(false)}
        selectedProducts={compareProducts}
        onProductsChange={setCompareProducts}
        maxProducts={4}
        minProducts={2}
        title="Select Products to Compare"
        confirmButtonText="Compare"
      />
    </View>
  );
}

/**
 * Example 5: UGC Content Creation (Main Use Case)
 */
export function UGCContentCreationExample() {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [showSelector, setShowSelector] = useState(false);
  const [taggedProducts, setTaggedProducts] = useState<ProductSelectorProduct[]>([]);
  const [videoTitle, setVideoTitle] = useState('');

  const handlePublish = () => {
  };

  return (
    <SafeAreaView style={styles.ugcContainer}>
      <ScrollView contentContainerStyle={styles.ugcContent}>
        <Text style={styles.ugcTitle}>Create UGC Content</Text>

        {/* Video Preview Placeholder */}
        <View style={styles.videoPreview}>
          <Ionicons name="videocam" size={64} color="#9CA3AF" />
          <Text style={styles.videoPreviewText}>Video Preview</Text>
        </View>

        {/* Product Tagging Section */}
        <View style={styles.ugcSection}>
          <View style={styles.ugcSectionHeader}>
            <Text style={styles.ugcSectionTitle}>Tagged Products</Text>
            <Text style={styles.ugcSectionSubtitle}>
              Tag 5-10 products featured in your video
            </Text>
          </View>

          <Pressable
            style={[
              styles.tagProductsButton,
              taggedProducts.length >= 5 && styles.tagProductsButtonActive,
            ]}
            onPress={() => setShowSelector(true)}
          >
            <Ionicons
              name="pricetag-outline"
              size={24}
              color={taggedProducts.length >= 5 ? '#ffcd57' : '#6366F1'}
            />
            <View style={styles.tagProductsButtonContent}>
              <Text
                style={[
                  styles.tagProductsButtonText,
                  taggedProducts.length >= 5 && styles.tagProductsButtonTextActive,
                ]}
              >
                {taggedProducts.length === 0
                  ? 'Tag Products in Video'
                  : `${taggedProducts.length} Products Tagged`}
              </Text>
              {taggedProducts.length > 0 && (
                <Text style={styles.tagProductsButtonHint}>
                  {taggedProducts.length < 5
                    ? `Tag ${5 - taggedProducts.length} more`
                    : 'Ready to publish!'}
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={taggedProducts.length >= 5 ? '#ffcd57' : '#6B7280'}
            />
          </Pressable>

          {/* Tagged Products List */}
          {taggedProducts.length > 0 && (
            <View style={styles.taggedProductsList}>
              {taggedProducts.map((product, index) => (
                <View key={product._id} style={styles.taggedProductItem}>
                  <View style={styles.taggedProductNumber}>
                    <Text style={styles.taggedProductNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.taggedProductDetails}>
                    <Text style={styles.taggedProductName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.taggedProductMeta}>
                      {product.store.name} • {currencySymbol}
                      {(product.salePrice || product.basePrice).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      setTaggedProducts((prev) =>
                        prev.filter((p) => p._id !== product._id)
                      )
                    }
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Publish Button */}
        <Pressable
          style={[
            styles.publishButton,
            taggedProducts.length < 5 && styles.publishButtonDisabled,
          ]}
          onPress={handlePublish}
          disabled={taggedProducts.length < 5}
        >
          <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
          <Text style={styles.publishButtonText}>Publish Content</Text>
        </Pressable>
      </ScrollView>

      <ProductSelector
        visible={showSelector}
        onClose={() => setShowSelector(false)}
        selectedProducts={taggedProducts}
        onProductsChange={setTaggedProducts}
        maxProducts={10}
        minProducts={5}
        title="Tag Products in Your Video"
        confirmButtonText="Done"
      />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  example: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
  },
  exampleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F7FF',
    borderWidth: 2,
    borderColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  tagButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
  taggedProducts: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  taggedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  taggedItem: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedProduct: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  selectedProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  selectedProductStore: {
    fontSize: 13,
    color: '#15803D',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  listValue: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listItems: {
    maxHeight: 300,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listItemNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    width: 24,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 2,
  },
  listItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  compareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  compareCard: {
    width: '48%',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compareCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  compareCardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 4,
  },
  compareCardRating: {
    fontSize: 12,
    color: '#6B7280',
  },
  ugcContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  ugcContent: {
    padding: 20,
  },
  ugcTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  videoPreview: {
    height: 200,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  videoPreviewText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  ugcSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  ugcSectionHeader: {
    marginBottom: 16,
  },
  ugcSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  ugcSectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  tagProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F5F7FF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  tagProductsButtonActive: {
    borderColor: '#ffcd57',
    backgroundColor: '#faf1e0',
  },
  tagProductsButtonContent: {
    flex: 1,
  },
  tagProductsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
  tagProductsButtonTextActive: {
    color: '#ffcd57',
  },
  tagProductsButtonHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  taggedProductsList: {
    marginTop: 16,
    gap: 8,
  },
  taggedProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  taggedProductNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taggedProductNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  taggedProductDetails: {
    flex: 1,
  },
  taggedProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  taggedProductMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
  },
  publishButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
