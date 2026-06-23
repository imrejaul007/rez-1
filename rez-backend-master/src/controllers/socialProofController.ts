import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex } from '../utils/sanitize';

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

// Helper function to calculate distance between two coordinates
const calculateDistance = (
  coord1: [number, number],
  coord2: [number, number]
): string => {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m away`;
  }
  return `${distance.toFixed(1)} km away`;
};

/**
 * Get nearby activity feed for social proof
 * Shows real user savings from delivered orders near the user's location
 */
export const getNearbyActivity = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, radius = 5, limit = 10, city } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusKm = parseFloat(radius as string);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude or longitude',
      });
    }

    const radiusMeters = radiusKm * 1000;

    // Get start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First, try to get recent orders with savings (without geospatial filter initially)
    // This handles cases where coordinates might not be set
    let activities: any[] = [];

    try {
      // Try geospatial query first
      activities = await Order.aggregate([
        {
          $match: {
            status: 'delivered',
            createdAt: { $gte: today },
            'delivery.address.coordinates': { $exists: true, $ne: null },
            $or: [
              { 'totals.cashback': { $gt: 0 } },
              { 'totals.discount': { $gt: 0 } },
            ],
          },
        },
        {
          $addFields: {
            distance: {
              $cond: {
                if: { $and: [
                  { $isArray: '$delivery.address.coordinates' },
                  { $gte: [{ $size: '$delivery.address.coordinates' }, 2] }
                ]},
                then: {
                  $sqrt: {
                    $add: [
                      { $pow: [{ $subtract: [{ $arrayElemAt: ['$delivery.address.coordinates', 0] }, lng] }, 2] },
                      { $pow: [{ $subtract: [{ $arrayElemAt: ['$delivery.address.coordinates', 1] }, lat] }, 2] }
                    ]
                  }
                },
                else: 999
              }
            }
          }
        },
        {
          $match: {
            distance: { $lte: radiusKm / 111 } // Approximate degrees for km
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        {
          $lookup: {
            from: 'stores',
            localField: 'items.store',
            foreignField: '_id',
            as: 'storeInfo',
          },
        },
        {
          $project: {
            firstName: {
              $ifNull: [
                { $arrayElemAt: ['$userInfo.profile.firstName', 0] },
                'User',
              ],
            },
            savings: { $add: ['$totals.cashback', '$totals.discount'] },
            cashback: '$totals.cashback',
            discount: '$totals.discount',
            storeName: {
              $ifNull: [{ $arrayElemAt: ['$storeInfo.name', 0] }, 'Store'],
            },
            storeId: { $arrayElemAt: ['$storeInfo._id', 0] },
            storeLogo: { $arrayElemAt: ['$storeInfo.logo', 0] },
            coordinates: '$delivery.address.coordinates',
            createdAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: limitNum },
      ]);
    } catch (geoError) {
      // Fallback: get recent orders without geospatial filter
      activities = [];
    }

    // Transform activities with calculated fields
    const transformedActivities = activities.map((activity) => ({
      id: activity._id.toString(),
      firstName: activity.firstName || 'User',
      savings: Math.round(activity.savings || 0),
      savingsType:
        (activity.cashback || 0) > (activity.discount || 0)
          ? 'cashback'
          : 'discount',
      storeName: activity.storeName || 'Store',
      storeId: activity.storeId?.toString(),
      storeLogo: activity.storeLogo,
      timeAgo: formatTimeAgo(new Date(activity.createdAt)),
      distance: activity.coordinates
        ? calculateDistance([lng, lat], activity.coordinates)
        : 'Nearby',
    }));

    // Get store aggregates - how many people redeemed at each store today
    let storeAggregates: any[] = [];
    try {
      storeAggregates = await Order.aggregate([
        {
          $match: {
            status: 'delivered',
            createdAt: { $gte: today },
          },
        },
        {
          $unwind: '$items',
        },
        {
          $group: {
            _id: '$items.store',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'stores',
            localField: '_id',
            foreignField: '_id',
            as: 'store',
          },
        },
        {
          $project: {
            storeId: '$_id',
            storeName: { $ifNull: [{ $arrayElemAt: ['$store.name', 0] }, 'Store'] },
            storeLogo: { $arrayElemAt: ['$store.logo', 0] },
            todayRedemptions: '$count',
          },
        },
        { $sort: { todayRedemptions: -1 } },
        { $limit: 5 },
      ]);
    } catch (aggregateError) {
      // Store aggregates query failed
      storeAggregates = [];
    }

    // Format store aggregates
    const formattedAggregates = storeAggregates.map((store) => ({
      storeId: store.storeId?.toString(),
      storeName: store.storeName || 'Store',
      storeLogo: store.storeLogo,
      todayRedemptions: store.todayRedemptions,
      message: `${store.todayRedemptions} people redeemed here today`,
    }));

    // Calculate total nearby savings today
    const totalNearbyToday = transformedActivities.length;

    // If no nearby activity, try to get city-wide stats
    let cityWideStats = null;
    if (transformedActivities.length === 0 && city) {
      const cityStats = await Order.aggregate([
        {
          $match: {
            status: 'delivered',
            createdAt: { $gte: today },
            'delivery.address.city': {
              $regex: escapeRegex(city as string), $options: 'i',
            },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSavings: {
              $sum: { $add: ['$totals.cashback', '$totals.discount'] },
            },
          },
        },
      ]);

      if (cityStats.length > 0) {
        cityWideStats = {
          totalPeopleToday: cityStats[0].totalOrders,
          totalSavingsToday: Math.round(cityStats[0].totalSavings || 0),
          city: city as string,
          message: `${cityStats[0].totalOrders} people saved today in ${city}`,
        };
      }
    }

    return res.json({
      success: true,
      data: {
        activities: transformedActivities,
        storeAggregates: formattedAggregates,
        cityWideStats,
        meta: {
          totalNearbyToday,
          radiusKm,
          coordinates: { latitude: lat, longitude: lng },
          cachedAt: new Date().toISOString(),
        },
      },
    });
});

/**
 * Get city-wide statistics when no nearby activity is available
 */
export const getCityWideStats = asyncHandler(async (req: Request, res: Response) => {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'City parameter is required',
      });
    }

    // Get start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cityStats = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdAt: { $gte: today },
          'delivery.address.city': {
            $regex: escapeRegex(city as string), $options: 'i',
          },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSavings: {
            $sum: { $add: ['$totals.cashback', '$totals.discount'] },
          },
          avgSavings: {
            $avg: { $add: ['$totals.cashback', '$totals.discount'] },
          },
        },
      },
    ]);

    if (cityStats.length === 0) {
      return res.json({
        success: true,
        data: {
          totalPeopleToday: 0,
          totalSavingsToday: 0,
          avgSavings: 0,
          city: city as string,
          message: 'Be the first to save in your city today!',
        },
      });
    }

    const stats = cityStats[0];

    return res.json({
      success: true,
      data: {
        totalPeopleToday: stats.totalOrders,
        totalSavingsToday: Math.round(stats.totalSavings || 0),
        avgSavings: Math.round(stats.avgSavings || 0),
        city: city as string,
        message: `${stats.totalOrders} people saved ₹${Math.round(stats.totalSavings || 0)} today in ${city}`,
      },
    });
});

export default {
  getNearbyActivity,
  getCityWideStats,
};
