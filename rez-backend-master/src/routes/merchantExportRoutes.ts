// @ts-nocheck
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { Store } from '../models/Store';
import { CoinTransaction } from '../models/CoinTransaction';
import { MerchantPayout } from '../models/MerchantPayout';
import { MerchantGoal } from '../models/MerchantGoal';
import { User } from '../models/User';

const router = Router();

// All routes require user authentication
router.use(requireAuth);

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeCsvField(value: any): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvLine(fields: any[]): string {
  return fields.map(escapeCsvField).join(',');
}

function sendCsv(res: Response, filename: string, lines: string[]): void {
  const content = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
}

function paiseTo(paise: number): string {
  return (paise / 100).toFixed(2);
}

async function resolveStoreIds(merchantId: string, requestedMerchantId?: string): Promise<string[]> {
  const query: Record<string, any> = {};
  const targetMerchantId = requestedMerchantId || merchantId;
  query.merchantId = new mongoose.Types.ObjectId(targetMerchantId);
  const stores = await Store.find(query).select('_id').lean();
  return stores.map((s: any) => s._id.toString());
}

function parseDateRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
  const fromDate = from ? new Date(from) : new Date(0);
  const toDate = to ? new Date(to) : new Date();
  if (isNaN(fromDate.getTime())) fromDate.setTime(0);
  if (isNaN(toDate.getTime())) toDate.setTime(Date.now());
  return { fromDate, toDate };
}

// ── Transaction Export ────────────────────────────────────────────────────────

/**
 * @route   GET /api/merchant/export/transactions
 * @desc    Export coin transactions for merchant's stores as CSV
 * @query   from, to, merchantId
 * @access  Authenticated
 */
router.get(
  '/export/transactions',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const { from, to, merchantId } = req.query as Record<string, string>;
    const { fromDate, toDate } = parseDateRange(from, to);

    const storeIds = await resolveStoreIds(userId, merchantId);
    if (!storeIds.length) {
      return sendCsv(res, `transactions-${new Date().toISOString().slice(0, 10)}.csv`, [
        'Date,Store,Amount (₹),Type,Source,Status',
      ]);
    }

    const storeObjectIds = storeIds.map((id) => new mongoose.Types.ObjectId(id));

    // Build store name map
    const storeList = await Store.find({ _id: { $in: storeObjectIds } })
      .select('_id name')
      .lean();
    const storeNameMap: Record<string, string> = {};
    storeList.forEach((s: any) => {
      storeNameMap[s._id.toString()] = s.name || '';
    });

    const txns = await CoinTransaction.find({
      $or: [{ storeId: { $in: storeObjectIds } }, { 'metadata.storeId': { $in: storeIds } }],
      createdAt: { $gte: fromDate, $lte: toDate },
    })
      .select('createdAt storeId metadata.storeId amount type source coinStatus')
      .lean()
      .limit(50000);

    const lines: string[] = ['Date,Store,Amount (₹),Type,Source,Status'];
    for (const t of txns) {
      const rawStoreId = (t as any).storeId?.toString() || (t as any).metadata?.storeId?.toString() || '';
      const storeName = storeNameMap[rawStoreId] || rawStoreId;
      const date = (t as any).createdAt ? new Date((t as any).createdAt).toISOString().slice(0, 10) : '';
      const amountRs = ((t as any).amount || 0).toFixed(2);
      const type = (t as any).type || '';
      const source = (t as any).source || '';
      const status = (t as any).coinStatus || 'active';
      lines.push(toCsvLine([date, storeName, amountRs, type, source, status]));
    }

    sendCsv(res, `transactions-${new Date().toISOString().slice(0, 10)}.csv`, lines);
  }),
);

// ── Customer Export ───────────────────────────────────────────────────────────

/**
 * @route   GET /api/merchant/export/customers
 * @desc    Export customer spend aggregation for merchant's stores as CSV
 * @query   from, to, merchantId
 * @access  Authenticated
 */
router.get(
  '/export/customers',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const { from, to, merchantId } = req.query as Record<string, string>;
    const { fromDate, toDate } = parseDateRange(from, to);

    const storeIds = await resolveStoreIds(userId, merchantId);
    if (!storeIds.length) {
      return sendCsv(res, `customers-${new Date().toISOString().slice(0, 10)}.csv`, [
        'UserId,Name,Email,TotalSpend (₹),VisitCount,LastVisit,CoinBalance',
      ]);
    }

    const storeObjectIds = storeIds.map((id) => new mongoose.Types.ObjectId(id));

    const aggregation = await CoinTransaction.aggregate([
      {
        $match: {
          $or: [{ storeId: { $in: storeObjectIds } }, { 'metadata.storeId': { $in: storeIds } }],
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: '$user',
          totalSpend: { $sum: '$amount' },
          visitCount: { $sum: 1 },
          lastVisit: { $max: '$createdAt' },
        },
      },
      { $sort: { totalSpend: -1 } },
      { $limit: 10000 },
    ]).allowDiskUse(true);

    const userIds = aggregation.map((r: any) => r._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id profile.firstName profile.lastName email coinBalance')
      .lean();

    const userMap: Record<string, any> = {};
    users.forEach((u: any) => {
      userMap[u._id.toString()] = u;
    });

    const lines: string[] = ['UserId,Name,Email,TotalSpend (₹),VisitCount,LastVisit,CoinBalance'];
    for (const row of aggregation) {
      const u = userMap[row._id?.toString()] || {};
      const name = [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') || '';
      const email = u.email || '';
      const coinBalance = u.coinBalance || 0;
      const totalSpendRs = (row.totalSpend || 0).toFixed(2);
      const lastVisit = row.lastVisit ? new Date(row.lastVisit).toISOString().slice(0, 10) : '';
      lines.push(toCsvLine([row._id, name, email, totalSpendRs, row.visitCount, lastVisit, coinBalance]));
    }

    sendCsv(res, `customers-${new Date().toISOString().slice(0, 10)}.csv`, lines);
  }),
);

// ── Payout Export ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/merchant/export/payouts
 * @desc    Export merchant payouts as CSV
 * @query   merchantId
 * @access  Authenticated
 */
router.get(
  '/export/payouts',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const merchantId = (req.query.merchantId as string) || userId;

    const payouts = await MerchantPayout.find({ merchantId: new mongoose.Types.ObjectId(merchantId) })
      .sort({ requestedAt: -1 })
      .limit(10000)
      .lean();

    const lines: string[] = ['Date,Amount (₹),Status,BankAccount,ProcessedAt'];
    for (const p of payouts) {
      const date = p.requestedAt ? new Date(p.requestedAt).toISOString().slice(0, 10) : '';
      const amountRs = paiseTo(p.amountPaise || 0);
      const status = p.status || '';
      const bankAccount = (p as any).bankAccountId || '';
      const processedAt = p.processedAt ? new Date(p.processedAt).toISOString().slice(0, 10) : '';
      lines.push(toCsvLine([date, amountRs, status, bankAccount, processedAt]));
    }

    sendCsv(res, `payouts-${new Date().toISOString().slice(0, 10)}.csv`, lines);
  }),
);

// ── Merchant Goals ────────────────────────────────────────────────────────────

/**
 * @route   GET /api/merchant/goals
 * @desc    Get merchant goals
 * @access  Authenticated
 */
router.get(
  '/goals',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = req.userId as string;

    const goal = await MerchantGoal.findOne({ merchantId: new mongoose.Types.ObjectId(merchantId) }).lean();

    res.json({
      success: true,
      data: goal || { merchantId, monthlyRevenueTarget: 0, monthlyVisitsTarget: 0 },
    });
  }),
);

/**
 * @route   PUT /api/merchant/goals
 * @desc    Upsert merchant goals
 * @body    { monthlyRevenueTarget, monthlyVisitsTarget }
 * @access  Authenticated
 */
router.put(
  '/goals',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = req.userId as string;
    const { monthlyRevenueTarget, monthlyVisitsTarget } = req.body;

    const goal = await MerchantGoal.findOneAndUpdate(
      { merchantId: new mongoose.Types.ObjectId(merchantId) },
      { $set: { merchantId, monthlyRevenueTarget, monthlyVisitsTarget } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    res.json({ success: true, data: goal });
  }),
);

export default router;
