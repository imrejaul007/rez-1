import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import ReviewForm from '@/components/reviews/ReviewForm';
import { Review } from '@/types/review.types';
import { colors } from '@/constants/theme';

interface WriteReviewModalProps {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  storeName?: string;
  onReviewSubmitted?: (review: Review) => void;
}

function WriteReviewModal({
  visible,
  onClose,
  storeId,
  storeName,
  onReviewSubmitted,
}: WriteReviewModalProps) {
  const handleReviewSubmit = (review: Review) => {
    onReviewSubmitted?.(review);
    // Close modal immediately - success message is shown by SuccessModal in ReviewForm
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.overlayTouchable} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <ThemedText style={styles.headerTitle}>
                Write a Review
              </ThemedText>
              {storeName && (
                <ThemedText style={styles.storeName} numberOfLines={1}>
                  {storeName}
                </ThemedText>
              )}
            </View>
            <Pressable
              onPress={handleCancel}
              style={styles.closeButton}
             
            >
              <Ionicons name="close" size={24} color={colors.neutral[500]} />
            </Pressable>
          </View>

          {/* Review Form */}
          <View style={styles.formContainer}>
            <ReviewForm
              storeId={storeId}
              onSubmit={handleReviewSubmit}
              onCancel={handleCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
});

export default React.memo(WriteReviewModal);
