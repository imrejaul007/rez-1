// @ts-nocheck
/**
 * Custom hook for Bill Upload page state and logic
 *
 * Extracts all state management, API calls, form validation,
 * camera handling, and upload logic from the monolithic bill-upload page.
 */
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
  TextInput,
  Keyboard} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming} from 'react-native-reanimated';
import * as ExpoCamera from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';

import { billUploadService } from '@/services/billUploadService';
import storesApi from '@/services/storesApi';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useBillUpload } from '@/hooks/useBillUpload';
import { useImageQuality } from '@/hooks/useImageQuality';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useDebounce } from '@/hooks/useDebounce';
import { compressImageIfNeeded } from '@/utils/imageCompression';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { sanitizeInput, sanitizeNumber, sanitizeBillNumber } from '@/utils/inputSanitization';
import {
  validateAmount,
  validateBillDate,
  validateBillNumber,
  validateNotes,
  VALIDATION_CONFIG,
  type ValidationResult} from '@/utils/billValidation';
import {
  BillUploadErrorType,
  getUserErrorMessage} from '@/utils/billUploadErrors';
import { FILE_SIZE_LIMITS } from '@/utils/fileUploadConstants';
import logger from '@/utils/logger';
import { useIsMounted } from '@/hooks/useIsMounted';

import type { Store, FormData, FormErrors, ToastConfig, BillUploadHookReturn } from '../types';
import type { CashbackCalculation } from '@/types/billVerification.types';

const FORM_STORAGE_KEY = '@bill_upload_draft';
const CAMERA_TYPE = {
  back: 'back' as const,
  front: 'front' as const};

export function useBillUploadPage(): BillUploadHookReturn {
  const isMounted = useIsMounted();
  const router = useRouter();
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
    checkAspectRatio: true});

  // Offline queue hook
  const {
    addToQueue,
    syncQueue,
    isOnline,
    hasPendingUploads,
    pendingCount,
    canSync,
    getEstimatedSyncTime} = useOfflineQueue();

  // Refs
  const cameraRef = useRef<ExpoCamera.CameraView>(null);
  const amountInputRef = useRef<TextInput>(null);
  const billNumberInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Hide default header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Camera states
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<typeof CAMERA_TYPE[keyof typeof CAMERA_TYPE]>(CAMERA_TYPE.back);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    billImage: null,
    merchantId: '',
    merchantName: '',
    amount: '',
    billDate: new Date(),
    billNumber: '',
    notes: ''});

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [, setIsValidating] = useState(false);

  // Merchant selection
  const [merchants, setMerchants] = useState<Store[]>([]);
  const [showMerchantSelector, setShowMerchantSelector] = useState(false);
  const [merchantSearchQuery, setMerchantSearchQuery] = useState('');
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);

  // Cashback preview
  const [cashbackCalculation, setCashbackCalculation] = useState<CashbackCalculation | null>(null);
  const [showCashbackPreview, setShowCashbackPreview] = useState(false);

  // Debounced values
  const debouncedAmount = useDebounce(formData.amount, 500);
  const debouncedMerchantId = useDebounce(formData.merchantId, 500);

  // UI state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [toast, setToast] = useState<ToastConfig>({
    visible: false,
    message: '',
    type: 'success'});
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Animation
  const fadeAnim = useSharedValue(0);

  // Initialize
  useEffect(() => {
    initializePage();
    fadeAnim.value = withTiming(1, { duration: 300 });
  }, []);

  const initializePage = async () => {
    try {
      const { status } = await ExpoCamera.Camera.requestCameraPermissionsAsync();
      if (!isMounted()) return;
      setHasPermission(status === 'granted');
    } catch (e) {
      if (!isMounted()) return;
      setHasPermission(false);
    }
    await loadSavedFormData();
  };

  const loadSavedFormData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(FORM_STORAGE_KEY);
      if (savedData) {
        let parsed;
        try { parsed = JSON.parse(savedData); } catch { parsed = null; }
        if (parsed) {
          setFormData({
            ...parsed,
            billDate: parsed.billDate ? new Date(parsed.billDate) : new Date()});
          showToast('Draft restored', 'info');
        }
      }
    } catch (error) {
      logger.error('Failed to load saved form data:', error);
    }
  };

  const saveFormData = useCallback(async () => {
    try {
      const dataToSave = {
        ...formData,
        billDate: formData.billDate.toISOString()};
      await AsyncStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      logger.error('Failed to save form data:', error);
    }
  }, [formData]);

  const clearSavedFormData = async () => {
    try {
      await AsyncStorage.removeItem(FORM_STORAGE_KEY);
    } catch (error) {
      logger.error('Failed to clear saved form data:', error);
    }
  };

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.billImage || formData.amount || formData.merchantId) {
        saveFormData();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, saveFormData]);

  const loadMerchants = async () => {
    if (merchants.length > 0) return;
    setIsLoadingMerchants(true);
    try {
      const response = await storesApi.getStores({ limit: 100 });
      if (response.success && response.data && response.data.stores) {
        const mappedStores = response.data.stores.map((store: any) => ({
          _id: store.id,
          name: store.name,
          logo: store.logo,
          cashbackPercentage: store.cashbackPercentage || 0,
          category: store.category}));
        setMerchants(mappedStores);
      }
    } catch (error) {
      logger.error('Error loading merchants:', error);
      showToast('Failed to load merchants', 'error');
    } finally {
      if (!isMounted()) return;
      setIsLoadingMerchants(false);
    }
  };

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
        result = { isValid: !!value, error: value ? undefined : 'Please select a merchant' };
        break;
      case 'billImage':
        result = { isValid: !!value, error: value ? undefined : 'Please upload a bill image' };
        break;
      default:
        return undefined;
    }
    return result.error;
  };

  const handleFieldChange = (fieldName: keyof FormData, value: any) => {
    let sanitizedValue = value;
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
    setFormData((prev) => ({ ...prev, [fieldName]: sanitizedValue }));
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }
  };

  const handleFieldBlur = (fieldName: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, formData[fieldName]);
    if (error) {
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
    updateCashbackPreview();
  };

  const updateCashbackPreview = async () => {
    if (!formData.merchantId || !formData.amount) {
      setCashbackCalculation(null);
      return;
    }
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum < VALIDATION_CONFIG.amount.min) return;
    const merchant = merchants.find((m) => m._id === formData.merchantId);
    if (!merchant) return;

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
      caps: { dailyLimit: 500, monthlyLimit: 5000 },
      breakdown: [
        { label: 'Bill Amount', amount: amountNum },
        { label: 'Base Cashback', amount: baseCashback, percentage: baseCashbackRate },
      ]};
    setCashbackCalculation(calculation);
  };

  // Watch for debounced changes
  useEffect(() => {
    updateCashbackPreview();
  }, [debouncedAmount, debouncedMerchantId]);

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

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo && photo.uri) {
          if (!isMounted()) return;
          setShowCamera(false);
          showToast('Compressing image...', 'info');
          const compressedUri = await compressImageIfNeeded(photo.uri, {
            maxWidth: 1200,
            targetFileSize: 2 * 1024 * 1024});
          showToast('Checking image quality...', 'info');
          const quality = await checkQuality(compressedUri);
          if (!quality.isValid) {
            const errorMsg = quality.errors.join('. ');
            showToast(errorMsg, 'error');
            if (quality.recommendations.length > 0) {
              setTimeout(() => showToast(quality.recommendations[0], 'warning'), 3000);
            }
            return;
          }
          if (quality.warnings.length > 0) {
            showToast(quality.warnings[0], 'warning');
          }
          handleFieldChange('billImage', compressedUri);
          showToast(`Bill photo captured (Quality: ${quality.score}/100)`, 'success');
        }
      } catch (error) {
        logger.error('Error taking picture:', error);
        showToast('Failed to take picture', 'error');
      }
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8});
      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        showToast('Compressing image...', 'info');
        const compressedUri = await compressImageIfNeeded(imageUri, {
          maxWidth: 1200,
          targetFileSize: 2 * 1024 * 1024});
        showToast('Checking image quality...', 'info');
        const quality = await checkQuality(compressedUri);
        if (!quality.isValid) {
          const errorMsg = quality.errors.join('. ');
          showToast(errorMsg, 'error');
          if (quality.recommendations.length > 0) {
            setTimeout(() => showToast(quality.recommendations[0], 'warning'), 3000);
          }
          return;
        }
        if (quality.warnings.length > 0) {
          showToast(quality.warnings[0], 'warning');
        }
        handleFieldChange('billImage', compressedUri);
        showToast(`Bill photo selected (Quality: ${quality.score}/100)`, 'success');
      }
    } catch (error) {
      logger.error('Error picking image:', error);
      showToast('Failed to pick image', 'error');
    }
  };

  const selectMerchant = (merchant: Store) => {
    handleFieldChange('merchantId', merchant._id);
    handleFieldChange('merchantName', merchant.name);
    setShowMerchantSelector(false);
    setErrors((prev) => ({ ...prev, merchantId: undefined }));
    updateCashbackPreview();
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.billImage) newErrors.billImage = 'Please upload a bill image';
    if (!formData.merchantId) newErrors.merchantId = 'Please select a merchant';
    const amountError = validateField('amount', formData.amount);
    if (amountError) newErrors.amount = amountError;
    const dateError = validateField('billDate', formData.billDate);
    if (dateError) newErrors.billDate = dateError;
    const billNumberError = validateField('billNumber', formData.billNumber);
    if (billNumberError) newErrors.billNumber = billNumberError;
    const notesError = validateField('notes', formData.notes);
    if (notesError) newErrors.notes = notesError;
    setErrors(newErrors);
    setTouched({
      billImage: true, merchantId: true, amount: true,
      billDate: true, billNumber: true, notes: true});
    if (Object.keys(newErrors).length > 0) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      showToast('Please fix the errors in the form', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;
    setIsValidating(true);
    setShowProgressModal(true);

    try {
      const uploadData = {
        billImage: formData.billImage!,
        merchantId: formData.merchantId,
        amount: parseFloat(formData.amount),
        billDate: formData.billDate,
        billNumber: formData.billNumber || undefined,
        notes: formData.notes || undefined,
        cashbackCalculation: cashbackCalculation || undefined};

      if (!isOnline) {
        try {
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
              { text: 'View Queue', onPress: () => router.push('/bill-history') },
              { text: 'Upload Another', onPress: resetForm },
            ]});
          resetForm();
          return;
        } catch (queueError) {
          logger.error('Failed to add to queue:', queueError);
          if (!isMounted()) return;
          setShowProgressModal(false);
          showToast('Failed to queue bill for upload. Please try again.', 'error');
          setIsValidating(false);
          return;
        }
      }

      const success = await billUploadHook.startUpload(uploadData);
      if (!isMounted()) return;
      setShowProgressModal(false);

      if (success) {
        await clearSavedFormData();
        if (!isMounted()) return;
        setToast({
          visible: true,
          message: 'Bill uploaded successfully! Your cashback will be credited after verification.',
          type: 'success',
          actions: [
            { text: 'View History', onPress: () => router.push('/bill-history') },
            { text: 'Upload Another', onPress: resetForm },
          ]});
      } else {
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
              }},
            billUploadHook.canRetry
              ? {
                  text: 'Retry Now',
                  onPress: async () => {
                    setShowProgressModal(true);
                    await billUploadHook.retryUpload();
                    if (!isMounted()) return;
                    setShowProgressModal(false);
                  }}
              : { text: 'Cancel', onPress: () => {}, style: 'cancel' as const },
          ]});
      }
    } catch (error) {
      logger.error('Error uploading bill:', error);
      if (!isMounted()) return;
      setShowProgressModal(false);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      billImage: null, merchantId: '', merchantName: '',
      amount: '', billDate: new Date(), billNumber: '', notes: ''});
    setErrors({});
    setTouched({});
    setCashbackCalculation(null);
    billUploadHook.reset();
    clearSavedFormData();
  };

  const showToast = (message: string, type: ToastConfig['type']) => {
    setToast({ visible: true, message, type });
  };

  const dismissToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const isFormValid = () => {
    return !!(
      formData.billImage &&
      formData.merchantId &&
      formData.amount &&
      formData.billDate &&
      Object.keys(errors).length === 0
    );
  };

  const filteredMerchants = useMemo(() =>
    merchants.filter((m) =>
      m.name.toLowerCase().includes(merchantSearchQuery.toLowerCase())
    ), [merchants, merchantSearchQuery]);

  return {
    formData,
    errors,
    touched,
    merchants,
    filteredMerchants,
    cashbackCalculation,
    hasPermission,
    showCamera,
    showMerchantSelector,
    showCashbackPreview,
    showInfoModal,
    showProgressModal,
    merchantSearchQuery,
    isLoadingMerchants,
    isCheckingQuality,
    qualityResult,
    toast,
    isOnline,
    hasPendingUploads,
    pendingCount,
    billUploadHook,
    fadeAnim,
    cameraRef,
    amountInputRef,
    billNumberInputRef,
    notesInputRef,
    scrollViewRef,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    openCamera,
    takePicture,
    pickImageFromGallery,
    selectMerchant,
    loadMerchants,
    setShowCamera,
    setShowMerchantSelector,
    setShowCashbackPreview,
    setShowInfoModal,
    setShowProgressModal,
    setMerchantSearchQuery,
    setCameraType,
    cameraType,
    showToast,
    dismissToast,
    isFormValid,
    currencySymbol};
}
