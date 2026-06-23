import { Request, Response } from 'express';
import { StaffAttendance } from '../../models/StaffAttendance';
import { StaffPayroll } from '../../models/StaffPayroll';
import { createServiceLogger } from '../../config/logger';

const logger = createServiceLogger('payroll');

/** GET /api/merchant/attendance?storeId=&date= */
export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId, date, month } = req.query;
    const query: any = { storeId };

    if (date) {
      const d = new Date(date as string);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      query.date = { $gte: start, $lte: end };
    } else if (month) {
      const [year, mon] = (month as string).split('-');
      const start = new Date(parseInt(year), parseInt(mon) - 1, 1);
      const end = new Date(parseInt(year), parseInt(mon), 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const records = await (StaffAttendance as any)
      .find(query)
      .populate('staffId', 'name email role')
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: records });
  } catch (error: any) {
    logger.error('getAttendance error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
};

/** POST /api/merchant/attendance/clock-in */
export const clockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId, staffId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let record = await (StaffAttendance as any).findOne({
      storeId,
      staffId,
      date: { $gte: today },
    });

    if (!record) {
      const merchantId = (req as any).user?.id || (req as any).user?._id?.toString();
      record = await (StaffAttendance as any).create({
        merchantId,
        staffId,
        storeId,
        date: new Date(),
        clockIn: new Date(),
        status: 'present',
      });
    } else {
      record.clockIn = new Date();
      await record.save();
    }

    res.json({ success: true, data: record });
  } catch (error: any) {
    logger.error('clockIn error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to clock in' });
  }
};

/** POST /api/merchant/attendance/clock-out */
export const clockOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId, staffId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await (StaffAttendance as any).findOne({
      storeId,
      staffId,
      date: { $gte: today },
    });

    if (!record) {
      res.status(404).json({ success: false, message: 'No clock-in record found for today' });
      return;
    }

    record.clockOut = new Date();
    await record.save();

    res.json({ success: true, data: record });
  } catch (error: any) {
    logger.error('clockOut error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to clock out' });
  }
};

/** GET /api/merchant/payroll?storeId=&month= */
export const getPayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId, month } = req.query;
    const records = await (StaffPayroll as any).find({ storeId, month }).populate('staffId', 'name email role').lean();

    const totalPayable = records
      .filter((r: any) => r.status !== 'paid')
      .reduce((sum: number, r: any) => sum + r.netSalary, 0);

    res.json({ success: true, data: { payroll: records, totalPayable } });
  } catch (error: any) {
    logger.error('getPayroll error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch payroll' });
  }
};

/** POST /api/merchant/payroll/process */
export const processPayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = (req as any).user?.id || (req as any).user?._id?.toString();
    const { storeId, month, staffPayrolls } = req.body;

    if (!Array.isArray(staffPayrolls)) {
      res.status(400).json({ success: false, message: 'staffPayrolls array is required' });
      return;
    }

    const results = [];
    for (const sp of staffPayrolls) {
      // Prevent double-processing: only allow processing of draft payroll records.
      // If already approved/paid, reject the update to prevent double crediting employees.
      const record = await (StaffPayroll as any).findOneAndUpdate(
        { staffId: sp.staffId, month, storeId, status: 'draft' },
        { ...sp, merchantId, storeId, month, status: 'approved' },
        { new: true },
      );

      if (!record) {
        // Record either doesn't exist or is not in 'draft' status (already processed)
        const existingRecord = await (StaffPayroll as any).findOne({ staffId: sp.staffId, month, storeId });
        if (existingRecord) {
          logger.warn(
            `Payroll for staffId ${sp.staffId}, month ${month}, storeId ${storeId} already in status: ${existingRecord.status}. Skipping to prevent double-processing.`,
          );
        }
      }

      if (record) {
        results.push(record);
      }
    }

    if (results.length === 0) {
      res
        .status(400)
        .json({
          success: false,
          message: 'No payroll records were processed. Check that all records are in draft status.',
        });
      return;
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error('processPayroll error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to process payroll' });
  }
};

/** PATCH /api/merchant/payroll/:payrollId/pay */
export const markPayrollPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { payrollId } = req.params;
    const { paymentMethod } = req.body;

    const record = await (StaffPayroll as any).findByIdAndUpdate(
      payrollId,
      { status: 'paid', paidAt: new Date(), paymentMethod },
      { new: true },
    );

    if (!record) {
      res.status(404).json({ success: false, message: 'Payroll record not found' });
      return;
    }

    res.json({ success: true, data: record });
  } catch (error: any) {
    logger.error('markPayrollPaid error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to mark payroll as paid' });
  }
};
