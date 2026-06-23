import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertDestructive } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { Store } from '@/services/storeSearchService';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface StoreComparisonProps {
  visible: boolean;
  onClose: () => void;
  stores: Store[];
  onRemoveStore: (storeId: string) => void;
  onClearAll: () => void;
}

const StoreComparison: React.FC<StoreComparisonProps> = ({
  visible,
  onClose,
  stores,
  onRemoveStore,
  onClearAll,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
  };

  const handleRemoveStore = (storeId: string) => {
    platformAlertDestructive('Remove Store', 'Are you sure you want to remove this store from comparison?', () => onRemoveStore(storeId), 'Remove');
  };

  const handleClearAll = () => {
    platformAlertDestructive(
      'Clear All',
      'Are you sure you want to clear all stores from comparison?',
      onClearAll,
      'Clear All'
    );
  };

  const renderStoreHeader = (store: Store) => (
    <View style={styles.storeHeader}>
      <View style={styles.storeImageContainer}>
        {store.logo ? (
          <CachedImage source={store.logo} style={styles.storeImage} contentFit="cover" />
        ) : (
          <View style={styles.storeImagePlaceholder}>
            <Text style={styles.storeImageText}>{store.name.charAt(0)}</Text>
          </View>
        )}
      </View>
      <Text style={styles.storeName} numberOfLines={2}>
        {store.name}
      </Text>
      <Pressable
        style={styles.removeButton}
        onPress={() => handleRemoveStore(store._id)}
      >
        <Ionicons name="close-circle" size={20} color="#FF3B30" />
      </Pressable>
    </View>
  );

  const renderComparisonRow = (label: string, getValue: (store: Store) => string | number) => (
    <View style={styles.comparisonRow}>
      <Text style={styles.comparisonLabel}>{label}</Text>
      <View style={styles.comparisonValues}>
        {stores.map((store, index) => (
          <View key={store._id} style={styles.comparisonValue}>
            <Text style={styles.comparisonValueText}>
              {getValue(store)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderDetailedView = () => {
    if (!selectedStore) return null;

    return (
      <View style={styles.detailedView}>
        <View style={styles.detailedHeader}>
          <Text style={styles.detailedTitle}>Store Details</Text>
          <Pressable onPress={() => setSelectedStore(null)}>
            <Ionicons name="close" size={24} color={colors.darkGray} />
          </Pressable>
        </View>

        <ScrollView style={styles.detailedContent}>
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Basic Information</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{selectedStore.name}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.detailValue}>{selectedStore.description || 'No description available'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{selectedStore.location.address}</Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Operational Info</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Delivery Time:</Text>
              <Text style={styles.detailValue}>{selectedStore.operationalInfo.deliveryTime || 'Not specified'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Minimum Order:</Text>
              <Text style={styles.detailValue}>{currencySymbol}{selectedStore.operationalInfo.minimumOrder || 'Not specified'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Delivery Fee:</Text>
              <Text style={styles.detailValue}>{currencySymbol}{selectedStore.operationalInfo.deliveryFee || 'Free'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Free Delivery Above:</Text>
              <Text style={styles.detailValue}>{currencySymbol}{selectedStore.operationalInfo.freeDeliveryAbove || 'Not available'}</Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Payment Methods</Text>
            <View style={styles.paymentMethods}>
              {selectedStore.operationalInfo.paymentMethods.map((method, index) => (
                <View key={index} style={styles.paymentMethod}>
                  <Text style={styles.paymentMethodText}>{method}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Features</Text>
            <View style={styles.features}>
              <View style={styles.feature}>
                <Ionicons 
                  name={selectedStore.operationalInfo.acceptsWalletPayment ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={selectedStore.operationalInfo.acceptsWalletPayment ? "#34C759" : "#FF3B30"} 
                />
                <Text style={styles.featureText}>Wallet Payment</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons 
                  name={selectedStore.isVerified ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={selectedStore.isVerified ? "#34C759" : "#FF3B30"} 
                />
                <Text style={styles.featureText}>Verified Store</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons 
                  name={selectedStore.isFeatured ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={selectedStore.isFeatured ? "#34C759" : "#FF3B30"} 
                />
                <Text style={styles.featureText}>Featured Store</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  if (stores.length === 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Compare Stores</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.darkGray} />
            </Pressable>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🛒</Text>
            <Text style={styles.emptyStateTitle}>No stores to compare</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add stores to comparison to see detailed comparisons
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Compare Stores ({stores.length})</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={handleClearAll} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </Pressable>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.darkGray} />
            </Pressable>
          </View>
        </View>

        {selectedStore ? (
          renderDetailedView()
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Store Headers */}
            <View style={styles.storesHeader}>
              <View style={styles.headerSpacer} />
              {stores.map((store) => (
                <Pressable
                  key={store._id}
                  style={styles.storeHeaderContainer}
                  onPress={() => handleStoreSelect(store)}
                >
                  {renderStoreHeader(store)}
                </Pressable>
              ))}
            </View>

            {/* Comparison Rows */}
            {renderComparisonRow('Rating', (store) => `${(store.ratings?.average || 0).toFixed(1)} ⭐`)}
            {renderComparisonRow('Reviews', (store) => store.ratings?.count || 0)}
            {renderComparisonRow('Delivery Time', (store) => store.operationalInfo?.deliveryTime || 'N/A')}
            {renderComparisonRow('Min Order', (store) => `${currencySymbol}${store.operationalInfo?.minimumOrder || 'N/A'}`)}
            {renderComparisonRow('Delivery Fee', (store) => `${currencySymbol}${store.operationalInfo?.deliveryFee || 'Free'}`)}
            {renderComparisonRow('Free Delivery', (store) => store.operationalInfo?.freeDeliveryAbove ? `Above ${currencySymbol}${store.operationalInfo.freeDeliveryAbove}` : 'Not available')}
            {renderComparisonRow('Wallet Payment', (store) => store.operationalInfo?.acceptsWalletPayment ? 'Yes' : 'No')}
            {renderComparisonRow('Verified', (store) => store.isVerified ? 'Yes' : 'No')}
            {renderComparisonRow('Featured', (store) => store.isFeatured ? 'Yes' : 'No')}
            {stores.some(store => store.distance) && renderComparisonRow('Distance', (store) => `${store.distance?.toFixed(1)} km`)}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 16,
  },
  clearButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  storesHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerSpacer: {
    width: 120,
    padding: 16,
  },
  storeHeaderContainer: {
    flex: 1,
    padding: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#e9ecef',
  },
  storeHeader: {
    alignItems: 'center',
    position: 'relative',
  },
  storeImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 8,
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  storeImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7B61FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeImageText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.background.primary,
  },
  storeName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 4,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  comparisonRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  comparisonLabel: {
    width: 120,
    padding: 16,
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    backgroundColor: colors.offWhite,
  },
  comparisonValues: {
    flex: 1,
    flexDirection: 'row',
  },
  comparisonValue: {
    flex: 1,
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#e9ecef',
    alignItems: 'center',
  },
  comparisonValueText: {
    fontSize: 14,
    color: colors.darkGray,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.midGray,
    textAlign: 'center',
  },
  detailedView: {
    flex: 1,
  },
  detailedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  detailedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  detailedContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.midGray,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: colors.darkGray,
    flex: 1,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethod: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentMethodText: {
    fontSize: 12,
    color: colors.darkGray,
    fontWeight: '500',
  },
  features: {
    gap: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: colors.darkGray,
    marginLeft: 8,
  },
});

export default React.memo(StoreComparison);
