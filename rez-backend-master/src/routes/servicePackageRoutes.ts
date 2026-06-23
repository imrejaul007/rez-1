// @ts-nocheck
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPackages, createPackage, updatePackage, deletePackage } from '../controllers/servicePackageController';

const router = Router();
router.use(authenticate);

router.get('/', getPackages);
router.post('/', createPackage);
router.put('/:id', updatePackage);
router.delete('/:id', deletePackage);

export default router;
