// UserProduct Service
// Business logic for user product and service request management

import { Types } from 'mongoose';
import { UserProduct, IUserProduct } from '../models/UserProduct';
import { ServiceRequest, IServiceRequest, ITechnician } from '../models/ServiceRequest';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { logger } from '../config/logger';

interface CreateUserProductData {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  orderId: Types.ObjectId;
  quantity: number;
  totalPrice: number;
  purchaseDate: Date;
  warranty?: {
    hasWarranty: boolean;
    duration?: number; // months
    warrantyCard?: string;
    terms?: string[];
  };
  installation?: {
    required: boolean;
  };
}

interface CreateServiceRequestData {
  userId: Types.ObjectId;
  userProductId: Types.ObjectId;
  productId: Types.ObjectId;
  requestType: 'repair' | 'replacement' | 'installation' | 'maintenance' | 'inspection';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  issueDescription: string;
  issueCategory?: string;
  images?: string[];
  addressId: Types.ObjectId;
  estimatedCost?: number;
}

class UserProductService {
  /**
   * Create user product entry (auto-called on order delivery)
   */
  async createUserProduct(data: CreateUserProductData): Promise<IUserProduct> {
    try {
      // Calculate warranty dates if warranty exists
      let warrantyData = data.warranty || { hasWarranty: false };

      if (warrantyData.hasWarranty && warrantyData.duration) {
        const startDate = new Date(data.purchaseDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + warrantyData.duration);

        warrantyData = {
          ...warrantyData,
          startDate,
          endDate,
        } as any;
      }

      const userProduct = await UserProduct.create({
        user: data.userId,
        product: data.productId,
        order: data.orderId,
        quantity: data.quantity,
        totalPrice: data.totalPrice,
        purchaseDate: data.purchaseDate,
        warranty: warrantyData,
        installation: data.installation || { required: false, scheduled: false, completed: false },
        status: 'active',
      });

      logger.info(`✅ [USER PRODUCT SERVICE] Created user product: ${userProduct._id}`);

      return userProduct;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error creating user product:', error);
      throw error;
    }
  }

  /**
   * Create user products from delivered order
   */
  async createUserProductsFromOrder(orderId: Types.ObjectId): Promise<IUserProduct[]> {
    try {
      const order = await Order.findById(orderId).populate('items.product').lean();

      if (!order) {
        logger.info(`⚠️ [USER PRODUCT SERVICE] Order not found: ${orderId}`);
        return [];
      }

      // Only create for delivered orders
      if (order.status !== 'delivered') {
        logger.info(`⚠️ [USER PRODUCT SERVICE] Order not delivered yet: ${orderId}`);
        return [];
      }

      // Check if user products already exist for this order
      const existingProducts = await UserProduct.find({ order: orderId }).lean();
      if (existingProducts.length > 0) {
        logger.info(`⚠️ [USER PRODUCT SERVICE] User products already exist for order: ${orderId}`);
        return existingProducts as unknown as IUserProduct[];
      }

      const userProducts: IUserProduct[] = [];

      for (const orderItem of order.items) {
        const product: any = orderItem.product;

        if (!product) {
          continue;
        }

        // Determine if product has warranty
        const hasWarranty = product.warranty?.duration > 0;
        const warrantyDuration = product.warranty?.duration || 0;

        // Determine if product needs installation
        const needsInstallation = product.installationRequired || false;

        const userProduct = await this.createUserProduct({
          userId: order.user as Types.ObjectId,
          productId: product._id,
          orderId: order._id as Types.ObjectId,
          quantity: orderItem.quantity,
          totalPrice: orderItem.price * orderItem.quantity,
          purchaseDate: order.createdAt,
          warranty: hasWarranty ? {
            hasWarranty: true,
            duration: warrantyDuration,
            terms: product.warranty?.terms || [],
          } : undefined,
          installation: {
            required: needsInstallation,
          },
        });

        userProducts.push(userProduct);
      }

      logger.info(`✅ [USER PRODUCT SERVICE] Created ${userProducts.length} user products from order`);

      return userProducts;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error creating user products from order:', error);
      throw error;
    }
  }

  /**
   * Get user's products
   */
  async getUserProducts(
    userId: Types.ObjectId,
    filters: any = {}
  ): Promise<IUserProduct[]> {
    try {
      return await (UserProduct as any).getUserProducts(userId, filters);
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error getting user products:', error);
      throw error;
    }
  }

  /**
   * Get product details
   */
  async getProductDetails(
    userId: Types.ObjectId,
    productId: Types.ObjectId
  ): Promise<IUserProduct | null> {
    try {
      const userProduct = await UserProduct.findOne({
        _id: productId,
        user: userId,
      })
        .populate('product', 'name images category basePrice description')
        .populate('order', 'orderNumber totalAmount createdAt')
        .populate('serviceRequests')
        .lean();

      return userProduct as unknown as IUserProduct | null;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error getting product details:', error);
      throw error;
    }
  }

  /**
   * Get products with expiring warranties
   */
  async getExpiringWarranties(
    userId: Types.ObjectId,
    days: number = 30
  ): Promise<IUserProduct[]> {
    try {
      return await (UserProduct as any).getExpiringWarranties(userId, days);
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error getting expiring warranties:', error);
      throw error;
    }
  }

  /**
   * Get products with expiring AMC
   */
  async getExpiringAMC(
    userId: Types.ObjectId,
    days: number = 30
  ): Promise<IUserProduct[]> {
    try {
      return await (UserProduct as any).getExpiringAMC(userId, days);
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error getting expiring AMC:', error);
      throw error;
    }
  }

  /**
   * Register product
   */
  async registerProduct(
    userId: Types.ObjectId,
    productId: Types.ObjectId,
    serialNumber: string,
    registrationNumber?: string
  ): Promise<IUserProduct> {
    try {
      const userProduct = await UserProduct.findOne({
        _id: productId,
        user: userId,
      }).lean();

      if (!userProduct) {
        throw new Error('Product not found');
      }

      if (userProduct.registration.isRegistered) {
        throw new Error('Product is already registered');
      }

      await (userProduct as any).registerProduct(serialNumber, registrationNumber);

      logger.info(`✅ [USER PRODUCT SERVICE] Product registered successfully`);

      return userProduct as unknown as IUserProduct;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error registering product:', error);
      throw error;
    }
  }

  /**
   * Schedule installation
   */
  async scheduleInstallation(
    userId: Types.ObjectId,
    productId: Types.ObjectId,
    scheduledDate: Date,
    technician?: string,
    notes?: string
  ): Promise<IUserProduct> {
    try {
      const userProduct = await UserProduct.findOne({
        _id: productId,
        user: userId,
      }).lean();

      if (!userProduct) {
        throw new Error('Product not found');
      }

      if (!userProduct.installation.required) {
        throw new Error('Installation not required for this product');
      }

      await (userProduct as any).scheduleInstallation(scheduledDate, technician, notes);

      logger.info(`✅ [USER PRODUCT SERVICE] Installation scheduled successfully`);

      return userProduct as unknown as IUserProduct;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error scheduling installation:', error);
      throw error;
    }
  }

  /**
   * Renew AMC
   */
  async renewAMC(
    userId: Types.ObjectId,
    productId: Types.ObjectId,
    duration: number,
    amount: number
  ): Promise<IUserProduct> {
    try {
      const userProduct = await UserProduct.findOne({
        _id: productId,
        user: userId,
      }).lean();

      if (!userProduct) {
        throw new Error('Product not found');
      }

      await (userProduct as any).renewAMC(duration, amount);

      logger.info(`✅ [USER PRODUCT SERVICE] AMC renewed successfully`);

      return userProduct as unknown as IUserProduct;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error renewing AMC:', error);
      throw error;
    }
  }

  /**
   * Create service request
   */
  async createServiceRequest(data: CreateServiceRequestData): Promise<IServiceRequest> {
    try {
      // Verify user product exists and belongs to user
      const userProduct = await UserProduct.findOne({
        _id: data.userProductId,
        user: data.userId,
      }).lean();

      if (!userProduct) {
        throw new Error('Product not found');
      }

      // Generate request number
      const requestNumber = await (ServiceRequest as any).generateRequestNumber();

      // Check if warranty covers the service
      let warrantyCovered = false;
      if (userProduct.warranty.hasWarranty && userProduct.warrantyStatus === 'active') {
        if (data.requestType === 'repair' || data.requestType === 'replacement') {
          warrantyCovered = true;
        }
      }

      // Create service request
      const serviceRequest = await ServiceRequest.create({
        requestNumber,
        user: data.userId,
        userProduct: data.userProductId,
        product: data.productId,
        requestType: data.requestType,
        priority: data.priority || 'medium',
        issueDescription: data.issueDescription,
        issueCategory: data.issueCategory,
        images: data.images || [],
        address: data.addressId,
        cost: {
          estimatedCost: data.estimatedCost || 0,
          warrantyCovered,
        },
        status: 'pending',
      });

      // Add service request reference to user product
      userProduct.serviceRequests.push(serviceRequest._id);
      await userProduct.save();

      logger.info(`✅ [USER PRODUCT SERVICE] Created service request: ${requestNumber}`);

      return serviceRequest;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error creating service request:', error);
      throw error;
    }
  }

  /**
   * Get user's service requests
   */
  async getUserServiceRequests(
    userId: Types.ObjectId,
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ requests: IServiceRequest[]; total: number; pages: number }> {
    try {
      return await (ServiceRequest as any).getUserRequests(userId, filters, page, limit);
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error getting service requests:', error);
      throw error;
    }
  }

  /**
   * Get service request details
   */
  async getServiceRequestDetails(
    userId: Types.ObjectId,
    requestId: Types.ObjectId
  ): Promise<IServiceRequest | null> {
    try {
      const request = await ServiceRequest.findOne({
        _id: requestId,
        user: userId,
      })
        .populate('product', 'name images category')
        .populate('userProduct', 'purchaseDate warranty registration')
        .populate('address', 'fullAddress city state pincode')
        .lean();

      return request as unknown as IServiceRequest | null;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error getting service request details:', error);
      throw error;
    }
  }

  /**
   * Schedule service request
   */
  async scheduleServiceRequest(
    userId: Types.ObjectId,
    requestId: Types.ObjectId,
    scheduledDate: Date,
    timeSlot: string,
    technician?: ITechnician
  ): Promise<IServiceRequest> {
    try {
      const request = await ServiceRequest.findOne({
        _id: requestId,
        user: userId,
      }).lean();

      if (!request) {
        throw new Error('Service request not found');
      }

      await (request as any).scheduleService(scheduledDate, timeSlot, technician);

      logger.info(`✅ [USER PRODUCT SERVICE] Service request scheduled successfully`);

      return request as unknown as IServiceRequest;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error scheduling service request:', error);
      throw error;
    }
  }

  /**
   * Cancel service request
   */
  async cancelServiceRequest(
    userId: Types.ObjectId,
    requestId: Types.ObjectId,
    reason: string
  ): Promise<IServiceRequest> {
    try {
      const request = await ServiceRequest.findOne({
        _id: requestId,
        user: userId,
      }).lean();

      if (!request) {
        throw new Error('Service request not found');
      }

      await (request as any).cancelService(reason);

      logger.info(`✅ [USER PRODUCT SERVICE] Service request cancelled successfully`);

      return request as unknown as IServiceRequest;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error cancelling service request:', error);
      throw error;
    }
  }

  /**
   * Reschedule service request
   */
  async rescheduleServiceRequest(
    userId: Types.ObjectId,
    requestId: Types.ObjectId,
    newDate: Date,
    newTimeSlot: string
  ): Promise<IServiceRequest> {
    try {
      const request = await ServiceRequest.findOne({
        _id: requestId,
        user: userId,
      }).lean();

      if (!request) {
        throw new Error('Service request not found');
      }

      await (request as any).rescheduleService(newDate, newTimeSlot);

      logger.info(`✅ [USER PRODUCT SERVICE] Service request rescheduled successfully`);

      return request as unknown as IServiceRequest;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error rescheduling service request:', error);
      throw error;
    }
  }

  /**
   * Rate service request
   */
  async rateServiceRequest(
    userId: Types.ObjectId,
    requestId: Types.ObjectId,
    rating: number,
    feedback?: string
  ): Promise<IServiceRequest> {
    try {
      const request = await ServiceRequest.findOne({
        _id: requestId,
        user: userId,
      }).lean();

      if (!request) {
        throw new Error('Service request not found');
      }

      await (request as any).rateService(rating, feedback);

      logger.info(`✅ [USER PRODUCT SERVICE] Service request rated successfully`);

      return request as unknown as IServiceRequest;
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error rating service request:', error);
      throw error;
    }
  }

  /**
   * Get active service requests
   */
  async getActiveServiceRequests(userId: Types.ObjectId): Promise<IServiceRequest[]> {
    try {
      return await (ServiceRequest as any).getActiveRequests(userId);
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error getting active service requests:', error);
      throw error;
    }
  }

  /**
   * Mark expired warranties (scheduled task)
   */
  async markExpiredWarranties(): Promise<number> {
    try {
      return await (UserProduct as any).markExpiredWarranties();
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error marking expired warranties:', error);
      throw error;
    }
  }

  /**
   * Send warranty expiry reminders (to be implemented with notification service)
   */
  async sendWarrantyExpiryReminders(days: number = 30): Promise<void> {
    try {
      // Get all products with warranties expiring in specified days
      const expiringProducts = await UserProduct.find({
        'warranty.hasWarranty': true,
        'warranty.endDate': {
          $gte: new Date(),
          $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        },
      })
        .populate('user', 'profile.firstName profile.phoneNumber profile.email')
        .populate('product', 'name')
        .lean();

      logger.info(`📧 [USER PRODUCT SERVICE] Found ${expiringProducts.length} products with expiring warranties`);

      // TODO: Integrate with notification service to send reminders
      // For now, just logging

      for (const product of expiringProducts) {
        logger.info(`⚠️ Warranty expiring soon for product: ${(product.product as any).name}`);
      }
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error sending warranty expiry reminders:', error);
      throw error;
    }
  }

  /**
   * Send AMC renewal reminders
   */
  async sendAMCRenewalReminders(days: number = 30): Promise<void> {
    try {
      // Get all products with AMC expiring in specified days
      const expiringAMC = await UserProduct.find({
        'amc.hasAMC': true,
        'amc.endDate': {
          $gte: new Date(),
          $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        },
      })
        .populate('user', 'profile.firstName profile.phoneNumber profile.email')
        .populate('product', 'name')
        .lean();

      logger.info(`📧 [USER PRODUCT SERVICE] Found ${expiringAMC.length} products with expiring AMC`);

      // TODO: Integrate with notification service to send reminders

      for (const product of expiringAMC) {
        logger.info(`⚠️ AMC expiring soon for product: ${(product.product as any).name}`);
      }
    } catch (error) {
      logger.error('❌ [USER PRODUCT SERVICE] Error sending AMC renewal reminders:', error);
      throw error;
    }
  }
}

export default new UserProductService();
