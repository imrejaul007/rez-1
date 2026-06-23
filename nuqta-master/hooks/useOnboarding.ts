import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  OnboardingState, 
  OnboardingUserData, 
  OnboardingStep 
} from '@/types/onboarding.types';

const STORAGE_KEYS = {
  ONBOARDING_PROGRESS: 'onboarding_progress',
  USER_DATA: 'onboarding_user_data',
  ONBOARDING_COMPLETED: 'onboarding_completed',
};

const initialUserData: OnboardingUserData = {
  phoneNumber: '',
  email: '',
  referralCode: '',
  otp: '',
  location: undefined,
  selectedCategories: [],
};

const initialState: OnboardingState = {
  currentStep: OnboardingStep.SPLASH,
  userData: initialUserData,
  isLoading: false,
  error: null,
  isCompleted: false,
};

export const useOnboarding = () => {
  const [state, setState] = useState<OnboardingState>(initialState);

  // Load saved progress on mount
  useEffect(() => {
    loadSavedProgress();
  }, []);

  // Save progress whenever state changes
  useEffect(() => {
    saveProgress();
  }, [state]);

  const loadSavedProgress = async () => {
    try {
      const [savedProgress, savedUserData, isCompleted] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_PROGRESS),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED),
      ]);

      if (isCompleted === 'true') {
        setState(prev => ({ ...prev, isCompleted: true }));
        return;
      }

      const currentStep = savedProgress ? parseInt(savedProgress, 10) : OnboardingStep.SPLASH;
      const userData = savedUserData ? JSON.parse(savedUserData) : initialUserData;

      setState(prev => ({
        ...prev,
        currentStep,
        userData,
      }));
    } catch (_error) {
      // silently handle
    }
  };

  const saveProgress = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_PROGRESS, state.currentStep.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(state.userData)),
        AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, state.isCompleted.toString()),
      ]);
    } catch (_error) {
      // silently handle
    }
  };

  const updateUserData = useCallback((data: Partial<OnboardingUserData>) => {
    setState(prev => ({
      ...prev,
      userData: { ...prev.userData, ...data },
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, OnboardingStep.COMPLETED),
      error: null,
    }));
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({
      ...prev,
      currentStep: step,
      error: null,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const completeOnboarding = useCallback(async () => {
    setState(prev => ({ ...prev, isCompleted: true, currentStep: OnboardingStep.COMPLETED }));
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    } catch (_error) {
      // silently handle
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    setState(initialState);
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_PROGRESS),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED),
      ]);
    } catch (_error) {
      // silently handle
    }
  }, []);

  // Validation helpers
  const validatePhoneNumber = useCallback((phone: string): boolean => {
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }, []);

  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validateOTP = useCallback((otp: string): boolean => {
    return /^\d{6}$/.test(otp);
  }, []);

  const canProceedToNextStep = useCallback((): boolean => {
    const { currentStep, userData } = state;
    
    switch (currentStep) {
      case OnboardingStep.REGISTRATION:
        return validatePhoneNumber(userData.phoneNumber) && validateEmail(userData.email);
      case OnboardingStep.OTP_VERIFICATION:
        return validateOTP(userData.otp);
      case OnboardingStep.LOCATION_PERMISSION:
        return !!userData.location;
      default:
        return true;
    }
  }, [state, validatePhoneNumber, validateEmail, validateOTP]);

  return {
    state,
    updateUserData,
    nextStep,
    goToStep,
    setLoading,
    setError,
    completeOnboarding,
    resetOnboarding,
    validatePhoneNumber,
    validateEmail,
    validateOTP,
    canProceedToNextStep,
  };
};
