import { Router } from 'express';
import { Store } from '../models/Store';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

/**
 * @route   GET /api/merchant/floor-plan
 * @desc    Get floor plan (tables layout) for a store
 * @access  Private (Merchant)
 * @query   storeId - The store ID to fetch floor plan for
 */
router.get('/', async (req, res) => {
  try {
    const { storeId } = req.query;
    const merchantId = req.merchantId;

    if (!storeId || !merchantId) {
      return res.status(400).json({
        success: false,
        error: 'storeId and merchant authentication required',
      });
    }

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId,
    }).select('tableConfig name').lean();

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found',
      });
    }

    // Return floor plan (tableConfig contains position and status data)
    const tables = store.tableConfig || [];

    return res.json({
      success: true,
      data: {
        tables: tables.map(t => ({
          id: String(t.tableNumber || ''),
          tableNumber: String(t.tableNumber || ''),
          shape: 'square_4', // Default shape - can be enhanced
          capacity: t.capacity || 4,
          x: t.x || 0,
          y: t.y || 0,
          status: t.status || 'available',
        })),
      },
    });
  } catch (error) {
    logger.error('Floor plan GET error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch floor plan',
    });
  }
});

/**
 * @route   POST /api/merchant/floor-plan
 * @desc    Save floor plan (update table positions and config) for a store
 * @access  Private (Merchant)
 * @body    { storeId, tables }
 */
router.post('/', async (req, res) => {
  try {
    const { storeId, tables } = req.body;
    const merchantId = req.merchantId;

    if (!storeId || !merchantId || !Array.isArray(tables)) {
      return res.status(400).json({
        success: false,
        error: 'storeId, merchantId, and tables array required',
      });
    }

    // Validate each table has required fields
    for (const table of tables) {
      if (!table.id && !table.tableNumber) {
        return res.status(400).json({
          success: false,
          error: 'Each table must have id or tableNumber',
        });
      }
      if (typeof table.x !== 'number' || typeof table.y !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Each table must have x and y coordinates',
        });
      }
      if (!table.capacity || !table.shape) {
        return res.status(400).json({
          success: false,
          error: 'Each table must have capacity and shape',
        });
      }
    }

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId,
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found',
      });
    }

    // Convert tables to tableConfig format for storage
    const tableConfig = tables.map((table: any, index: number) => ({
      tableNumber: table.tableNumber || String(index + 1),
      capacity: table.capacity,
      x: Math.round(table.x),
      y: Math.round(table.y),
      status: table.status || 'available',
    }));

    // Update store with new floor plan
    await Store.findByIdAndUpdate(
      storeId,
      {
        tableConfig,
        totalTables: tables.length,
      },
      { new: true }
    );

    logger.info(`Floor plan saved for store ${storeId} by merchant ${merchantId}`);

    return res.json({
      success: true,
      message: 'Floor plan saved successfully',
      data: {
        tablesCount: tables.length,
      },
    });
  } catch (error) {
    logger.error('Floor plan POST error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save floor plan',
    });
  }
});

/**
 * @route   PUT /api/merchant/floor-plan/:storeId/table/:tableNumber/status
 * @desc    Update a specific table's status (available, occupied, reserved, needs_attention)
 * @access  Private (Merchant)
 * @body    { status }
 */
router.put('/:storeId/table/:tableNumber/status', async (req, res) => {
  try {
    const { storeId, tableNumber } = req.params;
    const { status } = req.body;
    const merchantId = req.merchantId;

    const validStatuses = ['available', 'occupied', 'reserved', 'needs_attention'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId,
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found',
      });
    }

    // Update the specific table's status
    const updated = await Store.findByIdAndUpdate(
      storeId,
      {
        $set: {
          'tableConfig.$[elem].status': status,
        },
      },
      {
        arrayFilters: [{ 'elem.tableNumber': String(tableNumber) }],
        new: true,
      }
    ).select('tableConfig');

    const updatedTable = updated?.tableConfig?.find(
      t => String(t.tableNumber) === String(tableNumber)
    );

    if (!updatedTable) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    logger.info(
      `Table ${tableNumber} status updated to ${status} in store ${storeId}`
    );

    return res.json({
      success: true,
      message: 'Table status updated',
      data: {
        tableNumber,
        status: updatedTable.status,
      },
    });
  } catch (error) {
    logger.error('Table status update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update table status',
    });
  }
});

export default router;
