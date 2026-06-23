/**
 * Seed Products for Cuisine Stores
 * 
 * Creates products for the newly seeded cuisine stores
 * so that search results appear for "biryani", "pizza", etc.
 * 
 * Run: node scripts/seedCuisineProducts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

// Sample products for cuisines
const CUISINE_PRODUCTS = {
    pizza: [
        { name: "Margherita Pizza", price: 299, description: "Classic cheese pizza with basil" },
        { name: "Farmhouse Pizza", price: 399, description: "Loaded with fresh vegetables" },
        { name: "Peppy Paneer Pizza", price: 449, description: "Spicy paneer with crisp capsicum" }
    ],
    biryani: [
        { name: "Chicken Dum Biryani", price: 349, description: "Authentic Hyderabadi chicken biryani" },
        { name: "Mutton Biryani", price: 499, description: "Tender mutton cooked with aromatic rice" },
        { name: "Veg Biryani", price: 249, description: "Fresh vegetables with saffron rice" }
    ],
    burgers: [
        { name: "Veggie Burger", price: 99, description: "Crispy veg patty with fresh lettuce" },
        { name: "Chicken Burger", price: 149, description: "Juicy chicken patty with spicy sauce" },
        { name: "Cheese Burger", price: 129, description: "Classic burger with melting cheese slice" }
    ],
    "south-indian": [
        { name: "Masala Dosa", price: 120, description: "Crispy crepe with potato filling" },
        { name: "Idli Sambar", price: 80, description: "Steamed rice cakes with lentil stew" }
    ],
    chinese: [
        { name: "Hakka Noodles", price: 180, description: "Wok-tossed noodles with crunchy vegetables" },
        { name: "Manchurian Dry", price: 200, description: "Crispy vegetable balls in spicy sauce" },
        { name: "Schezwan Fried Rice", price: 190, description: "Spicy fried rice with schezwan sauce" }
    ],
    desserts: [
        { name: "Chocolate Truffle Cake", price: 500, description: "Rich chocolate layer cake" },
        { name: "Belgian Chocolate Scoop", price: 120, description: "Premium dark chocolate ice cream" },
        { name: "Red Velvet Cupcake", price: 90, description: "Classic red velvet with cream cheese frosting" }
    ],
    healthy: [ /* matches 'healthy' tag for Healthy stores */
        { name: "Greek Salad", price: 250, description: "Fresh veggies with feta cheese and olives" },
        { name: "Quinoa Bowl", price: 300, description: "Protein-rich quinoa with roasted veggies" },
        { name: "Fresh Fruit Bowl", price: 150, description: "Seasonal cut fruits" }
    ],
    cafe: [
        { name: "Cappuccino", price: 180, description: "Espresso with steamed milk foam" },
        { name: "Cold Coffee", price: 200, description: "Classic cold coffee with ice cream" },
        { name: "Croissant", price: 120, description: "Buttery flaky pastry" }
    ],
    "street-food": [
        { name: "Pani Puri", price: 50, description: "Crispy puris with spicy mint water" },
        { name: "Pav Bhaji", price: 120, description: "Spicy vegetable mash with buttered buns" },
        { name: "Aloo Tikki Chaat", price: 80, description: "Potato patties topped with yogurt and chutneys" }
    ],
    "thali": [
        { name: "Special Veg Thali", price: 250, description: "Complete meal with paneer, dal, rice, roti, sweet" },
        { name: "Maharaja Thali", price: 350, description: "Royal feast with 3 sabzis, farsan, sweets" },
        { name: "Mini Thali", price: 150, description: "Budget meal with dal, rice, 1 sabzi" }
    ],
    "ice-cream": [
        { name: "Tender Coconut", price: 80, description: "Fresh natural tender coconut ice cream" },
        { name: "Sitaphal", price: 90, description: "Creamy custard apple ice cream" },
        { name: "Almond Carnival", price: 120, description: "Roasted almond ice cream" }
    ]
};

async function seedCuisineProducts() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║   🍛 SEEDING CUISINE PRODUCTS FOR SEARCH RESULTS          ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
        console.log('✅ Connected to MongoDB\n');

        require('ts-node/register');
        const projectRoot = path.resolve(__dirname, '..');
        const { Store } = require(path.join(projectRoot, 'src/models/Store'));
        const { Product } = require(path.join(projectRoot, 'src/models/Product'));
        const { Category } = require(path.join(projectRoot, 'src/models/Category'));

        // Find Food category for products
        const foodCategory = await Category.findOne({ slug: 'food-dining', isActive: true });

        // Loop through cuisine types
        let totalCreated = 0;

        for (const [cuisineTag, products] of Object.entries(CUISINE_PRODUCTS)) {
            console.log(`\n🔍 Processing ${cuisineTag.toUpperCase()}...`);

            // Find stores with this tag
            const stores = await Store.find({ tags: cuisineTag, isActive: true });
            console.log(`   Found ${stores.length} stores tagged '${cuisineTag}'`);

            if (stores.length === 0) continue;

            for (const store of stores) {
                console.log(`   🏬 Adding products to: ${store.name}`);

                for (const prodData of products) {
                    // Check if product exists in this store
                    const existing = await Product.findOne({
                        store: store._id,
                        name: prodData.name
                    });

                    if (existing) {
                        // console.log(`      ⏭️  ${prodData.name} already exists`);
                        continue;
                    }

                    const newProduct = new Product({
                        name: prodData.name,
                        slug: `${prodData.name.toLowerCase().replace(/ /g, '-')}-${store.slug}`.replace(/[^a-z0-9-]/g, ''),
                        description: prodData.description,
                        brand: store.name,
                        category: foodCategory ? foodCategory._id : store.category,
                        store: store._id,
                        pricing: {
                            original: Math.round(prodData.price * 1.2),
                            selling: prodData.price,
                            discount: 20,
                            currency: 'INR'
                        },
                        sku: `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        inventory: {
                            stock: 50,
                            isAvailable: true
                        },
                        images: [store.logo || store.image || "https://placeholder.com/food"],
                        tags: [...store.tags, "food", cuisineTag],
                        cashback: {
                            percentage: 5,
                            isActive: true
                        },
                        isActive: true,
                        isApproved: true
                    });

                    await newProduct.save();
                    // console.log(`      ✅ Added: ${prodData.name}`);
                    totalCreated++;
                }
            }
        }

        console.log(`\n╔════════════════════════════════════════════════════════════╗`);
        console.log(`║   ✅ CREATED ${totalCreated} NEW PRODUCTS!`);
        console.log(`╚════════════════════════════════════════════════════════════╝\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB\n');
    }
}

seedCuisineProducts();
