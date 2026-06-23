import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Merchant } from '../models/Merchant';
import { MerchantUser } from '../models/MerchantUser';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { authMiddleware } from '../middleware/merchantauth';
import { validateRequest } from '../middleware/merchantvalidation';
import { authLimiter, registrationLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import Joi from 'joi';
import EmailService from '../services/EmailService';
import { getPermissionsForRole } from '../config/permissions';
import AuditService from '../services/AuditService';
import { logger } from '../config/logger';

const router = Router();

/**
 * @swagger
 * /api/merchant/auth/test:
 *   get:
 *     summary: Test merchant auth endpoint connectivity
 *     tags: [Authentication]
 *     security: []
 *     responses:
 *       200:
 *         description: Auth endpoint is working
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Merchant auth route is working!
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
// Simple test endpoint for mobile connectivity
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Merchant auth route is working!',
    timestamp: new Date().toISOString()
  });
});

// Validation schemas
const registerSchema = Joi.object({
  businessName: Joi.string().required().min(2).max(100),
  ownerName: Joi.string().required().min(2).max(50),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  businessAddress: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().required()
  }).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required().valid(Joi.ref('password')).messages({
    'any.only': 'Passwords do not match'
  })
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required().valid(Joi.ref('newPassword')).messages({
    'any.only': 'Passwords do not match'
  })
});

const updateProfileSchema = Joi.object({
  businessName: Joi.string().min(2).max(100).optional(),
  ownerName: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().optional(),
  businessAddress: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional()
  }).optional(),
  logo: Joi.string().uri().optional(),
  website: Joi.string().uri().optional(),
  description: Joi.string().max(500).optional()
});

// Helper function to generate verification token
function generateVerificationToken(merchant?: any): { token: string; hashedToken: string; expiry: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return { token, hashedToken, expiry };
}

// Helper function to send verification email
async function sendVerificationEmail(merchant: any, verificationToken: string): Promise<void> {
  try {
    await EmailService.sendEmailVerification(
      merchant.email,
      merchant.ownerName,
      verificationToken
    );
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    // Don't throw error - just log it so registration can continue
  }
}

/**
 * @swagger
 * /api/merchant/auth/register:
 *   post:
 *     summary: Register a new merchant
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       Register a new merchant account. This will:
 *       - Create a merchant account
 *       - Hash the password securely
 *       - Send email verification
 *       - Automatically create a store in the user-facing app
 *       - Return a JWT token for immediate login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - ownerName
 *               - email
 *               - password
 *               - phone
 *               - businessAddress
 *             properties:
 *               businessName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "John's Clothing Store"
 *                 description: Name of the business
 *               ownerName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John Doe
 *                 description: Full name of the business owner
 *               email:
 *                 type: string
 *                 format: email
 *                 example: merchant@example.com
 *                 description: Business email address
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: SecurePass123!
 *                 description: Account password (min 6 characters)
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *                 description: Business contact phone number
 *               businessAddress:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - state
 *                   - zipCode
 *                   - country
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Main Street"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   zipCode:
 *                     type: string
 *                     example: "10001"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *     responses:
 *       201:
 *         description: Merchant registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Merchant registered successfully. Please check your email to verify your account.
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                       description: JWT authentication token (valid for 7 days)
 *                     merchant:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 507f1f77bcf86cd799439011
 *                         businessName:
 *                           type: string
 *                           example: "John's Clothing Store"
 *                         ownerName:
 *                           type: string
 *                           example: John Doe
 *                         email:
 *                           type: string
 *                           example: merchant@example.com
 *                         verificationStatus:
 *                           type: string
 *                           example: pending
 *                         emailVerified:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Validation error or merchant already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               duplicate:
 *                 value:
 *                   success: false
 *                   message: Merchant with this email already exists
 *               validation:
 *                 value:
 *                   success: false
 *                   message: Validation failed
 *                   errors: ["businessName is required", "email must be valid"]
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/auth/register
router.post('/register', registrationLimiter, validateRequest(registerSchema), async (req, res) => {
  try {
    // Feature flag: merchant onboarding gate
    if (process.env.FEATURE_BIZONE_MERCHANT !== 'true') {
      return res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Merchant onboarding is not yet open in your area.',
      });
    }

    const { businessName, ownerName, email, password, phone, businessAddress } = req.body;

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    const existingMerchant = await Merchant.findOne({ email: normalizedEmail });
    if (existingMerchant) {
      return res.status(400).json({
        success: false,
        message: 'Merchant with this email already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token
    const { token: verificationToken, hashedToken, expiry } = generateVerificationToken();

    const merchant = new Merchant({
      businessName,
      ownerName,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      businessAddress,
      verificationStatus: 'pending',
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: expiry
    });

    await merchant.save();

    // Send verification email
    await sendVerificationEmail(merchant, verificationToken);

    // Automatically create a store for the merchant on user side
    await createStoreForMerchant(merchant);

    // Generate JWT token using merchant-specific secret
    if (!process.env.JWT_MERCHANT_SECRET) {
      throw new Error('JWT_MERCHANT_SECRET environment variable is required');
    }
    if (process.env.JWT_MERCHANT_SECRET.length < 32) {
      throw new Error('JWT_MERCHANT_SECRET must be at least 32 characters long for security');
    }
    const merchantSecret = process.env.JWT_MERCHANT_SECRET;
    const expiresIn = process.env.JWT_MERCHANT_EXPIRES_IN || '7d';
    const authToken = jwt.sign(
      { merchantId: String(merchant._id) },
      merchantSecret,
      { expiresIn } as jwt.SignOptions
    );

    return res.status(201).json({
      success: true,
      message: 'Merchant registered successfully. Please check your email to verify your account.',
      data: {
        token: authToken,
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          ownerName: merchant.ownerName,
          email: merchant.email,
          verificationStatus: merchant.verificationStatus,
          emailVerified: merchant.emailVerified
        }
      }
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // First check if it's a merchant (owner) login
    let merchant = await Merchant.findOne({ email: normalizedEmail }).select('+password');
    let merchantUser = null;
    let isOwnerLogin = false;

    // If not found as merchant, check MerchantUser table
    if (!merchant) {
      merchantUser = await MerchantUser.findOne({ email: normalizedEmail })
        .select('+password')
        .populate('merchantId');

      if (!merchantUser) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Get the merchant details for merchantUser
      merchant = merchantUser.merchantId as any;

      if (!merchant) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if merchant user is active
      if (merchantUser.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Account is ${merchantUser.status}. Please contact your administrator.`
        });
      }
    } else {
      isOwnerLogin = true;
    }

    // Check if account is locked (for both merchant and merchantUser)
    const accountToCheck = merchantUser || merchant;
    if (accountToCheck.accountLockedUntil && accountToCheck.accountLockedUntil > new Date()) {
      const lockTimeRemaining = Math.ceil((accountToCheck.accountLockedUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes or reset your password.`,
        lockedUntil: accountToCheck.accountLockedUntil
      });
    }

    // Clear lock if expired
    if (accountToCheck.accountLockedUntil && accountToCheck.accountLockedUntil <= new Date()) {
      accountToCheck.accountLockedUntil = undefined;
      accountToCheck.failedLoginAttempts = 0;
    }

    // Verify password
    const passwordToCheck = merchantUser?.password || merchant.password;
    const isPasswordValid = await bcrypt.compare(password, passwordToCheck);

    if (!isPasswordValid) {
      // Increment failed login attempts
      accountToCheck.failedLoginAttempts = (accountToCheck.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (accountToCheck.failedLoginAttempts >= 5) {
        accountToCheck.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await accountToCheck.save();

        logger.info(`🔒 Account locked: ${email} (${accountToCheck.failedLoginAttempts} failed attempts)`);

        return res.status(423).json({
          success: false,
          message: 'Account locked due to multiple failed login attempts. Please try again in 30 minutes or reset your password.',
          lockedUntil: accountToCheck.accountLockedUntil
        });
      }

      await accountToCheck.save();

      const remainingAttempts = 5 - accountToCheck.failedLoginAttempts;
      logger.info(`⚠️ Failed login attempt for ${email}. ${remainingAttempts} attempts remaining.`);

      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${remainingAttempts} attempts remaining before account lock.`,
        attemptsRemaining: remainingAttempts
      });
    }

    // Successful login - reset failed attempts and update login info
    accountToCheck.failedLoginAttempts = 0;
    accountToCheck.accountLockedUntil = undefined;
    accountToCheck.lastLoginAt = new Date();
    accountToCheck.lastLoginIP = clientIP;

    if (isOwnerLogin) {
      merchant.lastLogin = new Date();
    }

    await accountToCheck.save();

    // Generate JWT token using merchant-specific secret
    if (!process.env.JWT_MERCHANT_SECRET) {
      throw new Error('JWT_MERCHANT_SECRET environment variable is required');
    }
    if (process.env.JWT_MERCHANT_SECRET.length < 32) {
      throw new Error('JWT_MERCHANT_SECRET must be at least 32 characters long for security');
    }
    const merchantSecret = process.env.JWT_MERCHANT_SECRET;
    const expiresIn = process.env.JWT_MERCHANT_EXPIRES_IN || '7d';

    // Create JWT payload with role and permissions
    const role = merchantUser?.role || 'owner';
    const permissions = merchantUser ? getPermissionsForRole(merchantUser.role) : getPermissionsForRole('owner');

    const tokenPayload: any = {
      merchantId: String(merchant._id),
      role,
      permissions
    };

    // Add merchantUserId if it's a team member login
    if (merchantUser) {
      tokenPayload.merchantUserId = merchantUser._id.toString();
    }

    const token = jwt.sign(
      tokenPayload,
      merchantSecret,
      { expiresIn } as jwt.SignOptions
    );

    // Check if email is verified
    const emailVerificationWarning = !merchant.emailVerified
      ? 'Please verify your email to access all features.'
      : undefined;

    // Build response data
    const responseData: any = {
      token,
      role,
      permissions,
      merchant: {
        id: merchant._id,
        businessName: merchant.businessName,
        email: isOwnerLogin ? merchant.email : email,
        verificationStatus: merchant.verificationStatus,
        isActive: merchant.isActive,
        emailVerified: merchant.emailVerified
      }
    };

    // Add user info if it's a team member login
    if (merchantUser) {
      responseData.user = {
        id: merchantUser._id,
        name: merchantUser.name,
        email: merchantUser.email,
        role: merchantUser.role,
        status: merchantUser.status
      };
    } else {
      responseData.merchant.ownerName = merchant.ownerName;
    }

    // Audit log: Successful login
    await AuditService.logAuth(
      String(merchant._id),
      'login',
      {
        email,
        isOwnerLogin,
        userId: merchantUser?._id,
        role: merchantUser?.role
      },
      req
    );

    return res.json({
      success: true,
      message: 'Login successful',
      data: responseData,
      ...(emailVerificationWarning && { warning: emailVerificationWarning })
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    return res.json({
      success: true,
      data: {
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          ownerName: merchant.ownerName,
          email: merchant.email,
          phone: merchant.phone,
          businessAddress: merchant.businessAddress,
          verificationStatus: merchant.verificationStatus,
          isActive: merchant.isActive,
          createdAt: merchant.createdAt
        }
      }
    });
  } catch (error: any) {
    logger.error('Get merchant error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get merchant data',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', passwordResetLimiter, validateRequest(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    const merchant = await Merchant.findOne({ email: normalizedEmail });
    if (!merchant) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save hashed token to database
    merchant.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    merchant.resetPasswordExpiry = resetTokenExpiry;
    await merchant.save();

    // Send password reset email
    try {
      await EmailService.sendPasswordResetEmail(
        merchant.email,
        merchant.ownerName,
        resetToken
      );
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      // Don't throw error - just log it
    }

    // Build reset URL for development mode response (using merchant frontend URL)
    const frontendUrl = process.env.MERCHANT_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Include in development only
      ...(process.env.NODE_ENV === 'development' && { resetUrl })
    });
  } catch (error: any) {
    logger.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.post('/reset-password/:token', passwordResetLimiter, validateRequest(resetPasswordSchema), async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find merchant with valid reset token
    const merchant = await Merchant.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordExpiry');

    if (!merchant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    merchant.password = hashedPassword;
    merchant.resetPasswordToken = undefined;
    merchant.resetPasswordExpiry = undefined;
    merchant.failedLoginAttempts = 0; // Reset failed attempts
    merchant.accountLockedUntil = undefined; // Unlock account if locked
    await merchant.save();

    logger.info(`✅ Password reset successful for merchant: ${merchant.email}`);

    return res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error: any) {
    logger.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @swagger
 * /api/merchant/auth/reset-password:
 *   post:
 *     summary: Reset password with token (token in body)
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       Reset password using token from request body. Alternative to URL-based token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
// POST /api/auth/reset-password (token in body)
router.post('/reset-password', validateRequest(Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required().valid(Joi.ref('password')).messages({
    'any.only': 'Passwords do not match'
  })
})), async (req, res) => {
  try {
    const { token, password } = req.body;

    // Hash the token from body to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find merchant with valid reset token
    const merchant = await Merchant.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordExpiry');

    if (!merchant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    merchant.password = hashedPassword;
    merchant.resetPasswordToken = undefined;
    merchant.resetPasswordExpiry = undefined;
    merchant.failedLoginAttempts = 0; // Reset failed attempts
    merchant.accountLockedUntil = undefined; // Unlock account if locked
    await merchant.save();

    logger.info(`✅ Password reset successful for merchant: ${merchant.email}`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error: any) {
    logger.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @swagger
 * /api/merchant/auth/logout:
 *   post:
 *     summary: Logout merchant
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Logout current merchant session. This endpoint:
 *       - Validates authentication token
 *       - Creates audit log entry
 *       - Returns success (token invalidation happens client-side)
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       401:
 *         description: Unauthorized - invalid or missing token
 */
// @route   POST /api/auth/logout
// @desc    Logout merchant (client-side token removal)
// @access  Private
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Audit log: Logout (best effort - don't fail logout if audit fails)
    if (req.merchantId) {
      try {
        const auditDetails: any = {};
        if (req.merchantUser && req.merchantUser._id) {
          auditDetails.userId = req.merchantUser._id.toString();
        }

        await AuditService.logAuth(
          String(req.merchantId),
          'logout',
          auditDetails,
          req
        );
      } catch (auditError) {
        // Log error but don't fail logout
        logger.error('Audit log error during logout:', auditError);
      }
    }

    // Always return success for logout
    // Token invalidation happens client-side by removing the token
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error: any) {
    logger.error('Logout error:', error);
    // Even if there's an unexpected error, still return success for logout
    // Logout should never fail from the user's perspective
    return res.status(200).json({
      success: true,
      message: 'Logout successful',
      ...(process.env.NODE_ENV === 'development' && { 
        debug: 'Logout completed with error logged internally' 
      })
    });
  }
});

/**
 * @swagger
 * /api/merchant/auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Refresh an expired or expiring JWT token. This endpoint:
 *       - Accepts expired tokens for refresh purposes
 *       - Generates a new access token with extended expiry
 *       - Updates the last login timestamp
 *       - Returns merchant information
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional refresh token (can also use token from Authorization header)
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     expiresIn:
 *                       type: string
 *                       example: 7d
 *                     merchant:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         businessName:
 *                           type: string
 *                         email:
 *                           type: string
 *       401:
 *         description: Invalid or missing token
 *       404:
 *         description: Merchant not found
 */
// POST /api/auth/refresh
router.post('/refresh', authLimiter, validateRequest(refreshTokenSchema), async (req, res) => {
  try {
    // Get token from header or body
    const authHeader = req.header('Authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const bodyToken = req.body.refreshToken;
    const token = bodyToken || headerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token - allow expired tokens for refresh
    if (!process.env.JWT_MERCHANT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_MERCHANT_SECRET not set'
      });
    }
    if (process.env.JWT_MERCHANT_SECRET.length < 32) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_MERCHANT_SECRET must be at least 32 characters'
      });
    }
    const merchantSecret = process.env.JWT_MERCHANT_SECRET;

    let decoded: any;
    try {
      // Try to verify normally first
      decoded = jwt.verify(token, merchantSecret) as any;
    } catch (error: any) {
      // If token is expired, verify with ignoreExpiration
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.verify(token, merchantSecret, { ignoreExpiration: true }) as any;
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    }

    // Find merchant
    const merchant = await Merchant.findById(decoded.merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Check if merchant is active
    if (!merchant.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Merchant account is deactivated'
      });
    }

    // Update last login timestamp
    merchant.lastLogin = new Date();
    merchant.lastLoginAt = new Date();
    await merchant.save();

    // Generate new JWT token with same payload structure
    const expiresIn = process.env.JWT_MERCHANT_EXPIRES_IN || '7d';
    const tokenPayload: any = {
      merchantId: String(merchant._id),
      role: decoded.role || 'owner',
      permissions: decoded.permissions || []
    };

    // Preserve merchantUserId if it exists
    if (decoded.merchantUserId) {
      tokenPayload.merchantUserId = decoded.merchantUserId;
    }

    const newToken = jwt.sign(
      tokenPayload,
      merchantSecret,
      { expiresIn } as jwt.SignOptions
    );

    logger.info(`🔄 Token refreshed for merchant: ${merchant.email}`);

    // Audit log: Token refresh
    await AuditService.logAuth(
      String(merchant._id),
      'login', // Using login for refresh as well
      {
        type: 'token_refresh',
        email: merchant.email
      },
      req
    );

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        expiresIn,
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          ownerName: merchant.ownerName,
          email: merchant.email,
          verificationStatus: merchant.verificationStatus,
          isActive: merchant.isActive,
          emailVerified: merchant.emailVerified
        }
      }
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @swagger
 * /api/merchant/auth/profile:
 *   put:
 *     summary: Update merchant profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Update merchant profile information. This endpoint:
 *       - Validates all input fields
 *       - Updates merchant document
 *       - Creates audit log entry
 *       - Returns updated merchant object
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Updated Business Name"
 *               ownerName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               businessAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   country:
 *                     type: string
 *               logo:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/logo.png"
 *               website:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Business description"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Merchant not found
 */
// PUT /api/auth/profile
router.put('/profile', authMiddleware, validateRequest(updateProfileSchema), async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const updates = req.body;

    // Find merchant
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Store old values for audit log
    const oldValues = {
      businessName: merchant.businessName,
      ownerName: merchant.ownerName,
      phone: merchant.phone,
      businessAddress: merchant.businessAddress,
      logo: merchant.logo,
      website: merchant.website,
      description: merchant.description
    };

    // Update fields
    if (updates.businessName !== undefined) merchant.businessName = updates.businessName;
    if (updates.ownerName !== undefined) merchant.ownerName = updates.ownerName;
    if (updates.phone !== undefined) {
      // Validate phone format (basic validation)
      const phoneRegex = /^[\d+\-\s()]+$/;
      if (!phoneRegex.test(updates.phone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
      merchant.phone = updates.phone;
    }
    if (updates.businessAddress !== undefined) {
      merchant.businessAddress = {
        ...merchant.businessAddress,
        ...updates.businessAddress
      };
    }
    if (updates.logo !== undefined) merchant.logo = updates.logo;
    if (updates.website !== undefined) merchant.website = updates.website;
    if (updates.description !== undefined) merchant.description = updates.description;

    // Save merchant
    await merchant.save();

    // Create audit log entry
    await AuditService.logStoreChange(
      String(merchant._id),
      undefined,
      oldValues,
      {
        businessName: merchant.businessName,
        ownerName: merchant.ownerName,
        phone: merchant.phone,
        businessAddress: merchant.businessAddress,
        logo: merchant.logo,
        website: merchant.website,
        description: merchant.description
      },
      req.merchantUser?._id,
      req
    );

    logger.info(`✅ Profile updated for merchant: ${merchant.email}`);

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        merchant: {
          id: merchant._id,
          businessName: merchant.businessName,
          ownerName: merchant.ownerName,
          email: merchant.email,
          phone: merchant.phone,
          businessAddress: merchant.businessAddress,
          verificationStatus: merchant.verificationStatus,
          isActive: merchant.isActive,
          logo: merchant.logo,
          website: merchant.website,
          description: merchant.description,
          emailVerified: merchant.emailVerified,
          createdAt: merchant.createdAt,
          updatedAt: merchant.updatedAt
        }
      }
    });
  } catch (error: any) {
    logger.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @swagger
 * /api/merchant/auth/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       Resend verification email to merchant. This endpoint:
 *       - Finds merchant by email
 *       - Checks if already verified
 *       - Generates new verification token (24-hour expiry)
 *       - Sends verification email via SendGrid
 *       - Returns success message
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: merchant@example.com
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: Already verified or invalid email
 *       404:
 *         description: Merchant not found
 *       429:
 *         description: Rate limit exceeded
 */
// POST /api/auth/resend-verification
router.post('/resend-verification', authLimiter, validateRequest(resendVerificationSchema), async (req, res) => {
  try {
    const { email } = req.body;

    // Find merchant by email
    const merchant = await Merchant.findOne({ email: email.toLowerCase() })
      .select('+emailVerificationToken +emailVerificationExpiry');

    if (!merchant) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.'
      });
    }

    // Check if already verified
    if (merchant.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const { token: verificationToken, hashedToken, expiry } = generateVerificationToken(merchant);

    // Update merchant with new token
    merchant.emailVerificationToken = hashedToken;
    merchant.emailVerificationExpiry = expiry;
    await merchant.save();

    // Send verification email
    try {
      await sendVerificationEmail(merchant, verificationToken);
      logger.info(`📧 Verification email resent to: ${email}`);
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    }

    return res.json({
      success: true,
      message: 'Verification email sent successfully. Please check your inbox.',
      // Include in development only
      ...(process.env.NODE_ENV === 'development' && {
        verificationUrl: `${process.env.MERCHANT_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`
      })
    });
  } catch (error: any) {
    logger.error('Resend verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @swagger
 * /api/merchant/auth/change-password:
 *   put:
 *     summary: Change password for authenticated merchant
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Change password for currently authenticated merchant. This endpoint:
 *       - Validates current password
 *       - Validates new password format
 *       - Ensures new password matches confirmation
 *       - Hashes and saves new password
 *       - Resets failed login attempts
 *       - Unlocks account if locked
 *       - Creates audit log entry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPassword123!
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: NewSecurePass456!
 *                 description: New password (min 6 characters)
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: NewSecurePass456!
 *                 description: Must match new password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Validation error or passwords don't match
 *       401:
 *         description: Unauthorized or current password incorrect
 *       404:
 *         description: Merchant not found
 */
// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, validateRequest(changePasswordSchema), async (req, res) => {
  try {
    const merchantId = req.merchantId;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Find merchant with password field
    const merchant = await Merchant.findById(merchantId).select('+password');
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, merchant.password);
    if (!isPasswordValid) {
      logger.info(`⚠️ Failed password change attempt for merchant: ${merchant.email}`);

      // Audit log: Failed password change (best effort)
      try {
        await AuditService.logAuth(
          String(merchant._id),
          'failed_login',
          {
            reason: 'incorrect_current_password',
            type: 'password_change_failed'
          },
          req
        );
      } catch (auditError) {
        logger.error('Audit log error:', auditError);
        // Don't fail the request if audit fails
      }

      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and reset security fields
    merchant.password = hashedPassword;
    (merchant as any).passwordChangedAt = new Date();
    merchant.failedLoginAttempts = 0; // Reset failed attempts
    merchant.accountLockedUntil = undefined; // Unlock account if locked
    await merchant.save();

    logger.info(`✅ Password changed successfully for merchant: ${merchant.email}`);

    // Audit log: Successful password change (best effort)
    try {
      await AuditService.logAuth(
        String(merchant._id),
        'password_changed',
        {
          email: merchant.email
        },
        req
      );
    } catch (auditError) {
      logger.error('Audit log error:', auditError);
      // Don't fail the request if audit fails
    }

    // Send email notification about password change (best effort)
    try {
      await EmailService.sendPasswordChangeConfirmation(
        merchant.email,
        merchant.ownerName
      );
    } catch (error) {
      logger.error('Failed to send password change confirmation email:', error);
      // Don't throw error - password was already changed successfully
    }

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. You can now login with your new password.'
    });
  } catch (error: any) {
    logger.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @swagger
 * /api/merchant/auth/verify-email/{token}:
 *   post:
 *     summary: Verify merchant email address
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       Verify merchant email address using verification token. This endpoint:
 *       - Validates verification token from email
 *       - Checks token expiry (24 hours)
 *       - Marks email as verified
 *       - Clears verification token
 *       - Creates audit log entry
 *       - Sends welcome email
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token from email link
 *         example: a3f4b2c8d9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Email verified successfully! You can now access all features.
 *                 data:
 *                   type: object
 *                   properties:
 *                     emailVerified:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid or expired verification token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid or expired verification token
 *       404:
 *         description: Merchant not found
 */
// POST /api/auth/verify-email/:token
router.post('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find merchant with valid verification token
    const merchant = await Merchant.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpiry');

    if (!merchant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token. Please request a new verification email.'
      });
    }

    // Check if already verified
    if (merchant.emailVerified) {
      return res.json({
        success: true,
        message: 'Email is already verified',
        data: {
          emailVerified: true
        }
      });
    }

    // Mark email as verified
    merchant.emailVerified = true;
    merchant.emailVerificationToken = undefined;
    merchant.emailVerificationExpiry = undefined;
    await merchant.save();

    logger.info(`✅ Email verified successfully for merchant: ${merchant.email}`);

    // Audit log: Email verification
    await AuditService.logAuth(
      String(merchant._id),
      'email_verified',
      {
        email: merchant.email
      },
      req
    );

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(
        merchant.email,
        merchant.ownerName,
        merchant.businessName
      );
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw error - verification was successful
    }

    return res.json({
      success: true,
      message: 'Email verified successfully! You can now access all features.',
      data: {
        emailVerified: true
      }
    });
  } catch (error: any) {
    logger.error('Email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @swagger
 * /api/merchant/auth/verify-email:
 *   post:
 *     summary: Verify merchant email address (token in body)
 *     tags: [Authentication]
 *     security: []
 *     description: |
 *       Verify merchant email address using verification token from request body. Alternative to URL-based token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired verification token
 */
// POST /api/auth/verify-email (token in body)
router.post('/verify-email', validateRequest(Joi.object({
  token: Joi.string().required()
})), async (req, res) => {
  try {
    const { token } = req.body;

    // Hash the token from body to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find merchant with valid verification token
    const merchant = await Merchant.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpiry');

    if (!merchant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token. Please request a new verification email.'
      });
    }

    // Check if already verified
    if (merchant.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified',
        data: {
          emailVerified: true
        }
      });
    }

    // Mark email as verified
    merchant.emailVerified = true;
    merchant.emailVerificationToken = undefined;
    merchant.emailVerificationExpiry = undefined;
    await merchant.save();

    logger.info(`✅ Email verified successfully for merchant: ${merchant.email}`);

    // Audit log: Email verification
    try {
      await AuditService.logAuth(
        String(merchant._id),
        'email_verified',
        {
          email: merchant.email
        },
        req
      );
    } catch (auditError) {
      logger.error('Audit log error:', auditError);
      // Don't fail verification if audit fails
    }

    // Send welcome email (best effort)
    try {
      await EmailService.sendWelcomeEmail(
        merchant.email,
        merchant.ownerName,
        merchant.businessName
      );
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw error - verification was successful
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now access all features.',
      data: {
        emailVerified: true
      }
    });
  } catch (error: any) {
    logger.error('Email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Helper function to create a store for new merchant
async function createStoreForMerchant(merchant: any): Promise<void> {
  try {
    // Ensure merchantId is properly converted to ObjectId
    const merchantId = typeof merchant._id === 'string' 
      ? new mongoose.Types.ObjectId(merchant._id) 
      : merchant._id;

    // Check if store already exists for this merchant
    const existingStore = await Store.findOne({ merchantId });
    if (existingStore) {
      logger.info(`✅ Store already exists for merchant ${merchantId}: ${existingStore.name}`);
      return;
    }

    // Find a default category or create one if it doesn't exist
    let defaultCategory = await Category.findOne({ name: 'General' });
    if (!defaultCategory) {
      defaultCategory = await Category.create({
        name: 'General',
        slug: 'general',
        type: 'general',  // Fixed: Changed from 'store' to 'general' (valid enum value)
        isActive: true
      });
    }

    // Create store slug from business name
    const storeSlug = merchant.businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    // Check if store with this slug already exists and make it unique
    let finalSlug = storeSlug;
    let counter = 1;
    while (await Store.findOne({ slug: finalSlug })) {
      finalSlug = `${storeSlug}-${counter}`;
      counter++;
    }

    // Create the store
    const store = new Store({
      name: merchant.businessName,
      slug: finalSlug,
      description: `${merchant.businessName} - Your trusted local business`,
      category: defaultCategory._id,
      merchantId: merchantId, // Link to merchant (ensured ObjectId)
      location: {
        address: `${merchant.businessAddress.street}, ${merchant.businessAddress.city}`,
        city: merchant.businessAddress.city,
        state: merchant.businessAddress.state,
        pincode: merchant.businessAddress.zipCode
      },
      contact: {
        phone: merchant.phone,
        email: merchant.email
      },
      ratings: {
        average: 0,
        count: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      },
      offers: {
        cashback: 5, // Default 5% cashback
        isPartner: true,
        partnerLevel: 'bronze'
      },
      operationalInfo: {
        hours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '18:00', closed: false },
          sunday: { open: '10:00', close: '16:00', closed: false }
        },
        deliveryTime: '30-45 mins',
        minimumOrder: 0,
        deliveryFee: 0,
        freeDeliveryAbove: 500,
        acceptsWalletPayment: true,
        paymentMethods: ['cash', 'card', 'upi', 'wallet']
      },
      analytics: {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        repeatCustomers: 0
      },
      tags: ['new-store', 'local-business'],
      isActive: true,
      isFeatured: false,
      isVerified: merchant.verificationStatus === 'verified'
    });

    await store.save();
    
    logger.info(`🏪 Automatically created store "${merchant.businessName}" (ID: ${store._id}) for merchant ${merchantId}`);
    logger.info(`   Store slug: ${finalSlug}`);
    logger.info(`   Store merchantId: ${store.merchantId}`);

  } catch (error: any) {
    logger.error('❌ Error creating store for merchant:', error);
    logger.error('   Merchant ID:', merchant._id);
    logger.error('   Error details:', error.message);
    logger.error('   Stack:', error.stack);
    // Don't throw error to avoid breaking merchant registration, but log it clearly
  }
}

export default router;