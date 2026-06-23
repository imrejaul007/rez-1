import { logger } from '../../config/logger';
// Admin User Management Routes
// CRUD for admin portal users

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import { SupportTicket } from '../../models/SupportTicket';
import { requireAuth, requireSeniorAdmin, requireSuperAdmin } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require authenticated admin
router.use(requireAuth);

/**
 * GET /api/admin/admin-users — List all admin users
 * Requires senior admin or above
 */
router.get('/', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const admins = await User.find({ role: 'admin' })
    .select('profile.firstName profile.lastName email phoneNumber isActive auth.lastLogin createdAt')
    .sort({ createdAt: -1 })
    .lean();

  // Enrich with assigned ticket count
  const adminUsers = await Promise.all(
    admins.map(async (admin: any) => {
      const assignedTickets = await SupportTicket.countDocuments({
        assignedTo: admin._id,
        status: { $in: ['open', 'in_progress', 'waiting_customer'] },
      });
      return {
        _id: admin._id,
        firstName: admin.profile?.firstName || '',
        lastName: admin.profile?.lastName || '',
        fullName: `${admin.profile?.firstName || ''} ${admin.profile?.lastName || ''}`.trim() || 'Admin',
        email: admin.email || '',
        phoneNumber: admin.phoneNumber || '',
        isActive: admin.isActive !== false,
        lastLogin: admin.auth?.lastLogin || null,
        createdAt: admin.createdAt,
        assignedTickets,
      };
    })
  );

  sendSuccess(res, { adminUsers });
}));

/**
 * POST /api/admin/admin-users — Create new admin user
 * Requires super admin
 */
router.post('/', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phoneNumber } = req.body;

  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400);
  }

  if (password.length < 8) {
    return sendError(res, 'Password must be at least 8 characters', 400);
  }

  // Check if email already exists
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return sendError(res, 'A user with this email already exists', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create admin user
  const newAdmin = await User.create({
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    phoneNumber: phoneNumber || undefined,
    role: 'admin',
    isActive: true,
    profile: {
      firstName: firstName || '',
      lastName: lastName || '',
    },
    auth: {
      isVerified: true,
    },
  });

  logger.info(`✅ [Admin Users] Created new admin: ${email}`);

  res.status(201).json({
    success: true,
    data: {
      adminUser: {
        _id: newAdmin._id,
        firstName: (newAdmin as any).profile?.firstName || '',
        lastName: (newAdmin as any).profile?.lastName || '',
        fullName: `${firstName || ''} ${lastName || ''}`.trim() || 'Admin',
        email: newAdmin.email,
        phoneNumber: newAdmin.phoneNumber || '',
        isActive: true,
        createdAt: newAdmin.createdAt,
      },
    },
  });
}));

/**
 * PUT /api/admin/admin-users/:id — Update admin user
 * Requires senior admin
 */
router.put('/:id', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, email, phoneNumber, isActive, password } = req.body;

  const admin = await User.findById(id);
  if (!admin || admin.role !== 'admin') {
    return sendError(res, 'Admin user not found', 404);
  }

  // Update fields
  if (firstName !== undefined) admin.profile.firstName = firstName;
  if (lastName !== undefined) admin.profile.lastName = lastName;
  if (email !== undefined) admin.email = email.toLowerCase().trim();
  if (phoneNumber !== undefined) admin.phoneNumber = phoneNumber;
  if (isActive !== undefined) admin.isActive = isActive;

  // Update password if provided
  if (password) {
    if (password.length < 8) {
      return sendError(res, 'Password must be at least 8 characters', 400);
    }
    admin.password = await bcrypt.hash(password, 12);
  }

  await admin.save();

  logger.info(`✅ [Admin Users] Updated admin: ${admin.email}`);

  sendSuccess(res, {
    adminUser: {
      _id: admin._id,
      firstName: admin.profile?.firstName || '',
      lastName: admin.profile?.lastName || '',
      fullName: `${admin.profile?.firstName || ''} ${admin.profile?.lastName || ''}`.trim() || 'Admin',
      email: admin.email,
      phoneNumber: admin.phoneNumber || '',
      isActive: admin.isActive,
    },
  });
}));

/**
 * DELETE /api/admin/admin-users/:id — Deactivate admin user
 * Requires super admin. Does NOT hard-delete, just deactivates.
 */
router.delete('/:id', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const requesterId = (req as any).userId;

  // Prevent self-deactivation
  if (id === requesterId) {
    return sendError(res, 'Cannot deactivate your own account', 400);
  }

  const admin = await User.findById(id);
  if (!admin || admin.role !== 'admin') {
    return sendError(res, 'Admin user not found', 404);
  }

  // Deactivate
  admin.isActive = false;
  await admin.save();

  // Unassign open tickets
  await SupportTicket.updateMany(
    { assignedTo: admin._id, status: { $in: ['open', 'in_progress', 'waiting_customer'] } },
    { $unset: { assignedTo: 1 }, $set: { status: 'open' } }
  );

  logger.info(`✅ [Admin Users] Deactivated admin: ${admin.email}`);

  sendSuccess(res, { message: 'Admin user deactivated' });
}));

export default router;
