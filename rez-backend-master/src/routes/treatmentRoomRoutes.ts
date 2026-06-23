// @ts-nocheck
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomAvailability,
} from '../controllers/treatmentRoomController';

const router = Router();
router.use(authenticate);

router.get('/', getRooms);
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);
router.get('/:id/availability', getRoomAvailability);

export default router;
