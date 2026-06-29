/**
 * RTMN Finance Routes
 *
 * Corporate wallet, BNPL, expense cards, and payment processing.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdminAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';

const router = Router();

// Types
interface CorpWallet {
  walletId: string;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  status: 'active' | 'suspended' | 'closed';
}

interface ExpenseCard {
  cardId: string;
  employeeId: string;
  employeeName: string;
  cardNumber: string;
  cardType: 'virtual' | 'physical';
  status: 'active' | 'blocked' | 'expired';
  limits: { dailyLimit: number; monthlyLimit: number };
  spent: { daily: number; monthly: number; total: number };
}

interface BNPLPlan {
  planId: string;
  name: string;
  tenure: number;
  interestRate: number;
  processingFee: number;
}

// In-memory stores
const walletsStore = new Map<string, CorpWallet>();
const cardsStore = new Map<string, ExpenseCard>();

// Validation schemas
const addFundsSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(['upi', 'netbanking', 'neft', 'rtgs']),
});

const issueCardSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  employeeEmail: z.string().email(),
  cardType: z.enum(['virtual', 'physical']),
  limits: z.object({
    dailyLimit: z.number().optional(),
    monthlyLimit: z.number().optional(),
  }).optional(),
});

// ============================================
// WALLET
// ============================================

/**
 * Get corporate wallet
 * GET /api/finance/wallet
 */
router.get('/wallet', requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string;

    let wallet = walletsStore.get(companyId);
    if (!wallet) {
      wallet = {
        walletId: `WAL${companyId}`,
        balance: 500000,
        availableBalance: 450000,
        pendingBalance: 50000,
        status: 'active',
      };
      walletsStore.set(companyId, wallet);
    }

    logger.info('[Finance] Get wallet', { companyId });

    res.json({ success: true, data: wallet });
  } catch (err: any) {
    logger.error('[Finance] Get wallet failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Add funds to wallet
 * POST /api/finance/wallet/deposit
 */
router.post('/wallet/deposit', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = addFundsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error.errors[0].message });
    }

    const { amount, paymentMethod } = result.data;
    const companyId = req.headers['x-company-id'] as string;

    let wallet = walletsStore.get(companyId);
    if (!wallet) {
      wallet = {
        walletId: `WAL${companyId}`,
        balance: 0,
        availableBalance: 0,
        pendingBalance: 0,
        status: 'active',
      };
    }

    // Simulate payment processing
    wallet.balance += amount;
    wallet.availableBalance += amount;
    walletsStore.set(companyId, wallet);

    logger.info('[Finance] Funds added', { companyId, amount, paymentMethod });

    res.json({
      success: true,
      data: {
        transactionId: `TXN${Date.now()}`,
        status: 'success',
        amount,
        balance: wallet.balance,
        currency: 'INR',
      },
    });
  } catch (err: any) {
    logger.error('[Finance] Add funds failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get wallet transactions
 * GET /api/finance/wallet/transactions
 */
router.get('/wallet/transactions', requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string;
    const { startDate, endDate, type, page = '1', limit = '50' } = req.query;

    // Demo transactions
    const transactions = DEMO_TRANSACTIONS.map(t => ({
      ...t,
      companyId,
    }));

    logger.info('[Finance] Get transactions', { companyId, count: transactions.length });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total: transactions.length,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      },
    });
  } catch (err: any) {
    logger.error('[Finance] Get transactions failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// EXPENSE CARDS
// ============================================

/**
 * Get expense cards
 * GET /api/finance/cards
 */
router.get('/cards', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, status } = req.query;
    const companyId = req.headers['x-company-id'] as string;

    let cards = Array.from(cardsStore.values());

    if (employeeId) {
      cards = cards.filter(c => c.employeeId === employeeId);
    }
    if (status) {
      cards = cards.filter(c => c.status === status);
    }

    // Add demo cards if empty
    if (cards.length === 0) {
      cards = DEMO_CARDS;
    }

    logger.info('[Finance] Get cards', { companyId, count: cards.length });

    res.json({ success: true, data: cards });
  } catch (err: any) {
    logger.error('[Finance] Get cards failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Issue expense card
 * POST /api/finance/cards
 */
router.post('/cards', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = issueCardSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error.errors[0].message });
    }

    const { employeeId, employeeName, employeeEmail, cardType, limits } = result.data;
    const companyId = req.headers['x-company-id'] as string;

    const card: ExpenseCard = {
      cardId: `CARD${Date.now()}`,
      employeeId,
      employeeName,
      cardNumber: generateCardNumber(),
      cardType,
      status: 'active',
      limits: {
        dailyLimit: limits?.dailyLimit || 25000,
        monthlyLimit: limits?.monthlyLimit || 100000,
      },
      spent: { daily: 0, monthly: 0, total: 0 },
    };

    cardsStore.set(card.cardId, card);

    logger.info('[Finance] Card issued', { cardId: card.cardId, employeeId, companyId });

    res.status(201).json({ success: true, data: card });
  } catch (err: any) {
    logger.error('[Finance] Issue card failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Update card status
 * POST /api/finance/cards/:cardId/status
 */
router.post('/cards/:cardId/status', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const { status } = req.body;
    const companyId = req.headers['x-company-id'] as string;

    const card = cardsStore.get(cardId);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    card.status = status;
    cardsStore.set(cardId, card);

    logger.info('[Finance] Card status updated', { cardId, status, companyId });

    res.json({ success: true, data: card });
  } catch (err: any) {
    logger.error('[Finance] Update card failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// BNPL
// ============================================

/**
 * Get BNPL plans
 * GET /api/finance/bnpl/plans
 */
router.get('/bnpl/plans', requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string;

    logger.info('[Finance] Get BNPL plans', { companyId });

    res.json({ success: true, data: BNPL_PLANS });
  } catch (err: any) {
    logger.error('[Finance] Get BNPL plans failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// DASHBOARD
// ============================================

/**
 * Get finance dashboard
 * GET /api/finance/dashboard
 */
router.get('/dashboard', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string;

    const wallet = walletsStore.get(companyId) || {
      balance: 500000,
      availableBalance: 450000,
      pendingBalance: 50000,
    };

    logger.info('[Finance] Get dashboard', { companyId });

    res.json({
      success: true,
      data: {
        wallet: {
          balance: wallet.balance,
          pendingBalance: wallet.pendingBalance,
          todaySpend: 25000,
          monthSpend: 125000,
        },
        cards: {
          totalCards: 12,
          activeCards: 10,
          totalSpent: 350000,
          monthSpent: 125000,
        },
        bnpl: {
          activePlans: 2,
          totalOutstanding: 85000,
          overdueAmount: 0,
        },
        expenses: {
          pendingClaims: 5,
          pendingAmount: 45000,
          approvedThisMonth: 18,
        },
      },
    });
  } catch (err: any) {
    logger.error('[Finance] Get dashboard failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// HELPERS
// ============================================

function generateCardNumber(): string {
  const prefix = '4000';
  let number = prefix;
  for (let i = 0; i < 12; i++) {
    number += Math.floor(Math.random() * 10);
  }
  return number;
}

// ============================================
// DEMO DATA
// ============================================

const DEMO_TRANSACTIONS = [
  {
    transactionId: 'TXN001',
    type: 'credit',
    amount: 100000,
    balance: 500000,
    description: 'Wallet Top-up via UPI',
    reference: 'UPI/TXN123456',
    category: 'top_up',
    createdAt: '2024-04-28T10:00:00Z',
  },
  {
    transactionId: 'TXN002',
    type: 'debit',
    amount: 25000,
    balance: 475000,
    description: 'Hotel Booking - The Grand Mumbai',
    reference: 'MCB20240415001',
    category: 'hotel',
    createdAt: '2024-04-27T15:30:00Z',
  },
  {
    transactionId: 'TXN003',
    type: 'debit',
    amount: 15000,
    balance: 460000,
    description: 'Gift Order - Premium Gift Box x50',
    reference: 'NB20240427001',
    category: 'gifting',
    createdAt: '2024-04-27T11:00:00Z',
  },
];

const DEMO_CARDS: ExpenseCard[] = [
  {
    cardId: 'CARD001',
    employeeId: 'EMP001',
    employeeName: 'Priya Sharma',
    cardNumber: '4000123456789012',
    cardType: 'virtual',
    status: 'active',
    limits: { dailyLimit: 25000, monthlyLimit: 100000 },
    spent: { daily: 5000, monthly: 35000, total: 150000 },
  },
  {
    cardId: 'CARD002',
    employeeId: 'EMP002',
    employeeName: 'Rahul Verma',
    cardNumber: '4000987654321098',
    cardType: 'physical',
    status: 'active',
    limits: { dailyLimit: 50000, monthlyLimit: 200000 },
    spent: { daily: 12000, monthly: 85000, total: 320000 },
  },
];

const BNPL_PLANS: BNPLPlan[] = [
  {
    planId: 'BNPL001',
    name: '30 Days',
    tenure: 30,
    interestRate: 0,
    processingFee: 1.5,
  },
  {
    planId: 'BNPL002',
    name: '60 Days',
    tenure: 60,
    interestRate: 1.5,
    processingFee: 2,
  },
  {
    planId: 'BNPL003',
    name: '90 Days',
    tenure: 90,
    interestRate: 2.5,
    processingFee: 2.5,
  },
];

export default router;
