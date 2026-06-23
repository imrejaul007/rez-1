import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Cart } from '../models/Cart';
import { Notification } from '../models/Notification';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

export const getUserBoot = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const cacheKey = `user:boot:${userId}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) return sendSuccess(res, cached, 'App boot data loaded');

  const [profile, wallet, cart, unreadCount] = await Promise.all([
    User.findById(userId)
      .select('profile.firstName profile.lastName profile.avatar isOnboarded subscription.tier auth.isVerified')
      .lean(),
    Wallet.findOne({ user: userObjectId })
      .select('coins balance brandedCoinsTotal')
      .lean(),
    Cart.findOne({ user: userObjectId, isActive: true })
      .select('items')
      .lean(),
    Notification.countDocuments({ user: userObjectId, isRead: false }),
  ]);

  const cartItemCount = cart?.items?.length || 0;

  const response = {
    profile,
    wallet,
    cart: { itemCount: cartItemCount },
    notifications: { unreadCount },
  };

  redisService.set(cacheKey, response, 30)
    .catch(err => logger.warn('[Boot] Cache write failed:', { error: (err as Error).message }));

  return sendSuccess(res, response, 'App boot data loaded');
});
