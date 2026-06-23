import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import { MerchantModel } from '../models/Merchant';
import { CrossAppSyncService } from '../merchantservices/CrossAppSyncService';
import { Review } from '../models/Review';
import { Store } from '../models/Store';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/merchant-profile/customer-view
// @desc    Get merchant profile formatted for customer app display
// @access  Private
router.get('/customer-view', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const merchant = await MerchantModel.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Format for customer app display
    const customerViewProfile = {
      // Basic Information
      merchantId: merchant.id,
      storeName: merchant.displayName || merchant.businessName || '',
      businessName: merchant.businessName || '',
      description: merchant.description || '',
      tagline: merchant.tagline || '',
      
      // Visual Assets
      logo: merchant.logo || '',
      coverImage: merchant.coverImage || '',
      galleryImages: merchant.galleryImages || [],
      brandColors: merchant.brandColors || {
        primary: '#007AFF',
        secondary: '#5AC8FA',
        accent: '#FF9500'
      },

      // Location & Contact (safe defaults)
      address: {
        street: merchant.address?.street || '',
        city: merchant.address?.city || '',
        state: merchant.address?.state || '',
        zipCode: merchant.address?.zipCode || '',
        country: merchant.address?.country || '',
        coordinates: merchant.address?.coordinates || []
      },
      contact: {
        phone: merchant.contact?.phone || '',
        email: merchant.contact?.email || '',
        website: merchant.contact?.website || ''
      },
      
      // Business Information
      categories: merchant.categories || [],
      tags: merchant.tags || [],
      businessHours: merchant.businessHours || {},
      timezone: merchant.timezone || 'UTC',
      
      // Services & Features
      deliveryOptions: merchant.deliveryOptions || [],
      paymentMethods: merchant.paymentMethods || [],
      serviceArea: merchant.serviceArea || '',
      features: merchant.features || [],
      
      // Customer-facing Policies
      policies: {
        returns: merchant.policies?.returns || '',
        shipping: merchant.policies?.shipping || '',
        privacy: merchant.policies?.privacy || '',
        terms: merchant.policies?.terms || ''
      },
      
      // Social Proof
      ratings: {
        average: merchant.ratings?.average || 0,
        count: merchant.ratings?.count || 0,
        breakdown: merchant.ratings?.breakdown || {}
      },
      reviewSummary: merchant.reviewSummary || {
        totalReviews: 0,
        averageRating: 0,
        recentReviews: []
      },
      
      // Social Media
      socialMedia: merchant.socialMedia || {},
      
      // Operational Status
      isActive: merchant.status === 'active',
      isOpen: isCurrentlyOpen(merchant.businessHours, merchant.timezone),
      isFeatured: merchant.isFeatured || false,
      isVerified: merchant.verification?.isVerified || false,
      
      // Performance Metrics (public)
      metrics: {
        totalOrders: merchant.metrics?.totalOrders || 0,
        totalCustomers: merchant.metrics?.totalCustomers || 0,
        averageRating: merchant.ratings?.average || 0,
        responseTime: merchant.metrics?.averageResponseTime || '< 1 hour',
        fulfillmentRate: merchant.metrics?.fulfillmentRate || 95
      },
      
      // Special Offers & Promotions
      promotions: merchant.activePromotions || [],
      announcements: merchant.announcements || [],
      
      // App-specific Data
      searchKeywords: merchant.searchKeywords || [],
      sortOrder: merchant.sortOrder || 0,
      lastActive: merchant.lastActiveAt || null,
      joinedDate: merchant.createdAt || null,
      
      // Customer App Features
      customerAppFeatures: {
        instantMessaging: merchant.features?.includes('instant_messaging') || false,
        videoConsultation: merchant.features?.includes('video_consultation') || false,
        appointmentBooking: merchant.features?.includes('appointment_booking') || false,
        subscriptionServices: merchant.features?.includes('subscriptions') || false,
        giftCards: merchant.features?.includes('gift_cards') || false,
        loyaltyProgram: merchant.features?.includes('loyalty_program') || false
      }
    };

    return res.json({
      success: true,
      data: customerViewProfile
    });

  } catch (error) {
    logger.error('Error getting customer view profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get merchant profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// @route   PUT /api/merchant-profile/customer-settings
// @desc    Update customer-facing profile settings
// @access  Private
router.put('/customer-settings', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const {
      displayName,
      description,
      tagline,
      categories,
      tags,
      businessHours,
      deliveryOptions,
      serviceArea,
      features,
      socialMedia,
      brandColors,
      announcements,
      promotions
    } = req.body;

    const updates: any = {};
    
    // Only update provided fields
    if (displayName !== undefined) updates.displayName = displayName;
    if (description !== undefined) updates.description = description;
    if (tagline !== undefined) updates.tagline = tagline;
    if (categories !== undefined) updates.categories = categories;
    if (tags !== undefined) updates.tags = tags;
    if (businessHours !== undefined) updates.businessHours = businessHours;
    if (deliveryOptions !== undefined) updates.deliveryOptions = deliveryOptions;
    if (serviceArea !== undefined) updates.serviceArea = serviceArea;
    if (features !== undefined) updates.features = features;
    if (socialMedia !== undefined) updates.socialMedia = socialMedia;
    if (brandColors !== undefined) updates.brandColors = brandColors;
    if (announcements !== undefined) updates.announcements = announcements;
    if (promotions !== undefined) updates.activePromotions = promotions;

    const updatedMerchant = await MerchantModel.findByIdAndUpdate(merchantId, updates, { new: true });

    if (!updatedMerchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Trigger sync to customer app
    try {
      await CrossAppSyncService.sendMerchantUpdate(merchantId!, {
        type: 'profile_updated',
        merchantId,
        updatedFields: Object.keys(updates),
        timestamp: new Date()
      });
    } catch (syncError) {
      logger.error('Failed to sync merchant profile update:', syncError);
    }

    return res.json({
      success: true,
      data: updatedMerchant,
      message: 'Customer-facing profile updated successfully'
    });

  } catch (error) {
    logger.error('Error updating customer settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/merchant-profile/visibility
// @desc    Get merchant visibility settings for customer app
// @access  Private
router.get('/visibility', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const merchant = await MerchantModel.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    const visibility = {
      isActive: merchant.status === 'active',
      isPubliclyVisible: merchant.isPubliclyVisible !== false,
      searchable: merchant.searchable !== false,
      acceptingOrders: merchant.acceptingOrders !== false,
      showInDirectory: merchant.showInDirectory !== false,
      featuredListing: merchant.isFeatured || false,
      showContact: merchant.showContact !== false,
      showRatings: merchant.showRatings !== false,
      showBusinessHours: merchant.showBusinessHours !== false,
      allowCustomerMessages: merchant.allowCustomerMessages !== false,
      showPromotions: merchant.showPromotions !== false
    };

    return res.json({
      success: true,
      data: visibility
    });

  } catch (error) {
    logger.error('Error getting visibility settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get visibility settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/merchant-profile/visibility
// @desc    Update merchant visibility settings
// @access  Private
router.put('/visibility', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const visibilitySettings = req.body;

    const updates = {
      isPubliclyVisible: visibilitySettings.isPubliclyVisible,
      searchable: visibilitySettings.searchable,
      acceptingOrders: visibilitySettings.acceptingOrders,
      showInDirectory: visibilitySettings.showInDirectory,
      isFeatured: visibilitySettings.featuredListing,
      showContact: visibilitySettings.showContact,
      showRatings: visibilitySettings.showRatings,
      showBusinessHours: visibilitySettings.showBusinessHours,
      allowCustomerMessages: visibilitySettings.allowCustomerMessages,
      showPromotions: visibilitySettings.showPromotions
    };

    const updatedMerchant = await MerchantModel.findByIdAndUpdate(merchantId, updates, { new: true });

    if (!updatedMerchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Sync visibility changes to customer app
    try {
      await CrossAppSyncService.sendMerchantUpdate(merchantId!, {
        type: 'visibility_updated',
        merchantId,
        visibilitySettings,
        timestamp: new Date()
      });
    } catch (syncError) {
      logger.error('Failed to sync visibility update:', syncError);
    }

    return res.json({
      success: true,
      data: updates,
      message: 'Visibility settings updated successfully'
    });

  } catch (error) {
    logger.error('Error updating visibility settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update visibility settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/merchant-profile/sync-to-customer-app
// @desc    Manually sync merchant profile to customer app
// @access  Private
router.post('/sync-to-customer-app', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    
    // Trigger full merchant profile sync
    await CrossAppSyncService.sendMerchantUpdate(merchantId!, {
      type: 'full_profile_sync',
      merchantId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Merchant profile sync triggered successfully'
    });

  } catch (error) {
    logger.error('Error syncing merchant profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync merchant profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/merchant-profile/customer-reviews
// @desc    Get reviews and ratings from customer app
// @access  Private
router.get('/customer-reviews', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const { page = '1', limit = '10', rating } = req.query;

    // Find merchant's store
    const store = await Store.findOne({ merchantId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Build query
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const reviewQuery: any = {
      store: store._id,
      isActive: true
    };

    // Filter by rating if specified
    if (rating) {
      reviewQuery.rating = parseInt(rating as string);
    }

    // Fetch reviews from database
    const [reviews, totalCount] = await Promise.all([
      Review.find(reviewQuery)
        .populate('user', 'profile.name profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(reviewQuery)
    ]);

    // Get rating statistics
    const stats = await Review.getStoreRatingStats((store._id as any).toString());

    // Format reviews for response
    const formattedReviews = reviews.map((review: any) => ({
      id: review._id,
      customerId: review.user._id,
      customerName: review.user?.profile?.name || 'Anonymous',
      customerAvatar: review.user?.profile?.avatar,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images || [],
      createdAt: review.createdAt,
      verified: review.verified,
      helpful: review.helpful || 0
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        reviews: formattedReviews,
        summary: {
          totalReviews: stats.count,
          averageRating: stats.average,
          ratingBreakdown: {
            5: stats.distribution[5],
            4: stats.distribution[4],
            3: stats.distribution[3],
            2: stats.distribution[2],
            1: stats.distribution[1]
          }
        },
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limitNum,
          hasNext: pageNum < totalPages,
          hasPrevious: pageNum > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error getting customer reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer reviews',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to check if store is currently open
function isCurrentlyOpen(businessHours: any, timezone: string = 'UTC'): boolean {
  try {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: timezone 
    }).toLowerCase() as keyof typeof businessHours;
    
    const todayHours = businessHours[dayOfWeek];
    if (!todayHours || !todayHours.isOpen) {
      return false;
    }

    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: timezone
    });

    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  } catch (error) {
    logger.error('Error checking if store is open:', error);
    return false;
  }
}

export default router;