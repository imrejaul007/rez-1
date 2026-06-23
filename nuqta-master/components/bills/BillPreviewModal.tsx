// Bill Preview Modal
// Shows extracted OCR data for user confirmation

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import {
  OCRExtractedData,
  ManualCorrectionData,
  MerchantMatch,
} from '@/types/billVerification.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface BillPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  imageUri: string;
  ocrData: OCRExtractedData;
  selectedMerchant?: MerchantMatch;
  onConfirm: (corrections?: ManualCorrectionData) => void;
  onEdit: () => void;
}

function BillPreviewModal({
  visible,
  onClose,
  imageUri,
  ocrData,
  selectedMerchant,
  onConfirm,
  onEdit,
}: BillPreviewModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ManualCorrectionData>({
    merchantName: ocrData.merchantName,
    amount: ocrData.amount,
    billDate: ocrData.date,
    billNumber: ocrData.billNumber,
  });

  const handleConfirm = () => {
    if (isEditing) {
      onConfirm(editedData);
    } else {
      onConfirm();
    }
    setIsEditing(false);
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 90) return colors.brand.emerald;
    if (confidence >= 70) return '#FF9800';
    return '#F44336';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.darkGray} />
          </Pressable>
          <Text style={styles.headerTitle}>Verify Bill Details</Text>
          <Pressable onPress={() => setIsEditing(!isEditing)}>
            <Ionicons name={isEditing ? 'checkmark' : 'create'} size={24} color="#FF6B35" />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Bill Image */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill Image</Text>
            <CachedImage source={imageUri} style={styles.billImage} />
          </View>

          {/* OCR Confidence */}
          <View style={styles.confidenceCard}>
            <View style={styles.confidenceHeader}>
              <Ionicons name="analytics" size={20} color={confidenceColor(ocrData.confidence)} />
              <Text style={styles.confidenceTitle}>OCR Confidence</Text>
            </View>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${ocrData.confidence}%`,
                    backgroundColor: confidenceColor(ocrData.confidence),
                  },
                ]}
              />
            </View>
            <Text style={styles.confidenceText}>{ocrData.confidence}%</Text>
          </View>

          {/* Extracted Data */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extracted Details</Text>

            {/* Merchant */}
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Merchant</Text>
              {isEditing ? (
                <TextInput
                  style={styles.dataInput}
                  value={editedData.merchantName}
                  onChangeText={(text) =>
                    setEditedData({ ...editedData, merchantName: text })
                  }
                  placeholder="Merchant name"
                />
              ) : (
                <View style={styles.dataValueContainer}>
                  <Text style={styles.dataValue}>{ocrData.merchantName || 'Not detected'}</Text>
                  {selectedMerchant && (
                    <View style={styles.matchBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.brand.emerald} />
                      <Text style={styles.matchText}>Matched</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Amount */}
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Amount</Text>
              {isEditing ? (
                <TextInput
                  style={styles.dataInput}
                  value={editedData.amount?.toString()}
                  onChangeText={(text) =>
                    setEditedData({ ...editedData, amount: parseFloat(text) || 0 })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              ) : (
                <Text style={styles.dataValue}>
                  {ocrData.amount ? `${currencySymbol}${ocrData.amount.toFixed(2)}` : 'Not detected'}
                </Text>
              )}
            </View>

            {/* Date */}
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Date</Text>
              {isEditing ? (
                <TextInput
                  style={styles.dataInput}
                  value={editedData.billDate}
                  onChangeText={(text) => setEditedData({ ...editedData, billDate: text })}
                  placeholder="YYYY-MM-DD"
                />
              ) : (
                <Text style={styles.dataValue}>{ocrData.date || 'Not detected'}</Text>
              )}
            </View>

            {/* Bill Number */}
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Bill Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.dataInput}
                  value={editedData.billNumber}
                  onChangeText={(text) => setEditedData({ ...editedData, billNumber: text })}
                  placeholder="Optional"
                />
              ) : (
                <Text style={styles.dataValue}>{ocrData.billNumber || 'Not detected'}</Text>
              )}
            </View>

            {/* GST Number */}
            {ocrData.gstNumber && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>GST Number</Text>
                <Text style={styles.dataValue}>{ocrData.gstNumber}</Text>
              </View>
            )}
          </View>

          {/* Items (if available) */}
          {ocrData.items && ocrData.items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items Detected</Text>
              {ocrData.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemDetails}>
                    {item.quantity && <Text style={styles.itemQuantity}>x{item.quantity}</Text>}
                    {item.price && <Text style={styles.itemPrice}>{currencySymbol}{item.price}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Matched Merchant Info */}
          {selectedMerchant && (
            <View style={styles.merchantCard}>
              <View style={styles.merchantHeader}>
                <Ionicons name="storefront" size={20} color="#FF6B35" />
                <Text style={styles.merchantCardTitle}>Matched Merchant</Text>
              </View>
              <View style={styles.merchantInfo}>
                {selectedMerchant.logo && (
                  <CachedImage source={selectedMerchant.logo} style={styles.merchantLogo} />
                )}
                <View style={styles.merchantDetails}>
                  <Text style={styles.merchantName}>{selectedMerchant.merchantName}</Text>
                  <Text style={styles.merchantMatch}>
                    {selectedMerchant.matchScore}% match confidence
                  </Text>
                  <View style={styles.cashbackBadge}>
                    <Ionicons name="gift" size={16} color={colors.brand.emerald} />
                    <Text style={styles.cashbackText}>
                      {selectedMerchant.cashbackPercentage}% cashback
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Help Text */}
          <View style={styles.helpCard}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <Text style={styles.helpText}>
              {isEditing
                ? 'Please review and correct any incorrect information.'
                : 'Tap the edit icon to correct any information if needed.'}
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>
              {isEditing ? 'Save & Continue' : 'Confirm Details'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 12,
  },
  billImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#E5E5E5',
  },
  confidenceCard: {
    backgroundColor: colors.background.primary,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  confidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  confidenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: colors.midGray,
    textAlign: 'right',
  },
  dataRow: {
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dataLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dataValue: {
    fontSize: 16,
    color: colors.darkGray,
    fontWeight: '500',
  },
  dataValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataInput: {
    fontSize: 16,
    color: colors.darkGray,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenMist,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  matchText: {
    fontSize: 12,
    color: colors.brand.emerald,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: colors.darkGray,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemQuantity: {
    fontSize: 12,
    color: colors.midGray,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  merchantCard: {
    backgroundColor: colors.background.primary,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  merchantCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  merchantInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  merchantLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  merchantDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 4,
  },
  merchantMatch: {
    fontSize: 12,
    color: colors.midGray,
    marginBottom: 6,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cashbackText: {
    fontSize: 12,
    color: colors.brand.emerald,
    fontWeight: '600',
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: '#2196F3',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.midGray,
  },
  confirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(BillPreviewModal);
