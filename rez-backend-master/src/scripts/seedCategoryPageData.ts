/**
 * Seed Script for Category Page Data
 * Seeds: Category metadata (vibes, occasions, hashtags), Bank Offers, Exclusive Offers,
 * and Social Proof Stats
 *
 * Run: npx ts-node src/scripts/seedCategoryPageData.ts
 * Clear & Seed: npx ts-node src/scripts/seedCategoryPageData.ts --clear
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import { Category } from '../models/Category';
import BankOffer from '../models/BankOffer';
import ExclusiveZone from '../models/ExclusiveZone';
import ExclusiveOffer from '../models/ExclusiveOffer';
import { Store } from '../models/Store';
import SocialProofStat from '../models/SocialProofStat';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
};

// Check for --clear flag
const shouldClear = process.argv.includes('--clear');

// Category slugs for the 11 main categories
const CATEGORY_SLUGS = [
  'food-dining',
  'fashion',
  'beauty-wellness',
  'grocery-essentials',
  'healthcare',
  'fitness-sports',
  'education-learning',
  'home-services',
  'travel-experiences',
  'entertainment',
  'financial-lifestyle',
];

// Vibes data (from categoryDummyData.ts)
const vibesData: Record<string, Array<{ id: string; name: string; icon: string; color: string; description: string }>> = {
  'food-dining': [
    { id: 'romantic', name: 'Romantic Date', icon: '💕', color: '#F43F5E', description: 'Perfect for two' },
    { id: 'family', name: 'Family Feast', icon: '👨‍👩‍👧‍👦', color: '#3B82F6', description: 'Meals for everyone' },
    { id: 'quick', name: 'Quick Bite', icon: '⚡', color: '#F59E0B', description: 'Fast & delicious' },
    { id: 'healthy', name: 'Healthy Eats', icon: '🥗', color: '#10B981', description: 'Nutritious meals' },
    { id: 'party', name: 'Party Mode', icon: '🎉', color: '#EC4899', description: 'Celebration feasts' },
    { id: 'comfort', name: 'Comfort Food', icon: '🍲', color: '#8B5CF6', description: 'Soul-warming dishes' },
    { id: 'exotic', name: 'Exotic Flavors', icon: '🌏', color: '#06B6D4', description: 'World cuisines' },
    { id: 'sweet', name: 'Sweet Tooth', icon: '🍰', color: '#D946EF', description: 'Desserts & treats' },
  ],
  'fashion': [
    { id: 'sunny', name: 'Sunny Day', icon: '☀️', color: '#FBBF24', description: 'Light & breezy outfits' },
    { id: 'party', name: 'Party Mode', icon: '🎉', color: '#EC4899', description: 'Glam & glitter looks' },
    { id: 'romantic', name: 'Romantic', icon: '💕', color: '#F43F5E', description: 'Date night ready' },
    { id: 'winter', name: 'Winter Cozy', icon: '❄️', color: '#06B6D4', description: 'Warm & stylish layers' },
    { id: 'beach', name: 'Beach Ready', icon: '🏖️', color: '#14B8A6', description: 'Summer essentials' },
    { id: 'minimal', name: 'Minimal', icon: '🤍', color: '#94A3B8', description: 'Clean & simple' },
    { id: 'artistic', name: 'Artistic', icon: '🎨', color: '#8B5CF6', description: 'Bold & creative' },
    { id: 'sporty', name: 'Sporty', icon: '🏃', color: '#22C55E', description: 'Active & athletic' },
  ],
  'beauty-wellness': [
    { id: 'glow', name: 'Glow Up', icon: '✨', color: '#FBBF24', description: 'Radiant skin routine' },
    { id: 'natural', name: 'Natural Beauty', icon: '🌿', color: '#10B981', description: 'Organic products' },
    { id: 'spa', name: 'Spa Day', icon: '🧖', color: '#8B5CF6', description: 'Relaxation & pampering' },
    { id: 'bridal', name: 'Bridal Glow', icon: '👰', color: '#EC4899', description: 'Wedding-ready looks' },
    { id: 'men', name: 'Men\'s Care', icon: '🧔', color: '#3B82F6', description: 'Grooming essentials' },
    { id: 'hair', name: 'Hair Goals', icon: '💇', color: '#D946EF', description: 'Hair treatments' },
    { id: 'wellness', name: 'Inner Wellness', icon: '🧘', color: '#14B8A6', description: 'Mind & body balance' },
    { id: 'quick', name: 'Quick Fix', icon: '⚡', color: '#F59E0B', description: '15-min treatments' },
  ],
  'grocery-essentials': [
    { id: 'organic', name: 'Organic', icon: '🌱', color: '#10B981', description: 'Chemical-free products' },
    { id: 'fresh', name: 'Farm Fresh', icon: '🥬', color: '#22C55E', description: 'Daily fresh produce' },
    { id: 'bulk', name: 'Bulk Buy', icon: '📦', color: '#F59E0B', description: 'Stock up & save' },
    { id: 'instant', name: 'Instant Meals', icon: '⏱️', color: '#EF4444', description: 'Ready to cook' },
    { id: 'healthy', name: 'Health Foods', icon: '💪', color: '#3B82F6', description: 'Nutritious choices' },
    { id: 'baby', name: 'Baby Care', icon: '👶', color: '#EC4899', description: 'For little ones' },
    { id: 'pet', name: 'Pet Supplies', icon: '🐕', color: '#8B5CF6', description: 'For furry friends' },
    { id: 'cleaning', name: 'Clean Home', icon: '🧹', color: '#06B6D4', description: 'Household essentials' },
  ],
  'healthcare': [
    { id: 'immunity', name: 'Immunity Boost', icon: '🛡️', color: '#10B981', description: 'Stay strong & healthy' },
    { id: 'fitness', name: 'Fitness First', icon: '💪', color: '#3B82F6', description: 'Workout supplements' },
    { id: 'mental', name: 'Mental Wellness', icon: '🧠', color: '#8B5CF6', description: 'Peace of mind' },
    { id: 'senior', name: 'Senior Care', icon: '👴', color: '#F59E0B', description: 'For elders' },
    { id: 'women', name: 'Women\'s Health', icon: '👩', color: '#EC4899', description: 'Feminine care' },
    { id: 'kids', name: 'Kids Health', icon: '👧', color: '#14B8A6', description: 'For children' },
    { id: 'emergency', name: 'Emergency Kit', icon: '🚑', color: '#EF4444', description: 'First aid essentials' },
    { id: 'ayurveda', name: 'Ayurveda', icon: '🌿', color: '#22C55E', description: 'Traditional healing' },
  ],
  'fitness-sports': [
    { id: 'gym', name: 'Gym Beast', icon: '🏋️', color: '#EF4444', description: 'Heavy lifting gear' },
    { id: 'yoga', name: 'Yoga Flow', icon: '🧘', color: '#8B5CF6', description: 'Flexibility & peace' },
    { id: 'running', name: 'Runner\'s High', icon: '🏃', color: '#3B82F6', description: 'Cardio essentials' },
    { id: 'outdoor', name: 'Outdoor Adventure', icon: '🏕️', color: '#10B981', description: 'Nature activities' },
    { id: 'swimming', name: 'Swim Ready', icon: '🏊', color: '#06B6D4', description: 'Pool & beach gear' },
    { id: 'team', name: 'Team Sports', icon: '⚽', color: '#22C55E', description: 'Group activities' },
    { id: 'recovery', name: 'Recovery Mode', icon: '🧊', color: '#64748B', description: 'Rest & heal' },
    { id: 'nutrition', name: 'Sports Nutrition', icon: '🥤', color: '#F59E0B', description: 'Performance fuel' },
  ],
  'education-learning': [
    { id: 'exam', name: 'Exam Prep', icon: '📝', color: '#EF4444', description: 'Ace your tests' },
    { id: 'career', name: 'Career Boost', icon: '💼', color: '#3B82F6', description: 'Professional skills' },
    { id: 'creative', name: 'Creative Arts', icon: '🎨', color: '#EC4899', description: 'Artistic learning' },
    { id: 'language', name: 'Language Master', icon: '🗣️', color: '#10B981', description: 'New languages' },
    { id: 'coding', name: 'Code & Tech', icon: '💻', color: '#8B5CF6', description: 'Programming skills' },
    { id: 'kids', name: 'Kids Learning', icon: '🎒', color: '#F59E0B', description: 'Fun education' },
    { id: 'music', name: 'Music & Dance', icon: '🎵', color: '#D946EF', description: 'Performing arts' },
    { id: 'hobby', name: 'Hobby Classes', icon: '🎯', color: '#14B8A6', description: 'Learn for fun' },
  ],
  'home-services': [
    { id: 'cleaning', name: 'Deep Clean', icon: '🧹', color: '#06B6D4', description: 'Sparkling spaces' },
    { id: 'repair', name: 'Quick Repair', icon: '🔧', color: '#F59E0B', description: 'Fix it fast' },
    { id: 'painting', name: 'Fresh Paint', icon: '🎨', color: '#EC4899', description: 'Color your home' },
    { id: 'pest', name: 'Pest Control', icon: '🐜', color: '#EF4444', description: 'Bug-free living' },
    { id: 'moving', name: 'Moving Day', icon: '📦', color: '#3B82F6', description: 'Relocation help' },
    { id: 'decor', name: 'Home Decor', icon: '🏠', color: '#8B5CF6', description: 'Interior styling' },
    { id: 'garden', name: 'Garden Care', icon: '🌺', color: '#10B981', description: 'Green thumb' },
    { id: 'appliance', name: 'Appliance Fix', icon: '🔌', color: '#64748B', description: 'Electronics repair' },
  ],
  'travel-experiences': [
    { id: 'adventure', name: 'Adventure', icon: '🏔️', color: '#10B981', description: 'Thrill seekers' },
    { id: 'romantic', name: 'Romantic', icon: '💕', color: '#EC4899', description: 'Couples getaway' },
    { id: 'family', name: 'Family Fun', icon: '👨‍👩‍👧‍👦', color: '#3B82F6', description: 'Kid-friendly trips' },
    { id: 'luxury', name: 'Luxury', icon: '👑', color: '#F59E0B', description: 'Premium experiences' },
    { id: 'budget', name: 'Budget Travel', icon: '💰', color: '#22C55E', description: 'Affordable trips' },
    { id: 'solo', name: 'Solo Explorer', icon: '🎒', color: '#8B5CF6', description: 'Me time adventures' },
    { id: 'cultural', name: 'Cultural', icon: '🏛️', color: '#D946EF', description: 'Heritage & history' },
    { id: 'wellness', name: 'Wellness Retreat', icon: '🧘', color: '#14B8A6', description: 'Relax & rejuvenate' },
  ],
  'entertainment': [
    { id: 'movies', name: 'Movie Night', icon: '🎬', color: '#EF4444', description: 'Latest releases' },
    { id: 'gaming', name: 'Gaming Zone', icon: '🎮', color: '#8B5CF6', description: 'Level up fun' },
    { id: 'concerts', name: 'Live Music', icon: '🎸', color: '#EC4899', description: 'Concert vibes' },
    { id: 'comedy', name: 'Comedy', icon: '😂', color: '#F59E0B', description: 'Laugh out loud' },
    { id: 'sports', name: 'Sports Events', icon: '🏆', color: '#3B82F6', description: 'Game day' },
    { id: 'family', name: 'Family Fun', icon: '🎪', color: '#10B981', description: 'All ages' },
    { id: 'nightlife', name: 'Nightlife', icon: '🌃', color: '#D946EF', description: 'After dark' },
    { id: 'arts', name: 'Arts & Theater', icon: '🎭', color: '#06B6D4', description: 'Cultural shows' },
  ],
  'financial-lifestyle': [
    { id: 'savings', name: 'Smart Savings', icon: '🏦', color: '#10B981', description: 'Grow your money' },
    { id: 'investment', name: 'Investment', icon: '📈', color: '#3B82F6', description: 'Build wealth' },
    { id: 'insurance', name: 'Insurance', icon: '🛡️', color: '#8B5CF6', description: 'Stay protected' },
    { id: 'loans', name: 'Quick Loans', icon: '💳', color: '#F59E0B', description: 'Easy credit' },
    { id: 'rewards', name: 'Rewards', icon: '🎁', color: '#EC4899', description: 'Earn & redeem' },
    { id: 'tax', name: 'Tax Planning', icon: '📋', color: '#64748B', description: 'Save on taxes' },
    { id: 'premium', name: 'Premium Life', icon: '👑', color: '#D946EF', description: 'Luxury benefits' },
    { id: 'student', name: 'Student Plans', icon: '🎓', color: '#14B8A6', description: 'Youth offers' },
  ],
};

// Occasions data
const occasionsData: Record<string, Array<{ id: string; name: string; icon: string; color: string; tag: string | null; discount: number }>> = {
  'food-dining': [
    { id: 'birthday', name: 'Birthday', icon: '🎂', color: '#EC4899', tag: 'Popular', discount: 20 },
    { id: 'anniversary', name: 'Anniversary', icon: '💑', color: '#F43F5E', tag: 'Romantic', discount: 25 },
    { id: 'corporate', name: 'Corporate', icon: '🏢', color: '#3B82F6', tag: null, discount: 15 },
    { id: 'wedding', name: 'Wedding', icon: '💒', color: '#D946EF', tag: 'Premium', discount: 30 },
    { id: 'family', name: 'Family Gathering', icon: '👨‍👩‍👧‍👦', color: '#F59E0B', tag: null, discount: 18 },
    { id: 'eid', name: 'Eid Feast', icon: '🌙', color: '#10B981', tag: 'Festive', discount: 25 },
    { id: 'diwali', name: 'Diwali', icon: '🪔', color: '#FF9500', tag: 'Coming Soon', discount: 30 },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#EF4444', tag: null, discount: 22 },
  ],
  'fashion': [
    { id: 'wedding', name: 'Wedding', icon: '💒', color: '#F43F5E', tag: 'Hot', discount: 30 },
    { id: 'eid', name: 'Eid', icon: '🌙', color: '#10B981', tag: 'Trending', discount: 25 },
    { id: 'diwali', name: 'Diwali', icon: '🪔', color: '#F59E0B', tag: 'Coming Soon', discount: 35 },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#EF4444', tag: null, discount: 20 },
    { id: 'newyear', name: 'New Year', icon: '🎊', color: '#8B5CF6', tag: null, discount: 22 },
    { id: 'birthday', name: 'Birthday', icon: '🎂', color: '#EC4899', tag: 'Special', discount: 15 },
    { id: 'collegefest', name: 'College Fest', icon: '🎓', color: '#3B82F6', tag: 'Student', discount: 28 },
    { id: 'office', name: 'Office Party', icon: '🏢', color: '#64748B', tag: null, discount: 18 },
  ],
  'beauty-wellness': [
    { id: 'wedding', name: 'Bridal', icon: '👰', color: '#EC4899', tag: 'Premium', discount: 35 },
    { id: 'karwachauth', name: 'Karwa Chauth', icon: '🌙', color: '#EF4444', tag: 'Special', discount: 25 },
    { id: 'valentines', name: 'Valentine\'s', icon: '💕', color: '#F43F5E', tag: 'Romantic', discount: 20 },
    { id: 'mothers', name: 'Mother\'s Day', icon: '👩', color: '#D946EF', tag: null, discount: 30 },
    { id: 'graduation', name: 'Graduation', icon: '🎓', color: '#3B82F6', tag: null, discount: 18 },
    { id: 'interview', name: 'Job Interview', icon: '💼', color: '#64748B', tag: 'Quick', discount: 15 },
    { id: 'party', name: 'Party Glam', icon: '🎉', color: '#8B5CF6', tag: null, discount: 22 },
    { id: 'festival', name: 'Festival Look', icon: '🎪', color: '#F59E0B', tag: 'Trending', discount: 28 },
  ],
  'grocery-essentials': [
    { id: 'diwali', name: 'Diwali', icon: '🪔', color: '#F59E0B', tag: 'Mega Sale', discount: 40 },
    { id: 'eid', name: 'Eid', icon: '🌙', color: '#10B981', tag: 'Special', discount: 30 },
    { id: 'holi', name: 'Holi', icon: '🎨', color: '#EC4899', tag: 'Colorful', discount: 25 },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#EF4444', tag: null, discount: 20 },
    { id: 'newyear', name: 'New Year', icon: '🎊', color: '#8B5CF6', tag: null, discount: 22 },
    { id: 'party', name: 'House Party', icon: '🏠', color: '#3B82F6', tag: null, discount: 18 },
    { id: 'bbq', name: 'BBQ Night', icon: '🍖', color: '#FF6B35', tag: 'Summer', discount: 15 },
    { id: 'breakfast', name: 'Breakfast Pack', icon: '🍳', color: '#FBBF24', tag: 'Daily', discount: 12 },
  ],
  'healthcare': [
    { id: 'monsoon', name: 'Monsoon Care', icon: '🌧️', color: '#3B82F6', tag: 'Essential', discount: 20 },
    { id: 'winter', name: 'Winter Health', icon: '❄️', color: '#06B6D4', tag: null, discount: 18 },
    { id: 'summer', name: 'Summer Care', icon: '☀️', color: '#F59E0B', tag: null, discount: 15 },
    { id: 'exam', name: 'Exam Season', icon: '📝', color: '#8B5CF6', tag: 'Students', discount: 22 },
    { id: 'pregnancy', name: 'Pregnancy', icon: '🤰', color: '#EC4899', tag: 'Special', discount: 25 },
    { id: 'senior', name: 'Senior Care', icon: '👴', color: '#64748B', tag: 'Care', discount: 30 },
    { id: 'fitness', name: 'Fitness Goals', icon: '💪', color: '#10B981', tag: 'New Year', discount: 20 },
    { id: 'travel', name: 'Travel Kit', icon: '✈️', color: '#14B8A6', tag: null, discount: 15 },
  ],
  'fitness-sports': [
    { id: 'newyear', name: 'New Year Goals', icon: '🎯', color: '#10B981', tag: 'Hot', discount: 35 },
    { id: 'summer', name: 'Summer Body', icon: '☀️', color: '#F59E0B', tag: 'Trending', discount: 30 },
    { id: 'marathon', name: 'Marathon Prep', icon: '🏃', color: '#3B82F6', tag: null, discount: 25 },
    { id: 'sports', name: 'Sports Season', icon: '🏆', color: '#EF4444', tag: null, discount: 22 },
    { id: 'school', name: 'School Sports', icon: '🏫', color: '#8B5CF6', tag: 'Students', discount: 28 },
    { id: 'outdoor', name: 'Outdoor Season', icon: '🏕️', color: '#22C55E', tag: null, discount: 20 },
    { id: 'monsoon', name: 'Indoor Fitness', icon: '🌧️', color: '#64748B', tag: null, discount: 18 },
    { id: 'winter', name: 'Winter Sports', icon: '⛷️', color: '#06B6D4', tag: 'Season', discount: 25 },
  ],
  'education-learning': [
    { id: 'academic', name: 'Academic Year', icon: '📚', color: '#3B82F6', tag: 'Hot', discount: 40 },
    { id: 'summer', name: 'Summer Camp', icon: '☀️', color: '#F59E0B', tag: null, discount: 25 },
    { id: 'exam', name: 'Exam Season', icon: '📝', color: '#EF4444', tag: 'Popular', discount: 30 },
    { id: 'career', name: 'Career Fair', icon: '💼', color: '#8B5CF6', tag: null, discount: 20 },
    { id: 'admission', name: 'Admission', icon: '🎓', color: '#10B981', tag: 'Season', discount: 35 },
    { id: 'hobby', name: 'Hobby Month', icon: '🎨', color: '#EC4899', tag: null, discount: 22 },
    { id: 'coding', name: 'Code Camp', icon: '💻', color: '#06B6D4', tag: 'Tech', discount: 28 },
    { id: 'language', name: 'Language Week', icon: '🗣️', color: '#D946EF', tag: null, discount: 18 },
  ],
  'home-services': [
    { id: 'diwali', name: 'Diwali Prep', icon: '🪔', color: '#F59E0B', tag: 'Hot', discount: 40 },
    { id: 'moving', name: 'Moving Season', icon: '📦', color: '#3B82F6', tag: null, discount: 25 },
    { id: 'monsoon', name: 'Monsoon Repair', icon: '🌧️', color: '#06B6D4', tag: 'Essential', discount: 30 },
    { id: 'summer', name: 'Summer AC', icon: '❄️', color: '#14B8A6', tag: null, discount: 20 },
    { id: 'spring', name: 'Spring Clean', icon: '🌸', color: '#EC4899', tag: 'Popular', discount: 35 },
    { id: 'wedding', name: 'Wedding Prep', icon: '💒', color: '#D946EF', tag: 'Premium', discount: 22 },
    { id: 'renovation', name: 'Renovation', icon: '🏗️', color: '#64748B', tag: null, discount: 28 },
    { id: 'pest', name: 'Pest Season', icon: '🐜', color: '#EF4444', tag: 'Urgent', discount: 18 },
  ],
  'travel-experiences': [
    { id: 'summer', name: 'Summer Vacation', icon: '🏖️', color: '#F59E0B', tag: 'Hot', discount: 35 },
    { id: 'honeymoon', name: 'Honeymoon', icon: '💕', color: '#EC4899', tag: 'Romantic', discount: 30 },
    { id: 'winter', name: 'Winter Break', icon: '❄️', color: '#06B6D4', tag: null, discount: 25 },
    { id: 'diwali', name: 'Diwali Trip', icon: '🪔', color: '#FF9500', tag: 'Festive', discount: 28 },
    { id: 'weekend', name: 'Weekend Escape', icon: '🚗', color: '#3B82F6', tag: 'Quick', discount: 20 },
    { id: 'adventure', name: 'Adventure Trip', icon: '🏔️', color: '#10B981', tag: null, discount: 22 },
    { id: 'religious', name: 'Pilgrimage', icon: '🛕', color: '#8B5CF6', tag: 'Spiritual', discount: 18 },
    { id: 'business', name: 'Business Trip', icon: '💼', color: '#64748B', tag: null, discount: 15 },
  ],
  'entertainment': [
    { id: 'weekend', name: 'Weekend Fun', icon: '🎉', color: '#EC4899', tag: 'Popular', discount: 25 },
    { id: 'birthday', name: 'Birthday Bash', icon: '🎂', color: '#F59E0B', tag: 'Special', discount: 30 },
    { id: 'date', name: 'Date Night', icon: '💕', color: '#F43F5E', tag: 'Romantic', discount: 20 },
    { id: 'family', name: 'Family Day', icon: '👨‍👩‍👧‍👦', color: '#3B82F6', tag: null, discount: 22 },
    { id: 'friends', name: 'Friends Night', icon: '🍻', color: '#8B5CF6', tag: null, discount: 18 },
    { id: 'newyear', name: 'New Year Party', icon: '🎊', color: '#D946EF', tag: 'Hot', discount: 35 },
    { id: 'halloween', name: 'Halloween', icon: '🎃', color: '#FF6B35', tag: null, discount: 28 },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#EF4444', tag: 'Festive', discount: 25 },
  ],
  'financial-lifestyle': [
    { id: 'newyear', name: 'New Year Goals', icon: '🎯', color: '#10B981', tag: 'Planning', discount: 20 },
    { id: 'tax', name: 'Tax Season', icon: '📋', color: '#3B82F6', tag: 'Important', discount: 30 },
    { id: 'wedding', name: 'Wedding Planning', icon: '💒', color: '#EC4899', tag: 'Premium', discount: 25 },
    { id: 'retirement', name: 'Retirement', icon: '🏖️', color: '#F59E0B', tag: null, discount: 22 },
    { id: 'education', name: 'Education Fund', icon: '🎓', color: '#8B5CF6', tag: 'Future', discount: 18 },
    { id: 'home', name: 'Home Loan', icon: '🏠', color: '#14B8A6', tag: null, discount: 15 },
    { id: 'business', name: 'Business Start', icon: '🚀', color: '#EF4444', tag: 'Hot', discount: 28 },
    { id: 'travel', name: 'Travel Fund', icon: '✈️', color: '#06B6D4', tag: null, discount: 20 },
  ],
};

// Hashtags data
const hashtagsData: Record<string, Array<{ id: string; tag: string; count: number; color: string; trending: boolean }>> = {
  'food-dining': [
    { id: '1', tag: '#BiryaniLovers', count: 2450, color: '#F59E0B', trending: true },
    { id: '2', tag: '#HealthyEats', count: 1890, color: '#10B981', trending: true },
    { id: '3', tag: '#StreetFood', count: 3200, color: '#EF4444', trending: false },
    { id: '4', tag: '#CaféVibes', count: 1560, color: '#8B5CF6', trending: false },
    { id: '5', tag: '#DateNightDinner', count: 980, color: '#EC4899', trending: true },
    { id: '6', tag: '#FoodieFinds', count: 2100, color: '#3B82F6', trending: false },
  ],
  'fashion': [
    { id: '1', tag: '#WeddingSeason', count: 3200, color: '#F43F5E', trending: true },
    { id: '2', tag: '#StreetStyle', count: 2800, color: '#06B6D4', trending: true },
    { id: '3', tag: '#OfficeLooks', count: 1800, color: '#64748B', trending: false },
    { id: '4', tag: '#PartyReady', count: 2400, color: '#EC4899', trending: false },
    { id: '5', tag: '#SustainableFashion', count: 1500, color: '#10B981', trending: true },
    { id: '6', tag: '#EthnicVibes', count: 3200, color: '#D946EF', trending: false },
  ],
  'beauty-wellness': [
    { id: '1', tag: '#GlowUp', count: 4500, color: '#FBBF24', trending: true },
    { id: '2', tag: '#SkincareRoutine', count: 3800, color: '#EC4899', trending: true },
    { id: '3', tag: '#NaturalBeauty', count: 2200, color: '#10B981', trending: false },
    { id: '4', tag: '#SpaDay', count: 1900, color: '#8B5CF6', trending: false },
    { id: '5', tag: '#BridalGlow', count: 1600, color: '#D946EF', trending: true },
    { id: '6', tag: '#SelfCare', count: 2800, color: '#14B8A6', trending: false },
  ],
  'grocery-essentials': [
    { id: '1', tag: '#OrganicLiving', count: 2100, color: '#10B981', trending: true },
    { id: '2', tag: '#MealPrep', count: 1800, color: '#3B82F6', trending: true },
    { id: '3', tag: '#FarmToTable', count: 1500, color: '#22C55E', trending: false },
    { id: '4', tag: '#HealthyPantry', count: 1200, color: '#F59E0B', trending: false },
    { id: '5', tag: '#BulkBuying', count: 900, color: '#8B5CF6', trending: true },
    { id: '6', tag: '#FreshProduce', count: 1600, color: '#14B8A6', trending: false },
  ],
  'healthcare': [
    { id: '1', tag: '#ImmunityBoost', count: 3500, color: '#10B981', trending: true },
    { id: '2', tag: '#MentalHealth', count: 2800, color: '#8B5CF6', trending: true },
    { id: '3', tag: '#FitnessFirst', count: 2200, color: '#3B82F6', trending: false },
    { id: '4', tag: '#AyurvedaLife', count: 1800, color: '#22C55E', trending: false },
    { id: '5', tag: '#WellnessJourney', count: 1500, color: '#EC4899', trending: true },
    { id: '6', tag: '#HealthyHabits', count: 2000, color: '#F59E0B', trending: false },
  ],
  'fitness-sports': [
    { id: '1', tag: '#GymLife', count: 5200, color: '#EF4444', trending: true },
    { id: '2', tag: '#YogaEveryday', count: 3800, color: '#8B5CF6', trending: true },
    { id: '3', tag: '#RunnersCommunity', count: 2400, color: '#3B82F6', trending: false },
    { id: '4', tag: '#FitFam', count: 4100, color: '#10B981', trending: false },
    { id: '5', tag: '#HomeWorkout', count: 2900, color: '#F59E0B', trending: true },
    { id: '6', tag: '#NoExcuses', count: 2100, color: '#EC4899', trending: false },
  ],
  'education-learning': [
    { id: '1', tag: '#StudyGram', count: 4200, color: '#3B82F6', trending: true },
    { id: '2', tag: '#LearnToCode', count: 3100, color: '#8B5CF6', trending: true },
    { id: '3', tag: '#ExamPrep', count: 2800, color: '#EF4444', trending: false },
    { id: '4', tag: '#SkillUp', count: 2200, color: '#10B981', trending: false },
    { id: '5', tag: '#LanguageLearning', count: 1800, color: '#EC4899', trending: true },
    { id: '6', tag: '#NeverStopLearning', count: 1500, color: '#F59E0B', trending: false },
  ],
  'home-services': [
    { id: '1', tag: '#HomeDecor', count: 3800, color: '#EC4899', trending: true },
    { id: '2', tag: '#CleanHome', count: 2500, color: '#06B6D4', trending: true },
    { id: '3', tag: '#DIYHome', count: 2100, color: '#F59E0B', trending: false },
    { id: '4', tag: '#HomeRenovation', count: 1800, color: '#64748B', trending: false },
    { id: '5', tag: '#OrganizedLife', count: 1500, color: '#8B5CF6', trending: true },
    { id: '6', tag: '#GardenGoals', count: 1200, color: '#10B981', trending: false },
  ],
  'travel-experiences': [
    { id: '1', tag: '#Wanderlust', count: 6500, color: '#3B82F6', trending: true },
    { id: '2', tag: '#TravelIndia', count: 4200, color: '#F59E0B', trending: true },
    { id: '3', tag: '#HiddenGems', count: 2800, color: '#10B981', trending: false },
    { id: '4', tag: '#BeachVibes', count: 3500, color: '#06B6D4', trending: false },
    { id: '5', tag: '#MountainCalling', count: 2200, color: '#22C55E', trending: true },
    { id: '6', tag: '#SoloTravel', count: 1900, color: '#8B5CF6', trending: false },
  ],
  'entertainment': [
    { id: '1', tag: '#MovieNight', count: 5500, color: '#EF4444', trending: true },
    { id: '2', tag: '#GamingCommunity', count: 4200, color: '#8B5CF6', trending: true },
    { id: '3', tag: '#ConcertVibes', count: 2800, color: '#EC4899', trending: false },
    { id: '4', tag: '#WeekendFun', count: 3200, color: '#F59E0B', trending: false },
    { id: '5', tag: '#NightOut', count: 2100, color: '#D946EF', trending: true },
    { id: '6', tag: '#FamilyTime', count: 1800, color: '#3B82F6', trending: false },
  ],
  'financial-lifestyle': [
    { id: '1', tag: '#MoneyMatters', count: 3200, color: '#10B981', trending: true },
    { id: '2', tag: '#InvestSmart', count: 2800, color: '#3B82F6', trending: true },
    { id: '3', tag: '#FinancialFreedom', count: 2100, color: '#F59E0B', trending: false },
    { id: '4', tag: '#SavingsGoals', count: 1800, color: '#22C55E', trending: false },
    { id: '5', tag: '#WealthBuilding', count: 1500, color: '#8B5CF6', trending: true },
    { id: '6', tag: '#BudgetLife', count: 1200, color: '#64748B', trending: false },
  ],
};

async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';
  const dbName = process.env.DB_NAME || 'test';

  log.info(`Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);
  log.info(`Database: ${dbName}`);

  await mongoose.connect(mongoUri, { dbName });
  log.success('Connected to MongoDB');
}

async function clearData(): Promise<void> {
  if (!shouldClear) return;

  log.header('Clearing existing data');

  // Clear embedded data from categories
  await Category.updateMany({}, {
    $unset: {
      vibes: 1,
      occasions: 1,
      trendingHashtags: 1
    }
  });
  log.info('Cleared embedded metadata from categories');

  log.success('Data cleared successfully');
}

async function seedCategoryMetadata(): Promise<{ vibes: number; occasions: number; hashtags: number }> {
  log.header('Seeding Category Metadata (Embedded)');

  const categories = await Category.find({ slug: { $in: CATEGORY_SLUGS } });
  let vibesCount = 0;
  let occasionsCount = 0;
  let hashtagsCount = 0;

  for (const category of categories) {
    const slug = category.slug;

    // Get data for this category
    const vibes = vibesData[slug] || [];
    const occasions = occasionsData[slug] || [];
    const hashtags = hashtagsData[slug] || [];

    if (vibes.length === 0 && occasions.length === 0 && hashtags.length === 0) {
      log.warning(`No metadata found for category: ${slug}`);
      continue;
    }

    // Update category with embedded data using updateOne with $set
    // This bypasses mongoose validation issues and directly updates MongoDB
    const updateResult = await Category.updateOne(
      { _id: category._id },
      {
        $set: {
          vibes: vibes,
          occasions: occasions,
          trendingHashtags: hashtags
        }
      }
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
      log.warning(`Failed to update category: ${slug}`);
      continue;
    }

    vibesCount += vibes.length;
    occasionsCount += occasions.length;
    hashtagsCount += hashtags.length;

    log.info(`Seeded ${slug}: ${vibes.length} vibes, ${occasions.length} occasions, ${hashtags.length} hashtags`);
  }

  log.success(`Seeded ${vibesCount} Vibes, ${occasionsCount} Occasions, ${hashtagsCount} Hashtags`);
  return { vibes: vibesCount, occasions: occasionsCount, hashtags: hashtagsCount };
}

async function seedBankOffers(): Promise<number> {
  log.info('Seeding Bank Offers...');
  
  // Check if bank offers already exist (from seedOffersPage)
  const existingCount = await BankOffer.countDocuments();
  if (existingCount > 0) {
    log.info(`Bank Offers already exist (${existingCount}). Skipping...`);
    return existingCount;
  }

  // Bank offers are already seeded by seedOffersPage.ts
  // This is just a placeholder - bank offers should be seeded separately
  log.warning('Bank Offers should be seeded via seedOffersPage.ts');
  return 0;
}

async function seedExclusiveOffers(): Promise<number> {
  log.info('Seeding Exclusive Offers...');
  
  // Check if exclusive offers already exist
  const existingCount = await ExclusiveOffer.countDocuments();
  if (existingCount > 0 && !shouldClear) {
    log.info(`Exclusive Offers already exist (${existingCount}). Skipping...`);
    return existingCount;
  }

  if (shouldClear) {
    await ExclusiveOffer.deleteMany({});
  }

  // Get all categories for linking
  const categories = await Category.find({ isActive: true }).limit(11);
  const categoryIds = categories.map(c => c._id);

  const exclusiveOffersData = [
    { id: 'student', title: 'Student Special', icon: '🎓', discount: '25% Extra Off', description: 'Valid student ID required', color: '#3B82F6', gradient: ['#3B82F6', '#1D4ED8'], targetAudience: 'student' as const },
    { id: 'women', title: 'Women Exclusive', icon: '👩', discount: 'Up to 40% Off', description: 'Celebrate every day', color: '#EC4899', gradient: ['#EC4899', '#BE185D'], targetAudience: 'women' as const },
    { id: 'birthday', title: 'Birthday Month', icon: '🎂', discount: '30% Off + Gift', description: 'Celebrate with extra savings', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'], targetAudience: 'birthday' as const },
    { id: 'corporate', title: 'Corporate Perks', icon: '🏢', discount: '20% Off', description: 'For verified employees', color: '#64748B', gradient: ['#64748B', '#475569'], targetAudience: 'corporate' as const },
    { id: 'first', title: 'First Order', icon: '🎁', discount: 'Flat 50% Off', description: 'Welcome to Rez!', color: '#10B981', gradient: ['#10B981', '#059669'], targetAudience: 'first' as const },
    { id: 'senior', title: 'Senior Citizens', icon: '👴', discount: '15% Extra Off', description: 'Age 60+ special discount', color: '#8B5CF6', gradient: ['#8B5CF6', '#6D28D9'], targetAudience: 'senior' as const },
  ];

  const offersToInsert = exclusiveOffersData.map((offer, index) => ({
    title: offer.title,
    icon: offer.icon,
    discount: offer.discount,
    description: offer.description,
    color: offer.color,
    gradient: offer.gradient,
    targetAudience: offer.targetAudience,
    categories: categoryIds,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
    sortOrder: index,
  }));

  const result = await ExclusiveOffer.insertMany(offersToInsert);
  log.success(`Seeded ${result.length} Exclusive Offers`);
  return result.length;
}

async function seedStoreMetadata(): Promise<number> {
  log.info('Updating Store Metadata...');

  const cityCoordinates: Record<string, [number, number]> = {
    mumbai: [72.8777, 19.0760],
    delhi: [77.2090, 28.6139],
    bangalore: [77.5946, 12.9716],
    hyderabad: [78.4867, 17.3850],
    chennai: [80.2707, 13.0827],
    kolkata: [88.3639, 22.5726],
    pune: [73.8567, 18.5204],
    ahmedabad: [72.5714, 23.0225],
  };

  function getRandomCoordinates(city?: string): [number, number] {
    if (city && cityCoordinates[city.toLowerCase()]) {
      const [lng, lat] = cityCoordinates[city.toLowerCase()];
      return [lng + (Math.random() - 0.5) * 0.05, lat + (Math.random() - 0.5) * 0.05];
    }
    return [72.8777 + (Math.random() - 0.5) * 0.1, 19.0760 + (Math.random() - 0.5) * 0.1];
  }

  const stores = await Store.find({});
  let updated = 0;

  for (const store of stores) {
    const updates: any = {};

    if (store.is60MinDelivery === undefined) {
      updates.is60MinDelivery = Math.random() > 0.4;
    }

    if (store.hasStorePickup === undefined) {
      updates.hasStorePickup = Math.random() > 0.3;
    }

    const hasCoordinates = store.location.coordinates && 
      Array.isArray(store.location.coordinates) && 
      store.location.coordinates.length === 2;
    
    if (!hasCoordinates) {
      const coords = getRandomCoordinates(store.location.city);
      updates['location.coordinates'] = coords;
    }

    if (Object.keys(updates).length > 0) {
      await Store.findByIdAndUpdate(store._id, { $set: updates });
      updated++;
    }
  }

  log.success(`Updated ${updated} stores with metadata`);
  return updated;
}

async function seedSocialProofStats(): Promise<number> {
  log.info('Seeding Social Proof Stats...');

  if (shouldClear) {
    await SocialProofStat.deleteMany({});
  }

  const categories = await Category.find({ slug: { $in: CATEGORY_SLUGS } });
  const statsToInsert = [];

  const sampleBuyers = [
    { name: 'Priya S.', avatar: '👩', item: 'Blue Dress', timeAgo: '2 mins ago' },
    { name: 'Rahul M.', avatar: '👨', item: 'Running Shoes', timeAgo: '5 mins ago' },
    { name: 'Sneha K.', avatar: '👩‍🦱', item: 'Skincare Set', timeAgo: '8 mins ago' },
    { name: 'Amit P.', avatar: '🧔', item: 'Laptop Bag', timeAgo: '12 mins ago' },
  ];

  function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  for (const category of categories) {
    const topHashtags = (category.trendingHashtags || [])
      .slice(0, 3)
      .map((h: any) => h.tag);

    if (topHashtags.length === 0) {
      topHashtags.push('#Trending', '#BestDeals', '#Cashback');
    }

    statsToInsert.push({
      category: category._id,
      shoppedToday: getRandomInt(1000, 5000),
      totalEarned: getRandomInt(20000, 100000),
      topHashtags,
      recentBuyers: sampleBuyers.slice(0, 4),
    });
  }

  const result = await SocialProofStat.insertMany(statsToInsert);
  log.success(`Seeded ${result.length} Social Proof Stats`);
  return result.length;
}

async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    log.header('Category Page Data Seeder');
    log.info(`Mode: ${shouldClear ? 'Clear & Seed' : 'Seed Only'}`);

    // Connect to database
    await connectDB();

    // Clear existing data if --clear flag is passed
    await clearData();

    log.header('Seeding data');

    // Seed category metadata
    const metadataCounts = await seedCategoryMetadata();

    // Seed bank offers and exclusive offers
    const bankOffersCount = await seedBankOffers();
    const exclusiveOffersCount = await seedExclusiveOffers();

    // Seed store metadata
    const storesUpdated = await seedStoreMetadata();

    // Seed social proof stats
    const socialProofCount = await seedSocialProofStats();

    // Summary
    log.header('Seeding Complete');
    console.log('\nSummary:');
    console.log('┌────────────────────────────┬───────┐');
    console.log('│ Collection                 │ Count │');
    console.log('├────────────────────────────┼───────┤');
    console.log(`│ Vibes                      │ ${String(metadataCounts.vibes).padStart(5)} │`);
    console.log(`│ Occasions                  │ ${String(metadataCounts.occasions).padStart(5)} │`);
    console.log(`│ Hashtags                    │ ${String(metadataCounts.hashtags).padStart(5)} │`);
    console.log(`│ Bank Offers                │ ${String(bankOffersCount).padStart(5)} │`);
    console.log(`│ Exclusive Offers           │ ${String(exclusiveOffersCount).padStart(5)} │`);
    console.log(`│ Stores Updated             │ ${String(storesUpdated).padStart(5)} │`);
    console.log(`│ Social Proof Stats         │ ${String(socialProofCount).padStart(5)} │`);
    console.log('└────────────────────────────┴───────┘');

    const total = metadataCounts.vibes + metadataCounts.occasions + metadataCounts.hashtags + bankOffersCount + exclusiveOffersCount + socialProofCount;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log.success(`\nTotal documents seeded: ${total}`);
    log.success(`Duration: ${duration}s`);

  } catch (error) {
    log.error(`Seeding failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
  }
}

// Run the seeder
main().catch(console.error);

