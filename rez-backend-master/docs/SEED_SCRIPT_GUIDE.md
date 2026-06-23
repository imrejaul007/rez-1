# Master Seed Script Documentation

## Overview

The `seed-all-quick.js` script provides a comprehensive database seeding solution for the Rez App backend. It creates realistic, complete data with proper relationships across all major collections.

## What Gets Seeded

### 1. Categories (8 categories)
- **Electronics** - Smartphones, laptops, gadgets
- **Fashion** - Clothing, footwear, accessories
- **Food & Dining** - Restaurants, cafes, food delivery
- **Beauty & Personal Care** - Cosmetics, skincare, wellness
- **Home & Living** - Furniture, decor, appliances
- **Sports & Fitness** - Gym equipment, sportswear
- **Books & Education** - Books, courses, materials
- **Services** - Home services, repairs, maintenance

Each category includes:
- Name, slug, description
- Icon and images (banner)
- Type classification
- Metadata (color, tags, SEO)
- Active status and sort order

### 2. Stores/Merchants (15 stores)

Complete store data with:
- Business information (name, owner, contact)
- Physical addresses with coordinates
- Verification status (all verified)
- Ratings (3.5 to 5.0 stars)
- Business hours
- Logo and cover images
- Category associations

**Example Stores:**
- TechHub Electronics (Bangalore)
- Fashion Forward (Mumbai)
- Gourmet Kitchen (Delhi)
- Beauty Bliss Spa (Hyderabad)
- HomeDecor Paradise (Pune)
- FitZone Gym (Chennai)
- BookWorm Store (Kolkata)
- QuickFix Services (Bangalore)
- SmartPhone Hub (Mumbai)
- Urban Trends (Delhi)
- Cafe Coffee Day (Pune)
- Glow Cosmetics (Hyderabad)
- Kitchen Essentials (Chennai)
- Sports Arena (Mumbai)
- Learning Hub (Bangalore)

### 3. Products (30 products)

Distributed across stores and categories with:
- Complete product details
- Pricing (₹99 to ₹9999)
- Inventory management
- Multiple images
- Ratings and reviews count
- Cashback percentages (5-25%)
- Stock levels (varied)
- SKU codes
- Tags and search keywords

**Product Categories:**
- Electronics: iPhones, MacBooks, Headphones
- Fashion: Kurtas, Shoes, Jackets
- Food: Burgers, Pizza, Sushi
- Beauty: Skincare sets, Makeup kits
- Home: Furniture, Appliances
- Sports: Yoga mats, Gym equipment
- Books: Various book categories
- Services: Repair and maintenance

### 4. Offers (20 offers)

Complete offer data with:
- Various discount types (percentage, flat, BOGO)
- Cashback offers (5-50%)
- Mix of active and upcoming
- Location-based (linked to stores)
- Validity periods (7-60 days)
- Engagement metrics (likes, shares, views)
- Restrictions (min order value, usage limits)
- Featured and trending flags

**Offer Categories:**
- Mega deals
- Student discounts
- New arrival offers
- Trending deals
- Category-specific (food, fashion, electronics)

### 5. Videos (15 videos) - FOR PLAY PAGE

Video content with:
- Product reviews
- Store highlights
- How-to videos
- UGC content
- Tutorial videos
- Linked to products and stores
- Engagement metrics
- Analytics data
- Processing status
- View counts (100-50,000)
- Multiple categories

**Video Categories:**
- trending_me
- trending_her
- waist
- article
- featured
- tutorial
- review

### 6. Projects (10 projects) - FOR EARN PAGE

Earning opportunities with:
- Social media tasks
- Review tasks
- Photo/video upload tasks
- Store visit tasks
- Survey tasks
- Rewards (₹50 to ₹500)
- Coin amounts
- Requirements and instructions
- Difficulty levels
- Time estimates
- Completion limits
- Analytics tracking

**Project Types:**
- Video creation
- Photo uploads
- Text reviews
- Store visits
- Social shares
- Ratings

## How to Use

### Method 1: Using npm script (Recommended)

```bash
cd user-backend
npm run seed:all
```

### Method 2: Direct execution

```bash
cd user-backend
node scripts/seed-all-quick.js
```

### Method 3: Using ts-node (if configured)

```bash
cd user-backend
npx ts-node scripts/seed-all-quick.js
```

## Expected Output

```
✅ MongoDB Connected Successfully
📦 Database: rez-app
────────────────────────────────────────────────────────────

🌱 Starting Database Seeding...

📁 Seeding Categories...
✅ Created 8 categories

🏪 Seeding Stores...
✅ Created 15 stores

📦 Seeding Products...
✅ Created 30 products

🎁 Seeding Offers...
✅ Created 20 offers

🎥 Seeding Videos...
✅ Created 15 videos

💼 Seeding Projects...
✅ Created 10 projects

============================================================
✨ DATABASE SEEDING COMPLETED SUCCESSFULLY ✨
============================================================

📊 SUMMARY:
────────────────────────────────────────────────────────────
📁 Categories:  8
🏪 Stores:      15
📦 Products:    30
🎁 Offers:      20
🎥 Videos:      15
💼 Projects:    10
────────────────────────────────────────────────────────────
📈 Total Records: 98
────────────────────────────────────────────────────────────

📋 DATA RELATIONSHIPS:
  • Products are linked to Stores and Categories
  • Offers are linked to Stores and Products
  • Videos are linked to Stores and Products
  • Projects are linked to Stores

🎯 NEXT STEPS:
  1. Start your backend server: npm run dev
  2. Test API endpoints
  3. Check frontend integration

📝 API ENDPOINTS TO TEST:
  • GET /api/categories
  • GET /api/stores
  • GET /api/products
  • GET /api/offers
  • GET /api/videos
  • GET /api/projects

📤 MongoDB Disconnected
```

## Data Relationships

### Category → Stores
- Each store is linked to one or more categories
- Categories track product and store counts

### Stores → Products
- Each product belongs to one store (merchant)
- Products reference their store via `merchantId`

### Stores/Products → Offers
- Offers are linked to specific stores
- Offers reference products for discounts

### Stores/Products → Videos
- Videos showcase products
- Videos are associated with stores
- Perfect for the Play Page content

### Stores → Projects
- Projects are sponsored by stores
- Projects may require specific products
- Perfect for the Earn Page tasks

## Features

### ✅ Realistic Data
- Authentic Indian business names and locations
- Real city coordinates (Mumbai, Delhi, Bangalore, etc.)
- Proper phone number formats
- Realistic pricing in INR
- Valid email addresses

### ✅ Complete Relationships
- All foreign keys properly set
- Cross-references maintained
- No orphaned records

### ✅ Varied Data
- Mix of prices (₹99 to ₹9999)
- Mix of ratings (3.5 to 5.0)
- Varied stock levels
- Different discount percentages
- Multiple categories and types

### ✅ Production Ready
- Error handling
- Clear console logs
- Progress tracking
- Summary statistics
- Proper connection management

## Customization

### Adjust Quantities

Edit the script to change the number of items:

```javascript
// In generateCategories()
// Add or remove categories from the array

// In generateStores()
// Add more store objects to the array

// In generateProducts()
// Change the loop limit from 30

// In generateOffers()
// Change the loop limit from 20

// In generateVideos()
// Change the loop limit from 15

// In generateProjects()
// Change the loop limit from 10
```

### Change Data Values

Modify the data generators:

```javascript
// Change price ranges
const basePrice = randomFloat(99, 9999);  // Edit min/max

// Change rating ranges
ratings: { average: randomFloat(3.5, 5.0, 1) }  // Edit min/max

// Change stock levels
stock: randomNumber(5, 500)  // Edit min/max

// Change cashback percentages
percentage: randomNumber(5, 25)  // Edit min/max
```

## Troubleshooting

### Connection Errors

**Problem:** Cannot connect to MongoDB

**Solution:**
```bash
# Check if MongoDB is running
# Update MONGODB_URI in .env file
MONGODB_URI=mongodb://localhost:27017/rez-app
```

### Duplicate Key Errors

**Problem:** Unique constraint violations

**Solution:**
```bash
# Clear the database first
# In MongoDB shell or using MongoDB Compass:
use rez-app
db.dropDatabase()

# Then run the seed script again
npm run seed:all
```

### Model Not Found Errors

**Problem:** Cannot find model 'Category' or similar

**Solution:**
```bash
# Make sure all model files exist in src/models/
# Check import paths in the script
# Rebuild TypeScript if needed
npm run build
```

### Out of Memory Errors

**Problem:** Heap out of memory

**Solution:**
```bash
# Reduce the number of records
# Or increase Node memory limit
node --max-old-space-size=4096 scripts/seed-all-quick.js
```

## Clear Database

To clear all data before re-seeding:

### Using MongoDB Shell
```bash
mongosh
use rez-app
db.dropDatabase()
```

### Using MongoDB Compass
1. Connect to your MongoDB instance
2. Select the `rez-app` database
3. Click "Drop Database"
4. Confirm

### Using Mongoose (in script)
```javascript
// Add this before seeding
await mongoose.connection.dropDatabase();
console.log('🗑️ Database cleared');
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/rez-app
DB_NAME=rez-app

# Optional
NODE_ENV=development
PORT=5000
```

## Integration with Frontend

After seeding, test these endpoints from your frontend:

### Homepage
```javascript
// Fetch categories
GET /api/categories

// Fetch featured stores
GET /api/stores?featured=true

// Fetch products
GET /api/products?limit=20

// Fetch offers
GET /api/offers
```

### Play Page
```javascript
// Fetch videos
GET /api/videos?category=trending_me

// Fetch featured videos
GET /api/videos?featured=true
```

### Earn Page
```javascript
// Fetch active projects
GET /api/projects?status=active

// Fetch featured projects
GET /api/projects?featured=true
```

### Store Page
```javascript
// Fetch store details
GET /api/stores/:id

// Fetch store products
GET /api/products?merchantId=:id
```

## Best Practices

1. **Always seed in development environment**
   - Never run in production
   - Use separate databases for dev/test/prod

2. **Clear before re-seeding**
   - Avoid duplicate data
   - Maintain data integrity

3. **Verify data after seeding**
   - Check relationships
   - Test API endpoints
   - Verify frontend display

4. **Customize for your needs**
   - Adjust quantities
   - Modify data ranges
   - Add custom fields

## Advanced Usage

### Seed Specific Collections Only

Create custom seed scripts:

```javascript
// seed-categories-only.js
const { seedDatabase } = require('./seed-all-quick');

// Modify to only seed categories
// ... custom implementation
```

### Add Custom Data

Extend the generators:

```javascript
// Add custom categories
const customCategories = [
  {
    name: 'My Custom Category',
    slug: 'custom',
    // ... other fields
  }
];

categories.push(...customCategories);
```

### Seed with Real Images

Replace placeholder URLs:

```javascript
// Use actual image URLs
image: 'https://your-cdn.com/images/category-1.jpg'

// Or upload to Cloudinary
const cloudinary = require('cloudinary').v2;
// ... upload logic
```

## Support

If you encounter any issues:

1. Check the console output for errors
2. Verify MongoDB connection
3. Ensure all models are properly defined
4. Check environment variables
5. Review the troubleshooting section

## Version History

- **v1.0.0** - Initial release with all major collections
  - Categories, Stores, Products, Offers, Videos, Projects
  - Complete relationships
  - Realistic Indian data
  - Production-ready structure

## License

This seed script is part of the Rez App backend project.
