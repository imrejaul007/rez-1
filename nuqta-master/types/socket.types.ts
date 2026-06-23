/**
 * Socket.IO Event Types
 * These types match the backend Socket.IO events for real-time stock updates
 */

// Stock status levels
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

// Base stock update event payload
export interface StockUpdatePayload {
  productId: string;
  storeId: string;
  quantity: number;
  status: StockStatus;
  previousQuantity?: number;
  timestamp: string;
}

// Low stock event payload
export interface LowStockPayload {
  productId: string;
  storeId: string;
  storeName: string;
  productName: string;
  quantity: number;
  threshold: number;
  timestamp: string;
}

// Out of stock event payload
export interface OutOfStockPayload {
  productId: string;
  storeId: string;
  storeName: string;
  productName: string;
  timestamp: string;
}

// Price update event payload
export interface PriceUpdatePayload {
  productId: string;
  storeId: string;
  oldPrice: number;
  newPrice: number;
  discountPercentage?: number;
  timestamp: string;
}

// Product availability event payload
export interface ProductAvailabilityPayload {
  productId: string;
  storeId: string;
  isAvailable: boolean;
  reason?: string;
  timestamp: string;
}

// Flash sale event payloads
export interface FlashSaleStartedPayload {
  flashSaleId: string;
  title: string;
  discountPercentage: number;
  endTime: Date;
  timestamp: string;
}

export interface FlashSaleEndingSoonPayload {
  flashSaleId: string;
  title: string;
  endTime: Date;
  remainingQuantity: number;
  timestamp: string;
}

export interface FlashSaleEndedPayload {
  flashSaleId: string;
  title: string;
  timestamp: string;
}

export interface FlashSaleStockUpdatedPayload {
  flashSaleId: string;
  soldQuantity: number;
  remainingQuantity: number;
  progress: number;
  timestamp: string;
}

export interface FlashSaleStockLowPayload {
  flashSaleId: string;
  title: string;
  remainingQuantity: number;
  progress: number;
  timestamp: string;
}

export interface FlashSaleSoldOutPayload {
  flashSaleId: string;
  title: string;
  timestamp: string;
}

// Socket event names (must match backend)
export const SocketEvents = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',

  // Stock events
  STOCK_UPDATED: 'stock:updated',
  STOCK_LOW: 'stock:low',
  STOCK_OUT: 'stock:outofstock',

  // Price events
  PRICE_UPDATED: 'price:updated',

  // Product events
  PRODUCT_AVAILABILITY: 'product:availability',

  // Subscription events (client -> server)
  SUBSCRIBE_PRODUCT: 'subscribe:product',
  UNSUBSCRIBE_PRODUCT: 'unsubscribe:product',
  SUBSCRIBE_STORE: 'subscribe:store',
  UNSUBSCRIBE_STORE: 'unsubscribe:store',

  // Flash sale events
  FLASH_SALE_STARTED: 'flashsale:started',
  FLASH_SALE_ENDING_SOON: 'flashsale:ending_soon',
  FLASH_SALE_ENDED: 'flashsale:ended',
  FLASH_SALE_STOCK_UPDATED: 'flashsale:stock_updated',
  FLASH_SALE_STOCK_LOW: 'flashsale:stock_low',
  FLASH_SALE_SOLD_OUT: 'flashsale:sold_out',
  FLASH_SALE_UPDATED: 'flashsale:updated',

  // Messaging events (imported from messaging.types.ts)
  MESSAGE_SENT: 'message:sent',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  MESSAGE_FAILED: 'message:failed',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  CONVERSATION_CREATED: 'conversation:created',
  CONVERSATION_UPDATED: 'conversation:updated',
  CONVERSATION_ARCHIVED: 'conversation:archived',
  CONVERSATION_CLOSED: 'conversation:closed',
  STORE_ONLINE: 'store:online',
  STORE_OFFLINE: 'store:offline',
  STORE_JOINED_CONVERSATION: 'store:joined',
  STORE_LEFT_CONVERSATION: 'store:left',
  JOIN_CONVERSATION: 'join:conversation',
  LEAVE_CONVERSATION: 'leave:conversation',

  // Leaderboard events
  LEADERBOARD_UPDATE: 'leaderboard:update',
  LEADERBOARD_USER_SCORED: 'leaderboard:user_scored',
  LEADERBOARD_RANK_CHANGE: 'leaderboard:rank_change',

  // Social feed events
  SOCIAL_NEW_POST: 'social:new_post',
  SOCIAL_LIKE: 'social:like',
  SOCIAL_COMMENT: 'social:comment',
  SOCIAL_FOLLOW: 'social:follow',
} as const;

// Socket connection state
export interface SocketState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

// Socket configuration
export interface SocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

// Stock subscription options
export interface SubscriptionOptions {
  productId?: string;
  storeId?: string;
}

// Callback types for event listeners
export type StockUpdateCallback = (payload: StockUpdatePayload) => void;
export type LowStockCallback = (payload: LowStockPayload) => void;
export type OutOfStockCallback = (payload: OutOfStockPayload) => void;
export type PriceUpdateCallback = (payload: PriceUpdatePayload) => void;
export type ProductAvailabilityCallback = (payload: ProductAvailabilityPayload) => void;
export type ConnectionCallback = () => void;
export type ErrorCallback = (error: Error) => void;

// Flash sale callback types
export type FlashSaleStartedCallback = (payload: FlashSaleStartedPayload) => void;
export type FlashSaleEndingSoonCallback = (payload: FlashSaleEndingSoonPayload) => void;
export type FlashSaleEndedCallback = (payload: FlashSaleEndedPayload) => void;
export type FlashSaleStockUpdatedCallback = (payload: FlashSaleStockUpdatedPayload) => void;
export type FlashSaleStockLowCallback = (payload: FlashSaleStockLowPayload) => void;
export type FlashSaleSoldOutCallback = (payload: FlashSaleSoldOutPayload) => void;

// Leaderboard event payloads
export interface LeaderboardUpdatePayload {
  userId: string;
  username: string;
  fullName: string;
  coins: number;
  rank: number;
  previousRank?: number;
  timestamp: string;
}

export interface LeaderboardUserScoredPayload {
  userId: string;
  username: string;
  fullName: string;
  coinsEarned: number;
  newTotal: number;
  source: string;
  timestamp: string;
}

export interface LeaderboardRankChangePayload {
  userId: string;
  username: string;
  fullName: string;
  oldRank: number;
  newRank: number;
  coins: number;
  direction: 'up' | 'down';
  timestamp: string;
}

// Social feed event payloads
export interface SocialNewPostPayload {
  activityId: string;
  userId: string;
  username: string;
  type: string;
  content: any;
  timestamp: string;
}

export interface SocialLikePayload {
  activityId: string;
  userId: string;
  username: string;
  likesCount: number;
  timestamp: string;
}

export interface SocialCommentPayload {
  activityId: string;
  commentId: string;
  userId: string;
  username: string;
  comment: string;
  commentsCount: number;
  timestamp: string;
}

export interface SocialFollowPayload {
  followerId: string;
  followingId: string;
  followerName: string;
  timestamp: string;
}

// Leaderboard callback types
export type LeaderboardUpdateCallback = (payload: LeaderboardUpdatePayload) => void;
export type LeaderboardUserScoredCallback = (payload: LeaderboardUserScoredPayload) => void;
export type LeaderboardRankChangeCallback = (payload: LeaderboardRankChangePayload) => void;

// Social callback types
export type SocialNewPostCallback = (payload: SocialNewPostPayload) => void;
export type SocialLikeCallback = (payload: SocialLikePayload) => void;
export type SocialCommentCallback = (payload: SocialCommentPayload) => void;
export type SocialFollowCallback = (payload: SocialFollowPayload) => void;