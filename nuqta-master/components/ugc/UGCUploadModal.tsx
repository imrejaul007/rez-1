// @ts-nocheck
// UGCUploadModal.tsx
// Comprehensive multi-step modal for uploading UGC content

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { catchSilent } from '@/utils/catchAndReport';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Video } from 'expo-av';
import ugcApi, { CreateUGCRequest } from '@/services/ugcApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UGCUploadModalProps {
  visible: boolean;
  onClose: () => void;
  storeId?: string;
  productId?: string;
  onUploadSuccess?: (contentId: string) => void;
}

type UploadStep = 'media' | 'preview' | 'details' | 'uploading' | 'success';
type MediaType = 'photo' | 'video' | null;
type PrivacyType = 'public' | 'private' | 'friends';
type CategoryType = 'product_review' | 'tutorial' | 'unboxing' | 'experience';

interface SelectedMedia {
  uri: string;
  type: MediaType;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  fileName?: string;
}

// Validation rules
const VALIDATION_RULES = {
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxVideoSize: 50 * 1024 * 1024, // 50MB
  maxCaptionLength: 500,
  maxHashtags: 10,
  allowedImageFormats: ['jpg', 'jpeg', 'png'],
  allowedVideoFormats: ['mp4', 'mov'],
};

function UGCUploadModal({
  visible,
  onClose,
  storeId,
  productId,
  onUploadSuccess,
}: UGCUploadModalProps) {
  // State management
  const [currentStep, setCurrentStep] = useState<UploadStep>('media');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [category, setCategory] = useState<CategoryType>('product_review');
  const [privacy, setPrivacy] = useState<PrivacyType>('public');
  const [tagProduct, setTagProduct] = useState(!!productId);
  const [tagLocation, setTagLocation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedContentId, setUploadedContentId] = useState<string | null>(null);
  const isMounted = useIsMounted();

  // Animation values
  const fadeAnim = useSharedValue(0);
  const successScaleAnim = useSharedValue(0);

  // Timer refs for cleanup
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
    };
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    let anim: any | undefined;
    if (!visible) {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = setTimeout(() => {
        resetState();
      }, 300);
    } else {
      anim = withTiming(1, { duration: 300 });
    }
    return () => {
      // Animation cleanup handled by reanimated
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, [visible]);

  const resetState = () => {
    setCurrentStep('media');
    setSelectedMedia(null);
    setCaption('');
    setHashtags([]);
    setHashtagInput('');
    setCategory('product_review');
    setPrivacy('public');
    setTagProduct(!!productId);
    setTagLocation(false);
    setUploadProgress(0);
    setIsUploading(false);
    setError(null);
    setUploadedContentId(null);
    fadeAnim.value = 0;
    successScaleAnim.value = 0;
  };

  // Request permissions
  const requestPermissions = async (): Promise<boolean> => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
      platformAlertSimple('Permissions Required', 'Please grant camera and media library permissions to upload content.');
      return false;
    }
    return true;
  };

  // Validate file
  const validateFile = (uri: string, type: MediaType, fileSize?: number): boolean => {
    if (!type) {
      setError('Invalid media type');
      return false;
    }

    // Check file size
    if (fileSize) {
      const maxSize = type === 'photo' ? VALIDATION_RULES.maxImageSize : VALIDATION_RULES.maxVideoSize;
      if (fileSize > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        setError(`File size exceeds ${maxSizeMB}MB limit`);
        return false;
      }
    }

    // Check file format
    const extension = uri.split('.').pop()?.toLowerCase() || '';
    const allowedFormats = type === 'photo'
      ? VALIDATION_RULES.allowedImageFormats
      : VALIDATION_RULES.allowedVideoFormats;

    if (!allowedFormats.includes(extension)) {
      setError(`Invalid format. Allowed: ${allowedFormats.join(', ')}`);
      return false;
    }

    return true;
  };

  // Take photo/video with camera
  const handleTakeMedia = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const type: MediaType = asset.type === 'video' ? 'video' : 'photo';

        if (validateFile(asset.uri, type, asset.fileSize)) {
          if (!isMounted()) return;
          setSelectedMedia({
            uri: asset.uri,
            type,
            width: asset.width,
            height: asset.height,
            duration: asset.duration,
            fileSize: asset.fileSize,
            fileName: asset.fileName,
          });
          if (!isMounted()) return;
          setCurrentStep('preview');
          if (Platform.OS !== 'web') {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch (e) { catchSilent(e, 'UGCUploadModal/haptics'); }
          }
        }
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to capture media. Please try again.');
    }
  };

  // Choose from library
  const handleChooseFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const type: MediaType = asset.type === 'video' ? 'video' : 'photo';

        if (validateFile(asset.uri, type, asset.fileSize)) {
          if (!isMounted()) return;
          setSelectedMedia({
            uri: asset.uri,
            type,
            width: asset.width,
            height: asset.height,
            duration: asset.duration,
            fileSize: asset.fileSize,
            fileName: asset.fileName,
          });
          if (!isMounted()) return;
          setCurrentStep('preview');
          if (Platform.OS !== 'web') {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch (e) { catchSilent(e, 'UGCUploadModal/haptics'); }
          }
        }
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to select media. Please try again.');
    }
  };

  // Add hashtag
  const handleAddHashtag = () => {
    const tag = hashtagInput.trim();
    if (!tag) return;

    if (hashtags.length >= VALIDATION_RULES.maxHashtags) {
      setError(`Maximum ${VALIDATION_RULES.maxHashtags} hashtags allowed`);
      return;
    }

    if (hashtags.includes(tag)) {
      setError('Hashtag already added');
      return;
    }

    setHashtags([...hashtags, tag]);
    setHashtagInput('');
    setError(null);
  };

  // Remove hashtag
  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  // Validate caption
  const validateCaption = (): boolean => {
    if (caption.length > VALIDATION_RULES.maxCaptionLength) {
      setError(`Caption exceeds ${VALIDATION_RULES.maxCaptionLength} characters`);
      return false;
    }
    return true;
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedMedia) {
      setError('No media selected');
      return;
    }

    if (!validateCaption()) return;

    setIsUploading(true);
    setCurrentStep('uploading');
    setError(null);
    setUploadProgress(0);

    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      // Create FormData
      const formData = new FormData();

      // Add file
      const fileExtension = selectedMedia.uri.split('.').pop() || 'jpg';
      const fileName = selectedMedia.fileName || `ugc_${Date.now()}.${fileExtension}`;

      formData.append('file', {
        uri: selectedMedia.uri,
        name: fileName,
        type: selectedMedia.type === 'video' ? 'video/mp4' : 'image/jpeg',
      } as any);

      // Create request data
      const requestData: CreateUGCRequest = {
        type: selectedMedia.type!,
        caption: caption.trim(),
        tags: hashtags,
      };

      if (storeId) {
        requestData.relatedStoreId = storeId;
      }

      if (tagProduct && productId) {
        requestData.relatedProductId = productId;
      }

      // Simulate progress
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to backend
      const response = await ugcApi.create(requestData, formData);

      if (!isMounted()) return;
      setUploadProgress(100);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setUploadedContentId(response.data.content._id);
        setCurrentStep('success');

        // Success animation
        successScaleAnim.value = withSpring(1, { tension: 50,
          friction: 5 });

        if (Platform.OS !== 'web') {
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch (e) { catchSilent(e, 'UGCUploadModal/haptics'); }
        }

        // Auto close after 3 seconds
        if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);
        if (!isMounted()) return;
        autoCloseTimeoutRef.current = setTimeout(() => {
          handleClose();
          if (onUploadSuccess && uploadedContentId) {
            onUploadSuccess(uploadedContentId);
          }
        }, 3000);
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to upload content. Please try again.');
      setCurrentStep('details');
      if (Platform.OS !== 'web') {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); } catch (e) { catchSilent(e, 'UGCUploadModal/haptics'); }
      }
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      if (!isMounted()) return;
      setIsUploading(false);
    }
  };

  // Handle cancel upload
  const handleCancelUpload = () => {
    platformAlertDestructive('Cancel Upload', 'Are you sure you want to cancel the upload?', () => {
            setIsUploading(false);
            setCurrentStep('details');
          }, 'Yes');
  };

  // Handle close
  const handleClose = () => {
    if (isUploading) {
      handleCancelUpload();
      return;
    }
    onClose();
  };

  // Handle back
  const handleBack = () => {
    if (currentStep === 'preview') {
      setCurrentStep('media');
      setSelectedMedia(null);
    } else if (currentStep === 'details') {
      setCurrentStep('preview');
    }
  };

  // Render progress bar
  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View
          style={[
            styles.progressBarFill,
            { width: `${uploadProgress}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>{uploadProgress}%</Text>
    </View>
  );

  // Render header
  const renderHeader = () => {
    const stepTitles = {
      media: 'Select Media',
      preview: 'Preview & Caption',
      details: 'Add Details',
      uploading: 'Uploading...',
      success: 'Success!',
    };

    return (
      <View style={styles.header}>
        {currentStep !== 'media' && currentStep !== 'success' && currentStep !== 'uploading' && (
          <Pressable onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>{stepTitles[currentStep]}</Text>
        <Pressable onPress={handleClose} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.background.primary} />
        </Pressable>
      </View>
    );
  };

  // Render media selection
  const renderMediaSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepDescription}>Choose how you want to add content</Text>

      <Pressable
        style={styles.mediaOption}
        onPress={handleTakeMedia}
       
      >
        <LinearGradient
          colors={[colors.brand.purple, colors.brand.purpleLight]}
          style={styles.mediaOptionGradient}
        >
          <Ionicons name="camera" size={48} color={colors.background.primary} />
          <Text style={styles.mediaOptionTitle}>Take Photo/Video</Text>
          <Text style={styles.mediaOptionSubtitle}>Capture new content</Text>
        </LinearGradient>
      </Pressable>

      <Pressable
        style={styles.mediaOption}
        onPress={handleChooseFromLibrary}
       
      >
        <LinearGradient
          colors={[colors.brand.purple, colors.brand.purpleLight]}
          style={styles.mediaOptionGradient}
        >
          <Ionicons name="images" size={48} color={colors.background.primary} />
          <Text style={styles.mediaOptionTitle}>Choose from Library</Text>
          <Text style={styles.mediaOptionSubtitle}>Select existing media</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  // Render preview
  const renderPreview = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      {/* Media Preview */}
      <View style={styles.mediaPreviewContainer}>
        {selectedMedia?.type === 'video' ? (
          <Video
            source={selectedMedia.uri}
            style={styles.mediaPreview}
            contentFit="cover"
            shouldPlay={false}
            isLooping
            useNativeControls
          />
        ) : (
          <CachedImage
            source={selectedMedia?.uri}
            style={styles.mediaPreview}
            contentFit="cover"
          />
        )}
      </View>

      {/* Caption Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Caption</Text>
        <TextInput
          style={styles.captionInput}
          placeholder="Write a caption..."
          placeholderTextColor={colors.neutral[400]}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={VALIDATION_RULES.maxCaptionLength}
          textAlignVertical="top"
        />
        <Text style={styles.characterCount}>
          {caption.length}/{VALIDATION_RULES.maxCaptionLength}
        </Text>
      </View>

      {/* Tag Options */}
      {productId && (
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => setTagProduct(!tagProduct)}
         
        >
          <Ionicons
            name={tagProduct ? 'checkbox' : 'square-outline'}
            size={24}
            color={colors.brand.purple}
          />
          <Text style={styles.checkboxLabel}>Tag Product</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.checkboxContainer}
        onPress={() => setTagLocation(!tagLocation)}
       
      >
        <Ionicons
          name={tagLocation ? 'checkbox' : 'square-outline'}
          size={24}
          color={colors.brand.purple}
        />
        <Text style={styles.checkboxLabel}>Tag Location</Text>
      </Pressable>

      {/* Privacy Selector */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Privacy</Text>
        <View style={styles.privacyOptions}>
          {['public', 'private', 'friends'].map((option) => (
            <Pressable
              key={option}
              style={[
                styles.privacyOption,
                privacy === option && styles.privacyOptionActive,
              ]}
              onPress={() => setPrivacy(option as PrivacyType)}
             
            >
              <Text
                style={[
                  styles.privacyOptionText,
                  privacy === option && styles.privacyOptionTextActive,
                ]}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Next Button */}
      <Pressable
        style={styles.primaryButton}
        onPress={() => {
          if (validateCaption()) {
            setCurrentStep('details');
          }
        }}
       
      >
        <LinearGradient
          colors={[colors.brand.purple, colors.brand.purpleLight]}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );

  // Render details
  const renderDetails = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      {/* Category Selector */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Category</Text>
        <View style={styles.categoryOptions}>
          {[
            { value: 'product_review', label: 'Product Review', icon: 'star' },
            { value: 'tutorial', label: 'Tutorial', icon: 'play-circle' },
            { value: 'unboxing', label: 'Unboxing', icon: 'cube' },
            { value: 'experience', label: 'Experience', icon: 'happy' },
          ].map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.categoryOption,
                category === option.value && styles.categoryOptionActive,
              ]}
              onPress={() => setCategory(option.value as CategoryType)}
             
            >
              <Ionicons
                name={option.icon as any}
                size={24}
                color={category === option.value ? colors.background.primary : colors.brand.purple}
              />
              <Text
                style={[
                  styles.categoryOptionText,
                  category === option.value && styles.categoryOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Hashtags Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Hashtags ({hashtags.length}/{VALIDATION_RULES.maxHashtags})
        </Text>
        <View style={styles.hashtagInputContainer}>
          <TextInput
            style={styles.hashtagInput}
            placeholder="Add hashtag..."
            placeholderTextColor={colors.neutral[400]}
            value={hashtagInput}
            onChangeText={setHashtagInput}
            onSubmitEditing={handleAddHashtag}
            returnKeyType="done"
          />
          <Pressable
            style={styles.addHashtagButton}
            onPress={handleAddHashtag}
           
          >
            <Ionicons name="add-circle" size={28} color={colors.brand.purple} />
          </Pressable>
        </View>

        {/* Hashtag Chips */}
        {hashtags.length > 0 && (
          <View style={styles.hashtagChips}>
            {hashtags.map((tag, index) => (
              <View key={index} style={styles.hashtagChip}>
                <Text style={styles.hashtagChipText}>#{tag}</Text>
                <Pressable
                  onPress={() => handleRemoveHashtag(tag)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.brand.purple} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Upload Button */}
      <Pressable
        style={styles.primaryButton}
        onPress={handleUpload}
       
        disabled={isUploading}
      >
        <LinearGradient
          colors={[colors.brand.purple, colors.brand.purpleLight]}
          style={styles.primaryButtonGradient}
        >
          <Ionicons name="cloud-upload" size={20} color={colors.background.primary} />
          <Text style={styles.primaryButtonText}>Upload</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );

  // Render uploading
  const renderUploading = () => (
    <View style={styles.uploadingContainer}>
      <ActivityIndicator size="large" color={colors.brand.purple} />
      <Text style={styles.uploadingText}>Uploading your content...</Text>
      {renderProgressBar()}

      <Pressable
        style={styles.cancelButton}
        onPress={handleCancelUpload}
       
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </View>
  );

  // Render success
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <Animated.View style={[styles.successIcon, { transform: [{ scale: successScaleAnim }] }]}>
        <Ionicons name="checkmark-circle" size={100} color={colors.lightMustard} />
      </Animated.View>
      <Text style={styles.successTitle}>Uploaded successfully!</Text>
      <Text style={styles.successSubtitle}>Your content is now live</Text>

      <View style={styles.successButtons}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            if (uploadedContentId && onUploadSuccess) {
              onUploadSuccess(uploadedContentId);
            }
            onClose();
          }}
         
        >
          <Text style={styles.secondaryButtonText}>View Post</Text>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            resetState();
            setCurrentStep('media');
          }}
         
        >
          <LinearGradient
            colors={[colors.brand.purple, colors.brand.purpleLight]}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>Upload Another</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );

  // Render error
  const renderError = () => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={20} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => setError(null)}>
          <Ionicons name="close" size={20} color={colors.error} />
        </Pressable>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient colors={[colors.brand.purple, colors.brand.purpleLight]} style={styles.headerGradient}>
          {renderHeader()}
        </LinearGradient>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {renderError()}

          {currentStep === 'media' && renderMediaSelection()}
          {currentStep === 'preview' && renderPreview()}
          {currentStep === 'details' && renderDetails()}
          {currentStep === 'uploading' && renderUploading()}
          {currentStep === 'success' && renderSuccess()}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepDescription: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 30,
  },

  // Media Selection
  mediaOption: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  mediaOptionGradient: {
    padding: 32,
    alignItems: 'center',
  },
  mediaOptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
    marginTop: 16,
  },
  mediaOptionSubtitle: {
    fontSize: 14,
    color: '#E9D5FF',
    marginTop: 4,
  },

  // Media Preview
  mediaPreviewContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.neutral[200],
    marginBottom: 20,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },

  // Inputs
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 8,
  },
  captionInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.neutral[800],
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  characterCount: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'right',
    marginTop: 4,
  },

  // Checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 15,
    color: colors.neutral[800],
    marginLeft: 12,
    fontWeight: '500',
  },

  // Privacy
  privacyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    alignItems: 'center',
  },
  privacyOptionActive: {
    borderColor: colors.brand.purple,
    backgroundColor: colors.tint.pink,
  },
  privacyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  privacyOptionTextActive: {
    color: colors.brand.purple,
  },

  // Category
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    width: (SCREEN_WIDTH - 64) / 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    gap: 8,
  },
  categoryOptionActive: {
    borderColor: colors.brand.purple,
    backgroundColor: colors.brand.purple,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  categoryOptionTextActive: {
    color: colors.background.primary,
  },

  // Hashtags
  hashtagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hashtagInput: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.neutral[800],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  addHashtagButton: {
    padding: 4,
  },
  hashtagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.tint.pink,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  hashtagChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.purple,
  },

  // Buttons
  primaryButton: {
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.brand.purple,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  cancelButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.errorScale[100],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },

  // Uploading
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  uploadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
    marginTop: 20,
    marginBottom: 30,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brand.purple,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
    marginTop: 8,
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.neutral[500],
    marginBottom: 40,
  },
  successButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.errorScale[100],
    padding: 16,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '500',
  },
});

export default React.memo(UGCUploadModal);
