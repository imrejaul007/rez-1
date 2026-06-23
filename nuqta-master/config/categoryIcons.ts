/**
 * Category Icons Mapping
 * Maps subcategory slugs to local icon images
 */

// Import all category icons
export const SUBCATEGORY_ICONS: Record<string, any> = {
  // Food & Dining
  'cafes': require('@/assets/category-icons/FOOD-DINING/Cafes.png'),
  'qsr-fast-food': require('@/assets/category-icons/FOOD-DINING/QSR-Fast-food.png'),
  'family-restaurants': require('@/assets/category-icons/FOOD-DINING/Family-restaurants.png'),
  'fine-dining': require('@/assets/category-icons/FOOD-DINING/Fine-dining.png'),
  'ice-cream-dessert': require('@/assets/category-icons/FOOD-DINING/Ice-cream-dessert.png'),
  'bakery-confectionery': require('@/assets/category-icons/FOOD-DINING/Bakery-confectionery.png'),
  'cloud-kitchens': require('@/assets/category-icons/FOOD-DINING/Cloud-kitchens.png'),
  'street-food': require('@/assets/category-icons/FOOD-DINING/Street-food.png'),

  // Grocery & Essentials
  'supermarkets': require('@/assets/category-icons/GROCERY-ESSENTIALS/Supermarkets.png'),
  'kirana-stores': require('@/assets/category-icons/GROCERY-ESSENTIALS/Kirana-Stores.png'),
  'fresh-vegetables': require('@/assets/category-icons/GROCERY-ESSENTIALS/Fresh-vegetables.png'),
  'meat-fish': require('@/assets/category-icons/GROCERY-ESSENTIALS/Meat-fish.png'),
  'dairy': require('@/assets/category-icons/GROCERY-ESSENTIALS/Dairy.png'),
  'packaged-goods': require('@/assets/category-icons/GROCERY-ESSENTIALS/Packaged-goods.png'),
  'water-cans': require('@/assets/category-icons/GROCERY-ESSENTIALS/water-cans.png'),

  // Beauty, Wellness & Personal Care
  'salons': require('@/assets/category-icons/BEAUTY-WELLNESS/Salons.png'),
  'spa-massage': require('@/assets/category-icons/BEAUTY-WELLNESS/Spa-massage.png'),
  'beauty-services': require('@/assets/category-icons/BEAUTY-WELLNESS/Beauty-services.png'),
  'cosmetology': require('@/assets/category-icons/BEAUTY-WELLNESS/Cosmetics.png'),
  'dermatology': require('@/assets/category-icons/BEAUTY-WELLNESS/Dermatology.png'),
  'skincare-cosmetics': require('@/assets/category-icons/BEAUTY-WELLNESS/Skincare-cosmetics.png'),
  'nail-studios': require('@/assets/category-icons/BEAUTY-WELLNESS/nail.png'),
  'grooming-men': require('@/assets/category-icons/BEAUTY-WELLNESS/Men-grooming.png'),

  // Healthcare
  'pharmacy': require('@/assets/category-icons/HEALTHCARE/Pharmacy.png'),
  'clinics': require('@/assets/category-icons/HEALTHCARE/Clinics.png'),
  'diagnostics': require('@/assets/category-icons/HEALTHCARE/Diagnostics.png'),
  'dental': require('@/assets/category-icons/HEALTHCARE/Dental.png'),
  'physiotherapy': require('@/assets/category-icons/HEALTHCARE/Physiotherapy.png'),
  'home-nursing': require('@/assets/category-icons/HEALTHCARE/Home-nursing.png'),
  'vision-eyewear': require('@/assets/category-icons/HEALTHCARE/Vision-eyewear.png'),

  // Shopping/Fashion
  'footwear': require('@/assets/category-icons/Shopping/footwear.png'),
  'bags-accessories': require('@/assets/category-icons/Shopping/Bags.png'),
  'mobile-accessories': require('@/assets/category-icons/Shopping/Mobile-accessories.png'),
  'watches': require('@/assets/category-icons/Shopping/Watches.png'),
  'jewelry': require('@/assets/category-icons/Shopping/Jewelry.png'),
  'local-brands': require('@/assets/category-icons/Shopping/Local-brands.png'),

  // Fitness & Sports
  'gyms': require('@/assets/category-icons/FITNESS-SPORTS/Gyms.png'),
  'crossfit': require('@/assets/category-icons/FITNESS-SPORTS/CrossFit.png'),
  'yoga': require('@/assets/category-icons/FITNESS-SPORTS/Yoga.png'),
  'zumba': require('@/assets/category-icons/FITNESS-SPORTS/Zumba.png'),
  'martial-arts': require('@/assets/category-icons/FITNESS-SPORTS/Martial-arts.png'),
  'sports-academies': require('@/assets/category-icons/FITNESS-SPORTS/Sports-academies.png'),
  'sportswear': require('@/assets/category-icons/FITNESS-SPORTS/Sportswear.png'),

  // Education & Learning
  'coaching-centers': require('@/assets/category-icons/EDUCATION-LEARNING/Coaching-center.png'),
  'skill-development': require('@/assets/category-icons/EDUCATION-LEARNING/Skill-development.png'),
  'music-dance-classes': require('@/assets/category-icons/EDUCATION-LEARNING/Music-dance-classes.png'),
  'art-craft': require('@/assets/category-icons/EDUCATION-LEARNING/Skill-development.png'),
  'vocational': require('@/assets/category-icons/EDUCATION-LEARNING/Vocational.png'),
  'language-training': require('@/assets/category-icons/EDUCATION-LEARNING/Language-training.png'),

  // Home Services
  'ac-repair': require('@/assets/category-icons/HOME-SERVICES/AC-repair.png'),
  'plumbing': require('@/assets/category-icons/HOME-SERVICES/Plumbing.png'),
  'electrical': require('@/assets/category-icons/HOME-SERVICES/Electrical.png'),
  'cleaning': require('@/assets/category-icons/HOME-SERVICES/Cleaning.png'),
  'pest-control': require('@/assets/category-icons/HOME-SERVICES/Pest-control.png'),
  'house-shifting': require('@/assets/category-icons/HOME-SERVICES/House-shifting.png'),
  'laundry-dry-cleaning': require('@/assets/category-icons/HOME-SERVICES/Laundry-dry-cleaning.png'),
  'home-tutors': require('@/assets/category-icons/HOME-SERVICES/Home-tutors.png'),

  // Travel & Experiences
  'hotels': require('@/assets/category-icons/TRAVEL-EXPERIENCES/Hotels.png'),
  'intercity-travel': require('@/assets/category-icons/TRAVEL-EXPERIENCES/Intercity-travel.png'),
  'taxis': require('@/assets/category-icons/TRAVEL-EXPERIENCES/taxis.png'),
  'bike-rentals': require('@/assets/category-icons/TRAVEL-EXPERIENCES/Bike-rentals.png'),
  'weekend-getaways': require('@/assets/category-icons/TRAVEL-EXPERIENCES/Weekend-getaways.png'),
  'tours': require('@/assets/category-icons/TRAVEL-EXPERIENCES/Tours.png'),
  'activities': require('@/assets/category-icons/TRAVEL-EXPERIENCES/Activities.png'),
  'airport-services': require('@/assets/category-icons/TRAVEL-EXPERIENCES/Airport-services.png'),

  // Entertainment
  'movies': require('@/assets/category-icons/ENTERTAINMENT/Movies.png'),
  'live-events': require('@/assets/category-icons/ENTERTAINMENT/Live-events.png'),
  'festivals': require('@/assets/category-icons/ENTERTAINMENT/Festivals.png'),
  'workshops': require('@/assets/category-icons/ENTERTAINMENT/Workshops.png'),
  'amusement-parks': require('@/assets/category-icons/ENTERTAINMENT/Amusement-parks.png'),
  'gaming-cafes': require('@/assets/category-icons/ENTERTAINMENT/Gaming-cafes.png'),
  'vr-ar-experiences': require('@/assets/category-icons/ENTERTAINMENT/Virtual-reality.png'),

  // Financial & Lifestyle
  'bill-payments': require('@/assets/category-icons/FINANCIAL-LIFESTYLE/Bill-payments.png'),
  'mobile-recharge': require('@/assets/category-icons/FINANCIAL-LIFESTYLE/Mobile-recharge.png'),
  'broadband': require('@/assets/category-icons/FINANCIAL-LIFESTYLE/Broadband.png'),
  'cable-ott': require('@/assets/category-icons/FINANCIAL-LIFESTYLE/OTT.png'),
  'insurance': require('@/assets/category-icons/FINANCIAL-LIFESTYLE/Insurance.png'),
  'gold-savings': require('@/assets/category-icons/FINANCIAL-LIFESTYLE/Gold-savings.png'),
  'donations': require('@/assets/category-icons/FINANCIAL-LIFESTYLE/Donations.png'),

  // Electronics
  'mobile-phones': require('@/assets/category-icons/ELECTRONICS/Mobile-phones.png'),
  'laptops': require('@/assets/category-icons/ELECTRONICS/Laptops.png'),
  'televisions': require('@/assets/category-icons/ELECTRONICS/Televisions.png'),
  'cameras': require('@/assets/category-icons/ELECTRONICS/Cameras.png'),
  'audio-headphones': require('@/assets/category-icons/ELECTRONICS/Audio-headphones.png'),
  'gaming': require('@/assets/category-icons/ELECTRONICS/Gaming.png'),
  'accessories': require('@/assets/category-icons/ELECTRONICS/Accessories.png'),
  'smartwatches': require('@/assets/category-icons/ELECTRONICS/Smartwatches.png'),
};

// Get icon for a subcategory slug
export const getSubcategoryIcon = (slug: string): any | null => {
  return SUBCATEGORY_ICONS[slug] || null;
};
