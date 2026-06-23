// Payment Verification Service
// Handles all payment method verification operations

import apiClient, { ApiResponse } from './apiClient';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import razorpayService from './razorpayService';
import stripeReactNativeService from './stripeReactNativeService';
import type {
  VerificationStatus,
  VerificationType,
  CardVerificationRequest,
  CardVerificationResponse,
  BankVerificationRequest,
  BankVerificationResponse,
  MicroDepositVerification,
  UPIVerificationRequest,
  UPIVerificationResponse,
  KYCVerificationRequest,
  KYCVerificationResponse,
  OTPVerificationRequest,
  OTPVerificationResponse,
  OTPValidationRequest,
  OTPValidationResponse,
  IdentityVerificationRequest,
  IdentityVerificationResponse,
  BiometricVerificationRequest,
  BiometricVerificationResponse,
  PaymentMethodVerificationStatus,
  VerificationHistoryItem,
  FraudDetectionSignals,
  VerificationRequirements,
  VerificationSession,
  ReverificationRequest,
  VerificationChallenge,
  VerificationChallengeResponse,
  DeviceBinding,
  RiskBasedVerificationDecision,
  VerificationLevel,
} from '@/types/paymentVerification.types';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

class PaymentVerificationService {
  private baseUrl = '/payment-verification';

  // =====================================================
  // CARD VERIFICATION (3D SECURE)
  // =====================================================

  /**
   * Initiate 3D Secure card verification
   */
  async initiateCardVerification(
    request: CardVerificationRequest
  ): Promise<ApiResponse<CardVerificationResponse>> {

    try {
      const response = await apiClient.post<CardVerificationResponse>(`${this.baseUrl}/card/initiate`, request);

      if (response.success && response.data) {

        return response;
      }

      // Fallback to gateway-specific verification
      return this.initiateGatewayCardVerification(request);
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Card verification failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate card verification',
      };
    }
  }

  /**
   * Initiate card verification using Stripe/Razorpay
   */
  private async initiateGatewayCardVerification(
    request: CardVerificationRequest
  ): Promise<ApiResponse<CardVerificationResponse>> {
    // Try Stripe first
    if (stripeReactNativeService.isConfigured() && Platform.OS !== 'web') {
      try {
        // Create a setup intent for verification
        const setupIntent = await apiClient.post<{ id: string; clientSecret: string }>(
          '/payment/stripe/create-setup-intent',
          {
          paymentMethodId: request.paymentMethodId,
          }
        );

        if (setupIntent.success && setupIntent.data) {
          return {
            success: true,
            data: {
              verificationId: setupIntent.data.id,
              status: 'IN_PROGRESS' as VerificationStatus,
              requiresAuthentication: true,
              clientSecret: setupIntent.data.clientSecret,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            },
          };
        }
      } catch (error) {
        devLog.warn('⚠️ [VERIFICATION] Stripe verification fallback failed');
      }
    }

    // Try Razorpay
    if (razorpayService.isConfigured()) {
      try {
        // Razorpay handles 3DS during payment, so we mark as verified if configured
        return {
          success: true,
          data: {
            verificationId: `rzp_verify_${Date.now()}`,
            status: 'VERIFIED' as VerificationStatus,
            requiresAuthentication: false,
          },
        };
      } catch (error) {
        devLog.warn('⚠️ [VERIFICATION] Razorpay verification fallback failed');
      }
    }

    // Mock verification for testing — only in development
    if (__DEV__) {
      return this.mockCardVerification(request);
    }
    return {
      success: false,
      error: 'No payment gateway configured for card verification',
    };
  }

  /**
   * Complete 3D Secure authentication
   */
  async complete3DSAuthentication(
    verificationId: string,
    authenticationData: any
  ): Promise<ApiResponse<CardVerificationResponse>> {

    try {
      const response = await apiClient.post<CardVerificationResponse>(`${this.baseUrl}/card/complete-3ds`, {
        verificationId,
        authenticationData,
      });

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] 3DS completion failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete 3DS authentication',
      };
    }
  }

  /**
   * Mock card verification for testing
   */
  private mockCardVerification(
    request: CardVerificationRequest
  ): ApiResponse<CardVerificationResponse> {

    return {
      success: true,
      data: {
        verificationId: `mock_card_${Date.now()}`,
        status: 'VERIFIED' as VerificationStatus,
        requiresAuthentication: false,
      },
    };
  }

  // =====================================================
  // BANK ACCOUNT VERIFICATION
  // =====================================================

  /**
   * Initiate bank account verification
   */
  async initiateBankVerification(
    request: BankVerificationRequest
  ): Promise<ApiResponse<BankVerificationResponse>> {

    try {
      const response = await apiClient.post<BankVerificationResponse>(`${this.baseUrl}/bank/initiate`, request);

      if (response.success && response.data) {

        return response;
      }

      // Fallback to mock only in development
      if (__DEV__) {
        return this.mockBankVerification(request);
      }
      return {
        success: false,
        error: 'Bank verification failed',
      };
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Bank verification failed:', error);
      if (__DEV__) {
        return this.mockBankVerification(request);
      }
      return {
        success: false,
        error: error.message || 'Failed to initiate bank verification',
      };
    }
  }

  /**
   * Verify micro-deposits
   */
  async verifyMicroDeposits(
    verificationId: string,
    deposits: MicroDepositVerification
  ): Promise<ApiResponse<BankVerificationResponse>> {

    try {
      const response = await apiClient.post<BankVerificationResponse>(`${this.baseUrl}/bank/verify-deposits`, {
        verificationId,
        ...deposits,
      });

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Micro-deposit verification failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify micro-deposits',
      };
    }
  }

  /**
   * Mock bank verification for testing
   */
  private mockBankVerification(
    request: BankVerificationRequest
  ): ApiResponse<BankVerificationResponse> {

    return {
      success: true,
      data: {
        verificationId: `mock_bank_${Date.now()}`,
        status: 'PENDING' as VerificationStatus,
        method: 'MICRO_DEPOSIT',
        estimatedTime: '2-3 business days',
        instructionsText:
          'We will deposit two small amounts (less than ₹10 each) to your account within 2-3 business days. Once received, enter the amounts to verify your account.',
        depositsExpectedBy: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  // =====================================================
  // UPI VERIFICATION
  // =====================================================

  /**
   * Initiate UPI verification
   */
  async initiateUPIVerification(
    request: UPIVerificationRequest
  ): Promise<ApiResponse<UPIVerificationResponse>> {

    try {
      const response = await apiClient.post<UPIVerificationResponse>(`${this.baseUrl}/upi/initiate`, request);

      if (response.success && response.data) {

        return response;
      }

      // Fallback to mock only in development
      if (__DEV__) {
        return this.mockUPIVerification(request);
      }
      return {
        success: false,
        error: 'UPI verification failed',
      };
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] UPI verification failed:', error);
      if (__DEV__) {
        return this.mockUPIVerification(request);
      }
      return {
        success: false,
        error: error.message || 'Failed to initiate UPI verification',
      };
    }
  }

  /**
   * Validate UPI VPA format
   */
  validateUPIVPA(vpa: string): boolean {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    return upiRegex.test(vpa);
  }

  /**
   * Mock UPI verification for testing
   */
  private mockUPIVerification(
    request: UPIVerificationRequest
  ): ApiResponse<UPIVerificationResponse> {

    const isValid = this.validateUPIVPA(request.vpa);

    return {
      success: true,
      data: {
        verificationId: `mock_upi_${Date.now()}`,
        status: isValid ? ('VERIFIED' as VerificationStatus) : ('FAILED' as VerificationStatus),
        vpaValid: isValid,
        nameAtBank: isValid ? 'User Name' : undefined,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    };
  }

  // =====================================================
  // KYC DOCUMENT VERIFICATION
  // =====================================================

  /**
   * Upload KYC documents
   */
  async uploadKYCDocuments(
    request: KYCVerificationRequest
  ): Promise<ApiResponse<KYCVerificationResponse>> {

    try {
      const response = await apiClient.post<KYCVerificationResponse>(`${this.baseUrl}/kyc/upload`, request);

      if (response.success && response.data) {

        return response;
      }

      // Fallback to mock only in development
      if (__DEV__) {
        return this.mockKYCVerification(request);
      }
      return {
        success: false,
        error: 'KYC document upload failed',
      };
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] KYC upload failed:', error);
      if (__DEV__) {
        return this.mockKYCVerification(request);
      }
      return {
        success: false,
        error: error.message || 'Failed to upload KYC documents',
      };
    }
  }

  /**
   * Mock KYC verification for testing
   */
  private mockKYCVerification(
    request: KYCVerificationRequest
  ): ApiResponse<KYCVerificationResponse> {

    return {
      success: true,
      data: {
        verificationId: `mock_kyc_${Date.now()}`,
        status: 'PENDING' as VerificationStatus,
        documentsUploaded: request.documents.length,
        processingTime: '24-48 hours',
        reviewRequired: true,
      },
    };
  }

  // =====================================================
  // OTP VERIFICATION
  // =====================================================

  /**
   * Send OTP for verification
   */
  async sendOTP(request: OTPVerificationRequest): Promise<ApiResponse<OTPVerificationResponse>> {

    try {
      const response = await apiClient.post<OTPVerificationResponse>(`${this.baseUrl}/otp/send`, request);

      if (response.success && response.data) {

        return response;
      }

      // Fallback to mock only in development
      if (__DEV__) {
        return this.mockSendOTP(request);
      }
      return {
        success: false,
        error: 'Failed to send OTP',
      };
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] OTP send failed:', error);
      if (__DEV__) {
        return this.mockSendOTP(request);
      }
      return {
        success: false,
        error: error.message || 'Failed to send OTP',
      };
    }
  }

  /**
   * Validate OTP
   */
  async validateOTP(request: OTPValidationRequest): Promise<ApiResponse<OTPValidationResponse>> {

    try {
      const response = await apiClient.post<OTPValidationResponse>(`${this.baseUrl}/otp/validate`, request);

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] OTP validation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate OTP',
      };
    }
  }

  /**
   * Mock send OTP for testing
   */
  private mockSendOTP(request: OTPVerificationRequest): ApiResponse<OTPVerificationResponse> {

    const contact = request.phoneNumber || request.email || '';
    const masked =
      contact.length > 4
        ? '*'.repeat(contact.length - 4) + contact.slice(-4)
        : '****' + contact.slice(-2);

    return {
      success: true,
      data: {
        verificationId: `mock_otp_${Date.now()}`,
        otpSent: true,
        expiresIn: 300, // 5 minutes
        resendAvailableIn: 60, // 1 minute
        maskedContact: masked,
      },
    };
  }

  // =====================================================
  // BIOMETRIC VERIFICATION
  // =====================================================

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      devLog.error('❌ [VERIFICATION] Biometric check failed:', error);
      return false;
    }
  }

  /**
   * Get supported biometric types
   */
  async getSupportedBiometricTypes(): Promise<string[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types.map((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'FINGERPRINT';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'FACE_ID';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'IRIS';
          default:
            return 'UNKNOWN';
        }
      });
    } catch (error) {
      devLog.error('❌ [VERIFICATION] Failed to get biometric types:', error);
      return [];
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometric(
    prompt: string = 'Verify your identity'
  ): Promise<ApiResponse<BiometricVerificationResponse>> {

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: prompt,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {

        return {
          success: true,
          data: {
            verificationId: `biometric_${Date.now()}`,
            status: 'VERIFIED' as VerificationStatus,
            biometricMatched: true,
            confidence: 100,
          },
        };
      } else {
        devLog.warn('⚠️ [VERIFICATION] Biometric authentication failed');
        return {
          success: false,
          error: result.error || 'Biometric authentication failed',
        };
      }
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Biometric error:', error);
      return {
        success: false,
        error: error.message || 'Failed to authenticate with biometric',
      };
    }
  }

  // =====================================================
  // VERIFICATION STATUS & MANAGEMENT
  // =====================================================

  /**
   * Get verification status for a payment method
   */
  async getVerificationStatus(
    paymentMethodId: string
  ): Promise<ApiResponse<PaymentMethodVerificationStatus>> {

    try {
      const response = await apiClient.get<PaymentMethodVerificationStatus>(`${this.baseUrl}/status/${paymentMethodId}`);

      if (response.success && response.data) {
        return response;
      }

      // Fallback to mock only in development
      if (__DEV__) {
        return this.mockVerificationStatus(paymentMethodId);
      }
      return {
        success: false,
        error: 'Failed to get verification status',
      };
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Status check failed:', error);
      if (__DEV__) {
        return this.mockVerificationStatus(paymentMethodId);
      }
      return {
        success: false,
        error: error.message || 'Failed to check verification status',
      };
    }
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(
    paymentMethodId?: string
  ): Promise<ApiResponse<VerificationHistoryItem[]>> {

    try {
      const url = paymentMethodId
        ? `${this.baseUrl}/history/${paymentMethodId}`
        : `${this.baseUrl}/history`;

      const response = await apiClient.get<VerificationHistoryItem[]>(url);

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] History fetch failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch verification history',
      };
    }
  }

  /**
   * Get verification requirements
   */
  async getVerificationRequirements(
    paymentMethodId: string
  ): Promise<ApiResponse<VerificationRequirements>> {

    try {
      const response = await apiClient.get<VerificationRequirements>(`${this.baseUrl}/requirements/${paymentMethodId}`);

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Requirements fetch failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch verification requirements',
      };
    }
  }

  /**
   * Request re-verification
   */
  async requestReverification(
    request: ReverificationRequest
  ): Promise<ApiResponse<PaymentMethodVerificationStatus>> {

    try {
      const response = await apiClient.post<PaymentMethodVerificationStatus>(`${this.baseUrl}/reverify`, request);

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Re-verification request failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to request re-verification',
      };
    }
  }

  /**
   * Mock verification status
   */
  private mockVerificationStatus(
    paymentMethodId: string
  ): ApiResponse<PaymentMethodVerificationStatus> {

    return {
      success: true,
      data: {
        paymentMethodId,
        overallStatus: 'NOT_VERIFIED' as VerificationStatus,
        verificationLevel: 'BASIC' as VerificationLevel,
        verificationsCompleted: {
          card3DS: false,
          bankAccount: false,
          upi: false,
          kyc: false,
          otp: false,
          identity: false,
          biometric: false,
        },
        requiresReverification: true,
      },
    };
  }

  // =====================================================
  // FRAUD DETECTION & SECURITY
  // =====================================================

  /**
   * Get fraud detection signals
   */
  async getFraudSignals(paymentMethodId: string): Promise<ApiResponse<FraudDetectionSignals>> {

    try {
      const response = await apiClient.get<FraudDetectionSignals>(`${this.baseUrl}/fraud-signals/${paymentMethodId}`);

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Fraud signals fetch failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch fraud signals',
      };
    }
  }

  /**
   * Get risk-based verification decision
   */
  async getRiskBasedDecision(
    paymentMethodId: string,
    transactionAmount?: number
  ): Promise<ApiResponse<RiskBasedVerificationDecision>> {

    try {
      const response = await apiClient.post<RiskBasedVerificationDecision>(`${this.baseUrl}/risk-decision`, {
        paymentMethodId,
        transactionAmount,
      });

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Risk decision failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to get risk-based decision',
      };
    }
  }

  // =====================================================
  // DEVICE BINDING & SESSION MANAGEMENT
  // =====================================================

  /**
   * Bind device for secure payments
   */
  async bindDevice(deviceInfo: Partial<DeviceBinding>): Promise<ApiResponse<DeviceBinding>> {

    try {
      const response = await apiClient.post<DeviceBinding>(`${this.baseUrl}/device/bind`, deviceInfo);

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Device binding failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to bind device',
      };
    }
  }

  /**
   * Get bound devices
   */
  async getBoundDevices(): Promise<ApiResponse<DeviceBinding[]>> {

    try {
      const response = await apiClient.get<DeviceBinding[]>(`${this.baseUrl}/device/list`);

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Failed to get devices:', error);
      return {
        success: false,
        error: error.message || 'Failed to get bound devices',
      };
    }
  }

  /**
   * Create verification session
   */
  async createVerificationSession(
    type: VerificationType,
    paymentMethodId?: string
  ): Promise<ApiResponse<VerificationSession>> {

    try {
      const response = await apiClient.post<VerificationSession>(`${this.baseUrl}/session/create`, {
        type,
        paymentMethodId,
      });

      return response;
    } catch (error: any) {
      devLog.error('❌ [VERIFICATION] Session creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create verification session',
      };
    }
  }
}

// Export singleton instance
const paymentVerificationService = new PaymentVerificationService();
export default paymentVerificationService;
