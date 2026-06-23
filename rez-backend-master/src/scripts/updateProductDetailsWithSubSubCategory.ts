/**
 * Script to update all product details with proper names, descriptions, and sub-sub-categories
 * that fit the category hierarchy: Category > SubCategory > SubSubCategory
 *
 * Run: npx ts-node src/scripts/updateProductDetailsWithSubSubCategory.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Complete product templates organized by subcategory slug
// Each subcategory has sub-sub-categories with specific products
interface ProductTemplate {
  name: string;
  description: string;
  priceRange: [number, number];
  subSubCategory: string;
  tags: string[];
  image: string;
}

const PRODUCT_TEMPLATES: Record<string, ProductTemplate[]> = {
  // ==================== FOOD & DINING ====================

  // Cafés
  'cafes': [
    // Espresso-based drinks
    { name: 'Cappuccino', description: 'Classic Italian coffee with steamed milk foam', priceRange: [150, 220], subSubCategory: 'Espresso-based drinks', tags: ['coffee', 'hot', 'espresso'], image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400' },
    { name: 'Café Latte', description: 'Espresso with steamed milk, smooth and creamy', priceRange: [160, 240], subSubCategory: 'Espresso-based drinks', tags: ['coffee', 'hot', 'latte'], image: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400' },
    { name: 'Americano', description: 'Espresso diluted with hot water', priceRange: [120, 180], subSubCategory: 'Espresso-based drinks', tags: ['coffee', 'hot', 'black'], image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400' },
    { name: 'Mocha', description: 'Espresso with chocolate and steamed milk', priceRange: [180, 260], subSubCategory: 'Espresso-based drinks', tags: ['coffee', 'chocolate', 'sweet'], image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400' },
    { name: 'Espresso Shot', description: 'Pure concentrated coffee shot', priceRange: [80, 120], subSubCategory: 'Espresso-based drinks', tags: ['coffee', 'strong', 'espresso'], image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400' },
    // Tea (Chai/Herbal)
    { name: 'Masala Chai', description: 'Traditional Indian spiced tea with milk', priceRange: [60, 100], subSubCategory: 'Tea (Chai/Herbal)', tags: ['tea', 'indian', 'spiced'], image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400' },
    { name: 'Green Tea', description: 'Healthy antioxidant-rich green tea', priceRange: [80, 140], subSubCategory: 'Tea (Chai/Herbal)', tags: ['tea', 'healthy', 'green'], image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400' },
    { name: 'Herbal Infusion', description: 'Caffeine-free herbal blend', priceRange: [100, 160], subSubCategory: 'Tea (Chai/Herbal)', tags: ['tea', 'herbal', 'caffeine-free'], image: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400' },
    // Breakfast Items
    { name: 'Pancake Stack', description: 'Fluffy pancakes with maple syrup and butter', priceRange: [180, 280], subSubCategory: 'Breakfast Items', tags: ['breakfast', 'sweet', 'pancakes'], image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400' },
    { name: 'French Toast', description: 'Classic French toast with cinnamon', priceRange: [160, 240], subSubCategory: 'Breakfast Items', tags: ['breakfast', 'toast', 'sweet'], image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400' },
    { name: 'Eggs Benedict', description: 'Poached eggs on English muffin with hollandaise', priceRange: [220, 320], subSubCategory: 'Breakfast Items', tags: ['breakfast', 'eggs', 'premium'], image: 'https://images.unsplash.com/photo-1608039829572-9b0e1347eca2?w=400' },
    // Sandwiches
    { name: 'Club Sandwich', description: 'Triple-decker with chicken, bacon, lettuce, tomato', priceRange: [180, 280], subSubCategory: 'Sandwiches', tags: ['sandwich', 'chicken', 'club'], image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400' },
    { name: 'Grilled Cheese Sandwich', description: 'Melted cheese between toasted bread', priceRange: [120, 180], subSubCategory: 'Sandwiches', tags: ['sandwich', 'cheese', 'vegetarian'], image: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400' },
    { name: 'Veggie Wrap', description: 'Fresh vegetables wrapped in tortilla', priceRange: [140, 200], subSubCategory: 'Sandwiches', tags: ['wrap', 'vegetarian', 'healthy'], image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400' },
    // All-day brunch
    { name: 'Full English Breakfast', description: 'Eggs, bacon, sausage, beans, toast, mushrooms', priceRange: [280, 380], subSubCategory: 'All-day brunch', tags: ['brunch', 'english', 'hearty'], image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400' },
    { name: 'Avocado Toast', description: 'Smashed avocado on sourdough with poached egg', priceRange: [200, 280], subSubCategory: 'All-day brunch', tags: ['brunch', 'avocado', 'healthy'], image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400' },
  ],

  // QSR / Fast Food
  'qsr-fast-food': [
    // Burgers
    { name: 'Classic Beef Burger', description: 'Juicy beef patty with fresh veggies', priceRange: [150, 220], subSubCategory: 'Burgers', tags: ['burger', 'beef', 'classic'], image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
    { name: 'Cheese Burger', description: 'Beef patty with melted cheddar cheese', priceRange: [170, 250], subSubCategory: 'Burgers', tags: ['burger', 'cheese', 'popular'], image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400' },
    { name: 'Veggie Burger', description: 'Plant-based patty with fresh toppings', priceRange: [140, 200], subSubCategory: 'Burgers', tags: ['burger', 'vegetarian', 'healthy'], image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400' },
    { name: 'Double Patty Burger', description: 'Two beef patties with special sauce', priceRange: [220, 320], subSubCategory: 'Burgers', tags: ['burger', 'double', 'hearty'], image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400' },
    // Pizzas
    { name: 'Margherita Pizza', description: 'Classic tomato, mozzarella, and basil', priceRange: [200, 350], subSubCategory: 'Pizzas', tags: ['pizza', 'vegetarian', 'italian'], image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400' },
    { name: 'Pepperoni Pizza', description: 'Loaded with spicy pepperoni slices', priceRange: [280, 420], subSubCategory: 'Pizzas', tags: ['pizza', 'pepperoni', 'popular'], image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400' },
    { name: 'BBQ Chicken Pizza', description: 'Grilled chicken with BBQ sauce', priceRange: [300, 450], subSubCategory: 'Pizzas', tags: ['pizza', 'chicken', 'bbq'], image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400' },
    // Wraps/Rolls
    { name: 'Chicken Wrap', description: 'Grilled chicken wrapped in tortilla', priceRange: [120, 180], subSubCategory: 'Wraps/Rolls', tags: ['wrap', 'chicken', 'quick'], image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400' },
    { name: 'Paneer Roll', description: 'Spiced cottage cheese in paratha', priceRange: [100, 160], subSubCategory: 'Wraps/Rolls', tags: ['roll', 'paneer', 'indian'], image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400' },
    { name: 'Egg Roll', description: 'Egg stuffed roll with chutney', priceRange: [80, 140], subSubCategory: 'Wraps/Rolls', tags: ['roll', 'egg', 'street-food'], image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' },
    // Fried Chicken
    { name: 'Fried Chicken Bucket', description: '8 pieces of crispy fried chicken', priceRange: [350, 500], subSubCategory: 'Fried Chicken', tags: ['chicken', 'fried', 'bucket'], image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400' },
    { name: 'Chicken Wings', description: 'Crispy wings with choice of sauce', priceRange: [200, 300], subSubCategory: 'Fried Chicken', tags: ['chicken', 'wings', 'crispy'], image: 'https://images.unsplash.com/photo-1608039829572-9b0e1347eca2?w=400' },
    { name: 'Popcorn Chicken', description: 'Bite-sized crispy chicken pieces', priceRange: [150, 220], subSubCategory: 'Fried Chicken', tags: ['chicken', 'popcorn', 'snack'], image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400' },
    // Momos
    { name: 'Steamed Veg Momos', description: 'Soft steamed vegetable dumplings', priceRange: [80, 120], subSubCategory: 'Momos', tags: ['momos', 'vegetarian', 'steamed'], image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400' },
    { name: 'Fried Chicken Momos', description: 'Crispy fried chicken dumplings', priceRange: [100, 150], subSubCategory: 'Momos', tags: ['momos', 'chicken', 'fried'], image: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400' },
    { name: 'Tandoori Momos', description: 'Grilled momos with tandoori spices', priceRange: [120, 180], subSubCategory: 'Momos', tags: ['momos', 'tandoori', 'spicy'], image: 'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400' },
  ],

  // Family Restaurants
  'family-restaurants': [
    // North Indian
    { name: 'Paneer Butter Masala', description: 'Cottage cheese in rich tomato gravy', priceRange: [220, 320], subSubCategory: 'North Indian', tags: ['paneer', 'curry', 'vegetarian'], image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400' },
    { name: 'Dal Makhani', description: 'Creamy black lentils slow-cooked overnight', priceRange: [180, 260], subSubCategory: 'North Indian', tags: ['dal', 'lentils', 'creamy'], image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400' },
    { name: 'Butter Chicken', description: 'Tender chicken in buttery tomato sauce', priceRange: [280, 380], subSubCategory: 'North Indian', tags: ['chicken', 'curry', 'popular'], image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400' },
    { name: 'Kadai Paneer', description: 'Paneer cooked with bell peppers and spices', priceRange: [240, 320], subSubCategory: 'North Indian', tags: ['paneer', 'spicy', 'kadai'], image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400' },
    // South Indian
    { name: 'Masala Dosa', description: 'Crispy crepe with spiced potato filling', priceRange: [100, 160], subSubCategory: 'South Indian', tags: ['dosa', 'breakfast', 'crispy'], image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400' },
    { name: 'Idli Sambar', description: 'Steamed rice cakes with lentil soup', priceRange: [80, 120], subSubCategory: 'South Indian', tags: ['idli', 'healthy', 'breakfast'], image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400' },
    { name: 'Medu Vada', description: 'Crispy fried lentil donuts', priceRange: [60, 100], subSubCategory: 'South Indian', tags: ['vada', 'crispy', 'snack'], image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400' },
    { name: 'South Indian Thali', description: 'Complete meal with rice, sambar, rasam, curries', priceRange: [180, 280], subSubCategory: 'South Indian', tags: ['thali', 'complete-meal', 'traditional'], image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400' },
    // Chinese/Asian
    { name: 'Hakka Noodles', description: 'Stir-fried noodles with vegetables', priceRange: [160, 240], subSubCategory: 'Chinese/Asian', tags: ['noodles', 'chinese', 'vegetarian'], image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400' },
    { name: 'Veg Manchurian', description: 'Vegetable balls in spicy manchurian sauce', priceRange: [180, 260], subSubCategory: 'Chinese/Asian', tags: ['manchurian', 'indo-chinese', 'spicy'], image: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=400' },
    { name: 'Fried Rice', description: 'Wok-tossed rice with vegetables and egg', priceRange: [140, 220], subSubCategory: 'Chinese/Asian', tags: ['rice', 'chinese', 'quick'], image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' },
    // Multicuisine
    { name: 'Family Combo Meal', description: 'Variety platter for 4 with rotis, rice, curries', priceRange: [600, 900], subSubCategory: 'Multicuisine', tags: ['combo', 'family', 'value'], image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400' },
    { name: 'Mixed Grill Platter', description: 'Assorted grilled meats and vegetables', priceRange: [450, 650], subSubCategory: 'Multicuisine', tags: ['grill', 'mixed', 'non-veg'], image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400' },
  ],

  // Fine Dining
  'fine-dining': [
    // Continental
    { name: 'Grilled Salmon', description: 'Atlantic salmon with herb butter sauce', priceRange: [800, 1200], subSubCategory: 'Continental', tags: ['salmon', 'grilled', 'premium'], image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400' },
    { name: 'Beef Tenderloin', description: 'Prime cut beef with red wine reduction', priceRange: [1200, 1800], subSubCategory: 'Continental', tags: ['beef', 'steak', 'premium'], image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400' },
    { name: 'Lamb Chops', description: 'Herb-crusted lamb with mint sauce', priceRange: [900, 1400], subSubCategory: 'Continental', tags: ['lamb', 'grilled', 'premium'], image: 'https://images.unsplash.com/photo-1608877907149-a206d75ba011?w=400' },
    // Modern Indian
    { name: 'Deconstructed Biryani', description: 'Modern take on classic biryani with saffron foam', priceRange: [600, 900], subSubCategory: 'Modern Indian', tags: ['biryani', 'modern', 'fusion'], image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
    { name: 'Butter Chicken Sphere', description: 'Molecular gastronomy butter chicken', priceRange: [550, 800], subSubCategory: 'Modern Indian', tags: ['chicken', 'molecular', 'innovative'], image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400' },
    // Italian (Gourmet)
    { name: 'Truffle Risotto', description: 'Arborio rice with black truffle shavings', priceRange: [700, 1100], subSubCategory: 'Italian (Gourmet)', tags: ['risotto', 'truffle', 'italian'], image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400' },
    { name: 'Lobster Pasta', description: 'Fresh lobster with linguine in bisque', priceRange: [1000, 1500], subSubCategory: 'Italian (Gourmet)', tags: ['lobster', 'pasta', 'premium'], image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400' },
    // Japanese (Sushi/Teppanyaki)
    { name: 'Sushi Platter', description: 'Assorted nigiri and maki rolls', priceRange: [800, 1400], subSubCategory: 'Japanese (Sushi/Teppanyaki)', tags: ['sushi', 'japanese', 'raw'], image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400' },
    { name: 'Teppanyaki Set', description: 'Live grilled seafood and vegetables', priceRange: [1200, 1800], subSubCategory: 'Japanese (Sushi/Teppanyaki)', tags: ['teppanyaki', 'grilled', 'experience'], image: 'https://images.unsplash.com/photo-1540648639573-8c848de23f0a?w=400' },
    // Mediterranean
    { name: 'Mezze Platter', description: 'Hummus, baba ganoush, falafel, pita', priceRange: [500, 800], subSubCategory: 'Mediterranean', tags: ['mezze', 'mediterranean', 'sharing'], image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400' },
    { name: 'Lamb Kofta', description: 'Spiced lamb skewers with tzatziki', priceRange: [600, 900], subSubCategory: 'Mediterranean', tags: ['lamb', 'kofta', 'grilled'], image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400' },
  ],

  // Ice Cream & Dessert
  'ice-cream-dessert': [
    // Gelato
    { name: 'Pistachio Gelato', description: 'Authentic Italian pistachio gelato', priceRange: [120, 180], subSubCategory: 'Gelato', tags: ['gelato', 'pistachio', 'italian'], image: 'https://images.unsplash.com/photo-1557142046-c704a3adf364?w=400' },
    { name: 'Chocolate Gelato', description: 'Rich Belgian chocolate gelato', priceRange: [120, 180], subSubCategory: 'Gelato', tags: ['gelato', 'chocolate', 'rich'], image: 'https://images.unsplash.com/photo-1580915411954-282cb1b0d780?w=400' },
    { name: 'Stracciatella', description: 'Vanilla gelato with chocolate chips', priceRange: [130, 190], subSubCategory: 'Gelato', tags: ['gelato', 'vanilla', 'chips'], image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400' },
    // Shakes
    { name: 'Chocolate Shake', description: 'Thick chocolate milkshake with whipped cream', priceRange: [150, 220], subSubCategory: 'Shakes', tags: ['shake', 'chocolate', 'thick'], image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400' },
    { name: 'Oreo Shake', description: 'Creamy shake loaded with Oreo cookies', priceRange: [180, 250], subSubCategory: 'Shakes', tags: ['shake', 'oreo', 'cookies'], image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400' },
    { name: 'Strawberry Shake', description: 'Fresh strawberry milkshake', priceRange: [140, 200], subSubCategory: 'Shakes', tags: ['shake', 'strawberry', 'fruity'], image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400' },
    // Sundaes
    { name: 'Hot Fudge Sundae', description: 'Vanilla ice cream with hot chocolate fudge', priceRange: [180, 280], subSubCategory: 'Sundaes', tags: ['sundae', 'fudge', 'hot'], image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400' },
    { name: 'Banana Split', description: 'Classic banana split with three ice cream flavors', priceRange: [220, 320], subSubCategory: 'Sundaes', tags: ['sundae', 'banana', 'classic'], image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400' },
    // Indian Desserts (Kulfi)
    { name: 'Malai Kulfi', description: 'Traditional creamy Indian ice cream', priceRange: [80, 120], subSubCategory: 'Indian Desserts (Kulfi)', tags: ['kulfi', 'indian', 'traditional'], image: 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=400' },
    { name: 'Paan Kulfi', description: 'Betel leaf flavored kulfi', priceRange: [90, 140], subSubCategory: 'Indian Desserts (Kulfi)', tags: ['kulfi', 'paan', 'unique'], image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400' },
    { name: 'Kesar Pista Kulfi', description: 'Saffron and pistachio kulfi', priceRange: [100, 150], subSubCategory: 'Indian Desserts (Kulfi)', tags: ['kulfi', 'saffron', 'premium'], image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400' },
  ],

  // Bakery & Confectionery
  'bakery-confectionery': [
    // Cakes & Pastries
    { name: 'Black Forest Cake', description: 'Classic chocolate cake with cherries', priceRange: [400, 800], subSubCategory: 'Cakes & Pastries', tags: ['cake', 'chocolate', 'cherry'], image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400' },
    { name: 'Red Velvet Cake', description: 'Moist red velvet with cream cheese frosting', priceRange: [500, 900], subSubCategory: 'Cakes & Pastries', tags: ['cake', 'red-velvet', 'cream-cheese'], image: 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=400' },
    { name: 'Chocolate Truffle Cake', description: 'Rich chocolate ganache cake', priceRange: [450, 850], subSubCategory: 'Cakes & Pastries', tags: ['cake', 'truffle', 'rich'], image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400' },
    // Bread (Sourdough/Rye)
    { name: 'Sourdough Loaf', description: 'Artisan sourdough bread', priceRange: [150, 250], subSubCategory: 'Bread (Sourdough/Rye)', tags: ['bread', 'sourdough', 'artisan'], image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
    { name: 'Multigrain Bread', description: 'Healthy multigrain loaf', priceRange: [120, 200], subSubCategory: 'Bread (Sourdough/Rye)', tags: ['bread', 'multigrain', 'healthy'], image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400' },
    // Cookies & Brownies
    { name: 'Chocolate Chip Cookies', description: 'Classic cookies with chocolate chips', priceRange: [80, 150], subSubCategory: 'Cookies & Brownies', tags: ['cookies', 'chocolate', 'classic'], image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400' },
    { name: 'Fudge Brownies', description: 'Dense chocolate fudge brownies', priceRange: [100, 180], subSubCategory: 'Cookies & Brownies', tags: ['brownies', 'chocolate', 'fudge'], image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400' },
    // Donuts
    { name: 'Glazed Donuts', description: 'Classic glazed ring donuts', priceRange: [60, 100], subSubCategory: 'Donuts', tags: ['donuts', 'glazed', 'classic'], image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400' },
    { name: 'Chocolate Donuts', description: 'Chocolate frosted donuts', priceRange: [80, 120], subSubCategory: 'Donuts', tags: ['donuts', 'chocolate', 'frosted'], image: 'https://images.unsplash.com/photo-1527904324834-3bda86da6771?w=400' },
    // Indian Sweets (Mithai)
    { name: 'Gulab Jamun', description: 'Deep-fried milk balls in sugar syrup', priceRange: [150, 300], subSubCategory: 'Indian Sweets (Mithai)', tags: ['mithai', 'gulab-jamun', 'traditional'], image: 'https://images.unsplash.com/photo-1666190050371-bc5ed5c6d265?w=400' },
    { name: 'Kaju Katli', description: 'Premium cashew diamond sweets', priceRange: [400, 800], subSubCategory: 'Indian Sweets (Mithai)', tags: ['mithai', 'kaju', 'premium'], image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400' },
    { name: 'Rasgulla', description: 'Soft cheese balls in sugar syrup', priceRange: [200, 400], subSubCategory: 'Indian Sweets (Mithai)', tags: ['mithai', 'rasgulla', 'bengali'], image: 'https://images.unsplash.com/photo-1601303516150-0f4a5f1c82f8?w=400' },
  ],

  // Cloud Kitchens
  'cloud-kitchens': [
    // Biryani
    { name: 'Hyderabadi Chicken Biryani', description: 'Authentic dum-cooked Hyderabadi biryani', priceRange: [250, 380], subSubCategory: 'Biryani', tags: ['biryani', 'hyderabadi', 'chicken'], image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
    { name: 'Lucknowi Biryani', description: 'Fragrant Awadhi-style biryani', priceRange: [280, 400], subSubCategory: 'Biryani', tags: ['biryani', 'lucknowi', 'awadhi'], image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' },
    { name: 'Veg Biryani', description: 'Flavorful vegetable biryani', priceRange: [180, 280], subSubCategory: 'Biryani', tags: ['biryani', 'vegetarian', 'rice'], image: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400' },
    // Health & Salad Bowls
    { name: 'Quinoa Buddha Bowl', description: 'Nutritious quinoa with roasted veggies', priceRange: [280, 380], subSubCategory: 'Health & Salad Bowls', tags: ['healthy', 'quinoa', 'bowl'], image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
    { name: 'Grilled Chicken Salad', description: 'Fresh greens with grilled chicken', priceRange: [250, 350], subSubCategory: 'Health & Salad Bowls', tags: ['salad', 'chicken', 'healthy'], image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
    // Meal Boxes
    { name: 'Protein Power Box', description: 'High protein meal with chicken, rice, veggies', priceRange: [220, 320], subSubCategory: 'Meal Boxes', tags: ['meal-box', 'protein', 'fitness'], image: 'https://images.unsplash.com/photo-1484980972926-edee96e0960d?w=400' },
    { name: 'Office Lunch Box', description: 'Balanced meal for office lunch', priceRange: [180, 260], subSubCategory: 'Meal Boxes', tags: ['meal-box', 'lunch', 'office'], image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400' },
  ],

  // Street Food
  'street-food': [
    // Chaat (Pani Puri/Bhel)
    { name: 'Pani Puri', description: 'Crispy puris with spiced water', priceRange: [40, 80], subSubCategory: 'Chaat (Pani Puri/Bhel)', tags: ['chaat', 'pani-puri', 'tangy'], image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400' },
    { name: 'Bhel Puri', description: 'Puffed rice with chutneys and veggies', priceRange: [50, 90], subSubCategory: 'Chaat (Pani Puri/Bhel)', tags: ['chaat', 'bhel', 'crunchy'], image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
    { name: 'Sev Puri', description: 'Crispy puris with sev and chutneys', priceRange: [60, 100], subSubCategory: 'Chaat (Pani Puri/Bhel)', tags: ['chaat', 'sev', 'crispy'], image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400' },
    // Vada Pav
    { name: 'Classic Vada Pav', description: 'Mumbai style potato fritter burger', priceRange: [30, 60], subSubCategory: 'Vada Pav', tags: ['vada-pav', 'mumbai', 'street-food'], image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400' },
    { name: 'Cheese Vada Pav', description: 'Vada pav with melted cheese', priceRange: [50, 80], subSubCategory: 'Vada Pav', tags: ['vada-pav', 'cheese', 'fusion'], image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400' },
    // Pav Bhaji
    { name: 'Butter Pav Bhaji', description: 'Spiced mashed veggies with buttered bread', priceRange: [80, 140], subSubCategory: 'Pav Bhaji', tags: ['pav-bhaji', 'butter', 'mumbai'], image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400' },
    // Local Snacks (Bajji/Bonda)
    { name: 'Onion Bajji', description: 'Crispy onion fritters', priceRange: [40, 70], subSubCategory: 'Local Snacks (Bajji/Bonda)', tags: ['bajji', 'onion', 'crispy'], image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
    { name: 'Mysore Bonda', description: 'Spiced lentil balls, deep fried', priceRange: [40, 70], subSubCategory: 'Local Snacks (Bajji/Bonda)', tags: ['bonda', 'mysore', 'snack'], image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400' },
    { name: 'Samosa', description: 'Crispy pastry with spiced potato filling', priceRange: [20, 50], subSubCategory: 'Local Snacks (Bajji/Bonda)', tags: ['samosa', 'potato', 'popular'], image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
  ],

  // ==================== GROCERY & ESSENTIALS ====================

  // Supermarkets
  'supermarkets': [
    { name: 'Fresh Apples 1kg', description: 'Crisp and juicy red apples', priceRange: [150, 250], subSubCategory: 'Fresh Produce', tags: ['fruits', 'apples', 'fresh'], image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400' },
    { name: 'Bananas Dozen', description: 'Ripe yellow bananas', priceRange: [50, 80], subSubCategory: 'Fresh Produce', tags: ['fruits', 'bananas', 'healthy'], image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400' },
    { name: 'Farm Fresh Eggs 12pc', description: 'Fresh farm eggs', priceRange: [70, 100], subSubCategory: 'Dairy & Eggs', tags: ['eggs', 'fresh', 'protein'], image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400' },
    { name: 'Amul Butter 500g', description: 'Creamy salted butter', priceRange: [250, 300], subSubCategory: 'Dairy & Eggs', tags: ['butter', 'dairy', 'amul'], image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
    { name: 'Lays Chips Combo', description: 'Assorted Lays chips pack', priceRange: [100, 180], subSubCategory: 'Packaged Foods', tags: ['chips', 'snacks', 'combo'], image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400' },
    { name: 'Vim Dishwash Bar', description: 'Effective dish cleaning bar', priceRange: [40, 70], subSubCategory: 'Household Goods', tags: ['cleaning', 'dishwash', 'household'], image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400' },
    { name: 'Dove Shampoo 340ml', description: 'Nourishing shampoo for smooth hair', priceRange: [250, 350], subSubCategory: 'Personal Care', tags: ['shampoo', 'haircare', 'dove'], image: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400' },
  ],

  // Kirana Stores
  'kirana-stores': [
    { name: 'Toor Dal 1kg', description: 'Premium quality toor dal', priceRange: [120, 180], subSubCategory: 'Pulses & Grains', tags: ['dal', 'pulses', 'protein'], image: 'https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=400' },
    { name: 'Basmati Rice 5kg', description: 'Long grain aged basmati', priceRange: [400, 600], subSubCategory: 'Pulses & Grains', tags: ['rice', 'basmati', 'staple'], image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
    { name: 'MDH Garam Masala', description: 'Aromatic spice blend', priceRange: [80, 120], subSubCategory: 'Spices & Masalas', tags: ['masala', 'spices', 'mdh'], image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400' },
    { name: 'Turmeric Powder 200g', description: 'Pure turmeric powder', priceRange: [50, 80], subSubCategory: 'Spices & Masalas', tags: ['turmeric', 'spices', 'healthy'], image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400' },
    { name: 'Fortune Sunflower Oil 1L', description: 'Heart-healthy cooking oil', priceRange: [140, 180], subSubCategory: 'Oils & Ghee', tags: ['oil', 'cooking', 'healthy'], image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400' },
    { name: 'Pure Cow Ghee 500g', description: 'Traditional clarified butter', priceRange: [350, 500], subSubCategory: 'Oils & Ghee', tags: ['ghee', 'traditional', 'pure'], image: 'https://images.unsplash.com/photo-1631515242808-497c3fbd4c22?w=400' },
  ],

  // Dairy
  'dairy': [
    { name: 'Full Cream Milk 1L', description: 'Fresh full cream milk', priceRange: [60, 80], subSubCategory: 'Milk', tags: ['milk', 'dairy', 'fresh'], image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },
    { name: 'Toned Milk 1L', description: 'Low fat toned milk', priceRange: [50, 70], subSubCategory: 'Milk', tags: ['milk', 'low-fat', 'healthy'], image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400' },
    { name: 'Greek Yogurt 400g', description: 'Thick creamy Greek yogurt', priceRange: [120, 180], subSubCategory: 'Yogurt/Curd', tags: ['yogurt', 'greek', 'protein'], image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400' },
    { name: 'Fresh Curd 500g', description: 'Homestyle fresh curd', priceRange: [40, 60], subSubCategory: 'Yogurt/Curd', tags: ['curd', 'fresh', 'probiotic'], image: 'https://images.unsplash.com/photo-1571211905393-6de67ff8fb61?w=400' },
    { name: 'Amul Cheese Slices', description: 'Processed cheese slices', priceRange: [100, 150], subSubCategory: 'Cheese', tags: ['cheese', 'slices', 'amul'], image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400' },
    { name: 'Fresh Paneer 200g', description: 'Soft cottage cheese', priceRange: [80, 120], subSubCategory: 'Paneer', tags: ['paneer', 'fresh', 'protein'], image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400' },
    { name: 'Amul Butter 100g', description: 'Salted butter', priceRange: [55, 70], subSubCategory: 'Butter & Cream', tags: ['butter', 'amul', 'dairy'], image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
  ],

  // Water Cans
  'water-cans': [
    { name: 'Bisleri 20L Can', description: 'Packaged drinking water 20 liters', priceRange: [80, 120], subSubCategory: '20L Can', tags: ['water', '20l', 'bisleri'], image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
    { name: 'Aquafina 20L Can', description: 'Purified water 20 liters', priceRange: [70, 100], subSubCategory: '20L Can', tags: ['water', '20l', 'aquafina'], image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
    { name: 'Kinley 1L Bottle', description: 'Packaged drinking water', priceRange: [20, 30], subSubCategory: 'Small Bottles (1L/500ml)', tags: ['water', '1l', 'kinley'], image: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400' },
    { name: 'Bailley 500ml Pack of 24', description: 'Small water bottles pack', priceRange: [200, 280], subSubCategory: 'Small Bottles (1L/500ml)', tags: ['water', '500ml', 'pack'], image: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400' },
  ],

  // ==================== BEAUTY & WELLNESS ====================

  // Salons
  'salons': [
    { name: "Men's Haircut", description: 'Professional haircut for men', priceRange: [200, 400], subSubCategory: 'Haircuts & Styling', tags: ['haircut', 'men', 'grooming'], image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400' },
    { name: "Women's Haircut & Styling", description: 'Haircut with blow dry styling', priceRange: [400, 800], subSubCategory: 'Haircuts & Styling', tags: ['haircut', 'women', 'styling'], image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400' },
    { name: 'Global Hair Color', description: 'Full head hair coloring', priceRange: [1500, 3500], subSubCategory: 'Hair Colouring', tags: ['color', 'hair', 'global'], image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400' },
    { name: 'Highlights', description: 'Partial hair highlighting', priceRange: [2000, 4000], subSubCategory: 'Hair Colouring', tags: ['highlights', 'hair', 'color'], image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400' },
    { name: 'Keratin Treatment', description: 'Hair smoothening treatment', priceRange: [3000, 8000], subSubCategory: 'Keratin/Smoothening', tags: ['keratin', 'smoothening', 'treatment'], image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400' },
    { name: 'Gold Facial', description: 'Luxurious gold facial treatment', priceRange: [800, 1500], subSubCategory: 'Facials', tags: ['facial', 'gold', 'luxury'], image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400' },
    { name: 'Fruit Facial', description: 'Refreshing fruit-based facial', priceRange: [500, 900], subSubCategory: 'Facials', tags: ['facial', 'fruit', 'natural'], image: 'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=400' },
  ],

  // Spa & Massage
  'spa-massage': [
    { name: 'Swedish Massage 60min', description: 'Classic relaxation massage', priceRange: [1500, 2500], subSubCategory: 'Swedish Massage', tags: ['massage', 'swedish', 'relaxation'], image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' },
    { name: 'Deep Tissue Massage', description: 'Therapeutic deep muscle massage', priceRange: [2000, 3500], subSubCategory: 'Deep Tissue', tags: ['massage', 'deep-tissue', 'therapeutic'], image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400' },
    { name: 'Aromatherapy Session', description: 'Essential oil massage therapy', priceRange: [1800, 3000], subSubCategory: 'Aromatherapy', tags: ['aromatherapy', 'essential-oils', 'relaxing'], image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400' },
    { name: 'Abhyanga Massage', description: 'Traditional Ayurvedic oil massage', priceRange: [2000, 3500], subSubCategory: 'Ayurvedic Treatments', tags: ['ayurveda', 'abhyanga', 'traditional'], image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400' },
    { name: 'Foot Reflexology', description: 'Pressure point foot massage', priceRange: [800, 1500], subSubCategory: 'Reflexology', tags: ['reflexology', 'foot', 'pressure-points'], image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400' },
  ],

  // Beauty Services
  'beauty-services': [
    { name: 'Full Arms Waxing', description: 'Complete arms hair removal', priceRange: [300, 500], subSubCategory: 'Waxing & Threading', tags: ['waxing', 'arms', 'hair-removal'], image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400' },
    { name: 'Eyebrow Threading', description: 'Precise eyebrow shaping', priceRange: [50, 100], subSubCategory: 'Waxing & Threading', tags: ['threading', 'eyebrows', 'shaping'], image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400' },
    { name: 'Classic Manicure', description: 'Nail care and polish', priceRange: [400, 700], subSubCategory: 'Manicure & Pedicure', tags: ['manicure', 'nails', 'polish'], image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400' },
    { name: 'Spa Pedicure', description: 'Relaxing foot spa treatment', priceRange: [600, 1000], subSubCategory: 'Manicure & Pedicure', tags: ['pedicure', 'spa', 'foot-care'], image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400' },
    { name: 'Bridal Makeup', description: 'Complete bridal makeup package', priceRange: [8000, 25000], subSubCategory: 'Bridal Makeup', tags: ['bridal', 'makeup', 'wedding'], image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400' },
    { name: 'Eyelash Extensions', description: 'Semi-permanent lash extensions', priceRange: [2000, 5000], subSubCategory: 'Eyelash Extensions', tags: ['eyelash', 'extensions', 'beauty'], image: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=400' },
  ],

  // ==================== HEALTHCARE ====================

  // Pharmacy
  'pharmacy': [
    { name: 'Paracetamol 500mg Strip', description: 'Pain and fever relief tablets', priceRange: [20, 40], subSubCategory: 'Over-the-Counter (OTC)', tags: ['medicine', 'paracetamol', 'fever'], image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
    { name: 'Cough Syrup 100ml', description: 'Cough and cold relief syrup', priceRange: [80, 150], subSubCategory: 'Over-the-Counter (OTC)', tags: ['medicine', 'cough', 'syrup'], image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400' },
    { name: 'First Aid Kit', description: 'Complete first aid supplies', priceRange: [300, 600], subSubCategory: 'First Aid', tags: ['first-aid', 'emergency', 'kit'], image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400' },
    { name: 'Bandage Roll', description: 'Sterile cotton bandage', priceRange: [30, 60], subSubCategory: 'First Aid', tags: ['bandage', 'first-aid', 'cotton'], image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400' },
    { name: 'Multivitamin Tablets', description: 'Daily multivitamin supplement', priceRange: [200, 500], subSubCategory: 'Vitamins & Supplements', tags: ['vitamins', 'supplements', 'health'], image: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400' },
    { name: 'Vitamin D3 Capsules', description: 'Vitamin D supplement', priceRange: [250, 450], subSubCategory: 'Vitamins & Supplements', tags: ['vitamin-d', 'supplements', 'bones'], image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
    { name: 'Baby Diapers Pack', description: 'Premium baby diapers', priceRange: [400, 800], subSubCategory: 'Baby Care', tags: ['baby', 'diapers', 'care'], image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400' },
  ],

  // Vision & Eyewear
  'vision-eyewear': [
    { name: 'Single Vision Glasses', description: 'Prescription eyeglasses', priceRange: [1000, 3000], subSubCategory: 'Prescription Eyeglasses', tags: ['glasses', 'prescription', 'vision'], image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400' },
    { name: 'Progressive Lenses', description: 'Multifocal progressive glasses', priceRange: [3000, 8000], subSubCategory: 'Prescription Eyeglasses', tags: ['progressive', 'multifocal', 'premium'], image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400' },
    { name: 'Polarized Sunglasses', description: 'UV protection sunglasses', priceRange: [1500, 5000], subSubCategory: 'Sunglasses', tags: ['sunglasses', 'polarized', 'uv-protection'], image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400' },
    { name: 'Daily Contact Lenses 30pc', description: 'Disposable daily lenses', priceRange: [800, 1500], subSubCategory: 'Contact Lenses', tags: ['contacts', 'daily', 'disposable'], image: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=400' },
    { name: 'Eye Checkup', description: 'Comprehensive eye examination', priceRange: [300, 800], subSubCategory: 'Eye Checkups', tags: ['checkup', 'eye-exam', 'vision'], image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400' },
  ],

  // ==================== FITNESS & SPORTS ====================

  // Gyms
  'gyms': [
    { name: 'Monthly Gym Membership', description: 'Full gym access for 30 days', priceRange: [1500, 3500], subSubCategory: 'Weight Training', tags: ['gym', 'membership', 'fitness'], image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400' },
    { name: 'Personal Training Session', description: 'One-on-one trainer session', priceRange: [500, 1500], subSubCategory: 'Personal Training', tags: ['personal-training', 'fitness', 'coach'], image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
    { name: 'Cardio Zone Access', description: 'Treadmill and cardio equipment', priceRange: [200, 400], subSubCategory: 'Cardio', tags: ['cardio', 'treadmill', 'heart-health'], image: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400' },
    { name: 'Zumba Class', description: 'Fun dance fitness class', priceRange: [300, 600], subSubCategory: 'Group Classes (Zumba/Aerobics)', tags: ['zumba', 'dance', 'group'], image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400' },
  ],

  // Yoga
  'yoga': [
    { name: 'Hatha Yoga Session', description: 'Traditional yoga practice', priceRange: [300, 600], subSubCategory: 'Hatha Yoga', tags: ['yoga', 'hatha', 'traditional'], image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400' },
    { name: 'Vinyasa Flow Class', description: 'Dynamic flowing yoga', priceRange: [400, 700], subSubCategory: 'Vinyasa Yoga', tags: ['yoga', 'vinyasa', 'flow'], image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400' },
    { name: 'Power Yoga', description: 'Intense strength-building yoga', priceRange: [400, 800], subSubCategory: 'Power Yoga', tags: ['yoga', 'power', 'strength'], image: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400' },
    { name: 'Guided Meditation', description: 'Mindfulness meditation session', priceRange: [200, 500], subSubCategory: 'Meditation Classes', tags: ['meditation', 'mindfulness', 'relaxation'], image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=400' },
  ],

  // ==================== HOME SERVICES ====================

  // AC Repair
  'ac-repair': [
    { name: 'Split AC Service', description: 'Complete AC cleaning and service', priceRange: [400, 800], subSubCategory: 'Split AC Repair', tags: ['ac', 'service', 'split'], image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400' },
    { name: 'AC Gas Refill', description: 'Refrigerant gas top-up', priceRange: [1500, 3000], subSubCategory: 'Split AC Repair', tags: ['ac', 'gas', 'refill'], image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400' },
    { name: 'Window AC Service', description: 'Window AC maintenance', priceRange: [350, 600], subSubCategory: 'Window AC Repair', tags: ['ac', 'window', 'service'], image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400' },
    { name: 'AC Deep Cleaning', description: 'Thorough AC cleaning service', priceRange: [800, 1500], subSubCategory: 'AC Servicing & Cleaning', tags: ['ac', 'cleaning', 'deep'], image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400' },
  ],

  // Plumbing
  'plumbing': [
    { name: 'Tap Repair', description: 'Leaky tap fixing service', priceRange: [200, 400], subSubCategory: 'Faucet/Leak Repair', tags: ['plumbing', 'tap', 'repair'], image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
    { name: 'Pipe Leak Fixing', description: 'Water pipe leak repair', priceRange: [300, 700], subSubCategory: 'Faucet/Leak Repair', tags: ['plumbing', 'pipe', 'leak'], image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
    { name: 'Drain Unclogging', description: 'Blocked drain clearing', priceRange: [250, 500], subSubCategory: 'Drainage Unclogging', tags: ['plumbing', 'drain', 'unclog'], image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
    { name: 'Geyser Installation', description: 'Water heater installation', priceRange: [500, 1000], subSubCategory: 'Water Heater Installation', tags: ['plumbing', 'geyser', 'installation'], image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
  ],

  // Cleaning
  'cleaning': [
    { name: 'Full Home Deep Cleaning', description: '2BHK complete deep clean', priceRange: [2000, 4000], subSubCategory: 'Deep House Cleaning', tags: ['cleaning', 'deep', 'home'], image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400' },
    { name: 'Sofa Cleaning', description: 'Professional sofa shampooing', priceRange: [800, 1500], subSubCategory: 'Sofa & Carpet Cleaning', tags: ['cleaning', 'sofa', 'shampoo'], image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
    { name: 'Kitchen Deep Clean', description: 'Thorough kitchen cleaning', priceRange: [1000, 2000], subSubCategory: 'Kitchen Cleaning', tags: ['cleaning', 'kitchen', 'deep'], image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400' },
    { name: 'Bathroom Cleaning', description: 'Complete bathroom sanitization', priceRange: [500, 1000], subSubCategory: 'Deep House Cleaning', tags: ['cleaning', 'bathroom', 'sanitize'], image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400' },
  ],

  // ==================== TRAVEL & EXPERIENCES ====================

  // Hotels
  'hotels': [
    { name: 'Budget Room Night Stay', description: 'Clean comfortable budget room', priceRange: [800, 1500], subSubCategory: 'Budget/Boutique Stays', tags: ['hotel', 'budget', 'stay'], image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400' },
    { name: 'Boutique Hotel Stay', description: 'Unique boutique experience', priceRange: [2500, 5000], subSubCategory: 'Budget/Boutique Stays', tags: ['hotel', 'boutique', 'unique'], image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400' },
    { name: 'Serviced Apartment', description: 'Fully furnished apartment stay', priceRange: [3000, 7000], subSubCategory: 'Serviced Apartments', tags: ['apartment', 'serviced', 'furnished'], image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400' },
    { name: '5-Star Luxury Suite', description: 'Premium luxury accommodation', priceRange: [8000, 25000], subSubCategory: '5-Star Luxury', tags: ['hotel', 'luxury', '5-star'], image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400' },
  ],

  // Taxis
  'taxis': [
    { name: 'Local City Ride', description: 'Within city taxi service', priceRange: [150, 500], subSubCategory: 'Local City Trips', tags: ['taxi', 'local', 'city'], image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400' },
    { name: 'Airport Transfer', description: 'Airport pickup/drop service', priceRange: [500, 1500], subSubCategory: 'Airport Transfers', tags: ['taxi', 'airport', 'transfer'], image: 'https://images.unsplash.com/photo-1530685932526-48ec92998eaa?w=400' },
    { name: 'Outstation Cab', description: 'Intercity taxi booking', priceRange: [2000, 8000], subSubCategory: 'Outstation Cabs', tags: ['taxi', 'outstation', 'intercity'], image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400' },
  ],

  // Activities
  'activities': [
    { name: 'Cooking Class', description: 'Learn to cook local cuisine', priceRange: [1000, 2500], subSubCategory: 'Cooking Classes', tags: ['cooking', 'class', 'experience'], image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400' },
    { name: 'Pottery Workshop', description: 'Hands-on pottery making', priceRange: [800, 2000], subSubCategory: 'Pottery Workshops', tags: ['pottery', 'workshop', 'craft'], image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400' },
    { name: 'City Walking Tour', description: 'Guided heritage walk', priceRange: [500, 1500], subSubCategory: 'City Walking Tours', tags: ['tour', 'walking', 'heritage'], image: 'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=400' },
  ],
};

async function updateProductDetailsWithSubSubCategory() {
  try {
    console.log('🚀 Starting comprehensive product update...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // Fetch all categories
    const allCategories = await db.collection('categories').find({}).toArray();
    console.log(`📦 Found ${allCategories.length} total categories`);

    // Create maps
    const categoryIdToSlug = new Map<string, string>();
    allCategories.forEach((cat: any) => {
      categoryIdToSlug.set(cat._id.toString(), cat.slug);
    });

    // Fetch all products
    const products = await db.collection('products').find({ isDeleted: { $ne: true } }).toArray();
    console.log(`📦 Found ${products.length} products to update\n`);

    console.log('========================================');
    console.log('UPDATING PRODUCTS');
    console.log('========================================\n');

    let updatedCount = 0;
    const subSubCategoryStats: Record<string, number> = {};
    const categoryStats: Record<string, number> = {};

    for (const product of products) {
      const p = product as any;
      const categoryId = p.category?.toString();

      if (!categoryId) continue;

      const categorySlug = categoryIdToSlug.get(categoryId);

      if (!categorySlug) continue;

      // Get templates for this category
      let templates = PRODUCT_TEMPLATES[categorySlug];

      // If no templates for this category, find a related one or use a default
      if (!templates || templates.length === 0) {
        // Try to find similar category
        const similarCategories = Object.keys(PRODUCT_TEMPLATES).filter(key =>
          categorySlug.includes(key.split('-')[0]) || key.includes(categorySlug.split('-')[0])
        );

        if (similarCategories.length > 0) {
          templates = PRODUCT_TEMPLATES[similarCategories[0]];
        } else {
          // Skip if no templates found
          continue;
        }
      }

      // Pick a random template
      const template = templates[Math.floor(Math.random() * templates.length)];

      // Generate unique SKU
      const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newSlug = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uniqueSuffix}`;

      // Calculate price
      const price = Math.floor(Math.random() * (template.priceRange[1] - template.priceRange[0]) + template.priceRange[0]);
      const originalPrice = Math.floor(price * (1 + Math.random() * 0.3)); // 0-30% markup for original price

      // Update the product
      await db.collection('products').updateOne(
        { _id: p._id },
        {
          $set: {
            name: template.name,
            slug: newSlug,
            description: template.description,
            shortDescription: template.description.substring(0, 100),
            subSubCategory: template.subSubCategory,
            tags: template.tags,
            images: [template.image],
            'pricing.original': originalPrice,
            'pricing.selling': price,
            'pricing.discount': Math.round(((originalPrice - price) / originalPrice) * 100)
          }
        }
      );

      subSubCategoryStats[template.subSubCategory] = (subSubCategoryStats[template.subSubCategory] || 0) + 1;
      categoryStats[categorySlug] = (categoryStats[categorySlug] || 0) + 1;
      updatedCount++;

      if (updatedCount % 50 === 0) {
        console.log(`✅ Updated ${updatedCount} products...`);
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('========================================');
    console.log(`Total products updated: ${updatedCount}`);

    console.log('\nProducts per category (top 20):');
    const sortedCatStats = Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    for (const [cat, count] of sortedCatStats) {
      console.log(`   ${cat}: ${count} products`);
    }

    console.log('\nSub-sub-category distribution (top 30):');
    const sortedStats = Object.entries(subSubCategoryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    for (const [subSubCat, count] of sortedStats) {
      console.log(`   ${subSubCat}: ${count} products`);
    }

    if (Object.keys(subSubCategoryStats).length > 30) {
      console.log(`   ... and ${Object.keys(subSubCategoryStats).length - 30} more sub-sub-categories`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateProductDetailsWithSubSubCategory()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
