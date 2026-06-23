const { MongoClient, ObjectId } = require('mongodb');

// URI from seedCategoryPageDataJS.js
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test'; // Assuming this is the DB name from the working script

const PARENT_SLUG = 'food-dining';

const MISSING_CUISINES = [
    { name: 'Thali', id: 'thali', icon: '🍱', color: '#F59E0B' },
    { name: 'Ice Cream', id: 'ice-cream', icon: '🍦', color: '#EC4899' },
    { name: 'Street Food', id: 'street-food', icon: '🌮', color: '#F59E0B' },
    { name: 'South Indian', id: 'south-indian', icon: '🥘', color: '#F59E0B' },
    { name: 'North Indian', id: 'north-indian', icon: '🍛', color: '#F59E0B' },
    { name: 'Cafe', id: 'cafe', icon: '☕', color: '#78350F' },
    // Ensure existing ones are also here to be safe, though likely already exist
    { name: 'Pizza', id: 'pizza', icon: '🍕', color: '#EF4444' },
    { name: 'Biryani', id: 'biryani', icon: '🍗', color: '#D946EF' },
    { name: 'Burgers', id: 'burgers', icon: '🍔', color: '#F97316' },
    { name: 'Chinese', id: 'chinese', icon: '🥡', color: '#3B82F6' },
    { name: 'Desserts', id: 'desserts', icon: '🍰', color: '#10B981' },
    { name: 'Healthy', id: 'healthy', icon: '🥗', color: '#22C55E' }
];

async function addCuisineCategories() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db(DB_NAME);
        const categoriesCollection = db.collection('categories');

        // 1. Find Food & Dining Category
        const parentCategory = await categoriesCollection.findOne({ slug: PARENT_SLUG });

        if (!parentCategory) {
            console.error(`❌ Parent category '${PARENT_SLUG}' not found!`);
            return;
        }
        console.log(`found Parent: ${parentCategory.name} (${parentCategory._id})`);

        const childIds = [];

        // 2. Process each cuisine
        for (const cuisine of MISSING_CUISINES) {
            let cuisineCat = await categoriesCollection.findOne({
                slug: cuisine.id,
                $or: [
                    { parentCategory: parentCategory._id },
                    { type: 'food' } // Just in case
                ]
            });

            if (!cuisineCat) {
                // Create new category
                console.log(`➕ Creating new category: ${cuisine.name}`);
                const newCat = {
                    name: cuisine.name,
                    slug: cuisine.id,
                    description: `Best ${cuisine.name} places near you`,
                    type: 'general', // or 'food'
                    icon: cuisine.icon,
                    parentCategory: parentCategory._id,
                    isActive: true,
                    childCategories: [],
                    metadata: {
                        color: cuisine.color,
                        description: `Order ${cuisine.name} online`
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await categoriesCollection.insertOne(newCat);
                cuisineCat = await categoriesCollection.findOne({ _id: result.insertedId });
            } else {
                console.log(`ℹ️ Category exists: ${cuisine.name}`);
                // Ensure parent is set
                if (!cuisineCat.parentCategory || cuisineCat.parentCategory.toString() !== parentCategory._id.toString()) {
                    await categoriesCollection.updateOne(
                        { _id: cuisineCat._id },
                        { $set: { parentCategory: parentCategory._id } }
                    );
                    console.log(`   -> Linked to parent`);
                }
            }

            if (cuisineCat) {
                childIds.push(cuisineCat._id);
            }
        }

        // 3. Update Parent Category childCategories
        // Merge with existing children to avoid removing other potential children
        // Actually, we want to ENFORCE this list for the grid, so maybe just set it?
        // Let's merge unique IDs.

        const existingChildIds = parentCategory.childCategories || [];
        const allChildIds = [...existingChildIds];

        for (const id of childIds) {
            if (!allChildIds.some(existingId => existingId.toString() === id.toString())) {
                allChildIds.push(id);
            }
        }

        await categoriesCollection.updateOne(
            { _id: parentCategory._id },
            { $set: { childCategories: allChildIds } }
        );

        console.log(`✅ Updated '${parentCategory.name}' with ${allChildIds.length} child categories.`);

        // 4. Verify
        const updatedParent = await categoriesCollection.findOne({ _id: parentCategory._id });
        console.log('Current Child Categories:', updatedParent.childCategories.length);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.close();
        console.log('👋 Disconnected');
    }
}

addCuisineCategories();
