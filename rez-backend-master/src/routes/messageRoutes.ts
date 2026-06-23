import { Router } from 'express';
import {
  getConversations,
  getOrCreateConversation,
  getConversation,
  getMessages,
  sendMessage,
  markConversationAsRead,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
  searchMessages,
  reportMessage,
  getUnreadCount,
  getStoreAvailability,
  blockStore,
  unblockStore,
} from '../controllers/messagingController';
import { authenticate } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// ==================== CONVERSATION ROUTES ====================

/**
 * GET /api/messages/conversations
 * Get all conversations with pagination and filters
 */
router.get('/conversations',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('all', 'active', 'archived'),
    search: Joi.string().trim().min(1).max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  })),
  getConversations
);

/**
 * POST /api/messages/conversations
 * Create or get existing conversation with a store
 */
router.post('/conversations',
  authenticate,
  validate(Joi.object({
    storeId: commonSchemas.objectId().required(),
    storeName: Joi.string().trim().min(1).max(200).required(),
    storeImage: Joi.string().uri(),
    customerName: Joi.string().trim().max(200),
    customerImage: Joi.string().uri(),
  })),
  getOrCreateConversation
);

/**
 * GET /api/messages/conversations/:id
 * Get a specific conversation
 */
router.get('/conversations/:id',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  getConversation
);

/**
 * GET /api/messages/conversations/:id/messages
 * Get messages in a conversation
 */
router.get('/conversations/:id/messages',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    before: Joi.date().iso(),
  })),
  getMessages
);

/**
 * POST /api/messages/conversations/:id/messages
 * Send a message in a conversation
 */
router.post('/conversations/:id/messages',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    content: Joi.string().trim().min(1).max(5000).required(),
    type: Joi.string().valid('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'LOCATION', 'PRODUCT', 'ORDER', 'SYSTEM').default('TEXT'),
    attachments: Joi.array().items(Joi.object({
      url: Joi.string().uri().required(),
      type: Joi.string().required(),
      name: Joi.string(),
      size: Joi.number(),
      thumbnail: Joi.string().uri(),
    })),
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      address: Joi.string(),
    }),
    product: Joi.object({
      id: commonSchemas.objectId().required(),
      name: Joi.string().required(),
      price: Joi.number().required(),
      image: Joi.string().uri(),
    }),
    order: Joi.object({
      id: commonSchemas.objectId().required(),
      orderNumber: Joi.string().required(),
    }),
  })),
  sendMessage
);

/**
 * PATCH /api/messages/conversations/:id/read
 * Mark conversation as read
 */
router.patch('/conversations/:id/read',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  markConversationAsRead
);

/**
 * PATCH /api/messages/conversations/:id/archive
 * Archive a conversation
 */
router.patch('/conversations/:id/archive',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  archiveConversation
);

/**
 * PATCH /api/messages/conversations/:id/unarchive
 * Unarchive a conversation
 */
router.patch('/conversations/:id/unarchive',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  unarchiveConversation
);

/**
 * DELETE /api/messages/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  deleteConversation
);

// ==================== MESSAGE ROUTES ====================

/**
 * GET /api/messages/search
 * Search messages across conversations
 */
router.get('/search',
  authenticate,
  validateQuery(Joi.object({
    query: Joi.string().trim().min(1).max(100).required(),
    conversationId: commonSchemas.objectId(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  })),
  searchMessages
);

/**
 * POST /api/messages/:id/report
 * Report a message
 */
router.post('/:id/report',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    reason: Joi.string().valid('spam', 'harassment', 'inappropriate', 'scam', 'other').required(),
    details: Joi.string().trim().max(1000),
  })),
  reportMessage
);

/**
 * GET /api/messages/unread/count
 * Get total unread messages count
 */
router.get('/unread/count',
  authenticate,
  getUnreadCount
);

// ==================== STORE ROUTES ====================

/**
 * GET /api/stores/:id/availability
 * Get store availability and business hours
 */
router.get('/stores/:id/availability',
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  getStoreAvailability
);

/**
 * POST /api/stores/:id/block
 * Block a store from messaging
 */
router.post('/stores/:id/block',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  blockStore
);

/**
 * POST /api/stores/:id/unblock
 * Unblock a store
 */
router.post('/stores/:id/unblock',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  unblockStore
);

export default router;
