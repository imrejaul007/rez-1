export interface OnboardingUserData {
  phoneNumber: string;
  email: string;
  referralCode?: string;
  otp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  selectedCategories: string[];
}

export interface OnboardingState {
  currentStep: number;
  userData: OnboardingUserData;
  isLoading: boolean;
  error: string | null;
  isCompleted: boolean;
}

export interface OnboardingContextType {
  state: OnboardingState;
  updateUserData: (data: Partial<OnboardingUserData>) => void;
  nextStep: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export interface RegistrationFormData {
  phoneNumber: string;
  email: string;
  referralCode?: string;
}

export interface OTPData {
  otp: string;
  phoneNumber: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  isEnabled: boolean;
}

export interface BrandItem {
  id: string;
  name: string;
  logo: string;
  originalPrice: number;
  discountedPrice: number;
  isEnabled: boolean;
}

// API Response types
export interface RegisterResponse {
  success: boolean;
  message: string;
  userId?: string;
  otpSent?: boolean;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  token?: string;
  userId?: string;
}

export interface LocationResponse {
  success: boolean;
  message: string;
  locationId?: string;
}

// Onboarding step enum
export enum OnboardingStep {
  SPLASH = 0,
  REGISTRATION = 1,
  OTP_VERIFICATION = 2,
  LOCATION_PERMISSION = 3,
  LOADING = 4,
  CATEGORY_SELECTION = 5,
  REWARDS_INTRO = 6,
  TRANSACTIONS_PREVIEW = 7,
  COMPLETED = 8,
}

export const ONBOARDING_STEPS = [
  'splash',
  'registration',
  'otp-verification',
  'location-permission',
  'loading',
  'category-selection',
  'rewards-intro',
  'transactions-preview',
] as const;

export type OnboardingStepType = typeof ONBOARDING_STEPS[number];