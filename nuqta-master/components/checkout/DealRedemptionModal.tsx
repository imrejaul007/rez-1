import React from 'react';
import { View, Modal, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface DealRedemptionModalProps {
  visible: boolean;
  redemptionCode: string;
  validatingRedemption: boolean;
  onClose: () => void;
  onRedemptionCodeChange: (text: string) => void;
  onApplyRedemptionCode: () => void;
}

function DealRedemptionModal({
  visible,
  redemptionCode,
  validatingRedemption,
  onClose,
  onRedemptionCodeChange,
  onApplyRedemptionCode,
}: DealRedemptionModalProps) {
  const router = useRouter();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Redeem Deal Code</ThemedText>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.neutral[700]} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter your deal code (e.g., RZ-XXXXXXXX)"
              value={redemptionCode}
              onChangeText={onRedemptionCodeChange}
              autoCapitalize="characters"
              autoFocus={true}
            />

            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="information-circle" size={18} color={Colors.neutral[500]} />
                <ThemedText style={{ fontSize: 13, color: Colors.neutral[500], marginLeft: 6 }}>
                  Enter the redemption code you received when you redeemed a deal.
                </ThemedText>
              </View>
              <ThemedText style={{ fontSize: 12, color: Colors.neutral[400] }}>
                You can find your redeemed deals in the "My Deals" section.
              </ThemedText>
            </View>

            <Pressable
              style={[styles.applyButton, validatingRedemption && styles.applyButtonDisabled, { marginTop: 20 }]}
              onPress={onApplyRedemptionCode}
              disabled={validatingRedemption}
            >
              {validatingRedemption ? (
                <View style={styles.applyLoading}>
                  <ActivityIndicator size="small" color="white" />
                  <ThemedText style={styles.applyText}>Validating...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.applyText}>Apply Deal Code</ThemedText>
              )}
            </Pressable>

            <Pressable
              style={{ marginTop: 12, alignItems: 'center' }}
              onPress={() => {
                onClose();
                router.push('/my-deals' as any);
              }}
            >
              <ThemedText style={{ color: colors.warningScale[400], fontWeight: '500' }}>View My Deals &#x2192;</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingTop: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  promoInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  applyButton: {
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#86EFAC',
  },
  applyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  applyText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default React.memo(DealRedemptionModal);
