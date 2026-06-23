require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Event Schema (simplified for seeding)
const EventSlotSchema = new mongoose.Schema({
  id: { type: String, required: true },
  time: { type: String, required: true },
  available: { type: Boolean, default: true },
  maxCapacity: { type: Number, required: true },
  bookedCount: { type: Number, default: 0 }
}, { _id: false });

const EventLocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  country: { type: String, default: 'India' },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  isOnline: { type: Boolean, default: false },
  meetingUrl: { type: String }
}, { _id: false });

const EventOrganizerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  website: { type: String },
  description: { type: String },
  logo: { type: String }
}, { _id: false });

const EventPriceSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  currency: { type: String, default: '₹' },
  isFree: { type: Boolean, default: false },
  originalPrice: { type: Number },
  discount: { type: Number }
}, { _id: false });

const EventAnalyticsSchema = new mongoose.Schema({
  views: { type: Number, default: 0 },
  bookings: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  lastViewed: { type: Date }
}, { _id: false });

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  subtitle: { type: String, trim: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 2000 },
  image: { type: String, required: true },
  images: [{ type: String }],
  price: { type: EventPriceSchema, required: true },
  location: { type: EventLocationSchema, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  endTime: { type: String },
  category: { type: String, required: true },
  subcategory: { type: String },
  organizer: { type: EventOrganizerSchema, required: true },
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', index: true },
  isOnline: { type: Boolean, default: false },
  registrationRequired: { type: Boolean, default: true },
  bookingUrl: { type: String },
  availableSlots: [EventSlotSchema],
  status: { type: String, enum: ['draft', 'published', 'cancelled', 'completed', 'sold_out'], default: 'draft' },
  tags: [{ type: String }],
  maxCapacity: { type: Number },
  minAge: { type: Number },
  requirements: [{ type: String }],
  includes: [{ type: String }],
  refundPolicy: { type: String },
  cancellationPolicy: { type: String },
  analytics: { type: EventAnalyticsSchema, default: () => ({}) },
  featured: { type: Boolean, default: false },
  priority: { type: Number, default: 0 },
  publishedAt: { type: Date },
  expiresAt: { type: Date }
}, { timestamps: true });

const Event = mongoose.model('Event', EventSchema);
const Merchant = mongoose.model('Merchant', new mongoose.Schema({}, { strict: false }));

// Helper function to get future dates
function getFutureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
}

// Sample events template with merchant integration
async function createEventsForMerchants() {
  try {
    console.log('🌱 Starting event seeding with merchant integration...');
    
    // Connect to database
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB database:', DB_NAME);

    // Get some merchants from database
    const merchants = await Merchant.find({ isActive: true }).limit(10).lean();
    console.log(`📊 Found ${merchants.length} active merchants`);

    if (merchants.length === 0) {
      console.log('⚠️  No merchants found. Creating events without merchant references...');
    }

    // Clear existing events
    await Event.deleteMany({});
    console.log('🗑️  Cleared existing events');

    // Create events array
    const eventsToCreate = [
      {
        title: 'Art of Living - Happiness Program',
        subtitle: 'Free • Online',
        description: 'Transform your life with ancient wisdom and modern techniques. Learn breathing exercises, meditation, and stress management in this comprehensive wellness program.',
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=200&fit=crop',
        price: { amount: 0, currency: '₹', isFree: true },
        location: {
          name: 'Online Event',
          address: 'Online',
          city: 'Online',
          isOnline: true,
          meetingUrl: 'https://zoom.us/j/123456789'
        },
        date: getFutureDate(7),
        time: '7:00 PM',
        endTime: '9:00 PM',
        category: 'Wellness',
        organizer: {
          name: 'Art of Living Foundation',
          email: 'contact@artofliving.org',
          phone: '+91-9876543210',
          website: 'https://www.artofliving.org',
          description: 'Leading organization in wellness and meditation'
        },
        merchantId: merchants[0]?._id,
        isOnline: true,
        registrationRequired: true,
        bookingUrl: 'https://www.artofliving.org/register',
        status: 'published',
        tags: ['wellness', 'meditation', 'breathing', 'stress-relief', 'online'],
        featured: true,
        priority: 1,
        maxCapacity: 1000,
        includes: ['Live session', 'Recording access', 'Materials'],
        publishedAt: new Date(),
        analytics: { views: 245, bookings: 89, shares: 12, favorites: 34 }
      },
      {
        title: 'Music Concert - Classical Night',
        subtitle: '₹299 • Venue',
        description: 'An evening of classical music by renowned artists. Experience the beauty of Indian classical music in the historic Bangalore Palace.',
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop',
        price: { amount: 299, currency: '₹', isFree: false, originalPrice: 399, discount: 25 },
        location: {
          name: 'Bangalore Palace',
          address: 'Palace Road, Vasanth Nagar',
          city: 'Bangalore',
          state: 'Karnataka',
          coordinates: { lat: 12.9981, lng: 77.5925 },
          isOnline: false
        },
        date: getFutureDate(14),
        time: '6:30 PM',
        endTime: '10:00 PM',
        category: 'Music',
        organizer: {
          name: 'Cultural Events Bangalore',
          email: 'info@culturalbangalore.com',
          phone: '+91-9876543211',
          website: 'https://www.culturalbangalore.com',
          description: 'Promoting classical arts and culture'
        },
        merchantId: merchants[1]?._id,
        isOnline: false,
        registrationRequired: true,
        status: 'published',
        tags: ['classical', 'music', 'concert', 'cultural', 'bangalore'],
        featured: true,
        priority: 2,
        maxCapacity: 200,
        availableSlots: [
          { id: 'slot1', time: '6:30 PM', available: true, maxCapacity: 200, bookedCount: 45 },
          { id: 'slot2', time: '8:00 PM', available: true, maxCapacity: 200, bookedCount: 120 }
        ],
        includes: ['Concert ticket', 'Parking', 'Refreshments'],
        publishedAt: new Date(),
        analytics: { views: 189, bookings: 67, shares: 8, favorites: 23 }
      },
      {
        title: 'Tech Meetup - AI Revolution',
        subtitle: 'Free • Venue',
        description: 'Latest trends in AI and machine learning. Join industry experts and tech enthusiasts for discussions on AI innovations and networking.',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop',
        price: { amount: 0, currency: '₹', isFree: true },
        location: {
          name: 'Tech Park, Whitefield',
          address: 'ITPL Main Road, Whitefield',
          city: 'Bangalore',
          state: 'Karnataka',
          coordinates: { lat: 12.9698, lng: 77.7500 },
          isOnline: false
        },
        date: getFutureDate(21),
        time: '10:00 AM',
        endTime: '5:00 PM',
        category: 'Technology',
        organizer: {
          name: 'Bangalore Tech Community',
          email: 'contact@bangaloretech.com',
          phone: '+91-9876543212',
          website: 'https://www.bangaloretech.com',
          description: 'Leading tech community in Bangalore'
        },
        merchantId: merchants[2]?._id,
        isOnline: false,
        registrationRequired: true,
        status: 'published',
        tags: ['ai', 'machine-learning', 'tech', 'networking', 'innovation'],
        featured: true,
        priority: 3,
        maxCapacity: 150,
        availableSlots: [
          { id: 'slot1', time: '10:00 AM', available: true, maxCapacity: 150, bookedCount: 85 },
          { id: 'slot2', time: '2:00 PM', available: true, maxCapacity: 150, bookedCount: 52 }
        ],
        includes: ['Lunch', 'Networking session', 'Goodie bag'],
        publishedAt: new Date(),
        analytics: { views: 156, bookings: 43, shares: 15, favorites: 18 }
      },
      {
        title: 'Yoga Workshop - Mindful Living',
        subtitle: '₹199 • Venue',
        description: 'Learn the art of mindful living through yoga, meditation, and breathing techniques. Perfect for beginners and experienced practitioners.',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
        price: { amount: 199, currency: '₹', isFree: false, originalPrice: 299, discount: 33 },
        location: {
          name: 'Lalbagh Botanical Garden',
          address: 'Lalbagh Main Road, Lalbagh',
          city: 'Bangalore',
          state: 'Karnataka',
          coordinates: { lat: 12.9507, lng: 77.5848 },
          isOnline: false
        },
        date: getFutureDate(28),
        time: '6:00 AM',
        endTime: '8:00 AM',
        category: 'Wellness',
        organizer: {
          name: 'Mindful Living Center',
          email: 'info@mindfulliving.com',
          phone: '+91-9876543213',
          website: 'https://www.mindfulliving.com',
          description: 'Promoting wellness and mindful living'
        },
        merchantId: merchants[3]?._id,
        isOnline: false,
        registrationRequired: true,
        status: 'published',
        tags: ['yoga', 'meditation', 'wellness', 'mindfulness', 'nature'],
        featured: false,
        priority: 4,
        maxCapacity: 50,
        availableSlots: [
          { id: 'slot1', time: '6:00 AM', available: true, maxCapacity: 50, bookedCount: 23 },
          { id: 'slot2', time: '7:00 AM', available: true, maxCapacity: 50, bookedCount: 15 }
        ],
        includes: ['Yoga mat', 'Herbal tea', 'Certificate'],
        publishedAt: new Date(),
        analytics: { views: 98, bookings: 28, shares: 6, favorites: 12 }
      },
      {
        title: 'Startup Pitch Competition',
        subtitle: 'Free • Online',
        description: 'Showcase your innovative startup ideas to a panel of investors and industry experts. Win prizes and get funding opportunities.',
        image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=200&fit=crop',
        price: { amount: 0, currency: '₹', isFree: true },
        location: {
          name: 'Online Event',
          address: 'Online',
          city: 'Online',
          isOnline: true,
          meetingUrl: 'https://zoom.us/j/987654321'
        },
        date: getFutureDate(35),
        time: '2:00 PM',
        endTime: '6:00 PM',
        category: 'Business',
        organizer: {
          name: 'Startup India Foundation',
          email: 'contact@startupindia.org',
          phone: '+91-9876543214',
          website: 'https://www.startupindia.org',
          description: 'Supporting Indian startups and entrepreneurs'
        },
        merchantId: merchants[4]?._id,
        isOnline: true,
        registrationRequired: true,
        bookingUrl: 'https://www.startupindia.org/pitch-competition',
        status: 'published',
        tags: ['startup', 'pitch', 'funding', 'entrepreneurship', 'innovation'],
        featured: true,
        priority: 5,
        maxCapacity: 500,
        includes: ['Pitch session', 'Networking', 'Mentorship'],
        publishedAt: new Date(),
        analytics: { views: 312, bookings: 156, shares: 24, favorites: 67 }
      },
      {
        title: 'Food Festival - Street Food Fiesta',
        subtitle: '₹199 • Food Court',
        description: 'Experience the best street food from across India. Over 50 food stalls, live music, and cultural performances.',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=200&fit=crop',
        price: { amount: 199, currency: '₹', isFree: false },
        location: {
          name: 'Cubbon Park',
          address: 'Kasturba Road, Cubbon Park',
          city: 'Bangalore',
          state: 'Karnataka',
          coordinates: { lat: 12.9716, lng: 77.5946 },
          isOnline: false
        },
        date: getFutureDate(10),
        time: '5:00 PM',
        endTime: '11:00 PM',
        category: 'Food',
        organizer: {
          name: 'Food Lovers Association',
          email: 'info@foodlovers.com',
          phone: '+91-9876543215',
          website: 'https://www.foodlovers.com',
          description: 'Bringing food lovers together'
        },
        merchantId: merchants[5]?._id,
        isOnline: false,
        registrationRequired: true,
        status: 'published',
        tags: ['food', 'festival', 'street-food', 'cultural', 'bangalore'],
        featured: true,
        priority: 6,
        maxCapacity: 500,
        includes: ['Entry ticket', 'Food coupons worth ₹100', 'Goodie bag'],
        publishedAt: new Date(),
        analytics: { views: 456, bookings: 234, shares: 34, favorites: 89 }
      }
    ];

    // Insert events
    const events = await Event.insertMany(eventsToCreate);
    console.log(`✅ Inserted ${events.length} events`);

    // Log inserted events with merchant info
    events.forEach((event, index) => {
      const merchantInfo = event.merchantId ? ` (Merchant: ${event.merchantId})` : ' (No merchant)';
      console.log(`${index + 1}. ${event.title} - ${event.category} - ${event.status}${merchantInfo}`);
    });

    console.log('\n🎉 Event seeding completed successfully!');
    console.log(`📊 Total events created: ${events.length}`);
    console.log(`🏪 Events linked to merchants: ${events.filter(e => e.merchantId).length}`);
    
  } catch (error) {
    console.error('❌ Error seeding events:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run seeding
createEventsForMerchants()
  .then(() => {
    console.log('✅ Seeding process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding process failed:', error);
    process.exit(1);
  });

