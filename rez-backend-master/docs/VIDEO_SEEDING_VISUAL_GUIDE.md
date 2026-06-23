# Video Seeding Visual Guide

## 📁 File Structure

```
user-backend/
├── src/
│   ├── scripts/
│   │   ├── seed-videos.js              ⭐ MAIN SEED SCRIPT
│   │   ├── verify-seeded-videos.js     ✅ VERIFICATION
│   │   ├── test-video-api.js           🧪 API TESTING
│   │   ├── SEED_VIDEOS_README.md       📖 FULL DOCS
│   │   └── VIDEO_SEEDING_QUICK_START.md 🚀 QUICK START
│   ├── models/
│   │   └── Video.ts                    📄 Video Schema
│   ├── routes/
│   │   └── videoRoutes.ts              🛣️ API Routes
│   └── controllers/
│       └── videoController.ts          🎮 Controllers
├── COMPREHENSIVE_VIDEO_SEEDING_COMPLETE.md  📦 OVERVIEW
└── NPM_SCRIPTS_GUIDE.md                     ⚙️ NPM SCRIPTS
```

---

## 🔄 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PREREQUISITES                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Users   │  │ Products │  │  Stores  │                 │
│  │   20+    │  │   50+    │  │   20+    │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              STEP 1: SEED VIDEOS                            │
│                                                             │
│  $ node src/scripts/seed-videos.js                          │
│                                                             │
│  Creates:                                                   │
│  • 125-175 videos                                          │
│  • Distributed across 8 categories                         │
│  • 35% merchant, 65% UGC                                   │
│  • 50% with product links                                  │
│  • All with Cloudinary URLs                                │
│                                                             │
│  Output: ✅ Successfully inserted 150 videos               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│             STEP 2: VERIFY DATA                             │
│                                                             │
│  $ node src/scripts/verify-seeded-videos.js                 │
│                                                             │
│  Checks:                                                    │
│  • Video count (125-175)                                   │
│  • Category distribution                                    │
│  • Data integrity                                          │
│  • Relationships (creators/products/stores)                │
│  • Cloudinary integration                                  │
│                                                             │
│  Output: 🎉 OVERALL STATUS: EXCELLENT                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│             STEP 3: TEST API (Optional)                     │
│                                                             │
│  $ node src/scripts/test-video-api.js                       │
│                                                             │
│  Tests:                                                     │
│  • 10 API endpoint tests                                   │
│  • Category filtering                                      │
│  • Search functionality                                    │
│  • Relationship population                                │
│                                                             │
│  Output: ✅ Passed: 10/10                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│            READY FOR FRONTEND!                              │
│                                                             │
│  Videos available at:                                       │
│  http://localhost:5000/api/videos                          │
│                                                             │
│  Frontend Play page can now fetch real video data          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Distribution

```
Total Videos: 125-175
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

By Category:
┌──────────────┬─────────┬────────────────────────┐
│ Category     │ Count   │ Progress               │
├──────────────┼─────────┼────────────────────────┤
│ trending_me  │ 20-25   │ ████████░░ 16%        │
│ trending_her │ 20-25   │ ████████░░ 16%        │
│ waist        │ 15-20   │ ██████░░░░ 12%        │
│ article      │ 10-15   │ ████░░░░░░ 8%         │
│ featured     │ 15-20   │ ██████░░░░ 12%        │
│ challenge    │ 15-20   │ ██████░░░░ 12%        │
│ tutorial     │ 15-20   │ ██████░░░░ 12%        │
│ review       │ 15-20   │ ██████░░░░ 12%        │
└──────────────┴─────────┴────────────────────────┘

By Content Type:
┌──────────────┬─────────┬────────────────────────┐
│ Type         │ Count   │ Progress               │
├──────────────┼─────────┼────────────────────────┤
│ Merchant     │ 40-50   │ ███████░░░ 35%        │
│ UGC          │ 75-100  │ █████████████ 65%     │
│ Article      │ 10-15   │ ██░░░░░░░░ 10%        │
└──────────────┴─────────┴────────────────────────┘

Relationships:
┌──────────────────────┬─────────────┐
│ Videos with Products │ 50%         │
│ Videos with Stores   │ 30-40%      │
│ Trending Videos      │ 20%         │
│ Featured Videos      │ 10-15%      │
│ Sponsored Videos     │ 5-10%       │
└──────────────────────┴─────────────┘
```

---

## 🎬 Video Schema Visual

```
┌─────────────────────────────────────────────────────────┐
│                      VIDEO DOCUMENT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📝 Basic Info                                          │
│  ├─ title: String                                       │
│  ├─ description: String                                 │
│  ├─ creator: ObjectId → User                            │
│  └─ contentType: merchant | ugc | article_video         │
│                                                         │
│  🎥 Media                                               │
│  ├─ videoUrl: Cloudinary URL                           │
│  ├─ thumbnail: Cloudinary Thumbnail                    │
│  └─ preview: Preview URL                               │
│                                                         │
│  🏷️ Classification                                      │
│  ├─ category: trending_me | trending_her | waist...    │
│  ├─ tags: [String]                                     │
│  └─ hashtags: [String]                                 │
│                                                         │
│  🔗 Relationships                                       │
│  ├─ products: [ObjectId → Product]                     │
│  ├─ stores: [ObjectId → Store]                         │
│  └─ associatedArticle: ObjectId → Article              │
│                                                         │
│  📈 Engagement                                          │
│  ├─ views: Number                                      │
│  ├─ likes: [ObjectId → User]                           │
│  ├─ shares: Number                                     │
│  ├─ comments: Number                                   │
│  └─ saves: Number                                      │
│                                                         │
│  📊 Analytics                                           │
│  ├─ totalViews: Number                                 │
│  ├─ uniqueViews: Number                                │
│  ├─ avgWatchTime: Number (seconds)                     │
│  ├─ completionRate: Number (%)                         │
│  ├─ engagementRate: Number (%)                         │
│  └─ deviceBreakdown: { mobile, tablet, desktop }      │
│                                                         │
│  ⚙️ Metadata                                            │
│  ├─ duration: Number (seconds)                         │
│  ├─ resolution: 720p | 1080p | 4K                      │
│  ├─ format: mp4 | mov | webm                           │
│  ├─ aspectRatio: 16:9 | 9:16 | 1:1                     │
│  └─ fps: 30 | 60                                       │
│                                                         │
│  🎵 Additional                                          │
│  ├─ location: { city, coordinates, country }           │
│  ├─ music: { title, artist, url }                     │
│  ├─ effects: [String]                                 │
│  └─ privacy: public | private | unlisted              │
│                                                         │
│  ✅ Status                                              │
│  ├─ isPublished: Boolean                               │
│  ├─ isApproved: Boolean                                │
│  ├─ isFeatured: Boolean                                │
│  ├─ isTrending: Boolean                                │
│  └─ moderationStatus: approved | pending | rejected    │
│                                                         │
│  📅 Timestamps                                          │
│  ├─ publishedAt: Date                                  │
│  ├─ createdAt: Date                                    │
│  └─ updatedAt: Date                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ☁️ Cloudinary Integration

```
┌────────────────────────────────────────────────────┐
│              CLOUDINARY STRUCTURE                  │
└────────────────────────────────────────────────────┘

Cloud Name: dsuakj68p

Folder Structure:
├── videos/
│   ├── merchant/
│   │   ├── product_showcase_1.mp4
│   │   ├── product_showcase_1.jpg (auto-thumbnail)
│   │   ├── fashion_haul_2.mp4
│   │   └── fashion_haul_2.jpg
│   ├── ugc/
│   │   ├── user_review_1.mp4
│   │   ├── user_review_1.jpg
│   │   ├── tutorial_2.mp4
│   │   └── tutorial_2.jpg
│   └── articles/
│       ├── guide_1.mp4
│       ├── guide_1.jpg
│       ├── how_to_2.mp4
│       └── how_to_2.jpg
└── images/
    ├── products/
    ├── profiles/
    └── reviews/

URL Format:
┌─────────────────────────────────────────────────────┐
│ Video URL:                                          │
│ https://res.cloudinary.com/dsuakj68p/               │
│        video/upload/v1/videos/merchant/video.mp4    │
│                                                     │
│ Thumbnail URL (auto-generated):                     │
│ https://res.cloudinary.com/dsuakj68p/               │
│        video/upload/v1/videos/merchant/video.jpg    │
└─────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

```
Backend API: http://localhost:5000/api

┌─────────────────────────────────────────────────────┐
│                  VIDEO ENDPOINTS                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  GET    /videos                                     │
│         → Get all videos (paginated)                │
│         Params: ?page=1&limit=20                    │
│                                                     │
│  GET    /videos?category=trending_me                │
│         → Get videos by category                    │
│                                                     │
│  GET    /videos?contentType=merchant                │
│         → Get videos by content type                │
│                                                     │
│  GET    /videos/trending                            │
│         → Get trending videos                       │
│                                                     │
│  GET    /videos/featured                            │
│         → Get featured videos                       │
│                                                     │
│  GET    /videos/:id                                 │
│         → Get single video by ID                    │
│                                                     │
│  GET    /videos/search?q=fashion                    │
│         → Search videos                             │
│                                                     │
│  POST   /videos/:id/like                            │
│         → Like/unlike video                         │
│                                                     │
│  POST   /videos/:id/comment                         │
│         → Add comment to video                      │
│                                                     │
│  POST   /videos/:id/share                           │
│         → Increment share count                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Flow

```
┌──────────────────────────────────────────────────┐
│            TESTING WORKFLOW                      │
└──────────────────────────────────────────────────┘

1. Unit Tests (Script Level)
   ├─ Run: node src/scripts/verify-seeded-videos.js
   ├─ Checks: Data integrity, counts, relationships
   └─ Output: EXCELLENT / GOOD / NEEDS ATTENTION

2. API Tests (Endpoint Level)
   ├─ Run: node src/scripts/test-video-api.js
   ├─ Tests: 10 endpoint tests
   └─ Output: Passed X/10

3. Integration Tests (Frontend)
   ├─ Start backend: npm run dev
   ├─ Start frontend: npm start (in frontend/)
   ├─ Navigate to Play page
   └─ Verify: Videos load, playback works, filtering works

4. Manual Tests
   ├─ Category filtering
   ├─ Video playback
   ├─ Product links
   ├─ Engagement (like/share)
   └─ Search functionality
```

---

## 📈 Success Metrics

```
┌────────────────────────────────────────────────┐
│          VERIFICATION CHECKLIST                │
├────────────────────────────────────────────────┤
│                                                │
│  Database Level:                               │
│  ✅ 125-175 videos in database                 │
│  ✅ All 8 categories populated                 │
│  ✅ 35% merchant, 65% UGC distribution         │
│  ✅ 50% videos linked to products              │
│  ✅ No broken ObjectId references              │
│  ✅ All videos published & approved            │
│                                                │
│  Cloudinary Level:                             │
│  ✅ All videos use Cloudinary URLs             │
│  ✅ Thumbnails auto-generated                  │
│  ✅ Videos in correct folders                  │
│                                                │
│  API Level:                                    │
│  ✅ All endpoints respond correctly            │
│  ✅ Pagination works                           │
│  ✅ Filtering works (category/type)            │
│  ✅ Search works                               │
│  ✅ Relationships populate correctly           │
│                                                │
│  Frontend Level:                               │
│  ✅ Videos display on Play page                │
│  ✅ Video playback works                       │
│  ✅ Category switching works                   │
│  ✅ Product links work                         │
│  ✅ Engagement tracking works                  │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 🚀 Quick Commands Reference

```bash
# SEEDING
node src/scripts/seed-videos.js          # Seed 125-175 videos

# VERIFICATION
node src/scripts/verify-seeded-videos.js # Verify data integrity

# TESTING
node src/scripts/test-video-api.js       # Test API endpoints

# COMBINED (Recommended)
node src/scripts/seed-videos.js && \
node src/scripts/verify-seeded-videos.js && \
node src/scripts/test-video-api.js

# WITH NPM SCRIPTS (after adding to package.json)
npm run seed:videos                      # Seed
npm run verify:videos                    # Verify
npm run test:video-api                   # Test
npm run videos:all                       # All three
```

---

## 📚 Documentation Quick Links

```
┌──────────────────────────────────────────────────┐
│              DOCUMENTATION INDEX                 │
├──────────────────────────────────────────────────┤
│                                                  │
│  📦 COMPREHENSIVE_VIDEO_SEEDING_COMPLETE.md      │
│     → Package overview & quick start             │
│                                                  │
│  📖 SEED_VIDEOS_README.md                        │
│     → Complete documentation (detailed)          │
│                                                  │
│  🚀 VIDEO_SEEDING_QUICK_START.md                 │
│     → Quick reference guide                      │
│                                                  │
│  ⚙️  NPM_SCRIPTS_GUIDE.md                        │
│     → npm script configurations                  │
│                                                  │
│  📊 VIDEO_SEEDING_VISUAL_GUIDE.md (this file)    │
│     → Visual diagrams and flowcharts             │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 🎯 At a Glance

```
WHAT:  Comprehensive video seeding system
WHO:   For REZ app Play page
WHY:   Replace dummy data with real backend integration
WHEN:  Run after seeding users, products, stores
WHERE: user-backend/src/scripts/

FILES: 3 scripts + 5 documentation files
TIME:  ~2 minutes to run
RESULT: 125-175 production-ready videos

KEY FEATURES:
✅ Cloudinary integration
✅ 8 categories
✅ 3 content types
✅ Realistic engagement
✅ Product relationships
✅ Full analytics
✅ Auto verification
✅ API testing
```

---

**Visual Guide Version**: 1.0.0
**Last Updated**: January 2025
**Created For**: REZ App Video Seeding
