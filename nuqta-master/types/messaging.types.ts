// Messaging System Types
// Type definitions for store messaging and communication

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'location' | 'order' | 'product' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ConversationStatus = 'active' | 'archived' | 'closed';
export type ParticipantType = 'customer' | 'store' | 'support' | 'system';

// Message Attachment
export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
  duration?: number; // For audio/video in seconds
}

// Message Location
export interface MessageLocation {
  latitude: number;
  longitude: number;
  address?: string;
  placeName?: string;
}

// Order Reference in Message
export interface MessageOrderReference {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
}

// Product Reference in Message
export interface MessageProductReference {
  productId: string;
  name: string;
  image: string;
  price: number;
  storeId: string;
}

// Message Participant
export interface MessageParticipant {
  id: string;
  type: ParticipantType;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

// Message
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: ParticipantType;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  content: string;
  status: MessageStatus;
  attachments?: MessageAttachment[];
  location?: MessageLocation;
  orderReference?: MessageOrderReference;
  productReference?: MessageProductReference;
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
  };
  metadata?: {
    isTemplate?: boolean;
    templateId?: string;
    isAutomated?: boolean;
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  deliveredAt?: string;
}

// Conversation
export interface Conversation {
  id: string;
  storeId: string;
  storeName: string;
  storeAvatar?: string;
  storePhone?: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  status: ConversationStatus;
  lastMessage?: Message;
  unreadCount: number;
  isStoreOnline: boolean;
  storeResponseTime?: string; // e.g., "Usually replies in 5 minutes"
  storeBusinessHours?: {
    isOpen: boolean;
    opensAt?: string;
    closesAt?: string;
  };
  orderContext?: {
    orderId: string;
    orderNumber: string;
  };
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  closedAt?: string;
}

// Typing Indicator
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
}

// Quick Message Template
export interface QuickMessageTemplate {
  id: string;
  category: 'order_status' | 'delivery' | 'issue' | 'general' | 'custom';
  title: string;
  content: string;
  icon?: string;
  variables?: string[]; // e.g., ['{orderNumber}', '{estimatedTime}']
}

// Pre-defined Quick Actions
export const QUICK_MESSAGE_TEMPLATES: QuickMessageTemplate[] = [
  {
    id: 'where_is_order',
    category: 'order_status',
    title: 'Where is my order?',
    content: 'Hi! I would like to know the current status of my order #{orderNumber}. When can I expect delivery?',
    icon: 'location-outline',
    variables: ['{orderNumber}'],
  },
  {
    id: 'modify_order',
    category: 'order_status',
    title: 'Modify my order',
    content: 'Hi! I need to modify my order #{orderNumber}. Can you help me with this?',
    icon: 'create-outline',
    variables: ['{orderNumber}'],
  },
  {
    id: 'report_issue',
    category: 'issue',
    title: 'Report an issue',
    content: 'Hi! I am facing an issue with my order #{orderNumber}. ',
    icon: 'alert-circle-outline',
    variables: ['{orderNumber}'],
  },
  {
    id: 'request_refund',
    category: 'issue',
    title: 'Request refund',
    content: 'Hi! I would like to request a refund for my order #{orderNumber}. ',
    icon: 'cash-outline',
    variables: ['{orderNumber}'],
  },
  {
    id: 'delivery_instructions',
    category: 'delivery',
    title: 'Add delivery instructions',
    content: 'Hi! I have some special delivery instructions for order #{orderNumber}: ',
    icon: 'bicycle-outline',
    variables: ['{orderNumber}'],
  },
  {
    id: 'product_inquiry',
    category: 'general',
    title: 'Product inquiry',
    content: 'Hi! I have a question about one of your products. ',
    icon: 'help-circle-outline',
  },
];

// Store Availability Status
export interface StoreAvailability {
  storeId: string;
  isOnline: boolean;
  isOpen: boolean;
  businessHours: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  averageResponseTime: number; // in minutes
  holidayMessage?: string;
  autoReplyMessage?: string;
}

// Message Send Request
export interface SendMessageRequest {
  conversationId?: string; // If null, creates new conversation
  storeId: string;
  content: string;
  type?: MessageType;
  orderId?: string; // Optional order context
  attachments?: File[];
  location?: MessageLocation;
  replyToMessageId?: string;
}

// Conversation Filter
export interface ConversationFilter {
  status?: ConversationStatus;
  storeId?: string;
  search?: string;
  hasUnread?: boolean;
  page?: number;
  limit?: number;
}

// Socket Events for Messaging
export const MessagingSocketEvents = {
  // Message events
  MESSAGE_SENT: 'message:sent',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  MESSAGE_FAILED: 'message:failed',

  // Typing events
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',

  // Conversation events
  CONVERSATION_CREATED: 'conversation:created',
  CONVERSATION_UPDATED: 'conversation:updated',
  CONVERSATION_ARCHIVED: 'conversation:archived',
  CONVERSATION_CLOSED: 'conversation:closed',

  // Store events
  STORE_ONLINE: 'store:online',
  STORE_OFFLINE: 'store:offline',
  STORE_JOINED_CONVERSATION: 'store:joined',
  STORE_LEFT_CONVERSATION: 'store:left',

  // Subscription events
  JOIN_CONVERSATION: 'join:conversation',
  LEAVE_CONVERSATION: 'leave:conversation',
} as const;

// Message Event Payloads
export interface MessageSentPayload {
  message: Message;
  conversationId: string;
}

export interface MessageReceivedPayload {
  message: Message;
  conversationId: string;
}

export interface MessageDeliveredPayload {
  messageId: string;
  conversationId: string;
  deliveredAt: string;
}

export interface MessageReadPayload {
  messageId: string;
  conversationId: string;
  readAt: string;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface StoreOnlinePayload {
  storeId: string;
  isOnline: boolean;
  timestamp: string;
}

// Callback Types
export type MessageSentCallback = (payload: MessageSentPayload) => void;
export type MessageReceivedCallback = (payload: MessageReceivedPayload) => void;
export type MessageDeliveredCallback = (payload: MessageDeliveredPayload) => void;
export type MessageReadCallback = (payload: MessageReadPayload) => void;
export type TypingCallback = (payload: TypingPayload) => void;
export type StoreOnlineCallback = (payload: StoreOnlinePayload) => void;
