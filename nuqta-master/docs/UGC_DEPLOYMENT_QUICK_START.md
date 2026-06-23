# UGC VIDEO SYSTEM - DEPLOYMENT QUICK START
## TL;DR - Essential Deployment Steps

**Last Updated:** November 8, 2025
**Version:** 1.0.0
**For:** Engineers deploying UGC system to production

---

## 🚀 30-MINUTE DEPLOYMENT CHECKLIST

**Prerequisites:** Cloudinary account, MongoDB Atlas, Production server ready

### ✅ Step 1: Environment Setup (5 min)

**Frontend `.env.production`:**
```env
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UGC_PRESET=ugc_videos
EXPO_PUBLIC_ENABLE_VIDEO_UPLOAD=true
EXPO_PUBLIC_API_BASE_URL=https://api.rezapp.com/api
EXPO_PUBLIC_MAX_VIDEO_SIZE=52428800  # 50MB
```

**Backend `.env`:**
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
MAX_VIDEO_SIZE=52428800
AUTO_FLAG_THRESHOLD=5
```

**Verify:**
```bash
# Frontend
grep -E "CLOUDINARY|VIDEO" frontend/.env.production

# Backend
grep -E "CLOUDINARY|VIDEO|FLAG" user-backend/.env
```

---

### ✅ Step 2: Cloudinary Setup (10 min)

1. **Create Upload Preset:**
   - Go to: Cloudinary Dashboard → Settings → Upload → Upload Presets
   - Click: "Add upload preset"
   - Name: `ugc_videos`
   - **Signing Mode: Unsigned** ⚠️ CRITICAL
   - Folder: `videos/ugc/`
   - Max file size: 100MB
   - Allowed formats: mp4, mov, webm
   - Resource type: Video
   - Save

2. **Test Upload Preset:**
```bash
curl -X POST https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/upload \
  -F "upload_preset=ugc_videos" \
  -F "file=https://www.w3schools.com/html/mov_bbb.mp4"
```
Expected: JSON response with `secure_url`

---

### ✅ Step 3: Database Indexes (5 min)

**Connect to MongoDB:**
```bash
mongo "mongodb+srv://your-cluster.mongodb.net/rezapp-prod"
```

**Create Indexes:**
```javascript
use rezapp;

// UGC collection indexes
db.ugc.createIndex({ userId: 1, createdAt: -1 });
db.ugc.createIndex({ isFlagged: 1, createdAt: -1 });
db.ugc.createIndex({ "taggedProducts.productId": 1 });
db.ugc.createIndex({ createdAt: -1 });

// Verify indexes
db.ugc.getIndexes();
```

---

### ✅ Step 4: Backend Deployment (5 min)

```bash
# SSH into production
ssh user@your-server

# Navigate to backend
cd /var/www/rezapp-backend

# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Build
npm run build

# Restart
pm2 restart rezapp-backend

# Verify
pm2 logs rezapp-backend --lines 20
curl https://api.rezapp.com/health
```

---

### ✅ Step 5: Frontend Deployment (5 min)

```bash
# iOS
eas build --platform ios --profile production
eas submit --platform ios

# Android
eas build --platform android --profile production
eas submit --platform android

# OR: OTA Update (instant)
eas update --branch production --message "UGC Video System"
```

---

### ✅ Step 6: Smoke Test (5 min)

**Test on production app:**
1. [ ] Open app
2. [ ] Login/register
3. [ ] Navigate to video feed
4. [ ] Upload video (from gallery)
5. [ ] Tag 5 products
6. [ ] Upload completes successfully
7. [ ] Video appears in feed
8. [ ] Play video
9. [ ] Add tagged product to cart
10. [ ] Report a video

**All 10 tests must pass before announcing launch.**

---

## 🔥 CRITICAL CONFIGURATION CHECKLIST

### Cloudinary
- [ ] Upload preset `ugc_videos` exists
- [ ] Preset is **unsigned** (not signed)
- [ ] Folder set to `videos/ugc/`
- [ ] Max file size ≥ 50MB
- [ ] Allowed formats: mp4, mov, webm
- [ ] Test upload successful

### Environment Variables
- [ ] All Cloudinary credentials set (frontend & backend)
- [ ] `AUTO_FLAG_THRESHOLD=5` in backend
- [ ] `ENABLE_VIDEO_UPLOAD=true` in frontend
- [ ] API base URL is HTTPS (not HTTP)
- [ ] No placeholder values (e.g., "your-key-here")

### Database
- [ ] All 4 indexes created on `ugc` collection
- [ ] Backup enabled and tested
- [ ] Connection string uses production database

### Security
- [ ] Frontend does NOT have `CLOUDINARY_API_SECRET`
- [ ] Backend has all 3 Cloudinary credentials
- [ ] File size limits enforced (frontend & backend)
- [ ] File type validation in place
- [ ] Rate limiting enabled

---

## 📊 MONITORING QUICK SETUP

### Sentry (5 min)
```bash
# Install
npm install @sentry/react-native

# Configure
Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
});

# Test
Sentry.captureMessage("UGC System Deployed");
```

### UptimeRobot (2 min)
1. Go to: https://uptimerobot.com
2. Add monitor:
   - Type: HTTP(s)
   - URL: https://api.rezapp.com/health
   - Interval: 5 minutes
   - Alert: Email + SMS

### Google Analytics (3 min)
```javascript
// Track UGC events
gtag('event', 'video_upload_completed', { source: 'camera' });
gtag('event', 'product_tagged', { product_id: 'p123' });
gtag('event', 'add_to_cart', { source: 'ugc_video' });
```

---

## 🚨 COMMON ISSUES & FIXES

### Issue: Upload fails with "Upload preset not found"
**Fix:** Cloudinary preset doesn't exist or name mismatch
```bash
# Verify preset name in dashboard matches .env
EXPO_PUBLIC_CLOUDINARY_UGC_PRESET=ugc_videos  # Must match Cloudinary
```

### Issue: Upload fails with "Invalid signature"
**Fix:** Preset must be **unsigned**
- Go to Cloudinary → Upload Presets → `ugc_videos` → Change to "Unsigned"

### Issue: "File too large" error
**Fix:** Cloudinary preset max size < app limit
- Cloudinary preset: Set max file size to 100MB
- App enforces 50MB (lower is fine)

### Issue: Videos not showing in feed
**Fix:** Check database indexes
```javascript
db.ugc.getIndexes();  // Should show 4 indexes
db.ugc.find().limit(5);  // Should return videos
```

### Issue: "CORS error" on upload
**Fix:** Cloudinary CORS settings
- Cloudinary → Settings → Security → Allowed domains
- Add: `https://rezapp.com`, `http://localhost:8081` (for testing)

### Issue: Backend crashes on upload
**Fix:** Check backend logs
```bash
pm2 logs rezapp-backend --lines 50 | grep ERROR
```
Common causes:
- Missing `CLOUDINARY_API_SECRET` in backend `.env`
- MongoDB connection issue
- Out of memory (increase server RAM)

---

## 📞 EMERGENCY CONTACTS

**Critical Issues Only:**
- On-Call Engineer: _____________ (Phone: _________)
- Technical Lead: _____________ (Phone: _________)
- Cloudinary Support: support@cloudinary.com | +1-XXX-XXX-XXXX

**Non-Critical:**
- Slack: #ugc-deployment
- Email: engineering@rezapp.com

---

## 🔄 ROLLBACK (Emergency)

**If critical issue occurs, rollback immediately:**

```bash
# Backend rollback
ssh user@your-server
cd /var/www/rezapp-backend
pm2 stop rezapp-backend
git checkout <previous-stable-commit>
npm install --production && npm run build
pm2 restart rezapp-backend

# Frontend rollback (OTA)
eas update --branch production --message "Rollback"

# Verify
curl https://api.rezapp.com/health
```

**Full rollback procedures:** See `UGC_ROLLBACK_PLAN.md`

---

## ✅ POST-DEPLOYMENT VERIFICATION

**Check within 15 minutes:**
- [ ] Backend health: `curl https://api.rezapp.com/health` returns 200
- [ ] No errors in logs: `pm2 logs rezapp-backend --lines 100`
- [ ] Can upload test video
- [ ] Video appears in feed
- [ ] Cloudinary shows uploaded file
- [ ] Error rate < 1% (check Sentry)
- [ ] No 5xx errors

**If any check fails:** See troubleshooting above or execute rollback.

---

## 📈 FIRST WEEK GOALS

**Usage Targets:**
- Videos uploaded: 100+ ✅
- Upload success rate: > 95% ✅
- Error rate: < 1% ✅
- User rating: ≥ 4 stars ✅

**Monitor Daily:**
- Upload volume
- Success rate
- Error rate
- Support tickets
- User feedback

**Review Weekly:**
- Business metrics (revenue, conversions)
- Engagement (views, likes)
- Creator adoption
- Optimization opportunities

---

## 🎯 SUCCESS CRITERIA

**Launch is successful if:**
- [ ] Zero downtime
- [ ] Upload success rate > 95%
- [ ] Error rate < 1%
- [ ] All smoke tests pass
- [ ] Support team can handle inquiries
- [ ] User feedback positive

---

## 📚 FULL DOCUMENTATION

- **Complete Deployment:** `UGC_DEPLOYMENT_CHECKLIST.md` (detailed)
- **Launch Procedures:** `UGC_LAUNCH_CHECKLIST.md` (step-by-step)
- **Rollback Plan:** `UGC_ROLLBACK_PLAN.md` (emergency)
- **Monitoring:** `UGC_MONITORING_GUIDE.md` (metrics & alerts)
- **Post-Launch:** `UGC_POST_LAUNCH_CHECKLIST.md` (week 1-4)

---

**Document Version:** 1.0.0
**Last Updated:** November 8, 2025

**Need help?** Slack: #ugc-deployment | Email: engineering@rezapp.com
