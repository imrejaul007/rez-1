/**
 * BillPreview - Image preview section with quality feedback
 *
 * Shows the captured/selected bill image with quality score badge,
 * retake button, remove button, and quality warnings/recommendations.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface BillPreviewProps {
  billImage: string | null;
  qualityResult: any;
  isCheckingQuality: boolean;
  touched: Record<string, boolean>;
  errors: { billImage?: string };
  onOpenCamera: () => void;
  onPickFromGallery: () => void;
  onRemoveImage: () => void;
}

const BillPreview = React.memo(function BillPreview({
  billImage,
  qualityResult,
  isCheckingQuality,
  touched,
  errors,
  onOpenCamera,
  onPickFromGallery,
  onRemoveImage,
}: BillPreviewProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Bill Photo <Text style={styles.required}>*</Text>
      </Text>
      {billImage ? (
        <View style={styles.imagePreviewContainer}>
          <CachedImage source={billImage} style={styles.imagePreview} />

          {/* Quality Score Badge */}
          {qualityResult && (
            <View
              style={[
                styles.qualityBadge,
                qualityResult.score >= 80
                  ? styles.qualityBadgeGood
                  : qualityResult.score >= 60
                  ? styles.qualityBadgeOk
                  : styles.qualityBadgePoor,
              ]}
            >
              <Ionicons
                name={
                  qualityResult.score >= 80
                    ? 'checkmark-circle'
                    : qualityResult.score >= 60
                    ? 'alert-circle'
                    : 'warning'
                }
                size={16}
                color={Colors.text.inverse}
              />
              <Text style={styles.qualityBadgeText}>
                Quality: {qualityResult.score}/100
              </Text>
            </View>
          )}

          <Pressable style={styles.removeImageButton} onPress={onRemoveImage}>
            <Ionicons name="close-circle" size={32} color="#FF4444" />
          </Pressable>
          <Pressable style={styles.retakeButton} onPress={onOpenCamera}>
            <Ionicons name="camera" size={16} color={Colors.text.inverse} />
            <Text style={styles.retakeButtonText}>Retake</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.uploadOptionsContainer}>
          <Pressable
            style={styles.uploadOption}
            onPress={onOpenCamera}
            disabled={isCheckingQuality}
          >
            {isCheckingQuality ? (
              <ActivityIndicator size="large" color={colors.brand.green} />
            ) : (
              <>
                <Ionicons name="camera" size={40} color={colors.brand.green} />
                <Text style={styles.uploadOptionText}>Take Photo</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.uploadOption}
            onPress={onPickFromGallery}
            disabled={isCheckingQuality}
          >
            {isCheckingQuality ? (
              <ActivityIndicator size="large" color={colors.brand.green} />
            ) : (
              <>
                <Ionicons name="images" size={40} color={colors.brand.green} />
                <Text style={styles.uploadOptionText}>Choose from Gallery</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
      {touched.billImage && errors.billImage && (
        <Text style={styles.errorText}>{errors.billImage}</Text>
      )}

      {/* Quality warnings */}
      {qualityResult && qualityResult.warnings.length > 0 && (
        <View style={styles.qualityWarningContainer}>
          <Ionicons name="alert-circle" size={16} color="#FF9800" />
          <Text style={styles.qualityWarningText}>{qualityResult.warnings[0]}</Text>
        </View>
      )}

      {/* Quality recommendations */}
      {qualityResult && qualityResult.recommendations.length > 0 && qualityResult.score < 80 && (
        <View style={styles.qualityRecommendationContainer}>
          <Ionicons name="information-circle" size={16} color="#2196F3" />
          <Text style={styles.qualityRecommendationText}>
            {qualityResult.recommendations[0]}
          </Text>
        </View>
      )}

      <Text style={styles.helperText}>
        Ensure the bill is clear and all details are visible
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  required: {
    color: Colors.error,
  },
  uploadOptionsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  uploadOption: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brand.green,
    borderStyle: 'dashed',
  },
  uploadOptionText: {
    marginTop: Spacing.sm,
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.text.primary,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
  },
  retakeButton: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  retakeButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  helperText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: 6,
  },
  qualityBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  qualityBadgeGood: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  qualityBadgeOk: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
  },
  qualityBadgePoor: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  qualityBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  qualityWarningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  qualityWarningText: {
    flex: 1,
    ...Typography.bodySmall,
    color: '#E65100',
  },
  qualityRecommendationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  qualityRecommendationText: {
    flex: 1,
    ...Typography.bodySmall,
    color: '#1565C0',
  },
});

export default BillPreview;
