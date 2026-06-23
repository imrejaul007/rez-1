import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Payment Methods Management Screen
// Full CRUD operations for saved payment methods

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import {
  PaymentMethod,
  PaymentMethodType,
  CardType,
  CardBrand,
  BankAccountType,
  PaymentMethodCreate,
} from '@/services/paymentMethodApi';
import { SectionListSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type ModalMode = 'add' | 'edit' | null;

function PaymentMethodsManagementPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const {
    paymentMethods,
    isLoading,
    refetch,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    defaultPaymentMethod,
  } = usePaymentMethods(true);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [selectedType, setSelectedType] = useState<PaymentMethodType>(PaymentMethodType.CARD);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardType, setCardType] = useState<CardType>(CardType.CREDIT);
  const [cardNickname, setCardNickname] = useState('');

  // UPI Form State
  const [upiVpa, setUpiVpa] = useState('');
  const [upiNickname, setUpiNickname] = useState('');

  // Bank Account Form State
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountType, setBankAccountType] = useState<BankAccountType>(BankAccountType.SAVINGS);
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankNickname, setBankNickname] = useState('');

  // Validation Functions
  const validateLuhn = (cardNumber: string): boolean => {
    const digits = cardNumber.replace(/\s/g, '');
    if (!/^\d+$/.test(digits)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  };

  const validateExpiryDate = (month: string, year: string): { valid: boolean; error?: string } => {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return { valid: false, error: 'Invalid month (1-12)' };
    }

    if (isNaN(yearNum) || year.length !== 4) {
      return { valid: false, error: 'Invalid year (YYYY format)' };
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
      return { valid: false, error: 'Card has expired' };
    }

    return { valid: true };
  };

  const validateUpiVpa = (vpa: string): { valid: boolean; error?: string } => {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(vpa)) {
      return { valid: false, error: 'Invalid UPI format (e.g., user@provider)' };
    }
    return { valid: true };
  };

  const validateIFSC = (ifsc: string): { valid: boolean; error?: string } => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc.toUpperCase())) {
      return { valid: false, error: 'Invalid IFSC code format' };
    }
    return { valid: true };
  };

  const resetForm = () => {
    // Card fields
    setCardNumber('');
    setCardholderName('');
    setExpiryMonth('');
    setExpiryYear('');
    setCvv('');
    setCardType(CardType.CREDIT);
    setCardNickname('');

    // UPI fields
    setUpiVpa('');
    setUpiNickname('');

    // Bank account fields
    setBankAccountNumber('');
    setBankIfscCode('');
    setBankName('');
    setBankAccountType(BankAccountType.SAVINGS);
    setBankAccountHolderName('');
    setBankNickname('');

    // Error state
    setFormError(null);
    setActionLoading(false);
  };

  const handleOpenAddModal = (type: PaymentMethodType = PaymentMethodType.CARD) => {
    resetForm();
    setSelectedType(type);
    setEditingMethod(null);
    setModalMode('add');
  };

  const handleOpenEditModal = (method: PaymentMethod) => {
    resetForm();
    setEditingMethod(method);
    setSelectedType(method.type);

    if (method.type === PaymentMethodType.CARD && method.card) {
      setCardNickname(method.card.nickname || '');
      setCardholderName(method.card.cardholderName || '');
    } else if (method.type === PaymentMethodType.UPI && method.upi) {
      setUpiVpa(method.upi.vpa || '');
      setUpiNickname(method.upi.nickname || '');
    } else if (method.type === PaymentMethodType.BANK_ACCOUNT && method.bankAccount) {
      setBankNickname(method.bankAccount.nickname || '');
    }

    setModalMode('edit');
  };

  const handleSavePaymentMethod = async () => {
    setActionLoading(true);
    setFormError(null);

    try {
      if (modalMode === 'edit' && editingMethod) {
        // Edit mode - only update nickname
        if (selectedType === PaymentMethodType.CARD) {
          await updatePaymentMethod(editingMethod.id, {
            card: { nickname: cardNickname },
          });
          platformAlertSimple('Success', 'Payment method updated successfully');
        } else if (selectedType === PaymentMethodType.UPI) {
          await updatePaymentMethod(editingMethod.id, {
            upi: { nickname: upiNickname },
          });
          platformAlertSimple('Success', 'Payment method updated successfully');
        } else if (selectedType === PaymentMethodType.BANK_ACCOUNT) {
          await updatePaymentMethod(editingMethod.id, {
            bankAccount: { nickname: bankNickname },
          });
          platformAlertSimple('Success', 'Payment method updated successfully');
        }
      } else {
        // Add mode - validate and add new payment method
        if (selectedType === PaymentMethodType.CARD) {
          // Validate all required fields
          if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
            if (!isMounted()) return;
            setFormError('Please fill in all required card details');
            return;
          }

          // Validate card number with Luhn algorithm
          if (!validateLuhn(cardNumber)) {
            if (!isMounted()) return;
            setFormError('Invalid card number. Please check and try again.');
            return;
          }

          // Validate expiry date
          const expiryValidation = validateExpiryDate(expiryMonth, expiryYear);
          if (!expiryValidation.valid) {
            setFormError(expiryValidation.error || 'Invalid expiry date');
            return;
          }

          // Validate CVV
          if (!/^\d{3,4}$/.test(cvv)) {
            if (!isMounted()) return;
            setFormError('CVV must be 3 or 4 digits');
            return;
          }

          const data: PaymentMethodCreate = {
            type: PaymentMethodType.CARD,
            card: {
              type: cardType,
              brand: detectCardBrand(cardNumber),
              cardNumber: cardNumber.replace(/\s/g, ''),
              expiryMonth: parseInt(expiryMonth),
              expiryYear: parseInt(expiryYear),
              cardholderName,
              nickname: cardNickname,
            },
          };

          await addPaymentMethod(data);
          platformAlertSimple('Success', 'Card added successfully');
        } else if (selectedType === PaymentMethodType.UPI) {
          if (!upiVpa) {
            if (!isMounted()) return;
            setFormError('Please enter UPI ID');
            return;
          }

          // Validate UPI VPA format
          const upiValidation = validateUpiVpa(upiVpa);
          if (!upiValidation.valid) {
            setFormError(upiValidation.error || 'Invalid UPI ID');
            return;
          }

          const data: PaymentMethodCreate = {
            type: PaymentMethodType.UPI,
            upi: {
              vpa: upiVpa,
              nickname: upiNickname,
              isVerified: false,
            },
          };

          await addPaymentMethod(data);
          platformAlertSimple('Success', 'UPI added successfully');
        } else if (selectedType === PaymentMethodType.BANK_ACCOUNT) {
          // Validate all required fields
          if (!bankName || !bankAccountHolderName || !bankAccountNumber || !bankIfscCode) {
            if (!isMounted()) return;
            setFormError('Please fill in all required bank account details');
            return;
          }

          // Validate IFSC code
          const ifscValidation = validateIFSC(bankIfscCode);
          if (!ifscValidation.valid) {
            setFormError(ifscValidation.error || 'Invalid IFSC code');
            return;
          }

          const data: PaymentMethodCreate = {
            type: PaymentMethodType.BANK_ACCOUNT,
            bankAccount: {
              accountNumber: bankAccountNumber,
              ifscCode: bankIfscCode.toUpperCase(),
              bankName,
              accountType: bankAccountType,
              nickname: bankNickname,
              isVerified: false,
            },
          };

          await addPaymentMethod(data);
          platformAlertSimple('Success', 'Bank account added successfully');
        }
      }

      if (!isMounted()) return;
      setModalMode(null);
      resetForm();
    } catch (error) {
      if (!isMounted()) return;
      setFormError('Failed to save payment method. Please try again.');
    } finally {
      if (!isMounted()) return;
      setActionLoading(false);
    }
  };

  const handleDeletePaymentMethod = (method: PaymentMethod) => {
    const methodName = method.type === PaymentMethodType.CARD
      ? `Card ending ${method.card?.lastFourDigits}`
      : method.type === PaymentMethodType.UPI
      ? method.upi?.vpa
      : method.type === PaymentMethodType.BANK_ACCOUNT
      ? `Bank account ${method.bankAccount?.bankName}`
      : 'Payment method';

    platformAlertDestructive(
      'Delete Payment Method',
      `Are you sure you want to delete ${methodName}?`,
      async () => {
        const success = await deletePaymentMethod(method.id);
        if (success) {
          platformAlertSimple('Success', 'Payment method deleted');
        }
      }
    );
  };

  const handleSetDefault = async (method: PaymentMethod) => {
    if (method.isDefault) return;
    const success = await setDefaultPaymentMethod(method.id);
    if (success) {
      platformAlertSimple('Success', 'Default payment method updated');
    }
  };

  const detectCardBrand = (cardNumber: string): CardBrand => {
    const num = cardNumber.replace(/\s/g, '');
    if (num.startsWith('4')) return CardBrand.VISA;
    if (num.startsWith('5')) return CardBrand.MASTERCARD;
    if (num.startsWith('3')) return CardBrand.AMEX;
    if (num.startsWith('6')) return CardBrand.RUPAY;
    return CardBrand.OTHER;
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const getCardBrandIcon = (brand?: CardBrand): string => {
    switch (brand) {
      case CardBrand.VISA: return 'card';
      case CardBrand.MASTERCARD: return 'card';
      case CardBrand.AMEX: return 'card';
      case CardBrand.RUPAY: return 'card';
      default: return 'card-outline';
    }
  };

  const getCardBrandColor = (brand?: CardBrand): string => {
    switch (brand) {
      case CardBrand.VISA: return '#1A365D';
      case CardBrand.MASTERCARD: return '#EB001B';
      case CardBrand.AMEX: return '#006FCF';
      case CardBrand.RUPAY: return '#097969';
      default: return colors.neutral[500];
    }
  };

  const renderPaymentCard = (method: PaymentMethod) => {
    if (method.type === PaymentMethodType.CARD && method.card) {
      const brandColor = getCardBrandColor(method.card.brand);
      const cardLabel = `${method.card.brand} card ending ${method.card.lastFourDigits}. Expires ${method.card.expiryMonth}/${method.card.expiryYear}. ${method.card.cardholderName}${method.card.nickname ? '. ' + method.card.nickname : ''}${method.isDefault ? '. Default payment method' : ''}`;

      return (
        <View
          key={method.id}
          style={styles.paymentCard}
          accessibilityRole="summary"
          accessibilityLabel={cardLabel}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconRow}>
              <View style={[styles.cardIcon, { backgroundColor: `${brandColor}20` }]}>
                <Ionicons
                  name={getCardBrandIcon(method.card.brand) as any}
                  size={24}
                  color={brandColor}
                />
              </View>
              <View style={styles.cardInfo}>
                <ThemedText style={styles.cardBrand}>{method.card.brand}</ThemedText>
                <ThemedText style={styles.cardNumber}>
                  •••• {method.card.lastFourDigits}
                </ThemedText>
              </View>
            </View>

            {method.isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <ThemedText style={styles.defaultText}>Default</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.cardDetails}>
            <ThemedText style={styles.cardholderName}>{method.card.cardholderName}</ThemedText>
            <ThemedText style={styles.cardExpiry}>
              Expires: {method.card.expiryMonth}/{method.card.expiryYear}
            </ThemedText>
            {method.card.nickname && (
              <ThemedText style={styles.cardNickname}>{method.card.nickname}</ThemedText>
            )}
          </View>

          <View style={styles.cardActions}>
            {!method.isDefault && (
              <Pressable
                style={styles.actionButton}
                onPress={() => handleSetDefault(method)}
                accessibilityRole="button"
                accessibilityLabel={`Set card ending ${method.card?.lastFourDigits} as default`}
                accessibilityHint="Double tap to make this your default payment method"
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <ThemedText style={styles.actionText}>Set Default</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={styles.actionButton}
              onPress={() => handleOpenEditModal(method)}
              accessibilityRole="button"
              accessibilityLabel={`Edit card ending ${method.card?.lastFourDigits}`}
              accessibilityHint="Double tap to edit card nickname"
            >
              <Ionicons name="create-outline" size={18} color={Colors.info} />
              <ThemedText style={styles.actionText}>Edit</ThemedText>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleDeletePaymentMethod(method)}
              accessibilityRole="button"
              accessibilityLabel={`Delete card ending ${method.card?.lastFourDigits}`}
              accessibilityHint="Double tap to remove this payment method. This action requires confirmation"
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <ThemedText style={styles.actionText}>Delete</ThemedText>
            </Pressable>
          </View>
        </View>
      );
    }

    if (method.type === PaymentMethodType.UPI && method.upi) {
      const upiLabel = `UPI ${method.upi.vpa}${method.upi.nickname ? '. ' + method.upi.nickname : ''}${method.isDefault ? '. Default payment method' : ''}`;

      return (
        <View
          key={method.id}
          style={styles.paymentCard}
          accessibilityRole="summary"
          accessibilityLabel={upiLabel}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconRow}>
              <View style={[styles.cardIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="flash" size={24} color={Colors.warning} />
              </View>
              <View style={styles.cardInfo}>
                <ThemedText style={styles.cardBrand}>UPI</ThemedText>
                <ThemedText style={styles.cardNumber}>{method.upi.vpa}</ThemedText>
              </View>
            </View>

            {method.isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <ThemedText style={styles.defaultText}>Default</ThemedText>
              </View>
            )}
          </View>

          {method.upi.nickname && (
            <View style={styles.cardDetails}>
              <ThemedText style={styles.cardNickname}>{method.upi.nickname}</ThemedText>
            </View>
          )}

          <View style={styles.cardActions}>
            {!method.isDefault && (
              <Pressable
                style={styles.actionButton}
                onPress={() => handleSetDefault(method)}
                accessibilityRole="button"
                accessibilityLabel={`Set UPI ${method.upi?.vpa} as default`}
                accessibilityHint="Double tap to make this your default payment method"
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <ThemedText style={styles.actionText}>Set Default</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={styles.actionButton}
              onPress={() => handleOpenEditModal(method)}
              accessibilityRole="button"
              accessibilityLabel={`Edit UPI ${method.upi?.vpa}`}
              accessibilityHint="Double tap to edit UPI nickname"
            >
              <Ionicons name="create-outline" size={18} color={Colors.info} />
              <ThemedText style={styles.actionText}>Edit</ThemedText>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleDeletePaymentMethod(method)}
              accessibilityRole="button"
              accessibilityLabel={`Delete UPI ${method.upi?.vpa}`}
              accessibilityHint="Double tap to remove this payment method. This action requires confirmation"
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <ThemedText style={styles.actionText}>Delete</ThemedText>
            </Pressable>
          </View>
        </View>
      );
    }

    if (method.type === PaymentMethodType.BANK_ACCOUNT && method.bankAccount) {
      // Extract last 4 digits from account number (it should be masked from backend)
      const accountNumberDisplay = method.bankAccount.accountNumber.slice(-4);
      const bankLabel = `${method.bankAccount.bankName} ${method.bankAccount.accountType} account ending ${accountNumberDisplay}. IFSC ${method.bankAccount.ifscCode}${method.bankAccount.nickname ? '. ' + method.bankAccount.nickname : ''}${method.isDefault ? '. Default payment method' : ''}`;

      return (
        <View
          key={method.id}
          style={styles.paymentCard}
          accessibilityRole="summary"
          accessibilityLabel={bankLabel}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconRow}>
              <View style={[styles.cardIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="business" size={24} color={Colors.info} />
              </View>
              <View style={styles.cardInfo}>
                <ThemedText style={styles.cardBrand}>{method.bankAccount.bankName}</ThemedText>
                <ThemedText style={styles.cardNumber}>
                  •••• {accountNumberDisplay}
                </ThemedText>
              </View>
            </View>

            {method.isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <ThemedText style={styles.defaultText}>Default</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.cardDetails}>
            <ThemedText style={styles.cardExpiry}>
              {method.bankAccount.accountType} • IFSC: {method.bankAccount.ifscCode}
            </ThemedText>
            {method.bankAccount.nickname && (
              <ThemedText style={styles.cardNickname}>{method.bankAccount.nickname}</ThemedText>
            )}
          </View>

          <View style={styles.cardActions}>
            {!method.isDefault && (
              <Pressable
                style={styles.actionButton}
                onPress={() => handleSetDefault(method)}
                accessibilityRole="button"
                accessibilityLabel={`Set ${method.bankAccount?.bankName} account as default`}
                accessibilityHint="Double tap to make this your default payment method"
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <ThemedText style={styles.actionText}>Set Default</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={styles.actionButton}
              onPress={() => handleOpenEditModal(method)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${method.bankAccount?.bankName} account`}
              accessibilityHint="Double tap to edit account nickname"
            >
              <Ionicons name="create-outline" size={18} color={Colors.info} />
              <ThemedText style={styles.actionText}>Edit</ThemedText>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleDeletePaymentMethod(method)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${method.bankAccount?.bankName} account`}
              accessibilityHint="Double tap to remove this payment method. This action requires confirmation"
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <ThemedText style={styles.actionText}>Delete</ThemedText>
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple] as const} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>Payment Methods</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {paymentMethods.length} {paymentMethods.length === 1 ? 'method' : 'methods'} saved
            </ThemedText>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() => handleOpenAddModal(PaymentMethodType.CARD)}
            accessibilityRole="button"
            accessibilityLabel="Add new payment method"
            accessibilityHint="Double tap to add a card, UPI, or bank account"
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Quick Add Buttons */}
      <View style={styles.quickAddContainer}>
        <Pressable
          style={styles.quickAddButton}
          onPress={() => handleOpenAddModal(PaymentMethodType.CARD)}
          accessibilityRole="button"
          accessibilityLabel="Add card"
          accessibilityHint="Double tap to add a new credit or debit card"
        >
          <Ionicons name="card" size={20} color={Colors.brand.purpleLight} />
          <ThemedText style={styles.quickAddText}>Card</ThemedText>
        </Pressable>
        <Pressable
          style={styles.quickAddButton}
          onPress={() => handleOpenAddModal(PaymentMethodType.UPI)}
          accessibilityRole="button"
          accessibilityLabel="Add UPI"
          accessibilityHint="Double tap to add a UPI payment method"
        >
          <Ionicons name="flash" size={20} color={Colors.warning} />
          <ThemedText style={styles.quickAddText}>UPI</ThemedText>
        </Pressable>
        <Pressable
          style={styles.quickAddButton}
          onPress={() => handleOpenAddModal(PaymentMethodType.BANK_ACCOUNT)}
          accessibilityRole="button"
          accessibilityLabel="Add bank account"
          accessibilityHint="Double tap to add a bank account"
        >
          <Ionicons name="business" size={20} color={Colors.info} />
          <ThemedText style={styles.quickAddText}>Bank</ThemedText>
        </Pressable>
      </View>

      {/* Payment Methods List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {isLoading && paymentMethods.length === 0 ? (
          <SectionListSkeleton />
        ) : paymentMethods.length > 0 ? (
          paymentMethods.map(renderPaymentCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color={Colors.border.default} />
            <ThemedText style={styles.emptyText}>No payment methods saved</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Add a payment method to make checkout faster
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMode(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {modalMode === 'edit' ? 'Edit Payment Method' : 'Add Payment Method'}
              </ThemedText>
              <Pressable onPress={() => setModalMode(null)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {modalMode === 'add' && (
                <View style={styles.typeSelector}>
                  <Pressable
                    style={[
                      styles.typeOption,
                      selectedType === PaymentMethodType.CARD && styles.typeOptionActive,
                    ]}
                    onPress={() => setSelectedType(PaymentMethodType.CARD)}
                  >
                    <Ionicons
                      name="card"
                      size={20}
                      color={selectedType === PaymentMethodType.CARD ? 'white' : colors.neutral[500]}
                    />
                    <ThemedText
                      style={[
                        styles.typeOptionText,
                        selectedType === PaymentMethodType.CARD && styles.typeOptionTextActive,
                      ]}
                    >
                      Card
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.typeOption,
                      selectedType === PaymentMethodType.UPI && styles.typeOptionActive,
                    ]}
                    onPress={() => setSelectedType(PaymentMethodType.UPI)}
                  >
                    <Ionicons
                      name="flash"
                      size={20}
                      color={selectedType === PaymentMethodType.UPI ? 'white' : colors.neutral[500]}
                    />
                    <ThemedText
                      style={[
                        styles.typeOptionText,
                        selectedType === PaymentMethodType.UPI && styles.typeOptionTextActive,
                      ]}
                    >
                      UPI
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.typeOption,
                      selectedType === PaymentMethodType.BANK_ACCOUNT && styles.typeOptionActive,
                    ]}
                    onPress={() => setSelectedType(PaymentMethodType.BANK_ACCOUNT)}
                  >
                    <Ionicons
                      name="business"
                      size={20}
                      color={selectedType === PaymentMethodType.BANK_ACCOUNT ? 'white' : colors.neutral[500]}
                    />
                    <ThemedText
                      style={[
                        styles.typeOptionText,
                        selectedType === PaymentMethodType.BANK_ACCOUNT && styles.typeOptionTextActive,
                      ]}
                    >
                      Bank
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {/* Error Banner */}
              {formError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={20} color={Colors.error} />
                  <ThemedText style={styles.errorText}>{formError}</ThemedText>
                </View>
              )}

              {selectedType === PaymentMethodType.CARD && (
                <>
                  {modalMode === 'add' && (
                    <>
                      <ThemedText style={styles.label}>Card Type *</ThemedText>
                      <View style={styles.cardTypeSelector}>
                        <Pressable
                          style={[
                            styles.cardTypeOption,
                            cardType === CardType.CREDIT && styles.cardTypeOptionActive,
                          ]}
                          onPress={() => setCardType(CardType.CREDIT)}
                        >
                          <ThemedText
                            style={[
                              styles.cardTypeOptionText,
                              cardType === CardType.CREDIT && styles.cardTypeOptionTextActive,
                            ]}
                          >
                            Credit Card
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.cardTypeOption,
                            cardType === CardType.DEBIT && styles.cardTypeOptionActive,
                          ]}
                          onPress={() => setCardType(CardType.DEBIT)}
                        >
                          <ThemedText
                            style={[
                              styles.cardTypeOptionText,
                              cardType === CardType.DEBIT && styles.cardTypeOptionTextActive,
                            ]}
                          >
                            Debit Card
                          </ThemedText>
                        </Pressable>
                      </View>

                      <ThemedText style={styles.label}>Card Number *</ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                        keyboardType="numeric"
                        maxLength={19}
                      />

                      <ThemedText style={styles.label}>Cardholder Name *</ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="Name on card"
                        value={cardholderName}
                        onChangeText={setCardholderName}
                        autoCapitalize="words"
                      />

                      <View style={styles.row}>
                        <View style={styles.halfWidth}>
                          <ThemedText style={styles.label}>Expiry Month *</ThemedText>
                          <TextInput
                            style={styles.input}
                            placeholder="MM"
                            value={expiryMonth}
                            onChangeText={setExpiryMonth}
                            keyboardType="numeric"
                            maxLength={2}
                          />
                        </View>
                        <View style={styles.halfWidth}>
                          <ThemedText style={styles.label}>Expiry Year *</ThemedText>
                          <TextInput
                            style={styles.input}
                            placeholder="YYYY"
                            value={expiryYear}
                            onChangeText={setExpiryYear}
                            keyboardType="numeric"
                            maxLength={4}
                          />
                        </View>
                      </View>

                      <ThemedText style={styles.label}>CVV *</ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="123"
                        value={cvv}
                        onChangeText={setCvv}
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry={true}
                      />
                    </>
                  )}

                  <ThemedText style={styles.label}>Card Nickname (Optional)</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Work Card, Personal Card"
                    value={cardNickname}
                    onChangeText={setCardNickname}
                  />
                </>
              )}

              {selectedType === PaymentMethodType.UPI && (
                <>
                  {modalMode === 'add' && (
                    <>
                      <ThemedText style={styles.label}>UPI ID *</ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="yourname@upi"
                        value={upiVpa}
                        onChangeText={setUpiVpa}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </>
                  )}

                  <ThemedText style={styles.label}>UPI Nickname (Optional)</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Primary UPI"
                    value={upiNickname}
                    onChangeText={setUpiNickname}
                  />
                </>
              )}

              {selectedType === PaymentMethodType.BANK_ACCOUNT && (
                <>
                  {modalMode === 'add' && (
                    <>
                      <ThemedText style={styles.label}>Bank Name *</ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., State Bank of India"
                        value={bankName}
                        onChangeText={setBankName}
                        autoCapitalize="words"
                      />

                      <ThemedText style={styles.label}>Account Holder Name *</ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="Name as per bank account"
                        value={bankAccountHolderName}
                        onChangeText={setBankAccountHolderName}
                        autoCapitalize="words"
                      />

                      <ThemedText style={styles.label}>Account Number *</ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter account number"
                        value={bankAccountNumber}
                        onChangeText={setBankAccountNumber}
                        keyboardType="numeric"
                      />

                      <ThemedText style={styles.label}>IFSC Code *</ThemedText>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., SBIN0001234"
                        value={bankIfscCode}
                        onChangeText={(text) => setBankIfscCode(text.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={11}
                      />

                      <ThemedText style={styles.label}>Account Type *</ThemedText>
                      <View style={styles.accountTypeToggle}>
                        <Pressable
                          style={[
                            styles.accountTypeOption,
                            bankAccountType === BankAccountType.SAVINGS && styles.accountTypeOptionActive,
                          ]}
                          onPress={() => setBankAccountType(BankAccountType.SAVINGS)}
                        >
                          <ThemedText
                            style={[
                              styles.accountTypeOptionText,
                              bankAccountType === BankAccountType.SAVINGS && styles.accountTypeOptionTextActive,
                            ]}
                          >
                            Savings
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.accountTypeOption,
                            bankAccountType === BankAccountType.CURRENT && styles.accountTypeOptionActive,
                          ]}
                          onPress={() => setBankAccountType(BankAccountType.CURRENT)}
                        >
                          <ThemedText
                            style={[
                              styles.accountTypeOptionText,
                              bankAccountType === BankAccountType.CURRENT && styles.accountTypeOptionTextActive,
                            ]}
                          >
                            Current
                          </ThemedText>
                        </Pressable>
                      </View>
                    </>
                  )}

                  <ThemedText style={styles.label}>Account Nickname (Optional)</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Primary Account"
                    value={bankNickname}
                    onChangeText={setBankNickname}
                  />
                </>
              )}

              <Pressable
                style={[styles.saveButton, actionLoading && styles.saveButtonDisabled]}
                onPress={handleSavePaymentMethod}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>
                    {modalMode === 'edit' ? 'Update' : 'Save Payment Method'}
                  </ThemedText>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    gap: Spacing.md,
  },
  quickAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  quickAddText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  paymentCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  cardNumber: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  defaultText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  cardDetails: {
    marginBottom: Spacing.md,
  },
  cardholderName: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  cardExpiry: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  cardNickname: {
    ...Typography.bodySmall,
    color: Colors.brand.purpleLight,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalForm: {
    padding: Spacing.lg,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    gap: Spacing.sm,
  },
  typeOptionActive: {
    backgroundColor: Colors.brand.purpleLight,
  },
  typeOptionText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  typeOptionTextActive: {
    color: Colors.text.inverse,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.text.primary,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  saveButtonDisabled: {
    backgroundColor: '#C4B5FD',
    opacity: 0.7,
  },
  saveButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // Error Banner Styles
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorScale[50],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    ...Typography.body,
    color: Colors.error,
    fontWeight: '500',
  },

  // Card Type Selector Styles
  cardTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cardTypeOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardTypeOptionActive: {
    backgroundColor: Colors.brand.purpleLight,
    borderColor: Colors.brand.purpleLight,
  },
  cardTypeOptionText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  cardTypeOptionTextActive: {
    color: Colors.text.inverse,
  },

  // Account Type Toggle Styles
  accountTypeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  accountTypeOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  accountTypeOptionActive: {
    backgroundColor: Colors.info,
    borderColor: Colors.info,
  },
  accountTypeOptionText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  accountTypeOptionTextActive: {
    color: Colors.text.inverse,
  },
});
export default withErrorBoundary(PaymentMethodsManagementPage, 'AccountPaymentMethods');
