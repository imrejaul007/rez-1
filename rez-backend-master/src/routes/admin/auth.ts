/**
 * Admin Authentication Routes
 * Handles email/password login for admin users
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import { generateToken, generateRefreshToken, verifyToken, authenticate, logoutAllDevices } from '../../middleware/auth';
import { hashRefreshToken } from '../../controllers/authController';
import jwt from 'jsonwebtoken';
import { adminAuthLimiter, adminMfaLimiter } from '../../middleware/rateLimiter';
import { generateTotpSecret, verifyTotp, enableTotp, disableTotp, isTotpEnabled } from '../../services/adminTotpService';
import { logger } from '../../config/logger';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Role hierarchy for permissions
const ROLE_HIERARCHY: Record<string, number> = {
  'support': 60,
  'operator': 70,
  'admin': 80,
  'super_admin': 100
};

/**
 * POST /api/auth/login
 * Admin login with email and password
 */
router.post('/login', adminAuthLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, totpCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  // Find user by email with password field
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user has an admin-level role
  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
  if (!adminRoles.includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Verify password
  if (!user.password) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Password not set.'
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check TOTP 2FA if enabled for this admin
  const totpEnabled = await isTotpEnabled(String(user._id));
  if (totpEnabled) {
    if (!totpCode) {
      return res.status(403).json({
        success: false,
        message: 'TOTP code required',
        requiresTotp: true
      });
    }
    const totpValid = await verifyTotp(String(user._id), totpCode);
    if (!totpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid TOTP code'
      });
    }
  }

  // Generate JWT token with actual role (critical for RBAC + socket.io auth)
  // SECURITY: user._id is ObjectId in mongoose 8.x; the inner as string cast
  // doesn't survive type-strict checks. Convert via String() instead.
  const userIdStr = String(user._id);
  const token = generateToken(userIdStr, user.role);
  const refreshToken = generateRefreshToken(userIdStr);

  // Store refresh token hash on user for validation
  // SECURITY: was previously stored as raw plaintext. Any DB read (compromise,
  // backup leak, junior-DBA query) would yield a working admin refresh token.
  // Hash before persisting — matching the user-facing authController pattern.
  user.auth.refreshToken = hashRefreshToken(refreshToken);

  // Update last login
  user.auth.lastLogin = new Date();
  await user.save();

  // Return user data (map to admin format expected by frontend)
  res.json({
    success: true,
    data: {
      user: {
        _id: user._id,
        email: user.email,
        name: user.fullName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Admin',
        role: user.role,
        level: ROLE_HIERARCHY[user.role] || ROLE_HIERARCHY['admin'],
        permissions: user.role === 'super_admin' ? ['*'] : [],
        lastLogin: user.auth.lastLogin,
        createdAt: user.createdAt
      },
      token,
      refreshToken
    }
  });

}));

/**
 * POST /api/admin/auth/refresh-token
 * Refresh an expired admin access token using a valid refresh token
 */
router.post('/refresh-token', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  // Verify the refresh token
  if (!process.env.JWT_REFRESH_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error'
    });
  }

  let decoded: { userId: string };
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as { userId: string };
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }

  // Find user and validate
  const user = await User.findById(decoded.userId);
  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];

  if (!user || !adminRoles.includes(user.role)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token or not an admin'
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Verify the refresh token matches the stored one.
  // Compare against the HASH because that's what we now store on the user doc.
  if (user.auth.refreshToken !== hashRefreshToken(refreshToken)) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token has been revoked'
    });
  }

  // Generate new tokens
  const newToken = generateToken((String(user._id)).toString(), user.role);
  const newRefreshToken = generateRefreshToken((String(user._id)).toString());

  // Update stored refresh token (rotate) — store the hash.
  user.auth.refreshToken = hashRefreshToken(newRefreshToken);
  await user.save();

  logger.info(`[Admin Auth] Token refreshed for admin: ${user.email}`);

  res.json({
    success: true,
    data: {
      user: {
        _id: user._id,
        email: user.email,
        name: user.fullName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Admin',
        role: user.role,
        level: ROLE_HIERARCHY[user.role] || ROLE_HIERARCHY['admin'],
        permissions: user.role === 'super_admin' ? ['*'] : [],
        lastLogin: user.auth.lastLogin,
        createdAt: user.createdAt
      },
      token: newToken,
      refreshToken: newRefreshToken
    }
  });
}));

/**
 * POST /api/auth/logout
 * Admin logout
 */
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  // Clear any server-side session if needed
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

/**
 * GET /api/auth/me
 * Get current admin user
 */
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];

  // Verify token using shared auth utility (pinned HS256, no fallback secret)
  const decoded = verifyToken(token);

  const user = await User.findById(decoded.userId);

  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
  if (!user || !adminRoles.includes(user.role)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token or not an admin'
    });
  }

  res.json({
    success: true,
    data: {
      user: {
        _id: user._id,
        email: user.email,
        name: user.fullName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Admin',
        role: user.role,
        level: ROLE_HIERARCHY[user.role] || ROLE_HIERARCHY['admin'],
        permissions: user.role === 'super_admin' ? ['*'] : [],
        lastLogin: user.auth.lastLogin,
        createdAt: user.createdAt
      }
    }
  });

}));

/**
 * POST /api/admin/auth/totp/setup
 * Generate TOTP secret and QR code URI for admin 2FA setup
 */
router.post('/totp/setup', authenticate, adminMfaLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  const result = await generateTotpSecret(userId);

  res.json({
    success: true,
    data: {
      secret: result.secret,
      uri: result.uri,
      message: 'Scan the QR code with your authenticator app, then verify with /totp/verify'
    }
  });
}));

/**
 * POST /api/admin/auth/totp/verify
 * Verify TOTP code and enable 2FA
 */
router.post('/totp/verify', authenticate, adminMfaLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { code } = req.body;

  if (!code || typeof code !== 'string' || code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Valid 6-digit TOTP code required' });
  }

  const enabled = await enableTotp(userId, code);
  if (!enabled) {
    return res.status(401).json({ success: false, message: 'Invalid TOTP code' });
  }

  res.json({ success: true, message: 'TOTP 2FA enabled successfully' });
}));

/**
 * DELETE /api/admin/auth/totp
 * Disable TOTP 2FA (requires valid code)
 */
router.delete('/totp', authenticate, adminMfaLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { code } = req.body;

  if (!code || typeof code !== 'string' || code.length !== 6) {
    return res.status(400).json({ success: false, message: 'Valid 6-digit TOTP code required to disable 2FA' });
  }

  const disabled = await disableTotp(userId, code);
  if (!disabled) {
    return res.status(401).json({ success: false, message: 'Invalid TOTP code' });
  }

  res.json({ success: true, message: 'TOTP 2FA disabled successfully' });
}));

/**
 * POST /api/admin/auth/logout-all-devices
 * Invalidate all tokens for the current admin user
 */
router.post('/logout-all-devices', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  await logoutAllDevices(userId);

  // Clear stored refresh token
  await User.findByIdAndUpdate(userId, { $unset: { 'auth.refreshToken': 1 } });

  res.json({ success: true, message: 'All sessions invalidated. All devices must re-login.' });
}));

/**
 * POST /api/admin/auth/change-password
 * Self-service password change for the currently authenticated admin
 */
router.post('/change-password', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ success: false, message: 'New password must be different from current password' });
  }

  const userId = (req as any).userId || (req as any).user?._id;
  const user = await User.findById(userId).select('+password');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const adminRoles = ['admin', 'support', 'operator', 'super_admin'];
  if (!adminRoles.includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  if (!user.password) {
    return res.status(400).json({ success: false, message: 'No password set for this account' });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  logger.info(`[Admin Auth] Password changed for admin: ${user.email || userId}`);

  res.json({ success: true, message: 'Password changed successfully' });
}));

export default router;
