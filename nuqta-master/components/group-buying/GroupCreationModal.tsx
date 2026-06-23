// Group Creation Modal Component
// Modal for creating a new group buying group

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GroupBuyingProduct, CreateGroupRequest } from '@/types/groupBuying.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface GroupCreationModalProps {
  visible: boolean;
  product: GroupBuyingProduct | null;
  onClose: () => void;
  onSubmit: (data: CreateGroupRequest) => Promise<void>;
}

function GroupCreationModal({
  visible,
  product,
  onClose,
  onSubmit,
}: GroupCreationModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [quantity, setQuantity] = useState('1');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const isMounted = useIsMounted();

  if (!product) return null;

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (qty < 1) {
      alert('Quantity must be at least 1');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        productId: product.id,
        quantity: qty,
        message: message.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuantity('1');
    setMessage('');
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Group</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.neutral[900]} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Product Info */}
            <View style={styles.productSection}>
              <CachedImage
                source={
                  typeof product.image === 'string'
                    ? { uri: product.image }
                    : product.image
                }
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.storeName}>{product.storeName}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.basePrice}>{currencySymbol}{product.basePrice}</Text>
                  <LinearGradient
                    colors={[colors.successScale[400], colors.successScale[700]]}
                    style={styles.discountBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.discountText}>
                      Up to {product.discountTiers[product.discountTiers.length - 1]?.discountPercentage}% OFF
                    </Text>
                  </LinearGradient>
                </View>
              </View>
            </View>

            {/* Discount Tiers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Discount Tiers</Text>
              {product.discountTiers.map((tier, index) => (
                <View key={index} style={styles.tierCard}>
                  <View style={styles.tierHeader}>
                    <View style={styles.tierMembers}>
                      <Ionicons name="people" size={16} color={colors.brand.purpleLight} />
                      <Text style={styles.tierMembersText}>
                        {tier.minMembers}
                        {tier.maxMembers ? `-${tier.maxMembers}` : '+'} members
                      </Text>
                    </View>
                    <View style={styles.tierDiscount}>
                      <Text style={styles.tierDiscountText}>
                        {tier.discountPercentage}% OFF
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tierPrice}>
                    {currencySymbol}{tier.pricePerUnit.toFixed(2)} per unit
                  </Text>
                </View>
              ))}
            </View>

            {/* Quantity Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Quantity</Text>
              <View style={styles.quantityContainer}>
                <Pressable
                  style={styles.quantityButton}
                  onPress={() => {
                    const qty = parseInt(quantity) || 1;
                    if (qty > 1) setQuantity(String(qty - 1));
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.brand.purpleLight} />
                </Pressable>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Pressable
                  style={styles.quantityButton}
                  onPress={() => {
                    const qty = parseInt(quantity) || 1;
                    setQuantity(String(qty + 1));
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.brand.purpleLight} />
                </Pressable>
              </View>
            </View>

            {/* Optional Message */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Invitation Message (Optional)
              </Text>
              <TextInput
                style={styles.messageInput}
                placeholder="e.g., Let's save together on this amazing product!"
                placeholderTextColor={colors.neutral[400]}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.characterCount}>
                {message.length}/200 characters
              </Text>
            </View>

            {/* Group Rules */}
            <View style={styles.rulesSection}>
              <Text style={styles.rulesTitle}>Group Buying Rules:</Text>
              <View style={styles.ruleItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
                <Text style={styles.ruleText}>
                  Minimum {product.minMembers} members required
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
                <Text style={styles.ruleText}>
                  Maximum {product.maxMembers} members allowed
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
                <Text style={styles.ruleText}>
                  Group expires in {product.expiryDuration} hours
                </Text>
              </View>
              <View style={styles.ruleItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
                <Text style={styles.ruleText}>
                  Refund if minimum not met before expiry
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Create Button */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="people" size={20} color="white" />
                  <Text style={styles.createButtonText}>Create Group</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  productSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  basePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.purpleLight,
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  tierCard: {
    backgroundColor: colors.neutral[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.purpleLight,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tierMembers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierMembersText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  tierDiscount: {
    backgroundColor: colors.successScale[400],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierDiscountText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.tint.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.neutral[900],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 6,
    textAlign: 'right',
  },
  rulesSection: {
    backgroundColor: colors.tint.blue,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[700],
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purpleLight,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default React.memo(GroupCreationModal);
