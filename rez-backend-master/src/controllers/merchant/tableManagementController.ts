import { Request, Response } from 'express';
import { TableSession } from '../../models/TableSession';
import { Store } from '../../models/Store';
import { createServiceLogger } from '../../config/logger';

const logger = createServiceLogger('tableManagement');

/**
 * GET /api/merchant/table-status?storeId=
 * Returns all tables for a store with their current occupancy status.
 */
export const getTableStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchantId || (req as any).user?.id || (req as any).user?._id?.toString();
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { storeId } = req.query;

    if (!storeId) {
      res.status(400).json({ success: false, message: 'storeId is required' });
      return;
    }

    // Get store config for table layout — also verifies store belongs to this merchant
    const store = await (Store as any).findOne({ _id: storeId, merchantId }).lean();
    if (!store) {
      res.status(403).json({ success: false, message: 'Not authorized for this store' });
      return;
    }

    // Get active sessions for this store
    const activeSessions = await (TableSession as any)
      .find({
        storeId,
        status: 'open',
      })
      .lean();

    const sessionByTable: Record<string, any> = {};
    for (const session of activeSessions) {
      sessionByTable[session.tableId] = session;
    }

    // Build table list from store config or generate default tables
    const tableCount = store.tableConfig?.length > 0 ? store.tableConfig.length : store.totalTables || 10;
    const tables = [];

    if (store.tableConfig && store.tableConfig.length > 0) {
      for (const t of store.tableConfig) {
        const tableIdStr = String(t.tableNumber || t._id);
        const session = sessionByTable[tableIdStr];
        const openedAt = session?.openedAt ? new Date(session.openedAt) : null;
        const seatedDuration = openedAt ? Math.floor((Date.now() - openedAt.getTime()) / 60000) : 0;

        tables.push({
          id: tableIdStr,
          tableNumber: t.tableNumber,
          capacity: t.capacity || 4,
          status: session ? 'occupied' : 'available',
          currentAmount: session ? session.totalAmount : 0,
          guestCount: session?.guestCount || 0,
          seatedDuration,
          sessionId: session?._id || null,
          items: session?.items || [],
          customerName: session?.customerName || null,
        });
      }
    } else {
      // Generate default tables
      for (let i = 1; i <= tableCount; i++) {
        const tableIdStr = String(i);
        const session = sessionByTable[tableIdStr];
        const openedAt = session?.openedAt ? new Date(session.openedAt) : null;
        const seatedDuration = openedAt ? Math.floor((Date.now() - openedAt.getTime()) / 60000) : 0;

        tables.push({
          id: tableIdStr,
          tableNumber: i,
          capacity: 4,
          status: session ? 'occupied' : 'available',
          currentAmount: session ? session.totalAmount : 0,
          guestCount: session?.guestCount || 0,
          seatedDuration,
          sessionId: session?._id || null,
          items: session?.items || [],
          customerName: session?.customerName || null,
        });
      }
    }

    res.json({
      success: true,
      data: {
        tables,
        totalTables: tables.length,
        occupiedTables: tables.filter((t) => t.status === 'occupied').length,
        availableTables: tables.filter((t) => t.status === 'available').length,
      },
    });
  } catch (error: any) {
    logger.error('getTableStatus error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch table status' });
  }
};

/**
 * PUT /api/merchant/table-status/:tableId
 * Manually update a table's status.
 */
export const updateTableStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchantId || (req as any).user?.id || (req as any).user?._id?.toString();
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { tableId } = req.params;
    const { storeId, status } = req.body;

    if (!storeId || !status) {
      res.status(400).json({ success: false, message: 'storeId and status are required' });
      return;
    }

    // Verify store belongs to this merchant
    const store = await (Store as any).findOne({ _id: storeId, merchantId }).lean();
    if (!store) {
      res.status(403).json({ success: false, message: 'Not authorized for this store' });
      return;
    }

    if (status === 'available') {
      // Close any open session for this table
      await (TableSession as any).updateMany(
        { storeId, tableId, status: 'open' },
        { status: 'closed', closedAt: new Date() },
      );
    }

    res.json({ success: true, message: 'Table status updated' });
  } catch (error: any) {
    logger.error('updateTableStatus error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update table status' });
  }
};

/**
 * POST /api/merchant/dine-in/start-order
 * Start a new dine-in order for a table.
 */
export const startDineInOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchantId || (req as any).user?.id || (req as any).user?._id?.toString();
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { storeId, tableId, tableNumber, guestCount, customerPhone, customerName } = req.body;

    if (!storeId || !tableId) {
      res.status(400).json({ success: false, message: 'storeId and tableId are required' });
      return;
    }

    // Verify store belongs to this merchant
    const storeCheck = await (Store as any).findOne({ _id: storeId, merchantId }).lean();
    if (!storeCheck) {
      res.status(403).json({ success: false, message: 'Not authorized for this store' });
      return;
    }

    // Check if table already has an active session
    const existingSession = await (TableSession as any)
      .findOne({
        storeId,
        tableId,
        status: 'open',
      })
      .lean();

    if (existingSession) {
      res.status(409).json({
        success: false,
        message: 'Table already has an active session',
        data: { sessionId: existingSession._id },
      });
      return;
    }

    const session = await (TableSession as any).create({
      merchantId,
      storeId,
      tableId,
      tableNumber: tableNumber || parseInt(tableId, 10),
      guestCount: guestCount || 0,
      customerPhone,
      customerName,
      items: [],
      status: 'open',
      openedAt: new Date(),
      totalAmount: 0,
    });

    logger.info('Dine-in session started', { sessionId: session._id, tableId, storeId });

    res.status(201).json({
      success: true,
      message: 'Dine-in session started',
      data: session,
    });
  } catch (error: any) {
    logger.error('startDineInOrder error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to start dine-in order' });
  }
};

/**
 * GET /api/merchant/table-orders/:tableId?storeId=
 * Get the active order for a table.
 */
export const getTableOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchantId || (req as any).user?.id || (req as any).user?._id?.toString();
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { tableId } = req.params;
    const { storeId } = req.query;

    if (!storeId) {
      res.status(400).json({ success: false, message: 'storeId is required' });
      return;
    }

    // Verify store belongs to this merchant
    const storeCheck = await (Store as any).findOne({ _id: storeId, merchantId }).lean();
    if (!storeCheck) {
      res.status(403).json({ success: false, message: 'Not authorized for this store' });
      return;
    }

    const session = await (TableSession as any)
      .findOne({
        storeId,
        tableId,
        status: 'open',
      })
      .lean();

    if (!session) {
      res.status(404).json({ success: false, message: 'No active order for this table' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error: any) {
    logger.error('getTableOrder error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch table order' });
  }
};

/**
 * PUT /api/merchant/table-orders/:sessionId/items
 * Add or update items in a table session.
 */
export const updateTableOrderItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchantId || (req as any).user?.id || (req as any).user?._id?.toString();
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { sessionId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      res.status(400).json({ success: false, message: 'items array is required' });
      return;
    }

    // Load session first to verify store ownership
    const existingSession = await (TableSession as any).findById(sessionId).lean();
    if (!existingSession) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    // Verify the session's store belongs to this merchant
    const storeCheck = await (Store as any).findOne({ _id: existingSession.storeId, merchantId }).lean();
    if (!storeCheck) {
      res.status(403).json({ success: false, message: 'Not authorized for this store' });
      return;
    }

    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + item.price * item.quantity + (item.modifiers?.reduce((ms: number, m: any) => ms + m.price, 0) || 0);
    }, 0);

    const session = await (TableSession as any).findByIdAndUpdate(sessionId, { items, totalAmount }, { new: true });

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error: any) {
    logger.error('updateTableOrderItems error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to update order items' });
  }
};

/**
 * POST /api/merchant/dine-in/fire-course
 * Fire a course to the kitchen (KDS) for a specific table.
 */
export const fireCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).merchantId || (req as any).user?.id || (req as any).user?._id?.toString();
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { tableId, course, storeId } = req.body;

    if (!tableId || !course || !storeId) {
      res.status(400).json({ success: false, message: 'tableId, course and storeId required' });
      return;
    }

    // Verify store belongs to this merchant
    const storeCheck = await (Store as any).findOne({ _id: storeId, merchantId }).lean();
    if (!storeCheck) {
      res.status(403).json({ success: false, message: 'Not authorized for this store' });
      return;
    }

    const session = await (TableSession as any)
      .findOne({
        tableId,
        storeId,
        status: 'open',
      })
      .lean();

    if (!session) {
      res.status(404).json({ success: false, message: 'No active session for this table' });
      return;
    }

    const courseItems = session.items.filter((item: any) =>
      course === 'main' ? !item.course || item.course === 'main' : item.course === course,
    );

    // Emit to KDS namespace if available (optimized DTO)
    const io = (req as any).app?.get('io');
    if (io) {
      io.of('/kds')
        .to(`kds:${storeId}`)
        .emit('kds:course-fired', {
          tableId,
          tableNumber: session.tableNumber,
          course,
          items: courseItems.map((item: any) => ({
            name: item.name,
            qty: item.quantity || 1,
            variant: item.variant,
            notes: item.notes,
          })),
          firedAt: new Date().toISOString(),
        });
    }

    logger.info('Course fired to kitchen', { tableId, course, storeId, itemCount: courseItems.length });

    res.json({
      success: true,
      message: `${course} course fired to kitchen`,
      data: { itemCount: courseItems.length },
    });
  } catch (error: any) {
    logger.error('fireCourse error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fire course' });
  }
};
