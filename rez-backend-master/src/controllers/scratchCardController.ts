import { logger } from '../config/logger';
// ScratchCard Controller
// Controller for managing scratch card functionality

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../utils/response';
import ScratchCard from '../models/ScratchCard';
import { Wallet } from '../models/Wallet';
import { UserVoucher } from '../models/Voucher';
import { User } from '../models/User';
import coinService from '../services/coinService';

/**
 * @desc    Create a new scratch card for user
 * @route   POST /api/scratch-cards
 * @access  Private
 */
export const createScratchCard = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const scratchCard = await ScratchCard.createScratchCard(userId);
    
    sendSuccess(res, {
      id: scratchCard._id,
      prize: scratchCard.prize,
      isScratched: scratchCard.isScratched,
      isClaimed: scratchCard.isClaimed,
      expiresAt: scratchCard.expiresAt,
      createdAt: scratchCard.createdAt
    }, 'Scratch card created successfully');
  } catch (error: any) {
    logger.error('❌ [SCRATCH CARD] Create failed:', error);
    sendError(res, error.message, 400);
  }
});

/**
 * @desc    Get user's scratch cards
 * @route   GET /api/scratch-cards
 * @access  Private
 */
export const getUserScratchCards = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const scratchCards = await ScratchCard.getUserScratchCards(userId);
    
    const formattedCards = scratchCards.map(card => ({
      id: card._id,
      prize: card.prize,
      isScratched: card.isScratched,
      isClaimed: card.isClaimed,
      claimedAt: card.claimedAt,
      expiresAt: card.expiresAt,
      createdAt: card.createdAt
    }));
    
    sendSuccess(res, formattedCards, 'Scratch cards retrieved successfully');
  } catch (error: any) {
    logger.error('❌ [SCRATCH CARD] Get failed:', error);
    sendError(res, error.message, 500);
  }
});

/**
 * @desc    Scratch a card to reveal prize
 * @route   POST /api/scratch-cards/:id/scratch
 * @access  Private
 */
export const scratchCard = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const scratchCard = await ScratchCard.findOne({
      _id: id,
      userId,
      isScratched: false,
      expiresAt: { $gt: new Date() }
    });

    if (!scratchCard) {
      return sendNotFound(res, 'Scratch card not found or expired');
    }

    // Mark as scratched
    scratchCard.isScratched = true;
    await scratchCard.save();
    
    sendSuccess(res, {
      id: scratchCard._id,
      prize: scratchCard.prize,
      isScratched: scratchCard.isScratched,
      isClaimed: scratchCard.isClaimed,
      expiresAt: scratchCard.expiresAt
    }, 'Card scratched successfully');
  } catch (error: any) {
    logger.error('❌ [SCRATCH CARD] Scratch failed:', error);
    sendError(res, error.message, 500);
  }
});

/**
 * @desc    Claim prize from scratch card
 * @route   POST /api/scratch-cards/:id/claim
 * @access  Private
 */
export const claimPrize = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const scratchCard = await ScratchCard.findOne({
      _id: id,
      userId,
      isScratched: true,
      isClaimed: false,
      expiresAt: { $gt: new Date() }
    }).lean();

    if (!scratchCard) {
      return sendNotFound(res, 'Scratch card not found or already claimed');
    }

    const prize = scratchCard.prize;
    let claimResult: any = {};

    // Process prize based on type
    switch (prize.type) {
      case 'discount':
        // For discount, we'll create a coupon
        claimResult = {
          type: 'discount',
          value: prize.value,
          message: `You've earned ${prize.value}% discount on your next purchase!`
        };
        break;

      case 'cashback':
        // Use coinService for proper audit trail (CoinTransaction record + Redis lock)
        try {
          const cashbackResult = await coinService.awardCoins(
            userId,
            prize.value,
            'scratch_card',
            `Scratch card cashback: ₹${prize.value}`,
            { scratchCardId: String(scratchCard._id), prizeType: 'cashback' }
          );
          claimResult = {
            type: 'cashback',
            value: prize.value,
            message: `₹${prize.value} cashback has been added to your wallet!`,
            newBalance: cashbackResult.newBalance
          };
        } catch (coinErr: any) {
          logger.error('❌ [SCRATCH CARD] Cashback award failed:', coinErr);
          claimResult = {
            type: 'cashback',
            value: prize.value,
            message: `₹${prize.value} cashback has been added to your wallet!`
          };
        }
        break;

      case 'coin':
        // Use coinService for proper audit trail (CoinTransaction record + Redis lock)
        try {
          const coinResult = await coinService.awardCoins(
            userId,
            prize.value,
            'scratch_card',
            `Scratch card: ${prize.value} coins won!`,
            { scratchCardId: String(scratchCard._id), prizeType: 'coin' }
          );
          claimResult = {
            type: 'coin',
            value: prize.value,
            message: `${prize.value} coins have been added to your wallet!`,
            newBalance: coinResult.newBalance
          };
        } catch (coinErr: any) {
          logger.error('❌ [SCRATCH CARD] Coin award failed:', coinErr);
          claimResult = {
            type: 'coin',
            value: prize.value,
            message: `${prize.value} coins have been added to your wallet!`
          };
        }
        break;

      case 'voucher':
        // Create a voucher for the user
        const voucher = new UserVoucher({
          user: userId,
          brand: new mongoose.Types.ObjectId(), // You might need to create a default brand
          voucherCode: `SCRATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          denomination: prize.value,
          purchasePrice: 0, // Free voucher from scratch card
          purchaseDate: new Date(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          validityDays: 30,
          status: 'active',
          deliveryMethod: 'app',
          deliveryStatus: 'delivered',
          deliveredAt: new Date(),
          paymentMethod: 'wallet'
        });
        await voucher.save();
        
        claimResult = {
          type: 'voucher',
          value: prize.value,
          message: `₹${prize.value} voucher has been added to your account!`
        };
        break;

      default:
        return sendBadRequest(res, 'Invalid prize type');
    }

    // Mark prize as claimed
    scratchCard.isClaimed = true;
    scratchCard.claimedAt = new Date();
    await scratchCard.save();

    sendSuccess(res, {
      prize: prize,
      claimResult: claimResult,
      claimedAt: scratchCard.claimedAt
    }, 'Prize claimed successfully');
  } catch (error: any) {
    logger.error('❌ [SCRATCH CARD] Claim failed:', error);
    sendError(res, error.message, 500);
  }
});

/**
 * @desc    Check if user is eligible for scratch card
 * @route   GET /api/scratch-cards/eligibility
 * @access  Private
 */
export const checkEligibility = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const isEligible = await ScratchCard.isEligibleForScratchCard(userId);
    
    // Get profile completion percentage
    const user = await User.findById(userId).lean();
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    const profile = user.profile || {};
    const totalFields = 9; // Updated to include website field
    let completedFields = 0;

    if (profile.firstName) completedFields++;
    if (user.email) completedFields++;
    if (user.phoneNumber) completedFields++;
    if (profile.avatar) completedFields++;
    if (profile.dateOfBirth) completedFields++;
    if (profile.gender) completedFields++;
    if (profile.location?.address) completedFields++;
    if (profile.bio) completedFields++;
    if (profile.website) completedFields++;

    const completionPercentage = Math.round((completedFields / totalFields) * 100);
    
    sendSuccess(res, {
      isEligible,
      completionPercentage,
      requiredPercentage: 80,
      message: isEligible 
        ? 'You are eligible for a scratch card!' 
        : `Complete ${80 - completionPercentage}% more of your profile to unlock scratch cards!`
    }, 'Eligibility checked successfully');
  } catch (error: any) {
    logger.error('❌ [SCRATCH CARD] Eligibility check failed:', error);
    sendError(res, error.message, 500);
  }
});
