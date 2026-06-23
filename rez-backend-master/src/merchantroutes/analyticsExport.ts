/**
 * Analytics Routes — Export section (Phase 6.3)
 *
 * Extracted from the original monolithic analytics.ts. Handles:
 * - /export, /export/:exportId, /customers/segments, /offers/top, /customers/list
 */

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/merchantauth";
import { AnalyticsService } from "../merchantservices/AnalyticsService";
import { Store } from "../models/Store";
import { exportQueue, isRedisAvailable } from "../config/queue.config";
import { ExportJobData } from "../services/exportService";
import { logger } from "../config/logger";
import { getStoreId, parseDateRange } from "./analyticsHelpers";

const router = Router();

router.use(authMiddleware);

router.get('/export', async (req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    message: 'Export endpoint not found. Use POST /api/merchant/analytics/export to create an export job.'
  });
});

/**
 * @route   POST /api/merchant/analytics/export
 * @desc    Create a new export job
 * @access  Private
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { exportType, format, startDate, endDate, filters } = req.body;

    // Validate export type
    const validExportTypes = ['sales', 'products', 'customers', 'orders'];
    if (!exportType || !validExportTypes.includes(exportType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export type. Must be one of: sales, products, customers, orders'
      });
    }

    // Validate format
    const validFormats = ['csv', 'json'];
    if (!format || !validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Must be one of: csv, json'
      });
    }

    // Check if Redis/Queue is available
    if (!exportQueue) {
      return res.status(503).json({
        success: false,
        message: 'Export service unavailable. Redis is not running. Please contact administrator.',
        error: 'REDIS_UNAVAILABLE'
      });
    }

    // Create export job data
    const jobData: ExportJobData = {
      storeId,
      exportType,
      format,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      filters
    };

    // Add job to queue
    const job = await exportQueue.add('export', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        exportId: job.id!.toString(),
        status: 'pending',
        message: 'Export job created successfully'
      }
    });
  } catch (error) {
    logger.error('Error creating export job:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create export job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/merchant/analytics/export/:exportId
 * @desc    Get export job status and download URL
 * @access  Private
 */
router.get('/export/:exportId', async (req: Request, res: Response) => {
  try {
    const { exportId } = req.params;
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    // Check if Redis/Queue is available
    if (!exportQueue) {
      return res.status(503).json({
        success: false,
        message: 'Export service unavailable. Redis is not running.',
        error: 'REDIS_UNAVAILABLE'
      });
    }

    // Get job from Bull queue
    const job = await exportQueue.getJob(exportId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Export job not found'
      });
    }

    // Verify job belongs to this store
    if (job.data.storeId !== storeId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this export job'
      });
    }

    // Get job state and progress (bullmq v5 Job API)
    const state = await (job as any).getState();
    const progress = (job as any).progress();
    const returnValue = (job as any).returnvalue;

    // Map Bull job states to our status format
    let status: 'pending' | 'processing' | 'completed' | 'failed';
    switch (state) {
      case 'waiting':
      case 'delayed':
        status = 'pending';
        break;
      case 'active':
        status = 'processing';
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      default:
        status = 'pending';
    }

    // Prepare response
    const exportStatus: any = {
      exportId: job.id!.toString(),
      storeId: job.data.storeId,
      exportType: job.data.exportType,
      format: job.data.format,
      status,
      progress: typeof progress === 'number' ? progress : 0,
      createdAt: new Date(job.timestamp).toISOString()
    };

    // Add download URL if completed
    if (status === 'completed' && returnValue?.fileUrl) {
      exportStatus.downloadUrl = returnValue.fileUrl;
      exportStatus.fileName = returnValue.fileName;
      exportStatus.recordCount = returnValue.recordCount;
      exportStatus.expiresAt = new Date(job.timestamp + 24 * 60 * 60 * 1000).toISOString();
    }

    // Add error message if failed
    if (status === 'failed' && job.failedReason) {
      exportStatus.error = job.failedReason;
    }

    return res.json({
      success: true,
      data: exportStatus
    });
  } catch (error) {
    logger.error('Error fetching export status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch export status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== CUSTOMER SEGMENTS ====================

/**
 * @route   GET /api/analytics/customers/segments
 * @desc    Get customer segment breakdown for dashboard
 * @access  Private
 */
router.get('/customers/segments', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { startDate, endDate } = parseDateRange(req.query);

    // Get customer segments using aggregation
    const Order = require('../models/Order').Order;

    const segmentData = await Order.aggregate([
      {
        $match: {
          'items.store': new (require('mongoose').Types.ObjectId)(storeId),
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new (require('mongoose').Types.ObjectId)(storeId)
        }
      },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$items.subtotal' },
          orderCount: { $addToSet: '$_id' },
          firstOrder: { $min: '$createdAt' },
          lastOrder: { $max: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          orderCount: { $size: '$orderCount' },
          firstOrder: 1,
          lastOrder: 1,
          avgOrderValue: { $divide: ['$totalSpent', { $size: '$orderCount' }] }
        }
      }
    ]);

    // Categorize customers into segments
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let highValue = { count: 0, revenue: 0, avgOrderValue: 0 };
    let mediumValue = { count: 0, revenue: 0, avgOrderValue: 0 };
    let lowValue = { count: 0, revenue: 0, avgOrderValue: 0 };
    let newCustomers = { count: 0, revenue: 0, avgOrderValue: 0 };
    let atRisk = { count: 0, revenue: 0, avgOrderValue: 0 };

    const highValueThreshold = 5000; // Customers who spent more than ₹5000
    const mediumValueThreshold = 1000; // Customers who spent ₹1000-5000

    segmentData.forEach((customer: any) => {
      const isNew = customer.firstOrder >= thirtyDaysAgo;
      const isAtRisk = customer.lastOrder < thirtyDaysAgo && customer.orderCount > 1;

      if (isNew) {
        newCustomers.count++;
        newCustomers.revenue += customer.totalSpent;
        newCustomers.avgOrderValue = newCustomers.revenue / newCustomers.count;
      } else if (isAtRisk) {
        atRisk.count++;
        atRisk.revenue += customer.totalSpent;
        atRisk.avgOrderValue = atRisk.revenue / atRisk.count;
      } else if (customer.totalSpent >= highValueThreshold) {
        highValue.count++;
        highValue.revenue += customer.totalSpent;
        highValue.avgOrderValue = highValue.revenue / highValue.count;
      } else if (customer.totalSpent >= mediumValueThreshold) {
        mediumValue.count++;
        mediumValue.revenue += customer.totalSpent;
        mediumValue.avgOrderValue = mediumValue.revenue / mediumValue.count;
      } else {
        lowValue.count++;
        lowValue.revenue += customer.totalSpent;
        lowValue.avgOrderValue = lowValue.count > 0 ? lowValue.revenue / lowValue.count : 0;
      }
    });

    const totalCustomers = segmentData.length;

    const segments = [
      {
        segment: 'high_value',
        count: highValue.count,
        percentage: totalCustomers > 0 ? (highValue.count / totalCustomers) * 100 : 0,
        revenue: Math.round(highValue.revenue * 100) / 100,
        avgOrderValue: Math.round(highValue.avgOrderValue * 100) / 100,
        color: '#10B981'
      },
      {
        segment: 'medium_value',
        count: mediumValue.count,
        percentage: totalCustomers > 0 ? (mediumValue.count / totalCustomers) * 100 : 0,
        revenue: Math.round(mediumValue.revenue * 100) / 100,
        avgOrderValue: Math.round(mediumValue.avgOrderValue * 100) / 100,
        color: '#3B82F6'
      },
      {
        segment: 'low_value',
        count: lowValue.count,
        percentage: totalCustomers > 0 ? (lowValue.count / totalCustomers) * 100 : 0,
        revenue: Math.round(lowValue.revenue * 100) / 100,
        avgOrderValue: Math.round(lowValue.avgOrderValue * 100) / 100,
        color: '#F59E0B'
      },
      {
        segment: 'new',
        count: newCustomers.count,
        percentage: totalCustomers > 0 ? (newCustomers.count / totalCustomers) * 100 : 0,
        revenue: Math.round(newCustomers.revenue * 100) / 100,
        avgOrderValue: Math.round(newCustomers.avgOrderValue * 100) / 100,
        color: '#8B5CF6'
      },
      {
        segment: 'at_risk',
        count: atRisk.count,
        percentage: totalCustomers > 0 ? (atRisk.count / totalCustomers) * 100 : 0,
        revenue: Math.round(atRisk.revenue * 100) / 100,
        avgOrderValue: Math.round(atRisk.avgOrderValue * 100) / 100,
        color: '#EF4444'
      }
    ].filter(s => s.count > 0);

    return res.status(200).json({
      success: true,
      data: {
        timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        segments,
        totalCustomers,
        summary: {
          highValuePercentage: totalCustomers > 0 ? (highValue.count / totalCustomers) * 100 : 0,
          newCustomerPercentage: totalCustomers > 0 ? (newCustomers.count / totalCustomers) * 100 : 0,
          atRiskPercentage: totalCustomers > 0 ? (atRisk.count / totalCustomers) * 100 : 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching customer segments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer segments',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== TOP OFFERS ====================

/**
 * @route   GET /api/analytics/offers/top
 * @desc    Get top performing offers for dashboard
 * @access  Private
 */
router.get('/offers/top', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { limit = '5' } = req.query;
    const limitValue = parseInt(limit as string);
    const { startDate, endDate } = parseDateRange(req.query);

    const Offer = require('../models/Offer').default;
    const OfferRedemption = require('../models/OfferRedemption').default;
    const ObjectId = require('mongoose').Types.ObjectId;

    // Get offers for this store
    const storeOffers = await Offer.find({
      'store.id': new ObjectId(storeId),
      'validity.isActive': true
    }).lean();

    if (storeOffers.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          offers: [],
          summary: {
            totalRedemptions: 0,
            totalRevenue: 0,
            avgConversionRate: 0
          }
        }
      });
    }

    const offerIds = storeOffers.map((o: any) => o._id);

    // Get redemption stats for each offer
    const redemptionStats = await OfferRedemption.aggregate([
      {
        $match: {
          offer: { $in: offerIds },
          redemptionDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['used', 'active'] }
        }
      },
      {
        $group: {
          _id: '$offer',
          redemptions: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$usedAmount', 0] } },
          usedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] }
          }
        }
      }
    ]);

    // Map redemption stats to offers
    const redemptionMap = new Map();
    redemptionStats.forEach((stat: any) => {
      redemptionMap.set(stat._id.toString(), stat);
    });

    // Build top offers response
    const topOffers = storeOffers
      .map((offer: any) => {
        const stats = redemptionMap.get(offer._id.toString()) || { redemptions: 0, revenue: 0, usedCount: 0 };
        const conversionRate = stats.redemptions > 0 ? stats.usedCount / stats.redemptions : 0;
        const avgOrderValue = stats.usedCount > 0 ? stats.revenue / stats.usedCount : 0;

        return {
          offerId: offer._id.toString(),
          offerName: offer.title,
          discountType: offer.type === 'cashback' ? 'percentage' : offer.type === 'discount' ? 'percentage' : 'fixed',
          discountValue: offer.cashbackPercentage || (offer.originalPrice && offer.discountedPrice ?
            Math.round(((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100) : 0),
          redemptions: stats.redemptions,
          revenue: Math.round(stats.revenue * 100) / 100,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100
        };
      })
      .sort((a: any, b: any) => b.redemptions - a.redemptions)
      .slice(0, limitValue);

    const totalRedemptions = topOffers.reduce((sum: number, o: any) => sum + o.redemptions, 0);
    const totalRevenue = topOffers.reduce((sum: number, o: any) => sum + o.revenue, 0);
    const avgConversionRate = topOffers.length > 0 ?
      topOffers.reduce((sum: number, o: any) => sum + o.conversionRate, 0) / topOffers.length : 0;

    return res.status(200).json({
      success: true,
      data: {
        timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        offers: topOffers,
        summary: {
          totalRedemptions,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgConversionRate: Math.round(avgConversionRate * 100) / 100
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching top offers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top offers',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== CUSTOMER LIST (PAGINATED) ====================

/**
 * @route   GET /api/merchant/analytics/customers/list
 * @desc    Get paginated customer list with search for merchant customer management page
 * @access  Private
 */
router.get('/customers/list', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const search = (req.query.search as string || '').trim();
    const sortBy = (req.query.sortBy as string) || 'lastOrderDate';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 1 : -1;

    const Order = require('../models/Order').Order;
    const ObjectId = require('mongoose').Types.ObjectId;

    // Build aggregation pipeline
    const matchStage: any = {
      'items.store': new ObjectId(storeId),
      status: { $nin: ['cancelled', 'refunded'] },
    };

    const pipeline: any[] = [
      { $match: matchStage },
      { $unwind: '$items' },
      { $match: { 'items.store': new ObjectId(storeId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $group: {
          _id: '$user',
          firstName: { $first: { $arrayElemAt: ['$userInfo.profile.firstName', 0] } },
          lastName: { $first: { $arrayElemAt: ['$userInfo.profile.lastName', 0] } },
          phoneNumber: { $first: { $arrayElemAt: ['$userInfo.phoneNumber', 0] } },
          email: { $first: { $arrayElemAt: ['$userInfo.email', 0] } },
          totalOrders: { $addToSet: '$_id' },
          totalSpent: { $sum: '$items.subtotal' },
          lastOrderDate: { $max: '$createdAt' },
          firstOrderDate: { $min: '$createdAt' },
        },
      },
      {
        $project: {
          _id: 0,
          customerId: { $toString: '$_id' },
          firstName: { $ifNull: ['$firstName', ''] },
          lastName: { $ifNull: ['$lastName', ''] },
          name: {
            $cond: {
              if: { $and: [{ $gt: ['$firstName', ''] }, { $gt: ['$lastName', ''] }] },
              then: { $concat: ['$firstName', ' ', '$lastName'] },
              else: {
                $cond: {
                  if: { $gt: ['$firstName', ''] },
                  then: '$firstName',
                  else: { $ifNull: ['$lastName', ''] },
                },
              },
            },
          },
          phoneNumber: { $ifNull: ['$phoneNumber', ''] },
          email: { $ifNull: ['$email', ''] },
          totalOrders: { $size: '$totalOrders' },
          totalSpent: { $round: ['$totalSpent', 2] },
          lastOrderDate: 1,
          firstOrderDate: 1,
        },
      },
    ];

    // Apply search filter if provided
    if (search) {
      const { escapeRegex } = require('../utils/sanitize');
      const safeSearch = escapeRegex(search);
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: safeSearch, $options: 'i' } },
            { phoneNumber: { $regex: safeSearch, $options: 'i' } },
            { email: { $regex: safeSearch, $options: 'i' } },
          ],
        },
      });
    }

    // Count total before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Order.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Add loyalty tier info via lookup
    pipeline.push(
      {
        $addFields: {
          customerObjectId: { $toObjectId: '$customerId' },
        },
      },
      {
        $lookup: {
          from: 'userloyalties',
          localField: 'customerObjectId',
          foreignField: 'userId',
          as: 'loyaltyInfo',
        },
      },
      {
        $addFields: {
          loyaltyTier: { $arrayElemAt: ['$loyaltyInfo.brandLoyalty.tier', 0] },
        },
      },
      {
        $project: {
          customerObjectId: 0,
          loyaltyInfo: 0,
        },
      }
    );

    // Sort + paginate
    const sortField = sortBy === 'totalSpent' ? 'totalSpent'
      : sortBy === 'totalOrders' ? 'totalOrders'
      : sortBy === 'name' ? 'name'
      : 'lastOrderDate';

    pipeline.push(
      { $sort: { [sortField]: sortOrder } },
      { $skip: skip },
      { $limit: limit }
    );

    const customers = await Order.aggregate(pipeline);

    return res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching customer list:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer list',
      ...(process.env.NODE_ENV === 'development' && {
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    });
  }
});

export default router;
