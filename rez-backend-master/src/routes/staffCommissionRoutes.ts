// @ts-nocheck
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getCommissions, upsertCommission, deleteCommission } from '../controllers/staffCommissionController';

const router = Router();
router.use(authenticate);

router.get('/', getCommissions);
router.post('/', upsertCommission);
router.delete('/:id', deleteCommission);

export default router;
