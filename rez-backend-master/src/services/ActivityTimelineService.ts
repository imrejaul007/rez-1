// Activity Timeline Service
// Generates timeline views of merchant activities

import AuditLog, { IAuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';
import { Lean } from '../types/lean';

export interface TimelineGroup {
  date: string;
  activities: Lean<IAuditLog>[];
  count: number;
}

export interface TimelineFilters {
  merchantId: string | Types.ObjectId;
  merchantUserId?: string;
  resourceType?: string;
  action?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class ActivityTimelineService {
  /**
   * Get timeline grouped by date
   */
  static async getTimeline(filters: TimelineFilters): Promise<TimelineGroup[]> {
    const query: any = { merchantId: filters.merchantId };

    if (filters.merchantUserId) {
      query.merchantUserId = filters.merchantUserId;
    }

    if (filters.resourceType) {
      query.resourceType = filters.resourceType;
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.severity) {
      query.severity = filters.severity;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    const activities = await AuditLog.find(query)
      .sort({ timestamp: -1 })
        .limit(filters.limit || 100)
          .populate('merchantUserId', 'name email')
            .lean();

    // Group by date
    const grouped = this.groupByDate(activities);

    return grouped;
  }

  /**
   * Get today's activities
   */
  static async getTodayActivities(
    merchantId: string | Types.ObjectId
  ): Promise<Lean<IAuditLog>[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await AuditLog.find({
      merchantId,
      timestamp: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
      .sort({ timestamp: -1 })
      .populate('merchantUserId', 'name email')
      .lean();
  }

  /**
   * Get recent activities
   */
  static async getRecentActivities(
    merchantId: string | Types.ObjectId,
    limit: number = 20
  ): Promise<Lean<IAuditLog>[]> {
    return await AuditLog.find({ merchantId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('merchantUserId', 'name email')
      .lean();
  }

  /**
   * Get activity summary for a period
   */
  static async getActivitySummary(
    merchantId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalActivities: number;
    byAction: Record<string, number>;
    byResourceType: Record<string, number>;
    bySeverity: Record<string, number>;
    byUser: Array<{ userId: string; userName: string; count: number }>;
    dailyBreakdown: Array<{ date: string; count: number }>;
  }> {
    const query = {
      merchantId,
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const [
      totalActivities,
      byAction,
      byResourceType,
      bySeverity,
      byUser,
      dailyBreakdown
    ] = await Promise.all([
      AuditLog.countDocuments(query),

      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$resourceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),

      AuditLog.aggregate([
        { $match: query },
        { $match: { merchantUserId: { $exists: true } } },
        { $group: { _id: '$merchantUserId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
      ]),

      AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    return {
      totalActivities,
      byAction: byAction.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byResourceType: byResourceType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byUser: byUser.map(item => ({
        userId: item._id.toString(),
        userName: item.user?.name || 'Unknown',
        count: item.count
      })),
      dailyBreakdown: dailyBreakdown.map(item => ({
        date: item._id,
        count: item.count
      }))
    };
  }

  /**
   * Get critical activities
   */
  static async getCriticalActivities(
    merchantId: string | Types.ObjectId,
    limit: number = 50
  ): Promise<Lean<IAuditLog>[]> {
    return await AuditLog.find({
      merchantId,
      severity: { $in: ['critical', 'error'] }
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('merchantUserId', 'name email')
      .lean();
  }

  /**
   * Get activity feed (real-time compatible)
   */
  static async getActivityFeed(
    merchantId: string | Types.ObjectId,
    since?: Date,
    limit: number = 50
  ): Promise<Lean<IAuditLog>[]> {
    const query: any = { merchantId };

    if (since) {
      query.timestamp = { $gt: since };
    }

    return await AuditLog.find(query)
      .sort({ timestamp: -1 })
        .limit(limit)
          .populate('merchantUserId', 'name email')
            .lean();
  }

  /**
   * Search activities
   */
  static async searchActivities(
    merchantId: string | Types.ObjectId,
    searchTerm: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      resourceType?: string;
    }
  ): Promise<Lean<IAuditLog>[]> {
    const query: any = {
      merchantId,
      $or: [
        { action: { $regex: searchTerm, $options: 'i' } },
        { resourceType: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    if (filters?.resourceType) {
      query.resourceType = filters.resourceType;
    }

    if (filters?.startDate || filters?.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    return await AuditLog.find(query)
      .sort({ timestamp: -1 })
        .limit(100)
          .populate('merchantUserId', 'name email')
            .lean();
  }

  /**
   * Helper: Group activities by date
   */
  private static groupByDate(activities: Lean<IAuditLog>[]): TimelineGroup[] {
    const groups = new Map<string, Lean<IAuditLog>[]>();

    for (const activity of activities) {
      const date = new Date(activity.timestamp).toISOString().split('T')[0];

      if (!groups.has(date)) {
        groups.set(date, []);
      }

      groups.get(date)!.push(activity);
    }

    return Array.from(groups.entries()).map(([date, activities]) => ({
      date,
      activities,
      count: activities.length
    }));
  }

  /**
   * Get activity heatmap data
   */
  static async getActivityHeatmap(
    merchantId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; hour: number; count: number }>> {
    const result = await AuditLog.aggregate([
      {
        $match: {
          merchantId: new Types.ObjectId(merchantId.toString()),
          timestamp: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            hour: { $hour: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1, '_id.hour': 1 }
      }
    ]);

    return result.map(item => ({
      date: item._id.date,
      hour: item._id.hour,
      count: item.count
    }));
  }

  /**
   * Format activity for display
   */
  static formatActivity(activity: Lean<IAuditLog>): string {
    const user = (activity.merchantUserId as any)?.name || 'System';
    const action = activity.action.replace(/\./g, ' ').replace(/_/g, ' ');
    const timestamp = new Date(activity.timestamp).toLocaleString();

    return `[${timestamp}] ${user} ${action} ${activity.resourceType}${
      activity.resourceId ? ` #${activity.resourceId}` : ''
    }`;
  }
}

export default ActivityTimelineService;
