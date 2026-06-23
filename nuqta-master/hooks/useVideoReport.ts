import { useState } from 'react';
import { realVideosApi } from '@/services/realVideosApi';
import { ReportReason, ReportState, ReportSubmission, ReportResponse } from '@/types/report.types';

/**
 * Hook for managing video report submissions
 * Handles API calls, loading states, and error handling
 */
export function useVideoReport() {
  const [state, setState] = useState<ReportState>({
    isSubmitting: false,
    error: null,
    success: false,
  });

  /**
   * Submit a video report
   */
  const submitReport = async (
    videoId: string,
    reason: ReportReason,
    details?: string
  ): Promise<ReportResponse | null> => {
    // Reset state
    setState({
      isSubmitting: true,
      error: null,
      success: false,
    });

    try {
      // Validate inputs
      if (!videoId) {
        throw new Error('Video ID is required');
      }

      if (!reason) {
        throw new Error('Report reason is required');
      }

      // Validate details length if provided
      if (details && details.length > 500) {
        throw new Error('Additional details must be 500 characters or less');
      }

      // Make API call
      const response = await realVideosApi.reportVideo(videoId, reason, details);

      if (!response.success) {
        throw new Error(response.message || 'Failed to submit report');
      }

      // Update state on success
      setState({
        isSubmitting: false,
        error: null,
        success: true,
      });

      return response.data;
    } catch (error: any) {
      // Handle specific error cases
      let errorMessage = 'Something went wrong. Please try again later.';

      if (error.response) {
        // Server responded with error
        const status = error.response.status;
        const message = error.response.data?.message;

        if (status === 400 && message?.includes('already reported')) {
          errorMessage = "You've already reported this video.";
        } else if (status === 404) {
          errorMessage = 'Video not found.';
        } else if (status === 401) {
          errorMessage = 'Please sign in to report videos.';
        } else if (status === 429) {
          errorMessage = 'Too many requests. Please try again later.';
        } else if (message) {
          errorMessage = message;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Failed to submit report. Please check your connection.';
      } else if (error.message) {
        // Validation or other error
        errorMessage = error.message;
      }

      setState({
        isSubmitting: false,
        error: errorMessage,
        success: false,
      });

      return null;
    }
  };

  /**
   * Reset the state
   */
  const reset = () => {
    setState({
      isSubmitting: false,
      error: null,
      success: false,
    });
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  };

  return {
    ...state,
    submitReport,
    reset,
    clearError,
  };
}

/**
 * Hook with pre-filled video ID for convenience
 */
export function useVideoReportById(videoId: string) {
  const { submitReport, ...rest } = useVideoReport();

  const submit = async (reason: ReportReason, details?: string) => {
    return submitReport(videoId, reason, details);
  };

  return {
    ...rest,
    submit,
  };
}

export default useVideoReport;
