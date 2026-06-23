// @ts-nocheck
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth, requireAdmin, requireSeniorAdmin } from '../../middleware/auth';
import mongoose from 'mongoose';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/payroll/overview
 * @desc    Get overall payroll statistics and summary
 * @access  Admin
 */
router.get(
  '/overview',
  asyncHandler(async (req: Request, res: Response) => {
    const MerchantUser = mongoose.models.MerchantUser || (await import('../../models/MerchantUser')).MerchantUser;
    const Merchant = mongoose.models.Merchant || (await import('../../models/Merchant')).Merchant;

    // Count staff (non-owner roles)
    const totalStaff = await MerchantUser.countDocuments({
      role: { $ne: 'owner' },
    });

    // Get merchants count
    const totalMerchants = await Merchant.countDocuments({ isActive: true });

    const StaffPayroll = mongoose.models.StaffPayroll || (await import('../../models/StaffPayroll')).StaffPayroll;

    // Aggregate real total monthly payroll from StaffPayroll records for the current month
    // TODO: aggregate from StaffPayroll.sum('amount') once payroll records are populated
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const payrollAgg = await StaffPayroll.aggregate([
      { $match: { month: currentMonth } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } },
    ]);
    const totalMonthlyPayroll = payrollAgg.length > 0 ? payrollAgg[0].total : 0;
    const avgSalary = totalStaff > 0 && totalMonthlyPayroll > 0 ? totalMonthlyPayroll / totalStaff : 0;

    // Real count of pending payroll approvals from DB
    const pendingApprovals = await StaffPayroll.countDocuments({ status: 'pending' });
    const merchantsProcessed = totalMerchants - pendingApprovals;

    // TODO: implement real merchant payroll aggregation from StaffPayroll model
    const topMerchants: Array<{ name: string; payroll: number }> = [];

    res.json({
      success: true,
      data: {
        totalStaff,
        totalMonthlyPayroll,
        avgSalary: Math.round(avgSalary),
        pendingApprovals,
        merchantsProcessed,
        totalMerchants,
        topMerchants,
        _dataWarning: 'Some fields pending implementation',
      },
    });
  }),
);

/**
 * @route   GET /api/admin/payroll/staff
 * @desc    Get all staff members with pagination and optional store filter
 * @access  Admin
 */
router.get(
  '/staff',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId, page = 1, limit = 20, search, merchantId } = req.query;

    const MerchantUser = mongoose.models.MerchantUser || (await import('../../models/MerchantUser')).MerchantUser;
    const Merchant = mongoose.models.Merchant || (await import('../../models/Merchant')).Merchant;

    const filter: any = { role: { $ne: 'owner' } };
    if (storeId && storeId !== 'all') {
      filter.storeId = storeId;
    }
    if (merchantId && merchantId !== 'all') {
      filter.merchantId = merchantId;
    }
    if (search) {
      const searchStr = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: { $regex: searchStr, $options: 'i' } }, { email: { $regex: searchStr, $options: 'i' } }];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const staff = await MerchantUser.find(filter)
      .select('name email role storeId status createdAt')
      .populate('storeId', 'name')
      .limit(limitNum)
      .skip(skip)
      .lean();

    const total = await MerchantUser.countDocuments(filter);

    // Fetch salary data for these staff members from StaffPayroll records
    const staffIds = staff.map((s: any) => s._id);
    const StaffPayroll = mongoose.models.StaffPayroll || (await import('../../models/StaffPayroll')).StaffPayroll;

    // Get the most recent payroll record per staff member to derive baseSalary
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const payrollRecords = await StaffPayroll.find({
      staffId: { $in: staffIds },
      month: currentMonth,
    })
      .select('staffId baseSalary')
      .lean();

    const salaryMap = new Map<string, number>();
    for (const p of payrollRecords as any[]) {
      salaryMap.set(String(p.staffId), p.baseSalary);
    }

    // Map to staff member format
    const mappedStaff = staff.map((s: any) => ({
      _id: s._id,
      name: s.name,
      role: s.role,
      storeName: s.storeId?.name || 'Unknown Store',
      storeId: s.storeId?._id || s.storeId,
      salaryType: 'fixed' as const,
      baseSalary: salaryMap.get(String(s._id)) ?? 0,
      commissionRate: 5,
    }));

    res.json({
      success: true,
      data: mappedStaff,
      total,
      page: pageNum,
      limit: limitNum,
    });
  }),
);

/**
 * @route   GET /api/admin/payroll/attendance
 * @desc    Get staff attendance records for a date range
 * @access  Admin
 */
router.get(
  '/attendance',
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, storeId } = req.query;

    const StaffShift = mongoose.models.StaffShift || (await import('../../models/StaffShift')).default;
    const MerchantUser = mongoose.models.MerchantUser || (await import('../../models/MerchantUser')).MerchantUser;

    const filter: any = {};
    if (startDate) {
      filter.weekStartDate = {
        $gte: new Date(startDate as string),
      };
    }
    if (endDate) {
      filter.weekStartDate = filter.weekStartDate || {};
      filter.weekStartDate.$lte = new Date(endDate as string);
    }
    if (storeId) {
      filter.storeId = storeId;
    }

    const shifts = await StaffShift.find(filter).populate('staffId', 'name role').limit(500).lean();

    // Map real shift data — attendance arrays come from the shift's own records
    const attendanceData = shifts.slice(0, 20).map((shift: any) => {
      // Use persisted attendance entries if available on the shift document,
      // otherwise return an empty array so the caller knows data is not yet recorded.
      const attendance: Array<{ date: string; status: string }> = Array.isArray(shift.attendance)
        ? shift.attendance.map((a: any) => ({
            date: a.date instanceof Date ? a.date.toISOString().split('T')[0] : a.date,
            status: a.status,
          }))
        : [];

      return {
        _id: shift._id,
        staffId: shift.staffId,
        name: shift.staffId?.name,
        role: shift.staffId?.role,
        attendance,
      };
    });

    res.json({
      success: true,
      data: attendanceData,
    });
  }),
);

/**
 * @route   POST /api/admin/payroll/process
 * @desc    Process payroll for a given month/year
 * @access  Senior Admin (level 80+) — support agents must not trigger payroll runs
 */
router.post(
  '/process',
  requireSeniorAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required',
      });
    }

    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month or year',
      });
    }

    // Mock PayrollRun model - in production, create actual record
    const PayrollRun =
      mongoose.models.PayrollRun ||
      mongoose.model(
        'PayrollRun',
        new mongoose.Schema({
          month: Number,
          year: Number,
          totalAmount: Number,
          staffCount: Number,
          status: { type: String, default: 'processed' },
          processedAt: { type: Date, default: Date.now },
        }),
      );

    const MerchantUser = mongoose.models.MerchantUser || (await import('../../models/MerchantUser')).MerchantUser;
    const StaffPayroll = mongoose.models.StaffPayroll || (await import('../../models/StaffPayroll')).StaffPayroll;

    // Count actual staff from DB
    const staffCount = await MerchantUser.countDocuments({ role: { $ne: 'owner' } });

    // Sum net salaries from StaffPayroll records for this month/year
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const payrollAgg = await StaffPayroll.aggregate([
      { $match: { month: monthStr } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } },
    ]);
    const totalAmount = payrollAgg.length > 0 ? payrollAgg[0].total : 0;

    const payrollRun = await PayrollRun.create({
      month,
      year,
      totalAmount,
      staffCount,
      status: 'processed',
      processedAt: new Date(),
    });

    res.json({
      success: true,
      data: {
        _id: payrollRun._id,
        month,
        year,
        status: 'processed',
        totalAmount,
        staffCount,
        processedAt: payrollRun.processedAt,
      },
      message: 'Payroll processed successfully.',
    });
  }),
);

/**
 * @route   GET /api/admin/payroll/history
 * @desc    Get historical payroll runs
 * @access  Admin
 */
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const PayrollRun =
      mongoose.models.PayrollRun ||
      mongoose.model(
        'PayrollRun',
        new mongoose.Schema({
          month: Number,
          year: Number,
          totalAmount: Number,
          staffCount: Number,
          status: { type: String, default: 'processed' },
          processedAt: { type: Date, default: Date.now },
        }),
      );

    const history = await PayrollRun.find().sort({ year: -1, month: -1 }).skip(skip).limit(limitNum).lean();

    const total = await PayrollRun.countDocuments();

    res.json({
      success: true,
      data: history,
      total,
      page: pageNum,
      limit: limitNum,
    });
  }),
);

export default router;
