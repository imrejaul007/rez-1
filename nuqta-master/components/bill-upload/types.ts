/**
 * Shared types for bill-upload components
 */
import type { CashbackCalculation } from '@/types/billVerification.types';

export interface Store {
  _id: string;
  name: string;
  logo?: string;
  cashbackPercentage?: number;
  category?: string;
}

export interface FormData {
  billImage: string | null;
  merchantId: string;
  merchantName: string;
  amount: string;
  billDate: Date;
  billNumber: string;
  notes: string;
}

export interface FormErrors {
  billImage?: string;
  merchantId?: string;
  amount?: string;
  billDate?: string;
  billNumber?: string;
  notes?: string;
}

export interface ToastConfig {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  actions?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel';
  }>;
}

export interface BillUploadHookReturn {
  // Form state
  formData: FormData;
  errors: FormErrors;
  touched: Record<string, boolean>;
  merchants: Store[];
  filteredMerchants: Store[];
  cashbackCalculation: CashbackCalculation | null;

  // UI state
  hasPermission: boolean | null;
  showCamera: boolean;
  showMerchantSelector: boolean;
  showCashbackPreview: boolean;
  showInfoModal: boolean;
  showProgressModal: boolean;
  merchantSearchQuery: string;
  isLoadingMerchants: boolean;
  isCheckingQuality: boolean;
  qualityResult: any;
  toast: ToastConfig;

  // Offline queue
  isOnline: boolean;
  hasPendingUploads: boolean;
  pendingCount: number;

  // Upload hook
  billUploadHook: any;

  // Animation
  fadeAnim: any;

  // Refs
  cameraRef: React.RefObject<any>;
  amountInputRef: React.RefObject<any>;
  billNumberInputRef: React.RefObject<any>;
  notesInputRef: React.RefObject<any>;
  scrollViewRef: React.RefObject<any>;

  // Handlers
  handleFieldChange: (fieldName: keyof FormData, value: any) => void;
  handleFieldBlur: (fieldName: keyof FormData) => void;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
  openCamera: () => Promise<void>;
  takePicture: () => Promise<void>;
  pickImageFromGallery: () => Promise<void>;
  selectMerchant: (merchant: Store) => void;
  loadMerchants: () => Promise<void>;
  setShowCamera: (show: boolean) => void;
  setShowMerchantSelector: (show: boolean) => void;
  setShowCashbackPreview: (show: boolean) => void;
  setShowInfoModal: (show: boolean) => void;
  setShowProgressModal: (show: boolean) => void;
  setMerchantSearchQuery: (query: string) => void;
  setCameraType: (type: 'back' | 'front') => void;
  cameraType: 'back' | 'front';
  showToast: (message: string, type: ToastConfig['type']) => void;
  dismissToast: () => void;
  isFormValid: () => boolean;
  currencySymbol: string;
}
