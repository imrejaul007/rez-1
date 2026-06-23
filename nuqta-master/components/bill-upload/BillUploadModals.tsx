/**
 * BillUploadModals - Modal components for bill upload
 *
 * Merchant selector modal, progress modal, and info modal.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import type { Store, FormData } from './types';

// ---- Merchant Selector Modal ----

interface MerchantSelectorModalProps {
  visible: boolean;
  merchants: Store[];
  selectedMerchantId: string;
  searchQuery: string;
  isLoading: boolean;
  onClose: () => void;
  onSelect: (merchant: Store) => void;
  onSearchChange: (query: string) => void;
}

export const MerchantSelectorModal = React.memo(function MerchantSelectorModal({
  visible,
  merchants,
  selectedMerchantId,
  searchQuery,
  isLoading,
  onClose,
  onSelect,
  onSearchChange,
}: MerchantSelectorModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Merchant</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.midGray} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search merchants..."
              value={searchQuery}
              onChangeText={onSearchChange}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => onSearchChange('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </Pressable>
            )}
          </View>

          {/* Merchant list */}
          <ScrollView style={styles.merchantList}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand.green} />
                <Text style={styles.loadingText}>Loading merchants...</Text>
              </View>
            ) : (
              <>
                {merchants.length === 0 && searchQuery.length > 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyText}>No merchants found</Text>
                    <Text style={styles.emptySubtext}>Try a different search term or add manually</Text>
                    <Pressable
                      style={styles.addMerchantButton}
                      onPress={() => {
                        const tempMerchant: Store = {
                          _id: `temp_${Date.now()}`,
                          name: searchQuery,
                          cashbackPercentage: 0,
                        };
                        onSelect(tempMerchant);
                      }}
                    >
                      <Ionicons name="add-circle" size={20} color={colors.brand.green} />
                      <Text style={styles.addMerchantButtonText}>
                        Add &quot;{searchQuery}&quot;
                      </Text>
                    </Pressable>
                  </View>
                ) : merchants.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="storefront-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyText}>No merchants available</Text>
                    <Text style={styles.emptySubtext}>Start searching to add a merchant</Text>
                  </View>
                ) : (
                  <>
                    {merchants.map((merchant) => (
                      <Pressable
                        key={merchant._id}
                        style={[
                          styles.merchantItem,
                          merchant._id === selectedMerchantId && styles.merchantItemSelected,
                        ]}
                        onPress={() => onSelect(merchant)}
                      >
                        {merchant.logo ? (
                          <CachedImage source={merchant.logo} style={styles.merchantLogo} />
                        ) : (
                          <View style={[styles.merchantLogo, styles.merchantLogoPlaceholder]}>
                            <Ionicons name="storefront" size={20} color="#999" />
                          </View>
                        )}
                        <View style={styles.merchantInfo}>
                          <Text style={styles.merchantName}>{merchant.name}</Text>
                          {merchant.category && (
                            <Text style={styles.merchantCategory}>{merchant.category}</Text>
                          )}
                          {merchant.cashbackPercentage && (
                            <Text style={styles.merchantCashback}>
                              {merchant.cashbackPercentage}% cashback
                            </Text>
                          )}
                        </View>
                        {merchant._id === selectedMerchantId && (
                          <Ionicons name="checkmark-circle" size={24} color={colors.brand.emerald} />
                        )}
                      </Pressable>
                    ))}

                    {searchQuery.length > 0 && (
                      <Pressable
                        style={styles.cantFindMerchantButton}
                        onPress={() => {
                          const tempMerchant: Store = {
                            _id: `temp_${Date.now()}`,
                            name: searchQuery,
                            cashbackPercentage: 0,
                          };
                          onSelect(tempMerchant);
                        }}
                      >
                        <Ionicons name="help-circle-outline" size={20} color={colors.brand.green} />
                        <Text style={styles.cantFindMerchantText}>
                          Can&apos;t find your merchant? Add manually
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// ---- Progress Modal ----

interface ProgressModalProps {
  visible: boolean;
  percentComplete: number;
  uploadSpeed: string | null;
  onCancel: () => void;
}

export const ProgressModal = React.memo(function ProgressModal({
  visible,
  percentComplete,
  uploadSpeed,
  onCancel,
}: ProgressModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.progressModalContainer}>
        <View style={styles.progressModalContent}>
          <ActivityIndicator size="large" color={colors.brand.green} />
          <Text style={styles.progressModalTitle}>Uploading Bill</Text>
          <Text style={styles.progressModalSubtitle}>
            {percentComplete > 0
              ? `${percentComplete}% complete`
              : 'Preparing upload...'}
          </Text>
          {uploadSpeed && (
            <Text style={styles.progressModalSpeed}>{uploadSpeed}</Text>
          )}
          {percentComplete > 0 && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${percentComplete}%` },
                ]}
              />
            </View>
          )}
          <Pressable style={styles.cancelUploadButton} onPress={onCancel}>
            <Text style={styles.cancelUploadButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

// ---- Info Modal ----

interface InfoModalProps {
  visible: boolean;
  currencySymbol: string;
  onClose: () => void;
}

export const InfoModal = React.memo(function InfoModal({
  visible,
  currencySymbol,
  onClose,
}: InfoModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.infoModalContainer}>
        <View style={styles.infoModalContent}>
          <View style={styles.infoModalHeader}>
            <Ionicons name="information-circle" size={32} color={colors.brand.green} />
            <Text style={styles.infoModalTitle}>Bill Upload Tips</Text>
          </View>
          <ScrollView style={styles.infoModalBody}>
            <Text style={styles.infoModalText}>
              <Text style={styles.infoModalBold}>For Best Results:</Text>
            </Text>
            <Text style={styles.infoModalBullet}>Capture the entire bill in the frame</Text>
            <Text style={styles.infoModalBullet}>Ensure good lighting with no shadows</Text>
            <Text style={styles.infoModalBullet}>Keep the camera steady to avoid blur</Text>
            <Text style={styles.infoModalBullet}>Make sure all text is clearly visible</Text>
            <Text style={styles.infoModalBullet}>
              Bills must be less than 30 days old
            </Text>
            <Text style={styles.infoModalBullet}>
              Amount must be between {currencySymbol}50 and {currencySymbol}1,00,000
            </Text>
          </ScrollView>
          <Pressable style={styles.infoModalCloseButton} onPress={onClose}>
            <Text style={styles.infoModalCloseButtonText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    margin: Spacing.base,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  merchantList: {
    flex: 1,
  },
  merchantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    gap: Spacing.md,
  },
  merchantItemSelected: {
    backgroundColor: colors.greenMist,
  },
  merchantLogo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
  },
  merchantLogoPlaceholder: {
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  merchantCategory: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  merchantCashback: {
    ...Typography.bodySmall,
    color: colors.brand.green,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  emptySubtext: {
    marginTop: Spacing.xs,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  addMerchantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    padding: 14,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.brand.green,
    borderStyle: 'dashed',
  },
  addMerchantButtonText: {
    ...Typography.body,
    color: colors.brand.green,
    fontWeight: '600',
  },
  cantFindMerchantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cantFindMerchantText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },

  // Progress modal
  progressModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    minWidth: 280,
  },
  progressModalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  progressModalSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  progressModalSpeed: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    marginTop: Spacing.base,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brand.green,
  },
  cancelUploadButton: {
    marginTop: Spacing.base,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  cancelUploadButtonText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '600',
  },

  // Info modal
  infoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  infoModalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxWidth: 400,
    width: '100%',
  },
  infoModalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  infoModalTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  infoModalBody: {
    maxHeight: 300,
  },
  infoModalText: {
    ...Typography.body,
    color: Colors.text.primary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  infoModalBold: {
    fontWeight: '600',
  },
  infoModalBullet: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 24,
    paddingLeft: Spacing.sm,
  },
  infoModalCloseButton: {
    backgroundColor: colors.brand.green,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  infoModalCloseButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});
