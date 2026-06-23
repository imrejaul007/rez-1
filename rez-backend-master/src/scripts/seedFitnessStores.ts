// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.
// Set MONGODB_URI in your environment before running this script.

/**
 * Seed Fitness & Sports Stores
 * Creates gyms, studios, trainers, and sports stores
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Store } from '../models/Store';
import { Category } from '../models/Category';

dotenv.config();

// Fitness store data
const fitnessStoresData = [
  // ========== GYMS ==========
  {
    name: "Gold's Gym",
    slug: 'golds-gym-bangalore',
    description: 'Premium gym with world-class equipment and expert trainers. State-of-the-art facilities including cardio zone, strength training area, and group fitness studio.',
    logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200',
    banner: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800'],
    tags: ['gym', 'fitness', 'premium', 'weights', 'cardio'],
    categorySlug: 'gyms',
    location: {
      address: '123 Indiranagar 100 Feet Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      coordinates: [77.6410, 12.9716],
      deliveryRadius: 10
    },
    contact: {
      phone: '+919876543210',
      email: 'bangalore@goldsgym.com',
      website: 'https://goldsgym.in'
    },
    ratings: { average: 4.8, count: 342, distribution: { 5: 256, 4: 65, 3: 15, 2: 4, 1: 2 } },
    offers: { cashback: 25, minOrderAmount: 1000, maxCashback: 500, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '05:00', close: '23:00' },
        tuesday: { open: '05:00', close: '23:00' },
        wednesday: { open: '05:00', close: '23:00' },
        thursday: { open: '05:00', close: '23:00' },
        friday: { open: '05:00', close: '23:00' },
        saturday: { open: '06:00', close: '22:00' },
        sunday: { open: '06:00', close: '20:00' }
      },
      paymentMethods: ['card', 'upi', 'wallet', 'bnpl']
    },
    bookingType: 'SERVICE',
    bookingConfig: { enabled: true, requiresAdvanceBooking: false, allowWalkIn: true, slotDuration: 60 },
    serviceTypes: ['gym-membership', 'personal-training', 'group-classes'],
    isActive: true,
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Cult.fit',
    slug: 'cultfit-koramangala',
    description: 'Your one-stop fitness destination. Offering gym, group workouts, yoga, and dance classes. Award-winning fitness centers.',
    logo: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=200',
    banner: ['https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800'],
    tags: ['gym', 'fitness', 'cult', 'group-classes', 'yoga'],
    categorySlug: 'gyms',
    location: {
      address: '456 Koramangala 5th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560095',
      coordinates: [77.6229, 12.9304],
      deliveryRadius: 8
    },
    contact: {
      phone: '+919876543211',
      email: 'koramangala@cultfit.com',
      website: 'https://cult.fit'
    },
    ratings: { average: 4.7, count: 567, distribution: { 5: 398, 4: 120, 3: 35, 2: 10, 1: 4 } },
    offers: { cashback: 30, minOrderAmount: 500, maxCashback: 600, isPartner: true, partnerLevel: 'platinum' },
    operationalInfo: {
      hours: {
        monday: { open: '05:30', close: '22:30' },
        tuesday: { open: '05:30', close: '22:30' },
        wednesday: { open: '05:30', close: '22:30' },
        thursday: { open: '05:30', close: '22:30' },
        friday: { open: '05:30', close: '22:30' },
        saturday: { open: '06:00', close: '21:00' },
        sunday: { open: '06:00', close: '21:00' }
      },
      paymentMethods: ['card', 'upi', 'wallet']
    },
    bookingType: 'SERVICE',
    bookingConfig: { enabled: true, requiresAdvanceBooking: true, allowWalkIn: true, slotDuration: 60 },
    serviceTypes: ['gym-membership', 'hrx-workout', 'yoga', 'dance'],
    isActive: true,
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Anytime Fitness',
    slug: 'anytime-fitness-hsr',
    description: '24/7 gym access with your membership. Modern equipment, clean facilities, and supportive community.',
    logo: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=200',
    banner: ['https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800'],
    tags: ['gym', 'fitness', '24x7', 'weights'],
    categorySlug: 'gyms',
    location: {
      address: '789 HSR Layout Sector 2',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560102',
      coordinates: [77.6389, 12.9116],
      deliveryRadius: 10
    },
    contact: {
      phone: '+919876543212',
      email: 'hsr@anytimefitness.in',
      website: 'https://anytimefitness.co.in'
    },
    ratings: { average: 4.6, count: 234, distribution: { 5: 156, 4: 58, 3: 15, 2: 4, 1: 1 } },
    offers: { cashback: 20, minOrderAmount: 2000, maxCashback: 400, isPartner: true, partnerLevel: 'silver' },
    operationalInfo: {
      hours: {
        monday: { open: '00:00', close: '23:59' },
        tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' },
        saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' }
      },
      paymentMethods: ['card', 'upi', 'wallet', 'bnpl']
    },
    bookingType: 'SERVICE',
    bookingConfig: { enabled: true, requiresAdvanceBooking: false, allowWalkIn: true, slotDuration: 30 },
    serviceTypes: ['gym-membership', 'personal-training'],
    isActive: true,
    isFeatured: false,
    isVerified: true
  },
  {
    name: 'Snap Fitness',
    slug: 'snap-fitness-whitefield',
    description: 'Fast, convenient workouts in a clean, comfortable environment. 24/7 access for members.',
    logo: 'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=200',
    banner: ['https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=800'],
    tags: ['gym', 'fitness', '24x7', 'express'],
    categorySlug: 'gyms',
    location: {
      address: '321 Whitefield Main Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066',
      coordinates: [77.7500, 12.9698],
      deliveryRadius: 12
    },
    contact: { phone: '+919876543213', email: 'whitefield@snapfitness.in' },
    ratings: { average: 4.5, count: 189, distribution: { 5: 120, 4: 50, 3: 15, 2: 3, 1: 1 } },
    offers: { cashback: 18, minOrderAmount: 1500, maxCashback: 350, isPartner: true, partnerLevel: 'silver' },
    operationalInfo: {
      hours: {
        monday: { open: '00:00', close: '23:59' },
        tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' },
        saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' }
      },
      paymentMethods: ['card', 'upi', 'wallet']
    },
    bookingType: 'SERVICE',
    serviceTypes: ['gym-membership', 'personal-training'],
    isActive: true,
    isFeatured: false,
    isVerified: true
  },

  // ========== YOGA STUDIOS ==========
  {
    name: 'Yoga House',
    slug: 'yoga-house-jayanagar',
    description: 'Traditional yoga classes in a serene environment. Experienced instructors teaching Hatha, Vinyasa, and Ashtanga yoga.',
    logo: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=200',
    banner: ['https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800'],
    tags: ['yoga', 'studio', 'fitness', 'meditation', 'wellness'],
    categorySlug: 'studios',
    location: {
      address: '567 Jayanagar 4th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560041',
      coordinates: [77.5816, 12.9279],
      deliveryRadius: 8
    },
    contact: { phone: '+919876543220', email: 'info@yogahouse.in', website: 'https://yogahouse.in' },
    ratings: { average: 4.9, count: 456, distribution: { 5: 398, 4: 45, 3: 10, 2: 2, 1: 1 } },
    offers: { cashback: 35, minOrderAmount: 300, maxCashback: 500, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '05:00', close: '21:00' },
        tuesday: { open: '05:00', close: '21:00' },
        wednesday: { open: '05:00', close: '21:00' },
        thursday: { open: '05:00', close: '21:00' },
        friday: { open: '05:00', close: '21:00' },
        saturday: { open: '06:00', close: '19:00' },
        sunday: { open: '06:00', close: '19:00' }
      },
      paymentMethods: ['card', 'upi', 'wallet', 'cash']
    },
    bookingType: 'SERVICE',
    bookingConfig: { enabled: true, requiresAdvanceBooking: true, allowWalkIn: false, slotDuration: 60 },
    serviceTypes: ['hatha-yoga', 'vinyasa', 'ashtanga', 'meditation'],
    isActive: true,
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'The Yoga Studio',
    slug: 'the-yoga-studio-mg-road',
    description: 'Modern yoga studio offering group and private sessions. Perfect for beginners and advanced practitioners.',
    logo: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=200',
    banner: ['https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=800'],
    tags: ['yoga', 'studio', 'fitness', 'wellness'],
    categorySlug: 'studios',
    location: {
      address: '890 MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.6070, 12.9758],
      deliveryRadius: 10
    },
    contact: { phone: '+919876543221', email: 'hello@theyogastudio.in' },
    ratings: { average: 4.7, count: 289, distribution: { 5: 210, 4: 60, 3: 15, 2: 3, 1: 1 } },
    offers: { cashback: 28, minOrderAmount: 400, maxCashback: 400, isPartner: true, partnerLevel: 'silver' },
    operationalInfo: {
      hours: {
        monday: { open: '06:00', close: '20:00' },
        tuesday: { open: '06:00', close: '20:00' },
        wednesday: { open: '06:00', close: '20:00' },
        thursday: { open: '06:00', close: '20:00' },
        friday: { open: '06:00', close: '20:00' },
        saturday: { open: '07:00', close: '18:00' },
        sunday: { open: '07:00', close: '18:00' }
      },
      paymentMethods: ['card', 'upi', 'wallet']
    },
    bookingType: 'SERVICE',
    bookingConfig: { enabled: true, requiresAdvanceBooking: true, allowWalkIn: true, slotDuration: 75 },
    serviceTypes: ['yoga', 'private-session', 'group-class'],
    isActive: true,
    isFeatured: false,
    isVerified: true
  },
  {
    name: 'Pilates Studio',
    slug: 'pilates-studio-indiranagar',
    description: 'Specialized Pilates studio with reformer machines. Build core strength and flexibility.',
    logo: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=200',
    banner: ['https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800'],
    tags: ['pilates', 'studio', 'fitness', 'core', 'reformer'],
    categorySlug: 'studios',
    location: {
      address: '234 Indiranagar 12th Main',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      coordinates: [77.6400, 12.9784],
      deliveryRadius: 8
    },
    contact: { phone: '+919876543222', email: 'book@pilatesstudio.in' },
    ratings: { average: 4.8, count: 178, distribution: { 5: 140, 4: 30, 3: 6, 2: 1, 1: 1 } },
    offers: { cashback: 25, minOrderAmount: 500, maxCashback: 400, isPartner: true, partnerLevel: 'silver' },
    operationalInfo: {
      hours: {
        monday: { open: '06:00', close: '21:00' },
        tuesday: { open: '06:00', close: '21:00' },
        wednesday: { open: '06:00', close: '21:00' },
        thursday: { open: '06:00', close: '21:00' },
        friday: { open: '06:00', close: '21:00' },
        saturday: { open: '07:00', close: '17:00' },
        sunday: { open: '07:00', close: '17:00' }
      },
      paymentMethods: ['card', 'upi', 'wallet']
    },
    bookingType: 'SERVICE',
    bookingConfig: { enabled: true, requiresAdvanceBooking: true, allowWalkIn: false, slotDuration: 50 },
    serviceTypes: ['pilates-reformer', 'mat-pilates', 'private-session'],
    isActive: true,
    isFeatured: true,
    isVerified: true
  },

  // ========== PERSONAL TRAINERS ==========
  {
    name: 'FitCoach Rahul',
    slug: 'fitcoach-rahul',
    description: 'Certified personal trainer specializing in strength training and body transformation. 10+ years experience.',
    logo: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200',
    banner: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800'],
    tags: ['trainer', 'personal-training', 'fitness', 'strength', 'transformation'],
    categorySlug: 'trainers',
    location: {
      address: 'Available across Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
      deliveryRadius: 20
    },
    contact: { phone: '+919876543230', email: 'rahul@fitcoach.in', whatsapp: '+919876543230' },
    ratings: { average: 4.9, count: 156, distribution: { 5: 140, 4: 14, 3: 2, 2: 0, 1: 0 } },
    offers: { cashback: 20, minOrderAmount: 1000, maxCashback: 500, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '05:00', close: '21:00' },
        tuesday: { open: '05:00', close: '21:00' },
        wednesday: { open: '05:00', close: '21:00' },
        thursday: { open: '05:00', close: '21:00' },
        friday: { open: '05:00', close: '21:00' },
        saturday: { open: '06:00', close: '18:00' },
        sunday: { open: '06:00', close: '14:00' }
      },
      paymentMethods: ['upi', 'wallet', 'cash']
    },
    bookingType: 'CONSULTATION',
    bookingConfig: { enabled: true, requiresAdvanceBooking: true, allowWalkIn: false, slotDuration: 60, advanceBookingDays: 7 },
    serviceTypes: ['personal-training', 'strength-training', 'weight-loss', 'muscle-gain'],
    isActive: true,
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Yoga Instructor Priya',
    slug: 'yoga-instructor-priya',
    description: 'Experienced yoga instructor offering home and online sessions. Specialized in therapeutic yoga.',
    logo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200',
    banner: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800'],
    tags: ['trainer', 'yoga', 'fitness', 'wellness', 'home-session'],
    categorySlug: 'trainers',
    location: {
      address: 'Home visits across Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
      deliveryRadius: 25
    },
    contact: { phone: '+919876543231', email: 'priya@yogawithpriya.in', whatsapp: '+919876543231' },
    ratings: { average: 4.8, count: 234, distribution: { 5: 200, 4: 28, 3: 5, 2: 1, 1: 0 } },
    offers: { cashback: 25, minOrderAmount: 500, maxCashback: 300, isPartner: true, partnerLevel: 'silver' },
    operationalInfo: {
      hours: {
        monday: { open: '05:30', close: '19:00' },
        tuesday: { open: '05:30', close: '19:00' },
        wednesday: { open: '05:30', close: '19:00' },
        thursday: { open: '05:30', close: '19:00' },
        friday: { open: '05:30', close: '19:00' },
        saturday: { open: '06:00', close: '17:00' },
        sunday: { open: '06:00', close: '12:00' }
      },
      paymentMethods: ['upi', 'wallet', 'cash']
    },
    bookingType: 'CONSULTATION',
    bookingConfig: { enabled: true, requiresAdvanceBooking: true, allowWalkIn: false, slotDuration: 60 },
    serviceTypes: ['yoga', 'therapeutic-yoga', 'prenatal-yoga', 'online-session'],
    isActive: true,
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'CrossFit Coach Arjun',
    slug: 'crossfit-coach-arjun',
    description: 'Certified CrossFit Level 2 trainer. Group and personal training available.',
    logo: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=200',
    banner: ['https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800'],
    tags: ['trainer', 'crossfit', 'fitness', 'hiit', 'functional'],
    categorySlug: 'trainers',
    location: {
      address: 'Multiple locations in Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.6200, 12.9400],
      deliveryRadius: 15
    },
    contact: { phone: '+919876543232', email: 'arjun@crossfitbangalore.in' },
    ratings: { average: 4.7, count: 98, distribution: { 5: 78, 4: 15, 3: 4, 2: 1, 1: 0 } },
    offers: { cashback: 18, minOrderAmount: 800, maxCashback: 250, isPartner: true, partnerLevel: 'bronze' },
    operationalInfo: {
      hours: {
        monday: { open: '06:00', close: '20:00' },
        tuesday: { open: '06:00', close: '20:00' },
        wednesday: { open: '06:00', close: '20:00' },
        thursday: { open: '06:00', close: '20:00' },
        friday: { open: '06:00', close: '20:00' },
        saturday: { open: '07:00', close: '16:00' },
        sunday: { closed: true }
      },
      paymentMethods: ['upi', 'wallet']
    },
    bookingType: 'CONSULTATION',
    bookingConfig: { enabled: true, requiresAdvanceBooking: true, allowWalkIn: false, slotDuration: 60 },
    serviceTypes: ['crossfit', 'hiit', 'functional-training'],
    isActive: true,
    isFeatured: false,
    isVerified: true
  },

  // ========== SPORTS STORES ==========
  {
    name: 'Decathlon',
    slug: 'decathlon-marathahalli',
    description: 'Your one-stop sports destination. Quality sports gear, apparel, and equipment at affordable prices.',
    logo: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200',
    banner: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800'],
    tags: ['sports', 'store', 'equipment', 'apparel', 'fitness-gear'],
    categorySlug: 'store',
    location: {
      address: '123 Marathahalli Bridge',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560037',
      coordinates: [77.7010, 12.9591],
      deliveryRadius: 25
    },
    contact: { phone: '+919876543240', email: 'marathahalli@decathlon.in', website: 'https://decathlon.in' },
    ratings: { average: 4.6, count: 890, distribution: { 5: 620, 4: 200, 3: 50, 2: 15, 1: 5 } },
    offers: { cashback: 15, minOrderAmount: 500, maxCashback: 500, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '10:00', close: '21:00' },
        tuesday: { open: '10:00', close: '21:00' },
        wednesday: { open: '10:00', close: '21:00' },
        thursday: { open: '10:00', close: '21:00' },
        friday: { open: '10:00', close: '21:00' },
        saturday: { open: '10:00', close: '21:00' },
        sunday: { open: '10:00', close: '21:00' }
      },
      paymentMethods: ['card', 'upi', 'wallet', 'cash', 'bnpl']
    },
    bookingType: 'RETAIL',
    storeVisitConfig: { enabled: true, features: ['queue_system', 'live_availability'], maxVisitorsPerSlot: 50 },
    hasStorePickup: true,
    isActive: true,
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Nike Store',
    slug: 'nike-store-phoenix',
    description: 'Official Nike store. Premium sportswear, running shoes, and athletic apparel.',
    logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    banner: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'],
    tags: ['sports', 'store', 'nike', 'shoes', 'apparel'],
    categorySlug: 'store',
    location: {
      address: 'Phoenix Marketcity, Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560048',
      coordinates: [77.6970, 12.9969],
      deliveryRadius: 20
    },
    contact: { phone: '+919876543241', email: 'phoenix@nike.in', website: 'https://nike.com/in' },
    ratings: { average: 4.8, count: 456, distribution: { 5: 378, 4: 60, 3: 15, 2: 2, 1: 1 } },
    offers: { cashback: 20, minOrderAmount: 2000, maxCashback: 1000, isPartner: true, partnerLevel: 'platinum' },
    operationalInfo: {
      hours: {
        monday: { open: '10:00', close: '22:00' },
        tuesday: { open: '10:00', close: '22:00' },
        wednesday: { open: '10:00', close: '22:00' },
        thursday: { open: '10:00', close: '22:00' },
        friday: { open: '10:00', close: '22:00' },
        saturday: { open: '10:00', close: '22:00' },
        sunday: { open: '10:00', close: '22:00' }
      },
      paymentMethods: ['card', 'upi', 'wallet', 'bnpl']
    },
    bookingType: 'RETAIL',
    hasStorePickup: true,
    isActive: true,
    isFeatured: true,
    isVerified: true
  },
  {
    name: 'Puma Store',
    slug: 'puma-store-brigade',
    description: 'Official Puma store featuring sportswear, training gear, and lifestyle products.',
    logo: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=200',
    banner: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800'],
    tags: ['sports', 'store', 'puma', 'shoes', 'apparel'],
    categorySlug: 'store',
    location: {
      address: 'Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.6066, 12.9734],
      deliveryRadius: 15
    },
    contact: { phone: '+919876543242', email: 'brigade@puma.in' },
    ratings: { average: 4.5, count: 234, distribution: { 5: 160, 4: 55, 3: 15, 2: 3, 1: 1 } },
    offers: { cashback: 18, minOrderAmount: 1500, maxCashback: 600, isPartner: true, partnerLevel: 'silver' },
    operationalInfo: {
      hours: {
        monday: { open: '10:00', close: '21:00' },
        tuesday: { open: '10:00', close: '21:00' },
        wednesday: { open: '10:00', close: '21:00' },
        thursday: { open: '10:00', close: '21:00' },
        friday: { open: '10:00', close: '21:00' },
        saturday: { open: '10:00', close: '21:30' },
        sunday: { open: '10:00', close: '21:00' }
      },
      paymentMethods: ['card', 'upi', 'wallet']
    },
    bookingType: 'RETAIL',
    hasStorePickup: true,
    isActive: true,
    isFeatured: false,
    isVerified: true
  }
];

// Category slugs to IDs mapping
const categoryMapping: Record<string, string> = {
  'gyms': 'Gyms',
  'studios': 'Fitness Studios',
  'trainers': 'Personal Trainers',
  'store': 'Sports Store'
};

async function seedFitnessStores() {
  console.log('🏋️ Starting Fitness Stores Seeding...\n');

  try {
    const mongoUri = process.env.MONGODB_URI ||
      (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
if (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); };

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find or create fitness category
    let fitnessCategory = await Category.findOne({ slug: 'fitness-sports' });

    if (!fitnessCategory) {
      console.log('📁 Creating Fitness & Sports category...');
      fitnessCategory = await Category.create({
        name: 'Fitness & Sports',
        slug: 'fitness-sports',
        icon: 'fitness-outline',
        description: 'Gyms, studios, trainers, and sports stores',
        isActive: true,
        type: 'going_out',
        sortOrder: 5,
        metadata: { featured: true, color: '#F97316' }
      });
      console.log('✅ Created Fitness & Sports category');
    } else {
      console.log('✅ Fitness & Sports category exists');
    }

    // Step 2: Create subcategories
    const subcategories: Record<string, any> = {};
    const subCategoryData = [
      { name: 'Gyms', slug: 'gyms', icon: '🏋️', order: 1 },
      { name: 'Fitness Studios', slug: 'studios', icon: '🧘', order: 2 },
      { name: 'Personal Trainers', slug: 'trainers', icon: '👨‍🏫', order: 3 },
      { name: 'Sports Store', slug: 'store', icon: '🛒', order: 4 },
      { name: 'Challenges', slug: 'challenges', icon: '🏆', order: 5 },
      { name: 'Nutrition', slug: 'nutrition', icon: '🥗', order: 6 }
    ];

    console.log('\n📁 Creating/finding subcategories...');
    for (const subCat of subCategoryData) {
      // First try to find by slug only (may exist without parent)
      let existingSubCat = await Category.findOne({ slug: subCat.slug });

      if (!existingSubCat) {
        // Create new subcategory
        existingSubCat = await Category.create({
          ...subCat,
          parentCategory: fitnessCategory._id,
          isActive: true,
          type: 'going_out',
          sortOrder: subCat.order
        });
        console.log(`   ✅ Created: ${subCat.name}`);
      } else {
        // Update existing to link to fitness parent if not already
        if (!existingSubCat.parentCategory) {
          await Category.findByIdAndUpdate(existingSubCat._id, {
            parentCategory: fitnessCategory._id
          });
          console.log(`   🔗 Linked: ${subCat.name} to Fitness & Sports`);
        } else {
          console.log(`   ✓ Exists: ${subCat.name}`);
        }
      }
      subcategories[subCat.slug] = existingSubCat;
    }

    // Step 3: Delete existing fitness stores to avoid duplicates
    const fitnessStoreSlugs = fitnessStoresData.map(s => s.slug);
    const deleteResult = await Store.deleteMany({ slug: { $in: fitnessStoreSlugs } });
    console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} existing fitness stores`);

    // Step 4: Seed fitness stores
    console.log('\n🏪 Seeding fitness stores...');
    let createdCount = 0;

    for (const storeData of fitnessStoresData) {
      const { categorySlug, ...rest } = storeData;
      const categoryId = subcategories[categorySlug]?._id || fitnessCategory._id;

      try {
        const store = await Store.create({
          ...rest,
          category: categoryId,
          subCategories: [categoryId],
          analytics: {
            totalOrders: Math.floor(Math.random() * 500) + 100,
            totalRevenue: Math.floor(Math.random() * 500000) + 50000,
            avgOrderValue: Math.floor(Math.random() * 2000) + 500,
            repeatCustomers: Math.floor(Math.random() * 200) + 50,
            followersCount: Math.floor(Math.random() * 1000) + 100
          }
        });
        createdCount++;
        console.log(`   ✅ Created: ${store.name} (${categorySlug})`);
      } catch (err: any) {
        console.error(`   ❌ Error creating ${storeData.name}:`, err.message);
      }
    }

    // Step 5: Final summary
    const totalFitnessStores = await Store.countDocuments({
      category: { $in: Object.values(subcategories).map(c => c._id) }
    });

    const gymsCount = await Store.countDocuments({ category: subcategories['gyms']?._id });
    const studiosCount = await Store.countDocuments({ category: subcategories['studios']?._id });
    const trainersCount = await Store.countDocuments({ category: subcategories['trainers']?._id });
    const storesCount = await Store.countDocuments({ category: subcategories['store']?._id });

    console.log('\n' + '═'.repeat(50));
    console.log('📊 FINAL STATE');
    console.log('═'.repeat(50));
    console.log(`   Total fitness stores: ${totalFitnessStores}`);
    console.log(`   Created: ${createdCount}`);
    console.log('\n   By Category:');
    console.log(`   - Gyms: ${gymsCount}`);
    console.log(`   - Studios: ${studiosCount}`);
    console.log(`   - Trainers: ${trainersCount}`);
    console.log(`   - Sports Stores: ${storesCount}`);
    console.log('═'.repeat(50));

    console.log('\n🎉 Fitness stores seeding completed!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the script
seedFitnessStores()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
