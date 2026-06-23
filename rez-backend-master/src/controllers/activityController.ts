import { Request, Response } from 'express';
import { Activity, IActivity, ActivityType, getActivityTypeDefaults } from '../models/Activity';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

// Get user activities (recent activity feed)
export const getUserActivities = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const skip = (page - 1) * limit;

  const type = req.query.type as ActivityType | undefined;

  const query: any = { user: req.user._id };
  if (type) {
    query.type = type;
  }

  const [activities, total] = await Promise.all([
    Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'profile.firstName profile.lastName phoneNumber')
      .lean(),
    Activity.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limit);

  sendSuccess(res, {
    activities,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }, 'Activities retrieved successfully');
});

// Get activity by ID
export const getActivityById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  const activity = await Activity.findOne({ _id: id, user: req.user._id }).lean();

  if (!activity) {
    return sendNotFound(res, 'Activity not found');
  }

  sendSuccess(res, activity, 'Activity retrieved successfully');
});

// Create activity (typically called by system)
export const createActivity = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { type, title, description, amount, icon, color, relatedEntity, metadata } = req.body;

  // Get default icon and color if not provided
  const defaults = getActivityTypeDefaults(type);

  const activityData = {
    user: req.user._id,
    type,
    title,
    description,
    amount,
    icon: icon || defaults.icon,
    color: color || defaults.color,
    relatedEntity,
    metadata
  };

  const activity = await Activity.create(activityData);

  sendSuccess(res, activity, 'Activity created successfully', 201);
});

// Delete activity
export const deleteActivity = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  const activity = await Activity.findOneAndDelete({ _id: id, user: req.user._id });

  if (!activity) {
    return sendNotFound(res, 'Activity not found');
  }

  sendSuccess(res, { deletedId: id }, 'Activity deleted successfully');
});

// Clear all activities
export const clearAllActivities = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const result = await Activity.deleteMany({ user: req.user._id });

  sendSuccess(res, { deletedCount: result.deletedCount }, 'All activities cleared successfully');
});

// Get activity summary by type
export const getActivitySummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const summary = await Activity.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$amount', 0] } }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        totalAmount: 1,
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);

  const totalActivities = summary.reduce((sum, item) => sum + item.count, 0);

  sendSuccess(res, { summary, totalActivities }, 'Activity summary retrieved successfully');
});

// Batch create activities (for system use - importing historical data)
export const batchCreateActivities = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { activities } = req.body;

  if (!Array.isArray(activities) || activities.length === 0) {
    return sendBadRequest(res, 'Activities array is required');
  }

  // Add user ID to all activities and set defaults
  const activitiesWithDefaults = activities.map(activity => {
    const defaults = getActivityTypeDefaults(activity.type);
    return {
      ...activity,
      user: req.user!._id,
      icon: activity.icon || defaults.icon,
      color: activity.color || defaults.color
    };
  });

  const created = await Activity.insertMany(activitiesWithDefaults);

  sendSuccess(res, created, `${created.length} activities created successfully`, 201);
});