// @ts-nocheck
// KYC Upload Modal
// Handles document upload for KYC verification

import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import paymentVerificationService from '@/services/paymentVerificationService';
import { DocumentType, type KYCDocumentUpload } from '@/types/paymentVerification.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface KYCUploadModalProps {
  visible: boolean;
  paymentMethodId?: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const DOCUMENT_TYPES = [
  { type: DocumentType.PAN, label: 'PAN Card', icon: 'card', requiresBack: false },
  { type: DocumentType.AADHAAR, label: 'Aadhaar Card', icon: 'card', requiresBack: true },
  { type: DocumentType.PASSPORT, label: 'Passport', icon: 'airplane', requiresBack: false },
  { type: DocumentType.DRIVERS_LICENSE, label: 'Driver\'s License', icon: 'car', requiresBack: true },
];

function KYCUploadModal({
  visible,
  paymentMethodId,
  onClose,
  onSuccess,
  onError,
}: KYCUploadModalProps) {
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>(DocumentType.PAN);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isMounted = useIsMounted();

  const selectedDoc = DOCUMENT_TYPES.find(d => d.type === selectedDocType)!;

  const pickImage = async (side: 'front' | 'back') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        platformAlertSimple('Permission Required', 'Please allow access to your photo library to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        if (side === 'front') {
          if (!isMounted()) return;
          setFrontImage(imageUri);
        } else {
          setBackImage(imageUri);
        }
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to pick image');
    }
  };

  const handleUpload = async () => {
    if (!frontImage || (selectedDoc.requiresBack && !backImage)) {
      platformAlertSimple('Missing Documents', 'Please upload all required documents');
      return;
    }

    try {
      setIsUploading(true);

      const documents: KYCDocumentUpload[] = [{
        documentType: selectedDocType,
        frontImage: frontImage,
        backImage: backImage || undefined,
      }];

      const response = await paymentVerificationService.uploadKYCDocuments({
        paymentMethodId,
        documents,
      });

      if (response.success) {
        onSuccess();
        platformAlertSimple('Documents Uploaded', 'Your documents have been submitted for verification. We\'ll notify you once the review is complete (typically 24-48 hours).',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error: any) {
      onError(error.message || 'Failed to upload documents');
      platformAlertSimple('Upload Failed', error.message || 'Failed to upload documents');
    } finally {
      if (!isMounted()) return;
      setIsUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.neutral[800]} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>KYC Verification</ThemedText>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Document Type Selection */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Select Document Type</ThemedText>
            <View style={styles.documentTypeGrid}>
              {DOCUMENT_TYPES.map((doc) => (
                <Pressable
                  key={doc.type}
                  style={[
                    styles.documentTypeCard,
                    selectedDocType === doc.type && styles.documentTypeCardSelected,
                  ]}
                  onPress={() => setSelectedDocType(doc.type)}
                >
                  <Ionicons
                    name={doc.icon as any}
                    size={24}
                    color={selectedDocType === doc.type ? colors.brand.purpleLight : colors.neutral[500]}
                  />
                  <ThemedText style={[
                    styles.documentTypeLabel,
                    selectedDocType === doc.type && styles.documentTypeLabelSelected,
                  ]}>
                    {doc.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Upload Instructions */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={colors.infoScale[400]} />
            <ThemedText style={styles.infoText}>
              • Ensure the document is clear and readable{'\n'}
              • All corners should be visible{'\n'}
              • No glare or shadows{'\n'}
              • File size should be less than 5MB
            </ThemedText>
          </View>

          {/* Front Image Upload */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Front Side</ThemedText>
            <Pressable
              style={styles.uploadCard}
              onPress={() => pickImage('front')}
            >
              {frontImage ? (
                <CachedImage source={frontImage} style={styles.uploadedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload" size={48} color={colors.brand.purpleLight} />
                  <ThemedText style={styles.uploadText}>Tap to upload front side</ThemedText>
                </View>
              )}
            </Pressable>
          </View>

          {/* Back Image Upload (if required) */}
          {selectedDoc.requiresBack && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Back Side</ThemedText>
              <Pressable
                style={styles.uploadCard}
                onPress={() => pickImage('back')}
              >
                {backImage ? (
                  <CachedImage source={backImage} style={styles.uploadedImage} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="cloud-upload" size={48} color={colors.brand.purpleLight} />
                    <ThemedText style={styles.uploadText}>Tap to upload back side</ThemedText>
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* Upload Button */}
          <Pressable
            style={[
              styles.uploadButton,
              (!frontImage || (selectedDoc.requiresBack && !backImage) || isUploading) && styles.uploadButtonDisabled,
            ]}
            onPress={handleUpload}
            disabled={!frontImage || (selectedDoc.requiresBack && !backImage) || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <ThemedText style={styles.uploadButtonText}>Submit Documents</ThemedText>
              </>
            )}
          </Pressable>
        </ScrollView>

        <View style={styles.securityInfo}>
          <Ionicons name="lock-closed" size={16} color={colors.neutral[500]} />
          <ThemedText style={styles.securityText}>
            Your documents are encrypted and stored securely
          </ThemedText>
        </View>
      </View>
    </Modal>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 12,
  },
  documentTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentTypeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral[200],
  },
  documentTypeCardSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.purpleLight,
  },
  documentTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
  },
  documentTypeLabelSelected: {
    color: colors.brand.purpleLight,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.tint.blue,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[800],
    marginLeft: 12,
    lineHeight: 20,
  },
  uploadCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  uploadText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 12,
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  securityText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginLeft: 8,
  },
});

export default React.memo(KYCUploadModal);
