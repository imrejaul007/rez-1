import { Request, Response } from 'express';
import SocialProofStat from '../models/SocialProofStat';
import { Category } from '../models/Category';
import { 
  sendSuccess, 
  sendNotFound
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get social proof stats for a category
export const getSocialProofStats = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;

  try {
    let stats;

    if (category) {
      const categoryDoc = await Category.findOne({ slug: category as string }).lean();
      
      if (!categoryDoc) {
        return sendNotFound(res, 'Category not found');
      }

      stats = await SocialProofStat.findOne({ category: categoryDoc._id }).lean();

      if (!stats) {
        // Return default stats if not found
        stats = {
          category: categoryDoc._id,
          shoppedToday: 0,
          totalEarned: 0,
          topHashtags: [],
          recentBuyers: [],
          updatedAt: new Date()
        };
      }
    } else {
      // Get global stats (aggregate across all categories)
      const allStats = await SocialProofStat.find({}).limit(1000).lean();
      
      stats = {
        shoppedToday: allStats.reduce((sum, s) => sum + (s.shoppedToday || 0), 0),
        totalEarned: allStats.reduce((sum, s) => sum + (s.totalEarned || 0), 0),
        topHashtags: [] as string[],
        recentBuyers: [] as any[],
        updatedAt: new Date()
      };

      // Aggregate top hashtags
      const hashtagCounts: Record<string, number> = {};
      allStats.forEach(s => {
        (s.topHashtags || []).forEach(tag => {
          hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
        });
      });

      stats.topHashtags = Object.entries(hashtagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);

      // Get recent buyers from all categories
      const allBuyers = allStats
        .flatMap(s => s.recentBuyers || [])
        .sort((a, b) => {
          const timeA = parseInt(a.timeAgo) || 0;
          const timeB = parseInt(b.timeAgo) || 0;
          return timeA - timeB;
        })
        .slice(0, 5);

      stats.recentBuyers = allBuyers;
    }

    sendSuccess(res, { stats }, 'Social proof stats retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch social proof stats', 500);
  }
});





