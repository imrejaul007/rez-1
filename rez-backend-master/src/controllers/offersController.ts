import { Request, Response } from 'express';
import BankOffer from '../models/BankOffer';
import ExclusiveOffer from '../models/ExclusiveOffer';
import { Category } from '../models/Category';
import { 
  sendSuccess, 
  sendNotFound,
  sendError
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get all bank offers
export const getBankOffers = asyncHandler(async (req: Request, res: Response) => {
  const { category, limit = 10 } = req.query;

  try {
    const query: any = { isActive: true };
    
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category as string }).lean();
      if (categoryDoc) {
        query.$or = [
          { applicableCategories: { $in: [category] } },
          { applicableCategories: { $size: 0 } } // Global offers
        ];
      }
    }

    const offers = await BankOffer.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(Number(limit))
      .lean();

    sendSuccess(res, { offers }, 'Bank offers retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch bank offers', 500);
  }
});

// Get single bank offer
export const getBankOfferById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const offer = await BankOffer.findById(id).lean();

    if (!offer) {
      return sendNotFound(res, 'Bank offer not found');
    }

    sendSuccess(res, { offer }, 'Bank offer retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch bank offer', 500);
  }
});

// Get all exclusive offers (with optional zone filtering)
export const getExclusiveOffers = asyncHandler(async (req: Request, res: Response) => {
  const { category, targetAudience, exclusiveZone } = req.query;

  try {
    const query: any = {
      isActive: true,
      validFrom: { $lte: new Date() },
      validTo: { $gte: new Date() }
    };

    if (category) {
      const categoryDoc = await Category.findOne({ slug: category as string }).lean();
      if (categoryDoc) {
        query.categories = { $in: [categoryDoc._id] };
      }
    }

    if (targetAudience) {
      query.targetAudience = targetAudience;
    }

    // Zone-based filtering: only show offers matching the requested zone
    if (exclusiveZone) {
      query.targetAudience = exclusiveZone;
    }

    const offers = await ExclusiveOffer.find(query)
      .populate('categories', 'name slug')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    sendSuccess(res, { offers }, 'Exclusive offers retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch exclusive offers', 500);
  }
});

// Get single exclusive offer
export const getExclusiveOfferById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const offer = await ExclusiveOffer.findById(id)
      .populate('categories', 'name slug')
      .lean();

    if (!offer) {
      return sendNotFound(res, 'Exclusive offer not found');
    }

    sendSuccess(res, { offer }, 'Exclusive offer retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch exclusive offer', 500);
  }
});





