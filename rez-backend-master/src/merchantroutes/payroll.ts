import { Router } from 'express';
import {
  getAttendance,
  clockIn,
  clockOut,
  getPayroll,
  processPayroll,
  markPayrollPaid,
} from '../controllers/merchant/payrollController';
import { authMiddleware } from '../middleware/merchantauth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

router.get('/attendance', getAttendance);
router.post('/attendance/clock-in', clockIn);
router.post('/attendance/clock-out', clockOut);
router.get('/payroll', getPayroll);
router.post('/payroll/process', processPayroll);
router.patch('/payroll/:payrollId/pay', markPayrollPaid);

export default router;
