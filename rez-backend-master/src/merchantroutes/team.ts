import { Router, Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { logger } from '../config/logger';
import { MerchantUser, MerchantUserRole } from '../models/MerchantUser';
import { authMiddleware } from '../middleware/merchantauth';
import { validateRequest } from '../middleware/merchantvalidation';
import { requireRole, checkPermission } from '../middleware/rbac';
import TeamInvitationService from '../services/TeamInvitationService';
import { getPermissionsForRole, getRoleDescription } from '../config/permissions';
import AuditService from '../services/AuditService';
import AuditLog from '../models/AuditLog';

const router = Router();

// All team routes require authentication
router.use(authMiddleware);

// Validation schemas
const inviteSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('admin', 'manager', 'staff').required()
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'manager', 'staff').required()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'suspended').required()
});

/**
 * @route   GET /api/merchant/team
 * @desc    List all team members
 * @access  Private (owner, admin)
 */
router.get('/', checkPermission('team:view'), async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;

    const teamMembers = await MerchantUser.find({ merchantId })
      .select('-password -invitationToken -resetPasswordToken')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        teamMembers,
        total: teamMembers.length
      }
    });
  } catch (error: any) {
    logger.error('Error fetching team members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/merchant/team/invite
 * @desc    Invite new team member
 * @access  Private (owner, admin)
 */
router.post('/invite', checkPermission('team:invite'), validateRequest(inviteSchema), async (req: Request, res: Response) => {
  try {
    const { email, name, role } = req.body;
    const merchantId = req.merchantId;
    const invitedBy = req.merchantUser?._id ? String(req.merchantUser._id) : String(req.merchantId); // Use merchantUser if exists, else merchant

    // Create invitation
    const result = await TeamInvitationService.createInvitation({
      email,
      name,
      role,
      merchantId: merchantId!,
      invitedBy: invitedBy!
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // Log audit event
    AuditService.log({
      merchantId: merchantId!,
      merchantUserId: invitedBy,
      action: 'team.invite',
      resourceType: 'team_member',
      resourceId: result.invitationId,
      details: {
        after: { email, name, role },
        metadata: { action: 'invite' }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        invitationId: result.invitationId,
        expiresAt: result.expiresAt,
        ...(process.env.NODE_ENV === 'development' && {
          invitationToken: result.invitationToken,
          invitationUrl: `${process.env.FRONTEND_URL}/team/accept-invitation/${result.invitationToken}`
        })
      }
    });
  } catch (error: any) {
    logger.error('Error inviting team member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to invite team member',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/merchant/team/:userId/resend-invite
 * @desc    Resend invitation email
 * @access  Private (owner, admin)
 */
router.post('/:userId/resend-invite', checkPermission('team:invite'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await TeamInvitationService.resendInvitation(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // Log audit event
    AuditService.log({
      merchantId: req.merchantId!,
      merchantUserId: req.merchantUser?._id ? String(req.merchantUser._id) : undefined,
      action: 'team.resend_invite',
      resourceType: 'team_member',
      resourceId: userId,
      details: {
        metadata: { action: 'resend_invite' }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    return res.json({
      success: true,
      message: result.message,
      data: {
        invitationId: result.invitationId,
        expiresAt: result.expiresAt,
        ...(process.env.NODE_ENV === 'development' && {
          invitationToken: result.invitationToken
        })
      }
    });
  } catch (error: any) {
    logger.error('Error resending invitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend invitation',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/merchant/team/:userId/role
 * @desc    Update team member role
 * @access  Private (owner only)
 */
router.put('/:userId/role', checkPermission('team:change_role'), validateRequest(updateRoleSchema), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const merchantId = req.merchantId;

    // Find team member
    const teamMember = await MerchantUser.findOne({
      _id: userId,
      merchantId
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Prevent changing owner role
    if (teamMember.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot change role of owner'
      });
    }

    // Update role and permissions
    const oldRole = teamMember.role;
    teamMember.role = role;
    teamMember.permissions = getPermissionsForRole(role);
    await teamMember.save();

    // Log audit event
    AuditService.log({
      merchantId: merchantId!,
      merchantUserId: req.merchantUser?._id ? String(req.merchantUser._id) : undefined,
      action: 'team.role_change',
      resourceType: 'team_member',
      resourceId: teamMember._id,
      details: {
        before: { role: oldRole },
        after: { role },
        changes: { role: { from: oldRole, to: role } },
        metadata: { action: 'role_change', name: teamMember.name, email: teamMember.email }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    return res.json({
      success: true,
      message: 'Role updated successfully',
      data: {
        teamMember: {
          id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
          role: teamMember.role,
          permissions: teamMember.permissions,
          oldRole
        }
      }
    });
  } catch (error: any) {
    logger.error('Error updating team member role:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/merchant/team/:userId/status
 * @desc    Update team member status (active/suspended)
 * @access  Private (owner, admin)
 */
router.put('/:userId/status', checkPermission('team:change_status'), validateRequest(updateStatusSchema), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const merchantId = req.merchantId;

    // Find team member
    const teamMember = await MerchantUser.findOne({
      _id: userId,
      merchantId
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Prevent suspending owner
    if (teamMember.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend owner account'
      });
    }

    // Prevent suspending yourself
    if (req.merchantUser && teamMember._id.toString() === req.merchantUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }

    const oldStatus = teamMember.status;
    teamMember.status = status;
    await teamMember.save();

    // Log audit event
    AuditService.log({
      merchantId: merchantId!,
      merchantUserId: req.merchantUser?._id ? String(req.merchantUser._id) : undefined,
      action: 'team.status_change',
      resourceType: 'team_member',
      resourceId: teamMember._id,
      details: {
        before: { status: oldStatus },
        after: { status },
        changes: { status: { from: oldStatus, to: status } },
        metadata: { action: 'status_change', name: teamMember.name, email: teamMember.email }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    return res.json({
      success: true,
      message: `Team member ${status === 'active' ? 'activated' : 'suspended'} successfully`,
      data: {
        teamMember: {
          id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
          status: teamMember.status,
          oldStatus
        }
      }
    });
  } catch (error: any) {
    logger.error('Error updating team member status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/merchant/team/:userId
 * @desc    Remove team member
 * @access  Private (owner, admin)
 */
router.delete('/:userId', checkPermission('team:remove'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const merchantId = req.merchantId;

    // Find team member
    const teamMember = await MerchantUser.findOne({
      _id: userId,
      merchantId
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Prevent removing owner
    if (teamMember.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot remove owner'
      });
    }

    // Prevent removing yourself
    if (req.merchantUser && teamMember._id.toString() === req.merchantUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot remove yourself'
      });
    }

    const removedMember = {
      id: teamMember._id,
      name: teamMember.name,
      email: teamMember.email,
      role: teamMember.role
    };

    await MerchantUser.deleteOne({ _id: userId });

    // Log audit event
    AuditService.log({
      merchantId: merchantId!,
      merchantUserId: req.merchantUser?._id ? String(req.merchantUser._id) : undefined,
      action: 'team.remove',
      resourceType: 'team_member',
      resourceId: teamMember._id,
      details: {
        before: { name: teamMember.name, email: teamMember.email, role: teamMember.role },
        metadata: { action: 'remove', name: teamMember.name, email: teamMember.email }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    return res.json({
      success: true,
      message: 'Team member removed successfully',
      data: {
        removedMember
      }
    });
  } catch (error: any) {
    logger.error('Error removing team member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove team member',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/merchant/team/me/permissions
 * @desc    Get current user's permissions
 * @access  Private
 */
router.get('/me/permissions', async (req: Request, res: Response) => {
  try {
    const role: MerchantUserRole = req.merchantUser?.role || 'owner';
    const permissions = getPermissionsForRole(role);

    return res.json({
      success: true,
      data: {
        role,
        roleDescription: getRoleDescription(role),
        permissions,
        permissionCount: permissions.length
      }
    });
  } catch (error: any) {
    logger.error('Error fetching permissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/merchant/team/activity
 * @desc    Get team activity log from audit trail
 * @access  Private (owner, admin)
 */
router.get('/activity', checkPermission('team:view'), async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const action = req.query.action as string; // e.g. 'team.invite'

    const filters: any = {
      resourceType: 'team_member',
      page,
      limit,
    };
    if (action) filters.action = action;

    const result = await AuditService.getAuditLogs(merchantId!, filters);
    const logs = Array.isArray(result?.logs) ? result.logs : [];

    // Map AuditLog entries to TeamActivity shape
    const activities = logs.map((log: any) => {
      const meta = log.details?.metadata || {};
      const actionType = meta.action || log.action?.replace('team.', '') || 'unknown';

      return {
        id: log._id,
        merchantId: log.merchantId,
        action: actionType,
        targetUserId: log.resourceId ? String(log.resourceId) : '',
        targetUserEmail: meta.email || log.details?.after?.email || log.details?.before?.email || '',
        performedBy: log.merchantUserId ? String(log.merchantUserId) : '',
        performedByName: meta.performedByName || '',
        details: {
          name: meta.name || log.details?.after?.name || log.details?.before?.name || '',
          email: meta.email || log.details?.after?.email || log.details?.before?.email || '',
          role: log.details?.after?.role || '',
          oldRole: log.details?.before?.role || '',
          newRole: log.details?.after?.role || '',
          oldStatus: log.details?.before?.status || '',
          newStatus: log.details?.after?.status || '',
        },
        timestamp: log.timestamp || log.createdAt,
      };
    });

    // Populate performer names
    const performerIds = [...new Set(activities.filter((a: any) => a.performedBy).map((a: any) => a.performedBy))];
    if (performerIds.length > 0) {
      const performers = await MerchantUser.find({ _id: { $in: performerIds } }).select('name email').lean();
      const performerMap = new Map(performers.map(p => [String(p._id), p.name || p.email]));
      activities.forEach((a: any) => {
        if (a.performedBy && performerMap.has(a.performedBy)) {
          a.performedByName = performerMap.get(a.performedBy);
        }
      });
    }

    return res.json({
      success: true,
      data: {
        activities,
        total: result?.total ?? 0,
        page: result?.page ?? 1,
        totalPages: result?.totalPages ?? 0,
      }
    });
  } catch (error: any) {
    logger.error('Error fetching team activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch team activity',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/merchant/team/:userId
 * @desc    Get team member details
 * @access  Private (owner, admin)
 */
router.get('/:userId', checkPermission('team:view'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const merchantId = req.merchantId;

    const teamMember = await MerchantUser.findOne({
      _id: userId,
      merchantId
    })
      .select('-password -invitationToken -resetPasswordToken')
      .populate('invitedBy', 'name email');

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    return res.json({
      success: true,
      data: {
        teamMember: {
          ...teamMember.toJSON(),
          roleDescription: getRoleDescription(teamMember.role)
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching team member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch team member',
      error: error.message
    });
  }
});

export default router;
