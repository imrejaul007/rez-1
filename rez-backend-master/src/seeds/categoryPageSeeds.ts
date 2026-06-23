/**
 * Category Page Data Seeder - COMPREHENSIVE
 * Populates all 12 main categories with production-ready data:
 * - Vibes, Occasions, Trending Hashtags, AI Suggestions, AI Placeholders, Subcategories
 */

import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { connectDatabase } from '../config/database';

// ============================================
// COMPLETE CATEGORY DATA FOR ALL 12 CATEGORIES
// ============================================

const allCategoryData = [
    // ============ FOOD & DINING ============
    {
        name: 'Food & Dining',
        slug: 'food-dining',
        type: 'home_delivery',
        icon: '🍕',
        subcategories: [
            { name: 'Pizza', slug: 'pizza', icon: '🍕' },
            { name: 'Biryani', slug: 'biryani', icon: '🍚' },
            { name: 'Burgers', slug: 'burgers', icon: '🍔' },
            { name: 'Chinese', slug: 'chinese', icon: '🥡' },
            { name: 'Desserts', slug: 'desserts', icon: '🍰' },
            { name: 'Healthy', slug: 'healthy-food', icon: '🥗' },
        ],
        vibes: [
            { id: 'quick-bite', name: 'Quick Bite', icon: '⚡', color: '#F59E0B', description: 'Fast food & snacks' },
            { id: 'date-night', name: 'Date Night', icon: '🌙', color: '#EC4899', description: 'Romantic dinners' },
            { id: 'family-feast', name: 'Family Feast', icon: '👨‍👩‍👧‍👦', color: '#10B981', description: 'Large group dining' },
            { id: 'healthy', name: 'Healthy Eats', icon: '🥗', color: '#22C55E', description: 'Nutritious options' },
        ],
        occasions: [
            { id: 'weekend-brunch', name: 'Weekend Brunch', icon: '🥐', color: '#F59E0B', tag: 'Popular', discount: 20 },
            { id: 'birthday', name: 'Birthday Party', icon: '🎂', color: '#EC4899', tag: 'Hot', discount: 25 },
            { id: 'office-lunch', name: 'Office Lunch', icon: '💼', color: '#3B82F6', tag: 'Daily', discount: 15 },
            { id: 'late-night', name: 'Late Night', icon: '🌙', color: '#1F2937', tag: 'New', discount: 10 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#BiryaniLovers', count: 1250, color: '#F59E0B', trending: true },
            { id: 'h2', tag: '#PizzaTime', count: 980, color: '#EF4444', trending: true },
            { id: 'h3', tag: '#HealthyBowl', count: 750, color: '#22C55E', trending: false },
            { id: 'h4', tag: '#StreetFood', count: 890, color: '#F97316', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'Best for you', icon: '✨', link: '/search?category=food-dining&filter=recommended' },
            { id: 'ai2', title: 'Under ₹300', icon: '💰', link: '/search?category=food-dining&filter=budget' },
            { id: 'ai3', title: 'Top rated', icon: '⭐', link: '/search?category=food-dining&filter=toprated' },
            { id: 'ai4', title: 'Fast delivery', icon: '⚡', link: '/search?category=food-dining&filter=fast' },
        ],
        aiPlaceholders: ['Find me a biryani place nearby...', 'Best pizza deals today...', 'Healthy lunch options...'],
    },

    // ============ FASHION ============
    {
        name: 'Fashion',
        slug: 'fashion',
        type: 'general',
        icon: '👗',
        subcategories: [
            { name: 'Men', slug: 'men-fashion', icon: '👕' },
            { name: 'Women', slug: 'women-fashion', icon: '👗' },
            { name: 'Kids', slug: 'kids-fashion', icon: '🧸' },
            { name: 'Footwear', slug: 'footwear', icon: '👟' },
            { name: 'Watches', slug: 'watches', icon: '⌚' },
            { name: 'Accessories', slug: 'fashion-accessories', icon: '👜' },
        ],
        vibes: [
            { id: 'casual', name: 'Casual Vibes', icon: '👕', color: '#3B82F6', description: 'Everyday comfort' },
            { id: 'party', name: 'Party Ready', icon: '🪩', color: '#EC4899', description: 'Night out looks' },
            { id: 'ethnic', name: 'Ethnic Elegance', icon: '🪔', color: '#F59E0B', description: 'Traditional wear' },
            { id: 'formal', name: 'Formal', icon: '👔', color: '#1F2937', description: 'Office & meetings' },
        ],
        occasions: [
            { id: 'wedding', name: 'Wedding Season', icon: '💒', color: '#EC4899', tag: 'Hot', discount: 30 },
            { id: 'diwali', name: 'Diwali Collection', icon: '🪔', color: '#F59E0B', tag: 'Festive', discount: 35 },
            { id: 'summer', name: 'Summer Sale', icon: '☀️', color: '#EF4444', tag: 'Sale', discount: 50 },
            { id: 'workwear', name: 'Workwear', icon: '💼', color: '#3B82F6', tag: null, discount: 20 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#OOTD', count: 2500, color: '#EC4899', trending: true },
            { id: 'h2', tag: '#EthnicWear', count: 1800, color: '#F59E0B', trending: true },
            { id: 'h3', tag: '#StreetStyle', count: 1500, color: '#3B82F6', trending: true },
            { id: 'h4', tag: '#SneakerHead', count: 980, color: '#10B981', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'Trending now', icon: '🔥', link: '/search?category=fashion&filter=trending' },
            { id: 'ai2', title: 'Under ₹999', icon: '💰', link: '/search?category=fashion&filter=budget' },
            { id: 'ai3', title: 'New arrivals', icon: '🆕', link: '/search?category=fashion&filter=new' },
            { id: 'ai4', title: 'Best sellers', icon: '⭐', link: '/search?category=fashion&filter=bestseller' },
        ],
        aiPlaceholders: ['Find me a party dress...', 'Casual shirts for office...', 'Ethnic wear for wedding...'],
    },

    // ============ ELECTRONICS ============
    {
        name: 'Electronics',
        slug: 'electronics',
        type: 'general',
        icon: '📱',
        subcategories: [
            { name: 'Mobiles', slug: 'mobiles', icon: '📱' },
            { name: 'Laptops', slug: 'laptops', icon: '💻' },
            { name: 'Audio', slug: 'audio', icon: '🎧' },
            { name: 'Cameras', slug: 'cameras', icon: '📷' },
            { name: 'Gaming', slug: 'gaming', icon: '🎮' },
            { name: 'Accessories', slug: 'electronic-accessories', icon: '🔌' },
        ],
        vibes: [
            { id: 'budget', name: 'Budget Friendly', icon: '💰', color: '#22C55E', description: 'Best value gadgets' },
            { id: 'premium', name: 'Premium', icon: '👑', color: '#F59E0B', description: 'Top-tier tech' },
            { id: 'gaming', name: 'Gaming Setup', icon: '🎮', color: '#EC4899', description: 'Level up your game' },
            { id: 'work', name: 'Work From Home', icon: '🏠', color: '#3B82F6', description: 'Home office essentials' },
        ],
        occasions: [
            { id: 'diwali', name: 'Diwali Sale', icon: '🪔', color: '#F59E0B', tag: 'Hot', discount: 35 },
            { id: 'backtoschool', name: 'Back to School', icon: '🎓', color: '#3B82F6', tag: 'Student', discount: 28 },
            { id: 'blackfriday', name: 'Black Friday', icon: '🖤', color: '#1F2937', tag: 'Mega', discount: 40 },
            { id: 'newyear', name: 'New Year', icon: '🎊', color: '#8B5CF6', tag: 'Special', discount: 25 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#iPhone15', count: 4500, color: '#3B82F6', trending: true },
            { id: 'h2', tag: '#GamingLaptop', count: 3200, color: '#EC4899', trending: true },
            { id: 'h3', tag: '#SmartWatch', count: 2800, color: '#8B5CF6', trending: true },
            { id: 'h4', tag: '#WirelessEarbuds', count: 3800, color: '#10B981', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'Best for you', icon: '✨', link: '/search?category=electronics&filter=recommended' },
            { id: 'ai2', title: 'Under ₹20,000', icon: '💰', link: '/search?category=electronics&filter=budget' },
            { id: 'ai3', title: 'Top rated', icon: '⭐', link: '/search?category=electronics&filter=toprated' },
            { id: 'ai4', title: 'New launches', icon: '🚀', link: '/search?category=electronics&filter=new' },
        ],
        aiPlaceholders: ['Gaming laptop under ₹80,000...', 'Best smartphone with camera...', 'Wireless earbuds...'],
    },

    // ============ BEAUTY & WELLNESS ============
    {
        name: 'Beauty & Wellness',
        slug: 'beauty-wellness',
        type: 'going_out',
        icon: '💄',
        subcategories: [
            { name: 'Skincare', slug: 'skincare', icon: '✨' },
            { name: 'Haircare', slug: 'haircare', icon: '💇' },
            { name: 'Makeup', slug: 'makeup', icon: '💄' },
            { name: 'Spa', slug: 'spa', icon: '🧖' },
            { name: 'Salon', slug: 'salon', icon: '💅' },
        ],
        vibes: [
            { id: 'natural', name: 'Natural Beauty', icon: '🌿', color: '#22C55E', description: 'Organic products' },
            { id: 'glam', name: 'Glam Look', icon: '💄', color: '#EC4899', description: 'Bold & beautiful' },
            { id: 'skincare', name: 'Skin First', icon: '✨', color: '#F59E0B', description: 'Glow routine' },
            { id: 'spa', name: 'Spa Day', icon: '🧖', color: '#8B5CF6', description: 'Self-care treats' },
        ],
        occasions: [
            { id: 'wedding', name: 'Wedding Prep', icon: '💒', color: '#EC4899', tag: 'Popular', discount: 30 },
            { id: 'festive', name: 'Festive Glow', icon: '✨', color: '#F59E0B', tag: 'Hot', discount: 25 },
            { id: 'selfcare', name: 'Self Care Sunday', icon: '🧘', color: '#8B5CF6', tag: 'Trending', discount: 18 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#SkinCareRoutine', count: 3200, color: '#F59E0B', trending: true },
            { id: 'h2', tag: '#GlowUp', count: 2800, color: '#EC4899', trending: true },
            { id: 'h3', tag: '#NaturalBeauty', count: 2100, color: '#22C55E', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'For your skin', icon: '✨', link: '/search?category=beauty-wellness&filter=recommended' },
            { id: 'ai2', title: 'Best sellers', icon: '⭐', link: '/search?category=beauty-wellness&filter=bestseller' },
        ],
        aiPlaceholders: ['Best moisturizer for oily skin...', 'Korean skincare routine...'],
    },

    // ============ GROCERY ============
    {
        name: 'Grocery & Essentials',
        slug: 'grocery-essentials',
        type: 'home_delivery',
        icon: '🛒',
        subcategories: [
            { name: 'Fruits', slug: 'fruits', icon: '🍎' },
            { name: 'Vegetables', slug: 'vegetables', icon: '🥬' },
            { name: 'Dairy', slug: 'dairy', icon: '🥛' },
            { name: 'Snacks', slug: 'snacks', icon: '🍪' },
            { name: 'Beverages', slug: 'beverages', icon: '🥤' },
        ],
        vibes: [
            { id: 'organic', name: 'Organic', icon: '🌱', color: '#22C55E', description: 'Natural & pure' },
            { id: 'quick', name: 'Quick Meals', icon: '⚡', color: '#F59E0B', description: 'Ready to cook' },
            { id: 'healthy', name: 'Healthy Living', icon: '💪', color: '#10B981', description: 'Nutritious choices' },
        ],
        occasions: [
            { id: 'monthly', name: 'Monthly Stock', icon: '📦', color: '#3B82F6', tag: 'Save', discount: 20 },
            { id: 'festive', name: 'Festive Cooking', icon: '🎊', color: '#F59E0B', tag: 'Hot', discount: 25 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#OrganicFood', count: 1800, color: '#22C55E', trending: true },
            { id: 'h2', tag: '#HealthyEating', count: 1500, color: '#10B981', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'Your usual', icon: '🛒', link: '/search?category=grocery-essentials&filter=reorder' },
            { id: 'ai2', title: 'Best deals', icon: '💰', link: '/search?category=grocery-essentials&filter=deals' },
        ],
        aiPlaceholders: ['Organic vegetables near me...', 'Fresh fruits for delivery...'],
    },

    // ============ HEALTHCARE ============
    {
        name: 'Healthcare',
        slug: 'healthcare',
        type: 'general',
        icon: '💊',
        subcategories: [
            { name: 'Medicines', slug: 'medicines', icon: '💊' },
            { name: 'Supplements', slug: 'supplements', icon: '💪' },
            { name: 'Personal Care', slug: 'personal-care', icon: '🧴' },
            { name: 'Baby Care', slug: 'baby-care', icon: '👶' },
        ],
        vibes: [
            { id: 'everyday', name: 'Everyday Health', icon: '💊', color: '#3B82F6', description: 'Daily wellness' },
            { id: 'ayurveda', name: 'Ayurveda', icon: '🌿', color: '#22C55E', description: 'Natural remedies' },
            { id: 'immunity', name: 'Immunity', icon: '🛡️', color: '#F59E0B', description: 'Stay protected' },
        ],
        occasions: [
            { id: 'monsoon', name: 'Monsoon Care', icon: '🌧️', color: '#3B82F6', tag: 'Season', discount: 20 },
            { id: 'winter', name: 'Winter Wellness', icon: '❄️', color: '#06B6D4', tag: null, discount: 15 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#WellnessJourney', count: 1500, color: '#22C55E', trending: true },
            { id: 'h2', tag: '#ImmunityBooster', count: 1200, color: '#F59E0B', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'Your medicines', icon: '💊', link: '/search?category=healthcare&filter=reorder' },
            { id: 'ai2', title: 'Lab tests', icon: '🧪', link: '/lab-tests' },
        ],
        aiPlaceholders: ['Find vitamin supplements...', 'Medicine for cold...'],
    },

    // ============ FITNESS ============
    {
        name: 'Fitness & Sports',
        slug: 'fitness-sports',
        type: 'general',
        icon: '🏋️',
        subcategories: [
            { name: 'Gym Equipment', slug: 'gym-equipment', icon: '🏋️' },
            { name: 'Sportswear', slug: 'sportswear', icon: '👟' },
            { name: 'Yoga', slug: 'yoga', icon: '🧘' },
            { name: 'Outdoor', slug: 'outdoor-sports', icon: '🚴' },
        ],
        vibes: [
            { id: 'gym', name: 'Gym Warrior', icon: '🏋️', color: '#EF4444', description: 'Weight training' },
            { id: 'yoga', name: 'Yoga & Meditation', icon: '🧘', color: '#8B5CF6', description: 'Mind & body' },
            { id: 'running', name: 'Running', icon: '🏃', color: '#22C55E', description: 'Cardio lovers' },
        ],
        occasions: [
            { id: 'newyear', name: 'New Year Fitness', icon: '🎊', color: '#EC4899', tag: 'Hot', discount: 30 },
            { id: 'marathon', name: 'Marathon Season', icon: '🏃', color: '#22C55E', tag: 'Trending', discount: 20 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#FitnessMotivation', count: 2200, color: '#EF4444', trending: true },
            { id: 'h2', tag: '#GymLife', count: 1800, color: '#22C55E', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'Your goals', icon: '🎯', link: '/search?category=fitness-sports&filter=recommended' },
            { id: 'ai2', title: 'Budget gear', icon: '💰', link: '/search?category=fitness-sports&filter=budget' },
        ],
        aiPlaceholders: ['Best running shoes...', 'Yoga mat for beginners...'],
    },

    // ============ HOME SERVICES ============
    {
        name: 'Home Services',
        slug: 'home-services',
        type: 'going_out',
        icon: '🏠',
        subcategories: [
            { name: 'Cleaning', slug: 'cleaning', icon: '🧹' },
            { name: 'Repairs', slug: 'repairs', icon: '🔧' },
            { name: 'AC Service', slug: 'ac-service', icon: '❄️' },
            { name: 'Pest Control', slug: 'pest-control', icon: '🐜' },
        ],
        vibes: [
            { id: 'cleaning', name: 'Deep Clean', icon: '🧹', color: '#22C55E', description: 'Spotless home' },
            { id: 'repair', name: 'Fix It', icon: '🔧', color: '#3B82F6', description: 'Repairs & maintenance' },
            { id: 'beauty', name: 'Salon at Home', icon: '💅', color: '#EC4899', description: 'Beauty services' },
        ],
        occasions: [
            { id: 'diwali', name: 'Diwali Clean', icon: '🪔', color: '#F59E0B', tag: 'Hot', discount: 30 },
            { id: 'summer', name: 'Summer AC Care', icon: '☀️', color: '#06B6D4', tag: 'Trending', discount: 25 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#DeepCleaning', count: 1500, color: '#22C55E', trending: true },
            { id: 'h2', tag: '#HomeRepair', count: 1200, color: '#3B82F6', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'Popular now', icon: '🔥', link: '/search?category=home-services&filter=popular' },
            { id: 'ai2', title: 'Quick service', icon: '⚡', link: '/search?category=home-services&filter=fast' },
        ],
        aiPlaceholders: ['Book a deep cleaning...', 'AC repair near me...'],
    },

    // ============ TRAVEL ============
    {
        name: 'Travel & Experiences',
        slug: 'travel-experiences',
        type: 'going_out',
        icon: '✈️',
        subcategories: [
            { name: 'Flights', slug: 'flights', icon: '✈️' },
            { name: 'Hotels', slug: 'hotels', icon: '🏨' },
            { name: 'Holiday Packages', slug: 'holiday-packages', icon: '🎒' },
            { name: 'Activities', slug: 'activities', icon: '🎢' },
        ],
        vibes: [
            { id: 'adventure', name: 'Adventure', icon: '🏔️', color: '#22C55E', description: 'Thrill seeking' },
            { id: 'beach', name: 'Beach Life', icon: '🏖️', color: '#06B6D4', description: 'Sun & sand' },
            { id: 'romantic', name: 'Romantic', icon: '💑', color: '#EC4899', description: 'Couple getaways' },
        ],
        occasions: [
            { id: 'summer', name: 'Summer Escape', icon: '☀️', color: '#F59E0B', tag: 'Hot', discount: 30 },
            { id: 'honeymoon', name: 'Honeymoon', icon: '💒', color: '#EC4899', tag: 'Love', discount: 35 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#TravelDiaries', count: 2500, color: '#3B82F6', trending: true },
            { id: 'h2', tag: '#Wanderlust', count: 2200, color: '#EC4899', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'For you', icon: '✨', link: '/search?category=travel-experiences&filter=recommended' },
            { id: 'ai2', title: 'Budget trips', icon: '💰', link: '/search?category=travel-experiences&filter=budget' },
        ],
        aiPlaceholders: ['Beach resorts in Goa...', 'Hill stations near Delhi...'],
    },

    // ============ ENTERTAINMENT ============
    {
        name: 'Entertainment',
        slug: 'entertainment',
        type: 'going_out',
        icon: '🎬',
        subcategories: [
            { name: 'Movies', slug: 'movies', icon: '🎬' },
            { name: 'Events', slug: 'events', icon: '🎪' },
            { name: 'Concerts', slug: 'concerts', icon: '🎵' },
            { name: 'Sports', slug: 'sports-events', icon: '🏟️' },
        ],
        vibes: [
            { id: 'movies', name: 'Movie Buff', icon: '🎬', color: '#EF4444', description: 'Cinema lovers' },
            { id: 'music', name: 'Live Music', icon: '🎵', color: '#8B5CF6', description: 'Concerts & gigs' },
            { id: 'comedy', name: 'Comedy', icon: '😂', color: '#F59E0B', description: 'Stand-up shows' },
        ],
        occasions: [
            { id: 'weekend', name: 'Weekend Shows', icon: '📅', color: '#3B82F6', tag: 'Popular', discount: 20 },
            { id: 'premiere', name: 'Premieres', icon: '🌟', color: '#F59E0B', tag: 'Hot', discount: 10 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#MovieNight', count: 2000, color: '#EF4444', trending: true },
            { id: 'h2', tag: '#LiveConcert', count: 1500, color: '#8B5CF6', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'Trending now', icon: '🔥', link: '/search?category=entertainment&filter=trending' },
            { id: 'ai2', title: 'This weekend', icon: '📅', link: '/search?category=entertainment&filter=weekend' },
        ],
        aiPlaceholders: ['Movies releasing this week...', 'Comedy shows nearby...'],
    },

    // ============ FINANCIAL ============
    {
        name: 'Financial & Lifestyle',
        slug: 'financial-lifestyle',
        type: 'general',
        icon: '💳',
        subcategories: [
            { name: 'Credit Cards', slug: 'credit-cards', icon: '💳' },
            { name: 'Insurance', slug: 'insurance', icon: '🛡️' },
            { name: 'Loans', slug: 'loans', icon: '🏦' },
            { name: 'Investments', slug: 'investments', icon: '📈' },
        ],
        vibes: [
            { id: 'invest', name: 'Smart Investor', icon: '📈', color: '#22C55E', description: 'Grow your wealth' },
            { id: 'save', name: 'Super Saver', icon: '💰', color: '#F59E0B', description: 'Save more' },
            { id: 'credit', name: 'Credit Builder', icon: '💳', color: '#3B82F6', description: 'Improve score' },
        ],
        occasions: [
            { id: 'taxsaving', name: 'Tax Saving', icon: '📊', color: '#22C55E', tag: 'Season', discount: 0 },
            { id: 'newyear', name: 'New Year Goals', icon: '🎊', color: '#F59E0B', tag: 'Popular', discount: 0 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#InvestSmart', count: 1500, color: '#22C55E', trending: true },
            { id: 'h2', tag: '#TaxSaving', count: 1200, color: '#3B82F6', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'For you', icon: '✨', link: '/search?category=financial-lifestyle&filter=recommended' },
            { id: 'ai2', title: 'Compare', icon: '⚖️', link: '/search?category=financial-lifestyle&filter=compare' },
        ],
        aiPlaceholders: ['Best mutual funds for SIP...', 'Credit cards with cashback...'],
    },

    // ============ EDUCATION ============
    {
        name: 'Education & Learning',
        slug: 'education-learning',
        type: 'general',
        icon: '📚',
        subcategories: [
            { name: 'Online Courses', slug: 'online-courses', icon: '💻' },
            { name: 'Books', slug: 'books', icon: '📚' },
            { name: 'Coaching', slug: 'coaching', icon: '🎓' },
            { name: 'Study Materials', slug: 'study-materials', icon: '📝' },
        ],
        vibes: [
            { id: 'exam', name: 'Exam Prep', icon: '📝', color: '#EF4444', description: 'Test ready' },
            { id: 'skill', name: 'Skill Up', icon: '💡', color: '#F59E0B', description: 'Learn new skills' },
            { id: 'career', name: 'Career Growth', icon: '📈', color: '#22C55E', description: 'Professional dev' },
        ],
        occasions: [
            { id: 'backtoschool', name: 'Back to School', icon: '🎓', color: '#3B82F6', tag: 'Season', discount: 30 },
            { id: 'exam', name: 'Exam Season', icon: '📝', color: '#EF4444', tag: 'Hot', discount: 25 },
        ],
        trendingHashtags: [
            { id: 'h1', tag: '#LearnCoding', count: 2000, color: '#22C55E', trending: true },
            { id: 'h2', tag: '#ExamPrep', count: 1800, color: '#EF4444', trending: true },
        ],
        aiSuggestions: [
            { id: 'ai1', title: 'For you', icon: '✨', link: '/search?category=education-learning&filter=recommended' },
            { id: 'ai2', title: 'Free courses', icon: '🆓', link: '/search?category=education-learning&filter=free' },
        ],
        aiPlaceholders: ['Python programming course...', 'UPSC preparation...'],
    },
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedCategory(data: typeof allCategoryData[0]) {
    console.log(`📁 Processing: ${data.name}...`);

    let category = await Category.findOne({ slug: data.slug });

    const categoryData: any = {
        name: data.name,
        slug: data.slug,
        type: data.type,
        icon: data.icon,
        isActive: true,
        vibes: data.vibes,
        occasions: data.occasions,
        trendingHashtags: data.trendingHashtags,
        aiSuggestions: data.aiSuggestions,
        aiPlaceholders: data.aiPlaceholders,
        productCount: Math.floor(Math.random() * 5000) + 1000,
        storeCount: Math.floor(Math.random() * 100) + 20,
        maxCashback: Math.floor(Math.random() * 20) + 10,
        isBestSeller: true,
        metadata: {
            featured: true,
            color: data.vibes[0]?.color || '#3B82F6',
            seoTitle: `${data.name} - Best Deals & Offers`,
            seoDescription: `Shop best ${data.name} on Rez`,
        },
    };

    if (category) {
        await Category.findOneAndUpdate({ slug: data.slug }, categoryData);
    } else {
        category = await Category.create(categoryData);
    }

    // Create subcategories
    const childIds = [];
    for (const sub of data.subcategories) {
        let subCat = await Category.findOne({ slug: sub.slug });
        const subData = {
            name: sub.name,
            slug: sub.slug,
            type: data.type,
            icon: sub.icon,
            parentCategory: category!._id,
            isActive: true,
            productCount: Math.floor(Math.random() * 500) + 50,
        };

        if (subCat) {
            await Category.findOneAndUpdate({ slug: sub.slug }, subData);
        } else {
            subCat = await Category.create(subData);
        }
        if (subCat) childIds.push(subCat._id);
    }

    await Category.findByIdAndUpdate(category!._id, {
        $set: { childCategories: childIds },
    });

    console.log(`   ✅ Seeded with ${data.vibes.length} vibes, ${data.occasions.length} occasions, ${data.subcategories.length} subcategories`);
}

async function runCategorySeeds() {
    console.log('🌱 Starting comprehensive category seeding...\n');

    for (const data of allCategoryData) {
        await seedCategory(data);
    }

    console.log('\n🎉 All 12 categories seeded successfully!');
}

// Run if executed directly
if (require.main === module) {
    connectDatabase()
        .then(() => runCategorySeeds())
        .then(() => {
            console.log('\n✅ Seeding complete. Disconnecting...');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        });
}

export { runCategorySeeds };
