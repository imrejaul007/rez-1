// Group Buying TypeScript Definitions

export interface GroupBuyingProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  discountTiers: DiscountTier[];
  minMembers: number;
  maxMembers: number;
  expiryDuration: number; // in hours
  category: string;
  storeId: string;
  storeName: string;
  stockAvailable: number;
  termsAndConditions?: string;
}

export interface DiscountTier {
  minMembers: number;
  maxMembers?: number;
  discountPercentage: number;
  pricePerUnit: number;
}

export interface GroupBuyingGroup {
  id: string;
  productId: string;
  product: GroupBuyingProduct;
  code: string; // Unique invite code
  creatorId: string;
  creator: GroupMember;
  members: GroupMember[];
  currentMemberCount: number;
  maxMembers: number;
  minMembers: number;
  currentTier: DiscountTier;
  status: GroupStatus;
  createdAt: Date;
  expiresAt: Date;
  closedAt?: Date;
  totalSavings: number;
  individualPrice: number;
  messages: GroupMessage[];
}

export type GroupStatus =
  | 'active'
  | 'filling'
  | 'ready'
  | 'closed'
  | 'expired'
  | 'processing'
  | 'completed'
  | 'cancelled';

export interface GroupMember {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: Date;
  quantity: number;
  isPaid: boolean;
  orderStatus?: MemberOrderStatus;
}

export type MemberOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  type: 'text' | 'system' | 'notification';
  createdAt: Date;
}

export interface CreateGroupRequest {
  productId: string;
  quantity: number;
  message?: string;
}

export interface JoinGroupRequest {
  groupCode?: string;
  // Some call sites (e.g. services/groupBuyingApi.joinDeal) use `groupId`
  // when joining by an internal id rather than a join code.
  groupId?: string;
  quantity: number;
  referralCode?: string;
}

export interface GroupCheckoutRequest {
  groupId: string;
  paymentMethod: 'card' | 'upi' | 'wallet' | 'cod';
  deliveryAddressId: string;
}

export interface GroupBuyingStats {
  totalGroups: number;
  activeGroups: number;
  completedGroups: number;
  totalSavings: number;
  averageDiscount: number;
  popularProducts: GroupBuyingProduct[];
}

// Real-time events
export interface GroupUpdatePayload {
  groupId: string;
  type: 'member_joined' | 'member_left' | 'tier_changed' | 'status_changed' | 'message' | 'expired';
  data: any;
  timestamp: Date;
}

export interface GroupNotification {
  id: string;
  groupId: string;
  type: 'member_joined' | 'member_left' | 'tier_reached' | 'almost_full' | 'ready' | 'expired' | 'completed';
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
}

// Hook state
export interface GroupBuyingState {
  myGroups: GroupBuyingGroup[];
  availableGroups: GroupBuyingGroup[];
  currentGroup: GroupBuyingGroup | null;
  availableProducts: GroupBuyingProduct[];
  stats: GroupBuyingStats | null;
  loading: boolean;
  error: string | null;
  notifications: GroupNotification[];
}

// Socket events
export enum GroupBuyingSocketEvents {
  JOIN_GROUP_ROOM = 'groupbuying:join',
  LEAVE_GROUP_ROOM = 'groupbuying:leave',
  GROUP_UPDATE = 'groupbuying:update',
  MEMBER_JOINED = 'groupbuying:member_joined',
  MEMBER_LEFT = 'groupbuying:member_left',
  TIER_CHANGED = 'groupbuying:tier_changed',
  GROUP_READY = 'groupbuying:ready',
  GROUP_EXPIRED = 'groupbuying:expired',
  NEW_MESSAGE = 'groupbuying:message',
  SEND_MESSAGE = 'groupbuying:send_message',
}

// Share data
export interface GroupShareData {
  groupCode: string;
  productName: string;
  currentDiscount: number;
  spotsLeft: number;
  expiresAt: Date;
  shareUrl: string;
  shareText: string;
}

// Filter options
export interface GroupBuyingFilters {
  category?: string;
  minDiscount?: number;
  maxPrice?: number;
  spotsAvailable?: boolean;
  expiringWithin?: number; // hours
  sortBy?: 'newest' | 'ending_soon' | 'most_popular' | 'highest_discount';
}

// API Response types
export interface GroupBuyingApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ListGroupsResponse {
  groups: GroupBuyingGroup[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface ListProductsResponse {
  products: GroupBuyingProduct[];
  totalCount: number;
  page: number;
  limit: number;
}
