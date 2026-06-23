# PHASE 3 BACKEND - STEP-BY-STEP FIX GUIDE

This guide will help you fix the critical gaps and get Phase 3 production-ready.

---

## IMMEDIATE FIXES (30 Minutes - Critical)

### Fix 1: Create Cloudinary Utility (15 minutes)

**File:** `src/utils/cloudinary.ts`

```typescript
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export interface CloudinaryUploadOptions {
  transformation?: any[];
  generateThumbnail?: boolean;
  folder?: string;
}

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType?: string;
}

/**
 * Upload buffer to Cloudinary
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  options?: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    };

    // Apply transformations if provided
    if (options?.transformation) {
      uploadOptions.transformation = options.transformation;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }

        if (!result) {
          return reject(new Error('Cloudinary upload failed: No result returned'));
        }

        const uploadResult: CloudinaryUploadResult = {
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          resourceType: result.resource_type
        };

        // Generate thumbnail if requested
        if (options?.generateThumbnail) {
          try {
            const thumbnailUrl = cloudinary.url(result.public_id, {
              transformation: [
                { width: 300, height: 300, crop: 'fill' },
                { quality: 'auto' }
              ]
            });
            uploadResult.thumbnailUrl = thumbnailUrl;
          } catch (thumbError) {
            console.error('Thumbnail generation error:', thumbError);
            // Don't fail upload if thumbnail fails
          }
        }

        resolve(uploadResult);
      }
    );

    // Convert buffer to stream and pipe to upload
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete multiple files from Cloudinary
 */
export async function deleteMultipleFromCloudinary(publicIds: string[]): Promise<void> {
  try {
    await cloudinary.api.delete_resources(publicIds);
    console.log(`Deleted ${publicIds.length} files from Cloudinary`);
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw new Error(`Failed to delete multiple files from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get image info from Cloudinary
 */
export async function getCloudinaryResource(publicId: string): Promise<any> {
  try {
    return await cloudinary.api.resource(publicId);
  } catch (error) {
    console.error('Cloudinary resource fetch error:', error);
    throw new Error(`Failed to fetch Cloudinary resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Validate Cloudinary configuration on import
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️ Cloudinary configuration incomplete. Image uploads will fail.');
  console.warn('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
}

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  getCloudinaryResource
};
```

**Install Dependencies:**
```bash
npm install cloudinary
npm install @types/node --save-dev
```

**Environment Variables (.env):**
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

---

### Fix 2: Register Bill Routes (2 minutes)

**File:** `src/server.ts`

**Location:** After line 348 (after outletRoutes registration)

```typescript
// Add this import at the top with other route imports (around line 19-63)
import billRoutes from './routes/billRoutes';

// Add this route registration (around line 348, after outlet routes)
// Bill Upload Routes - Upload and verify bills for cashback
app.use(`${API_PREFIX}/bills`, billRoutes);
```

**Complete code block to add:**
```typescript
// Around line 348, add:
app.use(`${API_PREFIX}/outlets`, outletRoutes);

// ADD THIS:
// Bill Upload Routes - Upload and verify bills for cashback
app.use(`${API_PREFIX}/bills`, billRoutes);

// Flash Sales Routes - Time-limited promotional offers
app.use(`${API_PREFIX}/flash-sales`, flashSaleRoutes);
```

---

### Fix 3: Verify Upload Middleware (5 minutes)

**File:** `src/middleware/upload.ts`

Check if this file exists and has proper configuration:

```typescript
import multer from 'multer';
import { Request } from 'express';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Multer configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

export default upload;
```

**If this file doesn't exist or is incomplete, create it with the above content.**

**Install dependencies:**
```bash
npm install multer
npm install @types/multer --save-dev
```

---

### Fix 4: Add Environment Variable Validation (5 minutes)

**File:** `src/server.ts`

**Location:** At the top of the `startServer()` function (around line 439)

```typescript
async function startServer() {
  try {
    // ADD THIS: Validate critical environment variables
    console.log('🔍 Validating environment variables...');

    const criticalVars = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET'
    ];

    const missingVars = criticalVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn('⚠️ WARNING: Missing critical environment variables:');
      missingVars.forEach(varName => {
        console.warn(`   - ${varName}`);
      });
      console.warn('⚠️ Some features may not work properly.\n');
    } else {
      console.log('✅ All critical environment variables present\n');
    }

    // Connect to database
    console.log('🔄 Connecting to database...');
    await connectDatabase();

    // ... rest of the function
```

---

### Fix 5: Update Health Check Endpoint (3 minutes)

**File:** `src/server.ts`

**Location:** In the health check endpoint (around line 174)

Add bill endpoint to the list:

```typescript
endpoints: {
  auth: `${API_PREFIX}/auth`,
  products: `${API_PREFIX}/products`,
  cart: `${API_PREFIX}/cart`,
  categories: `${API_PREFIX}/categories`,
  stores: `${API_PREFIX}/stores`,
  orders: `${API_PREFIX}/orders`,
  videos: `${API_PREFIX}/videos`,
  projects: `${API_PREFIX}/projects`,
  notifications: `${API_PREFIX}/notifications`,
  reviews: `${API_PREFIX}/reviews`,
  wishlist: `${API_PREFIX}/wishlist`,
  sync: `${API_PREFIX}/sync`,
  wallet: `${API_PREFIX}/wallet`,
  offers: `${API_PREFIX}/offers`,
  vouchers: `${API_PREFIX}/vouchers`,
  addresses: `${API_PREFIX}/addresses`,
  paymentMethods: `${API_PREFIX}/payment-methods`,
  userSettings: `${API_PREFIX}/user-settings`,
  achievements: `${API_PREFIX}/achievements`,
  activities: `${API_PREFIX}/activities`,
  referral: `${API_PREFIX}/referral`,
  coupons: `${API_PREFIX}/coupons`,
  support: `${API_PREFIX}/support`,
  cashback: `${API_PREFIX}/cashback`,
  discounts: `${API_PREFIX}/discounts`,
  storeVouchers: `${API_PREFIX}/store-vouchers`,
  outlets: `${API_PREFIX}/outlets`,
  flashSales: `${API_PREFIX}/flash-sales`,
  bills: `${API_PREFIX}/bills`, // ADD THIS
  subscriptions: `${API_PREFIX}/subscriptions` // ADD THIS
}
```

---

## TEST THE FIXES

### Test 1: Bill Upload Endpoint

**Setup Cloudinary Account:**
1. Go to https://cloudinary.com
2. Sign up for free account
3. Get your credentials from dashboard
4. Add to .env file

**Test with Postman/cURL:**

```bash
# 1. Login first to get token
curl -X POST http://localhost:5001/api/user/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "1234567890"}'

# 2. Verify OTP
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "1234567890", "otp": "123456"}'

# Save the token from response

# 3. Test bill upload
curl -X POST http://localhost:5001/api/bills/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "billImage=@/path/to/test/bill.jpg" \
  -F "merchantId=MERCHANT_ID" \
  -F "amount=500" \
  -F "billDate=2025-10-24" \
  -F "billNumber=INV-001"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Bill uploaded successfully and is being verified",
  "data": {
    "_id": "...",
    "user": "...",
    "merchant": {...},
    "billImage": {
      "url": "https://res.cloudinary.com/...",
      "thumbnailUrl": "https://res.cloudinary.com/...",
      "cloudinaryId": "...",
      "imageHash": "..."
    },
    "amount": 500,
    "verificationStatus": "pending"
  }
}
```

---

### Test 2: Subscription Flow

**Test with Postman:**

```bash
# 1. Get available tiers
curl http://localhost:5001/api/subscriptions/tiers

# 2. Subscribe to premium (requires auth token)
curl -X POST http://localhost:5001/api/subscriptions/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "premium",
    "billingCycle": "monthly"
  }'

# 3. Check current subscription
curl http://localhost:5001/api/subscriptions/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Test 3: Referral Flow

```bash
# 1. Get user referral code
curl http://localhost:5001/api/referral/code \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Apply referral code (as new user)
curl -X POST http://localhost:5001/api/referral/apply \
  -H "Authorization: Bearer NEW_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "ABC123"
  }'

# 3. Get referral stats
curl http://localhost:5001/api/referral/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## MEDIUM-TERM FIXES (1 Week)

### Fix 6: Create Unified Gamification Routes

**File:** `src/routes/gamificationRoutes.ts`

```typescript
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import * as achievementController from '../controllers/achievementController';
import * as challengeController from '../controllers/challengeController';
import * as leaderboardController from '../controllers/leaderboardController';
import * as gameController from '../controllers/gameController';
import * as streakController from '../controllers/streakController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Achievements
router.get('/achievements', achievementController.getUserAchievements);
router.post('/achievements/:id/unlock', achievementController.unlockAchievement);
router.get('/achievements/progress', achievementController.getAchievementProgress);

// Challenges
router.get('/challenges', challengeController.getActiveChallenges);
router.get('/challenges/:id', challengeController.getChallengeById);
router.post('/challenges/:id/join', challengeController.joinChallenge);
router.post('/challenges/:id/claim', challengeController.claimReward);
router.get('/challenges/progress/:id', challengeController.getChallengeProgress);

// Leaderboard
router.get('/leaderboard', leaderboardController.getGlobalLeaderboard);
router.get('/leaderboard/friends', leaderboardController.getFriendsLeaderboard);
router.get('/leaderboard/challenge/:id', leaderboardController.getChallengeLeaderboard);

// Mini-Games
router.get('/scratch-cards', gameController.getAvailableScratchCards);
router.post('/scratch-cards/:id/play', gameController.playScratchCard);
router.post('/spin-wheel', gameController.spinWheel);
router.post('/quiz/start', gameController.startQuiz);
router.post('/quiz/answer', gameController.submitQuizAnswer);

// Streaks
router.get('/streak', streakController.getCurrentStreak);
router.post('/streak/checkin', streakController.dailyCheckIn);
router.get('/streak/rewards', streakController.getStreakRewards);

// Coins
router.get('/coins/balance', gameController.getCoinBalance);
router.get('/coins/transactions', gameController.getCoinTransactions);

export default router;
```

**Register in server.ts:**
```typescript
import gamificationRoutes from './routes/gamificationRoutes';

// Add after subscriptions route (around line 354)
app.use(`${API_PREFIX}/gamification`, gamificationRoutes);
```

---

### Fix 7: Implement Spin Wheel Service

**File:** `src/services/spinWheelService.ts`

```typescript
import { Types } from 'mongoose';
import { User } from '../models/User';
import { GameSession } from '../models/GameSession';

interface SpinWheelReward {
  type: 'coins' | 'voucher' | 'cashback' | 'nothing';
  value: number;
  label: string;
}

interface SpinWheelSegment {
  id: number;
  label: string;
  reward: SpinWheelReward;
  probability: number; // 0-1
  color: string;
}

// Define wheel segments with probabilities
const WHEEL_SEGMENTS: SpinWheelSegment[] = [
  {
    id: 1,
    label: '10 Coins',
    reward: { type: 'coins', value: 10, label: '10 Coins' },
    probability: 0.3,
    color: '#FF6B6B'
  },
  {
    id: 2,
    label: '25 Coins',
    reward: { type: 'coins', value: 25, label: '25 Coins' },
    probability: 0.25,
    color: '#4ECDC4'
  },
  {
    id: 3,
    label: '50 Coins',
    reward: { type: 'coins', value: 50, label: '50 Coins' },
    probability: 0.15,
    color: '#45B7D1'
  },
  {
    id: 4,
    label: '₹10 Cashback',
    reward: { type: 'cashback', value: 10, label: '₹10 Cashback' },
    probability: 0.15,
    color: '#96CEB4'
  },
  {
    id: 5,
    label: '₹50 Voucher',
    reward: { type: 'voucher', value: 50, label: '₹50 Voucher' },
    probability: 0.1,
    color: '#FFEAA7'
  },
  {
    id: 6,
    label: 'Better Luck Next Time',
    reward: { type: 'nothing', value: 0, label: 'Better Luck Next Time' },
    probability: 0.05,
    color: '#DFE6E9'
  }
];

// Cost to spin
const SPIN_COST = 20; // coins
const DAILY_FREE_SPINS = 1;

class SpinWheelService {
  /**
   * Check if user can spin
   */
  async canSpin(userId: Types.ObjectId): Promise<{
    canSpin: boolean;
    reason?: string;
    spinsAvailable: number;
    nextFreeSpinAt?: Date;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { canSpin: false, reason: 'User not found', spinsAvailable: 0 };
      }

      // Check for free daily spins
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySpins = await GameSession.countDocuments({
        user: userId,
        gameType: 'spin_wheel',
        createdAt: { $gte: today }
      });

      const freeSpinsRemaining = Math.max(0, DAILY_FREE_SPINS - todaySpins);

      if (freeSpinsRemaining > 0) {
        return {
          canSpin: true,
          spinsAvailable: freeSpinsRemaining
        };
      }

      // Check if user has enough coins
      const userCoins = user.coins || 0;
      if (userCoins < SPIN_COST) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return {
          canSpin: false,
          reason: `Not enough coins. Need ${SPIN_COST} coins to spin.`,
          spinsAvailable: 0,
          nextFreeSpinAt: tomorrow
        };
      }

      return {
        canSpin: true,
        spinsAvailable: Math.floor(userCoins / SPIN_COST)
      };
    } catch (error) {
      console.error('Error checking spin eligibility:', error);
      return { canSpin: false, reason: 'Error checking eligibility', spinsAvailable: 0 };
    }
  }

  /**
   * Spin the wheel
   */
  async spin(userId: Types.ObjectId): Promise<{
    success: boolean;
    reward?: SpinWheelReward;
    segmentId?: number;
    coinBalance?: number;
    error?: string;
  }> {
    try {
      // Check if can spin
      const eligibility = await this.canSpin(userId);
      if (!eligibility.canSpin) {
        return {
          success: false,
          error: eligibility.reason || 'Cannot spin at this time'
        };
      }

      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Determine if this is a free spin
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySpins = await GameSession.countDocuments({
        user: userId,
        gameType: 'spin_wheel',
        createdAt: { $gte: today }
      });

      const isFreeSpin = todaySpins < DAILY_FREE_SPINS;

      // Deduct coins if not a free spin
      if (!isFreeSpin) {
        user.coins = (user.coins || 0) - SPIN_COST;
        await user.save();
      }

      // Select winning segment based on probability
      const winningSegment = this.selectSegmentByProbability();

      // Create game session
      const gameSession = await GameSession.create({
        user: userId,
        gameType: 'spin_wheel',
        status: 'completed',
        bet: isFreeSpin ? 0 : SPIN_COST,
        winnings: winningSegment.reward.value,
        result: {
          segmentId: winningSegment.id,
          reward: winningSegment.reward,
          isFreeSpin
        }
      });

      // Award reward
      await this.awardReward(user, winningSegment.reward);

      return {
        success: true,
        reward: winningSegment.reward,
        segmentId: winningSegment.id,
        coinBalance: user.coins
      };
    } catch (error) {
      console.error('Error spinning wheel:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Select segment based on probability
   */
  private selectSegmentByProbability(): SpinWheelSegment {
    const random = Math.random();
    let cumulative = 0;

    for (const segment of WHEEL_SEGMENTS) {
      cumulative += segment.probability;
      if (random <= cumulative) {
        return segment;
      }
    }

    // Fallback to last segment
    return WHEEL_SEGMENTS[WHEEL_SEGMENTS.length - 1];
  }

  /**
   * Award reward to user
   */
  private async awardReward(user: any, reward: SpinWheelReward): Promise<void> {
    switch (reward.type) {
      case 'coins':
        user.coins = (user.coins || 0) + reward.value;
        break;

      case 'cashback':
        // Add to wallet
        const { creditToWallet } = require('./walletService');
        await creditToWallet(user._id, reward.value, 'spin_wheel_reward', 'Spin Wheel Cashback');
        break;

      case 'voucher':
        // Create voucher (implement based on your voucher system)
        // await createUserVoucher(user._id, reward.value);
        break;

      case 'nothing':
        // No reward
        break;
    }

    await user.save();
  }

  /**
   * Get wheel configuration
   */
  getWheelConfig(): {
    segments: SpinWheelSegment[];
    spinCost: number;
    dailyFreeSpins: number;
  } {
    return {
      segments: WHEEL_SEGMENTS,
      spinCost: SPIN_COST,
      dailyFreeSpins: DAILY_FREE_SPINS
    };
  }
}

export default new SpinWheelService();
```

**Add to gameController.ts:**
```typescript
import spinWheelService from '../services/spinWheelService';

export const spinWheel = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const result = await spinWheelService.spin(userId as Types.ObjectId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error spinning wheel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to spin wheel',
      error: error.message
    });
  }
};

export const getSpinWheelConfig = async (req: Request, res: Response) => {
  try {
    const config = spinWheelService.getWheelConfig();

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error: any) {
    console.error('Error fetching spin wheel config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spin wheel config',
      error: error.message
    });
  }
};
```

---

## RESTART & VERIFY

After all fixes:

```bash
# 1. Restart backend
npm run dev

# 2. Check health endpoint
curl http://localhost:5001/health

# 3. Verify bill endpoint exists
curl http://localhost:5001/api/bills

# 4. Check logs for warnings
# Look for Cloudinary config warnings
# Look for missing environment variables
```

---

## NEXT STEPS

Once immediate fixes are done:
1. ✅ Test bill upload with real images
2. ✅ Test subscription payment with Razorpay sandbox
3. ✅ Test webhook handling with ngrok
4. ✅ Write integration tests
5. ✅ Deploy to staging
6. ✅ Production deployment

---

**Need Help?**
- Cloudinary Setup: https://cloudinary.com/documentation
- Razorpay Testing: https://razorpay.com/docs/payments/test-card-details/
- OCR Testing: Use sample bills from Google Images

**Estimated Time:**
- Immediate fixes: 30 minutes
- Testing: 2 hours
- Medium-term fixes: 8 hours
- Total to production: ~1 week
