import { logger } from '../config/logger';
// Support Ticket Model
// Manages customer support tickets and conversations

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITicketMessage {
  sender: Types.ObjectId;
  senderType: 'user' | 'agent' | 'system';
  message: string;
  attachments: string[];
  timestamp: Date;
  isRead: boolean;
}

export interface IRelatedEntity {
  type: 'order' | 'product' | 'transaction' | 'none';
  id?: Types.ObjectId;
}

export interface ITicketRating {
  score: number; // 1-5
  comment: string;
  ratedAt: Date;
}

export interface ISupportTicket extends Document {
  ticketNumber: string;
  user: Types.ObjectId;
  subject: string;
  category: 'order' | 'payment' | 'product' | 'account' | 'technical' | 'delivery' | 'refund' | 'prive_concierge' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  relatedEntity: IRelatedEntity;
  messages: ITicketMessage[];
  merchant?: Types.ObjectId; // Store the ticket relates to
  assignedTo?: Types.ObjectId; // Agent/Admin
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  resolution?: string;
  rating?: ITicketRating;
  attachments: string[];
  tags: string[];
  internalNotes: string[];
  isPriveTicket: boolean;
  priveTier?: 'entry' | 'signature' | 'elite';
  slaHours?: number;
  slaDeadline?: Date;
  slaBreached: boolean;
  metadata: Map<string, any> | Record<string, any>;
  firstResponseAt?: Date;
  responseTime?: number; // in minutes
  resolutionTime?: number; // in minutes
  escalation?: {
    level: number;
    team: 'support' | 'technical' | 'finance' | 'fraud' | 'merchant_ops';
    escalatedAt: Date;
    escalatedBy: Types.ObjectId;
    escalationReason: string;
  };

  // Instance methods
  addMessage(senderId: Types.ObjectId, senderType: 'user' | 'agent' | 'system', message: string, attachments?: string[]): Promise<void>;
  markMessagesAsRead(userType: 'user' | 'agent'): Promise<void>;
}

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderType: {
      type: String,
      enum: ['user', 'agent', 'system'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    attachments: [{
      type: String, // URLs to uploaded files
    }],
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchant: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: ['order', 'payment', 'product', 'account', 'technical', 'delivery', 'refund', 'prive_concierge', 'other'],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    relatedEntity: {
      type: {
        type: String,
        enum: ['order', 'product', 'transaction', 'none'],
        default: 'none',
      },
      id: {
        type: Schema.Types.ObjectId,
        refPath: 'relatedEntity.type',
      },
    },
    messages: [TicketMessageSchema],
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Agent/Admin
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    resolution: {
      type: String,
      maxlength: 2000,
    },
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        maxlength: 1000,
      },
      ratedAt: {
        type: Date,
      },
    },
    attachments: [{
      type: String, // URLs to initial ticket attachments
    }],
    tags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    internalNotes: [{
      type: String, // Agent-only notes
    }],
    isPriveTicket: {
      type: Boolean,
      default: false,
      index: true,
    },
    priveTier: {
      type: String,
      enum: ['entry', 'signature', 'elite'],
    },
    slaHours: {
      type: Number,
    },
    slaDeadline: {
      type: Date,
    },
    slaBreached: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
    firstResponseAt: {
      type: Date,
    },
    responseTime: {
      type: Number, // Minutes from creation to first agent response
    },
    resolutionTime: {
      type: Number, // Minutes from creation to resolution
    },
    escalation: {
      level: { type: Number, default: 1 },
      team: { type: String, enum: ['support', 'technical', 'finance', 'fraud', 'merchant_ops'] },
      escalatedAt: Date,
      escalatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      escalationReason: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
SupportTicketSchema.index({ user: 1, status: 1 });
SupportTicketSchema.index({ ticketNumber: 1, user: 1 });
SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ status: 1, priority: -1 });
SupportTicketSchema.index({ isPriveTicket: 1, slaBreached: 1, status: 1 });
SupportTicketSchema.index({ merchant: 1, status: 1 });

// Virtual for unread message count (for user)
SupportTicketSchema.virtual('unreadCount').get(function(this: ISupportTicket) {
  return this.messages.filter(msg =>
    msg.senderType !== 'user' && !msg.isRead
  ).length;
});

// Virtual for last message
SupportTicketSchema.virtual('lastMessage').get(function(this: ISupportTicket) {
  if (this.messages.length === 0) return null;
  return this.messages[this.messages.length - 1];
});

// Virtual for is active
SupportTicketSchema.virtual('isActive').get(function(this: ISupportTicket) {
  return this.status !== 'closed' && this.status !== 'resolved';
});

// Instance method to add message
SupportTicketSchema.methods.addMessage = async function(
  senderId: Types.ObjectId,
  senderType: 'user' | 'agent' | 'system',
  message: string,
  attachments: string[] = []
) {
  this.messages.push({
    sender: senderId,
    senderType,
    message,
    attachments,
    timestamp: new Date(),
    isRead: false,
  });

  // Update status if user responds while waiting
  if (senderType === 'user' && this.status === 'waiting_customer') {
    this.status = 'in_progress';
  }

  // Calculate response time if this is first agent response
  if (senderType === 'agent' && !this.responseTime) {
    const createdTime = this.createdAt.getTime();
    const responseTime = new Date().getTime();
    this.responseTime = Math.round((responseTime - createdTime) / (1000 * 60)); // minutes
  }

  await this.save();
  logger.info(`✅ [SUPPORT_TICKET] Message added to ticket ${this.ticketNumber}`);
};

// Instance method to mark messages as read
SupportTicketSchema.methods.markMessagesAsRead = async function(
  userType: 'user' | 'agent'
) {
  const senderTypeToMarkRead = userType === 'user' ? ['agent', 'system'] : ['user'];

  this.messages.forEach((msg: ITicketMessage) => {
    if (senderTypeToMarkRead.includes(msg.senderType)) {
      msg.isRead = true;
    }
  });

  await this.save();
  logger.info(`✅ [SUPPORT_TICKET] Messages marked as read for ${userType}`);
};

// Instance method to resolve ticket
SupportTicketSchema.methods.resolveTicket = async function(
  resolution: string,
  resolvedBy: Types.ObjectId
) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolvedAt = new Date();

  // Calculate resolution time
  const createdTime = this.createdAt.getTime();
  const resolvedTime = this.resolvedAt.getTime();
  this.resolutionTime = Math.round((resolvedTime - createdTime) / (1000 * 60)); // minutes

  // Add system message
  this.messages.push({
    sender: resolvedBy,
    senderType: 'system',
    message: `Ticket has been resolved: ${resolution}`,
    attachments: [],
    timestamp: new Date(),
    isRead: false,
  });

  await this.save();
  logger.info(`✅ [SUPPORT_TICKET] Ticket ${this.ticketNumber} resolved`);
};

// Instance method to close ticket
SupportTicketSchema.methods.closeTicket = async function() {
  this.status = 'closed';
  this.closedAt = new Date();
  await this.save();
  logger.info(`✅ [SUPPORT_TICKET] Ticket ${this.ticketNumber} closed`);
};

// Instance method to reopen ticket
SupportTicketSchema.methods.reopenTicket = async function(
  userId: Types.ObjectId,
  reason: string
) {
  this.status = 'open';
  this.resolvedAt = undefined;
  this.closedAt = undefined;
  this.resolution = undefined;

  // Add system message
  this.messages.push({
    sender: userId,
    senderType: 'system',
    message: `Ticket has been reopened: ${reason}`,
    attachments: [],
    timestamp: new Date(),
    isRead: false,
  });

  await this.save();
  logger.info(`✅ [SUPPORT_TICKET] Ticket ${this.ticketNumber} reopened`);
};

// Instance method to rate ticket
SupportTicketSchema.methods.rateTicket = async function(
  score: number,
  comment: string
) {
  this.rating = {
    score,
    comment,
    ratedAt: new Date(),
  };
  await this.save();
  logger.info(`✅ [SUPPORT_TICKET] Ticket ${this.ticketNumber} rated: ${score}/5`);
};

// Static method to generate ticket number
SupportTicketSchema.statics.generateTicketNumber = async function(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SUPP-${year}`;

  // Get count of tickets this year
  const count = await this.countDocuments({
    ticketNumber: new RegExp(`^${prefix}`),
  });

  const ticketNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  return ticketNumber;
};

// Static method to get user's active tickets
SupportTicketSchema.statics.getUserActiveTickets = async function(
  userId: Types.ObjectId
) {
  return this.find({
    user: userId,
    status: { $nin: ['closed', 'resolved'] },
  })
    .sort({ updatedAt: -1 })
    .populate('assignedTo', 'profile.firstName profile.lastName')
    .lean();
};

// Static method to get tickets by status
SupportTicketSchema.statics.getTicketsByStatus = async function(
  userId: Types.ObjectId,
  status: string
) {
  return this.find({
    user: userId,
    status,
  })
    .sort({ updatedAt: -1 })
    .populate('assignedTo', 'profile.firstName profile.lastName')
    .lean();
};

// Static method to auto-assign ticket (round-robin)
SupportTicketSchema.statics.autoAssignTicket = async function(
  ticketId: Types.ObjectId
): Promise<void> {
  // This would integrate with an agent management system
  // For now, we'll leave unassigned
  logger.info(`📋 [SUPPORT_TICKET] Auto-assign logic not yet implemented for ticket ${ticketId}`);
};

// Pre-save hook to set priority based on category
SupportTicketSchema.pre('save', function(next) {
  // Auto-set high priority for payment and refund issues
  if (!this.priority || this.priority === 'medium') {
    if (this.category === 'payment' || this.category === 'refund') {
      this.priority = 'high';
    }
  }
  next();
});

// Pre-save hook: auto-set priority and SLA for Prive concierge tickets
SupportTicketSchema.pre('save', function(next) {
  if (this.isPriveTicket && this.isNew) {
    const slaMap: Record<string, { priority: string; hours: number }> = {
      elite: { priority: 'urgent', hours: 1 },
      signature: { priority: 'high', hours: 24 },
      entry: { priority: 'medium', hours: 48 },
    };
    const config = slaMap[this.priveTier || 'entry'] || slaMap.entry;
    this.priority = config.priority as any;
    this.slaHours = config.hours;
    this.slaDeadline = new Date(Date.now() + config.hours * 60 * 60 * 1000);
  }
  next();
});

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
