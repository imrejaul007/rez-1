// UserProduct Controller
// Handles user product and service request API endpoints

import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { Types } from 'mongoose';
import userProductService from '../services/userProductService';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get user's products
 * GET /api/user-products
 */
export const getUserProducts = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { status, category, hasWarranty, hasAMC } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (hasWarranty !== undefined) filters.hasWarranty = hasWarranty === 'true';
    if (hasAMC !== undefined) filters.hasAMC = hasAMC === 'true';

    const products = await userProductService.getUserProducts(
      new Types.ObjectId(userId),
      filters
    );

    res.status(200).json({
      success: true,
      data: products,
    });
});

/**
 * Get product details
 * GET /api/user-products/:id
 */
export const getProductDetails = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const product = await userProductService.getProductDetails(
      new Types.ObjectId(userId),
      new Types.ObjectId(id)
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
});

/**
 * Get products with expiring warranties
 * GET /api/user-products/expiring-warranties
 */
export const getExpiringWarranties = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const products = await userProductService.getExpiringWarranties(
      new Types.ObjectId(userId),
      Number(days)
    );

    res.status(200).json({
      success: true,
      data: {
        products,
        count: products.length,
      },
    });
});

/**
 * Get products with expiring AMC
 * GET /api/user-products/expiring-amc
 */
export const getExpiringAMC = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const products = await userProductService.getExpiringAMC(
      new Types.ObjectId(userId),
      Number(days)
    );

    res.status(200).json({
      success: true,
      data: {
        products,
        count: products.length,
      },
    });
});

/**
 * Register product
 * POST /api/user-products/:id/register
 */
export const registerProduct = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { serialNumber, registrationNumber } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!serialNumber) {
      res.status(400).json({
        success: false,
        message: 'Serial number is required',
      });
      return;
    }

    const product = await userProductService.registerProduct(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      serialNumber,
      registrationNumber
    );

    res.status(200).json({
      success: true,
      message: 'Product registered successfully',
      data: product,
    });
});

/**
 * Schedule installation
 * POST /api/user-products/:id/schedule-installation
 */
export const scheduleInstallation = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { scheduledDate, technician, notes } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!scheduledDate) {
      res.status(400).json({
        success: false,
        message: 'Scheduled date is required',
      });
      return;
    }

    const product = await userProductService.scheduleInstallation(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      new Date(scheduledDate),
      technician,
      notes
    );

    res.status(200).json({
      success: true,
      message: 'Installation scheduled successfully',
      data: product,
    });
});

/**
 * Renew AMC
 * POST /api/user-products/:id/renew-amc
 */
export const renewAMC = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { duration, amount } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!duration || !amount) {
      res.status(400).json({
        success: false,
        message: 'Duration and amount are required',
      });
      return;
    }

    const product = await userProductService.renewAMC(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      Number(duration),
      Number(amount)
    );

    res.status(200).json({
      success: true,
      message: 'AMC renewed successfully',
      data: product,
    });
});

/**
 * Get warranty details
 * GET /api/user-products/:id/warranty
 */
export const getWarrantyDetails = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const product = await userProductService.getProductDetails(
      new Types.ObjectId(userId),
      new Types.ObjectId(id)
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        warranty: product.warranty,
        warrantyDaysRemaining: product.warrantyDaysRemaining,
        warrantyStatus: product.warrantyStatus,
        isWarrantyExpiringSoon: product.isWarrantyExpiringSoon,
      },
    });
});

/**
 * Get AMC details
 * GET /api/user-products/:id/amc
 */
export const getAMCDetails = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const product = await userProductService.getProductDetails(
      new Types.ObjectId(userId),
      new Types.ObjectId(id)
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        amc: product.amc,
        amcDaysRemaining: product.amcDaysRemaining,
        isAMCExpiringSoon: product.isAMCExpiringSoon,
      },
    });
});

// ============================================================================
// SERVICE REQUEST ENDPOINTS
// ============================================================================

/**
 * Create service request
 * POST /api/service-requests
 */
export const createServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const {
      userProductId,
      productId,
      requestType,
      priority,
      issueDescription,
      issueCategory,
      images,
      addressId,
      estimatedCost,
    } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const serviceRequest = await userProductService.createServiceRequest({
      userId: new Types.ObjectId(userId),
      userProductId: new Types.ObjectId(userProductId),
      productId: new Types.ObjectId(productId),
      requestType,
      priority,
      issueDescription,
      issueCategory,
      images,
      addressId: new Types.ObjectId(addressId),
      estimatedCost,
    });

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: serviceRequest,
    });
});

/**
 * Get service requests
 * GET /api/service-requests
 */
export const getServiceRequests = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { status, requestType, priority, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (requestType) filters.requestType = requestType;
    if (priority) filters.priority = priority;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const result = await userProductService.getUserServiceRequests(
      new Types.ObjectId(userId),
      filters,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
});

/**
 * Get service request details
 * GET /api/service-requests/:id
 */
export const getServiceRequestDetails = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const request = await userProductService.getServiceRequestDetails(
      new Types.ObjectId(userId),
      new Types.ObjectId(id)
    );

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: request,
    });
});

/**
 * Cancel service request
 * POST /api/service-requests/:id/cancel
 */
export const cancelServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { reason } = req.body;

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
        message: 'Cancellation reason is required',
      });
      return;
    }

    const request = await userProductService.cancelServiceRequest(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      reason
    );

    res.status(200).json({
      success: true,
      message: 'Service request cancelled successfully',
      data: request,
    });
});

/**
 * Reschedule service request
 * POST /api/service-requests/:id/reschedule
 */
export const rescheduleServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { newDate, newTimeSlot } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!newDate || !newTimeSlot) {
      res.status(400).json({
        success: false,
        message: 'New date and time slot are required',
      });
      return;
    }

    const request = await userProductService.rescheduleServiceRequest(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      new Date(newDate),
      newTimeSlot
    );

    res.status(200).json({
      success: true,
      message: 'Service request rescheduled successfully',
      data: request,
    });
});

/**
 * Rate service request
 * POST /api/service-requests/:id/rate
 */
export const rateServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { rating, feedback } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
      return;
    }

    const request = await userProductService.rateServiceRequest(
      new Types.ObjectId(userId),
      new Types.ObjectId(id),
      Number(rating),
      feedback
    );

    res.status(200).json({
      success: true,
      message: 'Service request rated successfully',
      data: request,
    });
});

/**
 * Get active service requests
 * GET /api/service-requests/active
 */
export const getActiveServiceRequests = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const requests = await userProductService.getActiveServiceRequests(
      new Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: {
        requests,
        count: requests.length,
      },
    });
});
