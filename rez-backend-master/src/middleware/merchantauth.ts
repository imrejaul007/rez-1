import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Merchant } from '../models/Merchant';
import { MerchantUser, IMerchantUser } from '../models/MerchantUser';
import { logger } from '../config/logger';

// Extend Request interface to include merchantId and merchantUser
declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
      merchant?: any;
      merchantUser?: IMerchantUser;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Verify token using merchant-specific secret
    const merchantSecret = process.env.JWT_MERCHANT_SECRET;
    if (!merchantSecret) {
      logger.error('[MERCHANT AUTH] CRITICAL: JWT_MERCHANT_SECRET is not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT secret not configured'
      });
    }

    const decoded = jwt.verify(token, merchantSecret) as any;

    // Find merchant
    const merchant = await Merchant.findById(decoded.merchantId);

    if (!merchant) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - merchant not found'
      });
    }

    // Check if merchant is active
    if (!merchant.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Merchant account is deactivated'
      });
    }

    // Add merchant to request
    req.merchantId = decoded.merchantId;
    req.merchant = merchant;

    // If this is a team member (has merchantUserId), load their data
    if (decoded.merchantUserId) {
      const merchantUser = await MerchantUser.findById(decoded.merchantUserId);

      if (!merchantUser) {
        return res.status(401).json({
          success: false,
          message: 'Token is not valid - user not found'
        });
      }

      // Check if user is active
      if (merchantUser.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Account is ${merchantUser.status}. Please contact your administrator.`
        });
      }

      // Check if account is locked
      if (merchantUser.accountLockedUntil && merchantUser.accountLockedUntil > new Date()) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked. Please try again later.'
        });
      }

      req.merchantUser = merchantUser;
    }

    return next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    logger.error('[MERCHANT AUTH] Authentication error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const merchantSecret = process.env.JWT_MERCHANT_SECRET;
      if (!merchantSecret) {
        // For optional auth, we just skip authentication if secret is not configured
        logger.warn('[MERCHANT AUTH] JWT_MERCHANT_SECRET not configured, skipping optional authentication');
        return next();
      }
      const decoded = jwt.verify(token, merchantSecret) as any;
      const merchant = await Merchant.findById(decoded.merchantId);

      if (merchant && merchant.isActive) {
        req.merchantId = decoded.merchantId;
        req.merchant = merchant;

        // Load MerchantUser if present
        if (decoded.merchantUserId) {
          const merchantUser = await MerchantUser.findById(decoded.merchantUserId);
          if (merchantUser && merchantUser.status === 'active') {
            req.merchantUser = merchantUser;
          }
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};
