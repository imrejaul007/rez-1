// Payment Verification Hook
// Manages payment method verification state and logic

import { useState, useCallback } from 'react';
import paymentVerificationService from '@/services/paymentVerificationService';
import type {
  VerificationStatus,
  VerificationType,
  PaymentMethodVerificationStatus,
  CardVerificationRequest,
  BankVerificationRequest,
  UPIVerificationRequest,
  KYCVerificationRequest,
  OTPVerificationRequest,
  MicroDepositVerification,
} from '@/types/paymentVerification.types';

interface VerificationState {
  isLoading: boolean;
  error: string | null;
  verificationStatus: PaymentMethodVerificationStatus | null;
}

export function usePaymentVerification(paymentMethodId?: string) {
  const [state, setState] = useState<VerificationState>({
    isLoading: false,
    error: null,
    verificationStatus: null,
  });

  // =====================================================
  // GET VERIFICATION STATUS
  // =====================================================

  const getVerificationStatus = useCallback(async (methodId?: string) => {
    const id = methodId || paymentMethodId;
    if (!id) {
      setState(prev => ({ ...prev, error: 'Payment method ID is required' }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await paymentVerificationService.getVerificationStatus(id);

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          verificationStatus: response.data!,
        }));
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get verification status');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to get verification status',
      }));
      return null;
    }
  }, [paymentMethodId]);

  // =====================================================
  // CARD VERIFICATION
  // =====================================================

  const verifyCard = useCallback(async (request: CardVerificationRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await paymentVerificationService.initiateCardVerification(request);

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'Card verification failed');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Card verification failed',
      }));
      return null;
    }
  }, []);

  const complete3DSAuth = useCallback(async (verificationId: string, authData: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await paymentVerificationService.complete3DSAuthentication(
        verificationId,
        authData
      );
      if (response.success && response.data) {
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        throw new Error(response.error || '3DS authentication failed');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || '3DS authentication failed',
      }));
      return null;
    }
  }, []);

  // =====================================================
  // BANK VERIFICATION
  // =====================================================

  const verifyBankAccount = useCallback(async (request: BankVerificationRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await paymentVerificationService.initiateBankVerification(request);

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'Bank verification failed');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Bank verification failed',
      }));
      return null;
    }
  }, []);

  const verifyMicroDeposits = useCallback(
    async (verificationId: string, deposits: MicroDepositVerification) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await paymentVerificationService.verifyMicroDeposits(
          verificationId,
          deposits
        );
        if (response.success && response.data) {
          setState(prev => ({ ...prev, isLoading: false }));
          return response.data;
        } else {
          throw new Error(response.error || 'Micro-deposit verification failed');
        }
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Micro-deposit verification failed',
        }));
        return null;
      }
    },
    []
  );

  // =====================================================
  // UPI VERIFICATION
  // =====================================================

  const verifyUPI = useCallback(async (request: UPIVerificationRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await paymentVerificationService.initiateUPIVerification(request);

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'UPI verification failed');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'UPI verification failed',
      }));
      return null;
    }
  }, []);

  // =====================================================
  // KYC VERIFICATION
  // =====================================================

  const uploadKYC = useCallback(async (request: KYCVerificationRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await paymentVerificationService.uploadKYCDocuments(request);

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'KYC upload failed');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'KYC upload failed',
      }));
      return null;
    }
  }, []);

  // =====================================================
  // OTP VERIFICATION
  // =====================================================

  const sendOTP = useCallback(async (request: OTPVerificationRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await paymentVerificationService.sendOTP(request);

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to send OTP',
      }));
      return null;
    }
  }, []);

  const validateOTP = useCallback(async (verificationId: string, otp: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await paymentVerificationService.validateOTP({
        verificationId,
        otp,
      });

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'OTP validation failed');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'OTP validation failed',
      }));
      return null;
    }
  }, []);

  // =====================================================
  // BIOMETRIC VERIFICATION
  // =====================================================

  const checkBiometricAvailability = useCallback(async () => {
    try {
      const available = await paymentVerificationService.isBiometricAvailable();
      return available;
    } catch (error) {
      return false;
    }
  }, []);

  const authenticateWithBiometric = useCallback(async (prompt?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await paymentVerificationService.authenticateWithBiometric(prompt);

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isLoading: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'Biometric authentication failed');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Biometric authentication failed',
      }));
      return null;
    }
  }, []);

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  const isVerified = useCallback((type?: VerificationType): boolean => {
    if (!state.verificationStatus) return false;

    if (!type) {
      return state.verificationStatus.overallStatus === 'VERIFIED';
    }

    const typeMap: Record<VerificationType, keyof typeof state.verificationStatus.verificationsCompleted> = {
      CARD_3DS: 'card3DS',
      BANK_MICRO_DEPOSIT: 'bankAccount',
      UPI: 'upi',
      KYC_DOCUMENT: 'kyc',
      OTP: 'otp',
      IDENTITY: 'identity',
      BIOMETRIC: 'biometric',
    };

    const key = typeMap[type];
    return state.verificationStatus.verificationsCompleted[key] || false;
  }, [state.verificationStatus]);

  const getVerificationProgress = useCallback((): number => {
    if (!state.verificationStatus) return 0;

    const completions = state.verificationStatus.verificationsCompleted;
    const completed = Object.values(completions).filter(Boolean).length;
    const total = Object.keys(completions).length;

    return (completed / total) * 100;
  }, [state.verificationStatus]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    verificationStatus: state.verificationStatus,

    // Actions
    getVerificationStatus,
    verifyCard,
    complete3DSAuth,
    verifyBankAccount,
    verifyMicroDeposits,
    verifyUPI,
    uploadKYC,
    sendOTP,
    validateOTP,
    checkBiometricAvailability,
    authenticateWithBiometric,

    // Utilities
    isVerified,
    getVerificationProgress,
    clearError,
  };
}

export default usePaymentVerification;
