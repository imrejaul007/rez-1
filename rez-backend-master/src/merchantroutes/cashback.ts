import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { CashbackModel } from '../models/Cashback';
import PaymentService from '../services/PaymentService';
import {
  CashbackSearchRequest,
  ApproveCashbackRequest,
  RejectCashbackRequest,
  BulkCashbackAction,
  CashbackStatus
} from '../types/shared';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/cashback
// @desc    Get cashback requests with search and filtering
// @access  Private
router.get('/', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const {
      status,
      customerId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      riskLevel,
      flaggedOnly,
      sortBy,
      sortOrder,
      page,
      limit
    } = req.query;

    const searchParams: CashbackSearchRequest = { merchantId: req.merchantId };

    if (status) searchParams.status = status as CashbackStatus;
    if (customerId) searchParams.customerId = customerId as string;
    if (startDate && endDate) {
      searchParams.dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }
    if (minAmount || maxAmount) {
      searchParams.amountRange = {
        min: minAmount ? parseFloat(minAmount as string) : 0,
        max: maxAmount ? parseFloat(maxAmount as string) : Number.MAX_VALUE
      };
    }
    if (riskLevel) searchParams.riskLevel = riskLevel as 'low' | 'medium' | 'high';
    if (flaggedOnly === 'true') searchParams.flaggedOnly = true;
    if (sortBy) searchParams.sortBy = sortBy as 'created' | 'amount' | 'risk_score' | 'expires';
    if (sortOrder) searchParams.sortOrder = sortOrder as 'asc' | 'desc';
    if (page) searchParams.page = parseInt(page as string);
    if (limit) searchParams.limit = parseInt(limit as string);

    const result = await CashbackModel.search(searchParams);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching cashback requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cashback requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/cashback/metrics
router.get('/metrics', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const metrics = await CashbackModel.getMetrics(req.merchantId);

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

// @route   GET /api/cashback/analytics
router.get('/analytics', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const { startDate, endDate } = req.query;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const analytics = await CashbackModel.getAnalytics(req.merchantId, dateRange);

    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching cashback analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cashback analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/cashback/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await CashbackModel.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Cashback request not found'
      });
    }

    if (request.merchantId !== req.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.json({
      success: true,
      data: request
    });
  } catch (error) {
    logger.error('Error fetching cashback request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cashback request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/cashback
router.post('/', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const requestData = {
      ...req.body,
      merchantId: req.merchantId
    };

    const riskAssessment = CashbackModel.assessRisk(requestData);
    const fullRequestData = { ...requestData, ...riskAssessment };

    const request = await CashbackModel.create(fullRequestData);

    return res.status(201).json({
      success: true,
      message: 'Cashback request created successfully',
      data: request
    });
  } catch (error) {
    logger.error('Error creating cashback request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create cashback request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/cashback/:id/approve
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedAmount, notes }: ApproveCashbackRequest = req.body;
    const reviewedBy = 'system';

    const request = await CashbackModel.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Cashback request not found' });
    }

    if (request.merchantId !== req.merchantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedRequest = await CashbackModel.approve(id, approvedAmount, notes, reviewedBy);

    if (!updatedRequest) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve request - invalid status or request not found'
      });
    }

    // Process payment if customer has bank details
    if (updatedRequest.customerBankDetails &&
        updatedRequest.customerBankDetails.accountNumber &&
        updatedRequest.customerBankDetails.ifscCode &&
        updatedRequest.customerBankDetails.accountHolderName) {
      try {
        logger.info(`💰 [CASHBACK] Processing payout for cashback request: ${id}`);

        const payoutResult = await PaymentService.processCashbackPayout(
          updatedRequest,
          updatedRequest.customerBankDetails
        );

        if (payoutResult.success) {
          // Update cashback with payment details using MongoDB directly
          const { CashbackMongoModel } = await import('../models/Cashback');
          const cashbackDoc = await CashbackMongoModel.findById(id);

          if (cashbackDoc) {
            cashbackDoc.status = 'paid';
            cashbackDoc.paidAt = new Date();
            cashbackDoc.payoutId = payoutResult.payoutId;
            cashbackDoc.paymentStatus = payoutResult.status as any;
            cashbackDoc.timeline.push({
              status: 'paid',
              timestamp: new Date(),
              notes: `Payment processed via Razorpay payout`,
              by: 'system'
            });
            await cashbackDoc.save();

            logger.info(`✅ [CASHBACK] Cashback ${id} paid successfully`);

            return res.json({
              success: true,
              message: 'Cashback approved and paid successfully',
              data: {
                ...updatedRequest,
                status: 'paid',
                payoutId: payoutResult.payoutId,
                paymentStatus: payoutResult.status
              }
            });
          }
        } else {
          logger.error(`❌ [CASHBACK] Payment failed for cashback ${id}:`, payoutResult.error);
          // Keep status as approved but log error
        }
      } catch (paymentError) {
        logger.error('❌ [CASHBACK] Payment processing error:', paymentError);
        // Keep status as approved, merchant can manually process
      }
    }

    return res.json({
      success: true,
      message: 'Cashback request approved successfully',
      data: updatedRequest
    });
  } catch (error) {
    logger.error('Error approving cashback request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve cashback request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/cashback/:id/reject
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason }: RejectCashbackRequest = req.body;
    const reviewedBy = 'system';

    const request = await CashbackModel.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Cashback request not found' });
    }

    if (request.merchantId !== req.merchantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedRequest = await CashbackModel.reject(id, reason, reviewedBy);

    if (!updatedRequest) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject request - invalid status or request not found'
      });
    }

    return res.json({
      success: true,
      message: 'Cashback request rejected successfully',
      data: updatedRequest
    });
  } catch (error) {
    logger.error('Error rejecting cashback request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject cashback request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/cashback/:id/mark-paid
router.put('/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference } = req.body;

    const request = await CashbackModel.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Cashback request not found'
      });
    }

    if (request.merchantId !== req.merchantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedRequest = await CashbackModel.markAsPaid(id, paymentMethod, paymentReference);

    if (!updatedRequest) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark as paid - request must be approved first'
      });
    }

    return res.json({
      success: true,
      message: 'Cashback marked as paid successfully',
      data: updatedRequest
    });
  } catch (error) {
    logger.error('Error marking cashback as paid:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark cashback as paid',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/cashback/bulk-action
router.post('/bulk-action', async (req, res) => {
  try {
    const { requestIds, action, notes, approvedAmount, rejectionReason }: BulkCashbackAction = req.body;
    const reviewedBy = 'system';

    if (!requestIds || requestIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No request IDs provided' });
    }

    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    for (const requestId of requestIds) {
      const request = await CashbackModel.findById(requestId);
      if (request && request.merchantId !== merchantId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - one or more requests do not belong to your account'
        });
      }
    }

    let results;
    switch (action) {
      case 'approve':
        results = await CashbackModel.bulkApprove(requestIds, notes, reviewedBy);
        break;
      case 'reject':
        if (!rejectionReason) {
          return res.status(400).json({
            success: false,
            message: 'Rejection reason is required for bulk rejection'
          });
        }
        results = await CashbackModel.bulkReject(requestIds, rejectionReason, reviewedBy);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid bulk action'
        });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return res.json({
      success: true,
      message: `Bulk ${action} completed: ${successCount} successful, ${failureCount} failed`,
      data: {
        results,
        summary: {
          total: requestIds.length,
          successful: successCount,
          failed: failureCount
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

// @route   POST /api/cashback/:id/process-payment
// @desc    Manually process payment for approved cashback
// @access  Private
router.post('/:id/process-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { bankDetails } = req.body;

    const request = await CashbackModel.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Cashback request not found'
      });
    }

    // Verify merchant owns this
    if (request.merchantId !== req.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check if already paid
    if (request.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cashback already paid'
      });
    }

    // Check if approved
    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cashback must be approved first'
      });
    }

    // Use provided bank details or existing customer bank details
    const customerBankDetails = bankDetails || request.customerBankDetails;

    if (!customerBankDetails || !customerBankDetails.accountNumber || !customerBankDetails.ifscCode || !customerBankDetails.accountHolderName) {
      return res.status(400).json({
        success: false,
        message: 'Bank details are required for payment processing'
      });
    }

    // Process payment
    logger.info(`💰 [CASHBACK] Manually processing payout for cashback request: ${id}`);

    const payoutResult = await PaymentService.processCashbackPayout(
      request,
      customerBankDetails
    );

    if (payoutResult.success) {
      // Update cashback with payment details using MongoDB directly
      const { CashbackMongoModel } = await import('../models/Cashback');
      const cashbackDoc = await CashbackMongoModel.findById(id);

      if (cashbackDoc) {
        cashbackDoc.status = 'paid';
        cashbackDoc.paidAt = new Date();
        cashbackDoc.payoutId = payoutResult.payoutId;
        cashbackDoc.paymentStatus = payoutResult.status as any;
        if (bankDetails) {
          cashbackDoc.customerBankDetails = bankDetails;
        }
        cashbackDoc.timeline.push({
          status: 'paid',
          timestamp: new Date(),
          notes: `Payment manually processed via Razorpay payout`,
          by: req.merchantId || 'system'
        });
        await cashbackDoc.save();

        logger.info(`✅ [CASHBACK] Cashback ${id} paid successfully (manual)`);

        return res.json({
          success: true,
          message: 'Payment processed successfully',
          data: {
            cashback: cashbackDoc.toObject(),
            payout: payoutResult
          }
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: payoutResult.error
    });
  } catch (error) {
    logger.error('❌ [CASHBACK] Error processing payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/cashback/:id/payout-status
// @desc    Get payout status for a cashback request
// @access  Private
router.get('/:id/payout-status', async (req, res) => {
  try {
    const { id } = req.params;

    const request = await CashbackModel.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Cashback request not found'
      });
    }

    // Verify merchant owns this
    if (request.merchantId !== req.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!request.payoutId) {
      return res.status(400).json({
        success: false,
        message: 'No payout associated with this cashback request'
      });
    }

    const payoutStatus = await PaymentService.getPayoutStatus(request.payoutId);

    return res.json({
      success: true,
      data: {
        cashbackId: id,
        payoutId: request.payoutId,
        ...payoutStatus
      }
    });
  } catch (error) {
    logger.error('❌ [CASHBACK] Error fetching payout status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payout status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/cashback/generate-sample
router.post('/generate-sample', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    await CashbackModel.createSampleRequests(req.merchantId);

    return res.json({
      success: true,
      message: 'Sample cashback requests generated successfully'
    });
  } catch (error) {
    logger.error('Error generating sample data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate sample data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/cashback/stats
// @desc    Get cashback statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const metrics = await CashbackModel.getMetrics(req.merchantId);

    return res.status(200).json({
      success: true,
      data: {
        stats: metrics
      }
    });
  } catch (error) {
    logger.error('Error fetching cashback stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cashback stats',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// @route   GET /api/cashback/transactions
// @desc    Get cashback transactions
// @access  Private
router.get('/transactions', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const { page = '1', limit = '50' } = req.query;
    const searchParams: CashbackSearchRequest = {
      merchantId: req.merchantId,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await CashbackModel.search(searchParams);

    // Ensure we always return an array
    const transactionsArray = Array.isArray(result?.requests) ? result.requests : [];

    return res.status(200).json({
      success: true,
      data: transactionsArray
    });
  } catch (error) {
    logger.error('Error fetching cashback transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cashback transactions',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// @route   GET /api/cashback/summary
// @desc    Get cashback summary
// @access  Private
router.get('/summary', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    const { startDate, endDate } = req.query;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const analytics = await CashbackModel.getAnalytics(req.merchantId, dateRange);

    // Create summary object - CashbackAnalytics interface has different fields
    const summary: any = {
      totalPaid: analytics?.totalPaid ?? 0,
      totalPending: analytics?.totalPending ?? 0,
      averageApprovalTime: analytics?.averageApprovalTime ?? 0,
      approvalRate: analytics?.approvalRate ?? 0,
      fraudDetectionRate: analytics?.fraudDetectionRate ?? 0,
      customerRetentionImpact: analytics?.customerRetentionImpact ?? 0,
      revenueImpact: analytics?.revenueImpact ?? 0,
      topCategories: Array.isArray(analytics?.topCategories) ? analytics.topCategories : [],
      monthlyTrends: Array.isArray(analytics?.monthlyTrends) ? analytics.monthlyTrends : []
    };

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error fetching cashback summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cashback summary',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// @route   GET /api/cashback/export
// @desc    Export cashback data
// @access  Private
router.get('/export', async (req, res) => {
  try {
    if (!req.merchantId) {
      return res.status(400).json({ success: false, message: 'MerchantId missing' });
    }

    // For now, return success - actual export implementation can be added later
    return res.status(200).json({
      success: true,
      message: 'Export functionality coming soon'
    });
  } catch (error) {
    logger.error('Error exporting cashback data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export cashback data',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

export default router;
