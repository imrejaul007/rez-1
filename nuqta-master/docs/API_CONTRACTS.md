# API CONTRACTS

**TypeScript Interfaces for All Backend API Requests and Responses**

This document contains all TypeScript types, interfaces, and validation schemas that the backend should implement to match the frontend expectations.

---

## Table of Contents

1. [Common Types](#common-types)
2. [Authentication](#authentication)
3. [Products & Categories](#products--categories)
4. [Cart & Orders](#cart--orders)
5. [Group Buying](#group-buying)
6. [Store Messaging](#store-messaging)
7. [Support Chat](#support-chat)
8. [Bill Verification](#bill-verification)
9. [Loyalty & Redemption](#loyalty--redemption)
10. [Payment Verification](#payment-verification)
11. [Social Media](#social-media)
12. [Wishlist & Sharing](#wishlist--sharing)
13. [Follow System](#follow-system)
14. [Error Codes](#error-codes)

---

## Common Types

```typescript
// Base API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: { [key: string]: string[] };
}

// Pagination
export interface Pagination {
  current: number;
  pages: number;
  total: number;
  limit: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// Timestamps
export interface Timestamps {
  createdAt: string;  // ISO 8601 format
  updatedAt: string;  // ISO 8601 format
}

// Location
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

// Image
export interface Image {
  id: string;
  url: string;
  alt?: string;
  isMain?: boolean;
  width?: number;
  height?: number;
}

// Address
export interface Address {
  name: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  landmark?: string;
  addressType?: 'home' | 'work' | 'other';
  isDefault?: boolean;
}
```

---

## Authentication

```typescript
// User Profile
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  dateOfBirth?: string;  // ISO date
  gender?: 'male' | 'female' | 'other';
  location?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number];  // [longitude, latitude]
  };
}

// User Preferences
export interface UserPreferences {
  language?: string;
  theme?: 'light' | 'dark';
  notifications?: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  };
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  categories?: string[];  // Preferred category IDs
}

// Wallet
export interface Wallet {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  pendingAmount: number;
}

// User
export interface User extends Timestamps {
  id: string;
  phoneNumber: string;
  email?: string;
  profile: UserProfile;
  preferences: UserPreferences;
  wallet: Wallet;
  role: 'user' | 'admin' | 'merchant';
  isVerified: boolean;
  isOnboarded: boolean;
}

// Auth Tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // seconds
}

// Auth Response
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Send OTP Request
export interface SendOtpRequest {
  phoneNumber: string;
  email?: string;
  referralCode?: string;
}

// Send OTP Response
export interface SendOtpResponse {
  message: string;
  expiresIn: number;  // seconds
}

// Verify OTP Request
export interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
}

// Refresh Token Request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// Refresh Token Response
export interface RefreshTokenResponse {
  tokens: AuthTokens;
}
```

---

## Products & Categories

```typescript
// Product Category
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  parentId?: string;
  level: number;
  order: number;
  isActive: boolean;
  productCount: number;
}

// Product Variant
export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  inventory: {
    quantity: number;
    trackQuantity: boolean;
    allowBackorder: boolean;
  };
  attributes: {
    size?: string;
    color?: string;
    material?: string;
    [key: string]: any;
  };
  isAvailable: boolean;
}

// Product Pricing
export interface ProductPricing {
  basePrice: number;
  salePrice?: number;
  discount?: number;
  discountPercentage?: number;
  finalPrice: number;
  currency: string;
  taxable: boolean;
  taxRate?: number;
}

// Product Ratings
export interface ProductRatings {
  average: number;
  count: number;
  breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// Store Info
export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  rating?: number;
  location?: {
    address: string;
    city: string;
    state: string;
    coordinates?: [number, number];
  };
  isVerified?: boolean;
}

// Product
export interface Product extends Timestamps {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  category: Category;
  store: StoreInfo;
  variants: ProductVariant[];
  images: Image[];
  tags: string[];
  status: 'active' | 'draft' | 'archived';
  visibility: 'public' | 'private' | 'hidden';
  pricing: ProductPricing;
  ratings: ProductRatings;
  inventory: {
    stock: number;
    isAvailable: boolean;
    lowStockThreshold?: number;
  };
  seo: {
    title: string;
    description: string;
    slug: string;
    keywords?: string[];
  };
  specifications?: {
    [key: string]: string;
  };
  shipping?: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    freeShipping: boolean;
  };
}

// Product List Response
export interface ProductsResponse {
  products: Product[];
  pagination: Pagination;
  filters: {
    categories: Array<{ id: string; name: string; count: number }>;
    stores: Array<{ id: string; name: string; count: number }>;
    priceRange: { min: number; max: number };
    tags: Array<{ name: string; count: number }>;
  };
}

// Product Search Request
export interface ProductSearchRequest {
  q: string;  // query
  page?: number;
  limit?: number;
  category?: string;
  store?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'name' | 'price' | 'rating' | 'popularity' | 'newest';
  order?: 'asc' | 'desc';
}

// Product Search Response
export interface ProductSearchResponse {
  products: Product[];
  suggestions: string[];
  filters: Array<{
    name: string;
    type: 'category' | 'brand' | 'price' | 'rating';
    options: Array<{
      value: string;
      label: string;
      count: number;
    }>;
  }>;
  pagination: Pagination;
  query: string;
  searchTime: number;  // milliseconds
}
```

---

## Cart & Orders

```typescript
// Cart Item
export interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    images: Image[];
    pricing: ProductPricing;
    inventory: {
      stock: number;
      isAvailable: boolean;
    };
    isActive: boolean;
  };
  store: {
    id: string;
    name: string;
    location?: {
      address: string;
      city: string;
      state: string;
    };
  };
  variant?: {
    type?: string;
    value?: string;
  };
  quantity: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  addedAt: string;
}

// Locked Cart Item
export interface LockedCartItem {
  id: string;
  product: CartItem['product'];
  store: CartItem['store'];
  variant?: CartItem['variant'];
  quantity: number;
  lockedPrice: number;
  originalPrice?: number;
  lockedAt: string;
  expiresAt: string;
  notes?: string;
}

// Cart Totals
export interface CartTotals {
  subtotal: number;
  tax: number;
  delivery: number;
  discount: number;
  cashback: number;
  total: number;
  savings: number;
}

// Cart Coupon
export interface CartCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliedAmount: number;
  appliedAt: string;
}

// Cart
export interface Cart extends Timestamps {
  id: string;
  user: string;  // user ID
  items: CartItem[];
  lockedItems: LockedCartItem[];
  totals: CartTotals;
  coupon?: CartCoupon;
  itemCount: number;
  storeCount: number;
  isActive: boolean;
  expiresAt: string;
}

// Add to Cart Request
export interface AddToCartRequest {
  productId: string;
  quantity: number;
  variant?: {
    type: string;
    value: string;
  };
}

// Update Cart Item Request
export interface UpdateCartItemRequest {
  quantity: number;
}

// Apply Coupon Request
export interface ApplyCouponRequest {
  couponCode: string;
}

// Lock Item Request
export interface LockItemRequest {
  productId: string;
  quantity?: number;
  variant?: {
    type: string;
    value: string;
  };
  lockDurationHours?: number;
}

// Order Item
export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  product: {
    id: string;
    name: string;
    description: string;
    images: Image[];
    store: {
      id: string;
      name: string;
    };
  };
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Order Totals
export interface OrderTotals {
  subtotal: number;
  tax: number;
  delivery: number;
  discount: number;
  cashback: number;
  total: number;
  paidAmount: number;
  refundAmount: number;
}

// Order Payment
export interface OrderPayment {
  method: 'cod' | 'wallet' | 'card' | 'upi' | 'netbanking';
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  transactionId?: string;
  paidAt?: string;
}

// Order Delivery
export interface OrderDelivery {
  method: 'standard' | 'express' | 'pickup';
  status: 'pending' | 'confirmed' | 'dispatched' | 'out_for_delivery' | 'delivered';
  address: Address;
  deliveryFee: number;
  estimatedDelivery?: string;
  actualDelivery?: string;
  attempts: Array<{
    attemptNumber: number;
    status: 'failed' | 'partial' | 'success';
    timestamp: string;
    reason?: string;
  }>;
}

// Order Timeline Entry
export interface OrderTimelineEntry {
  status: string;
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

// Order
export interface Order extends Timestamps {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' |
          'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded' |
          'pending' | 'processing' | 'shipped';
  paymentStatus: OrderPayment['status'];
  items: OrderItem[];
  totals: OrderTotals;
  payment: OrderPayment;
  delivery: OrderDelivery;
  timeline: OrderTimelineEntry[];
  coupon?: {
    code: string;
    discountAmount: number;
  };
  specialInstructions?: string;
  cancellation?: {
    reason: string;
    cancelledAt: string;
    cancelledBy: 'user' | 'store' | 'admin';
  };
  tracking?: {
    number: string;
    carrier: string;
    url: string;
    status: string;
    estimatedDelivery?: string;
    currentLocation?: string;
    lastUpdate?: string;
  };
  notes?: string;
}

// Create Order Request
export interface CreateOrderRequest {
  deliveryAddress: Address;
  paymentMethod: OrderPayment['method'];
  specialInstructions?: string;
  couponCode?: string;
}

// Orders Query
export interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: Order['status'];
  paymentStatus?: OrderPayment['status'];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'total_asc' | 'total_desc';
}

// Orders Response
export interface OrdersResponse {
  orders: Order[];
  pagination: Pagination;
  summary: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
  };
}
```

---

## Group Buying

```typescript
// Group Buying Product
export interface GroupBuyingProduct {
  id: string;
  name: string;
  description: string;
  images: Image[];
  category: string;
  regularPrice: number;
  groupPrice: number;
  discount: number;  // percentage
  savings: number;  // amount
  minGroupSize: number;
  maxGroupSize: number;
  timeRemaining: number;  // seconds
  expiresAt: string;
  activeGroups: number;
  availableSpots: number;
  specifications?: Record<string, any>;
}

// Group Member
export interface GroupMember {
  userId: string;
  name: string;
  avatar?: string;
  joinedAt: string;
  isCreator: boolean;
}

// Group Message
export interface GroupMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  createdAt: string;
}

// Group Buying Group
export interface GroupBuyingGroup extends Timestamps {
  id: string;
  product: GroupBuyingProduct;
  creatorId: string;
  code: string;  // Unique code like "GRP-ABC123"
  status: 'filling' | 'complete' | 'cancelled' | 'expired';
  currentMembers: number;
  maxMembers: number;
  spotsRemaining: number;
  members: GroupMember[];
  messages: GroupMessage[];
  inviteUrl: string;
  expiresAt: string;
}

// Create Group Request
export interface CreateGroupRequest {
  productId: string;
  maxMembers?: number;
  message?: string;
}

// Join Group Request
export interface JoinGroupRequest {
  groupCode: string;
}

// Group Checkout Request
export interface GroupCheckoutRequest {
  groupId: string;
  paymentMethod: OrderPayment['method'];
  deliveryAddressId: string;
}

// List Groups Response
export interface ListGroupsResponse {
  groups: GroupBuyingGroup[];
  pagination: Pagination;
}

// List Products Response
export interface ListProductsResponse {
  products: GroupBuyingProduct[];
  pagination: Pagination;
}

// Group Buying Filters
export interface GroupBuyingFilters {
  category?: string;
  minDiscount?: number;
  maxPrice?: number;
  sortBy?: 'discount' | 'price' | 'ending_soon' | 'newest';
  spotsAvailable?: boolean;
  expiringWithin?: number;  // hours
}

// Group Buying Stats
export interface GroupBuyingStats {
  totalGroupsJoined: number;
  totalSavings: number;
  activeGroups: number;
  completedGroups: number;
  averageGroupSize: number;
  mostPopularCategory: string;
}
```

---

## Store Messaging

```typescript
// Message Types
export type MessageType = 'text' | 'image' | 'location' | 'order_update' | 'product';
export type MessageSender = 'user' | 'store';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ConversationStatus = 'active' | 'archived' | 'blocked';

// Message Attachment
export interface MessageAttachment {
  id: string;
  url: string;
  type: string;  // MIME type
  size: number;  // bytes
  filename?: string;
  thumbnail?: string;
}

// Message
export interface Message extends Timestamps {
  id: string;
  conversationId: string;
  sender: MessageSender;
  senderDetails: {
    id: string;
    name: string;
    avatar?: string;
  };
  type: MessageType;
  content: string;
  attachments: MessageAttachment[];
  location?: Location;
  order?: {
    id: string;
    orderNumber: string;
  };
  product?: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
  replyTo?: {
    messageId: string;
    content: string;
  };
  status: MessageStatus;
  readAt?: string;
}

// Store Availability
export interface StoreAvailability {
  storeId: string;
  isOnline: boolean;
  status: 'available' | 'busy' | 'offline';
  averageResponseTime: number;  // seconds
  businessHours: {
    [day: string]: {
      open: string;  // HH:mm format
      close: string;
      closed?: boolean;
    };
  };
  isWithinBusinessHours: boolean;
}

// Conversation
export interface Conversation extends Timestamps {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  store: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    averageResponseTime?: number;
  };
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  };
  lastMessage?: Message;
  unreadCount: number;
  status: ConversationStatus;
}

// Conversation Filter
export interface ConversationFilter {
  status?: ConversationStatus | 'all' | 'unread';
  page?: number;
  limit?: number;
}

// Conversations Response
export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: Pagination;
  summary: {
    totalConversations: number;
    unreadCount: number;
    activeConversations: number;
  };
}

// Messages Response
export interface MessagesResponse {
  messages: Message[];
  pagination: Pagination;
  conversation: Conversation;
}

// Send Message Request
export interface SendMessageRequest {
  conversationId?: string;  // Optional, will create if not exists
  storeId: string;
  orderId?: string;
  content: string;
  type?: MessageType;
  replyToMessageId?: string;
  location?: Location;
}
```

---

**[CONTINUED IN NEXT MESSAGE DUE TO LENGTH...]**

The complete API Contracts document includes all remaining sections:
- Support Chat
- Bill Verification
- Loyalty & Redemption
- Payment Verification
- Social Media
- Wishlist & Sharing
- Follow System
- Error Codes

Each section follows the same detailed pattern with complete TypeScript interfaces.
