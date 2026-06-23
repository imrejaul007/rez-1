import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import UserLoyalty from '../../models/UserLoyalty';
import { User } from '../../models/User';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

const VALID_CATEGORIES = [
  'food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports',
  'healthcare', 'fashion', 'education-learning', 'home-services',
  'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics'
];

/**
 * Derive the category slug from a hyphen-separated missionId.
 * Mission IDs look like: food-try-3-restaurants, fitness-visit-3-gyms, etc.
 * The first segment before the action word maps to a known category.
 */
function getCategoryFromMissionId(missionId: string): string {
  const prefixMap: Record<string, string> = {
    'food': 'food-dining',
    'fitness': 'fitness-sports',
    'beauty': 'beauty-wellness',
    'grocery': 'grocery-essentials',
    'health': 'healthcare',
    'fashion': 'fashion',
    'edu': 'education-learning',
    'home': 'home-services',
    'travel': 'travel-experiences',
    'ent': 'entertainment',
    'fin': 'financial-lifestyle',
    'elec': 'electronics',
  };
  const firstPart = missionId.split('-')[0];
  return prefixMap[firstPart] || 'general';
}

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/loyalty
 * @desc    List user loyalty records with pagination, search, category filter, and sorting
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const sortBy = (req.query.sortBy as string) || 'streak';

    // Build filter
    const filter: any = {};

    // Category filter - filter by categoryCoins having that key
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }
    if (category) {
      filter[`categoryCoins.${category}`] = { $exists: true };
    }

    // If search is provided, find matching user IDs first
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      const matchingUsers = await User.find({
        $or: [
          { 'profile.firstName': searchRegex },
          { 'profile.lastName': searchRegex },
          { phoneNumber: searchRegex }
        ]
      }).select('_id').lean();

      const userIds = matchingUsers.map((u: any) => u._id);
      filter.userId = { $in: userIds };
    }

    // Build sort
    let sort: any = {};
    switch (sortBy) {
      case 'coins':
        sort = { 'coins.available': -1 };
        break;
      case 'missions':
        sort = { 'missions': -1 };
        break;
      case 'streak':
      default:
        sort = { 'streak.current': -1 };
        break;
    }

    const [users, total] = await Promise.all([
      UserLoyalty.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'profile.firstName profile.lastName phoneNumber email'),
      UserLoyalty.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  }));

/**
 * @route   GET /api/admin/loyalty/stats
 * @desc    Aggregate loyalty statistics
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = await UserLoyalty.aggregate([
      {
        $facet: {
          totalUsers: [
            { $count: 'count' }
          ],
          activeStreaks: [
            { $match: { 'streak.current': { $gt: 0 } } },
            { $count: 'count' }
          ],
          totalCoinsEarned: [
            { $group: { _id: null, total: { $sum: '$coins.available' } } }
          ],
          completedMissions: [
            { $unwind: '$missions' },
            { $match: { 'missions.completedAt': { $exists: true, $ne: null } } },
            { $count: 'count' }
          ],
          avgStreak: [
            { $group: { _id: null, avg: { $avg: '$streak.current' } } }
          ],
          // Get category coins for top category calculation
          categoryCoinsData: [
            { $project: { categoryCoinsArray: { $objectToArray: '$categoryCoins' } } },
            { $unwind: '$categoryCoinsArray' },
            {
              $group: {
                _id: '$categoryCoinsArray.k',
                totalCoins: { $sum: '$categoryCoinsArray.v.available' }
              }
            },
            { $sort: { totalCoins: -1 } },
            { $limit: 1 }
          ]
        }
      }
    ]);

    const result = {
      totalUsers: stats[0].totalUsers[0]?.count || 0,
      activeStreaks: stats[0].activeStreaks[0]?.count || 0,
      totalCoinsEarned: stats[0].totalCoinsEarned[0]?.total || 0,
      completedMissions: stats[0].completedMissions[0]?.count || 0,
      avgStreak: Math.round((stats[0].avgStreak[0]?.avg || 0) * 100) / 100,
      topCategory: stats[0].categoryCoinsData[0]
        ? { category: stats[0].categoryCoinsData[0]._id, totalCoins: stats[0].categoryCoinsData[0].totalCoins }
        : null
    };

    res.json({
      success: true,
      data: result
    });
  }));

/**
 * @route   GET /api/admin/loyalty/missions
 * @desc    List missions grouped by category with completion counts
 * @access  Admin
 */
router.get('/missions', asyncHandler(async (req: Request, res: Response) => {
    const missionStats = await UserLoyalty.aggregate([
      { $unwind: '$missions' },
      {
        $group: {
          _id: '$missions.missionId',
          title: { $first: '$missions.title' },
          description: { $first: '$missions.description' },
          target: { $first: '$missions.target' },
          reward: { $first: '$missions.reward' },
          icon: { $first: '$missions.icon' },
          totalAssigned: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$missions.completedAt', null] }, { $ifNull: ['$missions.completedAt', false] }] },
                1,
                0
              ]
            }
          },
          avgProgress: { $avg: '$missions.progress' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Group by category prefix derived from missionId
    // Mission IDs use hyphens (e.g., "food-try-3-restaurants", "fitness-visit-3-gyms")
    // The first segment maps to a known category via prefix lookup
    const grouped: Record<string, any[]> = {};
    for (const mission of missionStats) {
      const category = getCategoryFromMissionId(String(mission._id));
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        missionId: mission._id,
        title: mission.title,
        description: mission.description,
        target: mission.target,
        reward: mission.reward,
        icon: mission.icon,
        totalAssigned: mission.totalAssigned,
        completedCount: mission.completedCount,
        avgProgress: Math.round((mission.avgProgress || 0) * 100) / 100
      });
    }

    res.json({
      success: true,
      data: {
        missions: grouped,
        totalUniqueMissions: missionStats.length
      }
    });
  }));

/**
 * @route   GET /api/admin/loyalty/:userId
 * @desc    Get single user loyalty detail
 * @access  Admin
 */
router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
    const loyalty = await UserLoyalty.findOne({ userId: req.params.userId })
      .populate('userId', 'profile.firstName profile.lastName phoneNumber email');

    if (!loyalty) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty record not found for this user'
      });
    }

    res.json({
      success: true,
      data: loyalty
    });
  }));

/**
 * @route   POST /api/admin/loyalty/:userId/add-coins
 * @desc    Add bonus coins to a user (global or category-specific)
 * @access  Admin
 */
router.post('/:userId/add-coins', asyncHandler(async (req: Request, res: Response) => {
    const { amount, category, reason } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A positive amount is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'A reason is required'
      });
    }

    // Find or create loyalty record
    let loyalty = await UserLoyalty.findOne({ userId: req.params.userId });

    if (!loyalty) {
      loyalty = new UserLoyalty({
        userId: new Types.ObjectId(req.params.userId),
        streak: { current: 0, target: 7, history: [] },
        brandLoyalty: [],
        missions: [],
        coins: { available: 0, expiring: 0, history: [] },
        categoryCoins: new Map()
      });
    }

    if (category) {
      // Add to category-specific coins
      const existing = loyalty.categoryCoins.get(category) || { available: 0, expiring: 0 };
      existing.available += amount;
      loyalty.categoryCoins.set(category, existing);
      loyalty.markModified('categoryCoins');
    } else {
      // Add to global coins
      loyalty.coins.available += amount;
    }

    // Push to coins history
    loyalty.coins.history.push({
      amount,
      type: 'earned',
      description: reason,
      date: new Date()
    });

    await loyalty.save();

    res.json({
      success: true,
      message: `Successfully added ${amount} coins${category ? ` to ${category}` : ''}`,
      data: loyalty
    });
  }));

/**
 * @route   POST /api/admin/loyalty/:userId/reset-streak
 * @desc    Reset a user's streak
 * @access  Admin
 */
router.post('/:userId/reset-streak', asyncHandler(async (req: Request, res: Response) => {
    const loyalty = await UserLoyalty.findOne({ userId: req.params.userId });

    if (!loyalty) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty record not found for this user'
      });
    }

    loyalty.streak.current = 0;
    loyalty.streak.lastCheckin = undefined as any;
    await loyalty.save();

    res.json({
      success: true,
      message: 'Streak reset successfully',
      data: loyalty
    });
  }));

/**
 * @route   POST /api/admin/loyalty/:userId/reset-missions
 * @desc    Reset user missions (all or by category prefix)
 * @access  Admin
 */
router.post('/:userId/reset-missions', asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.body;

    const loyalty = await UserLoyalty.findOne({ userId: req.params.userId });

    if (!loyalty) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty record not found for this user'
      });
    }

    let resetCount = 0;

    for (const mission of loyalty.missions) {
      // If category is provided, only reset missions whose missionId starts with that category prefix
      if (category && !mission.missionId.startsWith(category)) {
        continue;
      }
      mission.progress = 0;
      mission.completedAt = undefined as any;
      resetCount++;
    }

    await loyalty.save();

    res.json({
      success: true,
      message: `Reset ${resetCount} mission(s)${category ? ` for category "${category}"` : ''}`,
      data: loyalty
    });
  }));

export default router;
