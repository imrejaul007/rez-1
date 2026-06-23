import { Router } from 'express';
import programController from '../controllers/programController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// College Ambassador
router.get('/college', programController.getCollegePrograms.bind(programController));
router.post('/college/join', programController.joinCollegeProgram.bind(programController));
router.post('/college/submit', programController.submitCollegeTask.bind(programController));

// Corporate Employee
router.get('/corporate', programController.getCorporatePrograms.bind(programController));
router.post('/corporate/join', programController.joinCorporateProgram.bind(programController));

// Social Impact - User routes (order matters - specific routes before :id)
router.get('/social-impact/my-stats', programController.getSocialImpactMyStats.bind(programController));
router.get('/social-impact/my-events', programController.getSocialImpactMyEvents.bind(programController));
router.get('/social-impact/leaderboard', programController.getSocialImpactLeaderboard.bind(programController));
router.get('/social-impact', programController.getSocialImpactEvents.bind(programController));

// Social Impact - Admin approval routes (must be before :id routes)
router.get('/social-impact/pending', requireAdmin, programController.getPendingApprovalEvents.bind(programController));

// Social Impact - Admin routes for creating events
router.post('/social-impact', requireAdmin, programController.createSocialImpactEvent.bind(programController));

// Social Impact - Specific event routes
router.get('/social-impact/:id', programController.getSocialImpactEventById.bind(programController));
router.put('/social-impact/:id', requireAdmin, programController.updateSocialImpactEvent.bind(programController));
router.post('/social-impact/:id/approve', requireAdmin, programController.approveSocialImpactEvent.bind(programController));
router.post('/social-impact/:id/reject', requireAdmin, programController.rejectSocialImpactEvent.bind(programController));
router.post('/social-impact/:id/register', programController.registerForSocialImpact.bind(programController));
router.delete('/social-impact/:id/register', programController.cancelSocialImpactRegistration.bind(programController));
router.post('/social-impact/:id/my-qr', programController.generateMyQRCheckIn.bind(programController));

// Social Impact - Admin event management
router.get('/social-impact/:id/participants', requireAdmin, programController.getSocialImpactParticipants.bind(programController));
router.post('/social-impact/:id/check-in', requireAdmin, programController.checkInSocialImpact.bind(programController));
router.post('/social-impact/:id/complete', requireAdmin, programController.completeSocialImpact.bind(programController));
router.post('/social-impact/:id/bulk-complete', requireAdmin, programController.bulkCompleteSocialImpact.bind(programController));

// Social Impact - Attendance verification
router.post('/social-impact/:id/generate-qr', requireAdmin, programController.generateQRCheckIn.bind(programController));
router.post('/social-impact/:id/verify-qr', requireAdmin, programController.verifyQRCheckIn.bind(programController));
router.post('/social-impact/:id/generate-otp', requireAdmin, programController.generateOTPCheckIn.bind(programController));
router.post('/social-impact/:id/verify-otp', programController.verifyOTPCheckIn.bind(programController));
router.post('/social-impact/:id/verify-geo', programController.verifyGeoCheckIn.bind(programController));

// General
router.get('/my-programs', programController.getMyPrograms.bind(programController));
router.get('/:id', programController.getProgramById.bind(programController));
router.get('/:id/tasks', programController.getMyProgramTasks.bind(programController));

export default router;
