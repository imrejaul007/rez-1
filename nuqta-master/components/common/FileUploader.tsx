// File Uploader Component
// Reusable component for file uploads with progress and preview

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';
import {
  fileUploadService,
  UploadResult,
  UploadOptions,
  UploadProgress
} from '@/services/fileUploadService';
import { useIsMounted } from '@/hooks/useIsMounted';

interface FileUploaderProps {
  uploadType: 'profile' | 'ugc' | 'review';
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: ('image' | 'video')[];
  options?: UploadOptions;
  onUploadComplete?: (urls: { url: string; thumbnailUrl?: string }[]) => void;
  onUploadError?: (error: string) => void;
  placeholder?: string;
  style?: any;
}

interface FileUpload {
  id: string;
  file: UploadResult;
  uploadProgress: number;
  uploadUrl?: string;
  thumbnailUrl?: string;
  isUploading: boolean;
  error?: string;
}

function FileUploader({
  uploadType,
  maxFiles = 1,
  maxSizeMB = 10,
  allowedTypes = ['image'],
  options = {},
  onUploadComplete,
  onUploadError,
  placeholder = 'Tap to select files',
  style,
}: FileUploaderProps) {
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const isMounted = useIsMounted();

  const handleSelectFiles = useCallback(async () => {
    if (isSelecting) return;
    
    try {
      setIsSelecting(true);
      
      // Configure picker options
      const pickerOptions: UploadOptions = {
        allowsMultipleSelection: maxFiles > 1,
        mediaTypes: allowedTypes.includes('video') ? ImagePicker.MediaTypeOptions.All : ImagePicker.MediaTypeOptions.Images,
        ...options,
      };

      const selectedFiles = await fileUploadService.showImagePicker(pickerOptions);
      
      if (selectedFiles.length === 0) return;

      // Validate files
      const validFiles = [];
      for (const file of selectedFiles) {
        const validation = fileUploadService.validateFile(file, maxSizeMB, allowedTypes);
        if (!validation.isValid) {
          platformAlertSimple('Invalid File', validation.error || 'File validation failed');
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      // Check max files limit
      if (uploads.length + validFiles.length > maxFiles) {
        platformAlertSimple('Too Many Files', `You can only upload up to ${maxFiles} file${maxFiles > 1 ? 's' : ''}.`);
        return;
      }

      // Add files to upload queue
      const newUploads: FileUpload[] = validFiles.map(file => ({
        id: `${Date.now()}_${Math.random()}`,
        file,
        uploadProgress: 0,
        isUploading: false,
      }));

      if (!isMounted()) return;
      setUploads(prev => [...prev, ...newUploads]);

      // Start uploading
      startUploads(newUploads);
    } catch (error) {
      platformAlertSimple('Error', 'Failed to select files. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsSelecting(false);
    }
  }, [isSelecting, uploads.length, maxFiles, maxSizeMB, allowedTypes, options]);

  const startUploads = async (uploadsToStart: FileUpload[]) => {
    for (const upload of uploadsToStart) {
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { ...u, isUploading: true } : u
      ));

      try {
        const result = await fileUploadService.uploadFile(
          upload.file,
          uploadType,
          (progress: UploadProgress) => {
            if (!isMounted()) return;
            setUploads(prev => prev.map(u => 
              u.id === upload.id 
                ? { ...u, uploadProgress: progress.percentage }
                : u
            ));
          }
        );

        if (!isMounted()) return;
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { 
                ...u, 
                isUploading: false, 
                uploadUrl: result.url,
                thumbnailUrl: result.thumbnailUrl,
                uploadProgress: 100,
              }
            : u
        ));
      } catch (error) {
        if (!isMounted()) return;
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { 
                ...u, 
                isUploading: false, 
                error: error instanceof Error ? error.message : 'Upload failed',
                uploadProgress: 0,
              }
            : u
        ));
        onUploadError?.('Upload failed. Please try again.');
      }
    }

    // Check if all uploads are complete
    const allUploaded = uploads.every(u => u.uploadUrl && !u.isUploading && !u.error);
    if (allUploaded) {
      const urls = uploads
        .filter(u => u.uploadUrl)
        .map(u => ({ url: u.uploadUrl!, thumbnailUrl: u.thumbnailUrl }));
      onUploadComplete?.(urls);
    }
  };

  const removeUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const retryUpload = (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (upload) {
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, error: undefined, uploadProgress: 0 }
          : u
      ));
      startUploads([upload]);
    }
  };

  const renderUploadItem = (upload: FileUpload) => (
    <View key={upload.id} style={styles.uploadItem}>
      {/* Preview */}
      <View style={styles.preview}>
        {upload.file.type === 'image' ? (
          <CachedImage source={upload.file.uri} style={styles.previewImage} />
        ) : (
          <View style={styles.videoPreview}>
            <Ionicons name="play-circle" size={40} color={colors.background.primary} />
          </View>
        )}
        
        {/* Progress overlay */}
        {upload.isUploading && (
          <View style={styles.progressOverlay}>
            <ActivityIndicator size="small" color={colors.background.primary} />
            <ThemedText style={styles.progressText}>
              {upload.uploadProgress}%
            </ThemedText>
          </View>
        )}
        
        {/* Success indicator */}
        {upload.uploadUrl && (
          <View style={styles.successOverlay}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          </View>
        )}
        
        {/* Error indicator */}
        {upload.error && (
          <View style={styles.errorOverlay}>
            <Ionicons name="close-circle" size={24} color={colors.error} />
          </View>
        )}
      </View>

      {/* File info */}
      <View style={styles.fileInfo}>
        <ThemedText style={styles.fileName} numberOfLines={1}>
          {upload.file.fileName || 'Untitled'}
        </ThemedText>
        <ThemedText style={styles.fileSize}>
          {upload.file.fileSize 
            ? fileUploadService.formatFileSize(upload.file.fileSize)
            : 'Unknown size'
          }
        </ThemedText>
        
        {upload.error && (
          <ThemedText style={styles.errorText} numberOfLines={2}>
            {upload.error}
          </ThemedText>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {upload.error && (
          <Pressable
            style={styles.retryButton}
            onPress={() => retryUpload(upload.id)}
          >
            <Ionicons name="refresh" size={16} color={colors.brand.purpleLight} />
          </Pressable>
        )}
        
        <Pressable
          style={styles.removeButton}
          onPress={() => removeUpload(upload.id)}
        >
          <Ionicons name="trash" size={16} color={colors.error} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Upload button */}
      {uploads.length < maxFiles && (
        <Pressable
          style={styles.uploadButton}
          onPress={handleSelectFiles}
          disabled={isSelecting}
         
        >
          {isSelecting ? (
            <ActivityIndicator size="small" color={colors.brand.purpleLight} />
          ) : (
            <Ionicons name="cloud-upload" size={32} color={colors.brand.purpleLight} />
          )}
          
          <ThemedText style={styles.uploadText}>
            {isSelecting ? 'Selecting...' : placeholder}
          </ThemedText>
          
          <ThemedText style={styles.uploadSubtext}>
            {allowedTypes.includes('video') ? 'Images & Videos' : 'Images'} • 
            Max {maxSizeMB}MB • {maxFiles} file{maxFiles > 1 ? 's' : ''}
          </ThemedText>
        </Pressable>
      )}

      {/* Upload list */}
      {uploads.length > 0 && (
        <ScrollView 
          style={styles.uploadList}
          showsVerticalScrollIndicator={false}
        >
          {uploads.map(renderUploadItem)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 120,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: 12,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 12,
    color: colors.midGray,
    marginTop: 4,
    textAlign: 'center',
  },
  uploadList: {
    marginTop: 16,
    maxHeight: 300,
  },
  uploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  preview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[100],
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  successOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
  },
  errorOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 2,
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: colors.midGray,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.errorScale[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(FileUploader);
