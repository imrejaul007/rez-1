import { Request, Response } from 'express';
import Program from '../models/Program';
import programService from '../services/programService';
import socialImpactService from '../services/socialImpactService';
import { asyncHandler } from '../utils/asyncHandler';

class ProgramController {
  // GET /api/programs/college
  getCollegePrograms = asyncHandler(async (req: Request, res: Response) => {
    try {
      const programs = await programService.getProgramsByType('college_ambassador');

      res.json({
        success: true,
        data: programs
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/programs/college/join
  joinCollegeProgram = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { programId, collegeName, collegeId } = req.body;

      if (!programId || !collegeName || !collegeId) {
        return res.status(400).json({
          success: false,
          message: 'programId, collegeName, and collegeId are required'
        });
      }

      await programService.joinCollegeProgram(programId, userId, collegeName, collegeId);

      res.json({
        success: true,
        message: 'Application submitted successfully. Pending verification.'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/programs/college/submit
  submitCollegeTask = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { programId, taskId, submissionUrl } = req.body;

      if (!programId || !taskId || !submissionUrl) {
        return res.status(400).json({
          success: false,
          message: 'programId, taskId, and submissionUrl are required'
        });
      }

      await programService.submitTaskProof(programId, userId, taskId, submissionUrl);

      res.json({
        success: true,
        message: 'Task submitted for review'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/programs/corporate
  getCorporatePrograms = asyncHandler(async (req: Request, res: Response) => {
    try {
      const programs = await programService.getProgramsByType('corporate_employee');

      res.json({
        success: true,
        data: programs
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/programs/corporate/join
  joinCorporateProgram = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { programId, companyName, employeeId } = req.body;

      if (!programId || !companyName || !employeeId) {
        return res.status(400).json({
          success: false,
          message: 'programId, companyName, and employeeId are required'
        });
      }

      await programService.joinCorporateProgram(programId, userId, companyName, employeeId);

      res.json({
        success: true,
        message: 'Application submitted successfully. Pending verification.'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/programs/social-impact
  getSocialImpactEvents = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { eventStatus, eventType, sponsorId, city, page, limit } = req.query;

      const filters = {
        eventStatus: eventStatus as any,
        eventType: eventType as string,
        sponsorId: sponsorId as string,
        city: city as string
      };

      const pagination = {
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      };

      const result = await socialImpactService.getEvents(filters, pagination, userId);

      res.json({
        success: true,
        data: result.events,
        pagination: {
          page: result.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/programs/social-impact/my-stats
  getSocialImpactMyStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const stats = await socialImpactService.getUserStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/programs/social-impact/my-events
  getSocialImpactMyEvents = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { status } = req.query;

      const events = await socialImpactService.getUserEnrollments(userId, status as string);

      res.json({
        success: true,
        data: events
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/programs/social-impact/leaderboard
  getSocialImpactLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { metric, limit } = req.query;

      const leaderboard = await socialImpactService.getLeaderboard(
        metric as any,
        parseInt(limit as string) || 10
      );

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/programs/social-impact/:id
  getSocialImpactEventById = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const event = await socialImpactService.getEventById(id, userId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/programs/social-impact/:id/register
  registerForSocialImpact = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const enrollment = await socialImpactService.registerUser(userId, id);

      res.json({
        success: true,
        message: 'Successfully registered for the event!',
        data: enrollment
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // DELETE /api/programs/social-impact/:id/register
  cancelSocialImpactRegistration = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { reason } = req.body;

      await socialImpactService.cancelRegistration(userId, id, reason);

      res.json({
        success: true,
        message: 'Registration cancelled successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/programs/social-impact/:id/check-in (admin only)
  checkInSocialImpact = asyncHandler(async (req: Request, res: Response) => {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required'
        });
      }

      const enrollment = await socialImpactService.checkInUser(userId, id, adminId);

      res.json({
        success: true,
        message: 'User checked in successfully',
        data: enrollment
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/programs/social-impact/:id/complete (admin only)
  completeSocialImpact = asyncHandler(async (req: Request, res: Response) => {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { userId, impactValue } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required'
        });
      }

      const enrollment = await socialImpactService.completeParticipation(
        userId,
        id,
        adminId,
        impactValue
      );

      res.json({
        success: true,
        message: 'Participation completed and coins awarded',
        data: enrollment
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/programs/social-impact/:id/bulk-complete (admin only)
  bulkCompleteSocialImpact = asyncHandler(async (req: Request, res: Response) => {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userIds array is required'
        });
      }

      const result = await socialImpactService.bulkComplete(id, userIds, adminId);

      res.json({
        success: true,
        message: `Completed ${result.success} participants, ${result.failed} failed`,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/programs/social-impact/:id/participants (admin only)
  getSocialImpactParticipants = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.query;

      const participants = await socialImpactService.getEventParticipants(id, status as string);

      res.json({
        success: true,
        data: participants
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/programs/social-impact (admin only - create event)
  createSocialImpactEvent = asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        name, description, status, startDate, endDate,
        requirements, benefits, tasks, maxParticipants, totalBudget,
        image, featured,
        eventType, sponsor, merchant, organizer, location,
        eventDate, eventTime, rewards, capacity, impact,
        eventRequirements, schedule, contact, eventStatus,
        isCsrActivity, distance, verificationConfig, sponsorBudget,
      } = req.body;

      const eventData = {
        name, description, status, startDate, endDate,
        requirements, benefits, tasks, maxParticipants, totalBudget,
        image, featured,
        eventType, sponsor, merchant, organizer, location,
        eventDate, eventTime, rewards, capacity, impact,
        eventRequirements, schedule, contact, eventStatus,
        isCsrActivity, distance, verificationConfig, sponsorBudget,
      };

      const event = await socialImpactService.createEvent(eventData);

      res.status(201).json({
        success: true,
        message: 'Social impact event created successfully',
        data: event
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // PUT /api/programs/social-impact/:id (admin only - update event)
  updateSocialImpactEvent = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const {
        name, description, status, startDate, endDate,
        requirements, benefits, tasks, maxParticipants, totalBudget,
        image, featured,
        eventType, sponsor, merchant, organizer, location,
        eventDate, eventTime, rewards, capacity, impact,
        eventRequirements, schedule, contact, eventStatus,
        isCsrActivity, distance, verificationConfig, sponsorBudget,
      } = req.body;

      // Only include defined fields in the update
      const updateData: Record<string, any> = {};
      const allowedFields = {
        name, description, status, startDate, endDate,
        requirements, benefits, tasks, maxParticipants, totalBudget,
        image, featured,
        eventType, sponsor, merchant, organizer, location,
        eventDate, eventTime, rewards, capacity, impact,
        eventRequirements, schedule, contact, eventStatus,
        isCsrActivity, distance, verificationConfig, sponsorBudget,
      };

      for (const [key, value] of Object.entries(allowedFields)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      const event = await socialImpactService.updateEvent(id, updateData);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: event
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // ========== ATTENDANCE VERIFICATION ENDPOINTS ==========

  // POST /api/programs/social-impact/:id/generate-qr (admin)
  generateQRCheckIn = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required' });
      }

      const result = await socialImpactService.generateCheckInQR(id, userId);

      res.json({
        success: true,
        message: 'QR check-in token generated',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // POST /api/programs/social-impact/:id/my-qr (user generates own QR)
  generateMyQRCheckIn = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const result = await socialImpactService.generateCheckInQR(id, userId);

      res.json({
        success: true,
        message: 'QR check-in token generated',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // POST /api/programs/social-impact/:id/verify-qr (admin scans)
  verifyQRCheckIn = asyncHandler(async (req: Request, res: Response) => {
    try {
      const adminId = req.user?.id;
      const { qrToken } = req.body;

      if (!qrToken) {
        return res.status(400).json({ success: false, message: 'qrToken is required' });
      }

      const enrollment = await socialImpactService.verifyQRCheckIn(qrToken, adminId);

      res.json({
        success: true,
        message: 'User checked in via QR',
        data: enrollment
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // POST /api/programs/social-impact/:id/generate-otp (admin)
  generateOTPCheckIn = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required' });
      }

      const result = await socialImpactService.generateEventOTP(id, userId);

      res.json({
        success: true,
        message: 'OTP generated for check-in',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // POST /api/programs/social-impact/:id/verify-otp (user self check-in)
  verifyOTPCheckIn = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { otpCode } = req.body;

      if (!otpCode) {
        return res.status(400).json({ success: false, message: 'otpCode is required' });
      }

      const enrollment = await socialImpactService.verifyOTPCheckIn(id, userId, otpCode);

      res.json({
        success: true,
        message: 'Checked in via OTP',
        data: enrollment
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // POST /api/programs/social-impact/:id/verify-geo (user self check-in)
  verifyGeoCheckIn = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
      }

      const enrollment = await socialImpactService.verifyGeoCheckIn(id, userId, latitude, longitude);

      res.json({
        success: true,
        message: 'Checked in via location',
        data: enrollment
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // GET /api/programs/my-programs
  getMyPrograms = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const programs = await programService.getUserPrograms(userId);

      res.json({
        success: true,
        data: programs
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/programs/:id/tasks
  getMyProgramTasks = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const tasks = await programService.getUserProgramTasks(id, userId);

      res.json({
        success: true,
        data: tasks
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/programs/:id
  getProgramById = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const program = await programService.getProgramById(id);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: 'Program not found'
        });
      }

      res.json({
        success: true,
        data: program
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /social-impact/:id/approve — Admin approves a merchant-created event
  approveSocialImpactEvent = asyncHandler(async (req: Request, res: Response) => {
    try {
      const event = await Program.findOne({
        _id: req.params.id,
        type: 'social_impact',
        status: 'pending_approval'
      });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found or not pending approval' });
      }
      event.status = 'active';
      await event.save();
      return res.json({ success: true, message: 'Event approved successfully', data: event });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /social-impact/:id/reject — Admin rejects a merchant-created event
  rejectSocialImpactEvent = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const event = await Program.findOne({
        _id: req.params.id,
        type: 'social_impact',
        status: 'pending_approval'
      });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found or not pending approval' });
      }
      event.status = 'rejected';
      await event.save();
      return res.json({ success: true, message: 'Event rejected', data: { event, reason } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET /social-impact/pending — Admin lists events pending approval
  getPendingApprovalEvents = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query;
      const pg = {
        page: Math.max(1, parseInt(page as string) || 1),
        limit: Math.min(100, Math.max(1, parseInt(limit as string) || 20))
      };

      const query = { type: 'social_impact', status: 'pending_approval' };
      const total = await Program.countDocuments(query);
      const events = await Program.find(query)
        .select('-participants')
        .populate('sponsor', 'name logo brandCoinName brandCoinLogo')
        .populate('merchant', 'businessName logo')
        .sort({ createdAt: -1 })
        .skip((pg.page - 1) * pg.limit)
        .limit(pg.limit).lean();

      return res.json({
        success: true,
        data: {
          events,
          pagination: { page: pg.page, limit: pg.limit, total, totalPages: Math.ceil(total / pg.limit) }
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
}

export default new ProgramController();
