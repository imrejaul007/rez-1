/**
 * Seed Script - ADD New Stores with Booking Functionality
 *
 * This script ADDS 30 new stores to the existing database:
 * - 10 Restaurants (table booking)
 * - 10 Salons/Services (appointment booking)
 * - 5 Clinics (consultation booking)
 * - 5 Hybrid stores (multiple types)
 *
 * Does NOT remove or modify existing 54 stores!
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Helper function to generate slug
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Sample stores to ADD
const newStores = {
  restaurants: [
    {
      name: "McDonald's",
      category: "Fast Food",
      description: "World's largest fast food chain serving burgers, fries, and beverages",
      image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800",
      logo: "https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg"
    },
    {
      name: "KFC",
      category: "Fast Food",
      description: "Famous for fried chicken, buckets, and zingers",
      image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800",
      logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/57/KFC_logo-image.svg/200px-KFC_logo-image.svg.png"
    },
    {
      name: "Pizza Hut",
      category: "Restaurant",
      description: "International pizza chain with Italian-American cuisine",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
      logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/Pizza_Hut_logo.svg/200px-Pizza_Hut_logo.svg.png"
    },
    {
      name: "Domino's Pizza",
      category: "Restaurant",
      description: "Pizza delivery and takeaway chain",
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Dominos_pizza_logo.svg/200px-Dominos_pizza_logo.svg.png"
    },
    {
      name: "Subway",
      category: "Fast Food",
      description: "Submarine sandwiches and salads franchise",
      image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Subway_2016_logo.svg/200px-Subway_2016_logo.svg.png"
    },
    {
      name: "Starbucks",
      category: "Cafe",
      description: "Coffee house chain with beverages and snacks",
      image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800",
      logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/200px-Starbucks_Corporation_Logo_2011.svg.png"
    },
    {
      name: "Burger King",
      category: "Fast Food",
      description: "Flame-grilled burgers and fast food",
      image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Burger_King_logo_%281999%29.svg/200px-Burger_King_logo_%281999%29.svg.png"
    },
    {
      name: "The Yellow Chilli",
      category: "Restaurant",
      description: "Indian restaurant chain by Chef Sanjeev Kapoor",
      image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800",
      logo: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200"
    },
    {
      name: "Barbeque Nation",
      category: "Restaurant",
      description: "Casual dining restaurant chain with live grill",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
      logo: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200"
    },
    {
      name: "Cafe Coffee Day",
      category: "Cafe",
      description: "Indian cafe chain serving coffee and snacks",
      image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
      logo: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200"
    }
  ],

  salons: [
    {
      name: "Lakme Salon",
      category: "Salon",
      description: "Premium beauty salon for hair, skin, and makeup services",
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800",
      logo: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=200",
      serviceTypes: ["Haircut", "Hair Color", "Facial", "Makeup", "Manicure", "Pedicure"]
    },
    {
      name: "Green Trends",
      category: "Salon",
      description: "Unisex hair and beauty salon chain",
      image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800",
      logo: "https://images.unsplash.com/photo-1633681926035-ec1ac984418a?w=200",
      serviceTypes: ["Haircut", "Hair Spa", "Beard Styling", "Hair Treatment"]
    },
    {
      name: "Looks Salon",
      category: "Salon",
      description: "Contemporary salon with professional styling",
      image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800",
      logo: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=200",
      serviceTypes: ["Haircut", "Hair Color", "Facial", "Waxing", "Threading"]
    },
    {
      name: "Jawed Habib",
      category: "Salon",
      description: "Renowned hair and beauty salon franchise",
      image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800",
      logo: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=200",
      serviceTypes: ["Haircut", "Hair Styling", "Hair Color", "Keratin Treatment"]
    },
    {
      name: "Spa Nirvana",
      category: "Spa",
      description: "Luxury spa and wellness center",
      image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800",
      logo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200",
      serviceTypes: ["Massage", "Body Spa", "Aromatherapy", "Facial", "Body Wrap"]
    },
    {
      name: "Urban Company Salon",
      category: "Salon",
      description: "On-demand beauty and wellness services",
      image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800",
      logo: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=200",
      serviceTypes: ["Haircut", "Cleanup", "Facial", "Massage", "Waxing"]
    },
    {
      name: "Bounce Salon",
      category: "Salon",
      description: "Modern blow dry bar and salon",
      image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800",
      logo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200",
      serviceTypes: ["Blow Dry", "Hair Styling", "Makeup", "Hair Spa"]
    },
    {
      name: "The Barber Shop",
      category: "Barbershop",
      description: "Premium men's grooming salon",
      image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800",
      logo: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=200",
      serviceTypes: ["Haircut", "Beard Trim", "Shave", "Hair Color", "Facial"]
    },
    {
      name: "Tattva Spa",
      category: "Spa",
      description: "Award-winning spa chain",
      image: "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=800",
      logo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200",
      serviceTypes: ["Swedish Massage", "Deep Tissue", "Thai Massage", "Facial"]
    },
    {
      name: "Enrich Salon",
      category: "Salon",
      description: "Luxury hair and beauty salon",
      image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800",
      logo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200",
      serviceTypes: ["Hair Color", "Haircut", "Keratin", "Rebonding", "Facial"]
    }
  ],

  clinics: [
    {
      name: "Apollo Clinic",
      category: "Clinic",
      description: "Multi-specialty healthcare clinic",
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800",
      logo: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=200",
      consultationTypes: ["General Physician", "Pediatrician", "Gynecologist", "Dentist"]
    },
    {
      name: "Max Healthcare Clinic",
      category: "Clinic",
      description: "Premium healthcare and diagnostic center",
      image: "https://images.unsplash.com/photo-1504439904031-93ded9f93e4e?w=800",
      logo: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=200",
      consultationTypes: ["General Medicine", "Cardiology", "Orthopedics", "Dermatology"]
    },
    {
      name: "Dentassure Dental Clinic",
      category: "Dental Clinic",
      description: "Specialized dental care and treatment",
      image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800",
      logo: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=200",
      consultationTypes: ["General Dentistry", "Root Canal", "Teeth Whitening", "Braces"]
    },
    {
      name: "Vision Eye Clinic",
      category: "Eye Clinic",
      description: "Complete eye care and optical services",
      image: "https://images.unsplash.com/photo-1559311746-2d7edb7f13bb?w=800",
      logo: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200",
      consultationTypes: ["Eye Checkup", "LASIK Consultation", "Cataract Surgery", "Retina Care"]
    },
    {
      name: "Pet Care Veterinary Clinic",
      category: "Veterinary",
      description: "Complete pet healthcare and wellness",
      image: "https://images.unsplash.com/photo-1530041539828-114de669390e?w=800",
      logo: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200",
      consultationTypes: ["Vaccination", "General Checkup", "Surgery", "Grooming"]
    }
  ],

  hybrid: [
    {
      name: "Wellness Plus Mall",
      category: "Mall",
      description: "Shopping mall with integrated healthcare and wellness services",
      image: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800",
      logo: "https://images.unsplash.com/photo-1565866326212-0f833c08e25e?w=200",
      serviceTypes: ["Shopping", "Spa", "Salon", "Fitness"],
      consultationTypes: ["Health Checkup", "Nutrition Consultation"]
    },
    {
      name: "Central Square",
      category: "Shopping Complex",
      description: "Multi-purpose shopping and dining complex",
      image: "https://images.unsplash.com/photo-1567958451986-2de427a4a0be?w=800",
      logo: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200",
      serviceTypes: ["Shopping", "Dining", "Entertainment"]
    },
    {
      name: "LifeStyle Department Store",
      category: "Department Store",
      description: "Fashion and lifestyle store with salon services",
      image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800",
      logo: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200",
      serviceTypes: ["Shopping", "Personal Styling", "Salon Services"]
    },
    {
      name: "Wellness Junction",
      category: "Hybrid",
      description: "Integrated health, fitness, and retail space",
      image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800",
      logo: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200",
      serviceTypes: ["Gym", "Spa", "Cafe"],
      consultationTypes: ["Physiotherapy", "Nutrition"]
    },
    {
      name: "Phoenix MarketCity",
      category: "Mall",
      description: "Large retail and entertainment destination",
      image: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800",
      logo: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=200",
      serviceTypes: ["Shopping", "Food Court", "Cinema", "Salon"]
    }
  ]
};

// Base coordinates (Delhi, India)
const baseLocation = {
  city: "New Delhi",
  state: "Delhi",
  country: "India",
  pincode: "110001",
  coordinates: [77.2090, 28.6139] // [longitude, latitude]
};

function createStoreDocument(storeData, bookingType) {
  const slug = generateSlug(storeData.name);

  const baseStore = {
    name: storeData.name,
    slug: slug,
    category: storeData.category,
    description: storeData.description || `Visit ${storeData.name} for the best services`,
    image: storeData.image,
    logo: storeData.logo,

    location: {
      ...baseLocation,
      address: `${Math.floor(Math.random() * 500) + 1}, Sector ${Math.floor(Math.random() * 50) + 1}`,
      coordinates: [
        baseLocation.coordinates[0] + (Math.random() - 0.5) * 0.1,
        baseLocation.coordinates[1] + (Math.random() - 0.5) * 0.1
      ]
    },

    contact: {
      phone: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      email: `contact@${slug}.com`,
      website: `https://www.${slug}.com`
    },

    businessHours: {
      monday: { open: "09:00", close: "22:00" },
      tuesday: { open: "09:00", close: "22:00" },
      wednesday: { open: "09:00", close: "22:00" },
      thursday: { open: "09:00", close: "22:00" },
      friday: { open: "09:00", close: "22:00" },
      saturday: { open: "09:00", close: "23:00" },
      sunday: { open: "10:00", close: "23:00" }
    },

    ratings: {
      average: 4 + Math.random(),
      count: Math.floor(Math.random() * 500) + 100
    },

    tags: [storeData.category.toLowerCase(), 'verified', 'popular'],
    isActive: true,
    isFeatured: Math.random() > 0.5,
    isVerified: true,

    // Booking fields
    bookingType: bookingType
  };

  // Add type-specific configurations
  switch (bookingType) {
    case 'RESTAURANT':
      baseStore.hasMenu = true;
      baseStore.bookingConfig = {
        enabled: true,
        requiresAdvanceBooking: true,
        allowWalkIn: true,
        slotDuration: 90, // 90 minutes per table
        advanceBookingDays: 14,
        workingHours: {
          start: "09:00",
          end: "22:00"
        }
      };
      baseStore.storeVisitConfig = {
        enabled: false,
        features: [],
        maxVisitorsPerSlot: 0,
        averageVisitDuration: 0
      };
      break;

    case 'SERVICE':
      baseStore.serviceTypes = storeData.serviceTypes || [];
      baseStore.bookingConfig = {
        enabled: true,
        requiresAdvanceBooking: true,
        allowWalkIn: false, // Services require appointments
        slotDuration: 60, // 60 minutes per service
        advanceBookingDays: 30,
        workingHours: {
          start: "09:00",
          end: "21:00"
        }
      };
      baseStore.storeVisitConfig = {
        enabled: false,
        features: [],
        maxVisitorsPerSlot: 0,
        averageVisitDuration: 0
      };
      break;

    case 'CONSULTATION':
      baseStore.consultationTypes = storeData.consultationTypes || [];
      baseStore.bookingConfig = {
        enabled: true,
        requiresAdvanceBooking: true,
        allowWalkIn: false, // Consultations require appointments
        slotDuration: 30, // 30 minutes per consultation
        advanceBookingDays: 60,
        workingHours: {
          start: "08:00",
          end: "20:00"
        }
      };
      baseStore.storeVisitConfig = {
        enabled: false,
        features: [],
        maxVisitorsPerSlot: 0,
        averageVisitDuration: 0
      };
      break;

    case 'HYBRID':
      baseStore.serviceTypes = storeData.serviceTypes || [];
      baseStore.consultationTypes = storeData.consultationTypes || [];
      baseStore.bookingConfig = {
        enabled: true,
        requiresAdvanceBooking: false, // Hybrid allows both
        allowWalkIn: true,
        slotDuration: 60,
        advanceBookingDays: 30,
        workingHours: {
          start: "09:00",
          end: "22:00"
        }
      };
      baseStore.storeVisitConfig = {
        enabled: true, // Hybrid also supports store visit
        features: ['visit_scheduling', 'queue_system'],
        maxVisitorsPerSlot: 30,
        averageVisitDuration: 45
      };
      break;
  }

  return baseStore;
}

async function seedBookingStores() {
  try {
    console.log('\n🌱 Starting Store Seeding Process...\n');
    console.log('📝 This will ADD 30 new stores to the database');
    console.log('✅ Existing stores will NOT be affected\n');

    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const storesCollection = db.collection('stores');

    // Check existing count
    const existingCount = await storesCollection.countDocuments();
    console.log(`📊 Current number of stores: ${existingCount}\n`);

    const storesToAdd = [];

    // Add restaurants
    console.log('🍽️  Preparing 10 restaurant stores...');
    newStores.restaurants.forEach(restaurant => {
      storesToAdd.push(createStoreDocument(restaurant, 'RESTAURANT'));
    });

    // Add salons/services
    console.log('💇 Preparing 10 salon/service stores...');
    newStores.salons.forEach(salon => {
      storesToAdd.push(createStoreDocument(salon, 'SERVICE'));
    });

    // Add clinics
    console.log('🏥 Preparing 5 clinic stores...');
    newStores.clinics.forEach(clinic => {
      storesToAdd.push(createStoreDocument(clinic, 'CONSULTATION'));
    });

    // Add hybrid stores
    console.log('🏬 Preparing 5 hybrid stores...');
    newStores.hybrid.forEach(hybrid => {
      storesToAdd.push(createStoreDocument(hybrid, 'HYBRID'));
    });

    console.log(`\n✅ Prepared ${storesToAdd.length} new stores to add\n`);
    console.log('💾 Inserting into database...\n');

    // Insert all new stores
    const result = await storesCollection.insertMany(storesToAdd);

    console.log('=' .repeat(80));
    console.log('SEEDING COMPLETE!');
    console.log('=' .repeat(80));
    console.log(`\n✅ Successfully added ${result.insertedCount} new stores!\n`);

    // Verify
    const newCount = await storesCollection.countDocuments();
    console.log(`📊 Database Summary:`);
    console.log(`   - Previous count: ${existingCount}`);
    console.log(`   - Added: ${result.insertedCount}`);
    console.log(`   - Current total: ${newCount}\n`);

    // Count by booking type
    const restaurantCount = await storesCollection.countDocuments({ bookingType: 'RESTAURANT' });
    const serviceCount = await storesCollection.countDocuments({ bookingType: 'SERVICE' });
    const consultationCount = await storesCollection.countDocuments({ bookingType: 'CONSULTATION' });
    const retailCount = await storesCollection.countDocuments({ bookingType: 'RETAIL' });
    const hybridCount = await storesCollection.countDocuments({ bookingType: 'HYBRID' });

    console.log('📊 Stores by Booking Type:');
    console.log(`   🍽️  RESTAURANT     : ${restaurantCount} stores`);
    console.log(`   💇 SERVICE        : ${serviceCount} stores`);
    console.log(`   🏥 CONSULTATION   : ${consultationCount} stores`);
    console.log(`   🛒 RETAIL         : ${retailCount} stores`);
    console.log(`   🏬 HYBRID         : ${hybridCount} stores\n`);

    console.log('=' .repeat(80));
    console.log('NEXT STEPS');
    console.log('=' .repeat(80));
    console.log('\n1. Restart the backend server');
    console.log('   → Server will pick up the new stores\n');
    console.log('2. Test different booking types in frontend');
    console.log(`   → Visit McDonald's for table booking`);
    console.log(`   → Visit Lakme Salon for appointment booking`);
    console.log(`   → Visit Apollo Clinic for consultation booking\n`);
    console.log('3. Verify QuickActions show correct buttons');
    console.log('   → Restaurants should show "Book a Table"');
    console.log('   → Salons should show "Book Appointment"');
    console.log('   → Clinics should show "Book Consultation"');
    console.log('   → Retail should show "Plan Store Visit"\n');

  } catch (error) {
    console.error('\n❌ Seeding Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed\n');
  }
}

// Run the seeding
console.log('\n' + '=' .repeat(80));
console.log('STORE SEEDING - ADD 30 NEW STORES WITH BOOKING');
console.log('=' .repeat(80));
console.log('\nThis will ADD:');
console.log('  + 10 Restaurant stores (table booking)');
console.log('  + 10 Salon/Service stores (appointment booking)');
console.log('  + 5 Clinic stores (consultation booking)');
console.log('  + 5 Hybrid stores (multiple booking types)');
console.log('\nExisting stores will NOT be affected\n');
console.log('=' .repeat(80));
console.log('\nStarting in 2 seconds...\n');

setTimeout(() => {
  seedBookingStores().catch(console.error);
}, 2000);
