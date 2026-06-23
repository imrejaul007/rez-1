/**
 * Seed Cuisine Stores for Browse by Cuisine
 * 
 * Creates restaurant stores for each cuisine type with proper tags
 * Does NOT delete existing data
 * 
 * Run: node scripts/seedCuisineStores.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

// Cuisine store definitions
const CUISINE_STORES = {
    pizza: [
        { name: "Domino's Pizza", slug: "dominos-pizza", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Dominos_pizza_logo.svg/1200px-Dominos_pizza_logo.svg.png", tags: ["pizza", "fast-food", "delivery"], cashback: 15 },
        { name: "Pizza Hut", slug: "pizza-hut", logo: "https://upload.wikimedia.org/wikipedia/sco/thumb/d/d2/Pizza_Hut_logo.svg/1200px-Pizza_Hut_logo.svg.png", tags: ["pizza", "fast-food", "dine-in"], cashback: 12 },
        { name: "Oven Story", slug: "oven-story", logo: "https://cdn.dotpe.in/longtail/store-logo/3295660/nU6u0A4Z.jpeg", tags: ["pizza", "gourmet", "delivery"], cashback: 18 },
        { name: "La Pino'z Pizza", slug: "la-pinoz-pizza", logo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400", tags: ["pizza", "budget", "delivery"], cashback: 20 },
        { name: "Mojo Pizza", slug: "mojo-pizza", logo: "https://pbs.twimg.com/profile_images/1262737478568300546/3nWhOPQA_400x400.jpg", tags: ["pizza", "fresh", "delivery"], cashback: 15 },
    ],
    biryani: [
        { name: "Paradise Biryani", slug: "paradise-biryani", logo: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400", tags: ["biryani", "hyderabadi", "authentic"], cashback: 10 },
        { name: "Behrouz Biryani", slug: "behrouz-biryani", logo: "https://b.zmtcdn.com/data/brand_creatives/logos/6a11fd0f30c9fd9ceaff2f5b21f61d23_1617960869.png", tags: ["biryani", "premium", "delivery"], cashback: 12 },
        { name: "Biryani Blues", slug: "biryani-blues", logo: "https://www.franchiseindia.com/content/img/brand/images/98/5898/img_01/BIRYANI.png", tags: ["biryani", "lucknowi", "north-indian"], cashback: 15 },
        { name: "Donne Biryani House", slug: "donne-biryani", logo: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400", tags: ["biryani", "bangalore", "south-indian"], cashback: 18 },
        { name: "Potful Biryani", slug: "potful-biryani", logo: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400", tags: ["biryani", "homestyle", "budget"], cashback: 20 },
    ],
    burgers: [
        { name: "McDonald's", slug: "mcdonalds", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/1200px-McDonald%27s_Golden_Arches.svg.png", tags: ["burgers", "fast-food", "american"], cashback: 8 },
        { name: "Burger King", slug: "burger-king", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Burger_King_logo_%281999%29.svg/2024px-Burger_King_logo_%281999%29.svg.png", tags: ["burgers", "fast-food", "flame-grilled"], cashback: 10 },
        { name: "Wendy's", slug: "wendys", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/3/32/Wendy%27s_full_logo_2012.svg/1200px-Wendy%27s_full_logo_2012.svg.png", tags: ["burgers", "fresh", "american"], cashback: 12 },
        { name: "Carl's Jr", slug: "carls-jr", logo: "https://upload.wikimedia.org/wikipedia/commons/0/01/Carl%27s_Jr._logo.svg", tags: ["burgers", "premium", "american"], cashback: 15 },
        { name: "Shake Shack", slug: "shake-shack", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/Shake_Shack_logo.svg/1200px-Shake_Shack_logo.svg.png", tags: ["burgers", "gourmet", "milkshakes"], cashback: 10 },
    ],
    chinese: [
        { name: "Mainland China", slug: "mainland-china", logo: "https://b.zmtcdn.com/data/pictures/chains/9/18208869/7dc tried4a0f23ad8a0.jpg", tags: ["chinese", "fine-dining", "sichuan"], cashback: 12 },
        { name: "Chung Wah", slug: "chung-wah", logo: "https://images.unsplash.com/photo-1563245372-f21727e51395?w=400", tags: ["chinese", "authentic", "cantonese"], cashback: 10 },
        { name: "Asia Kitchen", slug: "asia-kitchen", logo: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400", tags: ["chinese", "pan-asian", "noodles"], cashback: 15 },
        { name: "Berco's", slug: "bercos", logo: "https://b.zmtcdn.com/data/pictures/chains/4/484/0336f5836e38e1d95722e8b0d5c9c14b.jpg", tags: ["chinese", "thai", "asian-fusion"], cashback: 18 },
    ],
    desserts: [
        { name: "Baskin Robbins", slug: "baskin-robbins", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Baskin-Robbins_logo.svg/1200px-Baskin-Robbins_logo.svg.png", tags: ["desserts", "ice-cream", "premium"], cashback: 10 },
        { name: "Theobroma", slug: "theobroma", logo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400", tags: ["desserts", "bakery", "cakes"], cashback: 8 },
        { name: "Mad Over Donuts", slug: "mad-over-donuts", logo: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400", tags: ["desserts", "donuts", "coffee"], cashback: 15 },
        { name: "Giani's Ice Cream", slug: "gianis-ice-cream", logo: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400", tags: ["desserts", "ice-cream", "indian"], cashback: 12 },
    ],
    healthy: [
        { name: "Salad Days", slug: "salad-days", logo: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400", tags: ["healthy", "salads", "diet"], cashback: 15 },
        { name: "Calorie Care", slug: "calorie-care", logo: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400", tags: ["healthy", "meal-plans", "diet"], cashback: 12 },
        { name: "Goodness Kitchen", slug: "goodness-kitchen", logo: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400", tags: ["healthy", "organic", "vegan"], cashback: 18 },
    ],
    "south-indian": [
        { name: "Saravana Bhavan", slug: "saravana-bhavan", logo: "https://images.unsplash.com/photo-1589301760576-41f4739112d1?w=400", tags: ["south-indian", "dosa", "vegetarian"], cashback: 10 },
        { name: "MTR", slug: "mtr-restaurant", logo: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6a0?w=400", tags: ["south-indian", "filter-coffee", "authentic"], cashback: 12 },
        { name: "A2B - Adyar Ananda Bhavan", slug: "a2b", logo: "https://images.unsplash.com/photo-1596450523828-56df82c1616c?w=400", tags: ["south-indian", "sweets", "vegetarian"], cashback: 15 },
        { name: "Dosa Plaza", slug: "dosa-plaza", logo: "https://images.unsplash.com/photo-1668236540372-9654e584bfb2?w=400", tags: ["south-indian", "dosa", "innovative"], cashback: 18 },
    ],
    "north-indian": [
        { name: "Haldiram's", slug: "haldirams", logo: "https://images.unsplash.com/photo-1606491956689-2ea28c674675?w=400", tags: ["north-indian", "sweets", "snacks"], cashback: 10 },
        { name: "Bikanervala", slug: "bikanervala", logo: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400", tags: ["north-indian", "thali", "vegetarian"], cashback: 12 },
        { name: "Punjabi Angithi", slug: "punjabi-angithi", logo: "https://images.unsplash.com/photo-1585937421612-70a008356f36?w=400", tags: ["north-indian", "punjabi", "butter-chicken"], cashback: 15 },
        { name: "Moti Mahal Delux", slug: "moti-mahal-delux", logo: "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400", tags: ["north-indian", "mughlai", "kebabs"], cashback: 8 },
    ],
    cafe: [
        { name: "Starbucks", slug: "starbucks", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/1200px-Starbucks_Corporation_Logo_2011.svg.png", tags: ["cafe", "coffee", "premium"], cashback: 8 },
        { name: "Cafe Coffee Day", slug: "cafe-coffee-day", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a4/Cafe_Coffee_Day_logo.svg/1200px-Cafe_Coffee_Day_logo.svg.png", tags: ["cafe", "coffee", "indian"], cashback: 12 },
        { name: "Third Wave Coffee", slug: "third-wave-coffee", logo: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400", tags: ["cafe", "specialty-coffee", "artisanal"], cashback: 15 },
        { name: "Blue Tokai", slug: "blue-tokai", logo: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400", tags: ["cafe", "roastery", "premium"], cashback: 10 },
    ],
    "street-food": [
        { name: "Chaat Junction", slug: "chaat-junction", logo: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400", tags: ["street-food", "chaat", "indian"], cashback: 20 },
        { name: "Golgappa House", slug: "golgappa-house", logo: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400", tags: ["street-food", "pani-puri", "snacks"], cashback: 25 },
        { name: "Pav Bhaji Express", slug: "pav-bhaji-express", logo: "https://images.unsplash.com/photo-1606491956689-2ea28c674675?w=400", tags: ["street-food", "pav-bhaji", "mumbai"], cashback: 18 },
    ],
    "thali": [
        { name: "Rajdhani Thali", slug: "rajdhani-thali", logo: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400", tags: ["thali", "gujarati", "rajasthani"], cashback: 15 },
        { name: "Maharaja Bhog", slug: "maharaja-bhog", logo: "https://images.unsplash.com/photo-1626777552726-4a6531934686?w=400", tags: ["thali", "premium", "indian"], cashback: 12 },
        { name: "Haldiram's Thali", slug: "haldirams-thali", logo: "https://images.unsplash.com/photo-1577234812328-3e4b78641bf0?w=400", tags: ["thali", "north-indian", "veg"], cashback: 10 },
    ],
    "ice-cream": [
        { name: "Naturals Ice Cream", slug: "naturals-ice-cream", logo: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400", tags: ["ice-cream", "desserts", "natural"], cashback: 10 },
        { name: "Giani's", slug: "gianis", logo: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400", tags: ["ice-cream", "falooda", "desserts"], cashback: 12 },
        { name: "Corner House", slug: "corner-house", logo: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400", tags: ["ice-cream", "sundaes", "bangalore"], cashback: 15 },
    ],
};

async function seedCuisineStores() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║   🍕 SEEDING CUISINE STORES FOR BROWSE BY CUISINE         ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
        console.log('✅ Connected to MongoDB\n');

        require('ts-node/register');
        const projectRoot = path.resolve(__dirname, '..');
        const { Category } = require(path.join(projectRoot, 'src/models/Category'));
        const { Store } = require(path.join(projectRoot, 'src/models/Store'));

        // Find Food & Dining category
        const foodCategory = await Category.findOne({ slug: 'food-dining', isActive: true });
        if (!foodCategory) {
            console.log('❌ Food & Dining category not found!');
            process.exit(1);
        }
        console.log(`✅ Found Food & Dining category: ${foodCategory._id}\n`);

        // Create stores for each cuisine
        let totalCreated = 0;
        let totalUpdated = 0;

        for (const [cuisineType, stores] of Object.entries(CUISINE_STORES)) {
            console.log(`\n🍽️  Creating/Updating ${cuisineType.toUpperCase()} stores...`);

            for (const storeData of stores) {
                // Check if store already exists
                const existing = await Store.findOne({ slug: storeData.slug });
                if (existing) {
                    // Update logo if broken URL detected or just always update to ensure freshness
                    await Store.updateOne({ _id: existing._id }, { $set: { logo: storeData.logo } });
                    console.log(`   🔄 Updated logo for: ${storeData.name}`);
                    totalUpdated++;
                    continue;
                }

                const newStore = new Store({
                    name: storeData.name,
                    slug: storeData.slug,
                    description: `Best ${cuisineType} in town! Order from ${storeData.name} and get great cashback.`,
                    logo: storeData.logo,
                    category: foodCategory._id,
                    tags: storeData.tags,
                    location: {
                        address: 'Multiple Locations Available',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                    },
                    contact: {
                        phone: '+91 9999999999',
                    },
                    ratings: {
                        average: 4.0 + Math.random() * 1,
                        count: Math.floor(100 + Math.random() * 500),
                        distribution: { 5: 50, 4: 30, 3: 15, 2: 3, 1: 2 },
                    },
                    offers: {
                        cashback: storeData.cashback,
                        isPartner: true,
                        partnerLevel: 'silver',
                    },
                    operationalInfo: {
                        hours: {
                            monday: { open: '10:00', close: '23:00' },
                            tuesday: { open: '10:00', close: '23:00' },
                            wednesday: { open: '10:00', close: '23:00' },
                            thursday: { open: '10:00', close: '23:00' },
                            friday: { open: '10:00', close: '23:00' },
                            saturday: { open: '10:00', close: '23:00' },
                            sunday: { open: '10:00', close: '23:00' },
                        },
                        deliveryTime: '30-45 mins',
                        minimumOrder: 199,
                        deliveryFee: 30,
                        freeDeliveryAbove: 500,
                        acceptsWalletPayment: true,
                        paymentMethods: ['upi', 'card', 'wallet', 'cash'],
                    },
                    isActive: true,
                    isFeatured: Math.random() > 0.7,
                    isVerified: true,
                });

                await newStore.save();
                console.log(`   ✅ Created: ${storeData.name}`);
                totalCreated++;
            }
        }

        console.log(`\n╔════════════════════════════════════════════════════════════╗`);
        console.log(`║   ✅ CREATED ${totalCreated} NEW STORES | UPDATED ${totalUpdated} STORES  ║`);
        console.log(`╚════════════════════════════════════════════════════════════╝\n`);

        // Show summary
        console.log('📊 STORE COUNTS BY CUISINE TAG:');
        console.log('─'.repeat(40));

        for (const cuisineType of Object.keys(CUISINE_STORES)) {
            const count = await Store.countDocuments({
                tags: { $in: [cuisineType] },
                isActive: true,
            });
            console.log(`   ${cuisineType}: ${count} stores`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB\n');
    }
}

seedCuisineStores();
