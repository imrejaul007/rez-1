# BACKEND IMPLEMENTATION GUIDE

**Complete API Documentation for REZ App Backend**

Last Updated: 2025-10-27

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Security](#authentication--security)
3. [Environment Variables](#environment-variables)
4. [API Endpoints by Feature](#api-endpoints-by-feature)
5. [WebSocket Events](#websocket-events)
6. [Database Schema Requirements](#database-schema-requirements)
7. [Third-Party Integration Setup](#third-party-integration-setup)
8. [Error Handling Standards](#error-handling-standards)
9. [Response Format Standards](#response-format-standards)
10. [Rate Limiting & Security](#rate-limiting--security)

---

## Overview

This guide provides complete documentation for implementing the REZ App backend. The frontend expects all APIs to be accessible at:

- **Development**: `http://localhost:5001/api`
- **Production**: `https://api.rezapp.com/api`

All endpoints use RESTful conventions and return JSON responses.

---

## Authentication & Security

### JWT Implementation

All authenticated endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

#### Token Endpoints

##### Send OTP
```http
POST /user/auth/send-otp
Content-Type: application/json

Request:
{
  "phoneNumber": "+919876543210",
  "email": "user@example.com",  // Optional
  "referralCode": "ABC123"       // Optional
}

Response:
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 300  // seconds
  }
}
```

##### Verify OTP & Authenticate
```http
POST /user/auth/verify-otp
Content-Type: application/json

Request:
{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "phoneNumber": "+919876543210",
      "email": null,
      "profile": {
        "firstName": null,
        "lastName": null,
        "avatar": null
      },
      "wallet": {
        "balance": 0,
        "totalEarned": 0,
        "totalSpent": 0
      },
      "isVerified": true,
      "isOnboarded": false,
      "createdAt": "2025-10-27T10:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 86400  // seconds
    }
  }
}
```

##### Refresh Token
```http
POST /user/auth/refresh-token
Content-Type: application/json

Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "new_access_token",
      "refreshToken": "new_refresh_token",
      "expiresIn": 86400
    }
  }
}
```

##### Logout
```http
POST /user/auth/logout
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

##### Get Current User Profile
```http
GET /user/auth/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "user_123",
    "phoneNumber": "+919876543210",
    "email": "user@example.com",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://cdn.rezapp.com/avatars/user_123.jpg",
      "bio": "Shopping enthusiast",
      "dateOfBirth": "1990-01-01T00:00:00Z",
      "gender": "male",
      "location": {
        "address": "123 Main St",
        "city": "Delhi",
        "state": "Delhi",
        "pincode": "110001"
      }
    },
    "preferences": {
      "language": "en",
      "theme": "light",
      "notifications": {
        "push": true,
        "email": true,
        "sms": false
      }
    },
    "wallet": {
      "balance": 500,
      "totalEarned": 1500,
      "totalSpent": 1000
    },
    "isVerified": true,
    "isOnboarded": true
  }
}
```

---

## Environment Variables

### Required Environment Variables

```env
# Application
NODE_ENV=development
PORT=5001
APP_NAME=REZ App

# Database
MONGODB_URI=mongodb://localhost:27017/rez_app
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
REFRESH_TOKEN_EXPIRES_IN=7d

# Payment Gateways
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# SMS Gateway (Twilio/MSG91/etc)
SMS_API_KEY=xxxxx
SMS_SENDER_ID=REZAPP
SMS_API_URL=https://api.msg91.com/api/v5/

# File Storage (AWS S3/Cloudinary)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=rez-app-uploads
AWS_REGION=us-east-1

# OR use Cloudinary
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

# Google Services
GOOGLE_MAPS_API_KEY=xxxxx
GOOGLE_VISION_API_KEY=xxxxx  # For OCR

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=rez-app-xxxxx
FIREBASE_PRIVATE_KEY=xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@rez-app.iam.gserviceaccount.com

# Instagram Graph API (for verification)
INSTAGRAM_APP_ID=xxxxx
INSTAGRAM_APP_SECRET=xxxxx
INSTAGRAM_ACCESS_TOKEN=xxxxx

# Email Service (SendGrid/Mailgun)
SENDGRID_API_KEY=xxxxx
FROM_EMAIL=noreply@rezapp.com

# Security
ENCRYPTION_KEY=xxxxx  # 32-byte hex string
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS
FRONTEND_URL=http://localhost:8081
ALLOWED_ORIGINS=http://localhost:8081,https://rezapp.com

# WebSocket
WS_PORT=5001
WS_PATH=/ws

# Analytics
MIXPANEL_TOKEN=xxxxx
SENTRY_DSN=xxxxx
GOOGLE_ANALYTICS_ID=UA-xxxxx-1
```

---

## API Endpoints by Feature

### 1. Group Buying (~15 endpoints)

#### Get Available Products
```http
GET /group-buying/products
Authorization: Bearer <token>
Query Parameters:
  - category: string (optional)
  - minDiscount: number (optional)
  - maxPrice: number (optional)
  - sortBy: "discount" | "price" | "ending_soon" (optional)

Response:
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_123",
        "name": "Premium Wireless Headphones",
        "description": "High-quality audio",
        "image": "https://cdn.rezapp.com/products/123.jpg",
        "category": "Electronics",
        "regularPrice": 5000,
        "groupPrice": 3500,
        "discount": 30,
        "minGroupSize": 5,
        "maxGroupSize": 20,
        "timeRemaining": 86400,  // seconds
        "activeGroups": 3,
        "availableSpots": 15
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50,
      "limit": 10
    }
  }
}
```

#### Get Product Details
```http
GET /group-buying/products/:productId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Premium Wireless Headphones",
    "description": "Detailed description...",
    "images": ["url1", "url2"],
    "specifications": {...},
    "regularPrice": 5000,
    "groupPrice": 3500,
    "savings": 1500,
    "discount": 30,
    "minGroupSize": 5,
    "maxGroupSize": 20,
    "expiresAt": "2025-10-30T23:59:59Z",
    "activeGroups": [
      {
        "id": "group_456",
        "currentMembers": 3,
        "spotsRemaining": 2,
        "createdAt": "2025-10-27T10:00:00Z"
      }
    ]
  }
}
```

#### Get Available Groups
```http
GET /group-buying/groups
Authorization: Bearer <token>
Query Parameters:
  - status: "active,filling" (comma-separated)
  - category: string (optional)
  - spotsAvailable: boolean (optional)
  - expiringWithin: number (optional, hours)
  - sortBy: "newest" | "expiring_soon" | "spots_available"

Response:
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "group_456",
        "product": {...},
        "creatorId": "user_789",
        "code": "GRP-ABC123",
        "status": "filling",
        "currentMembers": 3,
        "maxMembers": 5,
        "spotsRemaining": 2,
        "members": [
          {
            "userId": "user_789",
            "name": "John Doe",
            "avatar": "url",
            "joinedAt": "2025-10-27T10:00:00Z",
            "isCreator": true
          }
        ],
        "expiresAt": "2025-10-28T10:00:00Z",
        "createdAt": "2025-10-27T10:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### Get My Groups
```http
GET /group-buying/groups/my-groups
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "group_456",
      "product": {...},
      "status": "filling",
      "role": "creator",  // or "member"
      "currentMembers": 3,
      "maxMembers": 5,
      "expiresAt": "2025-10-28T10:00:00Z"
    }
  ]
}
```

#### Get Group Details
```http
GET /group-buying/groups/:groupId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "group_456",
    "product": {...},
    "creator": {...},
    "code": "GRP-ABC123",
    "status": "filling",
    "currentMembers": 3,
    "maxMembers": 5,
    "members": [...],
    "messages": [
      {
        "id": "msg_123",
        "userId": "user_789",
        "userName": "John Doe",
        "message": "Looking forward to this deal!",
        "createdAt": "2025-10-27T10:30:00Z"
      }
    ],
    "expiresAt": "2025-10-28T10:00:00Z",
    "createdAt": "2025-10-27T10:00:00Z"
  }
}
```

#### Get Group by Code
```http
GET /group-buying/groups/code/:code
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    // Same as Get Group Details
  }
}

Error Response:
{
  "success": false,
  "error": "Group not found or expired"
}
```

#### Create New Group
```http
POST /group-buying/groups
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "productId": "prod_123",
  "maxMembers": 5,  // Optional, defaults to product's minGroupSize
  "message": "Join my group for great savings!"  // Optional
}

Response:
{
  "success": true,
  "data": {
    "id": "group_456",
    "code": "GRP-ABC123",
    "inviteUrl": "https://rezapp.com/group/GRP-ABC123",
    "product": {...},
    "status": "filling",
    "currentMembers": 1,
    "maxMembers": 5,
    "expiresAt": "2025-10-28T10:00:00Z",
    "createdAt": "2025-10-27T10:00:00Z"
  }
}
```

#### Join Existing Group
```http
POST /group-buying/groups/join
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "groupCode": "GRP-ABC123"
}

Response:
{
  "success": true,
  "data": {
    "id": "group_456",
    "status": "filling",  // or "complete" if now full
    "currentMembers": 4,
    "maxMembers": 5,
    "members": [...]
  }
}

Error Responses:
{
  "success": false,
  "error": "Group is full"
}
{
  "success": false,
  "error": "You are already a member of this group"
}
{
  "success": false,
  "error": "Group has expired"
}
```

#### Leave Group
```http
POST /group-buying/groups/:groupId/leave
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "message": "Successfully left the group"
  }
}

Error Response:
{
  "success": false,
  "error": "Creator cannot leave group. Cancel the group instead."
}
```

#### Send Message to Group
```http
POST /group-buying/groups/:groupId/messages
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "message": "Can't wait for this deal!"
}

Response:
{
  "success": true,
  "data": {
    "id": "msg_123",
    "userId": "user_789",
    "userName": "John Doe",
    "userAvatar": "url",
    "message": "Can't wait for this deal!",
    "createdAt": "2025-10-27T11:00:00Z"
  }
}
```

#### Get Group Messages
```http
GET /group-buying/groups/:groupId/messages
Authorization: Bearer <token>
Query Parameters:
  - limit: number (optional, default 50)
  - before: ISO date string (optional, for pagination)

Response:
{
  "success": true,
  "data": [
    {
      "id": "msg_123",
      "userId": "user_789",
      "userName": "John Doe",
      "userAvatar": "url",
      "message": "Can't wait for this deal!",
      "createdAt": "2025-10-27T11:00:00Z"
    }
  ]
}
```

#### Checkout Group Order
```http
POST /group-buying/groups/:groupId/checkout
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "paymentMethod": "razorpay" | "stripe" | "wallet" | "cod",
  "deliveryAddressId": "addr_123"
}

Response:
{
  "success": true,
  "data": {
    "orderId": "order_789",
    "paymentUrl": "https://razorpay.com/payment/...",  // For online payment
    "amount": 3500,
    "status": "pending"
  }
}

Error Responses:
{
  "success": false,
  "error": "Group is not complete yet"
}
{
  "success": false,
  "error": "Insufficient wallet balance"
}
```

#### Get Group Buying Statistics
```http
GET /group-buying/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalGroupsJoined": 5,
    "totalSavings": 7500,
    "activeGroups": 2,
    "completedGroups": 3,
    "averageGroupSize": 6,
    "mostPopularCategory": "Electronics"
  }
}
```

#### Cancel Group (Creator Only)
```http
POST /group-buying/groups/:groupId/cancel
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "reason": "Changed my mind"  // Optional
}

Response:
{
  "success": true,
  "data": {
    "message": "Group cancelled successfully"
  }
}

Error Response:
{
  "success": false,
  "error": "Only the group creator can cancel the group"
}
```

#### Get Invite Link
```http
GET /group-buying/groups/:groupId/invite
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "inviteUrl": "https://rezapp.com/group/GRP-ABC123",
    "code": "GRP-ABC123",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS..."
  }
}
```

---

### 2. Store Messaging (~12 endpoints)

#### Get Conversations
```http
GET /messages/conversations
Authorization: Bearer <token>
Query Parameters:
  - status: "all" | "unread" | "archived" (optional)
  - page: number (optional, default 1)
  - limit: number (optional, default 20)

Response:
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_123",
        "store": {
          "id": "store_456",
          "name": "Best Electronics",
          "avatar": "url",
          "isOnline": true
        },
        "lastMessage": {
          "id": "msg_789",
          "content": "Your order is ready",
          "sender": "store",
          "createdAt": "2025-10-27T11:00:00Z"
        },
        "unreadCount": 2,
        "status": "active",
        "createdAt": "2025-10-25T10:00:00Z",
        "updatedAt": "2025-10-27T11:00:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 3,
      "total": 30,
      "limit": 20
    },
    "summary": {
      "totalConversations": 30,
      "unreadCount": 5,
      "activeConversations": 25
    }
  }
}
```

#### Get Single Conversation
```http
GET /messages/conversations/:conversationId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "conv_123",
    "store": {...},
    "order": {  // Optional, if conversation is about an order
      "id": "order_789",
      "orderNumber": "ORD-2025-001",
      "status": "processing"
    },
    "status": "active",
    "createdAt": "2025-10-25T10:00:00Z"
  }
}
```

#### Create or Get Conversation with Store
```http
POST /messages/conversations
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "storeId": "store_456",
  "orderId": "order_789"  // Optional
}

Response:
{
  "success": true,
  "data": {
    "id": "conv_123",
    "store": {...},
    "order": {...},  // If orderId provided
    "status": "active",
    "createdAt": "2025-10-27T11:00:00Z"
  }
}
```

#### Get Messages in Conversation
```http
GET /messages/conversations/:conversationId/messages
Authorization: Bearer <token>
Query Parameters:
  - page: number (optional, default 1)
  - limit: number (optional, default 50)

Response:
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_789",
        "conversationId": "conv_123",
        "sender": "user" | "store",
        "senderDetails": {
          "id": "user_123",
          "name": "John Doe",
          "avatar": "url"
        },
        "type": "text" | "image" | "location" | "order_update",
        "content": "Is my order ready?",
        "attachments": [],  // Array of attachment objects if type is image
        "status": "sent" | "delivered" | "read",
        "createdAt": "2025-10-27T11:00:00Z",
        "readAt": "2025-10-27T11:05:00Z"
      }
    ],
    "pagination": {...},
    "conversation": {...}
  }
}
```

#### Send Message
```http
POST /messages/conversations/:conversationId/messages
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "content": "When will my order arrive?",
  "type": "text",
  "replyToMessageId": "msg_456",  // Optional
  "location": {  // Optional, for type=location
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "123 Main St"
  }
}

Response:
{
  "success": true,
  "data": {
    "id": "msg_789",
    "conversationId": "conv_123",
    "sender": "user",
    "type": "text",
    "content": "When will my order arrive?",
    "status": "sent",
    "createdAt": "2025-10-27T11:00:00Z"
  }
}
```

#### Send Message with Attachments
```http
POST /messages/conversations/:conversationId/messages
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request:
{
  "content": "Here's a photo of the issue",
  "type": "image",
  "attachments": [File, File]  // Multiple files
}

Response:
{
  "success": true,
  "data": {
    "id": "msg_789",
    "type": "image",
    "content": "Here's a photo of the issue",
    "attachments": [
      {
        "id": "att_123",
        "url": "https://cdn.rezapp.com/messages/att_123.jpg",
        "type": "image/jpeg",
        "size": 245760
      }
    ],
    "createdAt": "2025-10-27T11:00:00Z"
  }
}
```

#### Mark Message as Read
```http
PATCH /messages/conversations/:conversationId/messages/:messageId/read
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "messageId": "msg_789",
    "readAt": "2025-10-27T11:05:00Z"
  }
}
```

#### Mark Conversation as Read
```http
PATCH /messages/conversations/:conversationId/read
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "conversationId": "conv_123",
    "messagesRead": 5
  }
}
```

#### Archive Conversation
```http
PATCH /messages/conversations/:conversationId/archive
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "conv_123",
    "status": "archived",
    "archivedAt": "2025-10-27T11:00:00Z"
  }
}
```

#### Unarchive Conversation
```http
PATCH /messages/conversations/:conversationId/unarchive
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "conv_123",
    "status": "active"
  }
}
```

#### Delete Conversation
```http
DELETE /messages/conversations/:conversationId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "message": "Conversation deleted successfully"
  }
}
```

#### Get Store Availability
```http
GET /stores/:storeId/availability
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "storeId": "store_456",
    "isOnline": true,
    "status": "available" | "busy" | "offline",
    "averageResponseTime": 300,  // seconds
    "businessHours": {
      "monday": { "open": "09:00", "close": "21:00" },
      "tuesday": { "open": "09:00", "close": "21:00" },
      // ... other days
    },
    "isWithinBusinessHours": true
  }
}
```

#### Search Messages
```http
GET /messages/search
Authorization: Bearer <token>
Query Parameters:
  - query: string (required)
  - conversationId: string (optional)

Response:
{
  "success": true,
  "data": [
    {
      "id": "msg_789",
      "conversationId": "conv_123",
      "content": "Matching message content...",
      "sender": "user",
      "createdAt": "2025-10-27T11:00:00Z"
    }
  ]
}
```

---

### 3. Support Chat (~10 endpoints)

See [Support Chat Section](#support-chat-endpoints) for all 10 endpoints including:
- Create ticket
- Get ticket history
- Send messages
- Upload attachments
- Agent management
- FAQ search
- Queue management
- Call/Video requests
- Rating system

**[Continuing in next message due to length...]**
