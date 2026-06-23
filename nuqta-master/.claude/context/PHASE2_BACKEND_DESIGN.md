# Phase 2: Backend Architecture Design

## Overview
Design comprehensive Node.js + Express.js + MongoDB backend architecture based on frontend analysis.

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + OTP verification
- **Real-time**: Socket.io
- **File Storage**: Multer + GridFS/AWS S3
- **Validation**: Joi/express-validator
- **Security**: Helmet, CORS, rate limiting

### Project Structure
```
backend/
├── src/
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API route handlers
│   ├── controllers/      # Business logic
│   ├── middleware/       # Custom middleware
│   ├── services/         # External services (OTP, payments)
│   ├── utils/            # Helper functions
│   ├── config/           # Configuration files
│   └── validators/       # Input validation schemas
├── uploads/              # File upload directory
├── tests/               # Test files
├── .env                 # Environment variables
├── package.json
└── server.js            # Main server file
```

## Database Schema Design

### 1. Users Collection
```javascript
{
  _id: ObjectId,
  phoneNumber: String,          // Primary identifier
  email: String,
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,             // URL to profile picture
    dateOfBirth: Date,
    gender: String,
    location: {
      address: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: [Number]     // [longitude, latitude]
    }
  },
  preferences: {
    language: String,
    notifications: Boolean,
    categories: [ObjectId],     // Preferred categories
    theme: String              // light/dark
  },
  wallet: {
    balance: Number,
    totalEarned: Number,
    totalSpent: Number
  },
  auth: {
    isVerified: Boolean,
    isOnboarded: Boolean,
    lastLogin: Date,
    refreshToken: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Categories Collection
```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,
  description: String,
  icon: String,                // Icon URL or name
  image: String,               // Category banner image
  type: String,                // 'going_out', 'home_delivery', 'earn', 'play'
  parentCategory: ObjectId,    // For subcategories
  isActive: Boolean,
  sortOrder: Number,
  metadata: {
    color: String,             // Category theme color
    tags: [String]
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Stores Collection
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  logo: String,                // Store logo URL
  banner: String,              // Store banner image
  category: ObjectId,          // Reference to categories
  location: {
    address: String,
    city: String,
    coordinates: [Number],
    deliveryRadius: Number     // in kilometers
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  ratings: {
    average: Number,           // 0-5 stars
    count: Number,
    reviews: [ObjectId]        // Reference to reviews
  },
  offers: {
    cashback: Number,          // Percentage
    discounts: [ObjectId],     // Reference to offers
    isPartner: Boolean         // Partner store status
  },
  operationalInfo: {
    hours: {
      open: String,
      close: String,
      days: [String]           // ['monday', 'tuesday', ...]
    },
    deliveryTime: String,      // "30-45 mins"
    minimumOrder: Number
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Products Collection
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  category: ObjectId,          // Reference to categories
  store: ObjectId,             // Reference to stores
  images: [String],            // Array of image URLs
  price: {
    original: Number,
    selling: Number,
    discount: Number           // Percentage
  },
  inventory: {
    stock: Number,
    isAvailable: Boolean,
    variants: [{              // Size, color, etc.
      type: String,           // 'size', 'color'
      value: String,          // 'XL', 'Red'
      price: Number,
      stock: Number
    }]
  },
  ratings: {
    average: Number,
    count: Number,
    reviews: [ObjectId]
  },
  tags: [String],              // Searchable tags
  specifications: [{
    key: String,
    value: String
  }],
  isActive: Boolean,
  isFeatured: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Carts Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId,              // Reference to users
  items: [{
    product: ObjectId,         // Reference to products
    store: ObjectId,           // Reference to stores
    quantity: Number,
    variant: {
      type: String,
      value: String
    },
    price: Number,             // Price at time of adding
    addedAt: Date
  }],
  totals: {
    subtotal: Number,
    tax: Number,
    delivery: Number,
    discount: Number,
    total: Number
  },
  isActive: Boolean,
  expiresAt: Date,             // Auto-cleanup old carts
  createdAt: Date,
  updatedAt: Date
}
```

### 6. Orders Collection
```javascript
{
  _id: ObjectId,
  orderNumber: String,         // Unique order identifier
  user: ObjectId,              // Reference to users
  items: [{
    product: ObjectId,
    store: ObjectId,
    quantity: Number,
    variant: Object,
    price: Number
  }],
  totals: {
    subtotal: Number,
    tax: Number,
    delivery: Number,
    discount: Number,
    total: Number
  },
  payment: {
    method: String,            // 'wallet', 'card', 'cod'
    status: String,            // 'pending', 'paid', 'failed'
    transactionId: String
  },
  delivery: {
    address: {
      name: String,
      phone: String,
      address: String,
      city: String,
      pincode: String,
      coordinates: [Number]
    },
    status: String,            // 'pending', 'confirmed', 'shipped', 'delivered'
    estimatedTime: Date,
    actualTime: Date,
    trackingId: String
  },
  status: String,              // 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled'
  createdAt: Date,
  updatedAt: Date
}
```

### 7. Videos Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  creator: ObjectId,           // Reference to users
  videoUrl: String,            // Video file URL
  thumbnail: String,           // Thumbnail image URL
  category: String,            // 'trending_me', 'trending_her', 'waist', etc.
  tags: [String],
  products: [ObjectId],        // Associated products (shoppable videos)
  engagement: {
    views: Number,
    likes: [ObjectId],         // User IDs who liked
    shares: Number,
    comments: [ObjectId]       // Reference to comments
  },
  duration: Number,            // in seconds
  isPublished: Boolean,
  isFeatured: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 8. Projects Collection (Earn System)
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  category: String,            // 'review', 'social_share', 'ugc_content', etc.
  type: String,                // 'video', 'photo', 'text', 'visit'
  requirements: {
    minWords: Number,          // For text projects
    minDuration: Number,       // For video projects
    location: String,          // If location-specific
    products: [ObjectId]       // If product-specific
  },
  reward: {
    amount: Number,
    currency: String,
    bonusMultiplier: Number
  },
  limits: {
    maxCompletions: Number,    // Per user
    totalBudget: Number,
    expiryDate: Date
  },
  status: String,              // 'active', 'paused', 'completed', 'expired'
  completions: [{
    user: ObjectId,
    completedAt: Date,
    submission: {
      type: String,            // 'text', 'image', 'video', 'rating'
      content: String,         // URL or text content
      metadata: Object         // Additional data
    },
    status: String,            // 'pending', 'approved', 'rejected'
    paidAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 9. Transactions Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId,              // Reference to users
  type: String,                // 'earning', 'spending', 'refund', 'withdrawal'
  amount: Number,
  description: String,
  source: {
    type: String,              // 'project', 'order', 'referral', 'cashback'
    reference: ObjectId        // Reference to source document
  },
  status: String,              // 'pending', 'completed', 'failed'
  balanceBefore: Number,
  balanceAfter: Number,
  metadata: Object,            // Additional transaction data
  processedAt: Date,
  createdAt: Date
}
```

### 10. Notifications Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId,              // Reference to users
  title: String,
  message: String,
  type: String,                // 'info', 'success', 'warning', 'error'
  category: String,            // 'order', 'earning', 'general', 'promotional'
  data: Object,                // Additional notification data
  isRead: Boolean,
  readAt: Date,
  expiresAt: Date,
  createdAt: Date
}
```

## API Endpoints Specification

### Authentication Routes (`/api/auth`)
- `POST /send-otp` - Send OTP to phone number
- `POST /verify-otp` - Verify OTP and get JWT token
- `POST /refresh` - Refresh JWT token
- `POST /logout` - Logout and invalidate token

### User Routes (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /upload-avatar` - Upload profile picture
- `GET /preferences` - Get user preferences
- `PUT /preferences` - Update preferences

### Homepage Routes (`/api/homepage`)
- `GET /sections` - Get all homepage sections
- `GET /categories` - Get homepage categories
- `GET /recommendations` - Get personalized recommendations
- `GET /trending` - Get trending content

### Category Routes (`/api/categories`)
- `GET /` - Get all categories
- `GET /:slug` - Get category by slug
- `GET /:id/products` - Get products in category
- `GET /:id/stores` - Get stores in category

### Store Routes (`/api/stores`)
- `GET /` - Get stores with pagination/filters
- `GET /:id` - Get store details
- `GET /:id/products` - Get store products
- `GET /nearby` - Get nearby stores

### Product Routes (`/api/products`)
- `GET /` - Get products with filters/search
- `GET /:id` - Get product details
- `GET /:id/reviews` - Get product reviews
- `POST /:id/reviews` - Add product review

### Cart Routes (`/api/cart`)
- `GET /` - Get user cart
- `POST /add` - Add item to cart
- `PUT /update/:itemId` - Update cart item
- `DELETE /remove/:itemId` - Remove from cart
- `DELETE /clear` - Clear entire cart

### Order Routes (`/api/orders`)
- `GET /` - Get user order history
- `POST /` - Create new order
- `GET /:id` - Get order details
- `PUT /:id/cancel` - Cancel order

### Video Routes (`/api/videos`)
- `GET /` - Get videos with pagination/filters
- `GET /:id` - Get video details
- `POST /:id/like` - Like/unlike video
- `POST /:id/share` - Record video share
- `GET /categories` - Get video categories

### Earn Routes (`/api/earn`)
- `GET /projects` - Get available projects
- `POST /projects/:id/complete` - Submit project completion
- `GET /history` - Get earning history
- `GET /stats` - Get earning statistics

### Wallet Routes (`/api/wallet`)
- `GET /balance` - Get wallet balance
- `GET /transactions` - Get transaction history
- `POST /withdraw` - Request withdrawal

### Notification Routes (`/api/notifications`)
- `GET /` - Get user notifications
- `PUT /:id/read` - Mark notification as read
- `PUT /read-all` - Mark all as read

## Real-time Features (Socket.io)

### Events to Implement
- `order_status_update` - Order status changes
- `new_notification` - New notifications
- `wallet_update` - Wallet balance changes
- `new_project` - New earning projects available
- `video_engagement` - Real-time likes/comments

## Security Considerations

### Authentication & Authorization
- JWT tokens with refresh mechanism
- OTP-based phone verification
- Role-based access control
- Rate limiting on sensitive endpoints

### Data Protection
- Input validation and sanitization
- SQL injection prevention (NoSQL injection)
- XSS protection
- CSRF protection
- File upload security

### API Security
- CORS configuration
- Request size limiting
- API versioning
- Error handling without data leakage

## Performance Optimization

### Database Optimization
- Proper indexing strategy
- Query optimization
- Connection pooling
- Caching with Redis

### API Optimization
- Response compression
- Pagination for large datasets
- Field selection for APIs
- Background job processing

## Next Steps (Phase 3)
1. Implement Mongoose schemas based on this design
2. Create database seed scripts
3. Setup Express.js server structure
4. Implement authentication middleware
5. Create basic CRUD operations

---

*Phase 2 Status*: Backend architecture and database schema design complete