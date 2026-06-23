import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Report Fraud Page
// Report fraudulent activity

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { getImagePicker } from '@/utils/lazyImports';
import { ThemedText } from '@/components/ThemedText';
import supportService from '@/services/supportApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography, Gradients } from '@/constants/DesignSystem';
import { CLOUDINARY_CONFIG, getCloudinaryUploadUrl } from '@/config/cloudinary.config';
import { useIsMounted } from '@/hooks/useIsMounted';

const FRAUD_TYPES = [
  { id: 'fake_offer', label: 'Fake Offer/Discount', icon: 'pricetag-outline' },
  { id: 'unauthorized_transaction', label: 'Unauthorized Transaction', icon: 'card-outline' },
  { id: 'phishing', label: 'Phishing Attempt', icon: 'fish-outline' },
  { id: 'fake_store', label: 'Fake Store/Merchant', icon: 'storefront-outline' },
  { id: 'account_compromise', label: 'Account Compromised', icon: 'shield-outline' },
  { id: 'other', label: 'Other Fraud', icon: 'alert-circle-outline' },
];

function ReportFraudPage() {
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState('');

  const handlePickImage = async () => {
    const ImagePicker = await getImagePicker();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(a => a.uri);
      if (!isMounted()) return;
      setEvidence(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const handleRemoveImage = (index: number) => {
    setEvidence(prev => prev.filter((_, i) => i !== index));
  };

  const [uploadingImages, setUploadingImages] = useState(false);
  const isMounted = useIsMounted();

  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  });

  const uploadImageToCloudinary = async (uri: string): Promise<string> => {
    const uploadUrl = getCloudinaryUploadUrl('image');
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, `fraud_evidence_${Date.now()}.jpg`);
    } else {
      const filename = uri.split('/').pop() || `fraud_evidence_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri, name: filename, type } as any);
    }

    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPresets.images);
    formData.append('folder', 'images/support');

    const res = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Failed to upload image');
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!selectedType || !description) return;

    setLoading(true);
    try {
      // Upload evidence images to Cloudinary first
      let attachmentUrls: string[] = [];
      if (evidence.length > 0) {
        setUploadingImages(true);
        try {
          attachmentUrls = await Promise.all(
            evidence.map(uri => uploadImageToCloudinary(uri))
          );
        } catch (uploadError) {
          platformAlertSimple('Upload Error', 'Failed to upload evidence images. Submitting report without images.');
        } finally {
          if (!isMounted()) return;
          setUploadingImages(false);
        }
      }

      const fraudLabel = FRAUD_TYPES.find(t => t.id === selectedType)?.label || selectedType;
      const response = await supportService.createTicket({
        subject: `Fraud Report: ${fraudLabel}`,
        category: 'other',
        priority: 'high',
        message: `[Fraud Type: ${fraudLabel}]${transactionId ? `\n[Transaction/Order ID: ${transactionId}]` : ''}\n${contactEmail ? `[Contact: ${contactEmail}]` : ''}\n\n${description}`,
        idempotencyKey,
        tags: ['fraud', selectedType],
        attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      });

      if (response.success && response.data?.ticket) {
        if (!isMounted()) return;
        setReportId(response.data.ticket.ticketNumber);
        if (!isMounted()) return;
        setSubmitted(true);
      } else {
        platformAlertSimple('Error', 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" translucent />
        <LinearGradient
          colors={Gradients.nileBlue}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.white} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Report Fraud</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="shield-checkmark" size={80} color={Colors.success} />
          </View>
          <ThemedText style={styles.successTitle}>Report Submitted</ThemedText>
          <ThemedText style={styles.successText}>
            Thank you for reporting this incident.{'\n'}
            Our fraud team will investigate and take appropriate action.
          </ThemedText>
          <View style={styles.reportIdCard}>
            <ThemedText style={styles.reportIdLabel}>Report ID</ThemedText>
            <ThemedText style={styles.reportIdValue}>{reportId}</ThemedText>
            <ThemedText style={styles.reportIdNote}>
              Save this for future reference
            </ThemedText>
          </View>
          <View style={styles.nextSteps}>
            <ThemedText style={styles.nextStepsTitle}>What happens next?</ThemedText>
            <View style={styles.nextStep}>
              <View style={styles.stepNumber}><ThemedText style={styles.stepNumberText}>1</ThemedText></View>
              <ThemedText style={styles.stepText}>Our team reviews your report within 24 hours</ThemedText>
            </View>
            <View style={styles.nextStep}>
              <View style={styles.stepNumber}><ThemedText style={styles.stepNumberText}>2</ThemedText></View>
              <ThemedText style={styles.stepText}>We may contact you for additional information</ThemedText>
            </View>
            <View style={styles.nextStep}>
              <View style={styles.stepNumber}><ThemedText style={styles.stepNumberText}>3</ThemedText></View>
              <ThemedText style={styles.stepText}>You'll receive an email with the investigation outcome</ThemedText>
            </View>
          </View>
          <Pressable style={styles.doneButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <ThemedText style={styles.doneButtonText}>Done</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent />

      {/* Header */}
      <LinearGradient
        colors={Gradients.nileBlue}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.white} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Report Fraud</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="shield-outline" size={24} color={Colors.warning} />
          <ThemedText style={styles.warningText}>
            If you suspect your account is compromised, change your password immediately.
          </ThemedText>
        </View>

        {/* Fraud Type */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Type of Incident *</ThemedText>
          <View style={styles.typesGrid}>
            {FRAUD_TYPES.map(type => (
              <Pressable
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardSelected,
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={selectedType === type.id ? Colors.error : Colors.text.tertiary}
                />
                <ThemedText style={[
                  styles.typeLabel,
                  selectedType === type.id && styles.typeLabelSelected,
                ]}>
                  {type.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Transaction Reference */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Transaction/Order ID (if applicable)</ThemedText>
          <TextInput
            style={styles.textInput}
            value={transactionId}
            onChangeText={setTransactionId}
            placeholder="e.g., ORD-2024-001234"
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Describe what happened *</ThemedText>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Please provide details about the fraudulent activity..."
            placeholderTextColor={Colors.text.tertiary}
            multiline
            maxLength={1000}
          />
          <ThemedText style={styles.charCount}>{description.length}/1000</ThemedText>
        </View>

        {/* Evidence Upload */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Upload Evidence (Optional)</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Screenshots, messages, or any relevant images
          </ThemedText>
          <View style={styles.evidenceContainer}>
            {evidence.map((uri, index) => (
              <View key={index} style={styles.evidenceItem}>
                <CachedImage source={{ uri }} style={styles.evidenceImage} />
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </Pressable>
              </View>
            ))}
            {evidence.length < 5 && (
              <Pressable style={styles.addButton} onPress={handlePickImage}>
                <Ionicons name="add" size={32} color={Colors.text.tertiary} />
                <ThemedText style={styles.addButtonText}>Add</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Contact Email */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Contact Email *</ThemedText>
          <TextInput
            style={styles.textInput}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="your@email.com"
            placeholderTextColor={Colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            (!selectedType || !description || !contactEmail) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedType || !description || !contactEmail || loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color={Colors.text.white} />
              {uploadingImages && (
                <ThemedText style={styles.submitButtonText}>Uploading evidence...</ThemedText>
              )}
            </>
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color={Colors.text.white} />
              <ThemedText style={styles.submitButtonText}>Submit Report</ThemedText>
            </>
          )}
        </Pressable>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <ThemedText style={styles.disclaimerText}>
            By submitting this report, you confirm that the information provided is true
            and accurate to the best of your knowledge. False reports may result in account suspension.
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: Colors.text.white,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  warningText: {
    ...Typography.body,
    color: Colors.warning,
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeCard: {
    width: '48%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.subtle,
  },
  typeCardSelected: {
    borderColor: Colors.error,
    backgroundColor: Colors.error + '10',
  },
  typeLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: Colors.error,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    ...Shadows.subtle,
  },
  textArea: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
    ...Shadows.subtle,
  },
  charCount: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  evidenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  evidenceItem: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
  },
  addButton: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray[300],
  },
  addButtonText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  submitButtonText: {
    ...Typography.button,
    color: Colors.text.white,
  },
  disclaimer: {
    padding: Spacing.md,
  },
  disclaimerText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  successText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  reportIdCard: {
    width: '100%',
    backgroundColor: Colors.success + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  reportIdLabel: {
    ...Typography.caption,
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  reportIdValue: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  reportIdNote: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  nextSteps: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  nextStepsTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...Typography.labelSmall,
    color: Colors.primary[600],
  },
  stepText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    flex: 1,
  },
  doneButton: {
    width: '100%',
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  doneButtonText: {
    ...Typography.button,
    color: Colors.text.white,
  },
});

export default withErrorBoundary(ReportFraudPage, 'SupportReportFraud');
