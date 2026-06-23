/**
 * Migration Script: Add operationalInfo with store hours to all stores
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Different hour patterns based on store type
const HOUR_PATTERNS = {
  // Cafes and restaurants - morning to late night
  cafe: {
    hours: {
      monday: { open: '08:00', close: '23:00', closed: false },
      tuesday: { open: '08:00', close: '23:00', closed: false },
      wednesday: { open: '08:00', close: '23:00', closed: false },
      thursday: { open: '08:00', close: '23:00', closed: false },
      friday: { open: '08:00', close: '23:30', closed: false },
      saturday: { open: '09:00', close: '23:30', closed: false },
      sunday: { open: '09:00', close: '22:00', closed: false }
    },
    deliveryTime: '25-35 mins',
    minimumOrder: 150
  },
  // Fast food and restaurants
  restaurant: {
    hours: {
      monday: { open: '11:00', close: '23:00', closed: false },
      tuesday: { open: '11:00', close: '23:00', closed: false },
      wednesday: { open: '11:00', close: '23:00', closed: false },
      thursday: { open: '11:00', close: '23:00', closed: false },
      friday: { open: '11:00', close: '23:30', closed: false },
      saturday: { open: '11:00', close: '23:30', closed: false },
      sunday: { open: '11:00', close: '22:30', closed: false }
    },
    deliveryTime: '30-45 mins',
    minimumOrder: 200
  },
  // Grocery and supermarkets
  grocery: {
    hours: {
      monday: { open: '07:00', close: '22:00', closed: false },
      tuesday: { open: '07:00', close: '22:00', closed: false },
      wednesday: { open: '07:00', close: '22:00', closed: false },
      thursday: { open: '07:00', close: '22:00', closed: false },
      friday: { open: '07:00', close: '22:00', closed: false },
      saturday: { open: '07:00', close: '22:00', closed: false },
      sunday: { open: '08:00', close: '21:00', closed: false }
    },
    deliveryTime: '45-60 mins',
    minimumOrder: 300
  },
  // Salons and beauty
  salon: {
    hours: {
      monday: { open: '10:00', close: '20:00', closed: false },
      tuesday: { open: '10:00', close: '20:00', closed: false },
      wednesday: { open: '10:00', close: '20:00', closed: false },
      thursday: { open: '10:00', close: '20:00', closed: false },
      friday: { open: '10:00', close: '21:00', closed: false },
      saturday: { open: '10:00', close: '21:00', closed: false },
      sunday: { open: '10:00', close: '19:00', closed: false }
    },
    deliveryTime: 'Walk-in only',
    minimumOrder: 0
  },
  // Pharmacy and healthcare
  pharmacy: {
    hours: {
      monday: { open: '08:00', close: '22:00', closed: false },
      tuesday: { open: '08:00', close: '22:00', closed: false },
      wednesday: { open: '08:00', close: '22:00', closed: false },
      thursday: { open: '08:00', close: '22:00', closed: false },
      friday: { open: '08:00', close: '22:00', closed: false },
      saturday: { open: '08:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '21:00', closed: false }
    },
    deliveryTime: '30-45 mins',
    minimumOrder: 100
  },
  // Retail/Fashion
  retail: {
    hours: {
      monday: { open: '10:00', close: '21:00', closed: false },
      tuesday: { open: '10:00', close: '21:00', closed: false },
      wednesday: { open: '10:00', close: '21:00', closed: false },
      thursday: { open: '10:00', close: '21:00', closed: false },
      friday: { open: '10:00', close: '21:30', closed: false },
      saturday: { open: '10:00', close: '21:30', closed: false },
      sunday: { open: '11:00', close: '20:00', closed: false }
    },
    deliveryTime: '2-3 days',
    minimumOrder: 500
  },
  // Gym and fitness
  fitness: {
    hours: {
      monday: { open: '05:00', close: '22:00', closed: false },
      tuesday: { open: '05:00', close: '22:00', closed: false },
      wednesday: { open: '05:00', close: '22:00', closed: false },
      thursday: { open: '05:00', close: '22:00', closed: false },
      friday: { open: '05:00', close: '22:00', closed: false },
      saturday: { open: '06:00', close: '20:00', closed: false },
      sunday: { open: '06:00', close: '18:00', closed: false }
    },
    deliveryTime: 'N/A',
    minimumOrder: 0
  },
  // Services (home services, repairs, etc.)
  services: {
    hours: {
      monday: { open: '09:00', close: '19:00', closed: false },
      tuesday: { open: '09:00', close: '19:00', closed: false },
      wednesday: { open: '09:00', close: '19:00', closed: false },
      thursday: { open: '09:00', close: '19:00', closed: false },
      friday: { open: '09:00', close: '19:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true }
    },
    deliveryTime: 'Same day service',
    minimumOrder: 0
  },
  // Default pattern
  default: {
    hours: {
      monday: { open: '09:00', close: '21:00', closed: false },
      tuesday: { open: '09:00', close: '21:00', closed: false },
      wednesday: { open: '09:00', close: '21:00', closed: false },
      thursday: { open: '09:00', close: '21:00', closed: false },
      friday: { open: '09:00', close: '21:00', closed: false },
      saturday: { open: '09:00', close: '21:00', closed: false },
      sunday: { open: '10:00', close: '20:00', closed: false }
    },
    deliveryTime: '30-45 mins',
    minimumOrder: 200
  }
};

// Map store names/tags to hour patterns
function getHourPattern(store) {
  const name = (store.name || '').toLowerCase();
  const tags = (store.tags || []).map(t => t.toLowerCase());

  // Cafes
  if (name.includes('starbucks') || name.includes('cafe') || name.includes('bakehouse') ||
      name.includes('bakery') || name.includes('corner house') || name.includes('baskin') ||
      name.includes('theobroma') || tags.includes('cafe') || tags.includes('coffee')) {
    return HOUR_PATTERNS.cafe;
  }

  // Restaurants and food
  if (name.includes('kfc') || name.includes('mcdonald') || name.includes('domino') ||
      name.includes('pizza') || name.includes('biryani') || name.includes('restaurant') ||
      name.includes('barbeque') || name.includes('empire') || name.includes('box8') ||
      name.includes('chaat') || name.includes('vada pav') || name.includes('seafood') ||
      tags.includes('restaurant') || tags.includes('food')) {
    return HOUR_PATTERNS.restaurant;
  }

  // Grocery and supermarkets
  if (name.includes('mart') || name.includes('spar') || name.includes('reliance smart') ||
      name.includes('provision') || name.includes('namdharis') || name.includes('nandini') ||
      name.includes('daily needs') || tags.includes('grocery') || tags.includes('supermarket')) {
    return HOUR_PATTERNS.grocery;
  }

  // Salons and beauty
  if (name.includes('salon') || name.includes('beauty') || name.includes('spa') ||
      name.includes('lakme') || name.includes('naturals') || name.includes('ylg') ||
      name.includes('glow') || name.includes('nail') || name.includes('grooming') ||
      tags.includes('salon') || tags.includes('beauty')) {
    return HOUR_PATTERNS.salon;
  }

  // Pharmacy and healthcare
  if (name.includes('pharmacy') || name.includes('apollo') || name.includes('medplus') ||
      name.includes('wellness') || name.includes('clinic') || name.includes('hospital') ||
      name.includes('dental') || name.includes('opticals') || name.includes('thyrocare') ||
      tags.includes('pharmacy') || tags.includes('healthcare')) {
    return HOUR_PATTERNS.pharmacy;
  }

  // Retail and fashion
  if (name.includes('lifestyle') || name.includes('central') || name.includes('bata') ||
      name.includes('metro shoes') || name.includes('puma') || name.includes('tanishq') ||
      name.includes('caratlane') || name.includes('bag') || name.includes('watch') ||
      name.includes('croma') || name.includes('reliance digital') || name.includes('sangeetha') ||
      tags.includes('retail') || tags.includes('fashion') || tags.includes('electronics')) {
    return HOUR_PATTERNS.retail;
  }

  // Fitness
  if (name.includes('gym') || name.includes('cult') || name.includes('f45') ||
      name.includes('fitness') || name.includes('yoga') || name.includes('zumba') ||
      name.includes('martial') || name.includes('sports academy') ||
      tags.includes('fitness') || tags.includes('gym')) {
    return HOUR_PATTERNS.fitness;
  }

  // Services
  if (name.includes('urban company') || name.includes('hicare') || name.includes('dryclean') ||
      name.includes('plumber') || name.includes('electrical') || name.includes('clean') ||
      name.includes('packers') || name.includes('tutor') || name.includes('travels') ||
      name.includes('cab') || name.includes('broadband') || name.includes('fibernet') ||
      tags.includes('services') || tags.includes('home-services')) {
    return HOUR_PATTERNS.services;
  }

  return HOUR_PATTERNS.default;
}

async function migrateStoreHours() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const db = client.db(DB_NAME);
    const storesCollection = db.collection('stores');

    const stores = await storesCollection.find({}).toArray();
    console.log(`📊 Found ${stores.length} stores to update\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const store of stores) {
      const pattern = getHourPattern(store);

      try {
        const updateResult = await storesCollection.updateOne(
          { _id: store._id },
          {
            $set: {
              'operationalInfo': {
                hours: pattern.hours,
                deliveryTime: pattern.deliveryTime,
                minimumOrder: pattern.minimumOrder
              }
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          updatedCount++;
          const patternName = Object.keys(HOUR_PATTERNS).find(
            key => HOUR_PATTERNS[key] === pattern
          ) || 'default';
          console.log(`✅ ${store.name} -> ${patternName} hours`);
        } else {
          console.log(`⚠️  No change: ${store.name}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating ${store.name}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total stores: ${stores.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Verify Starbucks
    console.log('\n📋 VERIFICATION - Starbucks:');
    console.log('='.repeat(60));
    const starbucks = await storesCollection.findOne({ name: 'Starbucks' });
    if (starbucks) {
      console.log('operationalInfo:', JSON.stringify(starbucks.operationalInfo, null, 2));
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

migrateStoreHours();
