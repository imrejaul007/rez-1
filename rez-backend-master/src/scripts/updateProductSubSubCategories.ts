/**
 * Script to update all products with sub-sub-category field
 * Based on the ReZ Product & Cuisine Level Segmentation document
 *
 * Run: npx ts-node src/scripts/updateProductSubSubCategories.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Sub-sub-category mapping based on the document
// Maps subcategory slug -> array of sub-sub-categories
const SUB_SUB_CATEGORIES: Record<string, string[]> = {
  // FOOD & DINING
  'cafes': ['Espresso-based drinks', 'Tea (Chai/Herbal)', 'Breakfast Items', 'Sandwiches', 'All-day brunch'],
  'qsr-fast-food': ['Burgers', 'Pizzas', 'Tacos/Burritos', 'Wraps/Rolls', 'Fried Chicken', 'Momos'],
  'family-restaurants': ['North Indian', 'South Indian', 'Chinese/Asian', 'Multicuisine'],
  'fine-dining': ['Continental', 'Modern Indian', 'Italian (Gourmet)', 'Japanese (Sushi/Teppanyaki)', 'Mediterranean'],
  'ice-cream-dessert': ['Gelato', 'Sorbet', 'Sundaes', 'Shakes', 'Frozen Yogurt', 'Indian Desserts (Kulfi)'],
  'bakery-confectionery': ['Cakes & Pastries', 'Bread (Sourdough/Rye)', 'Cookies & Brownies', 'Donuts', 'Indian Sweets (Mithai)'],
  'cloud-kitchens': ['Biryani', 'Health & Salad Bowls', 'Meal Boxes', 'Desserts only'],
  'street-food': ['Chaat (Pani Puri/Bhel)', 'Vada Pav', 'Pav Bhaji', 'Local Snacks (Bajji/Bonda)'],

  // GROCERY & ESSENTIALS
  'supermarkets': ['Fresh Produce', 'Dairy & Eggs', 'Packaged Foods', 'Household Goods', 'Personal Care'],
  'kirana-stores': ['Pulses & Grains', 'Spices & Masalas', 'Oils & Ghee', 'Stationery', 'Basic Toiletries'],
  'fresh-vegetables': ['Seasonal Produce', 'Exotic Vegetables', 'Organic Vegetables'],
  'meat-fish': ['Poultry', 'Mutton/Lamb', 'Seafood', 'Processed Meats'],
  'dairy': ['Milk', 'Yogurt/Curd', 'Cheese', 'Butter & Cream', 'Paneer'],
  'packaged-goods': ['Ready-to-Eat Meals', 'Cereals & Breakfast', 'Juices & Drinks', 'Snacks & Chips'],
  'water-cans': ['20L Can', 'Small Bottles (1L/500ml)'],

  // BEAUTY, WELLNESS & PERSONAL CARE
  'salons': ['Haircuts & Styling', 'Hair Colouring', 'Keratin/Smoothening', 'Facials'],
  'spa-massage': ['Swedish Massage', 'Deep Tissue', 'Aromatherapy', 'Ayurvedic Treatments', 'Reflexology'],
  'beauty-services': ['Waxing & Threading', 'Manicure & Pedicure', 'Bridal Makeup', 'Eyelash Extensions'],
  'skincare-cosmetics': ['Moisturizers & Lotions', 'Sunscreen', 'Makeup', 'Organic/Ayurvedic Products'],
  'grooming-men': ['Beard Trimming/Styling', 'Shaving Services', "Men's Facials"],
  'nail-studios': ['Manicure', 'Pedicure', 'Nail Art', 'Gel Nails'],
  'cosmetology': ['Skin Treatment', 'Laser Treatment', 'Anti-aging'],
  'dermatology': ['Skin Consultation', 'Acne Treatment', 'Pigmentation Treatment'],

  // HEALTHCARE
  'pharmacy': ['Prescription Medicine', 'Over-the-Counter (OTC)', 'First Aid', 'Vitamins & Supplements', 'Baby Care'],
  'clinics': ['General Physician', 'Pediatrician', 'Orthopedics', 'Gastroenterology'],
  'diagnostics': ['Blood Tests', 'MRI/CT Scans', 'X-rays', 'ECG', 'Health Checkup Packages'],
  'dental': ['General Checkups', 'Root Canal (RCT)', 'Braces/Aligners', 'Teeth Whitening'],
  'vision-eyewear': ['Prescription Eyeglasses', 'Sunglasses', 'Contact Lenses', 'Eye Checkups'],
  'physiotherapy': ['Sports Injury', 'Back Pain', 'Joint Pain', 'Post Surgery Rehab'],
  'home-nursing': ['Elder Care', 'Post Surgery Care', 'Wound Dressing', 'Injection Services'],

  // SHOPPING / FASHION
  'footwear': ['Men\'s Casual', 'Women\'s Ethnic', 'Sports Shoes', 'Formal Shoes', 'Kids Footwear'],
  'bags-accessories': ['Handbags', 'Backpacks', 'Wallets', 'Belts', 'Scarves'],
  'local-brands': ['Men\'s Casual Wear', 'Women\'s Ethnic Wear', 'Formal Attire', 'Kidswear'],
  'jewelry': ['Gold', 'Diamond', 'Silver', 'Imitation/Fashion Jewelry'],
  'watches': ['Analog Watches', 'Digital Watches', 'Smart Watches', 'Luxury Watches'],
  'electronics': ['Smartphones', 'Laptops & PCs', 'Home Appliances', 'Cameras', 'Audio Equipment'],
  'mobile-accessories': ['Mobile Covers', 'Screen Guards', 'Power Banks', 'Chargers'],

  // FITNESS & SPORTS
  'gyms': ['Weight Training', 'Cardio', 'Group Classes (Zumba/Aerobics)', 'Personal Training'],
  'crossfit': ['Weight Training', 'Cardio', 'Group Classes', 'Personal Training'],
  'yoga': ['Hatha Yoga', 'Vinyasa Yoga', 'Power Yoga', 'Meditation Classes'],
  'zumba': ['Group Classes', 'Cardio Dance', 'Aerobics'],
  'martial-arts': ['Karate', 'Taekwondo', 'Boxing', 'Mixed Martial Arts'],
  'sports-academies': ['Cricket Coaching', 'Football Training', 'Swimming Lessons', 'Badminton Coaching'],
  'sportswear': ['Athletic Shoes', 'Activewear', 'Fitness Accessories'],

  // EDUCATION & LEARNING
  'coaching-centers': ['JEE/NEET', 'CAT/GMAT/GRE', 'School Tuitions (CBSE/ICSE)'],
  'skill-development': ['Leadership Training', 'Soft Skills', 'Public Speaking', 'Interview Preparation'],
  'music-dance-classes': ['Vocal Music', 'Instrumental', 'Classical Dance', 'Western Dance'],
  'art-craft': ['Painting', 'Sketching', 'Pottery', 'Craft Work'],
  'vocational': ['Computer Training', 'Technical Skills', 'Trade Skills'],
  'language-training': ['Spoken English', 'Foreign Languages', 'Vernacular Languages'],

  // HOME SERVICES
  'ac-repair': ['Split AC Repair', 'Window AC Repair', 'AC Servicing & Cleaning'],
  'plumbing': ['Faucet/Leak Repair', 'Drainage Unclogging', 'Water Heater Installation'],
  'electrical': ['Wiring Repair', 'Switch/Socket Repair', 'Appliance Installation'],
  'cleaning': ['Deep House Cleaning', 'Sofa & Carpet Cleaning', 'Kitchen Cleaning', 'Pest Control'],
  'pest-control': ['Cockroach Control', 'Termite Treatment', 'Bed Bug Treatment', 'General Pest Control'],
  'house-shifting': ['Local Moving', 'Intercity Moving', 'Packing Services'],
  'laundry-dry-cleaning': ['Wash & Fold', 'Dry Cleaning', 'Ironing', 'Premium Laundry'],
  'home-tutors': ['Math', 'Science', 'Language', 'Exam Preparation'],

  // TRAVEL & EXPERIENCES
  'hotels': ['Budget/Boutique Stays', 'Serviced Apartments', '5-Star Luxury'],
  'intercity-travel': ['Bus Tickets', 'Train Tickets', 'Flight Tickets'],
  'taxis': ['Local City Trips', 'Airport Transfers', 'Outstation Cabs'],
  'bike-rentals': ['Scooters', 'Motorbikes', 'Gear Rental'],
  'weekend-getaways': ['Hill Stations', 'Beach Destinations', 'Heritage Sites'],
  'tours': ['Day Tours', 'Multi-day Packages', 'Adventure Tours'],
  'activities': ['Cooking Classes', 'Pottery Workshops', 'City Walking Tours'],

  // ENTERTAINMENT
  'movies': ['Hollywood', 'Bollywood', 'Regional Cinema', 'IMAX/4DX'],
  'live-events': ['Concerts', 'Comedy Shows', 'Theatre'],
  'festivals': ['Cultural Events', 'Music Festivals', 'Food Festivals'],
  'workshops': ['Art Workshops', 'Cooking Classes', 'DIY Workshops'],
  'amusement-parks': ['Theme Parks', 'Water Parks', 'Adventure Parks'],
  'gaming-cafes': ['PC Gaming', 'Console Gaming', 'E-Sports Tournaments'],
  'vr-ar-experiences': ['Arcade Games', 'Escape Rooms', 'Interactive Exhibits'],

  // FINANCIAL LIFESTYLE
  'bill-payments': ['Electricity Bills', 'Water Bills', 'Gas Bills'],
  'mobile-recharge': ['Prepaid Recharge', 'Postpaid Bill Payment', 'DTH Recharge'],
  'broadband': ['ISP Plans', 'Streaming Subscriptions'],
  'cable-ott': ['Cable TV', 'OTT Subscriptions', 'DTH Plans'],
  'insurance': ['Health Insurance', 'Life Insurance', 'Vehicle Insurance'],
  'gold-savings': ['Physical Gold', 'Digital Gold', 'Gold Loan'],
  'donations': ['NGO Donations', 'Religious Donations', 'Charity']
};

// Product name to sub-sub-category hints for better matching
const PRODUCT_NAME_HINTS: Record<string, string[]> = {
  // Food items
  'coffee|cappuccino|latte|espresso|americano|mocha': ['Espresso-based drinks'],
  'chai|tea|green tea|herbal': ['Tea (Chai/Herbal)'],
  'pancake|waffle|toast|eggs|breakfast|brunch': ['Breakfast Items', 'All-day brunch'],
  'sandwich|grilled|club|blt': ['Sandwiches'],
  'burger|cheese burger': ['Burgers'],
  'pizza|margherita|pepperoni': ['Pizzas'],
  'taco|burrito|quesadilla|nachos': ['Tacos/Burritos'],
  'wrap|roll|frankie': ['Wraps/Rolls'],
  'fried chicken|wings|strips|chicken bucket': ['Fried Chicken'],
  'momo|dumpling': ['Momos'],
  'paneer|dal|shahi|kadai|butter masala': ['North Indian'],
  'dosa|idli|sambar|vada|thali': ['South Indian'],
  'noodles|manchurian|fried rice|spring roll': ['Chinese/Asian'],
  'biryani|dum|hyderabadi|lucknowi': ['Biryani'],
  'salad|quinoa|poke|buddha bowl': ['Health & Salad Bowls'],
  'gelato|sorbet': ['Gelato', 'Sorbet'],
  'sundae|banana split': ['Sundaes'],
  'shake|milkshake': ['Shakes'],
  'kulfi|gulab jamun|rasgulla|ladoo': ['Indian Desserts (Kulfi)', 'Indian Sweets (Mithai)'],
  'cake|pastry|cupcake': ['Cakes & Pastries'],
  'bread|sourdough|baguette|focaccia': ['Bread (Sourdough/Rye)'],
  'cookie|brownie|macaron': ['Cookies & Brownies'],
  'donut|doughnut': ['Donuts'],
  'pani puri|bhel|sev puri|chaat': ['Chaat (Pani Puri/Bhel)'],
  'vada pav|dabeli': ['Vada Pav'],
  'pav bhaji': ['Pav Bhaji'],
  'samosa|pakora|bajji|bonda': ['Local Snacks (Bajji/Bonda)'],

  // Grocery items
  'milk|curd|yogurt': ['Milk', 'Yogurt/Curd'],
  'cheese|paneer': ['Cheese', 'Paneer'],
  'butter|cream|ghee': ['Butter & Cream', 'Oils & Ghee'],
  'dal|rice|grain|pulse': ['Pulses & Grains'],
  'masala|spice|turmeric|chili': ['Spices & Masalas'],
  'oil|mustard oil|sunflower': ['Oils & Ghee'],
  'egg|eggs': ['Dairy & Eggs'],
  'fruit|apple|banana|orange': ['Fresh Produce', 'Seasonal Produce'],
  'vegetable|tomato|potato|onion': ['Fresh Produce', 'Seasonal Produce'],
  'chips|snacks|namkeen|biscuit': ['Snacks & Chips', 'Packaged Foods'],
  'water|bisleri|aquafina': ['20L Can', 'Small Bottles (1L/500ml)'],

  // Beauty & Wellness
  'haircut|styling|blowdry': ['Haircuts & Styling'],
  'hair color|highlights|balayage': ['Hair Colouring'],
  'keratin|smoothening|hair spa': ['Keratin/Smoothening'],
  'facial|gold facial|diamond facial': ['Facials'],
  'massage|relaxation|stress relief': ['Swedish Massage', 'Deep Tissue'],
  'aromatherapy|essential oil': ['Aromatherapy'],
  'abhyanga|shirodhara|ayurvedic': ['Ayurvedic Treatments'],
  'reflexology|foot massage|head massage': ['Reflexology'],
  'waxing|threading': ['Waxing & Threading'],
  'manicure|pedicure|nail': ['Manicure & Pedicure', 'Manicure', 'Pedicure'],
  'bridal|makeup': ['Bridal Makeup'],

  // Healthcare
  'medicine|tablet|capsule|syrup': ['Prescription Medicine', 'Over-the-Counter (OTC)'],
  'paracetamol|cough|antacid|pain relief': ['Over-the-Counter (OTC)'],
  'bandage|first aid|antiseptic': ['First Aid'],
  'vitamin|supplement|calcium|omega': ['Vitamins & Supplements'],
  'diaper|baby|wipes': ['Baby Care'],
  'blood test|checkup|health package': ['Blood Tests', 'Health Checkup Packages'],
  'x-ray|scan|mri|ct': ['X-rays', 'MRI/CT Scans'],
  'dental|teeth|root canal|braces': ['General Checkups', 'Root Canal (RCT)', 'Braces/Aligners'],
  'eyeglasses|sunglasses|contact lens|eye': ['Prescription Eyeglasses', 'Sunglasses', 'Contact Lenses'],

  // Fashion & Shopping
  'shoe|sneaker|sandal|heel|loafer': ['Men\'s Casual', 'Women\'s Ethnic', 'Sports Shoes', 'Formal Shoes'],
  'bag|handbag|backpack|wallet': ['Handbags', 'Backpacks', 'Wallets'],
  'gold|diamond|silver|necklace|ring|earring': ['Gold', 'Diamond', 'Silver'],
  'watch|analog|digital|smart watch': ['Analog Watches', 'Digital Watches', 'Smart Watches'],
  'phone|mobile|smartphone': ['Smartphones'],
  'laptop|computer|pc': ['Laptops & PCs'],
  'cover|case|screen guard|power bank|charger': ['Mobile Covers', 'Screen Guards', 'Power Banks', 'Chargers'],

  // Fitness
  'gym|membership|weight training': ['Weight Training', 'Personal Training'],
  'cardio|treadmill|cycling': ['Cardio'],
  'zumba|aerobics|dance fitness': ['Group Classes (Zumba/Aerobics)', 'Cardio Dance'],
  'yoga|meditation|hatha|vinyasa': ['Hatha Yoga', 'Vinyasa Yoga', 'Power Yoga', 'Meditation Classes'],
  'cricket|football|swimming|badminton': ['Cricket Coaching', 'Football Training', 'Swimming Lessons', 'Badminton Coaching'],

  // Home Services
  'ac repair|ac service|ac cleaning': ['Split AC Repair', 'Window AC Repair', 'AC Servicing & Cleaning'],
  'plumbing|leak|tap|faucet': ['Faucet/Leak Repair', 'Drainage Unclogging'],
  'electrical|wiring|switch': ['Wiring Repair', 'Switch/Socket Repair'],
  'cleaning|house cleaning|deep clean': ['Deep House Cleaning', 'Kitchen Cleaning'],
  'pest control|cockroach|termite': ['Cockroach Control', 'Termite Treatment', 'General Pest Control'],
  'laundry|dry clean|ironing': ['Wash & Fold', 'Dry Cleaning', 'Ironing'],

  // Travel
  'hotel|stay|resort': ['Budget/Boutique Stays', 'Serviced Apartments', '5-Star Luxury'],
  'taxi|cab|airport transfer': ['Local City Trips', 'Airport Transfers', 'Outstation Cabs'],
  'bike|scooter|rental': ['Scooters', 'Motorbikes'],
  'tour|trip|package': ['Day Tours', 'Multi-day Packages', 'Adventure Tours'],

  // Entertainment
  'movie|film|cinema|imax': ['Hollywood', 'Bollywood', 'IMAX/4DX'],
  'concert|live event|comedy': ['Concerts', 'Comedy Shows'],
  'gaming|pc gaming|console': ['PC Gaming', 'Console Gaming'],
  'vr|ar|escape room': ['Arcade Games', 'Escape Rooms']
};

async function updateProductSubSubCategories() {
  try {
    console.log('🚀 Starting product sub-sub-category update...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // Fetch all categories (both main and sub)
    const allCategories = await db.collection('categories').find({}).toArray();
    console.log(`📦 Found ${allCategories.length} total categories`);

    // Create maps
    const categoryIdToSlug = new Map<string, string>();
    const categoryIdToParentId = new Map<string, string>();

    allCategories.forEach((cat: any) => {
      categoryIdToSlug.set(cat._id.toString(), cat.slug);
      if (cat.parentCategory) {
        categoryIdToParentId.set(cat._id.toString(), cat.parentCategory.toString());
      }
    });

    // Function to determine if a category is a subcategory
    const isSubcategory = (categoryId: string): boolean => {
      return categoryIdToParentId.has(categoryId);
    };

    // Fetch all products
    const products = await db.collection('products').find({ isDeleted: { $ne: true } }).toArray();
    console.log(`📦 Found ${products.length} products to update\n`);

    console.log('========================================');
    console.log('UPDATING PRODUCTS WITH SUB-SUB-CATEGORIES');
    console.log('========================================\n');

    let updatedCount = 0;
    const subSubCategoryStats: Record<string, number> = {};

    for (const product of products) {
      const p = product as any;
      const categoryId = p.category?.toString();

      if (!categoryId) continue;

      // Get the category slug
      const categorySlug = categoryIdToSlug.get(categoryId);

      if (!categorySlug) continue;

      // Check if this category has sub-sub-categories defined
      let subSubCats = SUB_SUB_CATEGORIES[categorySlug];

      // If not found and it's a main category, skip
      if (!subSubCats) {
        // Maybe the product is assigned to a main category, try to find best match from name
        const productNameLower = (p.name || '').toLowerCase();

        // Find matching sub-sub-category from hints
        for (const [pattern, categories] of Object.entries(PRODUCT_NAME_HINTS)) {
          const patterns = pattern.split('|');
          for (const pat of patterns) {
            if (productNameLower.includes(pat)) {
              const matchedSubSubCat = categories[Math.floor(Math.random() * categories.length)];

              await db.collection('products').updateOne(
                { _id: p._id },
                { $set: { subSubCategory: matchedSubSubCat } }
              );

              subSubCategoryStats[matchedSubSubCat] = (subSubCategoryStats[matchedSubSubCat] || 0) + 1;
              updatedCount++;
              break;
            }
          }
          if (subSubCategoryStats[Object.values(PRODUCT_NAME_HINTS).flat()[0]]) break;
        }

        continue;
      }

      // Try to match based on product name first
      let assignedSubSubCategory = '';
      const productNameLower = (p.name || '').toLowerCase();

      // Check hints first
      for (const [pattern, categories] of Object.entries(PRODUCT_NAME_HINTS)) {
        const patterns = pattern.split('|');
        for (const pat of patterns) {
          if (productNameLower.includes(pat)) {
            // Check if any of the hint categories are in our subcategory list
            for (const hintCat of categories) {
              if (subSubCats.includes(hintCat)) {
                assignedSubSubCategory = hintCat;
                break;
              }
            }
            if (assignedSubSubCategory) break;
          }
        }
        if (assignedSubSubCategory) break;
      }

      // If no match found from hints, try direct matching
      if (!assignedSubSubCategory) {
        for (const subSubCat of subSubCats) {
          const keywords = subSubCat.toLowerCase().split(/[\s\/\(\)]+/).filter(k => k.length > 2);
          for (const keyword of keywords) {
            if (productNameLower.includes(keyword)) {
              assignedSubSubCategory = subSubCat;
              break;
            }
          }
          if (assignedSubSubCategory) break;
        }
      }

      // If still no match, assign randomly
      if (!assignedSubSubCategory) {
        assignedSubSubCategory = subSubCats[Math.floor(Math.random() * subSubCats.length)];
      }

      // Update the product
      await db.collection('products').updateOne(
        { _id: p._id },
        { $set: { subSubCategory: assignedSubSubCategory } }
      );

      subSubCategoryStats[assignedSubSubCategory] = (subSubCategoryStats[assignedSubSubCategory] || 0) + 1;
      updatedCount++;

      if (updatedCount % 50 === 0) {
        console.log(`✅ Updated ${updatedCount} products...`);
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('========================================');
    console.log(`Total products updated: ${updatedCount}`);

    console.log('\nSub-sub-category distribution (top 30):');
    const sortedStats = Object.entries(subSubCategoryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    for (const [subSubCat, count] of sortedStats) {
      console.log(`   ${subSubCat}: ${count} products`);
    }

    if (Object.keys(subSubCategoryStats).length > 30) {
      console.log(`   ... and ${Object.keys(subSubCategoryStats).length - 30} more sub-sub-categories`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateProductSubSubCategories()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
