import { Router } from 'express';
import { getUserBoot } from '../controllers/userBootController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getUserBoot);

export default router;
