import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authMiddleware } from '../middleware/merchantauth';
import { SupportTicket } from '../models/SupportTicket';
import { Store } from '../models/Store';
import { logger } from '../config/logger';
import { escapeRegex } from '../utils/sanitize';

const router = Router();

// All routes require merchant auth
router.use(authMiddleware);

/**
 * Helper: Get store IDs belonging to the authenticated merchant
 */
async function getMerchantStoreIds(merchantId: string): Promise<Types.ObjectId[]> {
  const stores = await Store.find({ merchantId: new Types.ObjectId(merchantId) })
    .select('_id')
    .lean();
  return stores.map((s: any) => s._id);
}

function safeParseInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * GET /api/merchant/support/tickets — list tickets related to merchant's stores
 */
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const storeIds = await getMerchantStoreIds(merchantId);
    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: { tickets: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } },
      });
    }

    const { status, category, search, page, limit } = req.query;
    const pageNum = Math.max(1, safeParseInt(page as string, 1));
    const limitNum = Math.min(50, Math.max(1, safeParseInt(limit as string, 20)));
    const skip = (pageNum - 1) * limitNum;

    const query: any = { merchant: { $in: storeIds } };
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (search) {
      const escaped = escapeRegex(String(search).substring(0, 100));
      query.$or = [
        { ticketNumber: { $regex: escaped, $options: 'i' } },
        { subject: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'fullName phoneNumber email')
        .populate('merchant', 'name')
        .populate('assignedTo', 'fullName')
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error: any) {
    logger.error('[Merchant Support] Error listing tickets:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list tickets' });
  }
});

/**
 * GET /api/merchant/support/tickets/:id — ticket detail (only if merchant owns the store)
 */
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID' });
    }

    const storeIds = await getMerchantStoreIds(merchantId);

    const ticket = await SupportTicket.findOne({ _id: id, merchant: { $in: storeIds } })
      .populate('user', 'fullName phoneNumber email')
      .populate('merchant', 'name')
      .populate('assignedTo', 'fullName')
      .lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, data: { ticket } });
  } catch (error: any) {
    logger.error('[Merchant Support] Error fetching ticket:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
});

/**
 * POST /api/merchant/support/tickets/:id/messages — merchant reply to a ticket
 */
router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { message, attachments } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID' });
    }
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const storeIds = await getMerchantStoreIds(merchantId);
    const ticket = await SupportTicket.findOne({ _id: id, merchant: { $in: storeIds } });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Add merchant message (treated as agent-type since merchant is responding)
    (ticket as any).messages.push({
      sender: new Types.ObjectId(merchantId),
      senderType: 'agent',
      message: message.trim().substring(0, 5000),
      attachments: attachments || [],
      timestamp: new Date(),
      isRead: false,
    });

    await ticket.save();

    res.json({ success: true, data: { ticket }, message: 'Reply sent' });
  } catch (error: any) {
    logger.error('[Merchant Support] Error adding message:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
});

/**
 * GET /api/merchant/support/statistics — ticket stats for merchant's stores
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const storeIds = await getMerchantStoreIds(merchantId);
    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: { total: 0, byStatus: {}, byCategory: {}, openCount: 0, inProgressCount: 0 },
      });
    }

    const matchFilter = { merchant: { $in: storeIds } };

    const [total, byStatus, byCategory] = await Promise.all([
      SupportTicket.countDocuments(matchFilter),
      SupportTicket.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SupportTicket.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s: any) => { statusMap[s._id] = s.count; });

    const categoryMap: Record<string, number> = {};
    byCategory.forEach((c: any) => { categoryMap[c._id] = c.count; });

    res.json({
      success: true,
      data: {
        total,
        byStatus: statusMap,
        byCategory: categoryMap,
        openCount: statusMap.open || 0,
        inProgressCount: statusMap.in_progress || 0,
      },
    });
  } catch (error: any) {
    logger.error('[Merchant Support] Error fetching statistics:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

export default router;
