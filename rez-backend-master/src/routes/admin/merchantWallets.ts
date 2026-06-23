import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, requireSeniorAdmin, requireOperator } from '../../middleware/auth';
import { MerchantWallet } from '../../models/MerchantWallet';
import merchantWalletService from '../../services/merchantWalletService';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/merchant-wallets
 * @desc    Get all merchant wallets with balances
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sortBy as string) || 'statistics.totalSales';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await merchantWalletService.getAllWallets(page, limit, sortBy, sortOrder);

    res.json({
      success: true,
      data: {
        wallets: result.wallets,
        pagination: result.pagination
      }
    });
  }));

/**
 * @route   GET /api/admin/merchant-wallets/stats
 * @desc    Get platform-wide wallet statistics
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = await merchantWalletService.getPlatformStats();

    res.json({
      success: true,
      data: stats
    });
  }));

/**
 * @route   GET /api/admin/merchant-wallets/pending-withdrawals
 * @desc    Get all pending withdrawal requests
 * @access  Admin
 * NOTE: Must be defined BEFORE /:merchantId to avoid Express matching "pending-withdrawals" as a merchantId param
 */
router.get('/pending-withdrawals', asyncHandler(async (_req: Request, res: Response) => {
    const walletsWithPending = await MerchantWallet.find({
      'balance.pending': { $gt: 0 }
    })
      .populate('merchant', 'profile.firstName profile.lastName phoneNumber email')
      .populate('store', 'name')
      .select('merchant store balance.pending balance.available transactions');

    // Filter to only get pending withdrawal transactions
    const pendingWithdrawals = walletsWithPending.map(wallet => {
      const pendingTransactions = wallet.transactions.filter(
        t => t.type === 'withdrawal' && t.status === 'pending'
      );
      return {
        merchantId: wallet.merchant,
        store: wallet.store,
        pendingAmount: wallet.balance.pending,
        pendingTransactions
      };
    }).filter(w => w.pendingTransactions.length > 0);

    res.json({
      success: true,
      data: pendingWithdrawals
    });
  }));

/**
 * @route   GET /api/admin/merchant-wallets/:merchantId
 * @desc    Get single merchant wallet details
 * @access  Admin
 */
router.get('/:merchantId', asyncHandler(async (req: Request, res: Response) => {
    const wallet = await MerchantWallet.findOne({ merchant: req.params.merchantId })
      .populate('merchant', 'profile.firstName profile.lastName phoneNumber email')
      .populate('store', 'name logo address');

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Merchant wallet not found'
      });
    }

    res.json({
      success: true,
      data: wallet
    });
  }));

/**
 * @route   GET /api/admin/merchant-wallets/:merchantId/transactions
 * @desc    Get merchant wallet transaction history
 * @access  Admin
 */
router.get('/:merchantId/transactions', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as 'credit' | 'debit' | 'withdrawal' | 'refund' | 'adjustment' | undefined;

    const result = await merchantWalletService.getTransactionHistory(
      req.params.merchantId,
      page,
      limit,
      type
    );

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  }));

/**
 * @route   POST /api/admin/merchant-wallets/:merchantId/process-withdrawal
 * @desc    Process a pending withdrawal request
 * @access  Admin
 */
router.post('/:merchantId/process-withdrawal', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
    const { transactionId, transactionReference } = req.body;

    if (!transactionId || !transactionReference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID and reference are required'
      });
    }

    await merchantWalletService.processWithdrawal(
      req.params.merchantId,
      transactionId,
      transactionReference
    );

    res.json({
      success: true,
      message: 'Withdrawal processed successfully'
    });
  }));

/**
 * @route   POST /api/admin/merchant-wallets/:merchantId/reject-withdrawal
 * @desc    Reject a pending withdrawal request
 * @access  Admin (Senior)
 */
router.post('/:merchantId/reject-withdrawal', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
    const { transactionId, reason } = req.body;

    if (!transactionId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID and rejection reason are required'
      });
    }

    await merchantWalletService.rejectWithdrawal(
      req.params.merchantId,
      transactionId,
      reason
    );

    res.json({
      success: true,
      message: 'Withdrawal rejected successfully'
    });
  }));

/**
 * @route   POST /api/admin/merchant-wallets/:merchantId/verify-bank
 * @desc    Verify merchant bank details
 * @access  Admin
 */
router.post('/:merchantId/verify-bank', requireOperator, asyncHandler(async (req: Request, res: Response) => {
    await merchantWalletService.verifyBankDetails(req.params.merchantId);

    res.json({
      success: true,
      message: 'Bank details verified successfully'
    });
  }));

export default router;
