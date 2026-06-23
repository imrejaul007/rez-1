/**
 * Script to update all products with details matching 11 categories and 79 subcategories
 *
 * This script:
 * 1. Gets all stores grouped by category
 * 2. Assigns relevant subcategories to each store
 * 3. Updates products with names, descriptions, prices matching the subcategory
 *
 * Run: npx ts-node src/scripts/updateProductDetails.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Product templates for each subcategory
interface ProductTemplate {
  names: string[];
  priceRange: [number, number];
  image: string;
}

// All 79 subcategories with product templates
const SUBCATEGORY_PRODUCTS: Record<string, ProductTemplate> = {
  // FOOD & DINING (8 subcategories)
  'cafes': {
    names: ['Cappuccino', 'Latte', 'Espresso', 'Cold Brew', 'Mocha', 'Americano', 'Croissant', 'Muffin', 'Bagel', 'Cheesecake', 'Tiramisu', 'Brownie', 'Cookie', 'Sandwich', 'Salad'],
    priceRange: [80, 350],
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400'
  },
  'qsr-fast-food': {
    names: ['Burger', 'French Fries', 'Chicken Wings', 'Pizza Slice', 'Hot Dog', 'Nuggets', 'Onion Rings', 'Wrap', 'Taco', 'Nachos', 'Milkshake', 'Combo Meal', 'Loaded Fries', 'Chicken Burger'],
    priceRange: [99, 399],
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'
  },
  'family-restaurants': {
    names: ['Butter Chicken', 'Dal Makhani', 'Paneer Tikka', 'Naan', 'Biryani', 'Tandoori Chicken', 'Raita', 'Pulao', 'Curry', 'Roti', 'Paratha', 'Thali', 'Kebab Platter', 'Mixed Grill'],
    priceRange: [150, 600],
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400'
  },
  'fine-dining': {
    names: ['Lobster Thermidor', 'Filet Mignon', 'Truffle Risotto', 'Foie Gras', 'Wagyu Steak', 'Caviar', 'Tasting Menu', 'Wine Pairing', 'Salmon Fillet', 'Duck Confit', 'Lamb Rack', 'Seafood Platter'],
    priceRange: [800, 3500],
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400'
  },
  'ice-cream-dessert': {
    names: ['Vanilla Scoop', 'Chocolate Sundae', 'Mango Kulfi', 'Brownie with Ice Cream', 'Banana Split', 'Waffle', 'Gulab Jamun', 'Rasmalai', 'Falooda', 'Milkshake', 'Smoothie Bowl', 'Fruit Salad'],
    priceRange: [50, 250],
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400'
  },
  'bakery-confectionery': {
    names: ['Chocolate Cake', 'Red Velvet Cake', 'Cupcakes', 'Donuts', 'Pastry', 'Cookies', 'Bread Loaf', 'Bun', 'Puff', 'Samosa', 'Khari', 'Biscuits', 'Rusk', 'Fruit Cake'],
    priceRange: [30, 500],
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'
  },
  'cloud-kitchens': {
    names: ['Meal Box', 'Combo Pack', 'Party Pack', 'Family Meal', 'Diet Meal', 'Protein Bowl', 'Salad Bowl', 'Soup & Sandwich', 'Snack Box', 'Breakfast Box', 'Lunch Special', 'Dinner Combo'],
    priceRange: [149, 499],
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
  },
  'street-food': {
    names: ['Pani Puri', 'Bhel Puri', 'Vada Pav', 'Pav Bhaji', 'Samosa', 'Kachori', 'Chaat', 'Dosa', 'Idli', 'Momos', 'Rolls', 'Tikki', 'Chole Bhature', 'Jalebi'],
    priceRange: [20, 150],
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400'
  },

  // GROCERY & ESSENTIALS (7 subcategories)
  'supermarkets': {
    names: ['Rice 5kg', 'Wheat Flour 5kg', 'Sugar 1kg', 'Cooking Oil 1L', 'Salt 1kg', 'Pulses Pack', 'Spices Combo', 'Tea 500g', 'Coffee 200g', 'Milk 1L', 'Bread', 'Eggs 12pc', 'Butter 500g', 'Cheese 200g'],
    priceRange: [50, 800],
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'
  },
  'kirana-stores': {
    names: ['Atta 1kg', 'Dal 1kg', 'Rice 1kg', 'Oil 500ml', 'Biscuits', 'Namkeen', 'Soap', 'Shampoo', 'Toothpaste', 'Detergent', 'Matchbox', 'Candles', 'Batteries', 'Notebooks'],
    priceRange: [10, 300],
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400'
  },
  'fresh-vegetables': {
    names: ['Tomatoes 1kg', 'Onions 1kg', 'Potatoes 1kg', 'Carrots 500g', 'Spinach', 'Cauliflower', 'Cabbage', 'Beans 250g', 'Capsicum', 'Cucumber', 'Brinjal', 'Lady Finger', 'Green Peas', 'Coriander'],
    priceRange: [20, 120],
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400'
  },
  'meat-fish': {
    names: ['Chicken 1kg', 'Mutton 500g', 'Fish Curry Cut', 'Prawns 500g', 'Eggs 30pc', 'Chicken Breast', 'Chicken Drumstick', 'Keema 500g', 'Fish Fillet', 'Crab', 'Surmai', 'Pomfret', 'Rohu'],
    priceRange: [100, 800],
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400'
  },
  'dairy': {
    names: ['Milk 1L', 'Curd 500g', 'Paneer 200g', 'Butter 100g', 'Cheese Slice', 'Ghee 500ml', 'Cream 200ml', 'Buttermilk 500ml', 'Lassi', 'Khoya 250g', 'Milk Powder', 'Flavored Milk'],
    priceRange: [25, 400],
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400'
  },
  'packaged-goods': {
    names: ['Instant Noodles', 'Pasta', 'Sauce', 'Jam', 'Ketchup', 'Mayonnaise', 'Pickle', 'Papad', 'Ready to Eat', 'Soup Mix', 'Oats', 'Cornflakes', 'Muesli', 'Energy Bar'],
    priceRange: [30, 350],
    image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400'
  },
  'water-cans': {
    names: ['Water Can 20L', 'Water Bottle 1L', 'Mineral Water 500ml', 'Water Jar 5L', 'Dispenser', 'Water Filter', 'RO Water Can', 'Spring Water', 'Alkaline Water', 'Copper Bottle'],
    priceRange: [20, 500],
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400'
  },

  // BEAUTY & WELLNESS (8 subcategories)
  'salons': {
    names: ['Haircut', 'Hair Spa', 'Hair Color', 'Straightening', 'Keratin Treatment', 'Head Massage', 'Blow Dry', 'Hair Styling', 'Beard Trim', 'Shave', 'Kids Haircut', 'Bridal Hair'],
    priceRange: [100, 5000],
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400'
  },
  'spa-massage': {
    names: ['Swedish Massage', 'Thai Massage', 'Deep Tissue', 'Aromatherapy', 'Hot Stone', 'Body Scrub', 'Body Wrap', 'Foot Reflexology', 'Couple Spa', 'Ayurvedic Massage', 'Head Massage', 'Back Massage'],
    priceRange: [500, 5000],
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400'
  },
  'beauty-services': {
    names: ['Facial', 'Cleanup', 'Bleach', 'Waxing Full Body', 'Threading', 'Makeup', 'Bridal Makeup', 'Manicure', 'Pedicure', 'Mehendi', 'Eyebrow Shaping', 'Lash Extensions'],
    priceRange: [200, 15000],
    image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400'
  },
  'cosmetology': {
    names: ['Botox', 'Filler', 'Laser Treatment', 'Chemical Peel', 'Microdermabrasion', 'PRP Therapy', 'Skin Tightening', 'Anti-Aging Treatment', 'Acne Treatment', 'Pigmentation Removal'],
    priceRange: [2000, 50000],
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400'
  },
  'dermatology': {
    names: ['Skin Consultation', 'Acne Treatment', 'Eczema Treatment', 'Psoriasis Care', 'Mole Removal', 'Scar Treatment', 'Hair Fall Treatment', 'Dandruff Treatment', 'Skin Biopsy', 'Allergy Test'],
    priceRange: [500, 10000],
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'
  },
  'skincare-cosmetics': {
    names: ['Face Wash', 'Moisturizer', 'Sunscreen', 'Serum', 'Face Mask', 'Lipstick', 'Foundation', 'Mascara', 'Eye Liner', 'Nail Polish', 'Perfume', 'Body Lotion', 'Face Cream', 'Toner'],
    priceRange: [100, 3000],
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400'
  },
  'nail-studios': {
    names: ['Manicure', 'Pedicure', 'Gel Nails', 'Acrylic Nails', 'Nail Art', 'French Tips', 'Nail Extensions', 'Nail Repair', 'Paraffin Treatment', 'Cuticle Care', 'Nail Polish Change'],
    priceRange: [200, 3000],
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400'
  },
  'grooming-men': {
    names: ['Haircut', 'Beard Styling', 'Clean Shave', 'Hair Color', 'Face Scrub', 'De-Tan', 'Hair Spa', 'Head Massage', 'Facial', 'Eyebrow Threading', 'Ear & Nose Wax', 'Groom Package'],
    priceRange: [150, 2000],
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400'
  },

  // HEALTHCARE (7 subcategories)
  'pharmacy': {
    names: ['Paracetamol', 'Cough Syrup', 'Vitamin C', 'Multivitamin', 'Pain Relief Gel', 'Band Aid', 'Cotton', 'Sanitizer', 'Face Mask', 'Thermometer', 'BP Monitor', 'Glucometer', 'First Aid Kit'],
    priceRange: [20, 2000],
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
  },
  'clinics': {
    names: ['General Consultation', 'Follow-up Visit', 'Health Checkup', 'Blood Test', 'ECG', 'X-Ray', 'Vaccination', 'Dressing', 'Injection', 'Minor Surgery', 'Health Certificate'],
    priceRange: [200, 5000],
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400'
  },
  'diagnostics': {
    names: ['Complete Blood Count', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test', 'Thyroid Profile', 'Diabetes Panel', 'Full Body Checkup', 'CT Scan', 'MRI Scan', 'Ultrasound', 'ECG', 'X-Ray'],
    priceRange: [200, 15000],
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400'
  },
  'dental': {
    names: ['Dental Checkup', 'Cleaning', 'Filling', 'Root Canal', 'Extraction', 'Braces', 'Teeth Whitening', 'Crown', 'Bridge', 'Implant', 'Dentures', 'Gum Treatment', 'Wisdom Tooth'],
    priceRange: [300, 50000],
    image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400'
  },
  'physiotherapy': {
    names: ['Assessment', 'Back Pain Treatment', 'Neck Pain', 'Knee Rehabilitation', 'Post Surgery Rehab', 'Sports Injury', 'Stroke Rehab', 'Electrotherapy', 'Manual Therapy', 'Exercise Therapy', 'Home Visit'],
    priceRange: [500, 2000],
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400'
  },
  'home-nursing': {
    names: ['Nurse Visit', 'IV Administration', 'Wound Dressing', 'Injection Service', 'Catheter Care', 'Elder Care', 'Post Surgery Care', 'Baby Care', 'Patient Attendant', '24hr Nursing', 'Physiotherapy Home'],
    priceRange: [500, 5000],
    image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400'
  },
  'vision-eyewear': {
    names: ['Eye Checkup', 'Spectacles', 'Sunglasses', 'Contact Lenses', 'Reading Glasses', 'Progressive Lenses', 'Blue Light Glasses', 'Sports Eyewear', 'Kids Glasses', 'Lens Solution', 'Eye Drops'],
    priceRange: [100, 10000],
    image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400'
  },

  // FASHION (7 subcategories)
  'footwear': {
    names: ['Sneakers', 'Formal Shoes', 'Sandals', 'Heels', 'Boots', 'Loafers', 'Sports Shoes', 'Flip Flops', 'Slippers', 'Ethnic Footwear', 'Kids Shoes', 'Casual Shoes'],
    priceRange: [299, 5000],
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'
  },
  'bags-accessories': {
    names: ['Handbag', 'Backpack', 'Laptop Bag', 'Wallet', 'Belt', 'Sunglasses', 'Watch', 'Scarf', 'Hat', 'Tie', 'Cufflinks', 'Hair Accessories', 'Travel Bag', 'Clutch'],
    priceRange: [199, 5000],
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400'
  },
  'electronics': {
    names: ['Smartphone', 'Laptop', 'Tablet', 'Smartwatch', 'Earbuds', 'Headphones', 'Power Bank', 'Charger', 'Cable', 'Screen Guard', 'Phone Case', 'Speaker', 'Camera'],
    priceRange: [199, 100000],
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400'
  },
  'mobile-accessories': {
    names: ['Phone Case', 'Screen Protector', 'Charger', 'Cable', 'Earphones', 'Power Bank', 'Car Mount', 'Pop Socket', 'Ring Holder', 'Wireless Charger', 'Selfie Stick', 'Gimbal'],
    priceRange: [99, 3000],
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400'
  },
  'watches': {
    names: ['Analog Watch', 'Digital Watch', 'Smartwatch', 'Sports Watch', 'Luxury Watch', 'Casual Watch', 'Fitness Band', 'Kids Watch', 'Couple Watch Set', 'Vintage Watch', 'Chronograph'],
    priceRange: [499, 50000],
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400'
  },
  'jewelry': {
    names: ['Gold Necklace', 'Diamond Ring', 'Silver Bracelet', 'Pearl Earrings', 'Pendant', 'Anklet', 'Bangles', 'Mangalsutra', 'Nose Ring', 'Toe Ring', 'Brooch', 'Hair Pin', 'Artificial Jewelry'],
    priceRange: [199, 100000],
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400'
  },
  'local-brands': {
    names: ['Designer Kurti', 'Handloom Saree', 'Block Print Shirt', 'Ethnic Wear', 'Handmade Jewelry', 'Artisan Bag', 'Local Craft', 'Traditional Dress', 'Khadi Kurta', 'Embroidered Top', 'Batik Print'],
    priceRange: [299, 5000],
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400'
  },

  // FITNESS & SPORTS (7 subcategories)
  'gyms': {
    names: ['Monthly Membership', 'Quarterly Plan', 'Annual Membership', 'Personal Training', 'Group Classes', 'Day Pass', 'Couple Membership', 'Student Plan', 'Corporate Plan', 'Trial Session'],
    priceRange: [500, 50000],
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'
  },
  'crossfit': {
    names: ['CrossFit Membership', 'WOD Class', 'Olympic Lifting', 'Endurance Training', 'Strength Program', 'Competition Prep', 'Beginner Course', 'Drop-in Session', 'Private Coaching'],
    priceRange: [1000, 15000],
    image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400'
  },
  'yoga': {
    names: ['Yoga Class', 'Meditation Session', 'Pranayama', 'Power Yoga', 'Hot Yoga', 'Prenatal Yoga', 'Kids Yoga', 'Corporate Yoga', 'Private Session', 'Yoga Retreat', 'Teacher Training'],
    priceRange: [300, 20000],
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400'
  },
  'zumba': {
    names: ['Zumba Class', 'Aqua Zumba', 'Zumba Kids', 'Zumba Gold', 'Zumba Toning', 'Monthly Pass', 'Drop-in Class', 'Private Session', 'Corporate Class', 'Party Package'],
    priceRange: [200, 5000],
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400'
  },
  'martial-arts': {
    names: ['Karate Class', 'Taekwondo', 'Judo', 'Boxing', 'Kickboxing', 'MMA Training', 'Self Defense', 'Kids Martial Arts', 'Belt Grading', 'Private Coaching', 'Competition Training'],
    priceRange: [500, 10000],
    image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400'
  },
  'sports-academies': {
    names: ['Cricket Coaching', 'Football Training', 'Badminton Classes', 'Tennis Lessons', 'Swimming Course', 'Basketball Camp', 'Table Tennis', 'Skating Classes', 'Golf Lessons', 'Athletics Training'],
    priceRange: [1000, 25000],
    image: 'https://images.unsplash.com/photo-1461896836934- voices-of-the-game?w=400'
  },
  'sportswear': {
    names: ['Sports Shoes', 'Track Pants', 'Sports T-Shirt', 'Gym Wear', 'Yoga Pants', 'Sports Bra', 'Swimming Costume', 'Cricket Kit', 'Football Jersey', 'Fitness Accessories', 'Sports Bag'],
    priceRange: [299, 5000],
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400'
  },

  // EDUCATION & LEARNING (6 subcategories)
  'coaching-centers': {
    names: ['IIT-JEE Prep', 'NEET Coaching', 'Board Exam Prep', 'Foundation Course', 'Crash Course', 'Test Series', 'Study Material', 'Doubt Sessions', 'Online Classes', 'Offline Batch'],
    priceRange: [5000, 200000],
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400'
  },
  'skill-development': {
    names: ['Digital Marketing', 'Web Development', 'Data Science', 'Graphic Design', 'Video Editing', 'Content Writing', 'Public Speaking', 'Leadership Training', 'Excel Course', 'Python Programming'],
    priceRange: [2000, 50000],
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'
  },
  'music-dance-classes': {
    names: ['Guitar Lessons', 'Piano Classes', 'Vocal Training', 'Drums Course', 'Classical Dance', 'Western Dance', 'Bollywood Dance', 'Hip Hop', 'Salsa Classes', 'Bharatanatyam', 'Kathak'],
    priceRange: [1000, 15000],
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400'
  },
  'art-craft': {
    names: ['Drawing Classes', 'Painting Course', 'Pottery Workshop', 'Craft Classes', 'Sketching', 'Calligraphy', 'Photography', 'Sculpture', 'Canvas Painting', 'Art Supplies', 'Kids Art Camp'],
    priceRange: [500, 10000],
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400'
  },
  'vocational': {
    names: ['Beautician Course', 'Fashion Designing', 'Interior Design', 'Hotel Management', 'Cooking Classes', 'Tailoring Course', 'AC Repair Training', 'Mobile Repair', 'Electrical Course', 'Plumbing Training'],
    priceRange: [5000, 100000],
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400'
  },
  'language-training': {
    names: ['Spoken English', 'IELTS Prep', 'French Classes', 'German Course', 'Spanish Lessons', 'Japanese', 'Mandarin', 'Hindi Classes', 'Communication Skills', 'Accent Training'],
    priceRange: [2000, 30000],
    image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400'
  },

  // HOME SERVICES (8 subcategories)
  'ac-repair': {
    names: ['AC Service', 'AC Gas Refill', 'AC Installation', 'AC Repair', 'AC Deep Cleaning', 'AC Uninstallation', 'Compressor Repair', 'PCB Repair', 'AMC Package', 'Emergency Service'],
    priceRange: [299, 5000],
    image: 'https://images.unsplash.com/photo-1631545806609-c0e2057e4cdc?w=400'
  },
  'plumbing': {
    names: ['Tap Repair', 'Pipe Fitting', 'Leak Fix', 'Toilet Repair', 'Drain Cleaning', 'Water Tank Cleaning', 'Geyser Installation', 'Bathroom Fitting', 'Kitchen Plumbing', 'Emergency Plumber'],
    priceRange: [199, 3000],
    image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400'
  },
  'electrical': {
    names: ['Wiring Work', 'Switch Repair', 'Fan Installation', 'Light Fitting', 'MCB Repair', 'Inverter Service', 'Generator Repair', 'Earthing', 'Electrical Safety Check', 'Emergency Electrician'],
    priceRange: [199, 5000],
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400'
  },
  'cleaning': {
    names: ['Home Deep Cleaning', 'Bathroom Cleaning', 'Kitchen Cleaning', 'Sofa Cleaning', 'Carpet Cleaning', 'Mattress Cleaning', 'Office Cleaning', 'Post Construction', 'Move-in Cleaning', 'Regular Cleaning'],
    priceRange: [499, 5000],
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400'
  },
  'pest-control': {
    names: ['Cockroach Control', 'Ant Treatment', 'Termite Control', 'Bed Bug Treatment', 'Mosquito Control', 'Rat Control', 'Lizard Control', 'General Pest Control', 'Herbal Treatment', 'AMC Package'],
    priceRange: [499, 10000],
    image: 'https://images.unsplash.com/photo-1632935190508-30a2fdc3fdb2?w=400'
  },
  'house-shifting': {
    names: ['Local Shifting', 'Intercity Moving', 'Packing Service', 'Loading/Unloading', 'Vehicle Transport', 'Office Relocation', 'Storage Service', 'Insurance', 'Unpacking', 'Full Service Move'],
    priceRange: [2000, 50000],
    image: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400'
  },
  'laundry-dry-cleaning': {
    names: ['Wash & Fold', 'Dry Cleaning', 'Steam Ironing', 'Premium Wash', 'Express Service', 'Blanket Cleaning', 'Curtain Cleaning', 'Shoe Cleaning', 'Bag Cleaning', 'Pickup & Delivery'],
    priceRange: [49, 500],
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=400'
  },
  'home-tutors': {
    names: ['Math Tutor', 'Science Tutor', 'English Tutor', 'Hindi Tutor', 'Physics Tutor', 'Chemistry Tutor', 'Computer Tutor', 'Music Teacher', 'Art Teacher', 'Exam Preparation'],
    priceRange: [300, 2000],
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400'
  },

  // TRAVEL & EXPERIENCES (7 subcategories)
  'hotels': {
    names: ['Standard Room', 'Deluxe Room', 'Suite', 'Family Room', 'Executive Room', 'Honeymoon Package', 'Weekend Stay', 'Business Package', 'Long Stay Deal', 'Day Use Room'],
    priceRange: [1000, 20000],
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'
  },
  'intercity-travel': {
    names: ['Bus Ticket', 'Train Ticket', 'Flight Booking', 'Volvo Bus', 'Sleeper Bus', 'AC Bus', 'Tempo Traveller', 'Mini Bus', 'Luxury Coach', 'Group Booking'],
    priceRange: [200, 15000],
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'
  },
  'taxis': {
    names: ['Local Trip', 'Airport Transfer', 'Outstation Cab', 'Hourly Rental', 'Full Day Cab', 'One Way Drop', 'Round Trip', 'Night Booking', 'Sedan', 'SUV', 'Luxury Car'],
    priceRange: [200, 10000],
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400'
  },
  'bike-rentals': {
    names: ['Scooter Rental', 'Bike Rental', 'Hourly Rental', 'Daily Rental', 'Weekly Rental', 'Delivery Service', 'Helmet Included', 'Fuel Included', 'Insurance', 'Premium Bikes'],
    priceRange: [99, 2000],
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400'
  },
  'weekend-getaways': {
    names: ['Hill Station Trip', 'Beach Getaway', 'Resort Stay', 'Camping Trip', 'Adventure Package', 'Couple Package', 'Family Package', 'Group Tour', 'Luxury Retreat', 'Budget Trip'],
    priceRange: [2000, 30000],
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400'
  },
  'tours': {
    names: ['City Tour', 'Heritage Walk', 'Food Tour', 'Shopping Tour', 'Pilgrimage Tour', 'Wildlife Safari', 'Trekking Trip', 'Cruise Package', 'International Tour', 'Honeymoon Package'],
    priceRange: [500, 100000],
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400'
  },
  'activities': {
    names: ['Paragliding', 'Bungee Jumping', 'Scuba Diving', 'River Rafting', 'Trekking', 'Camping', 'Rock Climbing', 'Zip Lining', 'Hot Air Balloon', 'Kayaking', 'Snorkeling'],
    priceRange: [500, 15000],
    image: 'https://images.unsplash.com/photo-1533692328991-08159ff19fca?w=400'
  },

  // ENTERTAINMENT (7 subcategories)
  'movies': {
    names: ['Regular Ticket', 'Premium Seat', 'Recliner', 'IMAX Ticket', '3D Movie', '4DX Experience', 'Couple Seat', 'Private Screening', 'Popcorn Combo', 'Movie + Meal'],
    priceRange: [150, 2000],
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400'
  },
  'live-events': {
    names: ['Concert Ticket', 'Comedy Show', 'Music Festival', 'Stand-up Comedy', 'Theatre Play', 'Live Band', 'DJ Night', 'Cultural Event', 'Award Show', 'VIP Pass'],
    priceRange: [500, 20000],
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400'
  },
  'festivals': {
    names: ['Festival Pass', 'Food Festival', 'Music Festival', 'Art Festival', 'Cultural Fest', 'Carnival Entry', 'Diwali Mela', 'Christmas Fair', 'New Year Party', 'Holi Event'],
    priceRange: [200, 5000],
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400'
  },
  'workshops': {
    names: ['Cooking Workshop', 'Art Workshop', 'Photography', 'Writing Workshop', 'DIY Craft', 'Pottery Class', 'Baking Class', 'Mixology', 'Perfume Making', 'Candle Making'],
    priceRange: [500, 5000],
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400'
  },
  'amusement-parks': {
    names: ['Entry Ticket', 'All Rides Pass', 'Water Park', 'Family Package', 'VIP Fast Track', 'Annual Pass', 'Birthday Package', 'Group Discount', 'Food Combo', 'Locker Rental'],
    priceRange: [300, 3000],
    image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400'
  },
  'gaming-cafes': {
    names: ['Hourly Gaming', 'Full Day Pass', 'VR Experience', 'PS5 Session', 'Xbox Session', 'PC Gaming', 'Racing Simulator', 'Tournament Entry', 'Party Package', 'Membership'],
    priceRange: [100, 2000],
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'
  },
  'vr-ar-experiences': {
    names: ['VR Game Session', 'VR Cinema', 'VR Escape Room', 'AR Experience', 'Flight Simulator', 'VR Racing', 'VR Adventure', 'Group VR Session', 'Birthday VR Party', 'Corporate Event'],
    priceRange: [200, 3000],
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=400'
  },

  // FINANCIAL LIFESTYLE (7 subcategories)
  'bill-payments': {
    names: ['Electricity Bill', 'Water Bill', 'Gas Bill', 'Property Tax', 'Municipal Tax', 'Broadband Bill', 'DTH Recharge', 'Landline Bill', 'Credit Card Bill', 'Loan EMI'],
    priceRange: [100, 10000],
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400'
  },
  'mobile-recharge': {
    names: ['Prepaid Recharge', 'Postpaid Bill', 'Data Pack', 'Unlimited Plan', 'International Roaming', 'Talk Time', 'SMS Pack', 'Combo Pack', 'Annual Plan', 'Family Plan'],
    priceRange: [10, 3000],
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'
  },
  'broadband': {
    names: ['Monthly Plan', 'Quarterly Plan', 'Annual Plan', 'Unlimited Data', 'High Speed Plan', 'Gaming Plan', 'Business Plan', 'Fiber Connection', 'Installation', 'Router Upgrade'],
    priceRange: [500, 20000],
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400'
  },
  'cable-ott': {
    names: ['Cable TV Package', 'HD Channels', 'Sports Pack', 'Movies Pack', 'Netflix', 'Amazon Prime', 'Disney+ Hotstar', 'Sony LIV', 'Zee5', 'OTT Combo'],
    priceRange: [99, 5000],
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400'
  },
  'insurance': {
    names: ['Health Insurance', 'Life Insurance', 'Car Insurance', 'Bike Insurance', 'Travel Insurance', 'Home Insurance', 'Term Plan', 'Family Floater', 'Critical Illness', 'Personal Accident'],
    priceRange: [500, 50000],
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400'
  },
  'gold-savings': {
    names: ['Digital Gold', 'Gold SIP', 'Gold Coin 1g', 'Gold Coin 5g', 'Gold Coin 10g', 'Gold Bar', 'Silver Coin', 'Gold Savings Plan', 'Gold Gift Card', 'Gold Jewelry Savings'],
    priceRange: [100, 100000],
    image: 'https://images.unsplash.com/photo-1610375461249-fba29d3d6589?w=400'
  },
  'donations': {
    names: ['Temple Donation', 'NGO Donation', 'Education Fund', 'Medical Fund', 'Disaster Relief', 'Animal Welfare', 'Environmental Cause', 'Child Welfare', 'Senior Citizen Fund', 'Community Service'],
    priceRange: [10, 10000],
    image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400'
  }
};

// Main category to subcategory mapping
const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  'food-dining': ['cafes', 'qsr-fast-food', 'family-restaurants', 'fine-dining', 'ice-cream-dessert', 'bakery-confectionery', 'cloud-kitchens', 'street-food'],
  'grocery-essentials': ['supermarkets', 'kirana-stores', 'fresh-vegetables', 'meat-fish', 'dairy', 'packaged-goods', 'water-cans'],
  'beauty-wellness': ['salons', 'spa-massage', 'beauty-services', 'cosmetology', 'dermatology', 'skincare-cosmetics', 'nail-studios', 'grooming-men'],
  'healthcare': ['pharmacy', 'clinics', 'diagnostics', 'dental', 'physiotherapy', 'home-nursing', 'vision-eyewear'],
  'fashion': ['footwear', 'bags-accessories', 'electronics', 'mobile-accessories', 'watches', 'jewelry', 'local-brands'],
  'fitness-sports': ['gyms', 'crossfit', 'yoga', 'zumba', 'martial-arts', 'sports-academies', 'sportswear'],
  'education-learning': ['coaching-centers', 'skill-development', 'music-dance-classes', 'art-craft', 'vocational', 'language-training'],
  'home-services': ['ac-repair', 'plumbing', 'electrical', 'cleaning', 'pest-control', 'house-shifting', 'laundry-dry-cleaning', 'home-tutors'],
  'travel-experiences': ['hotels', 'intercity-travel', 'taxis', 'bike-rentals', 'weekend-getaways', 'tours', 'activities'],
  'entertainment': ['movies', 'live-events', 'festivals', 'workshops', 'amusement-parks', 'gaming-cafes', 'vr-ar-experiences'],
  'financial-lifestyle': ['bill-payments', 'mobile-recharge', 'broadband', 'cable-ott', 'insurance', 'gold-savings', 'donations']
};

async function updateProductDetails() {
  try {
    console.log('🚀 Starting product details update...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    // Define schemas
    const categorySchema = new mongoose.Schema({
      name: String,
      slug: String,
      parentCategory: mongoose.Schema.Types.ObjectId,
      isActive: Boolean
    });

    const storeSchema = new mongoose.Schema({
      name: String,
      slug: String,
      category: mongoose.Schema.Types.ObjectId,
      isActive: Boolean
    });

    const productSchema = new mongoose.Schema({
      name: String,
      slug: String,
      description: String,
      store: mongoose.Schema.Types.ObjectId,
      category: mongoose.Schema.Types.ObjectId,
      images: [String],
      pricing: {
        base: Number,
        current: Number,
        original: Number,
        discount: Number,
        currency: String
      },
      inventory: {
        stock: Number,
        isAvailable: Boolean
      },
      rating: {
        value: Number,
        count: Number
      },
      tags: [String],
      isActive: Boolean
    });

    const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
    const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);
    const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

    // Fetch all main categories and subcategories
    const allCategories = await Category.find({}).lean();
    const mainCategories = allCategories.filter((c: any) => !c.parentCategory);
    const subcategories = allCategories.filter((c: any) => c.parentCategory);

    console.log(`📦 Found ${mainCategories.length} main categories`);
    console.log(`📦 Found ${subcategories.length} subcategories`);

    // Create maps
    const categoryIdToSlug = new Map<string, string>();
    const slugToCategoryId = new Map<string, string>();

    allCategories.forEach((cat: any) => {
      categoryIdToSlug.set(cat._id.toString(), cat.slug);
      slugToCategoryId.set(cat.slug, cat._id.toString());
    });

    // Fetch all stores
    const stores = await Store.find({}).lean();
    console.log(`📦 Found ${stores.length} stores\n`);

    // Fetch all products
    const products = await Product.find({}).lean();
    console.log(`📦 Found ${products.length} products to update\n`);

    // Helper functions
    const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const getRandomPrice = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
    const getRandomRating = (): number => Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
    const getRandomReviewCount = (): number => Math.floor(Math.random() * 500) + 10;

    // Create slug from name
    const createSlug = (name: string, id: string): string => {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id.slice(-6);
    };

    // Track store subcategory assignments
    const storeSubcategories = new Map<string, string>();

    // Assign subcategories to stores based on their main category
    for (const store of stores) {
      const s = store as any;
      const mainCategorySlug = categoryIdToSlug.get(s.category?.toString());

      if (mainCategorySlug && CATEGORY_SUBCATEGORIES[mainCategorySlug]) {
        const subcats = CATEGORY_SUBCATEGORIES[mainCategorySlug];
        const assignedSubcat = getRandomItem(subcats);
        storeSubcategories.set(s._id.toString(), assignedSubcat);
      }
    }

    console.log('========================================');
    console.log('UPDATING PRODUCTS');
    console.log('========================================\n');

    let updatedCount = 0;
    const categoryProductCount: Record<string, number> = {};

    for (const product of products) {
      const p = product as any;
      const storeId = p.store?.toString();

      if (!storeId) {
        console.log(`⚠️  Skipping product ${p._id} - no store assigned`);
        continue;
      }

      // Get the subcategory for this store
      const subcategorySlug = storeSubcategories.get(storeId);

      if (!subcategorySlug || !SUBCATEGORY_PRODUCTS[subcategorySlug]) {
        // Fallback to a default subcategory
        const fallbackSubcat = 'cafes';
        const template = SUBCATEGORY_PRODUCTS[fallbackSubcat];
        const subcategoryId = slugToCategoryId.get(fallbackSubcat);

        const newName = getRandomItem(template.names);
        const price = getRandomPrice(...template.priceRange);
        const originalPrice = Math.round(price * (1 + Math.random() * 0.3));
        const discount = Math.round(((originalPrice - price) / originalPrice) * 100);

        await Product.updateOne(
          { _id: p._id },
          {
            $set: {
              name: newName,
              slug: createSlug(newName, p._id.toString()),
              description: `High quality ${newName.toLowerCase()} available at best prices`,
              category: subcategoryId ? new mongoose.Types.ObjectId(subcategoryId) : p.category,
              images: [template.image],
              pricing: {
                base: price,
                current: price,
                original: originalPrice,
                discount: discount,
                currency: 'INR'
              },
              inventory: {
                stock: Math.floor(Math.random() * 100) + 10,
                isAvailable: true
              },
              rating: {
                value: getRandomRating(),
                count: getRandomReviewCount()
              },
              tags: [subcategorySlug || fallbackSubcat, 'best-seller', 'popular'],
              isActive: true
            }
          }
        );

        updatedCount++;
        continue;
      }

      const template = SUBCATEGORY_PRODUCTS[subcategorySlug];
      const subcategoryId = slugToCategoryId.get(subcategorySlug);

      const newName = getRandomItem(template.names);
      const price = getRandomPrice(...template.priceRange);
      const originalPrice = Math.round(price * (1 + Math.random() * 0.3));
      const discount = Math.round(((originalPrice - price) / originalPrice) * 100);

      await Product.updateOne(
        { _id: p._id },
        {
          $set: {
            name: newName,
            slug: createSlug(newName, p._id.toString()),
            description: `Premium quality ${newName.toLowerCase()} - Best deals available`,
            category: subcategoryId ? new mongoose.Types.ObjectId(subcategoryId) : p.category,
            images: [template.image],
            pricing: {
              base: price,
              current: price,
              original: originalPrice,
              discount: discount,
              currency: 'INR'
            },
            inventory: {
              stock: Math.floor(Math.random() * 100) + 10,
              isAvailable: true
            },
            rating: {
              value: getRandomRating(),
              count: getRandomReviewCount()
            },
            tags: [subcategorySlug, 'trending', 'recommended'],
            isActive: true
          }
        }
      );

      categoryProductCount[subcategorySlug] = (categoryProductCount[subcategorySlug] || 0) + 1;
      updatedCount++;

      if (updatedCount % 50 === 0) {
        console.log(`✅ Updated ${updatedCount} products...`);
      }
    }

    // Also update store categories to include subcategory
    console.log('\n========================================');
    console.log('UPDATING STORE SUBCATEGORIES');
    console.log('========================================\n');

    for (const [storeId, subcatSlug] of storeSubcategories) {
      const subcatId = slugToCategoryId.get(subcatSlug);
      if (subcatId) {
        await Store.updateOne(
          { _id: new mongoose.Types.ObjectId(storeId) },
          {
            $addToSet: { categories: new mongoose.Types.ObjectId(subcatId) }
          }
        );
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('========================================');
    console.log(`Total products updated: ${updatedCount}`);
    console.log(`\nProducts per subcategory:`);

    const sortedCategories = Object.entries(categoryProductCount).sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sortedCategories.slice(0, 20)) {
      console.log(`   ${category}: ${count} products`);
    }

    if (sortedCategories.length > 20) {
      console.log(`   ... and ${sortedCategories.length - 20} more subcategories`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateProductDetails()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
