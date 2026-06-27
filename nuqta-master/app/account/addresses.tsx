// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Saved Addresses Page
// Page for managing user's saved addresses

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import addressApi, { Address as ApiAddress, AddressCreate, AddressUpdate } from '@/services/addressApi';
import AddAddressModal from '@/components/account/AddAddressModal';
import EditAddressModal from '@/components/account/EditAddressModal';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { SectionListSkeleton } from '@/components/skeletons';
import ScreenSkeleton from '@/components/common/ScreenSkeleton';
import ScreenError from '@/components/common/ScreenError';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Use same AddressType as API (uppercase)
type AddressType = 'HOME' | 'OFFICE' | 'OTHER';

interface Address {
  id: string;
  type: AddressType;
  title: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
}

function SavedAddressesPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch addresses from backend API
      const response = await addressApi.getUserAddresses();

      if (response.success && response.data) {
        // Transform API addresses to frontend format
        const transformedAddresses: Address[] = response.data.map((addr: ApiAddress) => ({
          id: addr.id,
          type: addr.type as AddressType,
          title: addr.title,
          phone: addr.phone,
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
          isDefault: addr.isDefault,
          instructions: addr.instructions,
          createdAt: addr.createdAt,
          updatedAt: addr.updatedAt,
        }));

        if (!isMounted()) return;
        setAddresses(transformedAddresses);
      } else {
        throw new Error(response.error || 'Failed to fetch addresses');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch addresses');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAddresses();
  }, [fetchAddresses]);

  const handleBackPress = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handleAddAddress = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleEditAddress = useCallback((address: Address) => {
    setSelectedAddress(address);
    setShowEditModal(true);
  }, []);

  const handleAddAddressSubmit = useCallback(async (addressData: AddressCreate): Promise<boolean> => {
    try {
      const response = await addressApi.createAddress(addressData);

      if (response.success && response.data) {
        // Transform and add to list
        const newAddress: Address = {
          id: response.data.id,
          type: response.data.type as AddressType,
          title: response.data.title,
          phone: response.data.phone,
          addressLine1: response.data.addressLine1,
          addressLine2: response.data.addressLine2,
          city: response.data.city,
          state: response.data.state,
          postalCode: response.data.postalCode,
          country: response.data.country,
          isDefault: response.data.isDefault,
          instructions: response.data.instructions,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
        };

        if (!isMounted()) return;
        setAddresses(prev => [...prev, newAddress]);
        return true;
      }
      platformAlertSimple('Error', response.error || 'Failed to add address');
      return false;
    } catch (err) {
      platformAlertSimple('Error', 'Failed to add address');
      return false;
    }
  }, []);

  const handleUpdateAddressSubmit = useCallback(async (id: string, updateData: AddressUpdate): Promise<boolean> => {
    try {
      const response = await addressApi.updateAddress(id, updateData);

      if (response.success && response.data) {
        // Update in list
        if (!isMounted()) return;
        setAddresses(prev =>
          prev.map(addr =>
            addr.id === id
              ? {
                  ...addr,
                  type: response.data!.type as AddressType,
                  title: response.data!.title,
                  phone: response.data!.phone,
                  addressLine1: response.data!.addressLine1,
                  addressLine2: response.data!.addressLine2,
                  city: response.data!.city,
                  state: response.data!.state,
                  postalCode: response.data!.postalCode,
                  country: response.data!.country,
                  isDefault: response.data!.isDefault,
                  instructions: response.data!.instructions,
                  updatedAt: response.data!.updatedAt,
                }
              : addr
          )
        );
        return true;
      }
      platformAlertSimple('Error', response.error || 'Failed to update address');
      return false;
    } catch (err) {
      platformAlertSimple('Error', 'Failed to update address');
      return false;
    }
  }, []);

  const handleDeleteAddress = useCallback(async (address: Address) => {
    platformAlertDestructive('Delete Address', `Are you sure you want to delete ${address.title}?`, async () => {
      try {
        const response = await addressApi.deleteAddress(address.id);

        if (response.success) {
          if (!isMounted()) return;
          setAddresses(prev => prev.filter(addr => addr.id !== address.id));
          platformAlertSimple('Success', 'Address deleted successfully');
        } else {
          platformAlertSimple('Error', response.error || 'Failed to delete address');
        }
      } catch (err) {
        platformAlertSimple('Error', 'Failed to delete address');
      }
    });
  }, []);

  const handleSetDefault = useCallback(async (address: Address) => {
    try {
      const response = await addressApi.setDefaultAddress(address.id);

      if (response.success) {
        if (!isMounted()) return;
        setAddresses(prev =>
          prev.map(addr => ({
            ...addr,
            isDefault: addr.id === address.id,
          }))
        );
        platformAlertSimple('Success', `${address.title} is now your default address`);
      } else {
        platformAlertSimple('Error', response.error || 'Failed to set default address');
      }
    } catch (err) {
      platformAlertSimple('Error', 'Failed to set default address');
    }
  }, []);

  const getAddressTypeIcon = (type: string) => {
    switch (type) {
      case 'HOME':
        return 'home-outline';
      case 'OFFICE':
        return 'business-outline';
      default:
        return 'location-outline';
    }
  };

  const getAddressTypeColor = (type: string) => {
    switch (type) {
      case 'HOME':
        return Colors.primary[500];
      case 'OFFICE':
        return colors.infoScale[400];
      default:
        return Colors.text.secondary;
    }
  };

  const renderAddress = useCallback(({ item: address }: { item: Address }) => {
    const fullAddress = `${address.addressLine1}, ${address.addressLine2 ? address.addressLine2 + ', ' : ''}${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
    const addressLabel = `${address.title}. ${fullAddress}${address.isDefault ? '. Default address' : ''}${address.instructions ? '. Instructions: ' + address.instructions : ''}`;

    return (
    <View
      style={styles.addressCard}
      accessibilityRole="summary"
      accessibilityLabel={addressLabel}
    >
        <View style={styles.addressHeader}>
            <View style={styles.addressTitleContainer}>
          <View style={[styles.typeIcon, { backgroundColor: getAddressTypeColor(address.type) }]}>
            <Ionicons name={getAddressTypeIcon(address.type)} size={16} color={Colors.text.inverse} />
          </View>
          <View style={styles.addressTitleInfo}>
            <ThemedText style={styles.addressTitle}>{address.title}</ThemedText>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <ThemedText style={styles.defaultText}>Default</ThemedText>
            </View>
          )}
        </View>
        </View>
        <View style={styles.addressActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleEditAddress(address)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${address.title}`}
            accessibilityHint="Double tap to edit this address"
          >
            <Ionicons name="pencil-outline" size={18} color={Colors.nileBlue} />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleDeleteAddress(address)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${address.title}`}
            accessibilityHint="Double tap to remove this address. This action requires confirmation"
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </Pressable>
        </View>
      </View>

      <View style={styles.addressDetails}>
        {address.phone && (
          <View style={styles.phoneContainer}>
            <Ionicons name="call-outline" size={14} color={Colors.text.secondary} />
            <ThemedText style={styles.phoneText}>{address.phone}</ThemedText>
          </View>
        )}
        <ThemedText style={styles.addressLine}>{address.addressLine1}</ThemedText>
        {address.addressLine2 && (
          <ThemedText style={styles.addressLine}>{address.addressLine2}</ThemedText>
        )}
        <ThemedText style={styles.addressLine}>
          {address.city}, {address.state} {address.postalCode}
        </ThemedText>
        <ThemedText style={styles.addressLine}>{address.country}</ThemedText>

        {address.instructions && (
          <View style={styles.instructionsContainer}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.text.secondary} />
            <ThemedText style={styles.instructions}>{address.instructions}</ThemedText>
          </View>
        )}
      </View>

      {!address.isDefault && (
        <Pressable
          style={styles.setDefaultButton}
          onPress={() => handleSetDefault(address)}
          accessibilityRole="button"
          accessibilityLabel={`Set ${address.title} as default address`}
          accessibilityHint="Double tap to make this your default delivery address"
        >
          <ThemedText style={styles.setDefaultText}>Set as Default</ThemedText>
        </Pressable>
      )}
    </View>
    );
  }, [handleEditAddress, handleDeleteAddress, handleSetDefault]);

  const headerElement = (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
      <LinearGradient colors={[Colors.nileBlue, Colors.secondary[500]]} style={styles.headerBg}>
        <View style={styles.headerContainer}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Saved Addresses</ThemedText>
          <Pressable style={styles.addButton} onPress={handleAddAddress}>
            <Ionicons name="add" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>
      </LinearGradient>
    </>
  );

  if (isLoading) {
    return <ScreenSkeleton variant="sections" header={headerElement} />;
  }

  if (error) {
    return (
      <ScreenError
        error={error}
        onRetry={handleRefresh}
        header={headerElement}
        onSecondaryAction={handleBackPress}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
      <LinearGradient colors={[Colors.nileBlue, Colors.secondary[500]]} style={styles.headerBg}>
        <View style={styles.headerContainer}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText
            style={styles.headerTitle}
            accessibilityRole="header"
          >
            Saved Addresses
          </ThemedText>
          <Pressable
            style={styles.addButton}
            onPress={handleAddAddress}
            accessibilityRole="button"
            accessibilityLabel="Add new address"
            accessibilityHint="Double tap to add a new delivery address"
          >
            <Ionicons name="add" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={80} color={Colors.border.medium} />
            <ThemedText style={styles.emptyTitle}>No Addresses Saved</ThemedText>
            <ThemedText style={styles.emptyDescription}>
              Add your addresses to make checkout faster
            </ThemedText>
            <Pressable
              style={styles.addAddressButton}
              onPress={handleAddAddress}
              accessibilityRole="button"
              accessibilityLabel="Add your first address"
              accessibilityHint="Double tap to add a new delivery address"
            >
              <ThemedText style={styles.addAddressButtonText}>Add Address</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={addresses}
            renderItem={renderAddress}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.nileBlue} />
            }
            contentContainerStyle={styles.addressesContainer}
            showsVerticalScrollIndicator={false}
            estimatedItemSize={100}
          />
        )}
      </View>

      {/* Add Address Modal */}
      <AddAddressModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddAddressSubmit}
      />

      {/* Edit Address Modal */}
      <EditAddressModal
        visible={showEditModal}
        address={selectedAddress ? {
          ...selectedAddress,
          type: selectedAddress.type as any,
        } : null}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAddress(null);
        }}
        onUpdate={handleUpdateAddressSubmit}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerBg: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 50,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 5px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold',
  },
  addButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  addressesContainer: {
    paddingBottom: 120,
  },
  addressCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: Colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addressTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  addressTitleInfo: {
    flex: 1,
  },
  addressTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  defaultBadge: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  defaultText: {
    ...Typography.overline,
    fontWeight: '600',
    color: Colors.text.inverse,
    textTransform: undefined,
    letterSpacing: undefined,
  },
  addressActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray[100],
  },
  addressDetails: {
    marginBottom: Spacing.md,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  phoneText: {
    ...Typography.body,
    color: Colors.gray[600],
    marginLeft: 6,
    fontWeight: '500',
  },
  addressLine: {
    ...Typography.body,
    color: Colors.gray[600],
    marginBottom: 2,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.background.accent,
    borderRadius: BorderRadius.sm,
  },
  instructions: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  setDefaultButton: {
    backgroundColor: Colors.nileBlue,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  setDefaultText: {
    color: Colors.text.inverse,
    ...Typography.label,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  emptyTitle: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  addAddressButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addAddressButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  errorTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.error,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorDetails: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});
export default withErrorBoundary(SavedAddressesPage, 'AccountAddresses');
