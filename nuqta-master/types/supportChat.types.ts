// Support Chat Types
// Complete type definitions for live chat support system

export type MessageSender = 'user' | 'agent' | 'system' | 'bot';
export type MessageType = 'text' | 'image' | 'file' | 'quick_reply' | 'system' | 'typing' | 'order_info' | 'product_info';
export type AgentStatus = 'online' | 'away' | 'busy' | 'offline';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed' | 'escalated';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type IssueCategory =
  | 'order_tracking'
  | 'refund_request'
  | 'account_issue'
  | 'payment_problem'
  | 'technical_issue'
  | 'product_inquiry'
  | 'delivery_problem'
  | 'general_inquiry'
  | 'complaint'
  | 'other';

export type ConversationRating = 1 | 2 | 3 | 4 | 5;

// Message structure
export interface ChatMessage {
  id: string;
  ticketId: string;
  content: string;
  sender: MessageSender;
  type: MessageType;
  timestamp: string;
  read: boolean;
  delivered: boolean;

  // Agent info (for agent messages)
  agentId?: string;
  agentName?: string;
  agentAvatar?: string;

  // User info (for user messages)
  userId?: string;
  userName?: string;

  // Attachments
  attachments?: MessageAttachment[];

  // Quick replies
  quickReplies?: QuickReply[];

  // Metadata
  metadata?: {
    orderId?: string;
    productId?: string;
    storeId?: string;
    [key: string]: any;
  };
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'video' | 'audio';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}

export interface QuickReply {
  id: string;
  text: string;
  value: string;
  icon?: string;
}

// Agent structure
export interface SupportAgent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: AgentStatus;
  title: string;
  department?: string;
  skills?: string[];
  rating?: number;
  responseTime?: number; // Average response time in seconds
  languages?: string[];

  // Real-time status
  isTyping?: boolean;
  lastSeen?: string;
}

// Support ticket structure
export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;

  // Ticket details
  subject: string;
  category: IssueCategory;
  priority: TicketPriority;
  status: TicketStatus;

  // Assignment
  assignedAgentId?: string;
  assignedAgent?: SupportAgent;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;

  // Messages
  messages: ChatMessage[];
  messageCount: number;
  unreadCount: number;

  // Rating
  rating?: ConversationRating;
  ratingComment?: string;

  // Queue info
  queuePosition?: number;
  estimatedWaitTime?: number; // In seconds

  // Metadata
  metadata?: {
    orderId?: string;
    productId?: string;
    storeId?: string;
    userAgent?: string;
    platform?: string;
    appVersion?: string;
    [key: string]: any;
  };

  // Tags
  tags?: string[];

  // Internal notes (not visible to user)
  internalNotes?: string;
}

// Queue information
export interface QueueInfo {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number; // In seconds
  averageWaitTime: number;
  availableAgents: number;
  busyAgents: number;
}

// Agent typing indicator
export interface TypingIndicator {
  ticketId: string;
  agentId: string;
  agentName: string;
  isTyping: boolean;
  timestamp: string;
}

// FAQ suggestion
export interface FAQSuggestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  relevanceScore: number;
  helpful?: boolean;
  articleUrl?: string;
}

// Canned response (for agents)
export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut?: string;
  tags?: string[];
}

// Conversation transfer
export interface ConversationTransfer {
  id: string;
  ticketId: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string;
  toAgentName: string;
  reason?: string;
  timestamp: string;
  accepted: boolean;
  acceptedAt?: string;
}

// Chat session
export interface ChatSession {
  id: string;
  ticketId: string;
  startedAt: string;
  endedAt?: string;
  duration?: number; // In seconds
  messageCount: number;
  agentResponseTime?: number; // Average in seconds
  userResponseTime?: number; // Average in seconds
}

// Agent availability
export interface AgentAvailability {
  agentId: string;
  status: AgentStatus;
  available: boolean;
  currentLoad: number; // Number of active chats
  maxLoad: number; // Maximum concurrent chats
  nextAvailableAt?: string;
  autoResponse?: string;
}

// Business hours
export interface BusinessHours {
  isOpen: boolean;
  timezone: string;
  schedule: {
    [day: string]: {
      open: string;
      close: string;
    };
  };
  nextOpenTime?: string;
  holidays?: string[];
}

// Chat statistics
export interface ChatStatistics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  averageRating: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  totalMessages: number;
}

// Support chat configuration
export interface SupportChatConfig {
  enabled: boolean;
  businessHours: BusinessHours;
  autoAssignment: boolean;
  maxConcurrentChats: number;
  queueEnabled: boolean;
  offlineMessaging: boolean;
  fileUploadEnabled: boolean;
  maxFileSize: number; // In bytes
  allowedFileTypes: string[];
  ratingEnabled: boolean;
  transcriptEmail: boolean;
  aiSuggestionsEnabled: boolean;
  sentimentAnalysisEnabled: boolean;
}

// Message delivery status
export interface MessageDeliveryStatus {
  messageId: string;
  sent: boolean;
  sentAt?: string;
  delivered: boolean;
  deliveredAt?: string;
  read: boolean;
  readAt?: string;
  failed?: boolean;
  failureReason?: string;
}

// Sentiment analysis
export interface SentimentAnalysis {
  ticketId: string;
  messageId: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  keywords: string[];
  shouldEscalate: boolean;
  escalationReason?: string;
}

// Smart routing rule
export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    category?: IssueCategory[];
    priority?: TicketPriority[];
    keywords?: string[];
    vipCustomer?: boolean;
    repeatCustomer?: boolean;
  };
  action: {
    assignToAgent?: string;
    assignToDepartment?: string;
    setPriority?: TicketPriority;
    addTags?: string[];
  };
}

// Co-browsing session
export interface CoBrowsingSession {
  id: string;
  ticketId: string;
  agentId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  sessionUrl: string;
  active: boolean;
}

// Voice/Video call
export interface CallRequest {
  id: string;
  ticketId: string;
  type: 'voice' | 'video';
  initiatedBy: 'agent' | 'user';
  status: 'pending' | 'accepted' | 'rejected' | 'ended';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  callUrl?: string;
}

// Offline message queue
export interface OfflineMessage {
  id: string;
  ticketId: string;
  message: ChatMessage;
  queuedAt: string;
  retryCount: number;
  lastRetryAt?: string;
  status: 'queued' | 'sending' | 'sent' | 'failed';
}

// User support history
export interface UserSupportHistory {
  userId: string;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  averageRating: number;
  lastContactDate?: string;
  commonIssues: {
    category: IssueCategory;
    count: number;
  }[];
  isVip: boolean;
  preferredLanguage?: string;
  notes?: string;
}

// API request/response types
export interface CreateTicketRequest {
  subject: string;
  category: IssueCategory;
  priority?: TicketPriority;
  initialMessage: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    storeId?: string;
    [key: string]: any;
  };
}

export interface CreateTicketResponse {
  ticket: SupportTicket;
  queueInfo?: QueueInfo;
}

export interface SendMessageRequest {
  ticketId: string;
  content: string;
  type?: MessageType;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
}

export interface SendMessageResponse {
  message: ChatMessage;
  deliveryStatus: MessageDeliveryStatus;
}

export interface GetTicketHistoryResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  limit: number;
}

export interface GetMessagesResponse {
  messages: ChatMessage[];
  total: number;
  hasMore: boolean;
}

export interface RateConversationRequest {
  ticketId: string;
  rating: ConversationRating;
  comment?: string;
  tags?: string[];
}

export interface CloseTicketRequest {
  ticketId: string;
  reason?: string;
  requestTranscript?: boolean;
}

export interface UploadAttachmentResponse {
  attachment: MessageAttachment;
  url: string;
}

export interface GetFAQSuggestionsRequest {
  query: string;
  category?: IssueCategory;
  limit?: number;
}

export interface GetFAQSuggestionsResponse {
  suggestions: FAQSuggestion[];
  total: number;
}

// WebSocket event types
export interface ChatSocketEvents {
  // Incoming events (from server)
  MESSAGE_RECEIVED: ChatMessage;
  AGENT_ASSIGNED: { ticketId: string; agent: SupportAgent };
  AGENT_TYPING: TypingIndicator;
  AGENT_STATUS_CHANGED: { agentId: string; status: AgentStatus };
  QUEUE_POSITION_UPDATED: QueueInfo;
  TICKET_STATUS_CHANGED: { ticketId: string; status: TicketStatus };
  CONVERSATION_TRANSFERRED: ConversationTransfer;
  MESSAGE_DELIVERED: MessageDeliveryStatus;
  MESSAGE_READ: { messageId: string; readAt: string };
  CALL_REQUEST: CallRequest;
  COBROWSING_INVITATION: CoBrowsingSession;

  // Outgoing events (to server)
  SEND_MESSAGE: SendMessageRequest;
  START_TYPING: { ticketId: string };
  STOP_TYPING: { ticketId: string };
  MARK_AS_READ: { ticketId: string; messageIds: string[] };
  JOIN_TICKET: { ticketId: string };
  LEAVE_TICKET: { ticketId: string };
}

// Hook state
export interface SupportChatState {
  // Current ticket
  currentTicket: SupportTicket | null;

  // Messages
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesError: string | null;

  // Ticket history
  ticketHistory: SupportTicket[];
  historyLoading: boolean;
  historyError: string | null;

  // Agent
  assignedAgent: SupportAgent | null;
  isAgentTyping: boolean;

  // Queue
  queueInfo: QueueInfo | null;

  // Connection
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;

  // UI state
  inputText: string;
  attachments: MessageAttachment[];
  showRating: boolean;
  showFAQ: boolean;
  faqSuggestions: FAQSuggestion[];

  // Offline support
  offlineMessages: OfflineMessage[];
  isOnline: boolean;
}

// Hook actions
export interface SupportChatActions {
  // Ticket management
  createTicket: (request: CreateTicketRequest) => Promise<SupportTicket | null>;
  closeTicket: (ticketId: string, reason?: string) => Promise<boolean>;
  reopenTicket: (ticketId: string) => Promise<boolean>;

  // Messaging
  sendMessage: (content: string, attachments?: MessageAttachment[]) => Promise<boolean>;
  uploadAttachment: (file: File | Blob, type: string) => Promise<MessageAttachment | null>;
  deleteMessage: (messageId: string) => Promise<boolean>;

  // Real-time
  startTyping: () => void;
  stopTyping: () => void;
  markAsRead: (messageIds: string[]) => void;

  // Agent interaction
  requestAgent: () => Promise<boolean>;
  transferToAgent: (agentId: string, reason?: string) => Promise<boolean>;

  // Rating
  rateConversation: (rating: ConversationRating, comment?: string) => Promise<boolean>;

  // FAQ
  searchFAQ: (query: string) => Promise<FAQSuggestion[]>;
  markFAQHelpful: (faqId: string, helpful: boolean) => Promise<boolean>;

  // Call/Video
  requestCall: (type: 'voice' | 'video') => Promise<boolean>;
  acceptCall: (callId: string) => Promise<boolean>;
  rejectCall: (callId: string) => Promise<boolean>;

  // History
  loadTicketHistory: (page?: number) => Promise<void>;
  loadMessages: (ticketId: string, before?: string) => Promise<void>;

  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // UI helpers
  setInputText: (text: string) => void;
  clearInput: () => void;
  addAttachment: (attachment: MessageAttachment) => void;
  removeAttachment: (attachmentId: string) => void;
  toggleRating: () => void;
  toggleFAQ: () => void;
}

export type UseSupportChatReturn = SupportChatState & SupportChatActions;
