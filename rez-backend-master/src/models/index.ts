// Export all MongoDB models
export { User } from './User';
export { Category } from './Category';
export { Store } from './Store';
export { Product } from './Product';
export { Cart } from './Cart';
export { Order } from './Order';
export { Video } from './Video';
export { Article } from './Article';
export { Project } from './Project';
export { Transaction } from './Transaction';
export { Notification } from './Notification';
export { Review } from './Review';
export { Wishlist } from './Wishlist';
export { Wallet } from './Wallet';
export { default as Offer } from './Offer';
export { default as FlashSale } from './FlashSale';
export { VoucherBrand, UserVoucher } from './Voucher';
export { default as OfferRedemption } from './OfferRedemption';
export { Address } from './Address';
export { PaymentMethod } from './PaymentMethod';
export { UserSettings } from './UserSettings';
export { UserAchievement } from './Achievement';
export { Activity } from './Activity';
export { StockHistory } from './StockHistory';
export { Coupon } from './Coupon';
export { UserCoupon } from './UserCoupon';
export { default as Event } from './Event';
export { default as EventBooking } from './EventBooking';
export { default as Consultation } from './Consultation';
export { Subscription } from './Subscription';
// StorePromoCoin removed - using wallet.brandedCoins instead
export { QuizQuestion } from './QuizQuestion';
export { TriviaQuestion } from './TriviaQuestion';
export { CoinTransaction } from './CoinTransaction';
export { default as GameSession } from './GameSession';

// Additional models
export { PromoCode } from './PromoCode';
export { default as Referral } from './Referral';
export { Message } from './Message';
export { Conversation } from './Conversation';
export { StockNotification } from './StockNotification';
export { default as PriceAlert } from './PriceAlert';
export { CashbackMongoModel, CashbackModel } from './Cashback';
export { default as AuditLog } from './AuditLog';
export { default as UserStoreVoucher } from './UserStoreVoucher';
export { Bill } from './Bill';
export { BillProvider } from './BillProvider';
export { BillPayment } from './BillPayment';
export { UserCashback } from './UserCashback';
export { default as Challenge } from './Challenge';
export { MiniGame } from './MiniGame';
export { default as HeroBanner } from './HeroBanner';
export { default as OfferCategory } from './OfferCategory';
export { default as PreOrder } from './PreOrder';
export { ProcessedWebhookEvent } from './ProcessedWebhookEvent';
export { default as ScratchCard } from './ScratchCard';
export { default as SocialMediaPost } from './SocialMediaPost';
export { SpinWheelConfig, SpinWheelSpin, UserSpinMetrics } from './SpinWheel';
export { SupportTicket } from './SupportTicket';
export { StoreAnalytics } from './StoreAnalytics';
export { StoreComparison } from './StoreComparison';
export { StoreVisit } from './StoreVisit';
export { default as StoreVoucher } from './StoreVoucher';
export { SubscriptionTier } from './SubscriptionTier';
export { TableBooking } from './TableBooking';
export { default as UserChallengeProgress } from './UserChallengeProgress';
export { default as UserOfferInteraction } from './UserOfferInteraction';
export { UserProduct } from './UserProduct';
export { default as UserStreak } from './UserStreak';
export { default as Discount } from './Discount';
export { default as DiscountUsage } from './DiscountUsage';
export { Favorite } from './Favorite';
export { default as Follow } from './Follow';
export { default as Menu } from './Menu';
export { default as Outlet } from './Outlet';
export { default as Partner } from './Partner';
export { Payment } from './Payment';
export { ProductAnalytics } from './ProductAnalytics';
export { ServiceAppointment } from './ServiceAppointment';
export { ServiceRequest } from './ServiceRequest';
export { Merchant } from './Merchant';
// Note: MProduct is deprecated - use Product model instead for unified merchant-user sync
// export { MProduct, ProductModel } from './MerchantProduct';
export { OrderMongoModel, OrderModel } from './MerchantOrder';
export { MerchantUser } from './MerchantUser';
export { default as ActivityInteraction } from './ActivityInteraction';
export { default as PriceHistory } from './PriceHistory';
export { SearchHistory } from './SearchHistory';
export { WebhookLog } from './WebhookLog';
export { Refund } from './Refund';

// Privé models
export { default as DailyCheckIn, calculateStreakBonus, getStreakMessage } from './DailyCheckIn';
export { default as PriveOffer } from './PriveOffer';
export { default as PriveVoucher, calculateVoucherValue, getDefaultExpiry } from './PriveVoucher';
export { PriveCampaign } from './PriveCampaign';
export { PrivePostSubmission } from './PrivePostSubmission';

// Offers Page models
export { default as HotspotArea } from './HotspotArea';
export { default as DoubleCashbackCampaign } from './DoubleCashbackCampaign';
export { default as CoinDrop } from './CoinDrop';
export { default as UploadBillStore } from './UploadBillStore';
export { default as BankOffer } from './BankOffer';
export { default as ExclusiveZone } from './ExclusiveZone';
export { default as SpecialProfile } from './SpecialProfile';
export { default as LoyaltyMilestone } from './LoyaltyMilestone';
export { default as FriendRedemption } from './FriendRedemption';

// Export types for external use
export type { IUser, IUserProfile, IUserPreferences, IUserWallet, IUserAuth } from './User';
export type { ICategory, ICategoryMetadata } from './Category';
export type { IStore, IStoreLocation, IStoreContact, IStoreRatings, IStoreOffers, IStoreOperationalInfo, IStoreAnalytics } from './Store';
export type { IProduct, IProductVariant, IProductPricing, IProductInventory, IProductRatings, IProductSpecification, IProductSEO, IProductAnalytics } from './Product';
export type { ICart, ICartItem, ICartTotals, ICartCoupon } from './Cart';
export type { IOrder, IOrderItem, IOrderTotals, IOrderPayment, IOrderAddress, IOrderDelivery, IOrderTimeline, IOrderAnalytics } from './Order';
export type { IVideo, IVideoEngagement, IVideoMetadata, IVideoProcessing, IVideoAnalytics } from './Video';
export type { IArticle, IArticleEngagement, IArticleAnalytics } from './Article';
export type { IProject, IProjectRequirements, IProjectReward, IProjectLimits, IProjectSubmission, IProjectAnalytics } from './Project';
export type { ITransaction, ITransactionSource, ITransactionStatus } from './Transaction';
export type { INotification, INotificationData, IPushNotificationSettings, IDeliveryStatus } from './Notification';
export type { IReview, IReviewMedia, IReviewHelpfulness, IReviewModeration, IReviewVerification } from './Review';
export type { IWishlist, IWishlistItem, IWishlistSharing, IWishlistAnalytics } from './Wishlist';
export type { IWallet } from './Wallet';
export type { IOffer } from './Offer';
export type { IFlashSale } from './FlashSale';
export type { IVoucherBrand, IUserVoucher } from './Voucher';
export type { IOfferRedemption } from './OfferRedemption';
export type { IAddress } from './Address';
export type { IPaymentMethod } from './PaymentMethod';
export type { IUserSettings, INotificationPreferences, IPrivacySettings, ISecuritySettings, IDeliveryPreferences, IPaymentPreferences, IAppPreferences, IGeneralSettings } from './UserSettings';
export type { IUserAchievement, IAchievementDefinition } from './Achievement';
export type { IActivity } from './Activity';
export type { IStockHistory, StockChangeType } from './StockHistory';
export type { ICoupon, ICouponApplicableTo, ICouponUsageLimit } from './Coupon';
export type { IUserCoupon, IUserCouponNotifications } from './UserCoupon';
export type { IEvent, IEventSlot, IEventLocation, IEventOrganizer, IEventPrice, IEventAnalytics } from './Event';
export type { IEventBooking } from './EventBooking';
export type { IConsultation } from './Consultation';
export type { ISubscription, ISubscriptionBenefits, ISubscriptionUsage, SubscriptionStatus, BillingCycle } from './Subscription';
export type { ISubscriptionTier } from './SubscriptionTier';
// IStorePromoCoin type removed - using wallet.brandedCoins instead
export type { IQuizQuestion, IQuizQuestionModel } from './QuizQuestion';
export type { ITriviaQuestion, ITriviaQuestionModel } from './TriviaQuestion';
export type { ICoinTransaction, ICoinTransactionModel } from './CoinTransaction';
export type { IGameSession, IGameSessionModel } from './GameSession';

// Privé types
export type { IDailyCheckIn, IDailyCheckInModel } from './DailyCheckIn';
export type { IPriveOffer, IPriveOfferModel } from './PriveOffer';
export type { IPriveVoucher, IPriveVoucherModel, VoucherType, VoucherStatus } from './PriveVoucher';
export type { IPriveCampaign, IPriveCampaignModel, CampaignTaskType, CampaignStatus, PriveTier } from './PriveCampaign';
export type { IPrivePostSubmission } from './PrivePostSubmission';

// Offers Page types
export type { IHotspotArea } from './HotspotArea';
export type { IDoubleCashbackCampaign } from './DoubleCashbackCampaign';
export type { ICoinDrop } from './CoinDrop';
export type { IUploadBillStore } from './UploadBillStore';
export type { IBankOffer } from './BankOffer';
export type { IExclusiveZone } from './ExclusiveZone';
export type { ISpecialProfile } from './SpecialProfile';
export type { ILoyaltyMilestone } from './LoyaltyMilestone';
export type { IFriendRedemption } from './FriendRedemption';

// Bill Payment types
export type { IBillProvider, BillType, IRequiredField } from './BillProvider';
export type { IBillPayment, BillPaymentStatus } from './BillPayment';

// Homepage Section models
export { default as Campaign } from './Campaign';
export { default as StoreExperience } from './StoreExperience';

// Homepage Section types
export type { ICampaign, ICampaignDeal } from './Campaign';
export type { IStoreExperience } from './StoreExperience';