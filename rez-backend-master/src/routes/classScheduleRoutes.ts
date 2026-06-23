// @ts-nocheck
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getClasses, createClass, updateClass, deleteClass, bookClass } from '../controllers/classScheduleController';

const router = Router();
router.use(authenticate);

router.get('/', getClasses);
router.post('/', createClass);
router.put('/:id', updateClass);
router.delete('/:id', deleteClass);
router.post('/:id/book', bookClass);

export default router;
