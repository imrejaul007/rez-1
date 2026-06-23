# ALL API ENDPOINTS - COMPLETE LIST

**Quick Reference Guide: Every API Endpoint in REZ App**

Total Endpoints: 250+

---

## Authentication & User (12 endpoints)

```
POST   /user/auth/send-otp              Send OTP for login/register
POST   /user/auth/verify-otp            Verify OTP and authenticate
POST   /user/auth/refresh-token         Refresh access token
POST   /user/auth/logout                Logout user
GET    /user/auth/me                    Get current user profile
PUT    /user/auth/profile               Update user profile
POST   /user/auth/complete-onboarding   Complete onboarding
DELETE /user/auth/account               Delete account
GET    /user/auth/statistics            Get user statistics
PUT    /user/preferences                Update user preferences
GET    /user/preferences                Get user preferences
POST   /user/avatar                     Upload avatar image
```

---

## Products (20 endpoints)

```
GET    /products                        Get products list (paginated)
GET    /products/:id                    Get product by ID
GET    /products/featured               Get featured products
GET    /products/new-arrivals           Get new arrival products
GET    /products/search                 Search products
GET    /products/suggestions            Get search suggestions
GET    /products/popular-searches       Get popular search terms
GET    /products/category/:slug         Get products by category
GET    /products/store/:id              Get products by store
GET    /products/:id/recommendations    Get product recommendations
GET    /products/:id/related            Get related products
GET    /products/:id/frequently-bought  Get frequently bought together
GET    /products/:id/bundles            Get product bundles
GET    /products/:id/availability       Check product availability
POST   /products/:id/track-view         Track product view
GET    /products/:id/analytics          Get product analytics
GET    /products/:id/reviews            Get product reviews
POST   /products/:id/reviews            Add product review
PUT    /products/:id/reviews/:reviewId  Update review
DELETE /products/:id/reviews/:reviewId  Delete review
```

---

## Categories (8 endpoints)

```
GET    /categories                      Get all categories
GET    /categories/:id                  Get category by ID
GET    /categories/:id/products         Get category products
GET    /categories/featured             Get featured categories
GET    /categories/trending             Get trending categories
GET    /categories/:id/subcategories    Get subcategories
GET    /categories/tree                 Get category tree
GET    /categories/:id/filters          Get available filters
```

---

## Cart (15 endpoints)

```
GET    /cart                            Get user cart
POST   /cart/add                        Add item to cart
PUT    /cart/item/:productId            Update cart item
DELETE /cart/item/:productId            Remove cart item
DELETE /cart/clear                      Clear entire cart
POST   /cart/coupon                     Apply coupon code
DELETE /cart/coupon                     Remove coupon
GET    /cart/summary                    Get cart summary
GET    /cart/validate                   Validate cart items
POST   /cart/lock                       Lock item at price
GET    /cart/locked                     Get locked items
DELETE /cart/lock/:productId            Unlock item
POST   /cart/lock/:productId/move-to-cart  Move locked item to cart
POST   /cart/merge                      Merge guest cart
GET    /cart/shipping-estimates         Get shipping estimates
```

---

## Orders (18 endpoints)

```
POST   /orders                          Create new order
GET    /orders                          Get user orders (paginated)
GET    /orders/:id                      Get order by ID
GET    /orders/:id/tracking             Get order tracking
PATCH  /orders/:id/cancel               Cancel order
POST   /orders/:id/rate                 Rate/review order
GET    /orders/stats                    Get order statistics
PATCH  /orders/:id/status               Update order status (admin)
POST   /orders/:id/refund               Request refund
GET    /orders/:id/invoice              Get order invoice
POST   /orders/:id/reorder              Reorder same items
GET    /orders/recent                   Get recent orders
GET    /orders/:id/timeline             Get order timeline
POST   /orders/:id/support              Create support ticket for order
GET    /orders/:id/items                Get order items
PATCH  /orders/:id/delivery-address     Update delivery address
POST   /orders/:id/dispute              Raise dispute
GET    /orders/delivery-slots           Get available delivery slots
```

---

## Stores (15 endpoints)

```
GET    /stores                          Get all stores
GET    /stores/:id                      Get store by ID
GET    /stores/:id/products             Get store products
GET    /stores/:id/categories           Get store categories
GET    /stores/:id/reviews              Get store reviews
POST   /stores/:id/reviews              Add store review
GET    /stores/:id/outlets              Get store outlets
GET    /stores/:id/availability         Get store availability
POST   /stores/:id/follow               Follow store
DELETE /stores/:id/follow               Unfollow store
GET    /stores/featured                 Get featured stores
GET    /stores/nearby                   Get nearby stores
GET    /stores/search                   Search stores
GET    /stores/:id/offers               Get store offers
GET    /stores/:id/events               Get store events
```

---

## Wishlist (12 endpoints)

```
GET    /wishlist                        Get user wishlist
POST   /wishlist/items                  Add item to wishlist
DELETE /wishlist/items/:itemId          Remove from wishlist
POST   /wishlist/items/:itemId/move-to-cart  Move to cart
GET    /wishlist/items/:itemId          Get wishlist item
POST   /wishlist/:id/generate-share-link Generate shareable link
GET    /wishlist/public/:shareCode      Get public wishlist
PATCH  /wishlist/:id/privacy            Update privacy settings
POST   /wishlist/public/:code/like      Like wishlist
POST   /wishlist/public/:code/comments  Add comment
GET    /wishlist/shared-with-me         Get shared wishlists
POST   /wishlist/:id/items/:itemId/reserve Reserve gift
```

---

## Group Buying (15 endpoints)

```
GET    /group-buying/products           Get available products
GET    /group-buying/products/:id       Get product details
GET    /group-buying/groups             Get available groups
GET    /group-buying/groups/my-groups   Get user's groups
GET    /group-buying/groups/:id         Get group details
GET    /group-buying/groups/code/:code  Get group by code
POST   /group-buying/groups             Create new group
POST   /group-buying/groups/join        Join group
POST   /group-buying/groups/:id/leave   Leave group
POST   /group-buying/groups/:id/messages Send message to group
GET    /group-buying/groups/:id/messages Get group messages
POST   /group-buying/groups/:id/checkout Checkout group order
POST   /group-buying/groups/:id/cancel  Cancel group
GET    /group-buying/groups/:id/invite  Get invite link
GET    /group-buying/stats              Get statistics
```

---

## Store Messaging (12 endpoints)

```
GET    /messages/conversations          Get conversations list
GET    /messages/conversations/:id      Get conversation
POST   /messages/conversations          Create/get conversation
GET    /messages/conversations/:id/messages Get messages
POST   /messages/conversations/:id/messages Send message
PATCH  /messages/conversations/:id/messages/:msgId/read Mark as read
PATCH  /messages/conversations/:id/read Mark conversation as read
PATCH  /messages/conversations/:id/archive Archive conversation
PATCH  /messages/conversations/:id/unarchive Unarchive
DELETE /messages/conversations/:id      Delete conversation
GET    /stores/:id/availability         Get store availability
GET    /messages/search                 Search messages
```

---

## Support Chat (18 endpoints)

```
POST   /support/tickets                 Create ticket
GET    /support/tickets                 Get user tickets
GET    /support/tickets/:id             Get ticket details
POST   /support/tickets/:id/messages    Send message
GET    /support/tickets/:id/messages    Get messages
POST   /support/tickets/:id/close       Close ticket
POST   /support/tickets/:id/reopen      Reopen ticket
POST   /support/tickets/:id/rate        Rate support
POST   /support/tickets/:id/upload      Upload attachment
GET    /support/categories              Get support categories
GET    /support/faq                     Get FAQs
GET    /support/faq/search              Search FAQs
POST   /support/tickets/:id/call-request Request call
POST   /support/tickets/:id/video-request Request video call
GET    /support/queue/position          Get queue position
GET    /support/agents/available        Get available agents
POST   /support/tickets/:id/transfer    Transfer ticket
GET    /support/tickets/:id/history     Get ticket history
```

---

## Social Media Earnings (6 endpoints)

```
POST   /social-media/submit             Submit social post
GET    /social-media/earnings           Get user earnings
GET    /social-media/posts              Get user posts
GET    /social-media/posts/:id          Get post by ID
DELETE /social-media/posts/:id          Delete post
GET    /social-media/stats              Get platform statistics
```

---

## Bill Verification (11 endpoints)

```
POST   /bill-verification/upload        Upload bill image
POST   /bill-verification/submit        Submit for verification
GET    /bill-verification/submissions   Get submissions
GET    /bill-verification/submissions/:id Get submission details
GET    /bill-verification/history       Get verification history
POST   /bill-verification/validate      Validate bill data
GET    /bill-verification/earnings      Get earnings from bills
POST   /bill-verification/resubmit      Resubmit rejected bill
DELETE /bill-verification/:id           Delete submission
GET    /bill-verification/stats         Get statistics
GET    /bill-verification/supported-stores Get supported stores
```

---

## Loyalty & Redemption (8 endpoints)

```
GET    /loyalty/points                  Get points balance
GET    /loyalty/history                 Get points history
GET    /loyalty/rewards                 Get available rewards
POST   /loyalty/rewards/:id/redeem      Redeem reward
GET    /loyalty/rewards/my-rewards      Get redeemed rewards
GET    /loyalty/tiers                   Get tier information
GET    /loyalty/leaderboard             Get leaderboard
POST   /loyalty/points/transfer         Transfer points (if allowed)
```

---

## Payment & Wallet (22 endpoints)

```
GET    /wallet                          Get wallet balance
GET    /wallet/transactions             Get transaction history
POST   /wallet/topup                    Add money to wallet
POST   /wallet/send                     Send money to user
POST   /wallet/withdraw                 Withdraw to bank
GET    /wallet/linked-accounts          Get linked bank accounts
POST   /wallet/link-account             Link bank account
DELETE /wallet/unlink-account/:id       Unlink account
POST   /payments/razorpay/create-order  Create Razorpay order
POST   /payments/razorpay/verify        Verify Razorpay payment
POST   /payments/stripe/create-intent   Create Stripe payment intent
POST   /payments/stripe/confirm         Confirm Stripe payment
GET    /payments/methods                Get saved payment methods
POST   /payments/methods                Add payment method
DELETE /payments/methods/:id            Delete payment method
POST   /payments/upi/verify             Verify UPI ID
POST   /payments/upi/collect            Initiate UPI collect
GET    /paybill/history                 Get PayBill history
POST   /paybill/pay                     Pay bill via wallet
GET    /paybill/categories              Get bill categories
GET    /paybill/operators               Get operators
POST   /paybill/fetch-bill              Fetch bill details
```

---

## Referrals (10 endpoints)

```
GET    /referrals/code                  Get referral code
POST   /referrals/apply                 Apply referral code
GET    /referrals/stats                 Get referral statistics
GET    /referrals/history               Get referral history
GET    /referrals/earnings              Get referral earnings
POST   /referrals/share                 Share referral code
GET    /referrals/leaderboard           Get referral leaderboard
GET    /referrals/tiers                 Get tier benefits
GET    /referrals/rewards               Get available rewards
POST   /referrals/rewards/:id/claim     Claim reward
```

---

## Follow System (13 endpoints)

```
POST   /api/social/users/:id/follow     Follow user
POST   /api/social/users/:id/unfollow   Unfollow user
GET    /api/social/users/:id/followers  Get followers
GET    /api/social/users/:id/following  Get following
GET    /api/social/suggested-users      Get suggestions
GET    /api/social/users/:id/is-following Check if following
GET    /api/social/users/:id/follow-counts Get counts
GET    /api/social/follow-requests/pending Get pending requests
POST   /api/social/follow-requests/:id/accept Accept request
POST   /api/social/follow-requests/:id/reject Reject request
GET    /api/social/users/:id/mutuals    Get mutual followers
DELETE /api/social/followers/:id        Remove follower
POST   /api/social/users/:id/block      Block user
```

---

## Notifications (10 endpoints)

```
GET    /notifications                   Get notifications
GET    /notifications/unread            Get unread notifications
PATCH  /notifications/:id/read          Mark as read
PATCH  /notifications/read-all          Mark all as read
DELETE /notifications/:id               Delete notification
DELETE /notifications/clear-all         Clear all notifications
GET    /notifications/settings          Get notification settings
PUT    /notifications/settings          Update settings
POST   /notifications/test              Send test notification
POST   /notifications/fcm-token         Update FCM token
```

---

## Reviews & Ratings (12 endpoints)

```
POST   /reviews                         Create review
GET    /reviews                         Get reviews (paginated)
GET    /reviews/:id                     Get review by ID
PUT    /reviews/:id                     Update review
DELETE /reviews/:id                     Delete review
POST   /reviews/:id/helpful             Mark as helpful
GET    /reviews/product/:productId      Get product reviews
GET    /reviews/store/:storeId          Get store reviews
GET    /reviews/user/:userId            Get user reviews
GET    /reviews/my-reviews              Get my reviews
POST   /reviews/:id/report              Report review
GET    /reviews/stats                   Get review statistics
```

---

## Addresses (8 endpoints)

```
GET    /addresses                       Get user addresses
POST   /addresses                       Add new address
GET    /addresses/:id                   Get address by ID
PUT    /addresses/:id                   Update address
DELETE /addresses/:id                   Delete address
PATCH  /addresses/:id/set-default       Set as default
GET    /addresses/validate              Validate address
POST   /addresses/geocode               Geocode address
```

---

## Offers & Discounts (12 endpoints)

```
GET    /offers                          Get all offers
GET    /offers/active                   Get active offers
GET    /offers/:id                      Get offer details
GET    /offers/category/:id             Get category offers
GET    /offers/store/:id                Get store offers
POST   /offers/:id/claim                Claim offer
GET    /offers/my-offers                Get claimed offers
GET    /offers/featured                 Get featured offers
POST   /offers/:id/track                Track offer view
GET    /offers/trending                 Get trending offers
GET    /coupons                         Get available coupons
POST   /coupons/validate                Validate coupon code
```

---

## Vouchers (8 endpoints)

```
GET    /vouchers                        Get user vouchers
GET    /vouchers/available              Get available vouchers
POST   /vouchers/:id/purchase           Purchase voucher
POST   /vouchers/:id/redeem             Redeem voucher
GET    /vouchers/:id                    Get voucher details
POST   /vouchers/:id/gift               Gift voucher
GET    /vouchers/history                Get voucher history
GET    /vouchers/balance                Get voucher balance
```

---

## Events (10 endpoints)

```
GET    /events                          Get events list
GET    /events/:id                      Get event details
POST   /events/:id/book                 Book event ticket
GET    /events/my-bookings              Get user bookings
GET    /events/upcoming                 Get upcoming events
GET    /events/category/:id             Get events by category
POST   /events/:id/interested           Mark interested
GET    /events/:id/attendees            Get attendees
POST   /events/:id/check-in             Check-in to event
POST   /events/:id/rate                 Rate event
```

---

## Search (8 endpoints)

```
GET    /search                          Global search
GET    /search/products                 Search products
GET    /search/stores                   Search stores
GET    /search/suggestions              Get suggestions
GET    /search/history                  Get search history
DELETE /search/history                  Clear search history
GET    /search/trending                 Get trending searches
POST   /search/save                     Save search query
```

---

## Gamification (12 endpoints)

```
GET    /gamification/points             Get user points
GET    /gamification/achievements       Get achievements
POST   /gamification/achievements/:id/claim Claim achievement
GET    /gamification/leaderboard        Get leaderboard
GET    /gamification/challenges         Get active challenges
POST   /gamification/challenges/:id/complete Complete challenge
GET    /gamification/badges             Get earned badges
GET    /gamification/level              Get user level
GET    /gamification/rewards            Get available rewards
POST   /gamification/rewards/:id/redeem Redeem reward
GET    /gamification/history            Get points history
GET    /gamification/streaks            Get daily streaks
```

---

## Admin Endpoints (20+ endpoints)

```
GET    /admin/dashboard                 Get dashboard stats
GET    /admin/users                     Get all users
GET    /admin/users/:id                 Get user details
PATCH  /admin/users/:id/status          Update user status
GET    /admin/orders                    Get all orders
PATCH  /admin/orders/:id/status         Update order status
GET    /admin/products                  Get all products
POST   /admin/products                  Create product
PUT    /admin/products/:id              Update product
DELETE /admin/products/:id              Delete product
GET    /admin/stores                    Get all stores
POST   /admin/stores                    Create store
PUT    /admin/stores/:id                Update store
DELETE /admin/stores/:id                Delete store
GET    /admin/support/tickets           Get all tickets
POST   /admin/support/tickets/:id/assign Assign ticket
GET    /admin/analytics                 Get analytics
GET    /admin/reports                   Get reports
POST   /admin/notifications/broadcast   Broadcast notification
GET    /admin/settings                  Get app settings
PUT    /admin/settings                  Update settings
```

---

## File Upload (5 endpoints)

```
POST   /upload/image                    Upload single image
POST   /upload/images                   Upload multiple images
POST   /upload/document                 Upload document
POST   /upload/video                    Upload video
DELETE /upload/:id                      Delete uploaded file
```

---

## Analytics (8 endpoints)

```
POST   /analytics/track-event           Track custom event
POST   /analytics/page-view             Track page view
POST   /analytics/screen-view           Track screen view
POST   /analytics/user-action           Track user action
GET    /analytics/user-stats            Get user analytics
POST   /analytics/crash-report          Report crash
POST   /analytics/performance           Report performance metric
GET    /analytics/summary               Get analytics summary
```

---

## Health & Status (5 endpoints)

```
GET    /health                          Health check
GET    /status                          API status
GET    /version                         API version
GET    /ping                            Ping server
GET    /metrics                         Get metrics
```

---

## Total Endpoint Count by Category

- Authentication: 12
- Products: 20
- Categories: 8
- Cart: 15
- Orders: 18
- Stores: 15
- Wishlist: 12
- Group Buying: 15
- Store Messaging: 12
- Support Chat: 18
- Social Media: 6
- Bill Verification: 11
- Loyalty: 8
- Payment & Wallet: 22
- Referrals: 10
- Follow System: 13
- Notifications: 10
- Reviews: 12
- Addresses: 8
- Offers: 12
- Vouchers: 8
- Events: 10
- Search: 8
- Gamification: 12
- Admin: 20+
- File Upload: 5
- Analytics: 8
- Health: 5

**TOTAL: 273 API Endpoints**

---

## Additional Endpoints Discovered During Development

The frontend likely uses additional endpoints not documented here. Backend developers should:

1. Monitor API access logs
2. Check for 404 errors
3. Review frontend service files
4. Ask frontend team for missing endpoints
5. Document new endpoints as they're implemented

---

## API URL Structure

All endpoints are prefixed with `/api` in production:

```
Base URL: http://localhost:5001/api (development)
Base URL: https://api.rezapp.com/api (production)

Example: GET https://api.rezapp.com/api/products
```

---

## Rate Limiting Recommendations

```
Authentication Endpoints: 5 requests per 15 minutes
General API: 100 requests per 15 minutes
File Uploads: 10 uploads per hour
Search: 50 requests per minute
Admin Endpoints: 200 requests per 15 minutes
```

---

## Documentation Sources

For detailed documentation of each endpoint:
- See `BACKEND_IMPLEMENTATION_GUIDE.md` for request/response schemas
- See `API_CONTRACTS.md` for TypeScript interfaces
- See `WEBSOCKET_EVENTS.md` for real-time events
- See `BACKEND_QUICK_START.md` for implementation examples
