# 🎯 IMMEDIATE ACTION PLAN - REZ APP BACKEND

**Created:** November 20, 2025  
**Priority:** CRITICAL - Must complete before production deployment  
**Estimated Time:** 3-5 weeks  
**Status:** Ready to start ✅

---

## 🚨 START HERE - CRITICAL FIXES (DO FIRST)

### Priority 1: Fix Environment Configuration ⚡ 
**Time:** 1 hour  
**Blocker:** Server won't start properly without these

#### Step 1: Generate Secure JWT_REFRESH_SECRET

```bash
# Run this command to generate a secure secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Step 2: Update .env File

Open `user-backend/.env` and make these changes:

```env
# Line 28 - REPLACE THIS:
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production

# WITH YOUR GENERATED SECRET:
JWT_REFRESH_SECRET=<paste the 128-character string from Step 1>

# After line 37 - ADD THIS:
# Merchant Frontend URL (for merchant dashboard, password reset, etc.)
MERCHANT_FRONTEND_URL=http://localhost:3000

# Optional but recommended - ADD THIS:
# Admin Frontend URL (for admin panel links in emails)
ADMIN_URL=http://localhost:3001
```

#### Step 3: Verify Third-Party API Keys

Ensure these are NOT placeholder values:

```env
SENDGRID_API_KEY=<should start with SG.>
RAZORPAY_KEY_ID=<real razorpay key>
RAZORPAY_KEY_SECRET=<real razorpay secret>
STRIPE_SECRET_KEY=<real stripe key>
TWILIO_ACCOUNT_SID=<real twilio SID>
TWILIO_AUTH_TOKEN=<real twilio token>
CLOUDINARY_CLOUD_NAME=<real cloudinary name>
CLOUDINARY_API_KEY=<real cloudinary key>
CLOUDINARY_API_SECRET=<real cloudinary secret>
```

✅ **Verification:** Run `npm run dev` - should see "✅ Environment validation passed"

---

### Priority 2: Fix Server Errors (500 Status) ⚡
**Time:** 3-4 hours  
**Blocker:** Core functionality crashes

#### Fix 1: Merchant Logout Endpoint

**File:** `src/merchantroutes/auth.ts`  
**Issue:** Logout endpoint throws 500 error

**Find this endpoint:**
```typescript
router.post('/logout', merchantAuth, async (req, res) => {
  // Current implementation causing error
```

**Likely Issue:** Session/token cleanup error

**Fix Steps:**
1. Check if req.merchant exists
2. Add try-catch around token invalidation
3. Return success even if token cleanup fails

**Fixed Code:**
```typescript
router.post('/logout', merchantAuth, async (req, res) => {
  try {
    const merchantId = req.merchant?._id;
    
    // Optional: Invalidate refresh token if you're tracking them
    // await RefreshToken.deleteMany({ merchantId });
    
    // Clear cookie if using cookies
    res.clearCookie('refreshToken');
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success - logout should always succeed
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});
```

#### Fix 2: Onboarding Submit Endpoint

**File:** `src/merchantroutes/onboarding.ts` (if exists) or create it  
**Issue:** Server error on form submission

**This endpoint might not exist** - See Priority 3 below to implement it.

---

### Priority 3: Implement Missing Onboarding Endpoints ⚡
**Time:** 12-16 hours  
**Blocker:** Merchants can't complete signup process

**All 8 endpoints are missing:**

#### Create File: `src/merchantroutes/onboarding.ts`

```typescript
import { Router } from 'express';
import { merchantAuth } from '../middleware/merchantauth';
import Merchant from '../models/Merchant';
import Store from '../models/Store';

const router = Router();

// GET /api/merchant/onboarding/status - Get onboarding progress
router.get('/status', merchantAuth, async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    
    // Calculate completion status
    const steps = {
      step1: !!merchant.businessInfo?.businessName,
      step2: !!merchant.businessInfo?.businessAddress,
      step3: !!merchant.bankDetails?.accountNumber,
      step4: !!merchant.documents?.gstCertificate,
      step5: merchant.onboardingCompleted || false
    };
    
    const completedSteps = Object.values(steps).filter(Boolean).length;
    const progress = (completedSteps / 5) * 100;
    
    return res.status(200).json({
      success: true,
      data: {
        currentStep: completedSteps + 1,
        completedSteps,
        totalSteps: 5,
        progress,
        steps,
        isComplete: merchant.onboardingCompleted
      }
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get onboarding status'
    });
  }
});

// POST /api/merchant/onboarding/step/1 - Business Information
router.post('/step/1', merchantAuth, async (req, res) => {
  try {
    const { businessName, businessType, category, description } = req.body;
    
    const merchant = await Merchant.findByIdAndUpdate(
      req.merchant._id,
      {
        $set: {
          'businessInfo.businessName': businessName,
          'businessInfo.businessType': businessType,
          'businessInfo.category': category,
          'businessInfo.description': description
        }
      },
      { new: true }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Step 1 completed',
      data: { merchant }
    });
  } catch (error) {
    console.error('Onboarding step 1 error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save business information'
    });
  }
});

// POST /api/merchant/onboarding/step/2 - Business Address
router.post('/step/2', merchantAuth, async (req, res) => {
  try {
    const { street, city, state, zipCode, country } = req.body;
    
    const merchant = await Merchant.findByIdAndUpdate(
      req.merchant._id,
      {
        $set: {
          'businessInfo.businessAddress': {
            street,
            city,
            state,
            zipCode,
            country
          }
        }
      },
      { new: true }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Step 2 completed',
      data: { merchant }
    });
  } catch (error) {
    console.error('Onboarding step 2 error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save business address'
    });
  }
});

// POST /api/merchant/onboarding/step/3 - Bank Details
router.post('/step/3', merchantAuth, async (req, res) => {
  try {
    const { accountNumber, accountHolderName, ifscCode, bankName } = req.body;
    
    const merchant = await Merchant.findByIdAndUpdate(
      req.merchant._id,
      {
        $set: {
          'bankDetails.accountNumber': accountNumber,
          'bankDetails.accountHolderName': accountHolderName,
          'bankDetails.ifscCode': ifscCode,
          'bankDetails.bankName': bankName
        }
      },
      { new: true }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Step 3 completed',
      data: { merchant }
    });
  } catch (error) {
    console.error('Onboarding step 3 error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save bank details'
    });
  }
});

// POST /api/merchant/onboarding/step/4 - Documents Upload
router.post('/step/4', merchantAuth, async (req, res) => {
  try {
    const { gstCertificate, panCard, incorporationCertificate } = req.body;
    
    const merchant = await Merchant.findByIdAndUpdate(
      req.merchant._id,
      {
        $set: {
          'documents.gstCertificate': gstCertificate,
          'documents.panCard': panCard,
          'documents.incorporationCertificate': incorporationCertificate
        }
      },
      { new: true }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Step 4 completed',
      data: { merchant }
    });
  } catch (error) {
    console.error('Onboarding step 4 error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save documents'
    });
  }
});

// POST /api/merchant/onboarding/step/5 - Store Setup
router.post('/step/5', merchantAuth, async (req, res) => {
  try {
    const { storeName, storeDescription, storeAddress, contactNumber } = req.body;
    const merchantId = req.merchant._id;
    
    // Create or update store
    let store = await Store.findOne({ merchantId });
    
    if (store) {
      store.storeName = storeName;
      store.description = storeDescription;
      store.address = storeAddress;
      store.contactNumber = contactNumber;
      await store.save();
    } else {
      store = await Store.create({
        merchantId,
        storeName,
        description: storeDescription,
        address: storeAddress,
        contactNumber,
        isActive: true
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Step 5 completed',
      data: { store }
    });
  } catch (error) {
    console.error('Onboarding step 5 error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to setup store'
    });
  }
});

// POST /api/merchant/onboarding/submit - Complete Onboarding
router.post('/submit', merchantAuth, async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    
    // Validate all required fields
    if (!merchant.businessInfo?.businessName) {
      return res.status(400).json({
        success: false,
        message: 'Please complete Step 1: Business Information'
      });
    }
    
    if (!merchant.businessInfo?.businessAddress) {
      return res.status(400).json({
        success: false,
        message: 'Please complete Step 2: Business Address'
      });
    }
    
    if (!merchant.bankDetails?.accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please complete Step 3: Bank Details'
      });
    }
    
    if (!merchant.documents?.gstCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Please complete Step 4: Documents Upload'
      });
    }
    
    const store = await Store.findOne({ merchantId: merchant._id });
    if (!store) {
      return res.status(400).json({
        success: false,
        message: 'Please complete Step 5: Store Setup'
      });
    }
    
    // Mark onboarding as complete
    merchant.onboardingCompleted = true;
    merchant.onboardingCompletedAt = new Date();
    merchant.status = 'pending_approval'; // Admin needs to approve
    await merchant.save();
    
    return res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully. Your account is pending approval.',
      data: { merchant }
    });
  } catch (error) {
    console.error('Onboarding submit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit onboarding',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// GET /api/merchant/onboarding/documents - Get uploaded documents
router.get('/documents', merchantAuth, async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    
    return res.status(200).json({
      success: true,
      data: {
        documents: merchant.documents || {},
        uploadedAt: merchant.documentsUploadedAt
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get documents'
    });
  }
});

export default router;
```

#### Register the Route in server.ts

**File:** `src/server.ts`

**Find this line (around line 624):**
```typescript
app.use('/api/merchant/onboarding', onboardingRoutes);
```

**Verify it's there.** If not, add it after other merchant routes.

---

### Priority 4: Implement Missing Notification Endpoints ⚡
**Time:** 6-8 hours  
**Blocker:** Notifications don't work

**5 basic endpoints are missing**

#### Update File: `src/routes/merchant/notifications.ts`

**Add these endpoints:**

```typescript
import { Router } from 'express';
import { merchantAuth } from '../../middleware/merchantauth';
import Notification from '../../models/Notification';

const router = Router();

// GET /api/merchant/notifications - Get all notifications
router.get('/', merchantAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = { 
      recipientId: req.merchant._id,
      recipientType: 'merchant'
    };
    
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(query)
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notifications'
    });
  }
});

// GET /api/merchant/notifications/unread-count - Get unread count
router.get('/unread-count', merchantAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.merchant._id,
      recipientType: 'merchant',
      isRead: false
    });
    
    return res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get unread count'
    });
  }
});

// GET /api/merchant/notifications/stats - Get notification statistics
router.get('/stats', merchantAuth, async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    
    const [total, unread, byType] = await Promise.all([
      Notification.countDocuments({ 
        recipientId: merchantId,
        recipientType: 'merchant'
      }),
      Notification.countDocuments({ 
        recipientId: merchantId,
        recipientType: 'merchant',
        isRead: false 
      }),
      Notification.aggregate([
        {
          $match: {
            recipientId: merchantId,
            recipientType: 'merchant'
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    const typeStats = byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);
    
    return res.status(200).json({
      success: true,
      data: {
        total,
        unread,
        read: total - unread,
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics'
    });
  }
});

// POST /api/merchant/notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', merchantAuth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        recipientId: req.merchant._id,
        recipientType: 'merchant',
        isRead: false
      },
      {
        $set: { 
          isRead: true,
          readAt: new Date()
        }
      }
    );
    
    // Emit Socket.IO event if available
    if (global.io) {
      global.io.to(`merchant-${req.merchant._id}`).emit('notifications:bulk-read', {
        count: result.modifiedCount
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: { count: result.modifiedCount }
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
});

// DELETE /api/merchant/notifications/clear-all - Clear all notifications
router.delete('/clear-all', merchantAuth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipientId: req.merchant._id,
      recipientType: 'merchant'
    });
    
    // Emit Socket.IO event if available
    if (global.io) {
      global.io.to(`merchant-${req.merchant._id}`).emit('notifications:cleared', {
        count: result.deletedCount
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} notifications`,
      data: { count: result.deletedCount }
    });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear notifications'
    });
  }
});

export default router;
```

---

### Priority 5: Implement Missing Auth Endpoints ⚡
**Time:** 4-5 hours  
**Blocker:** Password reset doesn't work

#### Update File: `src/merchantroutes/auth.ts`

**Add these 3 endpoints:**

```typescript
// PUT /api/merchant/auth/change-password - Change password (logged in)
router.put('/change-password', merchantAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }
    
    // Get merchant with password field
    const merchant = await Merchant.findById(req.merchant._id).select('+password');
    
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, merchant.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    merchant.password = hashedPassword;
    merchant.passwordChangedAt = new Date();
    await merchant.save();
    
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// POST /api/merchant/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }
    
    // Find merchant with valid reset token
    const merchant = await Merchant.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!merchant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    merchant.password = hashedPassword;
    merchant.resetPasswordToken = undefined;
    merchant.resetPasswordExpires = undefined;
    merchant.passwordChangedAt = new Date();
    await merchant.save();
    
    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// POST /api/merchant/auth/verify-email - Verify email with token
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }
    
    // Find merchant with valid verification token
    const merchant = await Merchant.findOne({
      emailVerificationToken: token
    });
    
    if (!merchant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }
    
    if (merchant.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }
    
    // Mark email as verified
    merchant.isEmailVerified = true;
    merchant.emailVerifiedAt = new Date();
    merchant.emailVerificationToken = undefined;
    await merchant.save();
    
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});
```

---

## 🎯 WEEK 1 COMPLETION CHECKLIST

After completing Priority 1-5 above, verify:

- [ ] Environment variables all configured correctly
- [ ] Server starts without errors
- [ ] Can login as merchant
- [ ] Can logout without errors
- [ ] All 8 onboarding endpoints return 200 (not 404)
- [ ] All 5 notification endpoints return 200 (not 404)
- [ ] All 3 auth endpoints return 200 (not 404)
- [ ] Password reset works end-to-end
- [ ] Email verification works end-to-end
- [ ] Onboarding flow works end-to-end

**Expected Test Results After Week 1:**
- Tests passing: 35-40/76 (46-53%) ⬆️ from 17%
- 404 errors: 0 ✅ (down from 23)
- 500 errors: 0 ✅ (down from 2)
- Validation failures: 27 (to fix in Week 2)

---

## 📅 WEEK 2 PRIORITIES

Once Week 1 is complete, focus on:

### 1. Fix Validation Failures (27 tests)
**Time:** 10-12 hours

All validation failures are due to response format mismatches. Standardize responses across:
- Dashboard endpoints (4)
- Analytics endpoints (12)
- Orders endpoints (2)
- Cashback endpoints (4)
- Audit endpoints (8)

### 2. Implement PDF Invoice Generation
**Time:** 8 hours

```bash
npm install pdfkit @types/pdfkit
```

**File:** `src/controllers/billingController.ts`

### 3. Implement Export Job System
**Time:** 6-8 hours

Set up Bull queue for long-running exports:
- Create export worker
- Track job progress
- Store completed exports
- Cleanup old exports

### 4. Fix Analytics Calculations
**Time:** 6-8 hours

Implement:
- Historical data tracking
- Period-over-period comparison
- Actual trend calculations
- Real growth metrics

---

## 📅 WEEK 3 PRIORITIES

### 1. Testing & QA
- Increase test coverage to 90%+
- Add unit tests for critical services
- Load testing with Artillery
- Security audit

### 2. DevOps & Deployment
- Set up CI/CD pipeline
- Configure automated backups
- Set up staging environment
- Create deployment runbooks

### 3. Monitoring & Alerting
- Configure Sentry with production DSN
- Set up error alerts
- Configure performance monitoring
- Set up uptime monitoring

---

## 🚀 TESTING AFTER EACH FIX

After implementing each priority, test:

```bash
# Start backend
cd user-backend
npm run dev

# In another terminal, run tests
npm run test:e2e-merchant
```

**Look for improvements in test results:**
- Priority 1-2: Should fix 404 and 500 errors
- Priority 3-5: Should add ~25 passing tests
- Week 2: Should fix validation failures
- Week 3: Should reach 90%+ passing

---

## 📞 NEED HELP?

If you get stuck on any step:

1. **Check the logs:** Look in `user-backend/logs/` for error details
2. **Review docs:** Check the 30+ documentation files in user-backend/
3. **Check models:** Look at `src/models/` to understand data structure
4. **Test individually:** Use Postman/Thunder Client to test endpoints one by one

---

## ✅ COMPLETION CRITERIA

You're ready for production when:

- ✅ 95%+ tests passing (72+ out of 76)
- ✅ Zero 404 errors
- ✅ Zero 500 errors
- ✅ All environment variables configured
- ✅ PDF generation working
- ✅ Export system working
- ✅ Analytics showing real data
- ✅ Monitoring and alerts active

---

**Created:** November 20, 2025  
**Last Updated:** November 20, 2025  
**Next Review:** After Week 1 completion

*Start with Priority 1 (environment config) - it takes 1 hour and unblocks everything else!*


