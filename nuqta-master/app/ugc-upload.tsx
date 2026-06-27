// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// UGC Video Upload Screen
// Main screen for uploading user-generated content videos

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  SafeAreaView,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import PurpleGradientBg from '@/components/onboarding/PurpleGradientBg';
import SourcePicker from '@/components/ugc/SourcePicker';
import UploadProgress from '@/components/ugc/UploadProgress';
import ProductSelector from '@/components/ugc/ProductSelector';
import ProductChip from '@/components/ugc/ProductChip';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { PRODUCT_TAGGING_RULES } from '@/types/ugc-upload.types';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth } = Dimensions.get('window');

function UGCUploadScreen() {
  const router = useRouter();
  const {
    state,
    permissions,
    selectFromCamera,
    selectFromGallery,
    setUrlVideo,
    updateTitle,
    updateDescription,
    updateHashtags,
    clearVideo,
    uploadToCloudinary,
    openProductSelector,
    closeProductSelector,
    addProducts,
    removeProduct,
    clearProducts,
    canUpload,
    isUploading,
  } = useVideoUpload();

  const [hashtagInput, setHashtagInput] = useState('');
  const isMounted = useIsMounted();

  const handleBack = () => {
    if (isUploading) {
      platformAlertDestructive(
        'Upload in Progress',
        'Are you sure you want to cancel the upload?',
        'Yes',
        () => {
          clearVideo();
          router.canGoBack() ? router.back() : router.replace('/(tabs)');
        }
      );
    } else {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  const handleClearVideo = () => {
    platformAlertDestructive(
      'Remove Video',
      'Are you sure you want to remove this video and start over?',
      'Remove',
      clearVideo
    );
  };

  const handleHashtagChange = (text: string) => {
    setHashtagInput(text);
    updateHashtags(text);
  };

  const handleUpload = async () => {
    if (!canUpload) {
      platformAlertSimple('Error', 'Please fill in all required fields');
      return;
    }

    const success = await uploadToCloudinary();

    if (success) {
      platformAlertSimple('Success', 'Your video has been uploaded successfully!');
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <PurpleGradientBg>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            disabled={isUploading}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityState={{ disabled: isUploading }}
            accessibilityHint="Returns to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>Upload Video</Text>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!state.video ? (
              /* Source Selection */
              <SourcePicker
                onSelectCamera={selectFromCamera}
                onSelectGallery={selectFromGallery}
                onSelectUrl={setUrlVideo}
                disabled={isUploading}
              />
            ) : (
              /* Video Selected - Show Form */
              <View style={styles.formContainer}>
                {/* Video Preview */}
                <View style={styles.videoPreviewContainer}>
                  <Text style={styles.sectionTitle}>Video Preview</Text>

                  {state.source !== 'url' ? (
                    <View style={styles.videoWrapper}>
                      <Video
                        source={{ uri: state.video.uri }}
                        style={styles.videoPreview}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                        isLooping
                        useNativeControls
                      />
                      <Pressable
                        style={styles.removeVideoButton}
                        onPress={handleClearVideo}
                        disabled={isUploading}
                        accessibilityLabel="Remove video"
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isUploading }}
                        accessibilityHint="Removes selected video and allows you to choose another"
                      >
                        <Ionicons name="close-circle" size={28} color={Colors.error} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.urlVideoInfo}>
                      <Ionicons name="link" size={32} color={Colors.brand.purpleLight} />
                      <Text style={styles.urlVideoText} numberOfLines={2}>
                        {state.video.uri}
                      </Text>
                      <Pressable
                        style={styles.removeUrlButton}
                        onPress={handleClearVideo}
                        disabled={isUploading}
                      >
                        <Text style={styles.removeUrlText}>Remove</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Video Info */}
                  <View style={styles.videoInfo}>
                    {state.video.duration > 0 && (
                      <View style={styles.infoItem}>
                        <Ionicons name="time-outline" size={16} color={colors.midGray} />
                        <Text style={styles.infoText}>
                          {formatDuration(state.video.duration)}
                        </Text>
                      </View>
                    )}
                    {state.video.fileSize > 0 && (
                      <View style={styles.infoItem}>
                        <Ionicons name="document-outline" size={16} color={colors.midGray} />
                        <Text style={styles.infoText}>
                          {formatFileSize(state.video.fileSize)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Product Tagging Section */}
                <View style={styles.productTaggingContainer}>
                  <View style={styles.productTaggingHeader}>
                    <Text style={styles.productTaggingTitle}>
                      Tag Products (Optional)
                    </Text>
                    <Text style={styles.productCount}>
                      {state.selectedProducts.length}/{PRODUCT_TAGGING_RULES.maxProducts}
                    </Text>
                  </View>

                  {/* Tag Products Button */}
                  <Pressable
                    style={[
                      styles.tagProductsButton,
                      isUploading && styles.tagProductsButtonDisabled,
                    ]}
                    onPress={openProductSelector}
                    disabled={
                      isUploading ||
                      state.selectedProducts.length >= PRODUCT_TAGGING_RULES.maxProducts
                    }
                    accessibilityLabel={state.selectedProducts.length > 0 ? 'Add more products' : 'Tag products'}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: isUploading || state.selectedProducts.length >= PRODUCT_TAGGING_RULES.maxProducts
                    }}
                    accessibilityHint={`Tag products in your video. ${state.selectedProducts.length} of ${PRODUCT_TAGGING_RULES.maxProducts} products tagged`}
                  >
                    <Ionicons name="pricetag-outline" size={20} color={Colors.brand.purpleLight} />
                    <Text style={styles.tagProductsButtonText}>
                      {state.selectedProducts.length > 0 ? 'Add More Products' : 'Tag Products'}
                    </Text>
                  </Pressable>

                  {/* Selected Products Display */}
                  {state.selectedProducts.length > 0 && (
                    <View style={styles.selectedProductsContainer}>
                      <Text style={styles.selectedProductsTitle}>
                        Tagged Products ({state.selectedProducts.length})
                      </Text>
                      <View style={styles.productChipsContainer}>
                        {state.selectedProducts.map((product) => (
                          <ProductChip
                            key={product._id}
                            product={product}
                            onRemove={() => removeProduct(product._id)}
                            disabled={isUploading}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Upload Progress */}
                {isUploading && (
                  <View style={styles.uploadProgressContainer}>
                    <UploadProgress
                      status={state.status}
                      progress={state.progress}
                      showCancel={false}
                    />
                  </View>
                )}

                {/* Form Fields */}
                <View style={styles.formFields}>
                  {/* Title */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Title <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        state.validationErrors.some(e => e.field === 'title') && styles.inputError,
                      ]}
                      placeholder="Give your video a catchy title"
                      placeholderTextColor={colors.neutral[400]}
                      value={state.title}
                      onChangeText={updateTitle}
                      maxLength={100}
                      editable={!isUploading}
                    />
                    <Text style={styles.charCount}>{state.title.length}/100</Text>
                  </View>

                  {/* Description */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Description</Text>
                    <TextInput
                      style={[
                        styles.input,
                        styles.textArea,
                        state.validationErrors.some(e => e.field === 'description') &&
                          styles.inputError,
                      ]}
                      placeholder="Tell us more about your video..."
                      placeholderTextColor={colors.neutral[400]}
                      value={state.description}
                      onChangeText={updateDescription}
                      maxLength={500}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      editable={!isUploading}
                    />
                    <Text style={styles.charCount}>{state.description.length}/500</Text>
                  </View>

                  {/* Hashtags */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Hashtags{' '}
                      <Text style={styles.helperText}>(comma-separated, max 10)</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        state.validationErrors.some(e => e.field === 'hashtags') &&
                          styles.inputError,
                      ]}
                      placeholder="fashion, style, trending"
                      placeholderTextColor={colors.neutral[400]}
                      value={hashtagInput}
                      onChangeText={handleHashtagChange}
                      editable={!isUploading}
                    />
                    {state.hashtags.length > 0 && (
                      <View style={styles.hashtagPreview}>
                        {state.hashtags.map((tag, index) => (
                          <View key={index} style={styles.hashtagChip}>
                            <Text style={styles.hashtagText}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Error Messages */}
                  {state.error && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={20} color={Colors.error} />
                      <Text style={styles.errorText}>{state.error}</Text>
                    </View>
                  )}
                </View>

                {/* Upload Button */}
                <Pressable
                  style={[
                    styles.uploadButton,
                    (!canUpload || isUploading) && styles.uploadButtonDisabled,
                  ]}
                  onPress={handleUpload}
                  disabled={!canUpload || isUploading}
                 
                  accessibilityLabel={isUploading ? "Uploading video" : "Upload video"}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canUpload || isUploading, busy: isUploading }}
                  accessibilityHint="Uploads your video to the platform"
                >
                  {isUploading ? (
                    <>
                      <Ionicons name="hourglass-outline" size={20} color={Colors.text.inverse} />
                      <Text style={styles.uploadButtonText}>Uploading...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={20} color={Colors.text.inverse} />
                      <Text style={styles.uploadButtonText}>Upload Video</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Product Selector Modal */}
        <ProductSelector
          visible={state.productSelectorVisible}
          onClose={closeProductSelector}
          selectedProducts={state.selectedProducts}
          onProductsChange={addProducts}
          maxProducts={PRODUCT_TAGGING_RULES.maxProducts}
          minProducts={PRODUCT_TAGGING_RULES.minProducts}
          title="Tag Products"
          confirmButtonText="Add Products"
          allowMultiple={true}
          requireSelection={false}
        />
      </SafeAreaView>
    </PurpleGradientBg>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  formContainer: {
    gap: Spacing.xl,
  },
  videoPreviewContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  videoWrapper: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.text.primary,
  },
  videoPreview: {
    width: '100%',
    height: screenWidth * 0.6,
  },
  removeVideoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
  },
  urlVideoInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  urlVideoText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  removeUrlButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.errorScale[100],
    borderRadius: BorderRadius.sm,
  },
  removeUrlText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.error,
  },
  videoInfo: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  uploadProgressContainer: {
    marginVertical: Spacing.sm,
  },
  formFields: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  inputLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  required: {
    color: '#FCA5A5',
  },
  helperText: {
    ...Typography.bodySmall,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#FCA5A5',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  hashtagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  hashtagChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  hashtagText: {
    ...Typography.bodySmall,
    color: Colors.text.inverse,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorScale[100],
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  errorText: {
    flex: 1,
    ...Typography.body,
    color: '#991B1B',
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
  // Product Tagging Styles
  productTaggingContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  productTaggingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTaggingTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  productCount: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
  tagProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.brand.purpleLight,
    borderStyle: 'dashed',
  },
  tagProductsButtonDisabled: {
    opacity: 0.5,
  },
  tagProductsButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
  selectedProductsContainer: {
    gap: Spacing.md,
  },
  selectedProductsTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  productChipsContainer: {
    gap: Spacing.sm,
  },
});

export default withErrorBoundary(UGCUploadScreen, 'UgcUpload');
