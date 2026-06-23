// Use Bill Verification Hook
// Manages bill verification workflow state

import { useState, useCallback } from 'react';
import * as billVerificationServiceModule from '@/services/billVerificationService';

const billVerificationService = billVerificationServiceModule as any;
import {
  BillVerificationWorkflow,
  BillVerificationState,
  OCRExtractedData,
  MerchantMatch,
  ManualCorrectionData,
  BillImageAnalysis,
} from '@/types/billVerification.types';

export interface UseBillVerificationReturn {
  // State
  workflow: BillVerificationWorkflow | null;
  isProcessing: boolean;
  error: string | null;

  // Actions
  startVerification: (imageUri: string) => Promise<void>;
  applyManualCorrections: (corrections: ManualCorrectionData) => Promise<void>;
  selectMerchant: (merchant: MerchantMatch) => void;
  submitBill: () => Promise<boolean>;
  reset: () => void;

  // Helpers
  canProceed: boolean;
  currentStepMessage: string;
  progressPercentage: number;
  estimatedCashback: number;
  hasErrors: boolean;
  requiresUserInput: boolean;
}

export function useBillVerification(): UseBillVerificationReturn {
  const [workflow, setWorkflow] = useState<BillVerificationWorkflow | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start verification workflow
   */
  const startVerification = useCallback(async (imageUri: string) => {
    setIsProcessing(true);
    setError(null);

    try {

      const result = await billVerificationService.performCompleteVerification(imageUri);

      if (result.success && result.data) {
        setWorkflow(result.data);

      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Apply manual corrections and re-verify
   */
  const applyManualCorrections = useCallback(
    async (corrections: ManualCorrectionData) => {
      if (!workflow) {
        setError('No workflow in progress');
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {

        // Re-run verification with corrections
        const result = await billVerificationService.performCompleteVerification(
          workflow.imageUri,
          corrections
        );
        
        if (result.success && result.data) {
          setWorkflow(result.data);

        } else {
          setError(result.error || 'Failed to apply corrections');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [workflow]
  );

  /**
   * Select a merchant manually
   */
  const selectMerchant = useCallback(
    (merchant: MerchantMatch) => {
      if (!workflow) return;

      setWorkflow({
        ...workflow,
        selectedMerchant: merchant,
      });
    },
    [workflow]
  );

  /**
   * Submit verified bill
   */
  const submitBill = useCallback(async (): Promise<boolean> => {
    if (!workflow) {
      setError('No workflow to submit');
      return false;
    }

    if (!workflow.canSubmit) {
      setError('Bill cannot be submitted. Please fix errors first.');
      return false;
    }

    setIsProcessing(true);
    setError(null);

    try {

      const result = await billVerificationService.submitVerifiedBill(workflow);

      if (result.success) {

        return true;
      } else {
        setError(result.error || 'Submission failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [workflow]);

  /**
   * Reset workflow
   */
  const reset = useCallback(() => {

    setWorkflow(null);
    setIsProcessing(false);
    setError(null);
  }, []);

  // Computed values
  const canProceed = workflow?.canSubmit || false;
  const currentStepMessage = workflow?.currentState.message || '';
  const progressPercentage = workflow?.currentState.progress || 0;
  const estimatedCashback = workflow?.cashbackCalculation?.finalCashback || 0;
  const hasErrors = (workflow?.errors.length || 0) > 0;
  const requiresUserInput =
    workflow?.currentState.status === 'user_verification' ||
    workflow?.currentState.status === 'merchant_matching';

  return {
    // State
    workflow,
    isProcessing,
    error,

    // Actions
    startVerification,
    applyManualCorrections,
    selectMerchant,
    submitBill,
    reset,

    // Helpers
    canProceed,
    currentStepMessage,
    progressPercentage,
    estimatedCashback,
    hasErrors,
    requiresUserInput,
  };
}

export default useBillVerification;
