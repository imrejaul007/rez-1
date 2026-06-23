/**
 * Seed Missing Stores Script - FAST VERSION
 * Creates stores for all missing subcategories with proper category links and products
 */

import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

// Category-specific image keywords for Unsplash
const CATEGORY_IMAGES: Record<string, { logo: string; banner: string; productDefault: string }> = {
  'street-food': { logo: 'indian,street,food,vendor', banner: 'indian,street,food,market', productDefault: 'indian,snack,food' },
  'meat-fish': { logo: 'seafood,market,fresh', banner: 'fish,market,seafood', productDefault: 'fresh,fish,meat' },
  'packaged-goods': { logo: 'grocery,store,packaged', banner: 'supermarket,grocery,shelf', productDefault: 'packaged,food,grocery' },
  'beauty-services': { logo: 'beauty,salon,makeup', banner: 'beauty,salon,spa', productDefault: 'makeup,beauty,cosmetic' },
  'cosmetology': { logo: 'skincare,clinic,beauty', banner: 'dermatology,skin,clinic', productDefault: 'skincare,treatment,facial' },
  'skincare-cosmetics': { logo: 'cosmetics,skincare,beauty', banner: 'skincare,cosmetics,products', productDefault: 'skincare,cream,cosmetic' },
  'nail-studios': { logo: 'nail,salon,manicure', banner: 'nail,art,manicure', productDefault: 'nail,polish,manicure' },
  'grooming-men': { logo: 'barber,grooming,men', banner: 'barbershop,haircut,men', productDefault: 'barber,shave,grooming' },
  'dental': { logo: 'dental,clinic,dentist', banner: 'dental,care,clinic', productDefault: 'dental,teeth,dentist' },
  'vision-eyewear': { logo: 'eyewear,glasses,optical', banner: 'eyeglasses,optical,store', productDefault: 'glasses,eyewear,lens' },
  'bags-accessories': { logo: 'bags,fashion,accessories', banner: 'handbag,fashion,accessories', productDefault: 'bag,leather,fashion' },
  'watches': { logo: 'watches,luxury,timepiece', banner: 'watch,collection,luxury', productDefault: 'wristwatch,luxury,time' },
  'yoga': { logo: 'yoga,meditation,wellness', banner: 'yoga,class,meditation', productDefault: 'yoga,pose,meditation' },
  'zumba': { logo: 'zumba,dance,fitness', banner: 'dance,fitness,aerobics', productDefault: 'dance,fitness,exercise' },
  'martial-arts': { logo: 'martial,arts,karate', banner: 'karate,martial,training', productDefault: 'martial,arts,training' },
  'sports-academies': { logo: 'sports,academy,training', banner: 'sports,field,training', productDefault: 'sports,cricket,football' },
  'sportswear': { logo: 'sportswear,athletic,wear', banner: 'sports,shoes,gear', productDefault: 'sportswear,shoes,athletic' },
  'music-dance-classes': { logo: 'music,guitar,piano', banner: 'music,class,instrument', productDefault: 'music,instrument,guitar' },
  'art-craft': { logo: 'art,painting,craft', banner: 'art,studio,painting', productDefault: 'painting,art,craft' },
  'vocational': { logo: 'computer,training,education', banner: 'classroom,computer,training', productDefault: 'computer,course,training' },
  'language-training': { logo: 'language,learning,education', banner: 'classroom,language,teaching', productDefault: 'language,book,learning' },
  'plumbing': { logo: 'plumber,tools,repair', banner: 'plumbing,pipes,repair', productDefault: 'plumbing,tap,pipe' },
  'electrical': { logo: 'electrician,electrical,tools', banner: 'electrical,wiring,work', productDefault: 'electrical,switch,wire' },
  'cleaning': { logo: 'cleaning,service,home', banner: 'cleaning,house,service', productDefault: 'cleaning,mop,house' },
  'house-shifting': { logo: 'moving,truck,packers', banner: 'moving,boxes,relocation', productDefault: 'moving,box,packing' },
  'home-tutors': { logo: 'tutor,education,teaching', banner: 'home,tuition,study', productDefault: 'study,books,education' },
  'intercity-travel': { logo: 'bus,travel,transport', banner: 'bus,highway,travel', productDefault: 'bus,travel,journey' },
  'taxis': { logo: 'taxi,cab,car', banner: 'taxi,city,transport', productDefault: 'taxi,car,ride' },
  'weekend-getaways': { logo: 'travel,vacation,resort', banner: 'resort,vacation,weekend', productDefault: 'resort,vacation,travel' },
  'tours': { logo: 'tour,travel,adventure', banner: 'tourism,travel,destination', productDefault: 'tour,travel,monument' },
  'activities': { logo: 'adventure,outdoor,activity', banner: 'adventure,outdoor,extreme', productDefault: 'adventure,activity,outdoor' },
  'movies': { logo: 'cinema,movie,theater', banner: 'cinema,theater,movie', productDefault: 'movie,popcorn,cinema' },
  'live-events': { logo: 'concert,event,live', banner: 'concert,stage,event', productDefault: 'concert,event,performance' },
  'festivals': { logo: 'festival,celebration,diwali', banner: 'festival,lights,celebration', productDefault: 'festival,celebration,party' },
  'workshops': { logo: 'workshop,learning,creative', banner: 'workshop,class,creative', productDefault: 'workshop,craft,learning' },
  'bill-payments': { logo: 'bill,payment,finance', banner: 'payment,bills,utility', productDefault: 'bill,payment,receipt' },
  'mobile-recharge': { logo: 'mobile,recharge,phone', banner: 'mobile,phone,recharge', productDefault: 'mobile,sim,recharge' },
  'cable-ott': { logo: 'streaming,tv,entertainment', banner: 'television,streaming,ott', productDefault: 'streaming,tv,netflix' },
  'insurance': { logo: 'insurance,protection,shield', banner: 'insurance,family,protection', productDefault: 'insurance,health,life' },
  'donations': { logo: 'charity,donation,heart', banner: 'charity,helping,donation', productDefault: 'charity,donation,help' }
};

// Product-specific image keywords
const PRODUCT_IMAGES: Record<string, string> = {
  // Street Food
  'Pani Puri': 'pani,puri,golgappa,indian',
  'Aloo Tikki Chaat': 'aloo,tikki,chaat,indian',
  'Bhel Puri': 'bhel,puri,indian,snack',
  'Samosa': 'samosa,indian,snack,fried',
  'Vada Pav': 'vada,pav,mumbai,indian',
  'Pav Bhaji': 'pav,bhaji,indian,mumbai',
  'Misal Pav': 'misal,pav,maharashtrian,spicy',
  'Dabeli': 'dabeli,indian,street,food',
  // Meat & Fish
  'Rohu Fish': 'fish,rohu,fresh,seafood',
  'Pomfret': 'pomfret,fish,seafood,fresh',
  'Prawns': 'prawns,shrimp,seafood,fresh',
  'Chicken': 'raw,chicken,fresh,meat',
  // Packaged Goods
  'Maggi Noodles': 'instant,noodles,maggi,packaged',
  'Aashirvaad Atta': 'wheat,flour,atta,packaged',
  'Fortune Oil': 'cooking,oil,sunflower,bottle',
  'Tata Salt': 'salt,iodized,packaged,tata',
  // Beauty
  'Bridal Makeup': 'bridal,makeup,indian,bride',
  'Party Makeup': 'party,makeup,glamour,beauty',
  'Hair Spa Treatment': 'hair,spa,treatment,salon',
  'Threading': 'eyebrow,threading,beauty,face',
  // Dental
  'Dental Checkup': 'dental,checkup,dentist,clinic',
  'Teeth Cleaning': 'teeth,cleaning,dental,polish',
  'Tooth Filling': 'dental,filling,tooth,cavity',
  'Root Canal': 'root,canal,dental,treatment',
  // Yoga
  'Yoga Class': 'yoga,class,meditation,pose',
  'Private Yoga Session': 'yoga,private,session,instructor',
  'Yoga Mat Premium': 'yoga,mat,exercise,fitness',
  'Meditation Session': 'meditation,peaceful,mindfulness,zen',
  // Movies
  'Movie Ticket': 'cinema,ticket,movie,theater',
  'IMAX Experience': 'imax,cinema,screen,movie',
  'Popcorn Combo': 'popcorn,cinema,snack,movie'
};

// All missing subcategories with their stores and products
const MISSING_SUBCATEGORIES: Record<string, {
  mainCategory: string;
  mainCategoryName: string;
  name: string;
  icon: string;
  stores: Array<{
    name: string;
    description: string;
    products: Array<{ name: string; description: string; price: number; originalPrice: number }>
  }>
}> = {
  'street-food': {
    mainCategory: 'food-dining',
    mainCategoryName: 'Food & Dining',
    name: 'Street Food',
    icon: 'fast-food-outline',
    stores: [
      {
        name: 'Sharma Chaat Corner',
        description: 'Authentic North Indian street food',
        products: [
          { name: 'Pani Puri (6 pcs)', description: 'Crispy puris with spiced water', price: 40, originalPrice: 50 },
          { name: 'Aloo Tikki Chaat', description: 'Crispy potato patties with chutneys', price: 60, originalPrice: 70 },
          { name: 'Bhel Puri', description: 'Puffed rice with vegetables', price: 50, originalPrice: 60 },
          { name: 'Samosa (2 pcs)', description: 'Crispy pastry with potato filling', price: 30, originalPrice: 40 }
        ]
      },
      {
        name: 'Mumbai Vada Pav',
        description: 'Famous Mumbai style street snacks',
        products: [
          { name: 'Vada Pav', description: 'Spiced potato fritter in bread', price: 25, originalPrice: 30 },
          { name: 'Pav Bhaji', description: 'Mashed vegetable curry with bread', price: 80, originalPrice: 90 },
          { name: 'Misal Pav', description: 'Spicy sprouts curry', price: 70, originalPrice: 80 },
          { name: 'Dabeli', description: 'Kutchi snack', price: 30, originalPrice: 35 }
        ]
      }
    ]
  },
  'meat-fish': {
    mainCategory: 'grocery-essentials',
    mainCategoryName: 'Grocery & Essentials',
    name: 'Meat & Fish',
    icon: 'fish-outline',
    stores: [
      {
        name: 'Fresh Catch Seafood',
        description: 'Premium quality fresh fish and seafood',
        products: [
          { name: 'Rohu Fish (1 kg)', description: 'Fresh river fish', price: 280, originalPrice: 320 },
          { name: 'Pomfret (500g)', description: 'Silver pomfret', price: 450, originalPrice: 500 },
          { name: 'Prawns (500g)', description: 'Medium sized prawns', price: 380, originalPrice: 420 },
          { name: 'Chicken (1 kg)', description: 'Fresh chicken curry cut', price: 220, originalPrice: 250 }
        ]
      }
    ]
  },
  'packaged-goods': {
    mainCategory: 'grocery-essentials',
    mainCategoryName: 'Grocery & Essentials',
    name: 'Packaged Goods',
    icon: 'cube-outline',
    stores: [
      {
        name: 'Daily Needs Store',
        description: 'All packaged food essentials',
        products: [
          { name: 'Maggi Noodles (12 pack)', description: '2-minute noodles', price: 144, originalPrice: 168 },
          { name: 'Aashirvaad Atta (5 kg)', description: 'Whole wheat flour', price: 245, originalPrice: 280 },
          { name: 'Fortune Oil (1L)', description: 'Refined sunflower oil', price: 140, originalPrice: 160 },
          { name: 'Tata Salt (1 kg)', description: 'Iodized salt', price: 24, originalPrice: 28 }
        ]
      }
    ]
  },
  'beauty-services': {
    mainCategory: 'beauty-wellness',
    mainCategoryName: 'Beauty & Wellness',
    name: 'Beauty Services',
    icon: 'color-palette-outline',
    stores: [
      {
        name: 'Glow Beauty Studio',
        description: 'Professional beauty services',
        products: [
          { name: 'Bridal Makeup', description: 'Complete bridal makeup', price: 15000, originalPrice: 18000 },
          { name: 'Party Makeup', description: 'Glamorous makeup', price: 3500, originalPrice: 4000 },
          { name: 'Hair Spa Treatment', description: 'Deep conditioning', price: 1200, originalPrice: 1500 },
          { name: 'Threading (Full Face)', description: 'Face threading', price: 150, originalPrice: 200 }
        ]
      }
    ]
  },
  'cosmetology': {
    mainCategory: 'beauty-wellness',
    mainCategoryName: 'Beauty & Wellness',
    name: 'Cosmetology',
    icon: 'brush-outline',
    stores: [
      {
        name: 'Skin Clinic Pro',
        description: 'Advanced cosmetology treatments',
        products: [
          { name: 'Chemical Peel', description: 'Skin rejuvenation', price: 3500, originalPrice: 4000 },
          { name: 'Microdermabrasion', description: 'Exfoliation treatment', price: 2500, originalPrice: 3000 },
          { name: 'Laser Hair Removal', description: 'Permanent hair reduction', price: 4000, originalPrice: 5000 },
          { name: 'Anti-Aging Facial', description: 'Premium anti-aging', price: 2000, originalPrice: 2500 }
        ]
      }
    ]
  },
  'skincare-cosmetics': {
    mainCategory: 'beauty-wellness',
    mainCategoryName: 'Beauty & Wellness',
    name: 'Skincare & Cosmetics',
    icon: 'flower-outline',
    stores: [
      {
        name: 'Beauty Essentials',
        description: 'Premium skincare products',
        products: [
          { name: 'Moisturizing Cream', description: 'Daily hydrating', price: 450, originalPrice: 550 },
          { name: 'Sunscreen SPF 50', description: 'High protection', price: 380, originalPrice: 450 },
          { name: 'Lipstick Set (5)', description: 'Matte lipsticks', price: 650, originalPrice: 800 },
          { name: 'Foundation', description: 'Full coverage', price: 550, originalPrice: 650 }
        ]
      }
    ]
  },
  'nail-studios': {
    mainCategory: 'beauty-wellness',
    mainCategoryName: 'Beauty & Wellness',
    name: 'Nail Studios',
    icon: 'hand-left-outline',
    stores: [
      {
        name: 'Nail Art Studio',
        description: 'Creative nail art services',
        products: [
          { name: 'Gel Nail Extensions', description: 'Long-lasting gel', price: 1500, originalPrice: 1800 },
          { name: 'Nail Art Design', description: 'Custom nail art', price: 100, originalPrice: 150 },
          { name: 'Classic Manicure', description: 'Basic nail care', price: 400, originalPrice: 500 },
          { name: 'French Tips', description: 'French manicure', price: 600, originalPrice: 750 }
        ]
      }
    ]
  },
  'grooming-men': {
    mainCategory: 'beauty-wellness',
    mainCategoryName: 'Beauty & Wellness',
    name: 'Grooming for Men',
    icon: 'man-outline',
    stores: [
      {
        name: 'Gentlemen Grooming',
        description: 'Premium grooming for men',
        products: [
          { name: 'Classic Haircut', description: 'Professional haircut', price: 300, originalPrice: 400 },
          { name: 'Beard Trim', description: 'Beard shaping', price: 200, originalPrice: 250 },
          { name: 'Hot Towel Shave', description: 'Traditional shave', price: 350, originalPrice: 400 },
          { name: 'Facial for Men', description: 'Deep cleansing', price: 600, originalPrice: 750 }
        ]
      }
    ]
  },
  'dental': {
    mainCategory: 'healthcare',
    mainCategoryName: 'Healthcare',
    name: 'Dental',
    icon: 'happy-outline',
    stores: [
      {
        name: 'Smile Dental Clinic',
        description: 'Complete dental care',
        products: [
          { name: 'Dental Checkup', description: 'Oral examination', price: 300, originalPrice: 500 },
          { name: 'Teeth Cleaning', description: 'Scaling and polishing', price: 800, originalPrice: 1000 },
          { name: 'Tooth Filling', description: 'Cavity filling', price: 600, originalPrice: 800 },
          { name: 'Root Canal', description: 'RCT procedure', price: 4500, originalPrice: 6000 }
        ]
      }
    ]
  },
  'vision-eyewear': {
    mainCategory: 'healthcare',
    mainCategoryName: 'Healthcare',
    name: 'Vision & Eyewear',
    icon: 'eye-outline',
    stores: [
      {
        name: 'Clear Vision Opticals',
        description: 'Eye care and eyewear',
        products: [
          { name: 'Eye Checkup', description: 'Eye examination', price: 200, originalPrice: 300 },
          { name: 'Single Vision Lenses', description: 'Prescription lenses', price: 800, originalPrice: 1000 },
          { name: 'Designer Frames', description: 'Premium frames', price: 2500, originalPrice: 3500 },
          { name: 'Contact Lenses (Box)', description: 'Monthly contacts', price: 1200, originalPrice: 1500 }
        ]
      }
    ]
  },
  'bags-accessories': {
    mainCategory: 'fashion',
    mainCategoryName: 'Fashion',
    name: 'Bags & Accessories',
    icon: 'bag-outline',
    stores: [
      {
        name: 'Bag Boutique',
        description: 'Trendy bags and accessories',
        products: [
          { name: 'Leather Handbag', description: 'Premium handbag', price: 2500, originalPrice: 3500 },
          { name: 'Laptop Bag', description: 'Professional laptop carrier', price: 1800, originalPrice: 2200 },
          { name: 'Travel Backpack', description: 'Spacious backpack', price: 1500, originalPrice: 1800 },
          { name: 'Leather Wallet', description: 'Genuine leather', price: 800, originalPrice: 1000 }
        ]
      }
    ]
  },
  'watches': {
    mainCategory: 'fashion',
    mainCategoryName: 'Fashion',
    name: 'Watches',
    icon: 'watch-outline',
    stores: [
      {
        name: 'Time Zone Watches',
        description: 'Premium watches',
        products: [
          { name: 'Analog Watch (Men)', description: 'Classic analog', price: 2500, originalPrice: 3000 },
          { name: 'Smart Watch', description: 'Feature-rich', price: 4500, originalPrice: 5500 },
          { name: 'Ladies Watch', description: 'Elegant watch', price: 2000, originalPrice: 2500 },
          { name: 'Sports Watch', description: 'Digital sports', price: 1800, originalPrice: 2200 }
        ]
      }
    ]
  },
  'yoga': {
    mainCategory: 'fitness-sports',
    mainCategoryName: 'Fitness & Sports',
    name: 'Yoga',
    icon: 'body-outline',
    stores: [
      {
        name: 'Yoga Wellness Center',
        description: 'Traditional yoga classes',
        products: [
          { name: 'Yoga Class (Monthly)', description: 'Daily sessions', price: 2000, originalPrice: 2500 },
          { name: 'Private Yoga Session', description: 'One-on-one', price: 800, originalPrice: 1000 },
          { name: 'Yoga Mat Premium', description: 'Anti-slip mat', price: 1200, originalPrice: 1500 },
          { name: 'Meditation Session', description: 'Guided meditation', price: 500, originalPrice: 600 }
        ]
      }
    ]
  },
  'zumba': {
    mainCategory: 'fitness-sports',
    mainCategoryName: 'Fitness & Sports',
    name: 'Zumba',
    icon: 'musical-notes-outline',
    stores: [
      {
        name: 'Zumba Fitness Studio',
        description: 'High-energy Zumba',
        products: [
          { name: 'Zumba Class (Monthly)', description: 'Unlimited classes', price: 2500, originalPrice: 3000 },
          { name: 'Single Session', description: 'Drop-in class', price: 300, originalPrice: 400 },
          { name: 'Zumba Gold (Seniors)', description: 'Low-impact', price: 2000, originalPrice: 2500 },
          { name: 'Private Party', description: 'Group session', price: 5000, originalPrice: 6000 }
        ]
      }
    ]
  },
  'martial-arts': {
    mainCategory: 'fitness-sports',
    mainCategoryName: 'Fitness & Sports',
    name: 'Martial Arts',
    icon: 'hand-right-outline',
    stores: [
      {
        name: 'Dragon Martial Arts',
        description: 'Learn self-defense',
        products: [
          { name: 'Karate (Monthly)', description: 'Traditional karate', price: 2500, originalPrice: 3000 },
          { name: 'Taekwondo (Monthly)', description: 'Korean martial arts', price: 2500, originalPrice: 3000 },
          { name: 'Self-Defense Workshop', description: 'Basic techniques', price: 1500, originalPrice: 2000 },
          { name: 'MMA Training', description: 'Mixed martial arts', price: 3500, originalPrice: 4500 }
        ]
      }
    ]
  },
  'sports-academies': {
    mainCategory: 'fitness-sports',
    mainCategoryName: 'Fitness & Sports',
    name: 'Sports Academies',
    icon: 'football-outline',
    stores: [
      {
        name: 'Champions Sports Academy',
        description: 'Professional sports training',
        products: [
          { name: 'Cricket Coaching (Monthly)', description: 'Cricket training', price: 3000, originalPrice: 3500 },
          { name: 'Football Training', description: 'Soccer skills', price: 2500, originalPrice: 3000 },
          { name: 'Badminton Coaching', description: 'Badminton technique', price: 2000, originalPrice: 2500 },
          { name: 'Swimming Lessons', description: 'Learn to swim', price: 3500, originalPrice: 4000 }
        ]
      }
    ]
  },
  'sportswear': {
    mainCategory: 'fitness-sports',
    mainCategoryName: 'Fitness & Sports',
    name: 'Sportswear',
    icon: 'shirt-outline',
    stores: [
      {
        name: 'Sports Gear Pro',
        description: 'Quality sportswear',
        products: [
          { name: 'Running Shoes', description: 'Cushioned footwear', price: 3500, originalPrice: 4500 },
          { name: 'Track Pants', description: 'Athletic pants', price: 1200, originalPrice: 1500 },
          { name: 'Sports T-Shirt', description: 'Moisture-wicking', price: 800, originalPrice: 1000 },
          { name: 'Gym Bag', description: 'Spacious duffel', price: 1500, originalPrice: 1800 }
        ]
      }
    ]
  },
  'music-dance-classes': {
    mainCategory: 'education-learning',
    mainCategoryName: 'Education & Learning',
    name: 'Music & Dance Classes',
    icon: 'musical-note-outline',
    stores: [
      {
        name: 'Melody Music Academy',
        description: 'Learn music and dance',
        products: [
          { name: 'Guitar Classes (Monthly)', description: 'Acoustic guitar', price: 3000, originalPrice: 3500 },
          { name: 'Vocal Training', description: 'Singing lessons', price: 2500, originalPrice: 3000 },
          { name: 'Classical Dance', description: 'Bharatanatyam', price: 2000, originalPrice: 2500 },
          { name: 'Western Dance', description: 'Hip-hop', price: 2500, originalPrice: 3000 }
        ]
      }
    ]
  },
  'art-craft': {
    mainCategory: 'education-learning',
    mainCategoryName: 'Education & Learning',
    name: 'Art & Craft',
    icon: 'color-palette-outline',
    stores: [
      {
        name: 'Creative Arts Studio',
        description: 'Explore your artistic side',
        products: [
          { name: 'Painting Classes (Monthly)', description: 'Oil and acrylic', price: 2500, originalPrice: 3000 },
          { name: 'Sketching Workshop', description: 'Pencil sketching', price: 1500, originalPrice: 1800 },
          { name: 'Pottery Making', description: 'Ceramic pottery', price: 2000, originalPrice: 2500 },
          { name: 'Calligraphy Class', description: 'Handwriting art', price: 1800, originalPrice: 2200 }
        ]
      }
    ]
  },
  'vocational': {
    mainCategory: 'education-learning',
    mainCategoryName: 'Education & Learning',
    name: 'Vocational',
    icon: 'construct-outline',
    stores: [
      {
        name: 'Skill Pro Institute',
        description: 'Practical vocational training',
        products: [
          { name: 'Computer Course (3 months)', description: 'Basic to advanced', price: 8000, originalPrice: 10000 },
          { name: 'Tally Accounting', description: 'Tally ERP', price: 5000, originalPrice: 6000 },
          { name: 'Web Development', description: 'HTML, CSS, JS', price: 15000, originalPrice: 18000 },
          { name: 'Digital Marketing', description: 'Online marketing', price: 12000, originalPrice: 15000 }
        ]
      }
    ]
  },
  'language-training': {
    mainCategory: 'education-learning',
    mainCategoryName: 'Education & Learning',
    name: 'Language Training',
    icon: 'language-outline',
    stores: [
      {
        name: 'Language Hub',
        description: 'Learn new languages',
        products: [
          { name: 'English Speaking', description: 'Fluent communication', price: 6000, originalPrice: 8000 },
          { name: 'French Beginner', description: 'Basic French', price: 8000, originalPrice: 10000 },
          { name: 'German Course', description: 'A1-A2 German', price: 12000, originalPrice: 15000 },
          { name: 'IELTS Preparation', description: 'Exam coaching', price: 15000, originalPrice: 18000 }
        ]
      }
    ]
  },
  'plumbing': {
    mainCategory: 'home-services',
    mainCategoryName: 'Home Services',
    name: 'Plumbing',
    icon: 'water-outline',
    stores: [
      {
        name: 'Quick Fix Plumbers',
        description: 'Expert plumbing solutions',
        products: [
          { name: 'Tap Repair', description: 'Fix faulty taps', price: 250, originalPrice: 350 },
          { name: 'Pipe Leakage Repair', description: 'Fix pipe leaks', price: 400, originalPrice: 500 },
          { name: 'Toilet Repair', description: 'Flush repair', price: 350, originalPrice: 450 },
          { name: 'Water Tank Cleaning', description: 'Tank cleaning', price: 800, originalPrice: 1000 }
        ]
      }
    ]
  },
  'electrical': {
    mainCategory: 'home-services',
    mainCategoryName: 'Home Services',
    name: 'Electrical',
    icon: 'flash-outline',
    stores: [
      {
        name: 'Spark Electrical',
        description: 'Reliable electrical work',
        products: [
          { name: 'Fan Installation', description: 'Ceiling fan fitting', price: 300, originalPrice: 400 },
          { name: 'Switchboard Repair', description: 'Fix switches', price: 250, originalPrice: 350 },
          { name: 'Wiring Work (per point)', description: 'New point', price: 200, originalPrice: 250 },
          { name: 'Light Fitting', description: 'Install fixtures', price: 200, originalPrice: 300 }
        ]
      }
    ]
  },
  'cleaning': {
    mainCategory: 'home-services',
    mainCategoryName: 'Home Services',
    name: 'Cleaning',
    icon: 'sparkles-outline',
    stores: [
      {
        name: 'Sparkle Clean Services',
        description: 'Professional cleaning',
        products: [
          { name: 'Full Home Cleaning', description: 'Complete house', price: 2500, originalPrice: 3000 },
          { name: 'Kitchen Deep Clean', description: 'Thorough kitchen', price: 1200, originalPrice: 1500 },
          { name: 'Bathroom Cleaning', description: 'Sanitization', price: 600, originalPrice: 800 },
          { name: 'Sofa Cleaning', description: 'Per seat', price: 400, originalPrice: 500 }
        ]
      }
    ]
  },
  'house-shifting': {
    mainCategory: 'home-services',
    mainCategoryName: 'Home Services',
    name: 'House Shifting',
    icon: 'car-outline',
    stores: [
      {
        name: 'Safe Move Packers',
        description: 'Hassle-free relocation',
        products: [
          { name: '1 BHK Shifting (Local)', description: 'Complete move', price: 5000, originalPrice: 7000 },
          { name: '2 BHK Shifting (Local)', description: 'Medium house', price: 8000, originalPrice: 10000 },
          { name: '3 BHK Shifting (Local)', description: 'Large house', price: 12000, originalPrice: 15000 },
          { name: 'Packing Materials', description: 'Boxes, tape', price: 1500, originalPrice: 2000 }
        ]
      }
    ]
  },
  'home-tutors': {
    mainCategory: 'home-services',
    mainCategoryName: 'Home Services',
    name: 'Home Tutors',
    icon: 'book-outline',
    stores: [
      {
        name: 'Expert Home Tutors',
        description: 'Education at doorstep',
        products: [
          { name: 'Math Tuition (Monthly)', description: 'Mathematics', price: 3000, originalPrice: 3500 },
          { name: 'Science Tuition', description: 'Physics, Chem, Bio', price: 3500, originalPrice: 4000 },
          { name: 'English Tuition', description: 'Language', price: 2500, originalPrice: 3000 },
          { name: 'All Subjects (Primary)', description: 'Class 1-5', price: 4000, originalPrice: 5000 }
        ]
      }
    ]
  },
  'intercity-travel': {
    mainCategory: 'travel-experiences',
    mainCategoryName: 'Travel & Experiences',
    name: 'Intercity Travel',
    icon: 'bus-outline',
    stores: [
      {
        name: 'City Connect Travels',
        description: 'Comfortable bus services',
        products: [
          { name: 'Bangalore-Chennai (AC)', description: 'Overnight bus', price: 800, originalPrice: 1000 },
          { name: 'Bangalore-Hyderabad (AC)', description: 'AC seater', price: 900, originalPrice: 1100 },
          { name: 'Bangalore-Goa (Volvo)', description: 'Luxury Volvo', price: 1200, originalPrice: 1500 },
          { name: 'Bangalore-Mysore (AC)', description: 'Short distance', price: 350, originalPrice: 450 }
        ]
      }
    ]
  },
  'taxis': {
    mainCategory: 'travel-experiences',
    mainCategoryName: 'Travel & Experiences',
    name: 'Taxis',
    icon: 'car-outline',
    stores: [
      {
        name: 'City Cab Services',
        description: 'Reliable taxi services',
        products: [
          { name: 'Airport Transfer', description: 'One way drop', price: 800, originalPrice: 1000 },
          { name: 'Half Day Rental (4 hrs)', description: '4 hour ride', price: 1200, originalPrice: 1500 },
          { name: 'Full Day Rental (8 hrs)', description: '8 hour package', price: 2200, originalPrice: 2800 },
          { name: 'Outstation (per km)', description: 'Intercity rate', price: 12, originalPrice: 15 }
        ]
      }
    ]
  },
  'weekend-getaways': {
    mainCategory: 'travel-experiences',
    mainCategoryName: 'Travel & Experiences',
    name: 'Weekend Getaways',
    icon: 'map-outline',
    stores: [
      {
        name: 'Escape Holidays',
        description: 'Perfect weekend destinations',
        products: [
          { name: 'Coorg Package (2D/1N)', description: 'Coffee plantation', price: 5500, originalPrice: 7000 },
          { name: 'Ooty Trip (3D/2N)', description: 'Hill station', price: 8000, originalPrice: 10000 },
          { name: 'Goa Beach (3D/2N)', description: 'Beach resort', price: 12000, originalPrice: 15000 },
          { name: 'Wayanad (2D/1N)', description: 'Nature wildlife', price: 6000, originalPrice: 7500 }
        ]
      }
    ]
  },
  'tours': {
    mainCategory: 'travel-experiences',
    mainCategoryName: 'Travel & Experiences',
    name: 'Tours',
    icon: 'compass-outline',
    stores: [
      {
        name: 'Discover India Tours',
        description: 'Guided tours',
        products: [
          { name: 'Rajasthan Tour (7D/6N)', description: 'Royal Rajasthan', price: 35000, originalPrice: 45000 },
          { name: 'Kerala Backwaters (5D/4N)', description: 'Gods own country', price: 25000, originalPrice: 32000 },
          { name: 'Golden Triangle (4D/3N)', description: 'Delhi-Agra-Jaipur', price: 18000, originalPrice: 22000 },
          { name: 'South India Temple', description: 'Spiritual journey', price: 20000, originalPrice: 25000 }
        ]
      }
    ]
  },
  'activities': {
    mainCategory: 'travel-experiences',
    mainCategoryName: 'Travel & Experiences',
    name: 'Activities',
    icon: 'bicycle-outline',
    stores: [
      {
        name: 'Adventure Zone',
        description: 'Thrilling activities',
        products: [
          { name: 'Bungee Jumping', description: 'Adrenaline rush', price: 3500, originalPrice: 4500 },
          { name: 'Paragliding', description: 'Fly like a bird', price: 2500, originalPrice: 3000 },
          { name: 'River Rafting', description: 'White water', price: 1500, originalPrice: 2000 },
          { name: 'Trekking (Day)', description: 'Guided trek', price: 1200, originalPrice: 1500 }
        ]
      }
    ]
  },
  'movies': {
    mainCategory: 'entertainment',
    mainCategoryName: 'Entertainment',
    name: 'Movies',
    icon: 'film-outline',
    stores: [
      {
        name: 'CineMax Theatres',
        description: 'Premium movie experience',
        products: [
          { name: 'Movie Ticket (Regular)', description: 'Standard seating', price: 150, originalPrice: 200 },
          { name: 'Movie Ticket (Premium)', description: 'Recliner', price: 350, originalPrice: 450 },
          { name: 'IMAX Experience', description: 'Giant screen', price: 450, originalPrice: 550 },
          { name: 'Popcorn Combo', description: 'Popcorn + drinks', price: 400, originalPrice: 500 }
        ]
      }
    ]
  },
  'live-events': {
    mainCategory: 'entertainment',
    mainCategoryName: 'Entertainment',
    name: 'Live Events',
    icon: 'mic-outline',
    stores: [
      {
        name: 'EventHub Tickets',
        description: 'Live event tickets',
        products: [
          { name: 'Concert (General)', description: 'Standing area', price: 1500, originalPrice: 2000 },
          { name: 'Concert (VIP)', description: 'Premium seating', price: 5000, originalPrice: 7000 },
          { name: 'Comedy Show', description: 'Stand-up night', price: 800, originalPrice: 1000 },
          { name: 'Theatre Play', description: 'Drama performance', price: 600, originalPrice: 800 }
        ]
      }
    ]
  },
  'festivals': {
    mainCategory: 'entertainment',
    mainCategoryName: 'Entertainment',
    name: 'Festivals',
    icon: 'bonfire-outline',
    stores: [
      {
        name: 'Festival Central',
        description: 'Festival events',
        products: [
          { name: 'Diwali Package', description: 'Lights, sweets', price: 2500, originalPrice: 3000 },
          { name: 'Holi Party Entry', description: 'Rain dance', price: 800, originalPrice: 1000 },
          { name: 'Christmas Carnival', description: 'Winter event', price: 600, originalPrice: 800 },
          { name: 'New Year Party', description: 'NYE celebration', price: 3000, originalPrice: 4000 }
        ]
      }
    ]
  },
  'workshops': {
    mainCategory: 'entertainment',
    mainCategoryName: 'Entertainment',
    name: 'Workshops',
    icon: 'build-outline',
    stores: [
      {
        name: 'Learn Create Workshop',
        description: 'Hands-on learning',
        products: [
          { name: 'Photography Workshop', description: 'DSLR basics', price: 2500, originalPrice: 3000 },
          { name: 'Cooking Class', description: 'New cuisines', price: 1500, originalPrice: 2000 },
          { name: 'Pottery Workshop', description: 'Ceramic art', price: 1800, originalPrice: 2200 },
          { name: 'Baking Workshop', description: 'Cake and pastry', price: 2000, originalPrice: 2500 }
        ]
      }
    ]
  },
  'bill-payments': {
    mainCategory: 'financial-lifestyle',
    mainCategoryName: 'Financial & Lifestyle',
    name: 'Bill Payments',
    icon: 'receipt-outline',
    stores: [
      {
        name: 'PayEasy Services',
        description: 'All bill payments',
        products: [
          { name: 'Electricity Bill', description: 'BESCOM etc', price: 10, originalPrice: 20 },
          { name: 'Water Bill', description: 'BWSSB', price: 10, originalPrice: 20 },
          { name: 'Gas Bill', description: 'Piped gas', price: 10, originalPrice: 20 },
          { name: 'Credit Card Bill', description: 'Any bank', price: 15, originalPrice: 30 }
        ]
      }
    ]
  },
  'mobile-recharge': {
    mainCategory: 'financial-lifestyle',
    mainCategoryName: 'Financial & Lifestyle',
    name: 'Mobile Recharge',
    icon: 'phone-portrait-outline',
    stores: [
      {
        name: 'Instant Recharge',
        description: 'Quick recharge',
        products: [
          { name: 'Prepaid ₹199', description: 'Unlimited + data', price: 199, originalPrice: 199 },
          { name: 'Prepaid ₹299', description: '2GB/day', price: 299, originalPrice: 299 },
          { name: 'DTH Recharge ₹300', description: 'Monthly pack', price: 300, originalPrice: 300 },
          { name: 'Data Pack ₹98', description: '6GB data', price: 98, originalPrice: 98 }
        ]
      }
    ]
  },
  'cable-ott': {
    mainCategory: 'financial-lifestyle',
    mainCategoryName: 'Financial & Lifestyle',
    name: 'Cable & OTT',
    icon: 'tv-outline',
    stores: [
      {
        name: 'Stream Plus',
        description: 'OTT subscriptions',
        products: [
          { name: 'Netflix (Monthly)', description: 'Standard HD', price: 499, originalPrice: 499 },
          { name: 'Amazon Prime (Annual)', description: 'Prime membership', price: 1499, originalPrice: 1499 },
          { name: 'Hotstar Premium', description: 'Disney+ Hotstar', price: 1499, originalPrice: 1499 },
          { name: 'Cable TV (Monthly)', description: 'HD channels', price: 350, originalPrice: 400 }
        ]
      }
    ]
  },
  'insurance': {
    mainCategory: 'financial-lifestyle',
    mainCategoryName: 'Financial & Lifestyle',
    name: 'Insurance',
    icon: 'shield-checkmark-outline',
    stores: [
      {
        name: 'SecureLife Insurance',
        description: 'Protect what matters',
        products: [
          { name: 'Health Insurance (Individual)', description: '5 Lakh cover', price: 8000, originalPrice: 10000 },
          { name: 'Health Insurance (Family)', description: '10 Lakh floater', price: 15000, originalPrice: 18000 },
          { name: 'Term Life Insurance', description: '1 Crore cover', price: 12000, originalPrice: 15000 },
          { name: 'Car Insurance', description: 'Comprehensive', price: 8000, originalPrice: 10000 }
        ]
      }
    ]
  },
  'donations': {
    mainCategory: 'financial-lifestyle',
    mainCategoryName: 'Financial & Lifestyle',
    name: 'Donations',
    icon: 'heart-outline',
    stores: [
      {
        name: 'GiveBack Foundation',
        description: 'Support causes',
        products: [
          { name: 'Feed a Child (Monthly)', description: 'Provide meals', price: 500, originalPrice: 500 },
          { name: 'Education Support', description: 'School supplies', price: 1000, originalPrice: 1000 },
          { name: 'Plant a Tree', description: 'Environmental', price: 250, originalPrice: 250 },
          { name: 'Medical Aid', description: 'Healthcare for needy', price: 1000, originalPrice: 1000 }
        ]
      }
    ]
  }
};

async function seedMissingStores() {
  console.log('🚀 Starting to seed missing stores (FAST VERSION)...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db!;

  // Get an existing merchant to link stores to
  const existingMerchant = await db.collection('merchants').findOne({});
  const merchantId = existingMerchant?._id;
  console.log('📦 Using merchant:', existingMerchant?.businessName || 'None found');

  let totalStoresCreated = 0;
  let totalProductsCreated = 0;
  let skippedStores = 0;

  for (const [subcatSlug, data] of Object.entries(MISSING_SUBCATEGORIES)) {
    console.log(`\n📂 Processing: ${data.name} (${subcatSlug})`);

    // Find or create main category
    let mainCategory = await db.collection('categories').findOne({ slug: data.mainCategory });
    if (!mainCategory) {
      const result = await db.collection('categories').insertOne({
        name: data.mainCategoryName,
        slug: data.mainCategory,
        icon: 'grid-outline',
        type: 'general',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mainCategory = { _id: result.insertedId, name: data.mainCategoryName, slug: data.mainCategory };
      console.log(`  ✅ Created main category: ${data.mainCategoryName}`);
    }

    // Find or create subcategory
    let subcategory = await db.collection('categories').findOne({ slug: subcatSlug });
    if (!subcategory) {
      const result = await db.collection('categories').insertOne({
        name: data.name,
        slug: subcatSlug,
        icon: data.icon,
        type: 'general',
        parentCategory: mainCategory._id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      subcategory = { _id: result.insertedId, name: data.name, slug: subcatSlug };
      console.log(`  ✅ Created subcategory: ${data.name}`);
    }

    // Check if stores already exist for this subcategory
    const existingCount = await db.collection('stores').countDocuments({ subcategorySlug: subcatSlug });
    if (existingCount > 0) {
      console.log(`  ⏭️ Skipping - ${existingCount} stores already exist`);
      skippedStores += existingCount;
      continue;
    }

    // Create stores
    for (const storeData of data.stores) {
      const storeSlug = storeData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

      // Check if store with this slug exists
      const existingStore = await db.collection('stores').findOne({ slug: storeSlug });
      if (existingStore) {
        console.log(`  ⏭️ Store exists: ${storeData.name}`);
        skippedStores++;
        continue;
      }

      // Get category-specific images
      const categoryImages = CATEGORY_IMAGES[subcatSlug] || {
        logo: 'store,shop,business',
        banner: 'store,business,shop',
        productDefault: 'product,item'
      };

      // Create store
      const storeResult = await db.collection('stores').insertOne({
        name: storeData.name,
        slug: storeSlug,
        description: storeData.description,
        category: mainCategory._id,
        subcategory: subcategory._id,
        subcategorySlug: subcatSlug,
        merchantId: merchantId,
        logo: `https://source.unsplash.com/200x200/?${categoryImages.logo}`,
        banner: `https://source.unsplash.com/800x400/?${categoryImages.banner}`,
        location: {
          address: '123 Main Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          coordinates: [77.5946, 12.9716]
        },
        contact: {
          phone: '+91 98765 43210',
          email: `info@${storeSlug}.com`
        },
        ratings: {
          average: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
          count: Math.floor(Math.random() * 500 + 50)
        },
        offers: {
          cashback: Math.floor(Math.random() * 10 + 5),
          isPartner: true,
          partnerLevel: 'gold'
        },
        operationalInfo: {
          isOpen: true,
          deliveryTime: '30-45 min',
          minimumOrder: 100
        },
        isFeatured: Math.random() > 0.5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const storeId = storeResult.insertedId;
      totalStoresCreated++;
      console.log(`  ✅ Created store: ${storeData.name}`);

      // Create products in bulk
      const products = storeData.products.map((p, idx) => {
        const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
        // Get product-specific image or use category default
        const productNameKey = Object.keys(PRODUCT_IMAGES).find(key => p.name.includes(key));
        const imageKeywords = productNameKey
          ? PRODUCT_IMAGES[productNameKey]
          : categoryImages.productDefault;

        return {
          name: p.name,
          slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
          description: p.description,
          sku: `SKU-${subcatSlug.toUpperCase().slice(0, 4)}-${Date.now()}-${idx}`,
          productType: 'product',
          category: mainCategory._id,
          subCategory: subcategory._id,
          subSubCategory: data.name,
          store: storeId,
          merchantId: merchantId,
          images: [`https://source.unsplash.com/400x400/?${imageKeywords}`],
          pricing: {
            original: p.originalPrice,
            selling: p.price,
            discount: discount,
            currency: 'INR'
          },
          ratings: {
            average: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
            count: Math.floor(Math.random() * 100 + 10)
          },
          cashback: {
            percentage: Math.floor(Math.random() * 8 + 3),
            maxAmount: Math.floor(p.price * 0.2)
          },
          inventory: {
            stock: Math.floor(Math.random() * 100 + 20),
            quantity: Math.floor(Math.random() * 100 + 20),
            isAvailable: true
          },
          isFeatured: Math.random() > 0.7,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

      await db.collection('products').insertMany(products);
      totalProductsCreated += products.length;
      console.log(`    ✅ Created ${products.length} products`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Seeding complete!');
  console.log(`   📦 Stores created: ${totalStoresCreated}`);
  console.log(`   🏷️ Products created: ${totalProductsCreated}`);
  console.log(`   ⏭️ Stores skipped: ${skippedStores}`);
  console.log('='.repeat(50));

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

seedMissingStores().catch(console.error);
