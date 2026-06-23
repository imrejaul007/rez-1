/**
 * Analytics Event Catalog
 *
 * Centralized event names and their standard properties
 */

export const ANALYTICS_EVENTS = {
  // Store Events
  STORE_VIEWED: 'store_viewed',
  STORE_FOLLOWED: 'store_followed',
  STORE_UNFOLLOWED: 'store_unfollowed',
  STORE_SHARED: 'store_shared',
  STORE_CONTACT_CLICKED: 'store_contact_clicked',
  STORE_INFO_VIEWED: 'store_info_viewed',
  STORE_DIRECTIONS_CLICKED: 'store_directions_clicked',
  STORE_PHONE_CLICKED: 'store_phone_clicked',
  STORE_EMAIL_CLICKED: 'store_email_clicked',
  STORE_WEBSITE_CLICKED: 'store_website_clicked',

  // Product Events
  PRODUCT_VIEWED: 'product_viewed',
  PRODUCT_QUICK_VIEWED: 'product_quick_viewed',
  PRODUCT_SEARCHED: 'product_searched',
  PRODUCT_FILTERED: 'product_filtered',
  PRODUCT_SORTED: 'product_sorted',
  PRODUCT_LIST_VIEWED: 'product_list_viewed',
  PRODUCT_WISHLIST_ADDED: 'product_wishlist_added',
  PRODUCT_WISHLIST_REMOVED: 'product_wishlist_removed',
  PRODUCT_VARIANT_SELECTED: 'product_variant_selected',
  PRODUCT_SHARED: 'product_shared',
  PRODUCT_IMAGE_VIEWED: 'product_image_viewed',
  PRODUCT_IMAGE_ZOOMED: 'product_image_zoomed',
  PRODUCT_VIDEO_PLAYED: 'product_video_played',
  PRODUCT_REVIEW_VIEWED: 'product_review_viewed',
  PRODUCT_REVIEW_WRITTEN: 'product_review_written',
  PRODUCT_QUESTION_ASKED: 'product_question_asked',
  PRODUCT_SIZE_GUIDE_VIEWED: 'product_size_guide_viewed',
  PRODUCT_DELIVERY_CHECKED: 'product_delivery_checked',
  PRODUCT_STOCK_NOTIFIED: 'product_stock_notified',

  // Cart Events
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  CART_VIEWED: 'cart_viewed',
  CART_UPDATED: 'cart_updated',
  CART_CLEARED: 'cart_cleared',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  CHECKOUT_ABANDONED: 'checkout_abandoned',
  CHECKOUT_PAYMENT_INFO_ENTERED: 'checkout_payment_info_entered',
  CHECKOUT_SHIPPING_INFO_ENTERED: 'checkout_shipping_info_entered',
  CHECKOUT_STEP_VIEWED: 'checkout_step_viewed',
  CHECKOUT_STEP_COMPLETED: 'checkout_step_completed',

  // Deal/Offer Events
  DEAL_VIEWED: 'deal_viewed',
  DEAL_LIST_VIEWED: 'deal_list_viewed',
  DEAL_FILTERED: 'deal_filtered',
  DEAL_SHARED: 'deal_shared',
  DEAL_EXPIRED: 'deal_expired',
  VOUCHER_VIEWED: 'voucher_viewed',
  VOUCHER_COPIED: 'voucher_copied',
  VOUCHER_CLAIMED: 'voucher_claimed',
  VOUCHER_REDEEMED: 'voucher_redeemed',
  PROMOTION_BANNER_CLICKED: 'promotion_banner_clicked',
  CASHBACK_EARNED: 'cashback_earned',
  CASHBACK_REDEEMED: 'cashback_redeemed',

  // UGC Events
  UGC_VIEWED: 'ugc_viewed',
  UGC_LIKED: 'ugc_liked',
  UGC_UNLIKED: 'ugc_unliked',
  UGC_BOOKMARKED: 'ugc_bookmarked',
  UGC_COMMENTED: 'ugc_commented',
  UGC_COMMENT_LIKED: 'ugc_comment_liked',
  UGC_SHARED: 'ugc_shared',
  UGC_UPLOAD_STARTED: 'ugc_upload_started',
  UGC_UPLOAD_COMPLETED: 'ugc_upload_completed',
  UGC_UPLOAD_FAILED: 'ugc_upload_failed',
  UGC_REPORTED: 'ugc_reported',

  // Booking/Service Events
  SERVICE_VIEWED: 'service_viewed',
  BOOKING_STARTED: 'booking_started',
  BOOKING_DATE_SELECTED: 'booking_date_selected',
  BOOKING_TIME_SELECTED: 'booking_time_selected',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_CANCELLED: 'booking_cancelled',
  TABLE_BOOKING_STARTED: 'table_booking_started',
  TABLE_BOOKING_COMPLETED: 'table_booking_completed',
  MENU_VIEWED: 'menu_viewed',
  MENU_ITEM_ADDED: 'menu_item_added',
  MENU_ITEM_REMOVED: 'menu_item_removed',

  // PayBill Events
  PAYBILL_INITIATED: 'paybill_initiated',
  PAYBILL_COMPLETED: 'paybill_completed',
  PAYBILL_FAILED: 'paybill_failed',
  BILL_UPLOAD_STARTED: 'bill_upload_started',
  BILL_UPLOAD_COMPLETED: 'bill_upload_completed',
  BILL_UPLOAD_FAILED: 'bill_upload_failed',

  // Navigation Events
  SCREEN_VIEWED: 'screen_viewed',
  TAB_SWITCHED: 'tab_switched',
  NAVIGATION_BACK: 'navigation_back',
  DEEP_LINK_OPENED: 'deep_link_opened',

  // Search Events
  SEARCH_PERFORMED: 'search_performed',
  SEARCH_RESULT_CLICKED: 'search_result_clicked',
  SEARCH_NO_RESULTS: 'search_no_results',
  SEARCH_FILTER_APPLIED: 'search_filter_applied',
  SEARCH_SORT_CHANGED: 'search_sort_changed',

  // User Events
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_VIEWED: 'profile_viewed',
  SETTINGS_CHANGED: 'settings_changed',

  // Wallet Events
  WALLET_VIEWED: 'wallet_viewed',
  WALLET_TOPPED_UP: 'wallet_topped_up',
  WALLET_MONEY_SENT: 'wallet_money_sent',
  TRANSACTION_VIEWED: 'transaction_viewed',

  // Earnings Events
  MY_EARNINGS_VIEWED: 'my_earnings_viewed',
  WALLET_CTA_CLICKED: 'wallet_cta_clicked',
  EARNINGS_EXPORT_CLICKED: 'earnings_export_clicked',
  PERIOD_FILTER_CHANGED: 'period_filter_changed',

  // Gamification Events
  POINTS_EARNED: 'points_earned',
  POINTS_REDEEMED: 'points_redeemed',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  LEADERBOARD_VIEWED: 'leaderboard_viewed',
  CHALLENGE_STARTED: 'challenge_started',
  CHALLENGE_COMPLETED: 'challenge_completed',
  GAME_PLAYED: 'game_played',
  SCRATCH_CARD_REVEALED: 'scratch_card_revealed',

  // Referral Events
  REFERRAL_CODE_SHARED: 'referral_code_shared',
  REFERRAL_CODE_COPIED: 'referral_code_copied',
  REFERRAL_SUCCESSFUL: 'referral_successful',
  REFERRAL_REWARD_EARNED: 'referral_reward_earned',

  // Social Events
  POST_CREATED: 'post_created',
  POST_LIKED: 'post_liked',
  POST_COMMENTED: 'post_commented',
  POST_SHARED: 'post_shared',
  USER_FOLLOWED: 'user_followed',
  USER_UNFOLLOWED: 'user_unfollowed',

  // Error Events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  PAYMENT_ERROR: 'payment_error',
  NETWORK_ERROR: 'network_error',
  VALIDATION_ERROR: 'validation_error',

  // Performance Events
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
  IMAGE_LOAD_TIME: 'image_load_time',
  VIDEO_LOAD_TIME: 'video_load_time',
  APP_STARTUP_TIME: 'app_startup_time',

  // Session Events
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  APP_OPENED: 'app_opened',
  APP_CLOSED: 'app_closed',
  APP_BACKGROUNDED: 'app_backgrounded',
  APP_FOREGROUNDED: 'app_foregrounded',

  // Notification Events
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_OPENED: 'notification_opened',
  NOTIFICATION_DISMISSED: 'notification_dismissed',
  PUSH_PERMISSION_GRANTED: 'push_permission_granted',
  PUSH_PERMISSION_DENIED: 'push_permission_denied',

  // Help/Support Events
  HELP_VIEWED: 'help_viewed',
  FAQ_VIEWED: 'faq_viewed',
  SUPPORT_CHAT_STARTED: 'support_chat_started',
  SUPPORT_TICKET_CREATED: 'support_ticket_created',
  FEEDBACK_SUBMITTED: 'feedback_submitted',

  // Subscription Events
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  TRIAL_STARTED: 'trial_started',
  TRIAL_CONVERTED: 'trial_converted',
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

// Event property schemas for validation
export const EVENT_SCHEMAS = {
  [ANALYTICS_EVENTS.STORE_VIEWED]: {
    required: ['storeId', 'storeName'],
    optional: ['storeCategory', 'source', 'referrer'],
  },
  [ANALYTICS_EVENTS.PRODUCT_VIEWED]: {
    required: ['productId', 'productName', 'price', 'category'],
    optional: ['brand', 'variant', 'source', 'referrer', 'timeSpent'],
  },
  [ANALYTICS_EVENTS.ADD_TO_CART]: {
    required: ['productId', 'productName', 'price', 'quantity', 'totalValue'],
    optional: ['variant', 'variantDetails', 'source'],
  },
  [ANALYTICS_EVENTS.CHECKOUT_COMPLETED]: {
    required: ['transactionId', 'revenue', 'currency', 'items'],
    optional: ['tax', 'shipping', 'coupon', 'discount', 'paymentMethod'],
  },
  [ANALYTICS_EVENTS.UGC_VIEWED]: {
    required: ['contentId', 'contentType'],
    optional: ['authorId', 'productIds', 'source', 'duration'],
  },
  [ANALYTICS_EVENTS.BOOKING_COMPLETED]: {
    required: ['bookingId', 'serviceId', 'serviceName', 'date', 'time', 'totalAmount'],
    optional: ['merchantId', 'merchantName', 'paymentMethod'],
  },
  // Add more schemas as needed
} as const;
