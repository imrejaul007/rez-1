import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { OrderModel } from '../models/MerchantOrder';
import { Order as OrderType, OrderStatus, PaymentStatus } from '../types/shared';
import SMSService from '../services/SMSService';
import EmailService from '../services/EmailService';
import InvoiceService from '../services/InvoiceService';
import ShippingLabelService from '../services/ShippingLabelService';
import { Merchant } from '../models/Merchant';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import mongoose from 'mongoose';

type SortBy = 'created' | 'updated' | 'total' | 'priority';

interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
  notifyCustomer?: boolean;
  prepTimeMinutes?: number;
}

interface BulkOrderAction {
  orderIds: string[];
  action: 'confirm' | 'prepare' | 'ready' | 'deliver' | 'cancel';
  notes?: string;
  notifyCustomers?: boolean;
}

// Removed unused AnalyticsRequest interface

interface OrderSearchRequest {
  merchantId: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  orderNumber?: string;
  storeId?: string;
  sortBy?: SortBy;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  dateRange?: { start: Date; end: Date };
}

const isValidOrderStatus = (status: unknown): status is OrderStatus => {
  const validStatuses: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'returned', 'refunded'];
  return typeof status === 'string' && validStatuses.includes(status as OrderStatus);
};

// Removed unused OrderAnalytics interface and OrderWithId type

const router = Router();

// Test route without auth for development
router.post('/test-sample-data', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Sample data creation not allowed in production'
      });
    }

    const merchantId = req.body.merchantId || 'test-merchant-123';
    await OrderModel.createSampleOrders(merchantId);

    return res.json({
      success: true,
      message: 'Sample orders created successfully',
      merchantId: merchantId
    });
  } catch (error) {
    logger.error('Error creating sample orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create sample orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear orders for testing (development only)
router.delete('/test-clear-orders', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Clear orders not allowed in production'
      });
    }

    const { OrderMongoModel } = await import('../models/MerchantOrder');
    // Clear all orders (for testing)
    const result = await OrderMongoModel.deleteMany({});

    return res.json({
      success: true,
      message: `Cleared ${result.deletedCount} orders`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Error clearing orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test analytics route without auth for development
router.get('/test-analytics', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test analytics not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || 'test-merchant-123';
    const { dateStart, dateEnd } = req.query;

    let dateRange: { start: Date; end: Date } | undefined;
    if (dateStart && dateEnd && typeof dateStart === 'string' && typeof dateEnd === 'string') {
      dateRange = {
        start: new Date(dateStart),
        end: new Date(dateEnd)
      };
    }

    logger.info("Testing analytics for merchantId:", merchantId);

    const analytics = await OrderModel.getAnalytics(merchantId, dateRange);
    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching test analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test cashback routes without auth for development
router.post('/test-cashback-sample', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test cashback not allowed in production'
      });
    }

    const merchantId = req.body.merchantId || 'test-merchant-123';
    const { CashbackModel } = await import('../models/Cashback');
    
    await CashbackModel.createSampleRequests(merchantId);

    return res.json({
      success: true,
      message: 'Sample cashback requests created successfully',
      merchantId: merchantId
    });
  } catch (error) {
    logger.error('Error creating sample cashback:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create sample cashback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/test-cashback-list', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test cashback not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || 'test-merchant-123';
    const { CashbackModel } = await import('../models/Cashback');
    
    const result = await CashbackModel.search({ merchantId });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching cashback list:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cashback list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/test-cashback-metrics', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test cashback not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || 'test-merchant-123';
    const { CashbackModel } = await import('../models/Cashback');
    
    const metrics = await CashbackModel.getMetrics(merchantId);

    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching cashback metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cashback metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test route for dashboard overview (no auth required)
router.get('/test-dashboard-overview', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const metrics = await BusinessMetricsService.getDashboardMetrics(merchantId);
    return res.json({ 
      success: true, 
      data: metrics, 
      message: 'Dashboard metrics retrieved successfully' 
    });
  } catch (error) {
    logger.error('Error getting dashboard metrics:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard metrics',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test route for dashboard timeseries (no auth required)
router.get('/test-dashboard-timeseries', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const days = parseInt(req.query.days as string) || 30;
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const timeSeriesData = await BusinessMetricsService.getTimeSeriesData(merchantId, days);
    return res.json({ 
      success: true, 
      data: timeSeriesData, 
      message: 'Dashboard timeseries data retrieved successfully' 
    });
  } catch (error) {
    logger.error('Error getting dashboard timeseries:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard timeseries',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test route for dashboard categories (no auth required)
router.get('/test-dashboard-categories', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const categoryPerformance = await BusinessMetricsService.getCategoryPerformance(merchantId);
    return res.json({ 
      success: true, 
      data: categoryPerformance, 
      message: 'Dashboard category performance retrieved successfully' 
    });
  } catch (error) {
    logger.error('Error getting dashboard categories:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard categories',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test route for dashboard customer insights (no auth required)
router.get('/test-dashboard-customers', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const customerInsights = await BusinessMetricsService.getCustomerInsights(merchantId);
    return res.json({ 
      success: true, 
      data: customerInsights, 
      message: 'Dashboard customer insights retrieved successfully' 
    });
  } catch (error) {
    logger.error('Error getting dashboard customer insights:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard customer insights',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test route for dashboard insights (no auth required)
router.get('/test-dashboard-insights', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test dashboard not allowed in production'
      });
    }

    const merchantId = req.query.merchantId as string || '507f1f77bcf86cd799439011';
    const { BusinessMetricsService } = await import('../merchantservices/BusinessMetrics');
    const insights = await BusinessMetricsService.getBusinessInsights(merchantId);
    return res.json({ 
      success: true, 
      data: insights, 
      message: 'Dashboard insights retrieved successfully' 
    });
  } catch (error) {
    logger.error('Error getting dashboard insights:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get dashboard insights',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Apply auth middleware to all other routes
router.use(authMiddleware);

// Helper: Validate if value is OrderStatus
const isOrderStatus = (value: any): value is OrderStatus => {
  const statuses: string[] = ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'returned', 'refunded'];
  return statuses.includes(value);
};

// @route   GET /api/orders
// @desc    Get merchant orders with search and filtering
// @access  Private
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId as string;
    const {
      status,
      paymentStatus,
      customerId,
      orderNumber,
      storeId,
      sortBy: sortByParam,
      sortOrder: sortOrderParam,
      page = '1',
      limit = '20',
      dateStart,
      dateEnd
    } = req.query;

    // Validate and enforce correct type for sortBy
    const sortByOptions: SortBy[] = ['created', 'updated', 'total', 'priority'];
    const sortBy: SortBy = sortByOptions.includes(sortByParam as SortBy)
      ? (sortByParam as SortBy)
      : 'created'; // default if invalid

    const sortOrder: 'asc' | 'desc' = sortOrderParam === 'asc' ? 'asc' : 'desc';

    // Build search parameters
    const searchParams: OrderSearchRequest = {
      merchantId,
      sortBy,
      sortOrder,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    if (status && typeof status === 'string' && isValidOrderStatus(status)) {
      searchParams.status = status;
    }
    if (paymentStatus && typeof paymentStatus === 'string') {
      searchParams.paymentStatus = paymentStatus as PaymentStatus;
    }
    if (customerId && typeof customerId === 'string') {
      searchParams.customerId = customerId;
    }
    if (orderNumber && typeof orderNumber === 'string') {
      searchParams.orderNumber = orderNumber;
    }
    if (dateStart && dateEnd && typeof dateStart === 'string' && typeof dateEnd === 'string') {
      searchParams.dateRange = {
        start: new Date(dateStart),
        end: new Date(dateEnd)
      };
    }

    // Validate storeId if provided
    if (storeId && typeof storeId === 'string') {
      const store = await Store.findOne({
        _id: storeId,
        merchantId: merchantId
      });
      
      if (!store) {
        return res.status(400).json({
          success: false,
          message: 'Store not found or does not belong to this merchant'
        });
      }
      
      searchParams.storeId = storeId;
    }

    const result = await OrderModel.search(searchParams);
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId as string;

    const order = await OrderModel.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.merchantId !== merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get store information from the first product in the order
    let storeInfo = null;
    if (order.items && order.items.length > 0) {
      try {
        const firstProductId = order.items[0].productId;
        const product = await Product.findById(firstProductId);
        if (product && (product as any).storeId) {
          const store = await Store.findById((product as any).storeId);
          if (store) {
            storeInfo = {
              _id: (store._id as any).toString(),
              name: store.name,
              location: store.location
            };
          }
        }
      } catch (storeError) {
        logger.warn('Failed to fetch store info for order:', storeError);
        // Continue without store info
      }
    }

    return res.json({
      success: true,
      data: {
        ...order,
        store: storeInfo
      }
    });
  } catch (error) {
    logger.error('Error fetching order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status with inventory management and notifications
// @access  Private
router.put('/:id/status', async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status, notes, notifyCustomer = true, prepTimeMinutes }: UpdateOrderStatusRequest = req.body;
    const merchantId = req.merchantId as string;

    // Validate new status
    if (!isValidOrderStatus(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    // Fetch order from main Order model (not MerchantOrder)
    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify merchant owns this order (check store ownership)
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Status transitions map
    const validTransitions: Record<string, string[]> = {
      placed: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['dispatched', 'delivered'],
      dispatched: ['delivered'],
      delivered: [],
      cancelled: [],
      returned: [],
      refunded: []
    };

    const currentStatus = order.status;
    if (!validTransitions[currentStatus]?.includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${currentStatus} to ${status}`
      });
    }

    // INVENTORY AUTO-DEDUCTION: When order is confirmed
    if (status === 'confirmed' && currentStatus !== 'confirmed') {
      logger.info(`Processing inventory deduction for order ${order.orderNumber}`);

      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);

        if (!product) {
          logger.warn(`Product ${item.product} not found, skipping inventory deduction`);
          continue;
        }

        // Atomic stock deduction with $gte guard — prevents overselling under concurrency
        if (!product.inventory.unlimited) {
          const stockResult = await Product.findOneAndUpdate(
            {
              _id: item.product,
              'inventory.unlimited': false,
              'inventory.stock': { $gte: item.quantity }
            },
            {
              $inc: { 'inventory.stock': -item.quantity }
            },
            { new: true, session }
          );

          if (!stockResult) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for product: ${item.name}. Required: ${item.quantity}`
            });
          }

          // Mark unavailable if stock hit zero
          if (stockResult.inventory.stock === 0) {
            await Product.findByIdAndUpdate(item.product, { 'inventory.isAvailable': false }, { session });
          }

          logger.info(`Deducted ${item.quantity} units from product ${item.name}. New stock: ${stockResult.inventory.stock}`);
        }
      }

      // Generate invoice on confirmation
      try {
        const invoiceUrl = await InvoiceService.generateInvoice(order, merchantId);
        order.invoiceUrl = invoiceUrl;
        order.invoiceGeneratedAt = new Date();
        logger.info(`Invoice generated: ${invoiceUrl}`);
      } catch (invoiceError) {
        logger.error('Failed to generate invoice:', invoiceError);
        // Don't fail the transaction if invoice generation fails
      }
    }

    // INVENTORY RELEASE: When order is cancelled before confirmation
    if (status === 'cancelled' && currentStatus !== 'cancelled') {
      // Only release inventory if it was previously reserved (not yet implemented in this version)
      // In future versions, implement inventory reservation on order placement
      logger.info(`Order ${order.orderNumber} cancelled`);
    }

    // Update order status
    await order.updateStatus(status, notes);

    // Set estimated ready time when merchant confirms with prep time
    if (status === 'confirmed' && prepTimeMinutes && prepTimeMinutes > 0 && prepTimeMinutes <= 300) {
      const readyAt = new Date();
      readyAt.setMinutes(readyAt.getMinutes() + prepTimeMinutes);
      if (!order.fulfillmentDetails) {
        (order as any).fulfillmentDetails = {};
      }
      order.fulfillmentDetails!.estimatedReadyTime = readyAt;
    }

    await order.save({ session });

    // Generate shipping label when order is ready for dispatch
    if (status === 'ready') {
      try {
        const labelUrl = await ShippingLabelService.generateShippingLabel(order, merchantId);
        order.shippingLabelUrl = labelUrl;
        await order.save({ session });
        logger.info(`Shipping label generated: ${labelUrl}`);
      } catch (labelError) {
        logger.error('Failed to generate shipping label:', labelError);
      }
    }

    // Generate packing slip when preparing order
    if (status === 'preparing') {
      try {
        const packingSlipUrl = await InvoiceService.generatePackingSlip(order, merchantId);
        order.packingSlipUrl = packingSlipUrl;
        await order.save({ session });
        logger.info(`Packing slip generated: ${packingSlipUrl}`);
      } catch (slipError) {
        logger.error('Failed to generate packing slip:', slipError);
      }
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // CUSTOMER NOTIFICATIONS (outside transaction to avoid rollback on notification failures)
    if (notifyCustomer && order.delivery?.address?.phone) {
      const storeName = merchant.businessName || 'Store';
      const customerPhone = order.delivery.address.phone;
      const customerEmail = order.delivery.address.email;

      // Send SMS notification
      try {
        const formattedPhone = SMSService.formatPhoneNumber(customerPhone);

        if (order.delivery.trackingId) {
          const message = `Your order #${order.orderNumber} from ${storeName} is out for delivery. Tracking ID: ${order.delivery.trackingId}`;
          await SMSService.send({ to: formattedPhone, message });
        } else if (status === 'confirmed' && order.fulfillmentDetails?.estimatedReadyTime) {
          const mins = Math.max(1, Math.round((order.fulfillmentDetails.estimatedReadyTime.getTime() - Date.now()) / 60000));
          const etaText = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} mins`;
          await SMSService.send({ to: formattedPhone, message: `Your order #${order.orderNumber} from ${storeName} is confirmed! Ready in ~${etaText}. We'll notify you when it's ready.` });
        } else {
          await SMSService.sendOrderStatusUpdate(
            formattedPhone,
            order.orderNumber,
            status,
            storeName
          );
        }
        logger.info(`SMS notification sent to ${customerPhone}`);
      } catch (smsError) {
        logger.warn('Failed to send SMS notification:', smsError);
      }

      // Send email notification
      if (customerEmail) {
        try {
          const statusMessages: Record<string, string> = {
            confirmed: 'Your order has been confirmed and is being processed.',
            preparing: 'Your order is being prepared.',
            ready: 'Your order is ready for pickup/dispatch.',
            dispatched: 'Your order has been dispatched and is on the way.',
            delivered: 'Your order has been delivered. Thank you for shopping with us!',
            cancelled: 'Your order has been cancelled.',
          };

          const emailSubject = `Order ${order.orderNumber} - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Order Status Update</h2>
              <p>Dear ${order.delivery.address.name},</p>
              <p>${statusMessages[status] || `Your order status has been updated to: ${status}`}</p>
              <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Status:</strong> ${status.toUpperCase()}</p>
                ${order.delivery.trackingId ? `<p><strong>Tracking ID:</strong> ${order.delivery.trackingId}</p>` : ''}
                <p><strong>Total Amount:</strong> ₹${order.totals.total.toFixed(2)}</p>
              </div>
              ${order.invoiceUrl ? `<p><a href="${order.invoiceUrl}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Download Invoice</a></p>` : ''}
              <p>Thank you for choosing ${storeName}!</p>
            </div>
          `;

          await EmailService.send({
            to: customerEmail,
            subject: emailSubject,
            html: emailHtml,
          });
          logger.info(`Email notification sent to ${customerEmail}`);
        } catch (emailError) {
          logger.warn('Failed to send email notification:', emailError);
        }
      }
    }

    return res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        invoiceUrl: order.invoiceUrl,
        shippingLabelUrl: order.shippingLabelUrl,
        packingSlipUrl: order.packingSlipUrl,
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Error updating order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// @route   POST /api/orders/bulk-action
// @desc    Perform bulk actions on multiple orders
// @access  Private
router.post('/bulk-action', async (req: Request, res: Response) => {
  try {
    const { orderIds, action, notes, notifyCustomers = true }: BulkOrderAction = req.body;
    const merchantId = req.merchantId as string;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order IDs provided'
      });
    }

    const results: { success: boolean; orderId: string; message?: string }[] = [];
    const actionStatusMap: Record<string, OrderStatus> = {
      confirm: 'confirmed',
      prepare: 'preparing',
      ready: 'ready',
      deliver: 'delivered',
      cancel: 'cancelled'
    };

    const newStatus = actionStatusMap[action];
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bulk action'
      });
    }

    for (const orderId of orderIds) {
      try {
        const order = await OrderModel.findById(orderId);
        if (!order) {
          results.push({
            success: false,
            orderId,
            message: 'Order not found'
          });
          continue;
        }

        if (order.merchantId !== merchantId) {
          results.push({
            success: false,
            orderId,
            message: 'Access denied'
          });
          continue;
        }

        const updatedOrder = await OrderModel.updateStatus(orderId, newStatus, notes);
        if (updatedOrder) {
          results.push({
            success: true,
            orderId
          });
        } else {
          results.push({
            success: false,
            orderId,
            message: 'Failed to update status'
          });
        }
      } catch (error) {
        results.push({
          success: false,
          orderId,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return res.json({
      success: true,
      message: `Bulk action completed. ${successCount}/${orderIds.length} orders updated.`,
      data: {
        results,
        summary: {
          total: orderIds.length,
          successful: successCount,
          failed: orderIds.length - successCount
        }
      }
    });
  } catch (error) {
    logger.error('Error performing bulk action:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/orders/analytics
// @desc    Get order analytics for merchant
// @access  Private
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId as string;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const { dateStart, dateEnd } = req.query;

    let dateRange: { start: Date; end: Date } | undefined;
    if (dateStart && dateEnd && typeof dateStart === 'string' && typeof dateEnd === 'string') {
      dateRange = {
        start: new Date(dateStart),
        end: new Date(dateEnd)
      };
    }

    const analytics = await OrderModel.getAnalytics(merchantId, dateRange);

    // Ensure analytics has required fields
    const analyticsData: any = {
      totalOrders: analytics?.totalOrders ?? 0,
      pendingOrders: analytics?.pendingOrders ?? 0,
      averageOrderValue: analytics?.averageOrderValue ?? 0,
      averageProcessingTime: analytics?.averageProcessingTime ?? 0,
      orderCompletionRate: analytics?.orderCompletionRate ?? 0,
      topSellingProducts: Array.isArray(analytics?.topSellingProducts) ? analytics.topSellingProducts : [],
      hourlyOrderDistribution: Array.isArray(analytics?.hourlyOrderDistribution) ? analytics.hourlyOrderDistribution : [],
      dailyOrderTrends: Array.isArray(analytics?.dailyOrderTrends) ? analytics.dailyOrderTrends : []
    };

    return res.status(200).json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    logger.error('Error fetching order analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order analytics',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// @route   POST /api/orders/sample-data
// @desc    Create sample orders for testing (development only)
// @access  Private
router.post('/sample-data', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Sample data creation not allowed in production'
      });
    }

    // For development testing, use provided merchantId or default
    const merchantId = req.merchantId || req.body.merchantId || 'test-merchant-123';
    await OrderModel.createSampleOrders(merchantId);

    return res.json({
      success: true,
      message: 'Sample orders created successfully',
      merchantId: merchantId
    });
  } catch (error) {
    logger.error('Error creating sample orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create sample orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/orders/:id/invoice
// @desc    Get or generate invoice PDF for an order
// @access  Private
router.get('/:id/invoice', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId as string;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID required'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to merchant
    if ((order as any).merchantId !== merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if format=json is requested (for URL response)
    if (req.query.format === 'json') {
      // If invoice already exists, return URL
      if (order.invoiceUrl) {
        return res.status(200).json({
          success: true,
          data: {
            invoiceUrl: order.invoiceUrl,
            generatedAt: order.invoiceGeneratedAt
          }
        });
      }

      // Generate new invoice and return URL
      const invoiceUrl = await InvoiceService.generateInvoice(order, merchantId);
      order.invoiceUrl = invoiceUrl;
      order.invoiceGeneratedAt = new Date();
      await order.save();

      return res.status(200).json({
        success: true,
        message: 'Invoice generated successfully',
        data: {
          invoiceUrl,
          generatedAt: order.invoiceGeneratedAt
        }
      });
    }

    // Default: Stream PDF directly
    await InvoiceService.streamInvoicePDF(res, order, merchantId);

    // Save invoice URL for future reference (optional, can be done async)
    if (!order.invoiceUrl) {
      // Generate and save URL asynchronously (don't block response)
      InvoiceService.generateInvoice(order, merchantId)
        .then((invoiceUrl) => {
          order.invoiceUrl = invoiceUrl;
          order.invoiceGeneratedAt = new Date();
          order.save().catch((err) => logger.error('Failed to save invoice URL:', err));
        })
        .catch((err) => logger.error('Failed to generate invoice URL:', err));
    }
  } catch (error) {
    logger.error('Error generating invoice:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate invoice',
        ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
      });
    }
  }
});

// @route   GET /api/orders/:id/shipping-label
// @desc    Get or generate shipping label for an order
// @access  Private
router.get('/:id/shipping-label', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId as string;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // If shipping label already exists, return it
    if (order.shippingLabelUrl) {
      return res.json({
        success: true,
        data: {
          shippingLabelUrl: order.shippingLabelUrl
        }
      });
    }

    // Generate new shipping label
    const labelUrl = await ShippingLabelService.generateShippingLabel(order, merchantId);
    order.shippingLabelUrl = labelUrl;
    await order.save();

    return res.json({
      success: true,
      message: 'Shipping label generated successfully',
      data: {
        shippingLabelUrl: labelUrl
      }
    });
  } catch (error) {
    logger.error('Error generating shipping label:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate shipping label',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/orders/:id/packing-slip
// @desc    Get or generate packing slip for an order
// @access  Private
router.get('/:id/packing-slip', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId as string;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // If packing slip already exists, return it
    if (order.packingSlipUrl) {
      return res.json({
        success: true,
        data: {
          packingSlipUrl: order.packingSlipUrl
        }
      });
    }

    // Generate new packing slip
    const slipUrl = await InvoiceService.generatePackingSlip(order, merchantId);
    order.packingSlipUrl = slipUrl;
    await order.save();

    return res.json({
      success: true,
      message: 'Packing slip generated successfully',
      data: {
        packingSlipUrl: slipUrl
      }
    });
  } catch (error) {
    logger.error('Error generating packing slip:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate packing slip',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/orders/bulk-labels
// @desc    Generate shipping labels for multiple orders
// @access  Private
router.post('/bulk-labels', async (req: Request, res: Response) => {
  try {
    const { orderIds } = req.body;
    const merchantId = req.merchantId as string;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order IDs provided'
      });
    }

    const orders = await Order.find({ _id: { $in: orderIds } });

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found'
      });
    }

    // Generate combined label PDF
    const combinedLabelUrl = await ShippingLabelService.generateCombinedShippingLabels(
      orders,
      merchantId
    );

    return res.json({
      success: true,
      message: `Generated shipping labels for ${orders.length} orders`,
      data: {
        combinedLabelUrl,
        orderCount: orders.length
      }
    });
  } catch (error) {
    logger.error('Error generating bulk shipping labels:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate bulk shipping labels',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
