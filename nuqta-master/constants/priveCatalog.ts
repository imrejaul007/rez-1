/**
 * Privé Redemption Catalog — FALLBACK ONLY
 *
 * The canonical source of truth is the backend: GET /api/prive/catalog
 * These values are used ONLY when the API call fails or during offline mode.
 */

export interface GiftCardOption {
  id: string;
  name: string;
  logo: string;
  minCoins: number;
  denominations: number[];
}

export interface Experience {
  id: string;
  name: string;
  description: string;
  icon: string;
  coinCost: number;
  value: number;
  highlights: string[];
}

export interface Charity {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export const GIFT_CARDS: GiftCardOption[] = [
  { id: 'amazon', name: 'Amazon', logo: '🛒', minCoins: 500, denominations: [500, 1000, 2000, 5000] },
  { id: 'flipkart', name: 'Flipkart', logo: '📦', minCoins: 500, denominations: [500, 1000, 2000, 5000] },
  { id: 'swiggy', name: 'Swiggy', logo: '🍔', minCoins: 300, denominations: [300, 500, 1000, 2000] },
  { id: 'zomato', name: 'Zomato', logo: '🍕', minCoins: 300, denominations: [300, 500, 1000, 2000] },
  { id: 'myntra', name: 'Myntra', logo: '👗', minCoins: 500, denominations: [500, 1000, 2000] },
  { id: 'bookmyshow', name: 'BookMyShow', logo: '🎬', minCoins: 200, denominations: [200, 500, 1000] },
];

export const EXPERIENCES: Experience[] = [
  {
    id: 'spa',
    name: 'Luxury Spa Day',
    description: 'Full day spa experience at premium wellness centers',
    icon: '🧖',
    coinCost: 5000,
    value: 600,
    highlights: ['Full body massage', 'Facial treatment', 'Sauna access'],
  },
  {
    id: 'dining',
    name: 'Fine Dining Experience',
    description: '5-course meal at top-rated restaurants',
    icon: '🍽️',
    coinCost: 3000,
    value: 360,
    highlights: ['5-course tasting menu', 'Wine pairing', "Chef's table"],
  },
  {
    id: 'staycation',
    name: 'Weekend Staycation',
    description: 'One night at premium hotels',
    icon: '🏨',
    coinCost: 8000,
    value: 960,
    highlights: ['Luxury room', 'Breakfast included', 'Late checkout'],
  },
  {
    id: 'adventure',
    name: 'Adventure Activity',
    description: 'Thrilling outdoor adventures',
    icon: '🎢',
    coinCost: 2000,
    value: 240,
    highlights: ['Choice of activity', 'Professional guide', 'Safety gear'],
  },
  {
    id: 'concert',
    name: 'Premium Event Tickets',
    description: 'VIP access to concerts & shows',
    icon: '🎵',
    coinCost: 4000,
    value: 480,
    highlights: ['VIP seating', 'Backstage access', 'Meet & greet'],
  },
  {
    id: 'workshop',
    name: 'Exclusive Workshop',
    description: 'Learn from industry experts',
    icon: '🎨',
    coinCost: 1500,
    value: 180,
    highlights: ['Expert instruction', 'Materials included', 'Certificate'],
  },
];

export const CHARITIES: Charity[] = [
  {
    id: 'education',
    name: 'Education for All',
    description: "Support underprivileged children's education",
    icon: '📚',
    category: 'Education',
  },
  {
    id: 'hunger',
    name: 'Feeding India',
    description: 'Provide meals to those in need',
    icon: '🍚',
    category: 'Food',
  },
  {
    id: 'health',
    name: 'Health Foundation',
    description: 'Medical care for underserved communities',
    icon: '🏥',
    category: 'Healthcare',
  },
  {
    id: 'environment',
    name: 'Green Earth Initiative',
    description: 'Plant trees and protect wildlife',
    icon: '🌱',
    category: 'Environment',
  },
  {
    id: 'animals',
    name: 'Animal Welfare',
    description: 'Shelter and care for stray animals',
    icon: '🐕',
    category: 'Animals',
  },
  {
    id: 'disaster',
    name: 'Disaster Relief',
    description: 'Emergency aid for disaster victims',
    icon: '🆘',
    category: 'Emergency',
  },
];

export const DONATION_AMOUNTS = [100, 250, 500, 1000, 2500];
