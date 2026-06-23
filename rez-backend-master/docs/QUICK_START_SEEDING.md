# Quick Start - Database Seeding

## TL;DR - Just Run This

```bash
cd user-backend
npm run seed:all
```

That's it! Your database will be populated with 98 records across 6 collections.

---

## What You Get

| Collection | Count | Description |
|------------|-------|-------------|
| **Categories** | 8 | Electronics, Fashion, Food, Beauty, Home, Sports, Books, Services |
| **Stores** | 15 | Verified merchants across major Indian cities |
| **Products** | 30 | Complete product catalog with prices, images, ratings |
| **Offers** | 20 | Active cashback and discount offers |
| **Videos** | 15 | Content for Play page (reviews, tutorials, UGC) |
| **Projects** | 10 | Earning opportunities for users |
| **TOTAL** | **98** | **Fully linked and production-ready** |

---

## Prerequisites

✅ MongoDB running locally or remote
✅ `.env` file configured with `MONGODB_URI`
✅ Node.js installed

---

## Run Commands

### Quick Seed (Recommended)
```bash
npm run seed:all
# or
npm run seed:quick
```

### Manual Run
```bash
node scripts/seed-all-quick.js
```

---

## Expected Time

⏱️ **30-60 seconds** depending on your system

---

## Sample Output

```
✅ MongoDB Connected Successfully
📦 Database: rez-app

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
```

---

## Test Your Data

### Using MongoDB Compass
1. Open MongoDB Compass
2. Connect to your database
3. Browse collections: `categories`, `merchants`, `mproducts`, `offers`, `videos`, `projects`

### Using API Endpoints
```bash
# Test categories
curl http://localhost:5000/api/categories

# Test stores
curl http://localhost:5000/api/stores

# Test products
curl http://localhost:5000/api/products

# Test offers
curl http://localhost:5000/api/offers

# Test videos
curl http://localhost:5000/api/videos

# Test projects
curl http://localhost:5000/api/projects
```

---

## Common Issues & Fixes

### ❌ "Cannot connect to MongoDB"
**Fix:** Make sure MongoDB is running
```bash
# Start MongoDB (if local)
mongod

# Or check your .env file
MONGODB_URI=mongodb://localhost:27017/rez-app
```

### ❌ "Duplicate key error"
**Fix:** Clear database first
```bash
# In MongoDB shell
mongosh
use rez-app
db.dropDatabase()

# Then run seed again
npm run seed:all
```

### ❌ "Model not found"
**Fix:** Make sure all model files exist in `src/models/`

---

## Clear Database

**Before re-seeding, clear your database:**

```bash
# Method 1: MongoDB Shell
mongosh
use rez-app
db.dropDatabase()

# Method 2: MongoDB Compass
# Select database → Drop Database
```

---

## Data Highlights

### 🏪 Real Indian Businesses
- TechHub Electronics (Bangalore)
- Fashion Forward (Mumbai)
- Gourmet Kitchen (Delhi)
- Beauty Bliss Spa (Hyderabad)
- And 11 more...

### 📦 Product Variety
- Electronics: iPhones, MacBooks, Headphones
- Fashion: Kurtas, Shoes, Jackets
- Food: Burgers, Pizza, Sushi
- Beauty: Skincare, Makeup
- Home: Furniture, Appliances
- Sports: Gym equipment
- Books: Various categories
- Services: Repairs, Maintenance

### 💰 Realistic Pricing
- Products: ₹99 to ₹9999
- Cashback: 5% to 25%
- Offers: Up to 70% off

### ⭐ Ratings
- Stores: 4.3 to 4.9 stars
- Products: 3.5 to 5.0 stars
- Complete review counts

---

## Next Steps

1. ✅ **Seed the database** - `npm run seed:all`
2. 🚀 **Start backend** - `npm run dev`
3. 🧪 **Test endpoints** - Use Postman or curl
4. 💻 **Connect frontend** - Test integration
5. 🎉 **Start developing!**

---

## Pro Tips

💡 **Customize the data**: Edit `scripts/seed-all-quick.js` to adjust quantities or values

💡 **Production use**: Never run seed scripts in production

💡 **Fresh start**: Always clear database before re-seeding

💡 **Verify relationships**: Check that products link to stores, offers link to products, etc.

---

## Need Help?

📖 **Full documentation**: See `SEED_SCRIPT_GUIDE.md`

🐛 **Issues**: Check the troubleshooting section in the guide

💬 **Questions**: Review the FAQ section

---

## File Locations

```
user-backend/
├── scripts/
│   └── seed-all-quick.js         ← Main seed script
├── SEED_SCRIPT_GUIDE.md           ← Full documentation
├── QUICK_START_SEEDING.md         ← This file
└── package.json                   ← npm scripts
```

---

**Happy Coding! 🚀**
