// Payment Method Selector Component
// Allows users to select and manage payment methods for subscription

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import {
  SUBSCRIPTION_COLORS,
  SUBSCRIPTION_SPACING,
  SUBSCRIPTION_BORDER_RADIUS,
  SUBSCRIPTION_SHADOW,
} from '@/styles/subscriptionStyles';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet';
  displayName: string;
  icon: string;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
  bankName?: string;
}

interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddNew?: () => void;
  allowAddNew?: boolean;
  title?: string;
}

const getPaymentIconName = (type: string): string => {
  switch (type) {
    case 'card':
      return 'card-outline';
    case 'upi':
      return 'phone-portrait-outline';
    case 'netbanking':
      return 'business-outline';
    case 'wallet':
      return 'wallet-outline';
    default:
      return 'card-outline';
  }
};

const getPaymentTypeLabel = (type: string): string => {
  switch (type) {
    case 'card':
      return 'Credit/Debit Card';
    case 'upi':
      return 'UPI';
    case 'netbanking':
      return 'Net Banking';
    case 'wallet':
      return 'Wallet';
    default:
      return 'Payment Method';
  }
};

function PaymentMethodSelector({
  methods,
  selectedId,
  onSelect,
  onAddNew,
  allowAddNew = true,
  title = 'Select Payment Method',
}: PaymentMethodSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const selectedMethod = methods.find((m) => m.id === selectedId);

  const renderPaymentDisplay = () => (
    <Pressable
      style={styles.selectedPaymentButton}
      onPress={() => setShowModal(true)}
     
    >
      {selectedMethod ? (
        <>
          <View style={styles.selectedPaymentInfo}>
            <View style={styles.selectedPaymentIcon}>
              <Ionicons
                name={getPaymentIconName(selectedMethod.type) as any}
                size={24}
                color={SUBSCRIPTION_COLORS.purple}
              />
            </View>
            <View style={styles.selectedPaymentDetails}>
              <ThemedText style={styles.selectedPaymentLabel}>
                {getPaymentTypeLabel(selectedMethod.type)}
              </ThemedText>
              <ThemedText style={styles.selectedPaymentValue}>
                {selectedMethod.displayName}
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-down" size={20} color={SUBSCRIPTION_COLORS.textSecondary} />
        </>
      ) : (
        <>
          <Ionicons name="add-circle-outline" size={24} color={SUBSCRIPTION_COLORS.purple} />
          <ThemedText style={styles.emptyMethodText}>Select Payment Method</ThemedText>
        </>
      )}
    </Pressable>
  );

  const renderMethodOption = (method: PaymentMethod) => {
    const isSelected = method.id === selectedId;

    return (
      <Pressable
        key={method.id}
        style={[
          styles.methodOption,
          isSelected && styles.methodOptionSelected,
        ]}
        onPress={() => {
          onSelect(method.id);
          setShowModal(false);
        }}
       
      >
        <View style={styles.methodContent}>
          <View style={[styles.methodIcon, isSelected && styles.methodIconSelected]}>
            <Ionicons
              name={getPaymentIconName(method.type) as any}
              size={24}
              color={isSelected ? SUBSCRIPTION_COLORS.white : SUBSCRIPTION_COLORS.purple}
            />
          </View>

          <View style={styles.methodDetails}>
            <ThemedText style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>
              {getPaymentTypeLabel(method.type)}
            </ThemedText>
            <ThemedText style={[styles.methodName, isSelected && styles.methodNameSelected]}>
              {method.displayName}
            </ThemedText>
            {method.type === 'card' && method.lastFour && (
              <ThemedText style={[styles.methodMeta, isSelected && styles.methodMetaSelected]}>
                ends in {method.lastFour}
              </ThemedText>
            )}
            {method.type === 'netbanking' && method.bankName && (
              <ThemedText style={[styles.methodMeta, isSelected && styles.methodMetaSelected]}>
                {method.bankName}
              </ThemedText>
            )}
          </View>
        </View>

        {method.isDefault && (
          <View style={styles.defaultBadge}>
            <ThemedText style={styles.defaultBadgeText}>Default</ThemedText>
          </View>
        )}

        <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
          {isSelected && (
            <Ionicons
              name="checkmark"
              size={16}
              color={SUBSCRIPTION_COLORS.white}
            />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <>
      {renderPaymentDisplay()}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{title}</ThemedText>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={SUBSCRIPTION_COLORS.text}
                />
              </Pressable>
            </View>

            {/* Methods List */}
            <ScrollView
              style={styles.methodsList}
              contentContainerStyle={styles.methodsListContent}
              showsVerticalScrollIndicator={false}
            >
              {methods.length > 0 ? (
                methods.map(renderMethodOption)
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="card-outline"
                    size={48}
                    color={SUBSCRIPTION_COLORS.border}
                  />
                  <ThemedText style={styles.emptyStateText}>
                    No payment methods added
                  </ThemedText>
                  <ThemedText style={styles.emptyStateSubtext}>
                    Add a payment method to continue
                  </ThemedText>
                </View>
              )}
            </ScrollView>

            {/* Add New Button */}
            {allowAddNew && (
              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.addNewButton}
                  onPress={() => {
                    setShowModal(false);
                    onAddNew?.();
                  }}
                >
                  <Ionicons
                    name="add-circle"
                    size={20}
                    color={SUBSCRIPTION_COLORS.white}
                  />
                  <ThemedText style={styles.addNewButtonText}>
                    Add New Payment Method
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Selected Display
  selectedPaymentButton: {
    backgroundColor: SUBSCRIPTION_COLORS.white,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.lg,
    padding: SUBSCRIPTION_SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SUBSCRIPTION_SHADOW.small,
  },
  selectedPaymentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SUBSCRIPTION_SPACING.lg,
  },
  selectedPaymentIcon: {
    width: 48,
    height: 48,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    backgroundColor: `${SUBSCRIPTION_COLORS.purple}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPaymentDetails: {
    flex: 1,
  },
  selectedPaymentLabel: {
    fontSize: 12,
    color: SUBSCRIPTION_COLORS.textSecondary,
    marginBottom: SUBSCRIPTION_SPACING.xs,
  },
  selectedPaymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: SUBSCRIPTION_COLORS.text,
  },
  emptyMethodText: {
    fontSize: 14,
    color: SUBSCRIPTION_COLORS.textSecondary,
    marginLeft: SUBSCRIPTION_SPACING.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SUBSCRIPTION_COLORS.white,
    borderTopLeftRadius: SUBSCRIPTION_BORDER_RADIUS.xl,
    borderTopRightRadius: SUBSCRIPTION_BORDER_RADIUS.xl,
    maxHeight: '90%',
    paddingBottom: SUBSCRIPTION_SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: SUBSCRIPTION_COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.text,
  },
  closeButton: {
    padding: SUBSCRIPTION_SPACING.sm,
  },

  // Methods List
  methodsList: {
    flex: 1,
  },
  methodsListContent: {
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    gap: SUBSCRIPTION_SPACING.md,
  },
  methodOption: {
    backgroundColor: SUBSCRIPTION_COLORS.white,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: SUBSCRIPTION_COLORS.border,
    padding: SUBSCRIPTION_SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SUBSCRIPTION_SPACING.md,
  },
  methodOptionSelected: {
    borderColor: SUBSCRIPTION_COLORS.purple,
    backgroundColor: `${SUBSCRIPTION_COLORS.purple}05`,
  },
  methodContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SUBSCRIPTION_SPACING.lg,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    backgroundColor: `${SUBSCRIPTION_COLORS.purple}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconSelected: {
    backgroundColor: SUBSCRIPTION_COLORS.purple,
  },
  methodDetails: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 12,
    color: SUBSCRIPTION_COLORS.textSecondary,
    marginBottom: SUBSCRIPTION_SPACING.xs,
  },
  methodLabelSelected: {
    color: SUBSCRIPTION_COLORS.purple,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: SUBSCRIPTION_COLORS.text,
  },
  methodNameSelected: {
    color: SUBSCRIPTION_COLORS.text,
  },
  methodMeta: {
    fontSize: 12,
    color: SUBSCRIPTION_COLORS.textSecondary,
    marginTop: SUBSCRIPTION_SPACING.xs,
  },
  methodMetaSelected: {
    color: SUBSCRIPTION_COLORS.purple,
  },

  // Default Badge
  defaultBadge: {
    backgroundColor: `${SUBSCRIPTION_COLORS.success}20`,
    paddingHorizontal: SUBSCRIPTION_SPACING.md,
    paddingVertical: SUBSCRIPTION_SPACING.xs,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.sm,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: SUBSCRIPTION_COLORS.success,
  },

  // Radio Button
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: SUBSCRIPTION_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: SUBSCRIPTION_COLORS.purple,
    backgroundColor: SUBSCRIPTION_COLORS.purple,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SUBSCRIPTION_SPACING.xxl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: SUBSCRIPTION_COLORS.text,
    marginTop: SUBSCRIPTION_SPACING.lg,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: SUBSCRIPTION_COLORS.textSecondary,
    marginTop: SUBSCRIPTION_SPACING.sm,
  },

  // Footer
  modalFooter: {
    paddingHorizontal: SUBSCRIPTION_SPACING.lg,
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: SUBSCRIPTION_COLORS.border,
  },
  addNewButton: {
    backgroundColor: SUBSCRIPTION_COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SUBSCRIPTION_SPACING.lg,
    borderRadius: SUBSCRIPTION_BORDER_RADIUS.md,
    gap: SUBSCRIPTION_SPACING.md,
  },
  addNewButtonText: {
    color: SUBSCRIPTION_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default React.memo(PaymentMethodSelector);
