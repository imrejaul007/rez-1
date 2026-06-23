// types/earn-social.types.ts - TypeScript interfaces for Earn From Social Media feature

export interface EarnSocialState {
  currentStep: 'overview' | 'url_input' | 'uploading' | 'success' | 'error';
  instagramUrl: string;
  isValidUrl: boolean;
  loading: boolean;
  error: string | null;
  success: boolean;
  earnings: EarningsInfo;
  uploadProgress: number;
  posts: SocialMediaPost[];
}

export interface EarningsInfo {
  pendingAmount: number;
  totalEarned: number;
  cashbackRate: number;
  currentBalance: number;
  estimatedCrediting: string; // e.g., "48 hours"
}

export interface SocialMediaPost {
  id: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  submittedAt: Date;
  cashbackAmount: number;
  platform: 'instagram' | 'facebook' | 'twitter' | 'youtube';
  thumbnailUrl?: string;
}

export interface CashbackCard {
  id: string;
  title: string;
  description: string;
  percentage: number;
  icon: string;
  backgroundColor: string;
  textColor: string;
}

export interface StepCard {
  stepNumber: number;
  title: string;
  description: string;
  illustration: string;
  isCompleted: boolean;
  isActive: boolean;
}

export interface UseEarnSocialReturn {
  state: EarnSocialState;
  actions: {
    setInstagramUrl: (url: string) => void;
    validateInstagramUrl: (url: string) => boolean;
    submitPost: () => Promise<void>;
    resetForm: () => void;
    refreshEarnings: () => Promise<void>;
  };
  handlers: {
    handleUrlChange: (url: string) => void;
    handleSubmit: () => Promise<void>;
    handleRetry: () => void;
    handleGoBack: () => void;
    handleStartUpload: () => void;
  };
}

export interface EarnSocialApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface InstagramPostValidation {
  isValid: boolean;
  error?: string;
  extractedData?: {
    postId: string;
    username: string;
    platform: string;
  };
}

export interface UploadPostRequest {
  url: string;
  platform: string;
  userId?: string;
  metadata?: {
    postId: string;
    username: string;
    submittedAt: Date;
  };
}

export interface EarnSocialPageProps {
  initialStep?: 'overview' | 'url_input';
  showDebugInfo?: boolean;
}