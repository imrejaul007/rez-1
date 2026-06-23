# PHASE 1 — Updated Files Inventory

Complete list of files that DIFFER between the git-source repo (`rez-backend`) and the user-existing repo (`rez-backend-master`). The merge script should use this list to know which files to overwrite or 3-way merge.

**Total differing files: 1213**

## Top-Level Differences

| File | Summary |
|------|---------|
| `.dockerignore` | changes: # Dependencies |
| `.env.example` | changes: # Environment Configuration |
| `.env.production.example` | changes: # ============================================= |
| `.gitignore` | changes: # Dependencies |
| `.npmrc` | changes: legacy-peer-deps=true |
| `CONTRIBUTING.md` | changes: ## Quick Start (5 minutes) |
| `Dockerfile` | changes: # Multi-stage build for optimization |
| `docker-compose.elk.yml` | changes: - xpack.security.enabled=false |
| `docker-compose.monitoring.yml` | content drift |
| `docker-compose.prod.yml` | changes: - REDIS_URL=${REDIS_URL} |
| `docker-compose.yml` | changes: - MONGODB_URI=${MONGODB_URI:-mongodb://rezadmin:rezdevpass@mongo:27017/rez?authS |
| `eslint.config.js` | changes: '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgn |
| `jest.config.js` | changes: '^.+\\.ts$': 'ts-jest', |
| `package-lock.json` | changes: "@paypal/paypal-server-sdk": "^1.1.0", |
| `package.json` | changes: "@paypal/paypal-server-sdk": "^1.1.0", |
| `prometheus.yml` | changes: - job_name: 'rez-backend' |
| `tsconfig.json` | changes: "declaration": true, |

## Per-Category Breakdowns

### Config Files (src/config/) — 31 files

| File | Summary |
|------|---------|
| `src/config/achievementMetrics.ts` | changes: source: string;          // Mongoose model name |
| `src/config/achievements.ts` | changes: rewards: { coins: 100 } |
| `src/config/alerts.ts` | removed: markShuttingDown,alertCriticalWalletDrift,alertPaymentJobFailed |
| `src/config/badges.ts` | changes: displayOnReviews: false |
| `src/config/brand.ts` | changes: * - Model enums ('nuqta', 'rez', 'promo', 'branded') — internal DB identifiers |
| `src/config/challengeTemplates.ts` | changes: target: 3 |
| `src/config/checkoutConfig.ts` | changes: default: 0.10, // 10% cashback |
| `src/config/cronJobs.ts` | removed: scheduleCronJob,shutdownCronJobs |
| `src/config/currencyRules.ts` | changes: rez:     { expiryDays: 0,   maxUsagePct: 100, conversionRate: 1, priority: 4 }, |
| `src/config/database.ts` | changes: minPoolSize: 5, // Reduced idle overhead |
| `src/config/earningsCategories.ts` | content drift |
| `src/config/gamificationFeatureFlags.ts` | changes: miniGames: true,      // spin wheel, scratch card, quiz |
| `src/config/logger.ts` | changes: environment: process.env.NODE_ENV \|\| 'development' |
| `src/config/middleware.ts` | removed: isOriginAllowed |
| `src/config/orderStateMachine.ts` | new: TERMINAL_STATUSES,ACTIVE_STATUSES,PAST_STATUSES; removed: TERMINAL_STATUSES,ACTIVE_STATUSES,PAST_STATUSES |
| `src/config/permissions.ts` | changes: 'products:view': ['owner', 'admin', 'manager', 'staff'], |
| `src/config/prometheus.ts` | new: trackDbOperation; removed: paymentFailureCounter,coinExpiryBurnCounter,coinIssuanceCounter |
| `src/config/promoCoins.config.ts` | new: convertCoinsToINR,getCoinsExpiryDate; removed: convertCoinsToINR,getCoinsExpiryDate |
| `src/config/queue.config.ts` | changes: import Queue from 'bull'; |
| `src/config/razorpay.config.ts` | removed: razorpay,isLiveMode,getWebhookSecret |
| `src/config/redis.ts` | removed: RedisSentinelHost |
| `src/config/regions.ts` | new: RegionId; removed: RegionId |
| `src/config/routes.ts` | changes: import { generalLimiter } from '../middleware/rateLimiter'; |
| `src/config/sentry.ts` | new: sentryTracingHandler,captureException,captureMessage; removed: sentryTracingHandler,captureException,captureMessage |
| `src/config/socket.ts` | content drift |
| `src/config/socketAdapter.ts` | changes: _subClient.on('error', (err: Error) => |
| `src/config/socketSetup.ts` | removed: emitToKDS |
| `src/config/swagger.ts` | changes: url: 'https://rezapp.com/support' |
| `src/config/validateEnv.ts` | new: validateEnvironment; removed: validateEnv |
| `src/config/walletAlerts.ts` | changes: return WALLET_ALERT_RULES.filter(rule => rule.severity === severity); |
| `src/config/walletMetrics.ts` | new: timeWalletOperation; removed: walletWriteTotal,walletCommitRetryTotal,walletCacheStaleTotal |

### Controllers (src/controllers/) — 147 files

| File | Summary |
|------|---------|
| `src/controllers/achievementController.ts` | changes: import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response'; |
| `src/controllers/activityController.ts` | changes: import { Activity, IActivity, ActivityType, getActivityTypeDefaults } from '../m |
| `src/controllers/activityFeedController.ts` | changes: const page = parseInt(req.query.page as string) \|\| 1; |
| `src/controllers/addressController.ts` | changes: import { sendSuccess, sendNotFound } from '../utils/response'; |
| `src/controllers/admin/priveAdminController.ts` | removed: getSubmissions,reviewSubmission |
| `src/controllers/admin/priveConciergeAdminController.ts` | changes: const page = Math.max(1, parseInt(req.query.page as string) \|\| 1); |
| `src/controllers/admin/priveConfigAdminController.ts` | changes: import { sendSuccess, sendError } from '../../utils/response'; |
| `src/controllers/admin/priveMissionAdminController.ts` | changes: title, description, shortDescription, icon, targetPillar, actionType, |
| `src/controllers/admin/smartSpendAdminController.ts` | changes: import { logger } from '../../config/logger'; |
| `src/controllers/adminExploreController.ts` | changes: import { |
| `src/controllers/adminReferralController.ts` | changes: import { escapeRegex } from '../utils/sanitize'; |
| `src/controllers/analyticsController.ts` | changes: import { |
| `src/controllers/articleController.ts` | changes: import { CacheTTL } from '../config/redis'; |
| `src/controllers/authController.ts` | new: exportUserData,getUserStatistics,uploadAvatar |
| `src/controllers/billController.ts` | changes: import { sendSuccess, sendNotFound, sendError } from '../utils/response'; |
| `src/controllers/billPaymentController.ts` | new: getPlans; removed: getPlans |
| `src/controllers/billingController.ts` | changes: import { Subscription, ISubscription } from '../models/Subscription'; |
| `src/controllers/bonusZoneController.ts` | changes: import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/r |
| `src/controllers/campaignController.ts` | changes: import stripeService from '../services/stripeService'; |
| `src/controllers/cartController.ts` | changes: import { Types } from 'mongoose'; |
| `src/controllers/cashStoreController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/cashbackController.ts` | changes: const userId = (req as any).userId; |
| `src/controllers/categoryController.ts` | changes: import { |
| `src/controllers/challengeController.ts` | changes: data: challenges |
| `src/controllers/comparisonController.ts` | changes: import { |
| `src/controllers/couponController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/creatorController.ts` | changes: import { |
| `src/controllers/discountController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/diverseRecommendationController.ts` | changes: diversityScore: targetDiversityScore = 0.7, |
| `src/controllers/earningsController.ts` | changes: import { sendSuccess, sendBadRequest, sendNotFound, sendCreated } from '../utils |
| `src/controllers/emergencyController.ts` | changes: isNational |
| `src/controllers/engagementConfigController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/eventController.ts` | changes: import { IEvent } from '../models/Event'; |
| `src/controllers/experienceController.ts` | changes: import mongoose from 'mongoose'; |
| `src/controllers/exploreController.ts` | changes: import { |
| `src/controllers/externalWalletController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/faqController.ts` | removed: getFaqs,getFaqCategories,getPopularFaqs |
| `src/controllers/favoriteController.ts` | changes: import { |
| `src/controllers/flashSaleController.ts` | changes: const minutes = parseInt(req.query.minutes as string) \|\| 5; |
| `src/controllers/followerAnalyticsController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/followerStatsController.ts` | changes: import { sendSuccess, sendNotFound, sendBadRequest, sendForbidden } from '../uti |
| `src/controllers/gameController.ts` | changes: ip: req.ip \|\| req.headers['x-forwarded-for'] as string \|\| undefined, |
| `src/controllers/gamificationController.ts` | changes: const result = await challengeService.claimRewards((req.user._id as Types.Object |
| `src/controllers/giftCardController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/giftController.ts` | changes: import { sendSuccess, sendError, sendBadRequest } from '../utils/response'; |
| `src/controllers/goldSavingsController.ts` | changes: const GOLD_PRICE_CACHE_TTL = 60; // 60 seconds |
| `src/controllers/heroBannerController.ts` | changes: const { source, device, location } = req.body; |
| `src/controllers/homeServicesController.ts` | new: getPopularHomeServices; removed: getHomeServices,getPopularHomeServices,createHomeServiceBooking |
| `src/controllers/homepageController.ts` | changes: import { isValidRegion, RegionId, DEFAULT_REGION } from '../services/regionServi |
| `src/controllers/insuranceController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/leaderboardController.ts` | changes: const period = (req.query.period as 'day' \| 'week' \| 'month' \| 'all') \|\| 'month' |
| `src/controllers/learningController.ts` | changes: const userId = (req as any).userId; |
| `src/controllers/locationController.ts` | changes: import { |
| `src/controllers/lockDealController.ts` | changes: import { UserLockDeal, IUserLockDeal } from '../models/UserLockDeal'; |
| `src/controllers/loyaltyController.ts` | changes: import { |
| `src/controllers/loyaltyRedemptionController.ts` | changes: import { sendSuccess, sendError } from '../utils/response'; |
| `src/controllers/mallAffiliateController.ts` | changes: import crypto from 'crypto'; |
| `src/controllers/mallController.ts` | changes: import { |
| `src/controllers/menuController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/merchant/cashbackController.ts` | changes: import { AppError } from '../../middleware/errorHandler'; |
| `src/controllers/merchant/orderController.ts` | changes: import mongoose, { Types } from 'mongoose'; |
| `src/controllers/merchant/socialImpactController.ts` | changes: import { sendSuccess, sendNotFound, sendBadRequest, sendInternalError } from '.. |
| `src/controllers/merchant/socialMediaController.ts` | changes: import { Wallet } from '../../models/Wallet'; |
| `src/controllers/merchantNotificationController.ts` | changes: } catch (error) { |
| `src/controllers/messagingController.ts` | changes: const userId = (req as any).userId; |
| `src/controllers/notificationController.ts` | changes: deletedAt: { $exists: false } |
| `src/controllers/offerCategoryController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/offerCommentController.ts` | changes: const userId = (req as any).user?.id \|\| (req as any).user?._id; |
| `src/controllers/offerController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/offersController.ts` | changes: import { |
| `src/controllers/offersPageController.ts` | changes: const { lat, lng, limit = 10 } = req.query; |
| `src/controllers/orderCancelController.ts` | changes: import { |
| `src/controllers/orderController.ts` | content drift |
| `src/controllers/orderCreateController.ts` | changes: import { |
| `src/controllers/orderQueryController.ts` | changes: import { |
| `src/controllers/orderTrackingController.ts` | changes: } catch (error) { |
| `src/controllers/orderUpdateController.ts` | changes: import { |
| `src/controllers/outletController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/partnerController.ts` | changes: const userId = req.user?.id; |
| `src/controllers/paymentController.ts` | changes: sendUnauthorized |
| `src/controllers/paymentMethodController.ts` | changes: import { PaymentMethod, IPaymentMethod } from '../models/PaymentMethod'; |
| `src/controllers/photoUploadController.ts` | changes: const userId = (req as any).user?.id \|\| (req as any).user?._id; |
| `src/controllers/platformController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/playEarnController.ts` | changes: const userId = (req as any).userId; |
| `src/controllers/pollController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/priceTrackingController.ts` | changes: const { productId } = req.params; |
| `src/controllers/priveConciergeController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/priveController.ts` | new: getPriveOfferById,getVoucherById; removed: getPriveOfferById,getVoucherById |
| `src/controllers/priveInviteController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/priveMissionController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/productComparisonController.ts` | changes: import { |
| `src/controllers/productController.ts` | removed: createProduct,updateProduct |
| `src/controllers/profileController.ts` | changes: import { uploadProfileImage } from '../middleware/upload'; |
| `src/controllers/programController.ts` | changes: data: programs |
| `src/controllers/projectController.ts` | changes: import achievementService from '../services/achievementService'; |
| `src/controllers/promoCodeController.ts` | changes: const userId = req.user?._id \|\| req.user?.id; |
| `src/controllers/razorpayController.ts` | changes: import { User } from '../models/User'; |
| `src/controllers/rechargeController.ts` | removed: handleRazorpayWebhook,getRechargeHistory,getRechargeDetails |
| `src/controllers/recommendationController.ts` | changes: import { |
| `src/controllers/referralController.ts` | removed: getMyReferralCode,applyReferralCode |
| `src/controllers/referralTierController.ts` | changes: import { Types } from 'mongoose'; |
| `src/controllers/reviewController.ts` | changes: import { |
| `src/controllers/scratchCardController.ts` | changes: import { Wallet } from '../models/Wallet'; |
| `src/controllers/searchController.ts` | changes: import { sendSuccess, sendError, sendBadRequest, sendCreated, sendNotFound } fro |
| `src/controllers/securityController.ts` | changes: import { sendSuccess, sendError } from '../utils/response'; |
| `src/controllers/serviceAppointmentController.ts` | removed: markNoShow,addTreatmentNotes,updateAppointment |
| `src/controllers/serviceBookingController.ts` | new: rateBooking,getAvailableSlots; removed: completeBooking,rateBooking,getAvailableSlots |
| `src/controllers/serviceCategoryController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/serviceController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/shareController.ts` | changes: data: content |
| `src/controllers/smartSpendController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/socialMediaController.ts` | changes: import { Wallet } from '../models/Wallet'; |
| `src/controllers/socialProofController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/specialProgramController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/sponsorController.ts` | changes: import { Request, Response } from 'express'; |
| `src/controllers/statsController.ts` | changes: import { |
| `src/controllers/stockController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/stockNotificationController.ts` | changes: } catch (error) { |
| `src/controllers/storeController.ts` | content drift |
| `src/controllers/storeCrudController.ts` | removed: getStoreDetailFull |
| `src/controllers/storePaymentController.ts` | new: generateStoreQR,regenerateQR,getStoreQRDetails; removed: getPaymentSettings,updatePaymentSettings,getStorePaymentOffers |
| `src/controllers/storeQueryController.ts` | changes: import { |
| `src/controllers/storeSearchController.ts` | changes: import { |
| `src/controllers/storeVisitController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/storeVoucherController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/subscriptionController.ts` | changes: import { Subscription, SubscriptionTier, BillingCycle, ISubscriptionBenefits } f |
| `src/controllers/surveyController.ts` | changes: limit: limit ? parseInt(limit as string) : undefined, |
| `src/controllers/tableBookingController.ts` | changes: import { |
| `src/controllers/tableSessionController.ts` | changes: import crypto from 'crypto'; |
| `src/controllers/tournamentController.ts` | changes: status as any, |
| `src/controllers/transferController.ts` | changes: import { sendSuccess, sendError, sendBadRequest } from '../utils/response'; |
| `src/controllers/travelServicesController.ts` | changes: const hotelsCategory = travelCategories.find(c => { |
| `src/controllers/travelWebhookController.ts` | removed: handleOtaBookingConfirmed,handleOtaStayCompleted |
| `src/controllers/ugcController.ts` | changes: const userId = (req as any).user?.id \|\| (req as any).user?._id; |
| `src/controllers/userBootController.ts` | changes: Wallet.findOne({ user: userObjectId }) |
| `src/controllers/userProductController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/userSettingsController.ts` | changes: import crypto from 'crypto'; |
| `src/controllers/verificationController.ts` | changes: const VERIFICATION_CONFIGS: Record<string, { |
| `src/controllers/videoController.ts` | changes: import { |
| `src/controllers/voucherController.ts` | changes: import mongoose from 'mongoose'; |
| `src/controllers/walletBalanceController.ts` | new: getWalletLimits,updateWalletLimits,createMoneyRequest; removed: grantWelcomeCoins,getRezCashIdentity |
| `src/controllers/walletController.ts` | changes: getWalletLimits, |
| `src/controllers/walletPaymentController.ts` | changes: const userId = (req as any).userId; |
| `src/controllers/walletTransactionController.ts` | changes: *         name: dateFrom |
| `src/controllers/webhookController.ts` | changes: import { sendSuccess, sendBadRequest, sendUnauthorized } from '../utils/response |
| `src/controllers/whatsNewController.ts` | changes: import { logger } from '../config/logger'; |
| `src/controllers/wishlistController.ts` | changes: sendSuccess(res, { |

### Services (src/services/ + src/merchantservices/) — 126 files

| File | Summary |
|------|---------|
| `src/merchantservices/AnalyticsService.ts` | changes: import { Store } from '../models/Store'; |
| `src/merchantservices/BusinessMetrics.ts` | changes: * Get all store IDs belonging to a merchant |
| `src/merchantservices/CacheService.ts` | changes: deletes: 0 |
| `src/merchantservices/CrossAppSyncService.ts` | changes: import { RealTimeService } from './RealTimeService'; |
| `src/merchantservices/DocumentVerificationService.ts` | changes: * OCR document extraction (Placeholder for future implementation) |
| `src/merchantservices/IntegrationTestService.ts.disabled` | new: TestResult,IntegrationTestSuite,IntegrationTestService; removed: TestResult,IntegrationTestSuite,IntegrationTestService |
| `src/merchantservices/OnboardingService.ts` | changes: stepData: {} |
| `src/merchantservices/RealTimeService.ts` | changes: type: 'order_created' \| 'order_updated' \| 'cashback_created' \| 'cashback_updated |
| `src/merchantservices/ReportService.ts` | changes: this.reportInterval = setInterval(() => { |
| `src/merchantservices/SyncService.ts` | changes: import { ProductModel, MProduct } from '../models/MerchantProduct'; |
| `src/merchantservices/bulkImportService.ts` | changes: defval: '' // Default value for empty cells |
| `src/services/ActivityTimelineService.ts` | changes: static async getTodayActivities( |
| `src/services/AuditAlertService.ts` | changes: notification: { email: true, sms: false } |
| `src/services/BulkProductService.ts` | changes: value: row.name |
| `src/services/CloudinaryService.ts` | changes: import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'; |
| `src/services/EmailService.ts` | removed: getEmailCircuitState |
| `src/services/InvoiceService.ts` | changes: private static addFooter(doc: PDFKit.PDFDocument, data: InvoiceData): void { |
| `src/services/MerchantUserSyncService.ts` | changes: 'restaurant': 'food-dining', |
| `src/services/MetricsService.ts` | removed: MetricsService |
| `src/services/PaymentService.ts` | new: new; removed: new |
| `src/services/QueueService.ts` | changes: * Uses Bull queue with Redis for reliable background job processing |
| `src/services/SMSService.ts` | changes: * Send SMS |
| `src/services/ScheduledJobService.ts` | changes: * Migrates all node-cron jobs to Bull repeatable jobs for better reliability, |
| `src/services/TeamInvitationService.ts` | changes: import crypto from 'crypto'; |
| `src/services/achievementEngine.ts` | changes: RepeatabilityType |
| `src/services/achievementService.ts` | changes: totalSpent: { $sum: '$totalPrice' } |
| `src/services/adminActionService.ts` | changes: async getPendingActions( |
| `src/services/adminTotpService.ts` | changes: import crypto from 'crypto'; |
| `src/services/adminWalletService.ts` | changes: * Credit 5% commission from an order to the admin wallet |
| `src/services/bbpsService.ts` | changes: * BBPSService — Razorpay BillPay API integration |
| `src/services/bonusCampaignService.ts` | new: getActiveCampaigns; removed: getActiveCampaigns,invalidateBonusZoneCacheAsync |
| `src/services/cashbackService.ts` | changes: import { Types } from 'mongoose'; |
| `src/services/challengeService.ts` | changes: import { Wallet } from '../models/Wallet'; |
| `src/services/coinService.ts` | new: getAllCategoryBalances,getUserCoinRank; removed: getAllCategoryBalances,getUserCoinRank |
| `src/services/couponService.ts` | changes: import { Coupon, ICoupon } from '../models/Coupon'; |
| `src/services/couponValidationService.ts` | new: validateCouponForCart,markCouponAsUsed; removed: validateCouponForCart,markCouponAsUsed |
| `src/services/creatorService.ts` | new: suspendCreator,deleteMyPick; removed: suspendCreator,deleteMyPick |
| `src/services/deviceFingerprintService.ts` | content drift |
| `src/services/disputeService.ts` | changes: import crypto from 'crypto'; |
| `src/services/diversityService.ts` | changes: const targetPerBucket = Math.ceil(products.length / ranges); |
| `src/services/earningsSocketService.ts` | changes: emitProjectStatusUpdate( |
| `src/services/engagementRewardService.ts` | changes: * Reward configurations for all engagement actions. |
| `src/services/entitlement/cashbackEngine.ts` | new: calculateCashbackFromPrivileges; removed: MAX_EFFECTIVE_CASHBACK_RATE_PCT,CASHBACK_BASE_RATE_DEFAULT,COINS_PER_RUPEE |
| `src/services/entitlement/privilegeResolutionService.ts` | changes: import PriveAccess from '../../models/PriveAccess'; |
| `src/services/etaService.ts` | changes: const STATUS_BASE_TIMES: Record<string, number> = { |
| `src/services/eventRewardService.ts` | changes: metadata?: Record<string, any> |
| `src/services/eventService.ts` | changes: query.category = new RegExp(filters.category, 'i'); |
| `src/services/eventStreamService.ts` | changes: import type { ActivityEvent, ActivityEventType } from '../events/gamificationEve |
| `src/services/exportService.ts` | changes: import { Job } from 'bull'; |
| `src/services/featureFlagService.ts` | removed: startFeatureFlagInvalidationSubscriber,isFeatureEnabledForMerchant,invalidateMerchantFlagCache |
| `src/services/flashSaleService.ts` | changes: import stripeService from './stripeService'; |
| `src/services/followerAnalyticsService.ts` | changes: import { Store } from '../models/Store'; |
| `src/services/followerNotificationService.ts` | changes: import { Product } from '../models/Product'; |
| `src/services/fraudDetectionService.ts` | changes: import crypto from 'crypto'; |
| `src/services/gameService.ts` | changes: { type: 'coins', value: 1000, weight: 2, description: 'JACKPOT - 1000 Coins!' } |
| `src/services/gamificationSocketService.ts` | changes: if (!tournamentId) return; |
| `src/services/geocodingService.ts` | changes: throw new Error('Failed to get address from coordinates'); |
| `src/services/homepageService.ts` | changes: import { regionService, RegionId, isValidRegion, DEFAULT_REGION } from './region |
| `src/services/integrationService.ts` | changes: throw new Error(`No active integration found for provider=${provider}, merchantE |
| `src/services/leaderboardSecurityService.ts` | changes: async runAntifraudChecks( |
| `src/services/leaderboardService.ts` | changes: LeaderboardType |
| `src/services/learningService.ts` | changes: import LearningContent, { ILearningContent } from '../models/LearningContent'; |
| `src/services/ledgerService.ts` | changes: import mongoose, { ClientSession, Types } from 'mongoose'; |
| `src/services/liabilityService.ts` | changes: const { merchantId, storeId, campaignId, amount, referenceId, session } = params |
| `src/services/logging/authLogger.ts` | changes: import { createServiceLogger, sanitizeLog } from '../../config/logger'; |
| `src/services/logging/paymentLogger.ts` | changes: import { createServiceLogger, sanitizeLog } from '../../config/logger'; |
| `src/services/mallAffiliateService.ts` | changes: import { toPaise, pct } from '../utils/currency'; |
| `src/services/mallService.ts` | changes: async trackBrandClick(brandId: string, userId?: string): Promise<void> { |
| `src/services/merchantNotificationService.ts` | changes: import { Store } from '../models/Store'; |
| `src/services/merchantWalletService.ts` | changes: import { Types } from 'mongoose'; |
| `src/services/nearbyEarnService.ts` | changes: import mongoose from 'mongoose'; |
| `src/services/notificationService.ts` | changes: import pushNotificationService from './pushNotificationService'; |
| `src/services/ocrService.ts` | changes: } else if ( |
| `src/services/offerService.ts` | changes: userId: string |
| `src/services/offersPageService.ts` | changes: async function fetchRecommendedOffers(limit: number, userId?: string): Promise<a |
| `src/services/orderSocketService.ts` | removed: OrderAlertPayload,OrderETAUpdatedPayload |
| `src/services/partnerBenefitsService.ts` | changes: import { Wallet } from '../models/Wallet'; |
| `src/services/partnerLevelMaintenanceService.ts` | changes: const expiredPartners = await Partner.find({ |
| `src/services/partnerService.ts` | changes: import Partner, { IPartner, PARTNER_LEVELS } from '../models/Partner'; |
| `src/services/paymentGatewayService.ts` | changes: import crypto from 'crypto'; |
| `src/services/pickApprovalService.ts` | new: merchantRejectPick,getMerchantPendingPickCount; removed: merchantRejectPick,getMerchantPendingPickCount |
| `src/services/priveAccessService.ts` | changes: import PriveAccess, { IPriveAccess, PriveGrantMethod, PriveAuditAction } from '. |
| `src/services/priveInviteService.ts` | changes: async generateCode( |
| `src/services/priveMissionService.ts` | changes: const claimed = await UserMission.find({ userId: new Types.ObjectId(userId) }).s |
| `src/services/priveNotificationService.ts` | changes: import { PriveMission } from '../models/PriveMission'; |
| `src/services/programService.ts` | changes: async getProgramsByType( |
| `src/services/promoCodeService.ts` | changes: import { SubscriptionTier, BillingCycle, Subscription } from '../models/Subscrip |
| `src/services/pushNotificationService.ts` | changes: import Expo, { ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-ser |
| `src/services/qrCodeService.ts` | new: toDataURL,toFile,toString |
| `src/services/quizService.ts` | changes: import { CoinTransaction } from '../models/CoinTransaction'; |
| `src/services/razorpayService.ts` | new: validateWebhookSignature; removed: validateWebhookSignature,checkRazorpayHealth,fetchRazorpayOrder |
| `src/services/razorpaySubscriptionService.ts` | changes: import crypto from 'crypto'; |
| `src/services/recommendationService.ts` | changes: const { |
| `src/services/reconciliationService.ts` | changes: const driftPercentage = actual > 0 ? (drift / actual) * 100 : (drift > 0 ? 100 : |
| `src/services/redisService.ts` | changes: import { createClient, RedisClientType } from 'redis'; |
| `src/services/referralAnalyticsService.ts` | changes: const [ |
| `src/services/referralFraudDetection.ts` | changes: HIGH: 80 |
| `src/services/referralService.ts` | changes: import { Types } from 'mongoose'; |
| `src/services/referralTierService.ts` | changes: import crypto from 'crypto'; |
| `src/services/refundService.ts` | changes: import crypto from 'crypto'; |
| `src/services/reorderService.ts` | changes: import { Product } from '../models/Product'; |
| `src/services/reputationService.ts` | changes: thresholds: pc.tierThresholds as { entryTier: number; signatureTier: number; eli |
| `src/services/reservationService.ts` | new: new; removed: new |
| `src/services/scratchCardService.ts` | changes: import { CoinTransaction } from '../models/CoinTransaction'; |
| `src/services/shareService.ts` | changes: purchase: { baseCoins: 0, clickBonus: 0, conversionBonus: 0, sharePercentage: 0. |
| `src/services/socialImpactService.ts` | changes: import crypto from 'crypto'; |
| `src/services/specialProgramService.ts` | changes: import SpecialProgramConfig, { |
| `src/services/spinWheelCouponAssignment.ts` | changes: isActive: true |
| `src/services/spinWheelService.ts` | new: getSpinHistory; removed: getSpinHistory |
| `src/services/sponsorService.ts` | changes: import mongoose from 'mongoose'; |
| `src/services/stockAuditService.ts` | changes: variant?: { type: string; value: string } |
| `src/services/stockNotificationService.ts` | changes: const product = await Product.findById(productId).lean() as any; |
| `src/services/stockSocketService.ts` | changes: import { |
| `src/services/streakService.ts` | removed: isSameISTDay,isNextISTDay |
| `src/services/stripeService.ts` | changes: const session = await this.stripe.checkout.sessions.create({ |
| `src/services/subscriptionBenefitsService.ts` | changes: import { User, IUser } from '../models/User'; |
| `src/services/surveyService.ts` | new: getUserSurveyHistory; removed: getUserSurveyHistory |
| `src/services/tournamentService.ts` | changes: import { Wallet } from '../models/Wallet'; |
| `src/services/travelCashbackService.ts` | changes: logger.info(`⚠️ [TRAVEL-CASHBACK] Booking ${booking.bookingNumber} already in ca |
| `src/services/userProductService.ts` | changes: import { Product } from '../models/Product'; |
| `src/services/voucherRedemptionService.ts` | changes: import crypto from 'crypto'; |
| `src/services/walletCacheService.ts` | changes: import { walletCacheOps } from '../config/walletMetrics'; |
| `src/services/walletFeatureService.ts` | changes: let flagCache: Map<string, { enabled: boolean; cachedAt: number }> = new Map(); |
| `src/services/walletService.ts` | changes: import mongoose, { ClientSession, Types } from 'mongoose'; |
| `src/services/walletVelocityService.ts` | changes: operation: 'transfer' \| 'gift' \| 'spend' \| 'partner_claim' |
| `src/services/webhookSecurityAlertService.ts` | new: sendSecurityAlert,getRecentAlerts,getAlertsBySeverity; removed: sendSecurityAlert,getRecentAlerts,getAlertsBySeverity |

### Models (src/models/) — 138 files

| File | Summary |
|------|---------|
| `src/models/Achievement.ts` | changes: SUPER_USER = 'SUPER_USER' |
| `src/models/Address.ts` | new: Address; removed: Address |
| `src/models/AdminAuditLog.ts` | content drift |
| `src/models/AdminWallet.ts` | new: IAdminWalletTransaction |
| `src/models/AffiliateWebhookLog.ts` | changes: processingTime: number;  // milliseconds |
| `src/models/AnalyticsEvent.ts` | content drift |
| `src/models/ArchivedActivity.ts` | changes: const ArchivedActivitySchema = new Schema<IArchivedActivity>({ |
| `src/models/AuditLog.ts` | changes: const AuditLogSchema = new Schema<IAuditLog>({ |
| `src/models/BankOffer.ts` | changes: import mongoose, { Document, Schema, Model } from 'mongoose'; |
| `src/models/Bill.ts` | changes: const BillSchema = new Schema<IBill>({ |
| `src/models/BillPayment.ts` | changes: cashbackAmount: number; |
| `src/models/BillProvider.ts` | new: BillType; removed: BillType |
| `src/models/BonusCampaign.ts` | new: BonusCampaignStatus; removed: BonusCampaignStatus |
| `src/models/BonusClaim.ts` | changes: const TransactionRefSchema = new Schema({ |
| `src/models/Campaign.ts` | changes: region?: 'bangalore' \| 'dubai' \| 'all'; // Region restriction - 'all' means avai |
| `src/models/Cart.ts` | changes: lockFee?: number;                    // Amount paid to lock |
| `src/models/Cashback.ts` | changes: import { |
| `src/models/ChallengeAnalytics.ts` | new: ChallengeAnalyticsEvent; removed: ChallengeAnalyticsEvent |
| `src/models/CoinDrop.ts` | changes: import mongoose, { Document, Schema, Model } from 'mongoose'; |
| `src/models/CoinGift.ts` | changes: coinType: 'nuqta' \| 'promo'; |
| `src/models/CoinTransaction.ts` | new: MainCategorySlug,CoinTransaction; removed: MainCategorySlug,CoinTransaction |
| `src/models/Consultation.ts` | changes: const random = Math.random().toString(36).substring(2, 8).toUpperCase(); |
| `src/models/Conversation.ts` | changes: BLOCKED = 'BLOCKED' |
| `src/models/Coupon.ts` | new: Coupon; removed: ICouponDocument,ICouponModel,Coupon |
| `src/models/CreatorConversion.ts` | new: CreatorConversion; removed: CreatorConversion |
| `src/models/CreatorProfile.ts` | new: CreatorCategory; removed: CreatorCategory |
| `src/models/DailyCheckIn.ts` | changes: index: true, |
| `src/models/DealRedemption.ts` | changes: usedByMerchantId?: Types.ObjectId;  // Which merchant marked it as used |
| `src/models/Dispute.ts` | changes: 'open', 'under_review', 'escalated', |
| `src/models/DoubleCashbackCampaign.ts` | changes: import mongoose, { Document, Schema, Model } from 'mongoose'; |
| `src/models/EarningConfig.ts` | changes: const EarningConfigSchema = new Schema({ |
| `src/models/EmergencyContact.ts` | changes: type: 'ambulance' \| 'hospital' \| 'blood_bank' \| 'fire' \| 'police' \| 'poison_cont |
| `src/models/EngagementRewardLog.ts` | content drift |
| `src/models/Event.ts` | changes: const EventSlotSchema = new Schema<IEventSlot>({ |
| `src/models/EventBooking.ts` | changes: status: 'pending' \| 'confirmed' \| 'cancelled' \| 'completed' \| 'refunded'; |
| `src/models/EventReview.ts` | changes: index: true, |
| `src/models/EventRewardConfig.ts` | changes: \| 'entry_reward'        // Coins earned on successful booking/entry |
| `src/models/ExclusiveZone.ts` | changes: import mongoose, { Document, Schema, Model } from 'mongoose'; |
| `src/models/Favorite.ts` | changes: getUserFavorites(userId: string, page?: number, limit?: number): Promise<{ |
| `src/models/FeatureFlag.ts` | new: FeatureFlagScope,mongoose; removed: mongoose |
| `src/models/FlashSale.ts` | changes: products: [{ |
| `src/models/FlashSalePurchase.ts` | changes: import crypto from 'crypto'; |
| `src/models/FriendRedemption.ts` | changes: import mongoose, { Document, Schema, Model } from 'mongoose'; |
| `src/models/GameSession.ts` | changes: index: true |
| `src/models/GiftCard.ts` | changes: import mongoose, { Schema, Document, Types } from 'mongoose'; |
| `src/models/GoldSavings.ts` | changes: { timestamps: true } |
| `src/models/HealthRecord.ts` | changes: const random = Math.random().toString(36).substring(2, 8).toUpperCase(); |
| `src/models/HomepageDealsItem.ts` | changes: regions: ('bangalore' \| 'dubai' \| 'all')[]; |
| `src/models/HomepageDealsSection.ts` | changes: regions: ('bangalore' \| 'dubai' \| 'all')[]; |
| `src/models/HotspotArea.ts` | changes: import mongoose, { Document, Schema, Model } from 'mongoose'; |
| `src/models/ImportJob.ts` | new: ImportJob; removed: ImportJob |
| `src/models/LeaderboardConfig.ts` | removed: LeaderboardScopeType |
| `src/models/LedgerEntry.ts` | new: LedgerCoinType; removed: LedgerCoinType |
| `src/models/LockPriceDeal.ts` | changes: region: 'bangalore' \| 'dubai' \| 'all'; |
| `src/models/LoyaltyMilestone.ts` | changes: import mongoose, { Document, Schema, Model } from 'mongoose'; |
| `src/models/MallAffiliateClick.ts` | changes: import crypto from 'crypto'; |
| `src/models/MallBrand.ts` | changes: isDeleted: boolean; |
| `src/models/MallPurchase.ts` | new: MallPurchase; removed: MallPurchase |
| `src/models/Menu.ts` | removed: IMenuItemVariant,IMenuItemModifier |
| `src/models/Merchant.ts` | changes: tier?: 'free' \| 'pro' \| 'enterprise'; |
| `src/models/MerchantOrder.ts` | changes: import { |
| `src/models/MerchantProduct.ts` | changes: return await MProduct.find(query).sort({ createdAt: -1 }); |
| `src/models/MerchantUser.ts` | new: MerchantUserRole; removed: MerchantUserRole |
| `src/models/MerchantWallet.ts` | changes: import { logger } from '../config/logger'; |
| `src/models/MiniGame.ts` | changes: index: true |
| `src/models/Notification.ts` | new: Notification; removed: Notification |
| `src/models/OTPLog.ts` | changes: trim: true |
| `src/models/Offer.ts` | new: Offer; removed: Offer |
| `src/models/OfferRedemption.ts` | new: OfferRedemption; removed: OfferRedemption |
| `src/models/OffersSectionConfig.ts` | changes: sectionKey: { type: String, required: true, unique: true, index: true }, |
| `src/models/Order.ts` | new: Order; removed: Order |
| `src/models/Partner.ts` | changes: 'Cannot be combined with other offers' |
| `src/models/PartnerEarningsSnapshot.ts` | changes: userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true |
| `src/models/Payment.ts` | changes: status: 'pending' \| 'processing' \| 'completed' \| 'failed' \| 'cancelled' \| 'expir |
| `src/models/PendingCoinReward.ts` | changes: source: 'purchase_bonus' \| 'social_media_post' \| 'review_bonus' \| 'referral_bonu |
| `src/models/PreOrder.ts` | changes: const PreOrderItemSchema = new Schema<IPreOrderItem>({ |
| `src/models/PriceAlert.ts` | changes: index: true, |
| `src/models/PriveCampaign.ts` | new: CampaignTaskType,CampaignStatus,PriveTier; removed: CampaignStatus,CampaignType,PriveCampaign |
| `src/models/PriveInviteCode.ts` | changes: import crypto from 'crypto'; |
| `src/models/PriveOffer.ts` | changes: canRedeem(userId: Types.ObjectId): Promise<{ canRedeem: boolean; reason?: string |
| `src/models/PrivePostSubmission.ts` | new: PrivePostSubmission; removed: SubmissionStatus |
| `src/models/PriveVoucher.ts` | changes: import crypto from 'crypto'; |
| `src/models/ProcessedWebhookEvent.ts` | changes: import mongoose, { Schema, Document, Types } from 'mongoose'; |
| `src/models/Product.ts` | removed: IProductGST,IModifierOption,IModifier |
| `src/models/ProgramMembership.ts` | new: ProgramMembership; removed: ProgramMembership |
| `src/models/Project.ts` | new: Project; removed: Project |
| `src/models/PromoCode.ts` | changes: incrementUsage(userId: Types.ObjectId \| string, subscriptionId: Types.ObjectId \| |
| `src/models/RechargeOperator.ts` | changes: { _id: true } |
| `src/models/Referral.ts` | changes: PENDING = 'pending',      // Referee signed up, no order yet |
| `src/models/Refund.ts` | changes: const RefundSchema = new Schema<IRefund>({ |
| `src/models/Review.ts` | new: Review; removed: Review |
| `src/models/ScratchCard.ts` | changes: const ScratchCardPrizeSchema = new Schema<IScratchCardPrize>({ |
| `src/models/ServiceAppointment.ts` | new: ServiceAppointment; removed: ITreatmentNotes,IRecurrence,IAdditionalService |
| `src/models/ServiceBooking.ts` | new: ServiceBooking; removed: ServiceBooking |
| `src/models/ServiceRequest.ts` | changes: const TechnicianSchema = new Schema({ |
| `src/models/Share.ts` | changes: orderId?: mongoose.Types.ObjectId;  // For purchase shares |
| `src/models/SpecialProfile.ts` | changes: import mongoose, { Document, Schema, Model } from 'mongoose'; |
| `src/models/SpecialProgramConfig.ts` | new: SpecialProgramSlug; removed: SpecialProgramSlug |
| `src/models/SpinWheel.ts` | new: SpinWheelConfig,SpinWheelSpin,UserSpinMetrics; removed: SpinWheelConfig,SpinWheelSpin,UserSpinMetrics |
| `src/models/StockHistory.ts` | changes: \| 'purchase'           // Customer purchase (deduction) |
| `src/models/Store.ts` | new: Store; removed: IStorePromotion,Store |
| `src/models/StoreAnalytics.ts` | new: StoreAnalytics; removed: StoreAnalytics |
| `src/models/StoreCollectionConfig.ts` | changes: categoryKey: { type: String, required: true, unique: true, index: true }, |
| `src/models/StoreExperience.ts` | changes: enum: ['bangalore', 'dubai'], |
| `src/models/StorePayment.ts` | new: StorePayment; removed: ILineItem,IGstDetails,StorePayment |
| `src/models/StoreVisit.ts` | changes: QUEUE = 'queue' |
| `src/models/StoreVoucher.ts` | changes: import crypto from 'crypto'; |
| `src/models/Subscription.ts` | changes: billingCycle: BillingCycle |
| `src/models/SubscriptionUpgrade.ts` | changes: index: true, |
| `src/models/SupportMacro.ts` | changes: const SupportMacroSchema = new Schema<ISupportMacro>({ |
| `src/models/SupportTicket.ts` | changes: category: 'order' \| 'payment' \| 'product' \| 'account' \| 'technical' \| 'delivery' |
| `src/models/SurpriseCoinDrop.ts` | new: SurpriseCoinDrop; removed: SurpriseCoinDrop |
| `src/models/SurveySession.ts` | new: SurveySession; removed: SurveySession |
| `src/models/TableBooking.ts` | new: TableBooking; removed: TableBooking |
| `src/models/TableSession.ts` | removed: ITableSessionItem |
| `src/models/Transaction.ts` | new: Transaction; removed: Transaction |
| `src/models/TransactionAuditLog.ts` | new: logTransaction; removed: logTransaction |
| `src/models/Transfer.ts` | new: TransferCoinType; removed: TransferCoinType |
| `src/models/UploadBillStore.ts` | changes: import mongoose, { Document, Schema, Model } from 'mongoose'; |
| `src/models/User.ts` | new: User; removed: User |
| `src/models/UserCashback.ts` | new: UserCashback; removed: IUserCashbackModel,UserCashback |
| `src/models/UserChallengeProgress.ts` | changes: index: true |
| `src/models/UserCoupon.ts` | new: UserCoupon; removed: IUserCouponModel,UserCoupon |
| `src/models/UserLockDeal.ts` | new: UserLockDeal; removed: UserLockDeal |
| `src/models/UserLoyalty.ts` | new: MainCategorySlug; removed: MainCategorySlug |
| `src/models/UserMission.ts` | changes: const UserMissionSchema = new Schema<IUserMission>({ |
| `src/models/UserOfferInteraction.ts` | changes: trackInteraction(userId: Types.ObjectId, offerId: Types.ObjectId, action: string |
| `src/models/UserReputation.ts` | changes: trust: 0.20, |
| `src/models/UserSettings.ts` | new: UserSettings; removed: UserSettings |
| `src/models/UserStreak.ts` | changes: index: true |
| `src/models/VerifiedInstitution.ts` | changes: ref: 'AdminUser', |
| `src/models/Video.ts` | changes: addComment(userId: string, content: string): Promise<void>; |
| `src/models/Voucher.ts` | changes: category: 'shopping' \| 'food' \| 'travel' \| 'entertainment' \| 'lifestyle' \| 'elec |
| `src/models/Wallet.ts` | new: CoinType,Wallet; removed: Wallet |
| `src/models/WalletConfig.ts` | new: ICoinManagementConfig; removed: IPlatformSettings |
| `src/models/WhatsNewStoryView.ts` | changes: const WhatsNewStoryViewSchema = new Schema<IWhatsNewStoryView>({ |
| `src/models/Wishlist.ts` | new: Wishlist; removed: Wishlist |
| `src/models/index.ts` | changes: export { PriveCampaign } from './PriveCampaign'; |

### Middleware (src/middleware/) — 22 files

| File | Summary |
|------|---------|
| `src/middleware/adminAuditMiddleware.ts` | changes: 'merchants': 'merchant', |
| `src/middleware/auth.ts` | new: isTokenBlacklisted,verifyRefreshToken,protect; removed: isTokenBlacklisted,verifyMerchantToken,verifyRefreshToken |
| `src/middleware/corsConfig.ts` | changes: import cors, { CorsOptions } from 'cors'; |
| `src/middleware/csrf.ts` | changes: import crypto from 'crypto'; |
| `src/middleware/errorHandler.ts` | new: globalErrorHandler,withErrorLogging; removed: globalErrorHandler,withErrorLogging |
| `src/middleware/errorLogger.ts` | new: notFoundHandler,globalErrorHandler; removed: notFoundHandler,globalErrorHandler |
| `src/middleware/exclusiveOfferMiddleware.ts` | new: getUserFollowedStores,addFollowerContext,filterExclusiveOffers; removed: getUserFollowedStores,addFollowerContext,filterExclusiveOffers |
| `src/middleware/ipBlocker.ts` | changes: error: 'Your IP has been blocked due to suspicious activity. Please contact supp |
| `src/middleware/logging.ts` | changes: logger.info(`Incoming request: ${req.method} ${req.path}`, { |
| `src/middleware/merchantauth.ts` | removed: blacklistMerchantToken,isMerchantTokenBlacklisted |
| `src/middleware/orderOwnership.ts` | new: verifyOrderOwnership; removed: verifyOrderOwnership |
| `src/middleware/partnerValidation.ts` | new: handleValidationErrors,sanitizeRequestBody; removed: handleValidationErrors,sanitizeRequestBody |
| `src/middleware/qrAbuseProtection.ts` | removed: qrRewardCooldown,markQrRewardClaimed |
| `src/middleware/rateLimiter.ts` | new: profileUpdateLimiter,financialLimiter; removed: otpPerIpLimiter,verifyOtpLimiter,bulkLimiter |
| `src/middleware/rbac.ts` | removed: requireMerchantAdmin |
| `src/middleware/sanitization.ts` | new: sanitizeProductText; removed: sanitizeProductText |
| `src/middleware/securityHeaders.ts` | changes: imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://via. |
| `src/middleware/upload.ts` | changes: cloudinary.api.ping() |
| `src/middleware/uploadSecurity.ts` | changes: import { fromBuffer } from 'file-type'; |
| `src/middleware/validation.ts` | changes: const stripHtmlTags = (value: string): string => { |
| `src/middleware/webhookAuth.ts` | new: webhookAuth,webhookRateLimit,demoWebhookAuth; removed: webhookAuth,webhookRateLimit,demoWebhookAuth |
| `src/middleware/webhookSecurity.ts` | new: razorpayIPWhitelist,validateWebhookPayload,logWebhookSecurityEvent; removed: razorpayIPWhitelist,validateWebhookPayload,logWebhookSecurityEvent |

### Routes (src/routes/ + src/merchantroutes/) — 254 files

| File | Summary |
|------|---------|
| `src/merchantroutes/analytics.ts` | changes: import { exportQueue, isRedisAvailable } from '../config/queue.config'; |
| `src/merchantroutes/audit.ts` | changes: page: req.query.page ? parseInt(req.query.page as string) : 1, |
| `src/merchantroutes/auth.ts` | new: router; removed: router |
| `src/merchantroutes/bulk.ts` | changes: const storage = multer.memoryStorage(); |
| `src/merchantroutes/bulkImport.ts` | changes: const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); |
| `src/merchantroutes/cashback.ts` | changes: CashbackStatus |
| `src/merchantroutes/categories.ts` | changes: import { validateRequest, validateQuery, validateParams } from '../middleware/me |
| `src/merchantroutes/coins.ts` | changes: router.post('/award', async (req: Request, res: Response) => { |
| `src/merchantroutes/dashboard.ts` | new: router; removed: router |
| `src/merchantroutes/discounts.ts` | changes: cardBins: Joi.array().items(Joi.string().regex(/^\d{6}$/)).optional(), |
| `src/merchantroutes/disputes.ts` | changes: import { Types } from 'mongoose'; |
| `src/merchantroutes/events.ts` | changes: bookedCount: Joi.number().min(0).default(0) |
| `src/merchantroutes/liability.ts` | changes: totalIssued: 0, totalRedeemed: 0, totalPending: 0, totalSettled: 0, |
| `src/merchantroutes/merchant-profile.ts` | new: router; removed: router |
| `src/merchantroutes/offers.ts` | changes: import { IOffer } from '../models/Offer'; |
| `src/merchantroutes/onboarding.ts` | changes: const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); |
| `src/merchantroutes/product-restore.ts` | changes: id: Joi.string().required() |
| `src/merchantroutes/productGallery.ts` | changes: import ProductGallery, { IProductGallery } from '../models/ProductGallery'; |
| `src/merchantroutes/products.ts` | changes: productBulkLimiter |
| `src/merchantroutes/services.ts` | changes: interface MerchantRequest extends Request { |
| `src/merchantroutes/storeGallery.ts` | changes: import * as fs from 'fs'; |
| `src/merchantroutes/stores.ts` | changes: import { Wallet } from '../models/Wallet'; |
| `src/merchantroutes/support.ts` | changes: logger.error('[Merchant Support] Error listing tickets:', error.message); |
| `src/merchantroutes/sync.ts` | new: router; removed: router |
| `src/merchantroutes/team-public.ts` | changes: 'any.only': 'Passwords do not match' |
| `src/merchantroutes/team.ts` | changes: import bcrypt from 'bcryptjs'; |
| `src/merchantroutes/uploads.ts` | changes: const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`; |
| `src/merchantroutes/variants.ts` | changes: .map(([k, v]) => `${v}`) |
| `src/merchantroutes/voucherRedemptions.ts` | changes: import { Wallet } from '../models/Wallet'; |
| `src/merchantroutes/wallet.ts` | changes: message: 'Merchant ID required' |
| `src/routes/achievementRoutes.ts` | new: router; removed: router |
| `src/routes/activityFeedRoutes.ts` | content drift |
| `src/routes/activityRoutes.ts` | new: router; removed: router |
| `src/routes/addressRoutes.ts` | new: router; removed: router |
| `src/routes/admin/achievements.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/adminActions.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/adminUsers.ts` | changes: import { requireAuth, requireSeniorAdmin, requireSuperAdmin } from '../../middle |
| `src/routes/admin/adminWallet.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/auth.ts` | changes: import { generateToken, generateRefreshToken, verifyToken, authenticate, logoutA |
| `src/routes/admin/bankOffers.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/bbpsAdmin.ts` | changes: import { Router, Request, Response } from 'express'; |
| `src/routes/admin/bonusZone.ts` | content drift |
| `src/routes/admin/campaigns.ts` | changes: import { requireAuth, requireAdmin } from '../../middleware/auth'; |
| `src/routes/admin/cashStorePurchases.ts` | changes: import { MallPurchase, PurchaseStatus } from '../../models/MallPurchase'; |
| `src/routes/admin/categories.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/challenges.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/coinDrops.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/coinGifts.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/coinRewards.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/coupons.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/dailyCheckinConfig.ts` | changes: import { requireAuth, requireAdmin } from '../../middleware/auth'; |
| `src/routes/admin/dashboard.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/deviceFingerprint.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/disputes.ts` | changes: import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../../util |
| `src/routes/admin/doubleCampaigns.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/economics.ts` | changes: router.get('/overview', asyncHandler(async (_req: Request, res: Response) => { |
| `src/routes/admin/eventCategories.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/eventRewards.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/events.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/exclusiveZones.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/experiences.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/faq.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/featureFlags.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/flashSales.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/fraudReports.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/gameConfig.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/gamificationStats.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/giftCards.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/goldPrice.ts` | changes: }) |
| `src/routes/admin/homepageDeals.ts` | changes: regions: Joi.array().items(Joi.string().valid('bangalore', 'dubai', 'all')).opti |
| `src/routes/admin/hotspotAreas.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/index.ts` | changes: export { default as adminBulkWalletAdjustRoutes } from './bulkWalletAdjust'; |
| `src/routes/admin/instituteReferrals.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/institutions.ts` | changes: import { User } from '../../models/User'; |
| `src/routes/admin/integrations.ts` | changes: import crypto from 'crypto'; |
| `src/routes/admin/leaderboardConfig.ts` | changes: router.get('/stats', asyncHandler(async (_req: Request, res: Response) => { |
| `src/routes/admin/learningContent.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/loyalty.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/loyaltyMilestones.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/mallBrands.ts` | changes: (s) => s.optional() |
| `src/routes/admin/membership.ts` | changes: router.get('/plans', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/merchantLiability.ts` | changes: const logger = createServiceLogger('admin-merchant-liability'); |
| `src/routes/admin/merchantWallets.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/merchants.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/notificationManagement.ts` | changes: import { |
| `src/routes/admin/offers.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/offersSectionConfig.ts` | changes: { sectionKey: 'superCashbackStores', displayName: 'Super Cashback Stores', tab: |
| `src/routes/admin/orders.ts` | changes: import { calculatePromoCoinsEarned, calculatePromoCoinsWithTierBonus } from '../ |
| `src/routes/admin/partnerEarnings.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/priveAdmin.ts` | changes: import { sendSuccess } from '../../utils/response'; |
| `src/routes/admin/quickActions.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/referrals.ts` | content drift |
| `src/routes/admin/reviews.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/serviceAppointments.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/specialProfiles.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/specialPrograms.ts` | content drift |
| `src/routes/admin/storeCollectionConfig.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/stores.ts` | changes: router.get('/', validateQuery(adminStoreSearchSchema), asyncHandler(async (req: |
| `src/routes/admin/support.ts` | changes: router.get('/tickets', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/supportConfig.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/surpriseCoinDrops.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/system.ts` | changes: import { sendSuccess, sendError } from '../../utils/response'; |
| `src/routes/admin/tournaments.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/admin/travel.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/uploadBillStores.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/uploads.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/userWallets.ts` | changes: import mongoose from 'mongoose'; |
| `src/routes/admin/users.ts` | changes: router.get('/', validateQuery(adminUserSearchSchema), asyncHandler(async (req: R |
| `src/routes/admin/valueCards.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/vouchers.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/admin/walletConfig.ts` | changes: router.get('/', requireAdmin, asyncHandler(async (req: Request, res: Response) = |
| `src/routes/admin/zoneVerifications.ts` | changes: router.get('/', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/adminCreatorRoutes.ts` | content drift |
| `src/routes/adminExploreRoutes.ts` | changes: bulkUpdateVideos |
| `src/routes/analyticsRoutes.ts` | new: router; removed: router |
| `src/routes/articleRoutes.ts` | changes: incrementArticleShare |
| `src/routes/authRoutes.ts` | changes: uploadAvatar |
| `src/routes/billPaymentRoutes.ts` | changes: import { financialLimiter } from '../middleware/rateLimiter'; |
| `src/routes/billRoutes.ts` | changes: import { Router, Request, Response } from 'express'; |
| `src/routes/billSplitRoutes.ts` | changes: import { authenticate } from '../middleware/auth'; |
| `src/routes/billingRoutes.ts` | changes: import { |
| `src/routes/bonusZoneRoutes.ts` | content drift |
| `src/routes/campaignRoutes.ts` | changes: router.get('/', |
| `src/routes/cartRoutes.ts` | new: router; removed: router |
| `src/routes/cashStoreAffiliateRoutes.ts` | changes: processConversionWebhook |
| `src/routes/cashStoreRoutes.ts` | changes: router.get('/categories', |
| `src/routes/cashbackRoutes.ts` | changes: import { Router } from 'express'; |
| `src/routes/categoryRoutes.ts` | new: router; removed: router |
| `src/routes/comparisonRoutes.ts` | new: router; removed: router |
| `src/routes/consultationRoutes.ts` | changes: checkAvailability |
| `src/routes/contentRoutes.ts` | changes: const cards = await ValueCard.find({ isActive: true }) |
| `src/routes/couponRoutes.ts` | changes: getCouponDetails |
| `src/routes/creatorRoutes.ts` | changes: router.get('/featured', |
| `src/routes/discountRoutes.ts` | changes: applicableOn: Joi.string().valid('bill_payment', 'card_payment', 'all', 'specifi |
| `src/routes/disputeRoutes.ts` | changes: import { logger } from '../config/logger'; |
| `src/routes/earnRoutes.ts` | changes: router.get('/nearby', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/earningProjectsRoutes.ts` | changes: import { |
| `src/routes/earningsRoutes.ts` | changes: withdrawEarnings |
| `src/routes/emergencyRoutes.ts` | changes: getActiveEmergencyBooking |
| `src/routes/eventRoutes.ts` | changes: getUserReview |
| `src/routes/experienceRoutes.ts` | changes: router.get('/', |
| `src/routes/exploreRoutes.ts` | changes: getExploreStatsSummary |
| `src/routes/externalWalletRoutes.ts` | changes: router.post('/paytm/initiate', authenticate, initiatePaytmPayment); |
| `src/routes/faqRoutes.ts` | removed: router |
| `src/routes/favoriteRoutes.ts` | new: router; removed: router |
| `src/routes/featureFlagConfig.ts` | changes: router.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response) = |
| `src/routes/financialServicesRoutes.ts` | changes: router.post('/leads', authenticate, asyncHandler(async (req: Request, res: Respo |
| `src/routes/fitnessRoutes.ts` | changes: router.get('/stores/:storeId/plans', asyncHandler(async (req: Request, res: Resp |
| `src/routes/flashSaleRoutes.ts` | changes: import { authenticate as authMiddleware } from '../middleware/auth'; |
| `src/routes/followerAnalyticsRoutes.ts` | changes: getFollowerAnalyticsSummary |
| `src/routes/followerStatsRoutes.ts` | changes: getTopFollowers |
| `src/routes/gameRoutes.ts` | changes: router.post('/scratch-card/retry-claim', gameCompletionLimiter, gameController.r |
| `src/routes/giftCardRoutes.ts` | changes: import { |
| `src/routes/giftRoutes.ts` | changes: getSentGifts |
| `src/routes/goldSavingsRoutes.ts` | changes: import { authenticate, requireAdmin } from '../middleware/auth'; |
| `src/routes/healthRecordRoutes.ts` | changes: getSharedWithMe |
| `src/routes/heroBannerRoutes.ts` | changes: trackBannerConversion |
| `src/routes/homeServicesRoutes.ts` | changes: getPopularHomeServices |
| `src/routes/homepageRoutes.ts` | changes: router.get('/', |
| `src/routes/instituteReferrals.ts` | changes: router.post('/', authenticate, asyncHandler(async (req: Request, res: Response) |
| `src/routes/insuranceRoutes.ts` | changes: import { |
| `src/routes/integrationWebhook.ts` | changes: router.use(express.json({ |
| `src/routes/leaderboardRoutes.ts` | changes: router.get('/campus', asyncHandler(async (req: Request, res: Response) => { |
| `src/routes/learningRoutes.ts` | content drift |
| `src/routes/locationRoutes.ts` | new: router; removed: router |
| `src/routes/lockDealRoutes.ts` | changes: import { requireAuth, optionalAuth } from '../middleware/auth'; |
| `src/routes/loyaltyRoutes.ts` | changes: import { logger } from '../config/logger'; |
| `src/routes/mallAffiliateRoutes.ts` | changes: processConversionWebhook |
| `src/routes/mallRoutes.ts` | changes: toggleAllianceSchema |
| `src/routes/menuRoutes.ts` | content drift |
| `src/routes/merchant/brandedCoins.ts` | changes: if ( |
| `src/routes/merchant/cashback.ts` | changes: getPendingCashbackCount |
| `src/routes/merchant/coinDrops.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/merchant/creatorAnalytics.ts` | changes: router.get('/:storeId/pending-picks', authMiddleware, asyncHandler(async (req: R |
| `src/routes/merchant/earningAnalytics.ts` | changes: import { logger } from '../../config/logger'; |
| `src/routes/merchant/notifications.ts` | changes: unregisterPushToken |
| `src/routes/merchant/orders.ts` | changes: updateMerchantOrderStatus |
| `src/routes/merchant/socialImpact.ts` | content drift |
| `src/routes/messageRoutes.ts` | changes: router.get('/conversations', |
| `src/routes/notificationRoutes.ts` | new: router; removed: router |
| `src/routes/offerCategoryRoutes.ts` | changes: getSubcategories |
| `src/routes/offerCommentRoutes.ts` | changes: import { optionalAuth, authenticate as authenticateToken } from '../middleware/a |
| `src/routes/offerRoutes.ts` | new: router; removed: router |
| `src/routes/offersRoutes.ts` | new: router; removed: router |
| `src/routes/orderRoutes.ts` | new: router; removed: router |
| `src/routes/outletRoutes.ts` | changes: }) |
| `src/routes/partnerRoutes.ts` | changes: getPartnerStats |
| `src/routes/paymentMethodRoutes.ts` | new: router; removed: router |
| `src/routes/paymentRoutes.ts` | new: router; removed: router |
| `src/routes/photoUploadRoutes.ts` | changes: import { authenticate as authenticateToken } from '../middleware/auth'; |
| `src/routes/platformRoutes.ts` | content drift |
| `src/routes/playEarnRoutes.ts` | content drift |
| `src/routes/pollRoutes.ts` | changes: import { optionalAuth, authenticate as authenticateToken } from '../middleware/a |
| `src/routes/priceTrackingRoutes.ts` | content drift |
| `src/routes/priveCampaignRoutes.ts` | changes: /** |
| `src/routes/priveInviteRoutes.ts` | content drift |
| `src/routes/priveRoutes.ts` | changes: import { logger } from '../config/logger'; |
| `src/routes/productComparisonRoutes.ts` | changes: clearAllProductComparisons |
| `src/routes/productGallery.ts` | changes: import { sendSuccess, sendBadRequest, sendNotFound, sendError } from '../utils/r |
| `src/routes/productRoutes.ts` | new: router; removed: router |
| `src/routes/profileRoutes.ts` | changes: verifyProfile |
| `src/routes/programRoutes.ts` | changes: router.post('/social-impact/:id/approve', requireAdmin, programController.approv |
| `src/routes/projectRoutes.ts` | new: router; removed: router |
| `src/routes/razorpayRoutes.ts` | changes: import { authenticate } from '../middleware/auth'; |
| `src/routes/rechargeRoutes.ts` | changes: import { createRateLimiter } from '../middleware/rateLimiter'; |
| `src/routes/recommendationRoutes.ts` | new: router; removed: router |
| `src/routes/referralRoutes.ts` | changes: getReferralStats |
| `src/routes/reviewRoutes.ts` | new: router; removed: router |
| `src/routes/scratchCardRoutes.ts` | changes: checkEligibility |
| `src/routes/searchRoutes.ts` | changes: import { protect, optionalAuth } from '../middleware/auth'; |
| `src/routes/securityRoutes.ts` | changes: checkMultiAccount |
| `src/routes/serviceAppointmentRoutes.ts` | changes: validate(Joi.object({ |
| `src/routes/serviceBookingRoutes.ts` | changes: import { authenticate } from '../middleware/auth'; |
| `src/routes/serviceCategoryRoutes.ts` | changes: getChildCategories |
| `src/routes/serviceRoutes.ts` | changes: searchServices |
| `src/routes/shareRoutes.ts` | content drift |
| `src/routes/socialMediaRoutes.ts` | changes: checkSharedStatus |
| `src/routes/socialProofRoutes.ts` | changes: import { authenticate } from '../middleware/auth'; |
| `src/routes/specialProgramRoutes.ts` | changes: router.get('/', (req, res, next) => { |
| `src/routes/sponsorRoutes.ts` | content drift |
| `src/routes/statsRoutes.ts` | changes: router.get('/social', |
| `src/routes/stockNotificationRoutes.ts` | new: router; removed: router |
| `src/routes/stockRoutes.ts` | changes: getStockValueOverTime |
| `src/routes/storeGallery.ts` | changes: import { logger } from '../config/logger'; |
| `src/routes/storePaymentRoutes.ts` | changes: generateStoreQR, |
| `src/routes/storeRoutes.ts` | new: router; removed: router |
| `src/routes/storeVisitRoutes.ts` | changes: rescheduleStoreVisit |
| `src/routes/storeVoucherRoutes.ts` | changes: }) |
| `src/routes/streakRoutes.ts` | changes: router.post('/claim', streakController.updateStreak.bind(streakController)); |
| `src/routes/subscriptionRoutes.ts` | changes: tier: Joi.string().valid(...subscriptionTierEnum).required(), |
| `src/routes/supportRoutes.ts` | changes: router.get('/config/public', |
| `src/routes/surveyRoutes.ts` | content drift |
| `src/routes/syncRoutes.ts` | new: router; removed: router |
| `src/routes/tableBookingRoutes.ts` | changes: router.get('/store/:storeId', getStoreTableBookings); |
| `src/routes/tableSessionRoutes.ts` | content drift |
| `src/routes/testRoutes.ts` | changes: import { authenticate } from '../middleware/auth'; |
| `src/routes/tournamentRoutes.ts` | content drift |
| `src/routes/transferRoutes.ts` | changes: getRecentRecipients |
| `src/routes/travelPaymentRoutes.ts` | changes: router.post('/create-order', authenticate, createTravelPaymentOrder); |
| `src/routes/travelServicesRoutes.ts` | changes: getPopularTravelServices |
| `src/routes/travelWebhookRoutes.ts` | content drift |
| `src/routes/ugcRoutes.ts` | changes: import { validateParams, validateQuery, commonSchemas } from '../middleware/vali |
| `src/routes/unifiedGamificationRoutes.ts` | changes: import { logger } from '../config/logger'; |
| `src/routes/userBootRoutes.ts` | content drift |
| `src/routes/userProductRoutes.ts` | changes: import { validateQuery, validate, commonSchemas } from '../middleware/validation |
| `src/routes/userSettingsRoutes.ts` | new: router; removed: sprint11SettingsRouter,sprint11AccountRouter,router |
| `src/routes/verificationRoutes.ts` | changes: router.post('/:zone', |
| `src/routes/videoRoutes.ts` | new: router; removed: router |
| `src/routes/voucherRoutes.ts` | new: router; removed: router |
| `src/routes/walletRoutes.ts` | new: router; removed: router |
| `src/routes/webhookRoutes.ts` | changes: express.json(), // Parse JSON body for signature verification |
| `src/routes/whatsNewRoutes.ts` | changes: router.get( |
| `src/routes/wishlistRoutes.ts` | new: router; removed: router |
| `src/routes/zoneVerificationRoutes.ts` | changes: import { logger } from '../config/logger'; |

### Tests (src/__tests__/, *.test.ts, *.spec.ts) — 32 files

| File | Summary |
|------|---------|
| `src/__tests__/booking-price-calculation.test.ts` | changes: jest.mock('../models/ServiceBooking'); |
| `src/__tests__/e2e/gift-coins.e2e.test.ts` | changes: await CoinTransaction.createTransaction( |
| `src/__tests__/e2e/merchant-journey.e2e.test.ts` | changes: import { Merchant } from '../../models/Merchant'; |
| `src/__tests__/e2e/support-tools-integration.e2e.test.ts` | changes: jest.mock('../../config/walletMetrics', () => ({ |
| `src/__tests__/e2e/support-tools.e2e.test.ts` | changes: jest.mock('../../config/walletMetrics', () => ({ |
| `src/__tests__/gamification-new-endpoints.test.ts` | changes: import { |
| `src/__tests__/globalSearch.test.ts` | changes: const response = await request(app) |
| `src/__tests__/helpers/testUtils.ts` | new: sleep; removed: sleep |
| `src/__tests__/merchantAuth.test.ts` | changes: password: 'Password123', |
| `src/__tests__/merchantProducts.test.ts` | changes: import { MProduct } from '../models/MerchantProduct'; |
| `src/__tests__/partnerAPI.test.ts` | changes: lastName: 'User' |
| `src/__tests__/partnerService.test.ts` | changes: mongoServer = await MongoMemoryServer.create(); |
| `src/__tests__/referralController.test.ts` | changes: generateReferralLink |
| `src/__tests__/referralService.test.ts` | changes: (Referral.findOne as jest.Mock).mockResolvedValue(null); |
| `src/__tests__/routes/auth.test.ts` | changes: import { OTPLog } from '../../models/OTPLog'; |
| `src/__tests__/routes/billPayment.test.ts` | changes: import request from 'supertest'; |
| `src/__tests__/routes/cart.test.ts` | changes: isVerified: true |
| `src/__tests__/routes/gamification.test.ts` | changes: totalSpent: 500 |
| `src/__tests__/routes/orders.test.ts` | changes: totalSpent: 0 |
| `src/__tests__/routes/payment.test.ts` | changes: status: 'created' |
| `src/__tests__/routes/wallet.test.ts` | changes: cashbackCoins: 25 |
| `src/__tests__/serviceBooking.test.ts` | changes: jest.mock('../models/ServiceBooking'); |
| `src/__tests__/services/CashbackModel.test.ts` | changes: const today = new Date(); |
| `src/__tests__/services/CashbackService.test.ts` | changes: getCashbackMultiplier: jest.fn().mockResolvedValue(1) |
| `src/__tests__/services/EmailService.test.ts` | changes: send: jest.fn().mockResolvedValue([{ statusCode: 202 }]) |
| `src/__tests__/services/InvoiceService.test.ts` | changes: import { Order } from '../../models/Order'; |
| `src/__tests__/services/OnboardingService.test.ts` | changes: import { OnboardingService } from "../../merchantservices/OnboardingService"; |
| `src/__tests__/services/PaymentService.test.ts` | changes: import { createTestMerchant, cleanupTestData } from '../helpers/testUtils'; |
| `src/__tests__/services/PredictiveAnalyticsService.test.ts` | changes: const forecast = await PredictiveAnalyticsService.forecastSales( |
| `src/__tests__/services/liabilityService.test.ts` | changes: async function createTestMerchantWallet(merchantId: Types.ObjectId, storeId: Typ |
| `src/__tests__/services/walletService.unit.test.ts` | changes: import mongoose from 'mongoose'; |
| `src/__tests__/setup.ts` | changes: let mongoServer: MongoMemoryServer; |

### Scripts (src/scripts/, scripts/, src/jobs/, src/workers/) — 379 files

| File | Summary |
|------|---------|
| `scripts/activate-all-stores.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/addCuisineCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/addImagesToAllProducts.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-user- |
| `scripts/addMissingCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/addMoreCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/addMoreGiftProducts.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/addMoreStores.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/addProductImage.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-user- |
| `scripts/addProductsForStores.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVcqwp |
| `scripts/addProductsToEmptyCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/addVideosToMissingStores.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/analyze-stores-for-booking.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/analyzeCuisineData.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/analyzeProducts.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVcqwp |
| `scripts/analyzeProductsCorrectDB.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/assign-stores-to-products.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVcqwp |
| `scripts/assignStoresToGoingOutCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/assignStoresToProducts.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71 |
| `scripts/backfill-order-activities.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez |
| `scripts/backfill-review-activities.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez |
| `scripts/categorize-products.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-active-stores.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-activities.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez |
| `scripts/check-actual-data.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/check-category-store-links.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-child-categories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-coins.js` | changes: await mongoose.connect(process.env.MONGO_URI \|\| 'mongodb://localhost:27017/rez-a |
| `scripts/check-database.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/check-deals-data.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-exclusive-offers.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-fashion-stores-products.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-fashion.js` | changes: mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mo |
| `scripts/check-goingout-stores.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-missing-products.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-order-statuses.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez |
| `scripts/check-product-data.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-product-prices.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/check-product-subcategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-products-stores.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/check-products.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-specific-user.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-statistics-data.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez |
| `scripts/check-store-products.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/check-user-orders.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez |
| `scripts/check-user-subscription.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/check-video-products.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/checkAllCollections.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/checkCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkCategoryPageData.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkCurrentStoreData.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkDB.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/checkFleetCategory.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkGalleryData.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkGiftData.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkLinkage.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/checkLoggedInUser.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkMerchantStores.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/checkOffersData.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/checkOrders.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkProductFields.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/checkProductImages.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-user- |
| `scripts/checkProducts.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkSocialMediaPosts.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkStoreConnection.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkStoreHours.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkStoreProducts.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkStoreVideos.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/checkTransactions.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/checkUnmatchedProducts.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/checkUserWallet.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/cleanDuplicateProducts.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/cleanDuplicateRedemptions.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/cleanup-cart.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/clear-locked-items.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/comprehensive-backend-check.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/connectProductsAndStoresToCategories.js` | changes: const mongoURI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/createFleetCategoryAndData.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/createMissingStore.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/createProductsForStores.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/createStoresForAllMerchants.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/debug-subcategory-filter.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/debugCategorySeed.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/debugProducts.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71 |
| `scripts/debugSeedIssue.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/disable-rate-limiters.js` | content drift |
| `scripts/dropIndexes.js` | content drift |
| `scripts/enable-food-fulfillment-sample.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/exportProductsReport.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVcqwp |
| `scripts/fetchFAQs.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/find-recent-subscriptions.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-all-store-products.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-cashback.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-checkin-data.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/fix-child-categories-objectids.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-events-categories.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/fix-exclusive-zones.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-homepage-sections.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-locked-items.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-null-products.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-posters.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/fix-product-prices.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/fix-remaining-stores.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-store-categories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fix-store-videos.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/fix-video-urls.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/fixAllCategories.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71 |
| `scripts/fixCategorySortOrder.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fixNewArrivals.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/fixProductCategories.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71 |
| `scripts/fixProductStoreIds.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/fixStoreCoordinates.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez'; |
| `scripts/get-all-categories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/inspect-mongodb-data.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/inspect-products.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/link-all-stores-and-products.ts` | changes: $or: [ |
| `scripts/link-stores-and-products-to-merchant.ts` | changes: $or: [ |
| `scripts/linkProductsToCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/linkProductsV2.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/linkStoresToMerchants.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/list-all-users.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/listAllMerchantEmails.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/markGiftProductsFeatured.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/migrate-add-booking-fields.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/migrate-orders-to-products.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/migrate-products-comprehensive.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/migrate-stores-all-categories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/migrate-wallet-to-new-schema.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/migrate-wallet.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/migrate.ts` | content drift |
| `scripts/migrateProductsToFeaturedCategories.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/migrateStoreHours.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/migrateStoreLocations.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/migrateStoreOperationalData.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez'; |
| `scripts/reset-spins.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| process.env.MONGO_URI \|\| 'mong |
| `scripts/seed-all-quick.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/seed-booking-stores.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/seed-events-with-merchants.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/seed-gamification-data.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/seed-product-fields.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedAllCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedBeautyWellness.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedBooksCategory.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71 |
| `scripts/seedCategories.js` | changes: const mongoURI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/seedCategoriesWithImages.js` | changes: const mongoURI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/seedCategoryPageDataJS.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedCompleteStoreData.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedCoupons.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rezapp |
| `scripts/seedCurrentUser.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedDiscounts.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/seedFAQs.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/seedFeaturedCategories.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedFoodDiningOrders.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/seedGalleryData.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedGamification.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/seedHealthcare.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/seedMoreOffers.ts` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez |
| `scripts/seedMoreStores.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/tes |
| `scripts/seedMoreUsers.ts` | changes: const latBase = 19.0760; |
| `scripts/seedMoreVouchers.ts` | changes: 'Cannot be clubbed with other offers' |
| `scripts/seedNewCollections.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/seedOffersData.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/tes |
| `scripts/seedOffersData.ts` | changes: name: "TechMart Electronics", |
| `scripts/seedOffersProduction.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/seedOutlets.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/seedPriceForTwo.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-de |
| `scripts/seedProducts.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/tes |
| `scripts/seedPromoCodes.ts` | changes: notes: 'General welcome offer for new subscribers' |
| `scripts/seedReferrals.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/seedSocialImpact.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedStores.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/tes |
| `scripts/seedSurveys.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/seedTestOrders.ts` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez |
| `scripts/seedTransactionsForAllUsers.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/seedUGCData.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/setupGoingOutCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/setupHomeDeliveryAndServicesCategories.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/show-category-tree.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/simple-check.js` | changes: await mongoose.connect(process.env.MONGODB_URI \|\| process.env.MONGO_URI \|\| 'mong |
| `scripts/sync-coins-to-wallet.js` | changes: await mongoose.connect(process.env.MONGO_URI \|\| 'mongodb://localhost:27017/rez-a |
| `scripts/syncIndexes.ts` | changes: const uri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/test-checkin-apis.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/test-insert-offer.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/test-product-integration.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/testOfferRedemptionSimple.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/testOffersSystemComplete.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/testProductData.js` | changes: const mongoUri = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mo |
| `scripts/testStoreAPI.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/testTransactionAuth.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/testUserStatistics.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/update-poster-colors.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/update-store-payment-methods.ts` | changes: * |
| `scripts/updateAllCategoryImages.js` | changes: const mongoURI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/updateAllMerchantPasswords.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `scripts/updateCategoryImages.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/updateOldProducts.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/updateProductImagesAndStores.js` | changes: const mongoUri = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mo |
| `scripts/validate-discovery-data.ts` | changes: * |
| `scripts/verify-all-data.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `scripts/verify-model-fixes.ts` | changes: const mongoUri = process.env.MONGO_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/verify-video-product-links.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/verifyDatabaseData.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `scripts/verifyProductLinks.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `scripts/verifyProducts.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVcqwp |
| `scripts/verifySearchData.js` | changes: const mongoURI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-app'; |
| `scripts/verifyUGCData.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `src/jobs/billPaymentReminderJob.ts` | new: startBillPaymentReminderJob,stopBillPaymentReminderJob,triggerManualBillReminders |
| `src/jobs/billVerificationJob.ts` | changes: user: bill.user, |
| `src/jobs/cashbackJobs.ts` | changes: } catch (error) { |
| `src/jobs/creatorJobs.ts` | changes: const lockToken = await redisService.acquireLock(lockKey, 300); |
| `src/jobs/expireCoins.ts` | removed: getCoinExpiryJobTask |
| `src/jobs/giftDeliveryJob.ts` | changes: await redisService.releaseLock(lockKey, lockToken); |
| `src/jobs/giftExpiryJob.ts` | changes: { new: true } |
| `src/jobs/integrationReconciliationJob.ts` | removed: getIntegrationReconciliationTask |
| `src/jobs/inventoryAlerts.ts` | changes: import { Store } from '../models/Store'; |
| `src/jobs/leaderboardPrizeDistributionJob.ts` | changes: import LeaderboardPrizeDistribution, { ILeaderboardPrizeDistribution, IPrizeEntr |
| `src/jobs/lifecycleAutomationJob.ts` | changes: import { Types } from 'mongoose'; |
| `src/jobs/orderLifecycleJobs.ts` | changes: import cron from 'node-cron'; |
| `src/jobs/orderReconciliationJob.ts` | changes: import orderSocketService from '../services/orderSocketService'; |
| `src/jobs/partnerEarningsSnapshotJob.ts` | changes: const yesterdayStart = new Date(now); |
| `src/jobs/personalizedNotificationJob.ts` | changes: const WINDOW_CONFIG: Record<NotificationWindow, { |
| `src/jobs/reconciliationJob.ts` | changes: import mongoose from 'mongoose'; |
| `src/jobs/stuckTransactionRecoveryJob.ts` | changes: import { Wallet } from '../models/Wallet'; |
| `src/jobs/tagOffersJob.ts` | changes: const offers = await Offer.find({ |
| `src/jobs/travelCashbackJobs.ts` | changes: const CREDIT_SCHEDULE = '0 */2 * * *';       // Every 2 hours |
| `src/jobs/trialExpiryNotification.ts` | changes: const { userId, userName, daysRemaining, trialTier } = payload; |
| `src/jobs/walletLedgerReconciliationJob.ts` | removed: runLedgerReconciliation |
| `src/jobs/weeklySummaryJob.ts` | content drift |
| `src/scripts/add-contenttype-to-videos.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `src/scripts/addIndexes.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/addMoreStores.ts` | changes: { name: 'Food & Dining', slug: 'food-dining', type: 'going_out', icon: '🍽️', sor |
| `src/scripts/addMoreSubcategories.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `src/scripts/addNewRegion.ts` | new: RegionId,RegionId; removed: RegionId,RegionId |
| `src/scripts/assignStoreSubcategories.ts` | changes: import dotenv from 'dotenv'; |
| `src/scripts/assignSubcategorySlugs.ts` | changes: 'family-restaurants': ['restaurant', 'food', 'dining', 'biryani', 'south-indian' |
| `src/scripts/check-dubai-products.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/check-product-prices.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/checkAndFixProductLinks.ts` | changes: console.log('🔗 Product-Store-Merchant Link Check & Fix'); |
| `src/scripts/checkAndSeedCategories.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `src/scripts/checkBalance.ts` | changes: try { |
| `src/scripts/checkCampaigns.ts` | changes: const distribution = await db!.collection('campaigns').aggregate([ |
| `src/scripts/checkCategories.ts` | changes: 'food-dining', 'grocery-essentials', 'beauty-wellness', 'healthcare', |
| `src/scripts/checkCategoryCount.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `src/scripts/checkChallenges.ts` | changes: console.log('🔍 Checking challenges in database...'); |
| `src/scripts/checkDb.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/checkEventsData.ts` | changes: console.log('=== Event Count ==='); |
| `src/scripts/checkFoodDiningData.ts` | changes: * |
| `src/scripts/checkGroceryData.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/checkHomepageData.ts` | changes: * |
| `src/scripts/checkStoreCategories.ts` | changes: console.log('food-dining _id:', foodDining?._id); |
| `src/scripts/checkStoreData.ts` | changes: console.log('\n=== Store City Distribution ==='); |
| `src/scripts/checkStoreMappings.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/checkStoreProducts.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/checkStores.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/checkSubcategoryData.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/checkTransaction.ts` | changes: console.log('No DB connection'); |
| `src/scripts/enableMallForStores.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/enhance-stores-with-merchants.js` | changes: * Database: mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb. |
| `src/scripts/fillEmptySubcategories.ts` | changes: 'healthcare': { |
| `src/scripts/fix-existing-users-referral.js` | changes: const mongoUri = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVcqwp |
| `src/scripts/fix-missing-challenge-rewards.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/fix-store-cities.js` | changes: fixStoreCities().catch(console.error); |
| `src/scripts/fix-store-cities.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/fix-video-creators.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `src/scripts/fixAndSeedChallenges.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/fixCategoryImages.ts` | changes: bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800 |
| `src/scripts/fixEventsData.ts` | changes: console.log('🔧 Connecting to MongoDB...'); |
| `src/scripts/fixProductPricing.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/fixProductRating.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/fixProductStoreAssignment.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/fixSeededImages.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `src/scripts/fixWithRealImages.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `src/scripts/linkStoresToCategories.ts` | changes: const FRONTEND_CATEGORIES: Record<string, { |
| `src/scripts/migrateAchievements.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/migrateCategoryMetadataToEmbedded.ts` | changes: * |
| `src/scripts/migrateChallengeStatus.ts` | changes: const mongoUri = process.env.MONGODB_URI \|\| process.env.MONGO_URI \|\| 'mongodb:// |
| `src/scripts/migrateDiscounts.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/migrateFoodDiningStores.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/migrateOfferEligibility.ts` | changes: * 2. Backfills `User.nuqtaPlusTier` from Subscription model |
| `src/scripts/migratePartnerEarnings.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `src/scripts/migratePriveAccess.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/migratePriveConfig.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/migrateProductImages.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/migrateServiceCapabilities.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/migrateSocialImpactMerchant.ts` | changes: console.log('Starting Social Impact merchant migration...'); |
| `src/scripts/migrateSocialImpactTransactions.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `src/scripts/migrateStoreLogos.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/migrateStoresAndMerchants.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/removeInvalidProducts.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/reset-challenge-claims.ts` | changes: import Challenge from '../models/Challenge'; |
| `src/scripts/resetMerchantPasswords.ts` | changes: console.log('🔐 Merchant Password Reset & Credentials Report'); |
| `src/scripts/seed-articles.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/seed-bill-providers.ts` | changes: import { BillProvider } from '../models/BillProvider'; |
| `src/scripts/seed-merchants.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/seed-user-creators.ts` | changes: { city: 'Mumbai', state: 'Maharashtra', coordinates: [72.8777, 19.0760] as [numb |
| `src/scripts/seed-videos.js` | changes: * Database: mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb. |
| `src/scripts/seedAdminUser.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedAllData.ts` | changes: console.log('🔄 Seeding Users...'); |
| `src/scripts/seedAllModels.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedAllStoreProducts.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/seedCampaigns.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedCarts.ts` | changes: console.log('🚀 Starting Cart seeding...'); |
| `src/scripts/seedCashback.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedCategoryPageConfigs.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedCategoryPageData.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedChallenges.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedCompleteCategories.ts` | changes: import dotenv from 'dotenv'; |
| `src/scripts/seedCoupons.ts` | changes: console.log('🎫 Starting Coupon Seeding...'); |
| `src/scripts/seedCreatorProfiles.ts` | changes: stats: { totalPicks: 35, totalViews: 125000, totalLikes: 4200, totalFollowers: 8 |
| `src/scripts/seedDatabase.ts` | new: seedDatabase; removed: seedDatabase |
| `src/scripts/seedDemoData.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedEvents.ts` | changes: description: 'Experience the epic conclusion to the Marvel multiverse saga on th |
| `src/scripts/seedExclusiveOffers.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedFitnessStores.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedFoodDiningStores.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedGroceryData.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedHomeServices.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedMallBrands.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedMallData.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedMissingStores.ts` | changes: import mongoose, { Types } from 'mongoose'; |
| `src/scripts/seedMissingSubcategories.ts` | changes: { name: 'Electronic City', coords: [77.6700, 12.8395], pincode: '560100' }, |
| `src/scripts/seedNewCategories.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/seedNotifications.ts` | changes: console.log('🚀 Starting Notification seeding...'); |
| `src/scripts/seedOffersAndVouchers.ts` | changes: const connectDB = async () => { |
| `src/scripts/seedOffersPage.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedOrders.ts` | changes: console.log('🚀 Starting Order seeding...'); |
| `src/scripts/seedPartners.ts` | changes: console.log('🌱 [PARTNER SEEDING] Starting partner seeding...'); |
| `src/scripts/seedProductionOffers.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `src/scripts/seedProducts.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedProfileData.ts` | changes: console.log('🚀 Starting Profile Data seeding...'); |
| `src/scripts/seedProjects.ts` | changes: console.log('🚀 Starting Project seeding...'); |
| `src/scripts/seedQuizQuestions.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedRecentEarnings.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/seedRegionEvents.ts` | changes: subtitle: 'India\'s Largest Tech Conference', |
| `src/scripts/seedRegionOffers.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedReviews.ts` | changes: console.log('🚀 Starting Review seeding...'); |
| `src/scripts/seedServiceCategories.ts` | changes: seoDescription: 'Book professional home services with up to 10% cashback' |
| `src/scripts/seedServiceProducts.js` | changes: const uri = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb |
| `src/scripts/seedSimple.ts` | changes: console.log('🗑️  Clearing existing data...'); |
| `src/scripts/seedSocialProofStats.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedSpecialPrograms.ts` | changes: description: 'Exclusive earning program for verified students. Earn extra coins |
| `src/scripts/seedStoreMetadata.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedStores.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedSubscriptionTiers.ts` | changes: yearlyDiscount: 0 |
| `src/scripts/seedTravelServices.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedTriviaQuestions.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedUGCVideos.ts` | changes: console.log('🎬 Starting UGC Video seeding with real product linking...\n'); |
| `src/scripts/seedUserSettings.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/rez-ap |
| `src/scripts/seedVideos.ts` | changes: console.log('🚀 Starting Video seeding...'); |
| `src/scripts/seedVouchersWithStores.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/seedWhatsNewStories.ts` | changes: console.log('🗑️  Clearing existing What\'s New stories...'); |
| `src/scripts/seedWishlists.ts` | changes: console.log('🚀 Starting Wishlist seeding...'); |
| `src/scripts/setFeaturedProducts.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/syncMerchantUserData.ts` | changes: * |
| `src/scripts/updateAllStoreLogos.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `src/scripts/updateCampaignRegions.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/updateChallengeDates.ts` | changes: console.log('🔄 Updating challenge dates...'); |
| `src/scripts/updateProductCategories.ts` | changes: import dotenv from 'dotenv'; |
| `src/scripts/updateProductDetails.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/updateProductDetailsWithSubSubCategory.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/updateProductSubSubCategories.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/updateSeededImages.ts` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `src/scripts/updateStoreCategories.ts` | changes: import dotenv from 'dotenv'; |
| `src/scripts/updateStoreDetails.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/updateStoreLogos.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/updateStoreLogosV2.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/updateStoreLogs.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/updateStoresToMatchMd.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/verify-final-database.js` | changes: await mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulq |
| `src/scripts/verify-region-filtering.ts` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `src/scripts/verify-seeded-videos.js` | changes: const MONGODB_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3 |
| `src/scripts/verifyAndLinkVoucherStores.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/verifyCategories.ts` | changes: console.log('Connected to MongoDB\n'); |
| `src/scripts/verifyDemoData.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/verifyEndToEnd.ts` | changes: console.log('Connected\n'); |
| `src/scripts/verifyFinancialServices.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/verifyFinancialServicesFlow.ts` | changes: import mongoose from 'mongoose'; |
| `src/scripts/verifyGameProduction.ts` | changes: const startTime = Date.now(); |
| `src/scripts/verifyProductionData.ts` | changes: import dotenv from 'dotenv'; |
| `src/workers/exportWorker.ts` | changes: import { exportQueue } from '../config/queue.config'; |

### Seeds (src/seeds/) — 23 files

| File | Summary |
|------|---------|
| `src/seeds/categoryPageSeeds.ts` | changes: import mongoose from 'mongoose'; |
| `src/seeds/challengeSeeds.ts` | changes: console.log('\n📅 Updating existing challenge dates...'); |
| `src/seeds/checkDubaiData.ts` | changes: console.log('Connected to DB'); |
| `src/seeds/dubaiStoreSeeds.ts` | changes: const DUBAI_MARINA_COORDS: [number, number] = [55.1410, 25.0805]; |
| `src/seeds/exclusiveZoneOffersSeeds.ts` | changes: console.log('Seeding Exclusive Zone Offers...'); |
| `src/seeds/exploreSeeds.ts` | changes: delhi: { center: [77.2090, 28.6139], areas: [ |
| `src/seeds/financialServicesSeeds.ts` | changes: import mongoose from 'mongoose'; |
| `src/seeds/fixProductStoreLinks.ts` | changes: console.log('Connected to DB'); |
| `src/seeds/homepageDealsSeeds.ts` | changes: console.log('🌱 Seeding Homepage Deals Section...'); |
| `src/seeds/homepageSeeds.ts` | changes: import mongoose from 'mongoose'; |
| `src/seeds/masterSeeds.ts` | changes: import { Product } from '../models/Product'; |
| `src/seeds/offersPageSeeds/doubleCashbackSeeds.ts` | changes: import mongoose from 'mongoose'; |
| `src/seeds/offersPageSeeds/hotspotSeeds.ts` | changes: import mongoose from 'mongoose'; |
| `src/seeds/offersPageSeeds/runOffersPageSeeds.ts` | changes: const storeNames = ['Starbucks', 'KFC', 'McDonald\'s', 'Domino\'s Pizza', 'Mojo |
| `src/seeds/playAndEarnSeeds.ts` | changes: const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); |
| `src/seeds/priveOfferSeeds.ts` | changes: 'Indulge in authentic Italian cuisine at Sapore Italiano. As a signature member, |
| `src/seeds/promotionalPosterSeeds.ts` | changes: console.log('Seeding promotional posters...\n'); |
| `src/seeds/runDubaiSeeds.ts` | changes: console.log('🚀 Starting Dubai Region Seeds...\n'); |
| `src/seeds/socialImpactSeeds.ts` | changes: import mongoose from 'mongoose'; |
| `src/seeds/trendingSeeds.ts` | changes: videos: [{ |
| `src/seeds/unifiedSeeds.ts` | changes: import mongoose from 'mongoose'; |
| `src/seeds/updateDubaiData.ts` | changes: console.log('Connecting to MongoDB...'); |
| `src/seeds/verifyRegionSetup.ts` | changes: import { regionService, getRegionConfig, getActiveRegions, isValidRegion, Region |

### Integrations (src/integrations/) — 1 files

| File | Summary |
|------|---------|
| `src/integrations/adapters/index.ts` | changes: import crypto from 'crypto'; |

### Core (src/core/) — 1 files

| File | Summary |
|------|---------|
| `src/core/rewardEngine.ts` | removed: RewardEngine |

### Other (top-level configs, dockerfiles, k8s, monitoring, etc.) — 59 files

| File | Summary |
|------|---------|
| `.dockerignore` | changes: # Dependencies |
| `.env.example` | changes: # Environment Configuration |
| `.env.production.example` | changes: # ============================================= |
| `.github/workflows/pr-checks.yml` | changes: NODE_VERSION: '18.x' |
| `.github/workflows/staging.yml` | changes: performance-tests: |
| `.gitignore` | changes: # Dependencies |
| `.npmrc` | changes: legacy-peer-deps=true |
| `CONTRIBUTING.md` | changes: ## Quick Start (5 minutes) |
| `Dockerfile` | changes: # Multi-stage build for optimization |
| `database-audit-reports/MIGRATION_SCRIPTS/fix-broken-category-references.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `database-audit-reports/MIGRATION_SCRIPTS/migrate-faqs-id-standardization.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `database-audit-reports/MIGRATION_SCRIPTS/quick-verify.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `database-audit-reports/MIGRATION_SCRIPTS/verify-migrations.js` | changes: const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb+srv://mukulraj756:O71qVc |
| `docker-compose.elk.yml` | changes: - xpack.security.enabled=false |
| `docker-compose.monitoring.yml` | content drift |
| `docker-compose.prod.yml` | changes: - REDIS_URL=${REDIS_URL} |
| `docker-compose.yml` | changes: - MONGODB_URI=${MONGODB_URI:-mongodb://rezadmin:rezdevpass@mongo:27017/rez?authS |
| `eslint.config.js` | changes: '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgn |
| `jest.config.js` | changes: '^.+\\.ts$': 'ts-jest', |
| `k8s/deployment.yaml` | changes: image: rezapp/merchant-backend:latest |
| `k8s/hpa.yaml` | changes: maxReplicas: 10 |
| `k8s/pdb.yaml` | changes: minAvailable: 1 |
| `logstash/pipeline/logstash.conf` | changes: input { |
| `monitoring/docker-compose.yml` | changes: - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-rez-admin-2026} |
| `monitoring/prometheus/alert.rules.yml` | content drift |
| `monitoring/prometheus/prometheus.yml` | changes: # - alertmanager:9093 |
| `nginx/nginx.conf` | changes: worker_processes auto;          # Use all CPU cores |
| `package-lock.json` | changes: "@paypal/paypal-server-sdk": "^1.1.0", |
| `package.json` | changes: "@paypal/paypal-server-sdk": "^1.1.0", |
| `prometheus.yml` | changes: - job_name: 'rez-backend' |
| `src/events/gamificationEventBus.ts` | changes: \| 'order_placed' \| 'order_delivered' |
| `src/events/handlers/achievementProgressHandler.ts` | changes: import type GamificationEventBus from '../gamificationEventBus'; |
| `src/events/handlers/streakHandler.ts` | changes: bill_payment_confirmed: 'savings', |
| `src/server.ts` | changes: import mongoose from 'mongoose'; |
| `src/types/api.ts` | changes: notifications?: boolean; |
| `src/types/order.ts` | new: PaymentStatus; removed: PaymentStatus |
| `src/types/referral.types.ts` | changes: perReferral: 50 |
| `src/types/shared.ts` | new: CashbackStatus,OrderStatus,PaymentStatus; removed: CashbackStatus,OrderStatus,PaymentStatus |
| `src/utils/asyncHandler.ts` | changes: return (req: Request, res: Response, next: NextFunction) => { |
| `src/utils/cacheHelper.ts` | content drift |
| `src/utils/cacheWarmup.ts` | changes: fn: () => withCache('categories:root:/root:{}', CacheTTL.CATEGORY_LIST, async () |
| `src/utils/circuitBreaker.ts` | removed: gamificationCircuit,walletCircuit,paymentCircuit |
| `src/utils/cloudinaryUtils.ts` | changes: import path from 'path'; |
| `src/utils/encryption.ts` | changes: import crypto from 'crypto'; |
| `src/utils/financialTransactionWrapper.ts` | changes: const logger = createServiceLogger('financial-txn'); |
| `src/utils/gamificationTriggers.ts` | changes: import { UserAchievement, ACHIEVEMENT_DEFINITIONS, AchievementType } from '../mo |
| `src/utils/orderAlerts.ts` | changes: orderSocketService.emitToAdmin('ORDER_ALERT', { |
| `src/utils/paginationHelper.ts` | new: buildPaginationResponse; removed: buildPaginationResponse |
| `src/utils/razorpayUtils.ts` | changes: import crypto from 'crypto'; |
| `src/utils/sanitize.ts` | removed: maskPhoneNumber,maskBankAccount,maskPAN |
| `src/utils/withTransaction.ts` | removed: withRequiredTransaction |
| `src/validators/authValidators.ts` | changes: const phoneRegex = /^\+?[1-9]\d{1,14}$/; |
| `src/validators/financialValidators.ts` | changes: coinType: Joi.string().valid('rez', 'nuqta').default('rez').messages({ |
| `src/validators/merchantValidators.ts` | changes: const objectIdPattern = /^[0-9a-fA-F]{24}$/; |
| `src/validators/orderValidators.ts` | new: createOrderSchema; removed: createOrderSchema |
| `src/worker.ts` | changes: import { initializeCronJobs } from './config/cronJobs'; |
| `templates/product-import-template.csv` | changes: name,description,shortDescription,price,compareAtPrice,category,subcategory,bran |
| `tests/e2e/results/.gitkeep` | changes: # Test Results Directory |
| `tsconfig.json` | changes: "declaration": true, |

## High-Level Change Themes

### Architecture / Infrastructure
- **Migrated from Bull to BullMQ** — `queue.config.ts`, `QueueService.ts`, `ScheduledJobService.ts`, `worker.ts`, `server.ts`
- **Worker role isolation** — Added `WORKER_ROLE` env var (all/critical/noncritical) so cron jobs and queues can run on separate Render dynos
- **Microservices extraction** — `docker-compose.microservices.yml` (new in git) defines 8 BullMQ worker services + 3 HTTP API services
- **Node 18 to 22 base image bump** in Dockerfile; switched to `npm install --legacy-peer-deps` for multer-storage-cloudinary conflict
- **Redis Sentinel support** added in `redis.ts` config

### Observability / Tracing
- **OpenTelemetry** support: `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `SERVICE_NAME` env vars
- **W3C traceparent** propagation in `logger.ts` correlation middleware
- **Distributed tracing** for inter-service calls via `runWithCorrelation` AsyncLocalStorage
- **Prometheus queue metrics** sampler in `config/prometheus.ts`
- **Redis connection status gauge** for readiness probes

### Security Hardening
- **PII masking** added to logger (`maskSensitiveData` format) for phones, JWTs, cards, emails
- **Encryption at rest** with `ENCRYPTION_KEY` (64-char hex) for PII (bank accounts, PANs)
- **TOTP encryption** with `TOTP_ENCRYPTION_KEY` for admin TOTP secrets
- **OTP HMAC** with `OTP_HMAC_SECRET` (replaces plaintext OTP)
- **IP blocker middleware** added
- **CSRF middleware** added
- **Stronger PII sanitization** list expanded (aadhaar, upiId, dob, ifsc, etc.)
- **`LOG_OTP_FOR_TESTING` safety guard** in production

### Performance / Scaling
- **MongoDB pool sizing** guide added; `MONGO_MAX_POOL_SIZE` env var (default 25)
- **Slow query monitoring** with `SLOW_QUERY_THRESHOLD_MS` (was hardcoded 300ms)
- **`autoIndex` / `autoCreate`** disabled in production
- **`primaryPreferred` read preference** for transactions (Atlas-safe)
- **Wire compression** with both snappy+zlib compressors
- **Retry strategy** uses exponential backoff instead of null-returning

### Order State Machine
- Added `failed_delivery`, `return_requested`, `return_rejected` statuses
- `TERMINAL_STATUSES` and `ACTIVE_STATUSES` reworked

### Regions
- **Removed 'china'** from RegionId type — only `bangalore` and `dubai` now

### Environment Validation
- Added many required env vars: `JWT_ADMIN_SECRET`, `OTP_HMAC_SECRET`, `INTERNAL_SERVICE_TOKEN`, `INTERNAL_SERVICE_KEY`, `ENCRYPTION_KEY`, `GAMIFICATION_SERVICE_URL`, `TOTP_ENCRYPTION_KEY`, `REDIS_URL` (now required in all envs), `RAZORPAY_KEY_ID/SECRET`
- `validateEnvironment()` function added alongside legacy `validateEnv()`
- `Sentry.tracingHandler` wrapped in safe middleware

### Queue / Worker
- Bull to BullMQ migration throughout
- `removeOnComplete: { count: 100 }` and `removeOnFail: { count: 500 }` instead of age-based
- `maxStalledCount`, `stalledInterval`, `maxRetriesPerRequest` settings added
- `ENABLE_EXPORT_QUEUE` env var
- **Wallet operation queue** (`walletOperationQueue`) with `drainQueue`

### Models
- `Address.ts`, `BillProvider.ts`, `BonusCampaign.ts`, `ChallengeAnalytics.ts`, `PaymentService.ts` had signature changes (re-exports)
- Many models have additional fields (e.g., `lockFee` on Cart, `region` on Campaign)

### Tests
- New `src/__tests__/e2e/` subdir with e2e tests for gift-coins, merchant-journey, support-tools
- `__tests__/helpers/testUtils.ts` adds `sleep` helper

### Script Naming (cleanups)
- Many `scripts/*.js` files have hardcoded `mongodb+srv://mukulraj756:...` credentials that are still in the file in `rez-backend` (security concern: should be replaced with `process.env.MONGODB_URI` only)

## Summary Stats

| Category | Count |
|----------|-------|
| script | 379 |
| route | 254 |
| controller | 147 |
| model | 138 |
| service | 126 |
| other | 59 |
| test | 32 |
| config | 31 |
| seed | 23 |
| middleware | 22 |
| core | 1 |
| integration | 1 |

**Total: 1213 files differ between rez-backend and rez-backend-master.**

## Files ONLY in rez-backend-master (not in git source)

These files exist in the user's existing repo but NOT in the git source — they would need to be PRESERVED during merge or back-ported:

- `.claude/settings.local.json`
- `.env`
- `__tests__/ (entire dir in rez-backend-master root)`
- `archives/`
- `coverage/`
- `docs/`
- `logs/`
- `newrelic.js`
- `node_modules/`
- `src/__tests__/controllers/`
- `src/controllers/b/billSplitController.ts`
- `src/controllers/billSplitController.ts`
- `src/controllers/orderController.enhanced.ts`
- `src/merchantroutes/banners.ts`
- `src/merchantroutes/customerNotifications.ts`
- `src/merchantroutes/health.ts`
- `src/merchantroutes/metrics.ts`
- `src/merchantroutes/orders.ts`
- `src/merchantroutes/priveCampaigns.ts`
- `src/merchantroutes/reviews.ts`
- `src/models/BSavings.ts`
- `src/models/BillSplit.ts`
- `src/models/MerchantTierConfig.ts`
- `src/models/PriveSubmission.ts`
- `src/routes/admin/bulkWalletAdjust.ts`
- `src/routes/admin/coinEmergency.ts`
- `src/routes/admin/coinOverview.ts`
- `src/routes/admin/coinRules.ts`
- `src/routes/admin/finance.ts`
- `src/routes/admin/merchantTierConfig.ts`
- `src/routes/admin/subscriptionMgmt.ts`
- `src/routes/admin/wallet.ts`
- `src/services/BillSplitService.ts`
- `src/services/MerchantTierService.ts`
- `src/services/PriveCampaignService.ts`
- `src/services/billSplitService.ts`

## Files ONLY in rez-backend (git source) — not in user repo

(`diff -rq` reported 0 files only in rez-backend, only files differing or only in rez-backend-master.)
