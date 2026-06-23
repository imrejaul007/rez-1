import { Router, Request, Response } from 'express';
import {
  uploadBill,
  analyzeBillForUser,
  getUserBills,
  getBillById,
  getBillStatistics,
  resubmitBill,
  getPendingBills,
  approveBill,
  rejectBill,
  getVerificationStatistics,
  getUserFraudHistory,
} from '../controllers/billController';
import { authenticate } from '../middleware/auth';
import { uploadProfileImage as upload } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.post('/upload', upload.single('billImage'), uploadBill);
router.get('/', getUserBills);
router.get('/statistics', getBillStatistics);
// Bill image analysis (OCR — pre-fills amount/merchant before upload)
router.post('/analyze-image', upload.single('billImage'), analyzeBillForUser);

router.get('/:billId', getBillById);
router.post('/:billId/resubmit', upload.single('billImage'), resubmitBill);

// Admin routes
router.get('/admin/pending', getPendingBills);
router.get('/admin/statistics', getVerificationStatistics);
router.get('/admin/users/:userId/fraud-history', getUserFraudHistory);
router.post('/:billId/approve', approveBill);
router.post('/:billId/reject', rejectBill);

export default router;
