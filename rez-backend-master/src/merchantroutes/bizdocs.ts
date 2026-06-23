import { Router } from 'express';
import { listBizDocs, createBizDoc, patchBizDoc } from '../controllers/merchant/bizDocController';
import { authMiddleware } from '../middleware/merchantauth';

const router = Router();
router.use(authMiddleware);

router.get('/bizdocs', listBizDocs);
router.post('/bizdocs', createBizDoc);
router.patch('/bizdocs/:id', patchBizDoc);

export default router;
