/**
 * Sub-Sub-Category Configuration
 * Based on sub-sub-category.md specifications
 * Maps subcategory slugs to their sub-sub-categories (cuisine/item types)
 */

export interface SubSubCategory {
  slug: string;
  name: string;
  icon?: string;
}

export const SUB_SUB_CATEGORY_CONFIG: Record<string, SubSubCategory[]> = {
  // A. FOOD & DINING
  'cafes': [
    { slug: 'espresso-drinks', name: 'Espresso-based drinks', icon: 'cafe' },
    { slug: 'tea', name: 'Tea (Chai/Herbal)', icon: 'leaf' },
    { slug: 'breakfast', name: 'Breakfast Items', icon: 'sunny' },
    { slug: 'sandwiches', name: 'Sandwiches', icon: 'fast-food' },
    { slug: 'brunch', name: 'All-day Brunch', icon: 'restaurant' },
  ],
  'qsr-fast-food': [
    { slug: 'burgers', name: 'Burgers', icon: 'fast-food' },
    { slug: 'pizzas', name: 'Pizzas', icon: 'pizza' },
    { slug: 'tacos-burritos', name: 'Tacos/Burritos', icon: 'restaurant' },
    { slug: 'wraps-rolls', name: 'Wraps/Rolls', icon: 'nutrition' },
    { slug: 'fried-chicken', name: 'Fried Chicken', icon: 'restaurant' },
    { slug: 'momos', name: 'Momos', icon: 'restaurant' },
  ],
  'family-restaurants': [
    { slug: 'north-indian', name: 'North Indian', icon: 'restaurant' },
    { slug: 'south-indian', name: 'South Indian', icon: 'restaurant' },
    { slug: 'chinese-asian', name: 'Chinese/Asian', icon: 'restaurant' },
    { slug: 'multicuisine', name: 'Multicuisine', icon: 'globe' },
  ],
  'fine-dining': [
    { slug: 'continental', name: 'Continental', icon: 'wine' },
    { slug: 'modern-indian', name: 'Modern Indian', icon: 'restaurant' },
    { slug: 'italian-gourmet', name: 'Italian (Gourmet)', icon: 'pizza' },
    { slug: 'japanese', name: 'Japanese', icon: 'fish' },
    { slug: 'mediterranean', name: 'Mediterranean', icon: 'leaf' },
  ],
  'ice-cream-dessert': [
    { slug: 'gelato', name: 'Gelato', icon: 'ice-cream' },
    { slug: 'sorbet', name: 'Sorbet', icon: 'ice-cream' },
    { slug: 'sundaes', name: 'Sundaes', icon: 'ice-cream' },
    { slug: 'shakes', name: 'Shakes', icon: 'cafe' },
    { slug: 'frozen-yogurt', name: 'Frozen Yogurt', icon: 'ice-cream' },
    { slug: 'kulfi', name: 'Indian Desserts (Kulfi)', icon: 'ice-cream' },
  ],
  'bakery-confectionery': [
    { slug: 'cakes-pastries', name: 'Cakes & Pastries', icon: 'nutrition' },
    { slug: 'bread', name: 'Bread', icon: 'nutrition' },
    { slug: 'cookies-brownies', name: 'Cookies & Brownies', icon: 'nutrition' },
    { slug: 'donuts', name: 'Donuts', icon: 'nutrition' },
    { slug: 'mithai', name: 'Indian Sweets (Mithai)', icon: 'nutrition' },
  ],
  'cloud-kitchens': [
    { slug: 'biryani', name: 'Biryani', icon: 'restaurant' },
    { slug: 'health-salad', name: 'Health & Salad Bowls', icon: 'leaf' },
    { slug: 'meal-boxes', name: 'Meal Boxes', icon: 'cube' },
    { slug: 'desserts-only', name: 'Desserts only', icon: 'ice-cream' },
  ],
  'street-food': [
    { slug: 'chaat', name: 'Chaat', icon: 'restaurant' },
    { slug: 'vada-pav', name: 'Vada Pav', icon: 'fast-food' },
    { slug: 'pav-bhaji', name: 'Pav Bhaji', icon: 'restaurant' },
    { slug: 'local-snacks', name: 'Local Snacks', icon: 'restaurant' },
  ],

  // B. GROCERY & ESSENTIALS
  'supermarkets': [
    { slug: 'fresh-produce', name: 'Fresh Produce', icon: 'leaf' },
    { slug: 'dairy-eggs', name: 'Dairy & Eggs', icon: 'water' },
    { slug: 'packaged-foods', name: 'Packaged Foods', icon: 'cube' },
    { slug: 'household-goods', name: 'Household Goods', icon: 'home' },
    { slug: 'personal-care', name: 'Personal Care', icon: 'body' },
  ],
  'kirana-stores': [
    { slug: 'pulses-grains', name: 'Pulses & Grains', icon: 'nutrition' },
    { slug: 'spices-masalas', name: 'Spices & Masalas', icon: 'flame' },
    { slug: 'oils-ghee', name: 'Oils & Ghee', icon: 'water' },
    { slug: 'stationery', name: 'Stationery', icon: 'pencil' },
    { slug: 'basic-toiletries', name: 'Basic Toiletries', icon: 'body' },
  ],
  'fresh-vegetables': [
    { slug: 'seasonal-produce', name: 'Seasonal Produce', icon: 'leaf' },
    { slug: 'exotic-vegetables', name: 'Exotic Vegetables', icon: 'leaf' },
    { slug: 'organic-vegetables', name: 'Organic Vegetables', icon: 'leaf' },
  ],
  'meat-fish': [
    { slug: 'poultry', name: 'Poultry (Chicken/Duck)', icon: 'restaurant' },
    { slug: 'mutton-lamb', name: 'Mutton/Lamb', icon: 'restaurant' },
    { slug: 'seafood', name: 'Seafood', icon: 'fish' },
    { slug: 'processed-meats', name: 'Processed Meats', icon: 'restaurant' },
  ],
  'dairy': [
    { slug: 'milk', name: 'Milk', icon: 'water' },
    { slug: 'yogurt-curd', name: 'Yogurt/Curd', icon: 'nutrition' },
    { slug: 'cheese', name: 'Cheese', icon: 'nutrition' },
    { slug: 'butter-cream', name: 'Butter & Cream', icon: 'nutrition' },
    { slug: 'paneer', name: 'Paneer', icon: 'nutrition' },
  ],
  'packaged-goods': [
    { slug: 'rte-meals', name: 'Ready-to-Eat Meals', icon: 'restaurant' },
    { slug: 'cereals-breakfast', name: 'Cereals & Breakfast', icon: 'nutrition' },
    { slug: 'juices-drinks', name: 'Juices & Drinks', icon: 'cafe' },
    { slug: 'snacks-chips', name: 'Snacks & Chips', icon: 'fast-food' },
  ],
  'water-cans': [
    { slug: '20l-can', name: '20L Can', icon: 'water' },
    { slug: 'small-bottles', name: 'Small Bottles', icon: 'water' },
  ],

  // C. BEAUTY & WELLNESS
  'salons': [
    { slug: 'haircuts-styling', name: 'Haircuts & Styling', icon: 'cut' },
    { slug: 'hair-colouring', name: 'Hair Colouring', icon: 'color-palette' },
    { slug: 'keratin-treatments', name: 'Keratin/Smoothening', icon: 'sparkles' },
    { slug: 'facials', name: 'Facials', icon: 'happy' },
  ],
  'spa-massage': [
    { slug: 'swedish-massage', name: 'Swedish Massage', icon: 'body' },
    { slug: 'deep-tissue', name: 'Deep Tissue', icon: 'body' },
    { slug: 'aromatherapy', name: 'Aromatherapy', icon: 'flower' },
    { slug: 'ayurvedic', name: 'Ayurvedic Treatments', icon: 'leaf' },
    { slug: 'reflexology', name: 'Reflexology', icon: 'footsteps' },
  ],
  'beauty-services': [
    { slug: 'waxing-threading', name: 'Waxing & Threading', icon: 'sparkles' },
    { slug: 'manicure-pedicure', name: 'Manicure & Pedicure', icon: 'hand-left' },
    { slug: 'bridal-makeup', name: 'Bridal Makeup', icon: 'heart' },
    { slug: 'eyelash-extensions', name: 'Eyelash Extensions', icon: 'eye' },
  ],
  'skincare-cosmetics': [
    { slug: 'moisturizers', name: 'Moisturizers & Lotions', icon: 'water' },
    { slug: 'sunscreen', name: 'Sunscreen', icon: 'sunny' },
    { slug: 'makeup', name: 'Makeup', icon: 'color-palette' },
    { slug: 'organic-ayurvedic', name: 'Organic/Ayurvedic', icon: 'leaf' },
  ],
  'grooming-men': [
    { slug: 'beard-trimming', name: 'Beard Trimming', icon: 'cut' },
    { slug: 'shaving-services', name: 'Shaving Services', icon: 'cut' },
    { slug: 'mens-facials', name: "Men's Facials", icon: 'happy' },
  ],

  // D. HEALTHCARE
  'pharmacy': [
    { slug: 'prescription', name: 'Prescription Medicine', icon: 'medical' },
    { slug: 'otc-drugs', name: 'OTC Drugs', icon: 'medical' },
    { slug: 'first-aid', name: 'First Aid Supplies', icon: 'medkit' },
    { slug: 'vitamins', name: 'Vitamins & Supplements', icon: 'fitness' },
    { slug: 'baby-care', name: 'Baby Care', icon: 'happy' },
  ],
  'clinics': [
    { slug: 'general-physician', name: 'General Physician', icon: 'medical' },
    { slug: 'pediatrician', name: 'Pediatrician', icon: 'happy' },
    { slug: 'orthopedics', name: 'Orthopedics', icon: 'body' },
    { slug: 'gastroenterology', name: 'Gastroenterology', icon: 'medical' },
  ],
  'diagnostics': [
    { slug: 'blood-tests', name: 'Blood Tests', icon: 'water' },
    { slug: 'mri-ct', name: 'MRI/CT Scans', icon: 'scan' },
    { slug: 'xrays', name: 'X-rays', icon: 'scan' },
    { slug: 'ecg', name: 'ECG', icon: 'pulse' },
    { slug: 'health-checkup', name: 'Health Checkup', icon: 'fitness' },
  ],
  'dental': [
    { slug: 'general-checkups', name: 'General Checkups', icon: 'medical' },
    { slug: 'root-canal', name: 'Root Canal', icon: 'medical' },
    { slug: 'braces-aligners', name: 'Braces/Aligners', icon: 'happy' },
    { slug: 'teeth-whitening', name: 'Teeth Whitening', icon: 'sparkles' },
  ],
  'vision-eyewear': [
    { slug: 'eyeglasses', name: 'Prescription Eyeglasses', icon: 'glasses' },
    { slug: 'sunglasses', name: 'Sunglasses', icon: 'sunny' },
    { slug: 'contact-lenses', name: 'Contact Lenses', icon: 'eye' },
    { slug: 'eye-checkups', name: 'Eye Checkups', icon: 'eye' },
  ],

  // E. SHOPPING / FASHION
  'footwear': [
    { slug: 'sports-shoes', name: 'Sports Shoes', icon: 'footsteps' },
    { slug: 'formal-shoes', name: 'Formal Shoes', icon: 'footsteps' },
    { slug: 'casual-shoes', name: 'Casual Shoes', icon: 'footsteps' },
  ],
  'local-brands': [
    { slug: 'ethnic-wear', name: 'Ethnic Wear', icon: 'shirt' },
    { slug: 'western-wear', name: 'Western Wear', icon: 'shirt' },
  ],
  'jewelry': [
    { slug: 'gold', name: 'Gold', icon: 'diamond' },
    { slug: 'diamond', name: 'Diamond', icon: 'diamond' },
    { slug: 'silver', name: 'Silver', icon: 'diamond' },
    { slug: 'fashion-jewelry', name: 'Fashion Jewelry', icon: 'diamond' },
  ],
  'electronics': [
    { slug: 'smartphones', name: 'Smartphones', icon: 'phone-portrait' },
    { slug: 'laptops-pcs', name: 'Laptops & PCs', icon: 'laptop' },
    { slug: 'home-appliances', name: 'Home Appliances', icon: 'tv' },
    { slug: 'cameras', name: 'Cameras', icon: 'camera' },
    { slug: 'audio', name: 'Audio Equipment', icon: 'headset' },
  ],
  'mobile-accessories': [
    { slug: 'covers-cases', name: 'Covers & Cases', icon: 'phone-portrait' },
    { slug: 'screen-guards', name: 'Screen Guards', icon: 'phone-portrait' },
    { slug: 'power-banks', name: 'Power Banks', icon: 'battery-charging' },
    { slug: 'chargers', name: 'Chargers', icon: 'flash' },
  ],

  // F. FITNESS & SPORTS
  'gyms': [
    { slug: 'weight-training', name: 'Weight Training', icon: 'barbell' },
    { slug: 'cardio', name: 'Cardio', icon: 'bicycle' },
    { slug: 'group-classes', name: 'Group Classes', icon: 'people' },
    { slug: 'personal-training', name: 'Personal Training', icon: 'fitness' },
  ],
  'yoga': [
    { slug: 'hatha-yoga', name: 'Hatha Yoga', icon: 'body' },
    { slug: 'vinyasa-yoga', name: 'Vinyasa Yoga', icon: 'body' },
    { slug: 'power-yoga', name: 'Power Yoga', icon: 'fitness' },
    { slug: 'meditation', name: 'Meditation Classes', icon: 'happy' },
  ],
  'sports-academies': [
    { slug: 'cricket', name: 'Cricket Coaching', icon: 'baseball' },
    { slug: 'football', name: 'Football Training', icon: 'football' },
    { slug: 'swimming', name: 'Swimming Lessons', icon: 'water' },
    { slug: 'badminton', name: 'Badminton Coaching', icon: 'tennisball' },
  ],
  'sportswear': [
    { slug: 'athletic-shoes', name: 'Athletic Shoes', icon: 'footsteps' },
    { slug: 'activewear', name: 'Activewear', icon: 'shirt' },
    { slug: 'fitness-accessories', name: 'Fitness Accessories', icon: 'fitness' },
  ],

  // G. EDUCATION & LEARNING
  'coaching-centers': [
    { slug: 'jee-neet', name: 'JEE/NEET', icon: 'school' },
    { slug: 'cat-gmat-gre', name: 'CAT/GMAT/GRE', icon: 'school' },
    { slug: 'school-tuitions', name: 'School Tuitions', icon: 'book' },
  ],
  'skill-development': [
    { slug: 'leadership', name: 'Leadership Training', icon: 'people' },
    { slug: 'soft-skills', name: 'Soft Skills', icon: 'chatbubbles' },
    { slug: 'public-speaking', name: 'Public Speaking', icon: 'mic' },
    { slug: 'interview-prep', name: 'Interview Preparation', icon: 'briefcase' },
  ],
  'language-training': [
    { slug: 'spoken-english', name: 'Spoken English', icon: 'chatbubbles' },
    { slug: 'foreign-languages', name: 'Foreign Languages', icon: 'globe' },
    { slug: 'vernacular', name: 'Vernacular Languages', icon: 'chatbubbles' },
  ],

  // H. HOME SERVICES
  'ac-repair': [
    { slug: 'split-ac', name: 'Split AC Repair', icon: 'snow' },
    { slug: 'window-ac', name: 'Window AC Repair', icon: 'snow' },
    { slug: 'ac-servicing', name: 'AC Servicing', icon: 'construct' },
  ],
  'plumbing': [
    { slug: 'leak-repair', name: 'Faucet/Leak Repair', icon: 'water' },
    { slug: 'drainage', name: 'Drainage Unclogging', icon: 'water' },
    { slug: 'water-heater', name: 'Water Heater Install', icon: 'flame' },
  ],
  'cleaning': [
    { slug: 'deep-cleaning', name: 'Deep House Cleaning', icon: 'sparkles' },
    { slug: 'sofa-carpet', name: 'Sofa & Carpet Cleaning', icon: 'brush' },
    { slug: 'kitchen-cleaning', name: 'Kitchen Cleaning', icon: 'restaurant' },
    { slug: 'pest-control', name: 'Pest Control', icon: 'bug' },
  ],
  'pest-control': [
    { slug: 'pest-control', name: 'Pest Control', icon: 'bug' },
  ],
  'laundry-dry-cleaning': [
    { slug: 'laundry', name: 'Laundry', icon: 'shirt' },
    { slug: 'dry-cleaning', name: 'Dry Cleaning', icon: 'sparkles' },
  ],
  'home-tutors': [
    { slug: 'math', name: 'Math', icon: 'calculator' },
    { slug: 'science', name: 'Science', icon: 'flask' },
    { slug: 'language', name: 'Language', icon: 'chatbubbles' },
    { slug: 'exam-prep', name: 'Exam Preparation', icon: 'school' },
  ],

  // I. TRAVEL & EXPERIENCES
  'hotels': [
    { slug: 'budget-stays', name: 'Budget/Boutique Stays', icon: 'bed' },
    { slug: '5-star-luxury', name: '5-Star Luxury', icon: 'star' },
    { slug: 'serviced-apartments', name: 'Serviced Apartments', icon: 'home' },
  ],
  'taxis': [
    { slug: 'local-trips', name: 'Local City Trips', icon: 'car' },
    { slug: 'airport-transfers', name: 'Airport Transfers', icon: 'airplane' },
    { slug: 'outstation', name: 'Outstation Cabs', icon: 'car' },
  ],
  'bike-rentals': [
    { slug: 'scooters', name: 'Scooters', icon: 'bicycle' },
    { slug: 'motorbikes', name: 'Motorbikes', icon: 'bicycle' },
    { slug: 'gear-rental', name: 'Gear Rental', icon: 'shield' },
  ],
  'activities': [
    { slug: 'cooking-classes', name: 'Cooking Classes', icon: 'restaurant' },
    { slug: 'pottery', name: 'Pottery Workshops', icon: 'color-palette' },
    { slug: 'city-tours', name: 'City Walking Tours', icon: 'walk' },
  ],

  // J. ENTERTAINMENT
  'amusement-parks': [
    { slug: 'entry', name: 'Entry', icon: 'ticket' },
    { slug: 'water-park', name: 'Water Park', icon: 'water' },
  ],
  'movies': [
    { slug: 'hollywood', name: 'Hollywood', icon: 'film' },
    { slug: 'bollywood', name: 'Bollywood', icon: 'film' },
    { slug: 'regional', name: 'Regional Cinema', icon: 'film' },
    { slug: 'imax-4dx', name: 'IMAX/4DX', icon: 'film' },
  ],
  'gaming-cafes': [
    { slug: 'pc-gaming', name: 'PC Gaming', icon: 'game-controller' },
    { slug: 'console-gaming', name: 'Console Gaming', icon: 'game-controller' },
    { slug: 'esports', name: 'E-Sports', icon: 'trophy' },
  ],
  'vr-ar-experiences': [
    { slug: 'vr-experience', name: 'VR Experience', icon: 'game-controller' },
    { slug: 'escape-rooms', name: 'Escape Rooms', icon: 'lock-closed' },
    { slug: 'ar-gaming', name: 'AR Gaming', icon: 'glasses' },
  ],

  // K. FINANCIAL LIFESTYLE
  'bill-payments': [
    { slug: 'electricity', name: 'Electricity Bills', icon: 'flash' },
    { slug: 'water-bill', name: 'Water Bills', icon: 'water' },
    { slug: 'gas-bill', name: 'Gas Bills', icon: 'flame' },
  ],
  'mobile-recharge': [
    { slug: 'prepaid', name: 'Prepaid Recharge', icon: 'phone-portrait' },
    { slug: 'postpaid', name: 'Postpaid Bill', icon: 'phone-portrait' },
    { slug: 'dth', name: 'DTH Recharge', icon: 'tv' },
  ],
  'broadband': [
    { slug: 'isp-plans', name: 'Internet Plans', icon: 'wifi' },
    { slug: 'streaming', name: 'OTT Bundles', icon: 'play' },
  ],
  'gold-savings': [
    { slug: 'physical-gold', name: 'Physical Gold', icon: 'cube' },
    { slug: 'digital-gold', name: 'Digital Gold', icon: 'phone-portrait' },
    { slug: 'gold-loan', name: 'Gold Loan', icon: 'cash' },
  ],
};

/**
 * Get sub-sub-categories for a given subcategory slug
 */
export function getSubSubCategories(subcategorySlug: string): SubSubCategory[] {
  return SUB_SUB_CATEGORY_CONFIG[subcategorySlug] || [];
}

/**
 * Check if a subcategory has sub-sub-categories
 */
export function hasSubSubCategories(subcategorySlug: string): boolean {
  return (SUB_SUB_CATEGORY_CONFIG[subcategorySlug]?.length || 0) > 0;
}
