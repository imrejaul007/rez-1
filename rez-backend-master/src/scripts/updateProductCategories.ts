/**
 * Update Product Categories Script
 * Ensures each product has correct category, subCategory, and valid subSubCategory
 * Based on the parent store's category references
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Valid subSubCategory values for each subcategory (from sub-sub-category.md)
const VALID_SUBSUBCATEGORIES: Record<string, string[]> = {
  // Food & Dining
  'cafes': ['Espresso-based drinks', 'Tea (Chai/Herbal)', 'Breakfast Items', 'Sandwiches', 'All-day brunch'],
  'qsr-fast-food': ['Burgers', 'Pizzas', 'Tacos/Burritos', 'Wraps/Rolls', 'Fried Chicken', 'Momos'],
  'family-restaurants': ['North Indian', 'South Indian', 'Chinese/Asian', 'Multicuisine'],
  'fine-dining': ['Continental', 'Modern Indian', 'Italian (Gourmet)', 'Japanese', 'Mediterranean'],
  'ice-cream-dessert': ['Gelato', 'Sorbet', 'Sundaes', 'Shakes', 'Frozen Yogurt', 'Indian Desserts (Kulfi)'],
  'bakery-confectionery': ['Cakes & Pastries', 'Bread', 'Cookies & Brownies', 'Donuts', 'Indian Sweets (Mithai)'],
  'cloud-kitchens': ['Biryani', 'Health & Salad Bowls', 'Meal Boxes', 'Desserts only'],
  'street-food': ['Chaat', 'Vada Pav', 'Pav Bhaji', 'Local Snacks'],

  // Grocery & Essentials
  'supermarkets': ['Fresh Produce', 'Dairy & Eggs', 'Packaged Foods', 'Household Goods', 'Personal Care'],
  'kirana-stores': ['Pulses & Grains', 'Spices & Masalas', 'Oils & Ghee', 'Stationery', 'Basic Toiletries'],
  'fresh-vegetables': ['Seasonal Produce', 'Exotic Vegetables', 'Organic Vegetables'],
  'meat-fish': ['Poultry', 'Mutton/Lamb', 'Seafood', 'Processed Meats'],
  'dairy': ['Milk', 'Yogurt/Curd', 'Cheese', 'Butter & Cream', 'Paneer'],
  'packaged-goods': ['Ready-to-Eat Meals', 'Cereals & Breakfast', 'Juices & Drinks', 'Snacks & Chips'],
  'water-cans': ['20L Can', 'Small Bottles'],

  // Beauty & Wellness
  'salons': ['Haircuts & Styling', 'Hair Colouring', 'Keratin/Smoothening', 'Facials'],
  'spa-massage': ['Swedish Massage', 'Deep Tissue', 'Aromatherapy', 'Ayurvedic Treatments', 'Reflexology'],
  'beauty-services': ['Waxing & Threading', 'Manicure & Pedicure', 'Bridal Makeup', 'Eyelash Extensions'],
  'cosmetology': ['Skin Treatments', 'Anti-Aging', 'Acne Treatment', 'Laser Therapy'],
  'dermatology': ['Skin Consultation', 'Acne Treatment', 'Skin Rejuvenation', 'Hair Loss Treatment'],
  'skincare-cosmetics': ['Moisturizers', 'Sunscreen', 'Makeup', 'Organic Products'],
  'nail-studios': ['Manicure', 'Pedicure', 'Nail Art', 'Gel Nails'],
  'grooming-men': ['Beard Trimming', 'Shaving Services', 'Men\'s Facials'],

  // Healthcare
  'pharmacy': ['Prescription Medicine', 'OTC Drugs', 'First Aid Supplies', 'Vitamins & Supplements', 'Baby Care'],
  'clinics': ['General Physician', 'Pediatrician', 'Orthopedics', 'Gastroenterology'],
  'diagnostics': ['Blood Tests', 'MRI/CT Scans', 'X-rays', 'ECG', 'Health Checkup'],
  'dental': ['General Checkups', 'Root Canal', 'Braces/Aligners', 'Teeth Whitening'],
  'physiotherapy': ['Sports Injury', 'Post-Surgery Rehab', 'Chronic Pain', 'Mobility Training'],
  'home-nursing': ['Elder Care', 'Post-Surgery Care', 'Wound Care', 'Medical Assistance'],
  'vision-eyewear': ['Eyeglasses', 'Sunglasses', 'Contact Lenses', 'Eye Checkups'],

  // Fashion
  'footwear': ['Men\'s Casual', 'Women\'s Ethnic', 'Formal Shoes', 'Sports Shoes', 'Kids Footwear'],
  'bags-accessories': ['Handbags', 'Backpacks', 'Wallets', 'Belts', 'Scarves'],
  'electronics': ['Smartphones', 'Laptops & PCs', 'Home Appliances', 'Cameras', 'Audio Equipment'],
  'mobile-accessories': ['Covers & Cases', 'Screen Guards', 'Power Banks', 'Chargers'],
  'watches': ['Analog Watches', 'Digital Watches', 'Smart Watches', 'Luxury Watches'],
  'jewelry': ['Gold', 'Diamond', 'Silver', 'Fashion Jewelry'],
  'local-brands': ['Men\'s Wear', 'Women\'s Wear', 'Kids Wear', 'Ethnic Wear'],

  // Fitness & Sports
  'gyms': ['Weight Training', 'Cardio', 'Group Classes', 'Personal Training'],
  'crossfit': ['HIIT', 'Strength Training', 'Endurance', 'Functional Fitness'],
  'yoga': ['Hatha Yoga', 'Vinyasa Yoga', 'Power Yoga', 'Meditation Classes'],
  'zumba': ['Zumba Fitness', 'Zumba Toning', 'Aqua Zumba', 'Kids Zumba'],
  'martial-arts': ['Karate', 'Taekwondo', 'MMA', 'Boxing'],
  'sports-academies': ['Cricket Coaching', 'Football Training', 'Swimming Lessons', 'Badminton Coaching'],
  'sportswear': ['Athletic Shoes', 'Activewear', 'Fitness Accessories'],

  // Education & Learning
  'coaching-centers': ['JEE/NEET', 'CAT/GMAT/GRE', 'School Tuitions'],
  'skill-development': ['Leadership Training', 'Soft Skills', 'Public Speaking', 'Interview Preparation'],
  'music-dance-classes': ['Classical Music', 'Western Music', 'Classical Dance', 'Contemporary Dance'],
  'art-craft': ['Painting', 'Sketching', 'Pottery', 'DIY Crafts'],
  'vocational': ['Computer Courses', 'Technical Training', 'Certification Programs'],
  'language-training': ['Spoken English', 'Foreign Languages', 'Vernacular Languages'],

  // Home Services
  'ac-repair': ['Split AC Repair', 'Window AC Repair', 'AC Servicing'],
  'plumbing': ['Leak Repair', 'Drainage', 'Water Heater Installation'],
  'electrical': ['Wiring', 'Switchboard Repair', 'Fan/Light Installation'],
  'cleaning': ['Deep Cleaning', 'Sofa & Carpet Cleaning', 'Kitchen Cleaning'],
  'pest-control': ['Cockroach Control', 'Termite Control', 'Mosquito Control', 'Rodent Control'],
  'house-shifting': ['Packing', 'Loading', 'Transportation', 'Unpacking'],
  'laundry-dry-cleaning': ['Wash & Fold', 'Dry Cleaning', 'Ironing', 'Premium Laundry'],
  'home-tutors': ['Math', 'Science', 'Language', 'Exam Preparation'],

  // Travel & Experiences
  'hotels': ['Budget Stays', 'Serviced Apartments', '5-Star Luxury'],
  'intercity-travel': ['Bus', 'Train', 'Flight Booking'],
  'taxis': ['Local Trips', 'Airport Transfers', 'Outstation Cabs'],
  'bike-rentals': ['Scooters', 'Motorbikes', 'Gear Rental'],
  'weekend-getaways': ['Hill Stations', 'Beach Resorts', 'Heritage Sites'],
  'tours': ['City Tours', 'Adventure Tours', 'Cultural Tours'],
  'activities': ['Cooking Classes', 'Pottery Workshops', 'City Walking Tours'],

  // Entertainment
  'movies': ['Hollywood', 'Bollywood', 'Regional Cinema', 'IMAX/4DX'],
  'live-events': ['Concerts', 'Stand-up Comedy', 'Theatre'],
  'festivals': ['Music Festivals', 'Food Festivals', 'Cultural Events'],
  'workshops': ['Art Workshops', 'Photography', 'Writing'],
  'amusement-parks': ['Rides', 'Water Parks', 'Theme Parks'],
  'gaming-cafes': ['PC Gaming', 'Console Gaming', 'E-Sports'],
  'vr-ar-experiences': ['Arcade Games', 'Escape Rooms', 'Interactive Exhibits'],

  // Financial Lifestyle
  'bill-payments': ['Electricity Bills', 'Water Bills', 'Gas Bills'],
  'mobile-recharge': ['Prepaid Recharge', 'Postpaid Bill', 'DTH Recharge'],
  'broadband': ['ISP Plans', 'Streaming Services'],
  'cable-ott': ['Cable TV', 'OTT Subscriptions'],
  'insurance': ['Health Insurance', 'Life Insurance', 'Vehicle Insurance'],
  'gold-savings': ['Physical Gold', 'Digital Gold', 'Gold Loan'],
  'donations': ['Charity', 'Temple Donations', 'NGO Support'],
};

async function updateProductCategories() {
  try {
    console.log('🚀 Starting Product Category Update...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const categoriesCollection = db.collection('categories');
    const storesCollection = db.collection('stores');
    const productsCollection = db.collection('products');

    // Step 1: Build category slug → ObjectId mapping
    console.log('📦 Building Category Mapping...\n');
    const categoryMapping: Record<string, mongoose.Types.ObjectId> = {};
    const categoryIdToSlug: Record<string, string> = {};

    const allCategories = await categoriesCollection.find({}).toArray();
    for (const cat of allCategories) {
      categoryMapping[cat.slug] = cat._id as mongoose.Types.ObjectId;
      categoryIdToSlug[cat._id.toString()] = cat.slug;
    }

    console.log(`   Found ${allCategories.length} categories in database\n`);

    // Step 2: Build store mapping
    console.log('📦 Building Store Mapping...\n');
    const storeMapping: Record<string, { category: mongoose.Types.ObjectId; subcategory: mongoose.Types.ObjectId; subcategorySlug: string }> = {};

    const allStores = await storesCollection.find({}).toArray();
    for (const store of allStores) {
      storeMapping[store._id.toString()] = {
        category: store.category as mongoose.Types.ObjectId,
        subcategory: store.subcategory as mongoose.Types.ObjectId,
        subcategorySlug: store.subcategorySlug,
      };
    }

    console.log(`   Found ${allStores.length} stores in database\n`);

    // Step 3: Get all products
    const products = await productsCollection.find({}).toArray();
    console.log(`📦 Processing ${products.length} products...\n`);

    let updatedCount = 0;
    let errorCount = 0;
    let validatedCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      const storeId = product.store?.toString();

      if (!storeId) {
        console.log(`   ⚠️ ${product.name}: No store assigned`);
        errors.push(`${product.name}: No store assigned`);
        errorCount++;
        continue;
      }

      const storeData = storeMapping[storeId];
      if (!storeData) {
        console.log(`   ⚠️ ${product.name}: Store not found`);
        errors.push(`${product.name}: Store not found`);
        errorCount++;
        continue;
      }

      // Validate subSubCategory
      const validSubSubCategories = VALID_SUBSUBCATEGORIES[storeData.subcategorySlug] || [];
      const currentSubSubCategory = product.subSubCategory;
      let subSubCategoryValid = false;

      if (currentSubSubCategory) {
        // Check if current subSubCategory is valid (case-insensitive partial match)
        subSubCategoryValid = validSubSubCategories.some(valid =>
          valid.toLowerCase().includes(currentSubSubCategory.toLowerCase()) ||
          currentSubSubCategory.toLowerCase().includes(valid.toLowerCase())
        );
      }

      if (subSubCategoryValid) {
        validatedCount++;
      }

      // Update product with correct category and subCategory
      await productsCollection.updateOne(
        { _id: product._id },
        {
          $set: {
            category: storeData.category,
            subCategory: storeData.subcategory,
            updatedAt: new Date(),
          },
        }
      );

      updatedCount++;
    }

    console.log('\n========================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('========================================');
    console.log(`Total Products: ${products.length}`);
    console.log(`Successfully Updated: ${updatedCount}`);
    console.log(`SubSubCategory Validated: ${validatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('========================================\n');

    if (errors.length > 0) {
      console.log('❌ ERRORS (first 10):');
      errors.slice(0, 10).forEach((e) => console.log(`   - ${e}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more`);
      }
      console.log('');
    }

    // Verification: Check a few products
    console.log('📊 VERIFICATION (Sample Products):');
    const sampleProducts = await productsCollection
      .find({})
      .limit(5)
      .toArray();

    for (const product of sampleProducts) {
      const mainCat = await categoriesCollection.findOne({ _id: product.category });
      const subCat = await categoriesCollection.findOne({ _id: product.subCategory });
      const store = await storesCollection.findOne({ _id: product.store });
      console.log(`   ${product.name}:`);
      console.log(`      store: ${store?.name || 'NOT FOUND'}`);
      console.log(`      category: ${mainCat?.name || 'NOT FOUND'} (${mainCat?.slug || 'N/A'})`);
      console.log(`      subCategory: ${subCat?.name || 'NOT FOUND'} (${subCat?.slug || 'N/A'})`);
      console.log(`      subSubCategory: ${product.subSubCategory || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateProductCategories()
  .then(() => {
    console.log('✅ Product category update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
