import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Event } from '../models';

// Generate future dates (starting from today + days)
const getFutureDate = (daysFromNow: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const sampleEvents = [
  // ===== ENTERTAINMENT CATEGORY (for Movies, Parks, Gaming) =====

  // Movies (Entertainment)
  {
    title: 'Avengers: Secret Wars - Premier Show',
    subtitle: '₹349 • PVR Cinemas',
    description: 'Experience the epic conclusion to the Marvel multiverse saga on the big screen. Book your premier show tickets now and be among the first to witness the spectacle!',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=200&fit=crop',
    price: {
      amount: 349,
      currency: '₹',
      isFree: false,
      originalPrice: 449,
      discount: 22
    },
    location: {
      name: 'PVR Cinemas, Phoenix Mall',
      address: 'Phoenix Marketcity, Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.9969, lng: 77.6970 },
      isOnline: false
    },
    date: getFutureDate(3),
    time: '7:00 PM',
    endTime: '10:30 PM',
    category: 'Entertainment',
    subcategory: 'Movies',
    organizer: {
      name: 'PVR Cinemas',
      email: 'bookings@pvrcinemas.com',
      phone: '+91-9876543001',
      website: 'https://www.pvrcinemas.com',
      description: 'India\'s largest cinema chain'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['movies', 'marvel', 'premier', 'avengers', 'blockbuster'],
    featured: true,
    priority: 1,
    maxCapacity: 300,
    availableSlots: [
      { id: 'slot1', time: '4:00 PM', available: true, maxCapacity: 300, bookedCount: 89 },
      { id: 'slot2', time: '7:00 PM', available: true, maxCapacity: 300, bookedCount: 156 },
      { id: 'slot3', time: '10:00 PM', available: true, maxCapacity: 300, bookedCount: 45 }
    ],
    includes: ['Movie ticket', 'Popcorn combo', 'Reserved seating'],
    publishedAt: new Date(),
    analytics: { views: 1245, bookings: 389, shares: 67, favorites: 234 }
  },
  {
    title: 'Avatar 3 - IMAX 3D Experience',
    subtitle: '₹599 • INOX',
    description: 'Dive back into the world of Pandora with the most immersive IMAX 3D experience. Feel the magic of James Cameron\'s visual masterpiece.',
    image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=200&fit=crop',
    price: {
      amount: 599,
      currency: '₹',
      isFree: false,
      originalPrice: 799,
      discount: 25
    },
    location: {
      name: 'INOX IMAX, Garuda Mall',
      address: 'Garuda Mall, Magrath Road',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.9704, lng: 77.6099 },
      isOnline: false
    },
    date: getFutureDate(5),
    time: '6:30 PM',
    endTime: '10:00 PM',
    category: 'Entertainment',
    subcategory: 'Movies',
    organizer: {
      name: 'INOX Cinemas',
      email: 'support@inoxmovies.com',
      phone: '+91-9876543002',
      website: 'https://www.inoxmovies.com',
      description: 'Premium cinema experience'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['movies', 'avatar', 'imax', '3d', 'blockbuster'],
    featured: true,
    priority: 2,
    maxCapacity: 200,
    availableSlots: [
      { id: 'slot1', time: '3:30 PM', available: true, maxCapacity: 200, bookedCount: 78 },
      { id: 'slot2', time: '6:30 PM', available: true, maxCapacity: 200, bookedCount: 145 }
    ],
    includes: ['IMAX ticket', '3D glasses', 'Premium seating'],
    publishedAt: new Date(),
    analytics: { views: 987, bookings: 267, shares: 45, favorites: 189 }
  },

  // Parks (Entertainment)
  {
    title: 'Wonderla Day Pass - Weekend Special',
    subtitle: '₹1,299 • Theme Park',
    description: 'Experience thrilling rides, water parks, and entertainment at India\'s favorite amusement park. Special weekend rates with unlimited access to all attractions!',
    image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400&h=200&fit=crop',
    price: {
      amount: 1299,
      currency: '₹',
      isFree: false,
      originalPrice: 1599,
      discount: 19
    },
    location: {
      name: 'Wonderla Amusement Park',
      address: '28th KM, Mysore Road',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.8340, lng: 77.4010 },
      isOnline: false
    },
    date: getFutureDate(7),
    time: '10:30 AM',
    endTime: '7:00 PM',
    category: 'Entertainment',
    subcategory: 'Parks',
    organizer: {
      name: 'Wonderla Holidays',
      email: 'bookings@wonderla.com',
      phone: '+91-9876543003',
      website: 'https://www.wonderla.com',
      description: 'India\'s largest amusement park chain'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['parks', 'wonderla', 'theme-park', 'rides', 'water-park'],
    featured: true,
    priority: 3,
    maxCapacity: 5000,
    includes: ['All rides access', 'Water park entry', 'Locker facility'],
    publishedAt: new Date(),
    analytics: { views: 2345, bookings: 678, shares: 123, favorites: 456 }
  },
  {
    title: 'Imagica - Full Day Adventure',
    subtitle: '₹1,499 • Theme Park',
    description: 'Step into a world of fantasy and adventure at Imagica. Experience world-class rides, shows, and entertainment for the whole family.',
    image: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?w=400&h=200&fit=crop',
    price: {
      amount: 1499,
      currency: '₹',
      isFree: false,
      originalPrice: 1899,
      discount: 21
    },
    location: {
      name: 'Adlabs Imagica',
      address: 'Sangdewadi, Khopoli',
      city: 'Mumbai',
      state: 'Maharashtra',
      coordinates: { lat: 18.7557, lng: 73.2858 },
      isOnline: false
    },
    date: getFutureDate(10),
    time: '10:00 AM',
    endTime: '8:00 PM',
    category: 'Entertainment',
    subcategory: 'Parks',
    organizer: {
      name: 'Adlabs Entertainment',
      email: 'info@imagica.com',
      phone: '+91-9876543004',
      website: 'https://www.imagica.com',
      description: 'India\'s international standard theme park'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['parks', 'imagica', 'theme-park', 'adventure', 'family'],
    featured: false,
    priority: 4,
    maxCapacity: 10000,
    includes: ['Theme park entry', 'All attractions', 'Live shows'],
    publishedAt: new Date(),
    analytics: { views: 1567, bookings: 423, shares: 89, favorites: 312 }
  },

  // Gaming (Entertainment)
  {
    title: 'BGMI Championship 2025',
    subtitle: '₹199 • Gaming Tournament',
    description: 'Compete in India\'s biggest BGMI tournament! Show off your skills, win exciting prizes, and prove you\'re the ultimate battle royale champion.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=200&fit=crop',
    price: {
      amount: 199,
      currency: '₹',
      isFree: false
    },
    location: {
      name: 'Gaming Arena, Indiranagar',
      address: '100 Feet Road, Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.9784, lng: 77.6408 },
      isOnline: false
    },
    date: getFutureDate(14),
    time: '11:00 AM',
    endTime: '8:00 PM',
    category: 'Entertainment',
    subcategory: 'Gaming',
    organizer: {
      name: 'ESports India',
      email: 'tournaments@esportsindia.com',
      phone: '+91-9876543005',
      website: 'https://www.esportsindia.com',
      description: 'India\'s premier esports organization'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['gaming', 'bgmi', 'esports', 'tournament', 'pubg'],
    featured: true,
    priority: 5,
    maxCapacity: 256,
    includes: ['Tournament entry', 'Gaming peripherals', 'Refreshments'],
    publishedAt: new Date(),
    analytics: { views: 3456, bookings: 234, shares: 178, favorites: 567 }
  },
  {
    title: 'VR Gaming Experience - Premium',
    subtitle: '₹499 • Virtual Reality',
    description: 'Step into virtual worlds with our premium VR gaming experience. Featuring the latest Oculus Quest and HTC Vive setups with 50+ game titles.',
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=400&h=200&fit=crop',
    price: {
      amount: 499,
      currency: '₹',
      isFree: false,
      originalPrice: 699,
      discount: 29
    },
    location: {
      name: 'VR Zone, Koramangala',
      address: '80 Feet Road, Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.9352, lng: 77.6245 },
      isOnline: false
    },
    date: getFutureDate(2),
    time: '12:00 PM',
    endTime: '9:00 PM',
    category: 'Entertainment',
    subcategory: 'Gaming',
    organizer: {
      name: 'VR Zone India',
      email: 'book@vrzoneindia.com',
      phone: '+91-9876543006',
      website: 'https://www.vrzoneindia.com',
      description: 'Premium VR gaming centers'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['gaming', 'vr', 'virtual-reality', 'experience', 'oculus'],
    featured: false,
    priority: 6,
    maxCapacity: 20,
    availableSlots: [
      { id: 'slot1', time: '12:00 PM', available: true, maxCapacity: 10, bookedCount: 3 },
      { id: 'slot2', time: '3:00 PM', available: true, maxCapacity: 10, bookedCount: 7 },
      { id: 'slot3', time: '6:00 PM', available: true, maxCapacity: 10, bookedCount: 5 }
    ],
    includes: ['1 hour VR session', 'Game selection', 'Instructor support'],
    publishedAt: new Date(),
    analytics: { views: 876, bookings: 156, shares: 34, favorites: 123 }
  },

  // ===== MUSIC CATEGORY (for Concerts) =====
  {
    title: 'Coldplay Live in India 2025',
    subtitle: '₹4,999 • Stadium Concert',
    description: 'Experience the magic of Coldplay live! Their Music of the Spheres World Tour comes to India with spectacular visuals and unforgettable performances.',
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=200&fit=crop',
    price: {
      amount: 4999,
      currency: '₹',
      isFree: false,
      originalPrice: 5999,
      discount: 17
    },
    location: {
      name: 'DY Patil Stadium',
      address: 'DY Patil Sports Stadium, Nerul',
      city: 'Mumbai',
      state: 'Maharashtra',
      coordinates: { lat: 19.0450, lng: 73.0292 },
      isOnline: false
    },
    date: getFutureDate(30),
    time: '6:00 PM',
    endTime: '11:00 PM',
    category: 'Music',
    subcategory: 'Concert',
    organizer: {
      name: 'BookMyShow Live',
      email: 'events@bookmyshow.com',
      phone: '+91-9876543007',
      website: 'https://www.bookmyshow.com',
      description: 'India\'s largest entertainment platform'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['concert', 'coldplay', 'music', 'live', 'international'],
    featured: true,
    priority: 1,
    maxCapacity: 50000,
    availableSlots: [
      { id: 'standing', time: 'Standing', available: true, maxCapacity: 30000, bookedCount: 25000 },
      { id: 'gold', time: 'Gold Seating', available: true, maxCapacity: 15000, bookedCount: 12000 },
      { id: 'platinum', time: 'Platinum', available: true, maxCapacity: 5000, bookedCount: 4500 }
    ],
    includes: ['Concert entry', 'Free merchandise', 'Food voucher'],
    publishedAt: new Date(),
    analytics: { views: 156789, bookings: 41500, shares: 8900, favorites: 34567 }
  },
  {
    title: 'Arijit Singh Live Concert',
    subtitle: '₹2,499 • Live Music',
    description: 'The voice of romance performs live! Join us for an enchanting evening with Arijit Singh as he performs his greatest hits.',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=200&fit=crop',
    price: {
      amount: 2499,
      currency: '₹',
      isFree: false,
      originalPrice: 2999,
      discount: 17
    },
    location: {
      name: 'MMRDA Grounds',
      address: 'BKC, Bandra East',
      city: 'Mumbai',
      state: 'Maharashtra',
      coordinates: { lat: 19.0607, lng: 72.8691 },
      isOnline: false
    },
    date: getFutureDate(21),
    time: '7:00 PM',
    endTime: '10:30 PM',
    category: 'Music',
    subcategory: 'Concert',
    organizer: {
      name: 'Insider Events',
      email: 'concerts@insider.in',
      phone: '+91-9876543008',
      website: 'https://www.insider.in',
      description: 'Premium live entertainment'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['concert', 'arijit-singh', 'bollywood', 'music', 'live'],
    featured: true,
    priority: 2,
    maxCapacity: 20000,
    includes: ['Concert entry', 'Seating', 'Parking pass'],
    publishedAt: new Date(),
    analytics: { views: 45678, bookings: 12345, shares: 2345, favorites: 8901 }
  },
  {
    title: 'Classical Music Night at Palace',
    subtitle: '₹799 • Classical Concert',
    description: 'An evening of classical Indian music featuring renowned artists. Experience the beauty of ragas in the historic setting of Bangalore Palace.',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop',
    price: {
      amount: 799,
      currency: '₹',
      isFree: false,
      originalPrice: 999,
      discount: 20
    },
    location: {
      name: 'Bangalore Palace',
      address: 'Palace Road, Vasanth Nagar',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.9981, lng: 77.5925 },
      isOnline: false
    },
    date: getFutureDate(12),
    time: '6:30 PM',
    endTime: '9:30 PM',
    category: 'Music',
    subcategory: 'Classical',
    organizer: {
      name: 'Cultural Events Bangalore',
      email: 'info@culturalbangalore.com',
      phone: '+91-9876543009',
      website: 'https://www.culturalbangalore.com',
      description: 'Promoting classical arts'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['concert', 'classical', 'indian-music', 'cultural', 'palace'],
    featured: false,
    priority: 3,
    maxCapacity: 500,
    includes: ['Concert entry', 'Light refreshments', 'Program booklet'],
    publishedAt: new Date(),
    analytics: { views: 1234, bookings: 345, shares: 67, favorites: 234 }
  },

  // ===== EDUCATION CATEGORY (for Workshops) =====
  {
    title: 'Photography Masterclass',
    subtitle: '₹1,499 • Workshop',
    description: 'Learn professional photography techniques from award-winning photographers. Hands-on training with DSLRs and post-processing skills.',
    image: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=400&h=200&fit=crop',
    price: {
      amount: 1499,
      currency: '₹',
      isFree: false,
      originalPrice: 1999,
      discount: 25
    },
    location: {
      name: 'Creative Hub Studio',
      address: 'HSR Layout, Sector 1',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.9116, lng: 77.6389 },
      isOnline: false
    },
    date: getFutureDate(8),
    time: '10:00 AM',
    endTime: '5:00 PM',
    category: 'Education',
    subcategory: 'Workshop',
    organizer: {
      name: 'Creative Academy',
      email: 'workshops@creativeacademy.in',
      phone: '+91-9876543010',
      website: 'https://www.creativeacademy.in',
      description: 'Creative skills training'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['workshop', 'photography', 'creative', 'learning', 'dslr'],
    featured: true,
    priority: 1,
    maxCapacity: 30,
    includes: ['DSLR camera for practice', 'Lunch', 'Certificate', 'Post-processing software trial'],
    publishedAt: new Date(),
    analytics: { views: 2345, bookings: 234, shares: 78, favorites: 345 }
  },
  {
    title: 'Pottery & Ceramics Workshop',
    subtitle: '₹899 • Hands-on Workshop',
    description: 'Discover the therapeutic art of pottery. Create your own ceramic pieces under expert guidance and take home your handmade creations.',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=200&fit=crop',
    price: {
      amount: 899,
      currency: '₹',
      isFree: false
    },
    location: {
      name: 'Clay Studio',
      address: 'JP Nagar, 6th Phase',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.8891, lng: 77.5850 },
      isOnline: false
    },
    date: getFutureDate(5),
    time: '2:00 PM',
    endTime: '5:00 PM',
    category: 'Education',
    subcategory: 'Workshop',
    organizer: {
      name: 'Clay Studio Bangalore',
      email: 'book@claystudio.in',
      phone: '+91-9876543011',
      website: 'https://www.claystudio.in',
      description: 'Pottery and ceramics studio'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['workshop', 'pottery', 'ceramics', 'art', 'creative'],
    featured: false,
    priority: 2,
    maxCapacity: 15,
    includes: ['All materials', 'Firing of pieces', 'Take home your creation', 'Refreshments'],
    publishedAt: new Date(),
    analytics: { views: 1567, bookings: 156, shares: 45, favorites: 234 }
  },
  {
    title: 'AI & Machine Learning Bootcamp',
    subtitle: 'Free • Tech Workshop',
    description: 'Intensive hands-on bootcamp covering AI fundamentals, Python programming, and machine learning projects. Perfect for beginners!',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop',
    price: {
      amount: 0,
      currency: '₹',
      isFree: true
    },
    location: {
      name: 'Online Event',
      address: 'Online',
      city: 'Online',
      isOnline: true,
      meetingUrl: 'https://zoom.us/j/aibootcamp2025'
    },
    date: getFutureDate(15),
    time: '10:00 AM',
    endTime: '4:00 PM',
    category: 'Education',
    subcategory: 'Workshop',
    organizer: {
      name: 'Tech Academy India',
      email: 'bootcamps@techacademy.in',
      phone: '+91-9876543012',
      website: 'https://www.techacademy.in',
      description: 'Technology education platform'
    },
    isOnline: true,
    registrationRequired: true,
    status: 'published',
    tags: ['workshop', 'ai', 'machine-learning', 'python', 'tech', 'free'],
    featured: true,
    priority: 3,
    maxCapacity: 500,
    includes: ['Live sessions', 'Project files', 'Certificate', 'Community access'],
    publishedAt: new Date(),
    analytics: { views: 8765, bookings: 456, shares: 234, favorites: 678 }
  },

  // ===== SPORTS CATEGORY =====
  {
    title: 'IPL 2025 - RCB vs MI',
    subtitle: '₹1,499 • Cricket',
    description: 'Witness the epic rivalry! Royal Challengers Bangalore take on Mumbai Indians in this electrifying IPL match at the Chinnaswamy Stadium.',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=200&fit=crop',
    price: {
      amount: 1499,
      currency: '₹',
      isFree: false,
      originalPrice: 1999,
      discount: 25
    },
    location: {
      name: 'M. Chinnaswamy Stadium',
      address: 'MG Road, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.9788, lng: 77.5996 },
      isOnline: false
    },
    date: getFutureDate(45),
    time: '7:30 PM',
    endTime: '11:30 PM',
    category: 'Sports',
    subcategory: 'Cricket',
    organizer: {
      name: 'IPL - BCCI',
      email: 'tickets@iplt20.com',
      phone: '+91-9876543013',
      website: 'https://www.iplt20.com',
      description: 'Indian Premier League'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['sports', 'cricket', 'ipl', 'rcb', 'mi', 't20'],
    featured: true,
    priority: 1,
    maxCapacity: 35000,
    availableSlots: [
      { id: 'gallery', time: 'Gallery', available: true, maxCapacity: 20000, bookedCount: 15000 },
      { id: 'pavilion', time: 'Pavilion', available: true, maxCapacity: 10000, bookedCount: 7500 },
      { id: 'corporate', time: 'Corporate Box', available: true, maxCapacity: 5000, bookedCount: 3500 }
    ],
    includes: ['Match ticket', 'Stadium entry', 'Official match program'],
    publishedAt: new Date(),
    analytics: { views: 234567, bookings: 26000, shares: 12345, favorites: 45678 }
  },
  {
    title: 'ISL Football - Bengaluru FC vs Kerala Blasters',
    subtitle: '₹499 • Football',
    description: 'The southern derby is here! Watch Bengaluru FC face Kerala Blasters in this thrilling Indian Super League encounter.',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=200&fit=crop',
    price: {
      amount: 499,
      currency: '₹',
      isFree: false,
      originalPrice: 699,
      discount: 29
    },
    location: {
      name: 'Sree Kanteerava Stadium',
      address: 'Kasturba Road, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.9772, lng: 77.5954 },
      isOnline: false
    },
    date: getFutureDate(25),
    time: '7:30 PM',
    endTime: '10:00 PM',
    category: 'Sports',
    subcategory: 'Football',
    organizer: {
      name: 'Indian Super League',
      email: 'tickets@indiansuperleague.com',
      phone: '+91-9876543014',
      website: 'https://www.indiansuperleague.com',
      description: 'India\'s premier football league'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['sports', 'football', 'isl', 'bengaluru-fc', 'kerala-blasters'],
    featured: true,
    priority: 2,
    maxCapacity: 25000,
    includes: ['Match ticket', 'Fan merchandise voucher', 'Food coupon'],
    publishedAt: new Date(),
    analytics: { views: 34567, bookings: 12345, shares: 2345, favorites: 5678 }
  },
  {
    title: 'Marathon Bangalore 2025',
    subtitle: '₹999 • Running Event',
    description: 'Join thousands of runners in Bangalore\'s biggest marathon! Choose from 5K, 10K, or full marathon categories.',
    image: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=400&h=200&fit=crop',
    price: {
      amount: 999,
      currency: '₹',
      isFree: false
    },
    location: {
      name: 'Cubbon Park',
      address: 'Kasturba Road',
      city: 'Bangalore',
      state: 'Karnataka',
      coordinates: { lat: 12.9763, lng: 77.5929 },
      isOnline: false
    },
    date: getFutureDate(60),
    time: '5:30 AM',
    endTime: '11:00 AM',
    category: 'Sports',
    subcategory: 'Running',
    organizer: {
      name: 'Bangalore Marathon Foundation',
      email: 'register@bangaloremarathon.com',
      phone: '+91-9876543015',
      website: 'https://www.bangaloremarathon.com',
      description: 'Promoting fitness through running'
    },
    isOnline: false,
    registrationRequired: true,
    status: 'published',
    tags: ['sports', 'marathon', 'running', 'fitness', 'health'],
    featured: false,
    priority: 3,
    maxCapacity: 15000,
    availableSlots: [
      { id: '5k', time: '5K Run', available: true, maxCapacity: 5000, bookedCount: 2500 },
      { id: '10k', time: '10K Run', available: true, maxCapacity: 5000, bookedCount: 3500 },
      { id: 'full', time: 'Full Marathon', available: true, maxCapacity: 5000, bookedCount: 1500 }
    ],
    includes: ['Bib number', 'T-shirt', 'Medal', 'Breakfast'],
    publishedAt: new Date(),
    analytics: { views: 23456, bookings: 7500, shares: 3456, favorites: 5678 }
  }
];

async function seedEvents() {
  try {
    console.log('🌱 Starting event seeding...');

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');

    // Clear existing events
    await Event.deleteMany({});
    console.log('🗑️ Cleared existing events');

    // Insert sample events
    const events = await Event.insertMany(sampleEvents);
    console.log(`✅ Inserted ${events.length} events`);

    // Log inserted events by category
    console.log('\n📊 Events by category:');
    const categoryCount: Record<string, number> = {};
    events.forEach((event) => {
      const cat = event.category;
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} events`);
    });

    console.log('\n📝 Event list:');
    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} (${event.category}${event.subcategory ? '/' + event.subcategory : ''}) - ${event.status}`);
    });

    console.log('\n🎉 Event seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding events:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedEvents();
}

export default seedEvents;
