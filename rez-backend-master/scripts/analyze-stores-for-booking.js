/**
 * Database Analysis Script - Store Categories and Booking Requirements
 *
 * This script analyzes all stores in the database and categorizes them
 * for implementing dynamic booking systems.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Booking type classifications
const BOOKING_TYPES = {
  RESTAURANT: 'Table Reservation',
  SERVICE: 'Service Appointment',
  CONSULTATION: 'Consultation Booking',
  RETAIL: 'No Booking Needed (Store Visit Only)',
  HYBRID: 'Multiple Booking Types'
};

// Category to booking type mapping
const CATEGORY_BOOKING_MAP = {
  // Restaurants & Food
  'Restaurant': 'RESTAURANT',
  'Cafe': 'RESTAURANT',
  'Bar': 'RESTAURANT',
  'Bakery': 'RESTAURANT',
  'Fast Food': 'RESTAURANT',
  'Food Court': 'RESTAURANT',
  'Fine Dining': 'RESTAURANT',
  'Casual Dining': 'RESTAURANT',

  // Services requiring appointments
  'Salon': 'SERVICE',
  'Spa': 'SERVICE',
  'Barbershop': 'SERVICE',
  'Beauty Parlor': 'SERVICE',
  'Massage Center': 'SERVICE',
  'Tattoo Studio': 'SERVICE',
  'Nail Salon': 'SERVICE',
  'Fitness Center': 'SERVICE',
  'Gym': 'SERVICE',
  'Yoga Studio': 'SERVICE',
  'Photography Studio': 'SERVICE',
  'Car Wash': 'SERVICE',
  'Car Service': 'SERVICE',
  'Pet Grooming': 'SERVICE',

  // Healthcare & Consultations
  'Clinic': 'CONSULTATION',
  'Hospital': 'CONSULTATION',
  'Dental Clinic': 'CONSULTATION',
  'Eye Clinic': 'CONSULTATION',
  'Diagnostic Center': 'CONSULTATION',
  'Physiotherapy': 'CONSULTATION',
  'Veterinary': 'CONSULTATION',
  'Counseling': 'CONSULTATION',
  'Legal Services': 'CONSULTATION',
  'Financial Advisor': 'CONSULTATION',

  // Retail (no booking needed)
  'Pharmacy': 'RETAIL',
  'Medical Store': 'RETAIL',
  'Grocery Store': 'RETAIL',
  'Supermarket': 'RETAIL',
  'Convenience Store': 'RETAIL',
  'Electronics': 'RETAIL',
  'Clothing': 'RETAIL',
  'Fashion': 'RETAIL',
  'Jewelry': 'RETAIL',
  'Furniture': 'RETAIL',
  'Hardware': 'RETAIL',
  'Stationery': 'RETAIL',
  'Books': 'RETAIL',
  'Bookstore': 'RETAIL',
  'Toy Store': 'RETAIL',
  'Sports Store': 'RETAIL',
  'Gift Shop': 'RETAIL',
  'Florist': 'RETAIL',
  'Pet Store': 'RETAIL',
  'Mobile Shop': 'RETAIL',
  'Shoe Store': 'RETAIL',
  'Optical Store': 'RETAIL',
  'Liquor Store': 'RETAIL',
  'Fruits & Vegetables': 'RETAIL',
  'Bakery Shop': 'RETAIL',

  // Hybrid (could need booking for some services)
  'Department Store': 'HYBRID',
  'Mall': 'HYBRID',
  'Shopping Complex': 'HYBRID'
};

async function analyzeStores() {
  try {
    console.log('🔍 Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = mongoose.connection.db;
    const storesCollection = db.collection('stores');

    // Get total count
    const totalStores = await storesCollection.countDocuments();
    console.log(`📊 Total Stores in Database: ${totalStores}\n`);

    // Get all unique categories
    const categories = await storesCollection.distinct('category');
    console.log(`📂 Unique Categories Found: ${categories.length}\n`);

    // Analyze each category
    const categoryAnalysis = [];

    for (const category of categories) {
      const count = await storesCollection.countDocuments({ category });
      const bookingType = CATEGORY_BOOKING_MAP[category] || 'RETAIL'; // Default to RETAIL

      // Get sample stores from this category
      const samples = await storesCollection.find({ category }).limit(3).toArray();

      categoryAnalysis.push({
        category,
        count,
        bookingType,
        bookingDescription: BOOKING_TYPES[bookingType],
        samples: samples.map(s => ({
          name: s.name,
          hasMenu: s.hasMenu || false,
          allowBooking: s.allowBooking || false,
          storeType: s.storeType || 'Not Set'
        }))
      });
    }

    // Sort by booking type and count
    categoryAnalysis.sort((a, b) => {
      if (a.bookingType !== b.bookingType) {
        return a.bookingType.localeCompare(b.bookingType);
      }
      return b.count - a.count;
    });

    // Display results
    console.log('=' .repeat(100));
    console.log('STORE CATEGORIES ANALYSIS - BOOKING REQUIREMENTS');
    console.log('=' .repeat(100));
    console.log();

    let currentType = null;
    const bookingTypeSummary = {};

    categoryAnalysis.forEach(({ category, count, bookingType, bookingDescription, samples }) => {
      if (currentType !== bookingType) {
        currentType = bookingType;
        console.log('\n' + '─'.repeat(100));
        console.log(`🏷️  ${bookingType} - ${bookingDescription}`);
        console.log('─'.repeat(100));
        bookingTypeSummary[bookingType] = 0;
      }

      bookingTypeSummary[bookingType] += count;

      console.log(`\n  📍 ${category}`);
      console.log(`     Stores: ${count}`);
      console.log(`     Booking Type: ${bookingDescription}`);

      if (samples.length > 0) {
        console.log(`     Sample Stores:`);
        samples.forEach(s => {
          console.log(`       • ${s.name}`);
          console.log(`         - Has Menu: ${s.hasMenu}`);
          console.log(`         - Allow Booking: ${s.allowBooking}`);
          console.log(`         - Store Type: ${s.storeType}`);
        });
      }
    });

    // Summary
    console.log('\n\n' + '=' .repeat(100));
    console.log('SUMMARY BY BOOKING TYPE');
    console.log('=' .repeat(100));
    console.log();

    Object.entries(bookingTypeSummary).forEach(([type, count]) => {
      const percentage = ((count / totalStores) * 100).toFixed(1);
      console.log(`  ${type.padEnd(20)} : ${count.toString().padStart(4)} stores (${percentage}%)`);
    });

    console.log();
    console.log('=' .repeat(100));
    console.log('RECOMMENDED ACTIONS');
    console.log('=' .repeat(100));
    console.log();

    console.log('1. 🍽️  RESTAURANT STORES (Table Booking):');
    console.log('   - Show "Book a Table" button');
    console.log('   - Booking UI: Date, Time, Number of People, Contact Details');
    console.log('   - Backend: Create table_bookings collection\n');

    console.log('2. 💇 SERVICE STORES (Appointment Booking):');
    console.log('   - Show "Book Appointment" button');
    console.log('   - Booking UI: Service Selection, Date, Time, Staff Selection, Contact Details');
    console.log('   - Backend: Create service_appointments collection\n');

    console.log('3. 🏥 CONSULTATION STORES (Doctor/Expert Booking):');
    console.log('   - Show "Book Consultation" button');
    console.log('   - Booking UI: Consultation Type, Date, Time, Patient Details, Symptoms');
    console.log('   - Backend: Create consultations collection\n');

    console.log('4. 🛒 RETAIL STORES (No Booking):');
    console.log('   - Hide booking button OR show "Visit Store" with directions only');
    console.log('   - Focus on: Product catalog, Add to cart, Store hours, Directions\n');

    console.log('5. 🏬 HYBRID STORES:');
    console.log('   - Show context-sensitive booking based on services offered');
    console.log('   - Example: Department store with salon inside\n');

    // Check current store schema fields
    console.log('\n' + '=' .repeat(100));
    console.log('CURRENT STORE SCHEMA ANALYSIS');
    console.log('=' .repeat(100));
    console.log();

    const sampleStore = await storesCollection.findOne({});
    if (sampleStore) {
      const bookingRelatedFields = [];
      const allFields = Object.keys(sampleStore);

      allFields.forEach(field => {
        if (field.toLowerCase().includes('book') ||
            field.toLowerCase().includes('appointment') ||
            field.toLowerCase().includes('reservation') ||
            field.toLowerCase().includes('menu') ||
            field === 'storeType' ||
            field === 'allowBooking') {
          bookingRelatedFields.push({
            field,
            value: sampleStore[field],
            type: typeof sampleStore[field]
          });
        }
      });

      if (bookingRelatedFields.length > 0) {
        console.log('Existing booking-related fields found:');
        bookingRelatedFields.forEach(({ field, value, type }) => {
          console.log(`  • ${field} (${type}): ${JSON.stringify(value)}`);
        });
      } else {
        console.log('⚠️  No booking-related fields found in current schema');
        console.log('   Migration needed to add booking configuration fields');
      }
    }

    // Migration recommendations
    console.log('\n\n' + '=' .repeat(100));
    console.log('MIGRATION STRATEGY - 100% PRODUCTION READY');
    console.log('=' .repeat(100));
    console.log();

    console.log('PHASE 1: Schema Updates (No Downtime)');
    console.log('  ✓ Add bookingConfig field to Store schema');
    console.log('  ✓ Add bookingType enum field');
    console.log('  ✓ Add serviceTypes array for SERVICE stores');
    console.log('  ✓ Add consultationTypes array for CONSULTATION stores');
    console.log('  ✓ Add businessHours with proper time slots\n');

    console.log('PHASE 2: Data Migration (Safe, Reversible)');
    console.log('  ✓ Classify all stores by category → bookingType');
    console.log('  ✓ Set default booking configurations');
    console.log('  ✓ Preserve existing data (non-destructive)');
    console.log('  ✓ Create migration rollback script\n');

    console.log('PHASE 3: Backend API Updates');
    console.log('  ✓ Update Store API to return bookingType');
    console.log('  ✓ Create booking endpoints for each type');
    console.log('  ✓ Add validation based on store booking type');
    console.log('  ✓ Add booking availability API\n');

    console.log('PHASE 4: Frontend Updates');
    console.log('  ✓ Update QuickActions to show correct booking button');
    console.log('  ✓ Create dynamic booking pages for each type');
    console.log('  ✓ Add booking type detection logic');
    console.log('  ✓ Hide booking for RETAIL stores\n');

    console.log('PHASE 5: Testing & Deployment');
    console.log('  ✓ Test with stores from each category');
    console.log('  ✓ Verify booking flows for each type');
    console.log('  ✓ Test fallbacks and error cases');
    console.log('  ✓ Deploy with feature flag (gradual rollout)\n');

    console.log('=' .repeat(100));
    console.log();

  } catch (error) {
    console.error('❌ Error analyzing stores:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the analysis
analyzeStores().catch(console.error);
