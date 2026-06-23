/**
 * config/routes.ts — Route registration (all app.use() calls)
 * Extracted from server.ts for maintainability.
 */
import { Express } from 'express';
import { logger } from './logger';
import { globalErrorHandler, notFoundHandler } from '../middleware/errorHandler';
import { sentryErrorHandler } from './sentry';
import { generalLimiter } from '../middleware/rateLimiter';
import { adminAuditMiddleware } from '../middleware/adminAuditMiddleware';
import { authenticate as authTokenMiddleware, requireAdmin as requireAdminMiddleware } from '../middleware/auth';
import { getAllConfigs, updateConfig, setCampaign } from '../controllers/engagementConfigController';
import { Router as EngagementConfigRouter } from 'express';

// ── User API Route Imports ──
import authRoutes from '../routes/authRoutes';
import productRoutes from '../routes/productRoutes';
import cartRoutes from '../routes/cartRoutes';
import categoryRoutes from '../routes/categoryRoutes';
import storeRoutes from '../routes/storeRoutes';
import followerStatsRoutes from '../routes/followerStatsRoutes';
import orderRoutes from '../routes/orderRoutes';
import videoRoutes from '../routes/videoRoutes';
import ugcRoutes from '../routes/ugcRoutes';
import articleRoutes from '../routes/articleRoutes';
import projectRoutes from '../routes/projectRoutes';
import earningProjectsRoutes from '../routes/earningProjectsRoutes';
import notificationRoutes from '../routes/notificationRoutes';
import stockNotificationRoutes from '../routes/stockNotificationRoutes';
import priceTrackingRoutes from '../routes/priceTrackingRoutes';
import reviewRoutes from '../routes/reviewRoutes';
import favoriteRoutes from '../routes/favoriteRoutes';
import comparisonRoutes from '../routes/comparisonRoutes';
import productComparisonRoutes from '../routes/productComparisonRoutes';
import analyticsRoutes from '../routes/analyticsRoutes';
import recommendationRoutes from '../routes/recommendationRoutes';
import wishlistRoutes from '../routes/wishlistRoutes';
import syncRoutes from '../routes/syncRoutes';
import locationRoutes from '../routes/locationRoutes';
import walletRoutes from '../routes/walletRoutes';
import transferRoutes from '../routes/transferRoutes';
import billSplitRoutes from '../routes/billSplitRoutes';
import giftRoutes from '../routes/giftRoutes';
import giftCardRoutes from '../routes/giftCardRoutes';
import offerRoutes from '../routes/offerRoutes';
import offerCommentRoutes from '../routes/offerCommentRoutes';
import offerCategoryRoutes from '../routes/offerCategoryRoutes';
import heroBannerRoutes from '../routes/heroBannerRoutes';
import whatsNewRoutes from '../routes/whatsNewRoutes';
import voucherRoutes from '../routes/voucherRoutes';
import addressRoutes from '../routes/addressRoutes';
import paymentMethodRoutes from '../routes/paymentMethodRoutes';
import userSettingsRoutes from '../routes/userSettingsRoutes';
import achievementRoutes from '../routes/achievementRoutes';
import activityRoutes from '../routes/activityRoutes';
import paymentRoutes from '../routes/paymentRoutes';
import storePaymentRoutes from '../routes/storePaymentRoutes';
import externalWalletRoutes from '../routes/externalWalletRoutes';
import stockRoutes from '../routes/stockRoutes';
import socialMediaRoutes from '../routes/socialMediaRoutes';
import securityRoutes from '../routes/securityRoutes';
import eventRoutes from '../routes/eventRoutes';
import referralRoutes from '../routes/referralRoutes';
import profileRoutes from '../routes/profileRoutes';
import gameRoutes from '../routes/gameRoutes';
import leaderboardRoutes from '../routes/leaderboardRoutes';
import streakRoutes from '../routes/streakRoutes';
import shareRoutes from '../routes/shareRoutes';
import photoUploadRoutes from '../routes/photoUploadRoutes';
import pollRoutes from '../routes/pollRoutes';
import tournamentRoutes from '../routes/tournamentRoutes';
import programRoutes from '../routes/programRoutes';
import specialProgramRoutes from '../routes/specialProgramRoutes';
import sponsorRoutes from '../routes/sponsorRoutes';
import surveyRoutes from '../routes/surveyRoutes';
import verificationRoutes from '../routes/verificationRoutes';
import scratchCardRoutes from '../routes/scratchCardRoutes';
import couponRoutes from '../routes/couponRoutes';
import razorpayRoutes from '../routes/razorpayRoutes';
import supportRoutes from '../routes/supportRoutes';
import messageRoutes from '../routes/messageRoutes';
import cashbackRoutes from '../routes/cashbackRoutes';
import userProductRoutes from '../routes/userProductRoutes';
import discountRoutes from '../routes/discountRoutes';
import storeVoucherRoutes from '../routes/storeVoucherRoutes';
import outletRoutes from '../routes/outletRoutes';
import flashSaleRoutes from '../routes/flashSaleRoutes';
import subscriptionRoutes from '../routes/subscriptionRoutes';
import billRoutes from '../routes/billRoutes';
import billPaymentRoutes, { handleBBPSWebhook } from '../routes/billPaymentRoutes';
import billingRoutes from '../routes/billingRoutes';
import activityFeedRoutes from '../routes/activityFeedRoutes';
import unifiedGamificationRoutes from '../routes/unifiedGamificationRoutes';
import creatorRoutes from '../routes/creatorRoutes';
import adminCreatorRoutes from '../routes/adminCreatorRoutes';
import socialProofRoutes from '../routes/socialProofRoutes';
import partnerRoutes from '../routes/partnerRoutes';
import earningsRoutes from '../routes/earningsRoutes';
import userBootRoutes from '../routes/userBootRoutes';
import menuRoutes from '../routes/menuRoutes';
import tableBookingRoutes from '../routes/tableBookingRoutes';
import tableSessionRoutes from '../routes/tableSessionRoutes';
import consultationRoutes from '../routes/consultationRoutes';
import serviceAppointmentRoutes from '../routes/serviceAppointmentRoutes';
import serviceCategoryRoutes from '../routes/serviceCategoryRoutes';
import serviceRoutes from '../routes/serviceRoutes';
import serviceBookingRoutes from '../routes/serviceBookingRoutes';
import fitnessRoutes from '../routes/fitnessRoutes';
import homeServicesRoutes from '../routes/homeServicesRoutes';
import travelServicesRoutes from '../routes/travelServicesRoutes';
import travelPaymentRoutes from '../routes/travelPaymentRoutes';
import travelWebhookRoutes from '../routes/travelWebhookRoutes';
import financialServicesRoutes from '../routes/financialServicesRoutes';
import healthRecordRoutes from '../routes/healthRecordRoutes';
import emergencyRoutes from '../routes/emergencyRoutes';
import storeVisitRoutes from '../routes/storeVisitRoutes';
import homepageRoutes from '../routes/homepageRoutes';
import searchRoutes from '../routes/searchRoutes';
import mallRoutes from '../routes/mallRoutes';
import mallAffiliateRoutes from '../routes/mallAffiliateRoutes';
import cashStoreAffiliateRoutes from '../routes/cashStoreAffiliateRoutes';
import cashStoreRoutes from '../routes/cashStoreRoutes';
import priveRoutes from '../routes/priveRoutes';
import priveInviteRoutes from '../routes/priveInviteRoutes';
import priveCampaignRoutes from '../routes/priveCampaignRoutes';
import webhookRoutes from '../routes/webhookRoutes';
import storeGalleryRoutes from '../routes/storeGallery';
import productGalleryRoutes from '../routes/productGallery';
import offersRoutes from '../routes/offersRoutes';
import zoneVerificationRoutes from '../routes/zoneVerificationRoutes';
import loyaltyRoutes from '../routes/loyaltyRoutes';
import statsRoutes from '../routes/statsRoutes';
import platformRoutes from '../routes/platformRoutes';
import exploreRoutes from '../routes/exploreRoutes';
import testRoutes from '../routes/testRoutes';
import insuranceRoutes from '../routes/insuranceRoutes';
import adminExploreRoutes from '../routes/adminExploreRoutes';
import goldSavingsRoutes from '../routes/goldSavingsRoutes';
import featureFlagConfigRoutes from '../routes/featureFlagConfig';
import campaignRoutes from '../routes/campaignRoutes';
import rechargeRoutes from '../routes/rechargeRoutes';
import bonusZoneRoutes from '../routes/bonusZoneRoutes';
import lockDealRoutes from '../routes/lockDealRoutes';
import playEarnRoutes from '../routes/playEarnRoutes';
import learningRoutes from '../routes/learningRoutes';
import experienceRoutes from '../routes/experienceRoutes';
import contentRoutes from '../routes/contentRoutes';
import earnRoutes from '../routes/earnRoutes';
import bankOfferRoutes from '../routes/bankOfferRoutes';

// ── Admin Route Imports ──
import {
  adminDashboardRoutes,
  adminOrdersRoutes,
  adminCoinRewardsRoutes,
  adminMerchantWalletsRoutes,
  adminAuthRoutes,
  adminUsersRoutes,
  adminMerchantsRoutes,
  adminWalletRoutes,
  adminCampaignsRoutes,
  adminUploadsRoutes,
  adminExperiencesRoutes,
  adminCategoriesRoutes,
  adminStoresRoutes,
  adminHomepageDealsRoutes,
  adminZoneVerificationsRoutes,
  adminOffersRoutes,
  adminLoyaltyRoutes,
  adminDoubleCampaignsRoutes,
  adminCoinDropsRoutes,
  adminVouchersRoutes,
  adminCouponsRoutes,
  adminTravelRoutes,
  adminSystemRoutes,
  adminChallengesRoutes,
  adminGameConfigRoutes,
  adminFeatureFlagsRoutes,
  adminAchievementsRoutes,
  adminGamificationStatsRoutes,
  adminDailyCheckinConfigRoutes,
  adminSpecialProgramsRoutes,
  adminEventsRoutes,
  adminEventCategoriesRoutes,
  adminEventRewardsRoutes,
  adminTournamentsRoutes,
  adminLearningContentRoutes,
  adminLeaderboardConfigRoutes,
  adminQuickActionRoutes,
  adminValueCardRoutes,
  adminWalletConfigRoutes,
  adminUserWalletsRoutes,
  adminBulkWalletAdjustRoutes,
  adminGiftCardsRoutes,
  adminCoinGiftsRoutes,
  adminSurpriseCoinDropsRoutes,
  adminPartnerEarningsRoutes,
  adminReferralsRoutes,
  adminFlashSalesRoutes,
  adminHotspotAreasRoutes,
  adminBankOffersRoutes,
  adminUploadBillStoresRoutes,
  adminExclusiveZonesRoutes,
  adminSpecialProfilesRoutes,
  adminLoyaltyMilestonesRoutes,
  adminSupportRoutes,
  adminSupportConfigRoutes,
  adminFaqRoutes,
  adminNotificationMgmtRoutes,
  adminFraudReportsRoutes,
  adminMembershipRoutes,
  adminAdminUsersRoutes,
  adminEconomicsRoutes,
  adminActionsRoutes,
  adminDisputesRoutes,
  adminDeviceFingerprintRoutes,
  adminIntegrationsRoutes,
  adminInstitutionsRoutes,
  adminInstituteReferralsRoutes,
  adminPriveSubmissionsRoutes,
  adminCoinOverviewRoutes,
  adminCoinEmergencyRoutes,
  adminMerchantTierConfigRoutes,
  adminFinanceRoutes,
  adminCoinRulesRoutes,
} from '../routes/admin';
import disputeRoutes from '../routes/disputeRoutes';
import integrationWebhookRoutes from '../routes/integrationWebhook';
import adminBonusZoneRoutes from '../routes/admin/bonusZone';
import instituteReferralsRoutes from '../routes/instituteReferrals';
import adminOffersSectionRoutes from '../routes/admin/offersSectionConfig';
import adminStoreCollectionRoutes from '../routes/admin/storeCollectionConfig';
import adminPriveRoutes from '../routes/admin/priveAdmin';
import adminGoldPriceRoutes from '../routes/admin/goldPrice';
import adminMerchantLiabilityRoutes from '../routes/admin/merchantLiability';
import adminMallBrandsRoutes from '../routes/admin/mallBrands';
import adminCashStorePurchasesRoutes from '../routes/admin/cashStorePurchases';
import adminReviewRoutes from '../routes/admin/reviews';
import adminServiceAppointmentRoutes from '../routes/admin/serviceAppointments';
import adminBbpsRoutes from '../routes/admin/bbpsAdmin';

// ── Merchant Route Imports ──
import authRoutes1 from '../merchantroutes/auth';
import merchantRoutes from '../merchantroutes/merchants';
import merchantProfileRoutes from '../merchantroutes/merchant-profile';
import productRoutes1 from '../merchantroutes/products';
import categoryRoutes1 from '../merchantroutes/categories';
import uploadRoutes from '../merchantroutes/uploads';
import orderRoutes1 from '../merchantroutes/orders';
import merchantCashbackRoutes from '../merchantroutes/cashback';
import dashboardRoutes from '../merchantroutes/dashboard';
import merchantWalletRoutes from '../merchantroutes/wallet';
import merchantCoinsRoutes from '../merchantroutes/coins';
import analyticsRoutesM from '../merchantroutes/analytics';
import merchantSyncRoutes from '../merchantroutes/sync';
import teamRoutes from '../merchantroutes/team';
import teamPublicRoutes from '../merchantroutes/team-public';
import auditRoutes from '../merchantroutes/audit';
import onboardingRoutes from '../merchantroutes/onboarding';
import merchantOrderRoutes from '../routes/merchant/orders';
import merchantCashbackRoutesNew from '../routes/merchant/cashback';
import merchantNotificationRoutes from '../routes/merchant/notifications';
import merchantCoinDropRoutes from '../routes/merchant/coinDrops';
import merchantBrandedCoinRoutes from '../routes/merchant/brandedCoins';
import merchantEarningAnalyticsRoutes from '../routes/merchant/earningAnalytics';
import merchantCreatorAnalyticsRoutes from '../routes/merchant/creatorAnalytics';
import merchantSocialImpactRoutes from '../routes/merchant/socialImpact';
import merchantSupportRoutes from '../merchantroutes/support';
import campaignSimulatorRoutes from '../merchantroutes/campaignSimulator';
import bulkRoutes from '../merchantroutes/bulk';
import storeRoutesM from '../merchantroutes/stores';
import merchantOfferRoutes from '../merchantroutes/offers';
import storeGalleryRoutesM from '../merchantroutes/storeGallery';
import productGalleryRoutesM from '../merchantroutes/productGallery';
import merchantDiscountRoutes from '../merchantroutes/discounts';
import merchantStoreVoucherRoutes from '../merchantroutes/storeVouchers';
import merchantOutletRoutes from '../merchantroutes/outlets';
import merchantVideoRoutes from '../merchantroutes/videos';
import bulkImportRoutes from '../merchantroutes/bulkImport';
import merchantSocialMediaRoutes from '../merchantroutes/socialMedia';
import merchantEventsRoutes from '../merchantroutes/events';
import merchantServicesRoutes from '../merchantroutes/services';
import merchantStoreVisitRoutes from '../merchantroutes/storeVisits';
import merchantDealRedemptionRoutes from '../merchantroutes/dealRedemptions';
import merchantVoucherRedemptionRoutes from '../merchantroutes/voucherRedemptions';
import merchantLiabilityRoutes from '../merchantroutes/liability';
import merchantDisputeRoutes from '../merchantroutes/disputes';
import merchantVariantsRoutes from '../merchantroutes/variants';
import productRestoreRoutes from '../merchantroutes/product-restore';
import merchantPriveCampaignRoutes from '../merchantroutes/priveCampaigns';
import merchantBannerRoutes from '../merchantroutes/banners';
import merchantCustomerNotificationRoutes from '../merchantroutes/customerNotifications';

// ── B-feature namespaces (REZ-vs-NUQTA migration) ──
import bRoutes from '../routes/b';

// ────────────────────────────────────────────────────────────────────
// Register all routes
// ────────────────────────────────────────────────────────────────────

export function registerRoutes(app: Express): void {
  const API_PREFIX = process.env.API_PREFIX || '/api';

  // ── User API Routes ──
  app.use(API_PREFIX, generalLimiter); // Global rate limit for all user routes
  app.use(`${API_PREFIX}/user/auth`, authRoutes);
  app.use(`${API_PREFIX}/products`, productRoutes);
  app.use(`${API_PREFIX}/cart`, cartRoutes);
  app.use(`${API_PREFIX}/categories`, categoryRoutes);
  app.use(`${API_PREFIX}/stores`, storeRoutes);
  app.use(`${API_PREFIX}/stores`, followerStatsRoutes);
  app.use(`${API_PREFIX}/orders`, orderRoutes);
  app.use(`${API_PREFIX}/videos`, videoRoutes);
  app.use(`${API_PREFIX}/creators`, creatorRoutes);
  app.use(`${API_PREFIX}/ugc`, ugcRoutes);
  app.use(`${API_PREFIX}/articles`, articleRoutes);
  app.use(`${API_PREFIX}/projects`, projectRoutes);
  app.use(`${API_PREFIX}/earning-projects`, earningProjectsRoutes);
  app.use(`${API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${API_PREFIX}/stock-notifications`, stockNotificationRoutes);
  app.use(`${API_PREFIX}/price-tracking`, priceTrackingRoutes);
  app.use(`${API_PREFIX}/reviews`, reviewRoutes);
  app.use(`${API_PREFIX}/favorites`, favoriteRoutes);
  app.use(`${API_PREFIX}/comparisons`, comparisonRoutes);
  app.use(`${API_PREFIX}/product-comparisons`, productComparisonRoutes);
  app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
  app.use(`${API_PREFIX}/t`, analyticsRoutes);
  app.use(`${API_PREFIX}/recommendations`, recommendationRoutes);
  app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);
  app.use(`${API_PREFIX}/sync`, syncRoutes);
  app.use(`${API_PREFIX}/location`, locationRoutes);
  app.use(`${API_PREFIX}/wallet`, walletRoutes);
  app.use(`${API_PREFIX}/wallet/transfer`, transferRoutes);
  app.use(`${API_PREFIX}/wallet/split`, billSplitRoutes);
  app.use(`${API_PREFIX}/wallet/gift`, giftRoutes);
  app.use(`${API_PREFIX}/wallet/gift-cards`, giftCardRoutes);
  app.use(`${API_PREFIX}/offers`, offerCommentRoutes);
  app.use(`${API_PREFIX}/offers`, offerRoutes);
  app.use(`${API_PREFIX}/zones`, zoneVerificationRoutes);
  app.use(`${API_PREFIX}/offer-categories`, offerCategoryRoutes);
  app.use(`${API_PREFIX}/hero-banners`, heroBannerRoutes);
  app.use(`${API_PREFIX}/whats-new`, whatsNewRoutes);
  app.use(`${API_PREFIX}/vouchers`, voucherRoutes);
  app.use(`${API_PREFIX}/addresses`, addressRoutes);
  app.use(`${API_PREFIX}/payment-methods`, paymentMethodRoutes);
  app.use(`${API_PREFIX}/user-settings`, userSettingsRoutes);
  app.use(`${API_PREFIX}/achievements`, achievementRoutes);
  app.use(`${API_PREFIX}/activities`, activityRoutes);
  app.use(`${API_PREFIX}/payment`, paymentRoutes);
  app.use(`${API_PREFIX}/store-payment`, storePaymentRoutes);
  app.use(`${API_PREFIX}/wallets/external`, externalWalletRoutes);
  app.use(`${API_PREFIX}/stock`, stockRoutes);
  app.use(`${API_PREFIX}/social-media`, socialMediaRoutes);
  app.use(`${API_PREFIX}/security`, securityRoutes);
  app.use(`${API_PREFIX}/events`, eventRoutes);
  app.use(`${API_PREFIX}/referral`, referralRoutes);
  app.use(`${API_PREFIX}/user/profile`, profileRoutes);
  app.use(`${API_PREFIX}/user/boot`, userBootRoutes);
  app.use(`${API_PREFIX}/games`, gameRoutes);
  app.use(`${API_PREFIX}/leaderboard`, leaderboardRoutes);
  app.use(`${API_PREFIX}/streak`, streakRoutes);
  app.use(`${API_PREFIX}/shares`, shareRoutes);
  app.use(`${API_PREFIX}/photos`, photoUploadRoutes);
  app.use(`${API_PREFIX}/polls`, pollRoutes);
  app.use(`${API_PREFIX}/tournaments`, tournamentRoutes);
  app.use(`${API_PREFIX}/programs`, programRoutes);
  app.use(`${API_PREFIX}/special-programs`, specialProgramRoutes);
  app.use(`${API_PREFIX}/sponsors`, sponsorRoutes);
  app.use(`${API_PREFIX}/surveys`, surveyRoutes);
  app.use(`${API_PREFIX}/user/verifications`, verificationRoutes);
  app.use(`${API_PREFIX}/scratch-cards`, scratchCardRoutes);
  app.use(`${API_PREFIX}/coupons`, couponRoutes);
  app.use(`${API_PREFIX}/razorpay`, razorpayRoutes);
  app.use(`${API_PREFIX}/webhooks`, webhookRoutes);
  app.use(`${API_PREFIX}/support`, supportRoutes);
  app.use(`${API_PREFIX}/messages`, messageRoutes);
  app.use(`${API_PREFIX}/cashback`, cashbackRoutes);
  app.use(`${API_PREFIX}/loyalty`, loyaltyRoutes);
  app.use(`${API_PREFIX}/user-products`, userProductRoutes);
  app.use(`${API_PREFIX}/discounts`, discountRoutes);
  app.use(`${API_PREFIX}/store-vouchers`, storeVoucherRoutes);
  app.use(`${API_PREFIX}/outlets`, outletRoutes);
  app.use(`${API_PREFIX}/flash-sales`, flashSaleRoutes);
  app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);
  app.use(`${API_PREFIX}/billing`, billingRoutes);
  app.use(`${API_PREFIX}/bills`, billRoutes);
  app.use(`${API_PREFIX}/bill-payments`, billPaymentRoutes);
  // BBPS Webhook — NO auth middleware (called by Razorpay)
  app.post(`${API_PREFIX}/bill-payments/webhook/bbps`, handleBBPSWebhook);
  app.use(`${API_PREFIX}/gamification`, unifiedGamificationRoutes);
  app.use(`${API_PREFIX}/social`, activityFeedRoutes);
  app.use(`${API_PREFIX}/social-proof`, socialProofRoutes);
  app.use(`${API_PREFIX}/partner`, partnerRoutes);
  app.use(`${API_PREFIX}/earnings`, earningsRoutes);
  app.use(`${API_PREFIX}/learning`, learningRoutes);
  app.use(`${API_PREFIX}/menu`, menuRoutes);
  app.use(`${API_PREFIX}/table-bookings`, tableBookingRoutes);
  app.use(`${API_PREFIX}/table-sessions`, tableSessionRoutes);
  app.use(`${API_PREFIX}/service-appointments`, serviceAppointmentRoutes);
  app.use(`${API_PREFIX}/service-categories`, serviceCategoryRoutes);
  app.use(`${API_PREFIX}/services`, serviceRoutes);
  app.use(`${API_PREFIX}/home-services`, homeServicesRoutes);
  app.use(`${API_PREFIX}/travel-services`, travelServicesRoutes);
  app.use(`${API_PREFIX}/travel-payment`, travelPaymentRoutes);
  app.use(`${API_PREFIX}/travel-webhooks`, travelWebhookRoutes);
  app.use(`${API_PREFIX}/financial-services`, financialServicesRoutes);
  app.use(`${API_PREFIX}/gold`, goldSavingsRoutes);
  app.use(`${API_PREFIX}/fitness`, fitnessRoutes);
  app.use(`${API_PREFIX}/service-bookings`, serviceBookingRoutes);
  app.use(`${API_PREFIX}/consultations`, consultationRoutes);
  app.use(`${API_PREFIX}/health-records`, healthRecordRoutes);
  app.use(`${API_PREFIX}/emergency`, emergencyRoutes);
  app.use(`${API_PREFIX}/store-visits`, storeVisitRoutes);
  app.use(`${API_PREFIX}/homepage`, homepageRoutes);
  app.use(`${API_PREFIX}/offers`, offersRoutes);
  app.use(`${API_PREFIX}/users/loyalty`, loyaltyRoutes);
  app.use(`${API_PREFIX}/stats`, statsRoutes);
  app.use(`${API_PREFIX}/platform`, platformRoutes);
  app.use(`${API_PREFIX}/explore`, exploreRoutes);
  app.use(`${API_PREFIX}/test`, testRoutes);
  app.use(`${API_PREFIX}/disputes`, disputeRoutes);

  // ── Admin Routes ──
  // SECURITY: require admin role globally for everything under /api/v1/admin.
  // Each individual admin route file ALSO uses router.use(requireAuth) — that
  // ensures the caller is logged in but does not check the role. Mounting
  // requireAdminMiddleware here protects ~100 admin route files that
  // previously only required authentication. The admin/auth route is excluded
  // because login must succeed before role checks apply.
  app.use(`${API_PREFIX}/admin`, adminAuditMiddleware, (req, res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    return requireAdminMiddleware(req, res, next);
  });
  app.use(`${API_PREFIX}/admin/explore`, adminExploreRoutes);
  app.use(`${API_PREFIX}/admin/creators`, adminCreatorRoutes);
  app.use(`${API_PREFIX}/admin/auth`, adminAuthRoutes);
  app.use(`${API_PREFIX}/admin/dashboard`, adminDashboardRoutes);
  app.use(`${API_PREFIX}/admin/orders`, adminOrdersRoutes);
  app.use(`${API_PREFIX}/admin/coin-rewards`, adminCoinRewardsRoutes);
  app.use(`${API_PREFIX}/admin/merchant-wallets`, adminMerchantWalletsRoutes);
  app.use(`${API_PREFIX}/admin/users`, adminUsersRoutes);
  app.use(`${API_PREFIX}/admin/merchants`, adminMerchantsRoutes);
  app.use(`${API_PREFIX}/admin/wallet`, adminWalletRoutes);
  app.use(`${API_PREFIX}/admin/campaigns`, adminCampaignsRoutes);
  app.use(`${API_PREFIX}/admin/bonus-zone`, adminBonusZoneRoutes);
  app.use(`${API_PREFIX}/admin/offers-sections`, adminOffersSectionRoutes);
  app.use(`${API_PREFIX}/admin/store-collections`, adminStoreCollectionRoutes);
  app.use(`${API_PREFIX}/admin/prive`, adminPriveRoutes);
  app.use(`${API_PREFIX}/admin/uploads`, adminUploadsRoutes);
  app.use(`${API_PREFIX}/admin/experiences`, adminExperiencesRoutes);
  app.use(`${API_PREFIX}/admin/categories`, adminCategoriesRoutes);
  app.use(`${API_PREFIX}/admin/stores`, adminStoresRoutes);
  app.use(`${API_PREFIX}/admin/homepage-deals`, adminHomepageDealsRoutes);
  app.use(`${API_PREFIX}/admin/zone-verifications`, adminZoneVerificationsRoutes);
  app.use(`${API_PREFIX}/admin/offers`, adminOffersRoutes);
  app.use(`${API_PREFIX}/admin/loyalty`, adminLoyaltyRoutes);
  app.use(`${API_PREFIX}/admin/double-campaigns`, adminDoubleCampaignsRoutes);
  app.use(`${API_PREFIX}/admin/coin-drops`, adminCoinDropsRoutes);
  app.use(`${API_PREFIX}/admin/vouchers`, adminVouchersRoutes);
  app.use(`${API_PREFIX}/admin/coupons`, adminCouponsRoutes);
  app.use(`${API_PREFIX}/admin/travel`, adminTravelRoutes);
  app.use(`${API_PREFIX}/admin/system`, adminSystemRoutes);
  app.use(`${API_PREFIX}/admin/challenges`, adminChallengesRoutes);
  app.use(`${API_PREFIX}/admin/game-config`, adminGameConfigRoutes);
  app.use(`${API_PREFIX}/admin/tournaments`, adminTournamentsRoutes);
  app.use(`${API_PREFIX}/admin/feature-flags`, adminFeatureFlagsRoutes);
  app.use(`${API_PREFIX}/config/feature-flags`, featureFlagConfigRoutes);
  app.use(`${API_PREFIX}/admin/achievements`, adminAchievementsRoutes);
  app.use(`${API_PREFIX}/admin/gamification-stats`, adminGamificationStatsRoutes);
  app.use(`${API_PREFIX}/admin/daily-checkin-config`, adminDailyCheckinConfigRoutes);
  app.use(`${API_PREFIX}/admin/special-programs`, adminSpecialProgramsRoutes);
  app.use(`${API_PREFIX}/admin/events`, adminEventsRoutes);
  app.use(`${API_PREFIX}/admin/event-categories`, adminEventCategoriesRoutes);
  app.use(`${API_PREFIX}/admin/event-rewards`, adminEventRewardsRoutes);
  app.use(`${API_PREFIX}/admin/learning-content`, adminLearningContentRoutes);
  app.use(`${API_PREFIX}/admin/leaderboard/configs`, adminLeaderboardConfigRoutes);
  app.use(`${API_PREFIX}/admin/quick-actions`, adminQuickActionRoutes);
  app.use(`${API_PREFIX}/admin/value-cards`, adminValueCardRoutes);
  app.use(`${API_PREFIX}/admin/wallet-config`, adminWalletConfigRoutes);
  app.use(`${API_PREFIX}/admin/user-wallets`, adminUserWalletsRoutes);
  app.use(`${API_PREFIX}/admin/user-wallets/bulk-adjust`, adminBulkWalletAdjustRoutes);
  app.use(`${API_PREFIX}/admin/gift-cards`, adminGiftCardsRoutes);
  app.use(`${API_PREFIX}/admin/coin-gifts`, adminCoinGiftsRoutes);
  app.use(`${API_PREFIX}/admin/surprise-coin-drops`, adminSurpriseCoinDropsRoutes);
  app.use(`${API_PREFIX}/admin/partner-earnings`, adminPartnerEarningsRoutes);
  app.use(`${API_PREFIX}/admin/gold`, adminGoldPriceRoutes);
  app.use(`${API_PREFIX}/admin/referrals`, adminReferralsRoutes);
  app.use(`${API_PREFIX}/admin/flash-sales`, adminFlashSalesRoutes);
  app.use(`${API_PREFIX}/admin/hotspot-areas`, adminHotspotAreasRoutes);
  app.use(`${API_PREFIX}/admin/bank-offers`, adminBankOffersRoutes);
  app.use(`${API_PREFIX}/admin/upload-bill-stores`, adminUploadBillStoresRoutes);
  app.use(`${API_PREFIX}/admin/exclusive-zones`, adminExclusiveZonesRoutes);
  app.use(`${API_PREFIX}/admin/special-profiles`, adminSpecialProfilesRoutes);
  app.use(`${API_PREFIX}/admin/loyalty-milestones`, adminLoyaltyMilestonesRoutes);
  app.use(`${API_PREFIX}/admin/support-config`, adminSupportConfigRoutes);
  app.use(`${API_PREFIX}/admin/support`, adminSupportRoutes);
  app.use(`${API_PREFIX}/admin/support/faq`, adminFaqRoutes);
  app.use(`${API_PREFIX}/admin/notifications`, adminNotificationMgmtRoutes);
  app.use(`${API_PREFIX}/admin/fraud-reports`, adminFraudReportsRoutes);
  app.use(`${API_PREFIX}/admin/membership`, adminMembershipRoutes);
  app.use(`${API_PREFIX}/admin/admin-users`, adminAdminUsersRoutes);
  app.use(`${API_PREFIX}/admin/merchant-liability`, adminMerchantLiabilityRoutes);
  app.use(`${API_PREFIX}/admin/economics`, adminEconomicsRoutes);
  app.use(`${API_PREFIX}/admin/mall/brands`, adminMallBrandsRoutes);
  app.use(`${API_PREFIX}/admin/cashstore/purchases`, adminCashStorePurchasesRoutes);
  app.use(`${API_PREFIX}/admin/reviews`, adminReviewRoutes);
  app.use(`${API_PREFIX}/admin/service-appointments`, adminServiceAppointmentRoutes);
  app.use(`${API_PREFIX}/admin/bbps`, adminBbpsRoutes);
  app.use(`${API_PREFIX}/admin/admin-actions`, adminActionsRoutes);
  app.use(`${API_PREFIX}/admin/disputes`, adminDisputesRoutes);
  app.use(`${API_PREFIX}/admin/devices`, adminDeviceFingerprintRoutes);
  app.use(`${API_PREFIX}/admin/integrations`, adminIntegrationsRoutes);
  app.use(`${API_PREFIX}/admin/institutions`, adminInstitutionsRoutes);
  app.use(`${API_PREFIX}/admin/institute-referrals`, adminInstituteReferralsRoutes);
  app.use(`${API_PREFIX}/admin/prive/submissions`, adminPriveSubmissionsRoutes);
  app.use(`${API_PREFIX}/admin/coins`, adminCoinOverviewRoutes);
  app.use(`${API_PREFIX}/admin/coins`, adminCoinEmergencyRoutes);
  app.use(`${API_PREFIX}/admin/merchant-tier-config`, adminMerchantTierConfigRoutes);
  app.use(`${API_PREFIX}/admin/finance`, adminFinanceRoutes);
  app.use(`${API_PREFIX}/admin/coin-rules`, adminCoinRulesRoutes);

  // Integration webhook (public — secured by HMAC signature)
  app.use(`${API_PREFIX}/integrations`, integrationWebhookRoutes);

  // Admin Engagement Config Routes (inline router)
  const engagementConfigRouter = EngagementConfigRouter();
  engagementConfigRouter.get('/', getAllConfigs);
  engagementConfigRouter.patch('/:action', updateConfig);
  engagementConfigRouter.post('/:action/campaign', setCampaign);
  app.use(`${API_PREFIX}/admin/engagement-config`, authTokenMiddleware, requireAdminMiddleware, engagementConfigRouter);

  // ── Public / Campaign / Feature Routes ──
  app.use(`${API_PREFIX}/campaigns`, campaignRoutes);
  app.use(`${API_PREFIX}/recharge`, rechargeRoutes);
  app.use(`${API_PREFIX}/bonus-zone`, bonusZoneRoutes);
  app.use(`${API_PREFIX}/institute-referrals`, instituteReferralsRoutes);
  app.use(`${API_PREFIX}/lock-deals`, lockDealRoutes);
  app.use(`${API_PREFIX}/play-earn`, playEarnRoutes);
  app.use(`${API_PREFIX}/experiences`, experienceRoutes);
  app.use(`${API_PREFIX}/content`, contentRoutes);
  app.use(`${API_PREFIX}/earn`, earnRoutes);
  app.use(`${API_PREFIX}/search`, searchRoutes);
  app.use(`${API_PREFIX}/mall`, mallRoutes);
  app.use(`${API_PREFIX}/mall/affiliate`, mallAffiliateRoutes);
  app.use(`${API_PREFIX}/cashstore`, cashStoreRoutes);
  app.use(`${API_PREFIX}/cashstore/affiliate`, cashStoreAffiliateRoutes);
  app.use(`${API_PREFIX}/prive`, priveRoutes);
  app.use(`${API_PREFIX}/prive`, priveInviteRoutes);
  app.use(`${API_PREFIX}/prive/campaigns`, priveCampaignRoutes);
  app.use(`${API_PREFIX}/bank-offers`, bankOfferRoutes);
  app.use(`${API_PREFIX}/insurance`, insuranceRoutes);
  app.use(`${API_PREFIX}/stores`, storeGalleryRoutes);
  app.use(`${API_PREFIX}/products`, productGalleryRoutes);

  // ── Merchant API Routes ──
  app.use('/api/merchant', generalLimiter);
  app.use('/api/merchant/auth', authRoutes1);
  app.use('/api/merchant/categories', categoryRoutes1);
  app.use('/api/merchants', merchantRoutes);
  app.use('/api/merchant/products', productRoutes1);
  app.use('/api/merchant/profile', merchantProfileRoutes);
  app.use('/api/merchant/uploads', uploadRoutes);
  app.use('/api/merchant/orders', merchantOrderRoutes);
  app.use('/api/merchant/cashback-old', merchantCashbackRoutes);
  app.use('/api/merchant/cashback', merchantCashbackRoutesNew);
  app.use('/api/merchant/dashboard', dashboardRoutes);
  app.use('/api/merchant/wallet', merchantWalletRoutes);
  app.use('/api/merchant/coins', merchantCoinsRoutes);
  app.use('/api/merchant/analytics', analyticsRoutesM);
  app.use('/api/merchant/stores', storeRoutesM);
  app.use('/api/merchant/stores', storeGalleryRoutesM);
  app.use('/api/merchant/products', productGalleryRoutesM);
  app.use('/api/merchant/offers', merchantOfferRoutes);
  app.use('/api/merchant/discounts', merchantDiscountRoutes);
  app.use('/api/merchant/store-vouchers', merchantStoreVoucherRoutes);
  app.use('/api/merchant/outlets', merchantOutletRoutes);
  app.use('/api/merchant/videos', merchantVideoRoutes);
  app.use('/api/merchant/store-visits', merchantStoreVisitRoutes);
  app.use('/api/merchant/sync', merchantSyncRoutes);
  app.use('/api/merchant/team-public', teamPublicRoutes);
  app.use('/api/merchant/team', teamRoutes);
  app.use('/api/merchant/audit', auditRoutes);
  app.use('/api/merchant/onboarding', onboardingRoutes);
  app.use('/api/merchant/bulk', bulkRoutes);
  app.use('/api/merchant/products', bulkImportRoutes);
  app.use('/api/merchant/notifications', merchantNotificationRoutes);
  app.use('/api/merchant/social-media-posts', merchantSocialMediaRoutes);
  app.use('/api/merchant/events', merchantEventsRoutes);
  app.use('/api/merchant/services', merchantServicesRoutes);
  app.use('/api/merchant/deal-redemptions', merchantDealRedemptionRoutes);
  app.use('/api/merchant/voucher-redemptions', merchantVoucherRedemptionRoutes);
  app.use('/api/merchant', merchantCoinDropRoutes);
  app.use('/api/merchant', merchantBrandedCoinRoutes);
  app.use('/api/merchant', merchantEarningAnalyticsRoutes);
  app.use('/api/merchant/stores', merchantCreatorAnalyticsRoutes);
  app.use('/api/merchant/programs/social-impact', merchantSocialImpactRoutes);
  app.use('/api/merchant/liability', merchantLiabilityRoutes);
  app.use('/api/merchant/disputes', merchantDisputeRoutes);
  app.use('/api/merchant/support', merchantSupportRoutes);
  app.use('/api/merchant/campaign-simulator', campaignSimulatorRoutes);
  app.use('/api/merchant/products', merchantVariantsRoutes);
  app.use('/api/merchant/products', productRestoreRoutes);
  app.use('/api/merchant/prive', merchantPriveCampaignRoutes);
  app.use('/api/merchant/banners', merchantBannerRoutes);
  app.use('/api/merchant/customer-notifications', merchantCustomerNotificationRoutes);

  // ── B-feature namespace (REZ-vs-NUQTA migration) ──
  // All new features ported from project B are namespaced under /api/b/* to
  // avoid colliding with existing routes. See src/routes/b/index.ts.
  app.use('/api/b', bRoutes);

  // ── Root endpoint ──
  app.get('/', (req, res) => {
    res.json({
      message: 'REZ App Backend API',
      status: 'Running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        apiInfo: '/api-info'
      }
    });
  });

  // ── 404 + Error Handlers (MUST be last) ──
  app.use(notFoundHandler);
  if (process.env.SENTRY_DSN) {
    app.use(sentryErrorHandler);
  }
  app.use(globalErrorHandler);

  logger.info('All routes registered successfully');
}
