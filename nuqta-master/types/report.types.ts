/**
 * Report Types for UGC Video Reporting System
 * Used for reporting inappropriate or problematic video content
 */

/**
 * Valid report reasons
 */
export type ReportReason = 'inappropriate' | 'misleading' | 'spam' | 'copyright' | 'other';

/**
 * Report reason configuration for UI display
 */
export interface ReportReasonConfig {
  value: ReportReason;
  label: string;
  description: string;
}

/**
 * Report submission data
 */
export interface ReportSubmission {
  videoId: string;
  reason: ReportReason;
  details?: string;
}

/**
 * Report API response
 */
export interface ReportResponse {
  videoId: string;
  reportCount: number;
  isReported: boolean;
}

/**
 * Props for ReportModal component
 */
export interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle?: string;
  onReportSuccess?: () => void;
}

/**
 * Report state for hook
 */
export interface ReportState {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Available report reasons with labels and descriptions
 */
export const REPORT_REASONS: ReportReasonConfig[] = [
  {
    value: 'inappropriate',
    label: 'Inappropriate content',
    description: 'Contains offensive or adult content',
  },
  {
    value: 'misleading',
    label: 'Misleading information',
    description: 'False or deceptive information',
  },
  {
    value: 'spam',
    label: 'Spam or scam',
    description: 'Unwanted promotional content',
  },
  {
    value: 'copyright',
    label: 'Copyright violation',
    description: 'Infringes on intellectual property',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other reasons not listed above',
  },
];
