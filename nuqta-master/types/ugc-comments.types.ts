// UGC Comments Types
// TypeScript interfaces for UGC comments system

/**
 * Comment interface with nested replies
 */
export interface UGCComment {
  id: string;
  contentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  likeCount: number;
  isLiked: boolean;
  replies?: UGCComment[];
  replyCount?: number;
  parentCommentId?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * UGC content preview for modal header
 */
export interface UGCContentPreview {
  id: string;
  type: 'photo' | 'video';
  thumbnail: string;
  authorName: string;
  authorAvatar?: string;
  caption?: string;
}

/**
 * Props for UGCCommentsModal component
 */
export interface UGCCommentsModalProps {
  visible: boolean;
  content: UGCContentPreview;
  onClose: () => void;
}

/**
 * Comment form state
 */
export interface CommentFormState {
  text: string;
  replyingTo: UGCComment | null;
  isSubmitting: boolean;
}

/**
 * Comments pagination state
 */
export interface CommentsPaginationState {
  page: number;
  limit: number;
  hasMore: boolean;
  total: number;
}

/**
 * API request for posting comment
 */
export interface PostCommentRequest {
  contentId: string;
  text: string;
  parentCommentId?: string;
}

/**
 * API response for comments list
 */
export interface GetCommentsResponse {
  comments: UGCComment[];
  total: number;
  hasMore: boolean;
  page: number;
}

/**
 * API response for posting comment
 */
export interface PostCommentResponse {
  comment: UGCComment;
  message: string;
}

/**
 * API response for liking comment
 */
export interface LikeCommentResponse {
  isLiked: boolean;
  likeCount: number;
}

/**
 * Comment constants
 */
export const COMMENT_CONSTANTS = {
  MAX_LENGTH: 500,
  MIN_LENGTH: 1,
  REPLIES_MAX_DEPTH: 1, // Only one level of nesting
  PAGE_SIZE: 20,
  REPLY_PREVIEW_LIMIT: 2, // Show 2 replies, then "View more"
} as const;

/**
 * Time formatter helper type
 */
export type TimeAgoFormat =
  | 'just_now'
  | 'seconds_ago'
  | 'minutes_ago'
  | 'hours_ago'
  | 'days_ago'
  | 'weeks_ago'
  | 'months_ago'
  | 'years_ago';
