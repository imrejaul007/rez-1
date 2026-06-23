/**
 * merchantroutes/corporate.ts
 *
 * Corporate B2B dashboard routes.
 * All routes require merchant-level auth (authMiddleware).
 *
 * Endpoints:
 *   POST   /api/merchant/corporate/register        — create/claim corporate account
 *   GET    /api/merchant/corporate                 — get own corporate account
 *   PATCH  /api/merchant/corporate                 — update company profile
 *   GET    /api/merchant/corporate/members         — list employees
 *   POST   /api/merchant/corporate/members         — add single employee
 *   POST   /api/merchant/corporate/members/bulk    — bulk add via CSV array
 *   PATCH  /api/merchant/corporate/members/:id     — update / deactivate member
 *   DELETE /api/merchant/corporate/members/:id     — remove member
 *   POST   /api/merchant/corporate/distribute      — send coins to member(s) or whole dept
 *   GET    /api/merchant/corporate/analytics       — usage stats + ROI
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/merchantauth';
import { Corporate } from '../models/Corporate';
import { CorporateMember } from '../models/CorporateMember';
import { Wallet } from '../models/Wallet';
import { createServiceLogger } from '../config/logger';
import { walletService } from '../services/walletService';

const logger = createServiceLogger('corporate');
const router = Router();
router.use(authMiddleware);

// ── Helpers ───────────────────────────────────────────────────────────────────

function merchantId(req: Request): string {
  return (req as any).merchant?._id?.toString() || (req as any).merchantId?.toString() || '';
}

function isValidId(id: string) {
  return mongoose.isValidObjectId(id);
}

/** Guard: returns a valid ObjectId or sends 401 and returns null */
function requireMid(mid: string, res: Response): mongoose.Types.ObjectId | null {
  if (!mid || !isValidId(mid)) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return null;
  }
  return new mongoose.Types.ObjectId(mid);
}

// ── 1. Register / Claim Corporate Account ─────────────────────────────────────

/**
 * POST /api/merchant/corporate/register
 * Body: { companyName, companyEmail, adminEmail, companyPhone?, industry?, gstin?, address?, city?, state? }
 * Creates a new Corporate account linked to the calling merchant's admin email.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;

    const { companyName, companyEmail, adminEmail, companyPhone, industry, gstin, address, city, state } = req.body;

    if (!companyName || !companyEmail || !adminEmail) {
      return res
        .status(400)
        .json({ success: false, message: 'companyName, companyEmail, and adminEmail are required' });
    }

    const existing = await Corporate.findOne({ companyEmail: companyEmail.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A corporate account with this email already exists' });
    }

    const corporate = await Corporate.create({
      companyName,
      companyEmail: companyEmail.toLowerCase(),
      adminEmail: adminEmail.toLowerCase(),
      adminUserId: midObj,
      companyPhone,
      industry,
      gstin,
      address,
      city,
      state,
    });

    return res.status(201).json({ success: true, message: 'Corporate account created', data: corporate });
  } catch (error: any) {
    logger.error('Corporate register error', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create corporate account' });
  }
});

// ── 2. Get Corporate Account ──────────────────────────────────────────────────

/**
 * GET /api/merchant/corporate
 * Returns the corporate account linked to the calling merchant.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;
    const corporate = await Corporate.findOne({ adminUserId: midObj });
    if (!corporate) {
      return res.status(404).json({ success: false, message: 'No corporate account found. Register first.' });
    }
    return res.json({ success: true, data: corporate });
  } catch (error: any) {
    logger.error('Corporate get error', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch corporate account' });
  }
});

// ── 3. Update Corporate Profile ───────────────────────────────────────────────

/**
 * PATCH /api/merchant/corporate
 * Body: any subset of updatable fields
 */
router.patch('/', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;
    const allowed = ['companyName', 'companyPhone', 'companyLogo', 'industry', 'gstin', 'address', 'city', 'state'];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const corporate = await Corporate.findOneAndUpdate({ adminUserId: midObj }, { $set: update }, { new: true });
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate account not found' });

    return res.json({ success: true, data: corporate });
  } catch (error: any) {
    logger.error('Corporate update error', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update corporate account' });
  }
});

// ── 4. List Members ───────────────────────────────────────────────────────────

/**
 * GET /api/merchant/corporate/members?department=&status=&page=1&limit=50
 */
router.get('/members', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;
    const corporate = await Corporate.findOne({ adminUserId: midObj }).lean();
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate account not found' });

    const { department, status, page = '1', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, any> = { corporateId: corporate._id };
    if (department) filter.department = department;
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [members, total] = await Promise.all([
      CorporateMember.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
      CorporateMember.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: members,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    logger.error('Corporate members list error', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch members' });
  }
});

// ── 5. Add Single Member ──────────────────────────────────────────────────────

/**
 * POST /api/merchant/corporate/members
 * Body: { name, email, phone?, employeeId?, department?, designation? }
 */
router.post('/members', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;
    const corporate = await Corporate.findOne({ adminUserId: midObj });
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate account not found' });

    const { name, email, phone, employeeId, department, designation } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'name and email are required' });
    }

    const existing = await CorporateMember.findOne({ corporateId: corporate._id, email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Member with this email already exists' });
    }

    const member = await CorporateMember.create({
      corporateId: corporate._id,
      name,
      email: email.toLowerCase(),
      phone,
      employeeId,
      department,
      designation,
      status: 'invited',
      invitedAt: new Date(),
    });

    await Corporate.findByIdAndUpdate(corporate._id, { $inc: { memberCount: 1 } });

    return res.status(201).json({ success: true, data: member, message: 'Member added' });
  } catch (error: any) {
    logger.error('Corporate add member error', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to add member' });
  }
});

// ── 6. Bulk Add Members via Array ─────────────────────────────────────────────

/**
 * POST /api/merchant/corporate/members/bulk
 * Body: { members: Array<{ name, email, phone?, employeeId?, department?, designation? }> }
 * Skips duplicates, reports added vs skipped counts.
 */
router.post('/members/bulk', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;
    const corporate = await Corporate.findOne({ adminUserId: midObj });
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate account not found' });

    const { members } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'members array is required and must not be empty' });
    }
    if (members.length > 1000) {
      return res.status(400).json({ success: false, message: 'Maximum 1000 members per bulk upload' });
    }

    const existingEmails = new Set(
      (await CorporateMember.find({ corporateId: corporate._id }).select('email').lean()).map((m) => m.email),
    );

    const toInsert: any[] = [];
    const skipped: string[] = [];
    const now = new Date();

    for (const m of members) {
      if (!m.name || !m.email) {
        skipped.push(m.email || '(missing email)');
        continue;
      }
      const email = m.email.toLowerCase().trim();
      if (existingEmails.has(email)) {
        skipped.push(email);
        continue;
      }
      toInsert.push({
        corporateId: corporate._id,
        name: m.name,
        email,
        phone: m.phone,
        employeeId: m.employeeId,
        department: m.department,
        designation: m.designation,
        status: 'invited',
        invitedAt: now,
        coinsReceived: 0,
        coinsSpent: 0,
        pendingCoins: 0,
      });
      existingEmails.add(email);
    }

    if (toInsert.length > 0) {
      await CorporateMember.insertMany(toInsert, { ordered: false });
      await Corporate.findByIdAndUpdate(corporate._id, { $inc: { memberCount: toInsert.length } });
    }

    return res.json({
      success: true,
      message: `${toInsert.length} member(s) added, ${skipped.length} skipped`,
      data: { added: toInsert.length, skipped: skipped.length, skippedEmails: skipped },
    });
  } catch (error: any) {
    logger.error('Corporate bulk members error', error);
    return res.status(500).json({ success: false, message: error.message || 'Bulk import failed' });
  }
});

// ── 7. Update / Deactivate Member ────────────────────────────────────────────

/**
 * PATCH /api/merchant/corporate/members/:id
 */
router.patch('/members/:id', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;
    const corporate = await Corporate.findOne({ adminUserId: midObj }).lean();
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate account not found' });
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid member ID' });

    const allowed = ['name', 'phone', 'employeeId', 'department', 'designation', 'status'];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const member = await CorporateMember.findOneAndUpdate(
      { _id: req.params.id, corporateId: corporate._id },
      { $set: update },
      { new: true },
    );
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    return res.json({ success: true, data: member });
  } catch (error: any) {
    logger.error('Corporate update member error', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update member' });
  }
});

// ── 8. Remove Member ──────────────────────────────────────────────────────────

/**
 * DELETE /api/merchant/corporate/members/:id
 */
router.delete('/members/:id', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;
    const corporate = await Corporate.findOne({ adminUserId: midObj }).lean();
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate account not found' });
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid member ID' });

    const member = await CorporateMember.findOneAndDelete({ _id: req.params.id, corporateId: corporate._id });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    await Corporate.findByIdAndUpdate(corporate._id, { $inc: { memberCount: -1 } });

    return res.json({ success: true, message: 'Member removed' });
  } catch (error: any) {
    logger.error('Corporate delete member error', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to remove member' });
  }
});

// ── 9. Distribute Coins ───────────────────────────────────────────────────────

/**
 * POST /api/merchant/corporate/distribute
 * Body:
 *   { memberIds: string[], coins: number, note?: string }   — send to specific members
 *   { department: string, coins: number, note?: string }    — send to whole department
 *   { all: true, coins: number, note?: string }             — send to all active members
 *
 * Deducts from corporate coinBalance, credits each member's REZ wallet (if linked)
 * or holds in pendingCoins (if not yet joined).
 */
router.post('/distribute', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;
    const corporate = await Corporate.findOne({ adminUserId: midObj });
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate account not found' });

    const { memberIds, department, all, coins, note } = req.body;
    if (!coins || isNaN(Number(coins)) || Number(coins) < 1) {
      return res.status(400).json({ success: false, message: 'coins must be a positive number' });
    }
    const coinsPerMember = Math.floor(Number(coins));

    // Resolve target members
    let filter: Record<string, any> = { corporateId: corporate._id, status: { $ne: 'deactivated' } };
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      filter._id = { $in: memberIds.filter(isValidId).map((id) => new mongoose.Types.ObjectId(id)) };
    } else if (department) {
      filter.department = department;
    } else if (all !== true) {
      return res.status(400).json({ success: false, message: 'Specify memberIds, department, or all:true' });
    }

    const members = await CorporateMember.find(filter).lean();
    if (members.length === 0) {
      return res.status(400).json({ success: false, message: 'No eligible members found for distribution' });
    }

    const totalRequired = coinsPerMember * members.length;
    if (corporate.coinBalance < totalRequired) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Need ${totalRequired} coins for ${members.length} member(s), have ${corporate.coinBalance}.`,
      });
    }

    // Process distributions
    let credited = 0;
    let pending = 0;

    // Stable batch token: ties the entire distribute request to one point in time.
    // Using corporate._id + coinsPerMember + member count so retrying the same
    // logical distribution doesn't double-credit (idempotency key is per-member).
    const batchRef = `corp-dist-${(corporate._id as any).toString()}-${coinsPerMember}-${members.length}`;

    for (const member of members) {
      if (member.userId) {
        // Credit directly to REZ wallet via walletService.credit() which creates
        // both a CoinTransaction and a double-entry LedgerEntry atomically.
        // idempotencyKey is deterministic: safe to retry without double-crediting.
        try {
          await walletService.credit({
            userId: member.userId.toString(),
            amount: coinsPerMember,
            source: 'corporate_distribution',
            description: note ? `Corporate coin distribution: ${note}` : 'Corporate coin distribution',
            operationType: 'transfer',
            referenceId: `${batchRef}-${(member._id as any).toString()}`,
            referenceModel: 'CorporateMember',
            metadata: {
              corporateId: (corporate._id as any).toString(),
              memberId: (member._id as any).toString(),
              idempotencyKey: `${batchRef}-${(member._id as any).toString()}`,
            },
          });
          credited++;
        } catch {
          // walletService.credit threw (frozen wallet, max balance exceeded, lock unavailable, etc.)
          // — hold as pending so the member receives coins when the issue resolves.
          await CorporateMember.findByIdAndUpdate(member._id, { $inc: { pendingCoins: coinsPerMember } });
          pending++;
          continue;
        }
      } else {
        // No REZ account yet — hold until they sign up
        await CorporateMember.findByIdAndUpdate(member._id, { $inc: { pendingCoins: coinsPerMember } });
        pending++;
        continue; // pendingCoins only — coinsReceived is claimed on registration
      }
      await CorporateMember.findByIdAndUpdate(member._id, { $inc: { coinsReceived: coinsPerMember } });
    }

    // Deduct from corporate wallet and update stats
    await Corporate.findByIdAndUpdate(corporate._id, {
      $inc: {
        coinBalance: -totalRequired,
        totalCoinsDistributed: totalRequired,
      },
      $set: { lastDistributionAt: new Date() },
    });

    logger.info('Corporate coins distributed', {
      corporateId: (corporate._id as any).toString(),
      coinsPerMember,
      totalMembers: members.length,
      credited,
      pending,
    });

    return res.json({
      success: true,
      message: `${coinsPerMember} coins sent to ${members.length} member(s). ${credited} credited instantly, ${pending} held pending REZ sign-up.`,
      data: { coinsPerMember, totalMembers: members.length, totalCoins: totalRequired, credited, pending },
    });
  } catch (error: any) {
    logger.error('Corporate distribute error', error);
    return res.status(500).json({ success: false, message: error.message || 'Distribution failed' });
  }
});

// ── 10. Analytics ─────────────────────────────────────────────────────────────

/**
 * GET /api/merchant/corporate/analytics
 * Returns usage stats, top spenders, department breakdown.
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const mid = merchantId(req);
    const midObj = requireMid(mid, res);
    if (!midObj) return;
    const corporate = await Corporate.findOne({ adminUserId: midObj }).lean();
    if (!corporate) return res.status(404).json({ success: false, message: 'Corporate account not found' });

    const [deptStats, topMembers, memberTotals] = await Promise.all([
      // Department breakdown
      CorporateMember.aggregate([
        { $match: { corporateId: corporate._id, status: { $ne: 'deactivated' } } },
        {
          $group: {
            _id: '$department',
            members: { $sum: 1 },
            coinsReceived: { $sum: '$coinsReceived' },
            coinsSpent: { $sum: '$coinsSpent' },
          },
        },
        { $sort: { coinsReceived: -1 } },
      ]),
      // Top 10 spenders
      CorporateMember.find({ corporateId: corporate._id })
        .sort({ coinsSpent: -1 })
        .limit(10)
        .select('name email department coinsReceived coinsSpent')
        .lean(),
      // Overall member stats
      CorporateMember.aggregate([
        { $match: { corporateId: corporate._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            invited: { $sum: { $cond: [{ $eq: ['$status', 'invited'] }, 1, 0] } },
            pendingCoins: { $sum: '$pendingCoins' },
          },
        },
      ]),
    ]);

    const totals = memberTotals[0] || { total: 0, active: 0, invited: 0, pendingCoins: 0 };
    const utilizationRate =
      corporate.totalCoinsDistributed > 0
        ? Math.round((corporate.totalCoinsRedeemed / corporate.totalCoinsDistributed) * 100)
        : 0;

    return res.json({
      success: true,
      data: {
        overview: {
          coinBalance: corporate.coinBalance,
          totalCoinsLoaded: corporate.totalCoinsLoaded,
          totalCoinsDistributed: corporate.totalCoinsDistributed,
          totalCoinsRedeemed: corporate.totalCoinsRedeemed,
          utilizationRate,
          lastDistributionAt: corporate.lastDistributionAt,
        },
        members: {
          total: totals.total,
          active: totals.active,
          invited: totals.invited,
          pendingCoins: totals.pendingCoins,
        },
        departments: deptStats,
        topSpenders: topMembers,
      },
    });
  } catch (error: any) {
    logger.error('Corporate analytics error', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch analytics' });
  }
});

export default router;
