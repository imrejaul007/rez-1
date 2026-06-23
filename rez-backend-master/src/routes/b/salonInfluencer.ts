/**
 * Salon + Influencer routes — REZ-vs-NUQTA migration (Phase 4.6 + 4.7).
 *
 * A single sub-router serves two B-side verticals:
 *
 *   - **Salon** (`/api/b/salon/*`) — discover nearby Bangalore salons,
 *     browse their services, book a slot, list and cancel bookings.
 *   - **Influencer** (`/api/b/influencer/*`) — discover creators, view
 *     brand campaigns they run, follow a creator, join a campaign.
 *
 * The router is mounted twice in `src/routes/b/index.ts` so that the
 * same handler set is reachable under both prefixes.
 *
 * Endpoints
 * ---------
 *   GET    /api/b/salon?area=&service=
 *     Returns the salon catalogue, optionally filtered by area and/or
 *     service category. Response: { salons: Salon[] }
 *
 *   GET    /api/b/salon/:id/services
 *     Returns 4-6 services offered by a single salon.
 *     Response: { services: SalonService[] }
 *
 *   POST   /api/b/salon/book
 *     Body: { salonId, serviceId, slot, stylistId? }.
 *     Response: { booking: SalonBooking }
 *
 *   GET    /api/b/salon/bookings
 *     Returns the authenticated user's bookings, newest first.
 *     Response: { bookings: SalonBooking[] }
 *
 *   POST   /api/b/salon/bookings/:id/cancel
 *     Cancels a booking owned by the authenticated user.
 *     Response: { booking: SalonBooking }
 *
 *   GET    /api/b/influencer?category=
 *     Returns 6-10 mock influencers, optionally filtered by category.
 *     Response: { influencers: Influencer[] }
 *
 *   GET    /api/b/influencer/:id/campaigns
 *     Returns brand campaigns run by a single influencer.
 *     Response: { campaigns: InfluencerCampaign[] }
 *
 *   POST   /api/b/influencer/campaigns/:id/join
 *     Joins a campaign; flips `isJoined` and increments
 *     `participantsCount`. Response: { campaign: InfluencerCampaign }
 *
 *   POST   /api/b/influencer/:id/follow
 *     Toggles follow state. Response: { influencer: Influencer, following: boolean }
 *
 * Persistence: in-memory maps keyed by user id. The contract is the
 * stable surface; the backing store will be swapped for Mongo once the
 * migration is complete.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Three-tier visual price range. Mirrors the frontend `SalonPriceRange`. */
export type SalonPriceRange = '₹' | '₹₹' | '₹₹₹';

/** Lifecycle state for a `SalonBooking`. */
export type SalonBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

/** Categorisation of a salon service. */
export type SalonServiceCategory =
  | 'haircut'
  | 'color'
  | 'spa'
  | 'facial'
  | 'waxing'
  | 'manicure'
  | 'pedicure'
  | 'threading'
  | 'makeup'
  | 'other';

/** A single salon in the discovery feed. */
export interface Salon {
  id: string;
  name: string;
  area: string;
  city: string;
  rating: number;
  reviewCount: number;
  priceRange: SalonPriceRange;
  imageUrl?: string;
  specialties: string[];
  isOpen: boolean;
  nextAvailableSlot?: string;
}

/** A service offered by a salon. */
export interface SalonService {
  id: string;
  salonId: string;
  name: string;
  durationMinutes: number;
  pricePaise: number;
  category: SalonServiceCategory;
}

/** A stylist working at a salon. */
export interface SalonStylist {
  id: string;
  salonId: string;
  name: string;
  rating: number;
  specialties: string[];
}

/** A booking made by the authenticated user against a salon. */
export interface SalonBooking {
  id: string;
  salonId: string;
  serviceId: string;
  stylistId?: string;
  slot: string;
  status: SalonBookingStatus;
  totalPaise: number;
  bookedAt: string;
  userId: string;
}

/** Top-level creator categories. */
export type InfluencerCategory =
  | 'lifestyle'
  | 'food'
  | 'beauty'
  | 'fashion'
  | 'tech'
  | 'fitness'
  | 'travel'
  | 'finance';

/** A creator surfaced in the discovery feed. */
export interface Influencer {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  followerCount: number;
  category: InfluencerCategory;
  bio: string;
  isFollowing: boolean;
  campaignCount: number;
}

/** A brand campaign run by a creator. */
export interface InfluencerCampaign {
  id: string;
  influencerId: string;
  title: string;
  brand: string;
  description: string;
  rewardPaise: number;
  startDate: string;
  endDate: string;
  participantsCount: number;
  isJoined: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRICE_RANGES: ReadonlyArray<SalonPriceRange> = ['₹', '₹₹', '₹₹₹'];
const BOOKING_STATUSES: ReadonlyArray<SalonBookingStatus> = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
];
const SERVICE_CATEGORIES: ReadonlyArray<SalonServiceCategory> = [
  'haircut',
  'color',
  'spa',
  'facial',
  'waxing',
  'manicure',
  'pedicure',
  'threading',
  'makeup',
  'other',
];
const INFLUENCER_CATEGORIES: ReadonlyArray<InfluencerCategory> = [
  'lifestyle',
  'food',
  'beauty',
  'fashion',
  'tech',
  'fitness',
  'travel',
  'finance',
];

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Fixtures — salons
// ---------------------------------------------------------------------------

/**
 * Hardcoded Bangalore-area salons (Lakme, Naturals, Jawed Habib, etc.)
 * covering a mix of areas and price tiers.
 */
const FIXTURE_SALONS: ReadonlyArray<Salon> = [
  {
    id: 'salon-blr-001',
    name: 'Lakme Salon — Koramangala',
    area: 'Koramangala',
    city: 'Bangalore',
    rating: 4.6,
    reviewCount: 1284,
    priceRange: '₹₹₹',
    imageUrl: 'https://images.example.com/salons/lakme-koramangala.jpg',
    specialties: ['Hair Color', 'Keratin', 'Bridal Makeup'],
    isOpen: true,
    nextAvailableSlot: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'salon-blr-002',
    name: 'Naturals — Indiranagar',
    area: 'Indiranagar',
    city: 'Bangalore',
    rating: 4.3,
    reviewCount: 892,
    priceRange: '₹₹',
    specialties: ['Haircut', 'Facial', 'Waxing'],
    isOpen: true,
    nextAvailableSlot: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'salon-blr-003',
    name: 'Jawed Habib — MG Road',
    area: 'MG Road',
    city: 'Bangalore',
    rating: 4.1,
    reviewCount: 612,
    priceRange: '₹₹',
    specialties: ['Haircut', 'Hair Color', 'Beard Styling'],
    isOpen: true,
  },
  {
    id: 'salon-blr-004',
    name: 'Green Trends — HSR Layout',
    area: 'HSR Layout',
    city: 'Bangalore',
    rating: 4.4,
    reviewCount: 1023,
    priceRange: '₹₹',
    specialties: ['Spa', 'Pedicure', 'Manicure'],
    isOpen: true,
    nextAvailableSlot: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'salon-blr-005',
    name: 'BBlunt — Whitefield',
    area: 'Whitefield',
    city: 'Bangalore',
    rating: 4.5,
    reviewCount: 754,
    priceRange: '₹₹₹',
    specialties: ['Balayage', 'Hair Spa', 'Threading'],
    isOpen: false,
  },
  {
    id: 'salon-blr-006',
    name: 'YLG — Jayanagar',
    area: 'Jayanagar',
    city: 'Bangalore',
    rating: 4.0,
    reviewCount: 412,
    priceRange: '₹',
    specialties: ['Haircut', 'Threading', 'Waxing'],
    isOpen: true,
    nextAvailableSlot: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'salon-blr-007',
    name: 'Toni&Guy — UB City',
    area: 'UB City',
    city: 'Bangalore',
    rating: 4.7,
    reviewCount: 1502,
    priceRange: '₹₹₹',
    specialties: ['Hair Color', 'Keratin', 'Bridal'],
    isOpen: true,
  },
  {
    id: 'salon-blr-008',
    name: 'Body Craft — Electronic City',
    area: 'Electronic City',
    city: 'Bangalore',
    rating: 4.2,
    reviewCount: 528,
    priceRange: '₹₹',
    specialties: ['Spa', 'Facial', 'Massage'],
    isOpen: true,
    nextAvailableSlot: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Fixtures — services, stylists, bookings
// ---------------------------------------------------------------------------

/** 4-6 services per salon covering all major categories. */
const FIXTURE_SERVICES: ReadonlyArray<SalonService> = [
  // Lakme Koramangala
  { id: 'svc-lakme-1', salonId: 'salon-blr-001', name: 'Classic Haircut', durationMinutes: 45, pricePaise: 60_000, category: 'haircut' },
  { id: 'svc-lakme-2', salonId: 'salon-blr-001', name: 'Global Hair Color', durationMinutes: 120, pricePaise: 4_500_00, category: 'color' },
  { id: 'svc-lakme-3', salonId: 'salon-blr-001', name: 'Keratin Treatment', durationMinutes: 180, pricePaise: 7_500_00, category: 'spa' },
  { id: 'svc-lakme-4', salonId: 'salon-blr-001', name: 'Bridal Makeup', durationMinutes: 90, pricePaise: 12_000_00, category: 'makeup' },
  { id: 'svc-lakme-5', salonId: 'salon-blr-001', name: 'Gold Facial', durationMinutes: 60, pricePaise: 1_500_00, category: 'facial' },
  // Naturals Indiranagar
  { id: 'svc-nat-1', salonId: 'salon-blr-002', name: 'Haircut & Style', durationMinutes: 45, pricePaise: 40_000, category: 'haircut' },
  { id: 'svc-nat-2', salonId: 'salon-blr-002', name: 'Hair Spa', durationMinutes: 60, pricePaise: 80_000, category: 'spa' },
  { id: 'svc-nat-3', salonId: 'salon-blr-002', name: 'Cleanup Facial', durationMinutes: 45, pricePaise: 60_000, category: 'facial' },
  { id: 'svc-nat-4', salonId: 'salon-blr-002', name: 'Full Arms Waxing', durationMinutes: 30, pricePaise: 35_000, category: 'waxing' },
  // Jawed Habib MG Road
  { id: 'svc-jh-1', salonId: 'salon-blr-003', name: 'Men\'s Haircut', durationMinutes: 30, pricePaise: 30_000, category: 'haircut' },
  { id: 'svc-jh-2', salonId: 'salon-blr-003', name: 'Beard Styling', durationMinutes: 20, pricePaise: 15_000, category: 'other' },
  { id: 'svc-jh-3', salonId: 'salon-blr-003', name: 'Hair Color (Men)', durationMinutes: 60, pricePaise: 1_200_00, category: 'color' },
  { id: 'svc-jh-4', salonId: 'salon-blr-003', name: 'Threading', durationMinutes: 15, pricePaise: 5_000, category: 'threading' },
  // Green Trends HSR
  { id: 'svc-gt-1', salonId: 'salon-blr-004', name: 'Swedish Massage', durationMinutes: 60, pricePaise: 1_500_00, category: 'spa' },
  { id: 'svc-gt-2', salonId: 'salon-blr-004', name: 'Classic Manicure', durationMinutes: 45, pricePaise: 50_000, category: 'manicure' },
  { id: 'svc-gt-3', salonId: 'salon-blr-004', name: 'Classic Pedicure', durationMinutes: 60, pricePaise: 70_000, category: 'pedicure' },
  { id: 'svc-gt-4', salonId: 'salon-blr-004', name: 'Hair Spa', durationMinutes: 60, pricePaise: 90_000, category: 'spa' },
  { id: 'svc-gt-5', salonId: 'salon-blr-004', name: 'Eyebrow Threading', durationMinutes: 10, pricePaise: 4_000, category: 'threading' },
  // BBlunt Whitefield
  { id: 'svc-bb-1', salonId: 'salon-blr-005', name: 'Balayage Highlights', durationMinutes: 180, pricePaise: 8_000_00, category: 'color' },
  { id: 'svc-bb-2', salonId: 'salon-blr-005', name: 'Olaplex Treatment', durationMinutes: 60, pricePaise: 2_500_00, category: 'spa' },
  { id: 'svc-bb-3', salonId: 'salon-blr-005', name: 'Signature Haircut', durationMinutes: 60, pricePaise: 1_000_00, category: 'haircut' },
  { id: 'svc-bb-4', salonId: 'salon-blr-005', name: 'Express Facial', durationMinutes: 30, pricePaise: 80_000, category: 'facial' },
  // YLG Jayanagar
  { id: 'svc-yg-1', salonId: 'salon-blr-006', name: 'Basic Haircut', durationMinutes: 30, pricePaise: 20_000, category: 'haircut' },
  { id: 'svc-yg-2', salonId: 'salon-blr-006', name: 'Full Body Wax', durationMinutes: 90, pricePaise: 1_200_00, category: 'waxing' },
  { id: 'svc-yg-3', salonId: 'salon-blr-006', name: 'Threading Combo', durationMinutes: 15, pricePaise: 8_000, category: 'threading' },
  { id: 'svc-yg-4', salonId: 'salon-blr-006', name: 'Cleanup', durationMinutes: 30, pricePaise: 40_000, category: 'facial' },
  // Toni&Guy UB City
  { id: 'svc-tg-1', salonId: 'salon-blr-007', name: 'Premium Haircut', durationMinutes: 60, pricePaise: 1_500_00, category: 'haircut' },
  { id: 'svc-tg-2', salonId: 'salon-blr-007', name: 'Full Highlights', durationMinutes: 180, pricePaise: 9_000_00, category: 'color' },
  { id: 'svc-tg-3', salonId: 'salon-blr-007', name: 'Keratin Smoothening', durationMinutes: 240, pricePaise: 12_000_00, category: 'spa' },
  { id: 'svc-tg-4', salonId: 'salon-blr-007', name: 'Bridal Trial', durationMinutes: 120, pricePaise: 5_000_00, category: 'makeup' },
  { id: 'svc-tg-5', salonId: 'salon-blr-007', name: 'Deep Conditioning', durationMinutes: 45, pricePaise: 1_000_00, category: 'spa' },
  // Body Craft Electronic City
  { id: 'svc-bc-1', salonId: 'salon-blr-008', name: 'Aroma Massage', durationMinutes: 75, pricePaise: 1_800_00, category: 'spa' },
  { id: 'svc-bc-2', salonId: 'salon-blr-008', name: 'De-Tan Facial', durationMinutes: 45, pricePaise: 90_000, category: 'facial' },
  { id: 'svc-bc-3', salonId: 'salon-blr-008', name: 'Hot Stone Therapy', durationMinutes: 90, pricePaise: 2_200_00, category: 'spa' },
  { id: 'svc-bc-4', salonId: 'salon-blr-008', name: 'Pedicure & Manicure Combo', durationMinutes: 90, pricePaise: 1_300_00, category: 'manicure' },
];

/** A small set of stylists per salon (used for "request a stylist" UI). */
const FIXTURE_STYLISTS: ReadonlyArray<SalonStylist> = [
  { id: 'sty-lakme-1', salonId: 'salon-blr-001', name: 'Priya N.', rating: 4.8, specialties: ['Balayage', 'Curly Hair'] },
  { id: 'sty-lakme-2', salonId: 'salon-blr-001', name: 'Anjali S.', rating: 4.6, specialties: ['Bridal', 'Makeup'] },
  { id: 'sty-nat-1', salonId: 'salon-blr-002', name: 'Sneha R.', rating: 4.5, specialties: ['Facial', 'Skincare'] },
  { id: 'sty-jh-1', salonId: 'salon-blr-003', name: 'Rakesh M.', rating: 4.4, specialties: ['Men\'s Cuts', 'Beard'] },
  { id: 'sty-gt-1', salonId: 'salon-blr-004', name: 'Kavya P.', rating: 4.7, specialties: ['Manicure', 'Pedicure'] },
  { id: 'sty-bb-1', salonId: 'salon-blr-005', name: 'Meera K.', rating: 4.9, specialties: ['Balayage', 'Color Correction'] },
  { id: 'sty-yg-1', salonId: 'salon-blr-006', name: 'Lakshmi V.', rating: 4.3, specialties: ['Waxing', 'Threading'] },
  { id: 'sty-tg-1', salonId: 'salon-blr-007', name: 'Riya S.', rating: 4.8, specialties: ['Hair Color', 'Keratin'] },
  { id: 'sty-bc-1', salonId: 'salon-blr-008', name: 'Asha J.', rating: 4.5, specialties: ['Massage', 'Spa'] },
];

// ---------------------------------------------------------------------------
// Fixtures — influencers
// ---------------------------------------------------------------------------

/** 8 mock creators across categories. */
const FIXTURE_INFLUENCERS: ReadonlyArray<Influencer> = [
  {
    id: 'inf-1',
    name: 'Aanya Sharma',
    handle: '@aanyas',
    avatarUrl: 'https://images.example.com/influencers/aanya.jpg',
    followerCount: 248_000,
    category: 'lifestyle',
    bio: 'Bangalore-based lifestyle creator sharing city guides and slow living tips.',
    isFollowing: false,
    campaignCount: 12,
  },
  {
    id: 'inf-2',
    name: 'Rahul Verma',
    handle: '@rahulv',
    avatarUrl: 'https://images.example.com/influencers/rahul.jpg',
    followerCount: 1_120_000,
    category: 'food',
    bio: 'Food vlogger covering street eats, cafés, and the best biryani in town.',
    isFollowing: false,
    campaignCount: 24,
  },
  {
    id: 'inf-3',
    name: 'Meera Iyer',
    handle: '@meerabeauty',
    avatarUrl: 'https://images.example.com/influencers/meera.jpg',
    followerCount: 512_000,
    category: 'beauty',
    bio: 'Clean-beauty advocate. Skincare reviews, routine breakdowns, product dupes.',
    isFollowing: false,
    campaignCount: 31,
  },
  {
    id: 'inf-4',
    name: 'Karan Patel',
    handle: '@karanstyles',
    avatarUrl: 'https://images.example.com/influencers/karan.jpg',
    followerCount: 384_000,
    category: 'fashion',
    bio: 'Menswear and street-style creator. Outfit of the day, thrift hauls, lookbooks.',
    isFollowing: false,
    campaignCount: 18,
  },
  {
    id: 'inf-5',
    name: 'Sneha Kapoor',
    handle: '@snehatech',
    avatarUrl: 'https://images.example.com/influencers/sneha.jpg',
    followerCount: 92_000,
    category: 'tech',
    bio: 'Tech reviewer focusing on mid-range phones, smartwatches, and audio gear.',
    isFollowing: false,
    campaignCount: 7,
  },
  {
    id: 'inf-6',
    name: 'Vikram Reddy',
    handle: '@vikfit',
    avatarUrl: 'https://images.example.com/influencers/vikram.jpg',
    followerCount: 198_000,
    category: 'fitness',
    bio: 'Certified trainer. Home workouts, mobility routines, and nutrition basics.',
    isFollowing: false,
    campaignCount: 14,
  },
  {
    id: 'inf-7',
    name: 'Priya Menon',
    handle: '@priyatravels',
    avatarUrl: 'https://images.example.com/influencers/priya.jpg',
    followerCount: 165_000,
    category: 'travel',
    bio: 'Solo travel, weekend getaways, and the best South-India itineraries.',
    isFollowing: false,
    campaignCount: 9,
  },
  {
    id: 'inf-8',
    name: 'Arjun Iyer',
    handle: '@arjunmoney',
    avatarUrl: 'https://images.example.com/influencers/arjun.jpg',
    followerCount: 73_000,
    category: 'finance',
    bio: 'Personal-finance creator. Tax saving, mutual funds, and beginner investing.',
    isFollowing: false,
    campaignCount: 5,
  },
];

/** A pool of brand campaigns spread across influencers. */
const FIXTURE_CAMPAIGNS: ReadonlyArray<InfluencerCampaign> = [
  {
    id: 'camp-1',
    influencerId: 'inf-1',
    title: 'Try the new Lakme Skin Gloss and share your review',
    brand: 'Lakme',
    description: 'Post a 30-second reel reviewing the new Skin Gloss range. Tag @lakme and use #NuqtaGlow.',
    rewardPaise: 50_000,
    startDate: new Date(Date.now() - 3 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 14 * DAY_MS).toISOString(),
    participantsCount: 1284,
    isJoined: false,
  },
  {
    id: 'camp-2',
    influencerId: 'inf-1',
    title: 'Best cafés in Indiranagar — share your favourite',
    brand: 'Third Wave Coffee',
    description: 'Drop a story about your go-to café in Indiranagar. Top picks featured in our next reel.',
    rewardPaise: 20_000,
    startDate: new Date(Date.now() - 1 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 21 * DAY_MS).toISOString(),
    participantsCount: 612,
    isJoined: false,
  },
  {
    id: 'camp-3',
    influencerId: 'inf-2',
    title: 'Biryani bucket-list challenge',
    brand: 'Paradise Biryani',
    description: 'Visit any Paradise outlet, try the new bucket, and post a 15s taste-test reel.',
    rewardPaise: 1_00_000,
    startDate: new Date(Date.now() - 7 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 7 * DAY_MS).toISOString(),
    participantsCount: 2_412,
    isJoined: false,
  },
  {
    id: 'camp-4',
    influencerId: 'inf-3',
    title: 'Plum skincare — 7-day routine challenge',
    brand: 'Plum',
    description: 'Follow the Plum 7-day routine and post a before/after. Top routines win a year of free Plum.',
    rewardPaise: 2_50_000,
    startDate: new Date(Date.now() - 5 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 30 * DAY_MS).toISOString(),
    participantsCount: 3_104,
    isJoined: false,
  },
  {
    id: 'camp-5',
    influencerId: 'inf-4',
    title: 'Street style haul — Zara x Nuqta',
    brand: 'Zara',
    description: 'Buy 2+ items from the new collection, share an OOTD reel, get 100% of your purchase back.',
    rewardPaise: 5_00_000,
    startDate: new Date(Date.now() - 2 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 10 * DAY_MS).toISOString(),
    participantsCount: 512,
    isJoined: false,
  },
  {
    id: 'camp-6',
    influencerId: 'inf-5',
    title: 'OnePlus Nord review — first impressions',
    brand: 'OnePlus',
    description: 'Post an unboxing + first-impressions reel of the new OnePlus Nord. Use #OnePlusOnNuqta.',
    rewardPaise: 1_50_000,
    startDate: new Date(Date.now() - 4 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 12 * DAY_MS).toISOString(),
    participantsCount: 824,
    isJoined: false,
  },
  {
    id: 'camp-7',
    influencerId: 'inf-6',
    title: 'Cultsport — 30-day fitness challenge',
    brand: 'Cultsport',
    description: 'Complete 20 of 30 workouts using the Cultsport app. Earn a 6-month premium pass.',
    rewardPaise: 3_00_000,
    startDate: new Date(Date.now() - 10 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 20 * DAY_MS).toISOString(),
    participantsCount: 1_204,
    isJoined: false,
  },
  {
    id: 'camp-8',
    influencerId: 'inf-7',
    title: 'Coorg weekend itinerary giveaway',
    brand: 'Goibibo',
    description: 'Share your ideal Coorg itinerary. Best entries win a sponsored weekend trip for two.',
    rewardPaise: 7_50_000,
    startDate: new Date(Date.now() - 6 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 18 * DAY_MS).toISOString(),
    participantsCount: 412,
    isJoined: false,
  },
  {
    id: 'camp-9',
    influencerId: 'inf-8',
    title: 'Zerodha — beginner investing clinic',
    brand: 'Zerodha',
    description: 'Attend the live investing clinic and post one key takeaway. Varsity free for 3 months.',
    rewardPaise: 1_00_000,
    startDate: new Date(Date.now() - 8 * DAY_MS).toISOString(),
    endDate: new Date(Date.now() + 25 * DAY_MS).toISOString(),
    participantsCount: 318,
    isJoined: false,
  },
];

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/** Per-user salon booking store, lazily seeded per request. */
const USER_BOOKING_STORE: Map<string, SalonBooking[]> = new Map();

/** Per-user campaign join store, lazily seeded per request. */
const USER_CAMPAIGN_JOIN_STORE: Map<string, Set<string>> = new Map();

/** Per-user follow store (toggled state by influencer id). */
const USER_FOLLOW_STORE: Map<string, Set<string>> = new Map();

/** Read the user's bookings, lazily creating an empty list. */
function readUserBookings(userId: string): SalonBooking[] {
  let existing = USER_BOOKING_STORE.get(userId);
  if (!existing) {
    existing = [];
    USER_BOOKING_STORE.set(userId, existing);
  }
  return existing;
}

function writeUserBookings(userId: string, bookings: SalonBooking[]): void {
  USER_BOOKING_STORE.set(userId, bookings);
}

function readUserFollows(userId: string): Set<string> {
  let existing = USER_FOLLOW_STORE.get(userId);
  if (!existing) {
    existing = new Set<string>();
    USER_FOLLOW_STORE.set(userId, existing);
  }
  return existing;
}

function readUserJoins(userId: string): Set<string> {
  let existing = USER_CAMPAIGN_JOIN_STORE.get(userId);
  if (!existing) {
    existing = new Set<string>();
    USER_CAMPAIGN_JOIN_STORE.set(userId, existing);
  }
  return existing;
}

// ---------------------------------------------------------------------------
// Type-guards
// ---------------------------------------------------------------------------

function isPriceRange(value: unknown): value is SalonPriceRange {
  return (
    typeof value === 'string' &&
    (PRICE_RANGES as ReadonlyArray<string>).includes(value)
  );
}

function isBookingStatus(value: unknown): value is SalonBookingStatus {
  return (
    typeof value === 'string' &&
    (BOOKING_STATUSES as ReadonlyArray<string>).includes(value)
  );
}

function isServiceCategory(value: unknown): value is SalonServiceCategory {
  return (
    typeof value === 'string' &&
    (SERVICE_CATEGORIES as ReadonlyArray<string>).includes(value)
  );
}

function isInfluencerCategory(value: unknown): value is InfluencerCategory {
  return (
    typeof value === 'string' &&
    (INFLUENCER_CATEGORIES as ReadonlyArray<string>).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort extraction of the authenticated user's id.
 *
 * Falls back to `'demo'` if the user is missing or the id field
 * can't be coerced to a non-empty string. The mock data is keyed
 * under this id so a fresh authenticated user sees a clean slate.
 */
function extractUserId(req: { user?: unknown }): string {
  if (typeof req.user !== 'object' || req.user === null) return 'demo';
  const u = req.user as Record<string, unknown>;
  const candidates: unknown[] = [u['id'], u['_id'], u['userId']];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  return 'demo';
}

/** Coerce an unknown value to a non-empty ISO date string (or `null`). */
function safeIsoDateOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/** Coerce an unknown value to a non-negative integer (or `null`). */
function safeNonNegativeIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every salon + influencer endpoint requires authentication. */
router.use(authenticate);

// ---------------------------------------------------------------------------
// Salon endpoints
// ---------------------------------------------------------------------------

/**
 * GET /salon?area=&service=
 *
 * Returns the salon catalogue, optionally filtered by area and service
 * category. The `area` filter is case-insensitive partial match against
 * the `area` field; `service` must be a valid `SalonServiceCategory`.
 */
router.get('/salon', (req, res) => {
  const userId = extractUserId(req);
  const rawArea = req.query['area'];
  const rawService = req.query['service'];

  const areaFilter =
    typeof rawArea === 'string' && rawArea.trim().length > 0
      ? rawArea.trim().toLowerCase()
      : null;

  let serviceFilter: SalonServiceCategory | null = null;
  if (typeof rawService === 'string' && rawService.length > 0) {
    if (!isServiceCategory(rawService)) {
      return bError(res, `Invalid service: ${rawService}`, 400, {
        allowedServices: [...SERVICE_CATEGORIES],
      });
    }
    serviceFilter = rawService;
  }

  // Map of salonId -> true if the salon offers the requested service.
  const matchingServiceSalonIds: Set<string> | null = serviceFilter === null
    ? null
    : new Set(
        FIXTURE_SERVICES.filter((s) => s.category === serviceFilter).map(
          (s) => s.salonId,
        ),
      );

  const filtered = FIXTURE_SALONS.filter((s) => {
    if (areaFilter !== null && !s.area.toLowerCase().includes(areaFilter)) {
      return false;
    }
    if (matchingServiceSalonIds !== null && !matchingServiceSalonIds.has(s.id)) {
      return false;
    }
    return true;
  });

  try {
    logger.info('b_salon_query', {
      userId,
      area: areaFilter,
      service: serviceFilter,
      count: filtered.length,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, {
    salons: filtered.map((s) => ({ ...s })),
  });
});

/**
 * GET /salon/:id/services
 *
 * Returns the 4-6 services for a single salon. Unknown salon ids
 * return 404.
 */
router.get('/salon/:id/services', (req, res) => {
  const userId = extractUserId(req);
  const salonId = req.params['id'];
  if (typeof salonId !== 'string' || salonId.length === 0) {
    return bError(res, 'Missing salon id', 400);
  }
  const salon = FIXTURE_SALONS.find((s) => s.id === salonId);
  if (!salon) {
    return bError(res, `Salon not found: ${salonId}`, 404);
  }
  const services = FIXTURE_SERVICES.filter((s) => s.salonId === salonId);
  try {
    logger.info('b_salon_services_query', {
      userId,
      salonId,
      count: services.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, {
    services: services.map((s) => ({ ...s })),
  });
});

/**
 * POST /salon/book
 *
 * Body: { salonId, serviceId, slot, stylistId? }.
 * Returns a new confirmed `SalonBooking` and stores it in the
 * per-user booking map.
 */
router.post('/salon/book', (req, res) => {
  const userId = extractUserId(req);
  const body = (typeof req.body === 'object' && req.body !== null
    ? req.body
    : {}) as Record<string, unknown>;

  const salonId = typeof body['salonId'] === 'string' ? body['salonId'] : '';
  const serviceId =
    typeof body['serviceId'] === 'string' ? body['serviceId'] : '';
  const slot = safeIsoDateOrNull(body['slot']);
  const stylistIdRaw = body['stylistId'];
  const stylistId =
    typeof stylistIdRaw === 'string' && stylistIdRaw.length > 0
      ? stylistIdRaw
      : undefined;

  if (salonId.length === 0) {
    return bError(res, 'Missing salonId', 400);
  }
  if (serviceId.length === 0) {
    return bError(res, 'Missing serviceId', 400);
  }
  if (slot === null) {
    return bError(res, 'Missing or invalid slot', 400);
  }
  if (new Date(slot).getTime() < Date.now()) {
    return bError(res, 'slot cannot be in the past', 400);
  }

  const salon = FIXTURE_SALONS.find((s) => s.id === salonId);
  if (!salon) {
    return bError(res, `Salon not found: ${salonId}`, 404);
  }
  if (!salon.isOpen) {
    return bError(res, `Salon ${salonId} is currently closed`, 409);
  }

  const service = FIXTURE_SERVICES.find(
    (s) => s.id === serviceId && s.salonId === salonId,
  );
  if (!service) {
    return bError(
      res,
      `Service ${serviceId} not found at salon ${salonId}`,
      404,
    );
  }

  if (stylistId !== undefined) {
    const stylist = FIXTURE_STYLISTS.find(
      (s) => s.id === stylistId && s.salonId === salonId,
    );
    if (!stylist) {
      return bError(
        res,
        `Stylist ${stylistId} not found at salon ${salonId}`,
        404,
      );
    }
  }

  const bookedAtMs = Date.now();
  const booking: SalonBooking = {
    id: `book-${userId}-${bookedAtMs}`,
    salonId,
    serviceId,
    ...(stylistId !== undefined ? { stylistId } : {}),
    slot,
    status: 'confirmed',
    totalPaise: service.pricePaise,
    bookedAt: new Date(bookedAtMs).toISOString(),
    userId,
  };

  const bookings = readUserBookings(userId);
  bookings.unshift(booking);
  writeUserBookings(userId, bookings);

  try {
    logger.info('b_salon_booked', {
      userId,
      salonId,
      serviceId,
      stylistId: stylistId ?? null,
      bookingId: booking.id,
      totalPaise: service.pricePaise,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, { booking });
});

/**
 * GET /salon/bookings
 *
 * Returns the user's bookings, most recent first.
 */
router.get('/salon/bookings', (req, res) => {
  const userId = extractUserId(req);
  const bookings = readUserBookings(userId)
    .slice()
    .sort((a, b) => {
      const aMs = new Date(a.bookedAt).getTime();
      const bMs = new Date(b.bookedAt).getTime();
      return bMs - aMs;
    });
  try {
    logger.info('b_salon_bookings_query', {
      userId,
      count: bookings.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, {
    bookings: bookings.map((b) => ({ ...b })),
  });
});

/**
 * POST /salon/bookings/:id/cancel
 *
 * Cancels a booking owned by the authenticated user. Bookings in a
 * terminal status (`cancelled`, `completed`) are rejected with 409.
 */
router.post('/salon/bookings/:id/cancel', (req, res) => {
  const userId = extractUserId(req);
  const bookingId = req.params['id'];
  if (typeof bookingId !== 'string' || bookingId.length === 0) {
    return bError(res, 'Missing booking id', 400);
  }
  const bookings = readUserBookings(userId);
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index < 0) {
    return bError(res, `Booking not found: ${bookingId}`, 404);
  }
  const existing = bookings[index];
  if (!existing) {
    return bError(res, `Booking not found: ${bookingId}`, 404);
  }
  if (existing.status === 'cancelled' || existing.status === 'completed') {
    return bError(
      res,
      `Cannot cancel a booking in status: ${existing.status}`,
      409,
      { currentStatus: existing.status },
    );
  }
  const updated: SalonBooking = { ...existing, status: 'cancelled' };
  bookings[index] = updated;
  writeUserBookings(userId, bookings);

  try {
    logger.info('b_salon_booking_cancelled', {
      userId,
      bookingId: updated.id,
      salonId: updated.salonId,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, { booking: updated });
});

// ---------------------------------------------------------------------------
// Influencer endpoints
// ---------------------------------------------------------------------------

/**
 * GET /influencer?category=
 *
 * Returns the influencer catalogue, optionally filtered by category.
 * The follow state for the authenticated user is layered in at
 * response time.
 */
router.get('/influencer', (req, res) => {
  const userId = extractUserId(req);
  const rawCategory = req.query['category'];

  let categoryFilter: InfluencerCategory | null = null;
  if (typeof rawCategory === 'string' && rawCategory.length > 0) {
    if (!isInfluencerCategory(rawCategory)) {
      return bError(res, `Invalid category: ${rawCategory}`, 400, {
        allowedCategories: [...INFLUENCER_CATEGORIES],
      });
    }
    categoryFilter = rawCategory;
  }

  const follows = readUserFollows(userId);
  const filtered = FIXTURE_INFLUENCERS.filter((i) => {
    if (categoryFilter !== null && i.category !== categoryFilter) {
      return false;
    }
    return true;
  }).map((i) => ({
    ...i,
    isFollowing: follows.has(i.id),
  }));

  try {
    logger.info('b_influencer_query', {
      userId,
      category: categoryFilter,
      count: filtered.length,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, {
    influencers: filtered.map((i) => ({ ...i })),
  });
});

/**
 * GET /influencer/:id/campaigns
 *
 * Returns the campaigns run by a single influencer, joined with
 * the current user's `isJoined` state.
 */
router.get('/influencer/:id/campaigns', (req, res) => {
  const userId = extractUserId(req);
  const influencerId = req.params['id'];
  if (typeof influencerId !== 'string' || influencerId.length === 0) {
    return bError(res, 'Missing influencer id', 400);
  }
  const influencer = FIXTURE_INFLUENCERS.find((i) => i.id === influencerId);
  if (!influencer) {
    return bError(res, `Influencer not found: ${influencerId}`, 404);
  }

  const joins = readUserJoins(userId);
  const campaigns = FIXTURE_CAMPAIGNS
    .filter((c) => c.influencerId === influencerId)
    .map((c) => ({
      ...c,
      isJoined: joins.has(c.id),
    }))
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  try {
    logger.info('b_influencer_campaigns_query', {
      userId,
      influencerId,
      count: campaigns.length,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, {
    campaigns: campaigns.map((c) => ({ ...c })),
  });
});

/**
 * POST /influencer/campaigns/:id/join
 *
 * Toggles the user's join state on a campaign. The first call joins
 * (sets `isJoined` and increments `participantsCount`); a second call
 * leaves the campaign (clears `isJoined` and decrements the count,
 * floored at 0). The campaign record returned reflects the new state.
 */
router.post('/influencer/campaigns/:id/join', (req, res) => {
  const userId = extractUserId(req);
  const campaignId = req.params['id'];
  if (typeof campaignId !== 'string' || campaignId.length === 0) {
    return bError(res, 'Missing campaign id', 400);
  }
  const campaign = FIXTURE_CAMPAIGNS.find((c) => c.id === campaignId);
  if (!campaign) {
    return bError(res, `Campaign not found: ${campaignId}`, 404);
  }

  // Reject if the campaign has already ended.
  if (new Date(campaign.endDate).getTime() < Date.now()) {
    return bError(res, `Campaign ${campaignId} has ended`, 409);
  }

  const joins = readUserJoins(userId);
  const wasJoined = joins.has(campaignId);
  const updated: InfluencerCampaign = {
    ...campaign,
    isJoined: !wasJoined,
    participantsCount: wasJoined
      ? Math.max(0, campaign.participantsCount - 1)
      : campaign.participantsCount + 1,
  };

  if (wasJoined) {
    joins.delete(campaignId);
  } else {
    joins.add(campaignId);
  }

  // Mirror the change onto the in-memory fixture so subsequent reads
  // see the same participantsCount.
  const fixtureIndex = FIXTURE_CAMPAIGNS.findIndex((c) => c.id === campaignId);
  if (fixtureIndex >= 0) {
    const existingFixture = FIXTURE_CAMPAIGNS[fixtureIndex];
    if (existingFixture) {
      const patched: InfluencerCampaign = {
        ...existingFixture,
        isJoined: !wasJoined,
        participantsCount: updated.participantsCount,
      };
      (FIXTURE_CAMPAIGNS as InfluencerCampaign[])[fixtureIndex] = patched;
    }
  }

  try {
    logger.info('b_influencer_campaign_join_toggle', {
      userId,
      campaignId,
      joined: !wasJoined,
      participantsCount: updated.participantsCount,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, { campaign: updated });
});

/**
 * POST /influencer/:id/follow
 *
 * Toggles the user's follow state on an influencer. Returns the
 * influencer with the new follow flag and the boolean `following`
 * value so the UI can confirm the action.
 */
router.post('/influencer/:id/follow', (req, res) => {
  const userId = extractUserId(req);
  const influencerId = req.params['id'];
  if (typeof influencerId !== 'string' || influencerId.length === 0) {
    return bError(res, 'Missing influencer id', 400);
  }
  const influencer = FIXTURE_INFLUENCERS.find((i) => i.id === influencerId);
  if (!influencer) {
    return bError(res, `Influencer not found: ${influencerId}`, 404);
  }

  const follows = readUserFollows(userId);
  const wasFollowing = follows.has(influencerId);
  if (wasFollowing) {
    follows.delete(influencerId);
  } else {
    follows.add(influencerId);
  }
  const following = !wasFollowing;

  try {
    logger.info('b_influencer_follow_toggle', {
      userId,
      influencerId,
      following,
    });
  } catch {
    /* logger must never block the response */
  }

  const updated: Influencer = {
    ...influencer,
    isFollowing: following,
  };
  return bSuccess(res, { influencer: updated, following });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Re-export fixtures and helpers for unit tests. The shape mirrors
 * the `__test` export in other B routers.
 */
export const __test = {
  FIXTURE_SALONS,
  FIXTURE_SERVICES,
  FIXTURE_STYLISTS,
  FIXTURE_INFLUENCERS,
  FIXTURE_CAMPAIGNS,
  PRICE_RANGES,
  BOOKING_STATUSES,
  SERVICE_CATEGORIES,
  INFLUENCER_CATEGORIES,
  isPriceRange,
  isBookingStatus,
  isServiceCategory,
  isInfluencerCategory,
};

export default router;
