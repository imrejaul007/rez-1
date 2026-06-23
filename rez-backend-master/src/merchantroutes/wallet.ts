import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import merchantWalletService from '../services/merchantWalletService';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

/**
 * @route   GET /api/merchant/wallet
 * @desc    Get merchant wallet summary
 * @access  Private (Merchant)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID required'
      });
    }

    const summary = await merchantWalletService.getWalletSummary(merchantId);

    if (!summary) {
      // Create wallet if it doesn't exist
      await merchantWalletService.getOrCreateWallet(merchantId);
      const newSummary = await merchantWalletService.getWalletSummary(merchantId);

      return res.json({
        success: true,
        message: 'Wallet created successfully',
        data: newSummary
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT WALLET] Error fetching wallet summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet summary'
    });
  }
});

/**
 * @route   GET /api/merchant/wallet/transactions
 * @desc    Get merchant wallet transaction history
 * @access  Private (Merchant)
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID required'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as 'credit' | 'debit' | 'withdrawal' | 'refund' | 'adjustment' | undefined;

    const result = await merchantWalletService.getTransactionHistory(
      merchantId,
      page,
      limit,
      type
    );

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT WALLET] Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction history'
    });
  }
});

/**
 * @route   POST /api/merchant/wallet/withdraw
 * @desc    Request withdrawal from wallet
 * @access  Private (Merchant)
 */
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID required'
      });
    }

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid withdrawal amount is required'
      });
    }

    const transaction = await merchantWalletService.requestWithdrawal(merchantId, amount);

    res.json({
      success: true,
      message: `Withdrawal request of ₹${amount} submitted successfully`,
      data: transaction
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT WALLET] Error requesting withdrawal:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process withdrawal request'
    });
  }
});

/**
 * @route   PUT /api/merchant/wallet/bank-details
 * @desc    Update bank details for withdrawals
 * @access  Private (Merchant)
 */
router.put('/bank-details', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID required'
      });
    }

    const { accountNumber, ifscCode, accountHolderName, bankName, branchName, upiId } = req.body;

    // Validate required fields
    if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Account number, IFSC code, account holder name, and bank name are required'
      });
    }

    // Basic validation
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IFSC code format'
      });
    }

    await merchantWalletService.updateBankDetails(merchantId, {
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      accountHolderName,
      bankName,
      branchName,
      upiId
    });

    res.json({
      success: true,
      message: 'Bank details updated successfully. Verification pending.'
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT WALLET] Error updating bank details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update bank details'
    });
  }
});

/**
 * @route   GET /api/merchant/wallet/stats
 * @desc    Get detailed wallet statistics
 * @access  Private (Merchant)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID required'
      });
    }

    const summary = await merchantWalletService.getWalletSummary(merchantId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Calculate additional stats
    const stats = {
      balance: summary.balance,
      statistics: summary.statistics,
      platformFeeRate: '15%',
      settlementCycle: summary.settlementCycle,
      bankDetailsConfigured: summary.bankDetailsConfigured,
      highlights: {
        netEarningsRate: summary.statistics.totalSales > 0
          ? ((summary.statistics.netSales / summary.statistics.totalSales) * 100).toFixed(1) + '%'
          : '85%',
        avgOrderValue: summary.statistics.averageOrderValue.toFixed(2),
        pendingWithdrawal: summary.balance.pending,
        availableForWithdrawal: summary.balance.available
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('❌ [MERCHANT WALLET] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet statistics'
    });
  }
});

export default router;
