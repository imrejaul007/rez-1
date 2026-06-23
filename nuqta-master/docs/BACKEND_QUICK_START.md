# BACKEND QUICK START GUIDE

**Fast-track implementation guide for REZ App backend**

---

## Getting Started

### 1. Setup Checklist

```bash
# 1. Initialize Node.js project
npm init -y

# 2. Install core dependencies
npm install express mongoose redis socket.io jsonwebtoken bcrypt
npm install cors helmet morgan dotenv

# 3. Install API-specific dependencies
npm install multer sharp axios form-data
npm install razorpay stripe twilio
npm install @google-cloud/vision firebase-admin

# 4. Install dev dependencies
npm install --save-dev typescript @types/node @types/express
npm install --save-dev nodemon ts-node eslint prettier
```

### 2. Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB & Redis config
│   │   ├── env.ts              # Environment variables
│   │   └── constants.ts        # App constants
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication
│   │   ├── validation.ts       # Request validation
│   │   ├── rateLimit.ts        # Rate limiting
│   │   └── errorHandler.ts    # Global error handler
│   ├── models/
│   │   ├── User.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   ├── Cart.ts
│   │   ├── Store.ts
│   │   ├── GroupBuying.ts
│   │   ├── SupportTicket.ts
│   │   └── ... (30+ models)
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── products.routes.ts
│   │   ├── cart.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── groupBuying.routes.ts
│   │   ├── messages.routes.ts
│   │   ├── support.routes.ts
│   │   └── ... (20+ route files)
│   ├── controllers/
│   │   └── ... (matching controllers)
│   ├── services/
│   │   ├── ocrService.ts       # Bill OCR
│   │   ├── paymentService.ts   # Payment integration
│   │   ├── smsService.ts       # SMS/OTP
│   │   ├── emailService.ts     # Email notifications
│   │   ├── pushService.ts      # Push notifications
│   │   ├── storageService.ts   # File uploads
│   │   └── ... (utility services)
│   ├── websocket/
│   │   ├── socket.ts           # Socket.IO setup
│   │   ├── handlers/
│   │   │   ├── supportChat.ts
│   │   │   ├── cart.ts
│   │   │   └── orders.ts
│   │   └── events.ts           # Event constants
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   └── app.ts                  # Express app setup
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

### 3. Priority Implementation Order

Implement features in this order for fastest MVP:

#### Phase 1: Core Foundation (Week 1)
1. Authentication (OTP, JWT)
2. User Profile Management
3. Database Models
4. Error Handling & Logging

#### Phase 2: Product & Commerce (Week 2)
5. Products API
6. Cart API
7. Orders API
8. Payment Integration (Razorpay)

#### Phase 3: Enhanced Features (Week 3)
9. Wishlist API
10. Reviews & Ratings
11. Search API
12. Categories API

#### Phase 4: Social & Communication (Week 4)
13. Store Messaging
14. Support Chat
15. WebSocket Events
16. Push Notifications

#### Phase 5: Advanced Features (Week 5+)
17. Group Buying
18. Bill Verification (OCR)
19. Social Media Verification
20. Loyalty & Gamification

---

## Quick Implementation Templates

### 1. Basic Express Server

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database';
import routes from './routes';
import errorHandler from './middleware/errorHandler';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8081',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api', routes);

// WebSocket
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  // Import and use WebSocket handlers
});

// Error Handler
app.use(errorHandler);

// Database Connection
connectDB();

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
```

### 2. MongoDB Model Example

```typescript
// src/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  email?: string;
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';
  };
  wallet: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
  };
  isVerified: boolean;
  isOnboarded: boolean;
  role: 'user' | 'admin' | 'merchant';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      sparse: true,
      trim: true,
      lowercase: true
    },
    profile: {
      firstName: String,
      lastName: String,
      avatar: String,
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ['male', 'female', 'other']
      }
    },
    wallet: {
      balance: { type: Number, default: 0 },
      totalEarned: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 }
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isOnboarded: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'merchant'],
      default: 'user'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IUser>('User', UserSchema);
```

### 3. Authentication Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};
```

### 4. Controller Pattern

```typescript
// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { sendOTP } from '../services/smsService';

export class AuthController {
  async sendOtp(req: Request, res: Response) {
    try {
      const { phoneNumber } = req.body;

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Redis with 5 min expiry
      await redis.setex(`otp:${phoneNumber}`, 300, otp);

      // Send OTP via SMS
      await sendOTP(phoneNumber, otp);

      res.json({
        success: true,
        data: {
          message: 'OTP sent successfully',
          expiresIn: 300
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async verifyOtp(req: Request, res: Response) {
    try {
      const { phoneNumber, otp } = req.body;

      // Verify OTP from Redis
      const storedOtp = await redis.get(`otp:${phoneNumber}`);

      if (!storedOtp || storedOtp !== otp) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired OTP'
        });
      }

      // Find or create user
      let user = await User.findOne({ phoneNumber });
      if (!user) {
        user = await User.create({
          phoneNumber,
          isVerified: true
        });
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: '7d' }
      );

      // Delete OTP from Redis
      await redis.del(`otp:${phoneNumber}`);

      res.json({
        success: true,
        data: {
          user,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 86400
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

### 5. Route Setup

```typescript
// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation';
import { authValidation } from '../validations/auth.validation';

const router = Router();
const authController = new AuthController();

router.post(
  '/send-otp',
  validate(authValidation.sendOtp),
  authController.sendOtp
);

router.post(
  '/verify-otp',
  validate(authValidation.verifyOtp),
  authController.verifyOtp
);

export default router;
```

### 6. Validation Middleware

```typescript
// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      errors: errors.array()
    });
  };
};
```

---

## Common Patterns

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "errors": {  // Optional validation errors
    "field": ["error1", "error2"]
  }
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "current": 1,
      "pages": 10,
      "total": 100,
      "limit": 10
    }
  }
}
```

### Error Handling

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry exists'
    });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
}
```

### Rate Limiting

```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 OTP requests per 15 minutes
  message: {
    success: false,
    error: 'Too many OTP requests, please try again later'
  }
});
```

---

## Testing Endpoints

### Using cURL

```bash
# Send OTP
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'

# Verify OTP
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'

# Get Profile (authenticated)
curl -X GET http://localhost:5001/api/user/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. Import the environment:
```json
{
  "name": "REZ App Dev",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:5001/api",
      "enabled": true
    },
    {
      "key": "token",
      "value": "",
      "enabled": true
    }
  ]
}
```

2. Set up authorization:
   - Type: Bearer Token
   - Token: `{{token}}`

3. After login, save token to environment variable

---

## Next Steps

1. Implement authentication endpoints first
2. Set up database models
3. Create product & cart APIs
4. Integrate payment gateway
5. Add WebSocket for real-time features
6. Implement remaining features per priority list

For complete API documentation, see `BACKEND_IMPLEMENTATION_GUIDE.md`.

For TypeScript types and contracts, see `API_CONTRACTS.md`.
