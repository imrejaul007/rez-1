import mongoose, { Schema, Document, Types } from 'mongoose';

// Message Types
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
  LOCATION = 'LOCATION',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  SYSTEM = 'SYSTEM'
}

// Message Status
export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

// Sender Type
export enum SenderType {
  CUSTOMER = 'CUSTOMER',
  STORE = 'STORE',
  SYSTEM = 'SYSTEM'
}

// Message Instance Methods Interface
export interface IMessageMethods {
  markAsDelivered(): Promise<IMessage>;
  markAsRead(): Promise<IMessage>;
}

// Message Static Methods Interface
export interface IMessageModel extends mongoose.Model<IMessage, {}, IMessageMethods> {
  getUnreadCount(conversationId: Types.ObjectId, userId: Types.ObjectId): Promise<number>;
  markConversationAsRead(conversationId: Types.ObjectId, userId: Types.ObjectId): Promise<any>;
}

// Message Interface
export interface IMessage extends Document, IMessageMethods {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderType: SenderType;
  type: MessageType;
  content: string;
  status: MessageStatus;

  // Optional fields based on message type
  attachments?: {
    url: string;
    type: string; // 'image', 'video', 'file'
    name?: string;
    size?: number;
    thumbnail?: string;
  }[];

  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  product?: {
    id: Types.ObjectId;
    name: string;
    price: number;
    image?: string;
  };

  order?: {
    id: Types.ObjectId;
    orderNumber: string;
  };

  // Metadata
  metadata?: Record<string, any>;

  // Timestamps
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Message Schema
const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'senderType' // Dynamic reference based on senderType
  },
  senderType: {
    type: String,
    enum: Object.values(SenderType),
    required: true
  },
  type: {
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
    required: true
  },
  attachments: [{
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    name: String,
    size: Number,
    thumbnail: String
  }],
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  product: {
    id: Schema.Types.ObjectId,
    name: String,
    price: Number,
    image: String
  },
  order: {
    id: Schema.Types.ObjectId,
    orderNumber: String
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  deliveredAt: {
    type: Date
  },
  readAt: {
    type: Date
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
MessageSchema.index({ conversationId: 1, sentAt: -1 });
MessageSchema.index({ conversationId: 1, status: 1 });
MessageSchema.index({ senderId: 1, senderType: 1, sentAt: -1 });

// Virtual for checking if message is read
MessageSchema.virtual('isRead').get(function() {
  return !!this.readAt;
});

// Virtual for checking if message is delivered
MessageSchema.virtual('isDelivered').get(function() {
  return !!this.deliveredAt;
});

// Instance method to mark as delivered
MessageSchema.methods.markAsDelivered = async function() {
  if (!this.deliveredAt) {
    this.deliveredAt = new Date();
    this.status = MessageStatus.DELIVERED;
    await this.save();
  }
  return this;
};

// Instance method to mark as read
MessageSchema.methods.markAsRead = async function() {
  if (!this.readAt) {
    this.readAt = new Date();
    this.status = MessageStatus.READ;
    if (!this.deliveredAt) {
      this.deliveredAt = new Date();
    }
    await this.save();
  }
  return this;
};

// Static method to get unread count for a user in a conversation
MessageSchema.statics.getUnreadCount = async function(
  conversationId: Types.ObjectId,
  userId: Types.ObjectId
) {
  return await this.countDocuments({
    conversationId,
    senderId: { $ne: userId },
    status: { $in: [MessageStatus.SENT, MessageStatus.DELIVERED] }
  });
};

// Static method to mark all messages as read in a conversation
MessageSchema.statics.markConversationAsRead = async function(
  conversationId: Types.ObjectId,
  userId: Types.ObjectId
) {
  const now = new Date();
  return await this.updateMany(
    {
      conversationId,
      senderId: { $ne: userId },
      readAt: { $exists: false }
    },
    {
      $set: {
        readAt: now,
        status: MessageStatus.READ
      }
    }
  );
};

export const Message = mongoose.model<IMessage, IMessageModel>('Message', MessageSchema);
