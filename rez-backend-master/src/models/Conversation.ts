import mongoose, { Schema, Document, Types } from 'mongoose';

// Conversation Status
export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  BLOCKED = 'BLOCKED'
}

// Business Hours
export interface IBusinessHours {
  isOpen: boolean;
  openTime?: string; // e.g., "09:00"
  closeTime?: string; // e.g., "21:00"
  timezone?: string;
}

// Conversation Instance Methods Interface
export interface IConversationMethods {
  updateLastMessage(message: {
    content: string;
    senderId: Types.ObjectId;
    senderType: string;
    timestamp: Date;
    type: string;
  }): Promise<IConversation>;
  markAsRead(): Promise<IConversation>;
  archive(): Promise<IConversation>;
  unarchive(): Promise<IConversation>;
  block(): Promise<IConversation>;
  unblock(): Promise<IConversation>;
}

// Conversation Static Methods Interface
export interface IConversationModel extends mongoose.Model<IConversation, {}, IConversationMethods> {
  getOrCreate(
    customerId: Types.ObjectId,
    storeId: Types.ObjectId,
    storeData: { storeName: string; storeImage?: string },
    customerData: { customerName: string; customerImage?: string }
  ): Promise<IConversation>;
  getTotalUnreadCount(customerId: Types.ObjectId): Promise<number>;
  getConversationsSummary(
    customerId: Types.ObjectId,
    status?: ConversationStatus
  ): Promise<{
    totalConversations: number;
    unreadCount: number;
    activeConversations: number;
  }>;
}

// Conversation Interface
export interface IConversation extends Document, IConversationMethods {
  customerId: Types.ObjectId;
  storeId: Types.ObjectId;

  // Display Information
  storeName: string;
  storeImage?: string;
  customerName: string;
  customerImage?: string;

  // Last Message Info
  lastMessage?: {
    content: string;
    senderId: Types.ObjectId;
    senderType: string;
    timestamp: Date;
    type: string;
  };

  // Status and Counters
  status: ConversationStatus;
  unreadCount: number;
  totalMessages: number;

  // Business Hours (for store availability)
  businessHours?: IBusinessHours;

  // Metadata
  metadata?: Record<string, any>;

  // Timestamps
  archivedAt?: Date;
  blockedAt?: Date;
  lastActivityAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Conversation Schema
const ConversationSchema = new Schema<IConversation>({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true
  },
  storeImage: {
    type: String
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerImage: {
    type: String
  },
  lastMessage: {
    content: {
      type: String,
      maxlength: 500
    },
    senderId: Schema.Types.ObjectId,
    senderType: String,
    timestamp: Date,
    type: String
  },
  status: {
    type: String,
    enum: Object.values(ConversationStatus),
    default: ConversationStatus.ACTIVE,
    required: true,
    index: true
  },
  unreadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalMessages: {
    type: Number,
    default: 0,
    min: 0
  },
  businessHours: {
    isOpen: {
      type: Boolean,
      default: true
    },
    openTime: String,
    closeTime: String,
    timezone: String
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  archivedAt: {
    type: Date
  },
  blockedAt: {
    type: Date
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound Indexes
ConversationSchema.index({ customerId: 1, storeId: 1 }, { unique: true });
ConversationSchema.index({ customerId: 1, status: 1, lastActivityAt: -1 });
ConversationSchema.index({ customerId: 1, unreadCount: 1 });
ConversationSchema.index({ storeId: 1, status: 1, lastActivityAt: -1 });

// Virtual for checking if conversation is archived
ConversationSchema.virtual('isArchived').get(function() {
  return this.status === ConversationStatus.ARCHIVED;
});

// Virtual for checking if conversation is blocked
ConversationSchema.virtual('isBlocked').get(function() {
  return this.status === ConversationStatus.BLOCKED;
});

// Virtual for checking if store is currently open
ConversationSchema.virtual('isStoreOpen').get(function() {
  if (!this.businessHours) return true;

  if (!this.businessHours.isOpen) return false;

  if (!this.businessHours.openTime || !this.businessHours.closeTime) {
    return this.businessHours.isOpen;
  }

  // Simple time check (can be enhanced with timezone support)
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return currentTime >= this.businessHours.openTime &&
         currentTime <= this.businessHours.closeTime;
});

// Instance method to update last message
ConversationSchema.methods.updateLastMessage = async function(message: {
  content: string;
  senderId: Types.ObjectId;
  senderType: string;
  timestamp: Date;
  type: string;
}) {
  this.lastMessage = message;
  this.lastActivityAt = message.timestamp;
  this.totalMessages += 1;

  // Increment unread count if message is not from customer
  if (message.senderId.toString() !== this.customerId.toString()) {
    this.unreadCount += 1;
  }

  await this.save();
  return this;
};

// Instance method to mark as read
ConversationSchema.methods.markAsRead = async function() {
  if (this.unreadCount > 0) {
    this.unreadCount = 0;
    await this.save();
  }
  return this;
};

// Instance method to archive conversation
ConversationSchema.methods.archive = async function() {
  this.status = ConversationStatus.ARCHIVED;
  this.archivedAt = new Date();
  await this.save();
  return this;
};

// Instance method to unarchive conversation
ConversationSchema.methods.unarchive = async function() {
  this.status = ConversationStatus.ACTIVE;
  this.archivedAt = undefined;
  await this.save();
  return this;
};

// Instance method to block conversation
ConversationSchema.methods.block = async function() {
  this.status = ConversationStatus.BLOCKED;
  this.blockedAt = new Date();
  await this.save();
  return this;
};

// Instance method to unblock conversation
ConversationSchema.methods.unblock = async function() {
  this.status = ConversationStatus.ACTIVE;
  this.blockedAt = undefined;
  await this.save();
  return this;
};

// Static method to get or create conversation
ConversationSchema.statics.getOrCreate = async function(
  customerId: Types.ObjectId,
  storeId: Types.ObjectId,
  storeData: {
    storeName: string;
    storeImage?: string;
  },
  customerData: {
    customerName: string;
    customerImage?: string;
  }
) {
  let conversation = await this.findOne({
    customerId,
    storeId
  });

  if (!conversation) {
    conversation = new this({
      customerId,
      storeId,
      storeName: storeData.storeName,
      storeImage: storeData.storeImage,
      customerName: customerData.customerName,
      customerImage: customerData.customerImage,
      status: ConversationStatus.ACTIVE,
      unreadCount: 0,
      totalMessages: 0,
      lastActivityAt: new Date()
    });

    await conversation.save();
  }

  return conversation;
};

// Static method to get total unread count for a customer
ConversationSchema.statics.getTotalUnreadCount = async function(
  customerId: Types.ObjectId
) {
  const result = await this.aggregate([
    {
      $match: {
        customerId,
        status: { $ne: ConversationStatus.BLOCKED }
      }
    },
    {
      $group: {
        _id: null,
        totalUnread: { $sum: '$unreadCount' }
      }
    }
  ]);

  return result.length > 0 ? result[0].totalUnread : 0;
};

// Static method to get conversations summary
ConversationSchema.statics.getConversationsSummary = async function(
  customerId: Types.ObjectId,
  status?: ConversationStatus
) {
  const match: any = { customerId };
  if (status) {
    match.status = status;
  } else {
    match.status = { $ne: ConversationStatus.BLOCKED };
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: 1 },
        unreadCount: { $sum: '$unreadCount' },
        activeConversations: {
          $sum: {
            $cond: [{ $eq: ['$status', ConversationStatus.ACTIVE] }, 1, 0]
          }
        }
      }
    }
  ]);

  return result.length > 0 ? result[0] : {
    totalConversations: 0,
    unreadCount: 0,
    activeConversations: 0
  };
};

export const Conversation = mongoose.model<IConversation, IConversationModel>('Conversation', ConversationSchema);
