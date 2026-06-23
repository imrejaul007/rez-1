# Video Seed Script Documentation

## Overview

The `seed-videos.js` script creates **125-175 high-quality videos** with full Cloudinary integration for the REZ app Play page.

## Features

### 📊 Video Distribution

- **trending_me**: 20-25 videos (men's fashion, tech, fitness)
- **trending_her**: 20-25 videos (women's fashion, beauty, lifestyle)
- **waist**: 15-20 videos (fitness, nutrition, wellness)
- **article**: 10-15 videos (guides, tutorials, informational)
- **featured**: 15-20 videos (exclusive content, launches)
- **challenge**: 15-20 videos (30-day challenges, competitions)
- **tutorial**: 15-20 videos (how-to guides, step-by-step)
- **review**: 15-20 videos (product reviews, comparisons)

### 🎭 Content Types

- **Merchant Videos** (40-50): Professional product showcases from verified merchants
- **UGC Videos** (75-100): User-generated content from creators
- **Article Videos** (10-15): Educational videos linked to articles

### ☁️ Cloudinary Integration

- **Cloud Name**: `dsuakj68p`
- **Video Storage**: `videos/merchant/`, `videos/ugc/`, `videos/articles/`
- **Auto-generated Thumbnails**: `.jpg` versions of all videos
- **Sample URLs**: Uses Cloudinary demo videos and custom placeholders

### 🔗 Database Relationships

- **50% of videos** linked to products (shoppable videos)
- Videos linked to stores
- Videos linked to creators (merchants or UGC creators)
- Proper ObjectId references for all relationships

### 📈 Engagement & Analytics

Each video includes:
- Views (1,000 - 100,000)
- Likes (5-25% of views)
- Comments (1-8% of views)
- Shares (1-5% of views)
- Analytics: completion rate, engagement rate, watch time
- Device breakdown (mobile, tablet, desktop)
- Location data
- View history by hour and date

### 🎬 Video Metadata

- Duration: 15-180 seconds
- Resolution: 720p, 1080p, or 4K
- Format: mp4, mov, webm
- Aspect Ratio: 16:9, 9:16, 1:1
- FPS: 30 or 60
- File size (calculated)

### 🎵 Additional Features

- Music tracks with artist info
- Video effects/filters
- Location data (major Indian cities)
- Hashtags (5 per video)
- Tags (relevant to content)
- Privacy settings
- Moderation status
- Publishing dates

## Prerequisites

### Database Requirements

1. **MongoDB Connection**:
   - URI: `mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/`
   - Database: `test`

2. **Required Collections** (must be seeded first):
   - **Users**: Both merchants and regular users
   - **Products**: At least 50-100 products
   - **Stores**: At least 20-50 stores

3. **Run these seed scripts first**:
   ```bash
   # In user-backend directory
   npm run seed:users
   npm run seed:products
   npm run seed:stores
   ```

### Environment Variables

**Optional** (for Cloudinary API access):
```bash
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Note**: The script works without API credentials as it uses public Cloudinary sample videos.

## Usage

### Option 1: Direct Execution

```bash
cd user-backend
node src/scripts/seed-videos.js
```

### Option 2: Via npm (if configured)

```bash
npm run seed:videos
```

### Option 3: Import in Another Script

```javascript
const { seedVideos } = require('./scripts/seed-videos');

async function seedAll() {
  await seedVideos();
  console.log('Videos seeded successfully!');
}
```

## Output

### Console Output

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

📂 Creating 22 videos for category: TRENDING_ME
   ✅ Generated 22 trending_me videos
📂 Creating 23 videos for category: TRENDING_HER
   ✅ Generated 23 trending_her videos
📂 Creating 18 videos for category: WAIST
   ✅ Generated 18 waist videos
...

💾 Inserting videos into database...
   Progress: 150/150 (100%)
✅ Successfully inserted 150 videos

================================================================================
📊 VIDEO SEEDING SUMMARY
================================================================================

📂 Videos by Category:
   trending_me    :  22 videos
   trending_her   :  23 videos
   waist          :  18 videos
   article        :  12 videos
   featured       :  17 videos
   challenge      :  18 videos
   tutorial       :  19 videos
   review         :  21 videos

🎭 Videos by Content Type:
   Merchant Videos : 48
   UGC Videos      : 90
   Article Videos  : 12

🔗 Video Relationships:
   Videos with Products : 75 (50%)
   Videos with Stores   : 45

⭐ Special Videos:
   Trending Videos   : 30
   Featured Videos   : 17
   Sponsored Videos  : 8

📈 Total Engagement:
   Total Views  : 4,567,890
   Total Likes  : 456,789
   Total Shares : 123,456

☁️  Cloudinary Integration:
   Cloud Name   : dsuakj68p
   Video URLs   : 150 videos
   Thumbnails   : Auto-generated for all videos
   Folders      : videos/merchant/, videos/ugc/, videos/articles/

================================================================================
✅ VIDEO SEEDING COMPLETED SUCCESSFULLY!
================================================================================
```

## Database Schema

### Video Model Fields

```javascript
{
  // Basic Info
  title: String,
  description: String,
  creator: ObjectId (ref: User),
  contentType: 'merchant' | 'ugc' | 'article_video',

  // Media URLs
  videoUrl: String (Cloudinary URL),
  thumbnail: String (Cloudinary thumbnail),
  preview: String,

  // Classification
  category: 'trending_me' | 'trending_her' | 'waist' | 'article' | 'featured' | 'challenge' | 'tutorial' | 'review',
  subcategory: String,
  tags: [String],
  hashtags: [String],

  // Relationships
  products: [ObjectId (ref: Product)],
  stores: [ObjectId (ref: Store)],
  associatedArticle: ObjectId (ref: Article),

  // Engagement
  engagement: {
    views: Number,
    likes: [ObjectId (ref: User)],
    shares: Number,
    comments: Number,
    saves: Number,
    reports: Number
  },

  // Metadata
  metadata: {
    duration: Number,
    resolution: String,
    fileSize: Number,
    format: String,
    aspectRatio: String,
    fps: Number
  },

  // Processing
  processing: {
    status: String,
    processedUrl: String,
    thumbnailUrl: String,
    processedAt: Date
  },

  // Analytics
  analytics: {
    totalViews: Number,
    uniqueViews: Number,
    avgWatchTime: Number,
    completionRate: Number,
    engagementRate: Number,
    shareRate: Number,
    likeRate: Number,
    viewsByHour: Map,
    viewsByDate: Map,
    topLocations: [String],
    deviceBreakdown: Object
  },

  // Status
  isPublished: Boolean,
  isApproved: Boolean,
  isFeatured: Boolean,
  isTrending: Boolean,
  isSponsored: Boolean,
  moderationStatus: String,

  // Location
  location: {
    name: String,
    coordinates: [Number],
    city: String,
    country: String
  },

  // Music
  music: {
    title: String,
    artist: String,
    url: String,
    duration: Number
  },

  // Privacy
  privacy: String,
  allowComments: Boolean,
  allowSharing: Boolean,

  // Timestamps
  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Verification Queries

After running the script, verify the data:

### 1. Count Videos by Category

```javascript
db.videos.aggregate([
  { $group: { _id: '$category', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### 2. Count Videos by Content Type

```javascript
db.videos.aggregate([
  { $group: { _id: '$contentType', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### 3. Check Videos with Products

```javascript
db.videos.countDocuments({ products: { $ne: [] } })
```

### 4. Get Featured Videos

```javascript
db.videos.find({ isFeatured: true }).count()
```

### 5. Get Trending Videos

```javascript
db.videos.find({ isTrending: true }).count()
```

### 6. Check All Videos Are Published

```javascript
db.videos.countDocuments({ isPublished: true, isApproved: true })
```

## Customization

### Modify Video Count

Change the `categoryDistribution` object in the script:

```javascript
const categoryDistribution = {
  trending_me: getRandomInt(25, 30),    // Increase
  trending_her: getRandomInt(25, 30),   // Increase
  waist: getRandomInt(10, 15),          // Decrease
  // ... other categories
};
```

### Add Custom Video URLs

Edit the `SAMPLE_VIDEO_URLS` object:

```javascript
const SAMPLE_VIDEO_URLS = {
  merchant: [
    'https://res.cloudinary.com/dsuakj68p/video/upload/v1/your-video.mp4',
    // Add more URLs
  ],
  // ... other types
};
```

### Add More Templates

Edit the `VIDEO_TEMPLATES` object:

```javascript
const VIDEO_TEMPLATES = {
  trending_me: [
    {
      title: 'Your Custom Video Title',
      desc: 'Your custom description',
      tags: ['tag1', 'tag2', 'tag3']
    },
    // Add more templates
  ],
  // ... other categories
};
```

### Modify Engagement Ranges

Change the `views` generation:

```javascript
// In the main loop
const views = getRandomInt(5000, 200000);  // Increase view range
const likesCount = Math.floor(views * getRandomInt(10, 30) / 100);  // Increase like rate
```

## Troubleshooting

### Error: "No users found"

**Solution**: Run user seeding first:
```bash
npm run seed:users
```

### Error: "Connection timeout"

**Solution**: Check MongoDB connection string and network:
```javascript
// Verify connection
mongoose.connect(MONGODB_URI, {
  dbName: DB_NAME,
  serverSelectionTimeoutMS: 30000
});
```

### Error: "Cloudinary upload failed"

**Note**: This script uses pre-defined URLs, not actual uploads. If you want real uploads, you need:
1. Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
2. Use the Cloudinary SDK upload method

### Warning: "Videos with no products"

**Expected Behavior**: Only 50% of videos have products linked. This is intentional to simulate real-world data.

### Low Engagement Numbers

**Solution**: Increase engagement in the generation functions:
```javascript
const views = getRandomInt(10000, 500000);  // Higher views
```

## Integration with Frontend

### API Endpoints

The videos can be fetched using existing endpoints:

```javascript
// Get all videos
GET /api/videos

// Get videos by category
GET /api/videos?category=trending_me

// Get videos by content type
GET /api/videos?contentType=merchant

// Get trending videos
GET /api/videos/trending

// Get featured videos
GET /api/videos/featured
```

### Frontend Service Usage

```typescript
// In frontend: services/realVideosApi.ts
import { apiClient } from './apiClient';

export const getVideosByCategory = async (category: string) => {
  const response = await apiClient.get(`/api/videos?category=${category}`);
  return response.data;
};
```

## Performance Optimization

### Batch Insertion

The script uses batch insertion (50 videos per batch) for better performance:

```javascript
const batchSize = 50;
for (let i = 0; i < allVideos.length; i += batchSize) {
  const batch = allVideos.slice(i, i + batchSize);
  await Video.insertMany(batch);
}
```

### Indexes

Ensure these indexes exist on the Video collection:

```javascript
db.videos.createIndex({ category: 1, isPublished: 1 })
db.videos.createIndex({ contentType: 1, isPublished: 1 })
db.videos.createIndex({ creator: 1, isPublished: 1 })
db.videos.createIndex({ isTrending: 1, isPublished: 1 })
db.videos.createIndex({ isFeatured: 1, isPublished: 1 })
```

## Next Steps

1. **Verify Data**: Run verification queries
2. **Test Frontend**: Check if videos appear on Play page
3. **Test Filtering**: Verify category filtering works
4. **Test Playback**: Ensure video URLs load correctly
5. **Check Relationships**: Verify product/store links work
6. **Monitor Performance**: Check query performance with 150+ videos

## Related Files

- **Video Model**: `user-backend/src/models/Video.ts`
- **Video Routes**: `user-backend/src/routes/videoRoutes.ts`
- **Video Controller**: `user-backend/src/controllers/videoController.ts`
- **Frontend API**: `frontend/services/realVideosApi.ts`
- **Play Page**: `frontend/app/(tabs)/play.tsx`

## Support

For issues or questions:
1. Check the error logs in console
2. Verify all prerequisites are met
3. Check MongoDB connection
4. Verify user, product, and store data exists
5. Review the script output for detailed statistics

---

**Script Version**: 1.0.0
**Last Updated**: January 2025
**Author**: REZ Development Team
