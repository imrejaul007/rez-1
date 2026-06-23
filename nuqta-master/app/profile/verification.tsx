import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Verification Page
 * Handles verification for different exclusive zones
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform, StatusBar, KeyboardAvoidingView, Modal } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { getImagePicker } from '@/utils/lazyImports';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/DesignSystem';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import verificationService, { VerificationStatus } from '@/services/verificationApi';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { FormPageSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Cross-platform alert that works on web
const showAlert = (title: string, message: string, onOk?: () => void) => {
  platformAlertSimple(title, message);
  onOk?.();
};

// Zone configurations
const ZONE_CONFIGS: Record<string, {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  methods: { id: string; label: string; type: 'email' | 'document' | 'auto' }[];
  description: string;
  additionalFields?: string[];
}> = {
  student: {
    title: 'Student Verification',
    icon: 'school',
    color: colors.infoScale[400],
    methods: [
      { id: 'edu_email', label: 'College Email (.edu/.ac.in)', type: 'email' },
      { id: 'student_id', label: 'Student ID Card', type: 'document' },
      { id: 'enrollment_letter', label: 'Enrollment Letter', type: 'document' },
    ],
    description: 'Verify your student status to unlock exclusive campus deals',
  },
  corporate: {
    title: 'Corporate Verification',
    icon: 'briefcase',
    color: colors.brand.purpleLight,
    methods: [
      { id: 'corporate_email', label: 'Work Email', type: 'email' },
    ],
    description: 'Use your corporate email to access employee benefits',
  },
  defence: {
    title: 'Defence Personnel',
    icon: 'shield',
    color: colors.successScale[700],
    methods: [
      { id: 'military_id', label: 'Military ID', type: 'document' },
      { id: 'service_card', label: 'Service Card', type: 'document' },
      { id: 'canteen_card', label: 'Canteen Card', type: 'document' },
      { id: 'ex_servicemen_card', label: 'Ex-Servicemen Card', type: 'document' },
    ],
    description: 'Verify your defence service to access special discounts',
    additionalFields: ['serviceType'],
  },
  healthcare: {
    title: 'Healthcare Heroes',
    icon: 'medkit',
    color: colors.success,
    methods: [
      { id: 'hospital_id', label: 'Hospital ID', type: 'document' },
      { id: 'medical_council', label: 'Medical Council Certificate', type: 'document' },
      { id: 'nursing_license', label: 'Nursing License', type: 'document' },
    ],
    description: 'Healthcare professionals get exclusive deals',
    additionalFields: ['profession'],
  },
  senior: {
    title: 'Senior Citizen',
    icon: 'person',
    color: colors.warningScale[400],
    methods: [
      { id: 'age_verification', label: 'Age Verification (60+)', type: 'auto' },
    ],
    description: 'Senior citizens (60+) get automatic verification from profile DOB',
  },
  teacher: {
    title: 'Teacher Verification',
    icon: 'book',
    color: colors.successScale[400],
    methods: [
      { id: 'school_id', label: 'School ID', type: 'document' },
      { id: 'college_id', label: 'College ID', type: 'document' },
      { id: 'ugc_id', label: 'UGC ID Card', type: 'document' },
    ],
    description: 'Educators get special discounts and offers',
    additionalFields: ['instituteName'],
  },
  government: {
    title: 'Government Employee',
    icon: 'business',
    color: colors.brand.indigo,
    methods: [
      { id: 'govt_id', label: 'Government ID', type: 'document' },
      { id: 'pay_slip', label: 'Pay Slip', type: 'document' },
    ],
    description: 'Government employees get exclusive benefits',
    additionalFields: ['department'],
  },
  differentlyAbled: {
    title: 'Differently Abled',
    icon: 'heart',
    color: colors.brand.pink,
    methods: [
      { id: 'disability_certificate', label: 'Disability Certificate', type: 'document' },
      { id: 'udid_card', label: 'UDID Card', type: 'document' },
    ],
    description: 'Special offers for differently abled individuals',
  },
};

// Service type options for defence
const SERVICE_TYPE_OPTIONS = [
  { label: 'Army', value: 'army' },
  { label: 'Navy', value: 'navy' },
  { label: 'Air Force', value: 'airforce' },
  { label: 'Paramilitary', value: 'paramilitary' },
];

// Profession options for healthcare
const PROFESSION_OPTIONS = [
  { label: 'Doctor', value: 'doctor' },
  { label: 'Nurse', value: 'nurse' },
  { label: 'Paramedic', value: 'paramedic' },
  { label: 'Pharmacist', value: 'pharmacist' },
];

function VerificationPage() {
  const router = useRouter();
  const { zone = 'student' } = useLocalSearchParams<{ zone: string }>();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [instituteName, setInstituteName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [profession, setProfession] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const isMounted = useIsMounted();

  const config = ZONE_CONFIGS[zone] || ZONE_CONFIGS.student;

  useEffect(() => {
    checkExistingStatus();
  }, [zone]);

  const checkExistingStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await verificationService.getZoneStatus(zone);
      if (response.success && response.data) {
        setVerificationStatus(response.data);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setCheckingStatus(false);
    }
  };

  const pickImage = async () => {
    const ImagePicker = await getImagePicker();
    // Request permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert('Permission Required', 'Please allow access to your photo library to upload documents.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      if (!isMounted()) return;
      setDocumentImage(result.assets[0].uri);
      showAlert('Document Selected', 'Your document has been selected successfully. You can now submit your verification.');
    }
  };

  const takePhoto = async () => {
    const ImagePicker = await getImagePicker();
    // Request permissions
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert('Permission Required', 'Please allow access to your camera to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      if (!isMounted()) return;
      setDocumentImage(result.assets[0].uri);
      showAlert('Photo Captured', 'Your document photo has been captured successfully. You can now submit your verification.');
    }
  };

  const [showImageModal, setShowImageModal] = useState(false);

  const showImageOptions = () => {
    if (Platform.OS === 'web') {
      // On web, directly open file picker
      pickImage();
    } else {
      setShowImageModal(true);
    }
  };

  const buildAdditionalInfo = () => {
    const info: Record<string, string> = {};
    if (instituteName) info.instituteName = instituteName;
    if (serviceType) info.serviceType = serviceType;
    if (profession) info.profession = profession;
    if (department) info.department = department;
    return Object.keys(info).length > 0 ? info : undefined;
  };

  const handleSubmit = async () => {
    if (!selectedMethod) {
      showAlert('Error', 'Please select a verification method');
      return;
    }

    const methodConfig = config.methods.find(m => m.id === selectedMethod);

    // Validate based on method type
    if (methodConfig?.type === 'email') {
      if (!email) {
        showAlert('Error', 'Please enter your email address');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAlert('Error', 'Please enter a valid email address');
        return;
      }

      // Validate domain for student/corporate
      if (zone === 'student') {
        const validDomains = ['.edu', '.ac.in', '.edu.in', '.ac.uk', '.edu.au'];
        const hasValidDomain = validDomains.some(domain => email.toLowerCase().endsWith(domain));
        if (!hasValidDomain) {
          showAlert(
            'Invalid Email Domain',
            'Please use your college/university email ending with .edu, .ac.in, or similar academic domain.'
          );
          return;
        }
      }

      if (zone === 'corporate') {
        const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'];
        const domain = email.split('@')[1]?.toLowerCase();
        if (personalDomains.includes(domain)) {
          showAlert(
            'Invalid Email Domain',
            'Please use your corporate work email, not a personal email address.'
          );
          return;
        }
      }
    }

    if (methodConfig?.type === 'document' && !documentImage) {
      showAlert('Error', 'Please upload your document');
      return;
    }

    setLoading(true);
    try {
      const response = await verificationService.submitVerification(zone, {
        method: selectedMethod,
        email: email || undefined,
        documentNumber: documentNumber || undefined,
        documentImage: documentImage || undefined,
        additionalInfo: buildAdditionalInfo(),
      });

      if (response.success && response.data) {
        const title = response.data.verified ? 'Verified!' : 'Submitted Successfully!';
        const message = response.data.verified
          ? 'Your verification is complete. You now have access to exclusive deals!'
          : 'Your verification has been submitted and is under review. We\'ll notify you within 24-48 hours once it\'s approved.';
        showAlert(title, message, () => router.canGoBack() ? router.back() : router.replace('/(tabs)'));
      } else {
        showAlert('Error', response.error || 'Failed to submit verification');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  // Loading state
  if (checkingStatus) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FormPageSkeleton />
      </>
    );
  }

  // Already verified
  if (verificationStatus?.verified) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" />
        <LinearGradient colors={[config.color, config.color + 'CC']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.verifiedContainer}>
          <View style={[styles.verifiedIconContainer, { backgroundColor: config.color + '20' }]}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
          </View>
          <ThemedText style={styles.verifiedTitle}>Already Verified!</ThemedText>
          <ThemedText style={styles.verifiedSubtitle}>
            Your {config.title.toLowerCase().replace(' verification', '')} status is verified.
            You have access to all exclusive deals.
          </ThemedText>
          {verificationStatus.verifiedAt && (
            <ThemedText style={styles.verifiedDate}>
              Verified on {new Date(verificationStatus.verifiedAt).toLocaleDateString()}
            </ThemedText>
          )}
          <Pressable
            style={[styles.primaryButton, { backgroundColor: config.color }]}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <ThemedText style={styles.primaryButtonText}>Go Back to Offers</ThemedText>
          </Pressable>
        </View>
      </View>
      </>
    );
  }

  // Verification pending review
  if (verificationStatus?.status === 'pending') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" />
        <LinearGradient colors={[config.color, config.color + 'CC']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.verifiedContainer}>
          <View style={[styles.verifiedIconContainer, { backgroundColor: '#F59E0B20' }]}>
            <Ionicons name="time" size={80} color={colors.warningScale[400]} />
          </View>
          <ThemedText style={styles.verifiedTitle}>Verification Pending</ThemedText>
          <ThemedText style={styles.verifiedSubtitle}>
            Your {config.title.toLowerCase().replace(' verification', '')} verification is under review.
            We'll notify you once it's approved. This usually takes 24-48 hours.
          </ThemedText>
          {verificationStatus.submittedAt && (
            <ThemedText style={styles.verifiedDate}>
              Submitted on {new Date(verificationStatus.submittedAt).toLocaleDateString()}
            </ThemedText>
          )}
          <Pressable
            style={[styles.primaryButton, { backgroundColor: config.color }]}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <ThemedText style={styles.primaryButtonText}>Go Back to Offers</ThemedText>
          </Pressable>
        </View>
      </View>
      </>
    );
  }

  // Verification rejected - allow retry
  if (verificationStatus?.status === 'rejected') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" />
        <LinearGradient colors={[config.color, config.color + 'CC']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.verifiedContainer}>
          <View style={[styles.verifiedIconContainer, { backgroundColor: Colors.error + '20' }]}>
            <Ionicons name="close-circle" size={80} color={Colors.error} />
          </View>
          <ThemedText style={styles.verifiedTitle}>Verification Rejected</ThemedText>
          <ThemedText style={styles.verifiedSubtitle}>
            {verificationStatus.rejectionReason || 'Your verification could not be approved. Please try again with valid documents.'}
          </ThemedText>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: config.color }]}
            onPress={() => {
              setVerificationStatus(null);
              setSelectedMethod(null);
              setDocumentImage(null);
              setEmail('');
            }}
          >
            <ThemedText style={styles.primaryButtonText}>Try Again</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton]}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <ThemedText style={styles.secondaryButtonText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={[config.color, config.color + 'CC']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.headerIconContainer}>
                <Ionicons name={config.icon} size={32} color={colors.background.primary} />
              </View>
              <ThemedText style={styles.headerTitle}>{config.title}</ThemedText>
              <ThemedText style={styles.headerSubtitle}>{config.description}</ThemedText>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Method Selection */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Select Verification Method</ThemedText>
          {config.methods.map((method) => (
            <Pressable
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardActive,
                selectedMethod === method.id && { borderColor: config.color },
              ]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <View style={[
                styles.methodRadio,
                selectedMethod === method.id && { borderColor: config.color },
              ]}>
                {selectedMethod === method.id && (
                  <View style={[styles.methodRadioInner, { backgroundColor: config.color }]} />
                )}
              </View>
              <View style={styles.methodInfo}>
                <ThemedText style={styles.methodLabel}>{method.label}</ThemedText>
                <ThemedText style={styles.methodType}>
                  {method.type === 'email' ? 'Email Verification' :
                   method.type === 'auto' ? 'Automatic (from profile)' : 'Document Upload'}
                </ThemedText>
              </View>
              {method.type === 'email' && (
                <Ionicons name="mail-outline" size={20} color={Colors.text.tertiary} />
              )}
              {method.type === 'document' && (
                <Ionicons name="document-outline" size={20} color={Colors.text.tertiary} />
              )}
              {method.type === 'auto' && (
                <Ionicons name="flash-outline" size={20} color={config.color} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Email Input (for email verification) */}
        {selectedMethod && config.methods.find(m => m.id === selectedMethod)?.type === 'email' && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Email Address</ThemedText>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={zone === 'corporate' ? 'your.name@company.com' : 'your.email@college.edu'}
                placeholderTextColor={Colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <ThemedText style={styles.helperText}>
              {zone === 'student'
                ? 'Enter your .edu or .ac.in email for instant verification'
                : 'Use your work email (not gmail, yahoo, etc.)'}
            </ThemedText>
          </View>
        )}

        {/* Document Upload (for document verification) */}
        {selectedMethod && config.methods.find(m => m.id === selectedMethod)?.type === 'document' && (
          <>
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Document Number (Optional)</ThemedText>
              <View style={styles.inputContainer}>
                <Ionicons name="card-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={documentNumber}
                  onChangeText={setDocumentNumber}
                  placeholder="Enter document/ID number"
                  placeholderTextColor={Colors.text.tertiary}
                />
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Upload Document</ThemedText>
              <Pressable style={styles.uploadBox} onPress={showImageOptions}>
                {documentImage ? (
                  <View style={styles.uploadedImageContainer}>
                    <CachedImage source={{ uri: documentImage }} style={styles.uploadedImage} contentFit="contain" cachePolicy="memory-disk" />
                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() => setDocumentImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color={Colors.error} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={40} color={config.color} />
                    <ThemedText style={styles.uploadText}>Tap to upload document</ThemedText>
                    <ThemedText style={styles.uploadSubtext}>Take photo or choose from gallery</ThemedText>
                  </View>
                )}
              </Pressable>
            </View>
          </>
        )}

        {/* Auto verification info */}
        {selectedMethod && config.methods.find(m => m.id === selectedMethod)?.type === 'auto' && (
          <View style={styles.section}>
            <View style={styles.autoVerifyCard}>
              <Ionicons name="flash" size={32} color={config.color} />
              <ThemedText style={styles.autoVerifyTitle}>Automatic Verification</ThemedText>
              <ThemedText style={styles.autoVerifyText}>
                We'll verify your eligibility based on your profile information.
                {zone === 'senior' && ' Your date of birth must show you are 60 years or older.'}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Additional Fields */}
        {zone === 'defence' && selectedMethod && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Service Type</ThemedText>
            <View style={styles.optionsRow}>
              {SERVICE_TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionChip,
                    serviceType === option.value && styles.optionChipActive,
                    serviceType === option.value && { backgroundColor: config.color },
                  ]}
                  onPress={() => setServiceType(option.value)}
                >
                  <ThemedText style={[
                    styles.optionChipText,
                    serviceType === option.value && styles.optionChipTextActive,
                  ]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {zone === 'healthcare' && selectedMethod && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Profession</ThemedText>
            <View style={styles.optionsRow}>
              {PROFESSION_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionChip,
                    profession === option.value && styles.optionChipActive,
                    profession === option.value && { backgroundColor: config.color },
                  ]}
                  onPress={() => setProfession(option.value)}
                >
                  <ThemedText style={[
                    styles.optionChipText,
                    profession === option.value && styles.optionChipTextActive,
                  ]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {(zone === 'teacher' || zone === 'student') && selectedMethod && config.methods.find(m => m.id === selectedMethod)?.type === 'document' && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Institution Name</ThemedText>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={instituteName}
                onChangeText={setInstituteName}
                placeholder="Enter your school/college name"
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>
          </View>
        )}

        {zone === 'government' && selectedMethod && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Department</ThemedText>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={department}
                onChangeText={setDepartment}
                placeholder="Enter your department"
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>
          </View>
        )}

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: config.color },
              (!selectedMethod || loading) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedMethod || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.background.primary} />
                <ThemedText style={styles.submitButtonText}>Submit Verification</ThemedText>
              </>
            )}
          </Pressable>

          <ThemedText style={styles.disclaimerText}>
            By submitting, you confirm that all information provided is accurate.
            Document verification typically takes 24-48 hours.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Image Picker Modal for Mobile */}
      <Modal
        visible={showImageModal}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setShowImageModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
         
          onPress={() => setShowImageModal(false)}
        >
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Upload Document</ThemedText>
            <ThemedText style={styles.modalSubtitle}>Choose how to upload your document</ThemedText>

            <Pressable
              style={styles.modalOption}
              onPress={() => {
                setShowImageModal(false);
                takePhoto();
              }}
            >
              <Ionicons name="camera-outline" size={24} color={config.color} />
              <ThemedText style={styles.modalOptionText}>Take Photo</ThemedText>
            </Pressable>

            <Pressable
              style={styles.modalOption}
              onPress={() => {
                setShowImageModal(false);
                pickImage();
              }}
            >
              <Ionicons name="images-outline" size={24} color={config.color} />
              <ThemedText style={styles.modalOptionText}>Choose from Library</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.modalOption, styles.modalCancelOption]}
              onPress={() => setShowImageModal(false)}
            >
              <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  header: {
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: colors.background.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 100,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.subtle,
  },
  methodCardActive: {
    backgroundColor: Colors.background.primary,
  },
  methodRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  methodRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  methodType: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    paddingVertical: Spacing.md,
  },
  helperText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  uploadBox: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderStyle: 'dashed',
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  uploadText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  uploadSubtext: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  uploadedImageContainer: {
    width: '100%',
    height: 200,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
  },
  autoVerifyCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  autoVerifyTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  autoVerifyText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  optionChipActive: {
    borderColor: 'transparent',
  },
  optionChipText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },
  optionChipTextActive: {
    color: colors.background.primary,
  },
  submitSection: {
    marginTop: Spacing.xl,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...Typography.button,
    color: colors.background.primary,
    fontWeight: '600',
  },
  disclaimerText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  verifiedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  verifiedIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  verifiedTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  verifiedSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  verifiedDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  primaryButtonText: {
    ...Typography.button,
    color: colors.background.primary,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 20,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  modalOptionText: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  modalCancelOption: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  modalCancelText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(VerificationPage, 'ProfileVerification');
