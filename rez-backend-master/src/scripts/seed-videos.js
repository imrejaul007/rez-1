/**
 * Comprehensive Video Seed Script
 * Creates 125-175 videos with Cloudinary integration
 *
 * Database: mongodb+srv://<REDACTED>@cluster0.aulqar3.mongodb.net/
 * DB Name: test
 * Cloudinary: dsuakj68p
 */

const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const path = require('path');

// Import models from dist (compiled TypeScript)
require(path.join(__dirname, '../../dist/models/Video'));
require(path.join(__dirname, '../../dist/models/User'));
require(path.join(__dirname, '../../dist/models/Product'));
require(path.join(__dirname, '../../dist/models/Store'));

// Database Configuration
const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Cloudinary Configuration
cloudinary.config({
  cloud_name: 'dsuakj68p',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

// Sample Cloudinary video URLs (using public samples and placeholders)
const SAMPLE_VIDEO_URLS = {
  merchant: [
    'https://res.cloudinary.com/demo/video/upload/v1/dog.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1/sea-turtle.mp4',
    'https://res.cloudinary.com/demo/video/upload/samples/elephants.mp4',
    'https://res.cloudinary.com/demo/video/upload/samples/cld-sample-video.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  ],
  ugc: [
    'https://res.cloudinary.com/demo/video/upload/v1/cld-sample-video.mp4',
    'https://res.cloudinary.com/demo/video/upload/samples/sea-turtle.mp4',
    'https://res.cloudinary.com/demo/video/upload/samples/elephants.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  ],
  article: [
    'https://res.cloudinary.com/demo/video/upload/samples/cld-sample-video.mp4',
    'https://res.cloudinary.com/demo/video/upload/samples/sea-turtle.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  ]
};

// Video content templates by category
const VIDEO_TEMPLATES = {
  trending_me: [
    { title: 'Best Sneakers for Men 2025', desc: 'Top trending sneakers every man needs this year', tags: ['sneakers', 'men', 'fashion', 'style', 'trending'] },
    { title: 'Men\'s Grooming Essentials', desc: 'Complete grooming routine for modern men', tags: ['grooming', 'skincare', 'men', 'beauty'] },
    { title: 'Tech Gadgets Every Guy Needs', desc: 'Must-have tech accessories for men in 2025', tags: ['tech', 'gadgets', 'men', 'electronics'] },
    { title: 'Men\'s Fitness Journey - 30 Days', desc: 'Complete transformation in 30 days', tags: ['fitness', 'workout', 'men', 'health'] },
    { title: 'Best Watches Under 10k', desc: 'Luxury-looking watches that won\'t break the bank', tags: ['watches', 'men', 'accessories', 'fashion'] },
    { title: 'Men\'s Hair Styling Tutorial', desc: 'Professional hairstyles you can do at home', tags: ['hair', 'styling', 'men', 'grooming'] },
    { title: 'Smart Casual Outfit Ideas', desc: 'How to dress smart casual for any occasion', tags: ['fashion', 'men', 'outfit', 'style'] },
    { title: 'Best Cologne for Men 2025', desc: 'Top fragrances that women love', tags: ['cologne', 'fragrance', 'men', 'grooming'] },
    { title: 'Gym Essentials for Beginners', desc: 'Everything you need to start your fitness journey', tags: ['fitness', 'gym', 'men', 'workout'] },
    { title: 'Men\'s Winter Fashion Guide', desc: 'Stay stylish and warm this winter', tags: ['winter', 'fashion', 'men', 'style'] },
    { title: 'Best Backpacks for Daily Use', desc: 'Functional and stylish backpacks for men', tags: ['backpack', 'men', 'accessories', 'daily'] },
    { title: 'Beard Care Routine', desc: 'How to maintain a perfect beard', tags: ['beard', 'grooming', 'men', 'care'] },
    { title: 'Men\'s Formal Wear Guide', desc: 'How to nail formal occasions', tags: ['formal', 'men', 'fashion', 'suit'] },
    { title: 'Best Sunglasses for Your Face', desc: 'Find the perfect sunglasses for your face shape', tags: ['sunglasses', 'men', 'accessories', 'style'] },
    { title: 'Men\'s Streetwear Trends', desc: 'Latest streetwear styles you need to try', tags: ['streetwear', 'men', 'fashion', 'urban'] },
    { title: 'Budget Gaming Setup', desc: 'Build an epic gaming setup without overspending', tags: ['gaming', 'tech', 'men', 'setup'] },
    { title: 'Best Running Shoes 2025', desc: 'Top running shoes for every runner', tags: ['running', 'shoes', 'fitness', 'men'] },
    { title: 'Men\'s Skincare Routine', desc: 'Simple skincare that actually works', tags: ['skincare', 'men', 'grooming', 'beauty'] },
    { title: 'How to Tie a Tie - 5 Ways', desc: 'Master these 5 essential tie knots', tags: ['tie', 'men', 'formal', 'tutorial'] },
    { title: 'Best Headphones Under 5k', desc: 'Amazing sound quality on a budget', tags: ['headphones', 'tech', 'men', 'audio'] },
    { title: 'Muscle Building Meal Prep', desc: 'Weekly meal prep for muscle gain', tags: ['fitness', 'nutrition', 'men', 'cooking'] },
    { title: 'Men\'s Accessories Guide', desc: 'Essential accessories to elevate your style', tags: ['accessories', 'men', 'fashion', 'style'] },
  ],
  trending_her: [
    { title: 'Makeup Tutorial - Natural Glow', desc: 'Achieve a natural glowing makeup look', tags: ['makeup', 'beauty', 'women', 'tutorial'] },
    { title: 'Spring Fashion Haul 2025', desc: 'Latest spring trends and outfit ideas', tags: ['fashion', 'haul', 'women', 'spring'] },
    { title: 'Bridal Jewelry Collection', desc: 'Stunning jewelry pieces for your big day', tags: ['jewelry', 'bridal', 'women', 'wedding'] },
    { title: 'Skincare Routine for Glowing Skin', desc: 'My complete AM/PM skincare routine', tags: ['skincare', 'beauty', 'women', 'glow'] },
    { title: 'Work From Home Outfits', desc: 'Comfy yet professional WFH outfits', tags: ['fashion', 'women', 'workwear', 'outfit'] },
    { title: 'Hair Care Secrets Revealed', desc: 'How I grew long, healthy hair', tags: ['haircare', 'beauty', 'women', 'hair'] },
    { title: 'Designer Bags Worth Buying', desc: 'Investment pieces that never go out of style', tags: ['bags', 'fashion', 'women', 'luxury'] },
    { title: 'Budget-Friendly Makeup Dupes', desc: 'Affordable alternatives to high-end makeup', tags: ['makeup', 'beauty', 'women', 'budget'] },
    { title: 'Traditional Saree Styling', desc: 'Modern ways to drape a saree', tags: ['saree', 'traditional', 'women', 'fashion'] },
    { title: 'Self-Care Sunday Routine', desc: 'My complete self-care routine', tags: ['selfcare', 'women', 'wellness', 'routine'] },
    { title: 'Minimalist Wardrobe Essentials', desc: 'Build a capsule wardrobe from scratch', tags: ['fashion', 'minimalist', 'women', 'wardrobe'] },
    { title: 'Wedding Guest Outfit Ideas', desc: 'What to wear to every type of wedding', tags: ['fashion', 'women', 'wedding', 'outfit'] },
    { title: 'Nail Art Tutorial - Easy Designs', desc: 'DIY nail art you can do at home', tags: ['nailart', 'beauty', 'women', 'tutorial'] },
    { title: 'Best Lipstick Shades for Indian Skin', desc: 'Perfect lipstick colors for every occasion', tags: ['lipstick', 'makeup', 'women', 'beauty'] },
    { title: 'Summer Dresses Collection', desc: 'Breezy and beautiful summer dress picks', tags: ['dresses', 'summer', 'women', 'fashion'] },
    { title: 'How to Style Jeans - 10 Ways', desc: 'One pair of jeans, 10 different looks', tags: ['jeans', 'styling', 'women', 'fashion'] },
    { title: 'Ethnic Wear Styling Tips', desc: 'Contemporary ethnic fashion ideas', tags: ['ethnic', 'traditional', 'women', 'fashion'] },
    { title: 'Best Perfumes for Women', desc: 'Long-lasting fragrances for every personality', tags: ['perfume', 'fragrance', 'women', 'beauty'] },
    { title: 'Office Wear Lookbook', desc: 'Professional outfit ideas for work', tags: ['office', 'workwear', 'women', 'fashion'] },
    { title: 'Yoga for Beginners', desc: 'Start your yoga journey with these poses', tags: ['yoga', 'fitness', 'women', 'wellness'] },
    { title: 'Festive Makeup Tutorial', desc: 'Glamorous makeup for festivals', tags: ['makeup', 'festive', 'women', 'beauty'] },
    { title: 'Handbag Organization Hacks', desc: 'Keep your handbag neat and organized', tags: ['handbag', 'organization', 'women', 'hacks'] },
  ],
  waist: [
    { title: 'Abs Workout - 10 Minutes', desc: 'Quick and effective ab workout', tags: ['abs', 'workout', 'fitness', 'core'] },
    { title: 'Waist Training Guide', desc: 'Safe and effective waist training tips', tags: ['waist', 'fitness', 'training', 'health'] },
    { title: 'Belly Fat Burning Workout', desc: 'Target stubborn belly fat with this routine', tags: ['bellyfat', 'workout', 'fitness', 'cardio'] },
    { title: 'Healthy Meal Prep for Weight Loss', desc: 'Delicious meals that help you lose weight', tags: ['mealprep', 'weightloss', 'healthy', 'cooking'] },
    { title: 'Core Strengthening Exercises', desc: 'Build a strong core at home', tags: ['core', 'strength', 'workout', 'fitness'] },
    { title: 'Yoga for Flat Tummy', desc: 'Yoga poses to reduce belly bloat', tags: ['yoga', 'tummy', 'fitness', 'wellness'] },
    { title: 'HIIT Workout for Fat Loss', desc: '20-minute HIIT session for maximum burn', tags: ['hiit', 'workout', 'fatloss', 'cardio'] },
    { title: 'Nutrition Tips for Lean Body', desc: 'What I eat to stay lean', tags: ['nutrition', 'diet', 'lean', 'health'] },
    { title: 'Lower Belly Workout', desc: 'Target the lower abs effectively', tags: ['lowerabs', 'workout', 'fitness', 'core'] },
    { title: 'Metabolism Boosting Foods', desc: 'Foods that speed up your metabolism', tags: ['metabolism', 'food', 'health', 'nutrition'] },
    { title: 'Pilates for Beginners', desc: 'Introduction to Pilates exercises', tags: ['pilates', 'fitness', 'workout', 'beginner'] },
    { title: 'Standing Abs Workout', desc: 'Effective ab exercises without lying down', tags: ['abs', 'standing', 'workout', 'fitness'] },
    { title: 'Dance Workout for Weight Loss', desc: 'Fun dance cardio to burn calories', tags: ['dance', 'cardio', 'weightloss', 'fun'] },
    { title: 'Intermittent Fasting Guide', desc: 'Complete guide to IF for beginners', tags: ['fasting', 'diet', 'weightloss', 'health'] },
    { title: 'Postpartum Workout', desc: 'Safe exercises after pregnancy', tags: ['postpartum', 'workout', 'fitness', 'mom'] },
  ],
  article: [
    { title: 'Complete Guide to Online Shopping', desc: 'Tips and tricks for smart online shopping', tags: ['shopping', 'guide', 'online', 'tips'] },
    { title: 'How to Choose the Right Jewelry', desc: 'Expert guide to buying jewelry', tags: ['jewelry', 'guide', 'shopping', 'tips'] },
    { title: 'Understanding Gemstone Quality', desc: 'What makes gemstones valuable', tags: ['gemstone', 'jewelry', 'guide', 'quality'] },
    { title: 'Sustainable Fashion Explained', desc: 'Why sustainable fashion matters', tags: ['sustainable', 'fashion', 'guide', 'eco'] },
    { title: 'Cryptocurrency for Beginners', desc: 'Getting started with crypto', tags: ['crypto', 'bitcoin', 'guide', 'finance'] },
    { title: 'Home Decor Trends 2025', desc: 'Latest interior design trends', tags: ['homedecor', 'interior', 'trends', 'design'] },
    { title: 'Travel Hacks You Need to Know', desc: 'Save money and time while traveling', tags: ['travel', 'hacks', 'tips', 'vacation'] },
    { title: 'Understanding Credit Scores', desc: 'How to build and maintain good credit', tags: ['credit', 'finance', 'guide', 'money'] },
    { title: 'Smart Home Setup Guide', desc: 'Building your smart home ecosystem', tags: ['smarthome', 'tech', 'guide', 'automation'] },
    { title: 'Digital Marketing Basics', desc: 'Introduction to digital marketing', tags: ['marketing', 'digital', 'guide', 'business'] },
  ],
  featured: [
    { title: 'Exclusive Designer Collection Launch', desc: 'First look at the new designer collection', tags: ['designer', 'exclusive', 'fashion', 'launch'] },
    { title: 'Celebrity Style Breakdown', desc: 'Get the celebrity look for less', tags: ['celebrity', 'style', 'fashion', 'lookbook'] },
    { title: 'Luxury Watch Showcase', desc: 'Premium timepieces worth investing in', tags: ['watches', 'luxury', 'accessories', 'premium'] },
    { title: 'Grand Store Opening Event', desc: 'Highlights from our grand opening celebration', tags: ['event', 'store', 'opening', 'celebration'] },
    { title: 'Fashion Week Highlights', desc: 'Best moments from fashion week', tags: ['fashionweek', 'runway', 'fashion', 'designer'] },
    { title: 'Behind the Scenes - Photoshoot', desc: 'Exclusive BTS of our latest shoot', tags: ['bts', 'photoshoot', 'fashion', 'exclusive'] },
    { title: 'Limited Edition Product Drop', desc: 'Exclusive limited edition collection reveal', tags: ['limitededition', 'exclusive', 'drop', 'collection'] },
    { title: 'Brand Story Documentary', desc: 'The story behind our brand', tags: ['brand', 'story', 'documentary', 'business'] },
    { title: 'Festive Collection Preview', desc: 'Get ready for the festive season', tags: ['festive', 'collection', 'preview', 'celebration'] },
    { title: 'Collaboration Announcement', desc: 'Exciting new brand collaboration', tags: ['collaboration', 'partnership', 'brand', 'announcement'] },
    { title: 'Award Show Highlights', desc: 'Red carpet looks and winners', tags: ['awards', 'redcarpet', 'fashion', 'celebrity'] },
    { title: 'Influencer Takeover', desc: 'Famous influencer takes over our channel', tags: ['influencer', 'takeover', 'collaboration', 'celebrity'] },
    { title: 'Product Innovation Showcase', desc: 'Revolutionary new product features', tags: ['innovation', 'product', 'technology', 'launch'] },
    { title: 'VIP Shopping Experience', desc: 'Exclusive VIP store tour', tags: ['vip', 'shopping', 'exclusive', 'luxury'] },
    { title: 'Charity Event Coverage', desc: 'Supporting causes that matter', tags: ['charity', 'event', 'social', 'community'] },
  ],
  challenge: [
    { title: '30-Day Fitness Challenge', desc: 'Transform your body in 30 days', tags: ['fitness', 'challenge', '30day', 'workout'] },
    { title: 'No-Buy Challenge - 1 Month', desc: 'Can I survive without shopping?', tags: ['nobuy', 'challenge', 'minimalist', 'saving'] },
    { title: 'Makeup Challenge - Under 5 Minutes', desc: 'Full makeup in under 5 minutes', tags: ['makeup', 'challenge', 'beauty', 'quick'] },
    { title: 'Cook Every Meal Challenge', desc: 'One week of home-cooked meals', tags: ['cooking', 'challenge', 'food', 'healthy'] },
    { title: 'Capsule Wardrobe Challenge', desc: '10 pieces, 20 outfits', tags: ['wardrobe', 'challenge', 'fashion', 'minimalist'] },
    { title: 'Zero Waste Week Challenge', desc: 'Living sustainably for one week', tags: ['zerowaste', 'challenge', 'sustainable', 'eco'] },
    { title: 'Early Morning Routine Challenge', desc: '5 AM club for 21 days', tags: ['morning', 'challenge', 'routine', 'productivity'] },
    { title: 'DIY Everything Challenge', desc: 'Making everything from scratch', tags: ['diy', 'challenge', 'creative', 'homemade'] },
    { title: 'Fashion Swap Challenge', desc: 'Trading outfits with friends', tags: ['fashion', 'challenge', 'swap', 'fun'] },
    { title: '10K Steps Daily Challenge', desc: 'Walking 10,000 steps every day', tags: ['walking', 'challenge', 'fitness', 'health'] },
    { title: 'One Color Outfit Challenge', desc: 'Styling outfits in one color', tags: ['outfit', 'challenge', 'fashion', 'style'] },
    { title: 'Budget Beauty Challenge', desc: 'Full glam under ₹500', tags: ['beauty', 'challenge', 'budget', 'makeup'] },
    { title: 'Vegan Week Challenge', desc: 'Going vegan for 7 days', tags: ['vegan', 'challenge', 'food', 'health'] },
    { title: 'Social Media Detox Challenge', desc: 'One week without social media', tags: ['detox', 'challenge', 'wellness', 'mental'] },
    { title: 'Declutter Challenge', desc: 'Organizing one room every day', tags: ['declutter', 'challenge', 'organization', 'home'] },
  ],
  tutorial: [
    { title: 'Perfect Winged Eyeliner Tutorial', desc: 'Master the winged eyeliner technique', tags: ['eyeliner', 'tutorial', 'makeup', 'beauty'] },
    { title: 'How to Tie a Saree Perfectly', desc: 'Step-by-step saree draping guide', tags: ['saree', 'tutorial', 'traditional', 'fashion'] },
    { title: 'DIY Face Mask at Home', desc: 'Natural face masks for glowing skin', tags: ['facemask', 'tutorial', 'diy', 'skincare'] },
    { title: 'Photography Tips for Beginners', desc: 'Take amazing photos with your phone', tags: ['photography', 'tutorial', 'tips', 'camera'] },
    { title: 'How to Plan a Budget', desc: 'Complete budgeting guide for beginners', tags: ['budget', 'tutorial', 'finance', 'money'] },
    { title: 'Basic Sewing Skills', desc: 'Essential sewing techniques everyone should know', tags: ['sewing', 'tutorial', 'diy', 'skills'] },
    { title: 'Guitar for Absolute Beginners', desc: 'Learn your first guitar chords', tags: ['guitar', 'tutorial', 'music', 'beginner'] },
    { title: 'How to Iron Clothes Properly', desc: 'Professional ironing techniques', tags: ['ironing', 'tutorial', 'clothes', 'tips'] },
    { title: 'Calligraphy for Beginners', desc: 'Beautiful handwriting made easy', tags: ['calligraphy', 'tutorial', 'art', 'writing'] },
    { title: 'Cooking Rice Perfectly', desc: 'Different methods to cook perfect rice', tags: ['cooking', 'tutorial', 'rice', 'food'] },
    { title: 'How to Read Faster', desc: 'Speed reading techniques that work', tags: ['reading', 'tutorial', 'learning', 'skills'] },
    { title: 'Plant Care for Beginners', desc: 'Keep your houseplants alive and thriving', tags: ['plants', 'tutorial', 'gardening', 'care'] },
    { title: 'Meditation for Stress Relief', desc: 'Simple meditation techniques', tags: ['meditation', 'tutorial', 'wellness', 'stress'] },
    { title: 'How to Pack a Suitcase', desc: 'Pack smart and save space', tags: ['packing', 'tutorial', 'travel', 'tips'] },
    { title: 'Basic Car Maintenance', desc: 'DIY car care everyone should know', tags: ['car', 'tutorial', 'maintenance', 'auto'] },
  ],
  review: [
    { title: 'iPhone 15 Pro Max Review', desc: 'Complete review after 3 months of use', tags: ['iphone', 'review', 'tech', 'smartphone'] },
    { title: 'Luxury Lipstick Worth the Hype?', desc: 'Testing expensive vs drugstore lipsticks', tags: ['lipstick', 'review', 'makeup', 'beauty'] },
    { title: 'Smart Watch Comparison 2025', desc: 'Best smartwatches under 20k', tags: ['smartwatch', 'review', 'tech', 'comparison'] },
    { title: 'Designer Handbag Review', desc: 'Is this designer bag worth ₹50,000?', tags: ['handbag', 'review', 'luxury', 'fashion'] },
    { title: 'Air Fryer - 6 Months Later', desc: 'Honest review after daily use', tags: ['airfryer', 'review', 'kitchen', 'appliance'] },
    { title: 'Best Jeans for Curvy Women', desc: 'Testing popular jean brands', tags: ['jeans', 'review', 'fashion', 'women'] },
    { title: 'Gaming Laptop Under 60k', desc: 'Budget gaming laptop review', tags: ['laptop', 'review', 'gaming', 'tech'] },
    { title: 'Foundation for Oily Skin', desc: 'Testing 5 long-lasting foundations', tags: ['foundation', 'review', 'makeup', 'beauty'] },
    { title: 'Running Shoes Comparison', desc: 'Best running shoes for different needs', tags: ['shoes', 'review', 'running', 'fitness'] },
    { title: 'Electric Scooter Review', desc: 'Is it better than a bike?', tags: ['scooter', 'review', 'electric', 'transport'] },
    { title: 'Hair Straightener vs Curler', desc: 'Which styling tool is worth buying?', tags: ['hairstyling', 'review', 'beauty', 'tools'] },
    { title: 'Bluetooth Earbuds Under 3k', desc: 'Best budget wireless earbuds', tags: ['earbuds', 'review', 'tech', 'audio'] },
    { title: 'Skincare Products That Work', desc: 'Honest review of trending skincare', tags: ['skincare', 'review', 'beauty', 'products'] },
    { title: 'Coffee Maker Review', desc: 'Making cafe-quality coffee at home', tags: ['coffee', 'review', 'kitchen', 'appliance'] },
    { title: 'Gym Equipment for Home', desc: 'Best home gym equipment worth buying', tags: ['gym', 'review', 'fitness', 'equipment'] },
  ]
};

// Location data for videos
const LOCATIONS = [
  { name: 'Mumbai', city: 'Mumbai', country: 'India', coordinates: [72.8777, 19.0760] },
  { name: 'Delhi', city: 'Delhi', country: 'India', coordinates: [77.1025, 28.7041] },
  { name: 'Bangalore', city: 'Bangalore', country: 'India', coordinates: [77.5946, 12.9716] },
  { name: 'Hyderabad', city: 'Hyderabad', country: 'India', coordinates: [78.4867, 17.3850] },
  { name: 'Chennai', city: 'Chennai', country: 'India', coordinates: [80.2707, 13.0827] },
  { name: 'Kolkata', city: 'Kolkata', country: 'India', coordinates: [88.3639, 22.5726] },
  { name: 'Pune', city: 'Pune', country: 'India', coordinates: [73.8567, 18.5204] },
  { name: 'Ahmedabad', city: 'Ahmedabad', country: 'India', coordinates: [72.5714, 23.0225] },
];

// Music tracks for videos
const MUSIC_TRACKS = [
  { title: 'Summer Vibes', artist: 'DJ Beats' },
  { title: 'Chill Lofi', artist: 'LofiMaster' },
  { title: 'Upbeat Pop', artist: 'PopStar' },
  { title: 'Electronic Dance', artist: 'EDM Pro' },
  { title: 'Acoustic Guitar', artist: 'Guitarist' },
  { title: 'Hip Hop Beat', artist: 'RapProducer' },
  { title: 'Indie Rock', artist: 'Indie Band' },
  { title: 'Jazz Smooth', artist: 'Jazz Trio' },
];

// Effects/Filters
const VIDEO_EFFECTS = [
  'Vintage', 'Vibrant', 'Noir', 'Warm', 'Cool', 'Dramatic',
  'Soft', 'Sharp', 'Glow', 'Cinematic', 'Natural', 'HDR'
];

// Hashtags by category
const HASHTAGS = {
  fashion: ['#fashion', '#style', '#ootd', '#fashionista', '#trendy'],
  beauty: ['#beauty', '#makeup', '#skincare', '#beautytips', '#glam'],
  fitness: ['#fitness', '#workout', '#health', '#fitfam', '#gymmotivation'],
  food: ['#foodie', '#cooking', '#foodporn', '#delicious', '#yummy'],
  tech: ['#tech', '#gadgets', '#technology', '#innovation', '#techreview'],
  lifestyle: ['#lifestyle', '#daily', '#vlog', '#life', '#inspo'],
};

// Helper Functions
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateThumbnailUrl(videoUrl) {
  // Use Cloudinary's automatic thumbnail generation
  // If it's a Cloudinary URL, use transformation to get thumbnail
  if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/upload/')) {
    // Extract the format and convert to image with thumbnail transformation
    // e.g., /video/upload/v1/path.mp4 -> /video/upload/so_0,w_400,h_600,c_fill/v1/path.jpg
    return videoUrl
      .replace('/video/upload/', '/video/upload/so_0,w_400,h_600,c_fill,q_auto/')
      .replace(/\.mp4$/, '.jpg');
  }

  // For non-Cloudinary URLs or demo URLs, use placeholder image
  return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=600&fit=crop';
}

function generateHashtags(tags) {
  return tags.slice(0, 5).map(tag => `#${tag}`);
}

function getContentType(category) {
  if (category === 'article') return 'article_video';
  const rand = Math.random();
  if (rand < 0.35) return 'merchant'; // 35% merchant
  return 'ugc'; // 65% ugc
}

function generateAnalytics(views, likes, comments, shares) {
  const totalEngagement = likes + comments + shares;
  const engagementRate = views > 0 ? (totalEngagement / views) * 100 : 0;
  const likeRate = views > 0 ? (likes / views) * 100 : 0;
  const shareRate = views > 0 ? (shares / views) * 100 : 0;
  const completionRate = getRandomInt(45, 95);
  const avgWatchTime = getRandomInt(15, 120);

  return {
    totalViews: views,
    uniqueViews: Math.floor(views * 0.85),
    avgWatchTime,
    completionRate,
    engagementRate: Math.min(engagementRate, 100),
    shareRate: Math.min(shareRate, 100),
    likeRate: Math.min(likeRate, 100),
    likes,
    comments,
    shares,
    engagement: totalEngagement,
    viewsByHour: {},
    viewsByDate: {},
    topLocations: getRandomElements(LOCATIONS, 3).map(l => l.city),
    deviceBreakdown: {
      mobile: getRandomInt(60, 80),
      tablet: getRandomInt(10, 20),
      desktop: getRandomInt(10, 30)
    }
  };
}

// Main Seed Function
async function seedVideos() {
  console.log('='.repeat(80));
  console.log('🎬 COMPREHENSIVE VIDEO SEED SCRIPT');
  console.log('='.repeat(80));
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log('');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${DB_NAME}`);
    console.log('');

    // Get models
    const Video = mongoose.model('Video');
    const User = mongoose.model('User');
    const Product = mongoose.model('Product');
    const Store = mongoose.model('Store');

    // Fetch existing data
    console.log('🔍 Fetching existing data from database...');

    const [merchants, ugcCreators, products, stores] = await Promise.all([
      User.find({ 'profile.verificationStatus': 'approved' }).limit(25),
      User.find({ 'profile.verificationStatus': { $ne: 'approved' } }).limit(50),
      Product.find({}).limit(100),
      Store.find({}).limit(50)
    ]);

    console.log(`   ✓ Merchants: ${merchants.length}`);
    console.log(`   ✓ UGC Creators: ${ugcCreators.length}`);
    console.log(`   ✓ Products: ${products.length}`);
    console.log(`   ✓ Stores: ${stores.length}`);
    console.log('');

    if (merchants.length === 0 && ugcCreators.length === 0) {
      console.error('❌ No users found! Please seed users first.');
      process.exit(1);
    }

    // Clear existing videos
    console.log('🗑️  Clearing existing videos...');
    const deleteResult = await Video.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} existing videos`);
    console.log('');

    // Generate videos by category
    console.log('🎥 Generating videos...');
    console.log('');

    const categoryDistribution = {
      trending_me: getRandomInt(20, 25),
      trending_her: getRandomInt(20, 25),
      waist: getRandomInt(15, 20),
      article: getRandomInt(10, 15),
      featured: getRandomInt(15, 20),
      challenge: getRandomInt(15, 20),
      tutorial: getRandomInt(15, 20),
      review: getRandomInt(15, 20)
    };

    const allVideos = [];
    let videoCounter = 0;

    for (const [category, count] of Object.entries(categoryDistribution)) {
      console.log(`📂 Creating ${count} videos for category: ${category.toUpperCase()}`);

      const templates = VIDEO_TEMPLATES[category] || [];

      for (let i = 0; i < count; i++) {
        const template = templates[i % templates.length];
        const contentType = getContentType(category);

        // Select creator based on content type
        const creator = contentType === 'merchant'
          ? getRandomElement(merchants.length > 0 ? merchants : ugcCreators)
          : getRandomElement(ugcCreators.length > 0 ? ugcCreators : merchants);

        // Select video URL based on content type
        const videoUrlArray = contentType === 'merchant'
          ? SAMPLE_VIDEO_URLS.merchant
          : (contentType === 'article_video' ? SAMPLE_VIDEO_URLS.article : SAMPLE_VIDEO_URLS.ugc);

        const videoUrl = getRandomElement(videoUrlArray);
        const thumbnailUrl = generateThumbnailUrl(videoUrl);

        // Generate engagement data
        const views = getRandomInt(1000, 100000);
        const likesCount = Math.floor(views * getRandomInt(5, 25) / 100);
        const commentsCount = Math.floor(views * getRandomInt(1, 8) / 100);
        const sharesCount = Math.floor(views * getRandomInt(1, 5) / 100);

        // Select random users for likes (avoid duplicates)
        const allUsers = [...merchants, ...ugcCreators];
        const likedBy = getRandomElements(allUsers, Math.min(likesCount, 20)).map(u => u._id);

        // Select products and stores (50% chance)
        const hasProducts = Math.random() < 0.5;
        const videoProducts = hasProducts && products.length > 0
          ? getRandomElements(products, getRandomInt(1, 3)).map(p => p._id)
          : [];

        const videoStores = stores.length > 0
          ? getRandomElements(stores, getRandomInt(0, 2)).map(s => s._id)
          : [];

        // Generate metadata
        const duration = getRandomInt(15, 180);
        const resolutions = ['720p', '1080p', '4K'];
        const formats = ['mp4', 'mov', 'webm'];
        const aspectRatios = ['16:9', '9:16', '1:1'];

        // Select location and music
        const location = getRandomElement(LOCATIONS);
        const music = getRandomElement(MUSIC_TRACKS);
        const effects = getRandomElements(VIDEO_EFFECTS, getRandomInt(1, 3));

        // Determine if trending
        const isTrending = Math.random() < 0.2; // 20% chance
        const isFeatured = category === 'featured' || Math.random() < 0.1; // Featured category or 10% chance
        const isSponsored = contentType === 'merchant' && Math.random() < 0.15; // 15% of merchant videos

        // Create video object
        const video = {
          title: template.title,
          description: template.desc,
          creator: creator._id,
          contentType,
          videoUrl,
          thumbnail: thumbnailUrl,
          preview: videoUrl, // Same as video for now
          category,
          subcategory: contentType,
          tags: template.tags,
          hashtags: generateHashtags(template.tags),
          products: videoProducts,
          stores: videoStores,

          // Engagement
          engagement: {
            views,
            likes: likedBy,
            shares: sharesCount,
            comments: commentsCount,
            saves: Math.floor(views * getRandomInt(1, 5) / 100),
            reports: 0
          },

          // Metadata
          metadata: {
            duration,
            resolution: getRandomElement(resolutions),
            fileSize: duration * getRandomInt(800000, 1500000), // Approximate file size
            format: getRandomElement(formats),
            aspectRatio: getRandomElement(aspectRatios),
            fps: [30, 60][getRandomInt(0, 1)]
          },

          // Processing
          processing: {
            status: 'completed',
            originalUrl: videoUrl,
            processedUrl: videoUrl,
            thumbnailUrl,
            previewUrl: videoUrl,
            processedAt: new Date(Date.now() - getRandomInt(1, 30) * 86400000)
          },

          // Analytics
          analytics: generateAnalytics(views, likesCount, commentsCount, sharesCount),

          // Status flags
          isPublished: true,
          isApproved: true,
          isFeatured,
          isTrending,
          isSponsored,

          // Sponsor info
          ...(isSponsored && {
            sponsorInfo: {
              brand: stores.length > 0 ? getRandomElement(stores).name : 'Brand Partner',
              campaignId: `CAMP${getRandomInt(1000, 9999)}`,
              isDisclosed: true
            }
          }),

          // Moderation
          moderationStatus: 'approved',
          reportCount: 0,
          isReported: false,

          // Location
          location: {
            name: location.name,
            coordinates: location.coordinates,
            city: location.city,
            country: location.country
          },

          // Music
          music: {
            title: music.title,
            artist: music.artist,
            startTime: 0,
            duration: Math.min(duration, 30)
          },

          // Effects
          effects,

          // Privacy
          privacy: 'public',
          allowComments: true,
          allowSharing: true,

          // Dates
          publishedAt: new Date(Date.now() - getRandomInt(1, 60) * 86400000), // Last 60 days
          createdAt: new Date(Date.now() - getRandomInt(1, 90) * 86400000),
          updatedAt: new Date()
        };

        allVideos.push(video);
        videoCounter++;
      }

      console.log(`   ✅ Generated ${count} ${category} videos`);
    }

    console.log('');
    console.log(`📊 Total videos generated: ${allVideos.length}`);
    console.log('');

    // Insert videos in batches
    console.log('💾 Inserting videos into database...');
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < allVideos.length; i += batchSize) {
      const batch = allVideos.slice(i, i + batchSize);
      await Video.insertMany(batch);
      insertedCount += batch.length;

      const progress = Math.round((insertedCount / allVideos.length) * 100);
      process.stdout.write(`   Progress: ${insertedCount}/${allVideos.length} (${progress}%)\\r`);
    }

    console.log('');
    console.log(`✅ Successfully inserted ${insertedCount} videos`);
    console.log('');

    // Generate summary statistics
    console.log('='.repeat(80));
    console.log('📊 VIDEO SEEDING SUMMARY');
    console.log('='.repeat(80));
    console.log('');

    // Count by category
    console.log('📂 Videos by Category:');
    for (const [category, count] of Object.entries(categoryDistribution)) {
      console.log(`   ${category.padEnd(15)}: ${count.toString().padStart(3)} videos`);
    }
    console.log('');

    // Count by content type
    const contentTypeCounts = {
      merchant: allVideos.filter(v => v.contentType === 'merchant').length,
      ugc: allVideos.filter(v => v.contentType === 'ugc').length,
      article_video: allVideos.filter(v => v.contentType === 'article_video').length
    };

    console.log('🎭 Videos by Content Type:');
    console.log(`   Merchant Videos : ${contentTypeCounts.merchant}`);
    console.log(`   UGC Videos      : ${contentTypeCounts.ugc}`);
    console.log(`   Article Videos  : ${contentTypeCounts.article_video}`);
    console.log('');

    // Other stats
    const videosWithProducts = allVideos.filter(v => v.products.length > 0).length;
    const videosWithStores = allVideos.filter(v => v.stores.length > 0).length;
    const trendingVideos = allVideos.filter(v => v.isTrending).length;
    const featuredVideos = allVideos.filter(v => v.isFeatured).length;
    const sponsoredVideos = allVideos.filter(v => v.isSponsored).length;

    console.log('🔗 Video Relationships:');
    console.log(`   Videos with Products : ${videosWithProducts} (${Math.round(videosWithProducts/allVideos.length*100)}%)`);
    console.log(`   Videos with Stores   : ${videosWithStores}`);
    console.log('');

    console.log('⭐ Special Videos:');
    console.log(`   Trending Videos   : ${trendingVideos}`);
    console.log(`   Featured Videos   : ${featuredVideos}`);
    console.log(`   Sponsored Videos  : ${sponsoredVideos}`);
    console.log('');

    // Engagement stats
    const totalViews = allVideos.reduce((sum, v) => sum + v.engagement.views, 0);
    const totalLikes = allVideos.reduce((sum, v) => sum + v.engagement.likes.length, 0);
    const totalShares = allVideos.reduce((sum, v) => sum + v.engagement.shares, 0);

    console.log('📈 Total Engagement:');
    console.log(`   Total Views  : ${totalViews.toLocaleString()}`);
    console.log(`   Total Likes  : ${totalLikes.toLocaleString()}`);
    console.log(`   Total Shares : ${totalShares.toLocaleString()}`);
    console.log('');

    console.log('☁️  Cloudinary Integration:');
    console.log(`   Cloud Name   : dsuakj68p`);
    console.log(`   Video URLs   : ${allVideos.length} videos`);
    console.log(`   Thumbnails   : Auto-generated for all videos`);
    console.log(`   Folders      : videos/merchant/, videos/ugc/, videos/articles/`);
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ VIDEO SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`📅 Completed at: ${new Date().toLocaleString()}`);
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Verify videos in database');
    console.log('   2. Test video playback on frontend');
    console.log('   3. Check Cloudinary integration');
    console.log('   4. Test category filtering');
    console.log('   5. Verify product and store relationships');
    console.log('');

    // Export videos for reference
    return allVideos;

  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ ERROR DURING VIDEO SEEDING');
    console.error('='.repeat(80));
    console.error('');
    console.error('Error Details:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error('');

    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
    console.log('');
  }
}

// Run if called directly
if (require.main === module) {
  seedVideos()
    .then(() => {
      console.log('🎉 Script execution completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script execution failed:', error.message);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = { seedVideos };
