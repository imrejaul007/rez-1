/**
 * Comprehensive script to seed ALL stores with proper products
 * Each store will have 6 products matching its subcategory
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Complete product templates for ALL subcategories
const PRODUCT_TEMPLATES: Record<string, Array<{name: string, subSubCategory: string, description: string, basePrice: number, image: string}>> = {
  // FOOD & DINING
  'cafes': [
    { name: 'Espresso', subSubCategory: 'Espresso-based drinks', description: 'Rich and bold espresso shot', basePrice: 150, image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400' },
    { name: 'Cappuccino', subSubCategory: 'Espresso-based drinks', description: 'Espresso with steamed milk foam', basePrice: 220, image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400' },
    { name: 'Latte', subSubCategory: 'Espresso-based drinks', description: 'Smooth espresso with steamed milk', basePrice: 250, image: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400' },
    { name: 'Masala Chai', subSubCategory: 'Tea (Chai/Herbal)', description: 'Traditional Indian spiced tea', basePrice: 120, image: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400' },
    { name: 'Pancakes', subSubCategory: 'Breakfast Items', description: 'Fluffy pancakes with maple syrup', basePrice: 320, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400' },
    { name: 'Club Sandwich', subSubCategory: 'Sandwiches', description: 'Triple-decker classic sandwich', basePrice: 280, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400' },
    { name: 'Avocado Toast', subSubCategory: 'All-day brunch', description: 'Smashed avocado on sourdough', basePrice: 350, image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400' },
    { name: 'Green Tea', subSubCategory: 'Tea (Chai/Herbal)', description: 'Healthy antioxidant-rich green tea', basePrice: 150, image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400' },
  ],
  'qsr-fast-food': [
    { name: 'Classic Burger', subSubCategory: 'Burgers', description: 'Juicy patty with fresh toppings', basePrice: 220, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
    { name: 'Chicken Burger', subSubCategory: 'Burgers', description: 'Crispy chicken fillet burger', basePrice: 200, image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400' },
    { name: 'Margherita Pizza', subSubCategory: 'Pizzas', description: 'Classic tomato and mozzarella', basePrice: 350, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400' },
    { name: 'Pepperoni Pizza', subSubCategory: 'Pizzas', description: 'Loaded with pepperoni slices', basePrice: 420, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400' },
    { name: 'Chicken Wings', subSubCategory: 'Fried Chicken', description: 'Spicy buffalo wings', basePrice: 380, image: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400' },
    { name: 'Veg Momos', subSubCategory: 'Momos', description: 'Steamed vegetable dumplings', basePrice: 150, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400' },
    { name: 'Chicken Wrap', subSubCategory: 'Wraps/Rolls', description: 'Grilled chicken in tortilla', basePrice: 250, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400' },
    { name: 'French Fries', subSubCategory: 'Burgers', description: 'Crispy golden fries', basePrice: 120, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' },
  ],
  'family-restaurants': [
    { name: 'Butter Chicken', subSubCategory: 'North Indian', description: 'Creamy tomato-based chicken curry', basePrice: 380, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400' },
    { name: 'Dal Makhani', subSubCategory: 'North Indian', description: 'Slow-cooked black lentils', basePrice: 280, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400' },
    { name: 'Masala Dosa', subSubCategory: 'South Indian', description: 'Crispy crepe with potato filling', basePrice: 180, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400' },
    { name: 'Idli Sambar', subSubCategory: 'South Indian', description: 'Steamed rice cakes with lentil soup', basePrice: 150, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400' },
    { name: 'Chicken Manchurian', subSubCategory: 'Chinese/Asian', description: 'Indo-Chinese fried chicken', basePrice: 320, image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400' },
    { name: 'Veg Fried Rice', subSubCategory: 'Chinese/Asian', description: 'Wok-tossed vegetable rice', basePrice: 220, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400' },
    { name: 'Thali Meal', subSubCategory: 'Multicuisine', description: 'Complete Indian meal platter', basePrice: 350, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400' },
    { name: 'Paneer Tikka', subSubCategory: 'North Indian', description: 'Grilled cottage cheese', basePrice: 320, image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400' },
  ],
  'fine-dining': [
    { name: 'Grilled Salmon', subSubCategory: 'Continental', description: 'Pan-seared salmon with herbs', basePrice: 850, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400' },
    { name: 'Beef Tenderloin', subSubCategory: 'Continental', description: 'Premium cut with red wine jus', basePrice: 1200, image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400' },
    { name: 'Risotto', subSubCategory: 'Italian (Gourmet)', description: 'Creamy arborio rice dish', basePrice: 680, image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400' },
    { name: 'Sushi Platter', subSubCategory: 'Japanese', description: 'Assorted fresh sushi rolls', basePrice: 950, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400' },
    { name: 'Lamb Shank', subSubCategory: 'Mediterranean', description: 'Slow-braised lamb with herbs', basePrice: 980, image: 'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=400' },
    { name: 'Lobster Thermidor', subSubCategory: 'Continental', description: 'Classic French lobster dish', basePrice: 1500, image: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400' },
  ],
  'ice-cream-dessert': [
    { name: 'Belgian Chocolate', subSubCategory: 'Gelato', description: 'Rich Belgian chocolate gelato', basePrice: 180, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400' },
    { name: 'Mango Sorbet', subSubCategory: 'Sorbet', description: 'Refreshing mango fruit sorbet', basePrice: 150, image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400' },
    { name: 'Hot Fudge Sundae', subSubCategory: 'Sundaes', description: 'Vanilla ice cream with hot fudge', basePrice: 280, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400' },
    { name: 'Oreo Shake', subSubCategory: 'Shakes', description: 'Cookies and cream milkshake', basePrice: 220, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400' },
    { name: 'Frozen Yogurt', subSubCategory: 'Frozen Yogurt', description: 'Healthy frozen yogurt cup', basePrice: 180, image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400' },
    { name: 'Kulfi', subSubCategory: 'Indian Desserts (Kulfi)', description: 'Traditional Indian ice cream', basePrice: 120, image: 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=400' },
  ],
  'bakery-confectionery': [
    { name: 'Chocolate Cake', subSubCategory: 'Cakes & Pastries', description: 'Rich chocolate layer cake', basePrice: 450, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400' },
    { name: 'Red Velvet', subSubCategory: 'Cakes & Pastries', description: 'Classic with cream cheese frosting', basePrice: 480, image: 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=400' },
    { name: 'Croissant', subSubCategory: 'Cakes & Pastries', description: 'Buttery French pastry', basePrice: 120, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400' },
    { name: 'Sourdough Bread', subSubCategory: 'Bread', description: 'Artisan sourdough loaf', basePrice: 180, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
    { name: 'Brownie', subSubCategory: 'Cookies & Brownies', description: 'Fudgy chocolate brownie', basePrice: 120, image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400' },
    { name: 'Gulab Jamun', subSubCategory: 'Indian Sweets (Mithai)', description: 'Fried milk balls in syrup', basePrice: 80, image: 'https://images.unsplash.com/photo-1666190050914-e152153073a4?w=400' },
  ],
  'cloud-kitchens': [
    { name: 'Hyderabadi Biryani', subSubCategory: 'Biryani', description: 'Aromatic dum-cooked biryani', basePrice: 350, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
    { name: 'Chicken Biryani', subSubCategory: 'Biryani', description: 'Classic chicken dum biryani', basePrice: 320, image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' },
    { name: 'Quinoa Salad Bowl', subSubCategory: 'Health & Salad Bowls', description: 'Healthy quinoa with veggies', basePrice: 280, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
    { name: 'Protein Bowl', subSubCategory: 'Health & Salad Bowls', description: 'High protein meal bowl', basePrice: 350, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
    { name: 'Meal Box Combo', subSubCategory: 'Meal Boxes', description: 'Complete meal with rice & curry', basePrice: 250, image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400' },
    { name: 'Brownie Box', subSubCategory: 'Desserts only', description: 'Assorted brownie box', basePrice: 450, image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400' },
  ],
  'street-food': [
    { name: 'Pani Puri', subSubCategory: 'Chaat', description: 'Crispy puris with tangy water', basePrice: 80, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
    { name: 'Bhel Puri', subSubCategory: 'Chaat', description: 'Puffed rice with chutneys', basePrice: 60, image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400' },
    { name: 'Vada Pav', subSubCategory: 'Vada Pav', description: 'Mumbai style potato burger', basePrice: 50, image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400' },
    { name: 'Pav Bhaji', subSubCategory: 'Pav Bhaji', description: 'Spiced mashed vegetables with bread', basePrice: 120, image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400' },
    { name: 'Aloo Tikki', subSubCategory: 'Local Snacks', description: 'Crispy potato patties', basePrice: 70, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
    { name: 'Samosa', subSubCategory: 'Local Snacks', description: 'Crispy fried pastry with filling', basePrice: 40, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400' },
  ],

  // GROCERY & ESSENTIALS
  'supermarkets': [
    { name: 'Fresh Apples', subSubCategory: 'Fresh Produce', description: 'Premium quality apples 1kg', basePrice: 180, image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400' },
    { name: 'Organic Bananas', subSubCategory: 'Fresh Produce', description: 'Fresh organic bananas', basePrice: 60, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400' },
    { name: 'Fresh Milk 1L', subSubCategory: 'Dairy & Eggs', description: 'Farm fresh whole milk', basePrice: 65, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },
    { name: 'Brown Eggs 12pc', subSubCategory: 'Dairy & Eggs', description: 'Farm fresh brown eggs', basePrice: 120, image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400' },
    { name: 'Potato Chips', subSubCategory: 'Packaged Foods', description: 'Classic salted chips', basePrice: 50, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400' },
    { name: 'Floor Cleaner', subSubCategory: 'Household Goods', description: 'Disinfectant floor cleaner', basePrice: 150, image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400' },
  ],
  'kirana-stores': [
    { name: 'Toor Dal 1kg', subSubCategory: 'Pulses & Grains', description: 'Premium quality toor dal', basePrice: 180, image: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=400' },
    { name: 'Basmati Rice 5kg', subSubCategory: 'Pulses & Grains', description: 'Long grain basmati rice', basePrice: 450, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
    { name: 'Garam Masala', subSubCategory: 'Spices & Masalas', description: 'Aromatic spice blend', basePrice: 120, image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400' },
    { name: 'Turmeric Powder', subSubCategory: 'Spices & Masalas', description: 'Pure turmeric powder', basePrice: 80, image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400' },
    { name: 'Mustard Oil 1L', subSubCategory: 'Oils & Ghee', description: 'Cold pressed mustard oil', basePrice: 200, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400' },
    { name: 'Pure Ghee 500g', subSubCategory: 'Oils & Ghee', description: 'Pure cow ghee', basePrice: 350, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400' },
  ],
  'fresh-vegetables': [
    { name: 'Tomatoes 1kg', subSubCategory: 'Seasonal Produce', description: 'Fresh red tomatoes', basePrice: 40, image: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400' },
    { name: 'Onions 1kg', subSubCategory: 'Seasonal Produce', description: 'Fresh onions', basePrice: 35, image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400' },
    { name: 'Broccoli', subSubCategory: 'Exotic Vegetables', description: 'Fresh green broccoli', basePrice: 80, image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400' },
    { name: 'Zucchini', subSubCategory: 'Exotic Vegetables', description: 'Fresh green zucchini', basePrice: 90, image: 'https://images.unsplash.com/photo-1563252722-6434563a985d?w=400' },
    { name: 'Organic Spinach', subSubCategory: 'Organic Vegetables', description: 'Fresh organic spinach', basePrice: 60, image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400' },
    { name: 'Organic Carrots', subSubCategory: 'Organic Vegetables', description: 'Fresh organic carrots', basePrice: 70, image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400' },
  ],
  'dairy': [
    { name: 'Full Cream Milk 1L', subSubCategory: 'Milk', description: 'Fresh full cream milk', basePrice: 70, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },
    { name: 'Toned Milk 1L', subSubCategory: 'Milk', description: 'Low fat toned milk', basePrice: 55, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400' },
    { name: 'Greek Yogurt', subSubCategory: 'Yogurt/Curd', description: 'Creamy Greek style yogurt', basePrice: 120, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400' },
    { name: 'Cheddar Cheese', subSubCategory: 'Cheese', description: 'Aged cheddar cheese block', basePrice: 280, image: 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400' },
    { name: 'Fresh Butter 500g', subSubCategory: 'Butter & Cream', description: 'Fresh salted butter', basePrice: 250, image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
    { name: 'Fresh Paneer 200g', subSubCategory: 'Paneer', description: 'Soft fresh cottage cheese', basePrice: 100, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400' },
  ],
  'water-cans': [
    { name: '20L Water Can', subSubCategory: '20L Can', description: 'Purified drinking water', basePrice: 80, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
    { name: 'Bisleri 20L', subSubCategory: '20L Can', description: 'Bisleri mineral water', basePrice: 90, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
    { name: 'Water Bottle 1L', subSubCategory: 'Small Bottles', description: 'Packaged drinking water', basePrice: 20, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
    { name: 'Water Pack 500ml x6', subSubCategory: 'Small Bottles', description: 'Pack of 6 water bottles', basePrice: 60, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
    { name: 'Aquafina 20L', subSubCategory: '20L Can', description: 'Aquafina purified water', basePrice: 85, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
    { name: 'Kinley 1L x12', subSubCategory: 'Small Bottles', description: 'Kinley water bottle pack', basePrice: 180, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
  ],

  // BEAUTY & WELLNESS
  'salons': [
    { name: "Men's Haircut", subSubCategory: 'Haircuts & Styling', description: 'Professional haircut for men', basePrice: 300, image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400' },
    { name: "Women's Haircut", subSubCategory: 'Haircuts & Styling', description: 'Professional haircut for women', basePrice: 500, image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400' },
    { name: 'Hair Coloring', subSubCategory: 'Hair Colouring', description: 'Global hair color service', basePrice: 1500, image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400' },
    { name: 'Highlights', subSubCategory: 'Hair Colouring', description: 'Hair highlighting service', basePrice: 2000, image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400' },
    { name: 'Keratin Treatment', subSubCategory: 'Keratin/Smoothening', description: 'Hair smoothening treatment', basePrice: 3500, image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400' },
    { name: 'Classic Facial', subSubCategory: 'Facials', description: 'Deep cleansing facial', basePrice: 800, image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400' },
  ],
  'spa-massage': [
    { name: 'Swedish Massage', subSubCategory: 'Swedish Massage', description: 'Relaxing full body massage', basePrice: 1500, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' },
    { name: 'Deep Tissue', subSubCategory: 'Deep Tissue', description: 'Therapeutic deep massage', basePrice: 2000, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' },
    { name: 'Aromatherapy', subSubCategory: 'Aromatherapy', description: 'Essential oil massage', basePrice: 1800, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' },
    { name: 'Ayurvedic Massage', subSubCategory: 'Ayurvedic Treatments', description: 'Traditional ayurvedic therapy', basePrice: 2500, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' },
    { name: 'Foot Reflexology', subSubCategory: 'Reflexology', description: 'Pressure point foot massage', basePrice: 800, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' },
    { name: 'Head Massage', subSubCategory: 'Reflexology', description: 'Relaxing head massage', basePrice: 600, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' },
  ],

  // HEALTHCARE
  'pharmacy': [
    { name: 'Paracetamol', subSubCategory: 'OTC Drugs', description: 'Pain and fever relief', basePrice: 30, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
    { name: 'Vitamin C Tablets', subSubCategory: 'Vitamins & Supplements', description: 'Immunity booster', basePrice: 150, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
    { name: 'First Aid Kit', subSubCategory: 'First Aid Supplies', description: 'Complete first aid kit', basePrice: 450, image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400' },
    { name: 'Band-Aids Pack', subSubCategory: 'First Aid Supplies', description: 'Adhesive bandages', basePrice: 80, image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400' },
    { name: 'Baby Diapers', subSubCategory: 'Baby Care', description: 'Premium baby diapers', basePrice: 600, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
    { name: 'Multivitamins', subSubCategory: 'Vitamins & Supplements', description: 'Daily multivitamin tablets', basePrice: 350, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400' },
  ],
  'clinics': [
    { name: 'General Checkup', subSubCategory: 'General Physician', description: 'Full body health checkup', basePrice: 500, image: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400' },
    { name: 'Fever Consultation', subSubCategory: 'General Physician', description: 'Doctor consultation for fever', basePrice: 300, image: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400' },
    { name: 'Child Vaccination', subSubCategory: 'Pediatrician', description: 'Routine child vaccination', basePrice: 800, image: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400' },
    { name: 'Pediatric Checkup', subSubCategory: 'Pediatrician', description: 'Child health checkup', basePrice: 600, image: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400' },
    { name: 'Joint Pain Consult', subSubCategory: 'Orthopedics', description: 'Orthopedic consultation', basePrice: 700, image: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400' },
    { name: 'Stomach Checkup', subSubCategory: 'Gastroenterology', description: 'Digestive health checkup', basePrice: 600, image: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400' },
  ],
  'diagnostics': [
    { name: 'Complete Blood Count', subSubCategory: 'Blood Tests', description: 'CBC test', basePrice: 350, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400' },
    { name: 'Lipid Profile', subSubCategory: 'Blood Tests', description: 'Cholesterol test', basePrice: 500, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400' },
    { name: 'MRI Scan', subSubCategory: 'MRI/CT Scans', description: 'Full body MRI scan', basePrice: 8000, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400' },
    { name: 'X-Ray', subSubCategory: 'X-rays', description: 'Digital X-ray imaging', basePrice: 400, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400' },
    { name: 'ECG Test', subSubCategory: 'ECG', description: 'Heart rhythm test', basePrice: 300, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400' },
    { name: 'Full Body Checkup', subSubCategory: 'Health Checkup', description: 'Comprehensive health package', basePrice: 2500, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400' },
  ],

  // FITNESS & SPORTS
  'gyms': [
    { name: 'Monthly Membership', subSubCategory: 'Weight Training', description: '1 month gym access', basePrice: 1500, image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400' },
    { name: 'Personal Training', subSubCategory: 'Personal Training', description: '10 PT sessions', basePrice: 5000, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400' },
    { name: 'Cardio Session', subSubCategory: 'Cardio', description: 'Cardio workout session', basePrice: 200, image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400' },
    { name: 'Zumba Class', subSubCategory: 'Group Classes', description: 'Fun dance fitness class', basePrice: 300, image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400' },
    { name: 'CrossFit Session', subSubCategory: 'Weight Training', description: 'High intensity workout', basePrice: 400, image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400' },
    { name: 'Yoga Class', subSubCategory: 'Group Classes', description: 'Relaxing yoga session', basePrice: 250, image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400' },
  ],

  // EDUCATION
  'coaching-centers': [
    { name: 'JEE Crash Course', subSubCategory: 'JEE/NEET', description: '3 month intensive course', basePrice: 25000, image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400' },
    { name: 'NEET Prep', subSubCategory: 'JEE/NEET', description: 'Medical entrance prep', basePrice: 30000, image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400' },
    { name: 'CAT Coaching', subSubCategory: 'CAT/GMAT/GRE', description: 'MBA entrance coaching', basePrice: 35000, image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400' },
    { name: 'GRE Prep', subSubCategory: 'CAT/GMAT/GRE', description: 'GRE test preparation', basePrice: 20000, image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400' },
    { name: 'Class 10 Tuition', subSubCategory: 'School Tuitions', description: 'Board exam preparation', basePrice: 15000, image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400' },
    { name: 'Class 12 Science', subSubCategory: 'School Tuitions', description: 'Science stream tuition', basePrice: 18000, image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400' },
  ],
  'skill-development': [
    { name: 'Leadership Workshop', subSubCategory: 'Leadership Training', description: '2-day leadership program', basePrice: 5000, image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' },
    { name: 'Communication Skills', subSubCategory: 'Soft Skills', description: 'Effective communication course', basePrice: 3000, image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' },
    { name: 'Public Speaking', subSubCategory: 'Public Speaking', description: 'Overcome stage fear', basePrice: 4000, image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' },
    { name: 'Interview Skills', subSubCategory: 'Interview Preparation', description: 'Crack any interview', basePrice: 2500, image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' },
    { name: 'Resume Building', subSubCategory: 'Interview Preparation', description: 'Professional resume course', basePrice: 1500, image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' },
    { name: 'Team Building', subSubCategory: 'Soft Skills', description: 'Team collaboration workshop', basePrice: 3500, image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' },
  ],

  // HOME SERVICES
  'ac-repair': [
    { name: 'AC Gas Refill', subSubCategory: 'Split AC Repair', description: 'Gas top-up service', basePrice: 1500, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400' },
    { name: 'AC Servicing', subSubCategory: 'AC Servicing', description: 'Complete AC service', basePrice: 600, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400' },
    { name: 'Split AC Repair', subSubCategory: 'Split AC Repair', description: 'Split AC troubleshooting', basePrice: 800, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400' },
    { name: 'Window AC Repair', subSubCategory: 'Window AC Repair', description: 'Window AC fixing', basePrice: 600, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400' },
    { name: 'AC Installation', subSubCategory: 'Split AC Repair', description: 'New AC installation', basePrice: 1200, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400' },
    { name: 'AC Deep Clean', subSubCategory: 'AC Servicing', description: 'Deep cleaning service', basePrice: 900, image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400' },
  ],
  'pest-control': [
    { name: 'Cockroach Control', subSubCategory: 'Pest Control', description: 'Cockroach treatment', basePrice: 800, image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
    { name: 'Termite Treatment', subSubCategory: 'Pest Control', description: 'Anti-termite treatment', basePrice: 3500, image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
    { name: 'Bed Bug Control', subSubCategory: 'Pest Control', description: 'Bed bug elimination', basePrice: 1500, image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
    { name: 'Mosquito Control', subSubCategory: 'Pest Control', description: 'Mosquito fogging', basePrice: 600, image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
    { name: 'Rodent Control', subSubCategory: 'Pest Control', description: 'Rat control service', basePrice: 1200, image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
    { name: 'General Pest Control', subSubCategory: 'Pest Control', description: 'Complete pest treatment', basePrice: 1800, image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400' },
  ],
  'laundry-dry-cleaning': [
    { name: 'Shirt Wash & Iron', subSubCategory: 'Laundry', description: 'Professional shirt cleaning', basePrice: 50, image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400' },
    { name: 'Suit Dry Clean', subSubCategory: 'Dry Cleaning', description: 'Premium suit cleaning', basePrice: 400, image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400' },
    { name: 'Saree Dry Clean', subSubCategory: 'Dry Cleaning', description: 'Delicate saree cleaning', basePrice: 300, image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400' },
    { name: 'Blanket Wash', subSubCategory: 'Laundry', description: 'Heavy blanket cleaning', basePrice: 250, image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400' },
    { name: 'Curtain Cleaning', subSubCategory: 'Laundry', description: 'Curtain wash service', basePrice: 150, image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400' },
    { name: 'Express Laundry', subSubCategory: 'Laundry', description: 'Same day delivery', basePrice: 100, image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400' },
  ],

  // TRAVEL & EXPERIENCES
  'hotels': [
    { name: 'Standard Room', subSubCategory: 'Budget/Boutique Stays', description: 'Comfortable standard room', basePrice: 2500, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400' },
    { name: 'Deluxe Room', subSubCategory: 'Budget/Boutique Stays', description: 'Spacious deluxe room', basePrice: 4000, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400' },
    { name: 'Suite', subSubCategory: '5-Star Luxury', description: 'Luxury suite experience', basePrice: 8000, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400' },
    { name: 'Studio Apartment', subSubCategory: 'Serviced Apartments', description: 'Fully furnished studio', basePrice: 3500, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400' },
    { name: '1BHK Apartment', subSubCategory: 'Serviced Apartments', description: 'One bedroom apartment', basePrice: 5000, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400' },
    { name: 'Presidential Suite', subSubCategory: '5-Star Luxury', description: 'Ultimate luxury suite', basePrice: 25000, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400' },
  ],
  'bike-rentals': [
    { name: 'Scooter Daily', subSubCategory: 'Scooters', description: 'Scooter rental per day', basePrice: 400, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
    { name: 'Activa Weekly', subSubCategory: 'Scooters', description: 'Activa for 7 days', basePrice: 2000, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
    { name: 'Royal Enfield', subSubCategory: 'Motorbikes', description: 'Bullet rental per day', basePrice: 1000, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
    { name: 'Sports Bike', subSubCategory: 'Motorbikes', description: 'Sports bike daily', basePrice: 1500, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
    { name: 'Helmet Rental', subSubCategory: 'Gear Rental', description: 'Safety helmet rental', basePrice: 50, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
    { name: 'Riding Jacket', subSubCategory: 'Gear Rental', description: 'Protective riding gear', basePrice: 150, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
  ],

  // ENTERTAINMENT
  'gaming-cafes': [
    { name: 'PC Gaming 1hr', subSubCategory: 'PC Gaming', description: 'High-end PC gaming', basePrice: 100, image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400' },
    { name: 'PC Gaming 3hr', subSubCategory: 'PC Gaming', description: '3 hour PC package', basePrice: 250, image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400' },
    { name: 'PS5 Gaming 1hr', subSubCategory: 'Console Gaming', description: 'PlayStation 5 gaming', basePrice: 150, image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400' },
    { name: 'Xbox Gaming 1hr', subSubCategory: 'Console Gaming', description: 'Xbox Series X gaming', basePrice: 150, image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400' },
    { name: 'E-Sports Entry', subSubCategory: 'E-Sports', description: 'Tournament entry fee', basePrice: 200, image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400' },
    { name: 'Gaming Package', subSubCategory: 'PC Gaming', description: '5hr gaming + snacks', basePrice: 400, image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=400' },
  ],
  'amusement-parks': [
    { name: 'Entry Ticket', subSubCategory: 'Entry', description: 'Park entry ticket', basePrice: 800, image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400' },
    { name: 'All Rides Pass', subSubCategory: 'Entry', description: 'Unlimited rides pass', basePrice: 1500, image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400' },
    { name: 'Water Park Entry', subSubCategory: 'Water Park', description: 'Water park access', basePrice: 600, image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400' },
    { name: 'Combo Pass', subSubCategory: 'Entry', description: 'Park + Water park', basePrice: 2000, image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400' },
    { name: 'VIP Fast Track', subSubCategory: 'Entry', description: 'Skip the queue pass', basePrice: 500, image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400' },
    { name: 'Family Pack', subSubCategory: 'Entry', description: '4 person family deal', basePrice: 2500, image: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400' },
  ],
  'vr-ar-experiences': [
    { name: 'VR Experience 30min', subSubCategory: 'VR Experience', description: 'Virtual reality session', basePrice: 500, image: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=400' },
    { name: 'Escape Room', subSubCategory: 'Escape Rooms', description: 'Mystery escape room', basePrice: 800, image: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=400' },
    { name: 'AR Gaming', subSubCategory: 'AR Gaming', description: 'Augmented reality games', basePrice: 400, image: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=400' },
    { name: 'VR Racing', subSubCategory: 'VR Experience', description: 'VR car racing', basePrice: 350, image: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=400' },
    { name: 'Horror VR', subSubCategory: 'VR Experience', description: 'Scary VR experience', basePrice: 450, image: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=400' },
    { name: 'Group Escape Room', subSubCategory: 'Escape Rooms', description: '6 person escape room', basePrice: 3000, image: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=400' },
  ],

  // FINANCIAL / OTHER
  'broadband': [
    { name: '100 Mbps Monthly', subSubCategory: 'Internet Plans', description: '100 Mbps unlimited data', basePrice: 699, image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400' },
    { name: '200 Mbps Monthly', subSubCategory: 'Internet Plans', description: '200 Mbps unlimited data', basePrice: 999, image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400' },
    { name: '300 Mbps Monthly', subSubCategory: 'Internet Plans', description: '300 Mbps premium plan', basePrice: 1299, image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400' },
    { name: 'Netflix Bundle', subSubCategory: 'OTT Bundles', description: 'Internet + Netflix', basePrice: 1499, image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400' },
    { name: 'Prime Bundle', subSubCategory: 'OTT Bundles', description: 'Internet + Prime Video', basePrice: 1199, image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400' },
    { name: 'All OTT Bundle', subSubCategory: 'OTT Bundles', description: 'Internet + All OTT', basePrice: 1999, image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400' },
  ],
  'gold-savings': [
    { name: 'Digital Gold 1g', subSubCategory: 'Digital Gold', description: '1 gram digital gold', basePrice: 6500, image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400' },
    { name: 'Digital Gold 5g', subSubCategory: 'Digital Gold', description: '5 gram digital gold', basePrice: 32000, image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400' },
    { name: 'Gold Coin 10g', subSubCategory: 'Physical Gold', description: '10 gram gold coin', basePrice: 65000, image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400' },
    { name: 'SIP Gold Monthly', subSubCategory: 'Digital Gold', description: 'Monthly gold savings', basePrice: 500, image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400' },
    { name: 'Gold Loan', subSubCategory: 'Gold Loan', description: 'Gold backed loan', basePrice: 10000, image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400' },
    { name: 'Gold Bar 50g', subSubCategory: 'Physical Gold', description: '50 gram gold bar', basePrice: 320000, image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400' },
  ],
  'electronics': [
    { name: 'iPhone 15', subSubCategory: 'Smartphones', description: 'Latest Apple iPhone', basePrice: 79900, image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400' },
    { name: 'MacBook Air', subSubCategory: 'Laptops & PCs', description: 'Apple MacBook Air M2', basePrice: 114900, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400' },
    { name: 'Sony 55" TV', subSubCategory: 'Home Appliances', description: '4K Smart TV', basePrice: 64990, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400' },
    { name: 'Sony Camera', subSubCategory: 'Cameras', description: 'Mirrorless camera', basePrice: 89990, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400' },
    { name: 'AirPods Pro', subSubCategory: 'Audio Equipment', description: 'Apple earbuds', basePrice: 24900, image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400' },
    { name: 'Samsung Galaxy', subSubCategory: 'Smartphones', description: 'Samsung flagship phone', basePrice: 69999, image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400' },
  ],
  'mobile-accessories': [
    { name: 'Phone Case', subSubCategory: 'Covers & Cases', description: 'Premium phone case', basePrice: 499, image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400' },
    { name: 'Screen Guard', subSubCategory: 'Screen Guards', description: 'Tempered glass', basePrice: 299, image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400' },
    { name: 'Power Bank 10000mAh', subSubCategory: 'Power Banks', description: 'Portable charger', basePrice: 999, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400' },
    { name: 'Fast Charger', subSubCategory: 'Chargers', description: '65W fast charger', basePrice: 1499, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400' },
    { name: 'USB-C Cable', subSubCategory: 'Chargers', description: 'Premium charging cable', basePrice: 399, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400' },
    { name: 'Power Bank 20000mAh', subSubCategory: 'Power Banks', description: 'High capacity charger', basePrice: 1799, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400' },
  ],
  'footwear': [
    { name: 'Running Shoes', subSubCategory: 'Sports Shoes', description: 'Comfortable running shoes', basePrice: 2999, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
    { name: 'Formal Shoes', subSubCategory: 'Formal Shoes', description: 'Leather formal shoes', basePrice: 3499, image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400' },
    { name: 'Sneakers', subSubCategory: 'Casual Shoes', description: 'Trendy sneakers', basePrice: 2499, image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400' },
    { name: 'Sandals', subSubCategory: 'Casual Shoes', description: 'Comfortable sandals', basePrice: 999, image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400' },
    { name: 'Loafers', subSubCategory: 'Formal Shoes', description: 'Classic loafers', basePrice: 2799, image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400' },
    { name: 'Sports Sandals', subSubCategory: 'Sports Shoes', description: 'Athletic sandals', basePrice: 1499, image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400' },
  ],
  'jewelry': [
    { name: 'Gold Chain', subSubCategory: 'Gold', description: '22K gold chain', basePrice: 45000, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400' },
    { name: 'Diamond Ring', subSubCategory: 'Diamond', description: 'Solitaire diamond ring', basePrice: 85000, image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400' },
    { name: 'Silver Bracelet', subSubCategory: 'Silver', description: 'Sterling silver bracelet', basePrice: 2500, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400' },
    { name: 'Fashion Earrings', subSubCategory: 'Fashion Jewelry', description: 'Trendy earrings', basePrice: 799, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400' },
    { name: 'Gold Earrings', subSubCategory: 'Gold', description: '18K gold earrings', basePrice: 25000, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400' },
    { name: 'Pearl Necklace', subSubCategory: 'Fashion Jewelry', description: 'Elegant pearl necklace', basePrice: 3500, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400' },
  ],
  'local-brands': [
    { name: 'Cotton Kurta', subSubCategory: 'Ethnic Wear', description: 'Premium cotton kurta', basePrice: 1299, image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400' },
    { name: 'Denim Jeans', subSubCategory: 'Western Wear', description: 'Classic denim jeans', basePrice: 1599, image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400' },
    { name: 'Casual Shirt', subSubCategory: 'Western Wear', description: 'Trendy casual shirt', basePrice: 999, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400' },
    { name: 'Saree', subSubCategory: 'Ethnic Wear', description: 'Designer silk saree', basePrice: 4999, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400' },
    { name: 'T-Shirt', subSubCategory: 'Western Wear', description: 'Cotton graphic tee', basePrice: 599, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
    { name: 'Palazzo Set', subSubCategory: 'Ethnic Wear', description: 'Kurta palazzo set', basePrice: 1899, image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400' },
  ],

  // Default for any missing categories
  'default': [
    { name: 'Service Package A', subSubCategory: 'Standard', description: 'Basic service package', basePrice: 500, image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400' },
    { name: 'Service Package B', subSubCategory: 'Standard', description: 'Premium service package', basePrice: 1000, image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400' },
    { name: 'Service Package C', subSubCategory: 'Premium', description: 'Deluxe service package', basePrice: 1500, image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400' },
    { name: 'Consultation', subSubCategory: 'Standard', description: 'Expert consultation', basePrice: 300, image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400' },
    { name: 'Express Service', subSubCategory: 'Premium', description: 'Quick turnaround service', basePrice: 800, image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400' },
    { name: 'Custom Service', subSubCategory: 'Premium', description: 'Tailored to your needs', basePrice: 2000, image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400' },
  ],
};

// Add aliases for variations
const SUBCATEGORY_ALIASES: Record<string, string> = {
  'crossfit': 'gyms',
  'dermatology': 'clinics',
  'home-nursing': 'pharmacy',
  'physiotherapy': 'clinics',
};

async function seedAllStoreProducts() {
  try {
    console.log('🚀 Starting comprehensive product seeding for ALL stores...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // Get all stores
    const stores = await db.collection('stores').find({}).toArray();
    console.log(`📦 Found ${stores.length} stores to process\n`);

    let totalCreated = 0;
    let totalDeleted = 0;

    for (const store of stores) {
      const subcategorySlug = store.subcategorySlug || 'default';
      const templateKey = SUBCATEGORY_ALIASES[subcategorySlug] || subcategorySlug;
      const templates = PRODUCT_TEMPLATES[templateKey] || PRODUCT_TEMPLATES['default'];

      console.log(`\n📦 ${store.name} (${subcategorySlug})`);

      // Delete all existing products for this store
      const deleteResult = await db.collection('products').deleteMany({ store: store._id });
      totalDeleted += deleteResult.deletedCount;
      console.log(`   Deleted ${deleteResult.deletedCount} old products`);

      // Create 6 new products from templates
      const productsToCreate = templates.slice(0, 6);

      for (const template of productsToCreate) {
        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        const slug = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${store.slug || store.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uniqueId}`;

        // Add some price variation
        const priceVariation = 0.9 + Math.random() * 0.2; // 90% to 110%
        const currentPrice = Math.round(template.basePrice * priceVariation);
        const originalPrice = Math.round(currentPrice * (1 + Math.random() * 0.2)); // 0-20% discount
        const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);

        const newProduct = {
          name: template.name,
          slug: slug,
          description: template.description,
          subSubCategory: template.subSubCategory,
          store: store._id,
          category: store.category,
          price: {
            current: currentPrice,
            original: originalPrice,
            currency: 'INR',
            discount: discount
          },
          rating: {
            value: (3.5 + Math.random() * 1.5).toFixed(1),
            count: Math.floor(Math.random() * 300) + 20
          },
          inventory: {
            stock: Math.floor(Math.random() * 100) + 10,
            isAvailable: true
          },
          images: [template.image],
          tags: [template.subSubCategory.toLowerCase(), subcategorySlug, store.name.toLowerCase()],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.collection('products').insertOne(newProduct);
        totalCreated++;
      }

      console.log(`   ✅ Created ${productsToCreate.length} products`);
    }

    console.log('\n========================================');
    console.log('📊 SEEDING SUMMARY');
    console.log('========================================');
    console.log(`Total stores processed: ${stores.length}`);
    console.log(`Total products deleted: ${totalDeleted}`);
    console.log(`Total products created: ${totalCreated}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedAllStoreProducts()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
