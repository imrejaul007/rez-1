import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { showAlert, alertOk } from '@/utils/alert';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { uploadProjectFile, uploadMultipleProjectFiles } from '@/services/projectUploadService';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Project {
  _id: string;
  type: 'video' | 'photo' | 'text' | 'visit' | 'checkin' | 'survey' | 'rating' | 'social' | 'referral';
  requirements?: {
    minWords?: number;
    minDuration?: number;
    maxDuration?: number;
    minPhotos?: number;
    location?: {
      required: boolean;
    };
  };
}

interface ProjectSubmissionFormProps {
  project: Project;
  onSubmit: (data: {
    content: string | string[];
    contentType: 'text' | 'image' | 'video' | 'rating' | 'checkin' | 'receipt';
    metadata?: any;
  }) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  existingSubmission?: {
    content: {
      type: 'text' | 'image' | 'video' | 'rating' | 'checkin' | 'receipt';
      data: string | string[];
      metadata?: any;
    };
    status: 'pending' | 'approved' | 'rejected' | 'under_review';
  };
}

function ProjectSubmissionForm({
  project,
  onSubmit,
  onCancel,
  submitting = false,
  existingSubmission,
}: ProjectSubmissionFormProps) {
  // Initialize form with existing submission data if available
  const getInitialContent = () => {
    if (!existingSubmission) return '';
    if (existingSubmission.content.type === 'text') {
      return typeof existingSubmission.content.data === 'string' 
        ? existingSubmission.content.data 
        : existingSubmission.content.data.join('\n');
    }
    return '';
  };

  const getInitialImages = () => {
    if (!existingSubmission) return [];
    if (existingSubmission.content.type === 'image' || existingSubmission.content.type === 'checkin') {
      return Array.isArray(existingSubmission.content.data) 
        ? existingSubmission.content.data 
        : [existingSubmission.content.data];
    }
    return [];
  };

  const getInitialVideo = () => {
    if (!existingSubmission) return null;
    if (existingSubmission.content.type === 'video') {
      return typeof existingSubmission.content.data === 'string' 
        ? existingSubmission.content.data 
        : existingSubmission.content.data[0] || null;
    }
    return null;
  };

  const getInitialRating = () => {
    if (!existingSubmission) return 0;
    if (existingSubmission.content.type === 'rating') {
      return parseInt(typeof existingSubmission.content.data === 'string' 
        ? existingSubmission.content.data 
        : existingSubmission.content.data[0] || '0');
    }
    return 0;
  };

  const getInitialLocation = () => {
    if (!existingSubmission?.content.metadata?.location) return null;
    return {
      latitude: existingSubmission.content.metadata.location[1],
      longitude: existingSubmission.content.metadata.location[0],
    };
  };

  const [submissionText, setSubmissionText] = useState(getInitialContent());
  const [selectedImages, setSelectedImages] = useState<string[]>(getInitialImages());
  const [selectedVideo, setSelectedVideo] = useState<string | null>(getInitialVideo());
  const [rating, setRating] = useState<number>(getInitialRating());
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(getInitialLocation());
  const [locationName, setLocationName] = useState<string>(existingSubmission?.content.metadata?.locationName || '');
  const [uploading, setUploading] = useState(false);
  const isMounted = useIsMounted();

  // Determine content type based on project type
  const getContentType = (): 'text' | 'image' | 'video' | 'rating' | 'checkin' | 'receipt' => {
    switch (project.type) {
      case 'photo':
        return 'image';
      case 'video':
        return 'video';
      case 'rating':
        return 'rating';
      case 'checkin':
      case 'visit':
        return 'checkin';
      case 'text':
      case 'survey':
      case 'social':
      case 'referral':
      default:
        return 'text';
    }
  };

  const contentType = getContentType();

  // Validate submission based on project requirements
  const validateSubmission = (): { valid: boolean; error?: string } => {
    const requirements = project.requirements || {};

    switch (contentType) {
      case 'text':
        if (!submissionText.trim()) {
          return { valid: false, error: 'Please provide your submission content' };
        }
        if (requirements.minWords && submissionText.trim().split(/\s+/).length < requirements.minWords) {
          return { valid: false, error: `Please provide at least ${requirements.minWords} words` };
        }
        break;

      case 'image':
        const minPhotos = requirements.minPhotos || 1;
        if (selectedImages.length < minPhotos) {
          return { valid: false, error: `Please upload at least ${minPhotos} photo${minPhotos > 1 ? 's' : ''}` };
        }
        break;

      case 'video':
        if (!selectedVideo) {
          return { valid: false, error: 'Please upload a video' };
        }
        // Video duration validation would be done after upload
        break;

      case 'rating':
        if (rating === 0) {
          return { valid: false, error: 'Please provide a rating' };
        }
        break;

      case 'checkin':
        if (requirements.location?.required && !location) {
          return { valid: false, error: 'Please provide your location' };
        }
        if (!submissionText.trim() && selectedImages.length === 0) {
          return { valid: false, error: 'Please provide a description or photo' };
        }
        break;
    }

    return { valid: true };
  };

  // Handle image selection
  const handleSelectImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets.map(asset => asset.uri);
        if (!isMounted()) return;
        setSelectedImages(prev => [...prev, ...imageUris]);
      }
    } catch (error) {
      showAlert('Error', 'Failed to select images. Please try again.');
    }
  };

  // Handle video selection
  const handleSelectVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant camera roll permissions to upload videos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 0.8,
        videoMaxDuration: project.requirements?.maxDuration || 300,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (!isMounted()) return;
        setSelectedVideo(result.assets[0].uri);
      }
    } catch (error) {
      showAlert('Error', 'Failed to select video. Please try again.');
    }
  };

  // Handle location/check-in
  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant location permissions for check-in');
        return;
      }

      if (!isMounted()) return;
      setUploading(true);
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = locationResult.coords;
      if (!isMounted()) return;
      setLocation({ latitude, longitude });

      // Reverse geocode to get location name
      try {
        const geocodeResult = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocodeResult && geocodeResult.length > 0) {
          const address = geocodeResult[0];
          const addressParts = [
            address.street,
            address.city,
            address.region,
            address.country,
          ].filter(Boolean);
          if (!isMounted()) return;
          setLocationName(addressParts.join(', ') || 'Current Location');
        } else {
          setLocationName('Current Location');
        }
      } catch (geocodeError) {
        if (!isMounted()) return;
        setLocationName('Current Location');
      }
    } catch (error) {
      showAlert('Error', 'Failed to get location. Please try again.');
    } finally {
      if (!isMounted()) return;
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    const validation = validateSubmission();
    if (!validation.valid) {
      showAlert('Validation Error', validation.error || 'Please complete all required fields');
      return;
    }

    try {
      setUploading(true);

      let content: string | string[] = '';
      let metadata: any = {};

      switch (contentType) {
        case 'text':
          content = submissionText.trim();
          metadata.wordCount = submissionText.trim().split(/\s+/).length;
          break;

        case 'image':
          // Separate already uploaded (Cloudinary URLs) from new local images
          const existingImageUrls = selectedImages.filter(url => url.startsWith('http://') || url.startsWith('https://'));
          const newImageUris = selectedImages.filter(url => !url.startsWith('http://') && !url.startsWith('https://'));
          
          let allImageUrls = [...existingImageUrls];
          
          // Upload only new images to Cloudinary
          if (newImageUris.length > 0) {
            showAlert('Uploading', 'Uploading new images to cloud...');
            const imageUploadResults = await uploadMultipleProjectFiles(newImageUris, 'image');
            const failedImages = imageUploadResults.filter(r => !r.success);
            if (failedImages.length > 0) {
              showAlert('Upload Error', `Failed to upload ${failedImages.length} image(s). Please try again.`);
              return;
            }
            // Add new Cloudinary URLs
            allImageUrls = [...existingImageUrls, ...imageUploadResults.map(r => r.url!)];
            metadata.uploadedImages = imageUploadResults.map(r => ({
              url: r.url,
              publicId: r.publicId,
              thumbnailUrl: r.thumbnailUrl,
            }));
          } else if (existingSubmission?.content.metadata?.uploadedImages) {
            // Preserve existing uploaded images metadata
            metadata.uploadedImages = existingSubmission.content.metadata.uploadedImages;
          }
          
          // Use all Cloudinary URLs
          content = allImageUrls;
          metadata.imageCount = allImageUrls.length;
          break;

        case 'video':
          // Check if video is already uploaded (Cloudinary URL) or new (local URI)
          const isVideoAlreadyUploaded = selectedVideo!.startsWith('http://') || selectedVideo!.startsWith('https://');
          
          if (isVideoAlreadyUploaded) {
            // Video is already on Cloudinary, use it directly
            content = selectedVideo!;
            // Preserve existing metadata if available
            if (existingSubmission?.content.metadata?.uploadedVideo) {
              metadata.uploadedVideo = existingSubmission.content.metadata.uploadedVideo;
            }
          } else {
            // Upload new video to Cloudinary
            showAlert('Uploading', 'Uploading video to cloud...');
            const videoUploadResult = await uploadProjectFile(selectedVideo!, 'video');
            if (!videoUploadResult.success) {
              showAlert('Upload Error', videoUploadResult.error || 'Failed to upload video. Please try again.');
              return;
            }
            // Use Cloudinary URL
            content = videoUploadResult.url!;
            metadata.uploadedVideo = {
              url: videoUploadResult.url,
              publicId: videoUploadResult.publicId,
              thumbnailUrl: videoUploadResult.thumbnailUrl,
              duration: videoUploadResult.type === 'video' ? undefined : undefined, // Duration would be extracted from video metadata
            };
          }
          break;

        case 'rating':
          content = rating.toString();
          metadata.rating = rating;
          break;

        case 'checkin':
          // Upload images if any
          let checkinContent = submissionText.trim();
          if (selectedImages.length > 0) {
            // Separate already uploaded (Cloudinary URLs) from new local images
            const existingCheckinImageUrls = selectedImages.filter(url => url.startsWith('http://') || url.startsWith('https://'));
            const newCheckinImageUris = selectedImages.filter(url => !url.startsWith('http://') && !url.startsWith('https://'));
            
            let allCheckinImageUrls = [...existingCheckinImageUrls];
            
            // Upload only new images to Cloudinary
            if (newCheckinImageUris.length > 0) {
              showAlert('Uploading', 'Uploading new photos to cloud...');
              const checkinImageResults = await uploadMultipleProjectFiles(newCheckinImageUris, 'image');
              const failedCheckinImages = checkinImageResults.filter(r => !r.success);
              if (failedCheckinImages.length > 0) {
                showAlert('Upload Error', `Failed to upload ${failedCheckinImages.length} photo(s). Please try again.`);
                return;
              }
              // Add new Cloudinary URLs
              allCheckinImageUrls = [...existingCheckinImageUrls, ...checkinImageResults.map(r => r.url!)];
              metadata.uploadedImages = checkinImageResults.map(r => ({
                url: r.url,
                publicId: r.publicId,
                thumbnailUrl: r.thumbnailUrl,
              }));
            } else if (existingSubmission?.content.metadata?.uploadedImages) {
              // Preserve existing uploaded images metadata
              metadata.uploadedImages = existingSubmission.content.metadata.uploadedImages;
            }
            
            // Use first image URL if no text, otherwise use text
            checkinContent = checkinContent || allCheckinImageUrls[0];
            metadata.imageCount = allCheckinImageUrls.length;
          }
          content = checkinContent;
          if (location) {
            metadata.location = [location.longitude, location.latitude];
            metadata.locationName = locationName;
          }
          break;
      }

      await onSubmit({
        content,
        contentType,
        metadata,
      });
    } catch (error) {
      showAlert('Error', 'Failed to submit project. Please try again.');
    } finally {
      if (!isMounted()) return;
      setUploading(false);
    }
  };

  // Render form based on content type
  const renderForm = () => {
    switch (contentType) {
      case 'text':
        return (
          <View style={styles.formSection}>
            <ThemedText style={styles.label}>
              Your Submission {project.requirements?.minWords && `(Min ${project.requirements.minWords} words)`}
            </ThemedText>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your submission content..."
              placeholderTextColor={colors.neutral[400]}
              value={submissionText}
              onChangeText={setSubmissionText}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            {project.requirements?.minWords && (
              <ThemedText style={styles.helperText}>
                {submissionText.trim().split(/\s+/).length} / {project.requirements.minWords} words
              </ThemedText>
            )}
          </View>
        );

      case 'image':
        return (
          <View style={styles.formSection}>
            <ThemedText style={styles.label}>
              Upload Photos {project.requirements?.minPhotos && `(Min ${project.requirements.minPhotos} photos)`}
            </ThemedText>
            <Pressable
              style={styles.uploadButton}
              onPress={handleSelectImages}
              disabled={uploading}
            >
              <LinearGradient
                colors={[colors.brand.purpleLight, colors.brand.purple]}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="images-outline" size={20} color={colors.background.primary} />
                <ThemedText style={styles.uploadButtonText}>
                  {selectedImages.length > 0 ? `Add More (${selectedImages.length})` : 'Select Photos'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
            {selectedImages.length > 0 && (
              <ScrollView horizontal style={styles.imagePreviewContainer}>
                {selectedImages.map((uri, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <CachedImage source={{ uri }} style={styles.imagePreview} />
                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
            {project.requirements?.minPhotos && (
              <ThemedText style={styles.helperText}>
                {selectedImages.length} / {project.requirements.minPhotos} photos
              </ThemedText>
            )}
          </View>
        );

      case 'video':
        return (
          <View style={styles.formSection}>
            <ThemedText style={styles.label}>Upload Video</ThemedText>
            {project.requirements?.minDuration && project.requirements?.maxDuration && (
              <ThemedText style={styles.helperText}>
                Duration: {project.requirements.minDuration}s - {project.requirements.maxDuration}s
              </ThemedText>
            )}
            <Pressable
              style={styles.uploadButton}
              onPress={handleSelectVideo}
              disabled={uploading}
            >
              <LinearGradient
                colors={[colors.brand.purpleLight, colors.brand.purple]}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="videocam-outline" size={20} color={colors.background.primary} />
                <ThemedText style={styles.uploadButtonText}>
                  {selectedVideo ? 'Change Video' : 'Select Video'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
            {selectedVideo && (
              <View style={styles.videoPreviewContainer}>
                <CachedImage source={selectedVideo} style={styles.videoPreview} />
                <Pressable
                  style={styles.removeVideoButton}
                  onPress={() => setSelectedVideo(null)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </Pressable>
              </View>
            )}
          </View>
        );

      case 'rating':
        return (
          <View style={styles.formSection}>
            <ThemedText style={styles.label}>Rate Your Experience</ThemedText>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? colors.warningScale[400] : colors.neutral[300]}
                  />
                </Pressable>
              ))}
            </View>
            {rating > 0 && (
              <ThemedText style={styles.ratingText}>
                {rating} out of 5 stars
              </ThemedText>
            )}
            {submissionText.trim() && (
              <View style={styles.textInputContainer}>
                <ThemedText style={styles.label}>Additional Comments (Optional)</ThemedText>
                <TextInput
                  style={styles.textInput}
                  placeholder="Add your comments..."
                  placeholderTextColor={colors.neutral[400]}
                  value={submissionText}
                  onChangeText={setSubmissionText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>
        );

      case 'checkin':
        return (
          <View style={styles.formSection}>
            <ThemedText style={styles.label}>Check In Location</ThemedText>
            <Pressable
              style={styles.uploadButton}
              onPress={handleGetLocation}
              disabled={uploading}
            >
              <LinearGradient
                colors={location ? [colors.successScale[400], colors.successScale[700]] : [colors.brand.purpleLight, colors.brand.purple]}
                style={styles.uploadButtonGradient}
              >
                <Ionicons
                  name={location ? 'checkmark-circle' : 'location-outline'}
                  size={20}
                  color={colors.background.primary}
                />
                <ThemedText style={styles.uploadButtonText}>
                  {location ? locationName || 'Location Set' : 'Get My Location'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
            {location && (
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={16} color={colors.successScale[400]} />
                <ThemedText style={styles.locationText}>
                  {locationName || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                </ThemedText>
              </View>
            )}
            <View style={styles.textInputContainer}>
              <ThemedText style={styles.label}>Description (Optional)</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="Add a description or note..."
                placeholderTextColor={colors.neutral[400]}
                value={submissionText}
                onChangeText={setSubmissionText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <Pressable
              style={styles.uploadButton}
              onPress={handleSelectImages}
              disabled={uploading}
            >
              <LinearGradient
                colors={[colors.brand.purpleLight, colors.brand.purple]}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="camera-outline" size={20} color={colors.background.primary} />
                <ThemedText style={styles.uploadButtonText}>
                  {selectedImages.length > 0 ? `Add More Photos (${selectedImages.length})` : 'Add Photo (Optional)'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
            {selectedImages.length > 0 && (
              <ScrollView horizontal style={styles.imagePreviewContainer}>
                {selectedImages.map((uri, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <CachedImage source={{ uri }} style={styles.imagePreview} />
                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const isEditing = !!existingSubmission;
  const formTitle = isEditing 
    ? existingSubmission.status === 'rejected' 
      ? 'Edit & Resubmit Your Work' 
      : existingSubmission.status === 'under_review'
        ? 'Edit Your Submission (Under Review)'
        : 'Edit Your Submission'
    : 'Submit Your Work';

  return (
    <View style={styles.container}>
      <ThemedText style={styles.formTitle}>{formTitle}</ThemedText>
      {isEditing && (existingSubmission.status === 'pending' || existingSubmission.status === 'under_review') && (
        <View style={styles.editNotice}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warningScale[400]} />
          <ThemedText style={styles.editNoticeText}>
            {existingSubmission.status === 'under_review' 
              ? 'Your submission is under review. You can still edit it before the review is completed.'
              : 'Your submission is pending. You can edit it before it\'s reviewed.'}
          </ThemedText>
        </View>
      )}
      {renderForm()}
      <View style={styles.formActions}>
        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={submitting || uploading}
        >
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.submitButton, (submitting || uploading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || uploading}
        >
          {submitting || uploading ? (
            <ActivityIndicator size="small" color={colors.background.primary} />
          ) : (
            <ThemedText style={styles.submitButtonText}>
              {isEditing && existingSubmission?.status === 'rejected' 
                ? 'Resubmit' 
                : isEditing 
                  ? 'Update Submission' 
                  : 'Submit'}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral[800],
    marginBottom: 12,
  },
  editNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  editNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.brand.amberDark,
    lineHeight: 18,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[700],
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.neutral[800],
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  textInputContainer: {
    marginTop: 16,
  },
  helperText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 4,
  },
  uploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  imagePreviewContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  videoPreviewContainer: {
    marginTop: 12,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: colors.neutral[100],
  },
  removeVideoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.successScale[50],
    borderRadius: 8,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: colors.successScale[700],
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[500],
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.purple,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});


export default React.memo(ProjectSubmissionForm);
