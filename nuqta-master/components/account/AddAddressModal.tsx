// Add Address Modal Component
// Modal form for adding a new delivery address

import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showAlert } from '@/utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ACCOUNT_COLORS } from '@/types/account.types';
import { AddressType, AddressCreate } from '@/services/addressApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface AddAddressModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (address: AddressCreate) => Promise<boolean>;
}

function AddAddressModal({ visible, onClose, onAdd }: AddAddressModalProps) {
  const [type, setType] = useState<AddressType>(AddressType.HOME);
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMounted = useIsMounted();

  const resetForm = () => {
    setType(AddressType.HOME);
    setTitle('');
    setPhone('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('');
    setInstructions('');
    setIsDefault(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      showAlert('Validation Error', 'Please enter an address title');
      return false;
    }
    if (!addressLine1.trim()) {
      showAlert('Validation Error', 'Please enter street address');
      return false;
    }
    if (!city.trim()) {
      showAlert('Validation Error', 'Please enter city');
      return false;
    }
    if (!state.trim()) {
      showAlert('Validation Error', 'Please enter state');
      return false;
    }
    if (!postalCode.trim()) {
      showAlert('Validation Error', 'Please enter postal code');
      return false;
    }
    if (!country.trim()) {
      showAlert('Validation Error', 'Please enter country');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const newAddress: AddressCreate = {
        type,
        title: title.trim(),
        phone: phone.trim() || undefined,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        instructions: instructions.trim(),
        isDefault,
      };

      const success = await onAdd(newAddress);
      if (success) {
        handleClose();
        showAlert('Success', 'Address added successfully');
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  const addressTypes = [
    { value: AddressType.HOME, label: 'Home', icon: 'home' },
    { value: AddressType.OFFICE, label: 'Office', icon: 'business' },
    { value: AddressType.OTHER, label: 'Other', icon: 'location' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Add new address dialog"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Add New Address</ThemedText>
              <Pressable
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityLabel="Close add address"
                accessibilityRole="button"
                accessibilityHint="Double tap to close this dialog"
              >
                <Ionicons name="close" size={24} color={ACCOUNT_COLORS.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Address Type Selection */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Address Type *</ThemedText>
                <View style={styles.typeSelector}>
                  {addressTypes.map((typeOption) => (
                    <Pressable
                      key={typeOption.value}
                      style={[
                        styles.typeButton,
                        type === typeOption.value && styles.typeButtonActive,
                      ]}
                      onPress={() => setType(typeOption.value)}
                      accessibilityLabel={`Set address type to ${typeOption.label}`}
                      accessibilityRole="button"
                      accessibilityHint={`Double tap to select ${typeOption.label} address type`}
                      accessibilityState={{ selected: type === typeOption.value }}
                    >
                      <Ionicons
                        name={typeOption.icon as any}
                        size={20}
                        color={
                          type === typeOption.value
                            ? 'white'
                            : ACCOUNT_COLORS.primary
                        }
                      />
                      <ThemedText
                        style={[
                          styles.typeButtonText,
                          type === typeOption.value && styles.typeButtonTextActive,
                        ]}
                      >
                        {typeOption.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Title */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Address Title *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Home, Office"
                  placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                />
              </View>

              {/* Phone Number */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Phone Number</ThemedText>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g., +971 50 123 4567"
                  placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={25}
                />
              </View>

              {/* Address Line 1 */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Street Address *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                  placeholder="Street address"
                  placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                />
              </View>

              {/* Address Line 2 */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Apt, Suite, etc.</ThemedText>
                <TextInput
                  style={styles.input}
                  value={addressLine2}
                  onChangeText={setAddressLine2}
                  placeholder="Apartment, suite, unit (optional)"
                  placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                />
              </View>

              {/* City and State */}
              <View style={styles.row}>
                <View style={[styles.formGroup, styles.rowItem]}>
                  <ThemedText style={styles.label}>City *</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                  />
                </View>

                <View style={[styles.formGroup, styles.rowItemSmall]}>
                  <ThemedText style={styles.label}>State *</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={state}
                    onChangeText={setState}
                    placeholder="State"
                    placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Postal Code and Country */}
              <View style={styles.row}>
                <View style={[styles.formGroup, styles.rowItemSmall]}>
                  <ThemedText style={styles.label}>Postal Code *</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    placeholder="e.g., 12345"
                    placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                    autoCapitalize="characters"
                    maxLength={12}
                  />
                </View>

                <View style={[styles.formGroup, styles.rowItem]}>
                  <ThemedText style={styles.label}>Country *</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={country}
                    onChangeText={setCountry}
                    placeholder="e.g., United Arab Emirates"
                    placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Delivery Instructions */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Delivery Instructions</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="Special delivery instructions (optional)"
                  placeholderTextColor={ACCOUNT_COLORS.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Set as Default */}
              <Pressable
                style={styles.checkboxContainer}
                onPress={() => setIsDefault(!isDefault)}
              >
                <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
                  {isDefault && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <ThemedText style={styles.checkboxLabel}>
                  Set as default address
                </ThemedText>
              </Pressable>

              <View style={styles.spacer} />
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <ThemedText style={styles.submitButtonText}>
                  {isSubmitting ? 'Adding...' : 'Add Address'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
);
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: ACCOUNT_COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ACCOUNT_COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: ACCOUNT_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: ACCOUNT_COLORS.text,
    backgroundColor: ACCOUNT_COLORS.surface,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: ACCOUNT_COLORS.primary,
    backgroundColor: 'white',
  },
  typeButtonActive: {
    backgroundColor: ACCOUNT_COLORS.primary,
    borderColor: ACCOUNT_COLORS.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCOUNT_COLORS.primary,
    marginLeft: 6,
  },
  typeButtonTextActive: {
    color: 'white',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  rowItemSmall: {
    flex: 0.6,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: ACCOUNT_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: ACCOUNT_COLORS.primary,
    borderColor: ACCOUNT_COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: ACCOUNT_COLORS.text,
  },
  spacer: {
    height: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: ACCOUNT_COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: ACCOUNT_COLORS.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCOUNT_COLORS.text,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: ACCOUNT_COLORS.primary,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default React.memo(AddAddressModal);
