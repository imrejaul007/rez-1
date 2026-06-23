# Video Seeding Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Prerequisites Check

Before running the video seed script, ensure you have:

```bash
# 1. Check if users exist
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/test').then(() => mongoose.model('User', new mongoose.Schema({})).countDocuments()).then(count => console.log('Users:', count)).then(() => process.exit())"

# 2. Check if products exist
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/test').then(() => mongoose.model('Product', new mongoose.Schema({})).countDocuments()).then(count => console.log('Products:', count)).then(() => process.exit())"

# 3. Check if stores exist
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/test').then(() => mongoose.model('Store', new mongoose.Schema({})).countDocuments()).then(count => console.log('Stores:', count)).then(() => process.exit())"
```

**Required Counts:**
- Users: At least 20+ (mix of merchants and regular users)
- Products: At least 50+
- Stores: At least 20+

### Step 1: Navigate to Backend

```bash
cd user-backend
```

### Step 2: Run the Seed Script

```bash
# Run the video seed script
node src/scripts/seed-videos.js
```

**Expected Output:**
```
================================================================================
🎬 COMPREHENSIVE VIDEO SEED SCRIPT
================================================================================
📅 Started at: 1/8/2025, 3:45:30 PM

📡 Connecting to MongoDB...
✅ Connected to MongoDB
   Database: test

🔍 Fetching existing data from database...
   ✓ Merchants: 25
   ✓ UGC Creators: 50
   ✓ Products: 100
   ✓ Stores: 50

🗑️  Clearing existing videos...
   Deleted 0 existing videos

🎥 Generating videos...
...
✅ Successfully inserted 150 videos
```

### Step 3: Verify the Seeded Data

```bash
# Run verification script
node src/scripts/verify-seeded-videos.js
```

**Expected Output:**
```
🔍 VIDEO SEED VERIFICATION SCRIPT
...
✅ SUCCESSES:
   - 150 videos successfully seeded
   - Video count (150) is within target range
   - All videos are published
   - 50.0% of videos have products
   - All videos use Cloudinary integration

🎉 OVERALL STATUS: EXCELLENT
   All checks passed! Videos are production-ready.
```

### Step 4: Test in Frontend

```bash
# In a new terminal, navigate to frontend
cd frontend

# Start the development server
npm start
```

Then navigate to the Play page and check if videos appear.

---

## 📋 Complete Workflow

### If Starting Fresh

```bash
# 1. Seed Users
node src/scripts/seedDatabase.ts
# or
npm run seed:users

# 2. Seed Stores
npm run seed:stores

# 3. Seed Products
npm run seed:products

# 4. Seed Videos (our new script)
node src/scripts/seed-videos.js

# 5. Verify Everything
node src/scripts/verify-seeded-videos.js
```

### If You Already Have Data

```bash
# Just run the video seeder
node src/scripts/seed-videos.js

# Verify it worked
node src/scripts/verify-seeded-videos.js
```

---

## 🎯 What Gets Created

### Video Breakdown

**Total Videos**: 125-175 videos

**By Category:**
- trending_me (Men's): 20-25 videos
- trending_her (Women's): 20-25 videos
- waist (Fitness): 15-20 videos
- article (Educational): 10-15 videos
- featured (Exclusive): 15-20 videos
- challenge (Challenges): 15-20 videos
- tutorial (How-To): 15-20 videos
- review (Product Reviews): 15-20 videos

**By Content Type:**
- Merchant Videos: 40-50 (35%)
- UGC Videos: 75-100 (65%)
- Article Videos: 10-15 (10%)

**Special Features:**
- 50% linked to products (shoppable videos)
- All videos have engagement data (views, likes, shares)
- All videos stored in Cloudinary
- Auto-generated thumbnails
- Realistic metadata (duration, resolution, etc.)
- Location data (Indian cities)
- Music tracks and effects

---

## 🔍 Quick Verification Queries

### MongoDB Compass Queries

#### 1. Count Total Videos
```javascript
{}
```

#### 2. Get Videos by Category
```javascript
{ "category": "trending_me" }
```

#### 3. Get Merchant Videos
```javascript
{ "contentType": "merchant" }
```

#### 4. Get Featured Videos
```javascript
{ "isFeatured": true }
```

#### 5. Get Videos with Products
```javascript
{ "products": { "$ne": [] } }
```

#### 6. Get Top Viewed Videos
```javascript
// Sort by: { "engagement.views": -1 }
// Limit: 10
```

### Command Line Queries

```bash
# Count all videos
mongosh "mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/test" --eval "db.videos.countDocuments()"

# Count by category
mongosh "mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/test" --eval "db.videos.aggregate([{$group:{_id:'$category',count:{$sum:1}}}])"

# Get top 5 videos
mongosh "mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/test" --eval "db.videos.find({},{title:1,'engagement.views':1}).sort({'engagement.views':-1}).limit(5)"
```

---

## 🐛 Troubleshooting

### Error: "No users found"

**Problem**: Database doesn't have users seeded

**Solution**:
```bash
# Seed users first
npm run seed:users
# or
node src/scripts/seedDatabase.ts
```

### Error: "Connection timeout"

**Problem**: Can't connect to MongoDB

**Solution**:
1. Check internet connection
2. Verify MongoDB URI is correct
3. Check if IP is whitelisted in MongoDB Atlas

```bash
# Test connection
mongosh "mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/test"
```

### Warning: "Less than 125 videos created"

**Problem**: Not enough data to generate target videos

**Solution**:
1. Check if enough users exist (need 20+)
2. Check if enough products exist (need 50+)
3. Increase video count in script:

```javascript
// In seed-videos.js, increase ranges:
const categoryDistribution = {
  trending_me: getRandomInt(25, 30),  // Increased
  trending_her: getRandomInt(25, 30), // Increased
  // ... other categories
};
```

### Warning: "Invalid product/store references"

**Problem**: Some referenced products/stores don't exist

**Solution**:
```bash
# Re-seed products and stores
npm run seed:products
npm run seed:stores

# Then re-run video seeding
node src/scripts/seed-videos.js
```

### Videos Not Showing on Frontend

**Problem**: Frontend not fetching videos

**Solution**:

1. **Check Backend is Running**:
```bash
# In user-backend directory
npm run dev
```

2. **Check API Endpoint**:
```bash
# Test the endpoint
curl http://localhost:5000/api/videos
```

3. **Check Frontend API Configuration**:
```typescript
// frontend/services/realVideosApi.ts
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
```

4. **Check Network Tab** in browser/app for errors

---

## 📊 Expected Results

### After Successful Seeding

1. **Database**: 125-175 videos in `videos` collection
2. **Categories**: 8 categories with distributed content
3. **Engagement**: Realistic view/like/share numbers
4. **Relationships**: 50% videos linked to products
5. **Status**: All videos published and approved
6. **Cloudinary**: All videos using Cloudinary URLs

### Frontend Play Page

1. **Merchant Section**: Shows merchant product videos
2. **Article Section**: Shows educational/guide videos
3. **UGC Section**: Shows user-generated content
4. **Category Filters**: Can filter by 8 categories
5. **Video Playback**: Videos play from Cloudinary
6. **Product Links**: Shoppable videos link to products

---

## 🚀 Next Steps After Seeding

### 1. Test Video Playback
- Open Play page in app
- Play different videos
- Check if thumbnails load
- Verify video quality

### 2. Test Category Filtering
- Switch between categories
- Verify correct videos show
- Check video counts per category

### 3. Test Product Links
- Click on videos with products
- Verify product pages open
- Check product data is correct

### 4. Test Engagement
- Like a video
- Share a video
- Add comments (if implemented)
- Check analytics update

### 5. Performance Testing
- Scroll through video lists
- Check load times
- Monitor memory usage
- Test with slow network

### 6. Integration Testing
- Test search functionality
- Test sorting (trending, latest, etc.)
- Test video reporting
- Test creator profiles

---

## 📚 Related Documentation

- **Full Documentation**: `SEED_VIDEOS_README.md`
- **Verification Script**: `verify-seeded-videos.js`
- **Video Model**: `../models/Video.ts`
- **Video Routes**: `../routes/videoRoutes.ts`
- **Frontend API**: `../../frontend/services/realVideosApi.ts`
- **Play Page**: `../../frontend/app/(tabs)/play.tsx`
- **Cloudinary Guide**: `../../frontend/CLOUDINARY_VIDEO_UPLOAD_GUIDE.md`

---

## 🆘 Getting Help

### Check Logs
```bash
# Backend logs
npm run dev

# Frontend logs
npm start
```

### Common Issues Reference
1. Connection errors → Check MongoDB URI
2. No data showing → Run verification script
3. Frontend errors → Check API endpoint
4. Video not playing → Check Cloudinary URLs
5. Missing relationships → Re-seed related data

### Debug Mode
```bash
# Run with debug output
DEBUG=* node src/scripts/seed-videos.js
```

---

## ✅ Success Checklist

- [ ] Prerequisites met (users, products, stores exist)
- [ ] Video seed script ran successfully
- [ ] Verification script shows "EXCELLENT" status
- [ ] 125-175 videos created
- [ ] All 8 categories have videos
- [ ] Videos appear on frontend Play page
- [ ] Video playback works
- [ ] Category filtering works
- [ ] Product links work (for shoppable videos)
- [ ] Engagement tracking works

---

**Version**: 1.0.0
**Last Updated**: January 2025
**Script**: `seed-videos.js`
**Verification**: `verify-seeded-videos.js`
