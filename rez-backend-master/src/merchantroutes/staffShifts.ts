import { Router } from 'express';
import StaffShift from '../models/StaffShift';

const router = Router();

// Helper function to get Monday of current week
function getThisMonday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/merchant/staff-shifts?storeId=&weekStart=2026-03-24
router.get('/', async (req, res) => {
  try {
    const { storeId, weekStart } = req.query;
    const merchantId = (req as any).merchantId;

    if (!storeId || !merchantId) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const weekStartDate = weekStart ? new Date(weekStart as string) : getThisMonday();
    weekStartDate.setHours(0, 0, 0, 0);

    const shifts = await StaffShift.find({
      storeId,
      weekStartDate,
      merchantId,
    }).lean();

    res.json({ success: true, data: shifts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/merchant/staff-shifts (upsert week rota)
router.post('/', async (req, res) => {
  try {
    const { storeId, staffId, staffName, weekStartDate, shifts } = req.body;
    const merchantId = (req as any).merchantId;

    if (!storeId || !staffId || !staffName || !weekStartDate || !shifts) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const weekDate = new Date(weekStartDate);
    weekDate.setHours(0, 0, 0, 0);

    const rota = await StaffShift.findOneAndUpdate(
      {
        storeId,
        staffId,
        weekStartDate: weekDate,
        merchantId,
      },
      {
        $set: {
          shifts,
          staffName,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.json({ success: true, data: rota });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/merchant/staff-shifts/:staffId/:weekStart (get single staff rota)
router.get('/:staffId/:weekStart', async (req, res) => {
  try {
    const { staffId, weekStart } = req.params;
    const { storeId } = req.query;
    const merchantId = (req as any).merchantId;

    if (!storeId) {
      return res.status(400).json({ success: false, message: 'Missing storeId' });
    }

    const weekDate = new Date(weekStart);
    weekDate.setHours(0, 0, 0, 0);

    const rota = await StaffShift.findOne({
      storeId,
      staffId,
      weekStartDate: weekDate,
      merchantId,
    }).lean();

    if (!rota) {
      return res.status(404).json({ success: false, message: 'Rota not found' });
    }

    res.json({ success: true, data: rota });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/merchant/staff-shifts/:shiftId (delete a rota)
router.delete('/:shiftId', async (req, res) => {
  try {
    const { shiftId } = req.params;
    const merchantId = (req as any).merchantId;

    await StaffShift.findOneAndDelete({
      _id: shiftId,
      merchantId,
    });

    res.json({ success: true, message: 'Rota deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
