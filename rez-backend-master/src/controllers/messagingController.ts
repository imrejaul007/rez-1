import { logger } from '../config/logger';
// Messaging Controller
// Handles store messaging and conversations API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Conversation, ConversationStatus } from '../models/Conversation';
import { Message, MessageType, MessageStatus, SenderType } from '../models/Message';
import { Store } from '../models/Store';
import { escapeRegex } from '../utils/sanitize';
import { getIO } from '../config/socket';
import { SocketRoom } from '../types/socket';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get all conversations for a user
 * GET /api/messages/conversations
 */
export const getConversations = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { status, search, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Build query
    const query: any = {
      customerId: new Types.ObjectId(userId)
    };

    // Apply status filter
    if (status) {
      if (status === 'active') {
        query.status = ConversationStatus.ACTIVE;
      } else if (status === 'archived') {
        query.status = ConversationStatus.ARCHIVED;
      } else {
        query.status = { $ne: ConversationStatus.BLOCKED };
      }
    } else {
      // Default: exclude blocked conversations
      query.status = { $ne: ConversationStatus.BLOCKED };
    }

    // Apply search filter
    if (search) {
      query.storeName = { $regex: escapeRegex(search as string), $options: 'i' };
    }

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get conversations
    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Conversation.countDocuments(query)
    ]);

    // Get summary
    const summary = await Conversation.getConversationsSummary(
      new Types.ObjectId(userId),
      status as ConversationStatus
    );

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        conversations,
        pagination: {
          current: pageNum,
          pages: totalPages,
          total,
          limit: limitNum
        },
        summary
      }
    });
});

/**
 * Get or create a conversation
 * POST /api/messages/conversations
 */
export const getOrCreateConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { storeId, storeName, storeImage } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!storeId || !storeName) {
      res.status(400).json({
        success: false,
        message: 'Store ID and name are required',
      });
      return;
    }

    // Get customer name from user (you may need to fetch from User model)
    const customerName = req.body.customerName || 'Customer';
    const customerImage = req.body.customerImage;

    const conversation = await Conversation.getOrCreate(
      new Types.ObjectId(userId),
      new Types.ObjectId(storeId),
      { storeName, storeImage },
      { customerName, customerImage }
    );

    res.status(200).json({
      success: true,
      data: { conversation }
    });
});

/**
 * Get conversation by ID
 * GET /api/messages/conversations/:id
 */
export const getConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    }).lean();

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { conversation }
    });
});

/**
 * Get messages in a conversation
 * GET /api/messages/conversations/:id/messages
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Verify user has access to this conversation
    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    }).lean();

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Build query
    const query: any = {
      conversationId: new Types.ObjectId(id),
      deletedAt: { $exists: false }
    };

    // If 'before' timestamp is provided, get messages before that time
    if (before) {
      query.sentAt = { $lt: new Date(before as string) };
    }

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get messages (newest first)
    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Message.countDocuments(query)
    ]);

    // Reverse to show oldest first in the list
    messages.reverse();

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          current: pageNum,
          pages: totalPages,
          total,
          limit: limitNum,
          hasMore: pageNum < totalPages
        }
      }
    });
});

/**
 * Send a message
 * POST /api/messages/conversations/:id/messages
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { content, type = MessageType.TEXT, attachments, location, product, order } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!content) {
      res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
      return;
    }

    // Verify conversation exists and user has access
    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Check if conversation is blocked
    if (conversation.status === ConversationStatus.BLOCKED) {
      res.status(403).json({
        success: false,
        message: 'Cannot send message to blocked conversation',
      });
      return;
    }

    // Create message
    const message = new Message({
      conversationId: new Types.ObjectId(id),
      senderId: new Types.ObjectId(userId),
      senderType: SenderType.CUSTOMER,
      type,
      content,
      status: MessageStatus.SENT,
      attachments,
      location,
      product,
      order,
      sentAt: new Date()
    });

    await message.save();

    // Update conversation's last message
    await conversation.updateLastMessage({
      content,
      senderId: new Types.ObjectId(userId),
      senderType: SenderType.CUSTOMER,
      timestamp: message.sentAt,
      type
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

    // Emit WebSocket event for real-time updates
    try {
      const socketIO = getIO();
      const storeId = String(conversation.storeId);
      // Notify the store room so merchant sees the new message
      socketIO.to(SocketRoom.store(storeId)).emit('messaging:new_message', {
        conversationId: id,
        message,
        timestamp: new Date(),
      });
      // Also notify the customer room (for multi-device sync)
      socketIO.to(SocketRoom.user(userId)).emit('messaging:new_message', {
        conversationId: id,
        message,
        timestamp: new Date(),
      });
    } catch (socketErr) {
      logger.error('⚠️ [MESSAGING CONTROLLER] Socket emit failed:', socketErr);
    }
});

/**
 * Mark conversation as read
 * PATCH /api/messages/conversations/:id/read
 */
export const markConversationAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Verify conversation
    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    }).lean();

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Mark all messages as read
    await Message.markConversationAsRead(
      new Types.ObjectId(id),
      new Types.ObjectId(userId)
    );

    // Update conversation unread count
    await conversation.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read'
    });
});

/**
 * Archive conversation
 * PATCH /api/messages/conversations/:id/archive
 */
export const archiveConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    }).lean();

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    await conversation.archive();

    res.status(200).json({
      success: true,
      message: 'Conversation archived successfully'
    });
});

/**
 * Unarchive conversation
 * PATCH /api/messages/conversations/:id/unarchive
 */
export const unarchiveConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    }).lean();

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    await conversation.unarchive();

    res.status(200).json({
      success: true,
      message: 'Conversation unarchived successfully'
    });
});

/**
 * Delete conversation
 * DELETE /api/messages/conversations/:id
 */
export const deleteConversation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      customerId: new Types.ObjectId(userId)
    }).lean();

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Soft delete: mark messages as deleted
    await Message.updateMany(
      { conversationId: new Types.ObjectId(id) },
      { $set: { deletedAt: new Date() } }
    );

    // Delete conversation
    await Conversation.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully'
    });
});

/**
 * Search messages
 * GET /api/messages/search
 */
export const searchMessages = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { query, conversationId, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
      return;
    }

    // Build search query
    const searchQuery: any = {
      content: { $regex: escapeRegex(query as string), $options: 'i' },
      deletedAt: { $exists: false }
    };

    // If conversationId is provided, search within that conversation
    if (conversationId) {
      // Verify user has access to this conversation
      const conversation = await Conversation.findOne({
        _id: new Types.ObjectId(conversationId as string),
        customerId: new Types.ObjectId(userId)
      }).lean();

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found',
        });
        return;
      }

      searchQuery.conversationId = new Types.ObjectId(conversationId as string);
    } else {
      // Search in all user's conversations
      const userConversations = await Conversation.find({
        customerId: new Types.ObjectId(userId)
      }).select('_id').lean();

      const conversationIds = userConversations.map(c => c._id);
      searchQuery.conversationId = { $in: conversationIds };
    }

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Search messages
    const [messages, total] = await Promise.all([
      Message.find(searchQuery)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('conversationId', 'storeName storeImage')
        .lean(),
      Message.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          current: pageNum,
          pages: totalPages,
          total,
          limit: limitNum
        }
      }
    });
});

/**
 * Report a message
 * POST /api/messages/:id/report
 */
export const reportMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { reason, details } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!reason) {
      res.status(400).json({
        success: false,
        message: 'Report reason is required',
      });
      return;
    }

    const message = await Message.findById(id);

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
      });
      return;
    }

    // Verify user has access to this conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      customerId: new Types.ObjectId(userId)
    }).lean();

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Store report in metadata (you might want a separate Report model)
    message.metadata = {
      ...message.metadata,
      reported: true,
      reportedBy: userId,
      reportReason: reason,
      reportDetails: details,
      reportedAt: new Date()
    };
    message.markModified('metadata');

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message reported successfully'
    });

    // Notify admin/moderation team via Socket.IO
    try {
      const socketIO = getIO();
      socketIO.to('admin-moderation').emit('messaging:content_flagged', {
        messageId: id,
        conversationId: String(message.conversationId),
        reportedBy: userId,
        reason,
        details,
        content: message.content,
        timestamp: new Date(),
      });
    } catch (socketErr) {
      logger.error('⚠️ [MESSAGING CONTROLLER] Admin notification socket emit failed:', socketErr);
    }
});

/**
 * Get unread messages count
 * GET /api/messages/unread/count
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const totalUnread = await Conversation.getTotalUnreadCount(
      new Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: {
        unreadCount: totalUnread
      }
    });
});

/**
 * Get store availability (business hours)
 * GET /api/stores/:id/availability
 */
export const getStoreAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Fetch actual store business hours from Store model
    const store = await Store.findById(id)
      .select('name operationalInfo')
      .lean();

    const defaultHours = { open: '09:00', close: '21:00', closed: false };
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

    const storeHours = store?.operationalInfo?.hours as Record<string, any> | undefined;

    // Build business hours object from store data or use defaults
    const businessHours: Record<string, { open: string; close: string; isOpen: boolean }> = {};
    for (const day of dayNames) {
      const dayData = storeHours?.[day];
      if (dayData) {
        businessHours[day] = {
          open: dayData.open || defaultHours.open,
          close: dayData.close || defaultHours.close,
          isOpen: !dayData.closed,
        };
      } else {
        businessHours[day] = {
          open: defaultHours.open,
          close: defaultHours.close,
          isOpen: true,
        };
      }
    }

    // Determine current open/closed status
    const now = new Date();
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const todayHours = businessHours[currentDay];
    const isCurrentlyOpen = todayHours.isOpen &&
      currentTime >= todayHours.open &&
      currentTime <= todayHours.close;

    const availability = {
      isOpen: isCurrentlyOpen,
      businessHours,
      currentStatus: {
        isOpen: isCurrentlyOpen,
        message: isCurrentlyOpen ? 'Store is currently open' : 'Store is currently closed',
        nextChange: {
          time: isCurrentlyOpen ? todayHours.close : todayHours.open,
          status: isCurrentlyOpen ? 'closed' : 'open',
        },
      },
      responseTime: {
        average: '5-15 minutes',
        status: isCurrentlyOpen ? 'active' : 'away',
      },
    };

    res.status(200).json({
      success: true,
      data: availability
    });
});

/**
 * Block a store
 * POST /api/stores/:id/block
 */
export const blockStore = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const conversation = await Conversation.findOne({
      customerId: new Types.ObjectId(userId),
      storeId: new Types.ObjectId(id)
    }).lean();

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    await conversation.block();

    res.status(200).json({
      success: true,
      message: 'Store blocked successfully'
    });
});

/**
 * Unblock a store
 * POST /api/stores/:id/unblock
 */
export const unblockStore = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const conversation = await Conversation.findOne({
      customerId: new Types.ObjectId(userId),
      storeId: new Types.ObjectId(id)
    }).lean();

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    await conversation.unblock();

    res.status(200).json({
      success: true,
      message: 'Store unblocked successfully'
    });
});
