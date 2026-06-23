/**
 * Category Dummy Data - Comprehensive data for all 11 main categories
 * Used for displaying sections until backend endpoints are ready
 */
import { BRAND } from '@/constants/brand';

// ============================================
// VIBES DATA - Shopping mood/style filters
// ============================================
export interface Vibe {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const vibesData: Record<string, Vibe[]> = {
  'food-dining': [
    { id: 'romantic', name: 'Romantic Date', icon: '💕', color: '#F43F5E', description: 'Perfect for two' },
    { id: 'family', name: 'Family Feast', icon: '👨‍👩‍👧‍👦', color: '#3B82F6', description: 'Meals for everyone' },
    { id: 'quick', name: 'Quick Bite', icon: '⚡', color: '#F59E0B', description: 'Fast & delicious' },
    { id: 'healthy', name: 'Healthy Eats', icon: '🥗', color: '#ffcd57', description: 'Nutritious meals' },
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
    { id: 'natural', name: 'Natural Beauty', icon: '🌿', color: '#ffcd57', description: 'Organic products' },
    { id: 'spa', name: 'Spa Day', icon: '🧖', color: '#8B5CF6', description: 'Relaxation & pampering' },
    { id: 'bridal', name: 'Bridal Glow', icon: '👰', color: '#EC4899', description: 'Wedding-ready looks' },
    { id: 'men', name: 'Men\'s Care', icon: '🧔', color: '#3B82F6', description: 'Grooming essentials' },
    { id: 'hair', name: 'Hair Goals', icon: '💇', color: '#D946EF', description: 'Hair treatments' },
    { id: 'wellness', name: 'Inner Wellness', icon: '🧘', color: '#14B8A6', description: 'Mind & body balance' },
    { id: 'quick', name: 'Quick Fix', icon: '⚡', color: '#F59E0B', description: '15-min treatments' },
  ],
  'grocery-essentials': [
    { id: 'organic', name: 'Organic', icon: '🌱', color: '#ffcd57', description: 'Chemical-free products' },
    { id: 'fresh', name: 'Farm Fresh', icon: '🥬', color: '#22C55E', description: 'Daily fresh produce' },
    { id: 'bulk', name: 'Bulk Buy', icon: '📦', color: '#F59E0B', description: 'Stock up & save' },
    { id: 'instant', name: 'Instant Meals', icon: '⏱️', color: '#EF4444', description: 'Ready to cook' },
    { id: 'healthy', name: 'Health Foods', icon: '💪', color: '#3B82F6', description: 'Nutritious choices' },
    { id: 'baby', name: 'Baby Care', icon: '👶', color: '#EC4899', description: 'For little ones' },
    { id: 'pet', name: 'Pet Supplies', icon: '🐕', color: '#8B5CF6', description: 'For furry friends' },
    { id: 'cleaning', name: 'Clean Home', icon: '🧹', color: '#06B6D4', description: 'Household essentials' },
  ],
  'healthcare': [
    { id: 'immunity', name: 'Immunity Boost', icon: '🛡️', color: '#ffcd57', description: 'Stay strong & healthy' },
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
    { id: 'outdoor', name: 'Outdoor Adventure', icon: '🏕️', color: '#ffcd57', description: 'Nature activities' },
    { id: 'swimming', name: 'Swim Ready', icon: '🏊', color: '#06B6D4', description: 'Pool & beach gear' },
    { id: 'team', name: 'Team Sports', icon: '⚽', color: '#22C55E', description: 'Group activities' },
    { id: 'recovery', name: 'Recovery Mode', icon: '🧊', color: '#64748B', description: 'Rest & heal' },
    { id: 'nutrition', name: 'Sports Nutrition', icon: '🥤', color: '#F59E0B', description: 'Performance fuel' },
  ],
  'education-learning': [
    { id: 'exam', name: 'Exam Prep', icon: '📝', color: '#EF4444', description: 'Ace your tests' },
    { id: 'career', name: 'Career Boost', icon: '💼', color: '#3B82F6', description: 'Professional skills' },
    { id: 'creative', name: 'Creative Arts', icon: '🎨', color: '#EC4899', description: 'Artistic learning' },
    { id: 'language', name: 'Language Master', icon: '🗣️', color: '#ffcd57', description: 'New languages' },
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
    { id: 'garden', name: 'Garden Care', icon: '🌺', color: '#ffcd57', description: 'Green thumb' },
    { id: 'appliance', name: 'Appliance Fix', icon: '🔌', color: '#64748B', description: 'Electronics repair' },
  ],
  'travel-experiences': [
    { id: 'adventure', name: 'Adventure', icon: '🏔️', color: '#ffcd57', description: 'Thrill seekers' },
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
    { id: 'family', name: 'Family Fun', icon: '🎪', color: '#ffcd57', description: 'All ages' },
    { id: 'nightlife', name: 'Nightlife', icon: '🌃', color: '#D946EF', description: 'After dark' },
    { id: 'arts', name: 'Arts & Theater', icon: '🎭', color: '#06B6D4', description: 'Cultural shows' },
  ],
  'financial-lifestyle': [
    { id: 'savings', name: 'Smart Savings', icon: '🏦', color: '#ffcd57', description: 'Grow your money' },
    { id: 'investment', name: 'Investment', icon: '📈', color: '#3B82F6', description: 'Build wealth' },
    { id: 'insurance', name: 'Insurance', icon: '🛡️', color: '#8B5CF6', description: 'Stay protected' },
    { id: 'loans', name: 'Quick Loans', icon: '💳', color: '#F59E0B', description: 'Easy credit' },
    { id: 'rewards', name: 'Rewards', icon: '🎁', color: '#EC4899', description: 'Earn & redeem' },
    { id: 'tax', name: 'Tax Planning', icon: '📋', color: '#64748B', description: 'Save on taxes' },
    { id: 'premium', name: 'Premium Life', icon: '👑', color: '#D946EF', description: 'Luxury benefits' },
    { id: 'student', name: 'Student Plans', icon: '🎓', color: '#14B8A6', description: 'Youth offers' },
  ],
};

// ============================================
// OCCASIONS DATA - Event-based shopping
// ============================================
export interface Occasion {
  id: string;
  name: string;
  icon: string;
  color: string;
  tag: string | null;
  discount: number;
}

export const occasionsData: Record<string, Occasion[]> = {
  'food-dining': [
    { id: 'birthday', name: 'Birthday', icon: '🎂', color: '#EC4899', tag: 'Popular', discount: 20 },
    { id: 'anniversary', name: 'Anniversary', icon: '💑', color: '#F43F5E', tag: 'Romantic', discount: 25 },
    { id: 'corporate', name: 'Corporate', icon: '🏢', color: '#3B82F6', tag: null, discount: 15 },
    { id: 'wedding', name: 'Wedding', icon: '💒', color: '#D946EF', tag: 'Premium', discount: 30 },
    { id: 'family', name: 'Family Gathering', icon: '👨‍👩‍👧‍👦', color: '#F59E0B', tag: null, discount: 18 },
    { id: 'eid', name: 'Eid Feast', icon: '🌙', color: '#ffcd57', tag: 'Festive', discount: 25 },
    { id: 'diwali', name: 'Diwali', icon: '🪔', color: '#FF9500', tag: 'Coming Soon', discount: 30 },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#EF4444', tag: null, discount: 22 },
  ],
  'fashion': [
    { id: 'wedding', name: 'Wedding', icon: '💒', color: '#F43F5E', tag: 'Hot', discount: 30 },
    { id: 'eid', name: 'Eid', icon: '🌙', color: '#ffcd57', tag: 'Trending', discount: 25 },
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
    { id: 'eid', name: 'Eid', icon: '🌙', color: '#ffcd57', tag: 'Special', discount: 30 },
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
    { id: 'fitness', name: 'Fitness Goals', icon: '💪', color: '#ffcd57', tag: 'New Year', discount: 20 },
    { id: 'travel', name: 'Travel Kit', icon: '✈️', color: '#14B8A6', tag: null, discount: 15 },
  ],
  'fitness-sports': [
    { id: 'newyear', name: 'New Year Goals', icon: '🎯', color: '#ffcd57', tag: 'Hot', discount: 35 },
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
    { id: 'admission', name: 'Admission', icon: '🎓', color: '#ffcd57', tag: 'Season', discount: 35 },
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
    { id: 'adventure', name: 'Adventure Trip', icon: '🏔️', color: '#ffcd57', tag: null, discount: 22 },
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
    { id: 'newyear', name: 'New Year Goals', icon: '🎯', color: '#ffcd57', tag: 'Planning', discount: 20 },
    { id: 'tax', name: 'Tax Season', icon: '📋', color: '#3B82F6', tag: 'Important', discount: 30 },
    { id: 'wedding', name: 'Wedding Planning', icon: '💒', color: '#EC4899', tag: 'Premium', discount: 25 },
    { id: 'retirement', name: 'Retirement', icon: '🏖️', color: '#F59E0B', tag: null, discount: 22 },
    { id: 'education', name: 'Education Fund', icon: '🎓', color: '#8B5CF6', tag: 'Future', discount: 18 },
    { id: 'home', name: 'Home Loan', icon: '🏠', color: '#14B8A6', tag: null, discount: 15 },
    { id: 'business', name: 'Business Start', icon: '🚀', color: '#EF4444', tag: 'Hot', discount: 28 },
    { id: 'travel', name: 'Travel Fund', icon: '✈️', color: '#06B6D4', tag: null, discount: 20 },
  ],
};

// ============================================
// TRENDING HASHTAGS
// ============================================
export interface TrendingHashtag {
  id: string;
  tag: string;
  count: number;
  color: string;
  trending: boolean;
}

export const trendingHashtagsData: Record<string, TrendingHashtag[]> = {
  'food-dining': [
    { id: '1', tag: '#BiryaniLovers', count: 2450, color: '#F59E0B', trending: true },
    { id: '2', tag: '#HealthyEats', count: 1890, color: '#ffcd57', trending: true },
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
    { id: '5', tag: '#SustainableFashion', count: 1500, color: '#ffcd57', trending: true },
    { id: '6', tag: '#EthnicVibes', count: 3200, color: '#D946EF', trending: false },
  ],
  'beauty-wellness': [
    { id: '1', tag: '#GlowUp', count: 4500, color: '#FBBF24', trending: true },
    { id: '2', tag: '#SkincareRoutine', count: 3800, color: '#EC4899', trending: true },
    { id: '3', tag: '#NaturalBeauty', count: 2200, color: '#ffcd57', trending: false },
    { id: '4', tag: '#SpaDay', count: 1900, color: '#8B5CF6', trending: false },
    { id: '5', tag: '#BridalGlow', count: 1600, color: '#D946EF', trending: true },
    { id: '6', tag: '#SelfCare', count: 2800, color: '#14B8A6', trending: false },
  ],
  'grocery-essentials': [
    { id: '1', tag: '#OrganicLiving', count: 2100, color: '#ffcd57', trending: true },
    { id: '2', tag: '#MealPrep', count: 1800, color: '#3B82F6', trending: true },
    { id: '3', tag: '#FarmToTable', count: 1500, color: '#22C55E', trending: false },
    { id: '4', tag: '#HealthyPantry', count: 1200, color: '#F59E0B', trending: false },
    { id: '5', tag: '#BulkBuying', count: 900, color: '#8B5CF6', trending: true },
    { id: '6', tag: '#FreshProduce', count: 1600, color: '#14B8A6', trending: false },
  ],
  'healthcare': [
    { id: '1', tag: '#ImmunityBoost', count: 3500, color: '#ffcd57', trending: true },
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
    { id: '4', tag: '#FitFam', count: 4100, color: '#ffcd57', trending: false },
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
    { id: '6', tag: '#GardenGoals', count: 1200, color: '#ffcd57', trending: false },
  ],
  'travel-experiences': [
    { id: '1', tag: '#Wanderlust', count: 6500, color: '#3B82F6', trending: true },
    { id: '2', tag: '#TravelIndia', count: 4200, color: '#F59E0B', trending: true },
    { id: '3', tag: '#HiddenGems', count: 2800, color: '#ffcd57', trending: false },
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
    { id: '1', tag: '#MoneyMatters', count: 3200, color: '#ffcd57', trending: true },
    { id: '2', tag: '#InvestSmart', count: 2800, color: '#3B82F6', trending: true },
    { id: '3', tag: '#FinancialFreedom', count: 2100, color: '#F59E0B', trending: false },
    { id: '4', tag: '#SavingsGoals', count: 1800, color: '#22C55E', trending: false },
    { id: '5', tag: '#WealthBuilding', count: 1500, color: '#8B5CF6', trending: true },
    { id: '6', tag: '#BudgetLife', count: 1200, color: '#64748B', trending: false },
  ],
};

// ============================================
// EXCLUSIVE OFFERS
// ============================================
export interface ExclusiveOffer {
  id: string;
  title: string;
  icon: string;
  discount: string;
  description: string;
  color: string;
  gradient: string[];
}

export const exclusiveOffersData: ExclusiveOffer[] = [
  {
    id: 'student',
    title: 'Student Special',
    icon: '🎓',
    discount: '25% Extra Off',
    description: 'Valid student ID required',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#1D4ED8'],
  },
  {
    id: 'women',
    title: 'Women Exclusive',
    icon: '👩',
    discount: 'Up to 40% Off',
    description: 'Celebrate every day',
    color: '#EC4899',
    gradient: ['#EC4899', '#BE185D'],
  },
  {
    id: 'birthday',
    title: 'Birthday Month',
    icon: '🎂',
    discount: '30% Off + Gift',
    description: 'Celebrate with extra savings',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    id: 'corporate',
    title: 'Corporate Perks',
    icon: '🏢',
    discount: '20% Off',
    description: 'For verified employees',
    color: '#64748B',
    gradient: ['#64748B', '#475569'],
  },
  {
    id: 'first',
    title: 'First Order',
    icon: '🎁',
    discount: 'Flat 50% Off',
    description: `Welcome to ${BRAND.APP_NAME}!`,
    color: '#ffcd57',
    gradient: ['#ffcd57', '#1a3a52'],
  },
  {
    id: 'senior',
    title: 'Senior Citizens',
    icon: '👴',
    discount: '15% Extra Off',
    description: 'Age 60+ special discount',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#6D28D9'],
  },
];

// ============================================
// BANK OFFERS
// ============================================
export interface BankOffer {
  id: string;
  bank: string;
  icon: string;
  offer: string;
  maxDiscount: number;
  minOrder: number;
  cardType: string;
}

export const bankOffersData: BankOffer[] = [
  { id: 'hdfc', bank: 'HDFC Bank', icon: '🏦', offer: '10% Instant Discount', maxDiscount: 1500, minOrder: 3000, cardType: 'Credit/Debit' },
  { id: 'icici', bank: 'ICICI Bank', icon: '🏛️', offer: '15% Cashback', maxDiscount: 2000, minOrder: 5000, cardType: 'Credit Card' },
  { id: 'axis', bank: 'Axis Bank', icon: '💳', offer: 'Flat ₹500 Off', maxDiscount: 500, minOrder: 2500, cardType: 'All Cards' },
  { id: 'sbi', bank: 'SBI Card', icon: '🏦', offer: '5% Cashback', maxDiscount: 750, minOrder: 2000, cardType: 'Credit Card' },
  { id: 'kotak', bank: 'Kotak Bank', icon: '💰', offer: 'Flat ₹300 Off', maxDiscount: 300, minOrder: 1500, cardType: 'Debit Card' },
  { id: 'amex', bank: 'American Express', icon: '💎', offer: '20% Off', maxDiscount: 3000, minOrder: 10000, cardType: 'Credit Card' },
];

// ============================================
// QUICK ACTIONS
// ============================================
export interface QuickAction {
  id: string;
  name: string;
  icon: string;
  color: string;
  route?: string;
}

export const quickActionsData: QuickAction[] = [
  { id: 'offers', name: 'Offers', icon: '🏷️', color: '#EF4444' },
  { id: 'cashback', name: 'Cashback', icon: '💰', color: '#F59E0B' },
  { id: 'exclusive', name: 'Exclusive', icon: '👑', color: '#8B5CF6' },
  { id: '60min', name: '60 Min', icon: '⚡', color: '#3B82F6' },
  { id: 'compare', name: 'Compare', icon: '🔄', color: '#06B6D4' },
  { id: 'play', name: 'Play & Earn', icon: '🎮', color: '#ffcd57' },
  { id: 'reviews', name: 'Reviews', icon: '⭐', color: '#FBBF24' },
  { id: 'saved', name: 'Saved', icon: '❤️', color: '#EC4899' },
];

// ============================================
// LOYALTY DATA
// ============================================
export interface LoyaltyData {
  streak: {
    current: number;
    target: number;
    lastCheckin: string;
  };
  brandLoyalty: Array<{
    brandId: string;
    brandName: string;
    purchaseCount: number;
    tier: string;
    progress: number;
    nextTierAt: number;
  }>;
  missions: Array<{
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    reward: number;
    icon: string;
  }>;
  coins: {
    available: number;
    expiring: number;
    expiryDays: number;
  };
}

export const loyaltyData: LoyaltyData = {
  streak: {
    current: 5,
    target: 7,
    lastCheckin: new Date().toISOString(),
  },
  brandLoyalty: [
    { brandId: 'zara', brandName: 'Zara', purchaseCount: 8, tier: 'Gold', progress: 80, nextTierAt: 10 },
    { brandId: 'hm', brandName: 'H&M', purchaseCount: 5, tier: 'Silver', progress: 50, nextTierAt: 10 },
    { brandId: 'nike', brandName: 'Nike', purchaseCount: 3, tier: 'Bronze', progress: 30, nextTierAt: 10 },
  ],
  missions: [
    { id: '1', title: 'First Purchase', description: 'Make your first purchase this week', progress: 0, target: 1, reward: 100, icon: '🛒' },
    { id: '2', title: 'Review Master', description: 'Write 3 reviews', progress: 1, target: 3, reward: 150, icon: '⭐' },
    { id: '3', title: 'Refer a Friend', description: `Invite friends to ${BRAND.APP_NAME}`, progress: 2, target: 5, reward: 500, icon: '👥' },
    { id: '4', title: 'Daily Login', description: 'Login 7 days in a row', progress: 5, target: 7, reward: 200, icon: '📅' },
  ],
  coins: {
    available: 2450,
    expiring: 500,
    expiryDays: 7,
  },
};

// ============================================
// SOCIAL PROOF STATS
// ============================================
export interface SocialProofStats {
  shoppedToday: number;
  totalEarned: number;
  topHashtags: string[];
  recentBuyers: Array<{
    name: string;
    avatar: string;
    item: string;
    timeAgo: string;
  }>;
}

export const socialProofStats: SocialProofStats = {
  shoppedToday: 2340,
  totalEarned: 45000,
  topHashtags: ['#Trending', '#BestDeals', '#Cashback'],
  recentBuyers: [
    { name: 'Priya S.', avatar: '👩', item: 'Blue Dress', timeAgo: '2 mins ago' },
    { name: 'Rahul M.', avatar: '👨', item: 'Running Shoes', timeAgo: '5 mins ago' },
    { name: 'Sneha K.', avatar: '👩‍🦱', item: 'Skincare Set', timeAgo: '8 mins ago' },
    { name: 'Amit P.', avatar: '🧔', item: 'Laptop Bag', timeAgo: '12 mins ago' },
  ],
};

// ============================================
// DUMMY BRANDS
// ============================================
export interface Brand {
  id: string;
  name: string;
  logo: string;
  cashback: number;
  tag: string | null;
  rating: number;
}

export const brandsData: Record<string, Brand[]> = {
  'food-dining': [
    { id: 'dominos', name: 'Domino\'s', logo: '🍕', cashback: 15, tag: 'Popular', rating: 4.5 },
    { id: 'mcdonalds', name: 'McDonald\'s', logo: '🍔', cashback: 12, tag: null, rating: 4.3 },
    { id: 'starbucks', name: 'Starbucks', logo: '☕', cashback: 18, tag: 'Premium', rating: 4.6 },
    { id: 'swiggy', name: 'Swiggy', logo: '🛵', cashback: 20, tag: 'Trending', rating: 4.4 },
    { id: 'zomato', name: 'Zomato', logo: '🍽️', cashback: 18, tag: null, rating: 4.5 },
    { id: 'kfc', name: 'KFC', logo: '🍗', cashback: 14, tag: null, rating: 4.2 },
    { id: 'subway', name: 'Subway', logo: '🥪', cashback: 16, tag: 'Healthy', rating: 4.3 },
    { id: 'pizzahut', name: 'Pizza Hut', logo: '🍕', cashback: 15, tag: null, rating: 4.4 },
  ],
  'fashion': [
    { id: 'zara', name: 'Zara', logo: '👗', cashback: 18, tag: 'Trending', rating: 4.6 },
    { id: 'hm', name: 'H&M', logo: '🧥', cashback: 15, tag: null, rating: 4.4 },
    { id: 'nike', name: 'Nike', logo: '👟', cashback: 12, tag: 'Sports', rating: 4.7 },
    { id: 'levis', name: 'Levis', logo: '👖', cashback: 16, tag: null, rating: 4.5 },
    { id: 'manyavar', name: 'Manyavar', logo: '🪷', cashback: 22, tag: 'Ethnic', rating: 4.8 },
    { id: 'fossil', name: 'Fossil', logo: '⌚', cashback: 16, tag: null, rating: 4.6 },
    { id: 'rayban', name: 'Ray-Ban', logo: '🕶️', cashback: 15, tag: 'Premium', rating: 4.8 },
    { id: 'bewakoof', name: 'Bewakoof', logo: '🧢', cashback: 22, tag: 'Budget', rating: 4.2 },
  ],
  'beauty-wellness': [
    { id: 'nykaa', name: 'Nykaa', logo: '💄', cashback: 20, tag: 'Popular', rating: 4.5 },
    { id: 'mamaearth', name: 'Mamaearth', logo: '🌿', cashback: 18, tag: 'Natural', rating: 4.4 },
    { id: 'lakme', name: 'Lakme', logo: '💋', cashback: 15, tag: null, rating: 4.6 },
    { id: 'loreal', name: 'L\'Oreal', logo: '✨', cashback: 16, tag: 'Premium', rating: 4.7 },
    { id: 'forestessentials', name: 'Forest Essentials', logo: '🌸', cashback: 22, tag: 'Luxury', rating: 4.8 },
    { id: 'bodyshop', name: 'The Body Shop', logo: '🧴', cashback: 18, tag: null, rating: 4.5 },
    { id: 'kama', name: 'Kama Ayurveda', logo: '🪷', cashback: 20, tag: 'Ayurvedic', rating: 4.6 },
    { id: 'minimalist', name: 'Minimalist', logo: '🧪', cashback: 25, tag: 'Trending', rating: 4.4 },
  ],
  'grocery-essentials': [
    { id: 'bigbasket', name: 'BigBasket', logo: '🛒', cashback: 15, tag: 'Popular', rating: 4.4 },
    { id: 'blinkit', name: 'Blinkit', logo: '⚡', cashback: 18, tag: '10 Min', rating: 4.3 },
    { id: 'zepto', name: 'Zepto', logo: '🚀', cashback: 20, tag: 'Fast', rating: 4.5 },
    { id: 'dmart', name: 'D-Mart', logo: '🏪', cashback: 12, tag: 'Value', rating: 4.6 },
    { id: 'naturals', name: 'Nature\'s Basket', logo: '🥬', cashback: 16, tag: 'Premium', rating: 4.5 },
    { id: 'amazon', name: 'Amazon Fresh', logo: '📦', cashback: 14, tag: null, rating: 4.4 },
    { id: 'jiomart', name: 'JioMart', logo: '🛍️', cashback: 15, tag: null, rating: 4.2 },
    { id: 'spencers', name: 'Spencer\'s', logo: '🏬', cashback: 13, tag: null, rating: 4.3 },
  ],
  'healthcare': [
    { id: 'pharmeasy', name: 'PharmEasy', logo: '💊', cashback: 20, tag: 'Popular', rating: 4.5 },
    { id: '1mg', name: '1mg', logo: '🏥', cashback: 18, tag: null, rating: 4.4 },
    { id: 'netmeds', name: 'Netmeds', logo: '💉', cashback: 15, tag: null, rating: 4.3 },
    { id: 'apollo', name: 'Apollo', logo: '⚕️', cashback: 16, tag: 'Trusted', rating: 4.7 },
    { id: 'practo', name: 'Practo', logo: '👨‍⚕️', cashback: 22, tag: 'Consult', rating: 4.5 },
    { id: 'healthkart', name: 'HealthKart', logo: '💪', cashback: 18, tag: 'Fitness', rating: 4.4 },
    { id: 'wellbeing', name: 'WellBeing', logo: '🧘', cashback: 20, tag: 'Wellness', rating: 4.3 },
    { id: 'himalaya', name: 'Himalaya', logo: '🌿', cashback: 14, tag: 'Ayurvedic', rating: 4.6 },
  ],
  'fitness-sports': [
    { id: 'nike', name: 'Nike', logo: '👟', cashback: 15, tag: 'Popular', rating: 4.8 },
    { id: 'adidas', name: 'Adidas', logo: '🏃', cashback: 14, tag: null, rating: 4.7 },
    { id: 'puma', name: 'Puma', logo: '🐆', cashback: 16, tag: null, rating: 4.5 },
    { id: 'decathlon', name: 'Decathlon', logo: '⛺', cashback: 18, tag: 'Value', rating: 4.6 },
    { id: 'cultfit', name: 'Cult.fit', logo: '🏋️', cashback: 22, tag: 'Trending', rating: 4.5 },
    { id: 'reebok', name: 'Reebok', logo: '💪', cashback: 15, tag: null, rating: 4.4 },
    { id: 'underarmour', name: 'Under Armour', logo: '🦾', cashback: 17, tag: 'Premium', rating: 4.6 },
    { id: 'skechers', name: 'Skechers', logo: '👣', cashback: 14, tag: null, rating: 4.3 },
  ],
  'education-learning': [
    { id: 'byjus', name: 'BYJU\'S', logo: '📚', cashback: 20, tag: 'Popular', rating: 4.3 },
    { id: 'unacademy', name: 'Unacademy', logo: '🎓', cashback: 18, tag: 'Trending', rating: 4.4 },
    { id: 'vedantu', name: 'Vedantu', logo: '👨‍🏫', cashback: 22, tag: null, rating: 4.5 },
    { id: 'whitehat', name: 'WhiteHat Jr', logo: '💻', cashback: 25, tag: 'Coding', rating: 4.2 },
    { id: 'coursera', name: 'Coursera', logo: '🌐', cashback: 15, tag: 'Global', rating: 4.7 },
    { id: 'udemy', name: 'Udemy', logo: '📖', cashback: 30, tag: 'Hot', rating: 4.5 },
    { id: 'skillshare', name: 'Skillshare', logo: '🎨', cashback: 20, tag: 'Creative', rating: 4.4 },
    { id: 'upgrad', name: 'upGrad', logo: '📈', cashback: 18, tag: 'Career', rating: 4.3 },
  ],
  'home-services': [
    { id: 'urbanclap', name: 'Urban Company', logo: '🏠', cashback: 20, tag: 'Popular', rating: 4.5 },
    { id: 'housejoy', name: 'Housejoy', logo: '🧹', cashback: 18, tag: null, rating: 4.3 },
    { id: 'paintmywalls', name: 'Paint My Walls', logo: '🎨', cashback: 22, tag: null, rating: 4.4 },
    { id: 'zimmber', name: 'Zimmber', logo: '🔧', cashback: 15, tag: null, rating: 4.2 },
    { id: 'godrej', name: 'Godrej Interio', logo: '🛋️', cashback: 16, tag: 'Premium', rating: 4.6 },
    { id: 'pepperfry', name: 'Pepperfry', logo: '🪑', cashback: 18, tag: 'Furniture', rating: 4.5 },
    { id: 'ikea', name: 'IKEA', logo: '🏡', cashback: 12, tag: 'Trending', rating: 4.7 },
    { id: 'livspace', name: 'Livspace', logo: '✨', cashback: 20, tag: 'Design', rating: 4.4 },
  ],
  'travel-experiences': [
    { id: 'makemytrip', name: 'MakeMyTrip', logo: '✈️', cashback: 15, tag: 'Popular', rating: 4.5 },
    { id: 'goibibo', name: 'Goibibo', logo: '🏨', cashback: 18, tag: null, rating: 4.4 },
    { id: 'cleartrip', name: 'Cleartrip', logo: '🎫', cashback: 16, tag: null, rating: 4.3 },
    { id: 'oyo', name: 'OYO', logo: '🛏️', cashback: 20, tag: 'Budget', rating: 4.2 },
    { id: 'airbnb', name: 'Airbnb', logo: '🏡', cashback: 12, tag: 'Unique', rating: 4.6 },
    { id: 'yatra', name: 'Yatra', logo: '🌍', cashback: 14, tag: null, rating: 4.3 },
    { id: 'thrillophilia', name: 'Thrillophilia', logo: '🏔️', cashback: 22, tag: 'Adventure', rating: 4.5 },
    { id: 'ixigo', name: 'ixigo', logo: '🚂', cashback: 15, tag: 'Trains', rating: 4.4 },
  ],
  'entertainment': [
    { id: 'bookmyshow', name: 'BookMyShow', logo: '🎬', cashback: 15, tag: 'Popular', rating: 4.6 },
    { id: 'pvr', name: 'PVR Cinemas', logo: '🍿', cashback: 12, tag: null, rating: 4.5 },
    { id: 'inox', name: 'INOX', logo: '🎥', cashback: 14, tag: null, rating: 4.4 },
    { id: 'netflix', name: 'Netflix', logo: '📺', cashback: 10, tag: 'Streaming', rating: 4.7 },
    { id: 'hotstar', name: 'Disney+', logo: '⭐', cashback: 12, tag: null, rating: 4.5 },
    { id: 'prime', name: 'Prime Video', logo: '📦', cashback: 10, tag: null, rating: 4.6 },
    { id: 'spotify', name: 'Spotify', logo: '🎵', cashback: 15, tag: 'Music', rating: 4.7 },
    { id: 'gaana', name: 'Gaana', logo: '🎶', cashback: 18, tag: null, rating: 4.3 },
  ],
  'financial-lifestyle': [
    { id: 'paytm', name: 'Paytm', logo: '💳', cashback: 10, tag: 'Popular', rating: 4.4 },
    { id: 'phonepe', name: 'PhonePe', logo: '📱', cashback: 12, tag: null, rating: 4.5 },
    { id: 'gpay', name: 'Google Pay', logo: '💰', cashback: 10, tag: null, rating: 4.6 },
    { id: 'cred', name: 'CRED', logo: '💎', cashback: 20, tag: 'Premium', rating: 4.5 },
    { id: 'groww', name: 'Groww', logo: '📈', cashback: 15, tag: 'Invest', rating: 4.4 },
    { id: 'zerodha', name: 'Zerodha', logo: '📊', cashback: 12, tag: 'Trading', rating: 4.6 },
    { id: 'policybazaar', name: 'PolicyBazaar', logo: '🛡️', cashback: 18, tag: 'Insurance', rating: 4.3 },
    { id: 'etmoney', name: 'ET Money', logo: '💵', cashback: 15, tag: null, rating: 4.4 },
  ],
};

// ============================================
// DUMMY PRODUCTS FOR TRENDING/DEALS
// ============================================
export interface DummyProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  reviews: number;
  cashbackPercent: number;
  coinsEarned: number;
  tag: string | null;
  is60Min: boolean;
  hasPickup: boolean;
}

export const dummyProductsData: Record<string, DummyProduct[]> = {
  'food-dining': [
    { id: 'fd1', name: 'Chicken Biryani Family Pack', brand: 'Behrouz', price: 599, originalPrice: 899, image: '🍛', rating: 4.6, reviews: 2340, cashbackPercent: 15, coinsEarned: 90, tag: 'Bestseller', is60Min: true, hasPickup: true },
    { id: 'fd2', name: 'Pizza Combo for 2', brand: 'Domino\'s', price: 499, originalPrice: 799, image: '🍕', rating: 4.5, reviews: 1890, cashbackPercent: 12, coinsEarned: 60, tag: null, is60Min: true, hasPickup: true },
    { id: 'fd3', name: 'Premium Coffee Experience', brand: 'Starbucks', price: 399, originalPrice: 599, image: '☕', rating: 4.7, reviews: 1560, cashbackPercent: 18, coinsEarned: 72, tag: 'Premium', is60Min: false, hasPickup: true },
    { id: 'fd4', name: 'Healthy Buddha Bowl', brand: 'The Green Cafe', price: 299, originalPrice: 449, image: '🥗', rating: 4.4, reviews: 890, cashbackPercent: 20, coinsEarned: 60, tag: 'Healthy', is60Min: true, hasPickup: false },
    { id: 'fd5', name: 'Dessert Platter', brand: 'Sweet Treats', price: 449, originalPrice: 699, image: '🍰', rating: 4.8, reviews: 2100, cashbackPercent: 16, coinsEarned: 72, tag: 'Trending', is60Min: true, hasPickup: true },
    { id: 'fd6', name: 'Sushi Combo', brand: 'Tokyo Tales', price: 799, originalPrice: 1199, image: '🍣', rating: 4.6, reviews: 780, cashbackPercent: 14, coinsEarned: 112, tag: 'Premium', is60Min: false, hasPickup: true },
  ],
  'fashion': [
    { id: 'f1', name: 'Premium Cotton Shirt', brand: 'Allen Solly', price: 1499, originalPrice: 2499, image: '👔', rating: 4.5, reviews: 2340, cashbackPercent: 18, coinsEarned: 270, tag: 'Bestseller', is60Min: true, hasPickup: true },
    { id: 'f2', name: 'Floral Maxi Dress', brand: 'AND', price: 2299, originalPrice: 3999, image: '👗', rating: 4.6, reviews: 3210, cashbackPercent: 22, coinsEarned: 506, tag: 'Trending', is60Min: true, hasPickup: true },
    { id: 'f3', name: 'Running Shoes', brand: 'Nike', price: 8999, originalPrice: 12999, image: '👟', rating: 4.8, reviews: 5670, cashbackPercent: 12, coinsEarned: 1080, tag: 'Sports', is60Min: false, hasPickup: true },
    { id: 'f4', name: 'Classic Watch', brand: 'Fossil', price: 8999, originalPrice: 12999, image: '⌚', rating: 4.6, reviews: 3450, cashbackPercent: 16, coinsEarned: 1440, tag: null, is60Min: false, hasPickup: true },
    { id: 'f5', name: 'Leather Tote Bag', brand: 'Hidesign', price: 4999, originalPrice: 7999, image: '👜', rating: 4.7, reviews: 1560, cashbackPercent: 16, coinsEarned: 800, tag: 'Premium', is60Min: false, hasPickup: true },
    { id: 'f6', name: 'Ethnic Kurta Set', brand: 'FabIndia', price: 2499, originalPrice: 3999, image: '🪷', rating: 4.5, reviews: 4560, cashbackPercent: 20, coinsEarned: 500, tag: 'Festive', is60Min: true, hasPickup: true },
  ],
  'beauty-wellness': [
    { id: 'bw1', name: 'Vitamin C Serum', brand: 'Minimalist', price: 599, originalPrice: 999, image: '✨', rating: 4.7, reviews: 8900, cashbackPercent: 25, coinsEarned: 150, tag: 'Bestseller', is60Min: true, hasPickup: true },
    { id: 'bw2', name: 'Hair Spa Treatment', brand: 'L\'Oreal', price: 899, originalPrice: 1499, image: '💆', rating: 4.5, reviews: 2340, cashbackPercent: 18, coinsEarned: 162, tag: null, is60Min: false, hasPickup: true },
    { id: 'bw3', name: 'Facial Kit', brand: 'Lakme', price: 799, originalPrice: 1299, image: '💄', rating: 4.6, reviews: 3560, cashbackPercent: 20, coinsEarned: 160, tag: 'Trending', is60Min: true, hasPickup: true },
    { id: 'bw4', name: 'Ayurvedic Hair Oil', brand: 'Forest Essentials', price: 1299, originalPrice: 1999, image: '🌿', rating: 4.8, reviews: 4500, cashbackPercent: 22, coinsEarned: 286, tag: 'Premium', is60Min: false, hasPickup: true },
    { id: 'bw5', name: 'Spa Day Package', brand: 'Urban Company', price: 2499, originalPrice: 3999, image: '🧖', rating: 4.7, reviews: 1890, cashbackPercent: 20, coinsEarned: 500, tag: 'Special', is60Min: false, hasPickup: false },
    { id: 'bw6', name: 'Perfume Gift Set', brand: 'Nykaa', price: 1999, originalPrice: 2999, image: '🌸', rating: 4.5, reviews: 2100, cashbackPercent: 18, coinsEarned: 360, tag: null, is60Min: true, hasPickup: true },
  ],
  'grocery-essentials': [
    { id: 'ge1', name: 'Organic Vegetables Box', brand: 'BigBasket', price: 399, originalPrice: 599, image: '🥬', rating: 4.4, reviews: 5600, cashbackPercent: 15, coinsEarned: 60, tag: 'Fresh', is60Min: true, hasPickup: true },
    { id: 'ge2', name: 'Premium Basmati Rice 5kg', brand: 'India Gate', price: 599, originalPrice: 799, image: '🍚', rating: 4.6, reviews: 8900, cashbackPercent: 12, coinsEarned: 72, tag: null, is60Min: true, hasPickup: true },
    { id: 'ge3', name: 'Cold Pressed Oil Set', brand: 'Nature\'s Basket', price: 899, originalPrice: 1299, image: '🫒', rating: 4.7, reviews: 2340, cashbackPercent: 18, coinsEarned: 162, tag: 'Healthy', is60Min: false, hasPickup: true },
    { id: 'ge4', name: 'Breakfast Combo Pack', brand: 'Blinkit', price: 499, originalPrice: 749, image: '🥣', rating: 4.3, reviews: 3450, cashbackPercent: 20, coinsEarned: 100, tag: 'Quick', is60Min: true, hasPickup: false },
    { id: 'ge5', name: 'Dry Fruits Premium Box', brand: 'Nutraj', price: 1299, originalPrice: 1999, image: '🥜', rating: 4.8, reviews: 4560, cashbackPercent: 16, coinsEarned: 208, tag: 'Premium', is60Min: false, hasPickup: true },
    { id: 'ge6', name: 'Baby Food Combo', brand: 'Nestle', price: 699, originalPrice: 999, image: '👶', rating: 4.5, reviews: 6780, cashbackPercent: 14, coinsEarned: 98, tag: null, is60Min: true, hasPickup: true },
  ],
  'healthcare': [
    { id: 'hc1', name: 'Immunity Booster Pack', brand: 'Himalaya', price: 599, originalPrice: 899, image: '🛡️', rating: 4.6, reviews: 12000, cashbackPercent: 20, coinsEarned: 120, tag: 'Bestseller', is60Min: true, hasPickup: true },
    { id: 'hc2', name: 'Multivitamin 90 Tablets', brand: 'HealthKart', price: 799, originalPrice: 1199, image: '💊', rating: 4.5, reviews: 8900, cashbackPercent: 18, coinsEarned: 144, tag: null, is60Min: true, hasPickup: true },
    { id: 'hc3', name: 'BP Monitor Digital', brand: 'Omron', price: 1999, originalPrice: 2999, image: '🩺', rating: 4.7, reviews: 5600, cashbackPercent: 15, coinsEarned: 300, tag: 'Essential', is60Min: false, hasPickup: true },
    { id: 'hc4', name: 'Ayurvedic Wellness Kit', brand: 'Patanjali', price: 999, originalPrice: 1499, image: '🌿', rating: 4.4, reviews: 7800, cashbackPercent: 22, coinsEarned: 220, tag: 'Natural', is60Min: true, hasPickup: true },
    { id: 'hc5', name: 'Protein Powder 1kg', brand: 'MuscleBlaze', price: 1999, originalPrice: 2999, image: '💪', rating: 4.6, reviews: 15000, cashbackPercent: 16, coinsEarned: 320, tag: 'Fitness', is60Min: false, hasPickup: true },
    { id: 'hc6', name: 'First Aid Kit', brand: 'Apollo', price: 699, originalPrice: 999, image: '🚑', rating: 4.5, reviews: 3450, cashbackPercent: 14, coinsEarned: 98, tag: null, is60Min: true, hasPickup: true },
  ],
  'fitness-sports': [
    { id: 'fs1', name: 'Running Shoes Pro', brand: 'Nike', price: 7999, originalPrice: 11999, image: '👟', rating: 4.8, reviews: 8900, cashbackPercent: 15, coinsEarned: 1200, tag: 'Bestseller', is60Min: false, hasPickup: true },
    { id: 'fs2', name: 'Yoga Mat Premium', brand: 'Decathlon', price: 999, originalPrice: 1499, image: '🧘', rating: 4.6, reviews: 5600, cashbackPercent: 18, coinsEarned: 180, tag: null, is60Min: true, hasPickup: true },
    { id: 'fs3', name: 'Dumbbell Set 20kg', brand: 'Cult.fit', price: 3999, originalPrice: 5999, image: '🏋️', rating: 4.7, reviews: 3450, cashbackPercent: 20, coinsEarned: 800, tag: 'Popular', is60Min: false, hasPickup: true },
    { id: 'fs4', name: 'Fitness Tracker', brand: 'Fitbit', price: 4999, originalPrice: 7999, image: '⌚', rating: 4.5, reviews: 7800, cashbackPercent: 16, coinsEarned: 800, tag: 'Tech', is60Min: true, hasPickup: true },
    { id: 'fs5', name: 'Football Official', brand: 'Adidas', price: 1999, originalPrice: 2999, image: '⚽', rating: 4.6, reviews: 2340, cashbackPercent: 14, coinsEarned: 280, tag: 'Sports', is60Min: true, hasPickup: true },
    { id: 'fs6', name: 'Protein Shaker Set', brand: 'MyProtein', price: 499, originalPrice: 799, image: '🥤', rating: 4.4, reviews: 4560, cashbackPercent: 22, coinsEarned: 110, tag: null, is60Min: true, hasPickup: true },
  ],
  'education-learning': [
    { id: 'el1', name: 'Full Stack Course', brand: 'Udemy', price: 499, originalPrice: 3999, image: '💻', rating: 4.7, reviews: 45000, cashbackPercent: 30, coinsEarned: 150, tag: 'Hot', is60Min: false, hasPickup: false },
    { id: 'el2', name: 'UPSC Foundation', brand: 'Unacademy', price: 14999, originalPrice: 24999, image: '📚', rating: 4.5, reviews: 8900, cashbackPercent: 18, coinsEarned: 2700, tag: 'Popular', is60Min: false, hasPickup: false },
    { id: 'el3', name: 'Kids Coding Kit', brand: 'WhiteHat Jr', price: 4999, originalPrice: 7999, image: '🤖', rating: 4.4, reviews: 3450, cashbackPercent: 25, coinsEarned: 1250, tag: 'Kids', is60Min: false, hasPickup: true },
    { id: 'el4', name: 'Language Course', brand: 'Duolingo Plus', price: 999, originalPrice: 1999, image: '🗣️', rating: 4.6, reviews: 12000, cashbackPercent: 20, coinsEarned: 200, tag: null, is60Min: false, hasPickup: false },
    { id: 'el5', name: 'Music Classes 3 Months', brand: 'Furtados', price: 5999, originalPrice: 8999, image: '🎵', rating: 4.7, reviews: 2340, cashbackPercent: 22, coinsEarned: 1320, tag: 'Creative', is60Min: false, hasPickup: false },
    { id: 'el6', name: 'Art Supplies Kit', brand: 'Staedtler', price: 1999, originalPrice: 2999, image: '🎨', rating: 4.5, reviews: 5600, cashbackPercent: 16, coinsEarned: 320, tag: null, is60Min: true, hasPickup: true },
  ],
  'home-services': [
    { id: 'hs1', name: 'Deep Home Cleaning', brand: 'Urban Company', price: 1999, originalPrice: 2999, image: '🧹', rating: 4.6, reviews: 15000, cashbackPercent: 20, coinsEarned: 400, tag: 'Popular', is60Min: false, hasPickup: false },
    { id: 'hs2', name: 'AC Service & Repair', brand: 'Urban Company', price: 599, originalPrice: 999, image: '❄️', rating: 4.5, reviews: 8900, cashbackPercent: 18, coinsEarned: 108, tag: 'Essential', is60Min: false, hasPickup: false },
    { id: 'hs3', name: 'Pest Control Package', brand: 'Housejoy', price: 1499, originalPrice: 2499, image: '🐜', rating: 4.4, reviews: 5600, cashbackPercent: 22, coinsEarned: 330, tag: null, is60Min: false, hasPickup: false },
    { id: 'hs4', name: 'Wall Painting 1 Room', brand: 'Paint My Walls', price: 3999, originalPrice: 5999, image: '🎨', rating: 4.7, reviews: 3450, cashbackPercent: 20, coinsEarned: 800, tag: 'Premium', is60Min: false, hasPickup: false },
    { id: 'hs5', name: 'Plumber Visit', brand: 'Zimmber', price: 299, originalPrice: 499, image: '🔧', rating: 4.3, reviews: 7800, cashbackPercent: 15, coinsEarned: 45, tag: 'Quick', is60Min: false, hasPickup: false },
    { id: 'hs6', name: 'Interior Consultation', brand: 'Livspace', price: 999, originalPrice: 1999, image: '🏠', rating: 4.6, reviews: 2340, cashbackPercent: 25, coinsEarned: 250, tag: 'Design', is60Min: false, hasPickup: false },
  ],
  'travel-experiences': [
    { id: 'te1', name: 'Goa 3N/4D Package', brand: 'MakeMyTrip', price: 12999, originalPrice: 19999, image: '🏖️', rating: 4.6, reviews: 8900, cashbackPercent: 15, coinsEarned: 1950, tag: 'Popular', is60Min: false, hasPickup: false },
    { id: 'te2', name: 'Manali Adventure Trip', brand: 'Thrillophilia', price: 8999, originalPrice: 14999, image: '🏔️', rating: 4.7, reviews: 5600, cashbackPercent: 22, coinsEarned: 1980, tag: 'Adventure', is60Min: false, hasPickup: false },
    { id: 'te3', name: 'Hotel Stay 2N', brand: 'OYO', price: 2999, originalPrice: 4999, image: '🏨', rating: 4.3, reviews: 15000, cashbackPercent: 20, coinsEarned: 600, tag: 'Budget', is60Min: false, hasPickup: false },
    { id: 'te4', name: 'Flight + Hotel Combo', brand: 'Cleartrip', price: 15999, originalPrice: 24999, image: '✈️', rating: 4.5, reviews: 3450, cashbackPercent: 16, coinsEarned: 2560, tag: 'Value', is60Min: false, hasPickup: false },
    { id: 'te5', name: 'Kerala Houseboat', brand: 'Goibibo', price: 9999, originalPrice: 14999, image: '🛶', rating: 4.8, reviews: 2340, cashbackPercent: 18, coinsEarned: 1800, tag: 'Romantic', is60Min: false, hasPickup: false },
    { id: 'te6', name: 'Weekend Getaway', brand: 'Airbnb', price: 4999, originalPrice: 7999, image: '🏡', rating: 4.6, reviews: 4560, cashbackPercent: 12, coinsEarned: 600, tag: 'Unique', is60Min: false, hasPickup: false },
  ],
  'entertainment': [
    { id: 'en1', name: 'Movie Tickets (2)', brand: 'BookMyShow', price: 399, originalPrice: 599, image: '🎬', rating: 4.5, reviews: 25000, cashbackPercent: 15, coinsEarned: 60, tag: 'Popular', is60Min: false, hasPickup: false },
    { id: 'en2', name: 'Gaming Pass Monthly', brand: 'Xbox Game Pass', price: 499, originalPrice: 699, image: '🎮', rating: 4.7, reviews: 12000, cashbackPercent: 20, coinsEarned: 100, tag: 'Gaming', is60Min: false, hasPickup: false },
    { id: 'en3', name: 'Concert Tickets', brand: 'Insider', price: 1999, originalPrice: 2999, image: '🎸', rating: 4.6, reviews: 5600, cashbackPercent: 18, coinsEarned: 360, tag: 'Live', is60Min: false, hasPickup: false },
    { id: 'en4', name: 'OTT Annual Pack', brand: 'Netflix', price: 1499, originalPrice: 1999, image: '📺', rating: 4.8, reviews: 35000, cashbackPercent: 10, coinsEarned: 150, tag: 'Streaming', is60Min: false, hasPickup: false },
    { id: 'en5', name: 'Theme Park Entry', brand: 'Imagica', price: 999, originalPrice: 1499, image: '🎢', rating: 4.4, reviews: 8900, cashbackPercent: 22, coinsEarned: 220, tag: 'Family', is60Min: false, hasPickup: false },
    { id: 'en6', name: 'Stand-up Comedy Show', brand: 'BookMyShow', price: 599, originalPrice: 999, image: '😂', rating: 4.5, reviews: 3450, cashbackPercent: 16, coinsEarned: 96, tag: 'Comedy', is60Min: false, hasPickup: false },
  ],
  'financial-lifestyle': [
    { id: 'fl1', name: 'Credit Card Premium', brand: 'CRED', price: 0, originalPrice: 0, image: '💳', rating: 4.6, reviews: 45000, cashbackPercent: 20, coinsEarned: 500, tag: 'Rewards', is60Min: false, hasPickup: false },
    { id: 'fl2', name: 'Mutual Fund SIP', brand: 'Groww', price: 500, originalPrice: 500, image: '📈', rating: 4.5, reviews: 25000, cashbackPercent: 15, coinsEarned: 75, tag: 'Invest', is60Min: false, hasPickup: false },
    { id: 'fl3', name: 'Health Insurance', brand: 'PolicyBazaar', price: 599, originalPrice: 999, image: '🛡️', rating: 4.4, reviews: 15000, cashbackPercent: 18, coinsEarned: 108, tag: 'Essential', is60Min: false, hasPickup: false },
    { id: 'fl4', name: 'Gold Savings', brand: 'Paytm', price: 100, originalPrice: 100, image: '🪙', rating: 4.6, reviews: 35000, cashbackPercent: 10, coinsEarned: 10, tag: 'Save', is60Min: false, hasPickup: false },
    { id: 'fl5', name: 'Personal Loan', brand: 'Bajaj Finserv', price: 0, originalPrice: 0, image: '💰', rating: 4.3, reviews: 8900, cashbackPercent: 12, coinsEarned: 250, tag: 'Quick', is60Min: false, hasPickup: false },
    { id: 'fl6', name: 'Tax Filing Service', brand: 'ClearTax', price: 999, originalPrice: 1999, image: '📋', rating: 4.7, reviews: 12000, cashbackPercent: 22, coinsEarned: 220, tag: 'Tax Season', is60Min: false, hasPickup: false },
  ],
};

// ============================================
// NEARBY STORES (with distance)
// ============================================
export interface NearbyStore {
  id: string;
  name: string;
  logo: string;
  rating: number;
  distance: string;
  cashback: number;
  is60Min: boolean;
  hasPickup: boolean;
  categories: string[];
}

export const nearbyStoresData: NearbyStore[] = [
  { id: 's1', name: 'Zara', logo: '👗', rating: 4.6, distance: '1.2 km', cashback: 18, is60Min: true, hasPickup: true, categories: ['fashion', 'men', 'women'] },
  { id: 's2', name: 'Starbucks', logo: '☕', rating: 4.7, distance: '0.8 km', cashback: 15, is60Min: true, hasPickup: true, categories: ['food-dining', 'cafe'] },
  { id: 's3', name: 'Nike Store', logo: '👟', rating: 4.8, distance: '2.1 km', cashback: 12, is60Min: false, hasPickup: true, categories: ['fashion', 'sports'] },
  { id: 's4', name: 'BigBasket', logo: '🛒', rating: 4.4, distance: '0.5 km', cashback: 15, is60Min: true, hasPickup: false, categories: ['grocery-essentials'] },
  { id: 's5', name: 'Apollo Pharmacy', logo: '💊', rating: 4.5, distance: '1.5 km', cashback: 18, is60Min: true, hasPickup: true, categories: ['healthcare'] },
  { id: 's6', name: 'Decathlon', logo: '⛺', rating: 4.6, distance: '3.2 km', cashback: 16, is60Min: false, hasPickup: true, categories: ['fitness-sports'] },
  { id: 's7', name: 'Nykaa Store', logo: '💄', rating: 4.5, distance: '1.8 km', cashback: 20, is60Min: true, hasPickup: true, categories: ['beauty-wellness'] },
  { id: 's8', name: 'Urban Company', logo: '🏠', rating: 4.6, distance: '2.5 km', cashback: 20, is60Min: false, hasPickup: false, categories: ['home-services'] },
];

// ============================================
// HELPER FUNCTIONS
// ============================================
export const getVibesForCategory = (categorySlug: string): Vibe[] => {
  return vibesData[categorySlug] || vibesData['fashion'];
};

export const getOccasionsForCategory = (categorySlug: string): Occasion[] => {
  return occasionsData[categorySlug] || occasionsData['fashion'];
};

export const getTrendingHashtagsForCategory = (categorySlug: string): TrendingHashtag[] => {
  return trendingHashtagsData[categorySlug] || trendingHashtagsData['fashion'];
};

export const getBrandsForCategory = (categorySlug: string): Brand[] => {
  return brandsData[categorySlug] || brandsData['fashion'];
};

export const getProductsForCategory = (categorySlug: string): DummyProduct[] => {
  return dummyProductsData[categorySlug] || dummyProductsData['fashion'];
};

export const getNearbyStoresForCategory = (categorySlug: string): NearbyStore[] => {
  return nearbyStoresData.filter(store =>
    store.categories.includes(categorySlug) || store.categories.length === 0
  );
};

// Get all brands from all categories
export const getAllBrands = (): Brand[] => {
  const allBrands: Brand[] = [];
  const seenIds = new Set<string>();

  Object.values(brandsData).forEach(brands => {
    brands.forEach(brand => {
      if (!seenIds.has(brand.id)) {
        seenIds.add(brand.id);
        allBrands.push(brand);
      }
    });
  });

  return allBrands.sort((a, b) => b.rating - a.rating);
};

// Get all occasions from all categories
export const getAllOccasions = (): Occasion[] => {
  const allOccasions: Occasion[] = [];
  const seenIds = new Set<string>();

  Object.values(occasionsData).forEach(occasions => {
    occasions.forEach(occasion => {
      if (!seenIds.has(occasion.id)) {
        seenIds.add(occasion.id);
        allOccasions.push(occasion);
      }
    });
  });

  return allOccasions.sort((a, b) => b.discount - a.discount);
};
