/**
 * Bill Upload Page - Production Ready
 *
 * A comprehensive bill upload page with:
 * - Image capture/selection with quality validation
 * - Real-time form validation with field-level feedback
 * - Merchant search and selection
 * - Dynamic cashback preview
 * - Progress tracking during upload
 * - Error handling with recovery options
 * - Form state persistence
 * - Accessibility support
 * - Mobile-optimized keyboard handling
 *
 * @version 2.0.0
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Keyboard} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import * as ExpoCamera from 'expo-camera';
// Deferred: ImagePicker only needed when user taps "Choose from Library"
const getImagePicker = async () => await import('expo-image-picker');
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeBack } from '@/hooks/useSafeBack';

// Services & Hooks
import { billUploadService } from '@/services/billUploadService';
import apiClient from '@/services/apiClient';
import storesApi from '@/services/storesApi';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useBillUpload } from '@/hooks/useBillUpload';
import { useImageQuality } from '@/hooks/useImageQuality';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useDebounce } from '@/hooks/useDebounce';
import { compressImageIfNeeded } from '@/utils/imageCompression';

// Components
import { HeaderBackButton } from '@/components/navigation/SafeBackButton';
import Toast from '@/components/common/Toast';
import CashbackCalculator from '@/components/bills/CashbackCalculator';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import BonusCampaignBanner from '@/components/earn/BonusCampaignBanner';

// Utilities & Types
import {
  validateAmount,
  validateBillDate,
  validateBillNumber,
  validateNotes,
  formatCurrency,
  VALIDATION_CONFIG,
  type ValidationResult,
} from '@/utils/billValidation';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { sanitizeInput, sanitizeNumber, sanitizeBillNumber } from '@/utils/inputSanitization';
import {
  BillUploadErrorType,
  createBillUploadError,
  getUserErrorMessage,
  getRecoverySuggestions,
} from '@/utils/billUploadErrors';
import { errorReporter } from '@/utils/errorReporter';
import { billUploadAnalytics } from '@/services/billUploadAnalytics';
import type { CashbackCalculation } from '@/types/billVerification.types';
import { FILE_SIZE_LIMITS, ALLOWED_FILE_FORMATS } from '@/utils/fileUploadConstants';
import logger from '@/utils/logger';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useIsMounted } from '@/hooks/useIsMounted';

// Constants
const FORM_STORAGE_KEY = '@bill_upload_draft';
const CAMERA_TYPE = {
  back: 'back' as const,
  front: 'front' as const,
};

// Interfaces
interface Store {
  _id: string;
  name: string;
  logo?: string;
  cashbackPercentage?: number;
  category?: string;
}

interface FormData {
  billImage: string | null;
  merchantId: string;
  merchantName: string;
  amount: string;
  billDate: Date;
  billNumber: string;
  notes: string;
}

interface FormErrors {
  billImage?: string;
  merchantId?: string;
  amount?: string;
  billDate?: string;
  billNumber?: string;
  notes?: string;
}

interface ToastConfig {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  actions?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel';
  }>;
}

/**
 * Main Bill Upload Component
 */
function BillUploadPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const handleBack = useSafeBack();
  const navigation = useNavigation();
  const { bonusCampaignSlug } = useLocalSearchParams<{ bonusCampaignSlug?: string }>();
  const { goBack } = useSafeNavigation();
  const billUploadHook = useBillUpload();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Image quality validation hook
  const { checkQuality, isChecking: isCheckingQuality, result: qualityResult } = useImageQuality({
    minWidth: 800,
    minHeight: 600,
    maxFileSize: FILE_SIZE_LIMITS.MAX_IMAGE_SIZE,
    checkBlur: true,
    checkAspectRatio: true,
  });

  // Offline queue hook (PRIMARY upload method)
  const {
    addToQueue,
    syncQueue,
    isOnline,
    hasPendingUploads,
    pendingCount,
    canSync,
    getEstimatedSyncTime,
  } = useOfflineQueue();

  // Refs
  const cameraRef = useRef<ExpoCamera.CameraView>(null);
  const amountInputRef = useRef<TextInput>(null);
  const billNumberInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastSyncTimeRef = useRef<number>(Date.now());

  // Hide default header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Camera states
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<typeof CAMERA_TYPE[keyof typeof CAMERA_TYPE]>(
    CAMERA_TYPE.back
  );

  // Form state
  const [formData, setFormData] = useState<FormData>({
    billImage: null,
    merchantId: '',
    merchantName: '',
    amount: '',
    billDate: new Date(),
    billNumber: '',
    notes: '',
  });

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [, setIsValidating] = useState(false);

  // Bill AI auto-detect (F-01)
  const [isAnalyzingBill, setIsAnalyzingBill] = useState(false);
  const [autoDetectedAmount, setAutoDetectedAmount] = useState(false);

  // Merchant selection
  const [merchants, setMerchants] = useState<Store[]>([]);
  const [showMerchantSelector, setShowMerchantSelector] = useState(false);
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);

  // Cashback preview
  const [cashbackCalculation, setCashbackCalculation] = useState<CashbackCalculation | null>(null);
  const [showCashbackPreview, setShowCashbackPreview] = useState(false);

  // Debounced values for cashback preview
  const debouncedAmount = useDebounce(formData.amount, 500);
  const debouncedMerchantId = useDebounce(formData.merchantId, 500);

  // UI state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [toast, setToast] = useState<ToastConfig>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Animation values
  const fadeAnim = useSharedValue(0);

  /**
   * Initialize - Request permissions and load saved data
   */
  useEffect(() => {
    initializePage();

    // Fade in animation with cleanup
    const anim = withTiming(1, { duration: 300 });
    // reanimated auto-cleans up
  }, []);

  const initializePage = async () => {
    try {
      // Request camera permissions
      const { status } = await ExpoCamera.Camera.requestCameraPermissionsAsync();
      if (!isMounted()) return;
      setHasPermission(status === 'granted');
    } catch (e) {
      if (!isMounted()) return;
      setHasPermission(false);
    }

    // Load saved form data
    await loadSavedFormData();
  };

  /**
   * Load saved form data from AsyncStorage
   */
  const loadSavedFormData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(FORM_STORAGE_KEY);
      if (savedData) {
        let parsed;
        try { parsed = JSON.parse(savedData); } catch { parsed = null; }
        if (parsed) {
          setFormData({
            ...parsed,
            billDate: parsed.billDate ? new Date(parsed.billDate) : new Date(),
          });
          showToast('Draft restored', 'info');
        }
      }
    } catch (error) {
      logger.error('Failed to load saved form data:', error as Error | undefined);
    }
  };

  /**
   * Save form data to AsyncStorage
   */
  const saveFormData = useCallback(async () => {
    try {
      const dataToSave = {
        ...formData,
        billDate: formData.billDate.toISOString(),
      };
      await AsyncStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      logger.error('Failed to save form data:', error as Error | undefined);
    }
  }, [formData]);

  /**
   * Clear saved form data
   */
  const clearSavedFormData = async () => {
    try {
      await AsyncStorage.removeItem(FORM_STORAGE_KEY);
    } catch (error) {
      logger.error('Failed to clear saved form data:', error as Error | undefined);
    }
  };

  /**
   * Auto-save form data when it changes (debounced)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.billImage || formData.amount || formData.merchantId) {
        saveFormData();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, saveFormData]);

  /**
   * Load merchants for selection
   */
  const loadMerchants = async () => {
    if (merchants.length > 0) return; // Already loaded

    setIsLoadingMerchants(true);
    try {
      const response = await storesApi.getStores({ limit: 100 });
      if (response.success && response.data && response.data.stores) {
        const mappedStores = response.data.stores.map((store: any) => ({
          _id: store.id,
          name: store.name,
          logo: store.logo,
          cashbackPercentage: store.cashbackPercentage || 0,
          category: store.category,
        }));
        setMerchants(mappedStores);
      }
    } catch (error) {
      logger.error('Error loading merchants:', error as Error | undefined);
      showToast('Failed to load merchants', 'error');
    } finally {
      if (!isMounted()) return;
      setIsLoadingMerchants(false);
    }
  };

  /**
   * Handle field validation
   */
  const validateField = (fieldName: keyof FormData, value: any): string | undefined => {
    let result: ValidationResult;

    switch (fieldName) {
      case 'amount':
        result = validateAmount(value);
        break;
      case 'billDate':
        result = validateBillDate(value);
        break;
      case 'billNumber':
        result = validateBillNumber(value);
        break;
      case 'notes':
        result = validateNotes(value);
        break;
      case 'merchantId':
        result = {
          isValid: !!value,
          error: value ? undefined : 'Please select a merchant',
        };
        break;
      case 'billImage':
        result = {
          isValid: !!value,
          error: value ? undefined : 'Please upload a bill image',
        };
        break;
      default:
        return undefined;
    }

    return result.error;
  };

  /**
   * Handle field change with validation and sanitization
   */
  const handleFieldChange = (fieldName: keyof FormData, value: any) => {
    let sanitizedValue = value;

    // Sanitize based on field type
    if (typeof value === 'string') {
      switch (fieldName) {
        case 'amount':
          sanitizedValue = sanitizeNumber(value);
          break;
        case 'billNumber':
          sanitizedValue = sanitizeBillNumber(value);
          break;
        case 'notes':
        case 'merchantName':
          sanitizedValue = sanitizeInput(value);
          break;
        default:
          sanitizedValue = value;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [fieldName]: sanitizedValue,
    }));

    // Clear error when user starts typing
    if ((errors as Record<string, string | undefined>)[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: undefined,
      }));
    }
  };

  /**
   * Handle field blur - validate and save
   */
  const handleFieldBlur = (fieldName: keyof FormData) => {
    setTouched((prev) => ({
      ...prev,
      [fieldName]: true,
    }));

    const error = validateField(fieldName, formData[fieldName]);
    if (error) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: error,
      }));
    }

    // Update cashback preview
    updateCashbackPreview();
  };

  /**
   * Update cashback preview based on current form data
   */
  const updateCashbackPreview = async () => {
    if (!formData.merchantId || !formData.amount) {
      setCashbackCalculation(null);
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum < VALIDATION_CONFIG.amount.min) {
      return;
    }

    // Find selected merchant
    const merchant = merchants.find((m) => m._id === formData.merchantId);
    if (!merchant) return;

    // Calculate cashback (mock calculation - should be from API in production)
    const baseCashbackRate = merchant.cashbackPercentage || 2;
    const baseCashback = (amountNum * baseCashbackRate) / 100;

    const calculation: CashbackCalculation = {
      baseAmount: amountNum,
      baseCashbackRate,
      baseCashback,
      bonuses: [],
      totalBonus: 0,
      finalCashbackRate: baseCashbackRate,
      finalCashback: baseCashback,
      caps: {
        dailyLimit: 500,
        monthlyLimit: 5000,
      },
      breakdown: [
        {
          label: 'Bill Amount',
          amount: amountNum,
        },
        {
          label: 'Base Cashback',
          amount: baseCashback,
          percentage: baseCashbackRate,
        },
      ],
    };

    setCashbackCalculation(calculation);
  };

  /**
   * Watch for amount/merchant changes to update cashback (debounced)
   */
  useEffect(() => {
    updateCashbackPreview();
  }, [debouncedAmount, debouncedMerchantId]);

  /**
   * Open camera for bill capture
   */
  const openCamera = async () => {
    if (hasPermission === null) {
      const { status } = await ExpoCamera.Camera.requestCameraPermissionsAsync();
      if (!isMounted()) return;
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        showToast('Camera permission is required', 'error');
        return;
      }
    }

    if (hasPermission === false) {
      showToast('Camera permission denied. Please enable it in settings.', 'error');
      return;
    }

    if (!isMounted()) return;
    setShowCamera(true);
  };

  /**
   * Take picture with camera
   */
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });

        if (photo && photo.uri) {
          if (!isMounted()) return;
          setShowCamera(false);

          // Compress image before quality check
          showToast('Compressing image...', 'info');
          const compressedUri = await compressImageIfNeeded(photo.uri, {
            maxWidth: 1200,
            targetFileSize: 2 * 1024 * 1024, // 2MB
          });

          // Check image quality
          showToast('Checking image quality...', 'info');
          const quality = await checkQuality(compressedUri);

          if (!quality.isValid) {
            // Show quality errors
            const errorMsg = quality.errors.join('. ');
            showToast(errorMsg, 'error');

            // Show recommendations if available
            if (quality.recommendations.length > 0) {
              setTimeout(() => {
                showToast(quality.recommendations[0], 'warning');
              }, 3000);
            }
            return;
          }

          // Show quality warnings (if image is valid but not optimal)
          if (quality.warnings.length > 0) {
            showToast(quality.warnings[0], 'warning');
          }

          handleFieldChange('billImage', compressedUri);
          showToast(`Bill photo captured (Quality: ${quality.score}/100)`, 'success');
        }
      } catch (error) {
        logger.error('Error taking picture:', error as Error | undefined);
        showToast('Failed to take picture', 'error');
      }
    }
  };

  /**
   * Pick image from gallery
   */
  const pickImageFromGallery = async () => {
    try {
      const ImagePicker = await getImagePicker();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Compress image before quality check
        showToast('Compressing image...', 'info');
        const compressedUri = await compressImageIfNeeded(imageUri, {
          maxWidth: 1200,
          targetFileSize: 2 * 1024 * 1024, // 2MB
        });

        // Check image quality
        showToast('Checking image quality...', 'info');
        const quality = await checkQuality(compressedUri);

        if (!quality.isValid) {
          // Show quality errors
          const errorMsg = quality.errors.join('. ');
          showToast(errorMsg, 'error');

          // Show recommendations if available
          if (quality.recommendations.length > 0) {
            setTimeout(() => {
              showToast(quality.recommendations[0], 'warning');
            }, 3000);
          }
          return;
        }

        // Show quality warnings (if image is valid but not optimal)
        if (quality.warnings.length > 0) {
          showToast(quality.warnings[0], 'warning');
        }

        handleFieldChange('billImage', compressedUri);
        showToast(`Bill photo selected (Quality: ${quality.score}/100)`, 'success');

        // Auto-detect bill amount via OCR (F-01)
        try {
          setIsAnalyzingBill(true);
          showToast('Detecting bill amount...', 'info');
          const fd = new (globalThis as any).FormData();
          fd.append('billImage', { uri: compressedUri, type: 'image/jpeg', name: 'bill.jpg' } as any);
          const analyzed = await apiClient.post<{
            amount: number | null; merchantName: string | null;
            date: string | null; billNumber: string | null; confidence: number;
          }>('/bills/analyze-image', fd);
          if (analyzed.success && analyzed.data) {
            const d = analyzed.data;
            if (d.amount && d.amount > 0) {
              handleFieldChange('amount', String(d.amount));
              setAutoDetectedAmount(true);
            }
            if (d.billNumber) handleFieldChange('billNumber', d.billNumber);
            if (d.amount) showToast(`Detected: ${d.amount} — please verify`, 'success');
          }
        } catch {
          // Silent — user can still enter manually
        } finally {
          setIsAnalyzingBill(false);
        }
      }
    } catch (error) {
      logger.error('Error picking image:', error);
      showToast('Failed to pick image', 'error');
    }
  };

  /**
   * Select merchant
   */
  const selectMerchant = (merchant: Store) => {
    handleFieldChange('merchantId', merchant._id);
    handleFieldChange('merchantName', merchant.name);
    setShowMerchantSelector(false);
    setErrors((prev) => ({
      ...prev,
      merchantId: undefined,
    }));
    updateCashbackPreview();
  };

  /**
   * Validate entire form
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate bill image
    if (!formData.billImage) {
      newErrors.billImage = 'Please upload a bill image';
    }

    // Validate merchant
    if (!formData.merchantId) {
      newErrors.merchantId = 'Please select a merchant';
    }

    // Validate amount
    const amountError = validateField('amount', formData.amount);
    if (amountError) newErrors.amount = amountError;

    // Validate date
    const dateError = validateField('billDate', formData.billDate);
    if (dateError) newErrors.billDate = dateError;

    // Validate bill number (optional)
    const billNumberError = validateField('billNumber', formData.billNumber);
    if (billNumberError) newErrors.billNumber = billNumberError;

    // Validate notes (optional)
    const notesError = validateField('notes', formData.notes);
    if (notesError) newErrors.notes = notesError;

    setErrors(newErrors);

    // Mark all fields as touched
    setTouched({
      billImage: true,
      merchantId: true,
      amount: true,
      billDate: true,
      billNumber: true,
      notes: true,
    });

    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      showToast('Please fix the errors in the form', 'error');
      return false;
    }

    return true;
  };

  /**
   * Submit bill upload
   */
  const handleSubmit = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsValidating(true);
    setShowProgressModal(true);

    try {
      // Prepare upload data
      const uploadData = {
        billImage: formData.billImage!,
        merchantId: formData.merchantId,
        amount: parseFloat(formData.amount),
        billDate: formData.billDate,
        billNumber: formData.billNumber || undefined,
        notes: formData.notes || undefined,
        cashbackCalculation: cashbackCalculation || undefined,
        storeId: formData.merchantId,
        date: formData.billDate,
      };

      // Check if online - use offline queue if offline
      if (!isOnline) {
        logger.debug('📴 [BILL UPLOAD] Device is offline, adding to queue');

        try {
          // Add to offline queue
          await addToQueue(uploadData, formData.billImage!);

          if (!isMounted()) return;
          setShowProgressModal(false);
          await clearSavedFormData();

          if (!isMounted()) return;
          setToast({
            visible: true,
            message: `Bill queued for upload when online. ${pendingCount + 1} bill(s) in queue.`,
            type: 'info',
            actions: [
              {
                text: 'View Queue',
                onPress: () => {
                  router.push('/bill-history');
                },
              },
              {
                text: 'Upload Another',
                onPress: resetForm,
              },
            ],
          });

          // Reset form
          resetForm();
          return;
        } catch (queueError) {
          logger.error('❌ [BILL UPLOAD] Failed to add to queue:', queueError as Error | undefined);
          if (!isMounted()) return;
          setShowProgressModal(false);
          showToast('Failed to queue bill for upload. Please try again.', 'error');
          setIsValidating(false);
          return;
        }
      }

      // Device is online - proceed with immediate upload
      const success = await billUploadHook.startUpload(uploadData);

      if (!isMounted()) return;
      setShowProgressModal(false);

      if (success) {
        // Clear form data
        await clearSavedFormData();

        // Show success toast with actions
        if (!isMounted()) return;
        setToast({
          visible: true,
          message: 'Bill uploaded successfully! Your cashback will be credited after verification.',
          type: 'success',
          actions: [
            {
              text: 'View History',
              onPress: () => {
                router.push('/bill-history');
              },
            },
            {
              text: 'Upload Another',
              onPress: resetForm,
            },
          ],
        });
      } else {
        // Upload failed - offer to add to queue or retry
        const errorMessage = billUploadHook.error
          ? getUserErrorMessage(billUploadHook.error.code as BillUploadErrorType)
          : 'Failed to upload bill';

        if (!isMounted()) return;
        setToast({
          visible: true,
          message: errorMessage,
          type: 'error',
          actions: [
            {
              text: 'Add to Queue',
              onPress: async () => {
                try {
                  await addToQueue(uploadData, formData.billImage!);
                  await clearSavedFormData();
                  showToast('Bill added to queue. Will retry when connection improves.', 'success');
                  resetForm();
                } catch {
                  showToast('Failed to add to queue', 'error');
                }
              },
            },
            billUploadHook.canRetry
              ? {
                  text: 'Retry Now',
                  onPress: async () => {
                    setShowProgressModal(true);
                    await billUploadHook.retryUpload();
                    if (!isMounted()) return;
                    setShowProgressModal(false);
                  },
                }
              : {
                  text: 'Cancel',
                  onPress: () => {},
                  style: 'cancel' as const,
                },
          ],
        });
      }
    } catch (error) {
      logger.error('Error uploading bill:', error as Error | undefined);
      if (!isMounted()) return;
      setShowProgressModal(false);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setFormData({
      billImage: null,
      merchantId: '',
      merchantName: '',
      amount: '',
      billDate: new Date(),
      billNumber: '',
      notes: '',
    });
    setErrors({});
    setTouched({});
    setCashbackCalculation(null);
    billUploadHook.reset();
    clearSavedFormData();
  };

  /**
   * Show toast helper
   */
  const showToast = (message: string, type: ToastConfig['type']) => {
    setToast({
      visible: true,
      message,
      type,
    });
  };

  /**
   * Dismiss toast
   */
  const dismissToast = () => {
    setToast((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  /**
   * Check if form is valid and complete
   */
  const isFormValid = () => {
    return (
      formData.billImage &&
      formData.merchantId &&
      formData.amount &&
      formData.billDate &&
      Object.keys(errors).length === 0
    );
  };

  /**
   * Render camera view
   */
  if (showCamera) {
    // Web fallback: file input instead of native camera (expo-camera doesn't work on web)
    if (Platform.OS === 'web') {
      return (
        <View style={styles.cameraContainer}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', padding: 24 }}>
            <Pressable
              style={styles.cameraCloseButton}
              onPress={() => setShowCamera(false)}
            >
              <Ionicons name="close" size={32} color={Colors.text.inverse} />
            </Pressable>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="cloud-upload-outline" size={40} color="#fff" />
            </View>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
              Upload Bill Photo
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
              Select a clear photo of your bill
            </Text>
            <input
              type="file"
              accept="image/*"
              onChange={(e: any) => {
                const file = e.target?.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev: any) => {
                    const uri = ev.target?.result as string;
                    setShowCamera(false);
                    handleFieldChange('billImage', uri);
                    showToast('Bill photo selected', 'success');
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{ padding: 12, backgroundColor: '#7C3AED', color: '#fff', borderRadius: 8, cursor: 'pointer', border: 'none', fontSize: 16 } as any}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <ExpoCamera.CameraView ref={cameraRef} style={styles.camera} facing={cameraType}>
          <View style={styles.cameraOverlay}>
            {/* Close button */}
            <Pressable
              style={styles.cameraCloseButton}
              onPress={() => setShowCamera(false)}
            >
              <Ionicons name="close" size={32} color={Colors.text.inverse} />
            </Pressable>

            {/* Guidelines */}
            <View style={styles.cameraGuidelines}>
              <Text style={styles.cameraGuidelinesText}>
                Position the bill within the frame
              </Text>
              <View style={styles.cameraFrame} />
              <Text style={styles.cameraHelperText}>
                Ensure all details are visible and well-lit
              </Text>
            </View>

            {/* Controls */}
            <View style={styles.cameraControls}>
              {/* Flip camera button */}
              <Pressable
                style={styles.cameraFlipButton}
                onPress={() => {
                  setCameraType(
                    cameraType === CAMERA_TYPE.back ? CAMERA_TYPE.front : CAMERA_TYPE.back
                  );
                }}
              >
                <Ionicons name="camera-reverse" size={32} color={Colors.text.inverse} />
              </Pressable>

              {/* Capture button */}
              <Pressable style={styles.cameraCaptureButton} onPress={takePicture}>
                <View style={styles.cameraCaptureButtonInner} />
              </Pressable>

              {/* Spacer */}
              <View style={{ width: 60 }} />
            </View>
          </View>
        </ExpoCamera.CameraView>
      </View>
    );
  }

  /**
   * Render merchant selector modal
   */
  const filteredMerchants = useMemo(() =>
    merchants.filter((m) =>
      m.name.toLowerCase().includes(merchantSearchQuery.toLowerCase())
    ), [merchants, merchantSearchQuery]);

  const renderMerchantSelector = () => {

    return (
      <Modal
        visible={showMerchantSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMerchantSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Merchant</Text>
              <Pressable onPress={() => setShowMerchantSelector(false)}>
                <Ionicons name="close" size={24} color={colors.midGray} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search merchants..."
                value={merchantSearchQuery}
                onChangeText={setMerchantSearchQuery}
                autoFocus
              />
              {merchantSearchQuery.length > 0 && (
                <Pressable onPress={() => setMerchantSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </Pressable>
              )}
            </View>

            {/* Merchant list */}
            <ScrollView style={styles.merchantList}>
              {isLoadingMerchants ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.brand.green} />
                  <Text style={styles.loadingText}>Loading merchants...</Text>
                </View>
              ) : (
                <>
                  {filteredMerchants.length === 0 && merchantSearchQuery.length > 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="search-outline" size={48} color="#CCC" />
                      <Text style={styles.emptyText}>No merchants found</Text>
                      <Text style={styles.emptySubtext}>Try a different search term or add manually</Text>
                      <Pressable
                        style={styles.addMerchantButton}
                        onPress={() => {
                          // Create a temporary merchant with the search query
                          const tempMerchant: Store = {
                            _id: `temp_${Date.now()}`,
                            name: merchantSearchQuery,
                            cashbackPercentage: 0,
                          };
                          selectMerchant(tempMerchant);
                        }}
                      >
                        <Ionicons name="add-circle" size={20} color={colors.brand.green} />
                        <Text style={styles.addMerchantButtonText}>
                          Add &quot;{merchantSearchQuery}&quot;
                        </Text>
                      </Pressable>
                    </View>
                  ) : filteredMerchants.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="storefront-outline" size={48} color="#CCC" />
                      <Text style={styles.emptyText}>No merchants available</Text>
                      <Text style={styles.emptySubtext}>Start searching to add a merchant</Text>
                    </View>
                  ) : (
                    <>
                      {filteredMerchants.map((merchant) => (
                  <Pressable
                    key={merchant._id}
                    style={[
                      styles.merchantItem,
                      merchant._id === formData.merchantId && styles.merchantItemSelected,
                    ]}
                    onPress={() => selectMerchant(merchant)}
                  >
                    {merchant.logo ? (
                      <CachedImage source={merchant.logo} style={styles.merchantLogo} />
                    ) : (
                      <View style={[styles.merchantLogo, styles.merchantLogoPlaceholder]}>
                        <Ionicons name="storefront" size={20} color="#999" />
                      </View>
                    )}
                    <View style={styles.merchantInfo}>
                      <Text style={styles.merchantName}>{merchant.name}</Text>
                      {merchant.category && (
                        <Text style={styles.merchantCategory}>{merchant.category}</Text>
                      )}
                      {merchant.cashbackPercentage && (
                        <Text style={styles.merchantCashback}>
                          {merchant.cashbackPercentage}% cashback
                        </Text>
                      )}
                    </View>
                    {merchant._id === formData.merchantId && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.brand.emerald} />
                    )}
                  </Pressable>
                      ))}

                      {/* "Can't find?" option at the bottom of list */}
                      {merchantSearchQuery.length > 0 && (
                        <Pressable
                          style={styles.cantFindMerchantButton}
                          onPress={() => {
                            const tempMerchant: Store = {
                              _id: `temp_${Date.now()}`,
                              name: merchantSearchQuery,
                              cashbackPercentage: 0,
                            };
                            selectMerchant(tempMerchant);
                          }}
                        >
                          <Ionicons name="help-circle-outline" size={20} color={colors.brand.green} />
                          <Text style={styles.cantFindMerchantText}>
                            Can&apos;t find your merchant? Add manually
                          </Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  /**
   * Render progress modal
   */
  const renderProgressModal = () => (
    <Modal visible={showProgressModal} transparent animationType="fade" onRequestClose={() => setShowProgressModal(false)}>
      <View style={styles.progressModalContainer}>
        <View style={styles.progressModalContent}>
          <ActivityIndicator size="large" color={colors.brand.green} />
          <Text style={styles.progressModalTitle}>Uploading Bill</Text>
          <Text style={styles.progressModalSubtitle}>
            {billUploadHook.percentComplete > 0
              ? `${billUploadHook.percentComplete}% complete`
              : 'Preparing upload...'}
          </Text>
          {billUploadHook.uploadSpeed && (
            <Text style={styles.progressModalSpeed}>{billUploadHook.uploadSpeed}</Text>
          )}
          {billUploadHook.percentComplete > 0 && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${billUploadHook.percentComplete}%` },
                ]}
              />
            </View>
          )}
          <Pressable
            style={styles.cancelUploadButton}
            onPress={() => {
              billUploadHook.cancelUpload();
              setShowProgressModal(false);
            }}
          >
            <Text style={styles.cancelUploadButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  /**
   * Render info modal
   */
  const renderInfoModal = () => (
    <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
      <View style={styles.infoModalContainer}>
        <View style={styles.infoModalContent}>
          <View style={styles.infoModalHeader}>
            <Ionicons name="information-circle" size={32} color={colors.brand.green} />
            <Text style={styles.infoModalTitle}>Bill Upload Tips</Text>
          </View>
          <ScrollView style={styles.infoModalBody}>
            <Text style={styles.infoModalText}>
              <Text style={styles.infoModalBold}>For Best Results:</Text>
            </Text>
            <Text style={styles.infoModalBullet}>• Capture the entire bill in the frame</Text>
            <Text style={styles.infoModalBullet}>• Ensure good lighting with no shadows</Text>
            <Text style={styles.infoModalBullet}>• Keep the camera steady to avoid blur</Text>
            <Text style={styles.infoModalBullet}>• Make sure all text is clearly visible</Text>
            <Text style={styles.infoModalBullet}>
              • Bills must be less than 30 days old
            </Text>
            <Text style={styles.infoModalBullet}>
              • Amount must be between {currencySymbol}50 and {currencySymbol}1,00,000
            </Text>
          </ScrollView>
          <Pressable
            style={styles.infoModalCloseButton}
            onPress={() => setShowInfoModal(false)}
          >
            <Text style={styles.infoModalCloseButtonText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  /**
   * Main render
   */
  return (
    <ErrorBoundary>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      {/* Header */}
      <View style={styles.header}>
        <HeaderBackButton onPress={handleBack} iconColor={colors.darkGray} />
        <Text style={styles.headerTitle}>Upload Bill</Text>
        <Pressable onPress={() => setShowInfoModal(true)}>
          <Ionicons name="information-circle-outline" size={24} color={colors.darkGray} />
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={[styles.scrollView, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Offline Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={20} color="#FF9800" />
            <Text style={styles.offlineBannerText}>
              You&apos;re offline. Bills will be queued and uploaded automatically when connection is restored.
            </Text>
          </View>
        )}

        {/* Pending Queue Banner */}
        {hasPendingUploads && isOnline && (
          <Pressable
            style={styles.queueBanner}
            onPress={() => router.push('/bill-history')}
          >
            <View style={styles.queueBannerLeft}>
              <Ionicons name="cloud-upload" size={20} color="#2196F3" />
              <Text style={styles.queueBannerText}>
                {pendingCount} bill{pendingCount > 1 ? 's' : ''} waiting to upload
              </Text>
            </View>
            <Text style={styles.queueBannerAction}>Sync Now</Text>
          </Pressable>
        )}

        {/* Bonus Campaign Banner */}
        <BonusCampaignBanner campaignSlug={bonusCampaignSlug as string} />

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="gift" size={24} color={colors.brand.green} />
          <Text style={styles.infoBannerText}>
            Upload offline bills to earn up to 20% cashback!
          </Text>
        </View>

        {/* Bill Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Bill Photo <Text style={styles.required}>*</Text>
          </Text>
          {formData.billImage ? (
            <View style={styles.imagePreviewContainer}>
              <CachedImage source={formData.billImage} style={styles.imagePreview} />

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

              <Pressable
                style={styles.removeImageButton}
                onPress={() => handleFieldChange('billImage', null)}
              >
                <Ionicons name="close-circle" size={32} color="#FF4444" />
              </Pressable>
              <Pressable style={styles.retakeButton} onPress={openCamera}>
                <Ionicons name="camera" size={16} color={Colors.text.inverse} />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.uploadOptionsContainer}>
              <Pressable
                style={styles.uploadOption}
                onPress={openCamera}
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
                onPress={pickImageFromGallery}
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

          {/* Quality check result details */}
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
                💡 {qualityResult.recommendations[0]}
              </Text>
            </View>
          )}

          <Text style={styles.helperText}>
            Ensure the bill is clear and all details are visible
          </Text>
        </View>

        {/* Merchant Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Merchant <Text style={styles.required}>*</Text>
          </Text>
          <Pressable
            style={[
              styles.merchantSelector,
              touched.merchantId && errors.merchantId && styles.inputError,
            ]}
            onPress={() => {
              loadMerchants();
              setShowMerchantSelector(true);
            }}
          >
            {formData.merchantName ? (
              <View style={styles.selectedMerchantContainer}>
                <Ionicons name="storefront" size={20} color={colors.brand.green} />
                <Text style={styles.selectedMerchant}>{formData.merchantName}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select Merchant</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </Pressable>
          {touched.merchantId && errors.merchantId && (
            <Text style={styles.errorText}>{errors.merchantId}</Text>
          )}
        </View>

        {/* Bill Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Bill Amount <Text style={styles.required}>*</Text>
          </Text>
          {autoDetectedAmount && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 }}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: '600' }}>
                Auto-detected — verify before submitting
              </Text>
            </View>
          )}
          {isAnalyzingBill && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 }}>
              <ActivityIndicator size="small" color={Colors.nileBlue} />
              <Text style={{ fontSize: 12, color: Colors.nileBlue }}>Detecting amount...</Text>
            </View>
          )}
          <View
            style={[
              styles.inputContainer,
              touched.amount && errors.amount && styles.inputError,
            ]}
          >
            <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
            <TextInput
              ref={amountInputRef}
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={formData.amount}
              onChangeText={(text) => { handleFieldChange('amount', text); setAutoDetectedAmount(false); }}
              onBlur={() => handleFieldBlur('amount')}
              returnKeyType="next"
              onSubmitEditing={() => billNumberInputRef.current?.focus()}
            />
          </View>
          {touched.amount && errors.amount ? (
            <Text style={styles.errorText}>{errors.amount}</Text>
          ) : (
            <Text style={styles.helperText}>
              Min: {currencySymbol}{VALIDATION_CONFIG.amount.min}, Max: {currencySymbol}
              {VALIDATION_CONFIG.amount.max.toLocaleString()}
            </Text>
          )}
        </View>

        {/* Bill Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Bill Date <Text style={styles.required}>*</Text>
          </Text>
          <View
            style={[
              styles.inputContainer,
              touched.billDate && errors.billDate && styles.inputError,
            ]}
          >
            <Ionicons name="calendar-outline" size={20} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.billDate.toISOString().split('T')[0]}
              onChangeText={(text) => {
                try {
                  const date = new Date(text);
                  if (!isNaN(date.getTime())) {
                    handleFieldChange('billDate', date);
                  }
                } catch {
                  // Invalid date format
                }
              }}
              onBlur={() => handleFieldBlur('billDate')}
            />
          </View>
          {touched.billDate && errors.billDate ? (
            <Text style={styles.errorText}>{errors.billDate}</Text>
          ) : (
            <Text style={styles.helperText}>
              Bills older than {VALIDATION_CONFIG.date.maxDaysOld} days may be rejected
            </Text>
          )}
        </View>

        {/* Bill Number (Optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Number (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text-outline" size={20} color="#999" />
            <TextInput
              ref={billNumberInputRef}
              style={styles.input}
              placeholder="Enter bill number"
              value={formData.billNumber}
              onChangeText={(text) => handleFieldChange('billNumber', text)}
              onBlur={() => handleFieldBlur('billNumber')}
              returnKeyType="next"
              onSubmitEditing={() => notesInputRef.current?.focus()}
            />
          </View>
          {touched.billNumber && errors.billNumber && (
            <Text style={styles.errorText}>{errors.billNumber}</Text>
          )}
        </View>

        {/* Notes (Optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            ref={notesInputRef}
            style={[styles.input, styles.textArea]}
            placeholder="Add any additional notes..."
            multiline
            numberOfLines={3}
            maxLength={VALIDATION_CONFIG.notes.maxLength}
            value={formData.notes}
            onChangeText={(text) => handleFieldChange('notes', text)}
            onBlur={() => handleFieldBlur('notes')}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>
            {formData.notes.length}/{VALIDATION_CONFIG.notes.maxLength}
          </Text>
          {touched.notes && errors.notes && (
            <Text style={styles.errorText}>{errors.notes}</Text>
          )}
        </View>

        {/* Cashback Preview */}
        {cashbackCalculation && (
          <View style={styles.section}>
            <Pressable
              style={styles.cashbackPreviewHeader}
              onPress={() => setShowCashbackPreview(!showCashbackPreview)}
            >
              <View style={styles.cashbackPreviewTitleContainer}>
                <Ionicons name="gift" size={20} color={colors.brand.emerald} />
                <Text style={styles.cashbackPreviewTitle}>Estimated Cashback</Text>
              </View>
              <View style={styles.cashbackPreviewAmountContainer}>
                <Text style={styles.cashbackPreviewAmount}>
                  {currencySymbol}{cashbackCalculation.finalCashback.toFixed(2)}
                </Text>
                <Ionicons
                  name={showCashbackPreview ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.midGray}
                />
              </View>
            </Pressable>
            {showCashbackPreview && (
              <View style={styles.cashbackPreviewContent}>
                <CashbackCalculator calculation={cashbackCalculation} />
              </View>
            )}
            <Text style={styles.cashbackDisclaimer}>
              * Estimated cashback. Final amount may vary based on verification.
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            (!isFormValid() || billUploadHook.isUploading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid() || billUploadHook.isUploading}
        >
          {billUploadHook.isUploading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color={Colors.text.inverse} />
              <Text style={styles.submitButtonText}>Upload Bill</Text>
            </>
          )}
        </Pressable>

        {/* Bottom spacing for navigation */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Merchant Selector Modal */}
      {renderMerchantSelector()}

      {/* Progress Modal */}
      {renderProgressModal()}

      {/* Info Modal */}
      {renderInfoModal()}

      {/* Toast */}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          actions={toast.actions}
          onDismiss={dismissToast}
        />
      )}
    </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    padding: Spacing.base,
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.2)',
  },
  infoBannerText: {
    flex: 1,
    ...Typography.body,
    color: colors.brand.green,
    fontWeight: '500',
  },
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
  merchantSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  selectedMerchantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  selectedMerchant: {
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  placeholderText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  currencyPrefix: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    paddingVertical: 14,
  },
  textArea: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  cashbackPreviewHeader: {
    backgroundColor: colors.greenMist,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashbackPreviewTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cashbackPreviewTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.brand.emerald,
  },
  cashbackPreviewAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cashbackPreviewAmount: {
    ...Typography.h3,
    fontWeight: '700',
    color: colors.brand.emerald,
  },
  cashbackPreviewContent: {
    marginTop: Spacing.md,
  },
  cashbackDisclaimer: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.brand.green,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.base,
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 192, 106, 0.3)',
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: 'none',
      },
    }),
  },
  submitButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },

  // Camera styles
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraCloseButton: {
    position: 'absolute',
    top: 50,
    right: Spacing.lg,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
  },
  cameraGuidelines: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  cameraGuidelinesText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.lg,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
      web: {
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.75)',
      },
    }),
  },
  cameraFrame: {
    width: 300,
    height: 200,
    borderWidth: 3,
    borderColor: Colors.text.inverse,
    borderRadius: BorderRadius.md,
  },
  cameraHelperText: {
    color: Colors.text.inverse,
    ...Typography.body,
    marginTop: Spacing.md,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.75)',
      },
    }),
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 50,
  },
  cameraFlipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand.green,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    margin: Spacing.base,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  merchantList: {
    flex: 1,
  },
  merchantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    gap: Spacing.md,
  },
  merchantItemSelected: {
    backgroundColor: colors.greenMist,
  },
  merchantLogo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
  },
  merchantLogoPlaceholder: {
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  merchantCategory: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  merchantCashback: {
    ...Typography.bodySmall,
    color: colors.brand.green,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  emptySubtext: {
    marginTop: Spacing.xs,
    ...Typography.body,
    color: Colors.text.tertiary,
  },

  // Progress modal
  progressModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    minWidth: 280,
  },
  progressModalTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  progressModalSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  progressModalSpeed: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    marginTop: Spacing.base,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brand.green,
  },
  cancelUploadButton: {
    marginTop: Spacing.base,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  cancelUploadButtonText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '600',
  },

  // Info modal
  infoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  infoModalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxWidth: 400,
    width: '100%',
  },
  infoModalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  infoModalTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  infoModalBody: {
    maxHeight: 300,
  },
  infoModalText: {
    ...Typography.body,
    color: Colors.text.primary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  infoModalBold: {
    fontWeight: '600',
  },
  infoModalBullet: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 24,
    paddingLeft: Spacing.sm,
  },
  infoModalCloseButton: {
    backgroundColor: colors.brand.green,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  infoModalCloseButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // Offline banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: Spacing.base,
    margin: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
    fontWeight: '500',
  },

  // Queue banner
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  queueBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  queueBannerText: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '500',
    flex: 1,
  },
  queueBannerAction: {
    ...Typography.body,
    color: '#1976D2',
    fontWeight: '600',
    paddingLeft: Spacing.sm,
  },

  // Add merchant button
  addMerchantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    padding: 14,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.brand.green,
    borderStyle: 'dashed',
  },
  addMerchantButtonText: {
    ...Typography.body,
    color: colors.brand.green,
    fontWeight: '600',
  },

  // Can't find merchant button
  cantFindMerchantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cantFindMerchantText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },

  // Quality badge
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

  // Quality warning container
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

  // Quality recommendation container
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

export default withErrorBoundary(BillUploadPage, 'Bill Upload');
