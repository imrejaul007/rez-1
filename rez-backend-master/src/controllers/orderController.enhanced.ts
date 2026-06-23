/**
 * Enhanced Order Controller Functions
 *
 * This file contains enhanced order controller functions with real-time Socket.IO updates
 * INSTRUCTIONS: Merge these functions into orderController.ts
 *
 * 1. Add import: import orderSocketService from '../services/orderSocketService';
 * 2. Replace the existing updateOrderStatus function with the one below
 * 3. Update the createOrder success response with the socket emit code
 */

// ====================================================================
// ADD THIS IMPORT TO THE TOP OF orderController.ts
// ====================================================================
// import orderSocketService from '../services/orderSocketService';

// ====================================================================
// REPLACE THE EXISTING updateOrderStatus FUNCTION WITH THIS:
// ====================================================================

/*
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const {
    status,
    estimatedDeliveryTime,
    trackingInfo,
    deliveryPartner,
    location,
    message
  } = req.body;

  try {
    const order = await Order.findById(orderId).lean();

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    const previousStatus = order.status;

    // Update status
    order.status = status;

    // Update delivery status based on order status
    const deliveryStatusMap: { [key: string]: string } = {
      confirmed: 'confirmed',
      preparing: 'preparing',
      ready: 'ready',
      dispatched: 'dispatched',
      delivered: 'delivered',
      cancelled: 'failed',
    };

    if (deliveryStatusMap[status]) {
      order.delivery.status = deliveryStatusMap[status];
    }

    // Update tracking info if provided
    if (trackingInfo) {
      order.tracking = {
        ...order.tracking,
        ...trackingInfo,
        lastUpdated: new Date()
      };
    }

    // Update delivery partner if provided
    if (deliveryPartner) {
      order.delivery.deliveryPartner = deliveryPartner.name || deliveryPartner;

      // Emit delivery partner assigned event
      try {
        orderSocketService.emitPartnerAssigned({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          deliveryPartner: {
            id: deliveryPartner.id || '',
            name: deliveryPartner.name || deliveryPartner,
            phone: deliveryPartner.phone || '',
            vehicle: deliveryPartner.vehicle,
            vehicleNumber: deliveryPartner.vehicleNumber,
            photoUrl: deliveryPartner.photoUrl,
            rating: deliveryPartner.rating,
          },
          estimatedPickupTime: deliveryPartner.estimatedPickupTime,
          estimatedDeliveryTime: estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : undefined,
          timestamp: new Date(),
        });
      } catch (socketError) {
        logger.error('❌ [UPDATE ORDER STATUS] Socket emission failed:', socketError);
      }
    }

    // Update estimated delivery time
    if (estimatedDeliveryTime) {
      order.delivery.estimatedTime = new Date(estimatedDeliveryTime);
      order.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
    }

    // Set timestamps for specific statuses
    if (status === 'dispatched') {
      order.delivery.dispatchedAt = new Date();
    } else if (status === 'delivered') {
      order.delivery.deliveredAt = new Date();
      order.delivery.actualTime = new Date();
      order.deliveredAt = new Date();
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date();
    }

    // Add timeline entry
    const statusMessages: { [key: string]: string } = {
      placed: 'Order has been placed successfully',
      confirmed: 'Order has been confirmed by the store',
      preparing: 'Your order is being prepared',
      ready: 'Order is ready for pickup/dispatch',
      dispatched: 'Order has been dispatched',
      out_for_delivery: 'Order is out for delivery',
      delivered: 'Order has been delivered successfully',
      cancelled: 'Order has been cancelled',
    };

    order.timeline.push({
      status,
      message: message || statusMessages[status] || `Order status updated to ${status}`,
      timestamp: new Date(),
    });

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name images')
      .populate('user', 'profile.firstName profile.lastName').lean();

    // Emit socket event for order status update
    try {
      orderSocketService.emitOrderStatusUpdate({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status,
        previousStatus,
        message: message || statusMessages[status] || `Order status updated to ${status}`,
        timestamp: new Date(),
        estimatedDeliveryTime: order.delivery.estimatedTime,
      });

      // Emit timeline update
      orderSocketService.emitTimelineUpdate({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        timeline: order.timeline,
        timestamp: new Date(),
      });

      // If location provided, emit location update
      if (location && status === 'dispatched') {
        orderSocketService.emitOrderLocationUpdate({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
          },
          deliveryPartner: {
            name: deliveryPartner?.name || order.delivery.deliveryPartner || 'Delivery Partner',
            phone: deliveryPartner?.phone || '',
            vehicle: deliveryPartner?.vehicle,
            photoUrl: deliveryPartner?.photoUrl,
          },
          estimatedArrival: order.delivery.estimatedTime,
          distanceToDestination: location.distanceToDestination,
          timestamp: new Date(),
        });
      }

      // If delivered, emit delivered event
      if (status === 'delivered') {
        orderSocketService.emitOrderDelivered({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          deliveredAt: order.delivery.deliveredAt || new Date(),
          deliveredTo: req.body.deliveredTo,
          signature: req.body.signature,
          photoUrl: req.body.photoUrl,
          otp: req.body.otp,
          timestamp: new Date(),
        });
      }
    } catch (socketError) {
      logger.error('❌ [UPDATE ORDER STATUS] Socket emission failed:', socketError);
    }

    sendSuccess(res, populatedOrder, 'Order status updated successfully');

  } catch (error) {
    throw new AppError('Failed to update order status', 500);
  }
});
*/

// ====================================================================
// ADD THIS CODE AFTER LINE 284 in createOrder function:
// (right before sendSuccess(res, populatedOrder...))
// ====================================================================

/*
    // Emit socket event for order creation
    try {
      orderSocketService.emitOrderCreated(userId, {
        orderId: populatedOrder._id.toString(),
        orderNumber: populatedOrder.orderNumber,
        status: populatedOrder.status,
        total: populatedOrder.totals.total,
        items: populatedOrder.items.length,
      });
    } catch (socketError) {
      logger.error('❌ [CREATE ORDER] Socket emission failed:', socketError);
    }
*/
